import React, { useState, useEffect } from "react";
import { 
  Clock, Play, Pause, Plus, Trash2, RefreshCw, CheckCircle, 
  AlertCircle, Zap, Shield, List, AlertTriangle
} from "lucide-react";
import { useToast } from "./Toast";

export default function AutoTriggerSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManual, setRunningManual] = useState(false);
  
  // Scheduler States
  const [paused, setPaused] = useState(false);
  const [hours, setHours] = useState<string[]>(["09:00", "14:00", "18:00"]);
  const [newHour, setNewHour] = useState("09:00");
  
  // Manual trigger states
  const [manualLogs, setManualLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [manualResult, setManualResult] = useState<{
    success: boolean;
    processed: number;
    actions_taken: number;
  } | null>(null);

  // Load scheduler settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.scheduler) {
            setPaused(data.scheduler.paused ?? false);
            setHours(data.scheduler.hours || ["09:00", "14:00", "18:00"]);
          } else {
            // Initialize with default scheduler if missing
            setPaused(false);
            setHours(["09:00", "14:00", "18:00"]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de agendamento:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Save current state to backend settings
  const handleSaveSettings = async (updatedPaused: boolean, updatedHours: string[]) => {
    setSaving(true);
    try {
      // First load whole settings so we don't overwrite Zoho or Waha configurations
      const getRes = await fetch("/api/settings");
      let currentSettings: any = {};
      if (getRes.ok) {
        currentSettings = await getRes.json();
      }

      currentSettings.scheduler = {
        paused: updatedPaused,
        hours: updatedHours.sort()
      };

      const saveRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSettings)
      });

      if (saveRes.ok) {
        setPaused(updatedPaused);
        setHours(updatedHours.sort());
        toast.success("Configurações do agendador salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar configurações do agendador.");
      }
    } catch (err: any) {
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = () => {
    handleSaveSettings(!paused, hours);
  };

  const handleAddHour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHour) return;
    if (hours.includes(newHour)) {
      toast.warning("Este horário de disparo já está cadastrado.");
      return;
    }
    const updated = [...hours, newHour];
    handleSaveSettings(paused, updated);
  };

  const handleRemoveHour = (hourToRemove: string) => {
    if (hours.length <= 1) {
      toast.warning("É recomendável manter pelo menos um horário agendado de disparo.");
      return;
    }
    const updated = hours.filter(h => h !== hourToRemove);
    handleSaveSettings(paused, updated);
  };

  const handleRunManual = async () => {
    if (runningManual) return;
    setRunningManual(true);
    setManualResult(null);
    setManualLogs(["Iniciando varredura manual de leads no CRM...", "Buscando elegibilidade por prazos de esteira..."]);
    setShowLogs(true);

    try {
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }) // Force bypasses pause status for manual operation
      });

      if (res.ok) {
        const data = await res.json();
        setManualResult({
          success: data.success,
          processed: data.processed,
          actions_taken: data.actions_taken
        });
        if (data.logs && data.logs.length > 0) {
          setManualLogs(data.logs);
        } else {
          setManualLogs(prev => [...prev, `Sucesso! Varredura concluída sem logs detalhados.`]);
        }
      } else {
        const data = await res.json();
        setManualResult({
          success: false,
          processed: 0,
          actions_taken: 0
        });
        if (data.logs) setManualLogs(data.logs);
        setManualLogs(prev => [...prev, `[ERRO] O servidor respondeu com status ${res.status}.`]);
      }
    } catch (err: any) {
      setManualResult({
        success: false,
        processed: 0,
        actions_taken: 0
      });
      setManualLogs(prev => [...prev, `[FALHA DE REDE] Erro ao conectar com o backend: ${err.message}`]);
    } finally {
      setRunningManual(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-xl h-64">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm text-zinc-500">Carregando cronograma de disparo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="auto-trigger-setup-container">
      
      {/* Banner / Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6" id="scheduler-header-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Configuração de Disparo Automático (Scheduler CRM)
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Agende as horas do dia em que a esteira de automação deve varrer os leads. O sistema avaliará a elegibilidade de prazos de cada lead e disparará automaticamente as mensagens e e-mails de follow-up correspondentes.
            </p>
          </div>

          {/* Pause / Play Quick Switch */}
          <button
            onClick={handleTogglePause}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-md shrink-0 ${
              paused 
                ? "bg-emerald-500 hover:bg-emerald-400 text-black" 
                : "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30"
            }`}
            id="toggle-scheduler-button"
          >
            {paused ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                Ativar Sequência
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pausar Sequência
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Scheduler Config Panel */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between" id="scheduler-config-panel">
          <div>
            <div className="p-4 border-b border-zinc-850 bg-zinc-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${paused ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Status: {paused ? "Sequência Pausada" : "Ativo & Monitorando"}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Horário de Brasília (GMT-3)</span>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Add Hour Form */}
              <form onSubmit={handleAddHour} className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 block">Adicionar Horário de Disparo Diário</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={newHour}
                      onChange={(e) => setNewHour(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-xs rounded-lg transition"
                    id="add-hour-button"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Hours List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 block">Horários Agendados ({hours.length})</label>
                
                {hours.length === 0 ? (
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg text-center text-xs text-zinc-500">
                    Nenhum horário cadastrado. Adicione um horário acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {hours.map((hour) => (
                      <div 
                        key={hour} 
                        className="flex items-center justify-between bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300"
                      >
                        <span className="flex items-center gap-1.5 text-zinc-200">
                          <Clock className="w-3.5 h-3.5 text-amber-500/70" />
                          {hour}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHour(hour)}
                          disabled={saving}
                          className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="p-4 bg-zinc-950/20 border-t border-zinc-850 flex gap-2 text-zinc-500 items-start">
            <Shield className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed">
              O agendador roda diretamente no servidor do CRM, sincronizado com o fuso de Brasília. Nas horas marcadas, o motor executa silenciosamente a varredura e dispara os e-mails/WhatsApp necessários para os leads na fila de follow-up.
            </p>
          </div>
        </div>

        {/* Manual Trigger Panel */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col" id="manual-trigger-panel">
          <div className="p-4 border-b border-zinc-850 bg-zinc-950/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Disparo Manual Ad-Hoc
            </span>
            <span className="text-[10px] text-zinc-500">Executável a qualquer momento</span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deseja forçar a varredura da esteira de follow-up imediatamente? Clicando no botão abaixo, o motor de automação será executado neste momento. Os leads qualificados serão processados e as mensagens pendentes serão enviadas no fuso de agora.
              </p>

              {paused && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    <strong>Atenção:</strong> A automação automática está atualmente <strong>pausada</strong>. Porém, o disparo manual por este painel funcionará normalmente e forçará a execução do motor.
                  </p>
                </div>
              )}

              {manualResult && (
                <div className={`p-4 rounded-lg border ${
                  manualResult.success 
                    ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400" 
                    : "bg-red-500/5 border-red-500/25 text-red-400"
                }`}>
                  <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider">
                    {manualResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                    {manualResult.success ? "Execução Concluída com Sucesso" : "Falha na Execução"}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1 text-zinc-300">
                    <div className="bg-zinc-950/40 p-2.5 rounded border border-zinc-850/40">
                      <span className="text-zinc-500 block text-[10px] uppercase">Leads Avaliados</span>
                      <strong className="text-base text-white">{manualResult.processed}</strong>
                    </div>
                    <div className="bg-zinc-950/40 p-2.5 rounded border border-zinc-850/40">
                      <span className="text-zinc-500 block text-[10px] uppercase">Disparos Efetuados</span>
                      <strong className="text-base text-amber-500">{manualResult.actions_taken}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleRunManual}
                disabled={runningManual}
                className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-55 text-black font-bold text-xs rounded-lg transition shadow-md uppercase tracking-wider"
                id="run-manual-button"
              >
                {runningManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Varrendo CRM...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Executar Varredura Agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Manual Run Real-Time Logs Collapsible Console */}
      {showLogs && manualLogs.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono" id="scheduler-console-logs">
          <div className="p-3 border-b border-zinc-850 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2 text-zinc-300">
              <List className="w-3.5 h-3.5 text-amber-500" />
              Console de Varredura - Logs de Execução em Tempo Real
            </span>
            <button 
              onClick={() => setShowLogs(false)}
              className="text-zinc-500 hover:text-zinc-300 transition text-[10px] uppercase font-bold"
            >
              Ocultar
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto space-y-1.5 text-[11px] text-zinc-400 leading-relaxed max-w-full">
            {manualLogs.map((logLine, index) => (
              <div 
                key={index} 
                className={`whitespace-pre-wrap ${
                  logLine.includes("[ERRO]") || logLine.includes("FALHA") 
                    ? "text-red-400" 
                    : logLine.includes("Enviando") || logLine.includes("Ajustando")
                      ? "text-amber-400 font-medium"
                      : logLine.startsWith("------")
                        ? "text-zinc-600 my-1 font-bold"
                        : logLine.includes("Resultado do Disparo: OK") || logLine.includes("concluída")
                          ? "text-emerald-400"
                          : "text-zinc-400"
                }`}
              >
                {logLine}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
