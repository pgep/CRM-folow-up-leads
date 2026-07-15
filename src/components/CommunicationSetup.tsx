import React, { useState, useEffect } from "react";
import { 
  Server, Mail, MessageSquare, Key, RefreshCw, Save, ShieldCheck, 
  Lock, CheckCircle, AlertCircle, Play, Sliders, ToggleLeft, ToggleRight, HelpCircle,
  Users, Send
} from "lucide-react";
import { useToast } from "./Toast";

export default function CommunicationSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  // Leads for destination selection
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  // Custom Test Send States
  const [testEmailRecipient, setTestEmailRecipient] = useState("luciana@casacolombo.com");
  const [testEmailSubject, setTestEmailSubject] = useState("Mensagem de Teste Real - CRM Casa Colombo");
  const [testEmailBody, setTestEmailBody] = useState("<div style='font-family: sans-serif; color: #333;'><h2 style='color: #d97706;'>Olá! Teste de Conexão</h2><p>Parabéns, seu canal SMTP do Zoho foi configurado perfeitamente!</p><p>Este e-mail contém <strong>HTML formatado</strong> e foi enviado em tempo real.</p></div>");
  
  const [testWhatsappRecipient, setTestWhatsappRecipient] = useState("");
  const [testWhatsappBody, setTestWhatsappBody] = useState("Olá! Este é um teste real do canal de WhatsApp do CRM Casa Colombo.");

  const [workflowStages, setWorkflowStages] = useState<any[]>([]);
  const [selectedEmailTemplateStage, setSelectedEmailTemplateStage] = useState("");
  const [selectedWhatsappTemplateStage, setSelectedWhatsappTemplateStage] = useState("");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

  // Form States
  const [smtpHost, setSmtpHost] = useState("smtp.zoho.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState("contato@casacolomboartesanal.com.br");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Luciana - Casa Colombo");
  const [smtpUseSsl, setSmtpUseSsl] = useState(true);

  const [imapHost, setImapHost] = useState("imap.zoho.com");
  const [imapPort, setImapPort] = useState(993);
  const [imapUseSsl, setImapUseSsl] = useState(true);
  const [enableReception, setEnableReception] = useState(true);
  const [checkInterval, setCheckInterval] = useState(10); // in minutes

  const [wahaUrl, setWahaUrl] = useState("http://localhost:3000");
  const [wahaApiKey, setWahaApiKey] = useState("");
  const [wahaSession, setWahaSession] = useState("default");
  const [wahaDelay, setWahaDelay] = useState(5);
  const [webhookUrl, setWebhookUrl] = useState("https://seu-sistema.com/api/webhooks/whatsapp");
  const [webhookActive, setWebhookActive] = useState(true);

  // Load settings and leads on mount
  useEffect(() => {
    async function loadSettingsAndLeads() {
      try {
        // Fetch Settings
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.zoho_mail) {
            setSmtpHost(data.zoho_mail.smtp_host || "smtp.zoho.com");
            setSmtpPort(data.zoho_mail.smtp_port || 465);
            setSmtpUser(data.zoho_mail.user || "contato@casacolomboartesanal.com.br");
            setSmtpPass(data.zoho_mail.pass || "");
            setSmtpFromName(data.zoho_mail.from_name || "Luciana - Casa Colombo");
            setSmtpUseSsl(data.zoho_mail.use_ssl !== undefined ? data.zoho_mail.use_ssl : true);

            setImapHost(data.zoho_mail.imap_host || "imap.zoho.com");
            setImapPort(data.zoho_mail.imap_port || 993);
            setImapUseSsl(data.zoho_mail.use_imap_ssl !== undefined ? data.zoho_mail.use_imap_ssl : true);
            setEnableReception(data.zoho_mail.enable_reception !== undefined ? data.zoho_mail.enable_reception : true);
            setCheckInterval(data.zoho_mail.check_interval || 10);
          }
          if (data.waha_whatsapp) {
            setWahaUrl(data.waha_whatsapp.api_url || "http://localhost:3000");
            setWahaApiKey(data.waha_whatsapp.api_key || "");
            setWahaSession(data.waha_whatsapp.session_name || "default");
            setWahaDelay(data.waha_whatsapp.delay_seconds || 5);
            setWebhookUrl(data.waha_whatsapp.webhook_url || "https://seu-sistema.com/api/webhooks/whatsapp");
            setWebhookActive(data.waha_whatsapp.webhook_active !== undefined ? data.waha_whatsapp.webhook_active : true);
          }
        }

        // Fetch Leads
        const leadsRes = await fetch("/api/leads");
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          setLeads(leadsData);
        }

        // Fetch Workflow configurations
        const workflowRes = await fetch("/api/workflow");
        if (workflowRes.ok) {
          const workflowData = await workflowRes.json();
          setWorkflowStages(workflowData);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações, leads ou workflow:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettingsAndLeads();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        zoho_mail: {
          smtp_host: smtpHost,
          smtp_port: Number(smtpPort),
          user: smtpUser,
          pass: smtpPass,
          from_name: smtpFromName,
          use_ssl: smtpUseSsl,
          imap_host: imapHost,
          imap_port: Number(imapPort),
          use_imap_ssl: imapUseSsl,
          enable_reception: enableReception,
          check_interval: Number(checkInterval)
        },
        waha_whatsapp: {
          api_url: wahaUrl,
          api_key: wahaApiKey,
          session_name: wahaSession,
          delay_seconds: Number(wahaDelay),
          webhook_url: webhookUrl,
          webhook_active: webhookActive
        }
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Configurações de Comunicação salvas com sucesso!");
      } else {
        toast.error("Erro ao salvar configurações.");
      }
    } catch (err: any) {
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestLogs(["Iniciando testes de conectividade..."]);
    setTestSuccess(null);
    
    try {
      const payload = {
        zoho_mail: {
          smtp_host: smtpHost,
          smtp_port: Number(smtpPort),
          user: smtpUser,
          pass: smtpPass,
          from_name: smtpFromName,
          use_ssl: smtpUseSsl,
          imap_host: imapHost,
          imap_port: Number(imapPort),
          use_imap_ssl: imapUseSsl,
          enable_reception: enableReception
        },
        waha_whatsapp: {
          api_url: wahaUrl,
          api_key: wahaApiKey,
          session_name: wahaSession,
          delay_seconds: Number(wahaDelay)
        }
      };

      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.logs) {
        setTestLogs(data.logs);
      }
      setTestSuccess(data.success);
    } catch (err: any) {
      setTestLogs(prev => [...prev, `[ERRO CRÍTICO]: Falha ao disparar o teste: ${err.message}`]);
      setTestSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const l = leads.find(x => String(x.id) === String(leadId));
    if (l) {
      if (l.email) setTestEmailRecipient(l.email);
      if (l.link_celular) setTestWhatsappRecipient(l.link_celular);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingEmail(true);
    setTestLogs(prev => [...prev, `[SMTP TEST SEND] Preparando disparo de e-mail real para: ${testEmailRecipient}...`]);
    setTestSuccess(null);
    try {
      const payload = {
        action: "send_test_email",
        lead_id: selectedLeadId,
        test_email_recipient: testEmailRecipient,
        test_email_subject: testEmailSubject,
        test_email_body: testEmailBody,
        config: {
          zoho_mail: {
            smtp_host: smtpHost,
            smtp_port: Number(smtpPort),
            user: smtpUser,
            pass: smtpPass,
            from_name: smtpFromName,
            use_ssl: smtpUseSsl,
            imap_host: imapHost,
            imap_port: Number(imapPort),
            use_imap_ssl: imapUseSsl,
            enable_reception: enableReception
          }
        }
      };
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.logs) {
        setTestLogs(prev => [...prev, ...data.logs]);
      }
      setTestSuccess(data.success);
    } catch (err: any) {
      setTestLogs(prev => [...prev, `[ERRO]: Falha ao disparar o teste de e-mail: ${err.message}`]);
      setTestSuccess(false);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    setSendingWa(true);
    setTestLogs(prev => [...prev, `[WAHA TEST SEND] Preparando disparo de WhatsApp real para: ${testWhatsappRecipient}...`]);
    setTestSuccess(null);
    try {
      const payload = {
        action: "send_test_whatsapp",
        lead_id: selectedLeadId,
        test_whatsapp_recipient: testWhatsappRecipient,
        test_whatsapp_body: testWhatsappBody,
        config: {
          waha_whatsapp: {
            api_url: wahaUrl,
            api_key: wahaApiKey,
            session_name: wahaSession,
            delay_seconds: Number(wahaDelay)
          }
        }
      };
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.logs) {
        setTestLogs(prev => [...prev, ...data.logs]);
      }
      setTestSuccess(data.success);
    } catch (err: any) {
      setTestLogs(prev => [...prev, `[ERRO]: Falha ao disparar o teste de WhatsApp: ${err.message}`]);
      setTestSuccess(false);
    } finally {
      setSendingWa(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-zinc-400 text-sm">Carregando configurações de canais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500" />
            Parâmetros de Disparo e Recepção (Zoho & WAHA)
          </h2>
          <p className="text-zinc-400 text-xs max-w-2xl">
            Configure abaixo os parâmetros técnicos do servidor de e-mail Zoho Mail (SMTP para envios e IMAP para captura de respostas) e do gateway WAHA (WhatsApp). O sistema inteiro utilizará estes parâmetros em todas as rotinas automatizadas e manuais.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <ShieldCheck className="w-3.5 h-3.5" /> Persistência Segura
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Zoho Mail SMTP & IMAP Configuration Panel */}
        <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 md:p-6 space-y-6 flex flex-col shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Mail className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">E-mail Zoho (SMTP / IMAP)</h3>
                <p className="text-zinc-500 text-[10px]">Envio de follow-up e leitura de novos leads</p>
              </div>
            </div>
            
            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase self-start sm:self-auto shrink-0">
              Zoho Professional
            </span>
          </div>

          {/* Outbound SMTP settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5 border-b border-zinc-850/60 pb-1.5">
              <span>✈️</span> Servidor de Saída (SMTP - Envio)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP Host</label>
                <input
                  type="text"
                  required
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="smtp.zoho.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">SMTP Porta</label>
                <input
                  type="number"
                  required
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="465"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Remetente</label>
                <input
                  type="text"
                  required
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="Luciana - Casa Colombo"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Segurança SSL/TLS</label>
                </div>
                <button
                  type="button"
                  onClick={() => setSmtpUseSsl(!smtpUseSsl)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                    smtpUseSsl 
                      ? "bg-blue-500/5 border-blue-500/30 text-blue-400" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-500"
                  }`}
                >
                  <span>Requer Conexão Segura (SSL)</span>
                  {smtpUseSsl ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
                </button>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Usuário / E-mail de Envio</label>
                <input
                  type="email"
                  required
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="usuario@zoho.com"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                  <span>Senha / Token de App</span>
                  <span className="text-[9px] text-amber-500 flex items-center gap-0.5 normal-case">
                    <Lock className="w-2.5 h-2.5" /> Recomenda-se Senha de Aplicativo Zoho
                  </span>
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="••••••••••••••••••••••••"
                />
              </div>
            </div>
          </div>

          {/* Inbound IMAP settings */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>📥</span> Servidor de Entrada (IMAP - Recepção)
              </h4>
              <button
                type="button"
                onClick={() => setEnableReception(!enableReception)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border transition ${
                  enableReception 
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                }`}
              >
                {enableReception ? "Sincronização Ativa" : "Desativado"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">IMAP Host</label>
                <input
                  type="text"
                  required={enableReception}
                  disabled={!enableReception}
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono disabled:opacity-40"
                  placeholder="imap.zoho.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">IMAP Porta</label>
                <input
                  type="number"
                  required={enableReception}
                  disabled={!enableReception}
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono disabled:opacity-40"
                  placeholder="993"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Frequência de Varredura</label>
                <select
                  disabled={!enableReception}
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
                >
                  <option value={1}>A cada 1 minuto</option>
                  <option value={5}>A cada 5 minutos</option>
                  <option value={10}>A cada 10 minutos</option>
                  <option value={30}>A cada 30 minutos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">IMAP SSL/TLS</label>
                <button
                  type="button"
                  disabled={!enableReception}
                  onClick={() => setImapUseSsl(!imapUseSsl)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-40 ${
                    imapUseSsl 
                      ? "bg-blue-500/5 border-blue-500/30 text-blue-400" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-500"
                  }`}
                >
                  <span>Requer SSL Seguro</span>
                  {imapUseSsl ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-zinc-600" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp WAHA API Panel */}
        <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 md:p-6 space-y-6 flex flex-col shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">WhatsApp Gateway (WAHA API)</h3>
                <p className="text-zinc-500 text-[10px]">Envio de mensagens do funil em massa via API</p>
              </div>
            </div>
            
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase self-start sm:self-auto shrink-0">
              WAHA Core v2
            </span>
          </div>

          <div className="space-y-4 flex-1">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5 border-b border-zinc-850/60 pb-1.5">
              <span>📡</span> Parâmetros de Comunicação WAHA
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">URL da API WAHA (IP & Porta)</label>
                <input
                  type="text"
                  required
                  value={wahaUrl}
                  onChange={(e) => setWahaUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="http://localhost:3000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome da Sessão WAHA</label>
                <input
                  type="text"
                  required
                  value={wahaSession}
                  onChange={(e) => setWahaSession(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="default"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Intervalo Antispam (Segundos)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={wahaDelay}
                  onChange={(e) => setWahaDelay(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                  <span>API Key / Token de Autenticação (Opcional)</span>
                  <span className="text-[9px] text-zinc-500 flex items-center gap-0.5 font-mono">
                    <Key className="w-2.5 h-2.5" /> X-Api-Key
                  </span>
                </label>
                <input
                  type="password"
                  value={wahaApiKey}
                  onChange={(e) => setWahaApiKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="Insira a chave X-Api-Key configurada no WAHA"
                />
              </div>
            </div>
          </div>

          {/* Webhook Reception settings */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <span>🔄</span> Webhook de Entrada (Recepção de Respostas)
              </h4>
              <button
                type="button"
                onClick={() => setWebhookActive(!webhookActive)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border transition ${
                  webhookActive 
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                    : "bg-zinc-950 border-zinc-800 text-zinc-500"
                }`}
              >
                {webhookActive ? "Webhook Ouvindo" : "Desativado"}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">URL de Destino do Webhook</label>
              <input
                type="text"
                required={webhookActive}
                disabled={!webhookActive}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-40"
                placeholder="https://seu-sistema.com/api/webhooks/whatsapp"
              />
              <span className="text-[10px] text-zinc-500 block">
                Cadastre essa URL no console do seu WAHA para que respostas do cliente retornem ao funil automaticamente.
              </span>
            </div>
          </div>
        </div>

        {/* Global form submit actions */}
        <div className="col-span-12 flex flex-col md:flex-row items-center justify-end gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Salvando Parâmetros...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Gravar Configurações no Banco
              </>
            )}
          </button>
        </div>
      </form>

      {/* Central de Testes de Canais (Diagnóstico & Disparo Real) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-6 shadow-xl">
        <div className="border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-500" />
              Central de Testes Avançados (Diagnóstico & Disparo Real)
            </h3>
            <p className="text-xs text-zinc-400">
              Teste as credenciais informadas acima enviando e-mails reais em HTML ou mensagens de WhatsApp instantâneas para qualquer destino.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* E-mail Outbound (SMTP) Test Form */}
          <div className="bg-zinc-950/40 border border-zinc-850/70 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
              <Mail className="w-3.5 h-3.5" /> 1. Teste de E-mail (SMTP Outbound)
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">E-mail de Destino</label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="destino@exemplo.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Carregar Modelo da Esteira (Opcional)</label>
                <select
                  value={selectedEmailTemplateStage}
                  onChange={(e) => {
                    const stageName = e.target.value;
                    setSelectedEmailTemplateStage(stageName);
                    if (stageName) {
                      const stg = workflowStages.find(s => s.etapa === stageName && s.canal === "EMAIL");
                      if (stg) {
                        setTestEmailSubject(stg.assunto_template || "");
                        setTestEmailBody(stg.mensagem_template || "");
                      }
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                >
                  <option value="">-- Digitar Texto Manual --</option>
                  {workflowStages.filter(s => s.canal === "EMAIL").map(s => (
                    <option key={s.etapa} value={s.etapa}>
                      E-mail: {s.template_name ? s.template_name.replace(/_/g, " ") : s.etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Assunto do E-mail</label>
                <input
                  type="text"
                  value={testEmailSubject}
                  onChange={(e) => setTestEmailSubject(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Assunto da mensagem de teste"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                  <span>Corpo do E-mail (Suporta HTML!)</span>
                  <span className="text-[9px] text-blue-400 font-mono">HTML Tag Ready</span>
                </label>
                <textarea
                  rows={4}
                  value={testEmailBody}
                  onChange={(e) => setTestEmailBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 font-mono resize-none text-[11px]"
                  placeholder="<p>Escreva o e-mail em HTML aqui...</p>"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingEmail || !testEmailRecipient}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md border border-blue-500/10"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando E-mail de Teste...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Disparar E-mail de Teste Real
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp Outbound (WAHA) Test Form */}
          <div className="bg-zinc-950/40 border border-zinc-850/70 p-4 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-850/60 pb-2">
              <MessageSquare className="w-3.5 h-3.5" /> 2. Teste de WhatsApp (WAHA Outbound)
            </h4>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Celular de Destino (Com DDD)</label>
                <input
                  type="text"
                  value={testWhatsappRecipient}
                  onChange={(e) => setTestWhatsappRecipient(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  placeholder="Ex: 11999999999"
                />
                <span className="text-[9px] text-zinc-500 block">O sistema cuidará de formatar o DDI (55) automaticamente.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Carregar Modelo da Esteira (Opcional)</label>
                <select
                  value={selectedWhatsappTemplateStage}
                  onChange={(e) => {
                    const stageName = e.target.value;
                    setSelectedWhatsappTemplateStage(stageName);
                    if (stageName) {
                      const stg = workflowStages.find(s => s.etapa === stageName && s.canal === "WHATSAPP");
                      if (stg) {
                        setTestWhatsappBody(stg.mensagem_template || "");
                      }
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value="">-- Digitar Texto Manual --</option>
                  {workflowStages.filter(s => s.canal === "WHATSAPP").map(s => (
                    <option key={s.etapa} value={s.etapa}>
                      WhatsApp: {s.template_name ? s.template_name.replace(/_/g, " ") : s.etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Corpo da Mensagem</label>
                <textarea
                  rows={5}
                  value={testWhatsappBody}
                  onChange={(e) => setTestWhatsappBody(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 resize-none text-[11px]"
                  placeholder="Escreva a mensagem de texto do WhatsApp aqui..."
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestWhatsApp}
                disabled={sendingWa || !testWhatsappRecipient}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md border border-emerald-500/10"
              >
                {sendingWa ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Enviando WhatsApp de Teste...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Disparar WhatsApp de Teste Real
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Console Logs Terminal output */}
        {testLogs.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <span>💻</span> Retorno Técnico do Servidor (Logs)
              </span>
              <div>
                {testSuccess === true && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> OPERAÇÃO CONCLUÍDA COM SUCESSO
                  </span>
                )}
                {testSuccess === false && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> ALERTA DE ERRO NO CANAL
                  </span>
                )}
                {testSuccess === null && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full animate-pulse">
                    EXECUTANDO OPERAÇÃO...
                  </span>
                )}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-[10px] leading-relaxed text-zinc-300 space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar border-dashed">
              {testLogs.map((logStr, idx) => {
                let textClass = "text-zinc-400";
                if (logStr.includes("[OK]") || logStr.includes("sucesso") || logStr.includes("Operacional") || logStr.includes("SUCESSO")) {
                  textClass = "text-emerald-400 font-semibold";
                } else if (logStr.includes("[ERRO]") || logStr.includes("Falha") || logStr.includes("failed") || logStr.includes("FALHA")) {
                  textClass = "text-rose-400 font-semibold";
                } else if (logStr.includes("[AVISO]") || logStr.includes("Aviso") || logStr.includes("offline")) {
                  textClass = "text-amber-400";
                }
                return (
                  <div key={idx} className={textClass}>
                    {logStr}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
