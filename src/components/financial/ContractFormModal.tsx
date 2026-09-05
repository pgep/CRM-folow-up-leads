import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FileText,
  User,
  Search,
  Plus,
  Loader2,
  Check,
  AlertCircle,
  Calendar,
  Calculator,
} from "lucide-react";
import { FinancialContract } from "./financialTypes";
import { formatBRL } from "./financialUtils";
import { Lead } from "../../types";

interface ContractFormModalProps {
  contractToEdit: FinancialContract | null;
  leads: Lead[];
  onClose: () => void;
  onSubmit: (payload: {
    lead_id: string;
    contract_number?: string;
    contract_date: string;
    total_value: number;
    freight_value: number;
    discount_value: number;
    payment_method: "a_vista" | "parcelado";
    installments_count: number;
    down_payment: number;
    observations?: string;
  }) => Promise<void>;
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  contractToEdit,
  leads,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(contractToEdit);

  // Form State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch] = useState<string>("");
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState<boolean>(false);

  const [contractNumber, setContractNumber] = useState<string>("");
  const [contractDate, setContractDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [totalValue, setTotalValue] = useState<string>("");
  const [freightValue, setFreightValue] = useState<string>("");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"a_vista" | "parcelado">(
    "parcelado"
  );
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [downPayment, setDownPayment] = useState<string>("");
  const [observations, setObservations] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Populate data when editing
  useEffect(() => {
    if (contractToEdit) {
      const existingLead = leads.find((l) => l.id === contractToEdit.lead_id) || null;
      setSelectedLead(existingLead);
      setContractNumber(contractToEdit.contract_number || "");
      setContractDate(
        contractToEdit.contract_date
          ? contractToEdit.contract_date.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setTotalValue(String(contractToEdit.total_value || ""));
      setFreightValue(
        contractToEdit.freight_value ? String(contractToEdit.freight_value) : ""
      );
      setDiscountValue(
        contractToEdit.discount_value ? String(contractToEdit.discount_value) : ""
      );
      setPaymentMethod(contractToEdit.payment_method || "parcelado");
      setInstallmentsCount(contractToEdit.installments_count || 2);
      setDownPayment(
        contractToEdit.down_payment ? String(contractToEdit.down_payment) : ""
      );
      setObservations(contractToEdit.observations || "");
    }
  }, [contractToEdit, leads]);

  // Lead search filtering
  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads.slice(0, 10);
    const q = leadSearch.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.nome?.toLowerCase().includes(q) ||
          l.local?.toLowerCase().includes(q) ||
          l.origem_portal?.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [leads, leadSearch]);

  // Real-time calculated amounts
  const parsedTotal = Math.max(0, Number(totalValue) || 0);
  const parsedFreight = Math.max(0, Number(freightValue) || 0);
  const parsedDiscount = Math.max(0, Number(discountValue) || 0);
  const parsedDownPayment = Math.max(0, Number(downPayment) || 0);

  const finalContractTotal = Math.max(
    0,
    parsedTotal + parsedFreight - parsedDiscount
  );
  const financedBalance = Math.max(0, finalContractTotal - parsedDownPayment);
  const installmentValue =
    installmentsCount > 0 ? financedBalance / installmentsCount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLead) {
      setErrorMessage("Selecione um lead do CRM para vincular ao contrato.");
      return;
    }

    if (!contractDate) {
      setErrorMessage("Informe a data de assinatura do contrato.");
      return;
    }

