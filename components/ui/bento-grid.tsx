import { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Botao } from '@/components/ui/botao'

interface PropriedadesBentoGrid extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  className?: string
}

interface PropriedadesCartaoBento extends ComponentPropsWithoutRef<'div'> {
  nome: string
  className: string
  fundo: ReactNode
  Icone: React.ElementType
  descricao: string
  href?: string
  cta?: string
}

const BentoGrid = ({ children, className, ...props }: PropriedadesBentoGrid) => {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[18rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const CartaoBento = ({
  nome,
  className,
  fundo,
  Icone,
  descricao,
  href,
  cta,
  ...props
}: PropriedadesCartaoBento) => (
  <div
    key={nome}
    className={cn(
      'group relative flex flex-col justify-between overflow-hidden rounded-xl',
      'bg-card border border-border/50',
      'hover:border-border transition-all duration-500',
      'hover:shadow-2xl hover:shadow-primary/5',
      className
    )}
    {...props}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    <div className="relative z-10">{fundo}</div>
    
    <div className="relative z-10 p-6 space-y-4">
      <div className="space-y-3 transform-gpu transition-all duration-500 group-hover:-translate-y-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-500">
          <Icone className="w-6 h-6 text-primary transform-gpu transition-all duration-500 group-hover:scale-110" />
        </div>
        <h3 className="text-xl font-semibold">
          {nome}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {descricao}
        </p>
      </div>

      {href && cta && (
        <div className="opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
          <Botao
            variante="link"
            tamanho="sm"
            className="p-0 h-auto group/btn"
            asChild
          >
            <a href={href} className="inline-flex items-center">
              {cta}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </a>
          </Botao>
        </div>
      )}
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-500 group-hover:bg-background/5" />
  </div>
)

export { CartaoBento, BentoGrid }
