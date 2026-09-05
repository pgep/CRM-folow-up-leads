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
    { tag: "{mes_casamento}", label: "Mês / Ano do Casamento", desc: "Ex: Outubro / 2026" },
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
    <div
      className={`rounded-xl p-3 text-xs space-y-2.5 transition-colors border ${className}`}
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span
            className="font-semibold text-xs tracking-tight"
            style={{ color: "var(--crm-text)" }}
          >
            Variáveis Dinâmicas
          </span>
          <span
            className="text-[11px] hidden sm:inline"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            (Clique para inserir no texto)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer border"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
          }}
        >
          {isOpen ? (
            <>
              Esconder Guia <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Ver Todas ({leadVariables.length + products.length * 4}) <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Quick Access Pills for Most Used Variables */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span
          className="text-xs font-medium mr-1"
          style={{ color: "var(--crm-text-secondary)" }}
        >
          Rápidas:
        </span>
        {["{nome}", "{local}", "{dias_casamento}", "{mes_casamento}", "{convidados}"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleSelect(tag)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer border font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-500/30"
            title={`Inserir ${tag}`}
          >
            {copiedTag === tag ? <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> : null}
            {tag}
          </button>
        ))}

        {products.slice(0, 2).map((p) => (
          <button
            key={`quick-${p.id}`}
            type="button"
            onClick={() => handleSelect(`{orcamento_${p.id}}`)}
            className="px-2.5 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer border font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border-amber-200 dark:border-amber-500/30"
            title={`Inserir orçamento de ${p.nome}`}
          >
            {copiedTag === `{orcamento_${p.id}}` ? <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" /> : null}
            {`{orcamento_${p.id}}`}
          </button>
        ))}
      </div>

      {/* Expanded Accordion with Categorized Variables */}
      {isOpen && (
        <div
          className="pt-3 border-t space-y-3"
          style={{ borderColor: "var(--crm-border)" }}
        >
          {/* Category Tabs */}
          <div
            className="flex items-center gap-2 border-b pb-2 flex-wrap"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <button
              type="button"
              onClick={() => setActiveCategory("lead")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "lead"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:opacity-80 border"
              }`}
              style={
                activeCategory !== "lead"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      color: "var(--crm-text-secondary)",
                      borderColor: "var(--crm-border)",
                    }
                  : undefined
              }
            >
              <User className="w-3.5 h-3.5" />
              Dados do Lead ({leadVariables.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("produtos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "produtos"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:opacity-80 border"
              }`}
              style={
                activeCategory !== "produtos"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      color: "var(--crm-text-secondary)",
                      borderColor: "var(--crm-border)",
                    }
                  : undefined
              }
            >
              <Box className="w-3.5 h-3.5" />
              Orçamentos Produtos ({products.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("somas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                activeCategory === "somas"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "hover:opacity-80 border"
              }`}
              style={
                activeCategory !== "somas"
                  ? {
                      backgroundColor: "var(--crm-surface-subtle)",
                      color: "var(--crm-text-secondary)",
                      borderColor: "var(--crm-border)",
                    }
                  : undefined
              }
            >
              <Calculator className="w-3.5 h-3.5" />
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
                  className="text-left p-2.5 rounded-xl border transition flex items-start justify-between cursor-pointer group hover:border-indigo-500/50"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <div>
                    <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {v.tag}
                    </div>
                    <div
                      className="text-xs font-medium mt-0.5"
                      style={{ color: "var(--crm-text)" }}
                    >
                      {v.label}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      {v.desc}
                    </div>
                  </div>
                  {copiedTag === v.tag && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}

          {activeCategory === "produtos" && (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {products.length === 0 ? (
                <p
                  className="text-xs p-2"
                  style={{ color: "var(--crm-text-secondary)" }}
                >
                  Nenhum produto cadastrado no catálogo.
                </p>
              ) : (
                products.map((prod) => (
                  <div
                    key={prod.id}
                    className="border rounded-xl p-3 space-y-2.5"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      borderColor: "var(--crm-border)",
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span style={{ color: "var(--crm-text)" }}>📦 {prod.nome}</span>
                      <span className="font-mono text-xs text-amber-600 dark:text-amber-400">R$ {Number(prod.valor_unitario).toFixed(2)}/un</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelect(`{orcamento_${prod.id}}`)}
                        className="p-2 rounded-lg border text-left transition cursor-pointer hover:border-amber-500/50"
                        style={{
                          backgroundColor: "var(--crm-surface)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <div className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">{`{orcamento_${prod.id}}`}</div>
                        <div
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          Valor Total
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{preco_unitario_${prod.id}}`)}
                        className="p-2 rounded-lg border text-left transition cursor-pointer hover:border-amber-500/50"
                        style={{
                          backgroundColor: "var(--crm-surface)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <div className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">{`{preco_unitario_${prod.id}}`}</div>
                        <div
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          Preço Unitário
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{descricao_${prod.id}}`)}
                        className="p-2 rounded-lg border text-left transition cursor-pointer hover:border-amber-500/50"
                        style={{
                          backgroundColor: "var(--crm-surface)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <div className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">{`{descricao_${prod.id}}`}</div>
                        <div
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          Descrição
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(`{imagem_${prod.id}}`)}
                        className="p-2 rounded-lg border text-left transition cursor-pointer hover:border-amber-500/50"
                        style={{
                          backgroundColor: "var(--crm-surface)",
                          borderColor: "var(--crm-border)",
                        }}
                      >
                        <div className="font-mono text-xs text-amber-700 dark:text-amber-400 font-semibold">{`{imagem_${prod.id}}`}</div>
                        <div
                          className="text-[10px] mt-0.5"
                          style={{ color: "var(--crm-text-secondary)" }}
                        >
                          URL da Imagem
                        </div>
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
                  className="text-left p-2.5 rounded-xl border transition flex items-start justify-between cursor-pointer group hover:border-sky-500/50"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <div>
                    <div className="font-mono text-xs text-sky-600 dark:text-sky-400 font-semibold">
                      {s.tag}
                    </div>
                    <div
                      className="text-xs font-medium mt-0.5"
                      style={{ color: "var(--crm-text)" }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: "var(--crm-text-secondary)" }}
                    >
                      {s.desc}
                    </div>
                  </div>
                  {copiedTag === s.tag && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
