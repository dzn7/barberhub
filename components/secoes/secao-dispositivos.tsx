'use client'

import { MacbookScroll } from '@/components/ui/macbook-scroll'

export function SecaoDispositivos() {
  return (
    <section className="relative bg-white dark:bg-black overflow-hidden -mt-32 md:-mt-48">
      <MacbookScroll
        src="/assets/macbook.png"
        showGradient={false}
        title={
          <span>
            Acesse de Qualquer Dispositivo <br />
            Interface Responsiva e Moderna
          </span>
        }
      />
    </section>
  )
}
