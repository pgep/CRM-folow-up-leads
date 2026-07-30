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
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-zinc-400 text-sm">Carregando listas do banco de dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-500" />
            Configurador de Tabelas Auxiliares (CRUD)
          </h3>
          <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Personalize as opções que aparecem nos menus suspensos (select boxes) de todo o sistema. 
            Você pode adicionar, editar e excluir opções de Etapa Contato, Status Funil e Temperatura diretamente no banco de dados.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg text-xs font-semibold transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recarregar
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs">
          <Check className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Grid of 3 CRUD Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Etapa Contato */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col h-full">
          <div className="border-b border-zinc-800 pb-3 mb-4">
            <h4 className="font-bold text-white text-sm">Etapa Contato</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Define a etapa atual da régua de relacionamento</p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newEtapa}
              onChange={(e) => setNewEtapa(e.target.value)}
              placeholder="Ex: WhatsApp Follow-up 3"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddEtapa()}
            />
            <button
              onClick={handleAddEtapa}
              disabled={saving || !newEtapa.trim()}
              className="px-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-bold transition flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.etapas_contato?.map((item: string, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 transition"
              >
                {editingEtapaIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingEtapaVal}
                      onChange={(e) => setEditingEtapaVal(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-amber-500/40 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditEtapa(idx)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingEtapaIdx(null)}
                      className="p-1 text-rose-400 hover:text-rose-300 transition"
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
                        className="p-1 text-zinc-500 hover:text-amber-400 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEtapa(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
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
              <div className="text-zinc-600 text-center py-6 text-xs italic">Nenhuma etapa cadastrada.</div>
            )}
          </div>
        </div>

        {/* Card 2: Status Funil */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col h-full">
          <div className="border-b border-zinc-800 pb-3 mb-4">
            <h4 className="font-bold text-white text-sm">Status Funil</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Define a situação do lead no funil de vendas</p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="Ex: Aguardando Resposta"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddStatus()}
            />
            <button
              onClick={handleAddStatus}
              disabled={saving || !newStatus.trim()}
              className="px-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-bold transition flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.status_funil?.map((item: string, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 transition"
              >
                {editingStatusIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingStatusVal}
                      onChange={(e) => setEditingStatusVal(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-amber-500/40 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditStatus(idx)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingStatusIdx(null)}
                      className="p-1 text-rose-400 hover:text-rose-300 transition"
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
                        className="p-1 text-zinc-500 hover:text-amber-400 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
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
              <div className="text-zinc-600 text-center py-6 text-xs italic">Nenhum status cadastrado.</div>
            )}
          </div>
        </div>

        {/* Card 3: Temperatura */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col h-full">
          <div className="border-b border-zinc-800 pb-3 mb-4">
            <h4 className="font-bold text-white text-sm">Temperatura</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Define o nível de interesse do lead</p>
          </div>

          {/* Add input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTemp}
              onChange={(e) => setNewTemp(e.target.value)}
              placeholder="Ex: Muito Quente"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddTemp()}
            />
            <button
              onClick={handleAddTemp}
              disabled={saving || !newTemp.trim()}
              className="px-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-bold transition flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[350px] pr-1">
            {settings?.temperaturas?.map((item: string, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 transition"
              >
                {editingTempIdx === idx ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editingTempVal}
                      onChange={(e) => setEditingTempVal(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-amber-500/40 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEditTemp(idx)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingTempIdx(null)}
                      className="p-1 text-rose-400 hover:text-rose-300 transition"
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
                        className="p-1 text-zinc-500 hover:text-amber-400 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemp(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 transition"
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
              <div className="text-zinc-600 text-center py-6 text-xs italic">Nenhuma temperatura cadastrada.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
