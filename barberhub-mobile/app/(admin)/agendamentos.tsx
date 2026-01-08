/**
 * Tela de Agendamentos - Gestão Completa
 * Design idêntico à versão web com tabs e calendário visual
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  parse,
  parseISO,
  isToday,
  addDays,
  subDays,
  startOfDay,
  startOfWeek,
  addWeeks,
  subWeeks,
  setHours,
  setMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { Card, Modal } from '../../src/components/ui';
import { AbaRemarcacao } from '../../src/components/agendamentos/AbaRemarcacao';
import { ModalRemarcacao } from '../../src/components/agendamentos/ModalRemarcacao';
import { CalendarioSemanal } from '../../src/components/calendario';
import { useAutenticacao } from '../../src/stores/autenticacao';
import { useTerminologia } from '../../src/hooks/useTerminologia';
import { supabase } from '../../src/services/supabase';
import {
  buscarConfiguracaoHorarios,
  DIAS_SEMANA_ABREV,
  HORARIOS_PADRAO,
  ConfiguracaoHorarios,
} from '../../src/services/horariosFuncionamento';
import { gerarTodosHorarios } from '../../src/services/horarios';
import { useTema } from '../../src/contexts/TemaContext';
import type { Agendamento, StatusAgendamento } from '../../src/types';

// Tipos
type SubTabAgendamento = 'agenda' | 'remarcacao';
type ModoVisualizacao = 'lista' | 'semanal';
type TipoVisualizacao = 'dia' | '3dias' | 'semana';

// Subtabs como no web
const SUBTABS: { id: SubTabAgendamento; label: string; icone: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'agenda', label: 'Agenda', icone: 'calendar-outline' },
  { id: 'remarcacao', label: 'Remarcação', icone: 'time-outline' },];

// Cores por status
const STATUS_CORES: Record<string, { bg: string; text: string }> = {
  pendente: { bg: '#fbbf24', text: '#78350f' },
  confirmado: { bg: '#10b981', text: '#ffffff' },
  concluido: { bg: '#3b82f6', text: '#ffffff' },
  cancelado: { bg: '#71717a', text: '#ffffff' },
};

export default function TelaAgendamentos() {
  const insets = useSafeAreaInsets();
  const { tenant } = useAutenticacao();
  const { profissional } = useTerminologia();
  
  const { cores, tema } = useTema();

  // Estados
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [subTabAtiva, setSubTabAtiva] = useState<SubTabAgendamento>('agenda');
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('semanal');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<TipoVisualizacao>('semana');
  const [dataBase, setDataBase] = useState(new Date());
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalRemarcacaoAberto, setModalRemarcacaoAberto] = useState(false);
  const [agendamentoParaRemarcar, setAgendamentoParaRemarcar] = useState<Agendamento | null>(null);
  const [versaoRemarcacao, setVersaoRemarcacao] = useState(0);
  
  // Modal Novo Agendamento - Design em 2 etapas igual ao web
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [etapaModal, setEtapaModal] = useState<'dados' | 'horario'>('dados');
  const [barbeiros, setBarbeiros] = useState<{ id: string; nome: string }[]>([]);
  const [servicos, setServicos] = useState<{ id: string; nome: string; preco: number; duracao: number }[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<{ horario: string; disponivel: boolean }[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [formNovo, setFormNovo] = useState({
    clienteNome: '',
    clienteTelefone: '',
    barbeiro_id: '',
    servico_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '',
  });
  const [erroNovo, setErroNovo] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [diasDisponiveis, setDiasDisponiveis] = useState<Date[]>([]);
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);

  useEffect(() => {
    const carregarConfig = async () => {
      if (!tenant?.id) return;
      const cfg = await buscarConfiguracaoHorarios(tenant.id);
      setConfigHorarios(cfg);
    };

    carregarConfig();
  }, [tenant?.id]);

  const horaInicio = configHorarios.horaInicio;
  const horaFim = configHorarios.horaFim;
  const diasFuncionamento = configHorarios.diasFuncionamento;

  // Calcular dias exibidos baseado na visualização
  const diasExibidos = useMemo(() => {
    if (tipoVisualizacao === 'dia') {
      return [dataBase];
    }
    
    if (tipoVisualizacao === '3dias') {
      return [subDays(dataBase, 1), dataBase, addDays(dataBase, 1)];
    }
    
    // Semana - filtrar apenas dias de funcionamento
    const inicioDaSemana = startOfWeek(dataBase, { weekStartsOn: 0 });
    const todosDias = Array.from({ length: 7 }, (_, i) => addDays(inicioDaSemana, i));

    const diasFiltrados = todosDias.filter((dia) => {
      const diaAbrev = DIAS_SEMANA_ABREV[dia.getDay()];
      return diasFuncionamento.includes(diaAbrev);
    });

    return diasFiltrados.length > 0 ? diasFiltrados : todosDias;
  }, [dataBase, tipoVisualizacao, diasFuncionamento]);

  // Título do período
  const tituloPeriodo = useMemo(() => {
    if (tipoVisualizacao === 'dia') {
      return format(dataBase, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    if (tipoVisualizacao === '3dias') {
      const inicio = subDays(dataBase, 1);
      const fim = addDays(dataBase, 1);
      if (inicio.getMonth() === fim.getMonth()) {
        return `${format(inicio, 'd')} - ${format(fim, "d 'de' MMMM", { locale: ptBR })}`;
      }
      return `${format(inicio, "d MMM", { locale: ptBR })} - ${format(fim, "d MMM", { locale: ptBR })}`;
    }
    return format(dataBase, "MMMM 'de' yyyy", { locale: ptBR });
  }, [dataBase, tipoVisualizacao]);

  // Carregar agendamentos
  const carregarAgendamentos = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      const primeiroDia = diasExibidos[0];
      const ultimoDia = diasExibidos[diasExibidos.length - 1];
      const inicioPeriodo = startOfDay(primeiroDia);
      const fimPeriodo = addDays(startOfDay(ultimoDia), 1);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (id, nome, telefone),
          barbeiros (id, nome, foto_url),
          servicos (id, nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', inicioPeriodo.toISOString())
        .lt('data_hora', fimPeriodo.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (erro) {
      console.error('Erro ao carregar agendamentos:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [tenant?.id, diasExibidos]);

  useEffect(() => {
    carregarAgendamentos();
  }, [carregarAgendamentos]);

  // Carregar dados para novo agendamento
  const carregarDadosNovoAgendamento = useCallback(async () => {
    if (!tenant?.id) return;
    
    try {
      const [barbeirosRes, servicosRes] = await Promise.all([
        supabase.from('barbeiros').select('id, nome').eq('tenant_id', tenant.id).eq('ativo', true).order('nome'),
        supabase.from('servicos').select('id, nome, preco, duracao').eq('tenant_id', tenant.id).eq('ativo', true).order('nome'),
      ]);
      
      if (barbeirosRes.data) {
        setBarbeiros(barbeirosRes.data);
        if (barbeirosRes.data.length > 0) {
          setFormNovo(prev => ({ ...prev, barbeiro_id: barbeirosRes.data[0].id }));
        }
      }
      if (servicosRes.data) {
        setServicos(servicosRes.data);
        if (servicosRes.data.length > 0) {
          setFormNovo(prev => ({ ...prev, servico_id: servicosRes.data[0].id }));
        }
      }
      
      const dias: Date[] = [];
      let diaAtual = new Date();
      let tentativas = 0;
      
      while (dias.length < 14 && tentativas < 45) {
        const abrev = DIAS_SEMANA_ABREV[diaAtual.getDay()];
        if (diasFuncionamento.includes(abrev)) {
          dias.push(new Date(diaAtual));
        }
        diaAtual = addDays(diaAtual, 1);
        tentativas++;
      }

      setDiasDisponiveis(dias);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    }
  }, [tenant?.id, diasFuncionamento]);

  // Buscar horários disponíveis para a data selecionada
  const buscarHorariosDisponiveis = useCallback(async () => {
    if (!tenant?.id || !formNovo.data || !formNovo.barbeiro_id) return;
    
    setCarregandoHorarios(true);
    try {
      const dataBase = parse(formNovo.data, 'yyyy-MM-dd', new Date());
      const inicioDia = new Date(dataBase);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(dataBase);
      fimDia.setHours(23, 59, 59, 999);

      const { data: agendamentosData, error: erroAgendamentos } = await supabase
        .from('agendamentos')
        .select(
          `
          id,
          data_hora,
          status,
          servicos (duracao)
        `
        )
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', formNovo.barbeiro_id)
        .gte('data_hora', inicioDia.toISOString())
        .lte('data_hora', fimDia.toISOString())
        .in('status', ['pendente', 'confirmado']);

      if (erroAgendamentos) throw erroAgendamentos;

      const dataFormatada = format(dataBase, 'yyyy-MM-dd');
      const { data: bloqueiosData, error: erroBloqueios } = await supabase
        .from('horarios_bloqueados')
        .select('horario_inicio, horario_fim, barbeiro_id')
        .eq('tenant_id', tenant.id)
        .eq('data', dataFormatada)
        .or(`barbeiro_id.is.null,barbeiro_id.eq.${formNovo.barbeiro_id}`);

      if (erroBloqueios) throw erroBloqueios;

      const horariosOcupadosAgendamentos = (agendamentosData || []).map((a: any) => ({
        horario: format(parseISO(a.data_hora), 'HH:mm'),
        duracao: (a.servicos as any)?.duracao || 30,
      }));

      const horariosOcupadosBloqueios = (bloqueiosData || []).map((b: any) => {
        const inicio = (b.horario_inicio as string).toString().slice(0, 5);
        const fim = (b.horario_fim as string).toString().slice(0, 5);

        const [hi, mi] = inicio.split(':').map(Number);
        const [hf, mf] = fim.split(':').map(Number);
        const duracao = Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));

        return { horario: inicio, duracao: duracao || (configHorarios.intervalo || 20) };
      });

      const horariosOcupados = [...horariosOcupadosAgendamentos, ...horariosOcupadosBloqueios];

      const servicoSelecionado = servicos.find((s) => s.id === formNovo.servico_id);
      const duracaoServico = servicoSelecionado?.duracao || 30;
      const inicio = `${horaInicio.toString().padStart(2, '0')}:00`;
      const fim = `${horaFim.toString().padStart(2, '0')}:00`;

      const todos = gerarTodosHorarios(
        duracaoServico,
        horariosOcupados,
        {
          inicio,
          fim,
          intervaloAlmocoInicio: configHorarios.intervaloAlmocoInicio,
          intervaloAlmocoFim: configHorarios.intervaloAlmocoFim,
          intervaloHorarios: configHorarios.intervalo || 20,
        },
        formNovo.data
      );

      setHorariosDisponiveis(todos.map((h) => ({ horario: h.horario, disponivel: h.disponivel })));
    } catch (erro) {
      console.error('Erro ao buscar horários:', erro);
      setHorariosDisponiveis([]);
    } finally {
      setCarregandoHorarios(false);
    }
  }, [tenant?.id, formNovo.data, formNovo.barbeiro_id, formNovo.servico_id, servicos, horaInicio, horaFim, configHorarios.intervalo, configHorarios.intervaloAlmocoInicio, configHorarios.intervaloAlmocoFim]);

  // Atualizar horários quando mudar data ou barbeiro
  useEffect(() => {
    if (modalNovoAberto && etapaModal === 'horario') {
      buscarHorariosDisponiveis();
    }
  }, [modalNovoAberto, etapaModal, buscarHorariosDisponiveis]);

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const abrirModalNovo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormNovo({
      clienteNome: '',
      clienteTelefone: '',
      barbeiro_id: '',
      servico_id: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      hora: '',
    });
    setEtapaModal('dados');
    setErroNovo('');
    carregarDadosNovoAgendamento();
    setModalNovoAberto(true);
  };

  const validarDadosNovo = () => {
    if (!formNovo.clienteNome.trim()) {
      setErroNovo('Digite o nome do cliente');
      return false;
    }
    if (!formNovo.clienteTelefone.trim() || formNovo.clienteTelefone.replace(/\D/g, '').length < 10) {
      setErroNovo('Digite um telefone válido');
      return false;
    }
    if (!formNovo.barbeiro_id) {
      setErroNovo('Selecione um profissional');
      return false;
    }
    if (!formNovo.servico_id) {
      setErroNovo('Selecione um serviço');
      return false;
    }
    setErroNovo('');
    return true;
  };

  const avancarParaHorario = () => {
    if (validarDadosNovo()) {
      setEtapaModal('horario');
      buscarHorariosDisponiveis();
    }
  };

  const salvarNovoAgendamento = async () => {
    if (!tenant?.id || !formNovo.hora) {
      setErroNovo('Selecione um horário');
      return;
    }
    
    setSalvandoNovo(true);
    setErroNovo('');
    
    try {
      const telefoneFormatado = formNovo.clienteTelefone.replace(/\D/g, '');
      let clienteId: string;
      
      // Verificar se cliente existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', telefoneFormatado)
        .maybeSingle();
      
      if (clienteExistente) {
        clienteId = clienteExistente.id;
        await supabase
          .from('clientes')
          .update({ nome: formNovo.clienteNome.trim() })
          .eq('id', clienteId);
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert({
            tenant_id: tenant.id,
            nome: formNovo.clienteNome.trim(),
            telefone: telefoneFormatado,
          })
          .select()
          .single();
        
        if (erroCliente) throw erroCliente;
        clienteId = novoCliente.id;
      }
      
      const [h, m] = formNovo.hora.split(':').map(Number);
      const dataSelecionada = parse(formNovo.data, 'yyyy-MM-dd', new Date());
      const dataHora = setMinutes(setHours(dataSelecionada, h), m);
      
      const { error } = await supabase.from('agendamentos').insert({
        tenant_id: tenant.id,
        cliente_id: clienteId,
        barbeiro_id: formNovo.barbeiro_id,
        servico_id: formNovo.servico_id,
        data_hora: dataHora.toISOString(),
        status: 'pendente',
      });
      
      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalNovoAberto(false);
      carregarAgendamentos();
    } catch (erro: any) {
      console.error('Erro ao criar agendamento:', erro);
      setErroNovo(erro.message || 'Erro ao criar agendamento');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = agendamentos.length;
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
    const concluidos = agendamentos.filter(a => a.status === 'concluido').length;
    const receita = agendamentos
      .filter(a => a.status !== 'cancelado')
      .reduce((acc, a) => acc + (a.servicos?.preco || 0), 0);
    return { total, pendentes, confirmados, concluidos, receita };
  }, [agendamentos]);

  // Navegação
  const navegarAnterior = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipoVisualizacao === 'semana') {
      setDataBase(prev => subWeeks(prev, 1));
    } else if (tipoVisualizacao === '3dias') {
      setDataBase(prev => addDays(prev, -3));
    } else {
      setDataBase(prev => addDays(prev, -1));
    }
  };

  const navegarProximo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tipoVisualizacao === 'semana') {
      setDataBase(prev => addWeeks(prev, 1));
    } else if (tipoVisualizacao === '3dias') {
      setDataBase(prev => addDays(prev, 3));
    } else {
      setDataBase(prev => addDays(prev, 1));
    }
  };

  const irParaHoje = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDataBase(new Date());
  };

  // Abrir WhatsApp
  const abrirWhatsApp = (telefone: string) => {
    const numero = telefone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${numero}`);
  };

  // Alterar status
  const alterarStatus = async (agendamentoId: string, novoStatus: StatusAgendamento) => {
    try {
      // Preparar dados de atualização
      const dadosAtualizacao: Record<string, unknown> = { status: novoStatus };

      // Se estiver concluindo, adicionar valor_pago e concluido_em para trigger de comissão
      if (novoStatus === 'concluido') {
        // Buscar o agendamento atual com o preço do serviço
        const agendamento = agendamentos.find(a => a.id === agendamentoId);
        if (agendamento?.servicos?.preco) {
          dadosAtualizacao.valor_pago = agendamento.servicos.preco;
        }
        dadosAtualizacao.concluido_em = new Date().toISOString();
      }

      // Se estiver confirmando, adicionar confirmado_em
      if (novoStatus === 'confirmado') {
        dadosAtualizacao.confirmado_em = new Date().toISOString();
      }

      // Se estiver cancelando, adicionar cancelado_em
      if (novoStatus === 'cancelado') {
        dadosAtualizacao.cancelado_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('agendamentos')
        .update(dadosAtualizacao)
        .eq('id', agendamentoId);

      if (error) throw error;

      // Se concluiu, incrementar total_atendimentos do barbeiro
      if (novoStatus === 'concluido') {
        const agendamento = agendamentos.find(a => a.id === agendamentoId);
        if (agendamento?.barbeiro_id) {
          await supabase.rpc('incrementar_atendimentos_barbeiro', {
            p_barbeiro_id: agendamento.barbeiro_id
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalDetalhesAberto(false);
      carregarAgendamentos();
    } catch (erro) {
      console.error('Erro ao alterar status:', erro);
    }
  };

  // Cor do status
  const obterCorStatus = (status: string) => STATUS_CORES[status]?.bg || '#71717a';

  const abrirRemarcacao = (ag: Agendamento) => {
    setAgendamentoParaRemarcar(ag);
    setModalRemarcacaoAberto(true);
  };

  // Renderizar calendário semanal
  const renderCalendarioSemanal = () => (
    <CalendarioSemanal
      agendamentos={agendamentos}
      dataBase={dataBase}
      onMudarData={setDataBase}
      onSelecionarAgendamento={(ag) => {
        setAgendamentoSelecionado(ag);
        setModalDetalhesAberto(true);
      }}
      carregando={carregando}
      tema={tema}
      horaInicio={horaInicio}
      horaFim={horaFim}
      diasFuncionamento={diasFuncionamento}
      visualizacao={tipoVisualizacao}
      onMudarVisualizacao={setTipoVisualizacao}
      tamanhoHora="normal"
    />
  );

  // Renderizar item da lista
  const renderAgendamentoLista = ({ item: ag }: { item: Agendamento }) => (
    <Card style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => {
          setAgendamentoSelecionado(ag);
          setModalDetalhesAberto(true);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View
          style={{
            width: 4,
            height: 50,
            borderRadius: 2,
            backgroundColor: obterCorStatus(ag.status),
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
            {ag.clientes?.nome || 'Cliente'}
          </Text>
          <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>
            {ag.servicos?.nome || 'Serviço'} • {format(parseISO(ag.data_hora), 'HH:mm')}
          </Text>
          <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>
            {ag.barbeiros?.nome || profissional()}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: cores.sucesso, fontSize: 15, fontWeight: '600' }}>
            R$ {(ag.servicos?.preco || 0).toFixed(2)}
          </Text>
          {ag.clientes?.telefone && (
            <Pressable
              onPress={() => abrirWhatsApp(ag.clientes?.telefone || '')}
              style={{ marginTop: 4 }}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </Pressable>
          )}
        </View>
      </Pressable>
    </Card>
  );

  if (carregando) {
    return (
      <View style={{ flex: 1, backgroundColor: cores.fundo.primario, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={cores.primaria.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo.primario }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: cores.fundo.secundario,
          borderBottomWidth: 1,
          borderBottomColor: cores.borda.sutil,
        }}
      >
        {/* Título e Descrição */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="calendar" size={24} color={cores.texto.secundario} />
            <View>
              <Text style={{ color: cores.texto.primario, fontSize: 20, fontWeight: '700' }}>
                Gestão de Agendamentos
              </Text>
              <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>
                Agendamentos online e remarcações
              </Text>
            </View>
          </View>
        </View>

        {/* Subtabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 8 }}
        >
          {SUBTABS.map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSubTabAtiva(tab.id);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: subTabAtiva === tab.id ? cores.botao.fundo : cores.fundo.terciario,
                borderWidth: 1,
                borderColor: subTabAtiva === tab.id ? cores.botao.fundo : cores.borda.media,
              }}
            >
              <Ionicons
                name={tab.icone}
                size={16}
                color={subTabAtiva === tab.id ? cores.botao.texto : cores.texto.secundario}
              />
              <Text
                style={{
                  color: subTabAtiva === tab.id ? cores.botao.texto : cores.texto.secundario,
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {subTabAtiva === 'agenda' && (
        <>
          {/* Cards de Estatísticas - Compactos */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: cores.fundo.primario }}>
            <View style={{ flex: 1, backgroundColor: cores.fundo.secundario, borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: cores.texto.terciario, fontSize: 10 }}>Total</Text>
              <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>{estatisticas.total}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: cores.fundo.secundario, borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: cores.texto.terciario, fontSize: 10 }}>Pendentes</Text>
              <Text style={{ color: cores.aviso, fontSize: 18, fontWeight: '700' }}>{estatisticas.pendentes}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: cores.fundo.secundario, borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: cores.texto.terciario, fontSize: 10 }}>Confirmados</Text>
              <Text style={{ color: cores.sucesso, fontSize: 18, fontWeight: '700' }}>{estatisticas.confirmados}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: cores.fundo.secundario, borderRadius: 8, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: cores.texto.terciario, fontSize: 10 }}>Receita</Text>
              <Text style={{ color: cores.info, fontSize: 14, fontWeight: '700' }}>R${estatisticas.receita.toFixed(0)}</Text>
            </View>
          </View>

          {/* Controles do Calendário */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: modoVisualizacao === 'semanal' ? 'flex-end' : 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: cores.fundo.primario,
              borderBottomWidth: 1,
              borderBottomColor: cores.borda.sutil,
            }}
          >
            {modoVisualizacao === 'lista' && (
              <>
                {/* Navegação e Título */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Pressable
                    onPress={irParaHoje}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: cores.fundo.terciario,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: cores.texto.primario, fontSize: 13, fontWeight: '500' }}>Hoje</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', backgroundColor: cores.fundo.terciario, borderRadius: 8 }}>
                    <Pressable onPress={navegarAnterior} style={{ padding: 6 }}>
                      <Ionicons name="chevron-back" size={20} color={cores.texto.secundario} />
                    </Pressable>
                    <Pressable onPress={navegarProximo} style={{ padding: 6 }}>
                      <Ionicons name="chevron-forward" size={20} color={cores.texto.secundario} />
                    </Pressable>
                  </View>

                  <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600', marginLeft: 8, textTransform: 'capitalize' }}>
                    {tituloPeriodo}
                  </Text>
                </View>
              </>
            )}

            {/* Botão Novo Agendamento + Toggle de visualização */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={abrirModalNovo}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: cores.botao.fundo,
                  borderRadius: 8,
                }}
              >
                <Ionicons name="add" size={16} color={cores.botao.texto} />
                <Text style={{ color: cores.botao.texto, fontSize: 13, fontWeight: '600' }}>Novo</Text>
              </Pressable>
              
              <View style={{ flexDirection: 'row', backgroundColor: cores.fundo.terciario, borderRadius: 8, padding: 2 }}>
              <Pressable
                onPress={() => setModoVisualizacao('lista')}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: modoVisualizacao === 'lista' ? cores.borda.media : 'transparent',
                }}
              >
                <Ionicons name="list" size={18} color={modoVisualizacao === 'lista' ? cores.texto.primario : cores.texto.terciario} />
              </Pressable>
              <Pressable
                onPress={() => setModoVisualizacao('semanal')}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: modoVisualizacao === 'semanal' ? cores.borda.media : 'transparent',
                }}
              >
                <Ionicons name="grid" size={18} color={modoVisualizacao === 'semanal' ? cores.texto.primario : cores.texto.terciario} />
              </Pressable>
              </View>
            </View>
          </View>

          {modoVisualizacao === 'lista' && (
            <>
              {/* Seletor de período */}
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  gap: 8,
                  backgroundColor: cores.fundo.primario,
                }}
              >
                {(['dia', '3dias', 'semana'] as TipoVisualizacao[]).map(tipo => (
                  <Pressable
                    key={tipo}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTipoVisualizacao(tipo);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: tipoVisualizacao === tipo ? cores.fundo.terciario : 'transparent',
                      borderWidth: 1,
                      borderColor: tipoVisualizacao === tipo ? cores.borda.media : cores.borda.sutil,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: tipoVisualizacao === tipo ? cores.texto.primario : cores.texto.terciario,
                        fontSize: 13,
                        fontWeight: '500',
                      }}
                    >
                      {tipo === 'dia' ? '1 Dia' : tipo === '3dias' ? '3 Dias' : 'Semana'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* Conteúdo */}
          {modoVisualizacao === 'semanal' ? (
            renderCalendarioSemanal()
          ) : (
            <FlatList
              data={agendamentos}
              keyExtractor={(item) => item.id}
              renderItem={renderAgendamentoLista}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={atualizando}
                  onRefresh={() => {
                    setAtualizando(true);
                    carregarAgendamentos();
                  }}
                  tintColor={cores.primaria.DEFAULT}
                />
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <Ionicons name="calendar-outline" size={64} color={cores.texto.terciario} />
                  <Text style={{ color: cores.texto.secundario, fontSize: 16, marginTop: 16 }}>
                    Nenhum agendamento
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {subTabAtiva === 'remarcacao' && (
        tenant?.id ? (
          <AbaRemarcacao
            key={versaoRemarcacao}
            tenantId={tenant.id}
            tema={tema}
            onSelecionarAgendamento={(ag) => abrirRemarcacao(ag)}
          />
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="alert-circle-outline" size={64} color={cores.texto.terciario} />
            <Text style={{ color: cores.texto.secundario, fontSize: 16, marginTop: 16 }}>
              Tenant não identificado
            </Text>
          </View>
        )
      )}

      {/* Modal Detalhes */}
      <Modal
        visivel={modalDetalhesAberto}
        onFechar={() => {
          setModalDetalhesAberto(false);
          setAgendamentoSelecionado(null);
        }}
        titulo="Detalhes do Agendamento"
        tamanho="grande"
        tema={tema}
      >
        {agendamentoSelecionado && (
          <View style={{ gap: 20 }}>
            {/* Cliente */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: cores.fundo.terciario,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person" size={28} color={cores.texto.secundario} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: cores.texto.primario, fontSize: 18, fontWeight: '700' }}>
                  {agendamentoSelecionado.clientes?.nome || 'Cliente'}
                </Text>
                <Text style={{ color: cores.texto.secundario, fontSize: 14 }}>
                  {agendamentoSelecionado.clientes?.telefone || 'Sem telefone'}
                </Text>
              </View>
              {agendamentoSelecionado.clientes?.telefone && (
                <Pressable
                  onPress={() => abrirWhatsApp(agendamentoSelecionado.clientes?.telefone || '')}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#25D366',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={24} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Info */}
            <View style={{ backgroundColor: cores.fundo.terciario, borderRadius: 12, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>Serviço</Text>
                <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
                  {agendamentoSelecionado.servicos?.nome || 'Serviço'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>Data e Hora</Text>
                <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>
                  {format(parseISO(agendamentoSelecionado.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: cores.texto.terciario, fontSize: 13 }}>Valor</Text>
                <Text style={{ color: cores.sucesso, fontSize: 18, fontWeight: '700' }}>
                  R$ {(agendamentoSelecionado.servicos?.preco || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Ações */}
            {agendamentoSelecionado.status === 'pendente' && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => alterarStatus(agendamentoSelecionado.id, 'confirmado')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: cores.sucesso,
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Confirmar</Text>
                </Pressable>
                <Pressable
                  onPress={() => alterarStatus(agendamentoSelecionado.id, 'cancelado')}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: cores.erro,
                    paddingVertical: 14,
                    borderRadius: 12,
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Cancelar</Text>
                </Pressable>
              </View>
            )}

            {(agendamentoSelecionado.status === 'pendente' || agendamentoSelecionado.status === 'confirmado') && (
              <Pressable
                onPress={() => {
                  setModalDetalhesAberto(false);
                  abrirRemarcacao(agendamentoSelecionado);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: cores.botao.fundo,
                  paddingVertical: 14,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="refresh" size={20} color={cores.botao.texto} />
                <Text style={{ color: cores.botao.texto, fontSize: 15, fontWeight: '700' }}>Remarcar</Text>
              </Pressable>
            )}

            {agendamentoSelecionado.status === 'confirmado' && (
              <Pressable
                onPress={() => alterarStatus(agendamentoSelecionado.id, 'concluido')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: cores.info,
                  paddingVertical: 14,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Marcar como Concluído
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Modal>

      <ModalRemarcacao
        visivel={modalRemarcacaoAberto}
        onFechar={() => {
          setModalRemarcacaoAberto(false);
          setAgendamentoParaRemarcar(null);
        }}
        agendamento={agendamentoParaRemarcar as any}
        onSucesso={() => {
          setVersaoRemarcacao(v => v + 1);
          carregarAgendamentos();
        }}
        tema={tema}
      />

      {/* Modal Novo Agendamento - Design em 2 etapas */}
      <Modal
        visivel={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        titulo={etapaModal === 'dados' ? 'Novo Agendamento' : 'Escolha o Horário'}
        tamanho="grande"
        tema={tema}
      >
        {etapaModal === 'dados' ? (
          <>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 16 }}>
                {/* Erro */}
                {erroNovo ? (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                    <Text style={{ color: '#f87171', fontSize: 13 }}>{erroNovo}</Text>
                  </View>
                ) : null}

                {/* Nome do Cliente */}
                <View>
                  <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>Nome do Cliente</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo.terciario, borderRadius: 12, borderWidth: 1, borderColor: cores.borda.media }}>
                    <Ionicons name="person-outline" size={18} color={cores.texto.terciario} style={{ marginLeft: 14 }} />
                    <TextInput
                      value={formNovo.clienteNome}
                      onChangeText={(text) => setFormNovo(prev => ({ ...prev, clienteNome: text }))}
                      placeholder="Digite o nome"
                      placeholderTextColor={cores.texto.terciario}
                      style={{ flex: 1, color: cores.texto.primario, fontSize: 15, paddingVertical: 14, paddingHorizontal: 10 }}
                    />
                  </View>
                </View>

                {/* Telefone */}
                <View>
                  <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>Telefone (WhatsApp)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo.terciario, borderRadius: 12, borderWidth: 1, borderColor: cores.borda.media }}>
                    <Ionicons name="call-outline" size={18} color={cores.texto.terciario} style={{ marginLeft: 14 }} />
                    <TextInput
                      value={formNovo.clienteTelefone}
                      onChangeText={(text) => setFormNovo(prev => ({ ...prev, clienteTelefone: formatarTelefone(text) }))}
                      placeholder="(00) 00000-0000"
                      placeholderTextColor={cores.texto.terciario}
                      keyboardType="phone-pad"
                      style={{ flex: 1, color: cores.texto.primario, fontSize: 15, paddingVertical: 14, paddingHorizontal: 10 }}
                    />
                  </View>
                </View>

                {/* Profissional */}
                <View>
                  <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>{profissional(false)}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {barbeiros.map(b => (
                      <Pressable
                        key={b.id}
                        onPress={() => setFormNovo(prev => ({ ...prev, barbeiro_id: b.id }))}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: formNovo.barbeiro_id === b.id ? cores.botao.fundo : cores.fundo.terciario,
                          borderWidth: 2,
                          borderColor: formNovo.barbeiro_id === b.id ? cores.botao.fundo : cores.borda.media,
                        }}
                      >
                        <Text style={{ 
                          color: formNovo.barbeiro_id === b.id ? cores.botao.texto : cores.texto.primario,
                          fontSize: 14,
                          fontWeight: '600',
                        }}>
                          {b.nome}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Serviço */}
                <View>
                  <Text style={{ color: cores.texto.secundario, fontSize: 13, marginBottom: 8 }}>Serviço</Text>
                  <View style={{ gap: 8, maxHeight: 150 }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {servicos.map(s => (
                        <Pressable
                          key={s.id}
                          onPress={() => setFormNovo(prev => ({ ...prev, servico_id: s.id }))}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                            backgroundColor: formNovo.servico_id === s.id ? cores.transparente.branco10 : 'transparent',
                            borderWidth: 2,
                            borderColor: formNovo.servico_id === s.id ? cores.botao.fundo : cores.borda.media,
                          }}
                        >
                          <View>
                            <Text style={{ color: cores.texto.primario, fontSize: 14, fontWeight: '600' }}>{s.nome}</Text>
                            <Text style={{ color: cores.texto.terciario, fontSize: 12 }}>{s.duracao} min</Text>
                          </View>
                          <Text style={{ color: cores.sucesso, fontSize: 16, fontWeight: '700' }}>
                            R$ {s.preco.toFixed(2)}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Botão Avançar */}
            <Pressable
              onPress={avancarParaHorario}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: cores.botao.fundo,
                paddingVertical: 14,
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              <Text style={{ color: cores.botao.texto, fontSize: 15, fontWeight: '700' }}>Escolher Horário</Text>
              <Ionicons name="time-outline" size={18} color={cores.botao.texto} />
            </Pressable>
          </>
        ) : (
          <>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 16 }}>
                {/* Erro */}
                {erroNovo ? (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                    <Text style={{ color: '#f87171', fontSize: 13 }}>{erroNovo}</Text>
                  </View>
                ) : null}

                {/* Seletor de Data */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Selecione a Data</Text>
                    <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>
                      {format(parseISO(formNovo.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {diasDisponiveis.map(dia => {
                        const dataStr = format(dia, 'yyyy-MM-dd');
                        const selecionado = formNovo.data === dataStr;
                        const ehHoje = isToday(dia);
                        return (
                          <Pressable
                            key={dataStr}
                            onPress={() => {
                              setFormNovo(prev => ({ ...prev, data: dataStr, hora: '' }));
                            }}
                            style={{
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 56,
                              paddingVertical: 10,
                              paddingHorizontal: 8,
                              borderRadius: 12,
                              backgroundColor: selecionado ? cores.botao.fundo : cores.fundo.terciario,
                            }}
                          >
                            <Text style={{ color: selecionado ? cores.botao.texto : cores.texto.terciario, fontSize: 10, textTransform: 'uppercase', fontWeight: '500' }}>
                              {format(dia, 'EEE', { locale: ptBR })}
                            </Text>
                            <Text style={{ color: selecionado ? cores.botao.texto : (ehHoje ? cores.info : cores.texto.primario), fontSize: 18, fontWeight: '700', marginTop: 2 }}>
                              {format(dia, 'd')}
                            </Text>
                            {ehHoje && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: selecionado ? cores.botao.texto : cores.info, marginTop: 4 }} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Grid de Horários */}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: cores.texto.secundario, fontSize: 13 }}>Horários Disponíveis</Text>
                    {carregandoHorarios ? (
                      <ActivityIndicator size="small" color={cores.texto.terciario} />
                    ) : (
                      <Text style={{ color: cores.texto.terciario, fontSize: 11 }}>
                        {horariosDisponiveis.filter(h => h.disponivel).length} disponíveis
                      </Text>
                    )}
                  </View>
                  
                  {carregandoHorarios ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <ActivityIndicator size="large" color={cores.texto.terciario} />
                    </View>
                  ) : horariosDisponiveis.filter(h => h.disponivel).length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30, backgroundColor: cores.fundo.terciario, borderRadius: 12 }}>
                      <Ionicons name="alert-circle-outline" size={40} color={cores.aviso} />
                      <Text style={{ color: cores.texto.secundario, fontSize: 14, marginTop: 8 }}>Todos os horários ocupados</Text>
                      <Text style={{ color: cores.texto.terciario, fontSize: 12, marginTop: 2 }}>Tente outra data</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {horariosDisponiveis.map(item => (
                        <Pressable
                          key={item.horario}
                          onPress={() => item.disponivel && setFormNovo(prev => ({ ...prev, hora: item.horario }))}
                          disabled={!item.disponivel}
                          style={{
                            width: '22%',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: !item.disponivel ? cores.fundo.primario : (formNovo.hora === item.horario ? cores.botao.fundo : cores.fundo.terciario),
                            opacity: item.disponivel ? 1 : 0.4,
                          }}
                        >
                          <Text style={{ 
                            color: !item.disponivel ? cores.texto.terciario : (formNovo.hora === item.horario ? cores.botao.texto : cores.texto.primario),
                            fontSize: 13,
                            fontWeight: '600',
                            textDecorationLine: item.disponivel ? 'none' : 'line-through',
                          }}>
                            {item.horario}
                          </Text>
                          {formNovo.hora === item.horario && item.disponivel && (
                            <View style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: cores.sucesso, alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="checkmark" size={12} color="#ffffff" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Botões Footer */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => setEtapaModal('dados')}
                disabled={salvandoNovo}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: cores.fundo.terciario,
                }}
              >
                <Text style={{ color: cores.texto.primario, fontSize: 15, fontWeight: '600' }}>Voltar</Text>
              </Pressable>
              <Pressable
                onPress={salvarNovoAgendamento}
                disabled={salvandoNovo || !formNovo.hora}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: !formNovo.hora ? cores.borda.media : cores.botao.fundo,
                  opacity: salvandoNovo ? 0.7 : 1,
                }}
              >
                {salvandoNovo ? (
                  <ActivityIndicator size="small" color={cores.botao.texto} />
                ) : (
                  <>
                    <Ionicons name="add" size={18} color={cores.botao.texto} />
                    <Text style={{ color: cores.botao.texto, fontSize: 15, fontWeight: '700' }}>Criar</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
      </Modal>
    </View>
  );
}
