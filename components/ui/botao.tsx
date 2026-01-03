import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variantesBotao = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variante: {
        padrao: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl',
        destrutiva: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        contorno: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secundaria: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        fantasma: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      tamanho: {
        padrao: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-14 rounded-md px-10 text-base',
        icone: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variante: 'padrao',
      tamanho: 'padrao',
    },
  }
)

export interface PropriedadesBotao
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variantesBotao> {
  asChild?: boolean
}

const Botao = React.forwardRef<HTMLButtonElement, PropriedadesBotao>(
  ({ className, variante, tamanho, asChild = false, ...props }, ref) => {
    const Componente = asChild ? Slot : 'button'
    return (
      <Componente
        className={cn(variantesBotao({ variante, tamanho, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Botao.displayName = 'Botao'

export { Botao, variantesBotao }
