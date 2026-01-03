'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/botao'
import {
  Store,
  Palette,
  Phone,
  MapPin,
  Instagram,
  Users,
  Scissors,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Plus,
  Trash2,
  Loader2,
  SkipForward,
  ExternalLink
} from 'lucide-react'

type Etapa = 'dados' | 'contato' | 'barbeiros' | 'servicos' | 'finalizado'

interface Barbeiro {
  nome: string
  email: string
  telefone: string
  especialidades: string
}

interface Servico {
  nome: string
  preco: number
  duracao: number
}

export default function ConfigurarPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('dados')
  const [erro, setErro] = useState<string | null>(null)

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string>('')

  // Dados básicos
  const [dadosBasicos, setDadosBasicos] = useState({
    nome: '',
    logo_url: '',
    cor_primaria: '#18181b',
    cor_secundaria: '#ffffff',
    cor_destaque: '#f59e0b'
  })

  // Contato
  const [contato, setContato] = useState({
    telefone: '',
    whatsapp: '',
    endereco: '',
    cidade: '',
    estado: '',
    instagram: ''
  })

  // Barbeiros
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [novoBarbeiro, setNovoBarbeiro] = useState<Barbeiro>({
    nome: '',
    email: '',
    telefone: '',
    especialidades: ''
  })

  // Serviços
  const [servicos, setServicos] = useState<Servico[]>([])
  const [novoServico, setNovoServico] = useState<Servico>({
    nome: '',
    preco: 0,
    duracao: 30
  })

  useEffect(() => {
    async function verificarAutenticacao() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/entrar')
        return
      }

      // Buscar tenant do proprietário
      const { data: proprietario } = await supabase
        .from('proprietarios')
        .select('tenant_id, tenants(id, slug, nome, logo_url, cor_primaria, cor_secundaria, cor_destaque, telefone, whatsapp, endereco, cidade, estado, instagram)')
        .eq('user_id', user.id)
        .single()

      if (!proprietario?.tenant_id) {
        router.push('/registrar')
        return
      }

      const tenant = proprietario.tenants as any
      setTenantId(proprietario.tenant_id)
      setTenantSlug(tenant.slug)

      // Preencher dados existentes
      setDadosBasicos({
        nome: tenant.nome || '',
        logo_url: tenant.logo_url || '',
        cor_primaria: tenant.cor_primaria || '#18181b',
        cor_secundaria: tenant.cor_secundaria || '#ffffff',
        cor_destaque: tenant.cor_destaque || '#f59e0b'
      })

      setContato({
        telefone: tenant.telefone || '',
        whatsapp: tenant.whatsapp || '',
        endereco: tenant.endereco || '',
        cidade: tenant.cidade || '',
        estado: tenant.estado || '',
        instagram: tenant.instagram || ''
      })

      setCarregando(false)
    }

    verificarAutenticacao()
  }, [router])

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tenant_id', tenantId)
    formData.append('tipo', 'logo')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.url) {
        setDadosBasicos({ ...dadosBasicos, logo_url: data.url })
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    }
  }

  const salvarEtapa = async () => {
    if (!tenantId) return
    setSalvando(true)
    setErro(null)

    try {
      if (etapa === 'dados') {
        await supabase
          .from('tenants')
          .update({
            nome: dadosBasicos.nome,
            logo_url: dadosBasicos.logo_url || null,
            cor_primaria: dadosBasicos.cor_primaria,
            cor_secundaria: dadosBasicos.cor_secundaria,
            cor_destaque: dadosBasicos.cor_destaque
          })
          .eq('id', tenantId)

        setEtapa('contato')
      } else if (etapa === 'contato') {
        await supabase
          .from('tenants')
          .update({
            telefone: contato.telefone || null,
            whatsapp: contato.whatsapp || null,
            endereco: contato.endereco || null,
            cidade: contato.cidade || null,
            estado: contato.estado || null,
            instagram: contato.instagram || null
          })
          .eq('id', tenantId)

        setEtapa('barbeiros')
      } else if (etapa === 'barbeiros') {
        // Salvar barbeiros adicionados
        if (barbeiros.length > 0) {
          for (const barbeiro of barbeiros) {
            await supabase.from('barbeiros').insert({
              tenant_id: tenantId,
              nome: barbeiro.nome,
              email: barbeiro.email,
              telefone: barbeiro.telefone,
              especialidades: barbeiro.especialidades.split(',').map(e => e.trim()).filter(e => e)
            })
          }
        }
        setEtapa('servicos')
      } else if (etapa === 'servicos') {
        // Salvar serviços adicionados
        if (servicos.length > 0) {
          for (const servico of servicos) {
            await supabase.from('servicos').insert({
              tenant_id: tenantId,
              nome: servico.nome,
              preco: servico.preco,
              duracao: servico.duracao,
              categoria: 'geral'
            })
          }
        }
        setEtapa('finalizado')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const adicionarBarbeiro = () => {
    if (!novoBarbeiro.nome || !novoBarbeiro.email || !novoBarbeiro.telefone) return
    setBarbeiros([...barbeiros, novoBarbeiro])
    setNovoBarbeiro({ nome: '', email: '', telefone: '', especialidades: '' })
  }

  const removerBarbeiro = (index: number) => {
    setBarbeiros(barbeiros.filter((_, i) => i !== index))
  }

  const adicionarServico = () => {
    if (!novoServico.nome || novoServico.preco <= 0) return
    setServicos([...servicos, novoServico])
    setNovoServico({ nome: '', preco: 0, duracao: 30 })
  }

  const removerServico = (index: number) => {
    setServicos(servicos.filter((_, i) => i !== index))
  }

  const pularEtapa = () => {
    if (etapa === 'barbeiros') setEtapa('servicos')
    else if (etapa === 'servicos') setEtapa('finalizado')
  }

  const voltarEtapa = () => {
    if (etapa === 'contato') setEtapa('dados')
    else if (etapa === 'barbeiros') setEtapa('contato')
    else if (etapa === 'servicos') setEtapa('barbeiros')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  // Tela de finalização
  if (etapa === 'finalizado') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            Sua barbearia está pronta!
          </h1>

          <p className="text-zinc-400 mb-8">
            Configuração inicial concluída. Agora você pode acessar o painel administrativo
            para gerenciar agendamentos, adicionar mais serviços e barbeiros.
          </p>

          <div className="bg-zinc-800 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-white mb-4">Seus links:</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Página de agendamento (para seus clientes):</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-900 px-3 py-2 rounded-lg text-amber-500 text-sm">
                    barberhub.online/{tenantSlug}
                  </code>
                  <a
                    href={`/${tenantSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400">Painel administrativo:</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-900 px-3 py-2 rounded-lg text-amber-500 text-sm">
                    barberhub.online/admin
                  </code>
                </div>
              </div>
            </div>
          </div>

          <Botao onClick={() => router.push('/admin')} className="w-full">
            Acessar Painel Administrativo
            <ArrowRight className="w-5 h-5 ml-2" />
          </Botao>
        </div>
      </div>
    )
  }

  const etapas = [
    { id: 'dados', label: 'Dados', icone: Store },
    { id: 'contato', label: 'Contato', icone: Phone },
    { id: 'barbeiros', label: 'Equipe', icone: Users },
    { id: 'servicos', label: 'Serviços', icone: Scissors }
  ]

  const etapaAtualIndex = etapas.findIndex(e => e.id === etapa)

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Configure sua Barbearia</h1>
          <p className="text-zinc-400 mt-1">Preencha as informações para personalizar sua página</p>
        </div>
      </header>

      {/* Progresso */}
      <div className="bg-zinc-800/50 border-b border-zinc-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between">
            {etapas.map((e, i) => {
              const Icone = e.icone
              const ativo = i <= etapaAtualIndex
              const atual = e.id === etapa
              return (
                <div key={e.id} className="flex items-center">
                  <div className={`flex flex-col items-center ${atual ? 'scale-110' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      ativo ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      <Icone className="w-5 h-5" />
                    </div>
                    <span className={`text-xs mt-1 ${ativo ? 'text-white' : 'text-zinc-500'}`}>
                      {e.label}
                    </span>
                  </div>
                  {i < etapas.length - 1 && (
                    <div className={`w-12 sm:w-20 h-1 mx-2 ${i < etapaAtualIndex ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {erro && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {erro}
          </div>
        )}

        {/* Etapa 1: Dados Básicos */}
        {etapa === 'dados' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Nome da Barbearia *</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={dadosBasicos.nome}
                  onChange={e => setDadosBasicos({ ...dadosBasicos, nome: e.target.value })}
                  placeholder="Ex: Barbearia do João"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center overflow-hidden">
                  {dadosBasicos.logo_url ? (
                    <Image
                      src={dadosBasicos.logo_url}
                      alt="Logo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-10 h-10 text-zinc-600" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" />
                    Enviar Logo
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-3">
                <Palette className="w-4 h-4 inline mr-2" />
                Cores da Marca
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Primária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dadosBasicos.cor_primaria}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_primaria: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dadosBasicos.cor_primaria}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_primaria: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Secundária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dadosBasicos.cor_secundaria}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_secundaria: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dadosBasicos.cor_secundaria}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_secundaria: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Destaque</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={dadosBasicos.cor_destaque}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_destaque: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={dadosBasicos.cor_destaque}
                      onChange={e => setDadosBasicos({ ...dadosBasicos, cor_destaque: e.target.value })}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Contato */}
        {etapa === 'contato' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    value={contato.telefone}
                    onChange={e => setContato({ ...contato, telefone: e.target.value })}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    value={contato.whatsapp}
                    onChange={e => setContato({ ...contato, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={contato.endereco}
                  onChange={e => setContato({ ...contato, endereco: e.target.value })}
                  placeholder="Rua, número, bairro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Cidade</label>
                <input
                  type="text"
                  value={contato.cidade}
                  onChange={e => setContato({ ...contato, cidade: e.target.value })}
                  placeholder="Sua cidade"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Estado</label>
                <input
                  type="text"
                  value={contato.estado}
                  onChange={e => setContato({ ...contato, estado: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={contato.instagram}
                  onChange={e => setContato({ ...contato, instagram: e.target.value })}
                  placeholder="@suabarbearia"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Barbeiros */}
        {etapa === 'barbeiros' && (
          <div className="space-y-6">
            <p className="text-zinc-400">
              Adicione os profissionais que trabalham na sua barbearia. Você pode pular esta etapa e adicionar depois no painel.
            </p>

            {/* Lista de barbeiros adicionados */}
            {barbeiros.length > 0 && (
              <div className="space-y-3">
                {barbeiros.map((barbeiro, index) => (
                  <div key={index} className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                    <div>
                      <p className="font-semibold">{barbeiro.nome}</p>
                      <p className="text-sm text-zinc-400">{barbeiro.email}</p>
                    </div>
                    <button onClick={() => removerBarbeiro(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Barbeiro
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={novoBarbeiro.nome}
                  onChange={e => setNovoBarbeiro({ ...novoBarbeiro, nome: e.target.value })}
                  placeholder="Nome *"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="email"
                  value={novoBarbeiro.email}
                  onChange={e => setNovoBarbeiro({ ...novoBarbeiro, email: e.target.value })}
                  placeholder="E-mail *"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={novoBarbeiro.telefone}
                  onChange={e => setNovoBarbeiro({ ...novoBarbeiro, telefone: e.target.value })}
                  placeholder="Telefone *"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={novoBarbeiro.especialidades}
                  onChange={e => setNovoBarbeiro({ ...novoBarbeiro, especialidades: e.target.value })}
                  placeholder="Especialidades (ex: Corte, Barba)"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <Botao
                onClick={adicionarBarbeiro}
                variante="contorno"
                disabled={!novoBarbeiro.nome || !novoBarbeiro.email || !novoBarbeiro.telefone}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Botao>
            </div>
          </div>
        )}

        {/* Etapa 4: Serviços */}
        {etapa === 'servicos' && (
          <div className="space-y-6">
            <p className="text-zinc-400">
              Cadastre os serviços oferecidos pela sua barbearia. Você pode pular esta etapa e adicionar depois no painel.
            </p>

            {/* Lista de serviços adicionados */}
            {servicos.length > 0 && (
              <div className="space-y-3">
                {servicos.map((servico, index) => (
                  <div key={index} className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
                    <div>
                      <p className="font-semibold">{servico.nome}</p>
                      <p className="text-sm text-zinc-400">{servico.duracao} min</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-amber-500 font-bold">R$ {servico.preco.toFixed(2)}</span>
                      <button onClick={() => removerServico(index)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário para adicionar */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Serviço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={novoServico.nome}
                  onChange={e => setNovoServico({ ...novoServico, nome: e.target.value })}
                  placeholder="Nome do serviço *"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">R$</span>
                  <input
                    type="number"
                    value={novoServico.preco || ''}
                    onChange={e => setNovoServico({ ...novoServico, preco: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={novoServico.duracao}
                    onChange={e => setNovoServico({ ...novoServico, duracao: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                    min="5"
                    step="5"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">min</span>
                </div>
              </div>

              <Botao
                onClick={adicionarServico}
                variante="contorno"
                disabled={!novoServico.nome || novoServico.preco <= 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Botao>
            </div>
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
          {etapa !== 'dados' ? (
            <Botao variante="contorno" onClick={voltarEtapa}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Botao>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            {(etapa === 'barbeiros' || etapa === 'servicos') && (
              <Botao variante="contorno" onClick={pularEtapa}>
                Pular
                <SkipForward className="w-4 h-4 ml-2" />
              </Botao>
            )}

            <Botao onClick={salvarEtapa} disabled={salvando || (etapa === 'dados' && !dadosBasicos.nome)}>
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  {etapa === 'servicos' ? 'Finalizar' : 'Continuar'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Botao>
          </div>
        </div>
      </main>
    </div>
  )
}
