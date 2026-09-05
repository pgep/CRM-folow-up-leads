/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Clock, MessageCircle, Mail, FileText, Bot, AlertCircle, Sparkles } from "lucide-react";
import { LeadHistory } from "../../types";

interface TimelineViewProps {
  history: LeadHistory[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ history }) => {
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const day = String(d.getDate()).padStart(2, "0");
      const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const month = months[d.getMonth()];
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} • ${hours}:${mins}`;
    } catch {
      return dateStr;
    }
  };

  const getCanalConfig = (canal?: string | null) => {
    const c = String(canal || "").toUpperCase();
    if (c === "WHATSAPP") {
      return {
        label: "WhatsApp",
        icon: MessageCircle,
        badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        dotClass: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
      };
    }
    if (c === "EMAIL") {
      return {
        label: "E-mail",
        icon: Mail,
        badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
        dotClass: "border-sky-500 bg-sky-50 dark:bg-sky-950",
      };
    }
    if (c === "MANUAL") {
      return {
        label: "Nota Manual",
        icon: FileText,
        badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        dotClass: "border-purple-500 bg-purple-50 dark:bg-purple-950",
      };
    }
    if (c === "SISTEMA" || c === "AUTOMAÇÃO" || c === "AUTOMACAO") {
      return {
        label: "Automação",
        icon: Bot,
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        dotClass: "border-amber-500 bg-amber-50 dark:bg-amber-950",
      };
    }
    return {
      label: canal || "Registro",
      icon: Clock,
      badgeClass: "bg-slate-500/10 text-slate-700 dark:text-zinc-300 border-slate-500/20",
      dotClass: "border-slate-400 bg-slate-50 dark:bg-zinc-800",
    };
  };

  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-xs" style={{ color: "var(--crm-text-muted)" }}>
        <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
        Nenhuma interação registrada nesta oportunidade até o momento.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
      {history.map((event) => {
        const canalConfig = getCanalConfig(event.canal);
        const CanalIcon = canalConfig.icon;

        return (
          <div key={event.id} className="relative group text-xs">
            {/* Timeline Marker Node */}
            <div
              className={`absolute -left-[20px] top-1.5 w-3 h-3 rounded-full border-2 transition shadow-2xs ${canalConfig.dotClass}`}
            />

            <div className="space-y-1.5">
              {/* Header line: Interaction Title (primary visual weight) + Canal badge (metadata) + Timestamp */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-xs sm:text-[13px] tracking-tight text-slate-900 dark:text-zinc-100">
                    {event.titulo}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${canalConfig.badgeClass}`}
                  >
                    <CanalIcon className="w-2.5 h-2.5 opacity-80" />
                    {canalConfig.label}
                  </span>
                </div>
                <span className="text-[11px] font-medium font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                  {formatTimestamp(event.created_at)}
                </span>
              </div>

              {/* Interaction details / content with enhanced legibility */}
              {event.detalhes && (
                <div
                  className="text-xs leading-relaxed pt-0.5 text-slate-700 dark:text-zinc-300 break-words font-normal"
                  dangerouslySetInnerHTML={{ __html: event.detalhes }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
