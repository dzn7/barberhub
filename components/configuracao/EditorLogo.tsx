'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Cropper, { Area } from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/useToast'
import { obterTerminologia } from '@/lib/configuracoes-negocio'
import { TipoNegocio } from '@/lib/tipos-negocio'
import {
  Upload,
  Trash2,
  Loader2,
  Store,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react'

interface IconesPWA {
  icone_192: string
  icone_512: string
}

interface EditorLogoProps {
  logoUrl: string
  tenantId: string
  onLogoChange: (url: string, iconesPwa?: IconesPWA) => void
  corPrimaria?: string
  corSecundaria?: string
  tipoNegocio?: TipoNegocio
}

/**
 * Componente de edição de logo com crop
 * Utiliza react-easy-crop para permitir recorte e ajuste da imagem
 */
export function EditorLogo({
  logoUrl,
  onLogoChange,
  tenantId,
  corPrimaria = '#18181b',
  corSecundaria = '#ffffff',
  tipoNegocio = 'barbearia'
}: EditorLogoProps) {
  const { toast } = useToast()
  const terminologia = obterTerminologia(tipoNegocio)
  const preposicaoEstabelecimento = terminologia.estabelecimento.artigo === 'a' ? 'da' : 'do'
  const nomeEstabelecimento = terminologia.estabelecimento.singular
  const [imagemParaCrop, setImagemParaCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotacao, setRotacao] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [processando, setProcessando] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (imagemParaCrop) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [imagemParaCrop])

  // Callback quando o crop é completado
  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  // Selecionar arquivo
  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    // Validar tipo
    if (!arquivo.type.startsWith('image/')) {
      toast({ tipo: 'erro', mensagem: 'Por favor, selecione uma imagem válida' })
      return
    }

    // Validar tamanho (5MB)
    if (arquivo.size > 5 * 1024 * 1024) {
      toast({ tipo: 'erro', mensagem: 'A imagem deve ter no máximo 5MB' })
      return
    }

    // Criar URL temporária para o cropper
    const urlTemporaria = URL.createObjectURL(arquivo)
    setImagemParaCrop(urlTemporaria)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotacao(0)
  }

  // Criar imagem cropada
  const criarImagemCropada = async (): Promise<Blob | null> => {
    if (!imagemParaCrop || !croppedAreaPixels) return null

    return new Promise((resolve) => {
      const imagem = document.createElement('img')
      imagem.crossOrigin = 'anonymous'
      imagem.src = imagemParaCrop

      imagem.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          resolve(null)
          return
        }

        // Tamanho final do canvas (quadrado para logo)
        const tamanhoFinal = 400
        canvas.width = tamanhoFinal
        canvas.height = tamanhoFinal

        // Aplicar rotação se necessário
        ctx.save()
        ctx.translate(tamanhoFinal / 2, tamanhoFinal / 2)
        ctx.rotate((rotacao * Math.PI) / 180)
        ctx.translate(-tamanhoFinal / 2, -tamanhoFinal / 2)

        // Desenhar a área cropada
        ctx.drawImage(
          imagem,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          tamanhoFinal,
          tamanhoFinal
        )

        ctx.restore()

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            resolve(blob)
          },
          'image/webp',
          0.9
        )
      }

      imagem.onerror = () => {
        resolve(null)
      }
    })
  }

  // Confirmar crop e fazer upload
  const handleConfirmarCrop = async () => {
    if (!croppedAreaPixels) return

    setProcessando(true)

    try {
      const blobCropado = await criarImagemCropada()
      if (!blobCropado) throw new Error('Erro ao processar imagem')

      // Se já existe uma logo, deletar
      if (logoUrl) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(logoUrl)}`, {
            method: 'DELETE',
          })
        } catch (err) {
          console.warn('Erro ao deletar logo anterior:', err)
        }
      }

      // Criar FormData com o blob cropado
      const formData = new FormData()
      const arquivo = new File([blobCropado], 'logo.webp', { type: 'image/webp' })
      formData.append('file', arquivo)
      formData.append('tenant_id', tenantId)
      formData.append('tipo', 'logo')

      const resposta = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const dados = await resposta.json()

      if (dados.error) throw new Error(dados.error)

      // Gerar ícones PWA automaticamente a partir da logo
      let iconesPwa: IconesPWA | undefined
      try {
        const formDataPwa = new FormData()
        formDataPwa.append('file', arquivo)
        formDataPwa.append('tenant_id', tenantId)

        const respostaPwa = await fetch('/api/gerar-icones-pwa', {
          method: 'POST',
          body: formDataPwa,
        })

        if (respostaPwa.ok) {
          iconesPwa = await respostaPwa.json()
        }
      } catch (erroPwa) {
        console.warn('Não foi possível gerar ícones PWA:', erroPwa)
      }

      onLogoChange(dados.url, iconesPwa)
      setImagemParaCrop(null)
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao salvar logo. Tente novamente.' })
    } finally {
      setProcessando(false)
    }
  }

  // Cancelar crop
  const handleCancelarCrop = () => {
    if (imagemParaCrop) {
      URL.revokeObjectURL(imagemParaCrop)
    }
    setImagemParaCrop(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotacao(0)
  }

  // Remover logo
  const handleRemoverLogo = async () => {
    if (!logoUrl) return

    setUploadando(true)
    try {
      await fetch(`/api/upload?url=${encodeURIComponent(logoUrl)}`, {
        method: 'DELETE',
      })
      onLogoChange('')
    } catch (erro) {
      console.error('Erro ao remover logo:', erro)
    } finally {
      setUploadando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Logo {preposicaoEstabelecimento} {nomeEstabelecimento}
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Essa imagem aparece no site público e em mensagens de agendamento.
        </p>
      </div>

      {/* Modal de Crop via Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {imagemParaCrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      Ajustar Logo
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Arraste para reposicionar · Pinça para zoom
                    </p>
                  </div>
                  <button
                    onClick={handleCancelarCrop}
                    disabled={processando}
                    className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Área de Crop */}
                <div className="relative h-72 sm:h-80 bg-zinc-100 dark:bg-zinc-950">
                  <Cropper
                    image={imagemParaCrop}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotacao}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    classes={{
                      containerClassName: 'bg-zinc-100 dark:bg-zinc-950',
                      cropAreaClassName: 'border-[3px] border-white/80 dark:border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'
                    }}
                  />
                </div>

                {/* Controles */}
                <div className="px-5 py-4 space-y-4 border-t border-zinc-200 dark:border-zinc-800 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  {/* Zoom */}
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-zinc-900
                        dark:[&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <ZoomIn className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  </div>

                  {/* Rotação */}
                  <div className="flex items-center gap-3">
                    <RotateCw className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={rotacao}
                      onChange={(e) => setRotacao(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:bg-zinc-900
                        dark:[&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 w-10 text-right shrink-0">
                      {rotacao}°
                    </span>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleCancelarCrop}
                      disabled={processando}
                      className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmarCrop}
                      disabled={processando}
                      className="flex-1 py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processando ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Aplicar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Preview e Controles */}
      <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/80 dark:to-zinc-950/70 ring-1 ring-zinc-200/70 dark:ring-zinc-800/70">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          {/* Preview da Logo */}
          <div
            className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center shrink-0"
            style={{ backgroundColor: corPrimaria }}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <Store className="w-8 h-8" style={{ color: corSecundaria + '50' }} />
            )}
            {uploadando && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex-1 min-w-0 space-y-2">
            <label className="w-full sm:w-fit inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer text-sm font-medium">
              <Upload className="w-4 h-4" />
              {logoUrl ? 'Trocar imagem' : 'Enviar imagem'}
              <input
                type="file"
                accept="image/*"
                onChange={handleSelecionarArquivo}
                className="hidden"
              />
            </label>
            {logoUrl && (
              <button
                onClick={handleRemoverLogo}
                disabled={uploadando}
                className="w-full sm:w-fit inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Formatos aceitos: JPG, PNG ou WebP. Tamanho máximo: 5MB.
      </p>
    </div>
  )
}
