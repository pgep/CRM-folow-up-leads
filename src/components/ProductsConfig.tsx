import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Package, Loader2 } from "lucide-react";
import { Product } from "../types";
import { useToast } from "./Toast";
import { ProductCard } from "./products/ProductCard";
import { ProductFormModal } from "./products/ProductFormModal";
import { ProductDocumentationCard } from "./products/ProductDocumentationCard";

export default function ProductsConfig() {
  const { toast, confirm } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [isEdit, setIsEdit] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const fetchProducts = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/products");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      toast.error("Erro ao sincronizar catálogo de produtos.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setProductToEdit(null);
    setShowForm(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setIsEdit(true);
    setProductToEdit(prod);
    setShowForm(true);
  };

  const handleDelete = async (prodId: string) => {
    const confirmed = await confirm(
      `Tem certeza que deseja remover o produto "${prodId}" do catálogo?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${prodId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== prodId));
        toast.success("Produto excluído com sucesso!");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Erro ao excluir produto.");
      }
    } catch (err) {
      console.error("Erro ao deletar produto:", err);
      toast.error("Falha na rede ao tentar excluir produto.");
    }
  };

  const handleFormSubmit = async (payload: {
    id: string;
    descricao: string;
    valor_unitario: number;
    link_imagem: string;
  }) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(
        isEdit ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!"
      );
      fetchProducts();
    } else {
      const errData = await res.json();
      throw new Error(errData.error || "Erro ao salvar produto.");
    }
  };

  return (
    <div id="products-config-screen" className="w-full space-y-6 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. CABEÇALHO EDITORIAL (PADRÃO DASHBOARD / CRM)               */}
      {/* ------------------------------------------------------------- */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b transition-colors"
        style={{ borderColor: "var(--crm-border)" }}
      >
        <div>
          <h1
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: "var(--crm-text)" }}
          >
            Catálogo de Produtos
          </h1>
          <p
            className="text-xs sm:text-sm mt-0.5"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Produtos e valores utilizados nos orçamentos e mensagens comerciais.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchProducts(true)}
            disabled={isRefreshing || loading}
            className="px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:opacity-85"
            style={{
              backgroundColor: "var(--crm-surface)",
              borderColor: "var(--crm-border)",
              color: "var(--crm-text)",
            }}
            title="Atualizar produtos do catálogo"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? "animate-spin text-indigo-500" : ""
              }`}
            />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CONTEÚDO PRINCIPAL (LOADING, EMPTY STATE OU GRID)          */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
          <p
            className="text-xs font-medium"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Carregando catálogo de produtos...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div
          className="border border-dashed rounded-2xl p-12 text-center transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto mb-3.5 shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <h3
            className="text-sm sm:text-base font-bold tracking-tight"
            style={{ color: "var(--crm-text)" }}
          >
            Nenhum produto cadastrado no catálogo
          </h3>
          <p
            className="text-xs max-w-md mx-auto mt-1 leading-relaxed"
            style={{ color: "var(--crm-text-secondary)" }}
          >
            Cadastre seus produtos e lembrancinhas para automatizar o cálculo e envio dinâmico de orçamentos aos noivos.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar primeiro produto</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grid responsivo ocupando toda a largura disponível */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
            {products.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 3. DOCUMENTAÇÃO CONTEXTUAL SECUNDÁRIA (ORÇAMENTOS DINÂMICOS) */}
          <ProductDocumentationCard />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL DE CADASTRO E EDIÇÃO DE PRODUTO                      */}
      {/* ------------------------------------------------------------- */}
      <ProductFormModal
        isOpen={showForm}
        isEdit={isEdit}
        productToEdit={productToEdit}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
