'use client'

import { Theme } from '@radix-ui/themes'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/**
 * Wrapper para o Radix Theme que sincroniza com o tema do next-themes
 * Isso permite que o Radix UI mude de appearance quando o usuário alterna o tema
 */
export function RadixThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Evitar hydration mismatch - renderizar com tema padrão até montar
  if (!mounted) {
    return (
      <Theme appearance="dark" accentColor="gray" grayColor="slate" radius="medium">
        {children}
      </Theme>
    )
  }

  return (
    <Theme 
      appearance={resolvedTheme === 'dark' ? 'dark' : 'light'} 
      accentColor="gray" 
      grayColor="slate" 
      radius="medium"
    >
      {children}
    </Theme>
  )
}
