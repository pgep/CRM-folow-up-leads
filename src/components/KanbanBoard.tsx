/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Search, Filter, RefreshCw, MessageSquare, UserCheck, Sparkles, 
  FileText, DollarSign, CheckCircle2, XCircle, PhoneCall, Calendar,
  Users, ArrowRight, MessageCircle, Clock, ExternalLink, SlidersHorizontal, ChevronRight
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
    <div className="space-y-6 animate-fade-in w-full pb-12">
      
      {/* Top Banner & Header Overview */}
      <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#89F0B2] animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-wide font-mono uppercase">
                PIPELINE COMERCIAL (KANBAN)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Gestão visual do status real da negociação com as noivas • Totalmente separado da Esteira de Automação
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-right">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block">
                Valor Potencial Total
              </span>
              <span className="text-base font-bold text-[#89F0B2] font-mono">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>

            <button
              onClick={onRefresh}
              className="p-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition border border-zinc-800 flex items-center gap-1.5 text-xs font-semibold"
              title="Atualizar Kanban"
            >
              <RefreshCw className="w-4 h-4 text-[#89F0B2]" />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
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
                className={`p-2.5 rounded-xl border ${col.borderColor} ${col.bgColor} flex flex-col justify-between transition hover:border-zinc-700`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-bold truncate ${col.color}`}>
                    {col.title}
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded ${col.badgeBg} ${col.badgeText}`}>
                    {count}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-300 font-mono">
                  {formatCurrency(val)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter and Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome da noiva, e-mail, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#89F0B2]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#89F0B2] font-medium"
            >
              <option value="TODOS">Todos os Meses</option>
              {monthsList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Temperature Filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={selectedTemp}
              onChange={(e) => setSelectedTemp(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#89F0B2] font-medium"
            >
              <option value="TODOS">Todas as Temps</option>
              <option value="FRIA">FRIA</option>
              <option value="MORNA">MORNA</option>
              <option value="QUENTE">QUENTE</option>
              <option value="CLIENTE">CLIENTE</option>
            </select>
          </div>

          {/* Portal Source Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#89F0B2] font-medium"
            >
              <option value="TODOS">Todas as Origens</option>
              {portalsList.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Kanban Board Horizontal Scrollable Columns Container */}
      <div className="overflow-x-auto pb-6 pt-1 -mx-2 px-2 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="flex gap-4 min-w-[2100px] items-stretch">
          
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
                className={`w-[260px] shrink-0 rounded-2xl flex flex-col transition-all duration-200 border ${
                  isTargetColumn 
                    ? "border-[#89F0B2] bg-zinc-900/90 ring-2 ring-[#89F0B2]/20" 
                    : `${column.borderColor} ${column.bgColor}`
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-zinc-850/80 flex flex-col gap-1.5 shrink-0 bg-zinc-950/40 rounded-t-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ColumnIcon className={`w-4 h-4 shrink-0 ${column.color}`} />
                      <h3 className="text-xs font-bold text-white truncate">{column.title}</h3>
                    </div>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${column.badgeBg} ${column.badgeText} shrink-0`}>
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="truncate">{column.description}</span>
                    <span className="font-mono font-bold text-[#89F0B2]">
                      {formatCurrency(columnTotalVal)}
                    </span>
                  </div>
                </div>

                {/* Column Cards Drop Area */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[calc(100vh-320px)] min-h-[300px]">
                  
                  {columnLeads.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-zinc-800/60 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-[11px] text-zinc-600 font-medium">Sem noivas nesta etapa</p>
                      <p className="text-[9px] text-zinc-700 mt-0.5">Arraste um card para mover</p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const estimatedVal = calculateLeadValue(lead, miniVelaPrice);
                      const daysAgo = getDaysSince(lead.created_at);
                      const isDragging = draggingLeadId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => onSelectLead(lead.id)}
                          className={`bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-3.5 space-y-3 cursor-grab active:cursor-grabbing transition shadow-lg hover:shadow-black/50 group relative ${
                            isDragging ? "opacity-40 scale-95 border-amber-500" : ""
                          }`}
                        >
                          {/* Card Header: Bride Name & Temp */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-[#89F0B2] transition truncate">
                                {lead.nome}
                              </h4>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                {lead.origem_portal} • ID: {lead.id}
                              </p>
                            </div>

                            <span
                              className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                lead.temperatura === "QUENTE"
                                  ? "bg-rose-950/80 text-rose-400 border border-rose-800/50"
                                  : lead.temperatura === "MORNA"
                                  ? "bg-amber-950/80 text-amber-400 border border-amber-800/50"
                                  : lead.temperatura === "CLIENTE"
                                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                                  : "bg-blue-950/80 text-blue-400 border border-blue-800/50"
                              }`}
                            >
                              {lead.temperatura}
                            </span>
                          </div>

                          {/* Wedding Metadata Info */}
                          <div className="grid grid-cols-2 gap-1.5 py-1 px-2 bg-zinc-950/50 rounded-lg text-[10px] text-zinc-400 border border-zinc-850">
                            <div className="flex items-center gap-1.5 truncate">
                              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{lead.mes_casamento || lead.data_casamento || "Sem data"}</span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate justify-end">
                              <Users className="w-3 h-3 text-sky-400 shrink-0" />
                              <span className="font-mono font-semibold">{lead.convidados} conv.</span>
                            </div>
                          </div>

                          {/* Budget & Potential Value Indicator */}
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="text-[10px] text-zinc-500">Valor Estimado:</span>
                            <span className="font-mono font-bold text-[#89F0B2]">
                              {estimatedVal > 0 ? formatCurrency(estimatedVal) : "Sob Consulta"}
                            </span>
                          </div>

                          {/* Automated Funnel Stage Indicator */}
                          <div className="text-[9px] text-zinc-500 bg-zinc-950/30 p-1.5 rounded border border-zinc-850/60 truncate flex items-center justify-between">
                            <span className="truncate">Automação: <strong className="text-zinc-300">{lead.etapa_contato}</strong></span>
                            <span className="font-mono text-zinc-500">{daysAgo}d</span>
                          </div>

                          {/* Footer Actions (WhatsApp & Open Details) */}
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-850/80 gap-2">
                            {lead.link_celular ? (
                              <a
                                href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition py-1 px-2 rounded hover:bg-emerald-950/30"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-zinc-600">Sem telefone</span>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLead(lead.id);
                              }}
                              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white font-medium transition py-1 px-2 rounded hover:bg-zinc-800"
                            >
                              <span>Detalhes</span>
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
