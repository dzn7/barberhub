/**
 * Serviço de Notificações Multi-Tenant
 * Envia notificações automáticas via WhatsApp para clientes e barbeiros
 */

import { enviarMensagem } from './whatsapp.js';
import { supabase } from '../config/database.js';
import { 
  templateConfirmacaoCliente,
  templateNotificacaoBarbeiro,
  templateLembreteCliente,
  templateCancelamentoCliente,
  templateRemarcacaoCliente,
  templateBoasVindasTenant,
  templateBoasVindasBarbeiro
} from '../utils/templates.js';
import logger from '../utils/logger.js';

/**
 * Busca dados completos do agendamento com tenant e múltiplos serviços
 */
async function buscarAgendamentoCompleto(agendamentoId) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      clientes (id, nome, telefone, email),
      barbeiros (id, nome, telefone),
      servicos (id, nome, preco, duracao),
      tenants (id, nome, slug, whatsapp, telefone, endereco, cidade, estado, tipo_negocio)
    `)
    .eq('id', agendamentoId)
    .single();

  if (error) {
    logger.error('Erro ao buscar agendamento:', error);
    return null;
  }

  // Se há múltiplos serviços (servicos_ids), buscar todos
  if (data?.servicos_ids && Array.isArray(data.servicos_ids) && data.servicos_ids.length > 1) {
    const { data: servicosMultiplos, error: erroServicos } = await supabase
      .from('servicos')
      .select('id, nome, preco, duracao')
      .in('id', data.servicos_ids);

    if (!erroServicos && servicosMultiplos) {
      data.servicosMultiplos = servicosMultiplos;
    }
  }

  return data;
}

/**
 * Extrai informações de serviços (único ou múltiplos)
 */
function extrairInfoServicos(agendamento) {
  const { servicos, servicosMultiplos } = agendamento;
  
  // Se há múltiplos serviços
  if (servicosMultiplos && servicosMultiplos.length > 1) {
    const nomes = servicosMultiplos.map(s => s.nome);
    const precoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.preco || 0), 0);
    const duracaoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.duracao || 0), 0);
    
    return {
      nomeServico: nomes,
      preco: precoTotal,
      duracaoTotal
    };
  }
  
  // Serviço único
  return {
    nomeServico: servicos?.nome || 'Serviço',
    preco: servicos?.preco,
    duracaoTotal: servicos?.duracao || null
  };
}

/**
 * Registra notificação enviada no banco
 */
async function registrarNotificacao(tenantId, agendamentoId, tipo, status, mensagem, erro = null) {
  try {
    await supabase
      .from('notificacoes_enviadas')
      .insert({
        tenant_id: tenantId,
        agendamento_id: agendamentoId,
        tipo,
        status,
        mensagem: mensagem?.substring(0, 1000), // Limitar tamanho
        erro,
        data_envio: new Date().toISOString()
      });
  } catch (error) {
    logger.error('Erro ao registrar notificação:', error);
  }
}

/**
 * Verifica se notificação já foi enviada
 */
async function notificacaoJaEnviada(agendamentoId, tipo) {
  const { data } = await supabase
    .from('notificacoes_enviadas')
    .select('id')
    .eq('agendamento_id', agendamentoId)
    .eq('tipo', tipo)
    .eq('status', 'enviada')
    .maybeSingle();

  return !!data;
}

/**
 * Envia confirmação de agendamento para cliente e barbeiro
 */
export async function enviarConfirmacaoAgendamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando confirmação: ${agendamentoId}`);

    // Verificar se já foi enviada
    if (await notificacaoJaEnviada(agendamentoId, 'confirmacao')) {
      logger.info('⚠️ Confirmação já enviada anteriormente');
      return { sucesso: true, mensagem: 'Já enviada' };
    }

    const agendamento = await buscarAgendamentoCompleto(agendamentoId);
    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, tenants } = agendamento;

    // Extrair informações de serviços (único ou múltiplos)
    const infoServicos = extrairInfoServicos(agendamento);

    // Montar endereço completo
    let endereco = null;
    if (tenants?.endereco) {
      endereco = tenants.endereco;
      if (tenants.cidade) endereco += `\n${tenants.cidade}`;
      if (tenants.estado) endereco += ` - ${tenants.estado}`;
    }

    // Obter tipo de negócio do tenant
    const tipoNegocio = tenants?.tipo_negocio || 'barbearia';

    // 1. Enviar para cliente
    if (clientes?.telefone) {
      const mensagemCliente = templateConfirmacaoCliente({
        nomeCliente: clientes.nome,
        nomeBarbearia: tenants?.nome || 'Estabelecimento',
        nomeBarbeiro: barbeiros?.nome || 'Profissional',
        nomeServico: infoServicos.nomeServico,
        preco: infoServicos.preco,
        dataHora: agendamento.data_hora,
        endereco,
        telefone: tenants?.whatsapp || tenants?.telefone,
        slug: tenants?.slug,
        tipoNegocio,
        duracaoTotal: infoServicos.duracaoTotal
      });

      const resultadoCliente = await enviarMensagem(clientes.telefone, mensagemCliente);
      
      await registrarNotificacao(
        agendamento.tenant_id,
        agendamentoId,
        'confirmacao',
        resultadoCliente.sucesso ? 'enviada' : 'erro',
        mensagemCliente,
        resultadoCliente.erro
      );

      if (resultadoCliente.sucesso) {
        logger.info('✅ Confirmação enviada ao cliente');
      }
    }

    // IMPORTANTE: Aguardar antes de enviar para o barbeiro
    // Evita problema de "aguardando mensagem" causado por rate limiting
    // Delay aumentado para 5s para garantir que a primeira mensagem seja totalmente processada
    if (clientes?.telefone && barbeiros?.telefone) {
      logger.info('⏳ Aguardando 5s antes de enviar para o profissional...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // 2. Enviar para profissional
    if (barbeiros?.telefone) {
      const mensagemBarbeiro = templateNotificacaoBarbeiro({
        nomeBarbeiro: barbeiros.nome,
        nomeCliente: clientes?.nome || 'Cliente',
        telefoneCliente: clientes?.telefone,
        nomeServico: infoServicos.nomeServico,
        preco: infoServicos.preco,
        dataHora: agendamento.data_hora,
        observacoes: agendamento.observacoes,
        tipoNegocio,
        duracaoTotal: infoServicos.duracaoTotal
      });

      const resultadoBarbeiro = await enviarMensagem(barbeiros.telefone, mensagemBarbeiro);
      
      await registrarNotificacao(
        agendamento.tenant_id,
        agendamentoId,
        'notificacao_barbeiro',
        resultadoBarbeiro.sucesso ? 'enviada' : 'erro',
        mensagemBarbeiro,
        resultadoBarbeiro.erro
      );

      if (resultadoBarbeiro.sucesso) {
        logger.info('✅ Notificação enviada ao barbeiro');
      }
    }

    return { sucesso: true };
  } catch (error) {
    logger.error('❌ Erro ao enviar confirmação:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia lembrete de agendamento (1h antes)
 */
export async function enviarLembreteAgendamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando lembrete: ${agendamentoId}`);

    if (await notificacaoJaEnviada(agendamentoId, 'lembrete')) {
      logger.info('⚠️ Lembrete já enviado');
      return { sucesso: true, mensagem: 'Já enviado' };
    }

    const agendamento = await buscarAgendamentoCompleto(agendamentoId);
    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, tenants } = agendamento;

    if (!clientes?.telefone) {
      return { sucesso: false, erro: 'Cliente sem telefone' };
    }

    // Extrair informações de serviços (único ou múltiplos)
    const infoServicos = extrairInfoServicos(agendamento);

    let endereco = null;
    if (tenants?.endereco) {
      endereco = tenants.endereco;
      if (tenants.cidade) endereco += `\n${tenants.cidade}`;
      if (tenants.estado) endereco += ` - ${tenants.estado}`;
    }

    const tipoNegocio = tenants?.tipo_negocio || 'barbearia';
    
    const mensagem = templateLembreteCliente({
      nomeCliente: clientes.nome,
      nomeBarbearia: tenants?.nome || 'Estabelecimento',
      nomeBarbeiro: barbeiros?.nome || 'Profissional',
      nomeServico: infoServicos.nomeServico,
      dataHora: agendamento.data_hora,
      endereco,
      tipoNegocio,
      duracaoTotal: infoServicos.duracaoTotal
    });

    const resultado = await enviarMensagem(clientes.telefone, mensagem);

    await registrarNotificacao(
      agendamento.tenant_id,
      agendamentoId,
      'lembrete',
      resultado.sucesso ? 'enviada' : 'erro',
      mensagem,
      resultado.erro
    );

    if (resultado.sucesso) {
      logger.info('✅ Lembrete enviado');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar lembrete:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia notificação de cancelamento
 */
export async function enviarNotificacaoCancelamento(agendamentoId) {
  try {
    logger.info(`📤 Enviando cancelamento: ${agendamentoId}`);

    if (await notificacaoJaEnviada(agendamentoId, 'cancelamento')) {
      logger.info('⚠️ Cancelamento já enviado');
      return { sucesso: true, mensagem: 'Já enviado' };
    }

    const agendamento = await buscarAgendamentoCompleto(agendamentoId);
    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, tenants } = agendamento;

    if (!clientes?.telefone) {
      return { sucesso: false, erro: 'Cliente sem telefone' };
    }

    // Extrair informações de serviços (único ou múltiplos)
    const infoServicos = extrairInfoServicos(agendamento);

    const tipoNegocio = tenants?.tipo_negocio || 'barbearia';
    
    const mensagem = templateCancelamentoCliente({
      nomeCliente: clientes.nome,
      nomeBarbearia: tenants?.nome || 'Estabelecimento',
      nomeBarbeiro: barbeiros?.nome || 'Profissional',
      nomeServico: infoServicos.nomeServico,
      dataHora: agendamento.data_hora,
      telefone: tenants?.whatsapp || tenants?.telefone,
      slug: tenants?.slug,
      tipoNegocio,
      duracaoTotal: infoServicos.duracaoTotal
    });

    const resultado = await enviarMensagem(clientes.telefone, mensagem);

    await registrarNotificacao(
      agendamento.tenant_id,
      agendamentoId,
      'cancelamento',
      resultado.sucesso ? 'enviada' : 'erro',
      mensagem,
      resultado.erro
    );

    if (resultado.sucesso) {
      logger.info('✅ Cancelamento enviado');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar cancelamento:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia notificação de remarcação
 */
export async function enviarNotificacaoRemarcacao(agendamentoId, dataHoraAntiga) {
  try {
    logger.info(`📤 Enviando remarcação: ${agendamentoId}`);

    const agendamento = await buscarAgendamentoCompleto(agendamentoId);
    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    const { clientes, barbeiros, servicos, tenants } = agendamento;

    if (!clientes?.telefone) {
      return { sucesso: false, erro: 'Cliente sem telefone' };
    }

    let endereco = null;
    if (tenants?.endereco) {
      endereco = tenants.endereco;
      if (tenants.cidade) endereco += `\n${tenants.cidade}`;
      if (tenants.estado) endereco += ` - ${tenants.estado}`;
    }

    const tipoNegocio = tenants?.tipo_negocio || 'barbearia';
    
    const mensagem = templateRemarcacaoCliente({
      nomeCliente: clientes.nome,
      nomeBarbearia: tenants?.nome || 'Estabelecimento',
      nomeBarbeiro: barbeiros?.nome || 'Profissional',
      nomeServico: servicos?.nome || 'Serviço',
      preco: servicos?.preco,
      dataHoraAntiga,
      dataHoraNova: agendamento.data_hora,
      endereco,
      telefone: tenants?.whatsapp || tenants?.telefone,
      slug: tenants?.slug,
      tipoNegocio
    });

    const resultado = await enviarMensagem(clientes.telefone, mensagem);

    await registrarNotificacao(
      agendamento.tenant_id,
      agendamentoId,
      'remarcacao',
      resultado.sucesso ? 'enviada' : 'erro',
      mensagem,
      resultado.erro
    );

    if (resultado.sucesso) {
      logger.info('✅ Remarcação enviada');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar remarcação:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia boas-vindas para novo tenant
 */
export async function enviarBoasVindasTenant(tenantId) {
  try {
    logger.info(`📤 Enviando boas-vindas tenant: ${tenantId}`);

    // Buscar dados do tenant e proprietário
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (!tenant?.whatsapp) {
      return { sucesso: false, erro: 'Tenant sem WhatsApp' };
    }

    const { data: proprietario } = await supabase
      .from('proprietarios')
      .select('nome')
      .eq('tenant_id', tenantId)
      .single();

    const mensagem = templateBoasVindasTenant({
      nomeBarbearia: tenant.nome,
      nomeProprietario: proprietario?.nome || 'Proprietário',
      slug: tenant.slug,
      tipoNegocio: tenant.tipo_negocio || 'barbearia'
    });

    const resultado = await enviarMensagem(tenant.whatsapp, mensagem);

    if (resultado.sucesso) {
      logger.info('✅ Boas-vindas enviadas ao tenant');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar boas-vindas:', error);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Envia boas-vindas para novo barbeiro cadastrado
 */
export async function enviarBoasVindasBarbeiro(barbeiroId) {
  try {
    logger.info(`📤 Enviando boas-vindas barbeiro: ${barbeiroId}`);

    // Buscar dados do barbeiro com tenant
    const { data: barbeiro, error } = await supabase
      .from('barbeiros')
      .select(`
        *,
        tenants (id, nome, slug, whatsapp, telefone, tipo_negocio)
      `)
      .eq('id', barbeiroId)
      .single();

    if (error || !barbeiro) {
      logger.error('Barbeiro não encontrado:', error);
      return { sucesso: false, erro: 'Barbeiro não encontrado' };
    }

    if (!barbeiro.telefone) {
      logger.warn('Barbeiro sem telefone cadastrado');
      return { sucesso: false, erro: 'Barbeiro sem telefone' };
    }

    if (!barbeiro.token_acesso) {
      logger.warn('Barbeiro sem token de acesso');
      return { sucesso: false, erro: 'Barbeiro sem token' };
    }

    const mensagem = templateBoasVindasBarbeiro({
      nomeBarbeiro: barbeiro.nome,
      nomeBarbearia: barbeiro.tenants?.nome || 'Estabelecimento',
      tokenAcesso: barbeiro.token_acesso,
      slug: barbeiro.tenants?.slug,
      tipoNegocio: barbeiro.tenants?.tipo_negocio || 'barbearia'
    });

    const resultado = await enviarMensagem(barbeiro.telefone, mensagem);

    if (resultado.sucesso) {
      logger.info('✅ Boas-vindas enviadas ao barbeiro');
    }

    return resultado;
  } catch (error) {
    logger.error('❌ Erro ao enviar boas-vindas barbeiro:', error);
    return { sucesso: false, erro: error.message };
  }
}

export default {
  enviarConfirmacaoAgendamento,
  enviarLembreteAgendamento,
  enviarNotificacaoCancelamento,
  enviarNotificacaoRemarcacao,
  enviarBoasVindasTenant,
  enviarBoasVindasBarbeiro
};
