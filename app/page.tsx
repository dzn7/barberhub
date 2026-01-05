import { Cabecalho } from '@/components/layout/cabecalho'
import { Rodape } from '@/components/layout/rodape'
import { SecaoHero } from '@/components/secoes/secao-hero'
import { SecaoVantagens } from '@/components/secoes/secao-vantagens'
import { SecaoBeneficios } from '@/components/secoes/secao-beneficios'
import { SecaoShowcase } from '@/components/secoes/secao-showcase'
import { SecaoPrecos } from '@/components/secoes/secao-precos'
import { SecaoContato } from '@/components/secoes/secao-contato'
import { DadosEstruturados } from '@/components/seo'

export default function PaginaInicial() {
  return (
    <>
      {/* Dados Estruturados JSON-LD para SEO */}
      <DadosEstruturados tipo="todos" />
      
      <div className="min-h-screen flex flex-col">
        <Cabecalho />
        <main className="flex-1" role="main" aria-label="Conteúdo principal">
          <SecaoHero />
          <SecaoVantagens />
          <SecaoBeneficios />
          <SecaoShowcase />
          <SecaoPrecos />
          <SecaoContato />
        </main>
        <Rodape />
      </div>
    </>
  )
}
