/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, Calendar, User, Mail, Phone, MapPin, Gift, Clipboard, 
  Calculator, Tag, MessageSquare, Plus, Check, Clock, AlertCircle, 
  Trash2, CalendarCheck, Sparkles, Flame, MessageCircle, Edit2, 
  CheckCircle2, ArrowRight
} from "lucide-react";
import { Lead, LeadStatus, LeadEtapa, LeadTemperatura, LeadHistory } from "../types";
import { useToast } from "./Toast";
import { Button, Badge, Modal, Input, Textarea, Select, FormField } from "./ui";

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <MessageCircle className="w-3 h-3 text-amber-400" /> RESPONDER
          </span>
        );
      case "ACOMPANHAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Clock className="w-3 h-3 text-sky-400" /> ACOMPANHAR
          </span>
        );
      case "REATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Flame className="w-3 h-3 text-purple-400" /> REATIVAR
          </span>
        );
      case "CATIVAR":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-emerald-400" /> CATIVAR
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
        fetchLeadDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (loading && !lead) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50">
        <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <Clock className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-300 font-medium">Carregando detalhes do lead...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const tempVariant = 
    lead.temperatura === "QUENTE" ? "hot" :
    lead.temperatura === "MORNA" ? "warm" :
    lead.temperatura === "CLIENTE" ? "success" : "cold";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0B0D12] border border-white/[0.08] rounded-2xl w-full max-w-5xl h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2.5rem)] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto animate-fade-in">
        
        {/* Header bar */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between bg-[#12151C] shrink-0 gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-base shrink-0 shadow-xs">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{lead.nome}</h3>
                <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-400 px-2 py-0.5 rounded-md border border-white/[0.08]">
                  #{lead.id}
                </span>
                <Badge variant={tempVariant} size="sm">
                  {String(lead.temperatura || "FRIA").trim().toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                Origem: <strong className="text-zinc-200">{lead.origem_portal}</strong> • Cadastrado em:{" "}
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lead.link_celular && (
              <a
                href={`https://wa.me/${lead.link_celular.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.nome}! Tudo bem? Gostaria de falar sobre o seu evento.`)}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp
              </a>
            )}

            {onDeleteLead && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
                title="Excluir Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isDeleting ? "Excluindo..." : "Excluir"}</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Panel Scrollable */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
          
          {/* Left Column - Metadata & Budgets */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5">
            
            {/* Quick Status Changers */}
            <div className="bg-[#12151C] border border-white/[0.07] rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <span className="text-xs font-semibold text-indigo-400 block mb-1">
                  Status Conversa
                </span>
                <select
                  value={lead.status_conversa || "NUNCA_RESPONDEU"}
                  onChange={(e) => handleUpdateStatus("status_conversa", e.target.value)}
                  className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
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

              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Status Funil
                </span>
                <select
                  value={mapLegacyValue("status_funil", lead.status_funil)}
                  onChange={(e) => handleUpdateStatus("status_funil", e.target.value)}
                  className="w-full bg-[#0e121a] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.2] font-medium cursor-pointer"
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

              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Etapa de Contato
                </span>
                <select
                  value={mapLegacyValue("etapa_contato", lead.etapa_contato)}
                  onChange={(e) => handleUpdateStatus("etapa_contato", e.target.value)}
                  className="w-full bg-[#0e121a] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.2] font-medium cursor-pointer"
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

              <div>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Temperatura
                </span>
                <select
                  value={mapLegacyValue("temperatura", lead.temperatura)}
                  onChange={(e) => handleUpdateStatus("temperatura", e.target.value)}
                  className="w-full bg-[#0e121a] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-white/[0.2] font-medium cursor-pointer"
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
            <div className="bg-[#12151C] border border-white/[0.08] rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white tracking-tight">
                    Próximo Passo do Atendimento
                  </span>
                </div>

                {lead?.proxima_atividade_em && (
                  <span className="text-[11px] font-mono bg-white/[0.06] px-2.5 py-0.5 rounded-md text-zinc-300 border border-white/[0.08]">
                    Previsto: {formatDateBR(lead.proxima_atividade_em)}
                  </span>
                )}
              </div>

              {lead?.proxima_atividade_em ? (
                <div className="bg-[#0B0D12] border border-white/[0.07] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(lead.tipo_proxima_atividade)}
                      <span className="text-xs font-semibold text-white">
                        {formatDateBR(lead.proxima_atividade_em)}
                      </span>
                    </div>
                  </div>

                  {lead.observacao_proxima_atividade && (
                    <p className="text-xs text-zinc-300 bg-[#181C26] p-2.5 rounded-lg border border-white/[0.06]">
                      &quot;{lead.observacao_proxima_atividade}&quot;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenActivityModal}
                    >
                      Alterar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsRescheduleOpen(true)}
                    >
                      Reagendar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCompleteActivity}
                      className="gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Concluir
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0B0D12] p-3.5 rounded-xl border border-dashed border-white/[0.08] gap-3">
                  <p className="text-xs text-zinc-400 italic">
                    Nenhuma atividade comercial agendada para este lead.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenActivityModal}
                    className="gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Definir Próximo Passo
                  </Button>
                </div>
              )}

              {/* Discrete Automation Info */}
              {lead?.proxima_acao_em && (
                <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                  <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>Automação: próxima etapa programada ({formatDateBR(lead.proxima_acao_em)})</span>
                </div>
              )}
            </div>

            {/* General Metadata form / display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Informações Cadastrais da Noiva
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                  className="gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingMetadata ? "Cancelar" : "Editar Dados"}
                </Button>
              </div>

              {isEditingMetadata ? (
                <div className="bg-[#121620] border border-white/[0.07] rounded-xl p-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Nome">
                      <Input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </FormField>
                    <FormField label="E-mail">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Celular">
                      <Input
                        value={linkCelular}
                        onChange={(e) => setLinkCelular(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Número Convidados">
                      <Input
                        type="number"
                        value={convidados}
                        onChange={(e) => setConvidados(Number(e.target.value))}
                      />
                    </FormField>
                    <FormField label="Data Casamento (DD/MM/AAAA)">
                      <Input
                        value={dataCasamento}
                        onChange={(e) => setDataCasamento(e.target.value)}
                        className="font-mono"
                      />
                    </FormField>
                    <FormField label="Mês / Ano do Casamento">
                      <Input
                        value={mesCasamento}
                        onChange={(e) => setMesCasamento(e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Local da Cerimônia">
                      <Input
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Serviços Solicitados">
                      <Input
                        value={servicos}
                        onChange={(e) => setServicos(e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveMetadata}
                      className="gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Salvar Dados
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#121620] border border-white/[0.07] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-zinc-100 font-semibold truncate">{lead.nome}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="font-mono truncate">{lead.link_celular || "Telefone não informado"}</span>
                      </div>
                      {lead.whatsapp_validation_status && (
                        <div className="pl-6.5 flex flex-wrap items-center gap-1.5">
                          {lead.whatsapp_validation_status === "NUMERO_SEM_WHATSAPP" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              title={lead.whatsapp_validation_error || "Número sem WhatsApp"}
                            >
                              Sem WhatsApp
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_TEMPORARIO_WAHA" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              title={lead.whatsapp_validation_error || "Erro Temporário WAHA"}
                            >
                              Erro Temporário WAHA {lead.whatsapp_validation_http_code ? `(HTTP ${lead.whatsapp_validation_http_code})` : ""}
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_COMUNICACAO" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-zinc-400 border border-white/[0.08]"
                              title={lead.whatsapp_validation_error || "Erro de Comunicação com WAHA"}
                            >
                              Erro Conexão WAHA
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ENVIADO_SUCESSO" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              WhatsApp Válido
                            </span>
                          )}
                          {lead.whatsapp_validated_at && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              ({new Date(lead.whatsapp_validated_at).toLocaleDateString("pt-BR")})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        Casamento: <strong className="text-zinc-100">{lead.data_casamento || "Sem data"}</strong> ({lead.mes_casamento})
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.local || "Local não informado"}</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-zinc-300 min-w-0">
                      <Gift className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        <strong className="text-zinc-100">{lead.convidados}</strong> convidados • {lead.servicos || "Geral"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated budget cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                Orçamento Sugerido Automático ({lead.convidados} convidados)
              </h4>

              {products.length === 0 ? (
                <div className="border border-white/[0.06] rounded-xl p-4 text-center text-zinc-400 text-xs bg-[#12151C]">
                  Nenhum produto cadastrado no catálogo para cálculo de orçamentos dinâmicos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((prod) => {
                    const totalOrcamento = prod.valor_unitario * (lead.convidados || 0);
                    return (
                      <div key={prod.id} className="bg-[#12151C] border border-white/[0.07] rounded-xl p-3.5 flex flex-col justify-between hover:border-white/[0.15] transition shadow-xs">
                        <div>
                          <span className="text-xs text-zinc-400 block font-medium truncate" title={prod.descricao}>
                            {prod.descricao}
                          </span>
                          <span className="text-base font-bold text-amber-400 mt-1 block font-mono">
                            {totalOrcamento.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL"
                            })}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 block mt-2 font-mono border-t border-white/[0.04] pt-1.5">
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
              <h4 className="text-xs font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
                <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
                Histórico de Observações do CRM
              </h4>
              <div className="bg-[#12151C] border border-white/[0.07] rounded-xl p-4 max-h-36 sm:max-h-40 overflow-y-auto text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar">
                {lead.observacoes || "Nenhuma observação cadastrada no momento."}
              </div>
            </div>
          </div>

          {/* Right Column - Timeline Logs & Manual note creator */}
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col space-y-4 lg:h-full lg:overflow-hidden min-h-0 bg-[#0B0D12]">
            
            {/* Note Creator form */}
            <form onSubmit={handleAddNote} className="space-y-2.5 shrink-0 bg-[#12151C] border border-white/[0.07] rounded-xl p-3.5 shadow-xs">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 tracking-tight">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Registrar Atendimento Manual
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ex: 'Noiva solicitou foto das velas pelo WhatsApp...'"
                  className="text-xs"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar
                </Button>
              </div>
            </form>

            {/* Chronological timeline list */}
            <div className="flex flex-col lg:flex-1 lg:min-h-0 pt-2 lg:pt-0">
              <h4 className="text-xs font-semibold text-zinc-300 tracking-tight mb-3 shrink-0 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Histórico de Interações ({history.length})
              </h4>

              <div className="max-h-[350px] sm:max-h-[450px] lg:max-h-none lg:flex-1 overflow-y-auto pr-1 space-y-4 relative pl-4 border-l border-white/[0.08] custom-scrollbar">
                {history.length > 0 ? (
                  history.map((event) => {
                    const eventDate = new Date(event.created_at);
                    
                    return (
                      <div key={event.id} className="relative group text-xs">
                        {/* Dot indicator on timeline line */}
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#181C26] border-2 border-indigo-500/60 group-hover:border-indigo-400 group-hover:bg-indigo-500 transition shrink-0" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-semibold text-zinc-100 leading-none">
                              {event.titulo}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                              {eventDate.toLocaleDateString("pt-BR")} às {eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                              event.canal === "WHATSAPP" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                              event.canal === "EMAIL" ? "bg-sky-500/15 text-sky-300 border border-sky-500/30" :
                              event.canal === "MANUAL" ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" :
                              "bg-white/[0.06] text-zinc-300 border border-white/[0.08]"
                            }`}>
                              {event.canal}
                            </span>
                            <span className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">{event.tipo}</span>
                          </div>

                          {event.detalhes && (
                            <div
                              className="mt-1.5 p-2.5 bg-[#121620] border border-white/[0.06] rounded-lg text-[11px] text-zinc-300 leading-relaxed break-words"
                              dangerouslySetInnerHTML={{ __html: event.detalhes }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-zinc-600" />
                    Nenhuma interação registrada.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: Definir / Alterar Próximo Passo */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Definir Próximo Passo"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Tipo da Atividade Manual
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModalActivityType("RESPONDER")}
                className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-center gap-2 cursor-pointer ${
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
                className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-center gap-2 cursor-pointer ${
                  modalActivityType === "ACOMPANHAR"
                    ? "bg-sky-500/20 border-sky-500 text-sky-300"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-xs">ACOMPANHAR</p>
                  <p className="text-[10px] text-zinc-400 font-normal">Aguardando retorno</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModalActivityType("REATIVAR")}
                className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-center gap-2 cursor-pointer ${
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
                className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-center gap-2 cursor-pointer ${
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

          <FormField label="Data Prevista" required>
            <Input
              type="date"
              required
              value={modalActivityDate}
              onChange={(e) => setModalActivityDate(e.target.value)}
            />
          </FormField>

          <FormField label="Observação">
            <Textarea
              rows={3}
              placeholder="Ex: Checar se recebeu a amostra das essências..."
              value={modalActivityObs}
              onChange={(e) => setModalActivityObs(e.target.value)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsActivityModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveNextActivity}
              disabled={isActivitySaving || !modalActivityDate}
            >
              {isActivitySaving ? "Salvando..." : "Agendar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Reagendar Rápido */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reagendar Atividade"
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickReschedule(0)}
              className="p-3 bg-[#12151C] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.04] text-white rounded-xl font-medium text-center transition cursor-pointer text-xs"
            >
              Hoje
            </button>
            <button
              onClick={() => handleQuickReschedule(1)}
              className="p-3 bg-[#12151C] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.04] text-white rounded-xl font-medium text-center transition cursor-pointer text-xs"
            >
              Amanhã
            </button>
            <button
              onClick={() => handleQuickReschedule(3)}
              className="p-3 bg-[#12151C] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.04] text-white rounded-xl font-medium text-center transition cursor-pointer text-xs"
            >
              Em 3 dias
            </button>
            <button
              onClick={() => handleQuickReschedule(7)}
              className="p-3 bg-[#12151C] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.04] text-white rounded-xl font-medium text-center transition cursor-pointer text-xs"
            >
              Em 7 dias
            </button>
          </div>

          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <label className="block text-xs font-medium text-zinc-400">
              Ou escolha outra data:
            </label>
            <Input
              type="date"
              onChange={(e) => {
                if (e.target.value) {
                  handleQuickReschedule(e.target.value);
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL: Pós Conclusão */}
      <Modal
        isOpen={isPostCompleteOpen}
        onClose={() => setIsPostCompleteOpen(false)}
        title="Atividade Concluída"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Atividade Concluída!</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Registrada com sucesso no histórico deste lead.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-left text-xs space-y-1">
            <p className="font-semibold text-zinc-200">Deseja agendar o próximo passo?</p>
            <p className="text-[11px] text-zinc-500">
              Garanta que este lead continuará no radar de atendimento.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setIsPostCompleteOpen(false);
                handleOpenActivityModal();
              }}
              className="w-full gap-1.5"
            >
              <Plus className="w-4 h-4" /> Sim, Agendar Próximo Passo
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsPostCompleteOpen(false)}
              className="w-full text-zinc-400"
            >
              Não, concluir por enquanto
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
