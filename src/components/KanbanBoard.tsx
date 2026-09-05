/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, Filter, RefreshCw, MessageSquare, UserCheck, Sparkles, 
  FileText, DollarSign, CheckCircle2, XCircle, PhoneCall, Calendar,
  Users, MessageCircle, Clock, ChevronRight, X, AlertCircle, MapPin,
  Flame, ArrowUpDown, ChevronDown
} from "lucide-react";
import { Lead, StatusConversa, LeadTemperatura } from "../types";
import { useToast } from "./Toast";

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onRefresh: () => Promise<void>;
}

interface ColumnConfig {
  id: StatusConversa;
  title: string;
  description: string;
  dotColor: string;
  topBorderColor: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  icon: React.ElementType;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    id: "NUNCA_RESPONDEU",
    title: "Nunca respondeu",
    description: "Leads sem resposta inicial",
    dotColor: "bg-slate-400 dark:bg-zinc-500",
    topBorderColor: "border-t-slate-400 dark:border-t-zinc-500",
    accentBadgeBg: "bg-slate-100 dark:bg-zinc-800",
    accentBadgeText: "text-slate-700 dark:text-zinc-300",
    icon: MessageSquare
  },
  {
    id: "RESPONDEU",
    title: "Respondeu",
    description: "Iniciou contato inicial",
    dotColor: "bg-sky-500",
    topBorderColor: "border-t-sky-500",
    accentBadgeBg: "bg-sky-50 dark:bg-sky-500/15",
    accentBadgeText: "text-sky-700 dark:text-sky-300",
    icon: PhoneCall
  },
  {
    id: "EM_ATENDIMENTO",
    title: "Em atendimento",
    description: "Conversa em andamento",
    dotColor: "bg-amber-500",
    topBorderColor: "border-t-amber-500",
    accentBadgeBg: "bg-amber-50 dark:bg-amber-500/15",
    accentBadgeText: "text-amber-800 dark:text-amber-300",
    icon: UserCheck
  },
  {
    id: "ESCOLHENDO_MODELO",
    title: "Escolhendo modelo",
    description: "Avaliando produtos e opções",
    dotColor: "bg-violet-500",
    topBorderColor: "border-t-violet-500",
    accentBadgeBg: "bg-violet-50 dark:bg-violet-500/15",
    accentBadgeText: "text-violet-700 dark:text-violet-300",
    icon: Sparkles
  },
  {
    id: "ORCAMENTO_ENVIADO",
    title: "Orçamento enviado",
    description: "Valores e propostas entregues",
    dotColor: "bg-teal-500",
    topBorderColor: "border-t-teal-500",
    accentBadgeBg: "bg-teal-50 dark:bg-teal-500/15",
    accentBadgeText: "text-teal-800 dark:text-teal-300",
    icon: FileText
  },
  {
    id: "NEGOCIACAO",
    title: "Negociação",
    description: "Alinhando contrato e condições",
    dotColor: "bg-orange-500",
    topBorderColor: "border-t-orange-500",
    accentBadgeBg: "bg-orange-50 dark:bg-orange-500/15",
    accentBadgeText: "text-orange-800 dark:text-orange-300",
    icon: DollarSign
  },
  {
    id: "CLIENTE",
    title: "Cliente (Fechou)",
    description: "Convertido / Contrato assinado",
    dotColor: "bg-emerald-500",
    topBorderColor: "border-t-emerald-500",
    accentBadgeBg: "bg-emerald-50 dark:bg-emerald-500/15",
    accentBadgeText: "text-emerald-800 dark:text-emerald-300",
    icon: CheckCircle2
  },
  {
    id: "PERDIDO",
    title: "Perdido",
    description: "Sem interesse ou declinado",
    dotColor: "bg-rose-500",
    topBorderColor: "border-t-rose-500",
    accentBadgeBg: "bg-rose-50 dark:bg-rose-500/15",
    accentBadgeText: "text-rose-800 dark:text-rose-300",
    icon: XCircle
  }
];

// =============================================================================
// HELPER FUNCTIONS (Cálculos e formatações seguros)
// =============================================================================

