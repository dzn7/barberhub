'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { 
  Scissors, 
  Calendar, 
  LogOut, 
  Menu, 
  X, 
  TrendingUp,
  Settings,
  Star,
  Hand
} from 'lucide-react'
import { Tabs } from '@radix-ui/themes'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'
import { AlternadorTema } from '@/components/AlternadorTema'

// Componentes do dashboard do barbeiro
import { VisaoGeralBarbeiro } from '@/components/barbeiro/VisaoGeralBarbeiro'
import { GestaoAgendamentosBarbeiro } from '@/components/barbeiro/GestaoAgendamentosBarbeiro'
import { GestaoServicosBarbeiro } from '@/components/barbeiro/GestaoServicosBarbeiro'
import { ConfiguracoesBarbeiro } from '@/components/barbeiro/ConfiguracoesBarbeiro'

/**
 * Dashboard principal do barbeiro
 * Interface completa com calendário, agendamentos, serviços e configurações
 */
export default function DashboardBarbeiro() {
  const router = useRouter()
  const { barbeiro, tenant, carregando, autenticado, sair } = useBarbeiroAuth()
  
  const [abaAtiva, setAbaAtiva] = useState('visao-geral')
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!carregando && !autenticado) {
      router.push('/colaborador/entrar')
    }
  }, [carregando, autenticado, router])

  const handleLogout = () => {
    sair()
    router.push('/colaborador/entrar')
  }

  // Loading state
  if (carregando || !barbeiro || !tenant) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {tenant?.tipo_negocio === 'nail_designer' 
            ? <Hand className="w-12 h-12 text-emerald-500 animate-pulse" />
            : <Scissors className="w-12 h-12 text-emerald-500 animate-pulse" />
          }
          <p className="text-zinc-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // Itens do menu - reorganizado
  const itensMenu = [
    { value: 'visao-geral', icon: TrendingUp, label: 'Visão Geral' },
    { value: 'agendamentos', icon: Calendar, label: 'Agendamentos' },
    { value: 'servicos', icon: Star, label: 'Serviços' },
    { value: 'configuracoes', icon: Settings, label: 'Configurações' },
  ]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Navbar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Info */}
            <div className="flex items-center gap-4">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                {tenant.logo_url ? (
                  <Image
                    src={tenant.logo_url}
                    alt={tenant.nome}
                    fill
                    className="object-cover"
                  />
                ) : (
                  tenant.tipo_negocio === 'nail_designer' 
                    ? <Hand className="w-5 h-5 text-zinc-500" />
                    : <Scissors className="w-5 h-5 text-zinc-500" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {tenant.nome}
                </p>
                <p className="text-xs text-zinc-500">
                  Olá, {barbeiro.nome.split(' ')[0]}
                </p>
              </div>
            </div>

            {/* Ações Desktop */}
            <div className="hidden lg:flex items-center gap-3">
              <AlternadorTema />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>

            {/* Menu Mobile */}
            <button
              onClick={() => setMenuMobileAberto(!menuMobileAberto)}
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-400"
            >
              {menuMobileAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-6">
        <Tabs.Root value={abaAtiva} onValueChange={setAbaAtiva}>
          {/* Tabs Desktop */}
          <Tabs.List className="hidden lg:flex mb-6 bg-white dark:bg-zinc-900 rounded-xl p-1.5 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
            {itensMenu.map((item) => {
              const Icon = item.icon
              return (
                <Tabs.Trigger
                  key={item.value}
                  value={item.value}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 data-[state=active]:bg-zinc-900 dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-zinc-900 transition-all whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Tabs.Trigger>
              )
            })}
          </Tabs.List>

          {/* Menu Mobile Dropdown */}
          {menuMobileAberto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mb-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex flex-col">
                {itensMenu.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setAbaAtiva(item.value)
                        setMenuMobileAberto(false)
                      }}
                      className={`flex items-center gap-3 p-4 text-left transition-colors ${
                        abaAtiva === item.value
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                })}
                <div className="border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between p-4">
                    <AlternadorTema />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Conteúdo das Tabs */}
          <Tabs.Content value="visao-geral">
            <VisaoGeralBarbeiro />
          </Tabs.Content>

          <Tabs.Content value="agendamentos">
            <GestaoAgendamentosBarbeiro />
          </Tabs.Content>

          <Tabs.Content value="servicos">
            <GestaoServicosBarbeiro />
          </Tabs.Content>

          <Tabs.Content value="configuracoes">
            <ConfiguracoesBarbeiro />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
