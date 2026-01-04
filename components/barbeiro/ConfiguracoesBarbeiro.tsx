'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Phone, 
  Mail,
  Scissors,
  DollarSign,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle,
  Star,
  Upload
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'
import { RecorteImagem } from '@/components/ui/recorte-imagem'
import { useToast } from '@/hooks/useToast'

interface Servico {
  id: string
  nome: string
  preco: number
  duracao: number
  ativo: boolean
}

/**
 * Configurações do Barbeiro
 * Visualização de dados pessoais e serviços
 */
export function ConfiguracoesBarbeiro() {
  const { barbeiro, tenant, recarregar } = useBarbeiroAuth()
  const { toast } = useToast()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(null)
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null)
  const [fotoAtual, setFotoAtual] = useState<string | null>(null)
  const inputFotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (barbeiro) {
      setFotoAtual(barbeiro.foto_url)
    }
  }, [barbeiro])

  useEffect(() => {
    if (tenant) {
      carregarServicos()
    }
  }, [tenant])

  const carregarServicos = async () => {
    if (!tenant) return

    try {
      const { data } = await supabase
        .from('servicos')
        .select('id, nome, preco, duracao, ativo')
        .eq('tenant_id', tenant.id)
        .order('nome')

      setServicos(data || [])
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setCarregando(false)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

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

    const urlTemporaria = URL.createObjectURL(arquivo)
    setImagemParaRecortar(urlTemporaria)
    setArquivoOriginal(arquivo)
    
    if (inputFotoRef.current) {
      inputFotoRef.current.value = ''
    }
  }

  const handleRecorteConcluido = async (imagemRecortada: Blob) => {
    if (!barbeiro || !tenant) return
    
    setUploadandoFoto(true)
    setImagemParaRecortar(null)
    
    try {
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

      // Atualizar no banco
      const { error } = await supabase
        .from('barbeiros')
        .update({ foto_url: dados.url })
        .eq('id', barbeiro.id)

      if (error) throw error

      setFotoAtual(dados.url)
      setMensagem({ tipo: 'sucesso', texto: 'Foto atualizada com sucesso!' })
      setTimeout(() => setMensagem(null), 3000)
      
      // Recarregar dados do barbeiro
      if (recarregar) {
        await recarregar()
      }
    } catch (erro) {
      console.error('Erro ao enviar foto:', erro)
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar foto' })
    } finally {
      setUploadandoFoto(false)
      setArquivoOriginal(null)
    }
  }

  const handleCancelarRecorte = () => {
    if (imagemParaRecortar) {
      URL.revokeObjectURL(imagemParaRecortar)
    }
    setImagemParaRecortar(null)
    setArquivoOriginal(null)
  }

  if (!barbeiro || !tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Configurações
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Seus dados e informações
        </p>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {mensagem.tipo === 'sucesso' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {mensagem.texto}
        </motion.div>
      )}

      {/* Perfil */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-zinc-500" />
          Meu Perfil
        </h3>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Foto com opção de alterar */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {fotoAtual ? (
                  <img
                    src={fotoAtual}
                    alt={barbeiro.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-zinc-400" />
                  </div>
                )}
                {uploadandoFoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={uploadandoFoto}
                className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
                title="Alterar foto"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSelecionarFoto}
                className="hidden"
              />
            </div>
            <p className="text-xs text-zinc-500 text-center mt-3">
              Clique para alterar
            </p>
          </div>

          {/* Dados */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm text-zinc-500 mb-1">Nome</label>
              <p className="font-medium text-zinc-900 dark:text-white">
                {barbeiro.nome}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-500 mb-1">E-mail</label>
                <p className="text-zinc-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  {barbeiro.email}
                </p>
              </div>
              <div>
                <label className="block text-sm text-zinc-500 mb-1">Telefone</label>
                <p className="text-zinc-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  {barbeiro.telefone}
                </p>
              </div>
            </div>

            {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
              <div>
                <label className="block text-sm text-zinc-500 mb-2">Especialidades</label>
                <div className="flex flex-wrap gap-2">
                  {barbeiro.especialidades.map((esp, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      {esp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Comissão */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm mb-1">Sua Comissão</p>
            <p className="text-4xl font-bold">
              {barbeiro.comissao_percentual || 0}%
            </p>
            <p className="text-emerald-100 text-sm mt-2">
              sobre cada atendimento realizado
            </p>
          </div>
          <div className="p-4 bg-white/20 rounded-xl">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

      {/* Barbearia */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-zinc-500" />
          Barbearia
        </h3>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.nome}
                className="w-full h-full object-cover"
              />
            ) : (
              <Scissors className="w-8 h-8 text-zinc-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">
              {tenant.nome}
            </p>
            <p className="text-sm text-zinc-500">
              @{tenant.slug}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Serviços Disponíveis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-zinc-500" />
          Serviços Disponíveis
        </h3>

        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : servicos.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            Nenhum serviço cadastrado
          </p>
        ) : (
          <div className="space-y-3">
            {servicos.filter(s => s.ativo).map(servico => (
              <div
                key={servico.id}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {servico.nome}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {servico.duracao} minutos
                  </p>
                </div>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatarMoeda(servico.preco)}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Info */}
      <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
          Para alterar seus dados (exceto foto), entre em contato com o proprietário da barbearia.
        </p>
      </div>

      {/* Modal de Recorte de Imagem */}
      {imagemParaRecortar && (
        <RecorteImagem
          imagemOriginal={imagemParaRecortar}
          onRecorteConcluido={handleRecorteConcluido}
          onCancelar={handleCancelarRecorte}
          aspectoRecorte={1}
          formatoCircular={true}
        />
      )}
    </div>
  )
}
