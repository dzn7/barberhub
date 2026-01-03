'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { LogoMarca } from '@/components/ui/logo-marca'
import { Botao } from '@/components/ui/botao'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Trash2,
  Loader2,
  Store,
  Phone,
  MapPin,
  Instagram,
  Mail,
  Clock,
  Palette
} from 'lucide-react'

// Paletas sofisticadas e elegantes - sem cores genéricas de IA
const PALETAS_SOFISTICADAS = [
  { 
    nome: 'Obsidian', 
    descricao: 'Elegância clássica',
    primaria: '#09090b', 
    secundaria: '#fafafa', 
    destaque: '#fafafa' 
  },
  { 
    nome: 'Grafite', 
    descricao: 'Minimalismo moderno',
    primaria: '#18181b', 
    secundaria: '#f4f4f5', 
    destaque: '#a1a1aa' 
  },
  { 
    nome: 'Midnight', 
    descricao: 'Sofisticação noturna',
    primaria: '#0c0a09', 
    secundaria: '#fafaf9', 
    destaque: '#a8a29e' 
  },
  { 
    nome: 'Slate', 
    descricao: 'Profissional discreto',
    primaria: '#0f172a', 
    secundaria: '#f8fafc', 
    destaque: '#94a3b8' 
  },
  { 
    nome: 'Charcoal', 
    descricao: 'Neutro atemporal',
    primaria: '#171717', 
    secundaria: '#fafafa', 
    destaque: '#d4d4d4' 
  },
  { 
    nome: 'Onyx', 
    descricao: 'Contraste marcante',
    primaria: '#0a0a0a', 
    secundaria: '#ffffff', 
    destaque: '#737373' 
  },
]

const ETAPAS = [
  { id: 1, titulo: 'Identidade', icone: Store },
  { id: 2, titulo: 'Contato', icone: Phone },
  { id: 3, titulo: 'Localização', icone: MapPin },
  { id: 4, titulo: 'Aparência', icone: Palette },
]

