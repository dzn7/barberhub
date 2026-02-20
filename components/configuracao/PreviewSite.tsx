'use client'

import Image from 'next/image'
import { Iphone } from '@/components/ui/iphone'
import {
  Store,
  MapPin,
  Calendar,
  Clock,
  Scissors,
  User,
  Sparkles,
  Phone
} from 'lucide-react'
import { TipoNegocio } from '@/lib/tipos-negocio'
import { obterTerminologia } from '@/lib/configuracoes-negocio'

interface PreviewSiteProps {
  dados: {
    nome: string
    logo_url: string
    endereco: string
    cidade: string
    estado: string
    cor_primaria: string
    cor_secundaria: string
    cor_destaque: string
    telefone?: string
    whatsapp?: string
  }
  totalServicos?: number
  totalBarbeiros?: number
  tipoNegocio?: TipoNegocio
}

/**
 * Componente de preview do site publico
 * Mostra como ficara a pagina do negocio para os clientes
 */
export function PreviewSite({
  dados,
  totalServicos = 0,
  totalBarbeiros = 0,
  tipoNegocio = 'barbearia'
}: PreviewSiteProps) {
  const terminologia = obterTerminologia(tipoNegocio)

  const NOMES_PADRAO_POR_TIPO: Record<TipoNegocio, string> = {
    barbearia: 'Sua Barbearia',
    nail_designer: 'Seu Estúdio de Unhas',
    lash_designer: 'Seu Estúdio de Cílios',
    cabeleireira: 'Seu Salão'
  }

  const CONTEUDO_POR_TIPO: Record<TipoNegocio, {
    cta: string
    chamada: string
    servicos: Array<{ nome: string; preco: string; duracao: string }>
  }> = {
    barbearia: {
      cta: 'Agendar horário',
      chamada: 'Cuidado clássico com resultado impecável.',
      servicos: [
        { nome: 'Corte Masculino', preco: 'R$ 45', duracao: '40 min' },
        { nome: 'Barba + Acabamento', preco: 'R$ 35', duracao: '30 min' }
      ]
    },
    nail_designer: {
      cta: 'Agendar sessão',
      chamada: 'Unhas alinhadas com seu estilo.',
      servicos: [
        { nome: 'Alongamento em Gel', preco: 'R$ 150', duracao: '120 min' },
        { nome: 'Esmaltação em Gel', preco: 'R$ 80', duracao: '60 min' }
      ]
    },
    lash_designer: {
      cta: 'Reservar horário',
      chamada: 'Olhar marcante com acabamento profissional.',
      servicos: [
        { nome: 'Fio a Fio', preco: 'R$ 180', duracao: '120 min' },
        { nome: 'Volume Brasileiro', preco: 'R$ 220', duracao: '150 min' }
      ]
    },
    cabeleireira: {
      cta: 'Quero agendar',
      chamada: 'Beleza e autoestima em cada atendimento.',
      servicos: [
        { nome: 'Corte Feminino', preco: 'R$ 90', duracao: '60 min' },
        { nome: 'Escova Modelada', preco: 'R$ 70', duracao: '45 min' }
      ]
    }
  }

  const conteudoAtual = CONTEUDO_POR_TIPO[tipoNegocio]

  const cores = {
    primaria: dados.cor_primaria || '#18181b',
    secundaria: dados.cor_secundaria || '#fafafa',
    destaque: dados.cor_destaque || '#a1a1aa'
  }

  const nomeExibicao = dados.nome || NOMES_PADRAO_POR_TIPO[tipoNegocio]
  const localExibicao = [dados.cidade, dados.estado].filter(Boolean).join(', ') || 'Sua cidade'
  const totalProfissionais = totalBarbeiros || '—'
  const totalServicosExibicao = totalServicos || '—'
  const quantidadeCards = totalServicos > 0 ? Math.min(totalServicos, 2) : 2

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/85 dark:to-zinc-950/70 p-4 ring-1 ring-zinc-200/70 dark:ring-zinc-800/70 overflow-x-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Preview do site</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Visual que o cliente verá ao abrir seu link</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Dispositivo</p>
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Mobile</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[262px]">
        <div className="relative">
          <Iphone />

          <div
            className="absolute overflow-hidden pointer-events-none"
            style={{
              backgroundColor: cores.primaria,
              left: '4.9%',
              top: '2.2%',
              width: '90.2%',
              height: '95.6%',
              borderRadius: '14.3% / 6.6%'
            }}
          >
            <div className="h-full px-3 pb-4 pt-2 flex flex-col">
              <div className="flex items-center justify-between px-1 text-[8px]" style={{ color: cores.secundaria }}>
                <span>9:41</span>
                <div className="h-1.5 w-4 rounded-sm border" style={{ borderColor: cores.secundaria }} />
              </div>

              <div
                className="rounded-xl border p-3 mt-2"
                style={{
                  backgroundColor: `${cores.secundaria}14`,
                  borderColor: `${cores.secundaria}2a`
                }}
              >
                <div className="flex items-center gap-2">
                  {dados.logo_url ? (
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border" style={{ borderColor: `${cores.destaque}40` }}>
                      <Image
                        src={dados.logo_url}
                        alt="Logo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cores.destaque}24` }}>
                      <Store className="w-5 h-5" style={{ color: cores.secundaria }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-[11px] font-bold truncate" style={{ color: cores.secundaria }}>
                      {nomeExibicao}
                    </h1>
                    <p className="text-[8px] mt-0.5 leading-relaxed" style={{ color: cores.destaque }}>
                      {conteudoAtual.chamada}
                    </p>
                    <p className="text-[8px] mt-1 flex items-center gap-1" style={{ color: cores.destaque }}>
                      <MapPin className="w-2 h-2" />
                      {localExibicao}
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="w-full py-2 rounded-lg font-semibold text-[10px] mt-2 flex items-center justify-center gap-1.5"
                style={{ backgroundColor: cores.secundaria, color: cores.primaria }}
              >
                <Calendar className="w-3 h-3" />
                {conteudoAtual.cta}
              </button>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-lg p-2 border" style={{ borderColor: `${cores.destaque}35`, backgroundColor: `${cores.destaque}12` }}>
                  <p className="text-[8px] flex items-center gap-1" style={{ color: cores.destaque }}>
                    <Scissors className="w-2.5 h-2.5" />
                    Serviços
                  </p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: cores.secundaria }}>{totalServicosExibicao}</p>
                </div>
                <div className="rounded-lg p-2 border" style={{ borderColor: `${cores.destaque}35`, backgroundColor: `${cores.destaque}12` }}>
                  <p className="text-[8px] flex items-center gap-1" style={{ color: cores.destaque }}>
                    <User className="w-2.5 h-2.5" />
                    {terminologia.profissional.plural}
                  </p>
                  <p className="text-[11px] font-semibold mt-1" style={{ color: cores.secundaria }}>{totalProfissionais}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-[9px] font-semibold flex items-center gap-1" style={{ color: cores.secundaria }}>
                  <Sparkles className="w-3 h-3" />
                  Serviços em destaque
                </p>
                {conteudoAtual.servicos.slice(0, quantidadeCards).map((servico, index) => (
                  <div
                    key={`${servico.nome}-${index}`}
                    className="p-2.5 rounded-lg border"
                    style={{
                      backgroundColor: `${cores.secundaria}0f`,
                      borderColor: `${cores.destaque}30`
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold truncate" style={{ color: cores.secundaria }}>
                          {servico.nome}
                        </p>
                        <p className="text-[8px] flex items-center gap-1 mt-0.5" style={{ color: cores.destaque }}>
                          <Clock className="w-2 h-2" />
                          {servico.duracao}
                        </p>
                      </div>
                      <p className="text-[9px] font-semibold" style={{ color: cores.secundaria }}>{servico.preco}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-2">
                <div className="flex items-center justify-between text-[8px]" style={{ color: cores.destaque }}>
                  <span className="flex items-center gap-1">
                    <Phone className="w-2 h-2" />
                    {dados.whatsapp ? 'WhatsApp ativo' : 'Adicione WhatsApp'}
                  </span>
                  <span className="font-medium">barberhub.online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
