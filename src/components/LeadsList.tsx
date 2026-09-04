/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Plus, Calendar, User, Phone, Mail, ChevronRight, Calculator, RefreshCw, Star, ArrowUpDown, X, Flame, MessageCircle, MapPin, Clock, Zap, CheckCircle2 } from "lucide-react";
import { Lead, LeadStatus, LeadTemperatura, PortalSource } from "../types";
import { Button, Badge, SearchInput, Select, Input, Textarea, FormField, Modal } from "./ui";

interface LeadsListProps {
  leads: Lead[];
  portals: PortalSource[];
  onSelectLead: (id: string) => void;
  onAddManualLead: (formData: any) => Promise<void>;
  onRefresh: () => void;
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
    return { days: 0, label: "Hoje!", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold animate-pulse" };
  } else if (days < 0) {
    return { days, label: `${Math.abs(days)}d atrás`, badgeColor: "bg-zinc-800/80 text-zinc-500 border-zinc-700/60" };
  } else if (days <= 30) {
    return { days, label: `${days}d (Urgente)`, badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold" };
  } else if (days <= 90) {
    return { days, label: `${days}d restantes`, badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30 font-semibold" };
  } else {
    return { days, label: `${days}d restantes`, badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-medium" };
  }
}

export default function LeadsList({ 
  leads, 
  portals, 
  onSelectLead, 
  onAddManualLead, 
  onRefresh, 
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
  const [formPortal, setFormPortal] = useState("Manual (CRM Interior)");
  const [formNotes, setFormNotes] = useState("");
  const [formServices, setFormServices] = useState("");
  const [enviarPrimeiraMensagem, setEnviarPrimeiraMensagem] = useState<boolean>(true);

  // Auto-mask wedding date DD/MM/AAAA and set Mês / Ano do Casamento (Extenso)
  const handleWeddingDateChange = (inputVal: string) => {
    const rawDigits = inputVal.replace(/\D/g, "").slice(0, 8);
    let masked = rawDigits;
    if (rawDigits.length > 4) {
      masked = `${rawDigits.slice(0, 2)}/${rawDigits.slice(2, 4)}/${rawDigits.slice(4)}`;
    } else if (rawDigits.length > 2) {
      masked = `${rawDigits.slice(0, 2)}/${rawDigits.slice(2)}`;
    }
    setFormDate(masked);

    if (rawDigits.length === 8) {
      const day = parseInt(rawDigits.slice(0, 2), 10);
      const monthIdx = parseInt(rawDigits.slice(2, 4), 10) - 1;
      const year = rawDigits.slice(4);

      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31 && year.length === 4) {
        setFormMonth(`${monthNames[monthIdx]} de ${year}`);
      }
    }
  };

  // Dynamic portal channels for filter dropdown
  const availablePortalsForFilter = React.useMemo(() => {
    const set = new Set<string>();
    if (portals && portals.length > 0) {
      portals.forEach(p => {
        if (p.nome && p.nome.trim()) set.add(p.nome.trim());
      });
    }
    if (leads && leads.length > 0) {
      leads.forEach(l => {
        if (l.origem_portal && l.origem_portal.trim()) set.add(l.origem_portal.trim());
      });
    }
    return Array.from(set).sort();
  }, [portals, leads]);

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
        servicos: formServices.trim(),
        enviar_primeira_mensagem: enviarPrimeiraMensagem
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
      setEnviarPrimeiraMensagem(true);
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

  const hasActiveFilters = 
    searchTerm !== "" || 
    selectedStatus !== "ALL" || 
    selectedStatusConversa !== "ALL" || 
    selectedTemp !== "ALL" || 
    selectedPortal !== "ALL" || 
    negociacaoFilterOnly;

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatus("ALL");
    setSelectedStatusConversa("ALL");
    setSelectedTemp("ALL");
    setSelectedPortal("ALL");
    setNegociacaoFilterOnly(false);
    if (onClearNegociacaoOnly) onClearNegociacaoOnly();
  };

  return (
    <div className="space-y-4">
      
      {/* CABEÇALHO: Lista de Leads, descrição curta / quantidade, [+ Novo Lead] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Lista de Leads</h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300">
              {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gerenciamento do funil comercial de noivas e histórico de atendimentos
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            title="Sincronizar leads"
            icon={<RefreshCw className="w-3.5 h-3.5 text-zinc-400" />}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddingLead(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Lead
          </Button>
        </div>
      </div>

      {/* SEGUNDA LINHA: [Buscar...] + [Filtros principais com labels inequívocos] */}
      <div className="bg-[#12151C] border border-white/[0.06] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Buscar */}
          <div className="flex-1 min-w-[260px] max-w-lg">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
              placeholder="Buscar por noiva, e-mail, telefone..."
              className="w-full text-xs"
            />
          </div>

          {/* Quick Segmented Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-[#181C26] border border-white/[0.06] rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setNegociacaoFilterOnly(false);
                if (onClearNegociacaoOnly) onClearNegociacaoOnly();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                !negociacaoFilterOnly
                  ? "bg-[#202534] text-white border border-white/[0.08] shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Todos Ativos</span>
              <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-zinc-400 font-medium">
                {activeLeadsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNegociacaoFilterOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                negociacaoFilterOnly
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs"
                  : "text-zinc-400 hover:text-amber-300"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Em Negociação</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                negociacaoFilterOnly ? "bg-amber-500/25 text-amber-300" : "bg-black/30 text-zinc-400"
              }`}>
                {negociacaoCount}
              </span>
            </button>
          </div>
        </div>

        {/* Structured Contextual Filter Selects with explicit labels */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2.5 border-t border-white/[0.04]">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Etapa do Funil
            </label>
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: "ALL", label: `Todas as Etapas (${activeLeadsCount})` },
                ...(statusList.length > 0 
                  ? statusList.map(st => ({ value: st, label: st }))
                  : [
                      { value: "NOVO", label: "Novos" },
                      { value: "PRIMEIRO_CONTATO", label: "Primeiro Contato" },
                      { value: "FOLLOWUP1", label: "Follow-up 1" },
                      { value: "FOLLOWUP2", label: "Follow-up 2" },
                      { value: "FOLLOWUP3", label: "Follow-up 3" },
                      { value: "FOLLOWUPFINAL", label: "Follow-up Final" },
                      { value: "RESPONDIDO", label: "Respondidos" },
                      { value: "FECHOU", label: "Fechou (Convertido)" },
                      { value: "PERDIDO", label: "Perdidos / Encerrados" }
                    ])
              ]}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Status da Conversa
            </label>
            <Select
              value={selectedStatusConversa}
              onChange={(e) => setSelectedStatusConversa(e.target.value)}
              options={[
                { value: "ALL", label: "Todas as Conversas" },
                { value: "NUNCA_RESPONDEU", label: "Nunca respondeu" },
                { value: "RESPONDEU", label: "Respondeu" },
                { value: "EM_ATENDIMENTO", label: "Em atendimento" },
                { value: "ESCOLHENDO_MODELO", label: "Escolhendo modelo" },
                { value: "ORCAMENTO_ENVIADO", label: "Orçamento enviado" },
                { value: "NEGOCIACAO", label: "Negociação" },
                { value: "CLIENTE", label: "Cliente (Fechou)" },
                { value: "PERDIDO", label: "Perdido" }
              ]}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Temperatura
            </label>
            <Select
              value={selectedTemp}
              onChange={(e) => setSelectedTemp(e.target.value)}
              options={[
                { value: "ALL", label: "Todas Temperaturas" },
                { value: "FRIA", label: "Fria" },
                { value: "MORNA", label: "Morna" },
                { value: "QUENTE", label: "Quente" },
                { value: "CLIENTE", label: "Cliente" }
              ]}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Canal de Origem
            </label>
            <Select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value)}
              options={[
                { value: "ALL", label: "Todos os Canais" },
                ...availablePortalsForFilter.map(pName => ({ value: pName, label: pName }))
              ]}
            />
          </div>
        </div>

        {/* Removable Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.04] text-xs">
            <span className="text-zinc-500 text-[11px] font-medium">Filtros ativos:</span>
            
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs">
                <span>Busca: "{searchTerm}"</span>
                <button type="button" onClick={() => setSearchTerm("")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {negociacaoFilterOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                <span>Em Negociação</span>
                <button type="button" onClick={() => { setNegociacaoFilterOnly(false); if (onClearNegociacaoOnly) onClearNegociacaoOnly(); }} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-200 border border-white/[0.08] text-xs">
                <span>Status: {selectedStatus}</span>
                <button type="button" onClick={() => setSelectedStatus("ALL")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatusConversa !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-200 border border-white/[0.08] text-xs">
                <span>Conversa: {selectedStatusConversa}</span>
                <button type="button" onClick={() => setSelectedStatusConversa("ALL")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTemp !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-200 border border-white/[0.08] text-xs">
                <span>Temp: {selectedTemp}</span>
                <button type="button" onClick={() => setSelectedTemp("ALL")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPortal !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-200 border border-white/[0.08] text-xs">
                <span>Canal: {selectedPortal}</span>
                <button type="button" onClick={() => setSelectedPortal("ALL")} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-zinc-400 hover:text-zinc-200 ml-auto underline cursor-pointer"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      {/* Redesigned Tabular Leads Container */}
      <div className="bg-[#0e1118] border border-white/[0.07] rounded-2xl overflow-hidden shadow-sm">
        
        {/* Table Column Headers */}
        <div className="bg-[#181C26] border-b border-white/[0.06] px-4 py-3 text-xs font-medium text-zinc-400 hidden md:grid grid-cols-12 gap-4 items-center">
          <button 
            onClick={() => toggleSort("nome")} 
            className="col-span-3 flex items-center gap-1.5 text-left hover:text-white cursor-pointer transition"
          >
            <span>Lead & Noiva</span>
            <ArrowUpDown className={`w-3 h-3 ${sortField === "nome" ? "text-indigo-400" : "text-zinc-500"}`} />
          </button>
          
          <span className="col-span-2">Contato & Local</span>
          
          <button 
            onClick={() => toggleSort("convidados")} 
            className="col-span-1 flex items-center gap-1 hover:text-white cursor-pointer transition"
          >
            <span>Conv.</span>
            <ArrowUpDown className={`w-3 h-3 ${sortField === "convidados" ? "text-indigo-400" : "text-zinc-500"}`} />
          </button>
          
          <button 
            onClick={() => toggleSort("data_casamento")} 
            className="col-span-1 flex items-center gap-1 text-left hover:text-white cursor-pointer transition"
          >
            <span>Evento</span>
            <ArrowUpDown className={`w-3 h-3 ${sortField === "data_casamento" ? "text-indigo-400" : "text-zinc-500"}`} />
          </button>
          
          <span className="col-span-2">Etapa & Status</span>
          
          <button 
            onClick={() => toggleSort("ultima_interacao")} 
            className="col-span-2 flex items-center gap-1 text-left hover:text-white justify-between cursor-pointer transition"
          >
            <span>Última Interação</span>
            <ArrowUpDown className={`w-3 h-3 ${sortField === "ultima_interacao" ? "text-indigo-400" : "text-zinc-500"}`} />
          </button>
          
          <button 
            onClick={() => toggleSort("dias_evento")} 
            className="col-span-1 flex items-center gap-1 text-left hover:text-white justify-end cursor-pointer transition"
          >
            <span>Dias</span>
            <ArrowUpDown className={`w-3 h-3 ${sortField === "dias_evento" ? "text-indigo-400" : "text-zinc-500"}`} />
          </button>
        </div>

        {/* Rows Container */}
        <div className="divide-y divide-white/[0.04] max-h-[620px] overflow-y-auto">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const interaction = getLastInteractionInfo(lead);
              const isEmNegociacao = isNegociacaoLead(lead);
              const weddingDays = getDaysUntilWedding(lead.data_casamento);
              const hasProximoPasso = Boolean(
                (lead.proxima_atividade_em && String(lead.proxima_atividade_em).trim() !== "") ||
                (lead.proxima_acao_em && String(lead.proxima_acao_em).trim() !== "")
              );

              const tempVariant = 
                lead.temperatura === "QUENTE" ? "hot" :
                lead.temperatura === "MORNA" ? "warm" :
                lead.temperatura === "CLIENTE" ? "success" : "cold";
              
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className={`group w-full cursor-pointer px-4 py-3.5 md:grid md:grid-cols-12 md:gap-4 flex flex-col gap-3 items-start md:items-center text-xs text-zinc-300 text-left transition-colors duration-150 ${
                    isEmNegociacao
                      ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.07]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Lead identity & avatar */}
                  <div className="md:col-span-3 w-full flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs shrink-0 transition-transform group-hover:scale-105 ${
                      isEmNegociacao
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : hasProximoPasso
                        ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                        : "bg-[#181C26] text-zinc-200 border border-white/[0.08]"
                    }`}>
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-semibold text-sm block truncate transition-colors ${
                          hasProximoPasso 
                            ? "text-indigo-300" 
                            : isEmNegociacao
                            ? "text-zinc-100 group-hover:text-amber-300"
                            : "text-zinc-100 group-hover:text-white"
                        }`}>
                          {lead.nome}
                        </span>
                        {isEmNegociacao && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                            <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                            Negociação
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">#{lead.id}</span>
                    </div>
                  </div>

                  {/* Contact info & Quick 1-Click Actions */}
                  <div className="md:col-span-2 w-full border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate text-xs">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-xs">{lead.link_celular || "Sem telefone"}</span>
                    </div>
                    {lead.local && (
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] truncate" title={lead.local}>
                        <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate">{lead.local}</span>
                      </div>
                    )}

                    {/* 1-Click Direct Action Buttons */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {lead.link_celular && (
                        <a
                          href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.nome}! Tudo bem? Gostaria de conversar sobre o seu orçamento de casamento na Casa Colombo Artesanal.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Abrir WhatsApp direto"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-md text-[10px] font-medium transition cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          WhatsApp
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(`Acompanhamento de Orçamento - ${lead.nome}`)}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Enviar E-mail direto"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/25 rounded-md text-[10px] font-medium transition cursor-pointer"
                        >
                          <Mail className="w-3 h-3 text-sky-400" />
                          E-mail
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="md:col-span-1 w-full flex justify-between md:block text-zinc-300 border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 font-medium text-xs">
                    <span className="md:hidden font-normal text-zinc-400">Convidados:</span>
                    <span>{lead.convidados}</span>
                  </div>

                  {/* Wedding Date */}
                  <div className="md:col-span-1 w-full border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 flex items-center pr-1">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-medium text-xs truncate">{lead.data_casamento || "N/I"}</span>
                    </div>
                  </div>

                  {/* Status & Temp */}
                  <div className="md:col-span-2 w-full border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(lead.status_funil)}`}>
                        {lead.status_funil}
                      </span>
                      <Badge variant={tempVariant} size="sm">
                        {String(lead.temperatura || "FRIA").trim().toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-zinc-400 truncate block">Etapa: {lead.etapa_contato}</span>
                  </div>

                  {/* Last Interaction */}
                  <div className="md:col-span-2 w-full border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center justify-between md:justify-start gap-1.5">
                      <span className="md:hidden text-zinc-400 font-normal">Última Interação:</span>
                      <div className="flex items-center gap-1 text-zinc-300 text-[11px] font-medium">
                        <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{interaction.formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium truncate" title={interaction.acao}>
                        {interaction.canalIcon === "whatsapp" && <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {interaction.canalIcon === "email" && <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        {interaction.canalIcon === "manual" && <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        {interaction.canalIcon === "system" && <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        <span className="truncate">{interaction.acao}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate">{interaction.origem}</span>
                    </div>
                  </div>

                  {/* Countdown & Open details arrow */}
                  <div className="md:col-span-1 w-full border-t border-white/[0.04] pt-2 md:pt-0 md:border-t-0 flex items-center justify-between md:justify-end gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] border ${weddingDays.badgeColor}`}>
                      {weddingDays.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
                  </div>

                </div>
              );
            })
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Nenhum lead encontrado</p>
                <p className="text-xs text-zinc-400 mt-0.5">Tente ajustar seus termos de busca ou filtros aplicados.</p>
              </div>
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" onClick={handleClearAllFilters}>
                  Limpar todos os filtros
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table Footer Summary */}
        <div className="px-4 py-3 bg-[#121620]/60 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span>Mostrando {filteredLeads.length} de {leads.length} leads cadastrados</span>
          <span className="text-[11px] text-zinc-500 font-mono">Clique em qualquer linha para abrir a Ficha Completa</span>
        </div>

      </div>

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddingLead}
        onClose={() => setIsAddingLead(false)}
        title="Cadastrar Novo Lead"
        size="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nome do Lead" required>
              <Input
                required
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Larissa Souza"
              />
            </FormField>
            <FormField label="E-mail" required>
              <Input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="larissa@gmail.com"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="WhatsApp / Celular">
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(13) 99655-1212"
              />
            </FormField>
            <FormField label="Número de Convidados (Estimativa)">
              <Input
                type="number"
                min="0"
                value={formGuests}
                onChange={(e) => setFormGuests(Number(e.target.value))}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Data do Casamento (DD/MM/AAAA)">
              <Input
                value={formDate}
                onChange={(e) => handleWeddingDateChange(e.target.value)}
                placeholder="12/10/2026"
                className="font-mono"
              />
            </FormField>
            <FormField label="Mês / Ano do Casamento (Extenso)">
              <Input
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
                placeholder="Outubro de 2026"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Local do Casamento">
              <Input
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
                placeholder="Recanto dos Sonhos, Santos"
              />
            </FormField>
            <FormField label="Canal Originário">
              <Select
                value={formPortal}
                onChange={(e) => setFormPortal(e.target.value)}
                options={
                  portals && portals.length > 0
                    ? portals.filter((p) => p.ativo !== false).map((p) => ({ value: p.nome, label: p.nome }))
                    : [
                        { value: "Manual (CRM Interior)", label: "Manual (CRM Interior)" },
                        { value: "Portal Noivas", label: "Portal Noivas" },
                        { value: "Casamentos.com.br", label: "Casamentos.com.br" },
                        { value: "Zankyou", label: "Zankyou" },
                        { value: "Instagram / Meta", label: "Instagram / Meta" },
                        { value: "Google Ads / Pesquisa", label: "Google Ads / Pesquisa" },
                        { value: "Indicação / Recomendação", label: "Indicação / Recomendação" },
                        { value: "Formulário Site Direto", label: "Formulário Site Direto" },
                        { value: "Outros", label: "Outros" }
                      ]
                }
              />
            </FormField>
          </div>

          <FormField label="Serviços Solicitados">
            <Input
              value={formServices}
              onChange={(e) => setFormServices(e.target.value)}
              placeholder="Lembrancinhas Mini Velas, Difusores etc."
            />
          </FormField>

          <FormField label="Observações Iniciais">
            <Textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Lead solicitou rótulo personalizado rústico."
            />
          </FormField>

          {/* Pergunta: Enviar 1ª mensagem da sequência agora ou agendar para 3 dias */}
          <div className="p-3.5 bg-[#0B0D12] border border-white/[0.06] rounded-xl space-y-2">
            <label className="text-zinc-300 font-medium text-xs block">
              Enviar a 1ª mensagem da sequência de automação agora?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnviarPrimeiraMensagem(true)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  enviarPrimeiraMensagem
                    ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/40 font-semibold"
                    : "bg-[#181C26] text-zinc-400 border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Sim, enviar agora
              </button>
              <button
                type="button"
                onClick={() => setEnviarPrimeiraMensagem(false)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !enviarPrimeiraMensagem
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold"
                    : "bg-[#181C26] text-zinc-400 border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Não, agendar p/ 3 dias
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 leading-snug">
              {enviarPrimeiraMensagem
                ? "A 1ª mensagem do fluxo será enviada imediatamente ao cadastrar o lead."
                : "A 1ª mensagem da sequência será agendada para daqui a 3 dias. O fluxo seguirá o prazo normal a partir de então."}
            </p>
          </div>

          <div className="p-3 bg-[#0B0D12] border border-white/[0.06] rounded-xl flex items-center gap-2 text-[11px] text-zinc-400">
            <Calculator className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>O CRM calculará os orçamentos para {formGuests} convidados de forma automática ao salvar.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddingLead(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Cadastrar Lead
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
