/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Search, Filter, RefreshCw, MessageSquare, UserCheck, Sparkles, 
  FileText, DollarSign, CheckCircle2, XCircle, PhoneCall, Calendar,
  Users, ArrowRight, MessageCircle, Clock, ExternalLink, SlidersHorizontal, ChevronRight, X, GripVertical
} from "lucide-react";
import { Lead, StatusConversa, LeadTemperatura } from "../types";
import { useToast } from "./Toast";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { SearchInput } from "./ui/SearchInput";
import { Select } from "./ui/Select";

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
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    id: "NUNCA_RESPONDEU",
    title: "Nunca respondeu",
    description: "Leads sem nenhuma resposta",
    color: "text-zinc-400",
    bgColor: "bg-zinc-900/60",
    borderColor: "border-zinc-800",
    badgeBg: "bg-zinc-800/80",
    badgeText: "text-zinc-300",
    icon: MessageSquare
  },
  {
    id: "RESPONDEU",
    title: "Respondeu",
    description: "Iniciou contato inicial",
    color: "text-sky-400",
    bgColor: "bg-sky-950/20",
    borderColor: "border-sky-850/40",
    badgeBg: "bg-sky-900/40",
    badgeText: "text-sky-300",
    icon: PhoneCall
  },
  {
    id: "EM_ATENDIMENTO",
    title: "Em atendimento",
    description: "Conversa em andamento",
    color: "text-amber-400",
    bgColor: "bg-amber-950/20",
    borderColor: "border-amber-850/40",
    badgeBg: "bg-amber-900/40",
    badgeText: "text-amber-300",
    icon: UserCheck
  },
  {
    id: "ESCOLHENDO_MODELO",
    title: "Escolhendo modelo",
    description: "Avaliando opções de produtos",
    color: "text-indigo-400",
    bgColor: "bg-indigo-950/20",
    borderColor: "border-indigo-850/40",
    badgeBg: "bg-indigo-900/40",
    badgeText: "text-indigo-300",
    icon: Sparkles
  },
  {
    id: "ORCAMENTO_ENVIADO",
    title: "Orçamento enviado",
    description: "Valores e propostas entregues",
    color: "text-teal-400",
    bgColor: "bg-teal-950/20",
    borderColor: "border-teal-850/40",
    badgeBg: "bg-teal-900/40",
    badgeText: "text-teal-300",
    icon: FileText
  },
  {
    id: "NEGOCIACAO",
    title: "Negociação",
    description: "Alinhando contrato e condições",
    color: "text-orange-400",
    bgColor: "bg-orange-950/20",
    borderColor: "border-orange-850/40",
    badgeBg: "bg-orange-900/40",
    badgeText: "text-orange-300",
    icon: DollarSign
  },
  {
    id: "CLIENTE",
    title: "Cliente (Fechou)",
    description: "Contrato assinado / Convertido",
    color: "text-emerald-400",
    bgColor: "bg-emerald-950/20",
    borderColor: "border-emerald-850/40",
    badgeBg: "bg-emerald-900/40",
    badgeText: "text-emerald-300",
    icon: CheckCircle2
  },
  {
    id: "PERDIDO",
    title: "Perdido",
    description: "Desistiu ou sem interesse",
    color: "text-rose-400",
    bgColor: "bg-rose-950/20",
    borderColor: "border-rose-850/40",
    badgeBg: "bg-rose-900/40",
    badgeText: "text-rose-300",
    icon: XCircle
  }
];

// Calculate estimated potential financial value for a lead
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

