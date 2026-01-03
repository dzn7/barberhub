import { Cabecalho } from '@/components/layout/cabecalho'
import { Rodape } from '@/components/layout/rodape'
import { SecaoHero } from '@/components/secoes/secao-hero'
import { SecaoRecursos } from '@/components/secoes/secao-recursos'
import { SecaoBeneficios } from '@/components/secoes/secao-beneficios'
import { SecaoLinhaTempo } from '@/components/secoes/secao-linha-tempo'
import { SecaoDispositivos } from '@/components/secoes/secao-dispositivos'
import { SecaoDemonstracao } from '@/components/secoes/secao-demonstracao'
import { SecaoContato } from '@/components/secoes/secao-contato'

export default function PaginaInicial() {
  return (
    <div className="min-h-screen flex flex-col">
      <Cabecalho />
      <main className="flex-1">
        <SecaoHero />
        <SecaoRecursos />
        <SecaoBeneficios />
        <SecaoLinhaTempo />
        <SecaoDispositivos />
        <SecaoDemonstracao />
        <SecaoContato />
      </main>
      <Rodape />
    </div>
  )
}
