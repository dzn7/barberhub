"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | ReactNode;
  type?: "success" | "error" | "warning" | "info" | "confirm";
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}: ModalProps) {
  // Bloquear scroll quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.position = 'unset';
      document.body.style.width = 'unset';
    };
  }, [isOpen]);

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-green-500" />,
    error: <XCircle className="w-12 h-12 text-red-500" />,
    warning: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
    info: <Info className="w-12 h-12 text-blue-500" />,
    confirm: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
  };

  const colors = {
    success: "bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    error: "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    warning: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    info: "bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    confirm: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed' }}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none" style={{ position: 'fixed' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div className={`p-4 rounded-full border-2 ${colors[type]}`}>
                    {icons[type]}
                  </div>

                  {/* Message */}
                  <div className="text-zinc-700 dark:text-zinc-300">
                    {typeof message === "string" ? <p>{message}</p> : message}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 bg-zinc-50 dark:bg-zinc-800/50">
                {type === "confirm" && onConfirm ? (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      {cancelText}
                    </button>
                    <button
                      onClick={() => {
                        onConfirm();
                        onClose();
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium text-white dark:text-zinc-900"
                    >
                      {confirmText}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium text-white dark:text-zinc-900"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
