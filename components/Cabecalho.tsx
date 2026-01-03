"use client";

import { useState } from "react";
import { Scissors, Calendar, Menu, X, Phone, Clock, MapPin, User, LogOut, ClipboardList } from "lucide-react";
import { AlternadorTema } from "./AlternadorTema";
import { useAutenticacao } from "@/contexts/AutenticacaoContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Cabeçalho da aplicação
 * Design limpo e funcional
 */
export function Cabecalho() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const { usuario, sair } = useAutenticacao();

  const itensMenu = [
    { href: "/", label: "Início", icon: Scissors },
    { href: "/agendamento", label: "Agendar", icon: Calendar },
    { href: "/#meus-agendamentos", label: "Meus Agendamentos", icon: ClipboardList },
  ];

  const handleSair = async () => {
    await sair();
    setMenuAberto(false);
    router.push("/");
  };

  const informacoesContato = [
    { icon: Phone, texto: "(86) 99415-6652", href: "tel:+5511999999999" },
    { icon: Clock, texto: "Seg-Sáb: 9h-18h", href: null },
    { icon: MapPin, texto: "Barras, PI", href: null },
  ];

  return (
    <>
      {/* Barra superior com informações */}
      <div className="hidden lg:block bg-zinc-900 dark:bg-[#1a1a1a] text-white py-2">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              {informacoesContato.map((info, index) => {
                const Icon = info.icon;
                const conteudo = (
                  <div className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors">
                    <Icon className="h-4 w-4" />
                    <span>{info.texto}</span>
                  </div>
                );

                return info.href ? (
                  <a key={index} href={info.href}>
                    {conteudo}
                  </a>
                ) : (
                  <div key={index}>{conteudo}</div>
                );
              })}
            </div>
            <div className="text-zinc-300">
              Bem-vindo à melhor barbearia da região
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho principal */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-lg overflow-x-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="flex h-20 items-center justify-between relative">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-4 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="relative"
              >
                <div className="relative w-48 h-16 md:w-52 md:h-20">
                  {/* Logo para modo escuro */}
                  <Image
                    src="/assets/logodark.webp"
                    alt="Logo Barbearia BR99"
                    fill
                    sizes="(max-width: 768px) 192px, 208px"
                    className="object-contain object-left dark:block hidden"
                    priority
                  />
                  {/* Logo para modo claro */}
                  <Image
                    src="/assets/logowhite.webp"
                    alt="Logo Barbearia BR99"
                    fill
                    sizes="(max-width: 768px) 192px, 208px"
                    className="object-contain object-left dark:hidden block"
                    priority
                  />
                </div>
              </motion.div>
            </Link>

            {/* Menu desktop */}
            <nav className="hidden md:flex items-center space-x-2 absolute left-1/2 -translate-x-1/2">
              {itensMenu.map((item) => {
                const Icon = item.icon;
                const ativo = pathname === item.href;
                const temAncora = item.href.includes('#');

                const handleClickDesktop = () => {
                  if (temAncora) {
                    const ancora = item.href.split('#')[1];
                    if (pathname === '/') {
                      const elemento = document.getElementById(ancora);
                      if (elemento) {
                        elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    } else {
                      sessionStorage.setItem('scrollTo', ancora);
                      router.push('/');
                    }
                  }
                };

                if (temAncora) {
                  return (
                    <motion.button
                      key={item.href}
                      onClick={handleClickDesktop}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300 cursor-pointer",
                        "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.button>
                  );
                }

                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "relative flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-300",
                        ativo
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {ativo && (
                        <motion.div
                          layoutId="ativo"
                          className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 rounded-lg -z-10"
                          transition={{ type: "spring", duration: 0.6 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* Ações do cabeçalho */}
            <div className="flex items-center gap-3">
              {/* Botões de autenticação - Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {usuario ? (
                  <>
                    <Link href="/meus-agendamentos">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Meus Agendamentos</span>
                      </motion.button>
                    </Link>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSair}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </motion.button>
                  </>
                ) : (
                  <Link href="/entrar">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Entrar</span>
                    </motion.button>
                  </Link>
                )}
              </div>

              <AlternadorTema />
              
              {/* Botão de menu mobile */}
              <button
                onClick={() => setMenuAberto(!menuAberto)}
                className="md:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Menu"
              >
                <AnimatePresence mode="wait">
                  {menuAberto ? (
                    <motion.div
                      key="fechar"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="abrir"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {menuAberto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                {itensMenu.map((item, index) => {
                  const Icon = item.icon;
                  const ativo = pathname === item.href;
                  const temAncora = item.href.includes('#');

                  const handleClick = () => {
                    setMenuAberto(false);
                    if (temAncora) {
                      const ancora = item.href.split('#')[1];
                      if (pathname === '/') {
                        setTimeout(() => {
                          const elemento = document.getElementById(ancora);
                          if (elemento) {
                            elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      } else {
                        sessionStorage.setItem('scrollTo', ancora);
                        router.push('/');
                      }
                    }
                  };

                  return (
                    <motion.div
                      key={item.href}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {temAncora ? (
                        <button
                          onClick={handleClick}
                          className={cn(
                            "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                            "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setMenuAberto(false)}
                          className={cn(
                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                            ativo
                              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )}
                    </motion.div>
                  );
                })}

                {/* Botões de autenticação - Mobile */}
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  {usuario ? (
                    <>
                      <Link
                        href="/meus-agendamentos"
                        onClick={() => setMenuAberto(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium">Meus Agendamentos</span>
                      </Link>
                      <button
                        onClick={handleSair}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Sair</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/entrar"
                      onClick={() => setMenuAberto(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    >
                      <User className="h-5 w-5" />
                      <span className="font-medium">Entrar</span>
                    </Link>
                  )}
                </div>

                {/* Informações de contato no mobile */}
                <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  {informacoesContato.map((info, index) => {
                    const Icon = info.icon;
                    const conteudo = (
                      <div className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Icon className="h-4 w-4" />
                        <span>{info.texto}</span>
                      </div>
                    );

                    return info.href ? (
                      <a key={index} href={info.href}>
                        {conteudo}
                      </a>
                    ) : (
                      <div key={index}>{conteudo}</div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
