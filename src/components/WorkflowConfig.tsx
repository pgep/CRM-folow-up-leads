/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Settings, Save, RefreshCw, MessageSquare, Mail, Play, AlertCircle, HelpCircle, 
  Eye, EyeOff, Sliders, Server, Link2, ShieldCheck, Lock,
  Plus, ArrowUp, ArrowDown, Trash2, Bold, Italic, Link, Smile, ListOrdered, CheckSquare, X,
  GripVertical, Clock, Sparkles
} from "lucide-react";
import { WorkflowStage, LeadStatus, LeadEtapa, LeadTemperatura } from "../types";
import CommunicationSetup from "./CommunicationSetup";
import AutoTriggerSetup from "./AutoTriggerSetup";
import OptionsListsSetup from "./OptionsListsSetup";
import VariablePicker from "./VariablePicker";
import { useToast } from "./Toast";

const generateIdFromFriendlyName = (name: string): string => {
  return name
    .trim()
    .normalize("NFD") // Decomposes accented characters into base letters + accents
    .replace(/[\u0300-\u036f]/g, "") // Removes accent markings
    .toUpperCase()
    .replace(/\s+/g, "_") // Replaces spaces with underscores
    .replace(/[^A-Z0-9_]/g, "") // Removes any remaining non-alphanumeric/non-underscore characters
    .replace(/_+/g, "_") // Collapses multiple consecutive underscores
    .replace(/(^_|_$)/g, ""); // Trims leading/trailing underscores
};

interface WorkflowConfigProps {
  stages: WorkflowStage[];
  onUpdateStage: (stage: WorkflowStage | WorkflowStage[]) => Promise<void>;
  onReset: () => Promise<void>;
}

