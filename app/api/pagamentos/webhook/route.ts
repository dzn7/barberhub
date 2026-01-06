/**
 * API Route: Webhook Mercado Pago
 * Recebe notificações de status de pagamentos
 * 
 * POST /api/pagamentos/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { 
  consultarPagamento, 
  mapearStatusPagamento,
  validarAssinaturaWebhook,
  WebhookMercadoPago 
} from '@/lib/mercado-pago'

// Cliente Supabase com service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST - Recebe webhook do Mercado Pago
 */
export async function POST(request: NextRequest) {
  try {
    // Headers do Mercado Pago
    const signature = request.headers.get('x-signature')
    const requestId = request.headers.get('x-request-id')

    const corpo = await request.json() as WebhookMercadoPago

    console.log('[Webhook] Notificação recebida:', {
      type: corpo.type,
      action: corpo.action,
      dataId: corpo.data?.id,
    })

    // Validar tipo de notificação
    if (corpo.type !== 'payment') {
      console.log('[Webhook] Tipo ignorado:', corpo.type)
      return NextResponse.json({ recebido: true })
    }

    const pagamentoId = corpo.data?.id
    if (!pagamentoId) {
      console.warn('[Webhook] Pagamento ID não encontrado')
      return NextResponse.json({ recebido: true })
    }

    // Validar assinatura (opcional em dev)
    const assinaturaValida = validarAssinaturaWebhook(signature, requestId, pagamentoId)
    if (!assinaturaValida) {
      console.error('[Webhook] Assinatura inválida')
      return NextResponse.json({ erro: 'Assinatura inválida' }, { status: 401 })
    }

    // Consultar detalhes do pagamento no Mercado Pago
    const detalhesPagamento = await consultarPagamento(pagamentoId)
    if (!detalhesPagamento) {
      console.error('[Webhook] Não foi possível consultar pagamento:', pagamentoId)
      return NextResponse.json({ recebido: true })
    }

    const statusInterno = mapearStatusPagamento(detalhesPagamento.status)
    const tenantId = detalhesPagamento.external_reference

    console.log('[Webhook] Status do pagamento:', {
      pagamentoId,
      statusMercadoPago: detalhesPagamento.status,
      statusInterno,
      tenantId,
    })

    // Atualizar pagamento no banco
    const { error: erroAtualizacao } = await supabaseAdmin
      .from('pagamentos')
      .update({
        status: statusInterno,
        data_pagamento: detalhesPagamento.date_approved || null,
        metadados: {
          status_detail: detalhesPagamento.status_detail,
          payment_method_id: detalhesPagamento.payment_method_id,
          transaction_amount: detalhesPagamento.transaction_amount,
        },
        atualizado_por: 'webhook',
      })
      .eq('mercado_pago_id', pagamentoId)

    if (erroAtualizacao) {
      console.error('[Webhook] Erro ao atualizar pagamento:', erroAtualizacao)
    }

    // Se pagamento aprovado, ativar plano do tenant
    if (statusInterno === 'aprovado' && tenantId) {
      await ativarPlanoTenant(tenantId)
    }

    return NextResponse.json({ 
      recebido: true,
      status: statusInterno,
    })

  } catch (erro) {
    console.error('[Webhook] Erro interno:', erro)
    return NextResponse.json(
      { erro: 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * Ativa o plano do tenant após pagamento aprovado
 * Salva o dia de cobrança para recorrência mensal
 */
async function ativarPlanoTenant(tenantId: string): Promise<void> {
  try {
    // Buscar pagamento aprovado mais recente
    const { data: pagamento } = await supabaseAdmin
      .from('pagamentos')
      .select('plano, data_pagamento')
      .eq('tenant_id', tenantId)
      .eq('status', 'aprovado')
      .order('data_pagamento', { ascending: false })
      .limit(1)
      .single()

    const plano = pagamento?.plano || 'basico'
    const dataPagamento = pagamento?.data_pagamento ? new Date(pagamento.data_pagamento) : new Date()
    
    // Dia do mês que o cliente pagou (para recorrência)
    const diaCobranca = dataPagamento.getDate()
    
    // Calcular próximo pagamento (mesmo dia do próximo mês)
    const dataProximoPagamento = new Date(dataPagamento)
    dataProximoPagamento.setMonth(dataProximoPagamento.getMonth() + 1)
    
    // Se o dia não existe no próximo mês (ex: 31 em fevereiro), ajustar
    if (dataProximoPagamento.getDate() !== diaCobranca) {
      dataProximoPagamento.setDate(0) // Último dia do mês anterior
    }

    // Atualizar tenant com dados de cobrança
    const { error: erroTenant } = await supabaseAdmin
      .from('tenants')
      .update({
        plano: plano,
        ativo: true,
        suspenso: false,
        trial_fim: dataProximoPagamento.toISOString(),
        dia_cobranca: diaCobranca,
        data_ultimo_pagamento: dataPagamento.toISOString(),
        data_proximo_pagamento: dataProximoPagamento.toISOString(),
        pagamento_pendente: false,
        notificacao_enviada: false,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', tenantId)

    if (erroTenant) {
      console.error('[Webhook] Erro ao ativar plano:', erroTenant)
      return
    }

    console.log(`[Webhook] Plano ${plano} ativado para tenant ${tenantId}. Dia cobrança: ${diaCobranca}. Próximo: ${dataProximoPagamento.toISOString()}`)

  } catch (erro) {
    console.error('[Webhook] Erro ao ativar plano:', erro)
  }
}

/**
 * GET - Endpoint de teste/health check
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'online',
    servico: 'webhook-mercado-pago',
    timestamp: new Date().toISOString(),
  })
}
