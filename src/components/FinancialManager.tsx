import React, { useState, useEffect, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Percent, 
  User, 
  Search, 
  Filter, 
  Check, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Download, 
  Printer, 
  X, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  ArrowLeft 
} from "lucide-react";
import { Lead } from "../types";
import { useToast } from "./Toast";

interface FinancialContract {
  id: string;
  lead_id: string;
  contract_number: string;
  contract_date: string;
  total_value: number;
  freight_value?: number;
  discount_value?: number;
  final_value?: number;
  payment_method: "a_vista" | "parcelado";
  installments_count: number;
  down_payment: number;
  status: "active" | "completed";
  observations: string;
  created_at: string;
  updated_at: string;
}

interface FinancialInstallment {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  value: number;
  status: "pending" | "paid";
  paid_date: string | null;
  paid_value: number | null;
  payment_method: string | null;
  payment_observations: string | null;
  receipt_number: string | null;
  created_at: string;
  updated_at: string;
}

interface FinancialManagerProps {
  leads: Lead[];
}

export default function FinancialManager({ leads }: FinancialManagerProps) {
  const { toast, confirm } = useToast();
  
  // Data State
  const [contracts, setContracts] = useState<FinancialContract[]>([]);
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout Tabs
  const [subTab, setSubTab] = useState<"installments" | "contracts" | "new_contract">("installments");

  // Filter and Search states
  const [quickFilter, setQuickFilter] = useState<"all" | "pending" | "overdue" | "paid" | "next7">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Contract Form State
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);
  
  const [contractNumber, setContractNumber] = useState("");
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [totalValue, setTotalValue] = useState<number | string>("");
  const [freightValue, setFreightValue] = useState<number | string>("");
  const [discountValue, setDiscountValue] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<"a_vista" | "parcelado">("parcelado");
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [downPayment, setDownPayment] = useState<number | string>("");
  const [observations, setObservations] = useState("");

  // Editing Contract State
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  // Payment Modal State ("Dar Baixa")
  const [payingInstallment, setPayingInstallment] = useState<FinancialInstallment | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentValue, setPaymentValue] = useState<number | string>("");
  const [paymentMethodForm, setPaymentMethodForm] = useState("Pix");
  const [paymentObservations, setPaymentObservations] = useState("");

  // Printable Receipt State
  const [viewingReceipt, setViewingReceipt] = useState<{
    installment: FinancialInstallment;
    contract: FinancialContract;
    lead: Lead;
  } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Fetch Data
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [resContracts, resInstallments] = await Promise.all([
        fetch("/api/financial/contracts"),
        fetch("/api/financial/installments")
      ]);

      if (resContracts.ok && resInstallments.ok) {
        const dataContracts = await resContracts.json();
        const dataInstallments = await resInstallments.json();
        setContracts(dataContracts);
        setInstallments(dataInstallments);
      }
    } catch (e) {
      console.error("Erro ao buscar dados financeiros:", e);
      toast.error("Erro ao carregar módulo financeiro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const handlePrintReceipt = async () => {
    const printContent = document.getElementById("print-receipt-modal");
    if (!printContent) {
      toast.error("Erro: Área de impressão não encontrada.");
      return;
    }

    try {
      setIsGeneratingPDF(true);
      toast.info("Gerando PDF do recibo...");

      // Render the receipt container to canvas with high resolution
      const canvas = await html2canvas(printContent, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          // Replace unsupported modern CSS color functions in style tags with transparent to avoid html2canvas parser crash
          const styleTags = clonedDoc.querySelectorAll("style");
          styleTags.forEach((style) => {
            if (style.textContent) {
              style.textContent = style.textContent
                .replace(/oklch\([^)]+\)/gi, "rgba(0,0,0,0)")
                .replace(/color-mix\([^)]+\)/gi, "rgba(0,0,0,0)")
                .replace(/light-dark\([^)]+\)/gi, "rgba(0,0,0,0)");
            }
          });

          // Function to apply explicit hex styles based on Tailwind class names so rendering is pristine
          const applyExplicitStyles = (el: HTMLElement) => {
            const classList = Array.from(el.classList);

            // Backgrounds
            if (classList.some((c) => c.startsWith("bg-zinc-50"))) el.style.backgroundColor = "#fafafa";
            else if (classList.some((c) => c.startsWith("bg-zinc-100"))) el.style.backgroundColor = "#f4f4f5";
            else if (classList.some((c) => c.startsWith("bg-zinc-900"))) el.style.backgroundColor = "#18181b";
            else if (classList.some((c) => c.startsWith("bg-zinc-950"))) el.style.backgroundColor = "#09090b";
            else if (classList.some((c) => c.startsWith("bg-white"))) el.style.backgroundColor = "#ffffff";

            // Text colors
            if (classList.some((c) => c.startsWith("text-zinc-950"))) el.style.color = "#09090b";
            else if (classList.some((c) => c.startsWith("text-zinc-900"))) el.style.color = "#18181b";
            else if (classList.some((c) => c.startsWith("text-zinc-800"))) el.style.color = "#27272a";
            else if (classList.some((c) => c.startsWith("text-zinc-500"))) el.style.color = "#71717a";
            else if (classList.some((c) => c.startsWith("text-zinc-400"))) el.style.color = "#a1a1aa";
            else if (classList.some((c) => c.startsWith("text-amber-500"))) el.style.color = "#f59e0b";
            else if (classList.some((c) => c.startsWith("text-white"))) el.style.color = "#ffffff";

            // Borders
            if (classList.some((c) => c.startsWith("border-zinc-100"))) el.style.borderColor = "#f4f4f5";
            else if (classList.some((c) => c.startsWith("border-zinc-200"))) el.style.borderColor = "#e4e4e7";
            else if (classList.some((c) => c.startsWith("border-zinc-300"))) el.style.borderColor = "#d4d4d8";
            else if (classList.some((c) => c.startsWith("border-zinc-800"))) el.style.borderColor = "#27272a";
          };

          if (clonedElement) {
            clonedElement.style.backgroundColor = "#ffffff";
            clonedElement.style.color = "#09090b";
            clonedElement.style.padding = "32px";

            applyExplicitStyles(clonedElement);
            const children = clonedElement.querySelectorAll<HTMLElement>("*");
            children.forEach((child) => applyExplicitStyles(child));
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 5, pdfWidth, pdfHeight);

      const receiptNum = viewingReceipt?.installment?.receipt_number || "RECIBO";
      const leadNameClean = (viewingReceipt?.lead?.nome || "Lead").replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `Recibo_${receiptNum}_${leadNameClean}.pdf`;

      pdf.save(fileName);
      toast.success("PDF do recibo baixado com sucesso!");

      // Try silent fallback window print if browser allows
      try {
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        iframe.style.visibility = "hidden";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Recibo ${receiptNum}</title>
                <style>
                  body { background: white; margin: 0; padding: 20px; display: flex; justify-content: center; }
                  img { max-width: 100%; height: auto; }
                </style>
              </head>
              <body>
                <img src="${imgData}" />
                <script>
                  window.onload = function() {
                    try { window.print(); } catch(e) {}
                    setTimeout(function() {
                      try { window.frameElement.remove(); } catch(e) {}
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          iframeDoc.close();
        }
      } catch (e) {
        // Ignored if window.print is blocked in iframe sandbox
      }
    } catch (err: any) {
      console.error("Erro ao gerar PDF do recibo:", err);
      toast.error("Erro ao gerar PDF: " + (err?.message || "Falha inesperada."));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Map to get lead object by ID
  const leadMap = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach(l => map.set(l.id, l));
    return map;
  }, [leads]);

  // Lead dropdown options filtered by leadSearch
  const filteredLeadOptions = useMemo(() => {
    if (!leadSearch.trim()) return leads;
    const query = leadSearch.toLowerCase();
    return leads.filter(l => 
      (l.nome && l.nome.toLowerCase().includes(query)) ||
      (l.email && l.email.toLowerCase().includes(query)) ||
      (l.local && l.local.toLowerCase().includes(query)) ||
      (l.origem_portal && l.origem_portal.toLowerCase().includes(query))
    );
  }, [leads, leadSearch]);

  // Calculations for Dashboard Indicators
  const dashboardStats = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Card 1: Total Contratado (soma de todos os contratos ativos)
    const activeContracts = contracts.filter(c => c.status === "active");
    const totalContratado = activeContracts.reduce((sum, c) => {
      const net = c.final_value ?? (c.total_value + (c.freight_value || 0) - (c.discount_value || 0));
      return sum + net;
    }, 0);

    // Card 2: Total Recebido (soma de todas as parcelas pagas)
    const totalRecebido = installments
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + (i.paid_value || i.value), 0);

    // Card 3: Total em Atraso (soma das parcelas vencidas não pagas)
    const totalEmAtraso = installments
      .filter(i => i.status === "pending" && i.due_date < todayStr)
      .reduce((sum, i) => sum + i.value, 0);

    // Card 4: % de Inadimplência (Total em Atraso / Total Contratado * 100)
    const percentInadimplencia = totalContratado > 0 
      ? Number(((totalEmAtraso / totalContratado) * 100).toFixed(1)) 
      : 0.0;

    return {
      totalContratado,
      totalRecebido,
      totalEmAtraso,
      percentInadimplencia
    };
  }, [contracts, installments]);

  // Formatting helper
  const formatBRL = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Filter installments list
  const filteredInstallments = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const next7DaysStr = new Date();
    next7DaysStr.setDate(next7DaysStr.getDate() + 7);
    const next7DaysLimit = next7DaysStr.toISOString().split("T")[0];

    return installments.filter(inst => {
      const contract = contracts.find(c => c.id === inst.contract_id);
      const lead = contract ? leadMap.get(contract.lead_id) : null;
      
      // Fast Quick Filters
      if (quickFilter === "pending" && inst.status !== "pending") return false;
      if (quickFilter === "overdue" && (inst.status !== "pending" || inst.due_date >= todayStr)) return false;
      if (quickFilter === "paid" && inst.status !== "paid") return false;
      if (quickFilter === "next7") {
        if (inst.status !== "pending") return false;
        if (inst.due_date < todayStr || inst.due_date > next7DaysLimit) return false;
      }

      // Search Query filter (Lead, Contract Number)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const leadName = lead ? `${lead.nome || ""} ${lead.local || ""}`.toLowerCase() : "";
        const contractNo = contract ? contract.contract_number.toLowerCase() : "";
        if (!leadName.includes(query) && !contractNo.includes(query)) {
          return false;
        }
      }

      // Date Range Filter
      if (startDate && inst.due_date < startDate) return false;
      if (endDate && inst.due_date > endDate) return false;

      return true;
    });
  }, [installments, contracts, leadMap, quickFilter, searchQuery, startDate, endDate]);

  // Check if installment is overdue or nearing
  const getInstallmentHighlightClass = (inst: FinancialInstallment) => {
    if (inst.status === "paid") return "border-l-4 border-l-emerald-500 bg-emerald-950/20";
    const todayStr = new Date().toISOString().split("T")[0];
    if (inst.due_date < todayStr) return "border-l-4 border-l-red-500 bg-red-950/30 animate-pulse";
    
    // Nearing (next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];
    if (inst.due_date <= next7DaysStr) return "border-l-4 border-l-amber-500 bg-amber-950/20";

    return "border-l-4 border-l-zinc-700 bg-zinc-900/40";
  };

  // Contract form submission
  const handleSaveContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) {
      toast.error("Por favor, selecione um Lead.");
      return;
    }
    if (!contractDate) {
      toast.error("Por favor, insira a data do contrato.");
      return;
    }
    if (!totalValue || Number(totalValue) <= 0) {
      toast.error("Por favor, preencha um valor de contrato válido.");
      return;
    }
    const subtotal = Number(totalValue) || 0;
    const freight = Number(freightValue) || 0;
    const discount = Number(discountValue) || 0;
    const netTotalValue = Math.max(0, subtotal + freight - discount);

    if (paymentMethod === "parcelado") {
      if (installmentsCount < 2 || installmentsCount > 24) {
        toast.error("O número de parcelas deve estar entre 2 e 24.");
        return;
      }
      if (downPayment && Number(downPayment) >= netTotalValue) {
        toast.error("O valor da entrada não pode ser maior ou igual ao valor final líquido do contrato.");
        return;
      }
    }

    try {
      const url = editingContractId 
        ? `/api/financial/contracts/${editingContractId}` 
        : "/api/financial/contracts";
      const method = editingContractId ? "PUT" : "POST";

      const payload = {
        lead_id: selectedLead.id,
        contract_number: contractNumber.trim() || undefined,
        contract_date: contractDate,
        total_value: subtotal,
        freight_value: freight,
        discount_value: discount,
        payment_method: paymentMethod,
        installments_count: paymentMethod === "a_vista" ? 1 : installmentsCount,
        down_payment: downPayment ? Number(downPayment) : 0,
        observations: observations.trim()
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingContractId ? "Contrato atualizado com sucesso!" : "Contrato vinculado com sucesso!");
        // Reset Form
        setEditingContractId(null);
        setSelectedLead(null);
        setLeadSearch("");
        setContractNumber("");
        setTotalValue("");
        setFreightValue("");
        setDiscountValue("");
        setDownPayment("");
        setObservations("");
        setSubTab("installments");
        fetchFinancialData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar contrato.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede ao salvar contrato.");
    }
  };

  // Open Edit Contract Form
  const handleEditContract = (c: FinancialContract) => {
    const lead = leadMap.get(c.lead_id);
    if (!lead) return;

    // Verify if there are paid installments for this contract
    const contractInsts = installments.filter(i => i.contract_id === c.id);
    const paidNonEntry = contractInsts.filter(i => i.status === "paid" && i.installment_number > 0);

    if (paidNonEntry.length > 0) {
      toast.error("Não é possível editar este contrato pois já existem parcelas pagas.");
      return;
    }

    setEditingContractId(c.id);
    setSelectedLead(lead);
    setLeadSearch(lead.nome);
    setContractNumber(c.contract_number);
    setContractDate(c.contract_date);
    setTotalValue(c.total_value);
    setFreightValue(c.freight_value || "");
    setDiscountValue(c.discount_value || "");
    setPaymentMethod(c.payment_method);
    setInstallmentsCount(c.installments_count);
    setDownPayment(c.down_payment || "");
    setObservations(c.observations);
    setSubTab("new_contract");
  };

  // Delete Contract
  const handleDeleteContract = async (c: FinancialContract) => {
    const contractInsts = installments.filter(i => i.contract_id === c.id);
    const paidInsts = contractInsts.filter(i => i.status === "paid");

    if (paidInsts.length > 0) {
      toast.error("Bloquear exclusão de contratos com parcelas pagas.");
      return;
    }

    const confirmed = await confirm(`Tem certeza que deseja excluir o contrato número "${c.contract_number}"? Todas as suas parcelas também serão excluídas.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/financial/contracts/${c.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Contrato excluído com sucesso!");
        fetchFinancialData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao excluir contrato.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede ao excluir contrato.");
    }
  };

  // Open Pay Installment Modal
  const handleOpenPayModal = (inst: FinancialInstallment) => {
    setPayingInstallment(inst);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentValue(inst.value);
    setPaymentMethodForm("Pix");
    setPaymentObservations("");
  };

  // Submit Pay Installment ("Dar Baixa")
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment) return;

    try {
      const res = await fetch(`/api/financial/installments/${payingInstallment.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid_date: paymentDate,
          paid_value: Number(paymentValue),
          payment_method: paymentMethodForm,
          payment_observations: paymentObservations.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Pagamento confirmado com sucesso!");
        setPayingInstallment(null);
        fetchFinancialData();

        // Automatically load printable receipt
        const contract = contracts.find(c => c.id === payingInstallment.contract_id);
        const lead = contract ? leadMap.get(contract.lead_id) : null;
        if (contract && lead && data.installment) {
          setViewingReceipt({
            installment: data.installment,
            contract,
            lead
          });
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao dar baixa em parcela.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede ao confirmar pagamento.");
    }
  };

  // Export Delinquency Report (CSV)
  const handleExportCSV = () => {
    const overdueList = installments.filter(inst => {
      const todayStr = new Date().toISOString().split("T")[0];
      return inst.status === "pending" && inst.due_date < todayStr;
    });

    if (overdueList.length === 0) {
      toast.info("Não existem parcelas em atraso para exportar.");
      return;
    }

    // Header line
    let csvContent = "\ufeff"; // BOM for Excel UTF-8 representation
    csvContent += "Lead;Empresa;Contrato;Parcela;Vencimento;Valor (R$);Status\n";

    overdueList.forEach(inst => {
      const contract = contracts.find(c => c.id === inst.contract_id);
      const lead = contract ? leadMap.get(contract.lead_id) : null;
      
      const leadName = lead ? lead.nome : "Desconhecido";
      const company = lead?.local || "N/A";
      const contractNo = contract?.contract_number || "N/A";
      const installmentLabel = inst.installment_number === 0 ? "Entrada" : `${inst.installment_number}ª Parcela`;
      const value = inst.value.toFixed(2).replace(".", ",");
      
      csvContent += `"${leadName}";"${company}";"${contractNo}";"${installmentLabel}";"${inst.due_date}";"${value}";"Vencida"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_inadimplencia_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório de inadimplência exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 2. DASHBOARD INDICATORS PANEL                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Contratado */}
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between shadow-xs transition-all hover:border-white/[0.12] group">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Total Contratado (Ativos)
            </span>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {formatBRL(dashboardStats.totalContratado)}
            </div>
            <span className="text-[11px] text-zinc-400">Contratos com status Ativo</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Recebido */}
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between shadow-xs transition-all hover:border-white/[0.12] group">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Total Recebido (Pago)
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {formatBRL(dashboardStats.totalRecebido)}
            </div>
            <span className="text-[11px] text-emerald-400/80">Todas as parcelas quitadas</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
            <Check className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total em Atraso */}
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between shadow-xs transition-all hover:border-white/[0.12] group">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Total em Atraso (Vencido)
            </span>
            <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {formatBRL(dashboardStats.totalEmAtraso)}
            </div>
            <span className="text-[11px] text-rose-400/80">Parcelas vencidas em aberto</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: % de Inadimplência */}
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex items-center justify-between shadow-xs transition-all hover:border-white/[0.12] group">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Inadimplência
            </span>
            <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
              {dashboardStats.percentInadimplencia}%
            </div>
            <span className="text-[11px] text-amber-400/80">Atraso sobre total ativo</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Navigation controls / Subtabs */}
      <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSubTab("installments");
              setEditingContractId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
              subTab === "installments"
                ? "bg-indigo-600 text-white font-medium shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <Clock className="w-4 h-4" />
            Controle de Vencimentos
          </button>
          <button
            onClick={() => {
              setSubTab("contracts");
              setEditingContractId(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
              subTab === "contracts"
                ? "bg-indigo-600 text-white font-medium shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <FileText className="w-4 h-4" />
            Contratos Emitidos
          </button>
          <button
            onClick={() => {
              setEditingContractId(null);
              setSelectedLead(null);
              setLeadSearch("");
              setContractNumber("");
              setTotalValue("");
              setDownPayment("");
              setObservations("");
              setSubTab("new_contract");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center gap-2 cursor-pointer ${
              subTab === "new_contract" && !editingContractId
                ? "bg-indigo-600 text-white font-medium shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <Plus className="w-4 h-4" />
            Nova Vinculação
          </button>
        </div>

        {subTab === "installments" && (
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-white rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center justify-center gap-2 border border-white/[0.08] self-start md:self-auto cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Inadimplentes em CSV
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CONTROLE DE VENCIMENTOS PANEL                             */}
      {/* ------------------------------------------------------------- */}
      {subTab === "installments" && (
        <div className="space-y-4">
          
          {/* Quick Filters, Search Bar & Period Report Date Pickers */}
          <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-4 space-y-4 shadow-xs">
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium mr-1">Filtrar por:</span>
              <button
                onClick={() => setQuickFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === "all" ? "bg-white/[0.1] text-white border border-white/[0.15]" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Todas ({installments.length})
              </button>
              <button
                onClick={() => setQuickFilter("pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === "pending" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Pendentes ({installments.filter(i => i.status === "pending").length})
              </button>
              <button
                onClick={() => setQuickFilter("overdue")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === "overdue" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Vencidas ({installments.filter(i => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  return i.status === "pending" && i.due_date < todayStr;
                }).length})
              </button>
              <button
                onClick={() => setQuickFilter("paid")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === "paid" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Pagas ({installments.filter(i => i.status === "paid").length})
              </button>
              <button
                onClick={() => setQuickFilter("next7")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === "next7" ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                Vencem em 7 dias
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por Lead ou Contrato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 shrink-0 font-medium">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 py-1.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 shrink-0 font-medium">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 py-1.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

            </div>

          </div>

          {/* Table display */}
          <div className="bg-[#121620] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xs">
            {filteredInstallments.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-medium">Nenhuma parcela localizada com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1118] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 font-semibold">Lead (Noiva / Noivo)</th>
                      <th className="p-4 font-semibold">Contrato</th>
                      <th className="p-4 font-semibold">Parcela</th>
                      <th className="p-4 font-semibold">Vencimento</th>
                      <th className="p-4 font-semibold text-right">Valor</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filteredInstallments.map((inst) => {
                      const contract = contracts.find(c => c.id === inst.contract_id);
                      const lead = contract ? leadMap.get(contract.lead_id) : null;
                      const isOverdue = inst.status === "pending" && inst.due_date < new Date().toISOString().split("T")[0];

                      return (
                        <tr 
                          key={inst.id} 
                          className={`hover:bg-white/[0.02] transition ${getInstallmentHighlightClass(inst)}`}
                        >
                          {/* Lead Name info */}
                          <td className="p-4">
                            {lead ? (
                              <div>
                                <span className="font-semibold text-white block">
                                  {lead.nome}
                                </span>
                                {lead.local && (
                                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                                    Local: {lead.local}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">Desconhecido</span>
                            )}
                          </td>

                          {/* Contract Code */}
                          <td className="p-4">
                            {contract ? (
                              <span className="font-mono text-zinc-300 font-medium">
                                {contract.contract_number}
                              </span>
                            ) : (
                              <span className="text-zinc-600 font-mono">N/A</span>
                            )}
                          </td>

                          {/* Installment sequence */}
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-lg bg-[#0e1118] border border-white/[0.08] text-[10px] font-mono text-zinc-300 font-bold">
                              {inst.installment_number === 0 ? "Entrada" : `${inst.installment_number}ª Parcela`}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="font-mono text-zinc-300">
                                {new Date(inst.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </td>

                          {/* Value */}
                          <td className="p-4 text-right font-mono font-bold text-white">
                            {formatBRL(inst.value)}
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            {inst.status === "paid" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Pago
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 border border-rose-500/25 text-rose-300 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                Vencido
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 border border-amber-500/25 text-amber-300 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Pendente
                              </span>
                            )}
                          </td>

                          {/* Action cell */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {inst.status === "pending" ? (
                                <button
                                  onClick={() => handleOpenPayModal(inst)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-lg shadow-xs transition cursor-pointer"
                                >
                                  Dar Baixa
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (contract && lead) {
                                      setViewingReceipt({
                                        installment: inst,
                                        contract,
                                        lead
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-medium rounded-lg border border-white/[0.08] transition cursor-pointer flex items-center gap-1.5"
                                  title="Ver Recibo de Pagamento"
                                >
                                  <Printer className="w-3 h-3 text-indigo-400" />
                                  Recibo
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTRATOS EMITIDOS TABLE                                      */}
      {/* ------------------------------------------------------------- */}
      {subTab === "contracts" && (
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl overflow-hidden shadow-xs">
          {contracts.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-medium">Nenhum contrato cadastrado até o momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e1118] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-semibold">Nº Contrato</th>
                    <th className="p-4 font-semibold">Data Contrato</th>
                    <th className="p-4 font-semibold">Lead Vinculado</th>
                    <th className="p-4 font-semibold">Forma Pagto.</th>
                    <th className="p-4 font-semibold">Parcelas</th>
                    <th className="p-4 font-semibold text-right">Valor Total</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-center">Opções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-zinc-300">
                  {contracts.map((c) => {
                    const lead = leadMap.get(c.lead_id);
                    const contractInsts = installments.filter(i => i.contract_id === c.id);
                    const paidCount = contractInsts.filter(i => i.status === "paid").length;

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-4 font-mono font-bold text-white">{c.contract_number}</td>
                        <td className="p-4">
                          {new Date(c.contract_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </td>
                        <td className="p-4">
                          {lead ? (
                            <div>
                              <span className="font-semibold block text-zinc-100">
                                {lead.nome}
                              </span>
                              {lead.local && (
                                <span className="text-[11px] text-zinc-400 block mt-0.5">
                                  Local: {lead.local}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">Desconhecido</span>
                          )}
                        </td>
                        <td className="p-4 uppercase text-[10px] font-mono">
                          {c.payment_method === "a_vista" ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                              À Vista
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold">
                              Parcelado
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-semibold text-zinc-300">
                            {paidCount} / {contractInsts.length} Pagas
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono">
                          <div className="font-bold text-white">
                            {formatBRL(c.final_value ?? (c.total_value + (c.freight_value || 0) - (c.discount_value || 0)))}
                          </div>
                          {((c.freight_value || 0) > 0 || (c.discount_value || 0) > 0) && (
                            <div className="text-[9px] text-zinc-500 font-sans mt-0.5">
                              Base: {formatBRL(c.total_value)}
                              {(c.freight_value || 0) > 0 && ` | Frete: +${formatBRL(c.freight_value || 0)}`}
                              {(c.discount_value || 0) > 0 && ` | Desc: -${formatBRL(c.discount_value || 0)}`}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {c.status === "completed" ? (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase bg-emerald-500/15 border border-emerald-500/25 text-emerald-300">
                              Finalizado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase bg-indigo-500/15 border border-indigo-500/25 text-indigo-300">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditContract(c)}
                              className="p-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                              title="Editar Contrato"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteContract(c)}
                              className="p-1.5 bg-white/[0.05] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-lg border border-white/[0.06] transition cursor-pointer"
                              title="Excluir Contrato"
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
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. FORMULÁRIO DE VINCULAÇÃO DE CONTRATO (POST & PUT)          */}
      {/* ------------------------------------------------------------- */}
      {subTab === "new_contract" && (
        <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-6 md:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                {editingContractId ? "Editar Vínculo de Contrato" : "Novo Vínculo de Contrato"}
              </h3>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Gere o fluxo de parcelas e controle financeiro para um lead do sistema.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveContractSubmit} className="space-y-5">
            
            {/* Lead Search Dropdown Section */}
            <div className="relative space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                Selecionar Lead do CRM <span className="text-indigo-400">*</span>
              </label>
              
              {selectedLead ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0D12] border border-indigo-500/30 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        {selectedLead.nome}
                      </span>
                      {selectedLead.local && (
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          Local: {selectedLead.local}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadSearch("");
                    }}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Comece a digitar o nome do lead, local ou canal..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      setIsLeadDropdownOpen(true);
                    }}
                    onFocus={() => setIsLeadDropdownOpen(true)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-500"
                  />
                  {leadSearch && (
                    <button
                      type="button"
                      onClick={() => setLeadSearch("")}
                      className="absolute right-2.5 top-3 p-0.5 text-zinc-400 hover:text-white rounded transition cursor-pointer"
                      title="Limpar pesquisa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isLeadDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-[#0e1118] border border-white/[0.1] shadow-2xl z-50 divide-y divide-white/[0.05]">
                      {filteredLeadOptions.length === 0 ? (
                        <div className="p-3 text-center text-xs text-zinc-500">
                          Nenhum lead encontrado.
                        </div>
                      ) : (
                        filteredLeadOptions.map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              setSelectedLead(l);
                              setIsLeadDropdownOpen(false);
                            }}
                            className="w-full text-left p-3 hover:bg-white/[0.04] transition flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-white block">
                                {l.nome}
                              </span>
                              <span className="text-[11px] text-zinc-400 mt-0.5 block">
                                {l.local || "Sem local"} • {l.origem_portal || "Sem canal"}
                              </span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contract fields row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Contract Code */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Número do Contrato
                </label>
                <input
                  type="text"
                  placeholder="Ex: CTR-5023 (Deixe em branco p/ automático)"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-600 font-mono"
                />
              </div>

              {/* Contract Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Data de Assinatura <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
                  required
                />
              </div>

            </div>

            {/* Contract Values & Freight/Discount Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Products/Services Subtotal */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Valor dos Produtos (R$) <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5000.00"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono font-medium"
                  required
                />
              </div>

              {/* Freight Value */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Valor do Frete (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.00 (Opcional)"
                  value={freightValue}
                  onChange={(e) => setFreightValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

              {/* Discount Value */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 200.00 (Opcional)"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                />
              </div>

            </div>

            {/* Dynamic Contract Total Breakdown & Simulation Card */}
            {Boolean(totalValue || freightValue || discountValue) && (
              <div className="p-4 bg-[#0B0D12] border border-indigo-500/20 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <span className="text-[11px] font-bold uppercase font-mono text-indigo-400 tracking-wider">
                    Resumo do Valor Final do Contrato
                  </span>
                  <span className="text-base font-mono font-bold text-white">
                    {formatBRL(Math.max(0, (Number(totalValue) || 0) + (Number(freightValue) || 0) - (Number(discountValue) || 0)))}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-zinc-400">
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-500">Produtos / Base</span>
                    <span className="text-zinc-200 font-bold">{formatBRL(Number(totalValue) || 0)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-500">(+) Frete</span>
                    <span className="text-amber-300 font-bold">+{formatBRL(Number(freightValue) || 0)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-500">(-) Desconto</span>
                    <span className="text-emerald-400 font-bold">-{formatBRL(Number(discountValue) || 0)}</span>
                  </div>
                </div>
                {paymentMethod === "parcelado" && (
                  <div className="pt-2.5 border-t border-white/[0.06] text-[11px] text-zinc-300 flex flex-wrap justify-between items-center gap-2 font-mono">
                    <span>
                      Entrada: <strong className="text-emerald-400">{formatBRL(Number(downPayment) || 0)}</strong> (paga no ato)
                    </span>
                    <span>
                      Saldo: <strong className="text-white">{formatBRL(Math.max(0, Math.max(0, (Number(totalValue) || 0) + (Number(freightValue) || 0) - (Number(discountValue) || 0)) - (Number(downPayment) || 0)))}</strong> em <strong className="text-white">{installmentsCount}x</strong> de <strong className="text-indigo-400">{formatBRL(installmentsCount > 0 ? (Math.max(0, Math.max(0, (Number(totalValue) || 0) + (Number(freightValue) || 0) - (Number(discountValue) || 0)) - (Number(downPayment) || 0)) / installmentsCount) : 0)}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Option Row */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              
              {/* Payment selection dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Forma de Pagamento <span className="text-indigo-400">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "a_vista" | "parcelado")}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="parcelado">Parcelado</option>
                  <option value="a_vista">À Vista</option>
                </select>
              </div>

            </div>

            {/* Conditional fields for Parcelado */}
            {paymentMethod === "parcelado" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0e1118] p-4.5 rounded-xl border border-white/[0.06] animate-fade-in">
                
                {/* Installments count input (2 to 24) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                    Número de Parcelas <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10) || 2)}
                    className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                    required
                  />
                  <span className="text-[11px] text-zinc-400 block mt-0.5">Número de parcelas de 2 a 24</span>
                </div>

                {/* Entry down_payment amount */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                    Valor de Entrada (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Deixe em branco se não houver"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                  <span className="text-[11px] text-zinc-400 block mt-0.5">Será gerada como parcela paga à vista hoje</span>
                </div>

              </div>
            )}

            {/* Free text observations */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                Observações do Contrato
              </label>
              <textarea
                rows={3}
                placeholder="Insira detalhes de faturamento, prazos especiais de recebimento..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-600 resize-none"
              />
            </div>

            {/* Actions submit buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-white/[0.07] pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingContractId(null);
                  setSelectedLead(null);
                  setLeadSearch("");
                  setContractNumber("");
                  setTotalValue("");
                  setFreightValue("");
                  setDiscountValue("");
                  setDownPayment("");
                  setObservations("");
                  setSubTab("installments");
                }}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-white/[0.06]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                {editingContractId ? "Atualizar Contrato" : "Salvar Contrato"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL DE PAGAMENTO / DAR BAIXA                            */}
      {/* ------------------------------------------------------------- */}
      {payingInstallment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#121620] border border-white/[0.08] rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-scale-up">
            
            {/* Close button */}
            <button
              onClick={() => setPayingInstallment(null)}
              className="absolute right-4 top-4 p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Dar Baixa em Parcela
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Confirme o pagamento para atualizar o fluxo financeiro.
                </p>
              </div>
            </div>

            {/* Info details */}
            <div className="bg-[#0B0D12] p-4 rounded-xl border border-white/[0.06] text-xs space-y-2.5 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Nº Contrato:</span>
                <span className="font-mono font-bold text-white">
                  {contracts.find(c => c.id === payingInstallment.contract_id)?.contract_number || "CTR-0"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Parcela:</span>
                <span className="font-semibold text-zinc-200">
                  {payingInstallment.installment_number === 0 ? "Entrada" : `${payingInstallment.installment_number}ª Parcela`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Valor Original:</span>
                <span className="font-mono font-bold text-white">
                  {formatBRL(payingInstallment.value)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Vencimento:</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {new Date(payingInstallment.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            {/* Confirm Payment Form */}
            <form onSubmit={handlePaySubmit} className="space-y-4">
              
              {/* Payment Date Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Data de Recebimento <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition [color-scheme:dark]"
                  required
                />
              </div>

              {/* Value received (can be partial) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Valor Pago (R$) <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2500.00"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono font-bold"
                  required
                />
                <span className="text-[11px] text-zinc-500 block">Pode ser informado valor parcial</span>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Meio de Pagamento <span className="text-indigo-400">*</span>
                </label>
                <select
                  value={paymentMethodForm}
                  onChange={(e) => setPaymentMethodForm(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  required
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência">Transferência</option>
                </select>
              </div>

              {/* Observations */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-400 font-mono uppercase block">
                  Observações do Pagamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Comprovante enviado via Whatsapp"
                  value={paymentObservations}
                  onChange={(e) => setPaymentObservations(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0B0D12] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500 transition placeholder:text-zinc-600"
                />
              </div>

              {/* Actions submit button */}
              <div className="flex items-center justify-end gap-3 border-t border-white/[0.07] pt-4">
                <button
                  type="button"
                  onClick={() => setPayingInstallment(null)}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer border border-white/[0.06]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL IMPRESSÃO DE RECIBO DE PAGAMENTO                     */}
      {/* ------------------------------------------------------------- */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white text-zinc-900 border border-zinc-200 rounded-xl max-w-2xl w-full shadow-2xl relative flex flex-col justify-between max-h-[90vh]">
            
            {/* Header controllers */}
            <div className="p-4 bg-zinc-100 border-b border-zinc-200 rounded-t-xl flex items-center justify-between z-10 print:hidden shrink-0">
              <span className="text-xs font-bold text-zinc-700 uppercase font-mono tracking-wide">
                Recibo Digital de Pagamento
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  disabled={isGeneratingPDF}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-zinc-950 font-bold rounded text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  {isGeneratingPDF ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Imprimir / Baixar PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area with elegant typography */}
            <div id="print-receipt-modal" className="p-8 md:p-12 overflow-y-auto font-sans text-sm space-y-6 print:p-0 print:overflow-visible bg-white text-zinc-950">
              
              {/* Receipt Header with brand logo image fallback */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-zinc-800 pb-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center p-1.5 shrink-0">
                    <img
                      src="/assets/logo.png"
                      alt="Casa Colombo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallbackText = document.getElementById("receipt-logo-fallback");
                        if (fallbackText) fallbackText.classList.remove("hidden");
                      }}
                    />
                    <span id="receipt-logo-fallback" className="hidden font-mono font-black text-[10px] text-amber-500 tracking-tighter uppercase">C.C.A</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-mono tracking-wider text-zinc-900 uppercase">
                      Casa Colombo Artesanal
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-medium">Lembranças Finas & Velas Aromáticas Personalizadas</p>
                  </div>
                </div>
                
                {/* Receipt Number */}
                <div className="text-left sm:text-right font-mono">
                  <span className="text-[9px] text-zinc-400 uppercase font-bold block">Recibo de Pagamento</span>
                  <span className="text-sm font-bold text-zinc-900">{viewingReceipt.installment.receipt_number || "REC-000000"}</span>
                </div>
              </div>

              {/* Title Description */}
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold font-mono uppercase tracking-wider text-zinc-900">
                  {viewingReceipt.installment.paid_value && viewingReceipt.installment.paid_value < viewingReceipt.installment.value 
                    ? "RECIBO DE PAGAMENTO PARCIAL" 
                    : "RECIBO DE PAGAMENTO"}
                </h3>
                <p className="text-xs text-zinc-500 font-medium">Controle de Quitação de Lançamentos</p>
              </div>

              {/* Receipt Body content statement */}
              <div className="space-y-4 border border-zinc-200 p-6 rounded-lg bg-zinc-50 leading-relaxed text-zinc-800">
                <p>
                  Recebemos de <strong className="text-zinc-950 font-bold">{viewingReceipt.lead.nome}</strong>
                  {viewingReceipt.lead.local && <span>, residente em <strong>{viewingReceipt.lead.local}</strong>,</span>} a importância líquida de:
                </p>
                
                {/* Grand numeric indicator */}
                <div className="text-center py-3 border-y border-zinc-200/80 my-2">
                  <span className="text-2xl font-mono font-black text-zinc-950">
                    {formatBRL(viewingReceipt.installment.paid_value || viewingReceipt.installment.value)}
                  </span>
                  <span className="block text-[10px] text-zinc-400 font-mono uppercase mt-1">Valor Recebido via {viewingReceipt.installment.payment_method || "Pix"}</span>
                </div>

                <p>
                  Referente à quitação da <strong className="text-zinc-950">{viewingReceipt.installment.installment_number === 0 ? "Entrada" : `${viewingReceipt.installment.installment_number}ª Parcela`}</strong> do 
                  contrato de prestação de serviços número <strong className="font-mono text-zinc-950">{viewingReceipt.contract.contract_number}</strong>, assinado em 
                  <strong> {new Date(viewingReceipt.contract.contract_date + "T12:00:00").toLocaleDateString("pt-BR")}</strong>.
                </p>

                {/* Composição Financeira do Contrato */}
                <div className="mt-4 pt-3 border-t border-zinc-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase font-mono text-zinc-500 block tracking-wider">
                    Composição e Controle do Contrato
                  </span>
                  <div className="bg-white border border-zinc-200 rounded-md p-3 font-mono text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-600">
                      <span>Valor dos Produtos/Serviços:</span>
                      <span className="font-medium text-zinc-900">{formatBRL(viewingReceipt.contract.total_value)}</span>
                    </div>
                    {(viewingReceipt.contract.freight_value ?? 0) > 0 && (
                      <div className="flex justify-between text-zinc-600">
                        <span>(+) Valor do Frete:</span>
                        <span className="font-medium text-zinc-900">+{formatBRL(viewingReceipt.contract.freight_value || 0)}</span>
                      </div>
                    )}
                    {(viewingReceipt.contract.discount_value ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>(-) Desconto Concedido:</span>
                        <span className="font-bold text-emerald-700">-{formatBRL(viewingReceipt.contract.discount_value || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-zinc-950 pt-1.5 border-t border-zinc-200 text-xs">
                      <span>(=) Valor Líquido Total do Contrato:</span>
                      <span>{formatBRL(viewingReceipt.contract.final_value ?? (viewingReceipt.contract.total_value + (viewingReceipt.contract.freight_value || 0) - (viewingReceipt.contract.discount_value || 0)))}</span>
                    </div>
                  </div>
                </div>

                {viewingReceipt.installment.payment_observations && (
                  <p className="text-xs text-zinc-500 italic mt-3 border-l-2 border-zinc-300 pl-3">
                    Observação: {viewingReceipt.installment.payment_observations}
                  </p>
                )}
              </div>

              {/* Metadata details (Dates, Signatures) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase font-mono text-zinc-400 block">Cidade e Data de Emissão</span>
                  <span className="text-zinc-800 font-medium font-mono text-xs">
                    São Vicente, {viewingReceipt.installment.paid_date ? new Date(viewingReceipt.installment.paid_date + "T12:00:00").toLocaleDateString("pt-BR", { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString("pt-BR")}
                  </span>
                </div>
                
                {/* Signature block placeholder */}
                <div className="text-center space-y-4 sm:border-l sm:border-zinc-100 sm:pl-6">
                  <div className="pt-6 border-t border-zinc-300">
                    <span className="text-xs font-bold font-mono text-zinc-800 block">CASA COLOMBO ARTESANAL</span>
                    <span className="text-[9px] text-zinc-400 italic block mt-1">Este recibo é válido como comprovante por chancela eletrônica</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer informational row */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 rounded-b-xl text-center text-[10px] text-zinc-400 shrink-0 print:hidden">
              Seu recibo foi gerado de forma segura via Automação Financeira Casa Colombo Artesanal.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
