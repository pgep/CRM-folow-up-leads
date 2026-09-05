/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Clock, Calendar, Check, AlertCircle, MessageCircle, 
  Flame, Sparkles, Plus, CalendarCheck, Edit3, Bot 
} from "lucide-react";
import { Lead } from "../../types";
import { Button } from "../ui";

interface NextActivityCardProps {
  lead: Lead;
  onOpenScheduleModal: () => void;
  onOpenQuickReschedule: () => void;
  onCompleteActivity: () => Promise<void>;
  isCompleting: boolean;
}

export const NextActivityCard: React.FC<NextActivityCardProps> = ({
  lead,
  onOpenScheduleModal,
  onOpenQuickReschedule,
  onCompleteActivity,
  isCompleting,
}) => {
  const evaluateUrgency = () => {
    if (!lead.proxima_atividade_em) return null;
    const clean = String(lead.proxima_atividade_em).trim().slice(0, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = clean.includes("-") ? clean.split("-").map(Number) : null;
    if (!parts || parts.length !== 3) {
      return {
        urgency: "futuro" as const,
        label: clean,
        formattedDate: clean,
        daysDiff: 0,
      };
    }

    const targetDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const dayStr = String(targetDate.getDate()).padStart(2, "0");
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const monthStr = months[targetDate.getMonth()];
    const yearStr = targetDate.getFullYear();
    const formattedDate = `${dayStr} ${monthStr} ${yearStr}`;

    if (days < 0) {
      const absDays = Math.abs(days);
      return {
        urgency: "atrasado" as const,
        label: absDays === 1 ? "Atrasada há 1 dia" : `Atrasada há ${absDays} dias`,
        formattedDate,
        daysDiff: days,
      };
    }
    if (days === 0) {
      return {
        urgency: "hoje" as const,
        label: "Hoje! Prioridade comercial",
        formattedDate,
        daysDiff: 0,
      };
    }
    if (days === 1) {
      return {
        urgency: "futuro" as const,
        label: "Amanhã",
        formattedDate,
        daysDiff: 1,
      };
    }
    return {
      urgency: "futuro" as const,
      label: `Em ${days} dias`,
      formattedDate,
      daysDiff: days,
    };
  };

  const urgencyInfo = evaluateUrgency();

  const getTypeBadge = (type?: string | null) => {
    switch (type) {
      case "RESPONDER":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
            Responder
          </span>
        );
      case "ACOMPANHAR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            Acompanhar
          </span>
        );
      case "REATIVAR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <Flame className="w-3.5 h-3.5 text-purple-500" />
            Reativar
          </span>
        );
      case "CATIVAR":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Cativar
          </span>
        );
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text-secondary)",
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            Acompanhamento
          </span>
        );
    }
  };

  const getUrgencyBadge = () => {
    if (!urgencyInfo) return null;
    if (urgencyInfo.urgency === "atrasado") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          {urgencyInfo.label}
        </span>
      );
    }
    if (urgencyInfo.urgency === "hoje") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          <Clock className="w-3 h-3 text-amber-500" />
          {urgencyInfo.label}
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{
          backgroundColor: "var(--crm-surface-subtle)",
          borderColor: "var(--crm-border)",
          color: "var(--crm-text-secondary)",
        }}
      >
        <Calendar className="w-3 h-3 text-indigo-500" />
        {urgencyInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <h3
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Próximo Passo
          </h3>
        </div>

        {lead.proxima_atividade_em && (
          <div className="flex items-center gap-2">
            {getTypeBadge(lead.tipo_proxima_atividade)}
            {getUrgencyBadge()}
          </div>
        )}
      </div>

      <div
        className="rounded-2xl p-4 sm:p-5 border transition shadow-xs"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor:
            urgencyInfo?.urgency === "atrasado"
              ? "rgba(244, 63, 94, 0.35)"
              : urgencyInfo?.urgency === "hoje"
              ? "rgba(245, 158, 11, 0.35)"
              : "var(--crm-border)",
        }}
      >
        {lead.proxima_atividade_em ? (
          <div className="space-y-3">
            {/* Main activity schedule row */}
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <span
                className="text-base sm:text-lg font-bold"
                style={{ color: "var(--crm-text)" }}
              >
                {urgencyInfo?.formattedDate}
              </span>
              {urgencyInfo?.label && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  • {urgencyInfo.label}
                </span>
              )}
            </div>

            {/* Observation note displayed cleanly without heavy box */}
            {lead.observacao_proxima_atividade && (
              <p
                className="text-xs leading-relaxed italic"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Observação: "{lead.observacao_proxima_atividade}"
              </p>
            )}

            {/* Action buttons with consistent system Button hierarchy */}
            <div
              className="flex items-center flex-wrap gap-2 pt-2 border-t"
              style={{ borderColor: "var(--crm-border-subtle)" }}
            >
              {/* Primary: Concluir */}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCompleteActivity}
                disabled={isCompleting}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                {isCompleting ? "Concluindo..." : "Concluir"}
              </Button>

              {/* Secondary: Reagendar */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenQuickReschedule}
                className="gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Reagendar
              </Button>

              {/* Ghost / Text: Alterar */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onOpenScheduleModal}
                className="gap-1.5 text-xs ml-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Alterar
              </Button>
            </div>
          </div>
        ) : (
          /* Empty State: Sem próximo passo */
          <div
            className="p-4 rounded-xl border border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs" style={{ color: "var(--crm-text)" }}>
                  Sem próximo passo agendado
                </p>
                <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
                  Defina uma ação de retorno ou follow-up para esta oportunidade.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenScheduleModal}
              className="gap-1.5 shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Próximo Passo
            </Button>
          </div>
        )}

        {/* Discrete Automation Note if present */}
        {lead.proxima_acao_em && (
          <div
            className="flex items-center gap-1.5 text-[11px] mt-2.5 pt-2 border-t"
            style={{
              borderColor: "var(--crm-border-subtle)",
              color: "var(--crm-text-muted)",
            }}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Automação programada para: {lead.proxima_acao_em.slice(0, 10)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
