import React, { useState, useEffect } from "react";
import {
  Package,
  X,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Product } from "../../types";

interface ProductFormModalProps {
  isOpen: boolean;
  isEdit: boolean;
  productToEdit: Product | null;
  onClose: () => void;
  onSubmit: (data: {
    id: string;
    descricao: string;
    valor_unitario: number;
    link_imagem: string;
  }) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  isEdit,
  productToEdit,
  onClose,
  onSubmit,
}) => {
  const [id, setId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorUnitario, setValorUnitario] = useState<number | string>("");
  const [linkImagem, setLinkImagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && productToEdit) {
        setId(productToEdit.id);
        setDescricao(productToEdit.descricao);
        setValorUnitario(productToEdit.valor_unitario);
        setLinkImagem(productToEdit.link_imagem || "");
      } else {
        setId("");
        setDescricao("");
        setValorUnitario("");
        setLinkImagem("");
      }
      setError(null);
    }
  }, [isOpen, isEdit, productToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim() || !descricao.trim() || valorUnitario === "") {
      setError("Preencha todos os campos obrigatórios marcados com asterisco (*).");
      return;
    }

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanId) {
      setError("O identificador do produto deve conter apenas letras, números e underline (_).");
      return;
    }

    const val = Number(valorUnitario);
    if (isNaN(val) || val <= 0) {
      setError("O valor unitário deve ser maior que zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: cleanId,
        descricao: descricao.trim(),
        valor_unitario: val,
        link_imagem: linkImagem.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao salvar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border transition-colors animate-scale-up"
        style={{
          backgroundColor: "var(--crm-surface)",
          borderColor: "var(--crm-border)",
          color: "var(--crm-text)",
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{
            backgroundColor: "var(--crm-surface-subtle)",
            borderColor: "var(--crm-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3
                className="text-sm font-bold tracking-tight"
                style={{ color: "var(--crm-text)" }}
              >
                {isEdit ? `Editar Produto: ${id}` : "Cadastrar Novo Produto"}
              </h3>
              <p
                className="text-xs"
                style={{ color: "var(--crm-text-secondary)" }}
              >
                {isEdit
                  ? "Atualize as informações comerciais e imagem do produto"
                  : "Defina a chave, descrição e preço para orçamentos automáticos"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Chave / Identificador Dinâmico (ID) */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Chave / Identificador Dinâmico (ID) *
            </label>
            <input
              type="text"
              disabled={isEdit}
              placeholder="Ex: vela_vidro, mini_vela, home_spray"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono border focus:outline-hidden focus:border-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
              required
            />
            <span
              className="text-[11px] mt-1 block"
              style={{ color: "var(--crm-text-muted)" }}
            >
              Usado nas tags do template (ex: {"{"}orcamento_ID{"}"}). Não use espaços ou acentos.
            </span>
          </div>

          {/* 2. Descrição do Produto */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Descrição do Produto *
            </label>
            <input
              type="text"
              placeholder="Ex: Vela Aromática Premium em Vidro de 100g"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border focus:outline-hidden focus:border-indigo-500 transition"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text)",
              }}
              required
            />
          </div>

          {/* 3. Valor Unitário */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Valor Unitário (R$) *
            </label>
            <div className="relative">
              <div
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                style={{ color: "var(--crm-text-muted)" }}
              >
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value)}
                className="w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-mono border focus:outline-hidden focus:border-indigo-500 transition"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
                required
              />
            </div>
          </div>

          {/* 4. Link da Imagem */}
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--crm-text-secondary)" }}
            >
              Link da Imagem (URL)
            </label>
            <div className="relative">
              <div
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                style={{ color: "var(--crm-text-muted)" }}
              >
                <ImageIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={linkImagem}
                onChange={(e) => setLinkImagem(e.target.value)}
                className="w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border focus:outline-hidden focus:border-indigo-500 transition"
                style={{
                  backgroundColor: "var(--crm-surface-subtle)",
                  borderColor: "var(--crm-border)",
                  color: "var(--crm-text)",
                }}
              />
            </div>

            {linkImagem.trim() && (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-20 w-32 border rounded-xl overflow-hidden relative shadow-xs shrink-0"
                  style={{
                    backgroundColor: "var(--crm-surface-subtle)",
                    borderColor: "var(--crm-border)",
                  }}
                >
                  <img
                    src={linkImagem}
                    alt="Pré-visualização"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200";
                    }}
                  />
                </div>
                <span
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--crm-text-muted)" }}
                >
                  Pré-visualização da imagem que será enviada nas mensagens e exibida no catálogo.
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            className="pt-4 border-t flex items-center justify-end gap-2.5"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border transition cursor-pointer hover:opacity-85"
              style={{
                backgroundColor: "var(--crm-surface)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? "Salvar Alterações" : "Adicionar Produto"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
