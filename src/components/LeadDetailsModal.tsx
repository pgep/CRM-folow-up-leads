/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, Calendar, User, Mail, Phone, MapPin, Gift, 
  MessageSquare, Check, Clock, AlertCircle, 
  Trash2, Sparkles, Flame, MessageCircle, Edit2, 
  Send, Copy, ExternalLink, ShieldCheck, ShieldAlert
} from "lucide-react";
import { Lead, LeadHistory } from "../types";
import { useToast } from "./Toast";
import { Button, Input, Textarea, FormField } from "./ui";
import { CommercialStatusCard } from "./lead-details/CommercialStatusCard";
import { NextActivityCard } from "./lead-details/NextActivityCard";
import { TimelineView } from "./lead-details/TimelineView";
import { 
  ScheduleActivityModal, 
  QuickRescheduleModal, 
  PostCompleteModal 
} from "./lead-details/ActivityModals";

interface LeadDetailsModalProps {
  leadId: string;
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead?: (id: string) => Promise<void>;
}

// Helpers para cálculo e formatação de casamento
function parseWeddingDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleanStr = dateStr.trim();

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
  if (!isNaN(parsed)) return new Date(parsed);
  return null;
}

function getDaysUntilWedding(dateStr?: string) {
  const parsedDate = parseWeddingDate(dateStr);
  if (!parsedDate) {
    return {
      days: null,
      label: "Data a definir",
      formattedDisplay: "Data a definir",
      urgency: "indefinido" as const,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const diffTime = targetDate.getTime() - today.getTime();
  const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dayStr = targetDate.getDate();
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const monthStr = months[targetDate.getMonth()];
  const yearStr = targetDate.getFullYear();
  const formattedDisplay = `${dayStr} ${monthStr} ${yearStr}`;

  if (days === 0) {
    return {
      days: 0,
      label: "Hoje!",
      formattedDisplay,
      urgency: "hoje" as const,
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    };
  } else if (days < 0) {
    const absDays = Math.abs(days);
    return {
      days,
      label: absDays === 1 ? "Ontem" : `há ${absDays}d`,
      formattedDisplay,
      urgency: "passado" as const,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  } else if (days <= 30) {
    return {
      days,
      label: `em ${days}d (urgente)`,
      formattedDisplay,
      urgency: "urgente" as const,
      badgeColor: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    };
  } else if (days <= 90) {
    return {
      days,
      label: `em ${days}d`,
      formattedDisplay,
      urgency: "proximo" as const,
      badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
    };
  } else {
    return {
      days,
      label: `em ${days}d`,
      formattedDisplay,
      urgency: "futuro" as const,
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    };
  }
}

export default function LeadDetailsModal({ leadId, onClose, onUpdateLead, onDeleteLead }: LeadDetailsModalProps) {
  const { toast, confirm } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual note state
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Lead metadata edit mode
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nome: "",
    email: "",
    link_celular: "",
    convidados: 100,
    data_casamento: "",
    mes_casamento: "",
    local: "",
    servicos: "",
  });
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  // Lists and products
  const [products, setProducts] = useState<any[]>([]);
  const [etapasList, setEtapasList] = useState<Array<{ value: string; label: string } | string>>([]);
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Next Activity Modals
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [modalActivityType, setModalActivityType] = useState<"RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR">("ACOMPANHAR");
  const [modalActivityDate, setModalActivityDate] = useState("");
  const [modalActivityObs, setModalActivityObs] = useState("");
  const [isActivitySaving, setIsActivitySaving] = useState(false);

  // Quick Reschedule Modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Post Complete Modal
  const [isPostCompleteOpen, setIsPostCompleteOpen] = useState(false);

  // Deleting lead state
  const [isDeleting, setIsDeleting] = useState(false);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isActivityModalOpen) setIsActivityModalOpen(false);
        else if (isRescheduleModalOpen) setIsRescheduleModalOpen(false);
        else if (isPostCompleteOpen) setIsPostCompleteOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isActivityModalOpen, isRescheduleModalOpen, isPostCompleteOpen]);

  // Fetch lead data and history
  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const [leadRes, historyRes, prodRes, setRes, workflowRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/leads/${leadId}/history`),
        fetch("/api/products"),
        fetch("/api/settings"),
        fetch("/api/workflow"),
      ]);

      if (!leadRes.ok) throw new Error("Lead não encontrado");

      const leadData = await leadRes.json();
      const historyData = await historyRes.json();
      const prodData = await prodRes.json();
      const setData = await setRes.json();

      let workflowData: any[] = [];
      if (workflowRes.ok) {
        try {
          const wData = await workflowRes.json();
          if (Array.isArray(wData)) {
            workflowData = wData;
          }
        } catch {
          workflowData = [];
        }
      }

      setLead(leadData);
      setHistory(historyData);
      setProducts(prodData);

      setEditFormData({
        nome: leadData.nome || "",
        email: leadData.email || "",
        link_celular: leadData.link_celular || "",
        convidados: leadData.convidados || 100,
        data_casamento: leadData.data_casamento || "",
        mes_casamento: leadData.mes_casamento || "",
        local: leadData.local || "",
        servicos: leadData.servicos || "",
      });

      // Populate etapasList safely from workflow_config, preserving technical key as value and descricao as human label
      const etapasOptionsMap = new Map<string, string>();

      if (workflowData.length > 0) {
        for (const stage of workflowData) {
          if (stage.etapa) {
            etapasOptionsMap.set(stage.etapa, stage.descricao || stage.etapa);
          }
        }
      }

      // If lead already has an etapa not in workflow, preserve it
      if (leadData.etapa_contato && !etapasOptionsMap.has(leadData.etapa_contato)) {
        etapasOptionsMap.set(leadData.etapa_contato, leadData.etapa_contato);
      }

      // Fallback if workflow configs were empty
      if (etapasOptionsMap.size === 0) {
        const etapasFromSettings = Array.isArray(setData?.etapas_contato)
          ? setData.etapas_contato
          : Array.isArray(setData?.etapas)
          ? setData.etapas
          : [];

        const defaultEtapas = [
          "SEM_CONTATO",
          "WHATSAPP_ENVIADO",
          "PRIMEIRO_EMAIL_ENVIADO",
          "WHATSAPP_FOLLOWUP_2",
          "EMAIL_FOLLOWUP_2",
          "EMAIL_FINAL",
          "ENCERRADO"
        ];

        const combined = Array.from(new Set([...etapasFromSettings, ...defaultEtapas]));
        for (const et of combined) {
          etapasOptionsMap.set(et, et);
        }
      }

      const formattedEtapas = Array.from(etapasOptionsMap.entries()).map(([value, label]) => ({
        value,
        label,
      }));

      setEtapasList(formattedEtapas);
      if (setData.status_funil) setStatusList(setData.status_funil);
      if (setData.temperaturas) setTempsList(setData.temperaturas);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar detalhes do lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  // Status updates
  const handleUpdateStatus = async (field: string, value: any) => {
    if (!lead) return;
    try {
      setIsUpdatingStatus(true);
      await onUpdateLead(lead.id, { [field]: value });
      setLead((prev) => (prev ? { ...prev, [field]: value } : null));
      toast.success("Situação comercial atualizada");
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Next Activity handlers
  const handleSaveNextActivity = async () => {
    if (!lead || !modalActivityDate) {
      toast.error("Informe uma data válida para a atividade");
      return;
    }

    try {
      setIsActivitySaving(true);
      const res = await fetch(`/api/leads/${lead.id}/next-activity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_proxima_atividade: modalActivityType,
          proxima_atividade_em: modalActivityDate,
          observacao_proxima_atividade: modalActivityObs.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar próxima atividade");

      toast.success("Próximo passo comercial agendado!");
      setIsActivityModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar atividade");
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
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Erro ao concluir atividade");

      toast.success("Atividade concluída com sucesso!");
      setIsPostCompleteOpen(true);
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao concluir atividade");
    } finally {
      setIsActivitySaving(false);
    }
  };

  const handleQuickReschedule = async (daysToAddOrDate: number | string) => {
    if (!lead) return;
    try {
      setIsActivitySaving(true);
      let targetDateStr = "";

      if (typeof daysToAddOrDate === "number") {
        const d = new Date();
        d.setDate(d.getDate() + daysToAddOrDate);
        targetDateStr = d.toISOString().slice(0, 10);
      } else {
        targetDateStr = daysToAddOrDate;
      }

      const res = await fetch(`/api/leads/${lead.id}/next-activity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_proxima_atividade: lead.tipo_proxima_atividade || "ACOMPANHAR",
          proxima_atividade_em: targetDateStr,
          observacao_proxima_atividade: lead.observacao_proxima_atividade || null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao reagendar atividade");

      toast.success("Atividade reagendada com sucesso!");
      setIsRescheduleModalOpen(false);
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reagendar atividade");
    } finally {
      setIsActivitySaving(false);
    }
  };

  // Add Manual Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !lead) return;

    try {
      setIsSubmittingNote(true);
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: newNote }),
      });

      if (!res.ok) throw new Error("Erro ao registrar nota");

      setNewNote("");
      toast.success("Nota de atendimento registrada!");
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar nota");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Save metadata
  const handleSaveMetadata = async () => {
    if (!lead) return;
    try {
      setIsSavingMetadata(true);
      await onUpdateLead(lead.id, editFormData);
      toast.success("Dados cadastrais atualizados!");
      setIsEditingMetadata(false);
      fetchLeadDetails();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar dados");
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Delete lead with standardized ConfirmDialog
  const handleDelete = async () => {
    if (!lead || !onDeleteLead) return;
    const confirmed = await confirm({
      title: "Excluir Oportunidade?",
      message: `Tem certeza que deseja excluir o lead "${lead.nome}"? Esta ação removerá permanentemente todos os registros, históricos e notas associadas.`,
      confirmText: "Sim, Excluir",
      cancelText: "Cancelar",
      isDanger: true,
    });

    if (confirmed) {
      try {
        setIsDeleting(true);
        await onDeleteLead(lead.id);
        toast.success("Lead excluído com sucesso.");
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Erro ao excluir o lead");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.info(`${label} copiado para a área de transferência.`);
  };

  if (loading || !lead) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="w-full max-w-md p-6 rounded-2xl border text-center space-y-3"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
            color: "var(--crm-text)",
          }}
        >
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">Carregando área de trabalho da oportunidade...</p>
        </div>
      </div>
    );
  }

  const weddingInfo = getDaysUntilWedding(lead.data_casamento);

  const getTemperaturaBadge = (temp: string) => {
    switch (temp) {
      case "QUENTE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            <Flame className="w-3.5 h-3.5 text-rose-500" /> Quente
          </span>
        );
      case "MORNA":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Morna
          </span>
        );
      case "FRIA":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-700 dark:text-zinc-300 border border-slate-500/30">
            Fria
          </span>
        );
      case "CLIENTE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Cliente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            {temp}
          </span>
        );
    }
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const rawPhone = lead.telefone_limpo || getCleanPhone(lead.link_celular);
  const whatsappUrl = rawPhone
    ? `https://wa.me/${rawPhone.startsWith("55") ? rawPhone : "55" + rawPhone}`
    : null;

  const creationDateDisplay = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs overflow-y-auto p-2 sm:p-4 md:p-6 lg:p-8 flex justify-center items-start animate-fade-in">
      {/* Workspace Container - Single-scroll unified document */}
      <div
        className="w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl transition-colors border my-4 sm:my-8 flex flex-col relative"
        style={{
          backgroundColor: "var(--crm-bg)",
          borderColor: "var(--crm-border)",
        }}
      >
        {/* Workspace Header - Sticky on top */}
        <div
          className="sticky top-0 z-20 px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-4 backdrop-blur-md rounded-t-2xl sm:rounded-t-3xl"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
        >
          {/* Lead identification */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-lg border border-indigo-500/20 shrink-0 flex items-center justify-center">
              {lead.nome ? lead.nome.charAt(0).toUpperCase() : "L"}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-lg sm:text-xl font-bold tracking-tight truncate leading-tight"
                  style={{ color: "var(--crm-text)" }}
                >
                  {lead.nome}
                </h2>
                {getTemperaturaBadge(lead.temperatura)}
                <span
                  className="text-[11px] font-mono select-all px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/60"
                  title="ID do Lead"
                >
                  #{lead.id}
                </span>
              </div>

              {/* Sub-metadata line */}
              <div
                className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap mt-0.5"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                <span>{lead.origem_portal || "Origem Direta"}</span>
                {lead.local && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                      {lead.local}
                    </span>
                  </>
                )}
                {lead.data_casamento && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      Casamento: {weddingInfo.formattedDisplay} ({weddingInfo.label})
                    </span>
                  </>
                )}
                {creationDateDisplay && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-[11px] opacity-70">
                      Cadastrado em {creationDateDisplay}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition hover:opacity-80"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                <Mail className="w-3.5 h-3.5 text-sky-500" />
                <span className="hidden md:inline">E-mail</span>
              </a>
            )}

            {onDeleteLead && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Excluir Lead"
                className="p-2 rounded-xl border transition text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                style={{
                  borderColor: "var(--crm-border)",
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border transition hover:opacity-80 cursor-pointer ml-1"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Body: Single continuous flow (Single scroll) */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
          {/* 2. INFORMAÇÕES CADASTRAIS */}
          <div
            className="rounded-2xl p-4 sm:p-6 border transition shadow-xs space-y-4"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Informações Cadastrais
                </h3>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                className="gap-1.5 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {isEditingMetadata ? "Cancelar Edição" : "Editar Dados"}
              </Button>
            </div>

            {isEditingMetadata ? (
              /* Modo Edição */
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <FormField label="Nome da Noiva / Contratante">
                    <Input
                      value={editFormData.nome}
                      onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    />
                  </FormField>
                  <FormField label="E-mail">
                    <Input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Celular / WhatsApp">
                    <Input
                      value={editFormData.link_celular}
                      onChange={(e) => setEditFormData({ ...editFormData, link_celular: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Convidados Estimados">
                    <Input
                      type="number"
                      value={editFormData.convidados}
                      onChange={(e) => setEditFormData({ ...editFormData, convidados: Number(e.target.value) })}
                    />
                  </FormField>
                  <FormField label="Data do Casamento">
                    <Input
                      value={editFormData.data_casamento}
                      placeholder="Ex: 25/10/2026"
                      onChange={(e) => setEditFormData({ ...editFormData, data_casamento: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Mês / Ano Previsto">
                    <Input
                      value={editFormData.mes_casamento}
                      placeholder="Ex: Outubro / 2026"
                      onChange={(e) => setEditFormData({ ...editFormData, mes_casamento: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField label="Local do Evento">
                    <Input
                      value={editFormData.local}
                      placeholder="Ex: Villa Bisutti, São Paulo - SP"
                      onChange={(e) => setEditFormData({ ...editFormData, local: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Serviços Solicitados">
                    <Input
                      value={editFormData.servicos}
                      placeholder="Ex: Lembrancinhas com aroma floral e vela aromática"
                      onChange={(e) => setEditFormData({ ...editFormData, servicos: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: "var(--crm-border-subtle)" }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingMetadata(false)}
                    disabled={isSavingMetadata}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveMetadata}
                    disabled={isSavingMetadata}
                    className="gap-1.5"
                  >
                    {isSavingMetadata ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            ) : (
              /* Modo Leitura Elegante e Espaçado */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
                <div
                  className="p-3.5 rounded-xl border transition"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                    Nome Completo
                  </span>
                  <p className="font-bold text-sm mt-1" style={{ color: "var(--crm-text)" }}>
                    {lead.nome || "Não informado"}
                  </p>
                </div>

                <div
                  className="p-3.5 rounded-xl border transition flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                      Celular / WhatsApp
                    </span>
                    <p className="font-bold text-sm mt-1 truncate" style={{ color: "var(--crm-text)" }}>
                      {lead.link_celular || lead.telefone_limpo || "Não informado"}
                    </p>
                    {lead.whatsapp_validation_status && (
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        lead.whatsapp_validation_status === "NUMERO_SEM_WHATSAPP"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {lead.whatsapp_validation_status === "NUMERO_SEM_WHATSAPP"
                          ? "Sem WhatsApp ativo"
                          : "WhatsApp verificado"}
                      </span>
                    )}
                  </div>
                  {rawPhone && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(rawPhone, "Telefone")}
                      title="Copiar número de celular"
                      className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer shrink-0"
                      style={{
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-secondary)",
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div
                  className="p-3.5 rounded-xl border transition flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                      E-mail
                    </span>
                    <p className="font-bold text-sm mt-1 truncate" style={{ color: "var(--crm-text)" }}>
                      {lead.email || "Não informado"}
                    </p>
                  </div>
                  {lead.email && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lead.email, "E-mail")}
                      title="Copiar e-mail"
                      className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer shrink-0"
                      style={{
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-secondary)",
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div
                  className="p-3.5 rounded-xl border transition"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                    Origem da Oportunidade
                  </span>
                  <p className="font-bold text-sm mt-1" style={{ color: "var(--crm-text)" }}>
                    {lead.origem_portal || "Origem Direta"}
                  </p>
                </div>

                <div
                  className="p-3.5 rounded-xl border transition"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                    Local do Evento
                  </span>
                  <p className="font-bold text-sm mt-1 truncate" style={{ color: "var(--crm-text)" }}>
                    {lead.local || "Não informado"}
                  </p>
                </div>

                <div
                  className="p-3.5 rounded-xl border transition"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <span className="block text-[11px] font-semibold" style={{ color: "var(--crm-text-muted)" }}>
                    Convidados Estimados
                  </span>
                  <p className="font-bold text-sm mt-1" style={{ color: "var(--crm-text)" }}>
                    {lead.convidados ? `${lead.convidados} pessoas` : "100 pessoas (estimado)"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. SITUAÇÃO COMERCIAL */}
          <CommercialStatusCard
            lead={lead}
            statusList={statusList}
            etapasList={etapasList}
            tempsList={tempsList}
            onUpdateField={handleUpdateStatus}
            isUpdating={isUpdatingStatus}
          />

          {/* 4. PRÓXIMO PASSO DO ATENDIMENTO */}
          <NextActivityCard
            lead={lead}
            onOpenScheduleModal={() => {
              setModalActivityType(lead.tipo_proxima_atividade || "ACOMPANHAR");
              setModalActivityDate(
                lead.proxima_atividade_em ? String(lead.proxima_atividade_em).slice(0, 10) : ""
              );
              setModalActivityObs(lead.observacao_proxima_atividade || "");
              setIsActivityModalOpen(true);
            }}
            onOpenQuickReschedule={() => setIsRescheduleModalOpen(true)}
            onCompleteActivity={handleCompleteActivity}
            isCompleting={isActivitySaving}
          />

          {/* 5. CONTEXTO DO CASAMENTO / ORÇAMENTO */}
          <div
            className="rounded-2xl p-4 sm:p-6 border transition shadow-xs space-y-5"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Gift className="w-4 h-4" />
              </div>
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Contexto do Casamento & Orçamento
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div
                className="p-3.5 rounded-xl border flex flex-col justify-between gap-1.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  Data do Casamento:
                </span>
                <span className="font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--crm-text)" }}>
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  {weddingInfo.formattedDisplay}
                </span>
              </div>

              <div
                className="p-3.5 rounded-xl border flex flex-col justify-between gap-1.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  Prazo do Evento:
                </span>
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs border ${weddingInfo.badgeColor}`}>
                    {weddingInfo.label}
                  </span>
                </div>
              </div>

              <div
                className="p-3.5 rounded-xl border flex flex-col justify-between gap-1.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  Convidados Estimados:
                </span>
                <span className="font-bold text-sm" style={{ color: "var(--crm-text)" }}>
                  {lead.convidados || 100} pessoas
                </span>
              </div>

              <div
                className="p-3.5 rounded-xl border flex flex-col justify-between gap-1.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  Mês Previsto:
                </span>
                <span className="font-bold text-sm" style={{ color: "var(--crm-text)" }}>
                  {lead.mes_casamento || "Não informado"}
                </span>
              </div>
            </div>

            {lead.local && (
              <div
                className="p-3.5 rounded-xl border text-xs flex items-center gap-2.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                  Local do Evento:
                </span>
                <span className="font-bold text-xs" style={{ color: "var(--crm-text)" }}>
                  {lead.local}
                </span>
              </div>
            )}

            {lead.servicos && (
              <div
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <span className="font-semibold block" style={{ color: "var(--crm-text-secondary)" }}>
                  Serviços Solicitados:
                </span>
                <p className="leading-relaxed font-medium" style={{ color: "var(--crm-text)" }}>
                  {lead.servicos}
                </p>
              </div>
            )}

            {/* Orçamento Sugerido Dinâmico */}
            {products.length > 0 && (
              <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--crm-border-subtle)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--crm-text-secondary)" }}>
                  Orçamento Sugerido ({lead.convidados || 100} convidados)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {products.slice(0, 4).map((prod) => {
                    const totalEstimated = (lead.convidados || 100) * (prod.preco_unitario || 0);
                    return (
                      <div
                        key={prod.id}
                        className="p-3 rounded-xl border text-xs flex flex-col justify-between gap-1.5"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <span className="font-medium truncate" style={{ color: "var(--crm-text)" }}>
                          {prod.descricao || prod.nome}
                        </span>
                        <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          R$ {totalEstimated.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observações Originais do Lead */}
            {lead.observacoes && (
              <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--crm-border-subtle)" }}>
                <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: "var(--crm-text-secondary)" }}>
                  Observações Originais do Lead
                </span>
                <div
                  className="p-3 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap font-medium"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border-subtle)",
                    color: "var(--crm-text)",
                  }}
                >
                  {lead.observacoes}
                </div>
              </div>
            )}
          </div>

          {/* 6. REGISTRAR ATENDIMENTO MANUAL */}
          <div
            className="rounded-2xl p-4 sm:p-5 border transition shadow-xs space-y-3"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Registrar Atendimento Manual
              </h3>
            </div>

            <form
              onSubmit={handleAddNote}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="flex-1">
                <Input
                  placeholder="Ex: Noiva enviou áudio no WhatsApp solicitando amostra de lavanda..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="text-xs w-full"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={isSubmittingNote}
                loading={isSubmittingNote}
                loadingText="Registrando..."
                className="gap-1.5 text-xs shrink-0 whitespace-nowrap font-semibold border shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Registrar Nota
              </Button>
            </form>
          </div>

          {/* 7. HISTÓRICO DE INTERAÇÕES (TIMELINE) */}
          <div
            className="rounded-2xl p-4 sm:p-6 border transition shadow-xs space-y-4"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Histórico de Interações ({history.length})
                </h3>
              </div>
            </div>

            <div className="pt-2">
              <TimelineView history={history} />
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Modals */}
      <ScheduleActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        activityType={modalActivityType}
        setActivityType={setModalActivityType}
        activityDate={modalActivityDate}
        setActivityDate={setModalActivityDate}
        activityObs={modalActivityObs}
        setActivityObs={setModalActivityObs}
        onSave={handleSaveNextActivity}
        isSaving={isActivitySaving}
      />

      <QuickRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onSelect={handleQuickReschedule}
        isSaving={isActivitySaving}
      />

      <PostCompleteModal
        isOpen={isPostCompleteOpen}
        onClose={() => setIsPostCompleteOpen(false)}
        onOpenNextStep={() => {
          setModalActivityType("ACOMPANHAR");
          const d = new Date();
          d.setDate(d.getDate() + 3);
          setModalActivityDate(d.toISOString().slice(0, 10));
          setModalActivityObs("");
          setIsActivityModalOpen(true);
        }}
      />
    </div>
  );
}
