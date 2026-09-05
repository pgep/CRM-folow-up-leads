import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  RefreshCw,
  FileText,
  Clock,
  Loader2,
  DollarSign,
} from "lucide-react";
import { Lead } from "../types";
import { useToast } from "./Toast";
import {
  FinancialContract,
  FinancialInstallment,
  FinancialQuickFilter,
  FinancialViewTab,
} from "./financial/financialTypes";
import { FinancialSummary } from "./financial/FinancialSummary";
import { FinancialToolbar } from "./financial/FinancialToolbar";
import { InstallmentsTable } from "./financial/InstallmentsTable";
import { ContractsTable } from "./financial/ContractsTable";
import { PayInstallmentModal } from "./financial/PayInstallmentModal";
import { ContractFormModal } from "./financial/ContractFormModal";
import { ReceiptModal } from "./financial/ReceiptModal";

interface FinancialManagerProps {
  leads: Lead[];
  onSelectLead?: (leadId: string) => void;
}

export const FinancialManager: React.FC<FinancialManagerProps> = ({
  leads,
  onSelectLead,
}) => {
  const { toast, confirm } = useToast();

  // Core Data State
  const [contracts, setContracts] = useState<FinancialContract[]>([]);
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Navigation & Filtering State
  const [viewTab, setViewTab] = useState<FinancialViewTab>("installments");
  const [quickFilter, setQuickFilter] = useState<FinancialQuickFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Modal / Interaction State
  const [contractFormOpen, setContractFormOpen] = useState<boolean>(false);
  const [contractToEdit, setContractToEdit] = useState<FinancialContract | null>(null);
  const [payingInstallment, setPayingInstallment] = useState<FinancialInstallment | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{
    installment: FinancialInstallment;
    contract: FinancialContract;
    lead: Lead;
  } | null>(null);

  // Fast Lead Lookup Map
  const leadMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach((l) => map.set(l.id, l));
    return map;
  }, [leads]);

  // Fetch Financial Data from backend
  const fetchFinancialData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [resContracts, resInstallments] = await Promise.all([
        fetch("/api/financial/contracts"),
        fetch("/api/financial/installments"),
      ]);

      if (resContracts.ok && resInstallments.ok) {
        const contractsData: FinancialContract[] = await resContracts.json();
        const installmentsData: FinancialInstallment[] = await resInstallments.json();
        setContracts(contractsData);
        setInstallments(installmentsData);
      } else {
        toast.error("Falha ao carregar registros financeiros.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao carregar módulo financeiro.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Today ISO Date string
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Summary Metrics Calculation
  const summaryMetrics = useMemo(() => {
    const activeContracts = contracts.filter((c) => c.status === "active");

    const totalContratado = activeContracts.reduce((sum, c) => {
      const finalVal =
        c.final_value ??
        c.total_value + (c.freight_value || 0) - (c.discount_value || 0);
      return sum + finalVal;
    }, 0);

    const totalRecebido = installments
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + (i.paid_value || i.value), 0);

    const overdueInstallments = installments.filter(
      (i) => i.status === "pending" && i.due_date < todayStr
    );

    const totalEmAtraso = overdueInstallments.reduce(
      (sum, i) => sum + i.value,
      0
    );

    const totalAReceber = Math.max(0, totalContratado - totalRecebido);

    const percentInadimplencia =
      totalContratado > 0
        ? Number(((totalEmAtraso / totalContratado) * 100).toFixed(1))
        : 0.0;

    return {
      totalContratado,
      totalRecebido,
      totalEmAtraso,
      totalAReceber,
      activeContractsCount: activeContracts.length,
      overdueCount: overdueInstallments.length,
      percentInadimplencia,
    };
  }, [contracts, installments, todayStr]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7Str = next7Days.toISOString().split("T")[0];

    const all = installments.length;
    const pending = installments.filter((i) => i.status === "pending").length;
    const overdue = installments.filter(
      (i) => i.status === "pending" && i.due_date < todayStr
    ).length;
    const paid = installments.filter((i) => i.status === "paid").length;
    const next7 = installments.filter(
      (i) =>
        i.status === "pending" &&
        i.due_date >= todayStr &&
        i.due_date <= next7Str
    ).length;

    return {
      all,
      pending,
      overdue,
      paid,
      next7,
      contracts: contracts.length,
    };
  }, [installments, contracts, todayStr]);

  // Filtered Installments
  const filteredInstallments = useMemo(() => {
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7Str = next7Days.toISOString().split("T")[0];
    const query = searchQuery.trim().toLowerCase();

    return installments.filter((inst) => {
      // 1. Quick status filter
      if (quickFilter === "pending" && inst.status !== "pending") return false;
      if (
        quickFilter === "overdue" &&
        !(inst.status === "pending" && inst.due_date < todayStr)
      ) {
        return false;
      }
      if (quickFilter === "paid" && inst.status !== "paid") return false;
      if (
        quickFilter === "next7" &&
        !(
          inst.status === "pending" &&
          inst.due_date >= todayStr &&
          inst.due_date <= next7Str
        )
      ) {
        return false;
      }

      // 2. Date Range Filter
      if (startDate && inst.due_date < startDate) return false;
      if (endDate && inst.due_date > endDate) return false;

      // 3. Search Query Filter
      if (query) {
        const contract = contracts.find((c) => c.id === inst.contract_id);
        const lead = contract ? leadMap.get(contract.lead_id) : null;

        const leadName = lead?.nome?.toLowerCase() || "";
        const leadLocal = lead?.local?.toLowerCase() || "";
        const contractNo = contract?.contract_number?.toLowerCase() || "";

        if (
          !leadName.includes(query) &&
          !leadLocal.includes(query) &&
          !contractNo.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    installments,
    quickFilter,
    todayStr,
    startDate,
    endDate,
    searchQuery,
    contracts,
    leadMap,
  ]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contracts;

    return contracts.filter((c) => {
      const lead = leadMap.get(c.lead_id);
      const leadName = lead?.nome?.toLowerCase() || "";
      const leadLocal = lead?.local?.toLowerCase() || "";
      const contractNo = c.contract_number?.toLowerCase() || "";

      return (
        leadName.includes(query) ||
        leadLocal.includes(query) ||
        contractNo.includes(query)
      );
    });
  }, [contracts, searchQuery, leadMap]);

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery("");
    setQuickFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const handleOpenNewContract = () => {
    setContractToEdit(null);
    setContractFormOpen(true);
  };

  const handleEditContract = (contract: FinancialContract) => {
    const contractInstallments = installments.filter(
      (i) => i.contract_id === contract.id
    );
    const hasNonEntryPaid = contractInstallments.some(
      (i) => i.status === "paid" && i.installment_number > 0
    );

    if (hasNonEntryPaid) {
      toast.warning(
        "Este contrato já possui parcelas quitadas e não pode ser reeditado."
      );
      return;
    }

    setContractToEdit(contract);
    setContractFormOpen(true);
  };

  const handleDeleteContract = async (contract: FinancialContract) => {
    const contractInstallments = installments.filter(
      (i) => i.contract_id === contract.id
    );
    const hasAnyPaid = contractInstallments.some((i) => i.status === "paid");

    if (hasAnyPaid) {
      toast.error(
        "Não é possível excluir um contrato que já possui parcelas pagas."
      );
      return;
    }

    const confirmed = await confirm(
      `Deseja realmente excluir o contrato "${contract.contract_number}" e todas as suas parcelas pendentes?`,
      {
        title: "Excluir Contrato",
        confirmText: "Sim, Excluir",
        cancelText: "Cancelar",
        isDanger: true,
      }
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/financial/contracts/${contract.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Contrato excluído com sucesso!");
        fetchFinancialData(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Falha ao excluir contrato.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao excluir contrato.");
    }
  };

  const handleSaveContract = async (payload: {
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
  }) => {
    const isEdit = Boolean(contractToEdit);
    const url = isEdit
      ? `/api/financial/contracts/${contractToEdit!.id}`
      : "/api/financial/contracts";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erro ao salvar contrato.");
    }

    toast.success(
      isEdit
        ? "Contrato atualizado com sucesso!"
        : "Contrato e parcelas gerados com sucesso!"
    );
    fetchFinancialData(true);
  };

  const handlePaySubmit = async (data: {
    paid_date: string;
    paid_value: number;
    payment_method: string;
    payment_observations?: string;
  }) => {
    if (!payingInstallment) return;

    const res = await fetch(
      `/api/financial/installments/${payingInstallment.id}/pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Falha ao registrar pagamento.");
    }

    const resData = await res.json();
    toast.success("Pagamento confirmado com sucesso!");

    // Refresh data in background
    await fetchFinancialData(true);

    // Automatically open receipt modal
    const contract = contracts.find(
      (c) => c.id === payingInstallment.contract_id
    );
    const lead = contract ? leadMap.get(contract.lead_id) : null;
    if (contract && lead && resData.installment) {
      setViewingReceipt({
        installment: resData.installment,
        contract,
        lead,
      });
    }
  };

  const handleViewContractInstallments = (contract: FinancialContract) => {
    setSearchQuery(contract.contract_number);
    setViewTab("installments");
    setQuickFilter("all");
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. CABEÇALHO EDITORIAL (PADRÃO DASHBOARD / CRM)               */}
      {/* ------------------------------------------------------------- */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b transition-colors"
        style={{ borderColor: "var(--crm-border)" }}
      >
        <div>
          <h1
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: "var(--crm-text)" }}
          >
            Financeiro
          </h1>
          <p
            className="text-xs sm:text-sm mt-0.5"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Contratos, recebimentos e parcelas da operação comercial.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchFinancialData(true)}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
            title="Atualizar dados financeiros"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-500" : ""}`}
            />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewContract}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. RESUMO FINANCEIRO (FAIXA EDITORIAL COM DIVISORES)          */}
      {/* ------------------------------------------------------------- */}
      <FinancialSummary
        totalContratado={summaryMetrics.totalContratado}
        totalRecebido={summaryMetrics.totalRecebido}
        totalEmAtraso={summaryMetrics.totalEmAtraso}
        totalAReceber={summaryMetrics.totalAReceber}
        activeContractsCount={summaryMetrics.activeContractsCount}
        overdueCount={summaryMetrics.overdueCount}
        percentInadimplencia={summaryMetrics.percentInadimplencia}
        onFilterOverdue={() => {
          setViewTab("installments");
          setQuickFilter("overdue");
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 3. TOOLBAR OPERACIONAL (TABS, BUSCA, FILTROS, DATAS)          */}
      {/* ------------------------------------------------------------- */}
      <FinancialToolbar
        viewTab={viewTab}
        onViewTabChange={setViewTab}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onClearFilters={handleClearFilters}
        counts={counts}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. CONTEÚDO PRINCIPAL (TABELAS OPERACIONAIS)                  */}
      {/* ------------------------------------------------------------- */}
      {isLoading ? (
        <div
          className="rounded-2xl border p-12 text-center shadow-xs"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
        >
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
          <p
            className="text-xs font-medium"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Carregando movimentações financeiras...
          </p>
        </div>
      ) : viewTab === "installments" ? (
        <InstallmentsTable
          installments={filteredInstallments}
          contracts={contracts}
          leadMap={leadMap}
          onOpenPayModal={(inst) => setPayingInstallment(inst)}
          onOpenReceipt={(installment, contract, lead) =>
            setViewingReceipt({ installment, contract, lead })
          }
          onSelectLead={onSelectLead}
        />
      ) : (
        <ContractsTable
          contracts={filteredContracts}
          installments={installments}
          leadMap={leadMap}
          onEditContract={handleEditContract}
          onDeleteContract={handleDeleteContract}
          onViewContractInstallments={handleViewContractInstallments}
          onSelectLead={onSelectLead}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL DE BAIXA DE PARCELA                                  */}
      {/* ------------------------------------------------------------- */}
      {payingInstallment && (
        <PayInstallmentModal
          installment={payingInstallment}
          contract={contracts.find(
            (c) => c.id === payingInstallment.contract_id
          )}
          lead={(() => {
            const contract = contracts.find(
              (c) => c.id === payingInstallment.contract_id
            );
            return contract ? leadMap.get(contract.lead_id) : undefined;
          })()}
          onClose={() => setPayingInstallment(null)}
          onSubmit={handlePaySubmit}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL DE FORMULÁRIO DE CONTRATO (CRIAR / EDITAR)           */}
      {/* ------------------------------------------------------------- */}
      {contractFormOpen && (
        <ContractFormModal
          contractToEdit={contractToEdit}
          leads={leads}
          onClose={() => {
            setContractFormOpen(false);
            setContractToEdit(null);
          }}
          onSubmit={handleSaveContract}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL DE RECIBO DIGITAL DE PAGAMENTO                      */}
      {/* ------------------------------------------------------------- */}
      {viewingReceipt && (
        <ReceiptModal
          receiptData={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
};

export default FinancialManager;
