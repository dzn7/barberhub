"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircle,
  Phone,
  Clock,
  Check,
  ChevronRight,
  Shield,
  Users,
  BarChart3,
  Bell,
  Headphones,
} from "lucide-react";
import { ModalPagamentoPix } from "@/components/pagamentos";

interface TelaTesteExpiradoProps {
  nomeBarbearia: string;
  dataExpiracao: string;
  tenantId?: string;
}

const beneficios = [
  { icone: Check, texto: "Agendamentos ilimitados", destaque: true },
  { icone: Users, texto: "Gestão completa de equipe" },
  { icone: BarChart3, texto: "Relatórios financeiros" },
  { icone: Bell, texto: "Notificações automáticas" },
  { icone: Headphones, texto: "Suporte prioritário" },
];

export function TelaTesteExpirado({
  nomeBarbearia,
  dataExpiracao,
  tenantId,
}: TelaTesteExpiradoProps) {
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [diasRestantes, setDiasRestantes] = useState(0);
  
  const numeroWhatsApp = "5586998053279";
  const mensagemWhatsApp = encodeURIComponent(
    `Olá! Sou da ${nomeBarbearia} e gostaria de ativar meu plano no BarberHub.`
  );
  const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemWhatsApp}`;

  useEffect(() => {
    const expiracao = new Date(dataExpiracao);
    const hoje = new Date();
    const diff = Math.ceil((hoje.getTime() - expiracao.getTime()) / (1000 * 60 * 60 * 24));
    setDiasRestantes(diff);
  }, [dataExpiracao]);

  const dataFormatada = new Date(dataExpiracao).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Gradiente sutil de fundo */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-amber-50/30 dark:from-emerald-950/20 dark:via-transparent dark:to-amber-950/10 pointer-events-none" />
      
      {/* Padrão geométrico sutil */}
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-zinc-900 dark:text-white"/>
        </svg>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-200 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/" className="group flex items-center gap-3">
              {/* Logo adaptável ao tema */}
              <div className="relative w-32 h-8 sm:w-36 sm:h-9">
                <Image
                  src="/assets/logo/logoblack.png"
                  alt="BarberHub"
                  fill
                  className="object-contain dark:hidden"
                  priority
                />
                <Image
                  src="/assets/logo/logowhite.png"
                  alt="BarberHub"
                  fill
                  className="object-contain hidden dark:block"
                  priority
                />
              </div>
            </Link>
            
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Precisa de ajuda?</span>
            </a>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full max-w-lg">
            
            {/* Badge de Status */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Teste expirado há {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </motion.div>

            {/* Ilustração/Ícone */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                {/* Círculo de fundo com gradiente */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 rotate-3">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
                </div>
                
                {/* Badge de alerta */}
                <motion.div
                  initial={{ scale: 0, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  <span className="text-white font-bold text-sm">!</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Título e Descrição */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                Período de teste encerrado
              </h1>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                O teste gratuito da{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">{nomeBarbearia}</span>{" "}
                terminou em{" "}
                <span className="text-amber-600 dark:text-amber-400 font-medium">{dataFormatada}</span>
              </p>
            </motion.div>

            {/* Card Principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 overflow-hidden mb-6"
            >
              {/* Header do Card */}
              <div className="px-5 sm:px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Plano Profissional
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-0.5">
                      Tudo que você precisa para crescer
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      R$ 39<span className="text-base font-medium text-zinc-500">,90</span>
                    </div>
                    <span className="text-xs text-zinc-500">por mês</span>
                  </div>
                </div>
              </div>

              {/* Lista de Benefícios */}
              <div className="px-5 sm:px-6 py-5">
                <ul className="space-y-3">
                  {beneficios.map((beneficio, index) => {
                    const Icone = beneficio.icone;
                    return (
                      <motion.li
                        key={beneficio.texto}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          beneficio.destaque 
                            ? 'bg-emerald-100 dark:bg-emerald-500/10' 
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        }`}>
                          <Icone className={`w-4 h-4 ${
                            beneficio.destaque 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-zinc-600 dark:text-zinc-400'
                          }`} />
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {beneficio.texto}
                        </span>
                        {beneficio.destaque && (
                          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                      </motion.li>
                    );
                  })}
                </ul>
              </div>

              {/* Botões de Ação */}
              <div className="px-5 sm:px-6 pb-5 space-y-3">
                {tenantId && (
                  <motion.button
                    onClick={() => setModalPagamentoAberto(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="group relative w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
                  >
                    <span>Ativar agora com PIX</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                )}

                <motion.a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Falar com suporte</span>
                </motion.a>
              </div>
            </motion.div>

            {/* Garantia */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-500"
            >
              <Shield className="w-4 h-4" />
              <span>Seus dados ficam seguros por mais 30 dias</span>
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/50 py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <a
                  href={`tel:+${numeroWhatsApp}`}
                  className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>(86) 99805-3279</span>
                </a>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>Seg-Sex, 9h-18h</span>
              </div>
              
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                © {new Date().getFullYear()} BarberHub. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Modal de Pagamento PIX */}
      {tenantId && (
        <ModalPagamentoPix
          aberto={modalPagamentoAberto}
          onFechar={() => setModalPagamentoAberto(false)}
          tenantId={tenantId}
          tenantNome={nomeBarbearia}
          onPagamentoAprovado={() => {
            setModalPagamentoAberto(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
