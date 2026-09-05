/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MessageCircle, Clock, Flame, Sparkles, Check, Plus, Calendar } from "lucide-react";
import { Modal, Button, FormField, Input, Textarea } from "../ui";

interface ScheduleActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityType: "RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR";
  setActivityType: (type: "RESPONDER" | "ACOMPANHAR" | "REATIVAR" | "CATIVAR") => void;
  activityDate: string;
  setActivityDate: (date: string) => void;
  activityObs: string;
  setActivityObs: (obs: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({
  isOpen,
  onClose,
  activityType,
  setActivityType,
  activityDate,
  setActivityDate,
  activityObs,
  setActivityObs,
  onSave,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Definir Próximo Passo"
      description="Agende uma ação comercial para manter esta oportunidade no radar."
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label
            className="block text-xs font-semibold mb-2"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Tipo da Ação Comercial
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActivityType("RESPONDER")}
              className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2.5 cursor-pointer ${
                activityType === "RESPONDER"
                  ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500"
                  : "hover:opacity-90"
              }`}
              style={
                activityType !== "RESPONDER"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)",
                    }
                  : undefined
              }
            >
              <MessageCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Responder</p>
                <p className="text-[11px] opacity-80 font-normal">Aguardando nosso retorno</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivityType("ACOMPANHAR")}
              className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2.5 cursor-pointer ${
                activityType === "ACOMPANHAR"
                  ? "bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                  : "hover:opacity-90"
              }`}
              style={
                activityType !== "ACOMPANHAR"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)",
                    }
                  : undefined
              }
            >
              <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Acompanhar</p>
                <p className="text-[11px] opacity-80 font-normal">Follow-up com a noiva</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivityType("REATIVAR")}
              className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2.5 cursor-pointer ${
                activityType === "REATIVAR"
                  ? "bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 ring-1 ring-purple-500"
                  : "hover:opacity-90"
              }`}
              style={
                activityType !== "REATIVAR"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)",
                    }
                  : undefined
              }
            >
              <Flame className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Reativar</p>
                <p className="text-[11px] opacity-80 font-normal">Retomar contato esfriado</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActivityType("CATIVAR")}
              className={`p-3 rounded-xl border text-left transition font-semibold text-xs flex items-start gap-2.5 cursor-pointer ${
                activityType === "CATIVAR"
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500"
                  : "hover:opacity-90"
              }`}
              style={
                activityType !== "CATIVAR"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)",
                    }
                  : undefined
              }
            >
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Cativar</p>
                <p className="text-[11px] opacity-80 font-normal">Nutrir relacionamento</p>
              </div>
            </button>
          </div>
        </div>

        <FormField label="Data Prevista" required>
          <Input
            type="date"
            required
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
          />
        </FormField>

        <FormField label="Observação da Ação">
          <Textarea
            rows={3}
            placeholder="Ex: Checar se recebeu o catálogo de essências e perguntar sobre a quantidade..."
            value={activityObs}
            onChange={(e) => setActivityObs(e.target.value)}
          />
        </FormField>

        <div
          className="flex items-center justify-end gap-2.5 pt-3 border-t"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={isSaving || !activityDate}
            className="gap-1.5"
          >
            {isSaving ? "Salvando..." : "Salvar Próximo Passo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface QuickRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (daysToAddOrDate: number | string) => Promise<void>;
  isSaving: boolean;
}

export const QuickRescheduleModal: React.FC<QuickRescheduleModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isSaving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reagendar Próximo Passo"
      description="Escolha um novo prazo para esta atividade comercial."
      size="sm"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSelect(0)}
            disabled={isSaving}
            className="p-3 border rounded-xl font-semibold text-center transition cursor-pointer text-xs flex flex-col items-center justify-center gap-1 hover:opacity-80"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            <span className="font-bold">Hoje</span>
            <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>
              Imediato
            </span>
          </button>
          <button
            onClick={() => onSelect(1)}
            disabled={isSaving}
            className="p-3 border rounded-xl font-semibold text-center transition cursor-pointer text-xs flex flex-col items-center justify-center gap-1 hover:opacity-80"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            <span className="font-bold">Amanhã</span>
            <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>
              +1 dia
            </span>
          </button>
          <button
            onClick={() => onSelect(3)}
            disabled={isSaving}
            className="p-3 border rounded-xl font-semibold text-center transition cursor-pointer text-xs flex flex-col items-center justify-center gap-1 hover:opacity-80"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            <span className="font-bold">Em 3 dias</span>
            <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>
              Acompanhamento
            </span>
          </button>
          <button
            onClick={() => onSelect(7)}
            disabled={isSaving}
            className="p-3 border rounded-xl font-semibold text-center transition cursor-pointer text-xs flex flex-col items-center justify-center gap-1 hover:opacity-80"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
          >
            <span className="font-bold">Em 7 dias</span>
            <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>
              Próxima semana
            </span>
          </button>
        </div>

        <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--crm-border)" }}>
          <label
            className="block text-xs font-semibold"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Ou selecione uma data específica:
          </label>
          <Input
            type="date"
            disabled={isSaving}
            onChange={(e) => {
              if (e.target.value) {
                onSelect(e.target.value);
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

interface PostCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNextStep: () => void;
}

export const PostCompleteModal: React.FC<PostCompleteModalProps> = ({
  isOpen,
  onClose,
  onOpenNextStep,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atividade Concluída" size="sm">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
          <Check className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-base" style={{ color: "var(--crm-text)" }}>
            Atividade Concluída!
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--crm-text-secondary)" }}>
            A conclusão foi registrada no histórico desta oportunidade.
          </p>
        </div>

        <div
          className="p-3.5 rounded-xl border text-left text-xs space-y-1"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
          }}
        >
          <p className="font-semibold" style={{ color: "var(--crm-text)" }}>
            Deseja agendar o próximo passo?
          </p>
          <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
            Garanta que o lead permaneça com acompanhamento ativo na sua Agenda.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onOpenNextStep();
            }}
            className="w-full gap-1.5"
          >
            <Plus className="w-4 h-4" /> Sim, Agendar Próximo Passo
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-xs">
            Não, concluir por enquanto
          </Button>
        </div>
      </div>
    </Modal>
  );
};
