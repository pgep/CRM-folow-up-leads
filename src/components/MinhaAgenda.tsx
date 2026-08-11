import React, { useState } from "react";
import { createPortal } from "react-dom";
import { 
  CalendarCheck, Clock, MessageCircle, Sparkles, AlertCircle, 
  CheckCircle2, ExternalLink, Calendar, Search, 
  Flame, Zap, Plus, ArrowRight, RefreshCw, Check, X
} from "lucide-react";
import { Lead } from "../types";

interface MinhaAgendaProps {
  leads: Lead[];
  onSelectLead: (id: string) => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onRefresh: () => void;
}

export default function MinhaAgenda({
  leads,
  onSelectLead,
  onUpdateLead,
  onRefresh
}: MinhaAgendaProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"TODAS" | "ATRASADAS" | "HOJE" | "PROXIMOS" | "SEM_PASSO">("TODAS");
  
  // Modal states
  const [activityModalLead, setActivityModalLead] = useState<Lead | null>(null);
  const [modalType, setModalType] = useState<"RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR">("ACOMPANHAR");
  const [modalDate, setModalDate] = useState("");
  const [modalObs, setModalObs] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Rechedule modal
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

  const todayStr = getTodayStr();
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
      targetDate = daysToAdd; // Custom string
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <MessageCircle className="w-3.5 h-3.5" /> RESPONDER
          </span>
        );
      case "ACOMPANHAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Clock className="w-3.5 h-3.5" /> ACOMPANHAR
          </span>
        );
      case "REATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Flame className="w-3.5 h-3.5" /> REATIVAR
          </span>
        );
      case "CATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" /> CATIVAR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400">
            Sem tipo
          </span>
        );
    }
  };

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const clean = dateStr.trim().slice(0, 10);
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Group future 7 days by date
  const groupedProximos: Record<string, Lead[]> = {};
  proximos7Leads.forEach((l) => {
    const dt = String(l.proxima_atividade_em).slice(0, 10);
    if (!groupedProximos[dt]) groupedProximos[dt] = [];
    groupedProximos[dt].push(l);
  });

  return (
    <div className="space-y-6 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#89F0B2]" />
            <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
              MINHA AGENDA
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Veja quem precisa da sua atenção hoje. Sua fila de próximas ações comerciais manuais.
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar lead ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#89F0B2]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded transition"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onRefresh}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg transition shrink-0"
            title="Atualizar Agenda"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Indicators Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() => setActiveFilter(activeFilter === "ATRASADAS" ? "TODAS" : "ATRASADAS")}
          className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden ${
            activeFilter === "ATRASADAS"
              ? "bg-rose-950/40 border-rose-500/60 ring-2 ring-rose-500/20"
              : "bg-zinc-900/60 border-zinc-800/80 hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
              Atrasadas
            </span>
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">
            {atrasadasLeads.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Precisa de atenção urgente</p>
        </button>

        <button
          onClick={() => setActiveFilter(activeFilter === "HOJE" ? "TODAS" : "HOJE")}
          className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden ${
            activeFilter === "HOJE"
              ? "bg-emerald-950/40 border-emerald-500/60 ring-2 ring-emerald-500/20"
              : "bg-zinc-900/60 border-zinc-800/80 hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Hoje
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">
            {hojeLeads.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Programadas para hoje</p>
        </button>

        <button
          onClick={() => setActiveFilter(activeFilter === "PROXIMOS" ? "TODAS" : "PROXIMOS")}
          className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden ${
            activeFilter === "PROXIMOS"
              ? "bg-blue-950/40 border-blue-500/60 ring-2 ring-blue-500/20"
              : "bg-zinc-900/60 border-zinc-800/80 hover:border-blue-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
              Próximos 7 Dias
            </span>
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">
            {proximos7Leads.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Acompanhamento futuro</p>
        </button>

        <button
          onClick={() => setActiveFilter(activeFilter === "SEM_PASSO" ? "TODAS" : "SEM_PASSO")}
          className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden ${
            activeFilter === "SEM_PASSO"
              ? "bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/20"
              : "bg-zinc-900/60 border-zinc-800/80 hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              Sem Próximo Passo
            </span>
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-1">
            {semProximoPassoLeads.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Leads ativos sem agendamento</p>
        </button>
      </div>

      {/* Filter Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-850 pb-3">
        <button
          onClick={() => setActiveFilter("TODAS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === "TODAS"
              ? "bg-[#89F0B2] text-zinc-950 font-bold"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Todas as Seções
        </button>
        <button
          onClick={() => setActiveFilter("ATRASADAS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === "ATRASADAS"
              ? "bg-rose-500 text-white font-bold"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Atrasadas ({atrasadasLeads.length})
        </button>
        <button
          onClick={() => setActiveFilter("HOJE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === "HOJE"
              ? "bg-emerald-500 text-zinc-950 font-bold"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Hoje ({hojeLeads.length})
        </button>
        <button
          onClick={() => setActiveFilter("PROXIMOS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === "PROXIMOS"
              ? "bg-blue-500 text-white font-bold"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Próximos 7 Dias ({proximos7Leads.length})
        </button>
        <button
          onClick={() => setActiveFilter("SEM_PASSO")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeFilter === "SEM_PASSO"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          Sem Próximo Passo ({semProximoPassoLeads.length})
        </button>
      </div>

      {/* SEÇÃO 1: ATRASADAS */}
      {(activeFilter === "TODAS" || activeFilter === "ATRASADAS") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-rose-400">
              Atrasadas ({filterBySearch(atrasadasLeads).length})
            </h2>
          </div>

          {filterBySearch(atrasadasLeads).length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 bg-zinc-900/20">
              Nenhuma atividade atrasada. Ótimo trabalho!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterBySearch(atrasadasLeads).map((lead) => (
                <LeadCardItem
                  key={lead.id}
                  lead={lead}
                  isOverdue={true}
                  getTypeBadge={getTypeBadge}
                  formatDateBR={formatDateBR}
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

      {/* SEÇÃO 2: HOJE */}
      {(activeFilter === "TODAS" || activeFilter === "HOJE") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-emerald-400">
              Hoje ({filterBySearch(hojeLeads).length})
            </h2>
          </div>

          {filterBySearch(hojeLeads).length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 bg-zinc-900/20">
              Nenhuma atividade programada para hoje.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterBySearch(hojeLeads).map((lead) => (
                <LeadCardItem
                  key={lead.id}
                  lead={lead}
                  isToday={true}
                  getTypeBadge={getTypeBadge}
                  formatDateBR={formatDateBR}
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

      {/* SEÇÃO 3: PRÓXIMOS 7 DIAS */}
      {(activeFilter === "TODAS" || activeFilter === "PROXIMOS") && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-blue-400">
              Próximos 7 Dias ({filterBySearch(proximos7Leads).length})
            </h2>
          </div>

          {Object.keys(groupedProximos).length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 bg-zinc-900/20">
              Nenhuma atividade agendada para os próximos 7 dias.
            </div>
          ) : (
            Object.keys(groupedProximos)
              .sort()
              .map((dateKey) => {
                const dayLeads = filterBySearch(groupedProximos[dateKey]);
                if (dayLeads.length === 0) return null;
                return (
                  <div key={dateKey} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 bg-zinc-900/80 px-3 py-1 rounded-lg border border-zinc-800/80 w-fit">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{formatDateBR(dateKey)}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {dayLeads.map((lead) => (
                        <LeadCardItem
                          key={lead.id}
                          lead={lead}
                          getTypeBadge={getTypeBadge}
                          formatDateBR={formatDateBR}
                          onSelectLead={onSelectLead}
                          onComplete={handleCompleteActivity}
                          onReschedule={() => setRescheduleLead(lead)}
                          onEdit={() => openSetActivityModal(lead)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
          )}
        </section>
      )}

      {/* SEÇÃO 4: SEM PRÓXIMO PASSO */}
      {(activeFilter === "TODAS" || activeFilter === "SEM_PASSO") && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-amber-400">
                Sem Próximo Passo ({filterBySearch(semProximoPassoLeads).length})
              </h2>
            </div>
            <span className="text-[11px] text-zinc-500">
              Triagem de leads ativos sem ação futura programada
            </span>
          </div>

          {filterBySearch(semProximoPassoLeads).length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500 bg-zinc-900/20">
              Todos os leads ativos possuem um próximo passo definido. Parabéns!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterBySearch(semProximoPassoLeads).map((lead) => (
                <div
                  key={lead.id}
                  className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/30 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <button
                        onClick={() => onSelectLead(lead.id)}
                        className="font-bold text-sm text-white hover:text-[#89F0B2] text-left transition flex items-center gap-1.5"
                      >
                        {lead.nome}
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                          {lead.status_funil || "NOVO"}
                        </span>
                        <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                          {lead.temperatura || "MORNA"}
                        </span>
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
                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition shrink-0 text-xs font-semibold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1">
                    {lead.local && <p>📍 {lead.local}</p>}
                    {(lead.data_casamento || lead.mes_casamento) && (
                      <p>💍 Casamento: {lead.data_casamento || lead.mes_casamento}</p>
                    )}
                    {lead.observacoes && (
                      <p className="line-clamp-2 text-[11px] text-zinc-500 italic mt-1">
                        &quot;{lead.observacoes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectLead(lead.id)}
                      className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                    >
                      Ver Detalhes
                    </button>
                    <button
                      onClick={() => openSetActivityModal(lead)}
                      className="px-3 py-1.5 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      DEFINIR PRÓXIMO PASSO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: DEFINIR / ALTERAR PRÓXIMO PASSO */}
      {activityModalLead && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#89F0B2]" />
                Definir Próximo Passo — {activityModalLead.nome}
              </h3>
              <button
                onClick={() => setActivityModalLead(null)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1.5">
                  Tipo da Atividade Manual
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType("RESPONDER")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalType === "RESPONDER"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="font-bold text-xs">RESPONDER</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Pendente do usuário</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("ACOMPANHAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalType === "ACOMPANHAR"
                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="font-bold text-xs">ACOMPANHAR</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Aguardando retorno</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("REATIVAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalType === "REATIVAR"
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Flame className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="font-bold text-xs">REATIVAR</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Conversa esfriou</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType("CATIVAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalType === "CATIVAR"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-bold text-xs">CATIVAR</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Criar oportunidade</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Data Prevista
                </label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Observação / Ideia de Ação
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Verificar se avaliou os modelos de terracota..."
                  value={modalObs}
                  onChange={(e) => setModalObs(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setActivityModalLead(null)}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveActivity}
                disabled={isSaving || !modalDate}
                className="px-4 py-2 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "AGENDAR"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: REAGENDAR RÁPIDO */}
      {rescheduleLead && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                Reagendar — {rescheduleLead.nome}
              </h3>
              <button
                onClick={() => setRescheduleLead(null)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Escolha um novo prazo mantendo a mesma atividade e observação.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 0)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Hoje
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 1)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Amanhã
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 3)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Em 3 dias
              </button>
              <button
                onClick={() => handleQuickReschedule(rescheduleLead, 7)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Em 7 dias
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="block text-[10px] font-mono text-zinc-400">
                Ou escolha uma data específica:
              </label>
              <input
                type="date"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
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

      {/* MODAL 3: PERGUNTA PÓS-CONCLUSÃO */}
      {completedLeadPrompt && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center my-auto">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Atividade Concluída!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Registrada com sucesso no histórico de <strong className="text-white">{completedLeadPrompt.nome}</strong>.
              </p>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs space-y-2">
              <p className="font-semibold text-zinc-300">Deseja definir o próximo passo agora?</p>
              <p className="text-[11px] text-zinc-500">
                Mantenha a sequência comercial ativa para não perder este lead de vista.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  const target = completedLeadPrompt;
                  setCompletedLeadPrompt(null);
                  openSetActivityModal(target);
                }}
                className="w-full py-2.5 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> SIM, AGENDAR PRÓXIMO PASSO
              </button>
              <button
                onClick={() => setCompletedLeadPrompt(null)}
                className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg transition"
              >
                Não, deixar sem próximo passo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// Sub-component for individual Lead Card in Minha Agenda
interface LeadCardItemProps {
  key?: string;
  lead: Lead;
  isOverdue?: boolean;
  isToday?: boolean;
  getTypeBadge: (type?: string | null) => React.ReactNode;
  formatDateBR: (dateStr?: string | null) => string;
  onSelectLead: (id: string) => void;
  onComplete: (lead: Lead) => void;
  onReschedule: () => void;
  onEdit: () => void;
}

function LeadCardItem({
  lead,
  isOverdue,
  isToday,
  getTypeBadge,
  formatDateBR,
  onSelectLead,
  onComplete,
  onReschedule,
  onEdit
}: LeadCardItemProps) {
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

  return (
    <div
      className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 relative overflow-hidden ${
        isOverdue
          ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60"
          : isToday
          ? "bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/60"
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onSelectLead(lead.id)}
              className="font-bold text-sm text-white hover:text-[#89F0B2] text-left transition flex items-center gap-1.5"
            >
              {lead.nome}
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </button>

            {closed && (
              <span className="text-[10px] font-mono uppercase bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                Encerrado / {lead.status_funil || "Perdido"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {getTypeBadge(lead.tipo_proxima_atividade)}

            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {formatDateBR(lead.proxima_atividade_em)}
            </span>
          </div>
        </div>

        {/* Direct WhatsApp link */}
        {lead.link_celular && (
          <a
            href={
              lead.link_celular.startsWith("http")
                ? lead.link_celular
                : `https://wa.me/55${lead.telefone_limpo || lead.link_celular}`
            }
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition shrink-0 text-xs font-semibold flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        )}
      </div>

      {/* Observation box */}
      {lead.observacao_proxima_atividade && (
        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-850 text-xs text-zinc-300">
          <span className="text-[10px] font-mono text-zinc-500 block mb-0.5 uppercase tracking-wider">
            Observação:
          </span>
          <p className="whitespace-pre-wrap">{lead.observacao_proxima_atividade}</p>
        </div>
      )}

      {/* Additional lead details */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 border-t border-zinc-800/50 pt-2">
        {lead.local && <span>📍 {lead.local}</span>}
        {(lead.data_casamento || lead.mes_casamento) && (
          <span>💍 {lead.data_casamento || lead.mes_casamento}</span>
        )}
        {lead.convidados > 0 && <span>👥 {lead.convidados} conv.</span>}
        <span>
          Status: <strong className="text-zinc-300">{lead.status_funil || "NOVO"}</strong>
        </span>
      </div>

      {/* Action buttons */}
      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSelectLead(lead.id)}
            className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            ABRIR LEAD
          </button>
          <button
            onClick={onEdit}
            className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            ALTERAR
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onReschedule}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition"
          >
            REAGENDAR
          </button>
          <button
            onClick={() => onComplete(lead)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-lg transition flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> CONCLUIR
          </button>
        </div>
      </div>
    </div>
  );
}