export default function WorkflowConfig({ stages, onUpdateStage, onReset }: WorkflowConfigProps) {
  const { toast, confirm } = useToast();
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"followup" | "scheduler" | "general" | "lists">("followup");

  // --- STAGES / FOLLOWUP STATE ---
  const [selectedEtapa, setSelectedEtapa] = useState<LeadEtapa>("SEM_CONTATO");
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Find the selected stage configuration
  const currentStage = stages.find((s) => s.etapa === selectedEtapa);

  // Form states for stage config
  const [descricao, setDescricao] = useState("");
  const [canal, setCanal] = useState<"WHATSAPP" | "EMAIL" | null>(null);
  const [esperarDias, setEsperarDias] = useState(0);
  const [proximoStatus, setProximoStatus] = useState<LeadStatus | "">("");
  const [temperatura, setTemperatura] = useState<LeadTemperatura>("FRIA");
  const [mensagemTemplate, setMensagemTemplate] = useState("");
  const [assuntoTemplate, setAssuntoTemplate] = useState("");
  const [ordem, setOrdem] = useState<number>(0);

  // Concurrency notifications and drag & drop states
  const [concurrencyNotice, setConcurrencyNotice] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Load products
  useEffect(() => {
    fetch("/api/products")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error("Erro ao carregar produtos no workflow:", err));
  }, []);

  // Sync form state when selection changes
  useEffect(() => {
    if (currentStage) {
      setDescricao(currentStage.descricao || "");
      setCanal(currentStage.canal);
      setEsperarDias(currentStage.esperar_dias || 0);
      setProximoStatus(currentStage.proximo_status || "");
      setTemperatura(currentStage.temperatura || "FRIA");
      setMensagemTemplate(currentStage.mensagem_template || "");
      setAssuntoTemplate(currentStage.assunto_template || "");
      setOrdem(currentStage.ordem || 0);
    }
  }, [selectedEtapa, stages]);

  // --- HELPERS FOR CURSOR INSERTION & FORMATTING ---
  const insertTextAtCursor = (text: string, elementId = "mensagem-template-textarea") => {
    const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
    if (!textarea) {
      if (elementId === "mensagem-template-textarea") {
        setMensagemTemplate(prev => prev + text);
      } else if (elementId === "new-mensagem-template") {
        setNewMensagemTemplate(prev => prev + text);
      }
      return;
    }
    
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    
    let currentVal = "";
    let setValFunc: React.Dispatch<React.SetStateAction<string>> | null = null;
    
    if (elementId === "mensagem-template-textarea") {
      currentVal = mensagemTemplate;
      setValFunc = setMensagemTemplate;
    } else if (elementId === "new-mensagem-template") {
      currentVal = newMensagemTemplate;
      setValFunc = setNewMensagemTemplate;
    } else {
      currentVal = newMensagemTemplate;
      setValFunc = setNewMensagemTemplate;
    }

    const beforeText = currentVal.substring(0, startPos);
    const afterText = currentVal.substring(endPos, currentVal.length);
    
    const newText = beforeText + text + afterText;
    setValFunc(newText);
    
    // Refocus and reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + text.length;
      textarea.selectionEnd = startPos + text.length;
    }, 50);
  };

  const handleFormatText = (type: "bold" | "italic" | "link", elementId = "mensagem-template-textarea") => {
    const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    
    const currentVal = elementId === "mensagem-template-textarea" ? mensagemTemplate : newMensagemTemplate;
    const currentCanal = elementId === "mensagem-template-textarea" ? canal : newCanal;
    
    const selectedText = currentVal.substring(startPos, endPos) || "texto";
    
    let formatted = "";
    if (type === "bold") {
      formatted = currentCanal === "EMAIL" ? `<strong>${selectedText}</strong>` : `*${selectedText}*`;
    } else if (type === "italic") {
      formatted = currentCanal === "EMAIL" ? `<em>${selectedText}</em>` : `_${selectedText}_`;
    } else if (type === "link") {
      formatted = currentCanal === "EMAIL" 
        ? `<a href="https://exemplo.com" class="text-amber-500 underline" target="_blank">${selectedText || "link"}</a>` 
        : `${selectedText || "link"} (https://exemplo.com)`;
    }
    
    insertTextAtCursor(formatted, elementId);
  };

  // --- WORKFLOW QUEUE BUILDER LOGIC ---
  const getOrderedStages = (allStages: WorkflowStage[]) => {
    // If any stages don't have an ordem field or they are all 0, construct their order using the old linked-list traversal
    const hasOrdem = allStages.some(s => typeof s.ordem === 'number' && s.ordem > 0);
    
    if (!hasOrdem) {
      const ordered: WorkflowStage[] = [];
      const visited = new Set<string>();
      let current = allStages.find(s => s.etapa === "SEM_CONTATO") || allStages[0];
      
      while (current && !visited.has(current.etapa)) {
        ordered.push(current);
        visited.add(current.etapa);
        if (!current.proxima_etapa || current.proxima_etapa === current.etapa || current.proxima_etapa === "ENCERRADO") {
          break;
        }
        const next = allStages.find(s => s.etapa === current.proxima_etapa);
        if (next) {
          current = next;
        } else {
          break;
        }
      }
      
      const encerradoStage = allStages.find(s => s.etapa === "ENCERRADO");
      if (encerradoStage && !visited.has("ENCERRADO")) {
        ordered.push(encerradoStage);
        visited.add("ENCERRADO");
      }
      
      allStages.forEach(s => {
        if (!visited.has(s.etapa)) {
          ordered.push(s);
          visited.add(s.etapa);
        }
      });

      // Assign sequential order
      return ordered.map((s, idx) => ({
        ...s,
        ordem: idx + 1
      }));
    }

    // Otherwise, simply sort by ordem
    return [...allStages].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
  };

  const rebuildSequencePointers = (allStages: WorkflowStage[], preserveInputOrder = false): WorkflowStage[] => {
    const ordered = preserveInputOrder
      ? [...allStages]
      : [...allStages].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
    return ordered.map((stage, idx) => {
      const nextStage = ordered[idx + 1];
      return {
        ...stage,
        ordem: idx + 1, // Reset to sequential order clean index
        proxima_etapa: stage.etapa === "ENCERRADO" ? "ENCERRADO" : (nextStage ? nextStage.etapa : "ENCERRADO")
      };
    });
  };

  const checkAndResolveConcurrency = (chosen: number, excludeEtapa?: string) => {
    const existingOrders = stages
      .filter(s => s.etapa !== excludeEtapa)
      .map(s => Number(s.ordem) || 0)
      .filter(o => o > 0);

    if (existingOrders.includes(chosen)) {
      let current = chosen;
      while (existingOrders.includes(current)) {
        current++;
      }
      return {
        resolved: current,
        hasConflict: true
      };
    }
    return {
      resolved: chosen,
      hasConflict: false
    };
  };

  // HTML5 Drag and Drop events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const ordered = getOrderedStages(stages);
    const [draggedItem] = ordered.splice(draggedIdx, 1);
    ordered.splice(targetIndex, 0, draggedItem);

    // Recalculate ordre and proxima_etapa preserving input order
    const rebuilt = rebuildSequencePointers(ordered, true);
    await onUpdateStage(rebuilt);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleMoveStep = async (index: number, direction: "up" | "down") => {
    const ordered = getOrderedStages(stages);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    // Swap elements
    const temp = ordered[index];
    ordered[index] = ordered[targetIndex];
    ordered[targetIndex] = temp;

    const rebuilt = rebuildSequencePointers(ordered, true);
    await onUpdateStage(rebuilt);
  };

  const handleDeleteStep = async (etapaToDelete: string) => {
    if (etapaToDelete === "SEM_CONTATO" || etapaToDelete === "ENCERRADO") {
      toast.warning("As etapas 'SEM_CONTATO' e 'ENCERRADO' são essenciais para o funcionamento do CRM e não podem ser excluídas.");
      return;
    }

    const confirmed = await confirm(`Tem certeza que deseja excluir a etapa "${etapaToDelete}"? Os leads nessa etapa continuarão com seus históricos, mas serão remanejados para a etapa seguinte do fluxo.`);
    if (!confirmed) {
      return;
    }

    const ordered = getOrderedStages(stages).filter(s => s.etapa !== etapaToDelete);
    const rebuilt = rebuildSequencePointers(ordered, true);

    await onUpdateStage(rebuilt);
    setSelectedEtapa("SEM_CONTATO");
    toast.success("Etapa excluída com sucesso!");
  };

  // --- NEW STEP STATE ---
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newEtapaKey, setNewEtapaKey] = useState("");
  const [newDescricao, setNewDescricao] = useState("");
  const [newCanal, setNewCanal] = useState<"WHATSAPP" | "EMAIL" | null>("WHATSAPP");
  const [newEsperarDias, setNewEsperarDias] = useState(3);
  const [newProximoStatus, setNewProximoStatus] = useState<LeadStatus>("FOLLOWUP1");
  const [newTemperatura, setNewTemperatura] = useState<LeadTemperatura>("MORNA");
  const [newMensagemTemplate, setNewMensagemTemplate] = useState("");
  const [newAssuntoTemplate, setNewAssuntoTemplate] = useState("");
  const [newOrdem, setNewOrdem] = useState<number>(1);

  // Sync default next ordem when adding step
  useEffect(() => {
    if (isAddingStep) {
      setNewOrdem(getOrderedStages(stages).length + 1);
    }
  }, [isAddingStep, stages]);

  // Sync default next ID when friendly name (newDescricao) changes
  useEffect(() => {
    setNewEtapaKey(generateIdFromFriendlyName(newDescricao));
  }, [newDescricao]);

  const handleCreateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescricao.trim()) {
      toast.warning("Por favor, preencha o nome do passo (descrição).");
      return;
    }

    const sanitizedKey = generateIdFromFriendlyName(newDescricao);
    if (!sanitizedKey) {
      toast.warning("Por favor, digite uma descrição válida para gerar o identificador do passo.");
      return;
    }

    if (stages.some(s => s.etapa === sanitizedKey)) {
      toast.warning(`Um passo com o identificador "${sanitizedKey}" (gerado a partir de "${newDescricao}") já existe.`);
      return;
    }

    // Resolve concomitancy
    const { resolved, hasConflict } = checkAndResolveConcurrency(Number(newOrdem));
    if (hasConflict) {
      setConcurrencyNotice(`A ordem ${newOrdem} já estava ocupada. O sistema atribuiu o primeiro número subsequente livre: ${resolved}.`);
    } else {
      setConcurrencyNotice(null);
    }

    const newStage: WorkflowStage = {
      etapa: sanitizedKey,
      descricao: newDescricao.trim(),
      canal: newCanal,
      template_name: newCanal ? `${newCanal}_${sanitizedKey}` : null,
      esperar_dias: Number(newEsperarDias),
      proxima_etapa: "ENCERRADO",
      proximo_status: newProximoStatus,
      temperatura: newTemperatura,
      mensagem_template: newCanal ? newMensagemTemplate : null,
      assunto_template: newCanal === "EMAIL" ? newAssuntoTemplate : null,
      imagens_template: null,
      ordem: resolved
    };

    const updated = [...stages, newStage];
    const rebuilt = rebuildSequencePointers(updated);

    await onUpdateStage(rebuilt);
    setIsAddingStep(false);
    setSelectedEtapa(sanitizedKey);

    // Reset fields
    setNewEtapaKey("");
    setNewDescricao("");
    setNewMensagemTemplate("");
    setNewAssuntoTemplate("");
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStage) return;

    if (!descricao.trim()) {
      toast.warning("Por favor, preencha o nome amigável (descrição) da etapa.");
      return;
    }

    setIsSavingStage(true);
    try {
      const isSystemStage = currentStage.etapa === "SEM_CONTATO" || currentStage.etapa === "ENCERRADO";
      const newEtapaId = isSystemStage ? currentStage.etapa : generateIdFromFriendlyName(descricao);

      if (!newEtapaId) {
        toast.warning("Por favor, digite uma descrição válida para gerar o identificador.");
        setIsSavingStage(false);
        return;
      }

      if (newEtapaId !== currentStage.etapa && stages.some(s => s.etapa === newEtapaId)) {
        toast.warning(`Um passo com o identificador "${newEtapaId}" já existe.`);
        setIsSavingStage(false);
        return;
      }

      // Resolve concomitancy
      const { resolved, hasConflict } = checkAndResolveConcurrency(Number(ordem), currentStage.etapa);
      if (hasConflict) {
        setConcurrencyNotice(`A ordem ${ordem} já estava ocupada. O sistema atribuiu o primeiro número subsequente livre: ${resolved}.`);
      } else {
        setConcurrencyNotice(null);
      }

      const updatedStage: WorkflowStage = {
        ...currentStage,
        etapa: newEtapaId,
        descricao: descricao.trim(),
        canal,
        template_name: canal ? `${canal}_${newEtapaId}` : null,
        esperar_dias: Number(esperarDias),
        proximo_status: (proximoStatus === "" ? null : proximoStatus) as LeadStatus | null,
        temperatura,
        mensagem_template: canal ? mensagemTemplate : null,
        assunto_template: canal === "EMAIL" ? assuntoTemplate : null,
        imagens_template: null,
        ordem: resolved
      };

      const currentConfigs = [...stages];
      const idx = currentConfigs.findIndex((s) => s.etapa === currentStage.etapa);
      if (idx !== -1) {
        currentConfigs[idx] = updatedStage;
      } else {
        currentConfigs.push(updatedStage);
      }

      const rebuilt = rebuildSequencePointers(currentConfigs);
      await onUpdateStage(rebuilt);
      setSelectedEtapa(newEtapaId);
      toast.success("Etapa salva com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar etapa.");
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm("Deseja redefinir as configurações de templates e prazos para o padrão original da Casa Colombo? Suas alterações serão perdidas.");
    if (!confirmed) return;
    setIsResetting(true);
    try {
      await onReset();
      setSelectedEtapa("SEM_CONTATO");
      toast.success("Configurações redefinidas para o padrão com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao redefinir configurações.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div id="workflow-config-screen" className="w-full space-y-6 animate-fade-in">
      {/* 1. CABEÇALHO EDITORIAL UNIFICADO (PADRÃO CRM / DASHBOARD) */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b transition-colors"
        style={{ borderColor: "var(--crm-border)" }}
      >
        <div>
          <h1
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: "var(--crm-text)" }}
          >
            Configurações Gerais
          </h1>
          <p
            className="text-xs sm:text-sm mt-0.5"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Central de configuração da esteira de automação, agendamento de disparos, canais e tabelas auxiliares.
          </p>
        </div>

        {activeSubTab === "followup" && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)",
              }}
              title="Restaurar esteira para os padrões originais da Casa Colombo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-indigo-500" : ""}`} />
              <span>Restaurar Padrões</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingStep(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Passo</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. BARRA DE SUB-ABAS SEGMENTADAS */}
      <div
        className="flex overflow-x-auto max-w-full no-scrollbar whitespace-nowrap gap-1.5 p-1.5 rounded-xl border transition-colors w-full sm:w-fit"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab("followup")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            activeSubTab === "followup"
              ? "bg-indigo-600 text-white shadow-xs"
              : "hover:opacity-85"
          }`}
          style={
            activeSubTab !== "followup"
              ? { color: "var(--crm-text-secondary)" }
              : undefined
          }
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Esteira de Automação</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
              activeSubTab === "followup"
                ? "bg-white/20 text-white"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
            }`}
          >
            {stages.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("scheduler")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            activeSubTab === "scheduler"
              ? "bg-indigo-600 text-white shadow-xs"
              : "hover:opacity-85"
          }`}
          style={
            activeSubTab !== "scheduler"
              ? { color: "var(--crm-text-secondary)" }
              : undefined
          }
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Disparo Automático</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            activeSubTab === "general"
              ? "bg-indigo-600 text-white shadow-xs"
              : "hover:opacity-85"
          }`}
          style={
            activeSubTab !== "general"
              ? { color: "var(--crm-text-secondary)" }
              : undefined
          }
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Parâmetros Zoho & WAHA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("lists")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            activeSubTab === "lists"
              ? "bg-indigo-600 text-white shadow-xs"
              : "hover:opacity-85"
          }`}
          style={
            activeSubTab !== "lists"
              ? { color: "var(--crm-text-secondary)" }
              : undefined
          }
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Tabelas Auxiliares (Menus)</span>
        </button>
      </div>

      {activeSubTab === "followup" ? (
        // --- VIEW 1: FOLLOWUP CONFIGURATION ---
        <div className="space-y-6">
          {/* Banner explanation */}
          <div
            className="rounded-2xl p-4 sm:p-5 border transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xs"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className="text-sm font-bold tracking-tight"
                  style={{ color: "var(--crm-text)" }}
                >
                  Régua de Relacionamento e Follow-up Automatizado
                </h3>
                <p
                  className="text-xs mt-0.5 max-w-3xl leading-relaxed"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Configure a sequência de mensagens da régua comercial. Para cada etapa, ajuste o canal de envio (WhatsApp ou E-mail), os dias de carência entre disparos, os modelos de texto e os gatilhos automáticos de status e temperatura.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg border font-mono"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text-secondary)",
                }}
              >
                Sequência: {stages.length} etapas ativas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stages Sidebar list (Visual Contact Queue) */}
            <div
              className="lg:col-span-4 rounded-2xl p-4 sm:p-5 border flex flex-col h-fit shadow-xs transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
              }}
            >
              <div
                className="flex items-center justify-between pb-3 mb-3 border-b"
                style={{ borderColor: "var(--crm-border)" }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "var(--crm-text)" }}
                >
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Ordem do Fluxo
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  {stages.length} Passos
                </span>
              </div>

              {/* Step Sequence Timeline container */}
              <div className="relative pl-2 space-y-2.5">
                {/* Dotted connector line running down */}
                <div
                  className="absolute left-[18px] top-3 bottom-3 w-[2px] border-l border-dashed pointer-events-none opacity-50"
                  style={{ borderColor: "var(--crm-border)" }}
                />

                {getOrderedStages(stages).map((stage, idx) => {
                  const isSelected = selectedEtapa === stage.etapa;
                  const isSystemStage = stage.etapa === "SEM_CONTATO" || stage.etapa === "ENCERRADO";
                  const orderNum = String(idx + 1).padStart(2, "0");
                  const isDragOver = dragOverIdx === idx;
                  const isDragged = draggedIdx === idx;

                  return (
                    <div
                      key={stage.etapa}
                      onClick={() => setSelectedEtapa(stage.etapa)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`relative group cursor-grab active:cursor-grabbing w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 select-none ${
                        isSelected
                          ? "ring-2 ring-indigo-500/40 border-indigo-500 shadow-xs"
                          : "hover:border-slate-300 dark:hover:border-zinc-700"
                      } ${
                        isDragOver ? "ring-2 ring-indigo-500 scale-[1.01]" : ""
                      } ${
                        isDragged ? "opacity-40 border-dashed" : ""
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? "var(--crm-primary-subtle)"
                          : "var(--crm-surface-subtle)",
                        borderColor: isSelected
                          ? "var(--crm-primary)"
                          : "var(--crm-border)",
                      }}
                    >
                      {/* Drag Handle Icon */}
                      <div
                        className="flex items-center self-stretch justify-center px-0.5 transition-colors"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        <GripVertical className="w-3.5 h-3.5 group-hover:text-indigo-500" />
                      </div>

                      {/* Step Number Circle */}
                      <div
                        className={`relative z-10 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-all border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-slate-200 dark:border-zinc-800"
                        }`}
                        style={
                          !isSelected
                            ? {
                                backgroundColor: "var(--crm-surface)",
                                color: "var(--crm-text-secondary)",
                              }
                            : undefined
                        }
                      >
                        {orderNum}
                      </div>

                      {/* Info & Description */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-[10px] font-bold font-mono tracking-wide truncate flex items-center gap-1 ${
                              isSelected ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""
                            }`}
                            style={!isSelected ? { color: "var(--crm-text-secondary)" } : undefined}
                          >
                            {stage.etapa}
                            {stage.ordem ? (
                              <span
                                className="text-[9px] px-1 py-0.2 rounded border font-mono"
                                style={{
                                  backgroundColor: "var(--crm-surface)",
                                  borderColor: "var(--crm-border)",
                                  color: "var(--crm-text-muted)",
                                }}
                              >
                                #{stage.ordem}
                              </span>
                            ) : null}
                          </span>
                          
                          {/* Channel icon */}
                          <div className="shrink-0">
                            {stage.canal === "WHATSAPP" && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 flex items-center gap-1 font-semibold">
                                <MessageSquare className="w-2.5 h-2.5" /> WA
                              </span>
                            )}
                            {stage.canal === "EMAIL" && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25 flex items-center gap-1 font-semibold">
                                <Mail className="w-2.5 h-2.5" /> E-mail
                              </span>
                            )}
                            {!stage.canal && (
                              <span
                                className="text-[9px] px-2 py-0.5 rounded border flex items-center gap-0.5 font-mono font-bold"
                                style={{
                                  backgroundColor: "var(--crm-surface)",
                                  borderColor: "var(--crm-border)",
                                  color: "var(--crm-text-muted)",
                                }}
                              >
                                FIM
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className="text-xs font-semibold mt-1 truncate"
                          style={{ color: "var(--crm-text)" }}
                        >
                          {stage.descricao}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="text-[10px] flex items-center gap-1 font-mono px-2 py-0.5 rounded border"
                            style={{
                              backgroundColor: "var(--crm-surface)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text-secondary)",
                            }}
                          >
                            ⏰ {stage.esperar_dias} {stage.esperar_dias === 1 ? "dia" : "dias"}
                          </span>
                          {stage.temperatura && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                              String(stage.temperatura).toUpperCase() === "QUENTE" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20" :
                              String(stage.temperatura).toUpperCase() === "MORNA" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" :
                              String(stage.temperatura).toUpperCase() === "CLIENTE" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" :
                              "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20"
                            }`}>
                              {String(stage.temperatura).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Actions hover-revealed */}
                      {!isSystemStage && (
                        <div
                          className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 border p-1 rounded-xl shadow-md"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(stage.etapa);
                            }}
                            title="Excluir este passo"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Step Dotted Button */}
              <button
                type="button"
                onClick={() => setIsAddingStep(true)}
                className="mt-4 w-full py-2.5 border border-dashed rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                style={{
                  borderColor: "var(--crm-border-strong)",
                  color: "var(--crm-text-secondary)",
                }}
              >
                <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Adicionar Passo de Follow-up
              </button>
            </div>

            {/* Form Editor Panel */}
            <div
              className="lg:col-span-8 rounded-2xl overflow-hidden border shadow-xs transition-colors"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
              }}
            >
              <div
                className="p-4 sm:p-6 border-b flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold tracking-wider uppercase font-mono"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Configuração da Etapa:
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                      {selectedEtapa}
                    </span>
                  </div>
                  <p
                    className="text-sm font-semibold mt-1"
                    style={{ color: "var(--crm-text)" }}
                  >
                    {descricao}
                  </p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase border"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-secondary)",
                  }}
                >
                  ID: {selectedEtapa}
                </span>
              </div>

              <form onSubmit={handleSaveStage} className="p-4 sm:p-6 space-y-6">
                {concurrencyNotice && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <p className="font-bold uppercase tracking-wider text-[11px]">Concomitância de Sequência Ajustada</p>
                      <p className="mt-0.5 text-xs">{concurrencyNotice}</p>
                    </div>
                    <button type="button" onClick={() => setConcurrencyNotice(null)} className="text-amber-500 hover:text-amber-700 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Descricao */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Nome Amigável / Descrição
                    </label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    />
                  </div>

                  {/* Número de Sequência (Ordem) */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Posição na Sequência (Ordem)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ordem}
                      onChange={(e) => setOrdem(Number(e.target.value))}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    />
                  </div>

                  {/* Canal Selector */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Canal de Envio
                    </label>
                    <select
                      value={canal || ""}
                      onChange={(e) => setCanal((e.target.value === "" ? null : e.target.value) as "WHATSAPP" | "EMAIL" | null)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    >
                      <option value="">Nenhum (Estado Fim de Funil)</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                    </select>
                  </div>

                  {/* Esperar Dias */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Prazo de Carência (Dias de espera)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={esperarDias}
                      onChange={(e) => setEsperarDias(Number(e.target.value))}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    />
                    <span
                      className="text-[10px] block"
                      style={{ color: "var(--crm-text-muted)" }}
                    >
                      Após este envio, aguardará este número de dias antes de rodar o próximo passo.
                    </span>
                  </div>

                  {/* Temperatura */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Gatilho de Temperatura
                    </label>
                    <select
                      value={temperatura}
                      onChange={(e) => setTemperatura(e.target.value as LeadTemperatura)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-mono"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    >
                      <option value="FRIA">FRIA</option>
                      <option value="MORNA">MORNA</option>
                      <option value="QUENTE">QUENTE</option>
                      <option value="CLIENTE">CLIENTE</option>
                    </select>
                  </div>

                  {/* Proximo Status */}
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Gatilho de Status do Funil
                    </label>
                    <select
                      value={proximoStatus}
                      onChange={(e) => setProximoStatus(e.target.value as LeadStatus)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-mono"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    >
                      <option value="">Manter anterior</option>
                      <option value="NOVO">Novo</option>
                      <option value="PRIMEIRO_CONTATO">Primeiro Contato</option>
                      <option value="FOLLOWUP1">Follow-up 1</option>
                      <option value="FOLLOWUP2">Follow-up 2</option>
                      <option value="FOLLOWUP3">Follow-up 3</option>
                      <option value="FOLLOWUPFINAL">Follow-up Final</option>
                      <option value="RESPONDIDO">Respondido</option>
                      <option value="FECHOU">Fechou (Convertido)</option>
                      <option value="PERDIDO">Perdido</option>
                      <option value="SEM_RETORNO">Sem Retorno / Encerrado</option>
                    </select>
                  </div>
                </div>

                {/* Template content - conditionally visible */}
                {canal && (
                  <div
                    className="space-y-4 pt-4 border-t"
                    style={{ borderColor: "var(--crm-border)" }}
                  >
                    {canal === "EMAIL" && (
                      <div className="space-y-1.5">
                        <label
                          className="text-[11px] font-semibold uppercase tracking-wider block"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          Assunto do E-mail
                        </label>
                        <input
                          type="text"
                          value={assuntoTemplate}
                          onChange={(e) => setAssuntoTemplate(e.target.value)}
                          placeholder="Ex: Separei novas opções para você, {{nome}}"
                          className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          style={{
                            backgroundColor: "var(--crm-surface-subtle)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)",
                          }}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between pb-1">
                        <label
                          className="text-[11px] font-semibold uppercase tracking-wider block"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          Mensagem Template
                        </label>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Suporta variáveis dinâmicas
                        </span>
                      </div>

                      <VariablePicker onInsert={(tag) => insertTextAtCursor(tag)} className="mb-2" />

                      {/* Enhanced Formatting Toolbar & Emoji Selector */}
                      <div
                        className="border rounded-t-xl p-2.5 flex flex-wrap gap-2 items-center justify-between border-b-0 transition-colors"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        {/* Rich Styling Tools */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFormatText("bold")}
                            title="Negrito"
                            className="p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer shadow-xs hover:opacity-85"
                            style={{
                              backgroundColor: "var(--crm-surface)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text)",
                            }}
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFormatText("italic")}
                            title="Itálico"
                            className="p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer shadow-xs hover:opacity-85"
                            style={{
                              backgroundColor: "var(--crm-surface)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text)",
                            }}
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFormatText("link")}
                            title="Inserir Hiperlink"
                            className="p-1.5 rounded-lg border transition flex items-center justify-center gap-1 px-2.5 text-[10px] font-mono uppercase cursor-pointer shadow-xs hover:opacity-85"
                            style={{
                              backgroundColor: "var(--crm-surface)",
                              borderColor: "var(--crm-border)",
                              color: "var(--crm-text)",
                            }}
                          >
                            <Link className="w-3 h-3" /> Link
                          </button>
                        </div>

                        {/* Quick Emoji Tray */}
                        <div
                          className="flex items-center gap-1 border-l pl-2.5"
                          style={{ borderColor: "var(--crm-border)" }}
                        >
                          <span
                            className="text-[10px] font-mono font-bold uppercase select-none mr-1"
                            style={{ color: "var(--crm-text-muted)" }}
                          >
                            Rápido:
                          </span>
                          <div className="flex items-center gap-1">
                            {["💍", "✨", "💌", "❤️", "📅", "🚨", "⚠️", "💬", "🌸", "🥂", "👰", "🎁"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => insertTextAtCursor(emoji)}
                                className="w-6 h-6 flex items-center justify-center hover:scale-125 transition text-xs rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <textarea
                        id="mensagem-template-textarea"
                        rows={canal === "EMAIL" ? 10 : 5}
                        value={mensagemTemplate}
                        onChange={(e) => setMensagemTemplate(e.target.value)}
                        placeholder={
                          canal === "EMAIL"
                            ? "Escreva o corpo do e-mail em formato HTML..."
                            : "Escreva a mensagem do WhatsApp..."
                        }
                        className="w-full border rounded-b-none p-3.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y transition-colors"
                        style={{
                          backgroundColor: "var(--crm-surface)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                      />

                      {/* Dynamic Variable Quick Insert Panel */}
                      <div
                        className="border border-t-0 rounded-b-xl p-4 space-y-4 transition-colors"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Clique para Inserir Campo Variável no Texto:</span>
                        </div>
                        
                        <div className="space-y-3">
                          {/* 1. Basic Fields */}
                          <div>
                            <span
                              className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-2"
                              style={{ color: "var(--crm-text-secondary)" }}
                            >
                              Dados Principais do Lead:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { label: "Nome do Noivo(a)", value: "{nome}" },
                                { label: "Mês / Ano do Casamento", value: "{mesCasamento}" },
                                { label: "Local do Casamento", value: "{local}" },
                                { label: "Qtd Convidados", value: "{convidados}" },
                                { label: "Data de Casamento (Completa)", value: "{dataCasamento}" },
                                { label: "Serviços Solicitados", value: "{servicos}" }
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => insertTextAtCursor(item.value)}
                                  className="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-indigo-500"
                                  style={{
                                    backgroundColor: "var(--crm-surface)",
                                    borderColor: "var(--crm-border)",
                                    color: "var(--crm-text)",
                                  }}
                                >
                                  <span>{item.label}</span>
                                  <code className="text-indigo-600 dark:text-indigo-400 font-mono font-normal bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{item.value}</code>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Product Fields */}
                          {products.length > 0 && (
                            <div
                              className="pt-3 border-t"
                              style={{ borderColor: "var(--crm-border)" }}
                            >
                              <span
                                className="text-[10px] font-mono font-bold uppercase tracking-wider block mb-2"
                                style={{ color: "var(--crm-text-secondary)" }}
                              >
                                Produtos Cadastrados (Valores Calculados):
                              </span>
                              <div className="grid grid-cols-1 gap-2.5">
                                {products.map((prod) => (
                                  <div
                                    key={prod.id}
                                    className="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs transition-colors"
                                    style={{
                                      backgroundColor: "var(--crm-surface)",
                                      borderColor: "var(--crm-border)",
                                    }}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {prod.link_imagem && (
                                        <img
                                          src={prod.link_imagem}
                                          alt=""
                                          className="w-9 h-9 object-cover rounded-lg cursor-pointer hover:scale-105 transition-all border hover:border-indigo-500"
                                          style={{ borderColor: "var(--crm-border)" }}
                                          referrerPolicy="no-referrer"
                                          title="Clique para inserir esta imagem"
                                          onClick={() => {
                                            insertTextAtCursor(`{imagem_${prod.id}}`, "mensagem-template-textarea");
                                          }}
                                        />
                                      )}
                                      <div>
                                        <span
                                          className="text-xs font-bold block"
                                          style={{ color: "var(--crm-text)" }}
                                        >
                                          {prod.descricao}
                                        </span>
                                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                                          {prod.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / unitário
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                      <button
                                        type="button"
                                        title="Insere o orçamento total calculado (Convidados x Valor)"
                                        onClick={() => insertTextAtCursor(`{orcamento_${prod.id}}`)}
                                        className="px-2.5 py-1 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-mono border transition cursor-pointer"
                                        style={{
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text-secondary)",
                                        }}
                                      >
                                        Orçamento ({"{"}orcamento_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere o link da imagem do produto"
                                        onClick={() => {
                                          insertTextAtCursor(`{imagem_${prod.id}}`, "mensagem-template-textarea");
                                        }}
                                        className="px-2.5 py-1 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-mono border transition cursor-pointer"
                                        style={{
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text-secondary)",
                                        }}
                                      >
                                        Imagem ({"{"}imagem_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere o preço unitário"
                                        onClick={() => insertTextAtCursor(`{preco_unitario_${prod.id}}`)}
                                        className="px-2.5 py-1 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-mono border transition cursor-pointer"
                                        style={{
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text-secondary)",
                                        }}
                                      >
                                        Preço ({"{"}preco_unitario_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere a descrição"
                                        onClick={() => insertTextAtCursor(`{descricao_${prod.id}}`)}
                                        className="px-2.5 py-1 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-mono border transition cursor-pointer"
                                        style={{
                                          backgroundColor: "var(--crm-surface-subtle)",
                                          borderColor: "var(--crm-border)",
                                          color: "var(--crm-text-secondary)",
                                        }}
                                      >
                                        Descrição ({"{"}descricao_{prod.id}{"}"})
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!canal && (
                  <div
                    className="border rounded-xl p-4 flex gap-3 transition-colors"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                    }}
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" />
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Esta etapa não possui ações de envio configuradas. Trata-se de um estágio de encerramento do funil, indicando o desfecho do lead sem envios adicionais automáticos.
                    </p>
                  </div>
                )}

                {/* Save Button */}
                <div
                  className="flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: "var(--crm-border)" }}
                >
                  {selectedEtapa !== "SEM_CONTATO" && selectedEtapa !== "ENCERRADO" && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(selectedEtapa)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Etapa
                    </button>
                  )}
                  <div className="flex-1"></div>
                  <button
                    type="submit"
                    disabled={isSavingStage}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingStage ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : activeSubTab === "scheduler" ? (
        <AutoTriggerSetup />
      ) : activeSubTab === "general" ? (
        <CommunicationSetup />
      ) : (
        <OptionsListsSetup />
      )}

      {/* ADD STEP MODAL */}
      {isAddingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className="border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[90vh] animate-fade-in my-auto transition-colors"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
            }}
          >
            {/* Modal Header */}
            <div
              className="p-4 sm:p-5 border-b flex items-center justify-between transition-colors"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <h3
                  className="font-bold text-sm tracking-tight"
                  style={{ color: "var(--crm-text)" }}
                >
                  Adicionar Novo Passo de Follow-up
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingStep(false)}
                className="p-1.5 rounded-lg transition cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStep} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Descrição / Nome Amigável */}
                <div className="col-span-2 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Nome do Passo (Nome Amigável / Descrição)
                  </label>
                  <input
                    type="text"
                    required
                    value={newDescricao}
                    onChange={(e) => setNewDescricao(e.target.value)}
                    placeholder="Ex: Terceiro WhatsApp de follow-up"
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  />
                </div>

                {/* ID da Etapa (Nome Técnico) */}
                <div className="col-span-2 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Identificador do Passo (Gerado Automaticamente)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={newEtapaKey}
                    placeholder="Gerado automaticamente com base no nome do passo..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase cursor-not-allowed opacity-75 border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-muted)",
                    }}
                  />
                  <span
                    className="text-[10px] block"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    ID único do sistema gerado automaticamente a partir do nome amigável.
                  </span>
                </div>

                {/* Posição na Sequência (Ordem) */}
                <div className="col-span-2 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Posição na Sequência (Ordem)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newOrdem}
                    onChange={(e) => setNewOrdem(Number(e.target.value))}
                    placeholder="Ex: 5"
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  />
                  <span
                    className="text-[10px] block"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    Define a ordem de execução. Se escolher uma ordem existente, ela será deslocada por concomitância.
                  </span>
                </div>

                {/* Canal */}
                <div className="col-span-1 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Canal de Envio
                  </label>
                  <select
                    value={newCanal || ""}
                    onChange={(e) => setNewCanal((e.target.value === "" ? null : e.target.value) as "WHATSAPP" | "EMAIL" | null)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="">Fim de Funil (Sem Envio)</option>
                  </select>
                </div>

                {/* Esperar Dias */}
                <div className="col-span-1 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Tempo de Espera (Dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={newEsperarDias}
                    onChange={(e) => setNewEsperarDias(Number(e.target.value))}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  />
                </div>

                {/* Próximo Status */}
                <div className="col-span-1 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Status do Funil
                  </label>
                  <select
                    value={newProximoStatus}
                    onChange={(e) => setNewProximoStatus(e.target.value as LeadStatus)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-mono"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  >
                    <option value="FOLLOWUP1">Follow-up 1</option>
                    <option value="FOLLOWUP2">Follow-up 2</option>
                    <option value="FOLLOWUP3">Follow-up 3</option>
                    <option value="FOLLOWUPFINAL">Follow-up Final</option>
                    <option value="RESPONDIDO">Respondido</option>
                    <option value="SEM_RETORNO">Sem Retorno / Encerrado</option>
                  </select>
                </div>

                {/* Temperatura */}
                <div className="col-span-1 space-y-1.5">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider block"
                    style={{ color: "var(--crm-text-secondary)" }}
                  >
                    Temperatura
                  </label>
                  <select
                    value={newTemperatura}
                    onChange={(e) => setNewTemperatura(e.target.value as LeadTemperatura)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer font-mono"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)",
                    }}
                  >
                    <option value="FRIA">Fria</option>
                    <option value="MORNA">Morna</option>
                    <option value="QUENTE">Quente</option>
                  </select>
                </div>
              </div>

              {newCanal && (
                <div
                  className="space-y-3 pt-3 border-t"
                  style={{ borderColor: "var(--crm-border)" }}
                >
                  {newCanal === "EMAIL" && (
                    <div className="space-y-1.5">
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider block"
                        style={{ color: "var(--crm-text-secondary)" }}
                      >
                        Assunto do E-mail
                      </label>
                      <input
                        type="text"
                        required
                        value={newAssuntoTemplate}
                        onChange={(e) => setNewAssuntoTemplate(e.target.value)}
                        placeholder="Ex: Último contato sobre as lembrancinhas"
                        className="w-full rounded-xl px-3.5 py-2.5 text-xs border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{
                          backgroundColor: "var(--crm-surface-subtle)",
                          borderColor: "var(--crm-border)",
                          color: "var(--crm-text)",
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider block"
                        style={{ color: "var(--crm-text-secondary)" }}
                      >
                        Mensagem Template
                      </label>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                        Variáveis: {"{{nome}}"}
                      </span>
                    </div>

                    {/* Toolbar */}
                    <div
                      className="border rounded-t-xl p-2 flex items-center justify-between border-b-0 transition-colors"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFormatText("bold", "new-mensagem-template")}
                          className="p-1.5 rounded-lg border flex items-center justify-center cursor-pointer shadow-xs hover:opacity-85"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)",
                          }}
                        >
                          <Bold className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormatText("italic", "new-mensagem-template")}
                          className="p-1.5 rounded-lg border flex items-center justify-center cursor-pointer shadow-xs hover:opacity-85"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)",
                          }}
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormatText("link", "new-mensagem-template")}
                          className="p-1.5 rounded-lg border px-2 text-[10px] font-mono uppercase flex items-center gap-1 cursor-pointer shadow-xs hover:opacity-85"
                          style={{
                            backgroundColor: "var(--crm-surface)",
                            borderColor: "var(--crm-border)",
                            color: "var(--crm-text)",
                          }}
                        >
                          <Link className="w-2.5 h-2.5" /> Link
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {["💍", "✨", "💌", "❤️", "🌸", "🥂"].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertTextAtCursor(emoji, "new-mensagem-template")}
                            className="w-5 h-5 flex items-center justify-center hover:scale-125 transition text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      id="new-mensagem-template"
                      rows={4}
                      value={newMensagemTemplate}
                      onChange={(e) => setNewMensagemTemplate(e.target.value)}
                      placeholder="Escreva a mensagem..."
                      className="w-full border rounded-b-xl p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                      style={{
                        backgroundColor: "var(--crm-surface)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div
                className="flex items-center justify-end gap-3 pt-4 border-t"
                style={{ borderColor: "var(--crm-border)" }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddingStep(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-secondary)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar Passo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
