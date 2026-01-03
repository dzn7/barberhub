'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { Botao } from '@/components/ui/botao'
import { 
  Store, 
  Palette, 
  Users, 
  Scissors, 
  Calendar,
  Settings,
  ExternalLink,
  LogOut,
  Clock,
  TrendingUp,
  Check,
  Copy,
  Upload,
  X,
  Save,
  Loader2
} from 'lucide-react'

export default function AdminPage() {
  const searchParams = useSearchParams()
  const bemVindo = searchParams.get('bem-vindo')
  const { tenant, proprietario, sair, atualizarTenant } = useAuth()
  
  const [mostrarBemVindo, setMostrarBemVindo] = useState(bemVindo === 'true')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)
  
  // Form de personalização
  const [form, setForm] = useState({
    nome: '',
    cor_primaria: '#18181b',
    cor_secundaria: '#ffffff',
    cor_destaque: '#fbbf24',
    telefone: '',
    whatsapp: '',
    endereco: '',
    cidade: '',
    estado: '',
    instagram: '',
    facebook: ''
  })

  useEffect(() => {
    if (tenant) {
      setForm({
        nome: tenant.nome || '',
        cor_primaria: tenant.cor_primaria || '#18181b',
        cor_secundaria: tenant.cor_secundaria || '#ffffff',
        cor_destaque: tenant.cor_destaque || '#fbbf24',
        telefone: tenant.telefone || '',
        whatsapp: tenant.whatsapp || '',
        endereco: tenant.endereco || '',
        cidade: tenant.cidade || '',
        estado: tenant.estado || '',
        instagram: tenant.instagram || '',
        facebook: tenant.facebook || ''
      })
    }
  }, [tenant])

  const copiarLink = () => {
    if (tenant) {
      navigator.clipboard.writeText(`${window.location.origin}/${tenant.slug}`)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    }
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setMensagem(null)

    const { erro } = await atualizarTenant(form)

    if (erro) {
      setMensagem({ tipo: 'erro', texto: erro })
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Alterações salvas com sucesso!' })
    }

    setSalvando(false)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tenant_id', tenant.id)
    formData.append('tipo', 'logo')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.url) {
        await atualizarTenant({ logo_url: data.url })
        setMensagem({ tipo: 'sucesso', texto: 'Logo atualizado com sucesso!' })
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao fazer upload da imagem' })
    }
  }

  // Calcular dias restantes do trial
  const diasRestantes = tenant?.trial_fim 
    ? Math.max(0, Math.ceil((new Date(tenant.trial_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  if (!tenant) return null

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Modal de Boas-vindas */}
      {mostrarBemVindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Conta Criada com Sucesso!</h2>
            <p className="text-zinc-400 mb-6">
              Sua barbearia <span className="text-primary font-semibold">{tenant.nome}</span> está pronta! 
              Você tem <span className="text-primary font-semibold">14 dias</span> de teste grátis.
            </p>
            
            <div className="bg-zinc-900 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-400 mb-2">Link da sua página:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-primary text-sm truncate">
                  {window.location.origin}/{tenant.slug}
                </code>
                <button 
                  onClick={copiarLink}
                  className="p-2 hover:bg-zinc-800 rounded"
                >
                  {linkCopiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            </div>
            
            <Botao onClick={() => setMostrarBemVindo(false)} className="w-full">
              Começar a Personalizar
            </Botao>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-bold text-white">{tenant.nome}</h1>
              <p className="text-xs text-zinc-400">Painel Administrativo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {tenant.plano === 'trial' && (
              <div className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-sm font-medium">
                {diasRestantes} dias restantes
              </div>
            )}
            
            <Link 
              href={`/${tenant.slug}`}
              target="_blank"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver página
            </Link>
            
            <button 
              onClick={sair}
              className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensagem */}
        {mensagem && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
            mensagem.tipo === 'sucesso' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <span>{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-zinc-400 text-sm">Agendamentos</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-zinc-400 text-sm">Clientes</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-zinc-400 text-sm">Receita (mês)</span>
            </div>
            <p className="text-2xl font-bold text-white">R$ 0,00</p>
          </div>
          <div className="bg-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-zinc-400 text-sm">Plano</span>
            </div>
            <p className="text-2xl font-bold text-primary capitalize">{tenant.plano}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personalização */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo */}
            <div className="bg-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Logo da Barbearia
              </h2>
              
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-zinc-700 rounded-xl flex items-center justify-center overflow-hidden">
                  {tenant.logo_url ? (
                    <Image
                      src={tenant.logo_url}
                      alt="Logo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Store className="w-10 h-10 text-zinc-500" />
                  )}
                </div>
                
                <div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors">
                      <Upload className="w-4 h-4" />
                      Alterar Logo
                    </span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-2">PNG, JPG até 2MB</p>
                </div>
              </div>
            </div>

            {/* Cores */}
            <div className="bg-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Cores do Site
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Cor Primária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor_primaria}
                      onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.cor_primaria}
                      onChange={e => setForm({ ...form, cor_primaria: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Cor Secundária</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor_secundaria}
                      onChange={e => setForm({ ...form, cor_secundaria: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.cor_secundaria}
                      onChange={e => setForm({ ...form, cor_secundaria: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Cor Destaque</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor_destaque}
                      onChange={e => setForm({ ...form, cor_destaque: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.cor_destaque}
                      onChange={e => setForm({ ...form, cor_destaque: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: form.cor_primaria }}>
                <p style={{ color: form.cor_secundaria }}>Exemplo de texto</p>
                <button 
                  className="mt-2 px-4 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: form.cor_destaque, color: form.cor_primaria }}
                >
                  Botão de exemplo
                </button>
              </div>
            </div>

            {/* Informações */}
            <div className="bg-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Informações da Barbearia
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Nome</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Instagram</label>
                  <input
                    type="text"
                    value={form.instagram}
                    onChange={e => setForm({ ...form, instagram: e.target.value })}
                    placeholder="@suabarbearia"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm text-zinc-400 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={e => setForm({ ...form, endereco: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Cidade</label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={e => setForm({ ...form, cidade: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Estado</label>
                  <input
                    type="text"
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value })}
                    maxLength={2}
                    placeholder="SP"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              <Botao 
                onClick={handleSalvar} 
                disabled={salvando}
                className="mt-6"
              >
                {salvando ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Botao>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Link da página */}
            <div className="bg-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Link da sua página</h3>
              <div className="bg-zinc-900 rounded-lg p-3 flex items-center gap-2">
                <code className="flex-1 text-primary text-sm truncate">
                  /{tenant.slug}
                </code>
                <button 
                  onClick={copiarLink}
                  className="p-2 hover:bg-zinc-800 rounded transition-colors"
                >
                  {linkCopiado ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
              
              <Link 
                href={`/${tenant.slug}`}
                target="_blank"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Visitar Página
              </Link>
            </div>

            {/* Menu rápido */}
            <div className="bg-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Gerenciar</h3>
              <div className="space-y-2">
                <Link 
                  href="/admin/servicos"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  <Scissors className="w-5 h-5 text-primary" />
                  Serviços
                </Link>
                <Link 
                  href="/admin/barbeiros"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  <Users className="w-5 h-5 text-primary" />
                  Barbeiros
                </Link>
                <Link 
                  href="/admin/agendamentos"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  Agendamentos
                </Link>
                <Link 
                  href="/admin/horarios"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-300 hover:text-white"
                >
                  <Clock className="w-5 h-5 text-primary" />
                  Horários
                </Link>
              </div>
            </div>

            {/* Trial info */}
            {tenant.plano === 'trial' && (
              <div className="bg-gradient-to-br from-primary/20 to-amber-500/20 rounded-xl p-6 border border-primary/30">
                <h3 className="font-semibold text-white mb-2">Período de Teste</h3>
                <p className="text-zinc-400 text-sm mb-4">
                  Você ainda tem <span className="text-primary font-bold">{diasRestantes} dias</span> de teste grátis.
                </p>
                <Botao className="w-full" tamanho="sm">
                  Assinar Plano
                </Botao>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
