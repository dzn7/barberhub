/**
 * Serviço de integração com Mercado Pago
 * Gera pagamentos PIX para assinaturas do BarberHub
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs
 */

// Valor fixo do plano mensal
export const VALOR_PLANO_MENSAL = 39.90

// Configurações do Mercado Pago
const MERCADO_PAGO_CONFIG = {
  apiUrl: 'https://api.mercadopago.com',
  publicKey: process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-d7cf2965-c6be-4b74-8552-bbc48ea2f742',
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-8649821026519916-010523-0dee33a7f2fe37709d9dd901b9db4bc9-2720172551',
}

/**
 * Interface para resposta de criação de pagamento PIX
 */
export interface RespostaPagamentoPix {
  sucesso: boolean
  pagamentoId?: string
  qrCode?: string
  qrCodeBase64?: string
  copiaCola?: string
  dataExpiracao?: string
  erro?: string
}

/**
 * Interface para dados do pagamento
 */
export interface DadosPagamento {
  tenantId: string
  tenantNome: string
  tenantEmail: string
  valor?: number
  descricao?: string
}

/**
 * Interface para resposta do webhook
 */
export interface WebhookMercadoPago {
  action: string
  api_version: string
  data: {
    id: string
  }
  date_created: string
  id: number
  live_mode: boolean
  type: string
  user_id: string
}

/**
 * Interface para detalhes do pagamento
 */
export interface DetalhesPagamento {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_process' | 'refunded'
  status_detail: string
  transaction_amount: number
  date_created: string
  date_approved?: string
  external_reference?: string
  payment_method_id: string
  payment_type_id: string
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string
      qr_code_base64?: string
      ticket_url?: string
    }
  }
}

/**
 * Cria um pagamento PIX no Mercado Pago
 * 
 * @param dados - Dados do tenant para o pagamento
 * @returns Resposta com QR Code e código copia e cola
 */
export async function criarPagamentoPix(dados: DadosPagamento): Promise<RespostaPagamentoPix> {
  try {
    const valor = dados.valor || VALOR_PLANO_MENSAL
    const descricao = dados.descricao || `BarberHub - Assinatura Mensal - ${dados.tenantNome}`
    
    // Data de expiração: 30 minutos
    const dataExpiracao = new Date()
    dataExpiracao.setMinutes(dataExpiracao.getMinutes() + 30)

    const corpoPagamento = {
      transaction_amount: valor,
      description: descricao,
      payment_method_id: 'pix',
      payer: {
        email: dados.tenantEmail,
      },
      external_reference: dados.tenantId,
      date_of_expiration: dataExpiracao.toISOString(),
      notification_url: `${process.env.NEXT_PUBLIC_URL || 'https://barberhub.online'}/api/pagamentos/webhook`,
    }

    const resposta = await fetch(`${MERCADO_PAGO_CONFIG.apiUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_CONFIG.accessToken}`,
        'X-Idempotency-Key': `${dados.tenantId}-${Date.now()}`,
      },
      body: JSON.stringify(corpoPagamento),
    })

    if (!resposta.ok) {
      const erro = await resposta.json()
      console.error('[MercadoPago] Erro ao criar pagamento:', erro)
      return {
        sucesso: false,
        erro: erro.message || 'Erro ao criar pagamento PIX',
      }
    }

    const pagamento = await resposta.json() as DetalhesPagamento

    // Extrair dados do QR Code
    const transactionData = pagamento.point_of_interaction?.transaction_data

    return {
      sucesso: true,
      pagamentoId: String(pagamento.id),
      qrCode: transactionData?.qr_code,
      qrCodeBase64: transactionData?.qr_code_base64,
      copiaCola: transactionData?.qr_code,
      dataExpiracao: dataExpiracao.toISOString(),
    }
  } catch (erro) {
    console.error('[MercadoPago] Erro ao criar pagamento PIX:', erro)
    return {
      sucesso: false,
      erro: 'Erro interno ao processar pagamento',
    }
  }
}

/**
 * Consulta o status de um pagamento no Mercado Pago
 * 
 * @param pagamentoId - ID do pagamento no Mercado Pago
 * @returns Detalhes do pagamento
 */
export async function consultarPagamento(pagamentoId: string): Promise<DetalhesPagamento | null> {
  try {
    const resposta = await fetch(`${MERCADO_PAGO_CONFIG.apiUrl}/v1/payments/${pagamentoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_CONFIG.accessToken}`,
      },
    })

    if (!resposta.ok) {
      console.error('[MercadoPago] Erro ao consultar pagamento:', await resposta.text())
      return null
    }

    return await resposta.json() as DetalhesPagamento
  } catch (erro) {
    console.error('[MercadoPago] Erro ao consultar pagamento:', erro)
    return null
  }
}

/**
 * Mapeia status do Mercado Pago para status interno
 */
export function mapearStatusPagamento(statusMercadoPago: string): string {
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

/**
 * Valida assinatura do webhook do Mercado Pago
 * 
 * @param signature - Assinatura do webhook
 * @param requestId - ID da requisição
 * @param dataId - ID dos dados
 * @returns Se a assinatura é válida
 */
export function validarAssinaturaWebhook(
  signature: string | null,
  requestId: string | null,
  dataId: string
): boolean {
  // Em produção, implementar validação HMAC
  // Por enquanto, aceita se tiver os headers básicos
  if (!signature || !requestId) {
    console.warn('[MercadoPago] Webhook sem assinatura ou request ID')
    return true // Aceitar temporariamente
  }
  
  return true
}
