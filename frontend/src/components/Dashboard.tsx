/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { DashboardStats, Lead } from "../types";
import { Users, TrendingUp, AlertCircle, Sparkles, Star, Calendar, RefreshCw, Play, Terminal, ShieldCheck, CheckCircle2, Clock, Mail, MessageSquare, Phone } from "lucide-react";

interface DashboardProps {
  stats: DashboardStats | null;
  onRunAutomation: () => Promise<any>;
}

export default function Dashboard({ stats, onRunAutomation }: DashboardProps) {
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [automationResult, setAutomationResult] = useState<{ processed: number; actions_taken: number } | null>(null);

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
            <span className="text-xs font-medium uppercase tracking-wider">Total Noivas</span>
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

      {/* Seção de Casamentos Próximos (Próximos 3 Meses) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Proximidade de Casamentos (Próximos 3 Meses)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Noivas com casamentos se aproximando para reforçar o contato via Zoho Mail ou Waha WhatsApp.
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
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                🚨 Em até 1 Mês ({stats.upcomingWeddings?.oneMonth?.length || 0})
              </span>
              <span className="text-[10px] font-mono text-zinc-500">0 - 30 dias</span>
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
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                ⚠️ Em até 2 Meses ({stats.upcomingWeddings?.twoMonths?.length || 0})
              </span>
              <span className="text-[10px] font-mono text-zinc-500">31 - 60 dias</span>
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
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850 mb-3">
              <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                📅 Em até 3 Meses ({stats.upcomingWeddings?.threeMonths?.length || 0})
              </span>
              <span className="text-[10px] font-mono text-zinc-500">61 - 90 dias</span>
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

      {/* Lower section - Portals and CRM Scheduler trigger console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Portals breakdown Bar Chart */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-[320px]">
          <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block mb-4">
            Leads por Origem do Portal
          </span>

          <div className="flex-1 w-full text-xs">
            {originChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={originChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} />
                  <YAxis stroke="#4b5563" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fff", fontSize: 11 }}
                  />
                  <Bar dataKey="quantidade" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                    {originChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#f59e0b" : "#4f46e5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600">Não há dados de portal.</div>
            )}
          </div>
        </div>

        {/* Live n8n Automation simulator console */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-[320px]">
          <div className="flex items-start justify-between mb-3 shrink-0">
            <div>
              <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase block">
                Motor de Automação do CRM (Simulador n8n v2)
              </span>
              <p className="text-xs text-zinc-400 mt-1">
                Gatilho simulado que analisa prazos e envia e-mails/WhatsApps conforme o workflow configurado.
              </p>
            </div>

            <button
              onClick={triggerAutomation}
              disabled={runningAutomation}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition shrink-0 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              {runningAutomation ? "Varrendo CRM..." : "Rodar Varredura Manual"}
            </button>
          </div>

          {/* Interactive Terminal Window */}
          <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-850 p-3 font-mono text-[10px] text-zinc-400 overflow-y-auto flex flex-col-reverse justify-end divide-y divide-zinc-900 space-y-reverse">
            {showLogs ? (
              [...automationLogs].reverse().map((log, idx) => (
                <div key={idx} className="py-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center gap-2">
                <Terminal className="w-8 h-8 text-zinc-800" />
                <span>Console de Execução Inativo</span>
                <p className="text-[9px] max-w-xs leading-normal">
                  Clique em "Rodar Varredura Manual" para forçar a verificação dos leads elegíveis para o follow-up agora mesmo.
                </p>
              </div>
            )}
          </div>

          {automationResult && (
            <div className="mt-3 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-lg flex items-center justify-between text-[11px] font-medium shrink-0">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Execução Concluída!
              </span>
              <span className="text-zinc-500 font-mono">
                Leads verificados: <strong className="text-white">{automationResult.processed}</strong> • Envios efetuados: <strong className="text-white">{automationResult.actions_taken}</strong>
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
