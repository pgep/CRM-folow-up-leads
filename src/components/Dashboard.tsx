/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { DashboardStats, Lead } from "../types";
import { 
  Users, AlertCircle, Sparkles, Calendar, RefreshCw, 
  Clock, Mail, MessageSquare, X, Send, AlertTriangle, 
  Flame, ArrowRight, CalendarCheck, ChevronRight, Check, 
  CheckCircle2, DollarSign, Target, ExternalLink
} from "lucide-react";
import { useToast } from "./Toast";

interface DashboardProps {
  stats: DashboardStats | null;
  leads?: Lead[];
  onRunAutomation?: () => Promise<any>;
  onRefresh?: () => Promise<void>;
  onSelectNegociacao?: () => void;
  onGoToAgenda?: () => void;
}

// Formatador de Moeda BRL
function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Formatador de pluralização de leads
function formatLeadPlural(count: number, singular = "lead", plural = "leads"): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function Dashboard({
  stats,
  leads = [],
  onRefresh,
  onSelectNegociacao,
  onGoToAgenda
}: DashboardProps) {
  const { toast, confirm } = useToast();

  // Resumo de atividades operacionais da Agenda
  const [activitiesSummary, setActivitiesSummary] = useState<{
    atrasadas: number;
    hoje: number;
    proximos7dias: number;
    semProximoPasso: number;
  } | null>(null);

  // Preço unitário da Mini Vela para estimativa de pipeline
  const [miniVelaPrice, setMiniVelaPrice] = useState<number>(8.50);

  // Buscar resumo de atividades e preço do produto
  useEffect(() => {
    fetch("/api/activities/summary")
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) return await res.json();
        return null;
      })
      .then((data) => {
        if (data) setActivitiesSummary(data);
      })
      .catch((e) => console.warn("Aviso ao carregar resumo de atividades:", e));

    fetch("/api/products")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const miniVelaProd = data.find(
            (p: any) =>
              p.id === "mini_vela" ||
              (p.descricao && p.descricao.toLowerCase().includes("mini vela")) ||
              (p.descricao && p.descricao.toLowerCase().includes("vela"))
          );
          if (miniVelaProd && Number(miniVelaProd.valor_unitario) > 0) {
            setMiniVelaPrice(Number(miniVelaProd.valor_unitario));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Regras Especiais de Follow-up (carregadas de /api/settings)
  const [specialRules, setSpecialRules] = useState<any[]>([]);
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
        console.warn("Aviso ao carregar regras especiais:", e);
      }
    };
    loadRules();
  }, []);

  // Aba selecionada na seção de Casamentos Próximos
  const [selectedWeddingTab, setSelectedWeddingTab] = useState<"oneMonth" | "twoMonths" | "threeMonths">("oneMonth");

  // Modal de Disparo em Lote
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<"oneMonth" | "twoMonths" | "threeMonths" | null>(null);
  const [cohortLabel, setCohortLabel] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [bulkCanal, setBulkCanal] = useState<"WHATSAPP" | "EMAIL">("WHATSAPP");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Disparo em lote
  const handleOpenBulkModal = (cohort: "oneMonth" | "twoMonths" | "threeMonths", label: string) => {
    setSelectedCohort(cohort);
    setCohortLabel(label);

    const initialRule = specialRules[0];
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

  const handleRuleChange = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    if (!ruleId) {
      setBulkSubject("");
      setBulkMessage("");
      return;
    }
    const found = specialRules.find((r) => r.id === ruleId);
    if (found) {
      setBulkCanal(found.canal);
      setBulkSubject(found.assunto_template || found.assunto || "Atualização Importante - Casa Colombo Artesanal");
      setBulkMessage(found.mensagem_template || found.mensagem || "");
    }
  };

  const handleExecuteBulkSend = async () => {
    if (!selectedCohort) return;

    let cohortLeads: any[] = [];
    if (selectedCohort === "oneMonth") {
      cohortLeads = (safeStats.upcomingWeddings?.oneMonth || []).filter((l: any) => !l.followup_especial_1m);
    } else if (selectedCohort === "twoMonths") {
      cohortLeads = (safeStats.upcomingWeddings?.twoMonths || []).filter((l: any) => !l.followup_especial_2m);
    } else if (selectedCohort === "threeMonths") {
      cohortLeads = (safeStats.upcomingWeddings?.threeMonths || []).filter((l: any) => !l.followup_especial_3m);
    }

    if (cohortLeads.length === 0) {
      toast.warning("Nenhum lead qualificado (que ainda não tenha recebido este follow-up) encontrado neste lote.");
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

    const confirmed = await confirm(
      `Deseja mesmo disparar esta mensagem em lote para os ${cohortLeads.length} leads qualificados deste lote?`
    );
    if (!confirmed) return;

    setIsSendingBulk(true);
    setBulkLogs([]);
    setBulkProgress({ current: 0, total: cohortLeads.length });

    const logMsg = (msg: string) => {
      const time = new Date().toLocaleTimeString("pt-BR");
      setBulkLogs((prev) => [...prev, `[${time}] ${msg}`]);
    };

    logMsg(`Iniciando envio em lote por ${bulkCanal}...`);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < cohortLeads.length; i++) {
      const lead = cohortLeads[i];
      setBulkProgress({ current: i + 1, total: cohortLeads.length });
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

      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    logMsg(`\n--- DISPARO EM LOTE CONCLUÍDO ---`);
    logMsg(`Sucesso: ${successCount} | Falhas: ${failCount}`);
    setIsSendingBulk(false);

    if (onRefresh) {
      await onRefresh();
    }
  };

  // Safe Stats com fallbacks limpos
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

  // Cálculo do Potencial Financeiro Estimado em Pipeline (regra mantida)
  const pipelineValue = useMemo(() => {
    if (!leads || leads.length === 0) {
      return (safeStats.leadsAtivos || 0) * (100 * miniVelaPrice);
    }

    return leads.reduce((acc, lead) => {
      const sf = String(lead.status_funil || "").toUpperCase();
      const sc = String(lead.status_conversa || "").toUpperCase();
      const isClosed = ["PERDIDO", "SEM_RETORNO", "FECHOU", "SEM_WHATSAPP"].includes(sf) || sc === "PERDIDO" || sc === "CLIENTE";
      if (isClosed) return acc;

      const guests = Number(lead.convidados) || 0;
      if (guests > 0) return acc + (guests * miniVelaPrice);

      const extractVal = (str?: string): number => {
        if (!str) return 0;
        const clean = str.replace(/[^\d.,]/g, "").replace(",", ".");
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
      };

      const val = extractVal(lead.soma1) || extractVal(lead.soma2);
      return acc + val;
    }, 0);
  }, [leads, safeStats.leadsAtivos, miniVelaPrice]);

  // Dados para gráficos com cores semânticas elegantes
  const tempChartData = useMemo(() => {
    const raw = safeStats.leadsPorTemperatura || {};
    const order = ["QUENTE", "MORNA", "FRIA", "CONGELADA"];
    const labels: Record<string, string> = {
      QUENTE: "Quente",
      MORNA: "Morna",
      FRIA: "Fria",
      CONGELADA: "Congelada"
    };

    return order
      .map((key) => ({
        name: labels[key] || key,
        value: Number(raw[key as keyof typeof raw] || 0)
      }))
      .filter((item) => item.value > 0);
  }, [safeStats.leadsPorTemperatura]);

  const TEMP_COLORS: Record<string, string> = {
    Quente: "#f59e0b",
    Morna: "#6366f1",
    Fria: "#0ea5e9",
    Congelada: "#64748b"
  };

  // Dados do Funil Contínuo Proporcional
  const funilEtapas = useMemo(() => {
    const etapas = [
      { 
        key: "PRIMEIRO_CONTATO", 
        label: "Primeiro Contato", 
        count: (safeStats.leadsPorStatus?.["Primeiro Contato"] || safeStats.leadsPorStatus?.["PRIMEIRO_CONTATO"] || safeStats.leadsNovos || 0), 
        colorBg: "bg-blue-500",
        colorText: "text-blue-600 dark:text-blue-400",
        dotColor: "bg-blue-500"
      },
      { 
        key: "EM_CONVERSA", 
        label: "Em Conversa", 
        count: (safeStats.leadsPorStatus?.["Em Conversa"] || safeStats.leadsPorStatus?.["EM_CONVERSA"] || 0), 
        colorBg: "bg-indigo-500",
        colorText: "text-indigo-600 dark:text-indigo-400",
        dotColor: "bg-indigo-500"
      },
      { 
        key: "PROPOSTA", 
        label: "Proposta / Catálogo", 
        count: (safeStats.leadsPorEtapa?.["Amostra Enviada"] || safeStats.leadsPorEtapa?.["Catálogo Enviado"] || 0), 
        colorBg: "bg-purple-500",
        colorText: "text-purple-600 dark:text-purple-400",
        dotColor: "bg-purple-500"
      },
      { 
        key: "NEGOCIACAO", 
        label: "Em Negociação", 
        count: safeStats.leadsEmNegociacao || 0, 
        colorBg: "bg-amber-500",
        colorText: "text-amber-600 dark:text-amber-400",
        dotColor: "bg-amber-500"
      },
      { 
        key: "CONVERTIDO", 
        label: "Fechou Contrato", 
        count: safeStats.leadsConvertidos || 0, 
        colorBg: "bg-emerald-500",
        colorText: "text-emerald-600 dark:text-emerald-400",
        dotColor: "bg-emerald-500"
      }
    ];

    const soma = etapas.reduce((acc, e) => acc + e.count, 0);
    return { etapas, totalSoma: soma };
  }, [safeStats.leadsPorStatus, safeStats.leadsPorEtapa, safeStats.leadsNovos, safeStats.leadsEmNegociacao, safeStats.leadsConvertidos]);

  // Lista dos casamentos do horizonte selecionado
  const activeCohortList = useMemo(() => {
    const uw = safeStats.upcomingWeddings;
    if (selectedWeddingTab === "oneMonth") return uw?.oneMonth || [];
    if (selectedWeddingTab === "twoMonths") return uw?.twoMonths || [];
    return uw?.threeMonths || [];
  }, [safeStats.upcomingWeddings, selectedWeddingTab]);

  const totalUpcomingWeddings = useMemo(() => {
    const uw = safeStats.upcomingWeddings;
    return (uw?.oneMonth?.length || 0) + (uw?.twoMonths?.length || 0) + (uw?.threeMonths?.length || 0);
  }, [safeStats.upcomingWeddings]);

  const activeCohortLabel = selectedWeddingTab === "oneMonth" ? "Até 30 dias" : selectedWeddingTab === "twoMonths" ? "31 a 60 dias" : "61 a 90 dias";

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[500px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm font-medium" style={{ color: "var(--crm-text-muted)" }}>
          Carregando visão comercial do CRM...
        </p>
      </div>
    );
  }

  const atrasadasCount = activitiesSummary?.atrasadas ?? 0;
  const hojeCount = activitiesSummary?.hoje ?? 0;
  const semPassoCount = activitiesSummary?.semProximoPasso ?? 0;
  const emNegociacaoCount = safeStats.leadsEmNegociacao || 0;

  // Verifica se há alguma pendência operacional urgente
  const hasOperationalUrgency = atrasadasCount > 0 || hojeCount > 0 || semPassoCount > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      
      {/* ========================================================================= */}
      {/* CABEÇALHO DO DASHBOARD / VISÃO COMERCIAL                                   */}
      {/* ========================================================================= */}
      <div 
        className="rounded-2xl p-5 sm:p-6 border transition-all"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
              <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                Central de Visão Comercial
              </h1>
            </div>
            <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: "var(--crm-text-secondary)" }}>
              Acompanhamento de oportunidades ativas, pipeline estimado e prioridades operacionais do dia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {onGoToAgenda && (
              <button
                type="button"
                onClick={onGoToAgenda}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Minha Agenda</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-xs font-medium rounded-xl border transition cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-muted)"
                }}
                title="Recarregar dados do CRM"
                aria-label="Atualizar dados"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NÍVEL 1: SEÇÃO "PRECISA DA SUA ATENÇÃO" (OPERACIONAL & PRIORIDADES DO DIA)  */}
      {/* ZEROS FALAM BAIXO: se tudo zerado, exibe estado calmo e compacto          */}
      {/* ========================================================================= */}
      <section 
        className="rounded-2xl p-5 border shadow-xs transition-all"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: atrasadasCount > 0 ? "rgba(244, 63, 94, 0.4)" : "var(--crm-border)"
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b" style={{ borderColor: "var(--crm-border)" }}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              atrasadasCount > 0 
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                : hasOperationalUrgency
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}>
              {atrasadasCount > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : hasOperationalUrgency ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                {hasOperationalUrgency ? "Precisa da sua Atenção Agora" : "Operação em Dia"}
              </h2>
              <p className="text-xs" style={{ color: "var(--crm-text-muted)" }}>
                {hasOperationalUrgency 
                  ? "Ações operacionais imediatas para evitar perdas e manter o contato aquecido."
                  : "Nenhuma pendência operacional atrasada no momento."}
              </p>
            </div>
          </div>

          {onGoToAgenda && (
            <button
              onClick={onGoToAgenda}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Ver cronograma completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* COMPORTAMENTO ADAPTATIVO: ZEROS FALAM BAIXO */}
        {!hasOperationalUrgency ? (
          /* Estado Calmo quando tudo está 100% em dia */
          <div className="pt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-emerald-700 dark:text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Nenhuma atividade atrasada</span>
              </span>
              <span style={{ color: "var(--crm-border)" }}>•</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Nada programado para hoje</span>
              </span>
              <span style={{ color: "var(--crm-border)" }}>•</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Todos os leads possuem próximo passo</span>
              </span>
            </div>

            <div className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
              Próximos passos podem ser agendados na <button onClick={onGoToAgenda} className="underline text-indigo-600 dark:text-indigo-400 cursor-pointer">Minha Agenda</button>.
            </div>
          </div>
        ) : (
          /* Quando há pendências reais: 3 indicadores operacionais com destaque para o que exige ação */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
            
            {/* 1. Atividades Atrasadas (Ganhar destaque imediato se > 0) */}
            <div 
              onClick={onGoToAgenda}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                atrasadasCount > 0 
                  ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50" 
                  : "opacity-60 hover:opacity-100"
              }`}
              style={atrasadasCount === 0 ? {
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)"
              } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                  atrasadasCount > 0 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  Atividades Atrasadas
                </span>
                {atrasadasCount > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                )}
              </div>

              <div className="mt-2.5">
                <span className={`text-2xl font-extrabold font-mono tracking-tight block ${
                  atrasadasCount > 0 ? "text-rose-600 dark:text-rose-400" : ""
                }`} style={atrasadasCount === 0 ? { color: "var(--crm-text)" } : undefined}>
                  {atrasadasCount}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: atrasadasCount > 0 ? "var(--crm-text-secondary)" : "var(--crm-text-muted)" }}>
                  {atrasadasCount > 0 
                    ? `${atrasadasCount === 1 ? "1 atividade pendente vencida" : `${atrasadasCount} atividades pendentes vencidas`}`
                    : "Nenhuma pendência vencida"}
                </p>
              </div>
            </div>

            {/* 2. Programadas para Hoje */}
            <div 
              onClick={onGoToAgenda}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                hojeCount > 0 ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50" : "opacity-60 hover:opacity-100"
              }`}
              style={hojeCount === 0 ? {
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)"
              } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                  hojeCount > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  Foco de Hoje
                </span>
                <Clock className={`w-3.5 h-3.5 ${hojeCount > 0 ? "text-emerald-500" : "text-zinc-400"}`} />
              </div>

              <div className="mt-2.5">
                <span className="text-2xl font-extrabold font-mono tracking-tight block" style={{ color: "var(--crm-text)" }}>
                  {hojeCount}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--crm-text-muted)" }}>
                  {hojeCount > 0 
                    ? `${hojeCount === 1 ? "1 contato programado hoje" : `${hojeCount} contatos programados hoje`}`
                    : "Nenhuma ação para hoje"}
                </p>
              </div>
            </div>

            {/* 3. Sem Próximo Passo */}
            <div 
              onClick={onGoToAgenda}
              className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                semPassoCount > 0 ? "border-amber-500/35 bg-amber-500/5 hover:border-amber-500/50" : "opacity-60 hover:opacity-100"
              }`}
              style={semPassoCount === 0 ? {
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)"
              } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold tracking-wider uppercase ${
                  semPassoCount > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  Sem Próximo Passo
                </span>
                <AlertCircle className={`w-3.5 h-3.5 ${semPassoCount > 0 ? "text-amber-500" : "text-zinc-400"}`} />
              </div>

              <div className="mt-2.5">
                <span className="text-2xl font-extrabold font-mono tracking-tight block" style={{ color: "var(--crm-text)" }}>
                  {semPassoCount}
                </span>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--crm-text-muted)" }}>
                  {semPassoCount > 0 
                    ? `${semPassoCount === 1 ? "1 lead ativo sem agendamento" : `${semPassoCount} leads ativos sem agendamento`}`
                    : "Todos os leads acompanhados"}
                </p>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* NÍVEL 2: SITUAÇÃO COMERCIAL CONSOLIDADA (METRICA & POTENCIAL DO PIPELINE)  */}
      {/* ========================================================================= */}
      <section 
        className="rounded-2xl p-5 sm:p-6 border shadow-xs"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-6 border-b" style={{ borderColor: "var(--crm-border)" }}>
          
          {/* Pilar 1: Oportunidades Ativas */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: "var(--crm-text-muted)" }}>
              Oportunidades Ativas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight" style={{ color: "var(--crm-text)" }}>
                {safeStats.leadsAtivos}
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--crm-text-secondary)" }}>
              {formatLeadPlural(safeStats.leadsAtivos, "oportunidade ativa", "oportunidades ativas")} no funil
            </p>
          </div>

          {/* Pilar 2: Em Negociação (Situação Comercial, não emergência) */}
          <div 
            onClick={() => onSelectNegociacao && onSelectNegociacao()}
            className={`space-y-1 ${onSelectNegociacao ? "cursor-pointer group" : ""}`}
            title={onSelectNegociacao ? "Ver leads em negociação no Kanban" : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider block text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500/20 text-amber-500" />
                Em Negociação
              </span>
              {onSelectNegociacao && (
                <ArrowRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition group-hover:translate-x-0.5" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {emNegociacaoCount}
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--crm-text-secondary)" }}>
              {formatLeadPlural(emNegociacaoCount, "proposta em fase final", "propostas em fase final")}
            </p>
          </div>

          {/* Pilar 3: Potencial Estimado em Pipeline */}
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider block text-indigo-600 dark:text-indigo-400">
              Potencial em Pipeline
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
                {formatCurrency(pipelineValue)}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
              {formatLeadPlural(safeStats.leadsAtivos, "lead ativo no pipeline", "leads ativos no pipeline")}
            </p>
          </div>

          {/* Pilar 4: Taxa de Conversão (Aparência neutra quando = 0%) */}
          <div className="space-y-1">
            <span className={`text-xs font-semibold uppercase tracking-wider block ${
              safeStats.taxaConversao > 0 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-zinc-500 dark:text-zinc-400"
            }`}>
              Taxa de Conversão
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                safeStats.taxaConversao > 0 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-zinc-500 dark:text-zinc-400"
              }`}>
                {safeStats.taxaConversao}%
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                ({safeStats.leadsConvertidos} {safeStats.leadsConvertidos === 1 ? "contrato" : "contratos"})
              </span>
            </div>
            {/* Barra de progresso: neutra quando 0%, verde quando > 0% */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  safeStats.taxaConversao > 0 ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                }`}
                style={{ width: `${Math.min(safeStats.taxaConversao, 100)}%` }}
              />
            </div>
          </div>

        </div>

        {/* Linha de Subtotais Contextuais (Pluralização rigorosa e sem duplicidade) */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--crm-text-secondary)" }}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Aguardando 1º contato:</span>
              <strong className="font-mono font-bold" style={{ color: "var(--crm-text)" }}>
                {safeStats.leadsNovos}
              </strong>
            </div>

            <span className="hidden sm:inline" style={{ color: "var(--crm-border)" }}>•</span>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Em acompanhamento contínuo:</span>
              <strong className="font-mono font-bold" style={{ color: "var(--crm-text)" }}>
                {Math.max(0, safeStats.leadsAtivos - safeStats.leadsNovos - (safeStats.leadsEmNegociacao || 0))}
              </strong>
            </div>

            <span className="hidden sm:inline" style={{ color: "var(--crm-border)" }}>•</span>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Sem retorno ou perdidos:</span>
              <strong className="font-mono font-bold" style={{ color: "var(--crm-text)" }}>
                {safeStats.leadsPerdidos}
              </strong>
            </div>
          </div>

          <div className="text-[11px] font-medium" style={{ color: "var(--crm-text-muted)" }}>
            Total catalogado no CRM: <strong style={{ color: "var(--crm-text)" }}>{safeStats.totalLeads}</strong> {safeStats.totalLeads === 1 ? "lead" : "leads"}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* NÍVEL 3 (A): FUNIL COMERCIAL CONTÍNUO (VISUALIZAÇÃO COMPACTA E PROPORCIONAL) */}
      {/* Sem cards isolados: barra contínua + trilha de fluxo horizontal           */}
      {/* ========================================================================= */}
      <section 
        className="rounded-2xl p-5 border shadow-xs space-y-4"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
              Fluxo Contínuo do Funil de Vendas
            </h3>
            <p className="text-xs" style={{ color: "var(--crm-text-muted)" }}>
              Distribuição proporcional das oportunidades ao longo das etapas comerciais.
            </p>
          </div>
        </div>

        {/* 1. Barra Segmentada Proporcional Contínua */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
          {funilEtapas.totalSoma > 0 ? (
            funilEtapas.etapas.map((etapa) => {
              if (etapa.count <= 0) return null;
              const widthPct = (etapa.count / funilEtapas.totalSoma) * 100;
              return (
                <div 
                  key={etapa.key}
                  className={`${etapa.colorBg} h-full transition-all duration-300 relative group`}
                  style={{ width: `${widthPct}%` }}
                  title={`${etapa.label}: ${etapa.count} leads (${Math.round(widthPct)}%)`}
                />
              );
            })
          ) : (
            <div className="w-full h-full bg-zinc-300 dark:bg-zinc-700 opacity-40" />
          )}
        </div>

        {/* 2. Trilha Horizontal Conectada com Etapas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {funilEtapas.etapas.map((etapa, idx) => {
            const pct = funilEtapas.totalSoma > 0 
              ? Math.round((etapa.count / funilEtapas.totalSoma) * 100) 
              : 0;

            return (
              <div 
                key={etapa.key}
                className="p-3 rounded-xl border flex flex-col justify-between transition-all"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)"
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${etapa.dotColor}`} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--crm-text-secondary)" }}>
                      {etapa.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 shrink-0" style={{ color: "var(--crm-text-muted)" }}>
                    {pct}%
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className={`text-xl font-bold font-mono tracking-tight ${etapa.count > 0 ? etapa.colorText : ""}`} style={etapa.count === 0 ? { color: "var(--crm-text)" } : undefined}>
                    {etapa.count}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--crm-text-muted)" }}>
                    {etapa.count === 1 ? "lead" : "leads"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* NÍVEL 3 (B): PRÓXIMOS CASAMENTOS (HORIZONTE 30 / 60 / 90 DIAS)             */}
      {/* Compacto, escalável com 1 ou 100+ leads, sem cartões gigantescos          */}
      {/* ========================================================================= */}
      <section 
        className="rounded-2xl p-5 sm:p-6 border shadow-xs space-y-4"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                Horizonte de Casamentos Próximos
              </h3>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--crm-text-muted)" }}>
              Noivas com datas se aproximando para envio oportuno de lembrancinhas e amostras.
            </p>
          </div>

          {/* Abas Temporais: 30 / 60 / 90 dias */}
          <div 
            className="inline-flex p-1 rounded-xl border self-start sm:self-auto"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)"
            }}
          >
            {[
              { id: "oneMonth", label: "Até 30 dias", count: safeStats.upcomingWeddings?.oneMonth?.length || 0, badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
              { id: "twoMonths", label: "31 a 60 dias", count: safeStats.upcomingWeddings?.twoMonths?.length || 0, badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
              { id: "threeMonths", label: "61 a 90 dias", count: safeStats.upcomingWeddings?.threeMonths?.length || 0, badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-300" }
            ].map((tab) => {
              const isActive = selectedWeddingTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedWeddingTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "hover:opacity-80"
                  }`}
                  style={!isActive ? { color: "var(--crm-text-secondary)" } : undefined}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : tab.badgeColor}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {totalUpcomingWeddings === 0 ? (
          /* Empty state discreto se todas as faixas estiverem zeradas */
          <div 
            className="p-6 text-center rounded-xl border space-y-1"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)"
            }}
          >
            <Calendar className="w-5 h-5 mx-auto opacity-40 mb-1" style={{ color: "var(--crm-text-muted)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--crm-text-secondary)" }}>
              Nenhum casamento previsto registrado para os próximos 90 dias.
            </p>
            <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
              Conforme orçamentos com data de celebração forem cadastrados no CRM, eles serão organizados automaticamente aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Linha de Ação do Lote Selecionado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs" style={{ color: "var(--crm-text-secondary)" }}>
                Exibindo <strong style={{ color: "var(--crm-text)" }}>{activeCohortList.length}</strong> {activeCohortList.length === 1 ? "casamento previsto" : "casamentos previstos"} para {activeCohortLabel.toLowerCase()}.
              </div>

              <button
                type="button"
                onClick={() => handleOpenBulkModal(selectedWeddingTab, activeCohortLabel)}
                disabled={activeCohortList.length === 0}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Disparar Mensagem em Lote</span>
              </button>
            </div>

            {/* Lista compacta com scroll controlado para suportar muitos leads */}
            {activeCohortList.length > 0 ? (
              <div 
                className="divide-y rounded-xl border overflow-hidden max-h-[360px] overflow-y-auto" 
                style={{ borderColor: "var(--crm-border)" }}
              >
                {activeCohortList.map((lead: any) => {
                  const isUrgent = lead.dias_restantes <= 15;
                  const hasSentFollowup = (selectedWeddingTab === "oneMonth" && lead.followup_especial_1m) ||
                                          (selectedWeddingTab === "twoMonths" && lead.followup_especial_2m) ||
                                          (selectedWeddingTab === "threeMonths" && lead.followup_especial_3m);

                  return (
                    <div 
                      key={lead.id} 
                      className="p-3 sm:p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:opacity-95"
                      style={{ backgroundColor: "var(--crm-surface-subtle)" }}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm tracking-tight" style={{ color: "var(--crm-text)" }}>
                            {lead.nome}
                          </span>
                          <span 
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                              isUrgent 
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" 
                                : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                            }`}
                          >
                            {lead.dias_restantes === 0 ? "É Hoje!" : `Faltam ${lead.dias_restantes} dias`}
                          </span>
                          {hasSentFollowup && (
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              Lote Enviado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--crm-text-muted)" }}>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Data: <strong style={{ color: "var(--crm-text-secondary)" }}>{lead.data_casamento}</strong></span>
                          </span>

                          {lead.convidados && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{lead.convidados} convidados</span>
                              </span>
                            </>
                          )}

                          {lead.status_funil && (
                            <>
                              <span>•</span>
                              <span>Etapa: <strong style={{ color: "var(--crm-text-secondary)" }}>{lead.status_funil}</strong></span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ações Diretas Compactas */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {lead.link_celular && (
                          <a
                            href={
                              lead.link_celular.startsWith("http")
                                ? lead.link_celular
                                : `https://wa.me/55${lead.telefone_limpo || lead.link_celular.replace(/\D/g, "")}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 transition cursor-pointer"
                            title="Conversar no WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition cursor-pointer hover:opacity-80"
                            style={{
                              backgroundColor: "var(--crm-surface)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text-secondary)"
                            }}
                            title="Enviar e-mail"
                          >
                            <Mail className="w-3 h-3" />
                            <span className="hidden sm:inline">E-mail</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                className="p-5 text-center rounded-xl border space-y-1"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)"
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--crm-text-secondary)" }}>
                  Nenhum casamento previsto para a janela de {activeCohortLabel.toLowerCase()}.
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* ========================================================================= */}
      {/* NÍVEL 3 (C): GRÁFICOS ANALÍTICOS (INBOUND 7 DIAS & TEMPERATURAS)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Histórico Inbound últimos 7 dias */}
        <div 
          className="lg:col-span-8 rounded-2xl p-5 border shadow-xs flex flex-col h-[300px]"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)"
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--crm-text-secondary)" }}>
                Entrada de Oportunidades (Últimos 7 Dias)
              </h4>
              <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
                Volume diário de novos contatos captados pelos portais e canais diretos.
              </p>
            </div>
          </div>

          <div className="flex-1 w-full text-xs">
            {(safeStats.historicoEntrada || []).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={safeStats.historicoEntrada || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)",
                      borderRadius: "12px",
                      color: "var(--crm-text)",
                      fontSize: 11
                    }}
                  />
                  <Area type="monotone" dataKey="quantidade" stroke="#6366f1" fillOpacity={1} fill="url(#colorEntry)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs" style={{ color: "var(--crm-text-muted)" }}>
                Nenhum novo lead registrado nos últimos 7 dias.
              </div>
            )}
          </div>
        </div>

        {/* Distribuição por Temperatura */}
        <div 
          className="lg:col-span-4 rounded-2xl p-5 border shadow-xs flex flex-col h-[300px]"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)"
          }}
        >
          <div className="mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--crm-text-secondary)" }}>
              Temperatura das Oportunidades
            </h4>
            <p className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
              Nível de engajamento e proximidade de fechamento.
            </p>
          </div>

          <div className="flex-1 w-full text-xs flex items-center justify-center relative">
            {tempChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tempChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tempChartData.map((entry) => (
                      <Cell key={entry.name} fill={TEMP_COLORS[entry.name] || "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)",
                      borderRadius: "12px",
                      color: "var(--crm-text)",
                      fontSize: 11
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-center" style={{ color: "var(--crm-text-muted)" }}>
                Dados de temperatura insuficientes.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE DISPARO EM LOTE (PRESERVADO COM TOKENS LIGHT/DARK)                */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div 
          id="bulk-followup-modal" 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
        >
          <div 
            className="border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in my-auto"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)"
            }}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: "var(--crm-border)" }}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--crm-text)" }}>
                    Disparo de Follow-up em Lote
                  </h3>
                </div>
                <p className="text-xs" style={{ color: "var(--crm-text-muted)" }}>
                  Lote selecionado: <strong style={{ color: "var(--crm-text)" }}>{cohortLabel}</strong>
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
                className="p-1.5 rounded-lg hover:opacity-80 transition cursor-pointer"
                style={{ color: "var(--crm-text-muted)" }}
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div 
                className="p-3 rounded-xl border flex items-center justify-between text-xs"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)"
                }}
              >
                <span style={{ color: "var(--crm-text-secondary)" }}>Leads elegíveis neste lote:</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {(() => {
                    let count = 0;
                    if (selectedCohort === "oneMonth") count = (safeStats.upcomingWeddings?.oneMonth || []).filter((l: any) => !l.followup_especial_1m).length;
                    if (selectedCohort === "twoMonths") count = (safeStats.upcomingWeddings?.twoMonths || []).filter((l: any) => !l.followup_especial_2m).length;
                    if (selectedCohort === "threeMonths") count = (safeStats.upcomingWeddings?.threeMonths || []).filter((l: any) => !l.followup_especial_3m).length;
                    return count;
                  })()}{" "}
                  oportunidades
                </span>
              </div>

              {/* Seletor de Modelo de Mensagem */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block" style={{ color: "var(--crm-text-secondary)" }}>
                  Modelo de Mensagem Pré-cadastrado:
                </label>
                <select
                  disabled={isSendingBulk}
                  value={selectedRuleId}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  <option value="">-- Personalizar Mensagem Avulsa --</option>
                  {specialRules.length > 0 ? (
                    <optgroup label="Modelos cadastrados nas Configurações">
                      {specialRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.nome} ({rule.canal})
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option disabled value="">Nenhum modelo cadastrado</option>
                  )}
                </select>
              </div>

              {/* Canal de Envio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block" style={{ color: "var(--crm-text-secondary)" }}>
                  Canal de Disparo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSendingBulk}
                    onClick={() => setBulkCanal("WHATSAPP")}
                    className={`py-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      bulkCanal === "WHATSAPP"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/40"
                        : "hover:opacity-80"
                    }`}
                    style={bulkCanal !== "WHATSAPP" ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)"
                    } : undefined}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp (Waha)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSendingBulk}
                    onClick={() => setBulkCanal("EMAIL")}
                    className={`py-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      bulkCanal === "EMAIL"
                        ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 ring-1 ring-indigo-500/40"
                        : "hover:opacity-80"
                    }`}
                    style={bulkCanal !== "EMAIL" ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)"
                    } : undefined}
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>E-mail (Zoho)</span>
                  </button>
                </div>
              </div>

              {/* Assunto (Se E-mail) */}
              {bulkCanal === "EMAIL" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold block" style={{ color: "var(--crm-text-secondary)" }}>
                    Assunto do E-mail:
                  </label>
                  <input
                    type="text"
                    disabled={isSendingBulk}
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    placeholder="Ex: Confirmação do seu orçamento Casa Colombo"
                    className="w-full rounded-xl p-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  />
                </div>
              )}

              {/* Mensagem Template */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold block" style={{ color: "var(--crm-text-secondary)" }}>
                    Conteúdo da Mensagem:
                  </label>
                  <span className="text-[10px] font-mono" style={{ color: "var(--crm-text-muted)" }}>
                    Variáveis dinâmicas ativas
                  </span>
                </div>
                <textarea
                  disabled={isSendingBulk}
                  rows={4}
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  placeholder="Olá {nome}, tudo bem? Sou da Casa Colombo..."
                  className="w-full rounded-xl p-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono leading-relaxed"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                />
              </div>

              {/* Variáveis Dinâmicas */}
              <div 
                className="p-3 rounded-xl border space-y-1"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)"
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "var(--crm-text-muted)" }}>
                  Tags aceitas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["{nome}", "{local}", "{convidados}", "{data_casamento}", "{mes_casamento}"].map((tag) => (
                    <span 
                      key={tag} 
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: "var(--crm-surface)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-secondary)"
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Barra de Progresso e Logs */}
              {bulkProgress.total > 0 && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--crm-border)" }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color: "var(--crm-text-secondary)" }}>
                      Progresso de Disparo:
                    </span>
                    <span className="font-mono" style={{ color: "var(--crm-text-muted)" }}>
                      {bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>

                  <div 
                    className="h-28 rounded-xl border p-2.5 font-mono text-[10px] overflow-y-auto space-y-1"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-muted)"
                    }}
                  >
                    {bulkLogs.map((log, idx) => (
                      <div key={idx} className={log.includes("✅") ? "text-emerald-600 dark:text-emerald-400" : log.includes("❌") ? "text-rose-600 dark:text-rose-400" : ""}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t flex items-center justify-end gap-2.5 shrink-0" style={{ borderColor: "var(--crm-border)" }}>
              <button
                type="button"
                disabled={isSendingBulk}
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-secondary)"
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSendingBulk || !bulkMessage.trim()}
                onClick={handleExecuteBulkSend}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSendingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Disparando lote...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar e Disparar</span>
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
