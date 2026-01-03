import * as React from 'react'
import { cn } from '@/lib/utils'

const Cartao = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm transition-all',
      className
    )}
    {...props}
  />
))
Cartao.displayName = 'Cartao'

const CabecalhoCartao = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CabecalhoCartao.displayName = 'CabecalhoCartao'

const TituloCartao = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
TituloCartao.displayName = 'TituloCartao'

const DescricaoCartao = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DescricaoCartao.displayName = 'DescricaoCartao'

const ConteudoCartao = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
ConteudoCartao.displayName = 'ConteudoCartao'

const RodapeCartao = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
RodapeCartao.displayName = 'RodapeCartao'

export { Cartao, CabecalhoCartao, TituloCartao, DescricaoCartao, ConteudoCartao, RodapeCartao }
