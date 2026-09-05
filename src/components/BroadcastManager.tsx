/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Megaphone, AlertTriangle, Play, CheckCircle2, AlertCircle, 
  Send, Plus, Trash2, Edit3, Settings, Filter, Users, 
  Sparkles, Check, Square, CheckSquare, MessageSquare, Mail, 
  HelpCircle, Calendar, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { Lead, PortalSource } from "../types";
import { useToast } from "./Toast";
import VariablePicker from "./VariablePicker";

interface BroadcastManagerProps {
  leads: Lead[];
  portals: PortalSource[];
  onRefresh: () => Promise<void>;
}

interface SpecialRule {
  id: string;
  nome: string;
  campo_gatilho: 'dias_casamento' | 'convidados' | 'status_funil' | 'temperatura' | 'origem_portal';
  operador: '<' | '>' | '==' | '!=' | 'contem';
  valor_gatilho: string;
  canal: 'WHATSAPP' | 'EMAIL';
  assunto_template?: string;
  mensagem_template: string;
}

export default function BroadcastManager({ leads, portals, onRefresh }: BroadcastManagerProps) {
  const { toast, confirm } = useToast();
  const [subTab, setSubTab] = useState<'special' | 'bulk'>('special');
  const [settings, setSettings] = useState<any>(null);
  const [rules, setRules] = useState<SpecialRule[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // New Rule Form State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleField, setRuleField] = useState<SpecialRule['campo_gatilho']>("dias_casamento");
  const [ruleOperator, setRuleOperator] = useState<SpecialRule['operador']>("<");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleCanal, setRuleCanal] = useState<SpecialRule['canal']>("WHATSAPP");
  const [ruleSubject, setRuleSubject] = useState("");
  const [ruleMessage, setRuleMessage] = useState("");

  // Bulk Dispatch State
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkFilterStatus, setBulkFilterStatus] = useState<string>("ALL");
  const [bulkFilterTemp, setBulkFilterTemp] = useState<string>("ALL");
  const [bulkFilterMonth, setBulkFilterMonth] = useState<string>("ALL");
  const [bulkFilterPortal, setBulkFilterPortal] = useState<string>("ALL");
  const [bulkNameSearch, setBulkNameSearch] = useState("");
  const [bulkCanal, setBulkCanal] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [bulkSubject, setBulkSubject] = useState("Atualização Importante - Casa Colombo Artesanal");
  const [bulkMessage, setBulkMessage] = useState("Olá {nome}, tudo bem?\n\nPassando para avisar que as lembrancinhas de {local} já estão em produção.");
  
  // Progress/Status logs
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchLogs, setDispatchLogs] = useState<string[]>([]);
  const [dispatchProgress, setDispatchProgress] = useState({ current: 0, total: 0 });

  // Accordion for showing eligible leads per rule
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  // Load Special Rules from Server Settings
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.special_rules) {
          setRules(data.special_rules);
        } else {
          setRules([]);
        }
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save rules back to settings
  const saveRulesToSettings = async (updatedRules: SpecialRule[]) => {
    try {
      const updatedSettings = {
        ...(settings || {}),
        special_rules: updatedRules
      };
      
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });

      if (res.ok) {
        setRules(updatedRules);
        setSettings(updatedSettings);
      }
    } catch (e) {
      console.error("Error saving special rules:", e);
    }
  };

  const startEditingRule = (rule: SpecialRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.nome);
    setRuleField(rule.campo_gatilho);
    setRuleOperator(rule.operador);
    setRuleValue(rule.valor_gatilho);
    setRuleCanal(rule.canal);
    setRuleSubject(rule.assunto_template || "");
    setRuleMessage(rule.mensagem_template);
    setIsAddingRule(true); // Open form panel
    
    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add or Edit a special rule
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleValue.trim() || !ruleMessage.trim()) return;

    let updatedRules: SpecialRule[];

    if (editingRuleId) {
      // Edit existing rule
      updatedRules = rules.map(r => r.id === editingRuleId ? {
        ...r,
        nome: ruleName.trim(),
        campo_gatilho: ruleField,
        operador: ruleOperator,
        valor_gatilho: ruleValue.trim(),
        canal: ruleCanal,
        assunto_template: ruleCanal === "EMAIL" ? ruleSubject.trim() : undefined,
        mensagem_template: ruleMessage.trim()
      } : r);
      toast.success("Regra especial atualizada com sucesso!");
    } else {
      // Create new rule
      const newRule: SpecialRule = {
        id: "sr_" + Date.now(),
        nome: ruleName.trim(),
        campo_gatilho: ruleField,
        operador: ruleOperator,
        valor_gatilho: ruleValue.trim(),
        canal: ruleCanal,
        assunto_template: ruleCanal === "EMAIL" ? ruleSubject.trim() : undefined,
        mensagem_template: ruleMessage.trim()
      };
      updatedRules = [...rules, newRule];
      toast.success("Regra especial cadastrada com sucesso!");
    }

    await saveRulesToSettings(updatedRules);

    // Reset Form
    setEditingRuleId(null);
    setRuleName("");
    setRuleField("dias_casamento");
    setRuleOperator("<");
    setRuleValue("");
    setRuleCanal("WHATSAPP");
    setRuleSubject("");
    setRuleMessage("");
    setIsAddingRule(false);
  };

  // Delete special rule
  const handleDeleteRule = async (id: string) => {
    const confirmed = await confirm("Tem certeza que deseja remover este follow-up especial?");
    if (!confirmed) return;
    const updatedRules = rules.filter(r => r.id !== id);
    await saveRulesToSettings(updatedRules);
    if (expandedRuleId === id) setExpandedRuleId(null);
    toast.success("Follow-up especial removido com sucesso!");
  };

  // Helper to parse wedding dates robustly
  const parseWeddingDateLocal = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (!cleanStr) return null;

    let d: Date | null = null;
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        d = new Date(fullYear, month - 1, day);
      }
    } else {
      const parsed = Date.parse(cleanStr);
      if (!isNaN(parsed)) {
        d = new Date(parsed);
      }
    }

    if (d && !isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  };

  // Helper to calculate days remaining to wedding date
  const getDaysToWedding = (lead: Lead): number | null => {
    if (!lead.data_casamento) return null;
    try {
      const weddingDate = parseWeddingDateLocal(lead.data_casamento);
      if (!weddingDate) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = weddingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If wedding is in the past, return null (passed)
      if (diffDays < 0) return null;
      return diffDays;
    } catch (e) {}
    return null;
  };

  const isPerdido = (status?: string, motivo?: string) => {
    if (motivo && motivo.trim() !== "" && motivo !== "AGUARDANDO_DATA") return true;
    const s = String(status || "").toUpperCase();
    return s === "PERDIDO" || s === "SEM_RETORNO" || status === "Perdido" || status === "Sem Retorno" || status === "Sem Retorno / Encerrado" || status === "Sem WhatsApp";
  };

  // Match lead against a rule's condition
  const isLeadEligible = (lead: Lead, rule: SpecialRule): boolean => {
    // Exclude leads with Perdido / lost status
    if (isPerdido(lead.status_funil, lead.motivo_perda)) return false;

    // Exclude past weddings
    if (lead.data_casamento) {
      const wDate = parseWeddingDateLocal(lead.data_casamento);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (wDate && wDate < today) return false;
    }

    let leadValue: any = null;

    if (rule.campo_gatilho === "dias_casamento") {
      leadValue = getDaysToWedding(lead);
      if (leadValue === null) return false; // wedding passed or undefined
    } else if (rule.campo_gatilho === "convidados") {
      leadValue = lead.convidados;
    } else if (rule.campo_gatilho === "status_funil") {
      leadValue = lead.status_funil;
    } else if (rule.campo_gatilho === "temperatura") {
      leadValue = lead.temperatura;
    } else if (rule.campo_gatilho === "origem_portal") {
      leadValue = lead.origem_portal;
    }

    const ruleVal = rule.valor_gatilho;

    switch (rule.operador) {
      case "<":
        return Number(leadValue) < Number(ruleVal);
      case ">":
        return Number(leadValue) > Number(ruleVal);
      case "==": {
        if (String(leadValue).toUpperCase() === String(ruleVal).toUpperCase()) return true;
        const norm1 = String(leadValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const norm2 = String(ruleVal || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        return norm1.length > 0 && norm1 === norm2;
      }
      case "!=": {
        if (String(leadValue).toUpperCase() === String(ruleVal).toUpperCase()) return false;
        const norm1 = String(leadValue || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const norm2 = String(ruleVal || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        return norm1 !== norm2;
      }
      case "contem":
        return String(leadValue).toLowerCase().includes(String(ruleVal).toLowerCase());
      default:
        return false;
    }
  };

  // Send single special follow-up manually
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const handleSendSpecial = async (lead: Lead, rule: SpecialRule) => {
    setSendingLeadId(`${lead.id}-${rule.id}`);
    try {
      const res = await fetch(`/api/leads/${lead.id}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canal: rule.canal,
          mensagem: rule.mensagem_template,
          assunto: rule.assunto_template || "",
          titulo_historico: `Follow-up Especial: ${rule.nome}`
        })
      });

      if (res.ok) {
        toast.success(`Mensagem especial "${rule.nome}" disparada com sucesso para ${lead.nome}!`);
        await onRefresh();
      } else {
        const err = await res.json();
        toast.error(`Erro ao disparar mensagem: ${err.error || "Erro desconhecido"}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão ao enviar follow-up especial.");
    } finally {
      setSendingLeadId(null);
    }
  };

  // Filters for bulk dispatch
  const filteredLeadsForBulk = leads.filter(lead => {
    // Exclude leads with Perdido / lost status
    if (isPerdido(lead.status_funil, lead.motivo_perda)) return false;

    // Exclude past weddings
    if (lead.data_casamento) {
      const wDate = parseWeddingDateLocal(lead.data_casamento);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (wDate && wDate < today) return false;
    }

    const normalizePortal = (portal?: string): string => {
      if (!portal) return "manual";
      const p = portal.toLowerCase().trim();
      if (p === "portal_noivas" || p === "portal noivas" || p === "portal de noivas") {
        return "portal_noivas";
      }
      if (p === "casamentos.com.br" || p === "casamentos") {
        return "casamentos";
      }
      if (p === "zankyou") {
        return "zankyou";
      }
      if (p === "manual" || p === "manual / cadastro crm" || p === "cadastro crm") {
        return "manual";
      }
      return p;
    };

    if (bulkFilterStatus !== "ALL" && lead.status_funil !== bulkFilterStatus) return false;
    if (bulkFilterTemp !== "ALL" && String(lead.temperatura || "").trim().toUpperCase() !== String(bulkFilterTemp).trim().toUpperCase()) return false;
    if (bulkFilterPortal !== "ALL" && normalizePortal(lead.origem_portal) !== normalizePortal(bulkFilterPortal)) return false;
    if (bulkFilterMonth !== "ALL") {
      if (!lead.mes_casamento) return false;
      // Compare month string or number
      const cleanMes = lead.mes_casamento.trim().toUpperCase();
      const filterMes = bulkFilterMonth.trim().toUpperCase();
      if (!cleanMes.includes(filterMes) && !filterMes.includes(cleanMes)) return false;
    }

    if (bulkNameSearch.trim()) {
      const search = bulkNameSearch.toLowerCase().trim();
      if (!lead.nome.toLowerCase().includes(search)) return false;
    }

    return true;
  });

  // Handle Select All/Deselect All in Bulk Tab
  const handleToggleSelectAll = () => {
    if (selectedLeads.length === filteredLeadsForBulk.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeadsForBulk.map(l => l.id));
    }
  };

  const handleToggleLeadSelect = (id: string) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(lId => lId !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  // Execute Bulk Broadcast Dispatch
  const handleStartBulkBroadcast = async () => {
    if (selectedLeads.length === 0) {
      toast.warning("Por favor, selecione pelo menos um lead para o disparo.");
      return;
    }

    if (!bulkMessage.trim()) {
      toast.warning("Por favor, preencha o texto da mensagem.");
      return;
    }

    if (bulkCanal === "EMAIL" && !bulkSubject.trim()) {
      toast.warning("Por favor, preencha o assunto do e-mail.");
      return;
    }

    const confirmed = await confirm(`Deseja iniciar o disparo em massa para os ${selectedLeads.length} leads selecionados?`);
    if (!confirmed) {
      return;
    }

    setIsDispatching(true);
    setDispatchLogs([]);
    setDispatchProgress({ current: 0, total: selectedLeads.length });

    const logMsg = (msg: string) => {
      const time = new Date().toLocaleTimeString("pt-BR");
      setDispatchLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    logMsg(`Iniciando transmissão de lote para ${selectedLeads.length} contatos por ${bulkCanal}...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedLeads.length; i++) {
      const leadId = selectedLeads[i];
      const lead = leads.find(l => l.id === leadId);
      
      if (!lead) {
        logMsg(`⚠️ Lead ID ${leadId} não encontrado localmente. Pulando.`);
        failCount++;
        setDispatchProgress(prev => ({ ...prev, current: i + 1 }));
        continue;
      }

      logMsg(`Disparando para ${lead.nome} (${bulkCanal === "EMAIL" ? lead.email : lead.link_celular || lead.telefone_limpo})...`);
      
      try {
        const res = await fetch(`/api/leads/${lead.id}/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canal: bulkCanal,
            mensagem: bulkMessage,
            assunto: bulkSubject,
            titulo_historico: `Transmissão em Massa: Broadcast`
          })
        });

        if (res.ok) {
          logMsg(`✅ Mensagem enviada com sucesso para ${lead.nome}.`);
          successCount++;
        } else {
          const err = await res.json();
          logMsg(`❌ Falha ao enviar para ${lead.nome}: ${err.error || "Erro na API"}`);
          failCount++;
        }
      } catch (e: any) {
        logMsg(`❌ Erro crítico de rede para ${lead.nome}: ${e.message}`);
        failCount++;
      }

      setDispatchProgress(prev => ({ ...prev, current: i + 1 }));
      
      // Delay to avoid spam block (using 1.5 seconds during simulation for rapid feed but organic feel)
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    logMsg(`🏁 Transmissão Concluída! Sucesso: ${successCount} | Falhas: ${failCount}`);
    setIsDispatching(false);
    setSelectedLeads([]);
    await onRefresh();
  };

  // Load Special Rule into Broadcast Message Template
  const loadSpecialRuleAsTemplate = (rule: SpecialRule) => {
    setBulkCanal(rule.canal);
    if (rule.canal === "EMAIL" && rule.assunto_template) {
      setBulkSubject(rule.assunto_template);
    }
    setBulkMessage(rule.mensagem_template);
    toast.success(`Regra "${rule.nome}" carregada com sucesso na tela de disparo em massa!`);
  };

  return (
    <div className="space-y-6">
      {/* Upper header banner */}
      <div 
        className="rounded-2xl p-5 sm:p-6 border transition-colors shadow-xs"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--crm-text)" }}
            >
              Ações Especiais, Campanhas & Disparo em Massa
            </h3>
            <p 
              className="text-xs mt-1.5 leading-relaxed max-w-3xl"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Gerencie ações de engajamento segmentadas. Configure <strong style={{ color: "var(--crm-text)" }}>Follow-ups Especiais (Regras Emergenciais)</strong> para abordar leads com datas próximas ou características específicas, ou utilize o <strong style={{ color: "var(--crm-text)" }}>Disparo em Massa (Broadcast)</strong> para transmitir comunicados rápidos para contatos filtrados por contexto comercial.
            </p>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div 
          className="flex flex-wrap gap-2 mt-5 pt-4 border-t"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <div
            className="flex overflow-x-auto max-w-full no-scrollbar whitespace-nowrap gap-1.5 p-1 rounded-xl border transition-colors w-full sm:w-fit"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <button
              type="button"
              onClick={() => setSubTab('special')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer ${
                subTab === 'special'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:opacity-85'
              }`}
              style={subTab !== 'special' ? { color: "var(--crm-text-secondary)" } : undefined}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Follow-ups Especiais & Emergenciais</span>
              <span 
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  subTab === 'special' ? 'bg-white/20 text-white' : 'border'
                }`}
                style={subTab !== 'special' ? { 
                  backgroundColor: "var(--crm-surface)", 
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-muted)" 
                } : undefined}
              >
                {rules.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('bulk')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-2 cursor-pointer ${
                subTab === 'bulk'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:opacity-85'
              }`}
              style={subTab !== 'bulk' ? { color: "var(--crm-text-secondary)" } : undefined}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Disparo em Massa / Broadcast</span>
              <span 
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  subTab === 'bulk' ? 'bg-white/20 text-white' : 'border'
                }`}
                style={subTab !== 'bulk' ? { 
                  backgroundColor: "var(--crm-surface)", 
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-muted)" 
                } : undefined}
              >
                {selectedLeads.length > 0 ? `${selectedLeads.length} selecionados` : `${filteredLeadsForBulk.length} elegíveis`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB TAB 1: SPECIAL AND EMERGENCY FOLLOW-UPS */}
      {subTab === 'special' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 
                className="text-sm font-bold tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                Regras de Follow-up Emergencial / Especial
              </h4>
              <p 
                className="text-xs mt-0.5"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Segmentação dinâmica para identificar leads prioritários e disparar ações individuais com mensagens personalizadas.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                if (isAddingRule) {
                  setEditingRuleId(null);
                  setRuleName("");
                  setRuleField("dias_casamento");
                  setRuleOperator("<");
                  setRuleValue("");
                  setRuleCanal("WHATSAPP");
                  setRuleSubject("");
                  setRuleMessage("");
                  setIsAddingRule(false);
                } else {
                  setIsAddingRule(true);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer border shadow-2xs sm:ml-auto"
              style={{
                backgroundColor: isAddingRule ? "var(--crm-surface-subtle)" : "var(--crm-surface)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            >
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{isAddingRule ? (editingRuleId ? "Cancelar Edição" : "Cancelar Cadastro") : "Cadastrar Nova Regra"}</span>
            </button>
          </div>

          {/* ADD/EDIT RULE FORM PANEL */}
          {isAddingRule && (
            <form 
              onSubmit={handleAddRule} 
              className="rounded-2xl p-5 sm:p-6 space-y-4 border shadow-xs transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)"
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--crm-border)" }}>
                <h5 
                  className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: "var(--crm-text)" }}
                >
                  <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{editingRuleId ? "Editar Gatilho Especial" : "Definição do Gatilho Especial"}</span>
                </h5>
                <span className="text-[11px] font-medium" style={{ color: "var(--crm-text-muted)" }}>
                  Campos obrigatórios com *
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                    Nome da Regra *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Casamento em menos de 45 dias"
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                    Campo para Filtro *
                  </label>
                  <select
                    value={ruleField}
                    onChange={e => {
                      const newField = e.target.value as SpecialRule['campo_gatilho'];
                      setRuleField(newField);
                      if (newField === "status_funil") {
                        if (ruleOperator === "<" || ruleOperator === ">") setRuleOperator("==");
                        if (!ruleValue || ruleValue === "45") setRuleValue("NOVO");
                      } else if (newField === "temperatura") {
                        if (ruleOperator === "<" || ruleOperator === ">") setRuleOperator("==");
                        if (!ruleValue) setRuleValue("QUENTE");
                      } else if (newField === "origem_portal") {
                        if (ruleOperator === "<" || ruleOperator === ">") setRuleOperator("==");
                        if (!ruleValue) setRuleValue("casamentos");
                      } else if (newField === "dias_casamento" || newField === "convidados") {
                        if (ruleOperator === "contem") setRuleOperator("<");
                        if (!ruleValue || isNaN(Number(ruleValue))) setRuleValue(newField === "dias_casamento" ? "45" : "100");
                      }
                    }}
                    className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  >
                    <option value="dias_casamento">📅 Dias Restantes para o Casamento</option>
                    <option value="convidados">👥 Quantidade de Convidados</option>
                    <option value="status_funil">🚦 Status Atual do Funil</option>
                    <option value="temperatura">🔥 Temperatura do Lead</option>
                    <option value="origem_portal">🌐 Portal de Origem</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                      Operador *
                    </label>
                    <select
                      value={ruleOperator}
                      onChange={e => setRuleOperator(e.target.value as any)}
                      className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)"
                      }}
                    >
                      {ruleField === "dias_casamento" || ruleField === "convidados" ? (
                        <>
                          <option value="<">menor que (&lt;)</option>
                          <option value=">">maior que (&gt;)</option>
                          <option value="==">igual a (==)</option>
                          <option value="!=">diferente de (!=)</option>
                        </>
                      ) : (
                        <>
                          <option value="==">igual a (==)</option>
                          <option value="!=">diferente de (!=)</option>
                          <option value="contem">contém (busca livre)</option>
                          <option value="<">menor que (&lt;)</option>
                          <option value=">">maior que (&gt;)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5 truncate" style={{ color: "var(--crm-text-secondary)" }}>
                      {ruleField === "status_funil" ? "Status Selecionado" : ruleField === "temperatura" ? "Temperatura" : ruleField === "origem_portal" ? "Portal" : "Valor Limite *"}
                    </label>
                    {ruleField === "status_funil" ? (
                      <select
                        value={ruleValue}
                        onChange={e => setRuleValue(e.target.value)}
                        className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer border"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)"
                        }}
                      >
                        <option value="NOVO">NOVO (Novo Lead)</option>
                        <option value="PRIMEIRO_CONTATO">PRIMEIRO CONTATO</option>
                        <option value="FOLLOWUP1">FOLLOW UP 1</option>
                        <option value="FOLLOWUP2">FOLLOW UP 2</option>
                        <option value="RESPONDIDO">RESPONDIDO / EM ATENDIMENTO</option>
                        <option value="ORCAMENTO_ENVIADO">ORÇAMENTO ENVIADO</option>
                        <option value="NEGOCIACAO">NEGOCIAÇÃO</option>
                        <option value="FECHOU">FECHOU / CLIENTE</option>
                        <option value="PERDIDO">PERDIDO</option>
                      </select>
                    ) : ruleField === "temperatura" ? (
                      <select
                        value={ruleValue}
                        onChange={e => setRuleValue(e.target.value)}
                        className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)"
                        }}
                      >
                        <option value="QUENTE">🔥 QUENTE</option>
                        <option value="MORNA">⚡ MORNA</option>
                        <option value="FRIA">❄️ FRIA</option>
                      </select>
                    ) : ruleField === "origem_portal" ? (
                      <select
                        value={ruleValue}
                        onChange={e => setRuleValue(e.target.value)}
                        className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)"
                        }}
                      >
                        <option value="casamentos">Casamentos.com.br</option>
                        <option value="portal_noivas">Portal de Noivas</option>
                        <option value="zankyou">Zankyou</option>
                        <option value="manual">Cadastro Manual / CRM</option>
                        {portals.map(p => (
                          <option key={p.id} value={p.id}>{p.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        required
                        placeholder={ruleField === "dias_casamento" ? "Ex: 45" : "Ex: 100"}
                        value={ruleValue}
                        onChange={e => setRuleValue(e.target.value)}
                        className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono border"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)"
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t my-2 pt-3" style={{ borderColor: "var(--crm-border)" }}>
                <h5 
                  className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: "var(--crm-text)" }}
                >
                  <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Mensagem e Canal de Envio</span>
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                    Canal de Contato *
                  </label>
                  <select
                    value={ruleCanal}
                    onChange={e => setRuleCanal(e.target.value as any)}
                    className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  >
                    <option value="WHATSAPP">🟢 WhatsApp API (Waha)</option>
                    <option value="EMAIL">📧 E-mail SMTP (Zoho)</option>
                  </select>
                </div>

                {ruleCanal === "EMAIL" && (
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                      Assunto do E-mail *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Assunto que o lead receberá"
                      value={ruleSubject}
                      onChange={e => setRuleSubject(e.target.value)}
                      className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)"
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--crm-text-secondary)" }}>
                    Template da Mensagem *
                  </label>
                  <span className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
                    Use a barra abaixo para escolher variáveis
                  </span>
                </div>

                <VariablePicker 
                  onInsert={(tag) => setRuleMessage(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + tag)} 
                  className="mb-2"
                />

                <textarea
                  required
                  rows={4}
                  placeholder="Olá {nome}, vimos que falta pouco ({dias_casamento} dias) para o seu grande dia no {local}. Quer fechar as lembrancinhas aromáticas? O valor total para {convidados} convidados fica {orcamento_vela_vidro}."
                  value={ruleMessage}
                  onChange={e => setRuleMessage(e.target.value)}
                  className="w-full rounded-xl p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRuleId(null);
                    setRuleName("");
                    setRuleField("dias_casamento");
                    setRuleOperator("<");
                    setRuleValue("");
                    setRuleCanal("WHATSAPP");
                    setRuleSubject("");
                    setRuleMessage("");
                    setIsAddingRule(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border hover:opacity-85"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                >
                  {editingRuleId ? "Salvar Alterações" : "Salvar Regra Especial"}
                </button>
              </div>
            </form>
          )}

          {/* LIST OF REGISTERED SPECIAL RULES */}
          {loadingSettings ? (
            <div 
              className="flex justify-center p-12 rounded-2xl border transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)"
              }}
            >
              <span className="text-xs font-mono" style={{ color: "var(--crm-text-muted)" }}>
                Buscando regras e parâmetros no banco...
              </span>
            </div>
          ) : rules.length === 0 ? (
            <div 
              className="rounded-2xl p-10 text-center text-xs shadow-xs border transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
            >
              Nenhum follow-up especial configurado ainda. Clique em "Cadastrar Nova Regra" acima para criar as regras emergenciais de atendimento (ex: casamento muito próximo).
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => {
                const eligibleLeads = leads.filter(lead => isLeadEligible(lead, rule));
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <div 
                    key={rule.id} 
                    className="rounded-2xl overflow-hidden transition-all duration-200 border shadow-xs"
                    style={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)"
                    }}
                  >
                    {/* Header info bar */}
                    <div 
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)"
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          rule.canal === "WHATSAPP" 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                        }`}>
                          {rule.canal === "WHATSAPP" ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 
                            className="text-sm font-bold flex flex-wrap items-center gap-2"
                            style={{ color: "var(--crm-text)" }}
                          >
                            <span>{rule.nome}</span>
                            <span 
                              className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono uppercase tracking-wide"
                            >
                              {rule.campo_gatilho} {rule.operador} {rule.valor_gatilho}
                            </span>
                          </h5>
                          <p 
                            className="text-xs mt-1 max-w-xl line-clamp-1"
                            style={{ color: "var(--crm-text-secondary)" }}
                          >
                            {rule.mensagem_template}
                          </p>
                        </div>
                      </div>

                      {/* Right action tools */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span 
                          className="text-xs font-mono px-2.5 py-1.5 rounded-lg border font-medium"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)"
                          }}
                        >
                          🎯 {eligibleLeads.length} {eligibleLeads.length === 1 ? "lead elegível" : "leads elegíveis"}
                        </span>

                        <button
                          type="button"
                          onClick={() => loadSpecialRuleAsTemplate(rule)}
                          className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer hover:opacity-85 shadow-2xs"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)"
                          }}
                          title="Carregar esta regra no Disparo em Massa"
                        >
                          Usar em Lote
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                          className="p-1.5 rounded-lg transition cursor-pointer border hover:opacity-85"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }}
                          title={isExpanded ? "Recolher lista de leads" : "Expandir lista de leads"}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditingRule(rule)}
                          className="p-1.5 rounded-lg transition border hover:opacity-85 cursor-pointer"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }}
                          title="Editar e visualizar esta regra"
                        >
                          <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg transition border hover:bg-rose-500/10 cursor-pointer"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }}
                          title="Excluir regra"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable list of eligible leads */}
                    {isExpanded && (
                      <div 
                        className="p-4 sm:p-5 animate-fade-in space-y-3 border-t"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)"
                        }}
                      >
                        <div 
                          className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider pb-2 border-b"
                          style={{
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text-secondary)"
                          }}
                        >
                          <span>Leads que cumprem a condição ({eligibleLeads.length})</span>
                          <span>Ação Manual</span>
                        </div>

                        {eligibleLeads.length === 0 ? (
                          <p 
                            className="text-xs text-center py-6"
                            style={{ color: "var(--crm-text-muted)" }}
                          >
                            Nenhum lead elegível com as condições atuais.
                          </p>
                        ) : (
                          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {eligibleLeads.map((lead) => {
                              const daysLeft = getDaysToWedding(lead);
                              const keyStr = `${lead.id}-${rule.id}`;
                              const isSendingThis = sendingLeadId === keyStr;

                              return (
                                <div 
                                  key={lead.id} 
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border text-xs transition-colors"
                                  style={{
                                    backgroundColor: "var(--crm-surface)",
                                    borderColor: "var(--crm-border)"
                                  }}
                                >
                                  <div className="space-y-1">
                                    <div 
                                      className="font-semibold flex items-center gap-2"
                                      style={{ color: "var(--crm-text)" }}
                                    >
                                      <span>{lead.nome}</span>
                                      {daysLeft !== null && (
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                                          daysLeft <= 30 
                                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25" 
                                            : "border"
                                        }`}
                                        style={daysLeft > 30 ? {
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text-secondary)"
                                        } : undefined}
                                        >
                                          Faltam {daysLeft} dias
                                        </span>
                                      )}
                                    </div>
                                    <div 
                                      className="text-[11px] flex flex-wrap items-center gap-3"
                                      style={{ color: "var(--crm-text-secondary)" }}
                                    >
                                      <span>💍 {lead.local || "Local não informado"}</span>
                                      <span>👥 {lead.convidados} convidados</span>
                                      <span 
                                        className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded border"
                                        style={{
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text)"
                                        }}
                                      >
                                        {lead.status_funil}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleSendSpecial(lead, rule)}
                                    disabled={isSendingThis}
                                    className={`px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0 ${
                                      rule.canal === "WHATSAPP" 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                        : "bg-sky-600 hover:bg-sky-700 text-white"
                                    }`}
                                  >
                                    <Send className={`w-3.5 h-3.5 ${isSendingThis ? "animate-spin" : ""}`} />
                                    <span>{isSendingThis ? "Disparando..." : `Mandar ${rule.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}`}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 2: BULK BROADCAST DISPATCHER */}
      {subTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: CRITERIA, CONFIGURATION & MESSAGE EDITOR */}
          <div 
            className="lg:col-span-5 rounded-2xl p-5 sm:p-6 space-y-5 border shadow-xs transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)"
            }}
          >
            <div>
              <h4 
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: "var(--crm-text)" }}
              >
                <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>1. Filtrar Contexto de Disparo</span>
              </h4>
              <p 
                className="text-xs mt-1"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Selecione os parâmetros para segmentar a lista de envio.
              </p>
            </div>

            {/* Quick Context Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Status Funil
                </label>
                <select
                  value={bulkFilterStatus}
                  onChange={e => {
                    setBulkFilterStatus(e.target.value);
                    setSelectedLeads([]);
                  }}
                  className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="NOVO">NOVO</option>
                  <option value="PRIMEIRO_CONTATO">PRIMEIRO CONTATO</option>
                  <option value="FOLLOWUP1">FOLLOW UP 1</option>
                  <option value="FOLLOWUP2">FOLLOW UP 2</option>
                  <option value="RESPONDIDO">RESPONDIDO</option>
                  <option value="FECHOU">FECHOU</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Temperatura
                </label>
                <select
                  value={bulkFilterTemp}
                  onChange={e => {
                    setBulkFilterTemp(e.target.value);
                    setSelectedLeads([]);
                  }}
                  className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  <option value="ALL">Todas as Temps</option>
                  <option value="QUENTE">🔥 QUENTE</option>
                  <option value="MORNA">⚡ MORNA</option>
                  <option value="FRIA">❄️ FRIA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Mês do Evento
                </label>
                <select
                  value={bulkFilterMonth}
                  onChange={e => {
                    setBulkFilterMonth(e.target.value);
                    setSelectedLeads([]);
                  }}
                  className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  <option value="ALL">Todos os Meses</option>
                  <option value="Janeiro">Janeiro</option>
                  <option value="Fevereiro">Fevereiro</option>
                  <option value="Março">Março</option>
                  <option value="Abril">Abril</option>
                  <option value="Maio">Maio</option>
                  <option value="Junho">Junho</option>
                  <option value="Julho">Julho</option>
                  <option value="Agosto">Agosto</option>
                  <option value="Setembro">Setembro</option>
                  <option value="Outubro">Outubro</option>
                  <option value="Novembro">Novembro</option>
                  <option value="Dezembro">Dezembro</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                  Canal Origem
                </label>
                <select
                  value={bulkFilterPortal}
                  onChange={e => {
                    setBulkFilterPortal(e.target.value);
                    setSelectedLeads([]);
                  }}
                  className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                >
                  <option value="ALL">Todas as Origens</option>
                  {portals.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-4" style={{ borderColor: "var(--crm-border)" }}>
              <h4 
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                style={{ color: "var(--crm-text)" }}
              >
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>2. Configurar Mensagem</span>
              </h4>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--crm-text-secondary)" }}>
                  Canal de Envio *
                </label>
                <div className="flex flex-wrap gap-3">
                  <label 
                    className={`flex items-center gap-2.5 text-xs cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all ${
                      bulkCanal === 'WHATSAPP' 
                        ? 'border-indigo-500/40 shadow-xs' 
                        : 'border-transparent hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: bulkCanal === 'WHATSAPP' ? "var(--crm-surface-subtle)" : "var(--crm-surface-subtle)",
                      color: "var(--crm-text)",
                      borderColor: bulkCanal === 'WHATSAPP' ? "var(--crm-primary)" : "var(--crm-border)"
                    }}
                  >
                    <input
                      type="radio"
                      name="bulkCanal"
                      checked={bulkCanal === 'WHATSAPP'}
                      onChange={() => setBulkCanal('WHATSAPP')}
                      className="accent-indigo-600"
                    />
                    <span className="font-semibold">WhatsApp API (Waha)</span>
                  </label>
                  <label 
                    className={`flex items-center gap-2.5 text-xs cursor-pointer px-3.5 py-2.5 rounded-xl border transition-all ${
                      bulkCanal === 'EMAIL' 
                        ? 'border-indigo-500/40 shadow-xs' 
                        : 'border-transparent hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: bulkCanal === 'EMAIL' ? "var(--crm-surface-subtle)" : "var(--crm-surface-subtle)",
                      color: "var(--crm-text)",
                      borderColor: bulkCanal === 'EMAIL' ? "var(--crm-primary)" : "var(--crm-border)"
                    }}
                  >
                    <input
                      type="radio"
                      name="bulkCanal"
                      checked={bulkCanal === 'EMAIL'}
                      onChange={() => setBulkCanal('EMAIL')}
                      className="accent-indigo-600"
                    />
                    <span className="font-semibold">E-mail (SMTP Zoho)</span>
                  </label>
                </div>
              </div>

              {bulkCanal === "EMAIL" && (
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--crm-text-secondary)" }}>
                    Assunto do E-mail *
                  </label>
                  <input
                    type="text"
                    value={bulkSubject}
                    onChange={e => setBulkSubject(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--crm-text-secondary)" }}>
                    Texto / Mensagem *
                  </label>
                  <span className="text-[11px]" style={{ color: "var(--crm-text-muted)" }}>
                    Suporta variáveis dinâmicas
                  </span>
                </div>

                <VariablePicker 
                  onInsert={(tag) => setBulkMessage(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + tag)} 
                  className="mb-2"
                />

                <textarea
                  rows={6}
                  value={bulkMessage}
                  onChange={e => setBulkMessage(e.target.value)}
                  className="w-full rounded-xl p-3 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                  placeholder="Olá {nome}, preparamos um orçamento especial para o seu evento em {local} ({mes_casamento}). O total fica {orcamento_vela_vidro}..."
                />
              </div>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handleStartBulkBroadcast}
                disabled={isDispatching || selectedLeads.length === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isDispatching ? "Disparando Lote..." : `Disparar para ${selectedLeads.length} Selecionados`}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: RECIPIENTS SELECTION LIST */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* PROGRESS BAR & LIVE RUNS LOGS IF DISPATCHING */}
            {isDispatching && (
              <div 
                className="rounded-2xl p-5 space-y-3 shadow-xs animate-fade-in border"
                style={{
                  backgroundColor: "var(--crm-surface)",
                  borderColor: "var(--crm-primary-border)"
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>Progresso do Disparo em Massa</span>
                  </h4>
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--crm-text)" }}>
                    {dispatchProgress.current} de {dispatchProgress.total} ({Math.round((dispatchProgress.current / dispatchProgress.total) * 100)}%)
                  </span>
                </div>

                <div 
                  className="w-full h-2.5 rounded-full overflow-hidden border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)"
                  }}
                >
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full" 
                    style={{ width: `${(dispatchProgress.current / dispatchProgress.total) * 100}%` }}
                  />
                </div>

                <div 
                  className="rounded-xl p-3 h-32 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-secondary)"
                  }}
                >
                  {dispatchLogs.map((log, index) => (
                    <div key={index} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            )}

            <div 
              className="rounded-2xl p-5 sm:p-6 space-y-4 border shadow-xs transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)"
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    style={{ color: "var(--crm-text)" }}
                  >
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>3. Selecionar Destinatários ({filteredLeadsForBulk.length} Filtrados)</span>
                  </h4>
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    {selectedLeads.length} de {filteredLeadsForBulk.length} contatos selecionados
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-semibold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  {selectedLeads.length === filteredLeadsForBulk.length ? "Desmarcar Todos" : "Marcar Todos"}
                </button>
              </div>

              {/* Simple name filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar destinatários por nome..."
                  value={bulkNameSearch}
                  onChange={(e) => setBulkNameSearch(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-16 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border transition-colors"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)"
                  }}
                />
                <Filter className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                {bulkNameSearch && (
                  <button
                    type="button"
                    onClick={() => setBulkNameSearch("")}
                    className="text-[11px] font-mono absolute right-3 top-2.5 px-2 py-0.5 rounded border transition hover:opacity-85 cursor-pointer"
                    style={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)"
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {filteredLeadsForBulk.length === 0 ? (
                <div 
                  className="text-center p-12 text-xs rounded-xl border"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-muted)"
                  }}
                >
                  Nenhum lead cumpre as condições de filtros especificadas.
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredLeadsForBulk.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id);

                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => handleToggleLeadSelect(lead.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                          isSelected 
                            ? "border-indigo-500/40 shadow-xs" 
                            : "hover:opacity-95"
                        }`}
                        style={{
                          backgroundColor: isSelected 
                            ? "var(--crm-surface-subtle)" 
                            : "var(--crm-surface)",
                          borderColor: isSelected 
                            ? "var(--crm-primary-border)" 
                            : "var(--crm-border)"
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`p-0.5 rounded transition ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"}`}
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                          
                          <div className="space-y-0.5">
                            <span 
                              className="text-xs font-semibold block"
                              style={{ color: "var(--crm-text)" }}
                            >
                              {lead.nome}
                            </span>
                            <span 
                              className="text-[10px] flex flex-wrap items-center gap-2"
                              style={{ color: "var(--crm-text-secondary)" }}
                            >
                              <span>💍 {lead.local || "Não inf."}</span>
                              <span>📅 {lead.data_casamento || "Sem data"}</span>
                              <span>👥 {lead.convidados} conv.</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span 
                            className="text-[9px] border px-2 py-0.5 rounded font-mono uppercase font-medium"
                            style={{
                              backgroundColor: "var(--crm-surface-subtle)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text-secondary)"
                            }}
                          >
                            {lead.status_funil}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${
                            String(lead.temperatura || "").toUpperCase() === "QUENTE" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25" :
                            String(lead.temperatura || "").toUpperCase() === "MORNA" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25" :
                            String(lead.temperatura || "").toUpperCase() === "CLIENTE" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" :
                            "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25"
                          }`}>
                            {String(lead.temperatura || "FRIA").toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
