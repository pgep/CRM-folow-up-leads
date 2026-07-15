/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { DashboardStats, Lead } from "../types";
import { Users, TrendingUp, AlertCircle, Sparkles, Star, Calendar, RefreshCw, Play, Terminal, ShieldCheck, CheckCircle2, Clock, Mail, MessageSquare, Phone, X, Send, AlertTriangle } from "lucide-react";
import { useToast } from "./Toast";

interface DashboardProps {
  stats: DashboardStats | null;
  onRunAutomation: () => Promise<any>;
  onRefresh?: () => Promise<void>;
}

export default function Dashboard({ stats, onRunAutomation, onRefresh }: DashboardProps) {
  const { toast, confirm } = useToast();
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [automationResult, setAutomationResult] = useState<{ processed: number; actions_taken: number } | null>(null);

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
          const data = await res.json();
          if (data.special_rules) {
            setSpecialRules(data.special_rules);
          }
        }
      } catch (e) {
        console.error("Error loading special rules on Dashboard mount:", e);
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
    if (!selectedCohort || !stats) return;
    
    let cohortLeads: any[] = [];
    if (selectedCohort === "oneMonth") cohortLeads = stats.upcomingWeddings?.oneMonth || [];
    if (selectedCohort === "twoMonths") cohortLeads = stats.upcomingWeddings?.twoMonths || [];
    if (selectedCohort === "threeMonths") cohortLeads = stats.upcomingWeddings?.threeMonths || [];
    
    if (cohortLeads.length === 0) {
      toast.warning("Nenhum lead ativo encontrado neste lote para envio.");
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

    const confirmed = await confirm(`Deseja mesmo disparar esta mensagem em lote para os ${cohortLeads.length} leads deste lote?`);
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
            titulo_historico: `Follow-up Especial Lote (${cohortLabel})`
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
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
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

  // Prepare data for Recharts
  const statusChartData = Object.entries(stats.leadsPorStatus).map(([name, value]) => ({
    name: name.replace("_", " "),
    quantidade: value
  }));

  const originChartData = Object.entries(stats.leadsPorOrigem).map(([name, value]) => ({
    name,
    quantidade: value
  }));

  const tempChartData = Object.entries(stats.leadsPorTemperatura).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ["#38bdf8", "#fb923c", "#f87171", "#34d399"];

  return (
    <div className="space-y-6">
      
      {/* KPI Stats Cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        
        {/* Total Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-white block leading-none">{stats.totalLeads}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Capturadas no funil</span>
          </div>
        </div>

        {/* New Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Novos Leads</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-white block leading-none">{stats.leadsNovos}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Aguardando 1º contato</span>
          </div>
        </div>

        {/* Active Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Em Follow-up</span>
            <RefreshCw className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-white block leading-none">{stats.leadsAtivos}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Sendo nutridos</span>
          </div>
        </div>

        {/* Converted Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Convertidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-white block leading-none">{stats.leadsConvertidos}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contratos fechados</span>
          </div>
        </div>

        {/* Lost Leads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Perdidos</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-white block leading-none">{stats.leadsPerdidos}</span>
            <span className="text-[10px] text-zinc-500 mt-1 block">Sem retorno ou perda</span>
          </div>
        </div>

        {/* Conversion Rate Dial */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-xs font-medium uppercase tracking-wider">Taxa Conv.</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white leading-none">{stats.taxaConversao}%</span>
            </div>
            <div className="w-full bg-zinc-850 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.taxaConversao}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Seção de Casamentos Próximos (Próximos 3 Meses) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Proximidade de Casamentos (Próximos 3 Meses)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Leads com casamentos se aproximando para reforçar o contato via Zoho Mail ou Waha WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium bg-zinc-950/60 border border-zinc-850 px-2 py-1 rounded-md">
            <span>Legenda:</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> 1 mês</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 2 meses</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 3 meses</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Coluna 1: Próximos 30 dias */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[300px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  🚨 Em até 1 Mês ({stats.upcomingWeddings?.oneMonth?.length || 0})
                </span>
                <span className="text-[9px] text-zinc-500">0 - 30 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("oneMonth", "🚨 Em até 1 Mês")}
                disabled={!stats.upcomingWeddings?.oneMonth?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2 py-1 text-[9px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/25 rounded transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-2.5 h-2.5" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {stats.upcomingWeddings?.oneMonth && stats.upcomingWeddings.oneMonth.length > 0 ? (
                stats.upcomingWeddings.oneMonth.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 rounded-lg transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 shrink-0">
                        {lead.dias_restantes === 0 ? "É Hoje!" : `Faltam ${lead.dias_restantes}d`}
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-zinc-400 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span>Data: <strong>{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-600" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-850/60 justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: De 31 a 60 dias */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[300px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ⚠️ Em até 2 Meses ({stats.upcomingWeddings?.twoMonths?.length || 0})
                </span>
                <span className="text-[9px] text-zinc-500">31 - 60 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("twoMonths", "⚠️ Em até 2 Meses")}
                disabled={!stats.upcomingWeddings?.twoMonths?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2 py-1 text-[9px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/25 rounded transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-2.5 h-2.5" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {stats.upcomingWeddings?.twoMonths && stats.upcomingWeddings.twoMonths.length > 0 ? (
                stats.upcomingWeddings.twoMonths.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 rounded-lg transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0">
                        {lead.dias_restantes} dias
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-zinc-400 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span>Data: <strong>{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-600" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-850/60 justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: De 61 a 90 dias */}
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[300px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  📅 Em até 3 Meses ({stats.upcomingWeddings?.threeMonths?.length || 0})
                </span>
                <span className="text-[9px] text-zinc-500">61 - 90 dias</span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBulkModal("threeMonths", "📅 Em até 3 Meses")}
                disabled={!stats.upcomingWeddings?.threeMonths?.length}
                title="Disparar follow-up em lote para este grupo"
                className="px-2 py-1 text-[9px] font-semibold bg-sky-500/10 hover:bg-sky-500/20 active:bg-sky-500/30 text-sky-400 border border-sky-500/25 rounded transition-all flex items-center gap-1 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-2.5 h-2.5" /> Enviar Lote
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {stats.upcomingWeddings?.threeMonths && stats.upcomingWeddings.threeMonths.length > 0 ? (
                stats.upcomingWeddings.threeMonths.map((lead: any) => (
                  <div key={lead.id} className="p-3 bg-zinc-900/60 border border-zinc-800 hover:border-zinc-750 rounded-lg transition space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate max-w-[130px]" title={lead.nome}>
                        {lead.nome}
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/25 shrink-0">
                        {lead.dias_restantes} dias
                      </span>
                    </div>
                    
                    <div className="text-[10px] text-zinc-400 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span>Data: <strong>{lead.data_casamento}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-zinc-600" />
                        <span>Convidados: {lead.convidados}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-850/60 justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850">
                        {lead.status_funil}
                      </span>
                      <div className="flex items-center gap-1">
                        {lead.email && (
                           <a href={`mailto:${lead.email}`} title="Enviar E-mail (Zoho)" className="p-1 rounded bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white transition">
                             <Mail className="w-3 h-3" />
                           </a>
                        )}
                        {lead.link_celular && (
                           <a href={`https://wa.me/${lead.link_celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="Enviar WhatsApp (Waha)" className="p-1 rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white transition">
                             <MessageSquare className="w-3 h-3" />
                           </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center py-6">
                  <span className="text-xs">Nenhum casamento próximo</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Charts & Automation section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lead entries area chart */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-[320px]">
          <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-4">
            Histórico de Inbound (Leads Recebidos nos últimos 7 dias)
          </span>

          <div className="flex-1 w-full text-xs">
            {stats.historicoEntrada.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.historicoEntrada} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fff", fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="quantidade" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEntry)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600">
                Nenhum lead registrado nos últimos 7 dias.
              </div>
            )}
          </div>
        </div>

        {/* Temperature pie chart */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-[320px]">
          <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-2">
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
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tempChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fff", fontSize: 11 }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-600">Não há dados suficientes.</div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Disparo de Follow-up em Lote */}
      {isBulkModalOpen && (
        <div id="bulk-followup-modal" className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[90vh] animate-fade-in my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Disparo Especial em Lote</h3>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Lote selecionado: <strong className="text-amber-400">{cohortLabel}</strong>
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
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Informação sobre os leads */}
              <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs text-zinc-400">Leads qualificados neste lote:</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-750">
                  {(() => {
                    let count = 0;
                    if (selectedCohort === "oneMonth") count = stats.upcomingWeddings?.oneMonth?.length || 0;
                    if (selectedCohort === "twoMonths") count = stats.upcomingWeddings?.twoMonths?.length || 0;
                    if (selectedCohort === "threeMonths") count = stats.upcomingWeddings?.threeMonths?.length || 0;
                    return count;
                  })()}{" "}
                  leads
                </span>
              </div>

              {/* Seletor de Regra/Mensagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block">
                  Selecione o Follow-up Especial ou Emergencial:
                </label>
                <select
                  disabled={isSendingBulk}
                  value={selectedRuleId}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition"
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
                  <label className="text-xs font-semibold text-zinc-400 block">Canal de Envio:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isSendingBulk}
                      onClick={() => setBulkCanal("WHATSAPP")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                        bulkCanal === "WHATSAPP"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp (Waha)
                    </button>
                    <button
                      type="button"
                      disabled={isSendingBulk}
                      onClick={() => setBulkCanal("EMAIL")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1.5 ${
                        bulkCanal === "EMAIL"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" /> E-mail (Zoho)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Histórico de Contato:</label>
                  <div className="text-[11px] text-zinc-500 leading-normal flex items-start gap-1 bg-zinc-950/20 p-2 border border-zinc-850 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span>Cada envio registrará automaticamente uma entrada de envio no histórico do lead.</span>
                  </div>
                </div>
              </div>

              {/* Assunto (Se E-mail) */}
              {bulkCanal === "EMAIL" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-semibold text-zinc-400 block">Assunto do E-mail:</label>
                  <input
                    type="text"
                    disabled={isSendingBulk}
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    placeholder="Ex: Confirmação do seu orçamento Casa Colombo"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}

              {/* Mensagem */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-400 block">Mensagem (Template):</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Suporta tags dinâmicas</span>
                </div>
                <textarea
                  disabled={isSendingBulk}
                  rows={5}
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Olá {nome}, tudo bem?..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition font-mono custom-scrollbar"
                />
              </div>

              {/* Tags de Apoio */}
              <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Variáveis Dinâmicas Disponíveis:</span>
                <div className="flex flex-wrap gap-1.5">
                  {["{nome}", "{local}", "{convidados}", "{data_casamento}", "{mes_casamento}", "{status}", "{temperatura}"].map((tag) => (
                    <span key={tag} className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progresso de Envio */}
              {bulkProgress.total > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Progresso do Envio:</span>
                    <span className="font-mono text-zinc-400">
                      {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>

                  {/* Logs de Envio em Lote */}
                  <div className="h-28 bg-zinc-950 rounded-lg border border-zinc-850 p-2.5 font-mono text-[10px] text-zinc-400 overflow-y-auto space-y-1 custom-scrollbar">
                    {bulkLogs.map((log, idx) => (
                      <div key={idx} className={log.includes("✅") ? "text-emerald-400" : log.includes("❌") ? "text-rose-400" : "text-zinc-400"}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSendingBulk}
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSendingBulk || !bulkMessage.trim()}
                onClick={handleExecuteBulkSend}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black shadow transition flex items-center gap-1.5"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Disparar em Lote ({(() => {
                      let count = 0;
                      if (selectedCohort === "oneMonth") count = stats.upcomingWeddings?.oneMonth?.length || 0;
                      if (selectedCohort === "twoMonths") count = stats.upcomingWeddings?.twoMonths?.length || 0;
                      if (selectedCohort === "threeMonths") count = stats.upcomingWeddings?.threeMonths?.length || 0;
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
