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
  const [runningRetroactive, setRunningRetroactive] = useState(false);

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

  const handleRetroactiveTrigger = async () => {
    if (runningRetroactive) return;
    setRunningRetroactive(true);
    setManualResult(null);
    setManualLogs(["Iniciando sincronização retroativa segura de leads...", "Buscando leads ativos com passos pendentes..."]);
    setShowLogs(true);

    try {
      const res = await fetch("/api/automation/retroactive-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        setManualResult({
          success: true,
          processed: data.updated_count,
          actions_taken: data.updated_count
        });
        if (data.logs && data.logs.length > 0) {
          setManualLogs(data.logs);
        } else {
          setManualLogs(prev => [...prev, `Sincronização concluída com sucesso! Nenhum lead precisou de ajuste retroativo.`]);
        }
        toast.success(`Sincronização retroativa concluída! ${data.updated_count} leads atualizados.`);
      } else {
        const data = await res.json();
        setManualResult({
          success: false,
          processed: 0,
          actions_taken: 0
        });
        setManualLogs(prev => [...prev, `[ERRO] Falha ao sincronizar: ${data.error || "Erro desconhecido"}`]);
        toast.error("Falha ao sincronizar leads retroativamente.");
      }
    } catch (err: any) {
      setManualResult({
        success: false,
        processed: 0,
        actions_taken: 0
      });
      setManualLogs(prev => [...prev, `[FALHA DE REDE] Erro ao conectar com o backend: ${err.message}`]);
      toast.error("Erro de conexão.");
    } finally {
      setRunningRetroactive(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#12151C] border border-white/[0.08] rounded-2xl h-64 shadow-xs">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Carregando cronograma de disparo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white" id="auto-trigger-setup-container">
      
      {/* Banner / Header */}
      <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xs" id="scheduler-header-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Configuração de Disparo Automático (Scheduler CRM)
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                Agende as horas do dia em que a esteira de automação deve varrer os leads. O sistema avaliará a elegibilidade de prazos de cada lead e disparará automaticamente as mensagens e e-mails de follow-up correspondentes.
              </p>
            </div>
          </div>

          {/* Pause / Play Quick Switch */}
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition shadow-sm shrink-0 cursor-pointer ${
              paused 
                ? "bg-indigo-600 hover:bg-indigo-500 text-white" 
                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25"
            }`}
            id="toggle-scheduler-button"
          >
            {paused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Ativar Sequência
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pausar Sequência
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Scheduler Config Panel */}
        <div className="lg:col-span-5 bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs" id="scheduler-config-panel">
          <div>
            <div className="p-5 border-b border-white/[0.06] bg-[#0B0D12]/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${paused ? "bg-rose-500 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Status: {paused ? "Sequência Pausada" : "Ativo & Monitorando"}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Brasília (GMT-3)</span>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Add Hour Form */}
              <form onSubmit={handleAddHour} className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Adicionar Horário de Disparo Diário</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="time"
                      value={newHour}
                      onChange={(e) => setNewHour(e.target.value)}
                      className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase rounded-xl transition shadow-xs cursor-pointer"
                    id="add-hour-button"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </form>

              {/* Hours List */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Horários Agendados ({hours.length})</label>
                
                {hours.length === 0 ? (
                  <div className="p-4 bg-[#0B0D12] border border-white/[0.06] rounded-xl text-center text-xs font-mono text-zinc-500">
                    Nenhum horário cadastrado. Adicione um horário acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {hours.map((hour) => (
                      <div 
                        key={hour} 
                        className="flex items-center justify-between bg-[#0B0D12] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-300"
                      >
                        <span className="flex items-center gap-2 text-zinc-200">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          {hour}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHour(hour)}
                          disabled={saving}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg transition hover:bg-rose-500/10 cursor-pointer"
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

          <div className="p-4 bg-[#0B0D12]/60 border-t border-white/[0.06] flex gap-2.5 text-zinc-400 items-start">
            <Shield className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed font-sans">
              O agendador roda diretamente no servidor do CRM, sincronizado com o fuso de Brasília. Nas horas marcadas, o motor executa silenciosamente a varredura e dispara os e-mails/WhatsApp necessários para os leads na fila de follow-up.
            </p>
          </div>
        </div>

        {/* Manual Trigger Panel */}
        <div className="lg:col-span-7 bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-xs" id="manual-trigger-panel">
          <div className="p-5 border-b border-white/[0.06] bg-[#0B0D12]/40 flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Disparo Manual Ad-Hoc
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Executável a qualquer momento</span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Deseja forçar a varredura da esteira de follow-up imediatamente? Clicando no botão abaixo, o motor de automação será executado neste momento. Os leads qualificados serão processados e as mensagens pendentes serão enviadas no fuso de agora.
              </p>

              {paused && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 leading-relaxed font-sans">
                    <strong>Atenção:</strong> A automação automática está atualmente <strong>pausada</strong>. Porém, o disparo manual por este painel funcionará normalmente e forçará a execução do motor.
                  </p>
                </div>
              )}

              {manualResult && (
                <div className={`p-4 rounded-xl border ${
                  manualResult.success 
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                    : "bg-rose-500/10 border-rose-500/25 text-rose-400"
                }`}>
                  <div className="flex items-center gap-2 mb-3 font-mono font-bold text-xs uppercase tracking-wider">
                    {manualResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    {manualResult.success ? "Execução Concluída com Sucesso" : "Falha na Execução"}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1 text-zinc-300">
                    <div className="bg-[#0B0D12] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Leads Avaliados</span>
                      <strong className="text-base text-white">{manualResult.processed}</strong>
                    </div>
                    <div className="bg-[#0B0D12] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-mono">Disparos Efetuados</span>
                      <strong className="text-base text-emerald-400">{manualResult.actions_taken}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleRunManual}
                disabled={runningManual}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white font-mono font-bold text-xs rounded-xl transition shadow-sm uppercase tracking-wider cursor-pointer"
                id="run-manual-button"
              >
                {runningManual ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Varrendo CRM...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Executar Varredura Agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Retroactive Sync Card */}
      <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xs" id="retroactive-sync-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                Preservação de Dados & Sincronização Retroativa (Seguro)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                Possui leads importados que não dispararam o WhatsApp do Passo 2 ou que acabaram de ser adicionados? Este botão analisa seus leads ativos de forma totalmente não destrutiva, atualizando apenas a fila de agendamento (<span className="font-mono text-indigo-400">proxima_acao_em</span>) sem alterar nenhum histórico de conversas ou informações cadastradas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetroactiveTrigger}
            disabled={runningRetroactive || runningManual}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] disabled:opacity-50 font-mono font-bold text-xs rounded-xl transition shadow-xs uppercase tracking-wider shrink-0 cursor-pointer"
            id="retroactive-sync-button"
          >
            {runningRetroactive ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Sincronizando Leads...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Sincronizar Leads Retroativos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Run Real-Time Logs Collapsible Console */}
      {showLogs && manualLogs.length > 0 && (
        <div className="bg-[#0B0D12] border border-white/[0.08] rounded-2xl overflow-hidden font-mono shadow-xs" id="scheduler-console-logs">
          <div className="p-3.5 border-b border-white/[0.06] bg-[#12151C]/60 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2 text-zinc-200 font-mono">
              <List className="w-3.5 h-3.5 text-indigo-400" />
              Console de Varredura - Logs de Execução em Tempo Real
            </span>
            <button 
              type="button"
              onClick={() => setShowLogs(false)}
              className="text-zinc-500 hover:text-zinc-300 transition text-[10px] font-mono uppercase font-bold px-2 py-1 rounded hover:bg-white/[0.04] cursor-pointer"
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
                    ? "text-rose-400" 
                    : logLine.includes("Enviando") || logLine.includes("Ajustando")
                      ? "text-indigo-400 font-medium"
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
