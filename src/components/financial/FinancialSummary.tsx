import React from "react";
import { AlertTriangle, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import { formatBRL } from "./financialUtils";

interface FinancialSummaryProps {
  totalContratado: number;
  totalRecebido: number;
  totalEmAtraso: number;
  totalAReceber: number;
  activeContractsCount: number;
  overdueCount: number;
  percentInadimplencia: number;
  onFilterOverdue?: () => void;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  totalContratado,
  totalRecebido,
  totalEmAtraso,
  totalAReceber,
  activeContractsCount,
  overdueCount,
  percentInadimplencia,
  onFilterOverdue,
}) => {
  const hasOverdue = totalEmAtraso > 0;

  return (
    <div
      className="rounded-2xl border transition-all shadow-xs"
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200/80 dark:divide-white/[0.06]">
        {/* Item 1: A Receber */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--crm-text-muted)" }}
            >
              A Receber
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-500/80" />
          </div>
          <div>
            <div
              className="text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight"
              style={{ color: "var(--crm-text)" }}
            >
              {formatBRL(totalAReceber)}
            </div>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Saldo em contratos ativos
            </p>
          </div>
        </div>

        {/* Item 2: Recebido */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--crm-text-muted)" }}
            >
              Recebido
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 opacity-80" />
          </div>
          <div>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatBRL(totalRecebido)}
            </div>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Total já quitado
            </p>
          </div>
        </div>

        {/* Item 3: Vencido */}
        <div
          className={`p-4 sm:p-5 flex flex-col justify-between space-y-1.5 transition-colors ${
            hasOverdue
              ? "bg-rose-500/[0.04] dark:bg-rose-500/[0.06]"
              : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider ${
                hasOverdue ? "text-rose-600 dark:text-rose-400 font-bold" : ""
              }`}
              style={{ color: hasOverdue ? undefined : "var(--crm-text-muted)" }}
            >
              Vencido
            </span>
            {hasOverdue ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-2.5 h-2.5" />
                {overdueCount} {overdueCount === 1 ? "parcela" : "parcelas"}
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            )}
          </div>
          <div>
            <div
              className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight ${
                hasOverdue
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-400 dark:text-zinc-500 font-normal"
              }`}
            >
              {formatBRL(totalEmAtraso)}
            </div>
            <p
              className="text-[11px] mt-0.5 flex items-center justify-between"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              <span>{hasOverdue ? "Exige cobrança" : "Em dia · sem atrasos"}</span>
              {hasOverdue && onFilterOverdue && (
                <button
                  type="button"
                  onClick={onFilterOverdue}
                  className="text-[10px] font-semibold underline text-rose-600 dark:text-rose-400 hover:opacity-80 cursor-pointer ml-1"
                >
                  Ver vencidas
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Item 4: Contratos Ativos */}
        <div className="p-4 sm:p-5 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--crm-text-muted)" }}
            >
              Contratos Ativos
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 opacity-80" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                {activeContractsCount}
              </span>
              {percentInadimplencia > 0 && (
                <span className="text-[10px] font-semibold font-mono text-rose-600 dark:text-rose-400">
                  ({percentInadimplencia}% inadimplência)
                </span>
              )}
            </div>
            <p
              className="text-[11px] mt-0.5 truncate"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Total: {formatBRL(totalContratado)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
