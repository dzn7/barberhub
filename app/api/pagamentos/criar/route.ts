/**
 * API Route: Criar Pagamento PIX
 * Gera um novo pagamento PIX via Mercado Pago
 * 
 * POST /api/pagamentos/criar
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarPagamentoPix, VALOR_PLANO_MENSAL } from '@/lib/mercado-pago'

// Cliente Supabase com service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Interface para corpo da requisição
 */
interface CorpoRequisicao {
  tenantId: string
  plano?: string
  criadoPor?: string
}

/**
 * POST - Cria um novo pagamento PIX
 */
export async function POST(request: NextRequest) {
  try {
    const corpo = await request.json() as CorpoRequisicao
    const { tenantId, plano = 'basico', criadoPor } = corpo

    // Validar tenant ID
    if (!tenantId) {
      return NextResponse.json(
        { erro: 'ID do tenant é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar dados do tenant
    const { data: tenant, error: erroTenant } = await supabaseAdmin
      .from('tenants')
      .select('id, nome, email, slug')
      .eq('id', tenantId)
      .single()

    if (erroTenant || !tenant) {
      console.error('[Pagamentos] Tenant não encontrado:', erroTenant)
      return NextResponse.json(
        { erro: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já existe pagamento pendente
    const { data: pagamentoPendente } = await supabaseAdmin
      .from('pagamentos')
      .select('id, mercado_pago_id, qr_code_base64, copia_cola, data_expiracao')
      .eq('tenant_id', tenantId)
      .eq('status', 'pendente')
      .gt('data_expiracao', new Date().toISOString())
      .order('data_criacao', { ascending: false })
      .limit(1)
      .single()

    // Se existe pagamento pendente válido, retornar ele
    if (pagamentoPendente) {
      return NextResponse.json({
        sucesso: true,
        pagamentoId: pagamentoPendente.mercado_pago_id,
        qrCodeBase64: pagamentoPendente.qr_code_base64,
        copiaCola: pagamentoPendente.copia_cola,
        dataExpiracao: pagamentoPendente.data_expiracao,
        mensagem: 'Pagamento pendente existente retornado',
      })
    }

    // Criar novo pagamento no Mercado Pago
    const respostaMercadoPago = await criarPagamentoPix({
      tenantId: tenant.id,
      tenantNome: tenant.nome,
      tenantEmail: tenant.email,
      valor: VALOR_PLANO_MENSAL,
      descricao: `BarberHub - Assinatura Mensal - ${tenant.nome}`,
    })

    if (!respostaMercadoPago.sucesso) {
      console.error('[Pagamentos] Erro Mercado Pago:', respostaMercadoPago.erro)
      return NextResponse.json(
        { erro: respostaMercadoPago.erro || 'Erro ao gerar PIX' },
        { status: 500 }
      )
    }

    // Salvar pagamento no banco
    const { data: novoPagamento, error: erroPagamento } = await supabaseAdmin
      .from('pagamentos')
      .insert({
        tenant_id: tenantId,
        mercado_pago_id: respostaMercadoPago.pagamentoId,
        qr_code: respostaMercadoPago.qrCode,
        qr_code_base64: respostaMercadoPago.qrCodeBase64,
        copia_cola: respostaMercadoPago.copiaCola,
        valor: VALOR_PLANO_MENSAL,
        plano: plano,
        status: 'pendente',
        data_expiracao: respostaMercadoPago.dataExpiracao,
        criado_por: criadoPor || 'sistema',
      })
      .select()
      .single()

    if (erroPagamento) {
      console.error('[Pagamentos] Erro ao salvar pagamento:', erroPagamento)
      return NextResponse.json(
        { erro: 'Erro ao salvar pagamento' },
        { status: 500 }
      )
    }

    console.log(`[Pagamentos] PIX criado para tenant ${tenant.nome}: ${respostaMercadoPago.pagamentoId}`)

    return NextResponse.json({
      sucesso: true,
      pagamentoId: respostaMercadoPago.pagamentoId,
      qrCodeBase64: respostaMercadoPago.qrCodeBase64,
      copiaCola: respostaMercadoPago.copiaCola,
      dataExpiracao: respostaMercadoPago.dataExpiracao,
      valor: VALOR_PLANO_MENSAL,
    })

  } catch (erro) {
    console.error('[Pagamentos] Erro interno:', erro)
    return NextResponse.json(
      { erro: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
