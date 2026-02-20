'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTerminologia } from '@/hooks/useTerminologia'
import { supabase } from '@/lib/supabase'
import { Barbeiro } from '@/lib/types'
import { Botao } from '@/components/ui/botao'
import { RecorteImagem } from '@/components/ui/recorte-imagem'
import { useToast } from '@/hooks/useToast'
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
  Camera,
  Percent
} from 'lucide-react'

const ESPECIALIDADES_SUGERIDAS = [
  'Corte Masculino',
  'Degradê',
  'Barba',
  'Pigmentação',
  'Química',
  'Corte Infantil',
  'Tratamento Capilar',
  'Sobrancelha',
  'Relaxamento'
]

export default function BarbeirosPage() {
  const { tenant } = useAuth()
  const { profissional, estabelecimento, terminologia } = useTerminologia()
  const preposicaoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'da' : 'do'
  const preposicaoNoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'na' : 'no'
  const { toast } = useToast()
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Barbeiro | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  
  // Estados para recorte de imagem
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(null)
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null)
  
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    especialidades: [] as string[],
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

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const abrirModal = (barbeiro?: Barbeiro) => {
    if (barbeiro) {
      setEditando(barbeiro)
      setForm({
        nome: barbeiro.nome,
        email: barbeiro.email,
        telefone: formatarTelefone(barbeiro.telefone),
        especialidades: barbeiro.especialidades || [],
        comissao_percentual: barbeiro.comissao_percentual,
        foto_url: barbeiro.foto_url || ''
      })
    } else {
      setEditando(null)
      setForm({
        nome: '',
        email: '',
        telefone: '',
        especialidades: [],
        comissao_percentual: 40,
        foto_url: ''
      })
    }
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    setImagemParaRecortar(null)
    setArquivoOriginal(null)
  }

  /**
   * Abre o seletor de arquivo e prepara a imagem para recorte
   */
  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    if (!arquivo.type.startsWith('image/')) {
      toast({ tipo: 'erro', mensagem: 'Selecione uma imagem válida' })
      return
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      toast({ tipo: 'erro', mensagem: 'A imagem deve ter no máximo 10MB' })
      return
    }

    // Criar URL temporária para preview e recorte
    const urlTemporaria = URL.createObjectURL(arquivo)
    setImagemParaRecortar(urlTemporaria)
    setArquivoOriginal(arquivo)
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    if (inputFotoRef.current) {
      inputFotoRef.current.value = ''
    }
  }

  /**
   * Processa a imagem recortada e faz upload
   */
  const handleRecorteConcluido = async (imagemRecortada: Blob) => {
    if (!tenant) return
    
    setUploadandoFoto(true)
    setImagemParaRecortar(null)
    
    try {
      // Criar arquivo a partir do blob recortado
      const arquivoRecortado = new File(
        [imagemRecortada], 
        arquivoOriginal?.name || 'foto-barbeiro.jpg',
        { type: 'image/jpeg' }
      )

      const formData = new FormData()
      formData.append('file', arquivoRecortado)
      formData.append('tenant_id', tenant.id)
      formData.append('tipo', 'barbeiro')

      const resposta = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const dados = await resposta.json()
      if (dados.error) throw new Error(dados.error)

      setForm({ ...form, foto_url: dados.url })
      toast({ tipo: 'sucesso', mensagem: 'Foto atualizada com sucesso' })
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao enviar foto' })
    } finally {
      setUploadandoFoto(false)
      setArquivoOriginal(null)
    }
  }

  /**
   * Cancela o recorte e limpa os estados
   */
  const handleCancelarRecorte = () => {
    if (imagemParaRecortar) {
      URL.revokeObjectURL(imagemParaRecortar)
    }
    setImagemParaRecortar(null)
    setArquivoOriginal(null)
  }

  const toggleEspecialidade = (especialidade: string) => {
    setForm(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(especialidade)
        ? prev.especialidades.filter(e => e !== especialidade)
        : [...prev.especialidades, especialidade]
    }))
  }

  const handleSalvar = async () => {
    if (!tenant) return
    
    if (!form.nome.trim()) {
      toast({ tipo: 'erro', mensagem: 'Digite o nome do profissional' })
      return
    }
    if (!form.telefone.trim()) {
      toast({ tipo: 'erro', mensagem: 'Digite o telefone do profissional' })
      return
    }
    
    setSalvando(true)
    
    try {
      const telefoneNumeros = form.telefone.replace(/\D/g, '')
      const emailFinal = form.email.trim() || `${form.nome.toLowerCase().replace(/\s/g, '.')}@temp.com`
      
      if (editando) {
        const { error } = await supabase
          .from('barbeiros')
          .update({
            nome: form.nome.trim(),
            email: emailFinal,
            telefone: telefoneNumeros,
            especialidades: form.especialidades,
            comissao_percentual: form.comissao_percentual,
            foto_url: form.foto_url || null
          })
          .eq('id', editando.id)
        
        if (error) throw error
        toast({ tipo: 'sucesso', mensagem: 'Profissional atualizado com sucesso!' })
      } else {
        const { error } = await supabase
          .from('barbeiros')
          .insert({
            tenant_id: tenant.id,
            nome: form.nome.trim(),
            email: emailFinal,
            telefone: telefoneNumeros,
            especialidades: form.especialidades,
            comissao_percentual: form.comissao_percentual,
            foto_url: form.foto_url || null
          })
        
        if (error) throw error
        toast({ tipo: 'sucesso', mensagem: 'Profissional adicionado com sucesso!' })
      }
      
      await carregarBarbeiros()
      fecharModal()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({ tipo: 'erro', mensagem: 'Erro ao salvar profissional' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return
    
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
              <h1 className="font-bold text-white">{profissional(true)}</h1>
              <p className="text-xs text-zinc-400">
                Gerencie os profissionais {preposicaoEstabelecimento} {estabelecimento().toLowerCase()}
              </p>
            </div>
          </div>
          
          <Botao onClick={() => abrirModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar {profissional()}
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
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum profissional cadastrado</h3>
            <p className="text-zinc-400 mb-6">
              Adicione os profissionais que trabalham {preposicaoNoEstabelecimento} {estabelecimento().toLowerCase()}
            </p>
            <Botao onClick={() => abrirModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar {profissional()}
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

      {/* Modal Profissional */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editando ? 'Editar Profissional' : 'Novo Profissional'}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {editando ? 'Atualize os dados do profissional' : 'Adicione um novo membro à equipe'}
                </p>
              </div>
              <button 
                onClick={fecharModal} 
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Foto com Crop */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-28 h-28 bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-zinc-700">
                    {uploadandoFoto ? (
                      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                    ) : form.foto_url ? (
                      <Image
                        src={form.foto_url}
                        alt="Foto"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-12 h-12 text-zinc-600" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-white text-zinc-900 rounded-full cursor-pointer hover:bg-zinc-200 transition-colors shadow-lg">
                    <input
                      ref={inputFotoRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSelecionarFoto}
                      className="hidden"
                    />
                    <Camera className="w-5 h-5" />
                  </label>
                </div>
                <p className="text-xs text-zinc-500">Clique para adicionar foto</p>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nome do Profissional <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 transition-all"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Telefone/WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 transition-all"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  E-mail <span className="text-zinc-500 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 transition-all"
                />
              </div>

              {/* Especialidades */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-3">
                  Especialidades
                </label>
                <div className="flex flex-wrap gap-2">
                  {ESPECIALIDADES_SUGERIDAS.map((esp) => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => toggleEspecialidade(esp)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                        form.especialidades.includes(esp)
                          ? 'bg-white text-zinc-900 font-medium'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
                {form.especialidades.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-2">
                    {form.especialidades.length} especialidade(s) selecionada(s)
                  </p>
                )}
              </div>

              {/* Comissão */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Comissão
                </label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    value={form.comissao_percentual || ''}
                    onChange={e => {
                      const valor = e.target.value;
                      setForm({ ...form, comissao_percentual: valor === '' ? 0 : parseFloat(valor) });
                    }}
                    min={0}
                    max={100}
                    placeholder="40"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 transition-all"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Percentual de comissão por atendimento
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-zinc-800">
              <button
                onClick={fecharModal}
                className="flex-1 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando || !form.nome.trim() || !form.telefone.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-zinc-900 rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    {editando ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editando ? 'Salvar' : 'Adicionar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recorte de Imagem */}
      {imagemParaRecortar && (
        <RecorteImagem
          imagemOriginal={imagemParaRecortar}
          onRecorteConcluido={handleRecorteConcluido}
          onCancelar={handleCancelarRecorte}
          formatoCircular={true}
        />
      )}
    </div>
  )
}
