"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Scissors } from "lucide-react";
import Link from "next/link";

interface Servico {
  nome: string;
  preco: string;
  duracao: string;
  categoria: string;
}

interface ModalServicosProps {
  servicos: Servico[];
  carregando?: boolean;
}

/**
 * Modal de serviços com design moderno e responsivo
 * Layout em grid compacto e elegante
 */
export function ModalServicos({ servicos, carregando = false }: ModalServicosProps) {
  const [aberto, setAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<"popular" | "outros">("popular");

  const servicosPopulares = servicos.filter(s => s.categoria === "popular");
  const outrosServicos = servicos.filter(s => s.categoria === "outros");

  const servicosExibidos = categoriaSelecionada === "popular" ? servicosPopulares : outrosServicos;

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    if (aberto) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, [aberto]);

  return (
    <>
      {/* Botão para abrir modal */}
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center justify-center px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
      >
        Ver Todos os Serviços
      </button>

      {/* Modal */}
      <AnimatePresence>
        {aberto && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            />

            {/* Conteúdo do Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
              >
                {/* Cabeçalho */}
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Scissors className="w-6 h-6" />
                        Nossos Serviços
                      </h2>
                      <p className="text-zinc-300 text-sm mt-1">
                        Escolha o serviço ideal para você
                      </p>
                    </div>
                    <button
                      onClick={() => setAberto(false)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => setCategoriaSelecionada("popular")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        categoriaSelecionada === "popular"
                          ? "bg-white text-zinc-900"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      Populares ({servicosPopulares.length})
                    </button>
                    <button
                      onClick={() => setCategoriaSelecionada("outros")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        categoriaSelecionada === "outros"
                          ? "bg-white text-zinc-900"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      Todos ({outrosServicos.length})
                    </button>
                  </div>
                </div>

                {/* Conteúdo com scroll */}
                <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
                  {carregando ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl animate-pulse">
                          <div className="w-3/4 h-6 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between">
                              <div className="w-12 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                              <div className="w-16 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                            </div>
                            <div className="flex justify-between">
                              <div className="w-16 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                              <div className="w-12 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                            </div>
                          </div>
                          <div className="w-full h-9 bg-zinc-200 dark:bg-zinc-700 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : servicosExibidos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {servicosExibidos.map((servico, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="group bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl hover:shadow-lg transition-all hover:scale-105 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        >
                          <h4 className="font-semibold text-zinc-900 dark:text-white mb-3 line-clamp-2 min-h-[3rem]">
                            {servico.nome}
                          </h4>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-zinc-600 dark:text-zinc-400">Preço:</span>
                              <span className="font-bold text-zinc-900 dark:text-white">
                                {servico.preco}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Duração:
                              </span>
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {servico.duracao}
                              </span>
                            </div>
                          </div>

                          <Link
                            href="/agendamento"
                            onClick={() => setAberto(false)}
                            className="block text-center px-3 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                          >
                            Agendar
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Nenhum serviço disponível nesta categoria.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
