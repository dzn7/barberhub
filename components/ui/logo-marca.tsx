'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

type LogoMarcaProps = {
  className?: string
}

export function LogoMarca({ className }: LogoMarcaProps) {
  return (
    <div className={cn('relative flex items-center h-[5.75rem] w-auto', className)}>
      <Image
        src="/assets/logo/logoblack.png"
        alt="Barber Hub"
        width={320}
        height={72}
        priority
        className="hidden dark:inline-block h-[5.75rem] w-auto object-contain"
      />
      <Image
        src="/assets/logo/logowhite.png"
        alt="Barber Hub"
        width={320}
        height={72}
        priority
        className="dark:hidden inline-block h-[5.75rem] w-auto object-contain"
      />
      <span className="sr-only">Barber Hub</span>
    </div>
  )
}
