/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, User, Mail, Phone, MapPin, Gift, Clipboard, Calculator, Tag, MessageSquare, Plus, Check, Clock, AlertCircle, Trash2, CalendarCheck, Sparkles, Flame, MessageCircle } from "lucide-react";
import { Lead, LeadStatus, LeadEtapa, LeadTemperatura, LeadHistory } from "../types";
import { useToast } from "./Toast";

interface LeadDetailsModalProps {
  leadId: string;
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead?: (id: string) => Promise<void>;
}

export default function LeadDetailsModal({ leadId, onClose, onUpdateLead, onDeleteLead }: LeadDetailsModalProps) {
  const { toast, confirm } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [etapasList, setEtapasList] = useState<string[]>([]);
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);

  // Manual Next Activity states
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [modalActivityType, setModalActivityType] = useState<"RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR">("ACOMPANHAR");
  const [modalActivityDate, setModalActivityDate] = useState("");
  const [modalActivityObs, setModalActivityObs] = useState("");
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isPostCompleteOpen, setIsPostCompleteOpen] = useState(false);
  const [isActivitySaving, setIsActivitySaving] = useState(false);

  const getTodayStr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const clean = dateStr.trim().slice(0, 10);
    const parts = clean.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getTypeBadge = (type?: string | null) => {
    switch (type) {
      case "RESPONDER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <MessageCircle className="w-3 h-3" /> RESPONDER
          </span>
        );
      case "ACOMPANHAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> ACOMPANHAR
          </span>
        );
      case "REATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Flame className="w-3 h-3" /> REATIVAR
          </span>
        );
      case "CATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-3 h-3" /> CATIVAR
          </span>
        );
      default:
        return null;
    }
  };

  const handleOpenActivityModal = () => {
    if (!lead) return;
    setModalActivityType(lead.tipo_proxima_atividade || "ACOMPANHAR");
    setModalActivityDate(
      lead.proxima_atividade_em
        ? String(lead.proxima_atividade_em).slice(0, 10)
        : getTodayStr()
    );
    setModalActivityObs(lead.observacao_proxima_atividade || "");
    setIsActivityModalOpen(true);
  };

  const handleSaveNextActivity = async () => {
    if (!lead || !modalActivityDate) return;
    try {
      setIsActivitySaving(true);
      const res = await fetch(`/api/leads/${lead.id}/next-activity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_proxima_atividade: modalActivityType,
          proxima_atividade_em: modalActivityDate,
          observacao_proxima_atividade: modalActivityObs
        })
      });
      if (res.ok) {
        setIsActivityModalOpen(false);
        fetchLeadDetails();
      } else {
        toast.error("Erro ao salvar atividade.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão.");
    } finally {
      setIsActivitySaving(false);
    }
  };

  const handleCompleteActivity = async () => {
    if (!lead) return;
    try {
      setIsActivitySaving(true);
      const res = await fetch(`/api/leads/${lead.id}/next-activity/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        await fetchLeadDetails();
        setIsPostCompleteOpen(true);
      } else {
        toast.error("Erro ao concluir atividade.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão.");
    } finally {
      setIsActivitySaving(false);
    }
  };

  const handleQuickReschedule = async (daysToAdd: number | string) => {
    if (!lead) return;
    let targetDate = getTodayStr();
    if (typeof daysToAdd === "number") {
      const d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      targetDate = d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
    } else {
      targetDate = daysToAdd;
    }

    try {
      setIsActivitySaving(true);
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
        setIsRescheduleOpen(false);
        fetchLeadDetails();
      } else {
        toast.error("Erro ao reagendar atividade.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão.");
    } finally {
      setIsActivitySaving(false);
    }
  };

  useEffect(() => {
    fetch("/api/products")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error("Erro ao carregar produtos no modal:", err));

    // Fetch dynamic options lists
    fetch("/api/settings")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {} as any;
      })
      .then((data: any) => {
        if (data && data.etapas_contato) setEtapasList(data.etapas_contato);
        if (data && data.status_funil) setStatusList(data.status_funil);
        if (data && data.temperaturas) setTempsList(data.temperaturas);
      })
      .catch(err => console.error("Erro ao carregar listas dinâmicas no modal:", err));
  }, [leadId]);

  // Editable fields states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [linkCelular, setLinkCelular] = useState("");
  const [dataCasamento, setDataCasamento] = useState("");
  const [mesCasamento, setMesCasamento] = useState("");
  const [local, setLocal] = useState("");
  const [servicos, setServicos] = useState("");
  const [convidados, setConvidados] = useState(0);

  const mapLegacyValue = (field: string, val: string): string => {
    if (!val) return val;
    const upperVal = val.toUpperCase().trim();
    if (field === "etapa_contato") {
      switch (upperVal) {
        case "SEM_CONTATO": return "Sem Contato";
        case "WHATSAPP_ENVIADO": return "WhatsApp Enviado";
        case "EMAIL_FOLLOWUP_1": return "E-mail Follow-up 1";
        case "WHATSAPP_FOLLOWUP_2": return "WhatsApp Follow-up 2";
        case "EMAIL_FOLLOWUP_2": return "E-mail Follow-up 2";
        case "EMAIL_FINAL": return "E-mail Final";
        case "ENCERRADO": return "Encerrado";
        default: return val;
      }
    }
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

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const resLead = await fetch(`/api/leads/${leadId}`);
      if (!resLead.ok) throw new Error("Failed to fetch lead");
      const dataLead = await resLead.json();
      setLead(dataLead);

      // Sync edit fields
      setNome(dataLead.nome);
      setEmail(dataLead.email);
      setLinkCelular(dataLead.link_celular || "");
      setDataCasamento(dataLead.data_casamento || "");
      setMesCasamento(dataLead.mes_casamento || "");
      setLocal(dataLead.local || "");
      setServicos(dataLead.servicos || "");
      setConvidados(dataLead.convidados || 0);

      const resHist = await fetch(`/api/leads/${leadId}/history`);
      if (resHist.ok) {
        const dataHist = await resHist.json();
        setHistory(dataHist);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  const handleUpdateStatus = async (field: "status_funil" | "etapa_contato" | "temperatura" | "status_conversa", value: string) => {
    if (!lead) return;
    try {
      await onUpdateLead(lead.id, { [field]: value });
      // Fetch details again to refresh history timeline and model states
      fetchLeadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!lead || !onDeleteLead) return;
    const confirmed = await confirm(`Deseja realmente EXCLUIR o lead "${lead.nome}" permanentemente? Esta ação não pode ser desfeita.`);
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDeleteLead(lead.id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveMetadata = async () => {
    if (!lead) return;
    try {
      await onUpdateLead(lead.id, {
        nome,
        email,
        link_celular: linkCelular,
        data_casamento: dataCasamento,
        mes_casamento: mesCasamento,
        local,
        servicos,
        convidados: Number(convidados)
      });
      setIsEditingMetadata(false);
      fetchLeadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !lead) return;

    setIsSubmittingNote(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: newNote.trim() })
      });

      if (response.ok) {
        setNewNote("");
        fetchLeadDetails(); // refresh details and history logs
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (loading && !lead) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <Clock className="w-8 h-8 text-[#89F0B2] animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando detalhes do lead...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2.5rem)] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Header bar */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#89F0B2]/10 flex items-center justify-center text-[#89F0B2] font-bold font-mono text-xs sm:text-base shrink-0">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                <h3 className="text-xs sm:text-base font-semibold text-white truncate max-w-[130px] sm:max-w-xs">{lead.nome}</h3>
                <span className="text-[9px] sm:text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                  {lead.id}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                Origem: <strong>{lead.origem_portal}</strong> • Cadastrado em:{" "}
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onDeleteLead && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-lg text-[11px] sm:text-xs font-semibold transition disabled:opacity-40"
                title="Excluir Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isDeleting ? "Excluindo..." : "Excluir Lead"}</span>
                <span className="sm:hidden">{isDeleting ? "..." : "Excluir"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Panel Scrollable */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          
          {/* Left Column - Metadata & Budgets */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5 sm:space-y-6">
            
            {/* Quick Status Changers */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#89F0B2] uppercase tracking-wider block">
                  Status Conversa (Kanban)
                </span>
                <select
                  value={lead.status_conversa || "NUNCA_RESPONDEU"}
                  onChange={(e) => handleUpdateStatus("status_conversa", e.target.value)}
                  className="w-full bg-zinc-900 border border-[#89F0B2]/40 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#89F0B2] font-semibold"
                >
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

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Status Funil (Automação)
                </span>
                <select
                  value={mapLegacyValue("status_funil", lead.status_funil)}
                  onChange={(e) => handleUpdateStatus("status_funil", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {statusList.length > 0 ? (
                    statusList.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))
                  ) : (
                    <>
                      <option value="Primeiro Contato">Primeiro Contato</option>
                      <option value="Follow-up 1">Follow-up 1</option>
                      <option value="Follow-up 2">Follow-up 2</option>
                      <option value="Follow-up 3">Follow-up 3</option>
                      <option value="Follow-up Final">Follow-up Final</option>
                      <option value="Respondido">Respondido</option>
                      <option value="Fechou (Convertido)">Fechou (Convertido)</option>
                      <option value="Perdido">Perdido</option>
                      <option value="Sem Retorno / Encerrado">Sem Retorno / Encerrado</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Etapa de Contato
                </span>
                <select
                  value={mapLegacyValue("etapa_contato", lead.etapa_contato)}
                  onChange={(e) => handleUpdateStatus("etapa_contato", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {etapasList.length > 0 ? (
                    etapasList.map((et) => (
                      <option key={et} value={et}>{et}</option>
                    ))
                  ) : (
                    <>
                      <option value="Sem Contato">Sem Contato</option>
                      <option value="Orçamento Enviado">Orçamento Enviado</option>
                      <option value="WhatsApp Enviado">WhatsApp Enviado</option>
                      <option value="E-mail Follow-up 1">E-mail Follow-up 1</option>
                      <option value="WhatsApp Follow-up 2">WhatsApp Follow-up 2</option>
                      <option value="E-mail Follow-up 2">E-mail Follow-up 2</option>
                      <option value="E-mail Final">E-mail Final</option>
                      <option value="Encerrado">Encerrado</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Temperatura
                </span>
                <select
                  value={mapLegacyValue("temperatura", lead.temperatura)}
                  onChange={(e) => handleUpdateStatus("temperatura", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
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
              </div>
            </div>

            {/* PRÓXIMO PASSO (Atividade Comercial Manual) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#89F0B2]" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    PRÓXIMO PASSO
                  </span>
                </div>

                {lead?.proxima_atividade_em && (
                  <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                    Previsto para: {formatDateBR(lead.proxima_atividade_em)}
                  </span>
                )}
              </div>

              {lead?.proxima_atividade_em ? (
                <div className="bg-zinc-950/80 border border-zinc-850 rounded-lg p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(lead.tipo_proxima_atividade)}
                      <span className="text-xs font-semibold text-white">
                        {formatDateBR(lead.proxima_atividade_em)}
                      </span>
                    </div>
                  </div>

                  {lead.observacao_proxima_atividade && (
                    <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80 font-mono">
                      &quot;{lead.observacao_proxima_atividade}&quot;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-zinc-850">
                    <button
                      type="button"
                      onClick={handleOpenActivityModal}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                    >
                      ALTERAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRescheduleOpen(true)}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded transition"
                    >
                      REAGENDAR
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteActivity}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> CONCLUIR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-950/50 p-3 rounded-lg border border-dashed border-zinc-800 gap-2">
                  <p className="text-xs text-zinc-400 italic">
                    Nenhuma atividade manual agendada para este lead.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenActivityModal}
                    className="px-3 py-1.5 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> DEFINIR PRÓXIMO PASSO
                  </button>
                </div>
              )}

              {/* Discrete Automation Info (Section 17) */}
              {lead?.proxima_acao_em && (
                <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-zinc-850/60">
                  <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span>Automação: próxima etapa programada ({formatDateBR(lead.proxima_acao_em)})</span>
                </div>
              )}
            </div>

            {/* General Metadata form / display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  Informações Cadastrais do Lead
                </h4>
                <button
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
                >
                  {isEditingMetadata ? "Cancelar" : "Editar Dados"}
                </button>
              </div>

              {isEditingMetadata ? (
                <div className="bg-zinc-950/30 border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-500">Nome</label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Celular</label>
                      <input
                        type="text"
                        value={linkCelular}
                        onChange={(e) => setLinkCelular(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Número Convidados</label>
                      <input
                        type="number"
                        value={convidados}
                        onChange={(e) => setConvidados(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Data Casamento (DD/MM/AAAA)</label>
                      <input
                        type="text"
                        value={dataCasamento}
                        onChange={(e) => setDataCasamento(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Mês / Ano do Casamento</label>
                      <input
                        type="text"
                        value={mesCasamento}
                        onChange={(e) => setMesCasamento(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-500">Local da Cerimônia</label>
                      <input
                        type="text"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Serviços Solicitados</label>
                      <input
                        type="text"
                        value={servicos}
                        onChange={(e) => setServicos(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveMetadata}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#89F0B2] hover:bg-[#72e29e] text-black font-semibold rounded-lg text-xs transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar Dados
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-white font-medium truncate">{lead.nome}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-zinc-400 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{lead.link_celular || "Telefone não informado"}</span>
                      </div>
                      {lead.whatsapp_validation_status && (
                        <div className="pl-6 flex flex-wrap items-center gap-1.5">
                          {lead.whatsapp_validation_status === "NUMERO_SEM_WHATSAPP" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              title={lead.whatsapp_validation_error || "Número sem WhatsApp"}
                            >
                              🚫 Número sem WhatsApp
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_TEMPORARIO_WAHA" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              title={lead.whatsapp_validation_error || "Erro Temporário WAHA"}
                            >
                              ⚠️ Erro Temporário WAHA {lead.whatsapp_validation_http_code ? `(HTTP ${lead.whatsapp_validation_http_code})` : ""}
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_COMUNICACAO" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700"
                              title={lead.whatsapp_validation_error || "Erro de Comunicação com WAHA"}
                            >
                              ⚡ Erro Conexão WAHA
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ENVIADO_SUCESSO" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ WhatsApp Válido
                            </span>
                          )}
                          {lead.whatsapp_validated_at && (
                            <span className="text-[10px] text-zinc-500">
                              ({new Date(lead.whatsapp_validated_at).toLocaleDateString("pt-BR")} {new Date(lead.whatsapp_validated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        Casamento: {lead.data_casamento || "Sem data"} ({lead.mes_casamento})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.local || "Local não informado"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Gift className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.convidados} convidados • {lead.servicos || "Geral"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated budget cards */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-500" />
                Orçamento Sugerido Automático ({lead.convidados} itens)
              </h4>

              {products.length === 0 ? (
                <div className="border border-zinc-800/80 rounded-xl p-4 text-center text-zinc-500 text-xs">
                  Nenhum produto cadastrado no catálogo para cálculo de orçamentos dinâmicos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((prod) => {
                    const totalOrcamento = prod.valor_unitario * (lead.convidados || 0);
                    return (
                      <div key={prod.id} className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-bold truncate" title={prod.descricao}>
                            {prod.descricao}
                          </span>
                          <span className="text-sm font-extrabold text-amber-500 mt-1 block">
                            {totalOrcamento.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL"
                            })}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-600 block mt-1">
                          Unitário: {prod.valor_unitario.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Observacoes / notas adicionais */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-amber-500" />
                Histórico de Observações do CRM
              </h4>
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 sm:p-4 max-h-36 sm:max-h-40 overflow-y-auto text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {lead.observacoes || "Nenhuma observação cadastrada no momento."}
              </div>
            </div>
          </div>

          {/* Right Column - Timeline Logs & Manual note creator */}
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col space-y-5 lg:space-y-4 lg:h-full lg:overflow-hidden min-h-0">
            
            {/* Note Creator form */}
            <form onSubmit={handleAddNote} className="space-y-2 shrink-0">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#89F0B2]" />
                Registrar Atendimento Manual
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escreva nota: 'Lead ligou solicitando caixinha...'"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#89F0B2]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="px-3.5 py-2 bg-[#89F0B2] hover:bg-[#72e29e] disabled:opacity-40 rounded-lg text-black font-semibold text-xs transition flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Note
                </button>
              </div>
            </form>

            {/* Chronological timeline list */}
            <div className="flex flex-col lg:flex-1 lg:min-h-0 pt-2 lg:pt-0">
              <h4 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-3 shrink-0">
                Timeline de Interações
              </h4>

              <div className="max-h-[350px] sm:max-h-[450px] lg:max-h-none lg:flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3 border-l border-zinc-800">
                {history.length > 0 ? (
                  history.map((event) => {
                    const eventDate = new Date(event.created_at);
                    
                    return (
                      <div key={event.id} className="relative group text-xs">
                        {/* Dot indicator on timeline line */}
                        <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-zinc-900 group-hover:bg-amber-400 transition shrink-0" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-semibold text-white leading-none">
                              {event.titulo}
                            </span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {eventDate.toLocaleDateString("pt-BR")} às {eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono px-1 rounded uppercase font-semibold ${
                              event.canal === "WHATSAPP" ? "bg-emerald-500/10 text-emerald-400" :
                              event.canal === "EMAIL" ? "bg-blue-500/10 text-blue-400" :
                              event.canal === "MANUAL" ? "bg-purple-500/10 text-purple-400" :
                              "bg-zinc-800 text-zinc-400"
                            }`}>
                              {event.canal}
                            </span>
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">{event.tipo}</span>
                          </div>

                          {event.detalhes && (
                            <div
                              className="mt-1.5 p-2 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[11px] text-zinc-400 font-sans leading-relaxed break-words"
                              dangerouslySetInnerHTML={{ __html: event.detalhes }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-600 text-xs">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-zinc-750" />
                    Nenhuma interação registrada.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: Definir / Alterar Próximo Passo */}
      {isActivityModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#89F0B2]" />
                Definir Próximo Passo
              </h3>
              <button
                onClick={() => setIsActivityModalOpen(false)}
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
                    onClick={() => setModalActivityType("RESPONDER")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalActivityType === "RESPONDER"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">RESPONDER</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Pendente do usuário</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalActivityType("ACOMPANHAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalActivityType === "ACOMPANHAR"
                        ? "bg-blue-500/20 border-blue-500 text-blue-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">ACOMPANHAR</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Aguardando retorno</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalActivityType("REATIVAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalActivityType === "REATIVAR"
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Flame className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">REATIVAR</p>
                      <p className="text-[10px] text-zinc-400 font-normal">Conversa esfriou</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalActivityType("CATIVAR")}
                    className={`p-2.5 rounded-lg border text-left transition font-semibold text-xs flex items-center gap-1.5 ${
                      modalActivityType === "CATIVAR"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  value={modalActivityDate}
                  onChange={(e) => setModalActivityDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Observação
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Checar se recebeu a amostra das essências..."
                  value={modalActivityObs}
                  onChange={(e) => setModalActivityObs(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNextActivity}
                disabled={isActivitySaving || !modalActivityDate}
                className="px-4 py-2 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition disabled:opacity-50"
              >
                {isActivitySaving ? "Salvando..." : "AGENDAR"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Reagendar Rápido */}
      {isRescheduleOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                Reagendar Atividade
              </h3>
              <button
                onClick={() => setIsRescheduleOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickReschedule(0)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Hoje
              </button>
              <button
                onClick={() => handleQuickReschedule(1)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Amanhã
              </button>
              <button
                onClick={() => handleQuickReschedule(3)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Em 3 dias
              </button>
              <button
                onClick={() => handleQuickReschedule(7)}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-[#89F0B2] text-white rounded-lg font-semibold text-center transition"
              >
                Em 7 dias
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="block text-[10px] font-mono text-zinc-400">
                Ou escolha outra data:
              </label>
              <input
                type="date"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]"
                onChange={(e) => {
                  if (e.target.value) {
                    handleQuickReschedule(e.target.value);
                  }
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Pós Conclusão */}
      {isPostCompleteOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center my-auto">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Atividade Concluída!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Registrada com sucesso no histórico deste lead.
              </p>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs space-y-1">
              <p className="font-semibold text-zinc-300">Deseja agendar o próximo passo?</p>
              <p className="text-[11px] text-zinc-500">
                Garanta que este lead continuará no radar de atendimento.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setIsPostCompleteOpen(false);
                  handleOpenActivityModal();
                }}
                className="w-full py-2.5 bg-[#89F0B2] text-zinc-950 font-bold text-xs rounded-lg hover:bg-[#73e09d] transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> SIM, AGENDAR PRÓXIMO PASSO
              </button>
              <button
                onClick={() => setIsPostCompleteOpen(false)}
                className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg transition"
              >
                Não, concluir por enquanto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
