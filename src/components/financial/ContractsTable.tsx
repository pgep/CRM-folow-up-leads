import React from "react";
import {
  FileText,
  Edit3,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { FinancialContract, FinancialInstallment } from "./financialTypes";
import { formatBRL, formatDueDateHuman } from "./financialUtils";
import { Lead } from "../../types";

interface ContractsTableProps {
  contracts: FinancialContract[];
  installments: FinancialInstallment[];
  leadMap: Map<string, Lead>;
  onEditContract: (contract: FinancialContract) => void;
  onDeleteContract: (contract: FinancialContract) => void;
  onViewContractInstallments: (contract: FinancialContract) => void;
  onSelectLead?: (leadId: string) => void;
}

export const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  installments,
  leadMap,
  onEditContract,
  onDeleteContract,
  onViewContractInstallments,
  onSelectLead,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];

  if (contracts.length === 0) {
    return (
      <div
        className="rounded-2xl border p-12 text-center shadow-xs transition-all"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-zinc-500">
          <FileText className="w-6 h-6" />
        </div>
        <h3
          className="text-sm font-bold tracking-tight mb-1"
          style={{ color: "var(--crm-text)" }}
        >
          Nenhum contrato cadastrado
        </h3>
        <p
          className="text-xs max-w-sm mx-auto"
          style={{ color: "var(--crm-text-secondary)" }}
        >
          Vincule um novo contrato a um lead do CRM utilizando o botão "+ Novo Contrato".
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
              <th className="p-3.5 sm:p-4 text-right">Valor Total</th>
              <th className="p-3.5 sm:p-4 text-right">Recebido / Saldo</th>
              <th className="p-3.5 sm:p-4">Parcelas</th>
              <th className="p-3.5 sm:p-4">Próximo Vencimento</th>
              <th className="p-3.5 sm:p-4">Status</th>
              <th className="p-3.5 sm:p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: "var(--crm-border)" }}
          >
            {contracts.map((c) => {
              const lead = leadMap.get(c.lead_id);
              const contractInstallments = installments.filter(
                (i) => i.contract_id === c.id
              );

              // Contract financial amounts
              const finalVal =
                c.final_value ??
                c.total_value + (c.freight_value || 0) - (c.discount_value || 0);
              const paidAmount = contractInstallments
                .filter((i) => i.status === "paid")
                .reduce((sum, i) => sum + (i.paid_value || i.value), 0);
              const pendingAmount = Math.max(0, finalVal - paidAmount);

              // Installment count progress
              const totalCount = contractInstallments.length;
              const paidCount = contractInstallments.filter(
                (i) => i.status === "paid"
              ).length;
              const isFullyPaid =
                c.status === "completed" ||
                (totalCount > 0 && paidCount === totalCount);

              // Next due pending installment
              const nextPending = contractInstallments
                .filter((i) => i.status === "pending")
                .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

              // Check if editable: blocked if any non-entry installment is paid
              const hasNonEntryPaid = contractInstallments.some(
                (i) => i.status === "paid" && i.installment_number > 0
              );
              // Check if deletable: blocked if ANY installment is paid
              const hasAnyPaid = contractInstallments.some(
                (i) => i.status === "paid"
              );

              return (
                <tr
                  key={c.id}
                  className={`transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40 ${
                    isFullyPaid ? "opacity-85" : ""
                  }`}
                >
                  {/* Lead Name dominant */}
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

                  {/* Contract Code and Date */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    <span
                      className="font-mono text-xs font-semibold px-2 py-0.5 rounded border block w-fit"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    >
                      {c.contract_number}
                    </span>
                    <span
                      className="text-[10px] font-mono block mt-1"
                      style={{ color: "var(--crm-text-muted)" }}
                    >
                      Assinado:{" "}
                      {new Date(
                        c.contract_date + "T12:00:00"
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  </td>

                  {/* Total Value */}
                  <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                    <span
                      className="font-mono text-xs sm:text-[13px] font-bold block"
                      style={{ color: "var(--crm-text)" }}
                    >
                      {formatBRL(finalVal)}
                    </span>
                    {(c.freight_value || 0) > 0 || (c.discount_value || 0) > 0 ? (
                      <span
                        className="text-[10px] font-mono block mt-0.5"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        Base: {formatBRL(c.total_value)}
                      </span>
                    ) : null}
                  </td>

                  {/* Recebido / Saldo */}
                  <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                      {formatBRL(paidAmount)}
                    </span>
                    <span
                      className="font-mono text-[11px] block mt-0.5"
                      style={{ color: pendingAmount > 0 ? "var(--crm-text-secondary)" : "var(--crm-text-muted)" }}
                    >
                      Saldo: {formatBRL(pendingAmount)}
                    </span>
                  </td>

                  {/* Installments count progress */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span
                        className="text-xs font-medium block"
                        style={{ color: "var(--crm-text)" }}
                      >
                        {paidCount} de {totalCount || c.installments_count} pagas
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFullyPaid ? "bg-emerald-500" : "bg-indigo-600"
                          }`}
                          style={{
                            width: `${
                              totalCount > 0
                                ? Math.min(100, (paidCount / totalCount) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Next Due Date */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Quitado
                      </span>
                    ) : nextPending ? (
                      <div>
                        {(() => {
                          const due = formatDueDateHuman(
                            nextPending.due_date,
                            todayStr
                          );
                          return (
                            <div>
                              <span
                                className="font-mono text-xs font-medium block"
                                style={{ color: "var(--crm-text)" }}
                              >
                                {due.formattedDate}
                              </span>
                              {due.urgency === "overdue" && (
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                  {due.badgeLabel}
                                </span>
                              )}
                              {due.urgency === "today" && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  Vence hoje
                                </span>
                              )}
                              {due.urgency === "soon" && (
                                <span
                                  className="text-[10px]"
                                  style={{ color: "var(--crm-text-muted)" }}
                                >
                                  {due.badgeLabel}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span
                        className="text-xs"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        Sem pendências
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-3.5 sm:p-4 whitespace-nowrap">
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Concluído
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300">
                        Ativo
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 sm:p-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onViewContractInstallments(c)}
                        className="p-1.5 rounded-lg border transition cursor-pointer hover:opacity-85 shadow-xs"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                        title="Ver parcelas deste contrato"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditContract(c)}
                        disabled={hasNonEntryPaid}
                        className={`p-1.5 rounded-lg border transition cursor-pointer shadow-xs ${
                          hasNonEntryPaid
                            ? "opacity-40 cursor-not-allowed border-transparent"
                            : "hover:opacity-85"
                        }`}
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                        title={
                          hasNonEntryPaid
                            ? "Não é possível editar contrato com parcelas pagas"
                            : "Editar dados do contrato"
                        }
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteContract(c)}
                        disabled={hasAnyPaid}
                        className={`p-1.5 rounded-lg border transition cursor-pointer shadow-xs ${
                          hasAnyPaid
                            ? "opacity-40 cursor-not-allowed border-transparent"
                            : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                        }`}
                        style={{
                          backgroundColor: hasAnyPaid
                            ? "var(--crm-surface-subtle)"
                            : undefined,
                          borderColor: "var(--crm-border)",
                        }}
                        title={
                          hasAnyPaid
                            ? "Não é possível excluir contrato com parcelas quitadas"
                            : "Excluir contrato e parcelas"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
