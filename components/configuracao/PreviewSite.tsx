'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
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
}

/**
 * Componente de preview do site público
 * Mostra como ficará a página da barbearia para os clientes
 */
export function PreviewSite({ dados, totalServicos = 0, totalBarbeiros = 0 }: PreviewSiteProps) {
  const cores = {
    primaria: dados.cor_primaria || '#18181b',
    secundaria: dados.cor_secundaria || '#fafafa',
    destaque: dados.cor_destaque || '#a1a1aa'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">
          Preview do Site
        </p>
        <span className="text-xs text-zinc-600">
          Visão do cliente
        </span>
      </div>

      {/* Container do Preview com moldura de dispositivo */}
      <div className="relative mx-auto max-w-sm">
        {/* Moldura do celular */}
        <div className="relative bg-zinc-950 rounded-[2.5rem] p-3 shadow-2xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-950 rounded-b-2xl z-10" />
          
          {/* Tela */}
          <div 
            className="relative rounded-[2rem] overflow-hidden"
            style={{ backgroundColor: cores.primaria }}
          >
            {/* Barra de Status (simulada) */}
            <div 
              className="flex items-center justify-between px-6 py-2 text-[10px]"
              style={{ color: cores.secundaria }}
            >
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 rounded-sm border" style={{ borderColor: cores.secundaria }} />
              </div>
            </div>

            {/* Conteúdo do Site */}
            <div className="px-4 pb-6 space-y-4">
              {/* Header/Hero */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-4"
              >
                {/* Logo */}
                <div className="mx-auto mb-3">
                  {dados.logo_url ? (
                    <div className="relative w-16 h-16 mx-auto rounded-xl overflow-hidden border" style={{ borderColor: cores.destaque + '30' }}>
                      <Image
                        src={dados.logo_url}
                        alt="Logo"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: cores.destaque + '20' }}
                    >
                      <Store className="w-7 h-7" style={{ color: cores.secundaria }} />
                    </div>
                  )}
                </div>

                {/* Nome */}
                <h1 
                  className="text-lg font-bold mb-1"
                  style={{ color: cores.secundaria }}
                >
                  {dados.nome || 'Sua Barbearia'}
                </h1>

                {/* Localização */}
                {(dados.cidade || dados.endereco) && (
                  <p 
                    className="text-xs flex items-center justify-center gap-1"
                    style={{ color: cores.destaque }}
                  >
                    <MapPin className="w-3 h-3" />
                    {dados.cidade || 'Sua Cidade'}{dados.estado ? `, ${dados.estado}` : ''}
                  </p>
                )}
              </motion.div>

              {/* Botão CTA */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                style={{
                  backgroundColor: cores.secundaria,
                  color: cores.primaria
                }}
              >
                <Calendar className="w-4 h-4" />
                Agendar Horário
              </motion.button>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-3 gap-2 py-3"
              >
                <div className="text-center">
                  <div 
                    className="w-8 h-8 mx-auto mb-1 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <Scissors className="w-4 h-4" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: cores.secundaria }}>
                    {totalServicos || '—'}
                  </p>
                  <p className="text-[10px]" style={{ color: cores.destaque }}>
                    Serviços
                  </p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-8 h-8 mx-auto mb-1 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <User className="w-4 h-4" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: cores.secundaria }}>
                    {totalBarbeiros || '—'}
                  </p>
                  <p className="text-[10px]" style={{ color: cores.destaque }}>
                    Profissionais
                  </p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-8 h-8 mx-auto mb-1 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cores.destaque + '20' }}
                  >
                    <Star className="w-4 h-4" style={{ color: cores.secundaria }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: cores.secundaria }}>
                    5.0
                  </p>
                  <p className="text-[10px]" style={{ color: cores.destaque }}>
                    Avaliação
                  </p>
                </div>
              </motion.div>

              {/* Preview de Serviços */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <p 
                  className="text-xs font-medium"
                  style={{ color: cores.secundaria }}
                >
                  Serviços
                </p>
                
                {/* Cards de serviço placeholder */}
                {[1, 2].map((i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: cores.destaque + '08',
                      borderColor: cores.destaque + '20'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div 
                          className="h-3 w-20 rounded"
                          style={{ backgroundColor: cores.destaque + '30' }}
                        />
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" style={{ color: cores.destaque }} />
                          <div 
                            className="h-2 w-10 rounded"
                            style={{ backgroundColor: cores.destaque + '20' }}
                          />
                        </div>
                      </div>
                      <div 
                        className="h-4 w-14 rounded"
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
                  className="flex items-center justify-center gap-2 pt-2"
                >
                  <Phone className="w-3 h-3" style={{ color: cores.destaque }} />
                  <span className="text-xs" style={{ color: cores.destaque }}>
                    WhatsApp disponível
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
          <div className="w-8 h-1 bg-zinc-700 rounded-full" />
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-8 p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
        <p className="text-xs text-zinc-500 text-center">
          Este é um preview aproximado. O site real terá mais seções e funcionalidades.
        </p>
      </div>
    </div>
  )
}
