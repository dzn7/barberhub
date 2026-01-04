'use client'

import Image from 'next/image'
import { LinhaTempo } from '@/components/ui/linha-tempo'
import TextoDigitado from '@/components/ui/texto-digitado'
import { motion } from 'framer-motion'

export function SecaoLinhaTempo() {
  const dadosLinhaTempo = [
    {
      titulo: 'Agendamento Online',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Sistema de Agendamento Completo</h4>
              <p className="text-muted-foreground leading-relaxed">
                Visualize todos os agendamentos em formato de lista ou grade semanal. 
                O dashboard mostra métricas em tempo real: total de agendamentos, confirmados, 
                pendentes e receita prevista.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Busca inteligente por nome ou telefone</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Filtros por status de agendamento</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Navegação por períodos personalizados</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashboard-lista.png"
                alt="Dashboard de agendamentos em lista"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Grade Semanal',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashboard-gradesemanal.png"
                alt="Grade semanal de agendamentos"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Visualização em Grade</h4>
              <p className="text-muted-foreground leading-relaxed">
                Alterne entre visualização em lista e grade semanal. Filtre por barbeiro 
                específico ou visualize todos simultaneamente. Cada agendamento mostra 
                horário, cliente, serviço e barbeiro responsável.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Visualização por dia da semana</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Filtro individual por barbeiro</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Navegação entre semanas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Adição rápida de novos agendamentos</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Gestão de Serviços',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Catálogo de Serviços</h4>
              <p className="text-muted-foreground leading-relaxed">
                Crie e gerencie todos os serviços da barbearia. Defina preços, duração 
                e disponibilidade de cada serviço. Sistema mostra total de serviços 
                cadastrados e permite edição rápida.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Preços personalizados por serviço</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Duração configurável (15min a 60min+)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Adição ilimitada de serviços</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Edição em tempo real</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashbaord-servicos.png"
                alt="Gestão de serviços da barbearia"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Configurações',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashboard-config.png"
                alt="Configurações da barbearia"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Gestão de Barbeiros</h4>
              <p className="text-muted-foreground leading-relaxed">
                Cadastre e gerencie toda a equipe de barbeiros. Configure comissões 
                individuais, acompanhe status (ativo/inativo) e visualize métricas 
                da equipe em tempo real.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Cadastro completo de barbeiros</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Comissões personalizadas por profissional</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Controle de status ativo/inativo</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Métricas: total, ativos e comissão média</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Horários',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Horários de Funcionamento</h4>
              <p className="text-muted-foreground leading-relaxed">
                Configure horários de abertura, fechamento e intervalos de almoço. 
                Sistema flexível que permite definir quando a barbearia está disponível 
                para agendamentos e quando retorna do intervalo.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Horário de expediente personalizável</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Intervalo de almoço opcional</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Configuração independente por dia</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Bloqueio automático fora do expediente</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashboard-horarios.png"
                alt="Configuração de horários"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Remarcação',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/dashboard-remarcacao.png"
                alt="Sistema de remarcação"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Remarcação Inteligente</h4>
              <p className="text-muted-foreground leading-relaxed">
                Remarque agendamentos com notificação automática via WhatsApp. 
                Sistema mostra agendamentos futuros, permite seleção múltipla e 
                envia mensagem automática ao cliente com os novos detalhes.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Notificação automática via WhatsApp</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Remarcação individual ou múltipla</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Visualização de agendamentos futuros</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Informações completas: cliente, serviço, duração</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Landing Page',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Presença Online Profissional</h4>
              <p className="text-muted-foreground leading-relaxed">
                Cada barbearia recebe uma landing page personalizada e responsiva. 
                Hero section com destaque para experiência, botões de agendamento e 
                contato direto via WhatsApp. Métricas de credibilidade e avaliações.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Design profissional e moderno</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Botão de agendamento em destaque</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Integração direta com WhatsApp</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Métricas de experiência e avaliações</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/landing-page-mobile.png"
                alt="Landing page mobile - Hero"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Catálogo Online',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/landing-page-mobile2.png"
                alt="Catálogo de serviços online"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Serviços em Destaque</h4>
              <p className="text-muted-foreground leading-relaxed">
                Catálogo visual de todos os serviços disponíveis. Cada serviço 
                mostra preço, duração e botão de agendamento direto. Design limpo 
                que facilita a escolha do cliente.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Cards visuais para cada serviço</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Preços e duração visíveis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Botão de agendamento em cada card</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Link para ver todos os serviços</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Portfólio',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Galeria de Trabalhos</h4>
              <p className="text-muted-foreground leading-relaxed">
                Showcase dos melhores trabalhos da barbearia. Galeria interativa 
                com fotos de antes e depois, categorização por tipo de serviço e 
                sistema de likes para destacar trabalhos favoritos.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Galeria visual de transformações</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Categorização por tipo de serviço</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Sistema de likes e favoritos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Navegação intuitiva entre trabalhos</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/landing-page-mobile3.png"
                alt="Galeria de trabalhos"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      titulo: 'Avaliações',
      conteudo: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
              <Image
                src="/assets/landing-page-mobile4.png"
                alt="Sistema de avaliações"
                width={400}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-2xl font-bold">Avaliações Verificadas</h4>
              <p className="text-muted-foreground leading-relaxed">
                Sistema completo de avaliações de clientes reais. Média geral, 
                distribuição por estrelas e filtros personalizados. Transparência 
                total para construir confiança com novos clientes.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Avaliações verificadas de clientes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Média geral com sistema de estrelas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Distribuição detalhada (5★ a 1★)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Filtros por nota específica</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Botão para deixar avaliação</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="jornada" className="py-20 md:py-32 pb-8 md:pb-12">
      <div className="relative bg-zinc-100 dark:bg-black py-20 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center space-y-6"
            >
              <TextoDigitado
                texto={[
                  'Jornada Completa do Sistema',
                  'Explore Cada Funcionalidade',
                  'Transforme Sua Barbearia'
                ]}
                como="h2"
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white"
                velocidadeDigitacao={75}
                duracaoPausa={2000}
                mostrarCursor={true}
                caractereCursor="|"
                classeCursor="text-primary"
                iniciarAoVisivel={true}
              />
              <p className="text-lg text-zinc-600 dark:text-gray-400 max-w-3xl mx-auto">
                Conheça cada funcionalidade do Barber Hub através de capturas reais do sistema
              </p>
            </motion.div>
          </div>
        </div>
      </div>
      <LinhaTempo dados={dadosLinhaTempo} />
    </section>
  )
}
