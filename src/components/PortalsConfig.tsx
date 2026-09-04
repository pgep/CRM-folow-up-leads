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
      <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
              Canais Originários & Portais de Captura
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-3xl">
              Gerencie os canais de entrada de leads do ecossistema (Instagram, Google Ads, Indicação, Casamentos.com.br, etc.). Os canais ativos alimentam automaticamente seletores e filtros em todo o CRM. Cada canal possui um Webhook Endpoint dedicado para receber leads automaticamente via <strong>n8n</strong>, <strong>Zapier</strong> ou formulários externos.
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
              className={`bg-[#12151C] border rounded-2xl p-5 transition-all shadow-xs ${
                portal.ativo 
                  ? "border-white/[0.08] hover:border-white/[0.14]" 
                  : "border-white/[0.04] opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    portal.ativo 
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                      : "bg-white/[0.04] text-zinc-500 border-white/[0.06]"
                  }`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">{portal.nome}</h4>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">ID: {portal.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggle(portal.id, !portal.ativo)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                      portal.ativo
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                        : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:bg-white/[0.07]"
                    }`}
                  >
                    {portal.ativo ? (
                      <>
                        <Power className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ativo</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Inativo</span>
                      </>
                    )}
                  </button>

                  {onDelete && (
                    <button
                      onClick={async () => {
                        if (confirm(`Deseja remover o canal "${portal.nome}"?`)) {
                          await onDelete(portal.id);
                          toast.success("Canal removido!");
                        }
                      }}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-500/20"
                      title="Excluir canal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Webhook endpoint card */}
              <div className="mt-4 bg-[#0B0D12] border border-white/[0.06] rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-indigo-400" />
                    Webhook Endpoint API
                  </span>
                  <button
                    onClick={() => copyWebhookUrl(portal.id)}
                    className="text-xs font-mono font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    {copiedId === portal.id ? "✓ Copiado!" : "Copiar URL"}
                  </button>
                </div>
                <div className="font-mono text-xs text-zinc-300 bg-[#12151C] p-2.5 rounded-lg border border-white/[0.06] truncate select-all">
                  {webhookUrl}
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick portal addition */}
        <div className="bg-[#12151C]/60 border border-dashed border-white/[0.12] hover:border-white/[0.2] rounded-2xl p-5 flex flex-col justify-center min-h-[175px] transition-colors">
          <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Cadastrar Novo Canal Originário
          </h4>
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            Cadastre novos canais de entrada para refletir instantaneamente nas opções de prospecção e combos do CRM.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newPortalName}
              onChange={(e) => setNewPortalName(e.target.value)}
              placeholder="Ex: Anúncios Instagram, Feiras, Indicação"
              className="flex-1 bg-[#0B0D12] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
            />
            <button
              type="submit"
              disabled={loading || !newPortalName.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl transition shrink-0 cursor-pointer shadow-sm"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>

      {/* NEW: Dedicated n8n Webhook Integration Guide */}
      <div className="bg-[#12151C] border border-white/[0.08] rounded-2xl overflow-hidden mt-6 shadow-xs" id="n8n-webhook-guide">
        <div className="p-5 border-b border-white/[0.06] bg-[#171d2b]/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Guia de Integração n8n & Zoho Mail
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
            Recomendado
          </span>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">Como funciona o fluxo?</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Quando um e-mail de noiva chega à caixa do Zoho Mail, seu fluxo do <strong>n8n</strong> lê a mensagem, extrai os dados fundamentais e faz uma chamada HTTP <code className="bg-[#0B0D12] px-1.5 py-0.5 rounded border border-white/[0.08] text-indigo-400 font-mono text-[11px]">POST</code> para a URL do webhook abaixo.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O CRM Casa Colombo receberá esses dados, criará automaticamente o lead, efetuará o cálculo de orçamento correspondente ao número de convidados fornecido e **iniciará imediatamente a esteira de follow-up** (disparando o e-mail ou WhatsApp de boas-vindas com o orçamento sem qualquer espera).
            </p>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-400" />
                URL Única do Webhook para n8n
              </span>
              <button
                onClick={() => {
                  const fullUrl = `${window.location.origin}/api/leads/n8n-webhook`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success("URL de integração do n8n copiada com sucesso!");
                }}
                className="text-xs font-mono font-medium text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
              >
                Copiar URL
              </button>
            </div>
            <div className="font-mono text-xs text-indigo-400 bg-[#0B0D12] p-3.5 rounded-xl border border-white/[0.08] truncate select-all">
              {window.location.origin}/api/leads/n8n-webhook
            </div>
          </div>

          {/* JSON Schema Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              Estrutura JSON Esperada (Exemplo de Payload)
            </span>
            <div className="bg-[#0B0D12] p-4 rounded-xl border border-white/[0.08] text-xs font-mono text-zinc-300 overflow-x-auto max-h-72 custom-scrollbar">
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
            <p className="text-[11px] text-zinc-400 leading-relaxed italic">
              * Nota: O sistema possui mapeamento inteligente. Se enviar os campos em inglês (como <code className="text-indigo-400 font-mono">name</code>, <code className="text-indigo-400 font-mono">email</code>, <code className="text-indigo-400 font-mono">phone</code>, <code className="text-indigo-400 font-mono">wedding_date</code>, <code className="text-indigo-400 font-mono">guests</code>), o CRM irá traduzir e salvar os dados corretamente sem erros.
            </p>
          </div>

          {/* n8n Implementation Checklist */}
          <div className="space-y-3 bg-[#0B0D12] p-5 rounded-xl border border-white/[0.06]">
            <h5 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Como configurar no n8n (Passo a Passo)
            </h5>
            <ul className="text-xs text-zinc-400 space-y-2.5 pl-4 list-decimal leading-relaxed">
              <li>Adicione um nó <strong>HTTP Request</strong> no seu fluxo n8n logo após a extração dos dados do e-mail.</li>
              <li>Configure o método como <strong className="text-indigo-400">POST</strong>.</li>
              <li>No campo <strong>URL</strong>, cole o link copiado acima.</li>
              <li>Configure o <strong>Authentication</strong> como <strong className="text-zinc-300">None</strong> (o webhook é público para facilitar a recepção).</li>
              <li>Em <strong>Send Body</strong>, selecione <strong className="text-zinc-300">true</strong>, formato <strong className="text-zinc-300">JSON</strong>.</li>
              <li>Mapeie as propriedades do e-mail extraído para as chaves do JSON correspondente (como <code className="text-zinc-300 font-mono">nome</code>, <code className="text-zinc-300 font-mono">email</code>, <code className="text-zinc-300 font-mono">link_celular</code>, etc.).</li>
              <li>Execute o teste e veja o lead aparecer instantaneamente no painel com o histórico preenchido!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
