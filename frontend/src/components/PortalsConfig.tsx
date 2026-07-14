/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Globe, Check, Power, PowerOff, ShieldCheck, Link, Trash2 } from "lucide-react";
import { PortalSource } from "../types";

interface PortalsConfigProps {
  portals: PortalSource[];
  onToggle: (id: string, active: boolean) => void;
  onAdd: (nome: string) => Promise<void>;
}

export default function PortalsConfig({ portals, onToggle, onAdd }: PortalsConfigProps) {
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
    } catch (e) {
      console.error(e);
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
          <Globe className="w-5 h-5 text-amber-500" />
          Gerenciamento de Portais & Integrações Dinâmicas
        </h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Atualmente o CRM recebe leads do <strong>Portal Noivas</strong> via automação Zoho E-mail. No entanto, você pode expandir o ecossistema adicionando novos canais dinâmicos de captura (como Casamentos.com.br, formulário próprio do seu site, ou Zankyou). Ative ou desative cada portal, e utilize a URL do Webhook correspondente para integrar com ferramentas externas de automação como <strong>n8n</strong> ou <strong>Zapier</strong>.
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
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${portal.ativo ? "bg-amber-500/10 text-amber-400" : "bg-zinc-800 text-zinc-500"}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{portal.nome}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">ID: {portal.id}</p>
                  </div>
                </div>

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
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
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
            <Plus className="w-4 h-4 text-amber-400" />
            Cadastrar Novo Portal
          </h4>
          <p className="text-xs text-zinc-500 mb-4">
            Crie canais adicionais de venda para rastrear suas taxas de conversão de leads de forma independente.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newPortalName}
              onChange={(e) => setNewPortalName(e.target.value)}
              placeholder="Ex: casamentos_com_br"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600"
            />
            <button
              type="submit"
              disabled={loading || !newPortalName.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition shrink-0"
            >
              Adicionar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