// Format numbers as Brazilian Real currency
function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Calculate days elapsed since creation
function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default function KanbanBoard({ leads, onSelectLead, onUpdateLead, onRefresh }: KanbanBoardProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("TODOS");
  const [selectedTemp, setSelectedTemp] = useState("TODOS");
  const [selectedPortal, setSelectedPortal] = useState("TODOS");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<StatusConversa | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [miniVelaPrice, setMiniVelaPrice] = useState<number>(8.50);

  // Fetch configured products to get exact unit price for mini vela aromática
  React.useEffect(() => {
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

  // Extract unique wedding months for filter dropdown
  const monthsList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.mes_casamento && l.mes_casamento.trim()) {
        set.add(l.mes_casamento.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Extract unique portal sources
  const portalsList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.origem_portal && l.origem_portal.trim()) {
        set.add(l.origem_portal.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filter leads based on user search & dropdowns
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = lead.nome.toLowerCase().includes(q);
        const emailMatch = lead.email.toLowerCase().includes(q);
        const phoneMatch = (lead.link_celular || "").includes(q);
        const idMatch = lead.id.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !idMatch) return false;
      }

      // Month filter
      if (selectedMonth !== "TODOS") {
        if ((lead.mes_casamento || "").trim() !== selectedMonth) return false;
      }

      // Temp filter
      if (selectedTemp !== "TODOS") {
        if (lead.temperatura !== selectedTemp) return false;
      }

      // Portal filter
      if (selectedPortal !== "TODOS") {
        if (lead.origem_portal !== selectedPortal) return false;
      }

      return true;
    });
  }, [leads, searchQuery, selectedMonth, selectedTemp, selectedPortal]);

  // Group leads by status_conversa
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

    filteredLeads.forEach((lead) => {
      const status = lead.status_conversa || "NUNCA_RESPONDEU";
      if (map[status]) {
        map[status].push(lead);
      } else {
        map.NUNCA_RESPONDEU.push(lead);
      }
    });

    return map;
  }, [filteredLeads]);

  // Total potential pipeline value
  const totalPipelineValue = useMemo(() => {
    return filteredLeads
      .filter((l) => (l.status_conversa || "NUNCA_RESPONDEU") !== "PERDIDO")
      .reduce((sum, l) => sum + calculateLeadValue(l, miniVelaPrice), 0);
  }, [filteredLeads, miniVelaPrice]);

  // Move Lead Status (Drag and Drop / Direct Action)
  const handleMoveLead = async (leadId: string, newStatus: StatusConversa) => {
    try {
      setIsUpdating(true);
      const res = await fetch(`/api/leads/${leadId}/status-conversa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_conversa: newStatus })
      });

      if (res.ok) {
        toast.success(`Status da conversa atualizado para "${KANBAN_COLUMNS.find(c => c.id === newStatus)?.title}"!`);
        await onRefresh();
      } else {
        toast.error("Erro ao atualizar status da conversa.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede ao mover lead.");
    } finally {
      setIsUpdating(false);
      setDraggingLeadId(null);
      setDragOverColumnId(null);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: StatusConversa) => {
    e.preventDefault();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: StatusConversa) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain") || draggingLeadId;
    if (leadId) {
      handleMoveLead(leadId, columnId);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in w-full pb-12">
      
      {/* Top Banner & Header Overview */}
      <div className="bg-[#12151C] border border-white/[0.06] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Pipeline Comercial
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Acompanhamento de negociação por estágios com cálculo de potencial de conversão
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-[#0B0D12] border border-white/[0.06] rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] uppercase font-medium text-zinc-400 tracking-wider block">
                Valor Total em Pipeline
              </span>
              <span className="text-sm font-bold text-indigo-400 font-mono">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5 text-zinc-400" />}
              onClick={onRefresh}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Column Stage Overview Metrics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {KANBAN_COLUMNS.map((col) => {
            const count = (leadsByColumn[col.id] || []).length;
            const val = (leadsByColumn[col.id] || []).reduce((s, l) => s + calculateLeadValue(l, miniVelaPrice), 0);
            return (
              <div 
                key={col.id}
                className="p-2.5 rounded-xl border border-white/[0.04] bg-[#181C26] flex flex-col justify-between transition hover:border-white/[0.1]"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-medium truncate ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                    {count}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-zinc-300 font-mono">
                  {formatCurrency(val)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter and Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-white/[0.04]">
          
          {/* Search bar */}
          <SearchInput
            placeholder="Buscar por nome, e-mail, telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            className="w-full text-xs"
          />

          {/* Month Filter */}
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            options={[
              { value: "TODOS", label: "Mês do Evento (Todos)" },
              ...monthsList.map((m) => ({ value: m, label: m }))
            ]}
          />

          {/* Temperature Filter */}
          <Select
            value={selectedTemp}
            onChange={(e) => setSelectedTemp(e.target.value)}
            options={[
              { value: "TODOS", label: "Todas Temperaturas" },
              { value: "FRIA", label: "Fria" },
              { value: "MORNA", label: "Morna" },
              { value: "QUENTE", label: "Quente" },
              { value: "CLIENTE", label: "Cliente" }
            ]}
          />

          {/* Portal Source Filter */}
          <Select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            options={[
              { value: "TODOS", label: "Todas as Origens" },
              ...portalsList.map((p) => ({ value: p, label: p }))
            ]}
          />

        </div>

      </div>

      {/* Kanban Board Horizontal Scrollable Columns Container */}
      <div className="overflow-x-auto pb-6 pt-1 -mx-2 px-2 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="flex gap-3.5 min-w-[2100px] items-stretch">
          
          {KANBAN_COLUMNS.map((column) => {
            const ColumnIcon = column.icon;
            const columnLeads = leadsByColumn[column.id] || [];
            const columnTotalVal = columnLeads.reduce((sum, l) => sum + calculateLeadValue(l, miniVelaPrice), 0);
            const isTargetColumn = dragOverColumnId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`w-[264px] shrink-0 rounded-2xl flex flex-col transition-all duration-150 border ${
                  isTargetColumn 
                    ? "border-indigo-500 bg-[#141824] ring-2 ring-indigo-500/20" 
                    : "border-white/[0.06] bg-[#12151C]"
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/[0.04] flex flex-col gap-1.5 shrink-0 bg-[#0E1118]/80 rounded-t-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0">
                        <ColumnIcon className={`w-3 h-3 ${column.color}`} />
                      </div>
                      <h3 className="text-xs font-semibold text-zinc-100 truncate">{column.title}</h3>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 shrink-0">
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="text-[10px] truncate text-zinc-400">{column.description}</span>
                    <span className="font-mono font-medium text-indigo-400 text-xs">
                      {formatCurrency(columnTotalVal)}
                    </span>
                  </div>
                </div>

                {/* Column Cards Drop Area */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5 max-h-[calc(100vh-320px)] min-h-[320px]">
                  
                  {columnLeads.length === 0 ? (
                    <div className="h-28 border border-dashed border-white/[0.06] rounded-xl flex flex-col items-center justify-center p-3 text-center">
                      <p className="text-xs text-zinc-500 font-medium">Sem noivas nesta etapa</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Arraste um card para cá</p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const estimatedVal = calculateLeadValue(lead, miniVelaPrice);
                      const daysAgo = getDaysSince(lead.created_at);
                      const isDragging = draggingLeadId === lead.id;

                      const tempVariant = 
                        lead.temperatura === "QUENTE" ? "hot" :
                        lead.temperatura === "MORNA" ? "warm" :
                        lead.temperatura === "CLIENTE" ? "success" : "cold";

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => onSelectLead(lead.id)}
                          className={`bg-[#181C26] border border-white/[0.06] hover:border-white/[0.14] rounded-xl p-3 space-y-2.5 cursor-grab active:cursor-grabbing transition shadow-xs group relative ${
                            isDragging ? "opacity-30 scale-95 border-indigo-500" : ""
                          }`}
                        >
                          {/* Card Header: Bride Name & Temp */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition truncate">
                                {lead.nome}
                              </h4>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                {lead.origem_portal} • #{lead.id}
                              </p>
                            </div>

                            <Badge variant={tempVariant} size="sm">
                              {lead.temperatura}
                            </Badge>
                          </div>

                          {/* Wedding Metadata Info */}
                          <div className="grid grid-cols-2 gap-1 py-1.5 px-2 bg-[#0B0D12] rounded-lg text-[10px] text-zinc-300 border border-white/[0.04]">
                            <div className="flex items-center gap-1.5 truncate">
                              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{lead.mes_casamento || lead.data_casamento || "Sem data"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate justify-end">
                              <Users className="w-3 h-3 text-sky-400 shrink-0" />
                              <span className="font-mono font-medium">{lead.convidados} conv.</span>
                            </div>
                          </div>

                          {/* Budget & Potential Value Indicator */}
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <span className="text-[10px] text-zinc-400">Valor Estimado:</span>
                            <span className="font-mono font-medium text-indigo-400">
                              {estimatedVal > 0 ? formatCurrency(estimatedVal) : "Sob Consulta"}
                            </span>
                          </div>

                          {/* Automated Funnel Stage Indicator */}
                          <div className="text-[10px] text-zinc-400 bg-[#0B0D12]/70 px-2 py-1 rounded-md border border-white/[0.04] truncate flex items-center justify-between">
                            <span className="truncate">Automação: <strong className="text-zinc-200 font-medium">{lead.etapa_contato}</strong></span>
                            <span className="text-zinc-500 shrink-0 ml-1">{daysAgo}d</span>
                          </div>

                          {/* Footer Actions (WhatsApp & Open Details) */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] gap-2">
                            {lead.link_celular ? (
                              <a
                                href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition py-0.5 px-1.5 rounded hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-zinc-500">Sem telefone</span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLead(lead.id);
                              }}
                              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white font-medium transition py-0.5 px-1.5 rounded hover:bg-white/[0.06] cursor-pointer"
                            >
                              <span>Ficha</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
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
