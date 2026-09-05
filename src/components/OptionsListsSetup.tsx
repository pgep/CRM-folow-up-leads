import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Edit2, Check, X, RefreshCw, AlertCircle, Save, 
  HelpCircle, MessageSquare, ToggleLeft, ToggleRight, Info
} from "lucide-react";
import { useToast } from "./Toast";

export default function OptionsListsSetup() {
  const { toast, confirm } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New item inputs
  const [newEtapa, setNewEtapa] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newTemp, setNewTemp] = useState("");

  // Editing item indices
  const [editingEtapaIdx, setEditingEtapaIdx] = useState<number | null>(null);
  const [editingEtapaVal, setEditingEtapaVal] = useState("");

  const [editingStatusIdx, setEditingStatusIdx] = useState<number | null>(null);
  const [editingStatusVal, setEditingStatusVal] = useState("");

  const [editingTempIdx, setEditingTempIdx] = useState<number | null>(null);
  const [editingTempVal, setEditingTempVal] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        setError("Não foi possível carregar as configurações do banco de dados.");
      }
    } catch (err: any) {
      setError("Erro de rede ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (updatedSettings: any) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        setSettings(updatedSettings);
        setSuccess("Alterações salvas com sucesso no banco de dados!");
        toast.success("Alterações salvas com sucesso!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Erro ao salvar configurações no servidor.");
        toast.error("Erro ao salvar configurações.");
      }
    } catch (err: any) {
      setError("Falha na rede ao salvar as alterações.");
      toast.error("Falha na rede ao salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  // Etapa Contato CRUD Handlers
  const handleAddEtapa = () => {
    if (!newEtapa.trim() || !settings) return;
    const updated = {
      ...settings,
      etapas_contato: [...(settings.etapas_contato || []), newEtapa.trim()]
    };
    saveSettings(updated);
    setNewEtapa("");
  };

  const handleDeleteEtapa = async (index: number) => {
    if (!settings) return;
    const item = settings.etapas_contato[index];
    const confirmed = await confirm(`Tem certeza que deseja excluir a etapa "${item}"?`);
    if (confirmed) {
      const updatedEtapas = [...settings.etapas_contato];
      updatedEtapas.splice(index, 1);
      const updated = {
        ...settings,
        etapas_contato: updatedEtapas
      };
      saveSettings(updated);
    }
  };

  const handleStartEditEtapa = (index: number) => {
    setEditingEtapaIdx(index);
    setEditingEtapaVal(settings.etapas_contato[index]);
  };

  const handleSaveEditEtapa = (index: number) => {
    if (!editingEtapaVal.trim() || !settings) return;
    const updatedEtapas = [...settings.etapas_contato];
    updatedEtapas[index] = editingEtapaVal.trim();
    const updated = {
      ...settings,
      etapas_contato: updatedEtapas
    };
    saveSettings(updated);
    setEditingEtapaIdx(null);
    setEditingEtapaVal("");
  };

  // Status Funil CRUD Handlers
  const handleAddStatus = () => {
    if (!newStatus.trim() || !settings) return;
    const updated = {
      ...settings,
      status_funil: [...(settings.status_funil || []), newStatus.trim()]
    };
    saveSettings(updated);
    setNewStatus("");
  };

  const handleDeleteStatus = async (index: number) => {
    if (!settings) return;
    const item = settings.status_funil[index];
    const confirmed = await confirm(`Tem certeza que deseja excluir o status "${item}"?`);
    if (confirmed) {
      const updatedStatus = [...settings.status_funil];
      updatedStatus.splice(index, 1);
      const updated = {
        ...settings,
        status_funil: updatedStatus
      };
      saveSettings(updated);
    }
  };

  const handleStartEditStatus = (index: number) => {
    setEditingStatusIdx(index);
    setEditingStatusVal(settings.status_funil[index]);
  };

  const handleSaveEditStatus = (index: number) => {
    if (!editingStatusVal.trim() || !settings) return;
    const updatedStatus = [...settings.status_funil];
    updatedStatus[index] = editingStatusVal.trim();
    const updated = {
      ...settings,
      status_funil: updatedStatus
    };
    saveSettings(updated);
    setEditingStatusIdx(null);
    setEditingStatusVal("");
  };

  // Temperatura CRUD Handlers
  const handleAddTemp = () => {
    if (!newTemp.trim() || !settings) return;
    const formatted = newTemp.trim().toUpperCase();
    const updated = {
      ...settings,
      temperaturas: Array.from(new Set([...(settings.temperaturas || []), formatted]))
    };
    saveSettings(updated);
    setNewTemp("");
  };

  const handleDeleteTemp = async (index: number) => {
    if (!settings) return;
    const item = settings.temperaturas[index];
    const confirmed = await confirm(`Tem certeza que deseja excluir a temperatura "${item}"?`);
    if (confirmed) {
      const updatedTemps = [...settings.temperaturas];
      updatedTemps.splice(index, 1);
      const updated = {
        ...settings,
        temperaturas: updatedTemps
      };
      saveSettings(updated);
    }
  };

  const handleStartEditTemp = (index: number) => {
    setEditingTempIdx(index);
    setEditingTempVal(settings.temperaturas[index]);
  };

  const handleSaveEditTemp = (index: number) => {
    if (!editingTempVal.trim() || !settings) return;
    const updatedTemps = [...settings.temperaturas];
    updatedTemps[index] = editingTempVal.trim().toUpperCase();
    const updated = {
      ...settings,
      temperaturas: updatedTemps
    };
    saveSettings(updated);
    setEditingTempIdx(null);
    setEditingTempVal("");
  };

  if (loading) {
    return (
      <div
        className="border rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px] shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--crm-text-secondary)" }}
        >
          Carregando listas do banco de dados...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="options-lists-setup-container">
      {/* Banner / Header */}
      <div
        className="border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
        id="options-lists-header-card"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--crm-text)" }}
            >
              Configurador de Tabelas Auxiliares (CRUD)
            </h3>
            <p
              className="text-xs leading-relaxed max-w-3xl"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Personalize as opções que aparecem nos menus suspensos (select boxes) de todo o sistema. Você pode adicionar, editar e excluir opções de Etapa Contato, Status Funil e Temperatura diretamente no banco de dados.
            </p>
          </div>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition shadow-xs shrink-0 cursor-pointer hover:opacity-80"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
            color: "var(--crm-text)",
          }}
          id="reload-options-lists-button"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recarregar
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 p-4 rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex items-center gap-3 text-xs">
          <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid of 3 CRUD Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Etapa Contato */}
        <div
          className="border rounded-2xl p-5 flex flex-col h-full shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="etapa-contato-card"
        >
          <div
            className="border-b pb-3 mb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <h4
              className="font-bold text-sm"
              style={{ color: "var(--crm-text)" }}
            >
              Etapa Contato
            </h4>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Define a etapa atual da régua de relacionamento
            </p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newEtapa}
              onChange={(e) => setNewEtapa(e.target.value)}
              placeholder="Ex: WhatsApp Follow-up 3"
              className="flex-1 border rounded-xl px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddEtapa()}
            />
            <button
              onClick={handleAddEtapa}
              disabled={saving || !newEtapa.trim()}
              className="px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
              title="Adicionar etapa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.etapas_contato?.map((item: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-xs transition-colors"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                {editingEtapaIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingEtapaVal}
                      onChange={(e) => setEditingEtapaVal(e.target.value)}
                      className="flex-1 border border-amber-500/50 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      style={{
                        backgroundColor: "var(--crm-surface)",
                        color: "var(--crm-text)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditEtapa(idx)}
                      className="p-1 text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingEtapaIdx(null)}
                      className="p-1 text-rose-600 dark:text-rose-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium truncate mr-2">{item}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditEtapa(idx)}
                        className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEtapa(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!settings?.etapas_contato || settings.etapas_contato.length === 0) && (
              <div
                className="text-center py-6 text-xs italic"
                style={{ color: "var(--crm-text-muted)" }}
              >
                Nenhuma etapa cadastrada.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Status Funil */}
        <div
          className="border rounded-2xl p-5 flex flex-col h-full shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="status-funil-card"
        >
          <div
            className="border-b pb-3 mb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <h4
              className="font-bold text-sm"
              style={{ color: "var(--crm-text)" }}
            >
              Status Funil
            </h4>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Define a situação do lead no funil de vendas
            </p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="Ex: Aguardando Resposta"
              className="flex-1 border rounded-xl px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddStatus()}
            />
            <button
              onClick={handleAddStatus}
              disabled={saving || !newStatus.trim()}
              className="px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
              title="Adicionar status"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.status_funil?.map((item: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-xs transition-colors"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                {editingStatusIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingStatusVal}
                      onChange={(e) => setEditingStatusVal(e.target.value)}
                      className="flex-1 border border-amber-500/50 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      style={{
                        backgroundColor: "var(--crm-surface)",
                        color: "var(--crm-text)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditStatus(idx)}
                      className="p-1 text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingStatusIdx(null)}
                      className="p-1 text-rose-600 dark:text-rose-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium truncate mr-2">{item}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditStatus(idx)}
                        className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!settings?.status_funil || settings.status_funil.length === 0) && (
              <div
                className="text-center py-6 text-xs italic"
                style={{ color: "var(--crm-text-muted)" }}
              >
                Nenhum status cadastrado.
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Temperatura */}
        <div
          className="border rounded-2xl p-5 flex flex-col h-full shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="temperatura-card"
        >
          <div
            className="border-b pb-3 mb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <h4
              className="font-bold text-sm"
              style={{ color: "var(--crm-text)" }}
            >
              Temperatura
            </h4>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Define o nível de interesse do lead
            </p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTemp}
              onChange={(e) => setNewTemp(e.target.value)}
              placeholder="Ex: Muito Quente"
              className="flex-1 border rounded-xl px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddTemp()}
            />
            <button
              onClick={handleAddTemp}
              disabled={saving || !newTemp.trim()}
              className="px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center cursor-pointer shadow-xs"
              title="Adicionar temperatura"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.temperaturas?.map((item: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between border rounded-xl px-3.5 py-2.5 text-xs transition-colors"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              >
                {editingTempIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingTempVal}
                      onChange={(e) => setEditingTempVal(e.target.value)}
                      className="flex-1 border border-amber-500/50 rounded-lg px-2 py-1 text-xs focus:outline-none"
                      style={{
                        backgroundColor: "var(--crm-surface)",
                        color: "var(--crm-text)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditTemp(idx)}
                      className="p-1 text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingTempIdx(null)}
                      className="p-1 text-rose-600 dark:text-rose-400 hover:opacity-80 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium truncate mr-2">{item}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditTemp(idx)}
                        className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemp(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {(!settings?.temperaturas || settings.temperaturas.length === 0) && (
              <div
                className="text-center py-6 text-xs italic"
                style={{ color: "var(--crm-text-muted)" }}
              >
                Nenhuma temperatura cadastrada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
