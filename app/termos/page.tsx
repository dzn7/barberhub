import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Termos de Uso | BarberHub',
  description: 'Termos e condições de uso da plataforma BarberHub para gestão de barbearias.',
}

export default function PaginaTermosDeUso() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <article className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-li:text-zinc-600 dark:prose-li:text-zinc-400">
          
          <h1 className="text-zinc-900 dark:text-white mb-2">Termos de Uso</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-8">
            Última atualização: 04 de janeiro de 2026
          </p>

          <p>
            Estes Termos de Uso regulam o acesso e a utilização da plataforma BarberHub, 
            disponibilizada por meio do site e aplicativo web. Ao utilizar nossos serviços, 
            você declara ter lido, compreendido e concordado integralmente com as disposições 
            aqui estabelecidas.
          </p>

          <h2>1. Definições</h2>
          <p>Para os fins destes Termos, considera-se:</p>
          <ul>
            <li>
              <strong>Plataforma:</strong> o sistema BarberHub, incluindo site, aplicativo web 
              e todas as funcionalidades disponibilizadas para gestão de barbearias.
            </li>
            <li>
              <strong>Usuário:</strong> pessoa física ou jurídica que acessa ou utiliza a 
              Plataforma, seja na condição de proprietário de barbearia, barbeiro ou cliente.
            </li>
            <li>
              <strong>Conta:</strong> cadastro individual do Usuário que permite acesso às 
              funcionalidades da Plataforma.
            </li>
            <li>
              <strong>Serviços:</strong> conjunto de funcionalidades oferecidas pela Plataforma, 
              incluindo agendamento online, gestão financeira, controle de equipe e demais recursos.
            </li>
          </ul>

          <h2>2. Objeto</h2>
          <p>
            A Plataforma BarberHub oferece solução tecnológica para gestão de barbearias, 
            permitindo o agendamento de serviços, controle financeiro, gestão de equipe e 
            comunicação com clientes. Os Serviços são disponibilizados mediante assinatura, 
            conforme planos e valores vigentes no momento da contratação.
          </p>

          <h2>3. Cadastro e Conta</h2>
          <p>
            Para utilizar a Plataforma, o Usuário deve criar uma Conta fornecendo informações 
            verdadeiras, completas e atualizadas. O Usuário é responsável pela veracidade dos 
            dados informados e pela manutenção da confidencialidade de suas credenciais de acesso.
          </p>
          <p>
            É vedado o compartilhamento de credenciais de acesso com terceiros. O Usuário 
            responde por todas as atividades realizadas em sua Conta, devendo comunicar 
            imediatamente qualquer uso não autorizado ou violação de segurança.
          </p>

          <h2>4. Planos e Pagamento</h2>
          <p>
            A Plataforma oferece período de teste gratuito de 14 (quatorze) dias, sem 
            necessidade de cadastro de cartão de crédito. Após o período de teste, o 
            acesso aos Serviços está condicionado à contratação de plano pago.
          </p>
          <p>
            Os valores dos planos são informados no momento da contratação e podem ser 
            alterados mediante aviso prévio de 30 (trinta) dias. O pagamento deve ser 
            realizado nas formas disponibilizadas pela Plataforma, sendo o acesso 
            suspenso em caso de inadimplência.
          </p>

          <h2>5. Obrigações do Usuário</h2>
          <p>O Usuário compromete-se a:</p>
          <ul>
            <li>Utilizar a Plataforma de acordo com a legislação vigente e estes Termos;</li>
            <li>Não utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
            <li>Manter seus dados cadastrais atualizados;</li>
            <li>Não tentar acessar áreas restritas ou sistemas da Plataforma sem autorização;</li>
            <li>Não reproduzir, copiar, modificar ou distribuir o conteúdo da Plataforma sem autorização;</li>
            <li>Respeitar os direitos de propriedade intelectual da Plataforma e de terceiros.</li>
          </ul>

          <h2>6. Propriedade Intelectual</h2>
          <p>
            Todos os direitos de propriedade intelectual relativos à Plataforma, incluindo 
            marca, logotipo, layout, código-fonte, funcionalidades e conteúdos, são de 
            titularidade exclusiva do BarberHub ou de seus licenciadores.
          </p>
          <p>
            O Usuário não adquire qualquer direito de propriedade sobre a Plataforma pelo 
            simples uso dos Serviços. É expressamente proibida a reprodução, modificação, 
            distribuição ou qualquer forma de exploração não autorizada.
          </p>

          <h2>7. Dados e Privacidade</h2>
          <p>
            O tratamento de dados pessoais realizado pela Plataforma observa a Lei Geral 
            de Proteção de Dados (Lei nº 13.709/2018) e está detalhado em nossa Política 
            de Privacidade, que integra estes Termos.
          </p>
          <p>
            O Usuário é responsável pelos dados de terceiros inseridos na Plataforma, 
            devendo garantir que possui autorização para o tratamento dessas informações 
            e que observa a legislação aplicável.
          </p>

          <h2>8. Disponibilidade dos Serviços</h2>
          <p>
            O BarberHub emprega esforços razoáveis para manter a Plataforma disponível 
            de forma contínua. Contudo, não garante disponibilidade ininterrupta, podendo 
            ocorrer interrupções para manutenção, atualizações ou por motivos de força maior.
          </p>
          <p>
            Interrupções programadas serão comunicadas com antecedência sempre que possível. 
            O BarberHub não se responsabiliza por danos decorrentes de indisponibilidade 
            temporária dos Serviços.
          </p>

          <h2>9. Limitação de Responsabilidade</h2>
          <p>
            O BarberHub não se responsabiliza por danos indiretos, incidentais, especiais 
            ou consequentes decorrentes do uso ou impossibilidade de uso da Plataforma, 
            incluindo perda de dados, lucros cessantes ou interrupção de negócios.
          </p>
          <p>
            A responsabilidade total do BarberHub, em qualquer hipótese, está limitada ao 
            valor pago pelo Usuário nos 12 (doze) meses anteriores ao evento que deu origem 
            à reclamação.
          </p>

          <h2>10. Rescisão</h2>
          <p>
            O Usuário pode cancelar sua assinatura a qualquer momento através das 
            configurações de sua Conta ou mediante contato com o suporte. O cancelamento 
            não gera direito a reembolso de valores já pagos, salvo disposição legal em contrário.
          </p>
          <p>
            O BarberHub pode suspender ou encerrar o acesso do Usuário em caso de violação 
            destes Termos, uso indevido da Plataforma ou por determinação legal ou judicial.
          </p>

          <h2>11. Alterações dos Termos</h2>
          <p>
            Estes Termos podem ser alterados a qualquer momento, mediante publicação da 
            versão atualizada na Plataforma. Alterações substanciais serão comunicadas 
            por e-mail ou notificação na Plataforma com antecedência mínima de 15 (quinze) dias.
          </p>
          <p>
            O uso continuado da Plataforma após a entrada em vigor das alterações implica 
            aceitação dos novos Termos.
          </p>

          <h2>12. Disposições Gerais</h2>
          <p>
            A tolerância quanto ao descumprimento de qualquer disposição destes Termos não 
            constitui renúncia ao direito de exigir seu cumprimento. Se qualquer disposição 
            for considerada inválida ou inexequível, as demais permanecerão em pleno vigor.
          </p>
          <p>
            Estes Termos constituem o acordo integral entre as partes quanto ao uso da 
            Plataforma, substituindo quaisquer entendimentos anteriores sobre o mesmo objeto.
          </p>

          <h2>13. Foro e Legislação Aplicável</h2>
          <p>
            Estes Termos são regidos pela legislação da República Federativa do Brasil. 
            Fica eleito o foro da comarca de Palmas, Estado do Tocantins, para dirimir 
            quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a 
            qualquer outro, por mais privilegiado que seja.
          </p>

          <h2>14. Contato</h2>
          <p>
            Para dúvidas, sugestões ou reclamações relacionadas a estes Termos ou aos 
            Serviços, o Usuário pode entrar em contato através dos seguintes canais:
          </p>
          <ul>
            <li>E-mail: contato@barberhub.com.br</li>
            <li>WhatsApp: (63) 98105-3014</li>
          </ul>

          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              Ao utilizar a plataforma BarberHub, você confirma que leu e concorda com 
              estes Termos de Uso em sua integralidade.
            </p>
          </div>
        </article>
      </main>

      {/* Footer simples */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-zinc-500">
            © {new Date().getFullYear()} BarberHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
