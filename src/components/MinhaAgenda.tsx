import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  CalendarCheck, Clock, MessageCircle, Sparkles, AlertCircle, 
  CheckCircle2, ExternalLink, Calendar, Search, 
  Flame, Plus, RefreshCw, Check, X, ChevronDown, ChevronRight,
  MapPin, Users, Filter
} from "lucide-react";
import { Lead } from "../types";

interface MinhaAgendaProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onRefresh: () => void;
}

// =============================================================================
// HELPER DATE & TIME FORMATTERS (Humanizados, elegantes e sem persistência)
// =============================================================================

const PT_MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PT_MONTHS_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];
const PT_WEEKDAYS = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado"
];

/** Parse seguro de datas no formato YYYY-MM-DD sem efeito colateral de timezone */
function parseLocalDate(dateStr?: string | null): { year: number; month: number; day: number; weekday: number } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return { year: y, month: m, day: d, weekday: dt.getDay() };
}

/** Formata a data para a separação de grupos na timeline (ex: "10 de setembro · quinta-feira") */
function formatGroupTimelineDate(dateKey: string, todayStr: string, tomorrowStr: string): string {
  if (dateKey === todayStr) return "Hoje · Foco operacional";
  if (dateKey === tomorrowStr) {
    const parsed = parseLocalDate(dateKey);
    if (parsed) {
      return `Amanhã · ${parsed.day} de ${PT_MONTHS_FULL[parsed.month - 1]} (${PT_WEEKDAYS[parsed.weekday]})`;
    }
    return "Amanhã";
  }

  const parsed = parseLocalDate(dateKey);
  if (!parsed) return dateKey;
  return `${parsed.day} de ${PT_MONTHS_FULL[parsed.month - 1]} · ${PT_WEEKDAYS[parsed.weekday]}`;
}

/** Formatação humana da data no topo de cada card de atividade */
function formatCardActivityDate(dateStr: string | null | undefined, urgency: "atrasado" | "hoje" | "proximo", todayStr: string) {
  if (!dateStr) return { text: "Sem data", subtext: "" };
  const clean = dateStr.trim().slice(0, 10);
  const parsed = parseLocalDate(clean);

  if (urgency === "atrasado") {
    // Calcula quantos dias de atraso
    if (parsed) {
      const targetDate = new Date(parsed.year, parsed.month - 1, parsed.day);
      const partsToday = todayStr.split("-").map(Number);
      const nowDate = new Date(partsToday[0], partsToday[1] - 1, partsToday[2]);
      const diffMs = nowDate.getTime() - targetDate.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      const dayMonth = `${parsed.day} ${PT_MONTHS_SHORT[parsed.month - 1]}`;
      return {
        text: `Atrasado · ${dayMonth}`,
        subtext: diffDays === 1 ? "ontem (1 dia atrás)" : `há ${diffDays} dias`
      };
    }
    return { text: "Atrasado", subtext: clean };
  }

  if (urgency === "hoje") {
    if (parsed) {
      return {
        text: "Hoje",
        subtext: `${parsed.day} ${PT_MONTHS_SHORT[parsed.month - 1]} · ${PT_WEEKDAYS[parsed.weekday]}`
      };
    }
    return { text: "Hoje", subtext: "" };
  }

  // Próximo
  if (parsed) {
    const dayMonth = `${parsed.day} ${PT_MONTHS_SHORT[parsed.month - 1]}`;
    return {
      text: `${dayMonth}`,
      subtext: PT_WEEKDAYS[parsed.weekday]
    };
  }

  return { text: clean, subtext: "" };
}

/** Formata o casamento de forma elegante e calcula a proximidade em dias (frontend only) */
function formatWeddingHumanContext(dataCasamento?: string | null, mesCasamento?: string | null, todayStr = ""): string | null {
  if (dataCasamento && dataCasamento.trim()) {
    const parsed = parseLocalDate(dataCasamento);
    if (parsed) {
      const dayMonthYear = `${parsed.day} ${PT_MONTHS_SHORT[parsed.month - 1]} ${parsed.year}`;
      if (todayStr) {
        const target = new Date(parsed.year, parsed.month - 1, parsed.day);
        const partsToday = todayStr.split("-").map(Number);
        const now = new Date(partsToday[0], partsToday[1] - 1, partsToday[2]);
        const diffMs = target.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          return `${dayMonthYear} (em ${diffDays} dias)`;
        } else if (diffDays === 0) {
          return `${dayMonthYear} (hoje!)`;
        } else {
          return `${dayMonthYear} (realizado)`;
        }
      }
      return dayMonthYear;
    }
    return dataCasamento;
  }

  if (mesCasamento && mesCasamento.trim()) {
    return mesCasamento;
  }

  return null;
}

