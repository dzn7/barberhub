'use client'

import { User, Phone } from 'lucide-react'

interface FormularioClienteProps {
  nome: string
  telefone: string
  observacoes: string
  onNomeChange: (nome: string) => void
  onTelefoneChange: (telefone: string) => void
  onObservacoesChange: (observacoes: string) => void
  erroTelefone?: boolean
  corDestaque?: string
}

export function FormularioCliente({
  nome,
  telefone,
  observacoes,
  onNomeChange,
  onTelefoneChange,
  onObservacoesChange,
  erroTelefone = false,
  corDestaque = '#f59e0b'
}: FormularioClienteProps) {
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    
    if (numeros.length <= 2) {
      return `(${numeros}`
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    } else if (numeros.length <= 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    onTelefoneChange(valorFormatado)
  }

  return (
    <div className="space-y-4">
      {/* Nome */}
      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          Seu Nome *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={nome}
            onChange={(e) => onNomeChange(e.target.value)}
            placeholder="Digite seu nome completo"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': corDestaque } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Telefone */}
      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          WhatsApp / Telefone *
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="tel"
            value={telefone}
            onChange={handleTelefoneChange}
            placeholder="(00) 00000-0000"
            className={`
              w-full bg-zinc-800 border rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent
              ${erroTelefone ? 'border-red-500' : 'border-zinc-700'}
            `}
            style={{ '--tw-ring-color': corDestaque } as React.CSSProperties}
          />
        </div>
        {erroTelefone && (
          <p className="text-sm text-red-400 mt-1">
            Digite um telefone válido
          </p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          Observações (opcional)
        </label>
        <textarea
          value={observacoes}
          onChange={(e) => onObservacoesChange(e.target.value)}
          placeholder="Alguma observação especial?"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
          style={{ '--tw-ring-color': corDestaque } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
