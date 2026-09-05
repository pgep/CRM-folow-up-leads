import React, { useState } from "react";
import { Package, Edit3, Trash2, Copy, Check } from "lucide-react";
import { Product } from "../../types";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

const VariableRow: React.FC<{ label: string; variable: string }> = ({
  label,
  variable,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(variable);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div
      onClick={handleCopy}
      className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 cursor-pointer transition group/var"
      title={`Clique para copiar ${variable}`}
    >
      <span
        className="text-[11px] font-medium shrink-0"
        style={{ color: "var(--crm-text-secondary)" }}
      >
        {label}:
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <code className="font-mono text-[10px] sm:text-[11px] text-indigo-600 dark:text-indigo-400 select-all truncate bg-slate-100 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-white/[0.06]">
          {variable}
        </code>
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        ) : (
          <Copy className="w-3 h-3 opacity-0 group-hover/var:opacity-100 transition-opacity text-slate-400 dark:text-zinc-500 shrink-0" />
        )}
      </div>
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="group rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md"
      style={{
        backgroundColor: "var(--crm-surface)",
        borderColor: "var(--crm-border)",
      }}
    >
      {/* 1. Imagem protagonista do produto */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-zinc-900/40 shrink-0 border-b border-slate-200/50 dark:border-white/[0.04]">
        {product.link_imagem ? (
          <img
            src={product.link_imagem}
            alt={product.descricao}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
            <Package className="w-9 h-9 mb-1.5 opacity-40" />
            <span className="text-[11px] font-medium">Sem imagem</span>
          </div>
        )}

        {/* Badge identificador dinâmico */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg backdrop-blur-md bg-black/60 text-white border border-white/10 text-[10px] font-mono font-semibold tracking-wider uppercase shadow-xs">
          ID: {product.id}
        </div>
      </div>

      {/* 2. Conteúdo do produto */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        {/* Nome e Preço */}
        <div className="space-y-2">
          <h3
            className="text-sm sm:text-base font-semibold leading-snug line-clamp-2"
            style={{ color: "var(--crm-text)" }}
            title={product.descricao}
          >
            {product.descricao}
          </h3>

          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {product.valor_unitario.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--crm-text-muted)" }}
            >
              / unidade
            </span>
          </div>
        </div>

        {/* 3. Recursos técnicos / Variáveis do Template (Secundário, compacto e limpo) */}
        <div
          className="rounded-xl p-3 border space-y-1 transition-colors"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
          }}
        >
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200/60 dark:border-white/[0.04]">
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Variáveis do Template
            </span>
            <span
              className="text-[9px]"
              style={{ color: "var(--crm-text-muted)" }}
            >
              Clique para copiar
            </span>
          </div>

          <div className="grid grid-cols-1 gap-0.5">
            <VariableRow label="Total" variable={`{orcamento_${product.id}}`} />
            <VariableRow
              label="Preço"
              variable={`{preco_unitario_${product.id}}`}
            />
            <VariableRow
              label="Nome"
              variable={`{descricao_${product.id}}`}
            />
            <VariableRow
              label="Imagem"
              variable={`{imagem_${product.id}}`}
            />
          </div>
        </div>

        {/* 4. Ações: Editar e Excluir */}
        <div
          className="pt-3 border-t flex items-center justify-end gap-2 shrink-0"
          style={{ borderColor: "var(--crm-border)" }}
        >
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
            title="Editar produto"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Excluir produto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
