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
      case "==":
        return String(leadValue).toUpperCase() === String(ruleVal).toUpperCase();
      case "!=":
        return String(leadValue).toUpperCase() !== String(ruleVal).toUpperCase();
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#89F0B2] animate-bounce" />
          Ações Especiais, Campanhas & Disparo em Massa (Broadcast)
        </h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Esta tela foi projetada para lidar com ações de engajamento customizadas. Configure 
          <strong> Follow-ups Especiais (Regras Emergenciais)</strong> para identificar leads com datas de casamento próximas ou características específicas, 
          ou acesse o <strong>Disparo em Massa (Broadcast)</strong> para transmitir comunicados rápidos para múltiplos contatos filtrados por contexto.
        </p>

        {/* Tab switch buttons */}
        <div className="flex gap-2 mt-5 border-t border-zinc-800/60 pt-4">
          <button
            onClick={() => setSubTab('special')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-2 ${
              subTab === 'special'
                ? 'bg-[#89F0B2] text-zinc-950 font-bold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Follow-ups Especiais & Emergenciais
          </button>

          <button
            onClick={() => setSubTab('bulk')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-2 ${
              subTab === 'bulk'
                ? 'bg-[#89F0B2] text-zinc-950 font-bold'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
          >
            <Users className="w-4 h-4" />
            Disparo em Massa / Broadcast
          </button>
        </div>
      </div>

      {/* SUB TAB 1: SPECIAL AND EMERGENCY FOLLOW-UPS */}
      {subTab === 'special' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-white">Regras de Follow-up Emergencial / Especial</h4>
              <p className="text-xs text-zinc-400">Regras dinâmicas para segmentar e disparar mensagens com ações manuais individuais.</p>
            </div>
            
            <button
              onClick={() => {
                if (isAddingRule) {
                  // Cancel adding/editing
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
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 text-xs font-semibold flex items-center gap-2 transition ml-auto"
            >
              <Plus className="w-4 h-4 text-[#89F0B2]" />
              {isAddingRule ? (editingRuleId ? "Cancelar Edição" : "Cancelar Cadastro") : "Cadastrar Nova Regra"}
            </button>
          </div>

          {/* ADD RULE FORM PANEL */}
          {isAddingRule && (
            <form onSubmit={handleAddRule} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 animate-fade-in">
              <h5 className="text-sm font-semibold text-[#89F0B2] flex items-center gap-2">
                <Settings className="w-4 h-4" />
                {editingRuleId ? "Editar Gatilho Especial" : "Definição do Gatilho Especial"}
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Nome da Regra</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Casamento em menos de 45 dias"
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Selecione o Campo para Filtro</label>
                  <select
                    value={ruleField}
                    onChange={e => setRuleField(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
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
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Operador</label>
                    <select
                      value={ruleOperator}
                      onChange={e => setRuleOperator(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                    >
                      <option value="<">menor que (&lt;)</option>
                      <option value=">">maior que (&gt;)</option>
                      <option value="==" font-mono="true">igual a (==)</option>
                      <option value="!=">diferente de (!=)</option>
                      <option value="contem">contém (busca livre)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Valor Limite</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 45 ou FECHOU"
                      value={ruleValue}
                      onChange={e => setRuleValue(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800/80 my-2 pt-3">
                <h5 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#89F0B2]" />
                  Mensagem e Canal de Envio
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Canal de Contato</label>
                  <select
                    value={ruleCanal}
                    onChange={e => setRuleCanal(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                  >
                    <option value="WHATSAPP">🟢 WhatsApp API (Waha)</option>
                    <option value="EMAIL">📧 E-mail SMTP (Zoho)</option>
                  </select>
                </div>

                {ruleCanal === "EMAIL" && (
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Assunto do E-mail</label>
                    <input
                      type="text"
                      required
                      placeholder="Assunto que o lead receberá"
                      value={ruleSubject}
                      onChange={e => setRuleSubject(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">Template da Mensagem</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Use a barra abaixo para escolher variáveis</span>
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white font-sans focus:outline-none focus:border-[#89F0B2]/50 leading-relaxed"
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
                  className="px-4 py-2 rounded-lg bg-transparent hover:bg-zinc-850 text-zinc-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#89F0B2] text-zinc-950 font-bold text-xs transition"
                >
                  {editingRuleId ? "Salvar Alterações" : "Salvar Regra Especial"}
                </button>
              </div>
            </form>
          )}

          {/* LIST OF REGISTERED SPECIAL RULES */}
          {loadingSettings ? (
            <div className="flex justify-center p-8">
              <span className="text-xs text-zinc-500">Buscando regras e parâmetros no banco...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-8 text-center text-zinc-500 text-xs">
              Nenhum follow-up especial configurado ainda. Clique em "Cadastrar Nova Regra" acima para criar as regras emergenciais de atendimento (ex: casamento muito próximo).
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => {
                const eligibleLeads = leads.filter(lead => isLeadEligible(lead, rule));
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <div key={rule.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300">
                    {/* Header info bar */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-850/40 border-b border-zinc-850">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          rule.canal === "WHATSAPP" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
                        }`}>
                          {rule.canal === "WHATSAPP" ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                            {rule.nome}
                            <span className="text-[10px] bg-[#89F0B2]/10 text-[#89F0B2] px-1.5 py-0.5 rounded font-mono uppercase">
                              {rule.campo_gatilho} {rule.operador} {rule.valor_gatilho}
                            </span>
                          </h5>
                          <p className="text-xs text-zinc-400 mt-0.5 max-w-xl truncate">{rule.mensagem_template}</p>
                        </div>
                      </div>

                      {/* Right action tools */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800">
                          🎯 {eligibleLeads.length} leads elegíveis
                        </span>

                        <button
                          onClick={() => loadSpecialRuleAsTemplate(rule)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-[11px] text-zinc-300 hover:text-white transition"
                          title="Carregar esta regra no Disparo em Massa"
                        >
                          Usar em Lote
                        </button>

                        <button
                          onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => startEditingRule(rule)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-[#89F0B2] rounded transition border border-transparent hover:border-zinc-700/50"
                          title="Editar e visualizar esta regra"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded transition border border-transparent hover:border-red-900/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable list of eligible leads */}
                    {isExpanded && (
                      <div className="p-4 bg-zinc-950/40 animate-fade-in space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-900">
                          <span>Lista de Leads que cumprem a condição da regra</span>
                          <span>Ações Individuais Manuais</span>
                        </div>

                        {eligibleLeads.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-4">Nenhum lead elegível com as condições atuais.</p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {eligibleLeads.map((lead) => {
                              const daysLeft = getDaysToWedding(lead);
                              const keyStr = `${lead.id}-${rule.id}`;
                              const isSendingThis = sendingLeadId === keyStr;

                              return (
                                <div key={lead.id} className="flex items-center justify-between bg-zinc-900 p-2.5 rounded-lg border border-zinc-850 hover:border-zinc-800 text-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold text-white flex items-center gap-2">
                                      {lead.nome}
                                      {daysLeft !== null && (
                                        <span className={`text-[10px] font-mono px-1 rounded ${
                                          daysLeft <= 30 ? "bg-red-500/10 text-red-400 font-bold" : "bg-zinc-800 text-zinc-400"
                                        }`}>
                                          Faltam {daysLeft} dias
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 flex items-center gap-3">
                                      <span>💍 {lead.local || "Local não informado"}</span>
                                      <span>👥 {lead.convidados} convidados</span>
                                      <span>🚦 {lead.status_funil}</span>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleSendSpecial(lead, rule)}
                                    disabled={isSendingThis}
                                    className={`px-3 py-1.5 rounded-md font-bold text-[11px] flex items-center gap-1.5 transition ${
                                      rule.canal === "WHATSAPP" 
                                        ? "bg-emerald-500 hover:bg-emerald-600 text-zinc-950" 
                                        : "bg-[#89F0B2] hover:bg-[#72e29e] text-zinc-950"
                                    }`}
                                  >
                                    <Send className={`w-3.5 h-3.5 ${isSendingThis ? "animate-spin" : ""}`} />
                                    {isSendingThis ? "Disparando..." : `Mandar ${rule.canal === "WHATSAPP" ? "WhatsApp" : "E-mail"}`}
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
          <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#89F0B2]" />
              1. Filtrar Contexto de Disparo
            </h4>

            {/* Quick Context Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Status Funil</label>
                <select
                  value={bulkFilterStatus}
                  onChange={e => {
                    setBulkFilterStatus(e.target.value);
                    setSelectedLeads([]); // Reset selection
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
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
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Temperatura</label>
                <select
                  value={bulkFilterTemp}
                  onChange={e => {
                    setBulkFilterTemp(e.target.value);
                    setSelectedLeads([]); // Reset selection
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="ALL">Todas as Temps</option>
                  <option value="QUENTE">🔥 QUENTE</option>
                  <option value="MORNA">⚡ MORNA</option>
                  <option value="FRIA">❄️ FRIA</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Mês do Casamento</label>
                <select
                  value={bulkFilterMonth}
                  onChange={e => {
                    setBulkFilterMonth(e.target.value);
                    setSelectedLeads([]); // Reset selection
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
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
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Canal Origem</label>
                <select
                  value={bulkFilterPortal}
                  onChange={e => {
                    setBulkFilterPortal(e.target.value);
                    setSelectedLeads([]); // Reset selection
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="ALL">Todas as Origens</option>
                  {portals.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-zinc-800 my-1 pt-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#89F0B2]" />
                2. Configurar Transmissão
              </h4>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Canal de Envio</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="bulkCanal"
                      checked={bulkCanal === 'WHATSAPP'}
                      onChange={() => setBulkCanal('WHATSAPP')}
                      className="accent-[#89F0B2]"
                    />
                    🟢 WhatsApp API (Waha)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="bulkCanal"
                      checked={bulkCanal === 'EMAIL'}
                      onChange={() => setBulkCanal('EMAIL')}
                      className="accent-[#89F0B2]"
                    />
                    📧 E-mail (Zoho SMTP)
                  </label>
                </div>
              </div>

              {bulkCanal === "EMAIL" && (
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1">Assunto do E-mail</label>
                  <input
                    type="text"
                    value={bulkSubject}
                    onChange={e => setBulkSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono text-zinc-400">Texto / Corpo da Mensagem</label>
                  <span className="text-[9px] text-zinc-500 font-mono">Suporta todas as variáveis do sistema</span>
                </div>

                <VariablePicker 
                  onInsert={(tag) => setBulkMessage(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + tag)} 
                  className="mb-2"
                />

                <textarea
                  rows={6}
                  value={bulkMessage}
                  onChange={e => setBulkMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-white font-sans leading-relaxed focus:outline-none focus:border-[#89F0B2]/50"
                  placeholder="Olá {nome}, preparamos um orçamento especial para o seu evento em {local} ({mes_casamento}). O total fica {orcamento_vela_vidro}..."
                />
              </div>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handleStartBulkBroadcast}
                disabled={isDispatching || selectedLeads.length === 0}
                className="w-full py-2.5 rounded-xl bg-[#89F0B2] hover:bg-[#72e29e] disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-550 font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-zinc-950" />
                {isDispatching ? "Disparando Lote..." : `Disparar para ${selectedLeads.length} Selecionados`}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: RECIPIENTS SELECTION LIST */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* PROGRESS BAR & LIVE RUNS LOGS IF DISPATCHING */}
            {isDispatching && (
              <div className="bg-zinc-900 border border-[#89F0B2]/20 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#89F0B2] flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-[#89F0B2]" />
                    Progresso do Disparo
                  </h4>
                  <span className="text-xs text-zinc-400 font-mono">
                    {dispatchProgress.current} de {dispatchProgress.total} ({Math.round((dispatchProgress.current / dispatchProgress.total) * 100)}%)
                  </span>
                </div>

                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-[#89F0B2] transition-all duration-300" 
                    style={{ width: `${(dispatchProgress.current / dispatchProgress.total) * 100}%` }}
                  />
                </div>

                <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1">
                  {dispatchLogs.map((log, index) => (
                    <div key={index} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#89F0B2]" />
                  3. Selecionar Destinatários ({filteredLeadsForBulk.length} Filtrados)
                </h4>

                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[11px] font-bold text-[#89F0B2] hover:text-[#72e29e]"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#89F0B2]/50"
                />
                <Filter className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                {bulkNameSearch && (
                  <button
                    type="button"
                    onClick={() => setBulkNameSearch("")}
                    className="text-[10px] text-zinc-400 hover:text-white absolute right-2.5 top-2.5"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {filteredLeadsForBulk.length === 0 ? (
                <div className="text-center p-8 text-zinc-500 text-xs">
                  Nenhum lead cumpre as condições de filtros especificadas na coluna esquerda.
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {filteredLeadsForBulk.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id);

                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => handleToggleLeadSelect(lead.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? "bg-zinc-800/80 border-[#89F0B2]/30 text-white" 
                            : "bg-zinc-950/40 border-zinc-850 hover:border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`p-0.5 rounded transition ${isSelected ? "text-[#89F0B2]" : "text-zinc-600"}`}
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                          
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold block text-white">{lead.nome}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-2">
                              <span>💍 {lead.local || "Não inf."}</span>
                              <span>📅 {lead.data_casamento || "Sem data"}</span>
                              <span>👥 {lead.convidados} conv.</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase font-mono">
                            {lead.status_funil}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                            String(lead.temperatura || "").toUpperCase() === "QUENTE" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            String(lead.temperatura || "").toUpperCase() === "MORNA" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            String(lead.temperatura || "").toUpperCase() === "CLIENTE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            "bg-sky-500/10 text-sky-400 border border-sky-500/20"
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
