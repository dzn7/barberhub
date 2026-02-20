'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Cropper, { Area, Point } from 'react-easy-crop'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  X,
  Loader2
} from 'lucide-react'

interface RecorteImagemProps {
  imagemOriginal: string
  onRecorteConcluido: (imagemRecortada: Blob) => void
  onCancelar: () => void
  aspectoRecorte?: number
  formatoCircular?: boolean
}

/**
 * Componente de recorte de imagem profissional
 * Utiliza react-easy-crop para permitir recorte preciso de imagens
 */
export function RecorteImagem({
  imagemOriginal,
  onRecorteConcluido,
  onCancelar,
  aspectoRecorte = 1,
  formatoCircular = true
}: RecorteImagemProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotacao, setRotacao] = useState(0)
  const [areaRecortada, setAreaRecortada] = useState<Area | null>(null)
  const [processando, setProcessando] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const aoCompletarRecorte = useCallback((_: Area, areaPixels: Area) => {
    setAreaRecortada(areaPixels)
  }, [])

  const aumentarZoom = () => {
    setZoom(prev => Math.min(prev + 0.1, 3))
  }

  const diminuirZoom = () => {
    setZoom(prev => Math.max(prev - 0.1, 1))
  }

  const resetarRotacao = () => {
    setRotacao(0)
  }

  const rotacionarImagem = () => {
    setRotacao(prev => (prev + 90) % 360)
  }

  /**
   * Cria a imagem recortada a partir da área selecionada
   */
  const criarImagemRecortada = async (): Promise<Blob> => {
    if (!areaRecortada) {
      throw new Error('Área de recorte não definida')
    }

    const imagem = new Image()
    imagem.crossOrigin = 'anonymous'

    return new Promise((resolve, reject) => {
      imagem.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'))
          return
        }

        // Tamanho final do recorte (quadrado para foto de perfil)
        const tamanhoFinal = 400
        canvas.width = tamanhoFinal
        canvas.height = tamanhoFinal

        // Aplicar rotação se necessário
        if (rotacao !== 0) {
          const canvasTemp = document.createElement('canvas')
          const ctxTemp = canvasTemp.getContext('2d')

          if (!ctxTemp) {
            reject(new Error('Não foi possível criar contexto temporário'))
            return
          }

          // Calcular dimensões após rotação
          const radianos = (rotacao * Math.PI) / 180
          const sen = Math.abs(Math.sin(radianos))
          const cos = Math.abs(Math.cos(radianos))
          const novaLargura = imagem.width * cos + imagem.height * sen
          const novaAltura = imagem.width * sen + imagem.height * cos

          canvasTemp.width = novaLargura
          canvasTemp.height = novaAltura

          ctxTemp.translate(novaLargura / 2, novaAltura / 2)
          ctxTemp.rotate(radianos)
          ctxTemp.drawImage(imagem, -imagem.width / 2, -imagem.height / 2)

          // Desenhar área recortada no canvas final
          ctx.drawImage(
            canvasTemp,
            areaRecortada.x,
            areaRecortada.y,
            areaRecortada.width,
            areaRecortada.height,
            0,
            0,
            tamanhoFinal,
            tamanhoFinal
          )
        } else {
          // Sem rotação, desenhar diretamente
          ctx.drawImage(
            imagem,
            areaRecortada.x,
            areaRecortada.y,
            areaRecortada.width,
            areaRecortada.height,
            0,
            0,
            tamanhoFinal,
            tamanhoFinal
          )
        }

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Falha ao criar blob da imagem'))
            }
          },
          'image/jpeg',
          0.9
        )
      }

      imagem.onerror = () => {
        reject(new Error('Falha ao carregar imagem'))
      }

      imagem.src = imagemOriginal
    })
  }

  const confirmarRecorte = async () => {
    if (!areaRecortada) return

    setProcessando(true)
    try {
      const imagemRecortada = await criarImagemRecortada()
      onRecorteConcluido(imagemRecortada)
    } catch (erro) {
      console.error('Erro ao recortar imagem:', erro)
    } finally {
      setProcessando(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white/[0.97] dark:bg-black/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Ajustar Foto</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Arraste para reposicionar · Pinça para zoom
          </p>
        </div>
        <button
          onClick={onCancelar}
          disabled={processando}
          className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Cancelar recorte"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área de Recorte */}
      <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
        <Cropper
          image={imagemOriginal}
          crop={crop}
          zoom={zoom}
          rotation={rotacao}
          aspect={aspectoRecorte}
          cropShape={formatoCircular ? 'round' : 'rect'}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={aoCompletarRecorte}
          classes={{
            containerClassName: 'bg-zinc-100 dark:bg-zinc-950',
            cropAreaClassName: formatoCircular
              ? 'border-[3px] border-white/80 dark:border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]'
              : 'border-[3px] border-white/80 dark:border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] rounded-xl'
          }}
        />
      </div>

      {/* Controles */}
      <div className="px-5 py-5 sm:px-6 border-t border-zinc-200 dark:border-zinc-800 space-y-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        {/* Controle de Zoom */}
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <button
            onClick={diminuirZoom}
            disabled={zoom <= 1 || processando}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Diminuir zoom"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={processando}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-zinc-900
                dark:[&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110
                disabled:opacity-50"
            />
          </div>

          <button
            onClick={aumentarZoom}
            disabled={zoom >= 3 || processando}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

          <button
            onClick={rotacionarImagem}
            disabled={processando}
            className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Rotacionar imagem"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {rotacao !== 0 && (
            <button
              onClick={resetarRotacao}
              disabled={processando}
              className="px-2 py-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              {rotacao}°
            </button>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 max-w-md mx-auto w-full">
          <button
            onClick={onCancelar}
            disabled={processando}
            className="flex-1 px-4 py-3.5 text-sm font-medium text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarRecorte}
            disabled={processando || !areaRecortada}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {processando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando
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
    </motion.div>,
    document.body
  )
}
