"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Clock,
  MessageCircle,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface TelaTesteExpiradoProps {
  nomeBarbearia: string;
  dataExpiracao: string;
}

/**
 * Tela exibida quando o período de teste de 14 dias expira
 * Design elegante e profissional com CTA para contato
 */
export function TelaTesteExpirado({
  nomeBarbearia,
  dataExpiracao,
}: TelaTesteExpiradoProps) {
  const numeroWhatsApp = "5586998053279";
  const mensagemWhatsApp = encodeURIComponent(
    `Olá! Sou da barbearia "${nomeBarbearia}" e meu período de teste expirou. Gostaria de saber mais sobre os planos disponíveis para continuar usando o BarberHub.`
  );
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemWhatsApp}`;

  const beneficios = [
    "Agendamentos ilimitados",
    "Gestão completa de barbeiros",
    "Relatórios financeiros detalhados",
    "Notificações automáticas",
    "Suporte prioritário",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              barber<span className="text-emerald-500">hub</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Ícone animado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-amber-500" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center"
              >
                <span className="text-black font-bold text-sm">!</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Seu período de teste terminou
            </h1>
            <p className="text-lg text-zinc-400 max-w-lg mx-auto">
              O teste gratuito de 14 dias da{" "}
              <span className="text-white font-medium">{nomeBarbearia}</span>{" "}
              expirou em{" "}
              <span className="text-amber-400">
                {new Date(dataExpiracao).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              .
            </p>
          </motion.div>

          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-semibold text-white">
                Continue crescendo com o BarberHub
              </h2>
            </div>

            <p className="text-zinc-400 mb-6">
              Entre em contato conosco para conhecer nossos planos e continuar
              aproveitando todos os benefícios:
            </p>

            {/* Lista de benefícios */}
            <ul className="space-y-3 mb-8">
              {beneficios.map((beneficio, index) => (
                <motion.li
                  key={beneficio}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3 text-zinc-300"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>{beneficio}</span>
                </motion.li>
              ))}
            </ul>

            {/* Botão WhatsApp */}
            <motion.a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-lg transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              Falar no WhatsApp
              <ArrowRight className="w-5 h-5" />
            </motion.a>
          </motion.div>

          {/* Informações de contato alternativas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-zinc-500"
          >
            <a
              href={`tel:+${numeroWhatsApp}`}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>(86) 99805-3279</span>
            </a>
            <span className="hidden sm:block">•</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Atendimento: Seg-Sex, 9h-18h</span>
            </div>
          </motion.div>

          {/* Nota */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-sm text-zinc-600 mt-8"
          >
            Seus dados estão seguros e serão mantidos por 30 dias após a
            expiração do teste.
          </motion.p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} BarberHub. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