    if (parsedTotal <= 0) {
      setErrorMessage("Informe o valor dos produtos/serviços maior que zero.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await onSubmit({
        lead_id: selectedLead.id,
        contract_number: contractNumber.trim() || undefined,
        contract_date: contractDate,
        total_value: parsedTotal,
        freight_value: parsedFreight,
        discount_value: parsedDiscount,
        payment_method: paymentMethod,
        installments_count: paymentMethod === "a_vista" ? 1 : installmentsCount,
        down_payment: parsedDownPayment,
        observations: observations.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Ocorreu um erro ao salvar os dados do contrato."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div
        className="rounded-2xl border max-w-2xl w-full shadow-2xl relative transition-all my-8 overflow-hidden"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-4 sm:p-5 border-b"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-sm font-bold tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                {isEditing ? "Editar Contrato" : "Novo Vínculo de Contrato"}
              </h3>
              <p
                className="text-xs"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Gere o fluxo de parcelas e controle financeiro para um lead do CRM
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

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Lead Selection Section */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-semibold block"
              style={{ color: "var(--crm-text)" }}
            >
              Cliente / Lead do CRM <span className="text-rose-500">*</span>
            </label>

            {selectedLead ? (
              <div
                className="flex items-center justify-between p-3 rounded-xl border text-xs"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span
                      className="font-bold text-xs sm:text-sm block"
                      style={{ color: "var(--crm-text)" }}
                    >
                      {selectedLead.nome}
                    </span>
                    {selectedLead.local && (
                      <span
                        className="text-[11px] block mt-0.5"
                        style={{ color: "var(--crm-text-secondary)" }}
                      >
                        {selectedLead.local} • {selectedLead.origem_portal || "Canal direto"}
                      </span>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadSearch("");
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                    title="Remover seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--crm-text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Digite o nome do lead, local ou canal para buscar..."
                  value={leadSearch}
                  onChange={(e) => {
                    setLeadSearch(e.target.value);
                    setIsLeadDropdownOpen(true);
                  }}
                  onFocus={() => setIsLeadDropdownOpen(true)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                />

                {isLeadDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto rounded-xl border shadow-xl z-50 divide-y"
                    style={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)",
                    }}
                  >
                    {filteredLeads.length === 0 ? (
                      <div
                        className="p-3 text-center text-xs"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        Nenhum lead encontrado com esse termo.
                      </div>
                    ) : (
                      filteredLeads.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setSelectedLead(l);
                            setIsLeadDropdownOpen(false);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <span
                              className="font-semibold block"
                              style={{ color: "var(--crm-text)" }}
                            >
                              {l.nome}
                            </span>
                            <span
                              className="text-[11px] block mt-0.5"
                              style={{ color: "var(--crm-text-secondary)" }}
                            >
                              {l.local || "Sem local"} • {l.origem_portal || "Canal direto"}
                            </span>
                          </div>
                          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Contract Identification & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Número do Contrato
              </label>
              <input
                type="text"
                placeholder="Ex: CTR-5023 (opcional p/ automático)"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Data de Assinatura <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
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
          </div>

          {/* 3. Values & Composition */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                Valor Produtos (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ex: 5000.00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                disabled={isSubmitting}
                required
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono font-semibold transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                (+) Frete (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 150.00"
                value={freightValue}
                onChange={(e) => setFreightValue(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label
                className="text-xs font-semibold block"
                style={{ color: "var(--crm-text)" }}
              >
                (-) Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 200.00"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>
          </div>

          {/* 4. Real-time Total Simulation Card */}
          {Boolean(totalValue || freightValue || discountValue) && (
            <div
              className="p-4 rounded-xl border space-y-2.5 transition-all"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
              }}
            >
              <div
                className="flex items-center justify-between pb-2 border-b"
                style={{ borderColor: "var(--crm-border)" }}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Resumo Financeiro do Contrato
                </span>
                <span
                  className="text-base sm:text-lg font-mono font-bold"
                  style={{ color: "var(--crm-text)" }}
                >
                  {formatBRL(finalContractTotal)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span
                    className="block text-[10px] uppercase"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    Base
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--crm-text)" }}
                  >
                    {formatBRL(parsedTotal)}
                  </span>
                </div>
                <div>
                  <span
                    className="block text-[10px] uppercase"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    (+) Frete
                  </span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    +{formatBRL(parsedFreight)}
                  </span>
                </div>
                <div>
                  <span
                    className="block text-[10px] uppercase"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    (-) Desconto
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    -{formatBRL(parsedDiscount)}
                  </span>
                </div>
              </div>

              {paymentMethod === "parcelado" && (
                <div
                  className="pt-2 border-t text-[11px] flex flex-wrap justify-between items-center gap-2 font-mono"
                  style={{ borderColor: "var(--crm-border)" }}
                >
                  <span>
                    Entrada:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatBRL(parsedDownPayment)}
                    </strong>
                  </span>
                  <span>
                    Saldo:{" "}
                    <strong style={{ color: "var(--crm-text)" }}>
                      {formatBRL(financedBalance)}
                    </strong>{" "}
                    em{" "}
                    <strong style={{ color: "var(--crm-text)" }}>
                      {installmentsCount}x
                    </strong>{" "}
                    de{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {formatBRL(installmentValue)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 5. Payment Conditions */}
          <div className="space-y-1">
            <label
              className="text-xs font-semibold block"
              style={{ color: "var(--crm-text)" }}
            >
              Condição de Pagamento <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "a_vista" | "parcelado")
              }
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border transition focus:outline-none cursor-pointer"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
            >
              <option value="parcelado">Parcelado</option>
              <option value="a_vista">À Vista</option>
            </select>
          </div>

          {/* Installment count & Down Payment (if Parcelado) */}
          {paymentMethod === "parcelado" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold block"
                  style={{ color: "var(--crm-text)" }}
                >
                  Número de Parcelas (2 a 24) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={installmentsCount}
                  onChange={(e) =>
                    setInstallmentsCount(parseInt(e.target.value, 10) || 2)
                  }
                  disabled={isSubmitting}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs font-semibold block"
                  style={{ color: "var(--crm-text)" }}
                >
                  Valor de Entrada (Opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 500.00"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border font-mono transition focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
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
                  Gerada como parcela quitada hoje
                </span>
              </div>
            </div>
          )}

          {/* 6. Observations */}
          <div className="space-y-1">
            <label
              className="text-xs font-semibold block"
              style={{ color: "var(--crm-text)" }}
            >
              Observações do Contrato
            </label>
            <textarea
              rows={3}
              placeholder="Detalhes sobre prazos especiais, itens acordados, observações gerais..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              disabled={isSubmitting}
              className="w-full p-3 rounded-xl text-xs sm:text-sm border transition focus:outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
            />
          </div>

          {/* Modal Footer Actions */}
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Atualizar Contrato" : "Salvar Contrato"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
