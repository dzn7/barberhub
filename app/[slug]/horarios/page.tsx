'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Clock, 
  Calendar,
  User,
  Loader2,
  RefreshCw,
  MapPin,
  Phone
} from 'lucide-react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  CalendarioHorarios, 
  GradeHorarios, 
  ModalListaEspera 
} from '@/components/horarios'
import { 
  useHorariosDisponiveis, 
  useBarbeirosAtivos,
  useDiasFuncionamento
} from '@/hooks/useHorariosDisponiveis'
import { obterTerminologia } from '@/lib/configuracoes-negocio'

interface Tenant {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
  tipo_negocio: 'barbearia' | 'nail_designer'
  endereco: string | null
  cidade: string | null
  whatsapp: string | null
}

export default function PaginaHorarios() {
  const params = useParams()
  const slug = params.slug as string

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [carregandoTenant, setCarregandoTenant] = useState(true)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<string | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null)
  const [horarioParaEspera, setHorarioParaEspera] = useState<string | null>(null)
  const [modalEsperaAberto, setModalEsperaAberto] = useState(false)

  const { barbeiros, carregando: carregandoBarbeiros } = useBarbeirosAtivos(tenant?.id || null)
  const { diasFuncionamento } = useDiasFuncionamento(tenant?.id || null)

  const { 
    horarios, 
    carregando: carregandoHorarios, 
    totalDisponiveis,
    totalOcupados,
    recarregar 
  } = useHorariosDisponiveis({
    tenantId: tenant?.id || null,
    barbeiroId: barbeiroSelecionado,
    dataSelecionada,
    duracaoServico: 30
  })

  const cores = useMemo(() => ({
    primaria: tenant?.cor_primaria || '#18181b',
    secundaria: tenant?.cor_secundaria || '#fafafa',
    destaque: tenant?.cor_destaque || '#a1a1aa'
  }), [tenant])

  const terminologia = useMemo(() => {
    return obterTerminologia(tenant?.tipo_negocio || 'barbearia')
  }, [tenant?.tipo_negocio])

  const barbeiroAtual = useMemo(() => {
    return barbeiros.find(b => b.id === barbeiroSelecionado)
  }, [barbeiros, barbeiroSelecionado])

  useEffect(() => {
    const carregarTenant = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id, slug, nome, logo_url, cor_primaria, cor_secundaria, cor_destaque, tipo_negocio, endereco, cidade, whatsapp')
          .eq('slug', slug)
          .eq('ativo', true)
          .single()

        if (error || !data) {
          console.error('Tenant não encontrado:', error)
          return
        }

        setTenant(data)
      } catch (err) {
        console.error('Erro ao carregar tenant:', err)
      } finally {
        setCarregandoTenant(false)
      }
    }

    if (slug) {
      carregarTenant()
    }
  }, [slug])

  useEffect(() => {
    if (barbeiros.length > 0 && !barbeiroSelecionado) {
      setBarbeiroSelecionado(barbeiros[0].id)
    }
  }, [barbeiros, barbeiroSelecionado])

  const handleHorarioOcupadoClick = (horario: string) => {
    setHorarioParaEspera(horario)
    setModalEsperaAberto(true)
  }

  const handleFecharModalEspera = () => {
    setModalEsperaAberto(false)
    setHorarioParaEspera(null)
  }

  if (carregandoTenant) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#18181b' }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: '#18181b' }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Estabelecimento não encontrado
          </h1>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: cores.primaria }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 border-b backdrop-blur-sm"
        style={{ 
          backgroundColor: cores.primaria + 'e6',
          borderColor: cores.destaque + '20'
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/${slug}`}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: cores.destaque }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Voltar</span>
            </Link>

            <div className="flex items-center gap-3">
              {tenant.logo_url && (
                <Image
                  src={tenant.logo_url}
                  alt={tenant.nome}
                  width={32}
                  height={32}
                  className="rounded-lg object-cover"
                />
              )}
              <h1 className="font-semibold" style={{ color: cores.secundaria }}>
                {tenant.nome}
              </h1>
            </div>

            <button
              onClick={recarregar}
              className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: cores.destaque + '15',
                color: cores.destaque
              }}
              title="Atualizar horários"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Título da Página */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-3"
            style={{ 
              backgroundColor: cores.destaque + '15',
              color: cores.destaque
            }}
          >
            <Clock className="w-4 h-4" />
            <span>Horários em tempo real</span>
          </div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: cores.secundaria }}
          >
            Verificar Disponibilidade
          </h2>
          <p className="text-sm" style={{ color: cores.destaque }}>
            Veja os horários disponíveis e entre na lista de espera
          </p>
        </motion.div>

        {/* Seletor de Profissional */}
        {!carregandoBarbeiros && barbeiros.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label 
              className="block text-sm font-medium mb-3"
              style={{ color: cores.secundaria }}
            >
              <User className="w-4 h-4 inline mr-2" />
              Selecione {terminologia.profissional.artigo} {terminologia.profissional.singular}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {barbeiros.map((barbeiro) => (
                <button
                  key={barbeiro.id}
                  onClick={() => {
                    setBarbeiroSelecionado(barbeiro.id)
                    setDataSelecionada(null)
                  }}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border transition-all
                    hover:scale-[1.02] active:scale-[0.98]
                  `}
                  style={{
                    backgroundColor: barbeiroSelecionado === barbeiro.id 
                      ? cores.secundaria + '15'
                      : cores.destaque + '08',
                    borderColor: barbeiroSelecionado === barbeiro.id 
                      ? cores.secundaria + '40'
                      : cores.destaque + '15'
                  }}
                >
                  {barbeiro.foto_url ? (
                    <Image
                      src={barbeiro.foto_url}
                      alt={barbeiro.nome}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cores.destaque + '20' }}
                    >
                      <User className="w-5 h-5" style={{ color: cores.destaque }} />
                    </div>
                  )}
                  <span 
                    className="font-medium text-sm truncate"
                    style={{ color: cores.secundaria }}
                  >
                    {barbeiro.nome}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Barbeiro único */}
        {!carregandoBarbeiros && barbeiros.length === 1 && barbeiroAtual && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl border"
            style={{ 
              backgroundColor: cores.destaque + '08',
              borderColor: cores.destaque + '15'
            }}
          >
            {barbeiroAtual.foto_url ? (
              <Image
                src={barbeiroAtual.foto_url}
                alt={barbeiroAtual.nome}
                width={48}
                height={48}
                className="rounded-xl object-cover"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <User className="w-6 h-6" style={{ color: cores.destaque }} />
              </div>
            )}
            <div>
              <p className="font-semibold" style={{ color: cores.secundaria }}>
                {barbeiroAtual.nome}
              </p>
              <p className="text-sm" style={{ color: cores.destaque }}>
                {terminologia.profissional.singular}
              </p>
            </div>
          </motion.div>
        )}

        {/* Calendário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label 
            className="block text-sm font-medium mb-3"
            style={{ color: cores.secundaria }}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Selecione a Data
          </label>
          <CalendarioHorarios
            dataSelecionada={dataSelecionada}
            onSelecionarData={setDataSelecionada}
            diasFuncionamento={diasFuncionamento}
            cores={cores}
          />
        </motion.div>

        {/* Data Selecionada Info */}
        {dataSelecionada && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-xl border"
            style={{ 
              backgroundColor: cores.secundaria + '08',
              borderColor: cores.secundaria + '20'
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: cores.secundaria + '15' }}
              >
                <Calendar className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div>
                <p className="font-medium capitalize" style={{ color: cores.secundaria }}>
                  {format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-xs" style={{ color: cores.destaque }}>
                  {totalDisponiveis} horários disponíveis
                </p>
              </div>
            </div>
            {barbeiroAtual && (
              <p className="text-sm" style={{ color: cores.destaque }}>
                {barbeiroAtual.nome}
              </p>
            )}
          </motion.div>
        )}

        {/* Grade de Horários */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label 
            className="block text-sm font-medium mb-3"
            style={{ color: cores.secundaria }}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Horários do Dia
          </label>
          <GradeHorarios
            horarios={horarios}
            carregando={carregandoHorarios}
            cores={cores}
            onHorarioOcupadoClick={handleHorarioOcupadoClick}
            dataSelecionada={dataSelecionada}
          />
        </motion.div>

        {/* Call to Action para Agendar */}
        {totalDisponiveis > 0 && dataSelecionada && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <Link
              href={`/${slug}/agendar`}
              className="block w-full py-4 rounded-xl font-semibold text-center transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ 
                backgroundColor: cores.secundaria,
                color: cores.primaria
              }}
            >
              Agendar Agora
            </Link>
          </motion.div>
        )}

        {/* Informações do Estabelecimento */}
        {(tenant.endereco || tenant.whatsapp) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border p-4 space-y-3"
            style={{ 
              backgroundColor: cores.destaque + '08',
              borderColor: cores.destaque + '15'
            }}
          >
            {tenant.endereco && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cores.destaque }} />
                <p className="text-sm" style={{ color: cores.secundaria }}>
                  {tenant.endereco}
                  {tenant.cidade && `, ${tenant.cidade}`}
                </p>
              </div>
            )}
            {tenant.whatsapp && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: cores.destaque }} />
                <a 
                  href={`https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: cores.secundaria }}
                >
                  {tenant.whatsapp}
                </a>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Modal Lista de Espera */}
      {tenant && barbeiroAtual && dataSelecionada && horarioParaEspera && (
        <ModalListaEspera
          aberto={modalEsperaAberto}
          onFechar={handleFecharModalEspera}
          tenantId={tenant.id}
          barbeiroId={barbeiroAtual.id}
          barbeiroNome={barbeiroAtual.nome}
          dataSelecionada={dataSelecionada}
          horarioSelecionado={horarioParaEspera}
          cores={cores}
          nomeEstabelecimento={tenant.nome}
        />
      )}
    </div>
  )
}
