'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import Cropper, { Area, Point } from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
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

interface EditorLogoProps {
  logoUrl: string
  tenantId: string
  onLogoChange: (url: string) => void
  corPrimaria?: string
  corSecundaria?: string
}

/**
 * Componente de edição de logo com crop
 * Utiliza react-easy-crop para permitir recorte e ajuste da imagem
 */
export function EditorLogo({
  logoUrl,
  tenantId,
  onLogoChange,
  corPrimaria = '#18181b',
  corSecundaria = '#fafafa'
}: EditorLogoProps) {
  const [uploadando, setUploadando] = useState(false)
  const [imagemParaCrop, setImagemParaCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotacao, setRotacao] = useState(0)
  const [areaCropada, setAreaCropada] = useState<Area | null>(null)
  const [processando, setProcessando] = useState(false)

  // Callback quando o crop é completado
  const onCropComplete = useCallback((_: Area, areaCropadaPixels: Area) => {
    setAreaCropada(areaCropadaPixels)
  }, [])

  // Selecionar arquivo
  const handleSelecionarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    // Validar tipo
    if (!arquivo.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (5MB)
    if (arquivo.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
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
    if (!imagemParaCrop || !areaCropada) return null

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
          areaCropada.x,
          areaCropada.y,
          areaCropada.width,
          areaCropada.height,
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
    if (!areaCropada) return

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

      onLogoChange(dados.url)
      setImagemParaCrop(null)
    } catch (erro: any) {
      console.error('Erro ao fazer upload:', erro)
      alert('Erro ao salvar logo. Tente novamente.')
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
    <div className="space-y-4">
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Logo da Barbearia
      </label>

      {/* Modal de Crop */}
      <AnimatePresence>
        {imagemParaCrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-lg font-semibold text-white">
                  Ajustar Logo
                </h3>
                <button
                  onClick={handleCancelarCrop}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Área de Crop */}
              <div className="relative h-80 bg-zinc-950">
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
                />
              </div>

              {/* Controles */}
              <div className="p-4 space-y-4 border-t border-zinc-800">
                {/* Zoom */}
                <div className="flex items-center gap-4">
                  <ZoomOut className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <ZoomIn className="w-4 h-4 text-zinc-500" />
                </div>

                {/* Rotação */}
                <div className="flex items-center gap-4">
                  <RotateCw className="w-4 h-4 text-zinc-500" />
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={rotacao}
                    onChange={(e) => setRotacao(Number(e.target.value))}
                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <span className="text-xs text-zinc-500 w-12 text-right">
                    {rotacao}°
                  </span>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCancelarCrop}
                    className="flex-1 py-3 px-4 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarCrop}
                    disabled={processando}
                    className="flex-1 py-3 px-4 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      </AnimatePresence>

      {/* Preview e Controles */}
      <div className="flex items-center gap-4">
        {/* Preview da Logo */}
        <div 
          className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 flex items-center justify-center"
          style={{ backgroundColor: corPrimaria }}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              fill
              className="object-cover"
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
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            {logoUrl ? 'Trocar' : 'Enviar'}
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
              className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        JPG, PNG ou WebP • Máximo 5MB • Será recortado em formato circular
      </p>
    </div>
  )
}
