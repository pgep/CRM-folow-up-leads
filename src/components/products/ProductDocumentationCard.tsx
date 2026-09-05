import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

export const ProductDocumentationCard: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className="rounded-2xl border transition-colors shadow-xs overflow-hidden"
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition hover:opacity-90 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4
              className="text-xs sm:text-sm font-bold tracking-tight"
              style={{ color: "var(--crm-text)" }}
            >
              Como usar os orçamentos dinâmicos no texto das mensagens?
            </h4>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Guia rápido de substituição automática de valores e links nas esteiras de automação
            </p>
          </div>
        </div>

        <div
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
          style={{ color: "var(--crm-text-muted)" }}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div
          className="px-5 pb-5 pt-1 border-t space-y-3.5 text-xs transition-colors"
          style={{
            borderColor: "var(--crm-border)",
            color: "var(--crm-text-secondary)",
          }}
        >
          <p className="leading-relaxed">
            No editor das mensagens do workflow, você pode digitar chaves correspondentes aos produtos criados acima.
            O sistema substituirá automaticamente as chaves multiplicando a quantidade de convidados do lead pelo preço unitário do produto.
          </p>

          <div
            className="rounded-xl p-4 font-mono text-[11px] border space-y-2"
            style={{
              backgroundColor: "var(--crm-surface-subtle)",
              borderColor: "var(--crm-border)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span
                className="text-[10px] font-bold uppercase tracking-wider font-sans"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                Exemplo de Mensagem:
              </span>
            </div>

            <p style={{ color: "var(--crm-text)" }}>
              Olá <code className="text-indigo-600 dark:text-indigo-400">{"{"}nome{"}"}</code>, tudo bem? Para o seu casamento com{" "}
              <code className="text-indigo-600 dark:text-indigo-400">{"{"}convidados{"}"}</code> convidados no local{" "}
              <code className="text-indigo-600 dark:text-indigo-400">{"{"}local{"}"}</code>, nossa sugestão é o produto{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {"{"}descricao_vela_vidro{"}"}
              </span>.
            </p>

            <p style={{ color: "var(--crm-text)" }}>
              O orçamento total para as lembranças ficaria em{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {"{"}orcamento_vela_vidro{"}"}
              </span>{" "}
              (com o preço unitário especial de{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                {"{"}preco_unitario_vela_vidro{"}"}
              </span>).
            </p>

            <p style={{ color: "var(--crm-text)" }}>
              Você pode dar uma olhada na imagem dele aqui:{" "}
              <span className="text-indigo-600 dark:text-indigo-400">
                {"{"}imagem_vela_vidro{"}"}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
