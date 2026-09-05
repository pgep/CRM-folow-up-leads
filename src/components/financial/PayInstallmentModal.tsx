import React, { useState } from "react";
import { X, DollarSign, Check, Loader2, AlertCircle } from "lucide-react";
import { FinancialInstallment, FinancialContract } from "./financialTypes";
import { formatBRL } from "./financialUtils";
import { Lead } from "../../types";

interface PayInstallmentModalProps {
  installment: FinancialInstallment;
  contract?: FinancialContract;
  lead?: Lead;
  onClose: () => void;
  onSubmit: (data: {
    paid_date: string;
    paid_value: number;
    payment_method: string;
    payment_observations?: string;
  }) => Promise<void>;
}

export const PayInstallmentModal: React.FC<PayInstallmentModalProps> = ({
  installment,
  contract,
  lead,
  onClose,
  onSubmit,
}) => {
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentValue, setPaymentValue] = useState<string>(
    String(installment.value)
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("Pix");
  const [paymentObservations, setPaymentObservations] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(paymentValue);
    if (isNaN(val) || val <= 0) {
      setErrorMessage("Informe um valor válido maior que zero.");
      return;
    }

    if (!paymentDate) {
      setErrorMessage("Informe a data de recebimento.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        paid_date: paymentDate,
        paid_value: val,
        payment_method: paymentMethod,
        payment_observations: paymentObservations.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Ocorreu um erro ao processar o pagamento."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div
        className="rounded-2xl border max-w-md w-full shadow-2xl relative transition-all"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 sm:p-5 border-b"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-sm font-bold tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                Confirmar Recebimento / Baixa
              </h3>
              <p
                className="text-[11px]"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Registre a quitação da parcela e gere o recibo digital
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:opacity-75 transition cursor-pointer"
            style={{ color: "var(--crm-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Installment Summary Details */}
        <div className="p-4 sm:p-5 space-y-4">
          <div
            className="p-3.5 rounded-xl border text-xs space-y-2 font-mono"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--crm-text-secondary)" }}>Lead / Cliente:</span>
              <span className="font-bold font-sans" style={{ color: "var(--crm-text)" }}>
                {lead ? lead.nome : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--crm-text-secondary)" }}>Contrato:</span>
              <span className="font-bold" style={{ color: "var(--crm-text)" }}>
                {contract?.contract_number || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--crm-text-secondary)" }}>Parcela:</span>
              <span style={{ color: "var(--crm-text)" }}>
                {installment.installment_number === 0
                  ? "Entrada"
                  : `${installment.installment_number}ª Parcela`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--crm-text-secondary)" }}>Valor Original:</span>
              <span className="font-bold" style={{ color: "var(--crm-text)" }}>
                {formatBRL(installment.value)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--crm-text-secondary)" }}>Vencimento:</span>
              <span style={{ color: "var(--crm-text)" }}>
                {new Date(
                  installment.due_date + "T12:00:00"
                ).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Payment Date */}
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Data do Recebimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            {/* Paid Value */}
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Valor Pago (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentValue}
                onChange={(e) => setPaymentValue(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono font-bold transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
              <span
                className="text-[10px] block"
                style={{ color: "var(--crm-text-muted)" }}
              >
                Caso o pagamento seja parcial, informe o valor real recebido.
              </span>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Meio de Pagamento <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border transition focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>

            {/* Payment Observations */}
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Observações do Pagamento
              </label>
              <input
                type="text"
                placeholder="Ex: Comprovante enviado via WhatsApp"
                value={paymentObservations}
                onChange={(e) => setPaymentObservations(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border transition focus:outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div
              className="flex items-center justify-end gap-2.5 pt-3 border-t mt-4"
              style={{ borderColor: "var(--crm-border)" }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium border transition cursor-pointer hover:opacity-85"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Pagamento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
