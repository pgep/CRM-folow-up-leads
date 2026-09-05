/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Tag, TrendingUp, Sparkles, Activity } from "lucide-react";
import { Lead } from "../../types";

export interface EtapaOption {
  value: string;
  label: string;
}

interface CommercialStatusCardProps {
  lead: Lead;
  statusList: string[];
  etapasList: Array<string | EtapaOption>;
  tempsList: string[];
  onUpdateField: (field: string, value: any) => Promise<void>;
  isUpdating: boolean;
}

export const CommercialStatusCard: React.FC<CommercialStatusCardProps> = ({
  lead,
  statusList,
  etapasList,
  tempsList,
  onUpdateField,
  isUpdating,
}) => {
  const statusConversaOptions = [
    { value: "NUNCA_RESPONDEU", label: "Nunca respondeu" },
    { value: "RESPONDEU", label: "Respondeu" },
    { value: "EM_ATENDIMENTO", label: "Em atendimento" },
    { value: "ESCOLHENDO_MODELO", label: "Escolhendo modelo" },
    { value: "ORCAMENTO_ENVIADO", label: "Orçamento enviado" },
    { value: "NEGOCIACAO", label: "Negociação" },
    { value: "CLIENTE", label: "Fechou (Cliente)" },
    { value: "PERDIDO", label: "Perdido" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h3
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Situação Comercial
          </h3>
        </div>
        {isUpdating && (
          <span className="text-[11px] font-medium text-indigo-500 animate-pulse">
            Salvando...
          </span>
        )}
      </div>

      <div
        className="rounded-2xl p-4 sm:p-5 border transition grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        {/* 1. Status Conversa */}
        <div>
          <label
            className="block text-[11px] font-bold mb-1"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Status Conversa
          </label>
          <select
            value={lead.status_conversa || "EM_ATENDIMENTO"}
            disabled={isUpdating}
            onChange={(e) => onUpdateField("status_conversa", e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border transition focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            {statusConversaOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Status Funil */}
        <div>
          <label
            className="block text-[11px] font-bold mb-1"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Status do Funil
          </label>
          <select
            value={lead.status_funil}
            disabled={isUpdating}
            onChange={(e) => onUpdateField("status_funil", e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border transition focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            {statusList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Etapa do Fluxo */}
        <div>
          <label
            className="block text-[11px] font-bold mb-1"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Etapa do Fluxo
          </label>
          <select
            value={lead.etapa_contato || ""}
            disabled={isUpdating}
            onChange={(e) => onUpdateField("etapa_contato", e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border transition focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            {etapasList.length === 0 && (
              <option value={lead.etapa_contato || ""}>
                {lead.etapa_contato || "Selecione..."}
              </option>
            )}
            {etapasList.map((et) => {
              const val = typeof et === "string" ? et : et.value;
              const lbl = typeof et === "string" ? et : et.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        </div>

        {/* 4. Temperatura */}
        <div>
          <label
            className="block text-[11px] font-bold mb-1"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Temperatura
          </label>
          <select
            value={lead.temperatura}
            disabled={isUpdating}
            onChange={(e) => onUpdateField("temperatura", e.target.value)}
            className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border transition focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            {tempsList.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
