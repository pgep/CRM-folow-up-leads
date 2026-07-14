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

interface WorkflowConfigProps {
  stages: WorkflowStage[];
  onUpdateStage: (stage: WorkflowStage | WorkflowStage[]) => Promise<void>;
  onReset: () => Promise<void>;
}

export default function WorkflowConfig({ stages, onUpdateStage, onReset }: WorkflowConfigProps) {
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
  const [imagensTemplate, setImagensTemplate] = useState("");
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
      setImagensTemplate(currentStage.imagens_template || "");
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
      } else if (elementId === "imagens-template-textarea") {
        setImagensTemplate(prev => prev + text);
      } else if (elementId === "new-imagens-template") {
        setNewImagensTemplate(prev => prev + text);
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
    } else if (elementId === "imagens-template-textarea") {
      currentVal = imagensTemplate;
      setValFunc = setImagensTemplate;
    } else if (elementId === "new-imagens-template") {
      currentVal = newImagensTemplate;
      setValFunc = setNewImagensTemplate;
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
      alert("As etapas 'SEM_CONTATO' e 'ENCERRADO' são essenciais para o funcionamento do CRM e não podem ser excluídas.");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a etapa "${etapaToDelete}"? Os leads nessa etapa continuarão com seus históricos, mas serão remanejados para a etapa seguinte do fluxo.`)) {
      return;
    }

    const ordered = getOrderedStages(stages).filter(s => s.etapa !== etapaToDelete);
    const rebuilt = rebuildSequencePointers(ordered, true);

    await onUpdateStage(rebuilt);
    setSelectedEtapa("SEM_CONTATO");
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
  const [newImagensTemplate, setNewImagensTemplate] = useState("");
  const [newOrdem, setNewOrdem] = useState<number>(1);

  // Sync default next ordem when adding step
  useEffect(() => {
    if (isAddingStep) {
      setNewOrdem(getOrderedStages(stages).length + 1);
    }
  }, [isAddingStep, stages]);

  const handleCreateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedKey = newEtapaKey.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    if (!sanitizedKey) {
      alert("Por favor, digite um identificador técnico para o passo (ex: WHATSAPP_FOLLOWUP_3).");
      return;
    }

    if (stages.some(s => s.etapa === sanitizedKey)) {
      alert(`Um passo com o identificador "${sanitizedKey}" já existe.`);
      return;
    }

    if (!newDescricao.trim()) {
      alert("Por favor, preencha a descrição do passo.");
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
      imagens_template: newCanal === "WHATSAPP" ? newImagensTemplate : null,
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
    setNewImagensTemplate("");
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStage) return;

    setIsSavingStage(true);
    try {
      // Resolve concomitancy
      const { resolved, hasConflict } = checkAndResolveConcurrency(Number(ordem), currentStage.etapa);
      if (hasConflict) {
        setConcurrencyNotice(`A ordem ${ordem} já estava ocupada. O sistema atribuiu o primeiro número subsequente livre: ${resolved}.`);
      } else {
        setConcurrencyNotice(null);
      }

      const updatedStage: WorkflowStage = {
        ...currentStage,
        descricao,
        canal,
        esperar_dias: Number(esperarDias),
        proximo_status: (proximoStatus === "" ? null : proximoStatus) as LeadStatus | null,
        temperatura,
        mensagem_template: canal ? mensagemTemplate : null,
        assunto_template: canal === "EMAIL" ? assuntoTemplate : null,
        imagens_template: canal === "WHATSAPP" ? imagensTemplate : null,
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Deseja redefinir as configurações de templates e prazos para o padrão original da Casa Colombo? Suas alterações serão perdidas.")) return;
    setIsResetting(true);
    try {
      await onReset();
      setSelectedEtapa("SEM_CONTATO");
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex border-b border-zinc-850 gap-1.5 p-1 bg-zinc-950/60 border border-zinc-800/60 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab("followup")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeSubTab === "followup"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Esteira de Automação (Follow-up)
        </button>
        <button
          onClick={() => setActiveSubTab("scheduler")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeSubTab === "scheduler"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Disparo Automático
        </button>
        <button
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeSubTab === "general"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Parâmetros Zoho & WAHA
        </button>
        <button
          onClick={() => setActiveSubTab("lists")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeSubTab === "lists"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          Listas de Opções (Etapas, Status, Temp)
        </button>
      </div>

      {activeSubTab === "followup" ? (
        // --- VIEW 1: FOLLOWUP CONFIGURATION ---
        <div className="space-y-6">
          {/* Banner explanation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-500" />
                Configurador de Mensagens & Prazos
              </h3>
              <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
                Personalize a esteira automatizada de Follow-up (V2). Para cada etapa do contato, você pode alterar a mensagem enviada (WhatsApp ou E-mail), o prazo de carência em dias para a próxima ação e os gatilhos automáticos do CRM.
              </p>
            </div>

            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg text-sm font-medium transition shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              Restaurar Padrões
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stages Sidebar list (Visual Contact Queue) */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-fit">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-amber-500" />
                  Sequência do Fluxo (Fila)
                </span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-850">
                  {stages.length} Passos
                </span>
              </div>

              {/* Step Sequence Timeline container */}
              <div className="relative pl-3 space-y-4">
                {/* Dotted connector line running down */}
                <div className="absolute left-[21px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-amber-500/30 via-zinc-800 to-zinc-800/20 border-l border-dashed border-zinc-800 pointer-events-none" />

                {getOrderedStages(stages).map((stage, idx, arr) => {
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
                          ? "bg-amber-500/5 border-amber-500/30 shadow-md shadow-amber-950/10"
                          : "bg-zinc-950/20 border-zinc-850 hover:bg-zinc-900/40 hover:border-zinc-800"
                      } ${
                        isDragOver ? "border-amber-500/50 bg-amber-500/10 scale-[1.01]" : ""
                      } ${
                        isDragged ? "opacity-40 border-dashed" : ""
                      }`}
                    >
                      {/* Drag Handle Icon */}
                      <div className="flex items-center self-stretch justify-center px-0.5 text-zinc-600 group-hover:text-amber-500/60 transition-colors">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Step Number Circle */}
                      <div className={`relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all border ${
                        isSelected
                          ? "bg-amber-500 text-zinc-950 border-amber-400"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 group-hover:border-zinc-700"
                      }`}>
                        {orderNum}
                      </div>

                      {/* Info & Description */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[10px] font-bold font-mono tracking-wide truncate flex items-center gap-1 ${
                            isSelected ? "text-amber-400" : "text-zinc-500"
                          }`}>
                            {stage.etapa}
                            {stage.ordem ? (
                              <span className="text-[9px] bg-zinc-950 px-1 py-0.2 rounded border border-zinc-850 text-zinc-400">
                                #{stage.ordem}
                              </span>
                            ) : null}
                          </span>
                          
                          {/* Channel icon */}
                          <div className="shrink-0">
                            {stage.canal === "WHATSAPP" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-0.5 font-semibold">
                                <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                              </span>
                            )}
                            {stage.canal === "EMAIL" && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center gap-0.5 font-semibold">
                                <Mail className="w-2.5 h-2.5" /> E-mail
                              </span>
                            )}
                            {!stage.canal && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-750 flex items-center gap-0.5 font-mono font-bold">
                                FIM
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`text-xs font-semibold mt-1 truncate ${
                          isSelected ? "text-white" : "text-zinc-300"
                        }`}>
                          {stage.descricao}
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono bg-zinc-950/60 px-1 py-0.5 rounded border border-zinc-900">
                            ⏰ {stage.esperar_dias} {stage.esperar_dias === 1 ? "dia" : "dias"}
                          </span>
                          {stage.temperatura && (
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase ${
                              stage.temperatura === "QUENTE" ? "bg-rose-500/10 text-rose-400" :
                              stage.temperatura === "MORNA" ? "bg-amber-500/10 text-amber-400" :
                              stage.temperatura === "CLIENTE" ? "bg-emerald-500/10 text-emerald-400" :
                              "bg-zinc-800 text-zinc-400"
                            }`}>
                              {stage.temperatura}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete Actions hover-revealed */}
                      {!isSystemStage && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg shadow-lg">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStep(stage.etapa);
                            }}
                            title="Excluir este passo"
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3 h-3" />
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
                className="mt-5 w-full py-2.5 border border-dashed border-zinc-800 hover:border-amber-500/40 hover:bg-amber-500/5 text-zinc-400 hover:text-amber-400 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Adicionar Passo de Follow-up
              </button>
            </div>

            {/* Form Editor Panel */}
            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 tracking-wider uppercase font-mono">
                    Editor de Etapa: {selectedEtapa}
                  </h4>
                  <p className="text-sm text-zinc-300 font-medium mt-1">{descricao}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 border border-zinc-700 text-zinc-400">
                  ID: {selectedEtapa}
                </span>
              </div>

              <form onSubmit={handleSaveStage} className="p-6 space-y-5">
                {concurrencyNotice && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-xs text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Concomitância de Sequência Ajustada</p>
                      <p className="mt-0.5">{concurrencyNotice}</p>
                    </div>
                    <button type="button" onClick={() => setConcurrencyNotice(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Descricao */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Nome Amigável / Descrição</label>
                    <input
                      type="text"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Número de Sequência (Ordem) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Posição na Sequência (Ordem)</label>
                    <input
                      type="number"
                      min="1"
                      value={ordem}
                      onChange={(e) => setOrdem(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Canal Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Canal de Envio</label>
                    <select
                      value={canal || ""}
                      onChange={(e) => setCanal((e.target.value === "" ? null : e.target.value) as "WHATSAPP" | "EMAIL" | null)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Nenhum (Estado Fim de Funil)</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">E-mail</option>
                    </select>
                  </div>

                  {/* Esperar Dias */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Prazo de Carência (Dias de espera)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={esperarDias}
                      onChange={(e) => setEsperarDias(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[10px] text-zinc-500 block">
                      Após este envio, aguardará este número de dias antes de rodar o próximo passo.
                    </span>
                  </div>

                  {/* Temperatura */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Gatilho de Temperatura</label>
                    <select
                      value={temperatura}
                      onChange={(e) => setTemperatura(e.target.value as LeadTemperatura)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="FRIA font-semibold">Fria</option>
                      <option value="MORNA">Morna</option>
                      <option value="QUENTE">Quente</option>
                      <option value="CLIENTE">Cliente</option>
                    </select>
                  </div>

                  {/* Proximo Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Gatilho de Status do Funil</label>
                    <select
                      value={proximoStatus}
                      onChange={(e) => setProximoStatus(e.target.value as LeadStatus)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
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
                  <div className="space-y-4 pt-3 border-t border-zinc-800">
                    {canal === "EMAIL" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">Assunto do E-mail</label>
                        <input
                          type="text"
                          value={assuntoTemplate}
                          onChange={(e) => setAssuntoTemplate(e.target.value)}
                          placeholder="Ex: Separei novas opções para você, {{nome}}"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-400">Mensagem Template</label>
                        <span className="text-[10px] text-amber-500 flex items-center gap-1 font-semibold">
                          <HelpCircle className="w-3.5 h-3.5" />
                          Variáveis: {"{{nome}}"}, {"{{mesCasamento}}"}, {"{{local}}"}
                        </span>
                      </div>

                      {/* Enhanced Formatting Toolbar & Emoji Selector */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-t-lg p-2 flex flex-wrap gap-2 items-center justify-between border-b-0">
                        {/* Rich Styling Tools */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFormatText("bold")}
                            title="Negrito"
                            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 transition flex items-center justify-center"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFormatText("italic")}
                            title="Itálico"
                            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 transition flex items-center justify-center"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFormatText("link")}
                            title="Inserir Hiperlink"
                            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 transition flex items-center justify-center gap-1 px-2 text-[10px] font-semibold"
                          >
                            <Link className="w-3 h-3" /> Link
                          </button>
                        </div>

                        {/* Quick Emoji Tray */}
                        <div className="flex items-center gap-1 border-l border-zinc-850 pl-2">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase select-none mr-1">Rápido:</span>
                          <div className="flex items-center gap-1">
                            {["💍", "✨", "💌", "❤️", "📅", "🚨", "⚠️", "💬", "🌸", "🥂", "👰", "🎁"].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => insertTextAtCursor(emoji)}
                                className="w-6 h-6 flex items-center justify-center hover:scale-125 transition text-xs hover:bg-zinc-900 rounded"
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-b-none p-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600 resize-y"
                      />

                      {canal === "WHATSAPP" && (
                        <div className="bg-zinc-950 border border-t-0 border-zinc-800 p-4 space-y-2">
                          <label className="text-xs font-bold text-zinc-400 block">Lista de Imagens a Enviar (Opcional - Um disparo por imagem após o texto)</label>
                          <textarea
                            id="imagens-template-textarea"
                            value={imagensTemplate}
                            onChange={(e) => setImagensTemplate(e.target.value)}
                            placeholder="Insira os links das imagens separados por vírgula ou por linha (ex: https://site.com/foto1.jpg, {imagem_vela_vidro})"
                            rows={2}
                            className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700 resize-y"
                          />
                          <p className="text-[10px] text-zinc-500">
                            Você pode usar links estáticos ou variáveis de imagem de produtos cadastrados, ex: <code className="text-amber-500 font-mono font-bold">{`{imagem_ID}`}</code>. O sistema fará download da imagem, convertendo e ajustando-a automaticamente para que o WhatsApp envie sem problemas!
                          </p>
                        </div>
                      )}

                      {/* Dynamic Variable Quick Insert Panel */}
                      <div className="bg-zinc-950 border border-t-0 border-zinc-800 rounded-b-lg p-4 space-y-4">
                        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
                          <Sparkles className="w-4 h-4" />
                          <span>Clique para Inserir Campo Variável no Texto:</span>
                        </div>
                        
                        <div className="space-y-3">
                          {/* 1. Basic Fields */}
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Dados Principais do Lead:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: "Nome do Noivo(a)", value: "{nome}" },
                                { label: "Mês do Casamento", value: "{mesCasamento}" },
                                { label: "Local do Casamento", value: "{local}" },
                                { label: "Qtd Convidados", value: "{convidados}" },
                                { label: "Data de Casamento (Completa)", value: "{dataCasamento}" },
                                { label: "Serviços Solicitados", value: "{servicos}" }
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => insertTextAtCursor(item.value)}
                                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-500 rounded border border-zinc-850 hover:border-amber-500/30 text-[10px] font-semibold transition flex items-center gap-1"
                                >
                                  <span>{item.label}</span>
                                  <code className="text-amber-500/80 font-mono font-normal bg-zinc-950 px-1 py-0.5 rounded text-[9px]">{item.value}</code>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Product Fields */}
                          {products.length > 0 && (
                            <div className="pt-2 border-t border-zinc-900/60">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Produtos Cadastrados (Valores Calculados):</span>
                              <div className="grid grid-cols-1 gap-2">
                                {products.map((prod) => (
                                  <div key={prod.id} className="bg-zinc-900/40 border border-zinc-850/60 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      {prod.link_imagem && (
                                        <img
                                          src={prod.link_imagem}
                                          alt=""
                                          className="w-8 h-8 object-cover rounded cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150 border border-zinc-800 hover:border-amber-500"
                                          referrerPolicy="no-referrer"
                                          title="Clique para inserir esta imagem"
                                          onClick={() => {
                                            if (canal === "WHATSAPP") {
                                              insertTextAtCursor(`{imagem_${prod.id}}`, "imagens-template-textarea");
                                            } else {
                                              insertTextAtCursor(`{imagem_${prod.id}}`, "mensagem-template-textarea");
                                            }
                                          }}
                                        />
                                      )}
                                      <div>
                                        <span className="text-xs font-bold text-zinc-300 block">{prod.descricao}</span>
                                        <span className="text-[10px] text-amber-500 font-mono">{prod.valor_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / unitário</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                      <button
                                        type="button"
                                        title="Insere o orçamento total calculado (Convidados x Valor)"
                                        onClick={() => insertTextAtCursor(`{orcamento_${prod.id}}`)}
                                        className="px-2 py-1 bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800 transition"
                                      >
                                        Orçamento ({"{"}orcamento_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere o link da imagem do produto"
                                        onClick={() => {
                                          if (canal === "WHATSAPP") {
                                            insertTextAtCursor(`{imagem_${prod.id}}`, "imagens-template-textarea");
                                          } else {
                                            insertTextAtCursor(`{imagem_${prod.id}}`, "mensagem-template-textarea");
                                          }
                                        }}
                                        className="px-2 py-1 bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800 transition"
                                      >
                                        Imagem ({"{"}imagem_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere o preço unitário"
                                        onClick={() => insertTextAtCursor(`{preco_unitario_${prod.id}}`)}
                                        className="px-2 py-1 bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800 transition"
                                      >
                                        Preço ({"{"}preco_unitario_{prod.id}{"}"})
                                      </button>
                                      <button
                                        type="button"
                                        title="Insere a descrição"
                                        onClick={() => insertTextAtCursor(`{descricao_${prod.id}}`)}
                                        className="px-2 py-1 bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 text-zinc-400 rounded text-[10px] font-mono border border-zinc-800 transition"
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
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-4 flex gap-2.5 text-zinc-500">
                    <AlertCircle className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      Esta etapa não possui ações de envio configuradas. Trata-se de um estágio de encerramento do funil, indicando o desfecho do lead sem envios adicionais automáticos.
                    </p>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-3 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={isSavingStage}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[90vh] animate-fade-in my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-white text-base">Adicionar Novo Passo de Follow-up</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingStep(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateStep} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* ID da Etapa (Nome Técnico) */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Identificador do Passo (Chave Única)</label>
                  <input
                    type="text"
                    required
                    value={newEtapaKey}
                    onChange={(e) => setNewEtapaKey(e.target.value)}
                    placeholder="Ex: WHATSAPP_FOLLOWUP_3"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono placeholder-zinc-700 uppercase"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    Utilizado internamente pelo sistema. Letras maiúsculas sem espaços.
                  </span>
                </div>

                {/* Descrição / Nome Amigável */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Nome do Passo (Descrição)</label>
                  <input
                    type="text"
                    required
                    value={newDescricao}
                    onChange={(e) => setNewDescricao(e.target.value)}
                    placeholder="Ex: Terceiro WhatsApp de follow-up"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600"
                  />
                </div>

                {/* Posição na Sequência (Ordem) */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Posição na Sequência (Ordem)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newOrdem}
                    onChange={(e) => setNewOrdem(Number(e.target.value))}
                    placeholder="Ex: 5"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <span className="text-[10px] text-zinc-500 block">
                    Define a ordem de execução. Se escolher uma ordem existente, ela será deslocada por concomitância.
                  </span>
                </div>

                {/* Canal */}
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Canal de Envio</label>
                  <select
                    value={newCanal || ""}
                    onChange={(e) => setNewCanal((e.target.value === "" ? null : e.target.value) as "WHATSAPP" | "EMAIL" | null)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="">Fim de Funil (Sem Envio)</option>
                  </select>
                </div>

                {/* Esperar Dias */}
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Tempo de Espera (Dias)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={newEsperarDias}
                    onChange={(e) => setNewEsperarDias(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Próximo Status */}
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400">Status do Funil</label>
                  <select
                    value={newProximoStatus}
                    onChange={(e) => setNewProximoStatus(e.target.value as LeadStatus)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  <label className="text-xs font-semibold text-zinc-400">Temperatura</label>
                  <select
                    value={newTemperatura}
                    onChange={(e) => setNewTemperatura(e.target.value as LeadTemperatura)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="FRIA">Fria</option>
                    <option value="MORNA">Morna</option>
                    <option value="QUENTE">Quente</option>
                  </select>
                </div>
              </div>

              {newCanal && (
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  {newCanal === "EMAIL" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400">Assunto do E-mail</label>
                      <input
                        type="text"
                        required
                        value={newAssuntoTemplate}
                        onChange={(e) => setNewAssuntoTemplate(e.target.value)}
                        placeholder="Ex: Último contato sobre as lembrancinhas"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-400">Mensagem Template</label>
                      <span className="text-[10px] text-amber-500 font-bold">
                        Variáveis: {"{{nome}}"}
                      </span>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-t-lg p-2 flex items-center justify-between border-b-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFormatText("bold", "new-mensagem-template")}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-center w-6 h-6"
                        >
                          <Bold className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormatText("italic", "new-mensagem-template")}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-center w-6 h-6"
                        >
                          <Italic className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormatText("link", "new-mensagem-template")}
                          className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-1.5 text-[9px] font-bold flex items-center gap-0.5 h-6"
                        >
                          <Link className="w-2.5 h-2.5" /> Link
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {["💍", "✨", "💌", "❤️", "🌸", "🥂"].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => insertTextAtCursor(emoji, "new-mensagem-template")}
                            className="w-5 h-5 flex items-center justify-center hover:scale-125 transition text-xs"
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
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-b-lg p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                    />

                    {newCanal === "WHATSAPP" && (
                      <div className="space-y-1.5 mt-3 text-left">
                        <label className="text-[11px] font-bold text-zinc-400 block">Lista de Imagens (Opcional - links separados por vírgula ou por linha)</label>
                        <textarea
                          id="new-imagens-template"
                          value={newImagensTemplate}
                          onChange={(e) => setNewImagensTemplate(e.target.value)}
                          placeholder="Ex: https://site.com/vela.jpg, {imagem_vela_vidro}"
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700 resize-y"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddingStep(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md animate-pulse"
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