const PT_MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Calcula o valor potencial estimado do lead segundo regras existentes */
function calculateLeadValue(lead: Lead, miniVelaUnitPrice: number = 8.50): number {
  const guests = Number(lead.convidados) || 0;
  if (guests > 0) {
    return guests * miniVelaUnitPrice;
  }

  const extractVal = (str?: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const v1 = extractVal(lead.soma1);
  if (v1 > 0) return v1;

  const v2 = extractVal(lead.soma2);
  if (v2 > 0) return v2;

  return 0;
}

/** Formata valor monetário em Real brasileiro */
function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Parse seguro de datas de casamento (DD/MM/AAAA ou YYYY-MM-DD) */
function parseWeddingDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  if (cleanStr.includes("/")) {
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        const d = new Date(fullYear, month - 1, day, 12, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  if (cleanStr.includes("-")) {
    const parts = cleanStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const d = new Date(year, month - 1, day, 12, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const parsed = Date.parse(cleanStr);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

/** Helper para calcular dias e formato humanizado para casamento */
function getDaysUntilWedding(dateStr?: string, mesCasamento?: string): { 
  days: number | null; 
  label: string; 
  formattedDisplay: string;
  urgency: "hoje" | "urgente" | "proximo" | "futuro" | "passado" | "indefinido";
  badgeColor: string;
} {
  const parsedDate = parseWeddingDate(dateStr);
  if (!parsedDate) {
    return { 
      days: null, 
      label: mesCasamento ? mesCasamento.trim() : "A definir", 
      formattedDisplay: mesCasamento ? `Mês: ${mesCasamento.trim()}` : "Data a definir",
      urgency: "indefinido",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60 font-medium" 
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  
  const diffTime = targetDate.getTime() - today.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  const dayStr = targetDate.getDate();
  const monthStr = PT_MONTHS_SHORT[targetDate.getMonth()];
  const yearStr = targetDate.getFullYear();
  const formattedDisplay = `${dayStr} ${monthStr} ${yearStr}`;

  if (days === 0) {
    return { 
      days: 0, 
      label: "Hoje!", 
      formattedDisplay,
      urgency: "hoje",
      badgeColor: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 font-bold" 
    };
  } else if (days < 0) {
    const absDays = Math.abs(days);
    return { 
      days, 
      label: absDays === 1 ? "Ontem" : `há ${absDays}d`, 
      formattedDisplay,
      urgency: "passado",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/50 font-semibold" 
    };
  } else if (days <= 30) {
    return { 
      days, 
      label: `em ${days}d (urgente)`, 
      formattedDisplay,
      urgency: "urgente",
      badgeColor: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50 font-bold" 
    };
  } else if (days <= 90) {
    return { 
      days, 
      label: `em ${days}d`, 
      formattedDisplay,
      urgency: "proximo",
      badgeColor: "bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40 font-bold" 
    };
  } else {
    return { 
      days, 
      label: `em ${days}d`, 
      formattedDisplay,
      urgency: "futuro",
      badgeColor: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700/50 font-semibold" 
    };
  }
}

/** Avalia a urgência e próxima ação da Agenda com alta legibilidade */
function getNextActionSummary(lead: Lead) {
  const nextDateStr = lead.proxima_atividade_em || lead.proxima_acao_em;
  if (!nextDateStr || !String(nextDateStr).trim()) {
    return {
      status: "SEM_PASSO" as const,
      dateDisplay: "Sem data",
      actionType: "Sem próximo passo",
      temporalLabel: "Definir na Agenda",
      icon: Clock,
      dateColorClass: "text-slate-600 dark:text-zinc-400 font-medium",
      badgeClass: "text-indigo-600 dark:text-indigo-400 font-bold"
    };
  }

  const clean = String(nextDateStr).trim().slice(0, 10);
  const parts = clean.includes("-") ? clean.split("-").map(Number) : null;
  if (!parts || parts.length !== 3) {
    return {
      status: "FUTURA" as const,
      dateDisplay: clean,
      actionType: lead.tipo_proxima_atividade || "Agendado",
      temporalLabel: "Data agendada",
      icon: Calendar,
      dateColorClass: "text-slate-900 dark:text-zinc-100 font-bold",
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/60 font-semibold"
    };
  }

  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dayMonth = `${targetDate.getDate()} ${PT_MONTHS_SHORT[targetDate.getMonth()]}`;

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return {
      status: "ATRASADA" as const,
      dateDisplay: dayMonth,
      actionType: lead.tipo_proxima_atividade || "Acompanhar",
      temporalLabel: daysLate === 1 ? "atrasada ontem" : `atrasada há ${daysLate}d`,
      icon: AlertCircle,
      dateColorClass: "text-rose-700 dark:text-rose-400 font-bold",
      badgeClass: "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 font-bold"
    };
  }

  if (diffDays === 0) {
    return {
      status: "HOJE" as const,
      dateDisplay: "Hoje",
      actionType: lead.tipo_proxima_atividade || "Retorno acordado",
      temporalLabel: "Foco do dia",
      icon: CheckCircle2,
      dateColorClass: "text-emerald-800 dark:text-emerald-300 font-bold",
      badgeClass: "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 font-bold"
    };
  }

  return {
    status: "FUTURA" as const,
    dateDisplay: dayMonth,
    actionType: lead.tipo_proxima_atividade || "Acompanhar",
    temporalLabel: `em ${diffDays}d`,
    icon: Calendar,
    dateColorClass: "text-slate-900 dark:text-zinc-100 font-bold",
    badgeClass: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700/50 font-semibold"
  };
}

/** Estilo de badge com alto contraste para temperatura */
function getTempBadgeStyle(temp?: string): string {
  const t = String(temp || "FRIA").trim().toUpperCase();
  switch (t) {
    case "QUENTE":
      return "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40";
    case "MORNA":
      return "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40";
    case "CLIENTE":
      return "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40";
    case "FRIA":
    default:
      return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60";
  }
}

// =============================================================================
// COMPONENTE PRINCIPAL KANBAN BOARD
// =============================================================================

export default function KanbanBoard({ leads, onSelectLead, onUpdateLead, onRefresh }: KanbanBoardProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("TODOS");
  const [selectedTemp, setSelectedTemp] = useState("TODOS");
  const [selectedPortal, setSelectedPortal] = useState("TODOS");
  const [sortBy, setSortBy] = useState<"recent" | "wedding" | "value" | "name">("recent");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Drag and drop states
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<StatusConversa | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [miniVelaPrice, setMiniVelaPrice] = useState<number>(8.50);

  // Carrega catálogo de produtos para obter preço da mini vela aromática
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const miniVelaProd = data.find(
              (p: any) =>
                p.id === "mini_vela" ||
                (p.descricao && p.descricao.toLowerCase().includes("mini vela")) ||
                (p.descricao && p.descricao.toLowerCase().includes("vela"))
            );
            if (miniVelaProd && Number(miniVelaProd.valor_unitario) > 0) {
              setMiniVelaPrice(Number(miniVelaProd.valor_unitario));
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar valor da mini vela no Kanban:", err);
      }
    }
    loadProducts();
  }, []);

  // Lista de meses únicos para o filtro
  const monthsList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.mes_casamento && l.mes_casamento.trim()) {
        set.add(l.mes_casamento.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Lista de origens únicas para o filtro
  const portalsList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origem_portal && l.origem_portal.trim()) {
        set.add(l.origem_portal.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtra e ordena os leads
  const filteredAndSortedLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      // Busca textual por nome, telefone, local, email ou id
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (lead.nome || "").toLowerCase().includes(q);
        const emailMatch = (lead.email || "").toLowerCase().includes(q);
        const phoneMatch = (lead.link_celular || "").includes(q);
        const localMatch = (lead.local || "").toLowerCase().includes(q);
        const idMatch = (lead.id || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !localMatch && !idMatch) return false;
      }

      // Filtro de Mês
      if (selectedMonth !== "TODOS") {
        if ((lead.mes_casamento || "").trim() !== selectedMonth) return false;
      }

      // Filtro de Temperatura
      if (selectedTemp !== "TODOS") {
        if (lead.temperatura !== selectedTemp) return false;
      }

      // Filtro de Origem
      if (selectedPortal !== "TODOS") {
        if (lead.origem_portal !== selectedPortal) return false;
      }

      return true;
    });

    // Ordenação
    return filtered.sort((a, b) => {
      if (sortBy === "wedding") {
        const dateA = parseWeddingDate(a.data_casamento)?.getTime() || 9999999999999;
        const dateB = parseWeddingDate(b.data_casamento)?.getTime() || 9999999999999;
        return dateA - dateB;
      }
      if (sortBy === "value") {
        const valA = calculateLeadValue(a, miniVelaPrice);
        const valB = calculateLeadValue(b, miniVelaPrice);
        return valB - valA;
      }
      if (sortBy === "name") {
        return (a.nome || "").localeCompare(b.nome || "");
      }
      // "recent" default
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [leads, searchQuery, selectedMonth, selectedTemp, selectedPortal, sortBy, miniVelaPrice]);

  // Agrupa os leads por status_conversa existente
  const leadsByColumn = useMemo(() => {
    const map: Record<StatusConversa, Lead[]> = {
      NUNCA_RESPONDEU: [],
      RESPONDEU: [],
      EM_ATENDIMENTO: [],
      ESCOLHENDO_MODELO: [],
      ORCAMENTO_ENVIADO: [],
      NEGOCIACAO: [],
      CLIENTE: [],
      PERDIDO: []
    };

    filteredAndSortedLeads.forEach((lead) => {
      const status = lead.status_conversa || "NUNCA_RESPONDEU";
      if (map[status]) {
        map[status].push(lead);
      } else {
        map.NUNCA_RESPONDEU.push(lead);
      }
    });

    return map;
  }, [filteredAndSortedLeads]);

  // Métricas do resumo comercial compacto (sem cards redundantes)
  const commercialSummary = useMemo(() => {
    const activeLeads = filteredAndSortedLeads.filter(
      (l) => (l.status_conversa || "NUNCA_RESPONDEU") !== "PERDIDO"
    );
    const activeCount = activeLeads.length;
    const totalPipelineVal = activeLeads.reduce(
      (sum, l) => sum + calculateLeadValue(l, miniVelaPrice),
      0
    );
    const inNegotiationCount = filteredAndSortedLeads.filter(
      (l) => (l.status_conversa === "NEGOCIACAO" || l.status_funil === "NEGOCIACAO")
    ).length;

    return {
      activeCount,
      totalPipelineVal,
      inNegotiationCount
    };
  }, [filteredAndSortedLeads, miniVelaPrice]);

  // Contagem de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== "TODOS") count++;
    if (selectedTemp !== "TODOS") count++;
    if (selectedPortal !== "TODOS") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedMonth, selectedTemp, selectedPortal, searchQuery]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedMonth("TODOS");
    setSelectedTemp("TODOS");
    setSelectedPortal("TODOS");
    setSortBy("recent");
  };

  // Movimentação de lead via Drag and Drop ou seleção direta
  const handleMoveLead = async (leadId: string, newStatus: StatusConversa) => {
    const targetCol = KANBAN_COLUMNS.find((c) => c.id === newStatus);
    const lead = leads.find((l) => l.id === leadId);

    // Evita chamada inútil se já estiver na mesma coluna
    if (lead && (lead.status_conversa || "NUNCA_RESPONDEU") === newStatus) {
      setDraggingLeadId(null);
      setDragOverColumnId(null);
      return;
    }

    try {
      setIsUpdating(true);
      setMovingLeadId(leadId);
      const res = await fetch(`/api/leads/${leadId}/status-conversa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_conversa: newStatus })
      });

      if (res.ok) {
        toast.success(`Lead movido para "${targetCol?.title || newStatus}".`);
        await onRefresh();
      } else {
        toast.error("Não foi possível atualizar a etapa do lead.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao mover lead.");
    } finally {
      setIsUpdating(false);
      setMovingLeadId(null);
      setDraggingLeadId(null);
      setDragOverColumnId(null);
    }
  };

  // Drag and Drop handlers nativos
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: StatusConversa) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: StatusConversa) => {
    // Apenas limpa se estiver saindo do container atual
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: StatusConversa) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || draggingLeadId;
    if (leadId) {
      handleMoveLead(leadId, columnId);
    }
  };

  const handleRefreshClick = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
      toast.success("Pipeline comercial sincronizado.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao sincronizar dados.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in w-full pb-8">
      
      {/* =========================================================================
          1. CABEÇALHO EDITORIAL & RESUMO COMERCIAL COMPACTO
          ========================================================================= */}
      <div 
        className="rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors space-y-3.5"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-xs" />
              <h1 
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                Pipeline Comercial
              </h1>
            </div>
            <p 
              className="text-xs mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Movimente oportunidades entre as etapas e acompanhe o avanço das negociações.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isRefreshing || isUpdating}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-50 hover:opacity-90 shadow-2xs"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
              title="Sincronizar oportunidades com o banco de dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
            </button>
          </div>
        </div>

        {/* Resumo Comercial Compacto (Uma única linha de contexto, sem mini-cards repetidos) */}
        <div 
          className="pt-2.5 border-t flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs"
          style={{ borderColor: "var(--crm-border-subtle)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm" style={{ color: "var(--crm-text)" }}>
              {commercialSummary.activeCount}
            </span>
            <span style={{ color: "var(--crm-text-secondary)" }}>
              oportunidades ativas
            </span>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(commercialSummary.totalPipelineVal)}
            </span>
            <span style={{ color: "var(--crm-text-secondary)" }}>
              em pipeline
            </span>
          </div>

          <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
              {commercialSummary.inNegotiationCount}
            </span>
            <span style={{ color: "var(--crm-text-secondary)" }}>
              em negociação
            </span>
          </div>

          {hasActiveFilters && (
            <span className="ml-auto text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              (Filtros aplicados: {filteredAndSortedLeads.length} leads visíveis)
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. TOOLBAR COMPACTA: BUSCA, FILTROS E ORDENAÇÃO
          ========================================================================= */}
      <div 
        className="rounded-2xl border p-3 shadow-xs transition-colors space-y-2.5"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          {/* Campo de Busca Rápida */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por noiva, telefone ou local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão de Filtros com Badge de Contagem */}
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              showFilterPanel || hasActiveFilters
                ? "bg-indigo-50 text-indigo-950 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40"
                : "hover:opacity-90"
            }`}
            style={{
              backgroundColor: !(showFilterPanel || hasActiveFilters) ? "var(--crm-surface-subtle)" : undefined,
              borderColor: !(showFilterPanel || hasActiveFilters) ? "var(--crm-border)" : undefined,
              color: !(showFilterPanel || hasActiveFilters) ? "var(--crm-text)" : undefined
            }}
          >
            <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilterPanel ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown de Ordenação */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            >
              <option value="recent">Mais recentes primeiro</option>
              <option value="wedding">Casamento mais próximo</option>
              <option value="value">Maior valor estimado</option>
              <option value="name">Nome da noiva (A-Z)</option>
            </select>
            <ArrowUpDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500" />
          </div>

        </div>

        {/* Painel Expansível de Filtros */}
        {showFilterPanel && (
          <div 
            className="pt-2.5 border-t grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in"
            style={{ borderColor: "var(--crm-border-subtle)" }}
          >
            {/* Filtro Mês */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--crm-text-secondary)" }}>
                Mês do Casamento
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none font-medium"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="TODOS">Todos os meses</option>
                {monthsList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro Temperatura */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--crm-text-secondary)" }}>
                Temperatura do Lead
              </label>
              <select
                value={selectedTemp}
                onChange={(e) => setSelectedTemp(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none font-medium"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="TODOS">Todas as temperaturas</option>
                <option value="QUENTE">Quente</option>
                <option value="MORNA">Morna</option>
                <option value="FRIA">Fria</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </div>

            {/* Filtro Origem */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--crm-text-secondary)" }}>
                Canal de Origem
              </label>
              <select
                value={selectedPortal}
                onChange={(e) => setSelectedPortal(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none font-medium"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="TODOS">Todas as origens</option>
                {portalsList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Chips de Filtros Ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {selectedMonth !== "TODOS" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Mês: {selectedMonth}</span>
                <button type="button" onClick={() => setSelectedMonth("TODOS")} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTemp !== "TODOS" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Temp: {selectedTemp}</span>
                <button type="button" onClick={() => setSelectedTemp("TODOS")} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPortal !== "TODOS" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Canal: {selectedPortal}</span>
                <button type="button" onClick={() => setSelectedPortal("TODOS")} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Busca: "{searchQuery}"</span>
                <button type="button" onClick={() => setSearchQuery("")} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-auto"
            >
              Limpar todos
            </button>
          </div>
        )}

      </div>

      {/* =========================================================================
          3. KANBAN BOARD CONTAINER (Scroll Horizontal Confortável, Colunas Semânticas)
          ========================================================================= */}
      <div className="overflow-x-auto pb-4 pt-1 -mx-2 px-2 scrollbar-thin">
        <div className="flex gap-4 min-w-[2480px] items-stretch">
          
          {KANBAN_COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const columnLeads = leadsByColumn[column.id] || [];
            const columnTotalVal = columnLeads.reduce(
              (sum, l) => sum + calculateLeadValue(l, miniVelaPrice), 
              0
            );
            const isTargetColumn = dragOverColumnId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`w-[300px] shrink-0 rounded-2xl flex flex-col transition-all duration-150 border border-t-4 ${column.topBorderColor} ${
                  isTargetColumn 
                    ? "ring-2 ring-indigo-500/30 border-indigo-500 shadow-md scale-[1.005]" 
                    : "shadow-xs"
                }`}
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: isTargetColumn ? undefined : "var(--crm-border)"
                }}
              >
                {/* Cabeçalho da Coluna (Etapa, Contagem, Valor Acumulado e Descrição) */}
                <div 
                  className="p-3.5 border-b rounded-t-xl flex flex-col gap-2 shrink-0 transition-colors"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)"
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${column.dotColor}`} />
                      <h3 
                        className="text-xs font-bold truncate"
                        style={{ color: "var(--crm-text)" }}
                        title={column.title}
                      >
                        {column.title}
                      </h3>
                    </div>

                    <span 
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)"
                      }}
                    >
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-100 dark:border-zinc-800">
                    <span 
                      className="text-[11px] truncate font-medium max-w-[150px]"
                      style={{ color: "var(--crm-text-secondary)" }}
                      title={column.description}
                    >
                      {column.description}
                    </span>
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                      {formatCurrency(columnTotalVal)}
                    </span>
                  </div>
                </div>

                {/* Área de Cards com Drop Zone & Scroll Vertical Confortável */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 max-h-[calc(100vh-270px)] min-h-[380px]">
                  
                  {columnLeads.length === 0 ? (
                    /* Empty State Compacto */
                    <div 
                      className="h-32 border border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center transition-colors"
                      style={{
                        borderColor: "var(--crm-border-strong)",
                        backgroundColor: isTargetColumn ? "var(--crm-surface)" : "transparent"
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                        Nenhuma oportunidade nesta etapa
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--crm-text-muted)" }}>
                        Arraste uma oportunidade para cá
                      </p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const estimatedVal = calculateLeadValue(lead, miniVelaPrice);
                      const weddingInfo = getDaysUntilWedding(lead.data_casamento, lead.mes_casamento);
                      const nextAction = getNextActionSummary(lead);
                      const NextActionIcon = nextAction.icon;
                      const isDragging = draggingLeadId === lead.id;
                      const isBeingMoved = movingLeadId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable={!isUpdating}
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => onSelectLead(lead.id)}
                          className={`rounded-xl p-3 space-y-2.5 cursor-grab active:cursor-grabbing transition duration-150 border shadow-2xs group relative ${
                            isDragging 
                              ? "opacity-40 scale-[0.98] ring-2 ring-indigo-500 border-indigo-500" 
                              : "hover:shadow-sm"
                          }`}
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)"
                          }}
                        >
                          {/* Indicador de carregamento localizado se o lead estiver sendo movido */}
                          {isBeingMoved && (
                            <div className="absolute inset-0 rounded-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                            </div>
                          )}

                          {/* 1. QUEM & SITUAÇÃO: Nome da Noiva, Temperatura e Origem */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <h4 
                                className="text-xs font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
                                style={{ color: "var(--crm-text)" }}
                                title={lead.nome}
                              >
                                {lead.nome}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold truncate" style={{ color: "var(--crm-text-secondary)" }}>
                                  {lead.origem_portal || "Manual"}
                                </span>
                                <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>•</span>
                                <span className="text-[10px] font-mono" style={{ color: "var(--crm-text-muted)" }}>
                                  #{lead.id.slice(0, 8)}
                                </span>
                              </div>
                            </div>

                            {/* Badge de Temperatura */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${getTempBadgeStyle(lead.temperatura)}`}>
                              {String(lead.temperatura || "FRIA").trim().toUpperCase()}
                            </span>
                          </div>

                          {/* 2. CASAMENTO & LOCAL: Data Humana + Dias + Local/Convidados */}
                          <div 
                            className="p-2 rounded-lg text-[11px] border space-y-1"
                            style={{
                              backgroundColor: "var(--crm-surface-subtle)",
                              borderColor: "var(--crm-border-subtle)"
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 truncate">
                                <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="font-bold truncate" style={{ color: "var(--crm-text)" }}>
                                  {weddingInfo.formattedDisplay}
                                </span>
                              </div>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] border ${weddingInfo.badgeColor} shrink-0`}>
                                {weddingInfo.label}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] pt-0.5" style={{ color: "var(--crm-text-secondary)" }}>
                              <div className="flex items-center gap-1 truncate max-w-[170px]" title={lead.local || "Local não informado"}>
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                                <span className="truncate font-medium">{lead.local || "Não inf."}</span>
                              </div>
                              <div className="flex items-center gap-1 font-semibold shrink-0" style={{ color: "var(--crm-text)" }}>
                                <Users className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                                <span>{lead.convidados} conv.</span>
                              </div>
                            </div>
                          </div>

                          {/* 3. PRÓXIMO PASSO DA AGENDA (Crítico para tomada de ação) */}
                          <div 
                            className="p-2 rounded-lg border flex items-center justify-between gap-2"
                            style={{
                              backgroundColor: "var(--crm-surface-subtle)",
                              borderColor: "var(--crm-border-subtle)"
                            }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <NextActionIcon className={`w-3.5 h-3.5 shrink-0 ${
                                nextAction.status === "ATRASADA" 
                                  ? "text-rose-600 dark:text-rose-400" 
                                  : nextAction.status === "HOJE" 
                                  ? "text-emerald-600 dark:text-emerald-400" 
                                  : "text-indigo-600 dark:text-indigo-400"
                              }`} />
                              <div className="min-w-0">
                                <span className={`text-[11px] block truncate ${nextAction.dateColorClass}`}>
                                  {nextAction.status === "SEM_PASSO" ? "Sem próximo passo" : `${nextAction.dateDisplay} · ${nextAction.actionType}`}
                                </span>
                              </div>
                            </div>

                            <span className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${nextAction.badgeClass}`}>
                              {nextAction.temporalLabel}
                            </span>
                          </div>

                          {/* 4. VALOR ESTIMADO & AÇÕES RÁPIDAS (WhatsApp e Ficha) */}
                          <div 
                            className="flex items-center justify-between pt-1 border-t text-xs gap-2"
                            style={{ borderColor: "var(--crm-border-subtle)" }}
                          >
                            {/* Valor Estimado Discreto */}
                            <div className="flex items-baseline gap-1 min-w-0">
                              <span className="text-[10px] font-medium" style={{ color: "var(--crm-text-secondary)" }}>
                                Estimado:
                              </span>
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate">
                                {estimatedVal > 0 ? formatCurrency(estimatedVal) : "Sob Consulta"}
                              </span>
                            </div>

                            {/* Ações: WhatsApp direto e Abertura de Ficha */}
                            <div className="flex items-center gap-1 shrink-0">
                              {lead.link_celular ? (
                                <a
                                  href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Enviar WhatsApp para ${lead.nome}`}
                                  aria-label={`Enviar WhatsApp para ${lead.nome}`}
                                  className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40 transition cursor-pointer"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              ) : null}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectLead(lead.id);
                                }}
                                title="Abrir Ficha Completa do Lead"
                                className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border"
                                style={{
                                  backgroundColor: "var(--crm-surface-subtle)",
                                  borderColor: "var(--crm-border)",
                                  color: "var(--crm-text)"
                                }}
                              >
                                <span>Ficha</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                          </div>

                        </div>
                      );
                    })
                  )}

                </div>
              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
