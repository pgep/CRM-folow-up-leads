/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Search, Plus, RefreshCw, X, Flame, MessageCircle, MapPin, 
  Clock, Calendar, Users, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Mail, Phone, AlertCircle, CheckCircle2, Filter, Sparkles, User, ExternalLink
} from "lucide-react";
import { Lead, LeadStatus, LeadTemperatura, PortalSource } from "../types";
import { Button, Badge, Modal, FormField, Input, Textarea, Select } from "./ui";
import { useToast } from "./Toast";

// =============================================================================
// INTERFACES & PROPS
// =============================================================================

export interface LeadsListProps {
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

// =============================================================================
// HELPER FUNCTIONS (Preservadas e aprimoradas para robustez total)
// =============================================================================

const PT_MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

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

  // Legacy fallback calculations (garantia de integridade para registros históricos)
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
      origem: "Automação",
      canalIcon: "whatsapp"
    };
  }

  if (emailTime > 0 && emailTime === maxTime && emailTime > createdTime + 1000) {
    return {
      dateStr: lead.ultimo_email_em!,
      formattedDate,
      acao: `E-mail Enviado (${lead.etapa_contato || 'Envio'})`,
      origem: "Automação",
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
    origemDisplay = "Planilha";
  } else if (rawPortal.toLowerCase().includes("noivas")) {
    origemDisplay = "Portal Noivas";
  } else if (rawPortal.toLowerCase().includes("casamentos")) {
    origemDisplay = "Casamentos.com";
  } else if (rawPortal.toLowerCase().includes("zankyou")) {
    origemDisplay = "Zankyou";
  } else if (rawPortal.toLowerCase().includes("manual")) {
    origemDisplay = "Manual";
  }

  return {
    dateStr: lead.created_at || new Date().toISOString(),
    formattedDate,
    acao: "Lead Cadastrado",
    origem: origemDisplay,
    canalIcon: "system"
  };
}

