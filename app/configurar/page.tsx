'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Store, Palette, Phone, MapPin, Instagram, Users, Scissors, ArrowRight, ArrowLeft, Check, Upload, Plus, Trash2, Loader2, Mail, Clock, Globe, Sparkles, Eye, ChevronRight, Zap, Calendar, Copy, CheckCircle, X, Star } from 'lucide-react'

type Etapa = 'boas-vindas' | 'identidade' | 'cores' | 'contato' | 'horarios' | 'equipe' | 'servicos' | 'finalizado'

interface Barbeiro { nome: string; email: string; telefone: string; especialidades: string[] }
interface Servico { nome: string; descricao: string; preco: number; duracao: number; categoria: string }
interface Horario { dia: string; aberto: boolean; abertura: string; fechamento: string }

const PALETAS = [
  { id: 'classico', nome: 'Clássico Dourado', desc: 'Elegante e atemporal', p: '#18181b', s: '#ffffff', d: '#d4af37' },
  { id: 'azul', nome: 'Azul Profissional', desc: 'Confiança e modernidade', p: '#0f172a', s: '#f8fafc', d: '#3b82f6' },
  { id: 'verde', nome: 'Verde Urbano', desc: 'Frescor e vitalidade', p: '#14532d', s: '#f0fdf4', d: '#22c55e' },
  { id: 'vermelho', nome: 'Vermelho Vintage', desc: 'Clássico e marcante', p: '#450a0a', s: '#fef2f2', d: '#dc2626' },
  { id: 'roxo', nome: 'Roxo Premium', desc: 'Sofisticação exclusiva', p: '#2e1065', s: '#faf5ff', d: '#8b5cf6' },
  { id: 'laranja', nome: 'Laranja Energia', desc: 'Dinamismo criativo', p: '#431407', s: '#fff7ed', d: '#f97316' },
]

const SERVICOS_SUGERIDOS = [
  { nome: 'Corte Masculino', descricao: 'Corte tradicional ou moderno', preco: 35, duracao: 30, categoria: 'Cortes' },
  { nome: 'Barba Completa', descricao: 'Barba com navalha e toalha quente', preco: 30, duracao: 25, categoria: 'Barba' },
  { nome: 'Corte + Barba', descricao: 'Combo completo', preco: 55, duracao: 50, categoria: 'Combos' },
  { nome: 'Degradê', descricao: 'Corte degradê personalizado', preco: 40, duracao: 35, categoria: 'Cortes' },
  { nome: 'Sobrancelha', descricao: 'Design de sobrancelha', preco: 15, duracao: 10, categoria: 'Acabamentos' },
  { nome: 'Hidratação', descricao: 'Hidratação profunda', preco: 45, duracao: 30, categoria: 'Tratamentos' },
]

const HORARIOS_PADRAO: Horario[] = [
  { dia: 'Segunda', aberto: true, abertura: '09:00', fechamento: '19:00' },
  { dia: 'Terça', aberto: true, abertura: '09:00', fechamento: '19:00' },
  { dia: 'Quarta', aberto: true, abertura: '09:00', fechamento: '19:00' },
  { dia: 'Quinta', aberto: true, abertura: '09:00', fechamento: '19:00' },
  { dia: 'Sexta', aberto: true, abertura: '09:00', fechamento: '19:00' },
  { dia: 'Sábado', aberto: true, abertura: '09:00', fechamento: '17:00' },
  { dia: 'Domingo', aberto: false, abertura: '09:00', fechamento: '13:00' },
]

