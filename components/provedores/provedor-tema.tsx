'use client'

import * as React from 'react'
import { ThemeProvider as ProvedorTemaNext } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ProvedorTema({ children, ...props }: ThemeProviderProps) {
  return <ProvedorTemaNext {...props}>{children}</ProvedorTemaNext>
}
