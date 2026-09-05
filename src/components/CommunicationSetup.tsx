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

  // Redis lock configurations
  const [redisEnabled, setRedisEnabled] = useState(false);
  const [redisHost, setRedisHost] = useState("127.0.0.1");
  const [redisPort, setRedisPort] = useState(6379);
  const [redisUsername, setRedisUsername] = useState("");
  const [redisPassword, setRedisPassword] = useState("");
  const [redisUseSsl, setRedisUseSsl] = useState(false);
  const [redisKeyTemplate, setRedisKeyTemplate] = useState("pausa:{chatId}");
  const [redisValueTemplate, setRedisValueTemplate] = useState("bloqueado");
  const [redisExpire, setRedisExpire] = useState(true);
  const [redisTtl, setRedisTtl] = useState(86400);

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
          if (data.redis_lock) {
            setRedisEnabled(data.redis_lock.enabled !== undefined ? data.redis_lock.enabled : false);
            setRedisHost(data.redis_lock.host || "127.0.0.1");
            setRedisPort(data.redis_lock.port || 6379);
            setRedisUsername(data.redis_lock.username || "");
            setRedisPassword(data.redis_lock.password || "");
            setRedisUseSsl(data.redis_lock.use_ssl !== undefined ? data.redis_lock.use_ssl : false);
            setRedisKeyTemplate(data.redis_lock.key_template || "pausa:{chatId}");
            setRedisValueTemplate(data.redis_lock.value_template || "bloqueado");
            setRedisExpire(data.redis_lock.expire !== undefined ? data.redis_lock.expire : true);
            setRedisTtl(data.redis_lock.ttl || 86400);
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
        },
        redis_lock: {
          enabled: redisEnabled,
          host: redisHost,
          port: Number(redisPort),
          username: redisUsername,
          password: redisPassword,
          use_ssl: redisUseSsl,
          key_template: redisKeyTemplate,
          value_template: redisValueTemplate,
          expire: redisExpire,
          ttl: Number(redisTtl)
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

  const [testingRedis, setTestingRedis] = useState(false);

  const handleTestRedisConnection = async () => {
    setTestingRedis(true);
    setTestLogs(["Iniciando teste de conectividade e gravação com Redis..."]);
    setTestSuccess(null);
    try {
      const payload = {
        action: "test_redis",
        config: {
          redis_lock: {
            enabled: redisEnabled,
            host: redisHost,
            port: Number(redisPort),
            username: redisUsername,
            password: redisPassword,
            use_ssl: redisUseSsl,
            key_template: redisKeyTemplate,
            value_template: redisValueTemplate,
            expire: redisExpire,
            ttl: Number(redisTtl)
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
        setTestLogs(data.logs);
      }
      setTestSuccess(data.success);
      if (data.success) {
        toast.success("Teste de gravação no Redis concluído com sucesso!");
      } else {
        toast.error("O teste de conexão com o Redis falhou.");
      }
    } catch (err: any) {
      setTestLogs(prev => [...prev, `[ERRO]: Falha ao disparar o teste: ${err.message}`]);
      setTestSuccess(false);
      toast.error(`Falha no teste: ${err.message}`);
    } finally {
      setTestingRedis(false);
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
        },
        redis_lock: {
          enabled: redisEnabled,
          host: redisHost,
          port: Number(redisPort),
          username: redisUsername,
          password: redisPassword,
          use_ssl: redisUseSsl,
          key_template: redisKeyTemplate,
          value_template: redisValueTemplate,
          expire: redisExpire,
          ttl: Number(redisTtl)
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
          },
          redis_lock: {
            enabled: redisEnabled,
            host: redisHost,
            port: Number(redisPort),
            username: redisUsername,
            password: redisPassword,
            use_ssl: redisUseSsl,
            key_template: redisKeyTemplate,
            value_template: redisValueTemplate,
            expire: redisExpire,
            ttl: Number(redisTtl)
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
      <div
        className="border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[350px] shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--crm-text-secondary)" }}
        >
          Carregando configurações de canais...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="communication-setup-container">
      {/* Overview Card */}
      <div
        className="border p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
        id="communication-overview-card"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2
              className="text-base font-bold tracking-tight flex items-center gap-2"
              style={{ color: "var(--crm-text)" }}
            >
              Parâmetros de Disparo e Recepção (Zoho & WAHA)
            </h2>
            <p
              className="text-xs mt-1 max-w-2xl leading-relaxed"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Configure os parâmetros técnicos do servidor Zoho Mail (SMTP para envios e IMAP para captura de respostas) e do gateway WAHA (WhatsApp). Todas as rotinas automatizadas e manuais utilizam essas definições.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Persistência Segura
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Zoho Mail SMTP & IMAP Configuration Panel */}
        <div
          className="col-span-12 lg:col-span-6 border rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="zoho-mail-panel"
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </span>
              <div>
                <h3
                  className="font-bold text-sm"
                  style={{ color: "var(--crm-text)" }}
                >
                  E-mail Zoho (SMTP / IMAP)
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Envio de follow-up e leitura de novos leads
                </p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-500/30 uppercase self-start sm:self-auto shrink-0">
              Zoho Professional
            </span>
          </div>

          {/* Outbound SMTP settings */}
          <div className="space-y-4">
            <h4
              className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b pb-2"
              style={{
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)",
              }}
            >
              <span>✈️</span> Servidor de Saída (SMTP - Envio)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  SMTP Host
                </label>
                <input
                  type="text"
                  required
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="smtp.zoho.com"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  SMTP Porta
                </label>
                <input
                  type="number"
                  required
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="465"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Nome do Remetente
                </label>
                <input
                  type="text"
                  required
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="Luciana - Casa Colombo"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Segurança SSL/TLS
                </label>
                <button
                  type="button"
                  onClick={() => setSmtpUseSsl(!smtpUseSsl)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    smtpUseSsl
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-zinc-800 text-slate-500"
                  }`}
                  style={{
                    backgroundColor: !smtpUseSsl ? "var(--crm-surface-subtle)" : undefined,
                    borderColor: !smtpUseSsl ? "var(--crm-border)" : undefined,
                  }}
                >
                  <span className="text-xs">Requer SSL</span>
                  {smtpUseSsl ? (
                    <ToggleRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Usuário / E-mail de Envio
                </label>
                <input
                  type="email"
                  required
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="usuario@zoho.com"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  <span>Senha / Token de App</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3" /> Senha de Aplicativo Zoho recomendada
                  </span>
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="••••••••••••••••••••••••"
                />
              </div>
            </div>
          </div>

          {/* Inbound IMAP settings */}
          <div
            className="space-y-4 pt-4 border-t"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center justify-between">
              <h4
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                <span>📥</span> Servidor de Entrada (IMAP - Recepção)
              </h4>
              <button
                type="button"
                onClick={() => setEnableReception(!enableReception)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase border transition cursor-pointer ${
                  enableReception
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 dark:border-zinc-800 text-slate-500"
                }`}
                style={{
                  backgroundColor: !enableReception ? "var(--crm-surface-subtle)" : undefined,
                  borderColor: !enableReception ? "var(--crm-border)" : undefined,
                }}
              >
                {enableReception ? "Sincronização Ativa" : "Desativado"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  IMAP Host
                </label>
                <input
                  type="text"
                  required={enableReception}
                  disabled={!enableReception}
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="imap.zoho.com"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  IMAP Porta
                </label>
                <input
                  type="number"
                  required={enableReception}
                  disabled={!enableReception}
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="993"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Frequência de Varredura
                </label>
                <select
                  disabled={!enableReception}
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-40 cursor-pointer"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                >
                  <option value={1}>A cada 1 minuto</option>
                  <option value={5}>A cada 5 minutos</option>
                  <option value={10}>A cada 10 minutos</option>
                  <option value={30}>A cada 30 minutos</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  IMAP SSL/TLS
                </label>
                <button
                  type="button"
                  disabled={!enableReception}
                  onClick={() => setImapUseSsl(!imapUseSsl)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer disabled:opacity-40 ${
                    imapUseSsl
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-zinc-800 text-slate-500"
                  }`}
                  style={{
                    backgroundColor: !imapUseSsl ? "var(--crm-surface-subtle)" : undefined,
                    borderColor: !imapUseSsl ? "var(--crm-border)" : undefined,
                  }}
                >
                  <span className="text-xs">Requer SSL</span>
                  {imapUseSsl ? (
                    <ToggleRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp WAHA API Panel */}
        <div
          className="col-span-12 lg:col-span-6 border rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="whatsapp-waha-panel"
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </span>
              <div>
                <h3
                  className="font-bold text-sm"
                  style={{ color: "var(--crm-text)" }}
                >
                  WhatsApp Gateway (WAHA API)
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Envio de mensagens do funil em massa via API
                </p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/30 uppercase self-start sm:self-auto shrink-0">
              WAHA Core v2
            </span>
          </div>

          <div className="space-y-4 flex-1">
            <h4
              className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b pb-2"
              style={{
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)",
              }}
            >
              <span>📡</span> Parâmetros de Comunicação WAHA
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  URL da API WAHA (IP & Porta)
                </label>
                <input
                  type="text"
                  required
                  value={wahaUrl}
                  onChange={(e) => setWahaUrl(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="http://localhost:3000"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Nome da Sessão WAHA
                </label>
                <input
                  type="text"
                  required
                  value={wahaSession}
                  onChange={(e) => setWahaSession(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="default"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Intervalo Antispam (Segundos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={wahaDelay}
                  onChange={(e) => setWahaDelay(Number(e.target.value))}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  <span>API Key / Token de Autenticação (Opcional)</span>
                  <span
                    className="text-[10px] flex items-center gap-1 font-mono"
                    style={{ color: "var(--crm-text-muted)" }}
                  >
                    <Key className="w-3 h-3" /> X-Api-Key
                  </span>
                </label>
                <input
                  type="password"
                  value={wahaApiKey}
                  onChange={(e) => setWahaApiKey(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="Insira a chave X-Api-Key configurada no WAHA"
                />
              </div>
            </div>
          </div>

          {/* Webhook Reception settings */}
          <div
            className="space-y-4 pt-4 border-t"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center justify-between">
              <h4
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                <span>🔄</span> Webhook de Entrada (Recepção de Respostas)
              </h4>
              <button
                type="button"
                onClick={() => setWebhookActive(!webhookActive)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase border transition cursor-pointer ${
                  webhookActive
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "border-slate-200 dark:border-zinc-800 text-slate-500"
                }`}
                style={{
                  backgroundColor: !webhookActive ? "var(--crm-surface-subtle)" : undefined,
                  borderColor: !webhookActive ? "var(--crm-border)" : undefined,
                }}
              >
                {webhookActive ? "Webhook Ouvindo" : "Desativado"}
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider block"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                URL de Destino do Webhook
              </label>
              <input
                type="text"
                required={webhookActive}
                disabled={!webhookActive}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-40"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
                placeholder="https://seu-sistema.com/api/webhooks/whatsapp"
              />
              <span
                className="text-[11px] block mt-1"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Cadastre essa URL no console do seu WAHA para que respostas do cliente retornem ao funil automaticamente.
              </span>
            </div>
          </div>
        </div>

        {/* Redis Lock Configuration Panel */}
        <div
          className="col-span-12 border rounded-2xl p-5 sm:p-6 space-y-6 flex flex-col shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
          id="redis-lock-panel"
        >
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4" />
              </span>
              <div>
                <h3
                  className="font-bold text-sm"
                  style={{ color: "var(--crm-text)" }}
                >
                  Bloqueio & Pausa Temporária (Redis Lock Engine)
                </h3>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Grave chaves de bloqueio no Redis automaticamente ao enviar mensagens via WhatsApp
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRedisEnabled(!redisEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase border transition cursor-pointer ${
                redisEnabled
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
                  : "border-slate-200 dark:border-zinc-800 text-slate-500"
              }`}
              style={{
                backgroundColor: !redisEnabled ? "var(--crm-surface-subtle)" : undefined,
                borderColor: !redisEnabled ? "var(--crm-border)" : undefined,
              }}
            >
              {redisEnabled ? (
                <>
                  <ToggleRight className="w-4 h-4" /> Redis Ativo
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" /> Redis Desativado
                </>
              )}
            </button>
          </div>

          {redisEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Connection Parameters */}
              <div
                className="md:col-span-1 space-y-4 md:border-r border-b md:border-b-0 pb-6 md:pb-0 pr-0 md:pr-6"
                style={{ borderColor: "var(--crm-border)" }}
              >
                <h4
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b pb-2"
                  style={{
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-secondary)",
                  }}
                >
                  <span>⚙️</span> Acesso ao Servidor Redis
                </h4>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Host / IP do Redis
                    </label>
                    <input
                      type="text"
                      required={redisEnabled}
                      value={redisHost}
                      onChange={(e) => setRedisHost(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="127.0.0.1"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Porta
                    </label>
                    <input
                      type="number"
                      required={redisEnabled}
                      value={redisPort}
                      onChange={(e) => setRedisPort(Number(e.target.value))}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="6379"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Usuário (Opcional)
                    </label>
                    <input
                      type="text"
                      value={redisUsername}
                      onChange={(e) => setRedisUsername(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Senha (Opcional)
                    </label>
                    <input
                      type="password"
                      value={redisPassword}
                      onChange={(e) => setRedisPassword(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="Sua senha secreta do Redis"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setRedisUseSsl(!redisUseSsl)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        redisUseSsl
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
                          : "border-slate-200 dark:border-zinc-800 text-slate-500"
                      }`}
                      style={{
                        backgroundColor: !redisUseSsl ? "var(--crm-surface-subtle)" : undefined,
                        borderColor: !redisUseSsl ? "var(--crm-border)" : undefined,
                      }}
                    >
                      <span className="text-xs">Usar SSL/TLS (Seguro)</span>
                      {redisUseSsl ? (
                        <ToggleRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Key & Template Parameters */}
              <div className="md:col-span-2 space-y-4">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b pb-2"
                  style={{
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text-secondary)",
                  }}
                >
                  <span>🔒</span> Estrutura da Chave de Bloqueio (Redis Set Key)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      <span>Expressão de Chave (Key Template)</span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        Formato n8n / customizado
                      </span>
                    </label>
                    <input
                      type="text"
                      required={redisEnabled}
                      value={redisKeyTemplate}
                      onChange={(e) => setRedisKeyTemplate(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="pausa:{chatId}"
                    />
                    <p
                      className="text-[11px] leading-relaxed break-words"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Chave gravada no Redis. O parâmetro <code className="text-indigo-600 dark:text-indigo-400 font-mono px-1 py-0.5 rounded text-[10px] border border-indigo-200 dark:border-indigo-500/20">{`{chatId}`}</code> será substituído pelo Chat ID do WhatsApp (ex: <code className="font-mono text-slate-700 dark:text-zinc-300">5511999999999@c.us</code>).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-semibold uppercase tracking-wider block"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Valor da Chave (Value Template)
                    </label>
                    <input
                      type="text"
                      required={redisEnabled}
                      value={redisValueTemplate}
                      onChange={(e) => setRedisValueTemplate(e.target.value)}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="bloqueado"
                    />
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Valor associado à chave. Suporta expressões personalizadas.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pb-1">
                      <label
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--crm-text-secondary)" }}
                      >
                        Definir Expiração (TTL)
                      </label>
                      <button
                        type="button"
                        onClick={() => setRedisExpire(!redisExpire)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase border transition cursor-pointer ${
                          redisExpire
                            ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300"
                            : "border-slate-200 dark:border-zinc-800 text-slate-500"
                        }`}
                        style={{
                          backgroundColor: !redisExpire ? "var(--crm-surface-subtle)" : undefined,
                          borderColor: !redisExpire ? "var(--crm-border)" : undefined,
                        }}
                      >
                        {redisExpire ? "Ativo" : "Infinito"}
                      </button>
                    </div>

                    <input
                      type="number"
                      disabled={!redisExpire}
                      required={redisEnabled && redisExpire}
                      value={redisTtl}
                      onChange={(e) => setRedisTtl(Number(e.target.value))}
                      className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:opacity-40"
                      style={{
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text)",
                      }}
                      placeholder="86400"
                    />
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      Tempo em segundos. Padrão: 86400 segundos (24 horas).
                    </p>
                  </div>
                </div>

                {/* Direct Action Test Box */}
                <div
                  className="mt-4 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <div className="space-y-1">
                    <span
                      className="text-xs font-bold flex items-center gap-1.5 uppercase"
                      style={{ color: "var(--crm-text)" }}
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Testar Integração Redis
                    </span>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      O sistema tentará se conectar ao servidor Redis informado e gravar uma chave de teste de bloqueio temporário.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={testingRedis}
                    onClick={handleTestRedisConnection}
                    className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    {testingRedis ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Gravando no Redis...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Gravar Chave de Teste
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!redisEnabled && (
            <div
              className="border p-8 rounded-2xl flex flex-col items-center justify-center text-center transition-colors"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
              }}
            >
              <Lock
                className="w-8 h-8 mb-2"
                style={{ color: "var(--crm-text-muted)" }}
              />
              <p
                className="text-xs font-semibold"
                style={{ color: "var(--crm-text)" }}
              >
                O motor de Bloqueio Redis está atualmente desativado.
              </p>
              <p
                className="text-[11px] mt-1 max-w-lg leading-relaxed"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Ative o motor de bloqueio acima para configurar o acesso ao seu servidor Redis e salvar chaves de pausa automaticamente a cada envio do WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* Global form submit actions */}
        <div
          className="col-span-12 flex flex-col md:flex-row items-center justify-end gap-4 border p-4 rounded-2xl shadow-xs transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
        >
          <button
            type="submit"
            disabled={saving}
            className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
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
      <div
        className="border rounded-2xl p-5 sm:p-6 md:p-8 space-y-6 shadow-xs transition-colors"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
        id="testing-center-panel"
      >
        <div
          className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <div className="space-y-1">
            <h3
              className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"
              style={{ color: "var(--crm-text)" }}
            >
              <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Central de Testes Avançados (Diagnóstico & Disparo Real)
            </h3>
            <p
              className="text-xs"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Teste as credenciais informadas enviando e-mails reais em HTML ou mensagens de WhatsApp instantâneas para qualquer destino.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* E-mail Outbound (SMTP) Test Form */}
          <div
            className="border p-5 rounded-2xl space-y-4 shadow-xs transition-colors"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b pb-2.5"
              style={{ borderColor: "var(--crm-border)" }}
            >
              <Mail className="w-4 h-4" /> 1. Teste de E-mail (SMTP Outbound)
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  E-mail de Destino
                </label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="destino@exemplo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Carregar Modelo da Esteira (Opcional)
                </label>
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
                  className="w-full border rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                >
                  <option value="">-- Digitar Texto Manual --</option>
                  {workflowStages.filter(s => s.canal === "EMAIL").map(s => (
                    <option key={s.etapa} value={s.etapa}>
                      E-mail: {s.template_name ? s.template_name.replace(/_/g, " ") : s.etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Assunto do E-mail
                </label>
                <input
                  type="text"
                  value={testEmailSubject}
                  onChange={(e) => setTestEmailSubject(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="Assunto da mensagem de teste"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  <span>Corpo do E-mail (Suporta HTML)</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">HTML Tag Ready</span>
                </label>
                <textarea
                  rows={4}
                  value={testEmailBody}
                  onChange={(e) => setTestEmailBody(e.target.value)}
                  className="w-full border rounded-xl p-3 font-mono resize-none text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="<p>Escreva o e-mail em HTML aqui...</p>"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingEmail || !testEmailRecipient}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
          <div
            className="border p-5 rounded-2xl space-y-4 shadow-xs transition-colors"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b pb-2.5"
              style={{ borderColor: "var(--crm-border)" }}
            >
              <MessageSquare className="w-4 h-4" /> 2. Teste de WhatsApp (WAHA Outbound)
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Celular de Destino (Com DDD)
                </label>
                <input
                  type="text"
                  value={testWhatsappRecipient}
                  onChange={(e) => setTestWhatsappRecipient(e.target.value)}
                  className="w-full border rounded-xl px-3.5 py-2 font-mono text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="Ex: 11999999999"
                />
                <span
                  className="text-[10px] block"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  O sistema cuidará de formatar o DDI (55) automaticamente.
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Carregar Modelo da Esteira (Opcional)
                </label>
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
                  className="w-full border rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                >
                  <option value="">-- Digitar Texto Manual --</option>
                  {workflowStages.filter(s => s.canal === "WHATSAPP").map(s => (
                    <option key={s.etapa} value={s.etapa}>
                      WhatsApp: {s.template_name ? s.template_name.replace(/_/g, " ") : s.etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-[11px] font-semibold uppercase tracking-wider block"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Corpo da Mensagem
                </label>
                <textarea
                  rows={5}
                  value={testWhatsappBody}
                  onChange={(e) => setTestWhatsappBody(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  style={{
                    backgroundColor: "var(--crm-surface)",
                    borderColor: "var(--crm-border)",
                    color: "var(--crm-text)",
                  }}
                  placeholder="Escreva a mensagem de texto do WhatsApp aqui..."
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestWhatsApp}
                disabled={sendingWa || !testWhatsappRecipient}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
          <div
            className="space-y-3 pt-4 border-t"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                <span>💻</span> Retorno Técnico do Servidor (Logs)
              </span>
              <div>
                {testSuccess === true && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> OPERAÇÃO CONCLUÍDA COM SUCESSO
                  </span>
                )}
                {testSuccess === false && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 px-2.5 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> ALERTA DE ERRO NO CANAL
                  </span>
                )}
                {testSuccess === null && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full animate-pulse border"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text-secondary)",
                    }}
                  >
                    EXECUTANDO OPERAÇÃO...
                  </span>
                )}
              </div>
            </div>

            <div
              className="border rounded-xl p-4 font-mono text-xs leading-relaxed space-y-1.5 max-h-[220px] overflow-y-auto shadow-inner"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
              }}
            >
              {testLogs.map((logStr, idx) => {
                let textClass = "text-slate-600 dark:text-zinc-400";
                if (logStr.includes("[OK]") || logStr.includes("sucesso") || logStr.includes("Operacional") || logStr.includes("SUCESSO")) {
                  textClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                } else if (logStr.includes("[ERRO]") || logStr.includes("Falha") || logStr.includes("failed") || logStr.includes("FALHA")) {
                  textClass = "text-rose-600 dark:text-rose-400 font-semibold";
                } else if (logStr.includes("[AVISO]") || logStr.includes("Aviso") || logStr.includes("offline")) {
                  textClass = "text-amber-600 dark:text-amber-400";
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
