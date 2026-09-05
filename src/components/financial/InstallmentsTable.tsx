import React from "react";
import {
  Calendar,
  Check,
  Clock,
  Printer,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
} from "lucide-react";
import { FinancialInstallment, FinancialContract } from "./financialTypes";
import { formatBRL, formatDueDateHuman } from "./financialUtils";
import { Lead } from "../../types";

interface InstallmentsTableProps {
  installments: FinancialInstallment[];
  contracts: FinancialContract[];
  leadMap: Map<string, Lead>;
  onOpenPayModal: (installment: FinancialInstallment) => void;
  onOpenReceipt: (
    installment: FinancialInstallment,
    contract: FinancialContract,
    lead: Lead
  ) => void;
  onSelectLead?: (leadId: string) => void;
}

export const InstallmentsTable: React.FC<InstallmentsTableProps> = ({
  installments,
  contracts,
  leadMap,
  onOpenPayModal,
  onOpenReceipt,
  onSelectLead,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  if (installments.length === 0) {
    return (
      <div
        className="rounded-2xl border p-12 text-center shadow-xs transition-all"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-zinc-500">
          <Clock className="w-6 h-6" />
        </div>
        <h3
          className="text-sm font-bold tracking-tight mb-1"
          style={{ color: "var(--crm-text)" }}
        >
          Nenhuma parcela localizada
        </h3>
        <p
          className="text-xs max-w-sm mx-auto"
          style={{ color: "var(--crm-text-secondary)" }}
        >
          Ajuste os filtros de busca ou intervalo de datas para visualizar os
          lançamentos financeiros.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden shadow-xs transition-all"
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead
            className="border-b text-[11px] uppercase tracking-wider font-semibold"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text-muted)",
            }}
          >
            <tr>
              <th className="p-3.5 sm:p-4">Cliente / Lead</th>
              <th className="p-3.5 sm:p-4">Contrato</th>
              <th className="p-3.5 sm:p-4">Parcela</th>
              <th className="p-3.5 sm:p-4">Vencimento</th>
              <th className="p-3.5 sm:p-4 text-right">Valor</th>
              <th className="p-3.5 sm:p-4">Status</th>
              <th className="p-3.5 sm:p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: "var(--crm-border)" }}
          >
            {installments.map((inst) => {
              const contract = contracts.find((c) => c.id === inst.contract_id);
              const lead = contract ? leadMap.get(contract.lead_id) : null;
              const isPaid = inst.status === "paid";
              const isOverdue = !isPaid && inst.due_date < todayStr;
              const dueInfo = formatDueDateHuman(inst.due_date, todayStr);

              // Row subtle highlight based on urgency
              const rowHighlightClass = isPaid
                ? "hover:bg-slate-50/50 dark:hover:bg-zinc-800/30"
                : isOverdue
                ? "bg-rose-500/[0.03] dark:bg-rose-500/[0.04] hover:bg-rose-500/[0.06]"
                : dueInfo.urgency === "today"
                ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.04] hover:bg-amber-500/[0.06]"
                : "hover:bg-slate-50 dark:hover:bg-zinc-800/40";

              return (
                <tr
                  key={inst.id}
                  className={`transition-colors ${rowHighlightClass}`}
                >
                  {/* Lead Info */}
                  <td className="p-3.5 sm:p-4 max-w-[220px]">
                    {lead ? (
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-bold text-xs sm:text-[13px] tracking-tight truncate block"
                            style={{ color: "var(--crm-text)" }}
                          >
                            {lead.nome}
                          </span>
                          {onSelectLead && (
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer p-0.5"
                              title="Abrir ficha do lead"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {lead.local && (
                          <span
                            className="text-[11px] truncate block mt-0.5"
                            style={{ color: "var(--crm-text-secondary)" }}
                          >
                            {lead.local}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className="text-xs italic"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        Lead desvinculado
                      </span>
                    )}
                  </td>

                  {/* Contract Code */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    {contract ? (
                      <span
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                      >
                        {contract.contract_number}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        —
                      </span>
                    )}
                  </td>

                  {/* Installment sequence */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    <span
                      className="font-medium text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-secondary)",
                      }}
                    >
                      {inst.installment_number === 0
                        ? "Entrada"
                        : `${inst.installment_number}ª Parcela`}
                    </span>
                  </td>

                  {/* Due Date with human label */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-xs font-medium"
                          style={{ color: "var(--crm-text)" }}
                        >
                          {dueInfo.formattedDate}
                        </span>
                      </div>

                      {/* Humanized relative badge */}
                      {!isPaid && (
                        <div>
                          {dueInfo.urgency === "overdue" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                              {dueInfo.badgeLabel}
                            </span>
                          )}
                          {dueInfo.urgency === "today" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/20">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              Vence hoje
                            </span>
                          )}
                          {dueInfo.urgency === "tomorrow" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                              Vence amanhã
                            </span>
                          )}
                          {dueInfo.urgency === "soon" && (
                            <span
                              className="text-[10px] font-medium block"
                              style={{ color: "var(--crm-text-secondary)" }}
                            >
                              {dueInfo.badgeLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Monetary Value */}
                  <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                    <span
                      className="font-mono text-xs sm:text-[13px] font-bold"
                      style={{ color: "var(--crm-text)" }}
                    >
                      {formatBRL(inst.value)}
                    </span>
                    {isPaid && inst.paid_value && inst.paid_value !== inst.value && (
                      <span
                        className="block text-[10px] font-mono"
                        style={{ color: "var(--crm-text-secondary)" }}
                      >
                        Pago: {formatBRL(inst.paid_value)}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    {isPaid ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                          <Check className="w-2.5 h-2.5" />
                          Pago
                        </span>
                        {inst.paid_date && (
                          <span
                            className="block text-[10px] font-mono mt-0.5"
                            style={{ color: "var(--crm-text-muted)" }}
                          >
                            em{" "}
                            {new Date(
                              inst.paid_date + "T12:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/25 text-rose-700 dark:text-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Vencido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-800 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Pendente
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 sm:p-4 text-center whitespace-nowrap">
                    {!isPaid ? (
                      <button
                        type="button"
                        onClick={() => onOpenPayModal(inst)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3" />
                        <span>Dar Baixa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (contract && lead) {
                            onOpenReceipt(inst, contract, lead);
                          }
                        }}
                        disabled={!contract || !lead}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer inline-flex items-center gap-1.5 hover:opacity-90 shadow-xs"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                        title="Visualizar e imprimir recibo digital"
                      >
                        <Printer className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Recibo</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
