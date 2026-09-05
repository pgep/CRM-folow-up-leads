import React from "react";
import {
  Search,
  X,
  Calendar,
  Filter,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { FinancialQuickFilter, FinancialViewTab } from "./financialTypes";

interface FinancialToolbarProps {
  viewTab: FinancialViewTab;
  onViewTabChange: (tab: FinancialViewTab) => void;
  quickFilter: FinancialQuickFilter;
  onQuickFilterChange: (filter: FinancialQuickFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onClearFilters: () => void;
  counts: {
    all: number;
    pending: number;
    overdue: number;
    paid: number;
    next7: number;
    contracts: number;
  };
}

export const FinancialToolbar: React.FC<FinancialToolbarProps> = ({
  viewTab,
  onViewTabChange,
  quickFilter,
  onQuickFilterChange,
  searchQuery,
  onSearchQueryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
  counts,
}) => {
  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    quickFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xs"
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      {/* Upper row: View switcher (Tabs) */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-white/[0.06] w-fit">
          <button
            type="button"
            onClick={() => onViewTabChange("installments")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition flex items-center gap-2 cursor-pointer ${
              viewTab === "installments"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Parcelas & Vencimentos</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                viewTab === "installments"
                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onViewTabChange("contracts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition flex items-center gap-2 cursor-pointer ${
              viewTab === "contracts"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Contratos Emitidos</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                viewTab === "contracts"
                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
              }`}
            >
              {counts.contracts}
            </span>
          </button>
        </div>
      </div>

      {/* Main search and date inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="md:col-span-6 relative">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--crm-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Buscar por lead, local ou número de contrato..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm border transition focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-75 cursor-pointer"
              style={{ color: "var(--crm-text-muted)" }}
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter: De */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span
            className="text-xs font-medium shrink-0"
            style={{ color: "var(--crm-text-muted)" }}
          >
            De:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs border transition focus:outline-none"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          />
        </div>

        {/* Date Filter: Até */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span
            className="text-xs font-medium shrink-0"
            style={{ color: "var(--crm-text-muted)" }}
          >
            Até:
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl text-xs border transition focus:outline-none"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          />
        </div>
      </div>

      {/* Quick filter buttons for Installments */}
      {viewTab === "installments" && (
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] font-medium mr-1"
              style={{ color: "var(--crm-text-muted)" }}
            >
              Status:
            </span>

            {/* Todas */}
            <button
              type="button"
              onClick={() => onQuickFilterChange("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                quickFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent font-semibold shadow-xs"
                  : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              Todas ({counts.all})
            </button>

            {/* Pendentes */}
            <button
              type="button"
              onClick={() => onQuickFilterChange("pending")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                quickFilter === "pending"
                  ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40 font-semibold"
                  : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              Pendentes ({counts.pending})
            </button>

            {/* Vencidas */}
            <button
              type="button"
              onClick={() => onQuickFilterChange("overdue")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border flex items-center gap-1 ${
                quickFilter === "overdue"
                  ? "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 font-semibold"
                  : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              {counts.overdue > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
              <span>Vencidas ({counts.overdue})</span>
            </button>

            {/* Pagas */}
            <button
              type="button"
              onClick={() => onQuickFilterChange("paid")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                quickFilter === "paid"
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 font-semibold"
                  : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              Pagas ({counts.paid})
            </button>

            {/* Vencem em 7 dias */}
            <button
              type="button"
              onClick={() => onQuickFilterChange("next7")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                quickFilter === "next7"
                  ? "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-500/40 font-semibold"
                  : "border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              }`}
            >
              Próximos 7 dias ({counts.next7})
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
