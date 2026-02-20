"use client";

import { useEffect, useCallback, ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface PortalModalProps {
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  titulo?: string;
  tamanho?: "sm" | "md" | "lg" | "xl" | "full";
  mostrarFechar?: boolean;
  fecharAoClicarFora?: boolean;
  className?: string;
}

/**
 * Modal com Portal - Renderiza fora da árvore DOM principal
 * Inclui backdrop com blur, bloqueio de scroll e animações suaves
 */
export function PortalModal({
  aberto,
  onFechar,
  children,
  titulo,
  tamanho = "md",
  mostrarFechar = true,
  fecharAoClicarFora = true,
  className = "",
}: PortalModalProps) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (aberto) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [aberto]);

  // Fechar com ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && aberto) {
        onFechar();
      }
    },
    [aberto, onFechar]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Tamanhos do modal
  const tamanhos = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-4xl",
  };

  if (!montado || typeof window === "undefined" || !document?.body) return null;

  return createPortal(
    aberto ? (
      <>
        {/* Backdrop com blur */}
        <motion.div
          key="portal-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
          onClick={fecharAoClicarFora ? onFechar : undefined}
          aria-hidden="true"
        />

        {/* Container do Modal */}
        <div
          key="portal-modal-container"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titulo ? "modal-titulo" : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`
              w-full ${tamanhos[tamanho]} 
              bg-white dark:bg-zinc-900 
              rounded-2xl shadow-2xl 
              border border-zinc-200 dark:border-zinc-800 
              overflow-hidden pointer-events-auto
              max-h-[90vh] flex flex-col
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header com título e botão fechar */}
            {(titulo || mostrarFechar) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                {titulo && (
                  <h2
                    id="modal-titulo"
                    className="text-lg font-semibold text-zinc-900 dark:text-white"
                  >
                    {titulo}
                  </h2>
                )}
                {!titulo && <div />}
                {mostrarFechar && (
                  <button
                    onClick={onFechar}
                    className="p-2 -mr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                    aria-label="Fechar modal"
                  >
                    <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </button>
                )}
              </div>
            )}

            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      </>
    ) : null,
    document.body
  );
}
