/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { DashboardStats, Lead } from "../types";
import { Users, TrendingUp, AlertCircle, Sparkles, Star, Calendar, RefreshCw, Play, Terminal, ShieldCheck, CheckCircle2, Clock, Mail, MessageSquare, Phone, X, Send, AlertTriangle, Flame, ArrowRight, CalendarCheck } from "lucide-react";
import { useToast } from "./Toast";

interface DashboardProps {
  stats: DashboardStats | null;
  onRunAutomation: () => Promise<any>;
  onRefresh?: () => Promise<void>;
  onSelectNegociacao?: () => void;
  onGoToAgenda?: () => void;
}

export default function Dashboard({ stats, onRunAutomation, onRefresh, onSelectNegociacao, onGoToAgenda }: DashboardProps) {
  const { toast, confirm } = useToast();
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [automationResult, setAutomationResult] = useState<{ processed: number; actions_taken: number } | null>(null);

  const [activitiesSummary, setActivitiesSummary] = useState<{
    atrasadas: number;
    hoje: number;
    proximos7dias: number;
    semProximoPasso: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/activities/summary")
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          return await res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) setActivitiesSummary(data);
      })
      .catch((e) => console.warn("Aviso ao carregar resumo de atividades:", e));
  }, []);

  // Cohort Bulk Send States
  const [specialRules, setSpecialRules] = useState<any[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<"oneMonth" | "twoMonths" | "threeMonths" | null>(null);
  const [cohortLabel, setCohortLabel] = useState("");
  
  // Selected rule and draft message states
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [bulkCanal, setBulkCanal] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  
  // Progress/logs states
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Load Special Rules from Settings
  useEffect(() => {
    const loadRules = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const ct = res.headers.get("content-type");
          if (ct && ct.includes("application/json")) {
            const data = await res.json();
            if (data && data.special_rules) {
              setSpecialRules(data.special_rules);
            }
          }
        }
      } catch (e) {
        console.warn("Aviso ao carregar regras especiais no Dashboard:", e);
      }
    };
    loadRules();
  }, []);

  const allRules = [...specialRules];

  const handleRuleChange = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    if (!ruleId) {
      setBulkSubject("");
      setBulkMessage("");
      return;
    }
    const found = allRules.find(r => r.id === ruleId);
    if (found) {
      setBulkCanal(found.canal);
      setBulkSubject(found.assunto_template || found.assunto || "Atualização Importante - Casa Colombo Artesanal");
      setBulkMessage(found.mensagem_template || found.mensagem || "");
    }
  };

  const handleOpenBulkModal = (cohort: "oneMonth" | "twoMonths" | "threeMonths", label: string) => {
    setSelectedCohort(cohort);
    setCohortLabel(label);
    
    const rulesToUse = [...specialRules];
    const initialRule = rulesToUse[0];
    if (initialRule) {
      setSelectedRuleId(initialRule.id);
      setBulkCanal(initialRule.canal);
      setBulkSubject(initialRule.assunto_template || initialRule.assunto || "Atualização Importante - Casa Colombo Artesanal");
      setBulkMessage(initialRule.mensagem_template || initialRule.mensagem || "");
    } else {
      setSelectedRuleId("");
      setBulkCanal("WHATSAPP");
      setBulkSubject("");
      setBulkMessage("");
    }
    
    setBulkLogs([]);
    setBulkProgress({ current: 0, total: 0 });
    setIsSendingBulk(false);
    setIsBulkModalOpen(true);
  };

  const handleExecuteBulkSend = async () => {
    if (!selectedCohort) return;
    
    let cohortLeads: any[] = [];
    if (selectedCohort === "oneMonth") {
      cohortLeads = (safeStats.upcomingWeddings?.oneMonth || []).filter((l: any) => !l.followup_especial_1m);
    }
    if (selectedCohort === "twoMonths") {
      cohortLeads = (safeStats.upcomingWeddings?.twoMonths || []).filter((l: any) => !l.followup_especial_2m);
    }
    if (selectedCohort === "threeMonths") {
      cohortLeads = (safeStats.upcomingWeddings?.threeMonths || []).filter((l: any) => !l.followup_especial_3m);
    }
    
    if (cohortLeads.length === 0) {
      toast.warning("Nenhum lead qualificado (que ainda não tenha recebido este follow-up) encontrado neste lote para envio.");
      return;
    }

    if (!bulkMessage.trim()) {
      toast.warning("Por favor, digite o conteúdo da mensagem.");
      return;
    }

    if (bulkCanal === "EMAIL" && !bulkSubject.trim()) {
      toast.warning("Por favor, digite o assunto do e-mail.");
      return;
    }

    const confirmed = await confirm(`Deseja mesmo disparar esta mensagem em lote para os ${cohortLeads.length} leads qualificados deste lote?`);
    if (!confirmed) return;

    setIsSendingBulk(true);
    setBulkLogs([]);
    setBulkProgress({ current: 0, total: cohortLeads.length });

    const logMsg = (msg: string) => {
      const time = new Date().toLocaleTimeString("pt-BR");
      setBulkLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    logMsg(`Iniciando envio em lote por ${bulkCanal}...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < cohortLeads.length; i++) {
      const lead = cohortLeads[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));
      logMsg(`Disparando para ${lead.nome} (${bulkCanal === "EMAIL" ? lead.email : lead.link_celular || "Sem número"})...`);

      try {
        const res = await fetch(`/api/leads/${lead.id}/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canal: bulkCanal,
            mensagem: bulkMessage,
            assunto: bulkSubject,
            titulo_historico: `Follow-up Especial Lote (${cohortLabel})`,
            followup_cohort: selectedCohort
          })
        });

        if (res.ok) {
          logMsg(`✅ Envio concluído com sucesso para ${lead.nome}!`);
          successCount++;
        } else {
          const err = await res.json();
          logMsg(`❌ FALHA no envio para ${lead.nome}: ${err.error || "Erro desconhecido"}`);
          failCount++;
        }
      } catch (err: any) {
        logMsg(`❌ FALHA de conexão para ${lead.nome}: ${err.message || "Erro de rede"}`);
        failCount++;
      }

      // Add a tiny delay between dispatches
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    logMsg(`\n--- DISPARO EM LOTE CONCLUÍDO ---`);
    logMsg(`Sucesso: ${successCount} | Falhas: ${failCount}`);
    setIsSendingBulk(false);

    if (onRefresh) {
      await onRefresh();
    }
  };

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-zinc-500 text-sm">Carregando métricas do CRM...</p>
      </div>
    );
  }

  const triggerAutomation = async () => {
    setRunningAutomation(true);
    setShowLogs(true);
    setAutomationLogs(["[SISTEMA] Inicializando simulação do scheduler n8n CRM v2..."]);
    setAutomationResult(null);

    try {
      const data = await onRunAutomation();
      if (data && data.logs) {
        setAutomationLogs(data.logs);
        setAutomationResult({
          processed: data.processed,
          actions_taken: data.actions_taken
        });
      }
    } catch (err) {
      setAutomationLogs((prev) => [...prev, `[ERRO] Falha ao rodar automação: ${err}`]);
    } finally {
      setRunningAutomation(false);
    }
  };

  // Prepare safe stats and data for Recharts
  const safeStats: DashboardStats = {
    totalLeads: 0,
    leadsNovos: 0,
    leadsAtivos: 0,
    leadsConvertidos: 0,
    leadsPerdidos: 0,
    leadsEmNegociacao: 0,
    taxaConversao: 0,
    leadsPorStatus: {} as any,
    leadsPorEtapa: {} as any,
    leadsPorTemperatura: {} as any,
    leadsPorOrigem: {} as any,
    historicoEntrada: [],
    upcomingWeddings: {
      oneMonth: [],
      twoMonths: [],
      threeMonths: []
    },
    ...(stats || {})
  };

  const statusChartData = Object.entries(safeStats.leadsPorStatus || {}).map(([name, value]) => ({
    name: name.replace("_", " "),
    quantidade: value
  }));

  const originChartData = Object.entries(safeStats.leadsPorOrigem || {}).map(([name, value]) => ({
    name,
    quantidade: value
  }));

  const tempChartData = Object.entries(safeStats.leadsPorTemperatura || {}).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ["#6366F1", "#38BDF8", "#F59E0B", "#10B981"];

  return (
    <div className="space-y-6">
      
      {/* KPI Stats Cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        
        {/* Total Leads */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Total Leads</span>
            <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-zinc-300" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white block leading-none tracking-tight font-mono">{safeStats.totalLeads}</span>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">Capturadas no funil</span>
          </div>
        </div>

        {/* Em Negociação (Respondido + Quente) */}
        <div 
          onClick={() => onSelectNegociacao && onSelectNegociacao()}
          className="bg-[#12151C] border border-amber-500/30 hover:border-amber-400/50 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition group shadow-xs relative overflow-hidden"
          title="Clique para ver todos os Leads em Negociação"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400/30 text-amber-400" />
              Em Negociação
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-300 block leading-none tracking-tight font-mono">{safeStats.leadsEmNegociacao || 0}</span>
            <span className="text-[11px] text-amber-400/80 mt-1.5 block font-medium">Respondido + Quente</span>
          </div>
        </div>

        {/* New Leads */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Novos Leads</span>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white block leading-none tracking-tight font-mono">{safeStats.leadsNovos}</span>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">Aguardando 1º contato</span>
          </div>
        </div>

        {/* Active Leads */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Em Follow-up</span>
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white block leading-none tracking-tight font-mono">{safeStats.leadsAtivos}</span>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">Sendo nutridos</span>
          </div>
        </div>

        {/* Converted Leads */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Convertidos</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400 block leading-none tracking-tight font-mono">{safeStats.leadsConvertidos}</span>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">Contratos fechados</span>
          </div>
        </div>

        {/* Lost Leads */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Perdidos</span>
            <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white block leading-none tracking-tight font-mono">{safeStats.leadsPerdidos}</span>
            <span className="text-[11px] text-zinc-400 mt-1.5 block">Sem retorno ou perda</span>
          </div>
        </div>

        {/* Conversion Rate Dial */}
        <div className="bg-[#12151C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 flex flex-col justify-between transition shadow-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium text-zinc-400">Taxa Conv.</span>
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white leading-none font-mono">{safeStats.taxaConversao}%</span>
            </div>
            <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(safeStats.taxaConversao, 100)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* CENTRAL DE PRÓXIMAS ATIVIDADES WIDGET */}
      <div className="bg-[#12151C] border border-white/[0.06] rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 tracking-tight">
              <CalendarCheck className="w-4.5 h-4.5 text-indigo-400" />
              Central de Próximas Atividades
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Acompanhamento comercial de leads e fila de próximos passos.
            </p>
          </div>
          {onGoToAgenda && (
            <button
              onClick={onGoToAgenda}
              className="px-3.5 py-2 bg-indigo-600 text-white font-medium text-xs rounded-xl hover:bg-indigo-500 transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <span>Ir para Minha Agenda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#0e1118] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
              Atrasadas
            </span>
            <p className="text-2xl font-extrabold text-white mt-1 font-mono">
              {activitiesSummary?.atrasadas ?? 0}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Atenção imediata</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0e1118] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              Hoje
            </span>
            <p className="text-2xl font-extrabold text-white mt-1 font-mono">
              {activitiesSummary?.hoje ?? 0}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Programadas para hoje</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0e1118] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
              Próximos 7 Dias
            </span>
            <p className="text-2xl font-extrabold text-white mt-1 font-mono">
              {activitiesSummary?.proximos7dias ?? 0}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Sequência programada</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0e1118] border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              Sem Próximo Passo
            </span>
            <p className="text-2xl font-extrabold text-white mt-1 font-mono">
              {activitiesSummary?.semProximoPasso ?? 0}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Leads sem agendamento</p>
          </div>
        </div>
      </div>

      {/* Seção de Casamentos Próximos (Próximos 3 Meses) */}
      <div className="bg-[#121620] border border-white/[0.07] rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Proximidade de Casamentos (Próximos 3 Meses)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Leads com casamentos se aproximando para reforçar o contato via Zoho Mail ou Waha WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium bg-[#0e1118] border border-white/[0.06] px-3 py-1 rounded-xl">
            <span>Legenda:</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 1 mês</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 2 meses</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 3 meses</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Coluna 1: Próximos 30 dias */}
          <div className="bg-[#0e1118] border border-white/[0.06] rounded-xl p-4 flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  Em até 1 Mês ({safeStats.upcomingWeddings?.oneMonth?.length || 0})
                </span>
                <span className="text-[10px] text-zinc-400">0 - 30 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("oneMonth", "Em até 1 Mês")}
                disabled={!safeStats.upcomingWeddings?.oneMonth?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 border border-rose-500/30 rounded-lg transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {safeStats.upcomingWeddings?.oneMonth && safeStats.upcomingWeddings.oneMonth.length > 0 ? (
                safeStats.upcomingWeddings.oneMonth.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-[#121620] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                        {lead.dias_restantes === 0 ? "É Hoje!" : `Faltam ${lead.dias_restantes}d`}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-zinc-400 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>Data: <strong className="text-zinc-200">{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                      {lead.followup_especial_1m && (
                        <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          F-up 1 Mês Enviado
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.05] justify-between">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase bg-[#0e1118] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: De 31 a 60 dias */}
          <div className="bg-[#0e1118] border border-white/[0.06] rounded-xl p-4 flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Em até 2 Meses ({safeStats.upcomingWeddings?.twoMonths?.length || 0})
                </span>
                <span className="text-[10px] text-zinc-400">31 - 60 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("twoMonths", "Em até 2 Meses")}
                disabled={!safeStats.upcomingWeddings?.twoMonths?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-300 border border-amber-500/30 rounded-lg transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {safeStats.upcomingWeddings?.twoMonths && safeStats.upcomingWeddings.twoMonths.length > 0 ? (
                safeStats.upcomingWeddings.twoMonths.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-[#121620] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                        {lead.dias_restantes} dias
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-zinc-400 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>Data: <strong className="text-zinc-200">{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                      {lead.followup_especial_2m && (
                        <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          F-up 2 Meses Enviado
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.05] justify-between">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase bg-[#0e1118] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: De 61 a 90 dias */}
          <div className="bg-[#0e1118] border border-white/[0.06] rounded-xl p-4 flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  Em até 3 Meses ({safeStats.upcomingWeddings?.threeMonths?.length || 0})
                </span>
                <span className="text-[10px] text-zinc-400">61 - 90 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("threeMonths", "Em até 3 Meses")}
                disabled={!safeStats.upcomingWeddings?.threeMonths?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 text-sky-300 border border-sky-500/30 rounded-lg transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {safeStats.upcomingWeddings?.threeMonths && safeStats.upcomingWeddings.threeMonths.length > 0 ? (
                safeStats.upcomingWeddings.threeMonths.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-[#121620] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-sky-500/15 text-sky-300 border border-sky-500/30 shrink-0">
                        {lead.dias_restantes} dias
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-zinc-400 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        <span>Data: <strong className="text-zinc-200">{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                      {lead.followup_especial_3m && (
                        <div className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-md flex items-center gap-1 w-fit mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          F-up 3 Meses Enviado
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.05] justify-between">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase bg-[#0e1118] px-1.5 py-0.5 rounded border border-white/[0.06]">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded-lg bg-white/[0.06] hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lead entries area chart */}
        <div className="lg:col-span-8 bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex flex-col h-[330px] shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase block mb-4">
            Histórico de Inbound (Leads Recebidos nos últimos 7 dias)
          </span>

          <div className="flex-1 w-full text-xs">
            {(safeStats.historicoEntrada || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeStats.historicoEntrada || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" stroke="#71717A" fontSize={10} />
                  <YAxis stroke="#71717A" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#12151C", borderColor: "rgba(255,255,255,0.08)", borderRadius: "12px", color: "#fff", fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="quantidade" stroke="#6366F1" fillOpacity={1} fill="url(#colorEntry)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                Nenhum lead registrado nos últimos 7 dias.
              </div>
            )}
          </div>
        </div>

        {/* Temperature pie chart */}
        <div className="lg:col-span-4 bg-[#121620] border border-white/[0.07] rounded-2xl p-5 flex flex-col h-[330px] shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase block mb-2">
            Distribuição por Temperatura
          </span>

          <div className="flex-1 w-full text-xs flex items-center justify-center relative">
            {tempChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tempChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tempChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0e1118", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: 11 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-500">Não há dados suficientes.</div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Disparo de Follow-up em Lote */}
      {isBulkModalOpen && (
        <div id="bulk-followup-modal" className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#121620] border border-white/[0.1] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[90vh] animate-fade-in my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07] shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Disparo Especial em Lote</h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Lote selecionado: <strong className="text-amber-300">{cohortLabel}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (isSendingBulk) {
                    const confirmed = await confirm("O envio em lote está em progresso. Deseja mesmo fechar?");
                    if (!confirmed) return;
                  }
                  setIsBulkModalOpen(false);
                }}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Informação sobre os leads */}
              <div className="bg-[#0e1118] border border-white/[0.06] p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs text-zinc-400">Leads qualificados neste lote:</span>
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {(() => {
                    let count = 0;
                    if (selectedCohort === "oneMonth") count = (safeStats.upcomingWeddings?.oneMonth || []).filter((l: any) => !l.followup_especial_1m).length;
                    if (selectedCohort === "twoMonths") count = (safeStats.upcomingWeddings?.twoMonths || []).filter((l: any) => !l.followup_especial_2m).length;
                    if (selectedCohort === "threeMonths") count = (safeStats.upcomingWeddings?.threeMonths || []).filter((l: any) => !l.followup_especial_3m).length;
                    return count;
                  })()}{" "}
                  leads
                </span>
              </div>

              {/* Seletor de Regra/Mensagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Selecione o Follow-up Especial ou Emergencial:
                </label>
                <select
                  disabled={isSendingBulk}
                  value={selectedRuleId}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">-- Personalizar Mensagem Avulsa --</option>
                  {specialRules.length > 0 ? (
                    <optgroup label="🌐 Regras Cadastradas no Sistema">
                      {specialRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.nome} ({rule.canal})
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option disabled value="">Nenhuma regra especial cadastrada no sistema</option>
                  )}
                </select>
              </div>

              {/* Canal de Envio */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Canal de Envio:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSendingBulk}
                      onClick={() => setBulkCanal("WHATSAPP")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        bulkCanal === "WHATSAPP"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                          : "bg-[#0B0D12] text-zinc-400 border-white/[0.08] hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp (Waha)
                    </button>
                    <button
                      type="button"
                      disabled={isSendingBulk}
                      onClick={() => setBulkCanal("EMAIL")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        bulkCanal === "EMAIL"
                          ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/35"
                          : "bg-[#0B0D12] text-zinc-400 border-white/[0.08] hover:text-white"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" /> E-mail (Zoho)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Histórico de Contato:</label>
                  <div className="text-[11px] text-zinc-400 leading-normal flex items-start gap-1.5 bg-[#0B0D12] p-2.5 border border-white/[0.06] rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>Cada envio registrará automaticamente uma entrada no histórico do lead.</span>
                  </div>
                </div>
              </div>

              {/* Assunto (Se E-mail) */}
              {bulkCanal === "EMAIL" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-semibold text-zinc-300 block">Assunto do E-mail:</label>
                  <input
                    type="text"
                    disabled={isSendingBulk}
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    placeholder="Ex: Confirmação do seu orçamento Casa Colombo"
                    className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              )}

              {/* Mensagem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 block">Mensagem (Template):</label>
                  <span className="text-[10px] text-zinc-400 font-mono">Suporta tags dinâmicas</span>
                </div>
                <textarea
                  disabled={isSendingBulk}
                  rows={5}
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Olá {nome}, tudo bem?..."
                  className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition font-mono custom-scrollbar"
                />
              </div>

              {/* Tags de Apoio */}
              <div className="bg-[#0B0D12] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Variáveis Dinâmicas Disponíveis:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["{nome}", "{local}", "{convidados}", "{data_casamento}", "{mes_casamento}", "{status}", "{temperatura}"].map((tag) => (
                    <span key={tag} className="text-[10px] font-mono bg-[#181C26] border border-white/[0.08] px-2 py-0.5 rounded-md text-zinc-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progresso de Envio */}
              {bulkProgress.total > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Progresso do Envio:</span>
                    <span className="font-mono text-zinc-400">
                      {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#0B0D12] h-2 rounded-full overflow-hidden border border-white/[0.08]">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>

                  {/* Logs de Envio em Lote */}
                  <div className="h-28 bg-[#0B0D12] rounded-xl border border-white/[0.06] p-2.5 font-mono text-[10px] text-zinc-400 overflow-y-auto space-y-1 custom-scrollbar">
                    {bulkLogs.map((log, idx) => (
                      <div key={idx} className={log.includes("✅") ? "text-emerald-300" : log.includes("❌") ? "text-rose-300" : "text-zinc-400"}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0B0D12] border-t border-white/[0.07] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSendingBulk}
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSendingBulk || !bulkMessage.trim()}
                onClick={handleExecuteBulkSend}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.08] disabled:text-zinc-500 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Disparar em Lote ({(() => {
                      let count = 0;
                      if (selectedCohort === "oneMonth") count = safeStats.upcomingWeddings?.oneMonth?.length || 0;
                      if (selectedCohort === "twoMonths") count = safeStats.upcomingWeddings?.twoMonths?.length || 0;
                      if (selectedCohort === "threeMonths") count = safeStats.upcomingWeddings?.threeMonths?.length || 0;
                      return count;
                    })()})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
