/**
 * API Route: Consultar Status do Pagamento
 * Verifica o status atual de um pagamento PIX
 * 
 * GET /api/pagamentos/status?pagamentoId=xxx
 * GET /api/pagamentos/status?tenantId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consultarPagamento, mapearStatusPagamento } from '@/lib/mercado-pago'

// Cliente Supabase com service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - Consulta status do pagamento
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pagamentoId = searchParams.get('pagamentoId')
    const tenantId = searchParams.get('tenantId')

    if (!pagamentoId && !tenantId) {
      return NextResponse.json(
        { erro: 'Informe pagamentoId ou tenantId' },
        { status: 400 }
      )
    }

    // Buscar pagamento no banco
    let query = supabaseAdmin
      .from('pagamentos')
      .select('*')
      .order('data_criacao', { ascending: false })
      .limit(1)

    if (pagamentoId) {
      query = query.eq('mercado_pago_id', pagamentoId)
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data: pagamento, error: erroPagamento } = await query.single()

    if (erroPagamento || !pagamento) {
      return NextResponse.json(
        { erro: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    // Se status é pendente, verificar no Mercado Pago
    if (pagamento.status === 'pendente' && pagamento.mercado_pago_id) {
      const detalhesMercadoPago = await consultarPagamento(pagamento.mercado_pago_id)
      
      if (detalhesMercadoPago) {
        const novoStatus = mapearStatusPagamento(detalhesMercadoPago.status)
        
        // Atualizar se status mudou
        if (novoStatus !== pagamento.status) {
          await supabaseAdmin
            .from('pagamentos')
            .update({
              status: novoStatus,
              data_pagamento: detalhesMercadoPago.date_approved || null,
              metadados: {
                ...pagamento.metadados,
                status_detail: detalhesMercadoPago.status_detail,
              },
            })
            .eq('id', pagamento.id)

          // Se aprovado, ativar plano
          if (novoStatus === 'aprovado') {
            await ativarPlanoTenant(pagamento.tenant_id, pagamento.plano)
          }

          pagamento.status = novoStatus
        }
      }
    }

    // Verificar se expirou
    const expirado = pagamento.data_expiracao && 
      new Date(pagamento.data_expiracao) < new Date() &&
      pagamento.status === 'pendente'

    if (expirado) {
      await supabaseAdmin
        .from('pagamentos')
        .update({ status: 'expirado' })
        .eq('id', pagamento.id)
      
      pagamento.status = 'expirado'
    }

    return NextResponse.json({
      pagamentoId: pagamento.mercado_pago_id,
      status: pagamento.status,
      valor: pagamento.valor,
      plano: pagamento.plano,
      dataCriacao: pagamento.data_criacao,
      dataExpiracao: pagamento.data_expiracao,
      dataPagamento: pagamento.data_pagamento,
      qrCodeBase64: pagamento.qr_code_base64,
      copiaCola: pagamento.copia_cola,
    })

  } catch (erro) {
    console.error('[Status] Erro interno:', erro)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Ativa o plano do tenant
 */
async function ativarPlanoTenant(tenantId: string, plano: string): Promise<void> {
  try {
    const novaDataFim = new Date()
    novaDataFim.setDate(novaDataFim.getDate() + 30)

    await supabaseAdmin
      .from('tenants')
      .update({
        plano: plano || 'basico',
        ativo: true,
        suspenso: false,
        trial_fim: novaDataFim.toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', tenantId)

    console.log(`[Status] Plano ${plano} ativado para tenant ${tenantId}`)
  } catch (erro) {
    console.error('[Status] Erro ao ativar plano:', erro)
  }
}
