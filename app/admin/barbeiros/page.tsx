'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Barbeiro } from '@/lib/types'
import { Botao } from '@/components/ui/botao'
import { 
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Users,
  Mail,
  Phone,
  Loader2,
  X,
  Save,
  Upload
} from 'lucide-react'

export default function BarbeirosPage() {
  const { tenant } = useAuth()
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Barbeiro | null>(null)
  const [salvando, setSalvando] = useState(false)
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    especialidades: '',
    comissao_percentual: 40,
    foto_url: ''
  })

  const carregarBarbeiros = async () => {
    if (!tenant) return
    
    const { data } = await supabase
      .from('barbeiros')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('nome')
    
    setBarbeiros(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarBarbeiros()
  }, [tenant])

  const abrirModal = (barbeiro?: Barbeiro) => {
    if (barbeiro) {
      setEditando(barbeiro)
      setForm({
        nome: barbeiro.nome,
        email: barbeiro.email,
        telefone: barbeiro.telefone,
        especialidades: barbeiro.especialidades.join(', '),
        comissao_percentual: barbeiro.comissao_percentual,
        foto_url: barbeiro.foto_url || ''
      })
    } else {
      setEditando(null)
      setForm({
        nome: '',
        email: '',
        telefone: '',
        especialidades: '',
        comissao_percentual: 40,
        foto_url: ''
      })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
  }

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenant) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tenant_id', tenant.id)
    formData.append('tipo', 'barbeiro')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.url) {
        setForm({ ...form, foto_url: data.url })
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
    }
  }

  const handleSalvar = async () => {
    if (!tenant || !form.nome || !form.email || !form.telefone) return
    
    setSalvando(true)
    
    const especialidadesArray = form.especialidades
      .split(',')
      .map(e => e.trim())
      .filter(e => e)
    
    try {
      if (editando) {
        await supabase
          .from('barbeiros')
          .update({
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
            especialidades: especialidadesArray,
            comissao_percentual: form.comissao_percentual,
            foto_url: form.foto_url || null
          })
          .eq('id', editando.id)
      } else {
        await supabase
          .from('barbeiros')
          .insert({
            tenant_id: tenant.id,
            nome: form.nome,
            email: form.email,
            telefone: form.telefone,
            especialidades: especialidadesArray,
            comissao_percentual: form.comissao_percentual,
            foto_url: form.foto_url || null
          })
      }
      
      await carregarBarbeiros()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este barbeiro?')) return
    
    await supabase
      .from('barbeiros')
      .update({ ativo: false })
      .eq('id', id)
    
    await carregarBarbeiros()
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-zinc-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <h1 className="font-bold text-white">Barbeiros</h1>
              <p className="text-xs text-zinc-400">Gerencie os profissionais da sua barbearia</p>
            </div>
          </div>
          
          <Botao onClick={() => abrirModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Barbeiro
          </Botao>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : barbeiros.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum barbeiro cadastrado</h3>
            <p className="text-zinc-400 mb-6">Adicione os profissionais que trabalham na sua barbearia</p>
            <Botao onClick={() => abrirModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Barbeiro
            </Botao>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {barbeiros.map(barbeiro => (
              <div 
                key={barbeiro.id}
                className="bg-zinc-800 rounded-xl p-4 flex items-start gap-4"
              >
                <div className="w-16 h-16 bg-zinc-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {barbeiro.foto_url ? (
                    <Image
                      src={barbeiro.foto_url}
                      alt={barbeiro.nome}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-8 h-8 text-zinc-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{barbeiro.nome}</h3>
                  
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{barbeiro.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Phone className="w-3 h-3" />
                    <span>{barbeiro.telefone}</span>
                  </div>
                  
                  {barbeiro.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {barbeiro.especialidades.slice(0, 3).map((esp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                          {esp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm text-zinc-400">
                    {barbeiro.comissao_percentual}% comissão
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => abrirModal(barbeiro)}
                      className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleExcluir(barbeiro.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editando ? 'Editar Barbeiro' : 'Novo Barbeiro'}
              </h2>
              <button onClick={fecharModal} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-zinc-700 rounded-xl flex items-center justify-center overflow-hidden">
                  {form.foto_url ? (
                    <Image
                      src={form.foto_url}
                      alt="Foto"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-zinc-500" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFoto}
                    className="hidden"
                  />
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg">
                    <Upload className="w-4 h-4" />
                    Foto
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do barbeiro"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Telefone *</label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Especialidades</label>
                <input
                  type="text"
                  value={form.especialidades}
                  onChange={e => setForm({ ...form, especialidades: e.target.value })}
                  placeholder="Corte, Barba, Degradê (separar por vírgula)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Comissão (%)</label>
                <input
                  type="number"
                  value={form.comissao_percentual}
                  onChange={e => setForm({ ...form, comissao_percentual: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Botao variante="contorno" onClick={fecharModal} className="flex-1">
                Cancelar
              </Botao>
              <Botao 
                onClick={handleSalvar} 
                disabled={salvando || !form.nome || !form.email || !form.telefone} 
                className="flex-1"
              >
                {salvando ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Botao>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
