'use client'

import { useState, useCallback } from 'react'
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Ajustar Foto</h3>
          <button
            onClick={onCancelar}
            disabled={processando}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Cancelar recorte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área de Recorte */}
        <div className="flex-1 relative bg-zinc-950">
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
              containerClassName: 'bg-zinc-950',
              cropAreaClassName: formatoCircular 
                ? 'border-2 border-white/50' 
                : 'border-2 border-white/50 rounded-lg'
            }}
          />
        </div>

        {/* Controles */}
        <div className="p-4 border-t border-zinc-800 space-y-4">
          {/* Controle de Zoom */}
          <div className="flex items-center gap-4">
            <button
              onClick={diminuirZoom}
              disabled={zoom <= 1 || processando}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={processando}
                className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
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
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-zinc-700" />

            <button
              onClick={rotacionarImagem}
              disabled={processando}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
              aria-label="Rotacionar imagem"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {rotacao !== 0 && (
              <button
                onClick={resetarRotacao}
                disabled={processando}
                className="px-2 py-1 text-xs text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {rotacao}°
              </button>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <button
              onClick={onCancelar}
              disabled={processando}
              className="flex-1 px-4 py-3 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarRecorte}
              disabled={processando || !areaRecortada}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-black bg-white hover:bg-zinc-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
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
    </AnimatePresence>
  )
}