export default function MinhaAgenda({
  leads,
  onSelectLead,
  onRefresh
}: MinhaAgendaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"TODAS" | "ATRASADAS" | "HOJE" | "PROXIMOS" | "SEM_PASSO">("TODAS");
  const [isSemPassoExpanded, setIsSemPassoExpanded] = useState(false);
  
  // Modal states
  const [activityModalLead, setActivityModalLead] = useState<Lead | null>(null);
  const [modalType, setModalType] = useState<"RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR">("ACOMPANHAR");
  const [modalDate, setModalDate] = useState("");
  const [modalObs, setModalObs] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reschedule modal
  const [rescheduleLead, setRescheduleLead] = useState<Lead | null>(null);

  // Post-completion prompt
  const [completedLeadPrompt, setCompletedLeadPrompt] = useState<Lead | null>(null);

  // Helper date calculations in SP timezone YYYY-MM-DD
  const getTodayStr = () => {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  };

  const getPlus7Str = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  };

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const plus7Str = getPlus7Str();

  const isClosed = (l: Lead) => {
    const sf = String(l.status_funil || "").toUpperCase();
    const sc = String(l.status_conversa || "").toUpperCase();
    const temp = String(l.temperatura || "").toUpperCase();
    return (
      ["PERDIDO", "SEM_RETORNO", "FECHOU", "SEM_WHATSAPP"].includes(sf) ||
      sf === "SEM WHATSAPP" ||
      sc === "PERDIDO" ||
      sc === "CLIENTE" ||
      temp === "CLIENTE"
    );
  };

  // Categorize leads
  const atrasadasLeads = leads.filter((l) => {
    if (!l.proxima_atividade_em) return false;
    const dt = String(l.proxima_atividade_em).trim().slice(0, 10);
    return dt < todayStr;
  }).sort((a, b) => String(a.proxima_atividade_em).localeCompare(String(b.proxima_atividade_em)));

  const typePriorityMap = { RESPONDER: 1, ACOMPANHAR: 2, REATIVAR: 3, CATIVAR: 4 };

  const hojeLeads = leads.filter((l) => {
    if (!l.proxima_atividade_em) return false;
    const dt = String(l.proxima_atividade_em).trim().slice(0, 10);
    return dt === todayStr;
  }).sort((a, b) => {
    const pA = typePriorityMap[a.tipo_proxima_atividade || "ACOMPANHAR"] || 5;
    const pB = typePriorityMap[b.tipo_proxima_atividade || "ACOMPANHAR"] || 5;
    return pA - pB;
  });

  const proximos7Leads = leads.filter((l) => {
    if (!l.proxima_atividade_em) return false;
    const dt = String(l.proxima_atividade_em).trim().slice(0, 10);
    return dt > todayStr && dt <= plus7Str;
  }).sort((a, b) => String(a.proxima_atividade_em).localeCompare(String(b.proxima_atividade_em)));

  const semProximoPassoLeads = leads.filter((l) => {
    if (l.proxima_atividade_em) return false;
    return !isClosed(l);
  }).sort((a, b) => String(b.ultima_interacao_em || b.created_at).localeCompare(String(a.ultima_interacao_em || a.created_at)));

  // Filter by search term if provided
  const filterBySearch = (list: Lead[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (l) =>
        l.nome.toLowerCase().includes(term) ||
        (l.local && l.local.toLowerCase().includes(term)) ||
        (l.observacao_proxima_atividade && l.observacao_proxima_atividade.toLowerCase().includes(term)) ||
        (l.link_celular && l.link_celular.includes(term))
    );
  };

  // Dynamic Operational sentence generated from actual numbers
  const getOperationalHeadline = () => {
    const atrasadas = atrasadasLeads.length;
    const hoje = hojeLeads.length;
    const proximos = proximos7Leads.length;

    if (atrasadas > 0) {
      return `Atenção: você tem ${atrasadas} ${atrasadas === 1 ? "atividade pendente que exige ação imediata" : "atividades pendentes que exigem ação imediata"}${hoje > 0 ? ` e ${hoje} programada${hoje > 1 ? "s" : ""} para hoje` : ""}.`;
    }
    if (hoje > 0) {
      return `Você tem ${hoje} ${hoje === 1 ? "atividade programada" : "atividades programadas"} para focar hoje.${proximos > 0 ? ` Há mais ${proximos} nos próximos 7 dias.` : ""}`;
    }
    if (proximos > 0) {
      return `Você está em dia com a operação. Há ${proximos} ${proximos === 1 ? "acompanhamento agendado" : "acompanhamentos agendados"} nos próximos 7 dias.`;
    }
    return `Você está 100% em dia. Todas as atividades foram concluídas com sucesso.`;
  };

  // Complete Activity handler
  const handleCompleteActivity = async (lead: Lead) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/leads/${lead.id}/next-activity/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        await onRefresh();
        setCompletedLeadPrompt(lead);
      } else {
        alert("Erro ao concluir atividade.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Set/Edit Next Step Modal
  const openSetActivityModal = (lead: Lead) => {
    setActivityModalLead(lead);
    setModalType(lead.tipo_proxima_atividade || "ACOMPANHAR");
    setModalDate(
      lead.proxima_atividade_em
        ? String(lead.proxima_atividade_em).slice(0, 10)
        : todayStr
    );
    setModalObs(lead.observacao_proxima_atividade || "");
  };

  // Save Set/Edit Activity
  const handleSaveActivity = async () => {
    if (!activityModalLead || !modalDate) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/leads/${activityModalLead.id}/next-activity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_proxima_atividade: modalType,
          proxima_atividade_em: modalDate,
          observacao_proxima_atividade: modalObs
        })
      });
      if (res.ok) {
        setActivityModalLead(null);
        await onRefresh();
      } else {
        alert("Erro ao salvar próxima atividade.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Reschedule handler
  const handleQuickReschedule = async (lead: Lead, daysToAdd: number | string) => {
    let targetDate = todayStr;
    if (typeof daysToAdd === "number") {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      targetDate = d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    } else {
      targetDate = daysToAdd;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/leads/${lead.id}/next-activity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_proxima_atividade: lead.tipo_proxima_atividade || "ACOMPANHAR",
          proxima_atividade_em: targetDate,
          observacao_proxima_atividade: lead.observacao_proxima_atividade || ""
        })
      });
      if (res.ok) {
        setRescheduleLead(null);
        await onRefresh();
      } else {
        alert("Erro ao reagendar atividade.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  // Type Badges styling
  const getTypeBadge = (type?: string | null) => {
    switch (type) {
      case "RESPONDER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <MessageCircle className="w-3 h-3" /> Responder
          </span>
        );
      case "ACOMPANHAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
            <Clock className="w-3 h-3" /> Acompanhar
          </span>
        );
      case "REATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Flame className="w-3 h-3" /> Reativar
          </span>
        );
      case "CATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" /> Cativar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--crm-surface-subtle)", color: "var(--crm-text-muted)" }}>
            Acompanhamento
          </span>
        );
    }
  };

  // Group future 7 days by date
  const groupedProximos: Record<string, Lead[]> = {};
  proximos7Leads.forEach((l) => {
    const dt = String(l.proxima_atividade_em).slice(0, 10);
    if (!groupedProximos[dt]) groupedProximos[dt] = [];
    groupedProximos[dt].push(l);
  });

  const filteredAtrasadas = filterBySearch(atrasadasLeads);
  const filteredHoje = filterBySearch(hojeLeads);
  const filteredProximos = filterBySearch(proximos7Leads);
  const filteredSemPasso = filterBySearch(semProximoPassoLeads);

  return (
    <div className="space-y-8 animate-fade-in w-full pb-16">
      
      {/* =========================================================================
          PAGE HEADER (Título, Frase Operacional e Barra de Busca)
          ========================================================================= */}
      <section className="space-y-3 pt-1">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                Minha Agenda
              </h1>
            </div>
            
            {/* Frase contextual humana e sem jargões */}
            <p className="text-sm sm:text-base mt-2 font-normal max-w-3xl leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
              {getOperationalHeadline()}
            </p>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--crm-text-muted)" }} />
              <input
                type="text"
                placeholder="Buscar lead, local ou anotação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm border transition focus:outline-none"
                style={{
                  backgroundColor: "var(--crm-surface)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition hover:opacity-80 cursor-pointer"
                  style={{ color: "var(--crm-text-muted)" }}
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl border transition cursor-pointer hover:opacity-90 shrink-0"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
              title="Atualizar agenda"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          COMPOSIÇÃO 70/30 (Aproveitamento amplo em telas largas)
          Coluna Principal (~70%) + Visão Rápida (~30%)
          ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* -----------------------------------------------------------------------
            ÁREA PRINCIPAL (~70%): ATIVIDADES E PRÓXIMOS ACOMPANHAMENTOS
            ----------------------------------------------------------------------- */}
        <div className="xl:col-span-8 space-y-9 min-w-0">

          {/* =====================================================================
              SEÇÃO 1: ATRASADOS
              ===================================================================== */}
          {(activeFilter === "TODAS" || activeFilter === "ATRASADAS") && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                    Atrasados
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {filteredAtrasadas.length}
                  </span>
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: "var(--crm-text-muted)" }}>
                  Aguardam ação imediata
                </span>
              </div>

              {/* Empty State Discreto (pouquíssimo espaço quando zero) */}
              {filteredAtrasadas.length === 0 ? (
                <div className="flex items-center gap-2 text-xs py-1.5" style={{ color: "var(--crm-text-muted)" }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Nenhuma atividade atrasada.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAtrasadas.map((lead) => (
                    <LeadActivityCard
                      key={lead.id}
                      lead={lead}
                      urgency="atrasado"
                      todayStr={todayStr}
                      getTypeBadge={getTypeBadge}
                      onSelectLead={onSelectLead}
                      onComplete={handleCompleteActivity}
                      onReschedule={() => setRescheduleLead(lead)}
                      onEdit={() => openSetActivityModal(lead)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =====================================================================
              SEÇÃO 2: PARA HOJE
              ===================================================================== */}
          {(activeFilter === "TODAS" || activeFilter === "HOJE") && (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                    Para Hoje
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {filteredHoje.length}
                  </span>
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: "var(--crm-text-muted)" }}>
                  Prioridade para execução hoje
                </span>
              </div>

              {/* Empty State Discreto */}
              {filteredHoje.length === 0 ? (
                <div className="flex items-center gap-2 text-xs py-1.5" style={{ color: "var(--crm-text-muted)" }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tudo em dia — nenhuma atividade para hoje.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHoje.map((lead) => (
                    <LeadActivityCard
                      key={lead.id}
                      lead={lead}
                      urgency="hoje"
                      todayStr={todayStr}
                      getTypeBadge={getTypeBadge}
                      onSelectLead={onSelectLead}
                      onComplete={handleCompleteActivity}
                      onReschedule={() => setRescheduleLead(lead)}
                      onEdit={() => openSetActivityModal(lead)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =====================================================================
              SEÇÃO 3: PRÓXIMOS 7 DIAS
              ===================================================================== */}
          {(activeFilter === "TODAS" || activeFilter === "PROXIMOS") && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                    Próximos 7 Dias
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {filteredProximos.length}
                  </span>
                </div>
                <span className="text-xs hidden sm:inline" style={{ color: "var(--crm-text-muted)" }}>
                  Acompanhamentos futuros
                </span>
              </div>

              {/* Empty State Discreto */}
              {Object.keys(groupedProximos).length === 0 ? (
                <div className="flex items-center gap-2 text-xs py-1.5" style={{ color: "var(--crm-text-muted)" }}>
                  <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Nenhum acompanhamento previsto para a próxima semana.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.keys(groupedProximos)
                    .sort()
                    .map((dateKey) => {
                      const dayLeads = filterBySearch(groupedProximos[dateKey]);
                      if (dayLeads.length === 0) return null;
                      return (
                        <div key={dateKey} className="space-y-3">
                          {/* Divisor editorial de data: formatação elegante SEM redundância */}
                          <div className="flex items-center gap-3 pt-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {formatGroupTimelineDate(dateKey, todayStr, tomorrowStr)}
                            </span>
                            <div className="h-px flex-1" style={{ backgroundColor: "var(--crm-border)" }} />
                          </div>

                          <div className="space-y-4">
                            {dayLeads.map((lead) => (
                              <LeadActivityCard
                                key={lead.id}
                                lead={lead}
                                urgency="proximo"
                                todayStr={todayStr}
                                getTypeBadge={getTypeBadge}
                                onSelectLead={onSelectLead}
                                onComplete={handleCompleteActivity}
                                onReschedule={() => setRescheduleLead(lead)}
                                onEdit={() => openSetActivityModal(lead)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          )}

          {/* =====================================================================
              SEÇÃO 4: SEM PRÓXIMO PASSO (Exibida SOMENTE se houver leads ou filtro)
              ===================================================================== */}
          {(filteredSemPasso.length > 0 || activeFilter === "SEM_PASSO") && (
            <section
              className="rounded-2xl border p-5 transition-all"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)"
              }}
            >
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                onClick={() => setIsSemPassoExpanded((prev) => !prev)}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold" style={{ color: "var(--crm-text)" }}>
                        Sem Próximo Passo
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {filteredSemPasso.length}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--crm-text-secondary)" }}>
                      Oportunidades ativas aguardando definição de acompanhamento
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border transition hover:opacity-80"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)"
                    }}
                  >
                    <span>{isSemPassoExpanded ? "Recolher fila" : "Visualizar fila"}</span>
                    {isSemPassoExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conteúdo expansível */}
              {isSemPassoExpanded && (
                <div className="mt-5 pt-4 border-t space-y-3 animate-fade-in" style={{ borderColor: "var(--crm-border)" }}>
                  {filteredSemPasso.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs py-2" style={{ color: "var(--crm-text-muted)" }}>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Todos os leads ativos possuem um próximo passo definido.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredSemPasso.map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition hover:opacity-95"
                          style={{
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)"
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <button
                                onClick={() => onSelectLead(lead.id)}
                                className="font-bold text-sm hover:underline text-left transition flex items-center gap-1.5 cursor-pointer"
                                style={{ color: "var(--crm-text)" }}
                              >
                                <span>{lead.nome}</span>
                                <ExternalLink className="w-3 h-3 text-[var(--crm-text-muted)]" />
                              </button>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded font-medium border"
                                  style={{
                                    backgroundColor: "var(--crm-surface)",
                                    borderColor: "var(--crm-border)",
                                    color: "var(--crm-text-secondary)"
                                  }}
                                >
                                  {lead.status_funil || "Novo"}
                                </span>
                                {lead.local && (
                                  <span className="text-[11px]" style={{ color: "var(--crm-text-secondary)" }}>
                                    · {lead.local}
                                  </span>
                                )}
                              </div>
                            </div>

                            {lead.link_celular && (
                              <a
                                href={
                                  lead.link_celular.startsWith("http")
                                    ? lead.link_celular
                                    : `https://wa.me/55${lead.telefone_limpo || lead.link_celular}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 hover:bg-emerald-500/20 transition cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3" /> WhatsApp
                              </a>
                            )}
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: "var(--crm-border)" }}>
                            <button
                              onClick={() => onSelectLead(lead.id)}
                              className="text-xs font-medium hover:underline cursor-pointer"
                              style={{ color: "var(--crm-text-muted)" }}
                            >
                              Ver Detalhes
                            </button>
                            <button
                              onClick={() => openSetActivityModal(lead)}
                              className="px-2.5 py-1 bg-indigo-600 text-white font-medium text-xs rounded-lg hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Definir Passo
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

        </div>

        {/* -----------------------------------------------------------------------
            ÁREA SECUNDÁRIA (~30%): VISÃO RÁPIDA (Resumo operacional compacto)
            Design editorial leve, sem retângulos pesados.
            ----------------------------------------------------------------------- */}
        <aside className="xl:col-span-4 space-y-4 xl:sticky xl:top-20">
          
          <div
            className="p-5 rounded-2xl border transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)"
            }}
          >
            {/* Header da Visão Rápida */}
            <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: "var(--crm-border)" }}>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--crm-text-secondary)" }}>
                  Visão Rápida
                </h3>
              </div>
              <span className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
                {leads.length} leads totais
              </span>
            </div>

            {/* Linhas editoriais de status (clicáveis para filtrar a agenda) */}
            <div className="space-y-1 text-xs">
              
              {/* Todas */}
              <button
                type="button"
                onClick={() => setActiveFilter("TODAS")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                  activeFilter === "TODAS"
                    ? "font-bold ring-1 ring-indigo-500/30"
                    : "hover:bg-zinc-500/5 font-medium"
                }`}
                style={{
                  backgroundColor: activeFilter === "TODAS" ? "var(--crm-primary-subtle)" : "transparent",
                  color: activeFilter === "TODAS" ? "var(--crm-primary-text)" : "var(--crm-text)"
                }}
              >
                <span>Todas as atividades</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-zinc-500/10">
                  {atrasadasLeads.length + hojeLeads.length + proximos7Leads.length}
                </span>
              </button>

              {/* Atrasadas */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "ATRASADAS" ? "TODAS" : "ATRASADAS")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                  activeFilter === "ATRASADAS"
                    ? "font-bold ring-1 ring-rose-500/30"
                    : "hover:bg-zinc-500/5 font-medium"
                }`}
                style={{
                  backgroundColor: activeFilter === "ATRASADAS" ? "rgba(239, 68, 68, 0.08)" : "transparent",
                  color: activeFilter === "ATRASADAS" ? "#e11d48" : "var(--crm-text)"
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${atrasadasLeads.length > 0 ? "bg-rose-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                  <span>Atrasadas</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  atrasadasLeads.length > 0
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "text-[var(--crm-text-muted)]"
                }`}>
                  {atrasadasLeads.length === 0 ? "0" : atrasadasLeads.length}
                </span>
              </button>

              {/* Hoje */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "HOJE" ? "TODAS" : "HOJE")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                  activeFilter === "HOJE"
                    ? "font-bold ring-1 ring-emerald-500/30"
                    : "hover:bg-zinc-500/5 font-medium"
                }`}
                style={{
                  backgroundColor: activeFilter === "HOJE" ? "rgba(34, 197, 94, 0.08)" : "transparent",
                  color: activeFilter === "HOJE" ? "#16a34a" : "var(--crm-text)"
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${hojeLeads.length > 0 ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                  <span>Para Hoje</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  hojeLeads.length > 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--crm-text-muted)]"
                }`}>
                  {hojeLeads.length}
                </span>
              </button>

              {/* Próximos 7 dias */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "PROXIMOS" ? "TODAS" : "PROXIMOS")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                  activeFilter === "PROXIMOS"
                    ? "font-bold ring-1 ring-indigo-500/30"
                    : "hover:bg-zinc-500/5 font-medium"
                }`}
                style={{
                  backgroundColor: activeFilter === "PROXIMOS" ? "rgba(99, 102, 241, 0.08)" : "transparent",
                  color: activeFilter === "PROXIMOS" ? "#4f46e5" : "var(--crm-text)"
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${proximos7Leads.length > 0 ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700"}`} />
                  <span>Próximos 7 dias</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  {proximos7Leads.length}
                </span>
              </button>

              {/* Sem próximo passo */}
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === "SEM_PASSO" ? "TODAS" : "SEM_PASSO")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition cursor-pointer text-left ${
                  activeFilter === "SEM_PASSO"
                    ? "font-bold ring-1 ring-amber-500/30"
                    : "hover:bg-zinc-500/5 font-medium"
                }`}
                style={{
                  backgroundColor: activeFilter === "SEM_PASSO" ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  color: activeFilter === "SEM_PASSO" ? "#d97706" : "var(--crm-text)"
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${semProximoPassoLeads.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span>Sem próximo passo</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  semProximoPassoLeads.length > 0
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {semProximoPassoLeads.length === 0 ? "0 ✓" : semProximoPassoLeads.length}
                </span>
              </button>

            </div>

            {/* Rodapé do painel com status do filtro atual */}
            <div className="mt-4 pt-3 border-t text-xs space-y-1.5" style={{ borderColor: "var(--crm-border)" }}>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--crm-text-muted)" }}>Filtro ativo:</span>
                <span className="font-semibold" style={{ color: "var(--crm-text)" }}>
                  {activeFilter === "TODAS" && "Todas"}
                  {activeFilter === "ATRASADAS" && "Apenas Atrasadas"}
                  {activeFilter === "HOJE" && "Apenas Hoje"}
                  {activeFilter === "PROXIMOS" && "Apenas Próximos 7 Dias"}
                  {activeFilter === "SEM_PASSO" && "Sem Próximo Passo"}
                </span>
              </div>

              {activeFilter !== "TODAS" && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("TODAS")}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium block pt-1 cursor-pointer"
                >
                  ← Ver todas as atividades
                </button>
              )}
            </div>
          </div>

          {/* Dica operacional sutil e contextual */}
          <div
            className="p-4 rounded-2xl border text-xs leading-relaxed space-y-1 transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text-secondary)"
            }}
          >
            <p className="font-semibold" style={{ color: "var(--crm-text)" }}>
              Diretriz do Ateliê:
            </p>
            <p>
              Ao encerrar uma conversa pelo WhatsApp ou ligação, utilize o botão <strong>Concluir</strong> e cadastre a data do retorno acordado para manter a oportunidade aquecida.
            </p>
          </div>

        </aside>

      </div>

      {/* =========================================================================
          MODAL 1: DEFINIR / ALTERAR PRÓXIMO PASSO
          ========================================================================= */}
      {activityModalLead && createPortal(
        <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl my-auto transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)"
            }}
          >
            <div className="flex items-center justify-between border-b pb-3.5" style={{ borderColor: "var(--crm-border)" }}>
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base">
                  Próximo Passo • {activityModalLead.nome}
                </h3>
              </div>
              <button
                onClick={() => setActivityModalLead(null)}
                className="p-1 rounded-lg hover:opacity-80 transition cursor-pointer"
                style={{ color: "var(--crm-text-muted)" }}
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--crm-text-secondary)" }}>
                  Tipo da Ação Comercial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType("RESPONDER")}
                    className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2 cursor-pointer ${
                      modalType === "RESPONDER"
                        ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500"
                        : "hover:opacity-90"
                    }`}
                    style={
                      modalType !== "RESPONDER"
                        ? {
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }
                        : undefined
                    }
                  >
                    <MessageCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Responder</p>
                      <p className="text-[11px] font-normal opacity-80">Pendente do ateliê</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("ACOMPANHAR")}
                    className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2 cursor-pointer ${
                      modalType === "ACOMPANHAR"
                        ? "bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                        : "hover:opacity-90"
                    }`}
                    style={
                      modalType !== "ACOMPANHAR"
                        ? {
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }
                        : undefined
                    }
                  >
                    <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Acompanhar</p>
                      <p className="text-[11px] font-normal opacity-80">Aguardando noiva</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("REATIVAR")}
                    className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2 cursor-pointer ${
                      modalType === "REATIVAR"
                        ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500"
                        : "hover:opacity-90"
                    }`}
                    style={
                      modalType !== "REATIVAR"
                        ? {
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }
                        : undefined
                    }
                  >
                    <Flame className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Reativar</p>
                      <p className="text-[11px] font-normal opacity-80">Contato esfriou</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("CATIVAR")}
                    className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2 cursor-pointer ${
                      modalType === "CATIVAR"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                        : "hover:opacity-90"
                    }`}
                    style={
                      modalType !== "CATIVAR"
                        ? {
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }
                        : undefined
                    }
                  >
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Cativar</p>
                      <p className="text-[11px] font-normal opacity-80">Nova oportunidade</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Data Prevista
                </label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-xs sm:text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Observação ou Intenção do Contato
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Enviar catálogo de modelos rústicos e tirar dúvidas sobre a data..."
                  value={modalObs}
                  onChange={(e) => setModalObs(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-xs sm:text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t" style={{ borderColor: "var(--crm-border)" }}>
              <button
                onClick={() => setActivityModalLead(null)}
                className="px-4 py-2 text-xs font-medium rounded-xl border transition hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-secondary)"
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveActivity}
                disabled={isSaving || !modalDate}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSaving ? "Salvando..." : "Salvar Agendamento"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL 2: REAGENDAR RÁPIDO
          ========================================================================= */}
      {rescheduleLead && createPortal(
        <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl my-auto transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)"
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--crm-border)" }}>
              <h3 className="font-bold text-sm">
                Reagendar • {rescheduleLead.nome}
              </h3>
              <button
                onClick={() => setRescheduleLead(null)}
                className="p-1 rounded-lg hover:opacity-80 transition cursor-pointer"
                style={{ color: "var(--crm-text-muted)" }}
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
              Selecione o novo prazo mantendo a atividade e notas atuais:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 0)}
                className="p-3 border rounded-xl font-semibold text-center transition hover:border-indigo-500 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                Hoje
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 1)}
                className="p-3 border rounded-xl font-semibold text-center transition hover:border-indigo-500 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                Amanhã
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 3)}
                className="p-3 border rounded-xl font-semibold text-center transition hover:border-indigo-500 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                Em 3 dias
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 7)}
                className="p-3 border rounded-xl font-semibold text-center transition hover:border-indigo-500 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
              >
                Em 7 dias
              </button>
            </div>

            <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--crm-border)" }}>
              <label className="block text-xs font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                Ou escolha uma data específica:
              </label>
              <input
                type="date"
                className="w-full rounded-xl p-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)"
                }}
                onChange={(e) => {
                  if (e.target.value) {
                    handleQuickReschedule(rescheduleLead, e.target.value);
                  }
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          MODAL 3: PERGUNTA PÓS-CONCLUSÃO
          ========================================================================= */}
      {completedLeadPrompt && createPortal(
        <div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center my-auto transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)"
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Atividade Concluída!</h3>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
                Registrada no histórico de <strong>{completedLeadPrompt.nome}</strong>.
              </p>
            </div>

            <div
              className="p-4 rounded-xl border text-left text-xs space-y-1"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)"
              }}
            >
              <p className="font-semibold" style={{ color: "var(--crm-text)" }}>
                Deseja programar o próximo passo agora?
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
                Manter a sequência de contato ativa aumenta consideravelmente as chances de conversão.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  const target = completedLeadPrompt;
                  setCompletedLeadPrompt(null);
                  openSetActivityModal(target);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Sim, Agendar Próximo Passo
              </button>
              <button
                onClick={() => setCompletedLeadPrompt(null)}
                className="w-full py-2 text-xs font-medium rounded-xl border transition hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-secondary)"
                }}
              >
                Concluir sem agendamento
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// =============================================================================
// SUB-COMPONENTE: CARD DE ATIVIDADE PREMIUM (Paulo Araujo & demais leads)
// Hierarquia clara: Data -> Ação -> Nome -> Contexto -> Anotação -> Ações
// Menos containers aninhados, divisões limpas e botões com peso visual distinto.
// =============================================================================
interface LeadActivityCardProps {
  key?: string;
  lead: Lead;
  urgency: "atrasado" | "hoje" | "proximo";
  todayStr: string;
  getTypeBadge: (type?: string | null) => React.ReactNode;
  onSelectLead: (id: string) => void;
  onComplete: (lead: Lead) => void;
  onReschedule: () => void;
  onEdit: () => void;
}

function LeadActivityCard({
  lead,
  urgency,
  todayStr,
  getTypeBadge,
  onSelectLead,
  onComplete,
  onReschedule,
  onEdit
}: LeadActivityCardProps) {
  const isClosedLead = (l: Lead) => {
    const sf = String(l.status_funil || "").toUpperCase();
    const sc = String(l.status_conversa || "").toUpperCase();
    const temp = String(l.temperatura || "").toUpperCase();
    return (
      ["PERDIDO", "SEM_RETORNO", "FECHOU", "SEM_WHATSAPP"].includes(sf) ||
      sf === "SEM WHATSAPP" ||
      sc === "PERDIDO" ||
      sc === "CLIENTE" ||
      temp === "CLIENTE"
    );
  };

  const closed = isClosedLead(lead);
  const dateInfo = formatCardActivityDate(lead.proxima_atividade_em, urgency, todayStr);
  const weddingContext = formatWeddingHumanContext(lead.data_casamento, lead.mes_casamento, todayStr);

  // Bordas e destaques sutis por urgência operacional
  const getCardStyle = () => {
    if (urgency === "atrasado") {
      return {
        borderColor: "rgba(239, 68, 68, 0.3)",
        backgroundColor: "var(--crm-surface)"
      };
    }
    if (urgency === "hoje") {
      return {
        borderColor: "rgba(34, 197, 94, 0.3)",
        backgroundColor: "var(--crm-surface)"
      };
    }
    return {
      borderColor: "var(--crm-border)",
      backgroundColor: "var(--crm-surface)"
    };
  };

  return (
    <article
      className="p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between space-y-4 shadow-2xs hover:border-indigo-400/40"
      style={getCardStyle()}
    >
      {/* 1. HIERARQUIA SUPERIOR: DATA & AÇÃO NECESSÁRIA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          {urgency === "atrasado" && (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{dateInfo.text}</span>
              {dateInfo.subtext && (
                <span className="font-normal opacity-80">({dateInfo.subtext})</span>
              )}
            </div>
          )}

          {urgency === "hoje" && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{dateInfo.text}</span>
              {dateInfo.subtext && (
                <span className="font-normal opacity-80">· {dateInfo.subtext}</span>
              )}
            </div>
          )}

          {urgency === "proximo" && (
            <div className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
              <Calendar className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span>{dateInfo.text}</span>
              {dateInfo.subtext && (
                <span className="font-normal opacity-70">· {dateInfo.subtext}</span>
              )}
            </div>
          )}
        </div>

        {/* Badge da Ação Comercial */}
        <div className="flex items-center gap-2">
          {getTypeBadge(lead.tipo_proxima_atividade)}

          {closed && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Encerrado
            </span>
          )}
        </div>
      </div>

      {/* 2. NOME DO LEAD & CONTEXTO HUMANO */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <button
            onClick={() => onSelectLead(lead.id)}
            className="font-bold text-lg hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left transition flex items-center gap-1.5 cursor-pointer leading-tight"
            style={{ color: "var(--crm-text)" }}
          >
            <span>{lead.nome}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--crm-text-muted)]" />
          </button>
        </div>

        {/* Contexto: Santos · Casamento 23 dez 2026 (em 111 dias) · 100 convidados · Etapa Respondido */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
          {lead.local && (
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: "var(--crm-text)" }}>
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span>{lead.local}</span>
            </span>
          )}

          {lead.local && weddingContext && <span>·</span>}

          {weddingContext && (
            <span>
              Casamento <strong>{weddingContext}</strong>
            </span>
          )}

          {lead.convidados > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span>{lead.convidados} convidados</span>
              </span>
            </>
          )}

          {lead.status_funil && (
            <>
              <span>·</span>
              <span>
                Etapa: <strong style={{ color: "var(--crm-text)" }}>{lead.status_funil}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3. ANOTAÇÃO / PRÓXIMO PASSO (Discreta, sem retângulo aninhado pesado) */}
      {lead.observacao_proxima_atividade && (
        <div className="border-l-2 border-indigo-500/40 dark:border-indigo-400/30 pl-3 py-1 text-xs sm:text-sm leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
          <span className="text-[11px] font-semibold block uppercase tracking-wider mb-0.5" style={{ color: "var(--crm-text-muted)" }}>
            Próximo passo planejado
          </span>
          <p className="whitespace-pre-wrap italic">
            "{lead.observacao_proxima_atividade}"
          </p>
        </div>
      )}

      {/* 4. BARRA DE AÇÕES COM HIERARQUIA VISUAL CLARA
          - Concluir: Ação positiva principal (Verde destacado)
          - WhatsApp: Ação de comunicação (Verde WhatsApp)
          - Reagendar: Secundária (Borda neutra)
          - Alterar / Abrir detalhes: Discretas (Texto sutil)
      */}
      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2.5" style={{ borderColor: "var(--crm-border)" }}>
        {/* Ações discretas à esquerda */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectLead(lead.id)}
            className="text-xs font-medium hover:underline cursor-pointer transition"
            style={{ color: "var(--crm-text-muted)" }}
          >
            Abrir detalhes
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <button
            onClick={onEdit}
            className="text-xs font-medium hover:underline cursor-pointer transition"
            style={{ color: "var(--crm-text-muted)" }}
          >
            Alterar
          </button>
        </div>

        {/* Ações operacionais à direita organizadas por peso visual */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Reagendar (Secundária) */}
          <button
            onClick={onReschedule}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border transition hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)"
            }}
          >
            Reagendar
          </button>

          {/* WhatsApp (Comunicação) */}
          {lead.link_celular && (
            <a
              href={
                lead.link_celular.startsWith("http")
                  ? lead.link_celular
                  : `https://wa.me/55${lead.telefone_limpo || lead.link_celular}`
              }
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              title="Conversar no WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Concluir (Ação Positiva Principal) */}
          <button
            onClick={() => onComplete(lead)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Concluir</span>
          </button>
        </div>
      </div>
    </article>
  );
}
