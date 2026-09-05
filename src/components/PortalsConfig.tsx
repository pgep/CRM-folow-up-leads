/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Globe, Check, Power, PowerOff, ShieldCheck, Link, Trash2, Zap, Code, HelpCircle } from "lucide-react";
import { PortalSource } from "../types";
import { useToast } from "./Toast";

interface PortalsConfigProps {
  portals: PortalSource[];
  onToggle: (id: string, active: boolean) => void;
  onAdd: (nome: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function PortalsConfig({ portals, onToggle, onAdd, onDelete }: PortalsConfigProps) {
  const { toast } = useToast();
  const [newPortalName, setNewPortalName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortalName.trim()) return;
    setLoading(true);
    try {
      await onAdd(newPortalName.trim());
      setNewPortalName("");
      toast.success("Canal originário cadastrado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao cadastrar canal originário.");
    } finally {
      setLoading(false);
    }
  };

  const copyWebhookUrl = (id: string) => {
    const fullUrl = `${window.location.origin}/api/leads/webhook?portal=${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner explanation */}
      <div 
        className="rounded-2xl p-5 sm:p-6 border transition-colors shadow-xs"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
        }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--crm-text)" }}
            >
              Canais Originários & Portais de Captura
            </h3>
            <p 
              className="text-xs mt-1.5 leading-relaxed max-w-3xl"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Gerencie os canais de entrada de leads do ecossistema (Instagram, Google Ads, Indicação, Casamentos.com.br, etc.). Os canais ativos alimentam automaticamente seletores e filtros em todo o CRM. Cada canal possui um Webhook Endpoint dedicado para receber leads automaticamente via <strong style={{ color: "var(--crm-text)" }}>n8n</strong>, <strong style={{ color: "var(--crm-text)" }}>Zapier</strong> ou formulários externos.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((portal) => {
          const webhookUrl = `${window.location.origin}/api/leads/webhook?portal=${portal.id}`;

          return (
            <div
              key={portal.id}
              className={`rounded-2xl p-5 transition-all shadow-xs border flex flex-col justify-between ${
                portal.ativo 
                  ? "hover:opacity-95" 
                  : "opacity-60 hover:opacity-80"
              }`}
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        portal.ativo 
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30" 
                          : "border"
                      }`}
                      style={!portal.ativo ? {
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-muted)"
                      } : undefined}
                    >
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 
                        className="text-sm font-bold tracking-tight"
                        style={{ color: "var(--crm-text)" }}
                      >
                        {portal.nome}
                      </h4>
                      <p 
                        className="text-[11px] font-mono mt-0.5"
                        style={{ color: "var(--crm-text-muted)" }}
                      >
                        ID: {portal.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggle(portal.id, !portal.ativo)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        portal.ativo
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                          : "hover:opacity-85"
                      }`}
                      style={!portal.ativo ? {
                        backgroundColor: "var(--crm-surface-subtle)",
                        borderColor: "var(--crm-border)",
                        color: "var(--crm-text-secondary)"
                      } : undefined}
                    >
                      {portal.ativo ? (
                        <>
                          <Power className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-3.5 h-3.5" style={{ color: "var(--crm-text-muted)" }} />
                          <span>Inativo</span>
                        </>
                      )}
                    </button>

                    {onDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Deseja remover o canal "${portal.nome}"?`)) {
                            await onDelete(portal.id);
                            toast.success("Canal removido!");
                          }
                        }}
                        className="p-1.5 rounded-lg transition cursor-pointer border border-transparent hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                        style={{ color: "var(--crm-text-muted)" }}
                        title="Excluir canal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Webhook endpoint card */}
                <div 
                  className="mt-4 rounded-xl p-3.5 space-y-2 border transition-colors"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)"
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Webhook Endpoint API</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyWebhookUrl(portal.id)}
                      className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:opacity-85 transition cursor-pointer"
                    >
                      {copiedId === portal.id ? "✓ Copiado!" : "Copiar URL"}
                    </button>
                  </div>
                  <div 
                    className="font-mono text-xs p-2.5 rounded-lg border truncate select-all"
                    style={{
                      backgroundColor: "var(--crm-surface)",
                      borderColor: "var(--crm-border)",
                      color: "var(--crm-text)"
                    }}
                  >
                    {webhookUrl}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick portal addition */}
        <div 
          className="border-2 border-dashed rounded-2xl p-5 flex flex-col justify-between min-h-[175px] transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)"
          }}
        >
          <div>
            <h4 
              className="text-sm font-bold mb-1.5 flex items-center gap-2"
              style={{ color: "var(--crm-text)" }}
            >
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cadastrar Novo Canal Originário</span>
            </h4>
            <p 
              className="text-xs mb-4 leading-relaxed"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Cadastre novos canais de entrada para refletir instantaneamente nas opções de prospecção e combos do CRM.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newPortalName}
              onChange={(e) => setNewPortalName(e.target.value)}
              placeholder="Ex: Anúncios Instagram, Feiras, Indicação"
              className="flex-1 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 border transition-colors"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            />
            <button
              type="submit"
              disabled={loading || !newPortalName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>

      {/* NEW: Dedicated n8n Webhook Integration Guide */}
      <div 
        className="rounded-2xl overflow-hidden mt-6 shadow-xs border transition-colors" 
        id="n8n-webhook-guide"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)"
        }}
      >
        <div 
          className="p-4 sm:p-5 border-b flex items-center justify-between"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)"
          }}
        >
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 
              className="text-xs font-bold uppercase tracking-wider font-mono"
              style={{ color: "var(--crm-text)" }}
            >
              Guia de Integração n8n & Zoho Mail
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
            Recomendado
          </span>
        </div>

        <div className="p-5 sm:p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h4 
              className="text-xs font-bold font-mono uppercase tracking-wider"
              style={{ color: "var(--crm-text)" }}
            >
              Como funciona o fluxo?
            </h4>
            <p 
              className="text-xs leading-relaxed"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Quando um e-mail de noiva chega à caixa do Zoho Mail, seu fluxo do <strong>n8n</strong> lê a mensagem, extrai os dados fundamentais e faz uma chamada HTTP <code className="px-1.5 py-0.5 rounded border font-mono text-[11px]" style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)", color: "var(--crm-text)" }}>POST</code> para a URL do webhook abaixo.
            </p>
            <p 
              className="text-xs leading-relaxed"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              O CRM Casa Colombo receberá esses dados, criará automaticamente o lead, efetuará o cálculo de orçamento correspondente ao número de convidados fornecido e **iniciará imediatamente a esteira de follow-up** (disparando o e-mail ou WhatsApp de boas-vindas com o orçamento sem qualquer espera).
            </p>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span 
                className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--crm-text)" }}
              >
                <Link className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>URL Única do Webhook para n8n</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const fullUrl = `${window.location.origin}/api/leads/n8n-webhook`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success("URL de integração do n8n copiada com sucesso!");
                }}
                className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:opacity-85 transition cursor-pointer"
              >
                Copiar URL
              </button>
            </div>
            <div 
              className="font-mono text-xs p-3.5 rounded-xl border truncate select-all"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            >
              {window.location.origin}/api/leads/n8n-webhook
            </div>
          </div>

          {/* JSON Schema Preview */}
          <div className="space-y-2">
            <span 
              className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--crm-text)" }}
            >
              <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Estrutura JSON Esperada (Exemplo de Payload)</span>
            </span>
            <div 
              className="p-4 rounded-xl border text-xs font-mono overflow-x-auto max-h-72 custom-scrollbar"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)"
              }}
            >
              <pre>{JSON.stringify({
  "nome": "Amanda Silva",
  "email": "amanda.silva@exemplo.com",
  "link_celular": "5511999998888",
  "data_casamento": "25/09/2026",
  "mes_casamento": "Setembro",
  "local": "Espaço Quintal, São Paulo",
  "servicos": "Mini Velas Aromáticas & Home Sprays",
  "convidados": 150,
  "status_funil": "Primeiro Contato",
  "etapa_contato": "Orçamento Enviado",
  "temperatura": "Fria",
  "observacoes": "Solitictou orçamento urgente para lembrancinhas aromáticas de casamento.",
  "origem_portal": "Zoho Mail - n8n"
}, null, 2)}</pre>
            </div>
            <p 
              className="text-[11px] leading-relaxed italic"
              style={{ color: "var(--crm-text-muted)" }}
            >
              * Nota: O sistema possui mapeamento inteligente. Se enviar os campos em inglês (como <code className="font-mono" style={{ color: "var(--crm-text)" }}>name</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>email</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>phone</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>wedding_date</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>guests</code>), o CRM irá traduzir e salvar os dados corretamente sem erros.
            </p>
          </div>

          {/* n8n Implementation Checklist */}
          <div 
            className="space-y-3 p-4 sm:p-5 rounded-xl border"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)"
            }}
          >
            <h5 
              className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--crm-text)" }}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Como configurar no n8n (Passo a Passo)</span>
            </h5>
            <ul 
              className="text-xs space-y-2.5 pl-4 list-decimal leading-relaxed"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              <li>Adicione um nó <strong>HTTP Request</strong> no seu fluxo n8n logo após a extração dos dados do e-mail.</li>
              <li>Configure o método como <strong className="text-indigo-600 dark:text-indigo-400">POST</strong>.</li>
              <li>No campo <strong>URL</strong>, cole o link copiado acima.</li>
              <li>Configure o <strong>Authentication</strong> como <strong style={{ color: "var(--crm-text)" }}>None</strong> (o webhook é público para facilitar a recepção).</li>
              <li>Em <strong>Send Body</strong>, selecione <strong style={{ color: "var(--crm-text)" }}>true</strong>, formato <strong style={{ color: "var(--crm-text)" }}>JSON</strong>.</li>
              <li>Mapeie as propriedades do e-mail extraído para as chaves do JSON correspondente (como <code className="font-mono" style={{ color: "var(--crm-text)" }}>nome</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>email</code>, <code className="font-mono" style={{ color: "var(--crm-text)" }}>link_celular</code>, etc.).</li>
              <li>Execute o teste e veja o lead aparecer instantaneamente no painel com o histórico preenchido!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
