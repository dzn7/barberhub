/**
 * Serviço de integração com Mercado Pago
 * Geração de pagamentos PIX e verificação de status
 */

import { supabase } from './supabase';
import { CONFIG } from '../constants/config';

interface DadosPagamento {
  tenantId: string;
  valor: number;
  plano: string;
  descricao?: string;
}

interface RespostaPagamento {
  sucesso: boolean;
  pagamentoId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  copiaCola?: string;
  erro?: string;
}

interface StatusPagamento {
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado' | 'expirado';
  dataPagamento?: string;
}

/**
 * Cria um pagamento PIX via Mercado Pago
 */
export async function criarPagamentoPix(dados: DadosPagamento): Promise<RespostaPagamento> {
  try {
    // Chamar Edge Function do Supabase para criar pagamento
    const { data, error } = await supabase.functions.invoke('criar-pagamento-pix', {
      body: {
        tenant_id: dados.tenantId,
        valor: dados.valor,
        plano: dados.plano,
        descricao: dados.descricao || `Assinatura BarberHub - Plano ${dados.plano}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      sucesso: true,
      pagamentoId: data.id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      copiaCola: data.copia_cola,
    };
  } catch (erro: any) {
    console.error('Erro ao criar pagamento PIX:', erro);
    return {
      sucesso: false,
      erro: erro.message || 'Erro ao criar pagamento',
    };
  }
}

/**
 * Verifica o status de um pagamento
 */
export async function verificarStatusPagamento(pagamentoId: string): Promise<StatusPagamento> {
  try {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('status, data_pagamento')
      .eq('id', pagamentoId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: data.status,
      dataPagamento: data.data_pagamento,
    };
  } catch (erro) {
    console.error('Erro ao verificar status do pagamento:', erro);
    return { status: 'pendente' };
  }
}

/**
 * Busca pagamento pendente do tenant
 */
export async function buscarPagamentoPendente(tenantId: string): Promise<RespostaPagamento | null> {
  try {
    const { data, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pendente')
      .order('data_criacao', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      sucesso: true,
      pagamentoId: data.id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      copiaCola: data.copia_cola,
    };
  } catch (erro) {
    console.error('Erro ao buscar pagamento pendente:', erro);
    return null;
  }
}

/**
 * Valores dos planos disponíveis
 */
export const PLANOS = {
  basico: {
    nome: 'Básico',
    valor: 49.90,
    descricao: 'Até 2 profissionais',
    recursos: [
      'Agendamento online',
      'Notificações WhatsApp',
      'Painel administrativo',
      'Relatórios básicos',
    ],
  },
  profissional: {
    nome: 'Profissional',
    valor: 99.90,
    descricao: 'Até 5 profissionais',
    recursos: [
      'Tudo do plano Básico',
      'Controle financeiro',
      'Comissões automáticas',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  enterprise: {
    nome: 'Enterprise',
    valor: 199.90,
    descricao: 'Profissionais ilimitados',
    recursos: [
      'Tudo do plano Profissional',
      'Multi-filiais',
      'API personalizada',
      'Gestor de conta dedicado',
      'Customizações exclusivas',
    ],
  },
} as const;

export type PlanoDisponivel = keyof typeof PLANOS;
