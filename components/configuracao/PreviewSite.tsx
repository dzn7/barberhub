'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Iphone } from '@/components/ui/iphone'
import {
  Store,
  MapPin,
  Calendar,
  Clock,
  Scissors,
  User,
  Star,
  Phone
} from 'lucide-react'
import { TipoNegocio } from '@/lib/tipos-negocio'

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
 * Componente de preview do site público
 * Mostra como ficará a página do negócio para os clientes
 * Utiliza mockup de iPhone do MagicUI
 */
export function PreviewSite({
  dados,
  totalServicos = 0,
  totalBarbeiros = 0,
  tipoNegocio = 'barbearia'
}: PreviewSiteProps) {
  const NOMES_PADRAO_POR_TIPO: Record<TipoNegocio, string> = {
    barbearia: 'Sua Barbearia',
    nail_designer: 'Seu Estúdio de Unhas',
    lash_designer: 'Seu Estúdio de Cílios',
    cabeleireira: 'Seu Salão'
  }

  const cores = {
    primaria: dados.cor_primaria || '#18181b',
    secundaria: dados.cor_secundaria || '#fafafa',
    destaque: dados.cor_destaque || '#a1a1aa'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Preview do Site
        </p>
        <span className="text-xs text-zinc-500 dark:text-zinc-600">
          Visão do cliente
        </span>
      </div>

      {/* Container do Preview com mockup iPhone */}
      <div className="relative mx-auto w-[240px]">
        {/* Mockup iPhone do MagicUI */}
        <div className="relative">
          <Iphone />
          
          {/* Conteúdo sobreposto na tela do iPhone */}
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
            {/* Barra de Status (simulada) */}
            <div 
              className="flex items-center justify-between px-5 py-1.5 text-[8px]"
              style={{ color: cores.secundaria }}
            >
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="w-3 h-1.5 rounded-sm border" style={{ borderColor: cores.secundaria }} />
              </div>
            </div>

            {/* Conteúdo do Site */}
            <div className="px-3 pb-4 space-y-3">
              {/* Header/Hero */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-2"
              >
                {/* Logo */}
                <div className="mx-auto mb-2">
                  {dados.logo_url ? (
                    <div className="relative w-12 h-12 mx-auto rounded-lg overflow-hidden border" style={{ borderColor: cores.destaque + '30' }}>
                      <Image
                        src={dados.logo_url}
                        alt="Logo"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cores.destaque + '20' }}
                    >
                      <Store className="w-5 h-5" style={{ color: cores.secundaria }} />
                    </div>
                  )}
                </div>

                {/* Nome */}
                <h1 
                  className="text-sm font-bold mb-0.5"
                  style={{ color: cores.secundaria }}
                >
                  {dados.nome || NOMES_PADRAO_POR_TIPO[tipoNegocio]}
                </h1>

                {/* Localização */}
                {(dados.cidade || dados.endereco) && (
                  <p 
                    className="text-[9px] flex items-center justify-center gap-0.5"
                    style={{ color: cores.destaque }}
                  >
                    <MapPin className="w-2 h-2" />
                    {dados.cidade || 'Sua Cidade'}{dados.estado ? `, ${dados.estado}` : ''}
                  </p>
                )}
              </motion.div>

              {/* Botão CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full py-1.5 rounded-md font-medium text-[10px] flex items-center justify-center gap-1"
                style={{
                  backgroundColor: cores.secundaria,
                  color: cores.primaria
                }}
              >
                <Calendar className="w-3 h-3" />
                Agendar Horário
              </motion.button>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-1 py-2"
              >
                <div className="text-center">
                  <div 
                    className="w-6 h-6 mx-auto mb-0.5 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <Scissors className="w-3 h-3" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-[9px] font-semibold" style={{ color: cores.secundaria }}>
                    {totalServicos || '—'}
                  </p>
                  <p className="text-[7px]" style={{ color: cores.destaque }}>
                    Serviços
                  </p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-6 h-6 mx-auto mb-0.5 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <User className="w-3 h-3" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-[9px] font-semibold" style={{ color: cores.secundaria }}>
                    {totalBarbeiros || '—'}
                  </p>
                  <p className="text-[7px]" style={{ color: cores.destaque }}>
                    Profissionais
                  </p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-6 h-6 mx-auto mb-0.5 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <Star className="w-3 h-3" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-[9px] font-semibold" style={{ color: cores.secundaria }}>
                    5.0
                  </p>
                  <p className="text-[7px]" style={{ color: cores.destaque }}>
                    Avaliação
                  </p>
                </div>
              </motion.div>

              {/* Preview de Serviços */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-1.5"
              >
                <p 
                  className="text-[9px] font-medium"
                  style={{ color: cores.secundaria }}
                >
                  Serviços
                </p>
                
                {/* Cards de serviço placeholder */}
                {[1, 2].map((i) => (
                  <div 
                    key={i}
                    className="p-2 rounded-md border"
                    style={{ 
                      backgroundColor: cores.destaque + '08',
                      borderColor: cores.destaque + '20'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div 
                          className="h-2 w-14 rounded"
                          style={{ backgroundColor: cores.destaque + '30' }}
                        />
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" style={{ color: cores.destaque }} />
                          <div 
                            className="h-1.5 w-8 rounded"
                            style={{ backgroundColor: cores.destaque + '20' }}
                          />
                        </div>
                      </div>
                      <div 
                        className="h-3 w-10 rounded"
                        style={{ backgroundColor: cores.destaque + '30' }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Contato */}
              {dados.whatsapp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-1 pt-1"
                >
                  <Phone className="w-2 h-2" style={{ color: cores.destaque }} />
                  <span className="text-[8px]" style={{ color: cores.destaque }}>
                    WhatsApp disponível
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-6 p-3 bg-zinc-100 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-lg">
        <p className="text-xs text-zinc-600 dark:text-zinc-500 text-center">
          Este é um preview aproximado. O site real terá mais seções e funcionalidades.
        </p>
      </div>
    </div>
  )
}