export default function ConfigurarPage() {
  const router = useRouter()
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>('boas-vindas')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [uploadando, setUploadando] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenantSlug, setTenantSlug] = useState('')

  const [identidade, setIdentidade] = useState({ nome: '', logo_url: '', slogan: '' })
  const [cores, setCores] = useState({ paleta: 'classico', primaria: '#18181b', secundaria: '#ffffff', destaque: '#d4af37', custom: false })
  const [contato, setContato] = useState({ telefone: '', whatsapp: '', email: '', endereco: '', cidade: '', estado: '', cep: '', instagram: '' })
  const [horarios, setHorarios] = useState<Horario[]>(HORARIOS_PADRAO)
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [novoBarbeiro, setNovoBarbeiro] = useState<Barbeiro>({ nome: '', email: '', telefone: '', especialidades: [] })
  const [servicos, setServicos] = useState<Servico[]>([])
  const [novoServico, setNovoServico] = useState<Servico>({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'Cortes' })

  const ETAPAS = [
    { id: 'boas-vindas', label: 'Início', icone: Star },
    { id: 'identidade', label: 'Identidade', icone: Store },
    { id: 'cores', label: 'Visual', icone: Palette },
    { id: 'contato', label: 'Contato', icone: Phone },
    { id: 'horarios', label: 'Horários', icone: Clock },
    { id: 'equipe', label: 'Equipe', icone: Users },
    { id: 'servicos', label: 'Serviços', icone: Scissors },
  ]

  const etapaIndex = ETAPAS.findIndex(e => e.id === etapa)
  const progresso = etapa === 'finalizado' ? 100 : ((etapaIndex) / ETAPAS.length) * 100

  useEffect(() => { verificarAuth() }, [])
  useEffect(() => { if (erro) { const t = setTimeout(() => setErro(null), 5000); return () => clearTimeout(t) } }, [erro])
  useEffect(() => { if (sucesso) { const t = setTimeout(() => setSucesso(null), 3000); return () => clearTimeout(t) } }, [sucesso])

  async function verificarAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/entrar'); return }
      const { data: prop } = await supabase.from('proprietarios').select('tenant_id, tenants(*)').eq('user_id', user.id).single()
      if (!prop?.tenant_id) { router.push('/registrar'); return }
      const t = prop.tenants as any
      setTenantId(prop.tenant_id); setTenantSlug(t.slug)
      setIdentidade({ nome: t.nome || '', logo_url: t.logo_url || '', slogan: '' })
      const paleta = PALETAS.find(p => p.p === t.cor_primaria)
      setCores({ paleta: paleta?.id || 'custom', primaria: t.cor_primaria || '#18181b', secundaria: t.cor_secundaria || '#ffffff', destaque: t.cor_destaque || '#d4af37', custom: !paleta })
      setContato({ telefone: t.telefone || '', whatsapp: t.whatsapp || '', email: t.email || '', endereco: t.endereco || '', cidade: t.cidade || '', estado: t.estado || '', cep: t.cep || '', instagram: t.instagram || '' })
      const { data: barb } = await supabase.from('barbeiros').select('*').eq('tenant_id', prop.tenant_id).eq('ativo', true)
      if (barb?.length) setBarbeiros(barb.map(b => ({ nome: b.nome, email: b.email || '', telefone: b.telefone || '', especialidades: b.especialidades || [] })))
      const { data: serv } = await supabase.from('servicos').select('*').eq('tenant_id', prop.tenant_id).eq('ativo', true)
      if (serv?.length) setServicos(serv.map(s => ({ nome: s.nome, descricao: s.descricao || '', preco: s.preco, duracao: s.duracao, categoria: s.categoria || 'Outros' })))
    } catch { setErro('Erro ao carregar dados') } finally { setCarregando(false) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !tenantId) return
    setUploadando(true)
    try {
      if (identidade.logo_url) await fetch(`/api/upload?url=${encodeURIComponent(identidade.logo_url)}`, { method: 'DELETE' }).catch(() => {})
      const fd = new FormData(); fd.append('file', file); fd.append('tenant_id', tenantId); fd.append('tipo', 'logo')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) { setIdentidade(p => ({ ...p, logo_url: data.url })); setSucesso('Logo enviada!') }
    } catch { setErro('Erro ao enviar imagem') } finally { setUploadando(false); if (inputFileRef.current) inputFileRef.current.value = '' }
  }

  const selecionarPaleta = (p: typeof PALETAS[0]) => setCores({ paleta: p.id, primaria: p.p, secundaria: p.s, destaque: p.d, custom: false })

  const salvar = async () => {
    if (!tenantId) return; setSalvando(true); setErro(null)
    try {
      if (etapa === 'boas-vindas') { setEtapa('identidade') }
      else if (etapa === 'identidade') {
        if (!identidade.nome.trim()) { setErro('Informe o nome'); setSalvando(false); return }
        await supabase.from('tenants').update({ nome: identidade.nome, logo_url: identidade.logo_url || null }).eq('id', tenantId)
        setEtapa('cores')
      } else if (etapa === 'cores') {
        await supabase.from('tenants').update({ cor_primaria: cores.primaria, cor_secundaria: cores.secundaria, cor_destaque: cores.destaque }).eq('id', tenantId)
        setEtapa('contato')
      } else if (etapa === 'contato') {
        await supabase.from('tenants').update({ telefone: contato.telefone || null, whatsapp: contato.whatsapp || null, email: contato.email || null, endereco: contato.endereco || null, cidade: contato.cidade || null, estado: contato.estado || null, cep: contato.cep || null, instagram: contato.instagram || null }).eq('id', tenantId)
        setEtapa('horarios')
      } else if (etapa === 'horarios') {
        const dias = horarios.filter(h => h.aberto).map(h => h.dia.toLowerCase().substring(0, 3))
        await supabase.from('configuracoes_barbearia').upsert({ tenant_id: tenantId, dias_funcionamento: dias, horario_abertura: horarios.find(h => h.aberto)?.abertura || '09:00', horario_fechamento: horarios.find(h => h.aberto)?.fechamento || '19:00' }, { onConflict: 'tenant_id' })
        setEtapa('equipe')
      } else if (etapa === 'equipe') {
        for (const b of barbeiros) { const { data: ex } = await supabase.from('barbeiros').select('id').eq('tenant_id', tenantId).eq('nome', b.nome).single(); if (!ex) await supabase.from('barbeiros').insert({ tenant_id: tenantId, nome: b.nome, email: b.email || null, telefone: b.telefone || null, especialidades: b.especialidades, ativo: true }) }
        setEtapa('servicos')
      } else if (etapa === 'servicos') {
        for (const s of servicos) { const { data: ex } = await supabase.from('servicos').select('id').eq('tenant_id', tenantId).eq('nome', s.nome).single(); if (!ex) await supabase.from('servicos').insert({ tenant_id: tenantId, nome: s.nome, descricao: s.descricao || null, preco: s.preco, duracao: s.duracao, categoria: s.categoria, ativo: true }) }
        setEtapa('finalizado')
      }
    } catch { setErro('Erro ao salvar') } finally { setSalvando(false) }
  }

  const addBarbeiro = () => { if (!novoBarbeiro.nome.trim()) { setErro('Informe o nome'); return }; setBarbeiros([...barbeiros, novoBarbeiro]); setNovoBarbeiro({ nome: '', email: '', telefone: '', especialidades: [] }); setSucesso('Adicionado!') }
  const addServico = () => { if (!novoServico.nome.trim() || novoServico.preco <= 0) { setErro('Preencha nome e preço'); return }; setServicos([...servicos, novoServico]); setNovoServico({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'Cortes' }); setSucesso('Adicionado!') }
  const addSugerido = (s: typeof SERVICOS_SUGERIDOS[0]) => { if (servicos.some(x => x.nome === s.nome)) return; setServicos([...servicos, s]); setSucesso(`${s.nome} adicionado!`) }

  if (carregando) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="text-center"><div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6"><Scissors className="w-10 h-10 text-white" /></div><Loader2 className="w-6 h-6 text-amber-500 animate-spin mx-auto" /></div></div>

  if (etapa === 'finalizado') return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full text-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-12 h-12 text-white" /></div>
        <h1 className="text-4xl font-bold text-white mb-4">Parabéns! 🎉</h1>
        <p className="text-xl text-zinc-400 mb-8">Sua barbearia está configurada e pronta!</p>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 mb-8">
          <div className="flex items-center gap-2 mb-3 justify-center"><Globe className="w-5 h-5 text-amber-500" /><span className="text-white font-medium">Seu link</span></div>
          <div className="flex gap-3 bg-zinc-950 rounded-xl p-4 border border-zinc-800">
            <code className="flex-1 text-amber-500 font-mono truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/{tenantSlug}</code>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${tenantSlug}`); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) }} className={`px-4 py-2 rounded-lg font-medium ${linkCopiado ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>{linkCopiado ? <><Check className="w-4 h-4 inline mr-1" />Copiado</> : <><Copy className="w-4 h-4 inline mr-1" />Copiar</>}</button>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <a href={`/${tenantSlug}`} target="_blank" className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white flex items-center justify-center gap-2"><Eye className="w-5 h-5" />Ver Site</a>
            <a href={`/${tenantSlug}/agendar`} target="_blank" className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white flex items-center justify-center gap-2"><Calendar className="w-5 h-5" />Testar</a>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-800">
            <div className="text-center"><div className="text-2xl font-bold text-white">{barbeiros.length}</div><div className="text-sm text-zinc-500">Barbeiros</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-white">{servicos.length}</div><div className="text-sm text-zinc-500">Serviços</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-white">{horarios.filter(h => h.aberto).length}</div><div className="text-sm text-zinc-500">Dias</div></div>
          </div>
        </div>
        <button onClick={() => router.push('/admin')} className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3">Acessar Painel <ArrowRight className="w-6 h-6" /></button>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"><Scissors className="w-5 h-5 text-white" /></div><span className="font-bold text-white hidden sm:block">BarberHub</span></div>
          <div className="hidden md:flex items-center gap-1">{ETAPAS.map((e, i) => { const I = e.icone; const completo = i < etapaIndex; const atual = e.id === etapa; return <button key={e.id} onClick={() => i <= etapaIndex && setEtapa(e.id as Etapa)} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${atual ? 'bg-amber-500/20 text-amber-500' : completo ? 'text-emerald-500 hover:bg-zinc-800' : 'text-zinc-600'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center ${completo ? 'bg-emerald-500 text-white' : atual ? 'bg-amber-500 text-black' : 'bg-zinc-800'}`}>{completo ? <Check className="w-3 h-3" /> : <span className="text-xs">{i + 1}</span>}</div><span className="text-sm font-medium hidden lg:block">{e.label}</span></button> })}</div>
          <div className="md:hidden text-sm text-zinc-400">{etapaIndex + 1}/{ETAPAS.length}</div>
        </div>
        <div className="h-1 bg-zinc-800"><motion.div className="h-full bg-gradient-to-r from-amber-500 to-orange-600" animate={{ width: `${progresso}%` }} /></div>
      </header>

      <AnimatePresence>{erro && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3"><X className="w-5 h-5" /><span className="text-sm flex-1">{erro}</span><button onClick={() => setErro(null)}><X className="w-4 h-4" /></button></motion.div>}</AnimatePresence>
      <AnimatePresence>{sucesso && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3"><Check className="w-5 h-5" /><span className="text-sm">{sucesso}</span></motion.div>}</AnimatePresence>

      <main className="pt-24 pb-32 px-4"><div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {etapa === 'boas-vindas' && <motion.div key="bv" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-12">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-8"><Sparkles className="w-12 h-12 text-white" /></div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Bem-vindo ao BarberHub!</h1>
            <p className="text-xl text-zinc-400 mb-8 max-w-xl mx-auto">Configure sua barbearia em poucos minutos e tenha um site profissional pronto para receber agendamentos online.</p>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">{[{ i: Store, t: 'Sua Marca', d: 'Logo e cores' }, { i: Users, t: 'Sua Equipe', d: 'Cadastre barbeiros' }, { i: Calendar, t: 'Agendamento', d: 'Receba reservas 24h' }].map((x, j) => <div key={j} className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800"><x.i className="w-8 h-8 text-amber-500 mx-auto mb-3" /><h3 className="font-semibold text-white mb-1">{x.t}</h3><p className="text-sm text-zinc-500">{x.d}</p></div>)}</div>
            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm"><Clock className="w-4 h-4" />5-10 minutos</div>
          </motion.div>}

          {etapa === 'identidade' && <motion.div key="id" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-6"><Store className="w-8 h-8 text-blue-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Identidade da Barbearia</h1><p className="text-zinc-400 text-lg">Nome e logo que seus clientes verão</p></div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div><label className="block text-sm font-medium text-zinc-300 mb-2">Nome da Barbearia *</label><input type="text" value={identidade.nome} onChange={e => setIdentidade({ ...identidade, nome: e.target.value })} placeholder="Ex: Barbearia Premium" className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 text-lg" /></div>
                <div><label className="block text-sm font-medium text-zinc-300 mb-2">Slogan (opcional)</label><input type="text" value={identidade.slogan} onChange={e => setIdentidade({ ...identidade, slogan: e.target.value })} placeholder="Ex: Estilo que transforma" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div>
                <div><label className="block text-sm font-medium text-zinc-300 mb-3">Logo</label><div className="flex gap-4"><div className="w-28 h-28 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden relative">{identidade.logo_url ? <Image src={identidade.logo_url} alt="Logo" fill className="object-cover" /> : <Store className="w-12 h-12 text-zinc-600" />}{uploadando && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}{identidade.logo_url && <button onClick={() => setIdentidade({ ...identidade, logo_url: '' })} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><X className="w-4 h-4 text-white" /></button>}</div><div className="flex-1"><button onClick={() => inputFileRef.current?.click()} disabled={uploadando} className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"><Upload className="w-4 h-4" />{identidade.logo_url ? 'Trocar' : 'Enviar'}</button><input ref={inputFileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" /><p className="text-xs text-zinc-500 mt-2">JPG, PNG, WebP • Máx 5MB</p></div></div></div>
              </div>
              <div className="hidden lg:block"><div className="sticky top-24"><div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-zinc-500" /><span className="text-xs text-zinc-500 uppercase tracking-wider">Preview</span></div><div className="rounded-2xl overflow-hidden border border-zinc-800" style={{ backgroundColor: cores.primaria }}><div className="p-8"><div className="flex items-center gap-4 mb-6"><div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">{identidade.logo_url ? <Image src={identidade.logo_url} alt="" width={64} height={64} className="object-cover" /> : <Store className="w-8 h-8" style={{ color: cores.secundaria }} />}</div><div><h3 className="text-2xl font-bold" style={{ color: cores.secundaria }}>{identidade.nome || 'Sua Barbearia'}</h3>{identidade.slogan && <p className="text-sm opacity-70" style={{ color: cores.secundaria }}>{identidade.slogan}</p>}</div></div><button className="w-full py-4 rounded-xl font-semibold" style={{ backgroundColor: cores.destaque, color: cores.primaria }}>Agendar Horário</button></div></div></div></div>
            </div>
          </motion.div>}

          {etapa === 'cores' && <motion.div key="cor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-6"><Palette className="w-8 h-8 text-purple-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Escolha seu Visual</h1><p className="text-zinc-400 text-lg">Paleta de cores da sua marca</p></div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">{PALETAS.map(p => <button key={p.id} onClick={() => selecionarPaleta(p)} className={`relative p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ${cores.paleta === p.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>{cores.paleta === p.id && <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"><Check className="w-4 h-4 text-black" /></div>}<div className="w-full h-14 rounded-xl mb-3" style={{ background: `linear-gradient(135deg, ${p.p} 0%, ${p.d} 100%)` }} /><div className="flex gap-2 mb-3"><div className="w-5 h-5 rounded-full border border-zinc-600" style={{ backgroundColor: p.p }} /><div className="w-5 h-5 rounded-full border border-zinc-600" style={{ backgroundColor: p.s }} /><div className="w-5 h-5 rounded-full border border-zinc-600" style={{ backgroundColor: p.d }} /></div><p className="font-semibold text-white text-sm">{p.nome}</p><p className="text-xs text-zinc-500">{p.desc}</p></button>)}</div>
                <button onClick={() => setCores({ ...cores, custom: !cores.custom })} className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700"><div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-amber-500" /><span className="text-white font-medium">Personalizar</span></div><ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${cores.custom ? 'rotate-90' : ''}`} /></button>
                {cores.custom && <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 space-y-4">{[{ k: 'primaria', l: 'Primária (fundo)' }, { k: 'secundaria', l: 'Secundária (texto)' }, { k: 'destaque', l: 'Destaque (botões)' }].map(c => <div key={c.k} className="flex items-center gap-3"><input type="color" value={(cores as any)[c.k]} onChange={e => setCores({ ...cores, [c.k]: e.target.value, paleta: 'custom' })} className="w-10 h-10 rounded-lg cursor-pointer border-0" /><div><p className="text-sm text-zinc-300">{c.l}</p><p className="text-xs text-zinc-500 font-mono">{(cores as any)[c.k]}</p></div></div>)}</div>}
              </div>
              <div className="hidden lg:block"><div className="sticky top-24"><div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-zinc-500" /><span className="text-xs text-zinc-500 uppercase tracking-wider">Preview</span></div><div className="rounded-2xl overflow-hidden border border-zinc-800" style={{ backgroundColor: cores.primaria }}><div className="p-6"><div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">{identidade.logo_url ? <Image src={identidade.logo_url} alt="" width={56} height={56} className="object-cover" /> : <Store className="w-7 h-7" style={{ color: cores.secundaria }} />}</div><div><h3 className="text-lg font-bold" style={{ color: cores.secundaria }}>{identidade.nome || 'Sua Barbearia'}</h3><p className="text-sm opacity-60" style={{ color: cores.secundaria }}>Agende online</p></div></div><div className="space-y-2 mb-6">{['Corte de Cabelo', 'Barba'].map((s, i) => <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: `${cores.secundaria}15` }}><div className="flex justify-between"><span style={{ color: cores.secundaria }}>{s}</span><span className="font-bold" style={{ color: cores.destaque }}>R$ {i === 0 ? '35' : '25'}</span></div></div>)}</div><button className="w-full py-3 rounded-xl font-semibold" style={{ backgroundColor: cores.destaque, color: cores.primaria }}>Continuar</button></div></div></div></div>
            </div>
          </motion.div>}

          {etapa === 'contato' && <motion.div key="cont" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6"><Phone className="w-8 h-8 text-green-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Informações de Contato</h1><p className="text-zinc-400 text-lg">Como seus clientes podem te encontrar</p></div>
            <div className="max-w-xl mx-auto space-y-6">
              <div className="grid sm:grid-cols-2 gap-4"><div><label className="block text-sm text-zinc-400 mb-2"><Phone className="w-4 h-4 inline mr-1" />Telefone</label><input type="tel" value={contato.telefone} onChange={e => setContato({ ...contato, telefone: e.target.value })} placeholder="(00) 0000-0000" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div><div><label className="block text-sm text-zinc-400 mb-2"><Zap className="w-4 h-4 inline mr-1 text-green-500" />WhatsApp</label><input type="tel" value={contato.whatsapp} onChange={e => setContato({ ...contato, whatsapp: e.target.value })} placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div></div>
              <div><label className="block text-sm text-zinc-400 mb-2"><Mail className="w-4 h-4 inline mr-1" />E-mail</label><input type="email" value={contato.email} onChange={e => setContato({ ...contato, email: e.target.value })} placeholder="contato@barbearia.com" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div>
              <div><label className="block text-sm text-zinc-400 mb-2"><Instagram className="w-4 h-4 inline mr-1 text-pink-500" />Instagram</label><input type="text" value={contato.instagram} onChange={e => setContato({ ...contato, instagram: e.target.value })} placeholder="@suabarbearia" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div>
              <div className="pt-4 border-t border-zinc-800"><label className="block text-sm text-zinc-400 mb-2"><MapPin className="w-4 h-4 inline mr-1" />Endereço</label><input type="text" value={contato.endereco} onChange={e => setContato({ ...contato, endereco: e.target.value })} placeholder="Rua, número, bairro" className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 mb-4" /><div className="grid grid-cols-3 gap-4"><input type="text" value={contato.cidade} onChange={e => setContato({ ...contato, cidade: e.target.value })} placeholder="Cidade" className="col-span-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /><input type="text" value={contato.estado} onChange={e => setContato({ ...contato, estado: e.target.value })} placeholder="UF" maxLength={2} className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 uppercase text-center" /></div></div>
            </div>
          </motion.div>}

          {etapa === 'horarios' && <motion.div key="hor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-6"><Clock className="w-8 h-8 text-orange-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Horários de Funcionamento</h1><p className="text-zinc-400 text-lg">Defina os dias e horários de atendimento</p></div>
            <div className="max-w-xl mx-auto space-y-3">{horarios.map((h, i) => <div key={h.dia} className={`p-4 rounded-xl border transition-all ${h.aberto ? 'bg-zinc-900/50 border-zinc-700' : 'bg-zinc-900/20 border-zinc-800'}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => setHorarios(horarios.map((x, j) => j === i ? { ...x, aberto: !x.aberto } : x))} className={`w-12 h-6 rounded-full transition-colors relative ${h.aberto ? 'bg-emerald-500' : 'bg-zinc-700'}`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${h.aberto ? 'left-6' : 'left-0.5'}`} /></button><span className={`font-medium ${h.aberto ? 'text-white' : 'text-zinc-500'}`}>{h.dia}</span></div>{h.aberto && <div className="flex items-center gap-2"><input type="time" value={h.abertura} onChange={e => setHorarios(horarios.map((x, j) => j === i ? { ...x, abertura: e.target.value } : x))} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" /><span className="text-zinc-500">às</span><input type="time" value={h.fechamento} onChange={e => setHorarios(horarios.map((x, j) => j === i ? { ...x, fechamento: e.target.value } : x))} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" /></div>}</div></div>)}</div>
          </motion.div>}

          {etapa === 'equipe' && <motion.div key="eq" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6"><Users className="w-8 h-8 text-cyan-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Sua Equipe</h1><p className="text-zinc-400 text-lg">Adicione os profissionais da barbearia</p></div>
            <div className="max-w-xl mx-auto space-y-6">
              {barbeiros.length > 0 && <div className="space-y-3">{barbeiros.map((b, i) => <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold text-lg">{b.nome[0]?.toUpperCase()}</div><div><p className="text-white font-medium">{b.nome}</p><p className="text-sm text-zinc-500">{b.email || b.telefone || 'Sem contato'}</p></div></div><button onClick={() => setBarbeiros(barbeiros.filter((_, j) => j !== i))} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button></div>)}</div>}
              <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4"><h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-amber-500" />Adicionar Barbeiro</h3><input type="text" value={novoBarbeiro.nome} onChange={e => setNovoBarbeiro({ ...novoBarbeiro, nome: e.target.value })} placeholder="Nome do barbeiro *" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /><div className="grid sm:grid-cols-2 gap-4"><input type="email" value={novoBarbeiro.email} onChange={e => setNovoBarbeiro({ ...novoBarbeiro, email: e.target.value })} placeholder="E-mail (opcional)" className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /><input type="tel" value={novoBarbeiro.telefone} onChange={e => setNovoBarbeiro({ ...novoBarbeiro, telefone: e.target.value })} placeholder="Telefone (opcional)" className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div><button onClick={addBarbeiro} disabled={!novoBarbeiro.nome.trim()} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Adicionar</button></div>
              <p className="text-center text-sm text-zinc-500">Você pode adicionar mais barbeiros depois no painel</p>
            </div>
          </motion.div>}

          {etapa === 'servicos' && <motion.div key="serv" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-6"><Scissors className="w-8 h-8 text-rose-500" /></div><h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Seus Serviços</h1><p className="text-zinc-400 text-lg">Cadastre os serviços oferecidos e preços</p></div>
            <div className="max-w-2xl mx-auto space-y-6">
              <div><p className="text-sm text-zinc-400 mb-3">Sugestões rápidas:</p><div className="flex flex-wrap gap-2">{SERVICOS_SUGERIDOS.map(s => { const ja = servicos.some(x => x.nome === s.nome); return <button key={s.nome} onClick={() => addSugerido(s)} disabled={ja} className={`px-3 py-1.5 rounded-full text-sm transition-all ${ja ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'}`}>{ja ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}{s.nome}</button> })}</div></div>
              {servicos.length > 0 && <div className="space-y-3">{servicos.map((s, i) => <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center"><Scissors className="w-5 h-5 text-amber-500" /></div><div><p className="text-white font-medium">{s.nome}</p><p className="text-sm text-zinc-500"><Clock className="w-3 h-3 inline mr-1" />{s.duracao}min • {s.categoria}</p></div></div><div className="flex items-center gap-4"><span className="text-amber-500 font-bold">R$ {s.preco.toFixed(2)}</span><button onClick={() => setServicos(servicos.filter((_, j) => j !== i))} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}
              <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl space-y-4"><h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-amber-500" />Adicionar Serviço</h3><div className="grid sm:grid-cols-2 gap-4"><input type="text" value={novoServico.nome} onChange={e => setNovoServico({ ...novoServico, nome: e.target.value })} placeholder="Nome do serviço *" className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /><input type="text" value={novoServico.descricao} onChange={e => setNovoServico({ ...novoServico, descricao: e.target.value })} placeholder="Descrição (opcional)" className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div><div className="grid grid-cols-3 gap-4"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">R$</span><input type="number" value={novoServico.preco || ''} onChange={e => setNovoServico({ ...novoServico, preco: parseFloat(e.target.value) || 0 })} placeholder="0" min="0" step="0.01" className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500" /></div><div className="relative"><input type="number" value={novoServico.duracao} onChange={e => setNovoServico({ ...novoServico, duracao: parseInt(e.target.value) || 30 })} min="5" step="5" className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">min</span></div><select value={novoServico.categoria} onChange={e => setNovoServico({ ...novoServico, categoria: e.target.value })} className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"><option value="Cortes">Cortes</option><option value="Barba">Barba</option><option value="Combos">Combos</option><option value="Tratamentos">Tratamentos</option><option value="Acabamentos">Acabamentos</option><option value="Outros">Outros</option></select></div><button onClick={addServico} disabled={!novoServico.nome.trim() || novoServico.preco <= 0} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Adicionar</button></div>
            </div>
          </motion.div>}
        </AnimatePresence>
      </div></main>

      <footer className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-4">
        <div className="max-w-3xl mx-auto flex justify-between gap-4">
          {etapaIndex > 0 ? <button onClick={() => setEtapa(ETAPAS[etapaIndex - 1].id as Etapa)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center gap-2"><ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Voltar</span></button> : <div />}
          <div className="flex gap-3">
            {(etapa === 'equipe' || etapa === 'servicos') && <button onClick={() => setEtapa(etapa === 'equipe' ? 'servicos' : 'finalizado')} className="px-6 py-3 text-zinc-400 hover:text-white">Pular</button>}
            <button onClick={salvar} disabled={salvando} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20">{salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{etapa === 'servicos' ? 'Finalizar' : etapa === 'boas-vindas' ? 'Começar' : 'Continuar'}<ArrowRight className="w-4 h-4" /></>}</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
