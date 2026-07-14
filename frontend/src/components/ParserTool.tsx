/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Mail, Sparkles, Wand2, Calculator, Play, CheckCircle2, AlertTriangle, FileText, Send } from "lucide-react";
import { Lead } from "../types";

interface ParserToolProps {
  onLeadAdded: (lead: Lead) => void;
}

export default function ParserTool({ onLeadAdded }: ParserToolProps) {
  const [emailBody, setEmailBody] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const defaultTemplates = [
    {
      label: "Modelo 1: Portal Noivas (Padrão)",
      text: `De: express@portalnoivas.com.br
Assunto: Novo contato enviado de Portal Noivas - Contato Nº 82741

Nome: Larissa Silveira de Souza
Data do Casamento: 14/11/2026
E-mail: larissa.silveira94@gmail.com
Celular: (13) 98124-4322
Local do casamento: Recanto das Noivas, Guarujá - SP
Serviços: Lembrancinhas mini velas aromáticas e difusores
Número de Convidados: 120`
    },
    {
      label: "Modelo 2: Casamento Unstructured (Inovação AI)",
      text: `Olá Luciana, boa tarde! Meu nome é Beatriz Mendes, vi seu Instagram e amei suas velas de cera de coco.
Queria fazer um orçamento para o meu casamento, que vai acontecer no dia 05/12/2026 lá no Estação Filmes Eventos em Santos/SP.
Nossa expectativa é termos mais ou menos uns 200 convidados no dia.
Vocês fazem as mini velas na caixinha de kraft ou no vidro? Meu e-mail é beatriz_mendes@outlook.com e meu whats é (13) 99655-1212.
Obrigada e fico no aguardo do orçamento das lembranças!`
    }
  ];

  const handleApplyTemplate = (text: string) => {
    setEmailBody(text);
    setError(null);
    setSuccess(null);
  };

  const handleParse = async () => {
    if (!emailBody.trim()) {
      setError("Por favor, digite ou cole o conteúdo do e-mail.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/leads/zoho-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_body: emailBody, use_ai: useAI })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao processar o e-mail.");
      }

      setSuccess(data);
      onLeadAdded(data.lead);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Explanation banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-500" />
          Simulador de Entrada de Leads (Zoho E-mail)
        </h3>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          O primeiro contato da noiva geralmente vem por e-mail automatizado de portais. Esta ferramenta simula o nó <strong>E-mail Zoho Noivas</strong> de nossa automação. Ao ler o e-mail bruto, o parser extrai todos os dados estruturados da noiva, calcula os orçamentos unitários, cadastra o lead no funil, registra os logs e pré-visualiza a proposta de boas-vindas enviada de forma 100% autônoma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Conteúdo do E-mail Recebido</h4>
              
              <div className="flex gap-2">
                {defaultTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyTemplate(t.text)}
                    className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
                  >
                    {idx === 0 ? "Template Noivas" : "Unstructured AI"}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={12}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Cole aqui o e-mail enviado pelo portal ou digite o texto da noiva..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600 resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-zinc-400">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="rounded border-zinc-800 text-amber-500 bg-zinc-950 focus:ring-0 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Ativar Extração Inteligente com Gemini AI
                </span>
              </label>

              <button
                onClick={handleParse}
                disabled={loading || !emailBody.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition"
              >
                <Wand2 className="w-4 h-4" />
                {loading ? "Processando e-mail..." : "Extrair e Cadastrar Lead"}
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium">Falha na Extração</h5>
                <p className="text-xs text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="lg:col-span-5">
          {success ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80 animate-fade-in">
              <div className="p-4 bg-emerald-500/10 flex items-center gap-2.5 text-emerald-400 border-b border-zinc-800">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <h5 className="text-sm font-semibold">Lead Importado com Sucesso!</h5>
                  <p className="text-[10px] text-emerald-400/80">Workflow de automação inicializado e cadastrado no CRM</p>
                </div>
              </div>

              {/* Parsed Metadata card */}
              <div className="p-4 space-y-3">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Metadados Extraídos
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Nome da Noiva</span>
                    <span className="text-white font-medium">{success.parser_details.nome}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">E-mail</span>
                    <span className="text-white font-medium truncate block">{success.parser_details.email}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Celular</span>
                    <span className="text-white font-medium font-mono">{success.parser_details.linkCelular || "Não inf."}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Convidados</span>
                    <span className="text-white font-medium">{success.parser_details.convidados} pessoas</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Casamento</span>
                    <span className="text-white font-medium">
                      {success.parser_details.dataCasamento || "Data não informada"} ({success.parser_details.mesCasamento})
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Local</span>
                    <span className="text-white font-medium block truncate">{success.parser_details.local || "Não informado"}</span>
                  </div>
                </div>
              </div>

              {/* Budgets calculated card */}
              <div className="p-4 space-y-2">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5" />
                  Orçamento Calculado (Automático)
                </span>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-400">Vela Vidro Aromática (R$ 13,90)</span>
                    <span className="font-semibold text-white">{success.lead.soma1}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-400">Difusor Aromas (R$ 12,90)</span>
                    <span className="font-semibold text-white">{success.lead.soma2}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/40">
                    <span className="text-zinc-400">Home Spray 60ml (R$ 13,90)</span>
                    <span className="font-semibold text-white">{success.lead.soma3}</span>
                  </div>
                </div>
              </div>

              {/* Simulated welcome email proposal preview */}
              <div className="p-4 space-y-2.5">
                <span className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase flex items-center gap-1">
                  <Send className="w-3.5 h-3.5" />
                  E-mail de Proposta Enviado
                </span>

                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 font-mono leading-relaxed max-h-40 overflow-y-auto">
                  <div className="text-white font-semibold mb-1 border-b border-zinc-800 pb-1">
                    Assunto: {success.sent_email.assunto}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: success.sent_email.corpo }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <Wand2 className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
              <h5 className="text-sm font-medium text-zinc-500">Aguardando Importação</h5>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">
                Cole o e-mail de entrada no editor e clique para iniciar o motor do CRM.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
