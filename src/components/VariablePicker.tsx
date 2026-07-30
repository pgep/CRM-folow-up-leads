import React, { useState, useEffect } from "react";
import { Sparkles, Code, ChevronDown, ChevronUp, Check, Info, Box, User, Calendar, Calculator } from "lucide-react";

interface Product {
  id: string;
  nome: string;
  valor_unitario: number;
}

interface VariablePickerProps {
  onInsert: (variableTag: string) => void;
  compact?: boolean;
  className?: string;
}

export default function VariablePicker({ onInsert, compact = false, className = "" }: VariablePickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"lead" | "produtos" | "somas">("lead");

  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erro ao carregar produtos no VariablePicker:", err));
  }, []);

  const handleSelect = (tag: string) => {
    onInsert(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const leadVariables = [
    { tag: "{nome}", label: "Nome do Lead", desc: "Ex: Ana Clara" },
    { tag: "{email}", label: "E-mail", desc: "Ex: ana@email.com" },
    { tag: "{local}", label: "Local / Cidade", desc: "Ex: São Paulo - SP" },
    { tag: "{data_casamento}", label: "Data Casamento", desc: "Ex: 15/10/2026" },
    { tag: "{mes_casamento}", label: "Mês do Casamento", desc: "Ex: Outubro" },
    { tag: "{complementoMesCasamento}", label: "Frase do Mês", desc: "Ex: 'no mês de Outubro' ou 'em breve'" },
    { tag: "{dias_casamento}", label: "Dias Restantes", desc: "Ex: 45 (dias p/ o evento)" },
    { tag: "{convidados}", label: "Qtd. Convidados", desc: "Ex: 150" },
    { tag: "{servicos}", label: "Serviços Desejados", desc: "Ex: Lembrancinhas Aromáticas" },
    { tag: "{status}", label: "Status no Funil", desc: "Ex: Primeiro Contato" },
    { tag: "{temperatura}", label: "Temperatura", desc: "Ex: QUENTE" },
    { tag: "{origem_portal}", label: "Portal de Origem", desc: "Ex: Casamentos.com.br" },
  ];

  const legacySums = [
    { tag: "{soma1}", label: "Cotação Vela Vidro", desc: "Calculado dinamicamente" },
    { tag: "{soma2}", label: "Cotação Difusor", desc: "Calculado dinamicamente" },
    { tag: "{soma3}", label: "Cotação Home Spray", desc: "Calculado dinamicamente" },
    { tag: "{soma4}", label: "Cotação Mini Vela (80g)", desc: "Calculado dinamicamente" },
    { tag: "{soma5}", label: "Cotação Mini Vela (120g)", desc: "Calculado dinamicamente" },
  ];

  return (
    <div className={`bg-zinc-950 border border-zinc-800/90 rounded-xl p-3 text-xs space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#89F0B2]" />
          <span className="font-semibold text-white text-[11px] uppercase tracking-wider font-mono">
            Variáveis do Sistema
          </span>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">
            (Clique para inserir no texto)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[10px] font-mono text-[#89F0B2] hover:text-[#72e29e] flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md transition"
        >
          {isOpen ? (
            <>
              Esconder Guia <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Ver Todas Variáveis ({leadVariables.length + products.length * 4}) <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Quick Access Pills for Most Used Variables */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[9px] text-zinc-500 font-mono font-semibold uppercase mr-1">Rápidas:</span>
        {["{nome}", "{local}", "{dias_casamento}", "{mes_casamento}", "{convidados}"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSelect(tag)}
            className="px-2 py-0.5 bg-zinc-900 hover:bg-[#89F0B2]/15 text-[#89F0B2] hover:text-emerald-300 border border-[#89F0B2]/30 rounded text-[11px] font-mono transition flex items-center gap-1 active:scale-95"
            title={`Inserir ${tag}`}
          >
            {copiedTag === tag ? <Check className="w-3 h-3 text-emerald-400" /> : null}
            {tag}
          </button>
        ))}

        {products.slice(0, 2).map((p) => (
          <button
            key={`quick-${p.id}`}
            type="button"
            onClick={() => handleSelect(`{orcamento_${p.id}}`)}
            className="px-2 py-0.5 bg-zinc-900 hover:bg-amber-500/15 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded text-[11px] font-mono transition flex items-center gap-1 active:scale-95"
            title={`Inserir orçamento de ${p.nome}`}
          >
            {copiedTag === `{orcamento_${p.id}}` ? <Check className="w-3 h-3 text-amber-400" /> : null}
            {`{orcamento_${p.id}}`}
          </button>
        ))}
      </div>

      {/* Expanded Accordion with Categorized Variables */}
      {isOpen && (
        <div className="pt-2 border-t border-zinc-850 space-y-3 animate-fade-in">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
            <button
              type="button"
              onClick={() => setActiveCategory("lead")}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition ${
                activeCategory === "lead"
                  ? "bg-[#89F0B2] text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <User className="w-3 h-3" />
              Dados do Lead ({leadVariables.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("produtos")}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition ${
                activeCategory === "produtos"
                  ? "bg-[#89F0B2] text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Box className="w-3 h-3" />
              Orçamentos Produtos ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("somas")}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition ${
                activeCategory === "somas"
                  ? "bg-[#89F0B2] text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <Calculator className="w-3 h-3" />
              Legados / Somas ({legacySums.length})
            </button>
          </div>

          {/* Category Content */}
          {activeCategory === "lead" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {leadVariables.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleSelect(v.tag)}
                  className="text-left p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-[#89F0B2]/40 group transition flex items-start justify-between"
                >
                  <div>
                    <div className="font-mono text-[11px] text-[#89F0B2] group-hover:text-emerald-300 font-bold">
                      {v.tag}
                    </div>
                    <div className="text-[10px] text-zinc-300 font-medium">{v.label}</div>
                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{v.desc}</div>
                  </div>
                  {copiedTag === v.tag && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}

          {activeCategory === "produtos" && (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {products.length === 0 ? (
                <p className="text-[11px] text-zinc-500 p-2">Nenhum produto cadastrado no catálogo.</p>
              ) : (
                products.map((prod) => (
                  <div key={prod.id} className="bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>📦 {prod.nome}</span>
                      <span className="font-mono text-[10px] text-amber-400">R$ {Number(prod.valor_unitario).toFixed(2)}/un</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelect(`{orcamento_${prod.id}}`)}
                        className="p-1.5 rounded bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-left transition"
                      >
                        <div className="font-mono text-[10px] text-amber-300 font-bold">{`{orcamento_${prod.id}}`}</div>
                        <div className="text-[9px] text-zinc-400">Valor Total Calculado</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{preco_unitario_${prod.id}}`)}
                        className="p-1.5 rounded bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-left transition"
                      >
                        <div className="font-mono text-[10px] text-amber-300 font-bold">{`{preco_unitario_${prod.id}}`}</div>
                        <div className="text-[9px] text-zinc-400">Preço Unitário</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{descricao_${prod.id}}`)}
                        className="p-1.5 rounded bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-left transition"
                      >
                        <div className="font-mono text-[10px] text-amber-300 font-bold">{`{descricao_${prod.id}}`}</div>
                        <div className="text-[9px] text-zinc-400">Descrição do Produto</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{imagem_${prod.id}}`)}
                        className="p-1.5 rounded bg-zinc-950 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 text-left transition"
                      >
                        <div className="font-mono text-[10px] text-amber-300 font-bold">{`{imagem_${prod.id}}`}</div>
                        <div className="text-[9px] text-zinc-400">URL da Imagem</div>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeCategory === "somas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {legacySums.map((s) => (
                <button
                  key={s.tag}
                  type="button"
                  onClick={() => handleSelect(s.tag)}
                  className="text-left p-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-[#89F0B2]/40 group transition flex items-start justify-between"
                >
                  <div>
                    <div className="font-mono text-[11px] text-sky-400 group-hover:text-sky-300 font-bold">
                      {s.tag}
                    </div>
                    <div className="text-[10px] text-zinc-300 font-medium">{s.label}</div>
                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{s.desc}</div>
                  </div>
                  {copiedTag === s.tag && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
