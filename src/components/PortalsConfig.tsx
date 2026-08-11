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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#89F0B2]" />
          Cadastro de Canais Originários & Portais de Captura
        </h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Gerencie e cadastre todos os canais de origem de leads do seu ecossistema (ex: Instagram, Google, Indicação, Casamentos.com.br, Portal Noivas, etc.). Os canais ativos configurados nesta tela alimentam automaticamente os seletores (combos) de cadastro e filtros do CRM. Cada canal possui também uma URL única de Webhook para integrações com <strong>n8n</strong>, <strong>Zapier</strong> ou formulários.
        </p>
      </div>

      {/* Grid of Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {portals.map((portal) => {
          const webhookUrl = `${window.location.origin}/api/leads/webhook?portal=${portal.id}`;

          return (
            <div
              key={portal.id}
              className={`bg-zinc-900 border rounded-xl p-5 transition-all ${
                portal.ativo ? "border-zinc-800" : "border-zinc-800/40 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${portal.ativo ? "bg-[#89F0B2]/10 text-[#89F0B2]" : "bg-zinc-800 text-zinc-500"}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{portal.nome}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">ID Identificador: {portal.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggle(portal.id, !portal.ativo)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                      portal.ativo
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700"
                    }`}
                  >
                    {portal.ativo ? (
                      <>
                        <Power className="w-3.5 h-3.5" />
                        Ativo
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-3.5 h-3.5" />
                        Inativo
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
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Excluir canal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Webhook endpoint card */}
              <div className="mt-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                    <Link className="w-3.5 h-3.5" />
                    Webhook Endpoint API
                  </span>
                  <button
                    onClick={() => copyWebhookUrl(portal.id)}
                    className="text-xs text-[#89F0B2] hover:text-[#72e29e] font-medium transition"
                  >
                    {copiedId === portal.id ? "Copiado!" : "Copiar URL"}
                  </button>
                </div>
                <div className="mt-1.5 font-mono text-xs text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-900 truncate">
                  {webhookUrl}
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick portal addition */}
        <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-5 flex flex-col justify-center min-h-[175px]">
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#89F0B2]" />
            Cadastrar Novo Canal Originário
          </h4>
          <p className="text-xs text-zinc-500 mb-4">
            Cadastre canais personalizados de prospecção para que apareçam automaticamente nas listas e seletores do CRM.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newPortalName}
              onChange={(e) => setNewPortalName(e.target.value)}
              placeholder="Ex: Anúncios Instagram, Feiras, Indicação"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#89F0B2] placeholder-zinc-600"
            />
            <button
              type="submit"
              disabled={loading || !newPortalName.trim()}
              className="px-4 py-2 bg-[#89F0B2] hover:bg-[#72e29e] disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition shrink-0"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>

      {/* NEW: Dedicated n8n Webhook Integration Guide */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-6" id="n8n-webhook-guide">
        <div className="p-5 border-b border-zinc-850 bg-zinc-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#89F0B2]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Guia de Integração n8n & Zoho Mail
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Recomendado
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Como funciona o fluxo?</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Quando um e-mail de noiva chega à caixa do Zoho Mail, seu fluxo do <strong>n8n</strong> lê a mensagem, extrai os dados fundamentais e faz uma chamada HTTP <code className="bg-zinc-950 px-1 py-0.5 rounded border border-zinc-850 text-[#89F0B2] font-mono text-[11px]">POST</code> para a URL do webhook abaixo.
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O CRM Casa Colombo receberá esses dados, criará automaticamente o lead, efetuará o cálculo de orçamento correspondente ao número de convidados fornecido e **iniciará imediatamente a esteira de follow-up** (disparando o e-mail ou WhatsApp de boas-vindas com o orçamento sem qualquer espera).
            </p>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-[#89F0B2]" />
                URL Única do Webhook para n8n
              </span>
              <button
                onClick={() => {
                  const fullUrl = `${window.location.origin}/api/leads/n8n-webhook`;
                  navigator.clipboard.writeText(fullUrl);
                  toast.success("URL de integração do n8n copiada com sucesso!");
                }}
                className="text-xs text-[#89F0B2] hover:text-[#72e29e] font-medium transition"
              >
                Copiar URL
              </button>
            </div>
            <div className="font-mono text-xs text-[#89F0B2] bg-zinc-950 p-3 rounded border border-zinc-850 truncate select-all">
              {window.location.origin}/api/leads/n8n-webhook
            </div>
          </div>

          {/* JSON Schema Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-[#89F0B2]" />
              Estrutura JSON Esperada (Exemplo de Payload)
            </span>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-850 text-xs font-mono text-zinc-400 overflow-x-auto max-h-72">
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
            <p className="text-[10px] text-zinc-500 leading-relaxed italic">
              * Nota: O sistema possui mapeamento inteligente. Se enviar os campos em inglês (como <code className="text-zinc-400">name</code>, <code className="text-zinc-400">email</code>, <code className="text-zinc-400">phone</code>, <code className="text-zinc-400">wedding_date</code>, <code className="text-zinc-400">guests</code>), o CRM irá traduzir e salvar os dados corretamente sem erros.
            </p>
          </div>

          {/* n8n Implementation Checklist */}
          <div className="space-y-3 bg-zinc-950/40 p-4 rounded-lg border border-zinc-850">
            <h5 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#89F0B2]" />
              Como configurar no n8n (Passo a Passo)
            </h5>
            <ul className="text-xs text-zinc-400 space-y-2 pl-4 list-decimal leading-relaxed">
              <li>Adicione um nó <strong>HTTP Request</strong> no seu fluxo n8n logo após a extração dos dados do e-mail.</li>
              <li>Configure o método como <strong className="text-[#89F0B2]">POST</strong>.</li>
              <li>No campo <strong>URL</strong>, cole o link copiado acima.</li>
              <li>Configure o <strong>Authentication</strong> como <strong className="text-zinc-300">None</strong> (o webhook é público para facilitar a recepção).</li>
              <li>Em <strong>Send Body</strong>, selecione <strong className="text-zinc-300">true</strong>, formato <strong className="text-zinc-300">JSON</strong>.</li>
              <li>Mapeie as propriedades do e-mail extraído para as chaves do JSON correspondente (como <code className="text-zinc-300">nome</code>, <code className="text-zinc-300">email</code>, <code className="text-zinc-300">link_celular</code>, etc.).</li>
              <li>Execute o teste e veja o lead aparecer instantaneamente no painel com o histórico preenchido!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
