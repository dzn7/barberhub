'use client'

/**
 * Componente para seleção do tipo de negócio
 * 
 * Usado na página de cadastro para o usuário escolher se está
 * criando uma Barbearia ou um Estúdio de Nail Designer.
 */

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Check } from 'lucide-react'
import { 
  TipoNegocio, 
  OPCOES_TIPO_NEGOCIO,
  OpcaoTipoNegocio 
} from '@/lib/tipos-negocio'

/**
 * Props do componente
 */
interface SeletorTipoNegocioProps {
  valor: TipoNegocio | null
  onChange: (tipo: TipoNegocio) => void
  disabled?: boolean
  className?: string
}

/**
 * Componente de card para cada opção de tipo
 */
function CardOpcao({
  opcao,
  selecionado,
  onClick,
  disabled
}: {
  opcao: OpcaoTipoNegocio
  selecionado: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`
        relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all
        ${selecionado 
          ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white' 
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Indicador de seleção */}
      {selecionado && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
      
      {/* Imagem */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden mb-4">
        <Image
          src={opcao.imagem}
          alt={opcao.titulo}
          fill
          className="object-cover"
        />
      </div>
      
      {/* Título */}
      <h3 
        className={`
          text-lg font-bold mb-2 transition-colors
          ${selecionado 
            ? 'text-white dark:text-zinc-900' 
            : 'text-zinc-900 dark:text-white'
          }
        `}
      >
        {opcao.titulo}
      </h3>
      
      {/* Descrição */}
      <p 
        className={`
          text-sm text-center transition-colors
          ${selecionado 
            ? 'text-zinc-300 dark:text-zinc-600' 
            : 'text-zinc-500 dark:text-zinc-400'
          }
        `}
      >
        {opcao.descricao}
      </p>
    </motion.button>
  )
}

/**
 * Componente principal de seleção de tipo de negócio
 */
export function SeletorTipoNegocio({
  valor,
  onChange,
  disabled = false,
  className = ''
}: SeletorTipoNegocioProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Título da seção */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Qual é o seu negócio?
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Selecione o tipo de estabelecimento que você vai cadastrar
        </p>
      </div>
      
      {/* Grid de opções */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {OPCOES_TIPO_NEGOCIO.map((opcao) => (
          <CardOpcao
            key={opcao.tipo}
            opcao={opcao}
            selecionado={valor === opcao.tipo}
            onClick={() => onChange(opcao.tipo)}
            disabled={disabled}
          />
        ))}
      </div>
      
      {/* Texto auxiliar */}
      {valor && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4"
        >
          Você selecionou: <strong className="text-zinc-900 dark:text-white">
            {OPCOES_TIPO_NEGOCIO.find(o => o.tipo === valor)?.titulo}
          </strong>
        </motion.p>
      )}
    </div>
  )
}

/**
 * Versão compacta do seletor para uso em formulários
 */
export function SeletorTipoNegocioCompacto({
  valor,
  onChange,
  disabled = false,
  className = ''
}: SeletorTipoNegocioProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      {OPCOES_TIPO_NEGOCIO.map((opcao) => {
        const selecionado = valor === opcao.tipo
        
        return (
          <button
            key={opcao.tipo}
            type="button"
            onClick={() => onChange(opcao.tipo)}
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
              ${selecionado 
                ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={opcao.imagem}
                alt={opcao.titulo}
                fill
                className="object-cover"
              />
            </div>
            <span className="font-medium">{opcao.titulo}</span>
          </button>
        )
      })}
    </div>
  )
}

export default SeletorTipoNegocio
