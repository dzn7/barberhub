'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Servico } from '@/lib/types'
import { Botao } from '@/components/ui/botao'
import { 
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Scissors,
  Clock,
  DollarSign,
  Loader2,
  X,
  Save
} from 'lucide-react'

export default function ServicosPage() {
  const { tenant } = useAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [salvando, setSalvando] = useState(false)
  
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    duracao: '30',
    preco: '',
    categoria: 'geral'
  })

  const carregarServicos = async () => {
    if (!tenant) return
    
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('ativo', true)
      .order('ordem_exibicao')
    
    setServicos(data || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarServicos()
  }, [tenant])

  const abrirModal = (servico?: Servico) => {
    if (servico) {
      setEditando(servico)
      setForm({
        nome: servico.nome,
        descricao: servico.descricao || '',
        duracao: String(servico.duracao),
        preco: String(servico.preco),
        categoria: servico.categoria
      })
    } else {
      setEditando(null)
      setForm({
        nome: '',
        descricao: '',
        duracao: '30',
        preco: '',
        categoria: 'geral'
      })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
  }

  const handleSalvar = async () => {
    if (!tenant || !form.nome) return
    
    setSalvando(true)
    
    try {
      if (editando) {
        await supabase
          .from('servicos')
          .update({
            nome: form.nome,
            descricao: form.descricao,
            duracao: form.duracao,
            preco: form.preco,
            categoria: form.categoria
          })
          .eq('id', editando.id)
      } else {
        await supabase
          .from('servicos')
          .insert({
            tenant_id: tenant.id,
            nome: form.nome,
            descricao: form.descricao,
            duracao: form.duracao,
            preco: form.preco,
            categoria: form.categoria,
            ordem_exibicao: servicos.length
          })
      }
      
      await carregarServicos()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return
    
    await supabase
      .from('servicos')
      .update({ ativo: false })
      .eq('id', id)
    
    await carregarServicos()
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
              <h1 className="font-bold text-white">Serviços</h1>
              <p className="text-xs text-zinc-400">Gerencie os serviços da sua barbearia</p>
            </div>
          </div>
          
          <Botao onClick={() => abrirModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Botao>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-zinc-400 mb-6">Comece adicionando os serviços que sua barbearia oferece</p>
            <Botao onClick={() => abrirModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Serviço
            </Botao>
          </div>
        ) : (
          <div className="grid gap-4">
            {servicos.map(servico => (
              <div 
                key={servico.id}
                className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Scissors className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{servico.nome}</h3>
                    {servico.descricao && (
                      <p className="text-sm text-zinc-400">{servico.descricao}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {servico.duracao} min
                      </span>
                      <span className="text-xs text-zinc-500">{servico.categoria}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-primary">
                    R$ {servico.preco.toFixed(2)}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => abrirModal(servico)}
                      className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleExcluir(servico.id)}
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
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editando ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button onClick={fecharModal} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Corte de Cabelo"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição do serviço..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Duração (min) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.duracao}
                    onChange={e => {
                      const valor = e.target.value.replace(/[^0-9]/g, '')
                      setForm({ ...form, duracao: valor })
                    }}
                    placeholder="30"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Preço (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.preco}
                    onChange={e => {
                      const valor = e.target.value.replace(/[^0-9.,]/g, '')
                      setForm({ ...form, preco: valor })
                    }}
                    placeholder="0,00"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="geral">Geral</option>
                  <option value="popular">Popular</option>
                  <option value="premium">Premium</option>
                  <option value="adicional">Adicional</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Botao variante="contorno" onClick={fecharModal} className="flex-1">
                Cancelar
              </Botao>
              <Botao onClick={handleSalvar} disabled={salvando || !form.nome} className="flex-1">
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
