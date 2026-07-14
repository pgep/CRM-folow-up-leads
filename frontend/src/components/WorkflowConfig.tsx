/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, MessageSquare, Mail, Play, AlertCircle, HelpCircle, Eye, EyeOff, Sliders, Server, Link2, ShieldCheck, Lock } from "lucide-react";
import { WorkflowStage, LeadStatus, LeadEtapa, LeadTemperatura } from "../types";

interface WorkflowConfigProps {
  stages: WorkflowStage[];
  onUpdateStage: (stage: WorkflowStage) => Promise<void>;
  onReset: () => Promise<void>;
}

export default function WorkflowConfig({ stages, onUpdateStage, onReset }: WorkflowConfigProps) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<"followup" | "general">("followup");

  // --- STAGES / FOLLOWUP STATE ---
  const [selectedEtapa, setSelectedEtapa] = useState<LeadEtapa>("SEM_CONTATO");
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
    }
  }, [selectedEtapa, stages]);

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStage) return;

    setIsSavingStage(true);
    try {
      const updated: WorkflowStage = {
        ...currentStage,
        descricao,
        canal,
        esperar_dias: Number(esperarDias),
        proximo_status: (proximoStatus === "" ? null : proximoStatus) as LeadStatus | null,
        temperatura,
        mensagem_template: canal ? mensagemTemplate : null,
        assunto_template: canal === "EMAIL" ? assuntoTemplate : null
      };
      await onUpdateStage(updated);
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

  // --- GENERAL PARAMETER SETTINGS STATE ---
  const [settings, setSettings] = useState<any>({
    zoho_mail: {
      smtp_host: "smtp.zoho.com",
      smtp_port: 465,
      user: "contato@casacolomboartesanal.com.br",
      pass: "",
      from_name: "Luciana - Casa Colombo",
      use_ssl: true
    },
    waha_whatsapp: {
      api_url: "http://localhost:3000",
      api_key: "",
      session_name: "default",
      delay_seconds: 5
    }
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [showZohoPass, setShowZohoPass] = useState(false);
  const [showWahaKey, setShowWahaKey] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data && (data.zoho_mail || data.waha_whatsapp)) {
            setSettings(data);
          }
        }
      } catch (e) {
        console.error("Failed to load generic settings:", e);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 4000);
      }
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      setSavingSettings(false);
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
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeSubTab === "general"
              ? "bg-amber-500 text-zinc-950 font-bold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Parâmetros de Envio (Zoho & Waha)
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
            {/* Stages Sidebar list */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 h-fit">
              <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase px-2 block mb-3">
                Passos do Follow-up
              </span>

              <div className="space-y-1.5">
                {stages.map((stage) => {
                  const isSelected = selectedEtapa === stage.etapa;
                  return (
                    <button
                      key={stage.etapa}
                      onClick={() => setSelectedEtapa(stage.etapa)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition ${
                        isSelected
                          ? "bg-amber-500/10 border-l-4 border-l-amber-500 text-white"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-xs text-zinc-500 font-mono tracking-wide">{stage.etapa}</div>
                        <div className="text-sm font-medium mt-0.5 truncate">{stage.descricao}</div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {stage.canal === "WHATSAPP" && (
                          <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {stage.canal === "EMAIL" && (
                          <span className="p-1 rounded bg-blue-500/10 text-blue-400">
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {!stage.canal && (
                          <span className="text-[10px] text-zinc-600 font-medium font-mono border border-zinc-800 px-1 rounded">
                            FIM
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
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
                      <option value="FRIA">Fria</option>
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
                      <textarea
                        rows={canal === "EMAIL" ? 10 : 5}
                        value={mensagemTemplate}
                        onChange={(e) => setMensagemTemplate(e.target.value)}
                        placeholder={
                          canal === "EMAIL"
                            ? "Escreva o corpo do e-mail em formato HTML..."
                            : "Escreva a mensagem do WhatsApp..."
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600 resize-y"
                      />
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
      ) : (
        // --- VIEW 2: GENERAL PARAMETERS CONFIG (ZOHO MAIL & WAHA WHATSAPP) ---
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              Configuração Geral de Ferramentas de Envio
            </h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
              Defina as credenciais e parâmetros de conexão para o <strong>Zoho Mail</strong> (para envio de e-mails automatizados) e para o <strong>Waha API</strong> (para envio de WhatsApp). O CRM utilizará esses parâmetros durante a varredura automática do fluxo.
            </p>
          </div>

          {loadingSettings ? (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 border border-zinc-800 rounded-xl h-64">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm text-zinc-500">Carregando parâmetros do banco...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Zoho Mail Configuration Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2.5">
                      <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Zoho Mail SMTP</h4>
                        <p className="text-[10px] text-zinc-400">Credenciais para envio de e-mails de follow-up</p>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* Host */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">Servidor SMTP</label>
                          <input
                            type="text"
                            value={settings.zoho_mail?.smtp_host || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                zoho_mail: { ...settings.zoho_mail, smtp_host: e.target.value }
                              })
                            }
                            required
                            placeholder="smtp.zoho.com"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <div className="col-span-1 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">Porta</label>
                          <input
                            type="number"
                            value={settings.zoho_mail?.smtp_port || 465}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                zoho_mail: { ...settings.zoho_mail, smtp_port: Number(e.target.value) }
                              })
                            }
                            required
                            placeholder="465"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Nome do Remetente */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Nome do Remetente</label>
                        <input
                          type="text"
                          value={settings.zoho_mail?.from_name || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              zoho_mail: { ...settings.zoho_mail, from_name: e.target.value }
                            })
                          }
                          required
                          placeholder="Luciana - Casa Colombo"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Username */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">E-mail (Username Zoho)</label>
                        <input
                          type="email"
                          value={settings.zoho_mail?.user || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              zoho_mail: { ...settings.zoho_mail, user: e.target.value }
                            })
                          }
                          required
                          placeholder="exemplo@casacolombo.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                          <span>Senha ou Token de App Zoho</span>
                          <span className="text-[9px] text-zinc-500 font-medium">Recomendado: App Password</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showZohoPass ? "text" : "password"}
                            value={settings.zoho_mail?.pass || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                zoho_mail: { ...settings.zoho_mail, pass: e.target.value }
                              })
                            }
                            placeholder="••••••••••••••••"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowZohoPass(!showZohoPass)}
                            className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition"
                          >
                            {showZohoPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Use SSL/TLS Toggle */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="use_ssl"
                          checked={settings.zoho_mail?.use_ssl ?? true}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              zoho_mail: { ...settings.zoho_mail, use_ssl: e.target.checked }
                            })
                          }
                          className="rounded bg-zinc-950 border-zinc-800 text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="use_ssl" className="text-xs text-zinc-400 select-none cursor-pointer">
                          Utilizar conexão segura (SSL/TLS recomendado)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/20 border-t border-zinc-850 flex gap-2 text-zinc-500 items-start">
                    <Lock className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">
                      Seus dados de acesso SMTP são armazenados com criptografia local e são protegidos de vazamento para o navegador. Use a ferramenta oficial do Zoho para obter uma senha de aplicativo de 16 dígitos se tiver a verificação em duas etapas ativa.
                    </p>
                  </div>
                </div>

                {/* Waha Whatsapp API Configuration Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-2.5">
                      <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Waha WhatsApp API</h4>
                        <p className="text-[10px] text-zinc-400">Configuração de endpoints e sessões do Waha</p>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {/* API URL */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 text-zinc-500" />
                          Endpoint da API Waha (URL)
                        </label>
                        <input
                          type="text"
                          value={settings.waha_whatsapp?.api_url || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              waha_whatsapp: { ...settings.waha_whatsapp, api_url: e.target.value }
                            })
                          }
                          required
                          placeholder="http://localhost:3000 ou https://sua-api.waha.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Session Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Nome da Sessão (Waha Session)</label>
                        <input
                          type="text"
                          value={settings.waha_whatsapp?.session_name || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              waha_whatsapp: { ...settings.waha_whatsapp, session_name: e.target.value }
                            })
                          }
                          required
                          placeholder="default"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* API Key / Bearer Token */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Chave da API (Waha Security Token)</label>
                        <div className="relative">
                          <input
                            type={showWahaKey ? "text" : "password"}
                            value={settings.waha_whatsapp?.api_key || ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                waha_whatsapp: { ...settings.waha_whatsapp, api_key: e.target.value }
                              })
                            }
                            placeholder="waha_secret_token_key..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowWahaKey(!showWahaKey)}
                            className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition"
                          >
                            {showWahaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Delay between messages */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Intervalo de Segurança (Segundos de delay)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={settings.waha_whatsapp?.delay_seconds || 5}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              waha_whatsapp: { ...settings.waha_whatsapp, delay_seconds: Number(e.target.value) }
                            })
                          }
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                        <span className="text-[10px] text-zinc-500 block">
                          Delay adicionado entre mensagens sequenciais para evitar bloqueios ou banimento de spam pelo WhatsApp.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950/20 border-t border-zinc-850 flex gap-2 text-zinc-500 items-start">
                    <Server className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed">
                      O Waha é um motor de WhatsApp integrado de nível profissional. Certifique-se de que o container do Waha esteja rodando, saudável, e com a sessão QR-Code autenticada ativamente no seu aparelho celular.
                    </p>
                  </div>
                </div>

              </div>

              {/* Save Panel */}
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div>
                  {settingsSuccess && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 animate-bounce" />
                      Parâmetros gerais salvos e validados com sucesso no CRM!
                    </span>
                  )}
                  {!settingsSuccess && (
                    <span className="text-xs text-zinc-500">
                      Revise todas as configurações antes de salvar.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-lg transition shadow-md uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  {savingSettings ? "Salvando..." : "Salvar Parâmetros Gerais"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
