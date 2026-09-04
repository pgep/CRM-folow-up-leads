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
            let icon = <InfoIcon className="w-4 h-4 text-sky-400 shrink-0" />;
            let borderColor = "border-zinc-800";
            let accentColor = "bg-sky-500";

            if (t.type === "success") {
              icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
              borderColor = "border-emerald-500/25";
              accentColor = "bg-emerald-500";
            } else if (t.type === "error") {
              icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
              borderColor = "border-rose-500/30";
              accentColor = "bg-rose-500";
            } else if (t.type === "warning") {
              icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
              borderColor = "border-amber-500/30";
              accentColor = "bg-amber-500";
            }

            return (
              <motion.div
                key={t.id}
                id={`toast-item-${t.id}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border ${borderColor} bg-zinc-900/95 shadow-xl backdrop-blur-md pointer-events-auto overflow-hidden relative group`}
              >
                {/* Accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />
                <div className="pt-0.5 pl-1">{icon}</div>
                <div className="flex-1 text-xs leading-relaxed text-zinc-200 font-medium pr-2 whitespace-pre-line">
                  {t.message}
                </div>
                <button
                  id={`toast-close-${t.id}`}
                  onClick={() => removeToast(t.id)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800 shrink-0"
                  aria-label="Fechar notificação"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmState?.isOpen && (
          <div id="confirm-modal-overlay" className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirmClose(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative max-w-md w-full bg-[#12151C] border border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden text-left z-10 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.options?.isDanger 
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/25" 
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                }`}>
                  {confirmState.options?.isDanger ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <HelpCircle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 id="confirm-modal-title" className="text-sm font-semibold text-zinc-100 mb-1">
                    {confirmState.options?.title}
                  </h3>
                  <p id="confirm-modal-message" className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                    {confirmState.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.08]">
                <button
                  id="confirm-modal-cancel"
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-3.5 py-2 bg-transparent hover:bg-white/[0.06] text-zinc-300 font-medium rounded-xl text-xs border border-white/[0.08] transition cursor-pointer"
                >
                  {confirmState.options?.cancelText}
                </button>
                <button
                  id="confirm-modal-submit"
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`px-4 py-2 font-medium rounded-xl text-xs transition cursor-pointer ${
                    confirmState.options?.isDanger
                      ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                      : "bg-[#6366F1] hover:bg-[#4F46E5] text-white shadow-sm shadow-indigo-950/40 font-semibold"
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
