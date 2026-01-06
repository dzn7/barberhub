/**
 * Cloudflare Worker: Verificador de Pagamentos PIX
 * 
 * Executa periodicamente para verificar status de pagamentos pendentes
 * e atualizar o banco de dados quando pagamentos são confirmados.
 * 
 * Deploy: wrangler deploy
 * 
 * Documentação Wrangler: https://developers.cloudflare.com/workers/wrangler/
 */

export interface Env {
  // Variáveis de ambiente configuradas no Cloudflare
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  MERCADO_PAGO_ACCESS_TOKEN: string
}

// Configurações
const MERCADO_PAGO_API = 'https://api.mercadopago.com'

/**
 * Interface para pagamento pendente
 */
interface PagamentoPendente {
  id: string
  tenant_id: string
  mercado_pago_id: string
  plano: string
  data_expiracao: string
}

/**
 * Handler principal do Worker
 * Pode ser acionado via Cron Trigger ou HTTP
 */
export default {
  /**
   * Handler para requisições HTTP (teste manual)
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // Endpoint de health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'online',
        servico: 'verificar-pagamentos',
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Endpoint para verificação manual
    if (url.pathname === '/verificar') {
      const resultado = await verificarPagamentosPendentes(env)
      return new Response(JSON.stringify(resultado), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Worker Verificar Pagamentos - BarberHub', {
      headers: { 'Content-Type': 'text/plain' },
    })
  },

  /**
   * Handler para Cron Triggers (execução agendada)
   * Configurar no wrangler.toml: crons = ["*​/5 * * * *"] (a cada 5 minutos)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(verificarPagamentosPendentes(env))
  },
}

/**
 * Verifica todos os pagamentos pendentes
 */
async function verificarPagamentosPendentes(env: Env): Promise<{
  verificados: number
  atualizados: number
  erros: number
}> {
  console.log('[Worker] Iniciando verificação de pagamentos...')
  
  let verificados = 0
  let atualizados = 0
  let erros = 0

  try {
    // Buscar pagamentos pendentes no Supabase
    const pagamentosPendentes = await buscarPagamentosPendentes(env)
    verificados = pagamentosPendentes.length

    console.log(`[Worker] ${verificados} pagamentos pendentes encontrados`)

    // Verificar cada pagamento no Mercado Pago
    for (const pagamento of pagamentosPendentes) {
      try {
        const atualizado = await verificarEAtualizarPagamento(env, pagamento)
        if (atualizado) {
          atualizados++
        }
      } catch (erro) {
        console.error(`[Worker] Erro ao verificar pagamento ${pagamento.id}:`, erro)
        erros++
      }
    }

    // Marcar pagamentos expirados
    const expirados = await marcarPagamentosExpirados(env)
    console.log(`[Worker] ${expirados} pagamentos marcados como expirados`)

  } catch (erro) {
    console.error('[Worker] Erro geral:', erro)
    erros++
  }

  console.log(`[Worker] Verificação concluída: ${verificados} verificados, ${atualizados} atualizados, ${erros} erros`)

  return { verificados, atualizados, erros }
}

/**
 * Busca pagamentos pendentes no Supabase
 */
async function buscarPagamentosPendentes(env: Env): Promise<PagamentoPendente[]> {
  const resposta = await fetch(
    `${env.SUPABASE_URL}/rest/v1/pagamentos?status=eq.pendente&select=id,tenant_id,mercado_pago_id,plano,data_expiracao`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!resposta.ok) {
    throw new Error(`Erro ao buscar pagamentos: ${resposta.status}`)
  }

  return await resposta.json()
}

/**
 * Verifica status no Mercado Pago e atualiza se necessário
 */
async function verificarEAtualizarPagamento(
  env: Env, 
  pagamento: PagamentoPendente
): Promise<boolean> {
  // Consultar Mercado Pago
  const resposta = await fetch(
    `${MERCADO_PAGO_API}/v1/payments/${pagamento.mercado_pago_id}`,
    {
      headers: {
        'Authorization': `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    }
  )

  if (!resposta.ok) {
    console.error(`[Worker] Erro ao consultar MP: ${resposta.status}`)
    return false
  }

  const detalhesPagamento = await resposta.json() as {
    status: string
    status_detail: string
    date_approved?: string
  }

  const novoStatus = mapearStatus(detalhesPagamento.status)

  // Se status mudou, atualizar no banco
  if (novoStatus !== 'pendente') {
    await atualizarPagamento(env, pagamento.id, {
      status: novoStatus,
      data_pagamento: detalhesPagamento.date_approved || null,
      metadados: {
        status_detail: detalhesPagamento.status_detail,
        verificado_por: 'worker',
        verificado_em: new Date().toISOString(),
      },
    })

    // Se aprovado, ativar plano do tenant
    if (novoStatus === 'aprovado') {
      await ativarPlanoTenant(env, pagamento.tenant_id, pagamento.plano)
    }

    console.log(`[Worker] Pagamento ${pagamento.id} atualizado: ${novoStatus}`)
    return true
  }

  return false
}

/**
 * Atualiza pagamento no Supabase
 */
async function atualizarPagamento(
  env: Env, 
  pagamentoId: string, 
  dados: Record<string, unknown>
): Promise<void> {
  const resposta = await fetch(
    `${env.SUPABASE_URL}/rest/v1/pagamentos?id=eq.${pagamentoId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(dados),
    }
  )

  if (!resposta.ok) {
    throw new Error(`Erro ao atualizar pagamento: ${resposta.status}`)
  }
}

/**
 * Ativa plano do tenant após pagamento aprovado
 */
async function ativarPlanoTenant(
  env: Env, 
  tenantId: string, 
  plano: string
): Promise<void> {
  const novaDataFim = new Date()
  novaDataFim.setDate(novaDataFim.getDate() + 30)

  const resposta = await fetch(
    `${env.SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        plano: plano || 'basico',
        ativo: true,
        suspenso: false,
        trial_fim: novaDataFim.toISOString(),
        atualizado_em: new Date().toISOString(),
      }),
    }
  )

  if (!resposta.ok) {
    throw new Error(`Erro ao ativar plano: ${resposta.status}`)
  }

  console.log(`[Worker] Plano ${plano} ativado para tenant ${tenantId}`)
}

/**
 * Marca pagamentos expirados
 */
async function marcarPagamentosExpirados(env: Env): Promise<number> {
  const agora = new Date().toISOString()
  
  const resposta = await fetch(
    `${env.SUPABASE_URL}/rest/v1/pagamentos?status=eq.pendente&data_expiracao=lt.${agora}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ status: 'expirado' }),
    }
  )

  if (!resposta.ok) {
    return 0
  }

  const atualizados = await resposta.json()
  return Array.isArray(atualizados) ? atualizados.length : 0
}

/**
 * Mapeia status do Mercado Pago para status interno
 */
function mapearStatus(statusMercadoPago: string): string {
  const mapeamento: Record<string, string> = {
    'pending': 'pendente',
    'approved': 'aprovado',
    'rejected': 'rejeitado',
    'cancelled': 'cancelado',
    'in_process': 'pendente',
    'refunded': 'cancelado',
  }
  
  return mapeamento[statusMercadoPago] || 'pendente'
}
