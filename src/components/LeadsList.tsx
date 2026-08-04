/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Plus, Calendar, User, Phone, Mail, ChevronRight, Calculator, RefreshCw, Star, ArrowUpDown, X, Download, Flame, MessageCircle, MapPin, Clock, Zap } from "lucide-react";
import { Lead, LeadStatus, LeadTemperatura, PortalSource } from "../types";

interface LeadsListProps {
  leads: Lead[];
  portals: PortalSource[];
  onSelectLead: (id: string) => void;
  onAddManualLead: (formData: any) => Promise<void>;
  onRefresh: () => void;
  onSwitchTab?: (tab: "sheet_import") => void;
  initialNegociacaoOnly?: boolean;
  onClearNegociacaoOnly?: () => void;
}

export interface LastInteractionDetails {
  dateStr: string;
  formattedDate: string;
  acao: string;
  origem: string;
  canalIcon: "whatsapp" | "email" | "manual" | "system";
}

export function getLastInteractionInfo(lead: Lead): LastInteractionDetails {
  if (lead.ultima_interacao_acao) {
    const rawDate = lead.ultima_interacao_em || lead.updated_at || lead.created_at || new Date().toISOString();
    const d = new Date(rawDate);
    const formattedDate = !isNaN(d.getTime())
      ? `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : rawDate;

    let canalIcon: "whatsapp" | "email" | "manual" | "system" = "system";
    const acaoLower = (lead.ultima_interacao_acao || "").toLowerCase();
    if (acaoLower.includes("whatsapp") || acaoLower.includes("wa")) canalIcon = "whatsapp";
    else if (acaoLower.includes("email") || acaoLower.includes("e-mail")) canalIcon = "email";
    else if (acaoLower.includes("manual") || acaoLower.includes("crm")) canalIcon = "manual";

    return {
      dateStr: rawDate,
      formattedDate,
      acao: lead.ultima_interacao_acao,
      origem: lead.ultima_interacao_origem || "CRM",
      canalIcon
    };
  }

  // Legacy fallback calculations (no data loss for production records)
  const createdTime = lead.created_at ? new Date(lead.created_at).getTime() : 0;
  const updatedTime = lead.updated_at ? new Date(lead.updated_at).getTime() : 0;
  const waTime = lead.ultimo_whatsapp_em ? new Date(lead.ultimo_whatsapp_em).getTime() : 0;
  const emailTime = lead.ultimo_email_em ? new Date(lead.ultimo_email_em).getTime() : 0;
  const lastTime = lead.ultima_interacao_em ? new Date(lead.ultima_interacao_em).getTime() : 0;

  const maxTime = Math.max(createdTime, updatedTime, waTime, emailTime, lastTime);
  const eventDate = maxTime > 0 ? new Date(maxTime) : new Date();
  const formattedDate = !isNaN(eventDate.getTime())
    ? `${eventDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} ${eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  if (waTime > 0 && waTime === maxTime && waTime > createdTime + 1000) {
    return {
      dateStr: lead.ultimo_whatsapp_em!,
      formattedDate,
      acao: `WhatsApp Enviado (${lead.etapa_contato || 'Disparo'})`,
      origem: "Automação V2",
      canalIcon: "whatsapp"
    };
  }

  if (emailTime > 0 && emailTime === maxTime && emailTime > createdTime + 1000) {
    return {
      dateStr: lead.ultimo_email_em!,
      formattedDate,
      acao: `E-mail Enviado (${lead.etapa_contato || 'Envio'})`,
      origem: "Automação V2",
      canalIcon: "email"
    };
  }

  if (updatedTime > createdTime + 60000 && updatedTime === maxTime) {
    return {
      dateStr: lead.updated_at,
      formattedDate,
      acao: "Atualização de Status",
      origem: "Manual / CRM",
      canalIcon: "manual"
    };
  }

  const rawPortal = lead.origem_portal || "Portal / Manual";
  let origemDisplay = rawPortal;
  if (rawPortal.toLowerCase().includes("sheet") || rawPortal.toLowerCase().includes("planilha")) {
    origemDisplay = "Importação Planilha";
  } else if (rawPortal.toLowerCase().includes("noivas")) {
    origemDisplay = "Portal Noivas";
  } else if (rawPortal.toLowerCase().includes("casamentos")) {
    origemDisplay = "Casamentos.com.br";
  } else if (rawPortal.toLowerCase().includes("zankyou")) {
    origemDisplay = "Zankyou";
  } else if (rawPortal.toLowerCase().includes("manual")) {
    origemDisplay = "Cadastro Manual";
  }

  return {
    dateStr: lead.created_at || new Date().toISOString(),
    formattedDate,
    acao: "Lead Cadastrado",
    origem: origemDisplay,
    canalIcon: "system"
  };
}

// Helper to calculate days until wedding/event
export function getDaysUntilWedding(dateStr?: string): { days: number | null; label: string; badgeColor: string } {
  if (!dateStr) return { days: null, label: "N/I", badgeColor: "bg-zinc-800/80 text-zinc-500 border-zinc-700/60" };

  const cleanStr = dateStr.trim();
  if (!cleanStr) return { days: null, label: "N/I", badgeColor: "bg-zinc-800/80 text-zinc-500 border-zinc-700/60" };

  let d: Date | null = null;
  const parts = cleanStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      d = new Date(fullYear, month - 1, day);
    }
  } else {
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      d = new Date(parsed);
    }
  }

  if (!d || isNaN(d.getTime())) {
    return { days: null, label: "N/I", badgeColor: "bg-zinc-800/80 text-zinc-500 border-zinc-700/60" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffTime = d.getTime() - today.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return { days: 0, label: "Hoje!", badgeColor: "bg-[#89F0B2]/20 text-[#89F0B2] border-[#89F0B2]/40 font-bold animate-pulse" };
  } else if (days < 0) {
    return { days, label: `${Math.abs(days)}d atrás`, badgeColor: "bg-zinc-800/80 text-zinc-500 border-zinc-700/60" };
  } else if (days <= 30) {
    return { days, label: `${days}d (Urgente)`, badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold" };
  } else if (days <= 90) {
    return { days, label: `${days}d restantes`, badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold" };
  } else {
    return { days, label: `${days}d restantes`, badgeColor: "bg-[#89F0B2]/15 text-[#89F0B2] border-[#89F0B2]/30 font-semibold" };
  }
}

export default function LeadsList({ 
  leads, 
  portals, 
  onSelectLead, 
  onAddManualLead, 
  onRefresh, 
  onSwitchTab,
  initialNegociacaoOnly,
  onClearNegociacaoOnly
}: LeadsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | "ALL">("ALL");
  const [selectedStatusConversa, setSelectedStatusConversa] = useState<string | "ALL">("ALL");
  const [selectedTemp, setSelectedTemp] = useState<string | "ALL">("ALL");
  const [selectedPortal, setSelectedPortal] = useState<string | "ALL">("ALL");
  const [negociacaoFilterOnly, setNegociacaoFilterOnly] = useState(initialNegociacaoOnly || false);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [sortField, setSortField] = useState<"ultima_interacao" | "nome" | "convidados" | "data_casamento" | "dias_evento">("ultima_interacao");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    if (initialNegociacaoOnly !== undefined) {
      setNegociacaoFilterOnly(initialNegociacaoOnly);
    }
  }, [initialNegociacaoOnly]);

  // Dynamic Options states
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);

  React.useEffect(() => {
    fetch("/api/settings")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {} as any;
      })
      .then((data: any) => {
        if (data && data.status_funil) setStatusList(data.status_funil);
        if (data && data.temperaturas) setTempsList(data.temperaturas);
      })
      .catch(err => console.error("Erro ao carregar listas dinâmicas em LeadsList:", err));
  }, []);

  const mapLegacyValue = (field: string, val: string): string => {
    if (!val) return val;
    const upperVal = val.toUpperCase().trim();
    if (field === "status_funil") {
      switch (upperVal) {
        case "NOVO": return "Primeiro Contato";
        case "PRIMEIRO_CONTATO": return "Primeiro Contato";
        case "FOLLOWUP1": return "Follow-up 1";
        case "FOLLOWUP2": return "Follow-up 2";
        case "FOLLOWUP3": return "Follow-up 3";
        case "FOLLOWUPFINAL": return "Follow-up Final";
        case "RESPONDIDO": return "Respondido";
        case "FECHOU": return "Fechou (Convertido)";
        case "PERDIDO": return "Perdido";
        case "SEM_RETORNO": return "Sem Retorno / Encerrado";
        default: return val;
      }
    }
    if (field === "temperatura") {
      switch (upperVal) {
        case "FRIA": return "FRIA";
        case "MORNA": return "MORNA";
        case "QUENTE": return "QUENTE";
        case "CLIENTE": return "CLIENTE";
        default: return upperVal;
      }
    }
    return val;
  };

  // Form states for adding a lead manually
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGuests, setFormGuests] = useState(100);
  const [formDate, setFormDate] = useState("");
  const [formMonth, setFormMonth] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formPortal, setFormPortal] = useState("Manual");
  const [formNotes, setFormNotes] = useState("");
  const [formServices, setFormServices] = useState("");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) return;

    try {
      await onAddManualLead({
        nome: formNome.trim(),
        email: formEmail.trim(),
        link_celular: formPhone.trim(),
        convidados: Number(formGuests),
        data_casamento: formDate.trim(),
        mes_casamento: formMonth.trim(),
        local: formVenue.trim(),
        origem_portal: formPortal,
        observacoes: formNotes.trim(),
        servicos: formServices.trim()
      });

      // Reset Form
      setFormNome("");
      setFormEmail("");
      setFormPhone("");
      setFormGuests(100);
      setFormDate("");
      setFormMonth("");
      setFormVenue("");
      setFormPortal("Manual");
      setFormNotes("");
      setFormServices("");
      setIsAddingLead(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSort = (field: "ultima_interacao" | "nome" | "convidados" | "data_casamento" | "dias_evento") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "dias_evento" ? "asc" : "desc");
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "NOVO":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PRIMEIRO_CONTATO":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "FOLLOWUP1":
      case "FOLLOWUP2":
      case "FOLLOWUP3":
      case "FOLLOWUPFINAL":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "RESPONDIDO":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "FECHOU":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PERDIDO":
      case "SEM_RETORNO":
      case "SEM_WHATSAPP":
      case "Sem WhatsApp":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getTempColor = (temp?: string) => {
    const norm = String(temp || "").trim().toUpperCase();
    switch (norm) {
      case "FRIA":
        return "text-sky-400 bg-sky-500/10 border-sky-500/20";
      case "MORNA":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "QUENTE":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "CLIENTE":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      default:
        return "text-zinc-400 bg-zinc-800 border-zinc-700";
    }
  };

  // Helper to parse wedding dates robustly
  const parseWeddingDateLocal = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (!cleanStr) return null;

    let d: Date | null = null;
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        d = new Date(fullYear, month - 1, day);
      }
    } else {
      const parsed = Date.parse(cleanStr);
      if (!isNaN(parsed)) {
        d = new Date(parsed);
      }
    }

    if (d && !isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  };

  const isNegociacaoLead = (lead: Lead) => {
    const status = (lead.status_funil || mapLegacyValue("status_funil", lead.status_funil) || "").trim().toUpperCase();
    const temp = (lead.temperatura || mapLegacyValue("temperatura", lead.temperatura) || "").trim().toUpperCase();
    return status === "RESPONDIDO" && temp === "QUENTE";
  };

  const isPerdido = (status?: string, motivo?: string) => {
    const s = String(status || "").toUpperCase().trim();
    if (s === "PERDIDO" || s === "SEM_RETORNO" || s === "SEM RETORNO" || s === "SEM RETORNO / ENCERRADO") return true;
    if (motivo) {
      const m = motivo.toUpperCase().trim();
      if (["PRECO_ALTO", "FECHOU_COM_CONCORRENTE", "CANCELOU", "FORA_DO_PERFIL", "DESISTIU", "PERDIDO"].includes(m)) {
        return true;
      }
    }
    return false;
  };

  const isConvertido = (status?: string) => {
    const s = String(status || "").toUpperCase().trim();
    return s === "FECHOU" || s === "CONVERTIDO" || s === "FECHOU (CONVERTIDO)";
  };

  // Filter & Search Logic
  const filteredLeads = leads
    .filter((lead) => {
      // Exclude past weddings
      if (lead.data_casamento) {
        const wDate = parseWeddingDateLocal(lead.data_casamento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (wDate && wDate < today) return false;
      }

      const matchSearch =
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.id && lead.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.link_celular && lead.link_celular.toLowerCase().includes(searchTerm.toLowerCase()));

      const normalizePortal = (portal?: string): string => {
        if (!portal) return "manual";
        const p = portal.toLowerCase().trim();
        if (p === "portal_noivas" || p === "portal noivas" || p === "portal de noivas") {
          return "portal_noivas";
        }
        if (p === "casamentos.com.br" || p === "casamentos") {
          return "casamentos";
        }
        if (p === "zankyou") {
          return "zankyou";
        }
        if (p === "manual" || p === "manual / cadastro crm" || p === "cadastro crm") {
          return "manual";
        }
        return p;
      };

      const matchStatus = selectedStatus === "ALL" 
        ? (!isPerdido(lead.status_funil, lead.motivo_perda) && !isConvertido(lead.status_funil))
        : (lead.status_funil === selectedStatus || mapLegacyValue("status_funil", lead.status_funil) === selectedStatus);
      const matchStatusConversa = selectedStatusConversa === "ALL" || (lead.status_conversa || "NUNCA_RESPONDEU") === selectedStatusConversa;
      const matchTemp = selectedTemp === "ALL" || 
        String(lead.temperatura || "").trim().toUpperCase() === String(selectedTemp).trim().toUpperCase();
      const matchPortal = selectedPortal === "ALL" || normalizePortal(lead.origem_portal) === normalizePortal(selectedPortal);
      const matchNegociacao = !negociacaoFilterOnly || isNegociacaoLead(lead);

      return matchSearch && matchStatus && matchStatusConversa && matchTemp && matchPortal && matchNegociacao;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "ultima_interacao") {
        const timeA = new Date(getLastInteractionInfo(a).dateStr).getTime();
        const timeB = new Date(getLastInteractionInfo(b).dateStr).getTime();
        comparison = timeA - timeB;
      } else if (sortField === "nome") {
        comparison = a.nome.localeCompare(b.nome);
      } else if (sortField === "convidados") {
        comparison = (a.convidados || 0) - (b.convidados || 0);
      } else if (sortField === "data_casamento") {
        const dateA = parseWeddingDateLocal(a.data_casamento);
        const dateB = parseWeddingDateLocal(b.data_casamento);
        const timeA = dateA ? dateA.getTime() : (sortDirection === "asc" ? Infinity : -Infinity);
        const timeB = dateB ? dateB.getTime() : (sortDirection === "asc" ? Infinity : -Infinity);
        comparison = timeA - timeB;
      } else if (sortField === "dias_evento") {
        const daysA = getDaysUntilWedding(a.data_casamento).days;
        const daysB = getDaysUntilWedding(b.data_casamento).days;
        const valA = daysA !== null ? daysA : (sortDirection === "asc" ? Infinity : -Infinity);
        const valB = daysB !== null ? daysB : (sortDirection === "asc" ? Infinity : -Infinity);
        comparison = valA - valB;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const activeLeadsCount = leads.filter(l => !isPerdido(l.status_funil, l.motivo_perda) && !isConvertido(l.status_funil)).length;
  const negociacaoCount = leads.filter(isNegociacaoLead).length;

  return (
    <div className="space-y-4">
      {/* Quick View Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNegociacaoFilterOnly(false);
              if (onClearNegociacaoOnly) onClearNegociacaoOnly();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              !negociacaoFilterOnly
                ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <span>Todos os Leads Ativos</span>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-mono">
              {activeLeadsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNegociacaoFilterOnly(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition ${
              negociacaoFilterOnly
                ? "bg-[#89F0B2]/20 text-[#89F0B2] border border-[#89F0B2]/50 shadow-sm"
                : "bg-zinc-900 text-zinc-400 hover:text-[#89F0B2] hover:bg-[#89F0B2]/10 border border-zinc-800"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#89F0B2] fill-[#89F0B2] animate-pulse" />
            <span>🔥 Visão Leads em Negociação</span>
            <span className="bg-[#89F0B2]/20 text-[#89F0B2] px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-[#89F0B2]/40">
              {negociacaoCount}
            </span>
          </button>
        </div>

        {negociacaoFilterOnly && (
          <div className="text-xs text-[#89F0B2]/90 font-medium flex items-center gap-1.5 bg-[#89F0B2]/10 px-3 py-1 rounded-lg border border-[#89F0B2]/20">
            <span>Exibindo apenas leads com <strong>Status: Respondido</strong> e <strong>Temperatura: Quente</strong></span>
            <button 
              onClick={() => {
                setNegociacaoFilterOnly(false);
                if (onClearNegociacaoOnly) onClearNegociacaoOnly();
              }} 
              className="text-[#89F0B2] hover:text-[#78e0a1] underline font-semibold ml-1"
            >
              Limpar filtro
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Header bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, email, celular ou ID..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-600"
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-[#89F0B2]"
          >
            <option value="ALL">Todos Status Ativos ({activeLeadsCount})</option>
            {statusList.length > 0 ? (
              statusList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))
            ) : (
              <>
                <option value="NOVO">Novos</option>
                <option value="PRIMEIRO_CONTATO">Primeiro Contato</option>
                <option value="FOLLOWUP1">Follow-up 1</option>
                <option value="FOLLOWUP2">Follow-up 2</option>
                <option value="FOLLOWUP3">Follow-up 3</option>
                <option value="FOLLOWUPFINAL">Follow-up Final</option>
                <option value="RESPONDIDO">Respondidos</option>
                <option value="FECHOU">Fechou (Convertido)</option>
                <option value="PERDIDO">Perdidos / Encerrados</option>
              </>
            )}
          </select>

          {/* Pipeline Status Conversa filter */}
          <select
            value={selectedStatusConversa}
            onChange={(e) => setSelectedStatusConversa(e.target.value)}
            className="bg-zinc-950 border border-[#89F0B2]/30 rounded-lg px-3 py-1.5 text-xs text-[#89F0B2] focus:outline-none focus:border-[#89F0B2] font-semibold"
          >
            <option value="ALL">Status da Conversa (Todos)</option>
            <option value="NUNCA_RESPONDEU">Nunca respondeu</option>
            <option value="RESPONDEU">Respondeu</option>
            <option value="EM_ATENDIMENTO">Em atendimento</option>
            <option value="ESCOLHENDO_MODELO">Escolhendo modelo</option>
            <option value="ORCAMENTO_ENVIADO">Orçamento enviado</option>
            <option value="NEGOCIACAO">Negociação</option>
            <option value="CLIENTE">Cliente (Fechou)</option>
            <option value="PERDIDO">Perdido</option>
          </select>

          {/* Temperature filter */}
          <select
            value={selectedTemp}
            onChange={(e) => setSelectedTemp(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-[#89F0B2]"
          >
            <option value="ALL">Todas Temperaturas</option>
            {tempsList.length > 0 ? (
              tempsList.map((tmp) => {
                const normTmp = String(tmp).trim().toUpperCase();
                return <option key={normTmp} value={normTmp}>{normTmp}</option>;
              })
            ) : (
              <>
                <option value="FRIA">FRIA</option>
                <option value="MORNA">MORNA</option>
                <option value="QUENTE">QUENTE</option>
                <option value="CLIENTE">CLIENTE</option>
              </>
            )}
          </select>

          {/* Origin Portal filter */}
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-[#89F0B2]"
          >
            <option value="ALL">Todos Portais</option>
            <option value="Portal Noivas">Portal Noivas</option>
            <option value="Casamentos.com.br">Casamentos.com.br</option>
            <option value="Zankyou">Zankyou</option>
            <option value="Manual">Manual / Cadastro CRM</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab("sheet_import")}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-semibold text-xs rounded-lg transition"
            >
              <Download className="w-4 h-4 text-[#89F0B2]" />
              Importar Planilha
            </button>
          )}

          <button
            onClick={() => setIsAddingLead(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#89F0B2] hover:bg-[#72e29e] text-black font-semibold text-xs rounded-lg transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            Criar Lead
          </button>
        </div>

      </div>

      {/* Database table header sort indicators */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:grid grid-cols-12 gap-4 items-center shrink-0">
        <button onClick={() => toggleSort("nome")} className="col-span-2 flex items-center gap-1 text-left hover:text-white">
          Lead
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <span className="col-span-2">Email • Telefone</span>
        <button onClick={() => toggleSort("convidados")} className="col-span-1 flex items-center gap-1 hover:text-white">
          Conv.
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <button onClick={() => toggleSort("data_casamento")} className="col-span-1 flex items-center gap-1 text-left hover:text-white">
          EVENTO
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <span className="col-span-2">Status / Etapa</span>
        <button onClick={() => toggleSort("ultima_interacao")} className="col-span-2 flex items-center gap-1 text-left hover:text-white justify-between">
          <span>ÚLTIMA INTERAÇÃO</span>
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <button onClick={() => toggleSort("dias_evento")} className="col-span-2 flex items-center gap-1 text-left hover:text-white justify-between">
          <span>DIAS P/ EVENTO</span>
          <ArrowUpDown className="w-3 h-3" />
        </button>
      </div>

      {/* Database Leads list row entries */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => {
            const interaction = getLastInteractionInfo(lead);
            const isEmNegociacao = isNegociacaoLead(lead);
            const weddingDays = getDaysUntilWedding(lead.data_casamento);
            
            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={`w-full cursor-pointer rounded-xl p-4 md:grid md:grid-cols-12 md:gap-4 flex flex-col gap-3.5 items-start md:items-center text-xs text-zinc-300 text-left transition ${
                  isEmNegociacao
                    ? "bg-emerald-950/20 hover:bg-emerald-950/35 border border-[#89F0B2]/40 hover:border-[#89F0B2] shadow-sm shadow-emerald-500/5"
                    : "bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {/* Bride identity */}
                <div className="md:col-span-2 w-full flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
                    isEmNegociacao ? "bg-[#89F0B2]/20 text-[#89F0B2] border border-[#89F0B2]/30" : "bg-zinc-800 text-zinc-300"
                  }`}>
                    {lead.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-white block truncate">{lead.nome}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{lead.id}</span>
                    {isEmNegociacao && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#89F0B2]/20 text-[#89F0B2] border border-[#89F0B2]/40 shadow-sm animate-pulse">
                          <Flame className="w-2.5 h-2.5 text-[#89F0B2] fill-[#89F0B2]" />
                          Em Negociação
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email / phone contact & location & 1-Click Quick Actions */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 md:truncate space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{lead.link_celular || "Sem fone"}</span>
                  </div>
                  {lead.local && (
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] truncate" title={lead.local}>
                      <MapPin className="w-3.5 h-3.5 text-[#89F0B2]/80 shrink-0" />
                      <span className="truncate">{lead.local}</span>
                    </div>
                  )}

                  {/* 1-Click Quick Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {lead.link_celular && (
                      <a
                        href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.nome}! Tudo bem? Gostaria de conversar sobre o seu orçamento de casamento na Casa Colombo Artesanal.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir WhatsApp direto (1-Clique)"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold transition"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                        WhatsApp
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(`Acompanhamento de Orçamento - ${lead.nome}`)}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Enviar E-mail direto (1-Clique)"
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold transition"
                      >
                        <Mail className="w-3 h-3 text-sky-400" />
                        E-mail
                      </a>
                    )}
                  </div>
                </div>

                {/* Guests */}
                <div className="md:col-span-1 w-full flex justify-between md:block text-zinc-400 md:text-white border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 font-semibold">
                  <span className="md:hidden font-medium text-zinc-500">Convidados:</span>
                  <span>{lead.convidados}</span>
                </div>

                {/* Event Date */}
                <div className="md:col-span-1 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 md:truncate flex items-center pr-1">
                  <div className="flex items-center gap-1 text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-[#89F0B2]/80 shrink-0" />
                    <span className="truncate font-medium">{lead.data_casamento || "N/I"}</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusColor(lead.status_funil)}`}>
                      {lead.status_funil}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getTempColor(lead.temperatura)}`}>
                      {String(lead.temperatura || "FRIA").trim().toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate block">Etapa: {lead.etapa_contato}</span>
                </div>

                {/* Last Interaction, Action & Source */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 flex flex-col justify-center gap-1">
                  <div className="flex items-center justify-between md:justify-start gap-1.5">
                    <span className="md:hidden text-zinc-500 font-medium">Última Interação:</span>
                    <div className="flex items-center gap-1 text-zinc-200 font-mono text-[10px] font-semibold">
                      <Clock className="w-3 h-3 text-[#89F0B2] shrink-0" />
                      <span>{interaction.formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-200 font-medium truncate" title={interaction.acao}>
                      {interaction.canalIcon === "whatsapp" && <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {interaction.canalIcon === "email" && <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      {interaction.canalIcon === "manual" && <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      {interaction.canalIcon === "system" && <Zap className="w-3.5 h-3.5 text-[#89F0B2] shrink-0" />}
                      <span className="truncate">{interaction.acao}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[9px] font-medium border border-zinc-700/60 truncate">
                        {interaction.origem}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Days Until Wedding/Event Column */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 flex flex-col justify-center items-start">
                  <span className="md:hidden text-zinc-500 font-medium text-[10px] block mb-1">Dias p/ Evento:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${weddingDays.badgeColor}`}>
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{weddingDays.label}</span>
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl p-12 text-center text-zinc-500">
            Nenhum lead encontrado com os filtros e busca aplicados.
          </div>
        )}
      </div>

      {/* Add Lead Drawer Modal Overlay */}
      {isAddingLead && createPortal(
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[85vh] h-auto my-auto animate-fade-in"
          >
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#89F0B2]" />
                <h3 className="text-base font-semibold text-white">Cadastrar Novo Lead</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingLead(false)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs min-h-0">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Nome do Lead *</label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Larissa Souza"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="larissa@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">WhatsApp / Celular</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(13) 99655-1212"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Número de Convidados (Estimativa)</label>
                  <input
                    type="number"
                    min="0"
                    value={formGuests}
                    onChange={(e) => setFormGuests(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Data do Casamento (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="12/10/2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Mês do Casamento (Extenso)</label>
                  <input
                    type="text"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    placeholder="Outubro"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Local do Casamento</label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="Recanto dos Sonhos, Santos"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Canal Originário</label>
                  <select
                    value={formPortal}
                    onChange={(e) => setFormPortal(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2]"
                  >
                    <option value="Manual">Manual / CRM Interior</option>
                    <option value="Portal Noivas">Portal Noivas</option>
                    <option value="Casamentos.com.br">Casamentos.com.br</option>
                    <option value="Zankyou">Zankyou</option>
                    <option value="site_direto">Site Direto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Serviços Solicitados</label>
                <input
                  type="text"
                  value={formServices}
                  onChange={(e) => setFormServices(e.target.value)}
                  placeholder="Lembrancinhas Mini Velas, Difusores etc."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Observações Iniciais</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Lead solicitou rótulo personalizado rústico."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-700 resize-none"
                />
              </div>

              {/* Informative Auto budget calculation */}
              <div className="p-3 bg-zinc-950 border border-zinc-800/85 rounded-lg flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <Calculator className="w-4 h-4 text-zinc-600" />
                <span>O CRM calculará os orçamentos para {formGuests} convidados de forma automática ao salvar.</span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 p-5 border-t border-zinc-800 bg-zinc-950/20 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingLead(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#89F0B2] hover:bg-[#72e29e] text-black font-semibold rounded-lg transition"
              >
                Cadastrar Lead
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