export default function ConfigurarPage() {
  const router = useRouter()
  const { user, tenant, carregando: carregandoAuth, atualizarTenant } = useAuth()
  const inputFileRef = useRef<HTMLInputElement>(null)
  
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  
  const [dados, setDados] = useState({
    nome: '',
    logo_url: '',
    telefone: '',
    whatsapp: '',
    email: '',
    instagram: '',
    endereco: '',
    cidade: '',
    estado: '',
    cor_primaria: '#18181b',
    cor_secundaria: '#f4f4f5',
    cor_destaque: '#a1a1aa',
  })

  // Carregar dados existentes do tenant
  useEffect(() => {
    if (tenant) {
      setDados({
        nome: tenant.nome || '',
        logo_url: tenant.logo_url || '',
        telefone: tenant.telefone || '',
        whatsapp: tenant.whatsapp || '',
        email: tenant.email || '',
        instagram: tenant.instagram || '',
        endereco: tenant.endereco || '',
        cidade: tenant.cidade || '',
        estado: tenant.estado || '',
        cor_primaria: tenant.cor_primaria || '#18181b',
        cor_secundaria: tenant.cor_secundaria || '#f4f4f5',
        cor_destaque: tenant.cor_destaque || '#a1a1aa',
      })
    }
  }, [tenant])

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!carregandoAuth && !user) {
      router.push('/entrar')
    }
  }, [carregandoAuth, user, router])

  // Upload de logo
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return

    setUploadando(true)

    try {
      // Se já existe uma logo, deletar
      if (dados.logo_url) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(dados.logo_url)}`, {
            method: 'DELETE',
          })
        } catch (err) {
          console.warn('Erro ao deletar logo anterior:', err)
        }
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('tenant_id', tenant.id)
      formData.append('tipo', 'logo')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setDados(prev => ({ ...prev, logo_url: data.url }))
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
    } finally {
      setUploadando(false)
      if (inputFileRef.current) {
        inputFileRef.current.value = ''
      }
    }
  }

  const handleRemoverLogo = async () => {
    if (!dados.logo_url) return

    setUploadando(true)
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(dados.logo_url)}`, {
        method: 'DELETE',
      })
      setDados(prev => ({ ...prev, logo_url: '' }))
    } catch (error) {
      console.error('Erro ao remover logo:', error)
    } finally {
      setUploadando(false)
    }
  }

  const aplicarPaleta = (paleta: typeof PALETAS_SOFISTICADAS[0]) => {
    setDados(prev => ({
      ...prev,
      cor_primaria: paleta.primaria,
      cor_secundaria: paleta.secundaria,
      cor_destaque: paleta.destaque,
    }))
  }

  const avancar = () => {
    if (etapaAtual < 4) {
      setEtapaAtual(etapaAtual + 1)
    }
  }

  const voltar = () => {
    if (etapaAtual > 1) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const finalizar = async () => {
    if (!tenant) return

    setSalvando(true)

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome: dados.nome,
          logo_url: dados.logo_url || null,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
          cor_destaque: dados.cor_destaque,
          telefone: dados.telefone || null,
          whatsapp: dados.whatsapp || null,
          email: dados.email,
          endereco: dados.endereco || null,
          cidade: dados.cidade || null,
          estado: dados.estado || null,
          instagram: dados.instagram || null,
        })
        .eq('id', tenant.id)

      if (error) throw error

      if (atualizarTenant) {
        await atualizarTenant({ ...tenant, ...dados })
      }

      setConcluido(true)
      
      // Redirecionar para o admin após 2 segundos
      setTimeout(() => {
        router.push('/admin')
      }, 2000)
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  if (carregandoAuth || !tenant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  // Tela de conclusão
  if (concluido) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 bg-white rounded-full flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-black" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Tudo pronto!
          </h1>
          <p className="text-zinc-400 mb-4">
            Sua barbearia está configurada. Redirecionando...
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mx-auto" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <LogoMarca className="h-12" />
          </Link>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Pular configuração
          </button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {ETAPAS.map((etapa, index) => {
              const Icone = etapa.icone
              const ativa = etapaAtual === etapa.id
              const completa = etapaAtual > etapa.id
              
              return (
                <div key={etapa.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        ativa
                          ? 'bg-white text-black'
                          : completa
                          ? 'bg-zinc-800 text-white'
                          : 'bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      {completa ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icone className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        ativa ? 'text-white' : 'text-zinc-600'
                      }`}
                    >
                      {etapa.titulo}
                    </span>
                  </div>
                  {index < ETAPAS.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-px mx-2 ${
                        completa ? 'bg-zinc-700' : 'bg-zinc-900'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {/* Etapa 1: Identidade */}
          {etapaAtual === 1 && (
            <motion.div
              key="etapa1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Identidade da sua barbearia
                </h2>
                <p className="text-zinc-400">
                  Defina o nome e logo que seus clientes verão
                </p>
              </div>

              <div className="space-y-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nome da Barbearia
                  </label>
                  <input
                    type="text"
                    value={dados.nome}
                    onChange={e => setDados({ ...dados, nome: e.target.value })}
                    placeholder="Ex: Barbearia Premium"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Logo (opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center">
                      {dados.logo_url ? (
                        <Image
                          src={dados.logo_url}
                          alt="Logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Store className="w-8 h-8 text-zinc-600" />
                      )}
                      {uploadando && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => inputFileRef.current?.click()}
                        disabled={uploadando}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        {dados.logo_url ? 'Trocar' : 'Enviar'}
                      </button>
                      {dados.logo_url && (
                        <button
                          onClick={handleRemoverLogo}
                          disabled={uploadando}
                          className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      ref={inputFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    JPG, PNG ou WebP • Máximo 5MB
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Etapa 2: Contato */}
          {etapaAtual === 2 && (
            <motion.div
              key="etapa2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Informações de contato
                </h2>
                <p className="text-zinc-400">
                  Como seus clientes podem entrar em contato
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Telefone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        value={dados.telefone}
                        onChange={e => setDados({ ...dados, telefone: e.target.value })}
                        placeholder="(00) 0000-0000"
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="tel"
                        value={dados.whatsapp}
                        onChange={e => setDados({ ...dados, whatsapp: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={dados.email}
                      onChange={e => setDados({ ...dados, email: e.target.value })}
                      placeholder="contato@barbearia.com"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={dados.instagram}
                      onChange={e => setDados({ ...dados, instagram: e.target.value })}
                      placeholder="@suabarbearia"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Etapa 3: Localização */}
          {etapaAtual === 3 && (
            <motion.div
              key="etapa3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Onde fica sua barbearia
                </h2>
                <p className="text-zinc-400">
                  Ajude seus clientes a te encontrar
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Endereço completo
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={dados.endereco}
                      onChange={e => setDados({ ...dados, endereco: e.target.value })}
                      placeholder="Rua, número, bairro"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={dados.cidade}
                      onChange={e => setDados({ ...dados, cidade: e.target.value })}
                      placeholder="São Paulo"
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={dados.estado}
                      onChange={e => setDados({ ...dados, estado: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      maxLength={2}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-all uppercase"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Etapa 4: Aparência */}
          {etapaAtual === 4 && (
            <motion.div
              key="etapa4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Aparência da sua página
                </h2>
                <p className="text-zinc-400">
                  Escolha um estilo visual para sua página de agendamentos
                </p>
              </div>

              <div className="space-y-6">
                {/* Paletas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PALETAS_SOFISTICADAS.map((paleta) => {
                    const selecionada = dados.cor_primaria === paleta.primaria
                    return (
                      <button
                        key={paleta.nome}
                        onClick={() => aplicarPaleta(paleta)}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          selecionada
                            ? 'border-white bg-zinc-800'
                            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        {selecionada && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex gap-2 mb-3">
                          <div
                            className="w-8 h-8 rounded-lg border border-zinc-700"
                            style={{ backgroundColor: paleta.primaria }}
                          />
                          <div
                            className="w-8 h-8 rounded-lg border border-zinc-700"
                            style={{ backgroundColor: paleta.secundaria }}
                          />
                        </div>
                        <p className="text-sm font-medium text-white text-left">
                          {paleta.nome}
                        </p>
                        <p className="text-xs text-zinc-500 text-left">
                          {paleta.descricao}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {/* Preview */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-zinc-400 mb-3">
                    Preview
                  </p>
                  <div
                    className="rounded-xl p-6 border border-zinc-700"
                    style={{ backgroundColor: dados.cor_primaria }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {dados.logo_url ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                          <Image
                            src={dados.logo_url}
                            alt="Logo"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: dados.cor_destaque + '20' }}
                        >
                          <Store className="w-6 h-6" style={{ color: dados.cor_secundaria }} />
                        </div>
                      )}
                      <div>
                        <h3
                          className="font-semibold"
                          style={{ color: dados.cor_secundaria }}
                        >
                          {dados.nome || 'Sua Barbearia'}
                        </h3>
                        <p
                          className="text-sm opacity-70"
                          style={{ color: dados.cor_secundaria }}
                        >
                          {dados.cidade || 'Sua cidade'}{dados.estado ? `, ${dados.estado}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: dados.cor_secundaria,
                        color: dados.cor_primaria,
                      }}
                    >
                      Agendar Horário
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-12 pt-6 border-t border-zinc-800">
          {etapaAtual > 1 ? (
            <Botao
              type="button"
              variante="fantasma"
              onClick={voltar}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Botao>
          ) : (
            <div />
          )}

          {etapaAtual < 4 ? (
            <Botao
              type="button"
              onClick={avancar}
              className="bg-white text-black hover:bg-zinc-200"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Botao>
          ) : (
            <Botao
              type="button"
              onClick={finalizar}
              disabled={salvando}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  Finalizar
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Botao>
          )}
        </div>
      </div>
    </div>
  )
}