/** Parse seguro de datas de casamento em DD/MM/AAAA ou YYYY-MM-DD */
export function parseWeddingDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;

  // Formato DD/MM/AAAA
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

  // Formato YYYY-MM-DD
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
export function getDaysUntilWedding(dateStr?: string): { 
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
      label: "N/I", 
      formattedDisplay: "Data a definir",
      urgency: "indefinido",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60" 
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

/** Avalia a urgência e próxima ação da Agenda com estrutura de dados clara */
function getNextActionSummary(lead: Lead) {
  const nextDateStr = lead.proxima_atividade_em || lead.proxima_acao_em;
  if (!nextDateStr || !String(nextDateStr).trim()) {
    return {
      status: "SEM_PASSO" as const,
      dateDisplay: "Sem data",
      actionType: "Sem próximo passo",
      temporalLabel: "Definir na Agenda",
      icon: Clock,
      dateColorClass: "text-slate-700 dark:text-zinc-300 font-semibold",
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

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function LeadsList({ 
  leads, 
  portals, 
  onSelectLead, 
  onAddManualLead, 
  onRefresh, 
  initialNegociacaoOnly,
  onClearNegociacaoOnly
}: LeadsListProps) {
  const { toast } = useToast();

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState<"TODOS_ATIVOS" | "NEGOCIACAO" | "NOVOS" | "CONVERTIDOS" | "TODOS">("TODOS_ATIVOS");
  const [selectedStatus, setSelectedStatus] = useState<string | "ALL">("ALL");
  const [selectedStatusConversa, setSelectedStatusConversa] = useState<string | "ALL">("ALL");
  const [selectedTemp, setSelectedTemp] = useState<string | "ALL">("ALL");
  const [selectedPortal, setSelectedPortal] = useState<string | "ALL">("ALL");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ordenação
  const [sortField, setSortField] = useState<"nome" | "convidados" | "data_casamento" | "dias_evento" | "ultima_interacao">("ultima_interacao");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Estado do Modal de Novo Lead
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campos do formulário manual
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

  // Sincronização inicial com o filtro "Em Negociação" vindo de fora
  useEffect(() => {
    if (initialNegociacaoOnly) {
      setQuickFilter("NEGOCIACAO");
    }
  }, [initialNegociacaoOnly]);

  // Listas dinâmicas de status e temperaturas
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);

  useEffect(() => {
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

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.info("Base de leads sincronizada.");
    } catch {
      toast.error("Erro ao atualizar leads.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Funções de classificação de negócio
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

  const isNovo = (status?: string) => {
    const s = String(status || "").toUpperCase().trim();
    return s === "NOVO" || s === "PRIMEIRO_CONTATO" || s === "PRIMEIRO CONTATO";
  };

  // Contagens para os Quick Filters
  const activeLeadsCount = useMemo(() => leads.filter(l => !isPerdido(l.status_funil, l.motivo_perda) && !isConvertido(l.status_funil)).length, [leads]);
  const negociacaoCount = useMemo(() => leads.filter(isNegociacaoLead).length, [leads]);
  const novosCount = useMemo(() => leads.filter(l => isNovo(l.status_funil)).length, [leads]);
  const convertidosCount = useMemo(() => leads.filter(l => isConvertido(l.status_funil)).length, [leads]);

  // Canais de portal dinâmicos para o filtro
  const availablePortalsForFilter = useMemo(() => {
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

  // Auto-máscara da data do casamento DD/MM/AAAA e preenchimento automático do mês extenso
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

  // Submissão do novo lead
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) {
      toast.warning("Nome e E-mail são obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddManualLead({
        nome: formNome.trim(),
        email: formEmail.trim(),
        link_celular: formPhone.trim(),
        convidados: Number(formGuests) || 100,
        data_casamento: formDate.trim(),
        mes_casamento: formMonth.trim(),
        local: formVenue.trim(),
        origem_portal: formPortal,
        observacoes: formNotes.trim(),
        servicos: formServices.trim(),
        enviar_primeira_mensagem: enviarPrimeiraMensagem
      });

      toast.success(`Lead ${formNome.trim()} cadastrado com sucesso!`);

      // Reset
      setFormNome("");
      setFormEmail("");
      setFormPhone("");
      setFormGuests(100);
      setFormDate("");
      setFormMonth("");
      setFormVenue("");
      setFormPortal("Manual (CRM Interior)");
      setFormNotes("");
      setFormServices("");
      setEnviarPrimeiraMensagem(true);
      setIsAddingLead(false);
    } catch (err: any) {
      console.error("Erro ao cadastrar lead:", err);
      toast.error(err?.message || "Não foi possível cadastrar o lead. Verifique os dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternância de ordenação
  const toggleSort = (field: "nome" | "convidados" | "data_casamento" | "dias_evento" | "ultima_interacao") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "dias_evento" ? "asc" : "desc");
    }
  };

  // Normalizador de origem
  const normalizePortal = (portal?: string): string => {
    if (!portal) return "manual";
    const p = portal.toLowerCase().trim();
    if (p.includes("noivas")) return "portal_noivas";
    if (p.includes("casamentos")) return "casamentos";
    if (p.includes("zankyou")) return "zankyou";
    if (p.includes("manual")) return "manual";
    return p;
  };

  // Filtragem e busca dos leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Exclusão segura de casamentos passados (preservando a regra já aprovada)
        if (lead.data_casamento) {
          const wDate = parseWeddingDate(lead.data_casamento);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (wDate && wDate < today) return false;
        }

        // Busca textual
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchName = (lead.nome || "").toLowerCase().includes(term);
          const matchEmail = (lead.email || "").toLowerCase().includes(term);
          const matchPhone = (lead.link_celular || "").toLowerCase().includes(term);
          const matchId = (lead.id || "").toLowerCase().includes(term);
          const matchLocal = (lead.local || "").toLowerCase().includes(term);

          if (!matchName && !matchEmail && !matchPhone && !matchId && !matchLocal) {
            return false;
          }
        }

        // Quick Filter principal
        if (quickFilter === "TODOS_ATIVOS") {
          if (isPerdido(lead.status_funil, lead.motivo_perda) || isConvertido(lead.status_funil)) {
            return false;
          }
        } else if (quickFilter === "NEGOCIACAO") {
          if (!isNegociacaoLead(lead)) return false;
        } else if (quickFilter === "NOVOS") {
          if (!isNovo(lead.status_funil)) return false;
        } else if (quickFilter === "CONVERTIDOS") {
          if (!isConvertido(lead.status_funil)) return false;
        }

        // Filtro de Etapa do Funil (Status)
        if (selectedStatus !== "ALL") {
          const actualStatus = lead.status_funil || "";
          const mapped = mapLegacyValue("status_funil", actualStatus);
          if (actualStatus !== selectedStatus && mapped !== selectedStatus) {
            return false;
          }
        }

        // Filtro de Status da Conversa
        if (selectedStatusConversa !== "ALL") {
          const sc = lead.status_conversa || "NUNCA_RESPONDEU";
          if (sc !== selectedStatusConversa) return false;
        }

        // Filtro de Temperatura
        if (selectedTemp !== "ALL") {
          const leadTemp = String(lead.temperatura || "").trim().toUpperCase();
          if (leadTemp !== String(selectedTemp).trim().toUpperCase()) return false;
        }

        // Filtro de Portal de Origem
        if (selectedPortal !== "ALL") {
          if (normalizePortal(lead.origem_portal) !== normalizePortal(selectedPortal)) {
            return false;
          }
        }

        return true;
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
          const dateA = parseWeddingDate(a.data_casamento);
          const dateB = parseWeddingDate(b.data_casamento);
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
  }, [leads, searchTerm, quickFilter, selectedStatus, selectedStatusConversa, selectedTemp, selectedPortal, sortField, sortDirection]);

  // Checagem de filtros ativos
  const hasActiveFilters = 
    searchTerm !== "" || 
    quickFilter !== "TODOS_ATIVOS" || 
    selectedStatus !== "ALL" || 
    selectedStatusConversa !== "ALL" || 
    selectedTemp !== "ALL" || 
    selectedPortal !== "ALL";

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setQuickFilter("TODOS_ATIVOS");
    setSelectedStatus("ALL");
    setSelectedStatusConversa("ALL");
    setSelectedTemp("ALL");
    setSelectedPortal("ALL");
    if (onClearNegociacaoOnly) onClearNegociacaoOnly();
  };

  // Cores semânticas com alto contraste no Light e legibilidade suave no Dark
  const getStatusBadgeStyle = (status: LeadStatus) => {
    switch (status) {
      case "NOVO":
      case "PRIMEIRO_CONTATO":
        return "bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800/50 font-bold";
      case "FOLLOWUP1":
      case "FOLLOWUP2":
      case "FOLLOWUP3":
      case "FOLLOWUPFINAL":
        return "bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/50 font-bold";
      case "RESPONDIDO":
        return "bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800/50 font-bold";
      case "FECHOU":
        return "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50 font-bold";
      case "PERDIDO":
      case "SEM_RETORNO":
      case "SEM_WHATSAPP":
      case "Sem WhatsApp":
        return "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/50 font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-semibold";
    }
  };

  // Cores semânticas de Temperatura: alto contraste, visualmente distintas e sem parecer desbotadas
  const getTempBadgeStyle = (temp?: string) => {
    const norm = String(temp || "").trim().toUpperCase();
    switch (norm) {
      case "QUENTE":
        return "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/50 font-bold";
      case "MORNA":
        return "bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800/50 font-bold";
      case "FRIA":
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700/60 font-semibold";
      case "CLIENTE":
        return "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/50 font-bold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-semibold";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16">
      
      {/* =========================================================================
          1. CABEÇALHO DA LISTA
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
              Lista de Leads
            </h1>
            <span 
              className="text-xs font-bold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            >
              {filteredLeads.length} {filteredLeads.length === 1 ? "lead" : "leads"}
            </span>
          </div>
          <p className="text-xs sm:text-sm mt-1 font-normal leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
            Visão consolidada do funil de noivas, histórico de interações e contatos diretos
          </p>
        </div>

        {/* Ações primárias do cabeçalho */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            title="Sincronizar base de leads"
            className="p-2.5 rounded-xl border transition cursor-pointer hover:opacity-85 disabled:opacity-50"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)"
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddingLead(true)}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. CONTROLES OPERACIONAIS: BUSCA + FILTROS RÁPIDOS + FILTROS AVANÇADOS
          ========================================================================= */}
      <div 
        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        {/* Linha superior: Barra de busca de destaque + Botão Toggle Filtros */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Busca ampla */}
          <div className="relative flex-1">
            <Search 
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" 
              style={{ color: "var(--crm-text-muted)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por noiva, e-mail, telefone ou local..."
              className="w-full rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm border transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition hover:opacity-80 cursor-pointer"
                style={{ color: "var(--crm-text-muted)" }}
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botão de Filtros Adicionais */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
            style={{
              backgroundColor: showAdvancedFilters ? "var(--crm-primary-subtle)" : "var(--crm-surface-subtle)",
              borderColor: showAdvancedFilters ? "var(--crm-primary-border)" : "var(--crm-border)",
              color: showAdvancedFilters ? "var(--crm-primary-text)" : "var(--crm-text)"
            }}
          >
            <Filter className="w-3.5 h-3.5" style={{ color: showAdvancedFilters ? "var(--crm-primary-text)" : "var(--crm-text-secondary)" }} />
            <span>Filtros do Funil</span>
            {(selectedStatus !== "ALL" || selectedTemp !== "ALL" || selectedStatusConversa !== "ALL" || selectedPortal !== "ALL") && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Linha dos Filtros Rápidos (Segmented Tabs discretos com alto contraste) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => {
              setQuickFilter("TODOS_ATIVOS");
              if (onClearNegociacaoOnly) onClearNegociacaoOnly();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shrink-0 border ${
              quickFilter === "TODOS_ATIVOS"
                ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-500/40 font-bold"
                : "border-transparent text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 font-semibold"
            }`}
          >
            <span>Todos Ativos</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              quickFilter === "TODOS_ATIVOS"
                ? "bg-indigo-200/80 text-indigo-950 dark:bg-indigo-500/30 dark:text-indigo-100"
                : "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              {activeLeadsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickFilter("NEGOCIACAO");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shrink-0 border ${
              quickFilter === "NEGOCIACAO"
                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 font-bold"
                : "border-transparent text-slate-700 hover:text-amber-950 dark:text-zinc-300 dark:hover:text-amber-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60 font-semibold"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0" />
            <span>Em Negociação</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              quickFilter === "NEGOCIACAO"
                ? "bg-amber-200/80 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100"
                : "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-300"
            }`}>
              {negociacaoCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickFilter("NOVOS");
              if (onClearNegociacaoOnly) onClearNegociacaoOnly();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shrink-0 border ${
              quickFilter === "NOVOS"
                ? "bg-sky-50 dark:bg-sky-500/20 text-sky-950 dark:text-sky-200 border-sky-300 dark:border-sky-500/40 font-bold"
                : "border-transparent text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 font-semibold"
            }`}
          >
            <span>Novos</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              quickFilter === "NOVOS"
                ? "bg-sky-200/80 text-sky-950 dark:bg-sky-500/30 dark:text-sky-100"
                : "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              {novosCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickFilter("CONVERTIDOS");
              if (onClearNegociacaoOnly) onClearNegociacaoOnly();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shrink-0 border ${
              quickFilter === "CONVERTIDOS"
                ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40 font-bold"
                : "border-transparent text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 font-semibold"
            }`}
          >
            <span>Convertidos</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              quickFilter === "CONVERTIDOS"
                ? "bg-emerald-200/80 text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-100"
                : "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              {convertidosCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickFilter("TODOS");
              if (onClearNegociacaoOnly) onClearNegociacaoOnly();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition cursor-pointer shrink-0 border ${
              quickFilter === "TODOS"
                ? "bg-slate-200 dark:bg-zinc-700 text-slate-950 dark:text-zinc-100 border-slate-300 dark:border-zinc-600 font-bold"
                : "border-transparent text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 font-semibold"
            }`}
          >
            <span>Base Total</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              quickFilter === "TODOS"
                ? "bg-slate-300 text-slate-950 dark:bg-zinc-600 dark:text-zinc-100"
                : "bg-slate-200 text-slate-900 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              {leads.length}
            </span>
          </button>
        </div>

        {/* Área Expansível de Filtros do Funil */}
        {showAdvancedFilters && (
          <div 
            className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-800 dark:text-zinc-200">
                Etapa do Funil
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs border transition focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="ALL">Todas as Etapas</option>
                {statusList.length > 0 ? (
                  statusList.map(st => <option key={st} value={st}>{st}</option>)
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
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-800 dark:text-zinc-200">
                Temperatura
              </label>
              <select
                value={selectedTemp}
                onChange={(e) => setSelectedTemp(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs border transition focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="ALL">Todas as Temperaturas</option>
                <option value="QUENTE">Quente</option>
                <option value="MORNA">Morna</option>
                <option value="FRIA">Fria</option>
                <option value="CLIENTE">Cliente</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-800 dark:text-zinc-200">
                Status da Conversa
              </label>
              <select
                value={selectedStatusConversa}
                onChange={(e) => setSelectedStatusConversa(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs border transition focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="ALL">Todos os Status</option>
                <option value="NUNCA_RESPONDEU">Nunca respondeu</option>
                <option value="RESPONDEU">Respondeu</option>
                <option value="EM_ATENDIMENTO">Em atendimento</option>
                <option value="ESCOLHENDO_MODELO">Escolhendo modelo</option>
                <option value="ORCAMENTO_ENVIADO">Orçamento enviado</option>
                <option value="NEGOCIACAO">Negociação</option>
                <option value="CLIENTE">Cliente (Fechou)</option>
                <option value="PERDIDO">Perdido</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold block mb-1 text-slate-800 dark:text-zinc-200">
                Canal de Origem
              </label>
              <select
                value={selectedPortal}
                onChange={(e) => setSelectedPortal(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs border transition focus:outline-none cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <option value="ALL">Todos os Canais</option>
                {availablePortalsForFilter.map(pName => (
                  <option key={pName} value={pName}>{pName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Chips de Filtros Ativos com Alto Contraste */}
        {hasActiveFilters && (
          <div 
            className="pt-2.5 border-t flex flex-wrap items-center gap-2 text-xs"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
              Filtros aplicados:
            </span>

            {searchTerm && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Busca: "{searchTerm}"</span>
                <button 
                  type="button" 
                  onClick={() => setSearchTerm("")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {quickFilter !== "TODOS_ATIVOS" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Filtro: {
                  quickFilter === "NEGOCIACAO" ? "Em Negociação" :
                  quickFilter === "NOVOS" ? "Novos" :
                  quickFilter === "CONVERTIDOS" ? "Convertidos" : "Base Total"
                }</span>
                <button 
                  type="button" 
                  onClick={() => setQuickFilter("TODOS_ATIVOS")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatus !== "ALL" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Etapa: {selectedStatus}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedStatus("ALL")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTemp !== "ALL" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Temperatura: {selectedTemp}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedTemp("ALL")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedStatusConversa !== "ALL" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Conversa: {selectedStatusConversa}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedStatusConversa("ALL")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedPortal !== "ALL" && (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                <span>Canal: {selectedPortal}</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedPortal("ALL")} 
                  className="hover:opacity-75 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-auto"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. TABELA OPERACIONAL DE LEADS (Densidade Média, Leitura Rápida)
          ========================================================================= */}
      <div 
        className="rounded-2xl border overflow-hidden shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        {/* Cabeçalho da Tabela Desktop (Contraste Nítido e Legibilidade Máxima) */}
        <div 
          className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 border-b text-xs font-bold select-none items-center"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
            color: "var(--crm-text)"
          }}
        >
          {/* Coluna 1: Lead & Noiva */}
          <button 
            type="button"
            onClick={() => toggleSort("nome")} 
            className="col-span-3 flex items-center gap-1.5 text-left cursor-pointer transition font-bold"
            style={{ color: "var(--crm-text)" }}
          >
            <span>Lead & Noiva</span>
            {sortField === "nome" ? (
              sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
            )}
          </button>

          {/* Coluna 2: Contato & Local */}
          <span className="col-span-2 font-bold" style={{ color: "var(--crm-text)" }}>Contato & Local</span>

          {/* Coluna 3: Casamento & Prazos */}
          <button 
            type="button"
            onClick={() => toggleSort("data_casamento")} 
            className="col-span-2 flex items-center gap-1.5 text-left cursor-pointer transition font-bold"
            style={{ color: "var(--crm-text)" }}
          >
            <span>Casamento</span>
            {sortField === "data_casamento" ? (
              sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
            )}
          </button>

          {/* Coluna 4: Situação Comercial */}
          <span className="col-span-2 font-bold" style={{ color: "var(--crm-text)" }}>Situação Comercial</span>

          {/* Coluna 5: Próxima Ação */}
          <span className="col-span-2 font-bold" style={{ color: "var(--crm-text)" }}>Próxima Ação</span>

          {/* Coluna 6: Ações de Contato / Detalhes */}
          <span className="col-span-1 text-right font-bold" style={{ color: "var(--crm-text)" }}>Ações</span>
        </div>

        {/* Linhas da Lista de Leads */}
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const interaction = getLastInteractionInfo(lead);
              const isEmNegociacao = isNegociacaoLead(lead);
              const weddingDays = getDaysUntilWedding(lead.data_casamento);
              const nextAction = getNextActionSummary(lead);
              const NextActionIcon = nextAction.icon;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                  className={`group relative w-full cursor-pointer px-4 sm:px-5 py-3.5 lg:grid lg:grid-cols-12 lg:gap-4 flex flex-col gap-3 items-start lg:items-center text-xs text-left transition-colors duration-150 ${
                    isEmNegociacao
                      ? "bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.08]"
                      : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  {/* =========================================================
                      COLUNA 1: LEAD & NOIVA (Nome, Origem, ID)
                      ========================================================= */}
                  <div className="lg:col-span-3 w-full flex items-center gap-3">
                    {/* Avatar da inicial */}
                    <div 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 border ${
                        isEmNegociacao
                          ? "bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border-amber-300 dark:border-amber-500/40"
                          : nextAction.status === "ATRASADA"
                          ? "bg-rose-100 text-rose-950 dark:bg-rose-500/20 dark:text-rose-200 border-rose-300 dark:border-rose-500/40"
                          : nextAction.status === "HOJE"
                          ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40"
                          : "bg-slate-100 text-slate-900 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 font-bold"
                      }`}
                    >
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>

                    <div className="truncate min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="font-bold text-sm block truncate text-slate-950 dark:text-zinc-50 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        >
                          {lead.nome}
                        </span>

                        {isEmNegociacao && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 shrink-0">
                            <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                            Negociação
                          </span>
                        )}
                      </div>

                      {/* Metadados secundários do lead: Origem e ID discreto */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 truncate">
                          {lead.origem_portal || "Manual"}
                        </span>
                        <span className="text-slate-400 dark:text-zinc-600">·</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                          #{lead.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================
                      COLUNA 2: CONTATO & LOCAL (Telefone, E-mail, Cidade)
                      ========================================================= */}
                  <div className="lg:col-span-2 w-full border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 pt-2 lg:pt-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0 text-slate-600 dark:text-zinc-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                        {lead.link_celular || "Sem telefone"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 shrink-0 text-slate-600 dark:text-zinc-400" />
                      <span className="text-xs text-slate-700 dark:text-zinc-300 font-normal truncate">
                        {lead.email}
                      </span>
                    </div>

                    {lead.local && (
                      <div className="flex items-center gap-1.5 text-[11px] truncate" title={lead.local}>
                        <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-slate-800 dark:text-zinc-200 font-semibold truncate">
                          {lead.local}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* =========================================================
                      COLUNA 3: CASAMENTO & PRAZOS (Data Humana + Dias)
                      ========================================================= */}
                  <div className="lg:col-span-2 w-full border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 pt-2 lg:pt-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-bold text-xs text-slate-950 dark:text-zinc-50 truncate">
                        {weddingDays.formattedDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] border font-semibold ${weddingDays.badgeColor}`}>
                        {weddingDays.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        {lead.convidados} conv.
                      </span>
                    </div>
                  </div>

                  {/* =========================================================
                      COLUNA 4: SITUAÇÃO COMERCIAL (Etapa + Temperatura)
                      ========================================================= */}
                  <div className="lg:col-span-2 w-full border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 pt-2 lg:pt-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(lead.status_funil)}`}>
                        {lead.status_funil}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTempBadgeStyle(lead.temperatura)}`}>
                        {String(lead.temperatura || "FRIA").trim().toUpperCase()}
                      </span>
                    </div>

                    {lead.status_conversa && (
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 block truncate">
                        {lead.status_conversa.replace(/_/g, " ").toLowerCase()}
                      </span>
                    )}
                  </div>

                  {/* =========================================================
                      COLUNA 5: PRÓXIMA AÇÃO DA AGENDA (Urgência e Hierarquia)
                      ========================================================= */}
                  <div className="lg:col-span-2 w-full border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 pt-2 lg:pt-0 space-y-0.5">
                    {nextAction.status === "SEM_PASSO" ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-zinc-200 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 shrink-0" />
                          <span>Sem próximo passo</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block pl-5">
                          Definir na Agenda
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {/* Linha 1: Data e Tipo de Ação com Alto Contraste */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <NextActionIcon className={`w-3.5 h-3.5 shrink-0 ${
                            nextAction.status === "ATRASADA" 
                              ? "text-rose-600 dark:text-rose-400" 
                              : nextAction.status === "HOJE" 
                              ? "text-emerald-600 dark:text-emerald-400" 
                              : "text-indigo-600 dark:text-indigo-400"
                          }`} />
                          <span className={`text-xs ${nextAction.dateColorClass}`}>
                            {nextAction.dateDisplay}
                          </span>
                          <span className="text-slate-400 dark:text-zinc-600 text-[10px]">·</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {nextAction.actionType}
                          </span>
                        </div>

                        {/* Linha 2: Status Temporal Perfeitamente Legível */}
                        <div className="flex items-center gap-1.5 pl-5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border font-semibold ${nextAction.badgeClass}`}>
                            {nextAction.temporalLabel}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* =========================================================
                      COLUNA 6: AÇÕES DE CONTATO DIRETO & CHEVRON
                      ========================================================= */}
                  <div className="lg:col-span-1 w-full border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 pt-2 lg:pt-0 flex items-center justify-between lg:justify-end gap-2">
                    <div className="flex items-center gap-1">
                      {/* Botão direto WhatsApp */}
                      {lead.link_celular ? (
                        <a
                          href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.nome}! Tudo bem? Gostaria de conversar sobre o seu orçamento de casamento na Casa Colombo Artesanal.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`Enviar WhatsApp para ${lead.nome}`}
                          aria-label={`Enviar WhatsApp para ${lead.nome}`}
                          className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      {/* Botão direto E-mail */}
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(`Acompanhamento de Orçamento - ${lead.nome}`)}`}
                          onClick={(e) => e.stopPropagation()}
                          title={`Enviar E-mail para ${lead.nome}`}
                          aria-label={`Enviar E-mail para ${lead.nome}`}
                          className="p-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-950 dark:text-sky-200 border border-sky-300 dark:border-sky-500/40 transition cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      ) : null}
                    </div>

                    <ChevronRight 
                      className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition group-hover:translate-x-0.5 shrink-0" 
                    />
                  </div>

                </div>
              );
            })
          ) : (
            /* =================================================================
               EMPTY STATE
               ================================================================= */
            <div className="p-12 text-center space-y-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-secondary)"
                }}
              >
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--crm-text)" }}>
                  Nenhum lead encontrado com estes filtros
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--crm-text-secondary)" }}>
                  Tente ajustar seus termos de busca ou remover os filtros aplicados.
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10 transition cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            RODAPÉ DA TABELA (Resumo operacional e escalabilidade)
            ========================================================================= */}
        <div 
          className="px-5 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-medium"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
            color: "var(--crm-text-secondary)"
          }}
        >
          <span className="font-semibold" style={{ color: "var(--crm-text)" }}>
            Mostrando {filteredLeads.length} de {leads.length} leads cadastrados
          </span>
          <span className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
            Clique na linha para abrir a Ficha Completa do Lead
          </span>
        </div>

      </div>

      {/* =========================================================================
          MODAL: CADASTRAR NOVO LEAD (Design System Harmonizado)
          ========================================================================= */}
      <Modal
        isOpen={isAddingLead}
        onClose={() => !isSubmitting && setIsAddingLead(false)}
        title="Cadastrar Novo Lead"
        size="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Nome da Noiva / Lead" required>
              <Input
                required
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Larissa Souza"
                disabled={isSubmitting}
              />
            </FormField>
            <FormField label="E-mail" required>
              <Input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="larissa@exemplo.com.br"
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="WhatsApp / Celular">
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(13) 99655-1212"
                disabled={isSubmitting}
              />
            </FormField>
            <FormField label="Número de Convidados (Estimativa)">
              <Input
                type="number"
                min="1"
                value={formGuests}
                onChange={(e) => setFormGuests(Number(e.target.value))}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </FormField>
            <FormField label="Mês / Ano do Casamento (Extenso)">
              <Input
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
                placeholder="Outubro de 2026"
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Local do Casamento">
              <Input
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
                placeholder="Espaço Recanto dos Sonhos, Santos"
                disabled={isSubmitting}
              />
            </FormField>
            <FormField label="Canal Originário">
              <Select
                value={formPortal}
                onChange={(e) => setFormPortal(e.target.value)}
                disabled={isSubmitting}
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

          <FormField label="Serviços / Produtos Solicitados">
            <Input
              value={formServices}
              onChange={(e) => setFormServices(e.target.value)}
              placeholder="Lembrancinhas Mini Velas, Difusores etc."
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Observações Iniciais">
            <Textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ex: Noiva busca rótulo personalizado rústico."
              disabled={isSubmitting}
            />
          </FormField>

          {/* Automação de Primeira Mensagem */}
          <div 
            className="p-4 rounded-xl border space-y-2.5 transition-colors"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)"
            }}
          >
            <label className="text-xs font-bold block" style={{ color: "var(--crm-text)" }}>
              Disparo da 1ª mensagem da sequência de automação:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnviarPrimeiraMensagem(true)}
                disabled={isSubmitting}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  enviarPrimeiraMensagem
                    ? "bg-indigo-50 text-indigo-950 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/40"
                    : "border-transparent text-slate-700 dark:text-zinc-300 hover:text-slate-950 font-semibold"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                Sim, enviar agora
              </button>
              <button
                type="button"
                onClick={() => setEnviarPrimeiraMensagem(false)}
                disabled={isSubmitting}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !enviarPrimeiraMensagem
                    ? "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40"
                    : "border-transparent text-slate-700 dark:text-zinc-300 hover:text-slate-950 font-semibold"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                Agendar para 3 dias
              </button>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: "var(--crm-text-secondary)" }}>
              {enviarPrimeiraMensagem
                ? "A 1ª mensagem do fluxo será despachada automaticamente assim que o lead for salvo."
                : "A 1ª mensagem será programada para daqui a 3 dias úteis pelo scheduler."}
            </p>
          </div>

          {/* Ações do Modal */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsAddingLead(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border transition hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Cadastrar Lead</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
