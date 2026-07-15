import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info as InfoIcon, AlertTriangle, X, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    options?: ConfirmOptions;
    resolve?: (value: boolean) => void;
  } | null>(null);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg: string, dur?: number) => addToast("success", msg, dur),
    error: (msg: string, dur?: number) => addToast("error", msg, dur),
    info: (msg: string, dur?: number) => addToast("info", msg, dur),
    warning: (msg: string, dur?: number) => addToast("warning", msg, dur),
  };

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    // Detect if deletion is in the message to default to danger style
    const lowercaseMsg = message.toLowerCase();
    const isDeletion = lowercaseMsg.includes("excluir") || lowercaseMsg.includes("remover") || lowercaseMsg.includes("deletar");
    
    const finalOptions: ConfirmOptions = {
      title: isDeletion ? "Confirmar Exclusão" : "Confirmar Ação",
      confirmText: isDeletion ? "Excluir" : "Confirmar",
      cancelText: "Cancelar",
      isDanger: isDeletion,
      ...options,
    };

    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        options: finalOptions,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmState?.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Notification Layer */}
      <div id="toast-layer" className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            let icon = <InfoIcon className="w-5 h-5 text-sky-400" />;
            let bgColor = "bg-zinc-900/95 border-zinc-800";
            let textColor = "text-zinc-100";
            let accentColor = "bg-sky-500";

            if (t.type === "success") {
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
              bgColor = "bg-zinc-950/95 border-emerald-950/50";
              accentColor = "bg-emerald-500";
            } else if (t.type === "error") {
              icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
              bgColor = "bg-zinc-950/95 border-rose-950/50";
              accentColor = "bg-rose-500";
            } else if (t.type === "warning") {
              icon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
              bgColor = "bg-zinc-950/95 border-amber-950/50";
              accentColor = "bg-amber-500";
            }

            return (
              <motion.div
                key={t.id}
                id={`toast-item-${t.id}`}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${bgColor} shadow-2xl backdrop-blur-md pointer-events-auto overflow-hidden relative group`}
              >
                {/* Accent Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentColor}`} />
                <div className="flex-shrink-0 pt-0.5 pl-1.5">{icon}</div>
                <div className="flex-grow text-xs leading-relaxed text-zinc-200 font-medium pr-4 whitespace-pre-line">
                  {t.message}
                </div>
                <button
                  id={`toast-close-${t.id}`}
                  onClick={() => removeToast(t.id)}
                  className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded-md hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmState?.isOpen && (
          <div id="confirm-modal-overlay" className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirmClose(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 overflow-hidden text-left"
            >
              {/* Top Warning/Alert Icon badge */}
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${
                  confirmState.options?.isDanger ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                }`}>
                  {confirmState.options?.isDanger ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-grow">
                  <h3 id="confirm-modal-title" className="text-sm font-bold text-white mb-2 leading-6">
                    {confirmState.options?.title}
                  </h3>
                  <p id="confirm-modal-message" className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  id="confirm-modal-cancel"
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-lg text-xs border border-zinc-800 transition"
                >
                  {confirmState.options?.cancelText}
                </button>
                <button
                  id="confirm-modal-submit"
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`px-4 py-2 font-medium rounded-lg text-xs transition ${
                    confirmState.options?.isDanger
                      ? "bg-rose-600 hover:bg-rose-500 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                  }`}
                >
                  {confirmState.options?.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
