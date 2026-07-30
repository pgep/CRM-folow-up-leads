import React, { useState, useEffect } from "react";
import { Package, Trash2, Plus, Edit3, Image as ImageIcon, Sparkles, Check, HelpCircle, DollarSign, X, RefreshCw } from "lucide-react";
import { Product } from "../types";
import { useToast } from "./Toast";

export default function ProductsConfig() {
  const { toast, confirm } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [isEdit, setIsEdit] = useState(false);
  const [id, setId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorUnitario, setValorUnitario] = useState<number | string>("");
  const [linkImagem, setLinkImagem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setId("");
    setDescricao("");
    setValorUnitario("");
    setLinkImagem("");
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setIsEdit(true);
    setId(prod.id);
    setDescricao(prod.descricao);
    setValorUnitario(prod.valor_unitario);
    setLinkImagem(prod.link_imagem);
    setError(null);
    setSuccess(null);
    setShowForm(true);
  };

  const handleDelete = async (prodId: string) => {
    const confirmed = await confirm(`Tem certeza que deseja remover o produto "${prodId}"?`);
    if (!confirmed) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${prodId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== prodId));
        setSuccess("Produto excluído com sucesso!");
        toast.success("Produto excluído com sucesso!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Erro ao excluir produto.");
        toast.error(errData.error || "Erro ao excluir produto.");
      }
    } catch (err) {
      console.error("Erro ao deletar produto:", err);
      setError("Falha na rede ao tentar excluir produto.");
      toast.error("Falha na rede ao tentar excluir produto.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!id.trim() || !descricao.trim() || valorUnitario === "") {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanId) {
      setError("O identificador do produto deve conter apenas letras, números e underline.");
      return;
    }

    const val = Number(valorUnitario);
    if (isNaN(val) || val <= 0) {
      setError("O valor unitário deve ser maior que zero.");
      return;
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          descricao: descricao.trim(),
          valor_unitario: val,
          link_imagem: linkImagem.trim()
        })
      });

      if (res.ok) {
        setSuccess(isEdit ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
        setShowForm(false);
        fetchProducts();
      } else {
        const errData = await res.json();
        setError(errData.error || "Erro ao salvar produto.");
      }
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      setError("Falha na comunicação com o servidor.");
    }
  };

  return (
    <div id="products-config-screen" className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-amber-500 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Catálogo de Produtos (Orçamento)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Cadastre os produtos e lembrancinhas. Seus valores unitários e links de imagem serão calculados e substituídos de forma dinâmica nas mensagens enviadas aos noivos.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-4 py-2 rounded-lg text-xs tracking-wide transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Produto
        </button>
      </div>

      {success && (
        <div className="bg-emerald-950/40 border border-emerald-500 text-emerald-400 p-3 rounded-lg text-xs mb-4 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/40 border border-rose-500 text-rose-400 p-3 rounded-lg text-xs mb-4 flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form modal/overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-900/60 border-b border-zinc-850 px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                <Package className="w-5 h-5" />
                {isEdit ? `Editar Produto: ${id}` : "Cadastrar Novo Produto"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Chave/Identificador Dinâmico (ID) *
                </label>
                <input
                  type="text"
                  disabled={isEdit}
                  placeholder="Ex: vela_vidro, mini_vela, home_spray"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Este ID será usado nas chaves de template (ex: {"{"}orcamento_ID{"}"}). Não use espaços ou acentos.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Descrição do Produto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vela Aromática Premium em Vidro de 100g"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Valor Unitário (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Link da Imagem (URL)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkImagem}
                    onChange={(e) => setLinkImagem(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                {linkImagem && (
                  <div className="mt-2 h-20 w-32 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900 relative">
                    <img
                      src={linkImagem}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-5 py-2 rounded-lg text-xs transition"
                >
                  {isEdit ? "Salvar Alterações" : "Adicionar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {products.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
              <Package className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm">Nenhum produto cadastrado no catálogo.</p>
              <button
                onClick={handleOpenCreate}
                className="mt-3 text-xs font-semibold text-amber-500 hover:underline"
              >
                Cadastrar primeiro produto agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-750 transition duration-200 group shadow-md text-xs"
                >
                  <div className="relative h-32 bg-zinc-900 overflow-hidden">
                    {prod.link_imagem ? (
                      <img
                        src={prod.link_imagem}
                        alt={prod.descricao}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        <ImageIcon className="w-6 h-6 mb-0.5" />
                        <span className="text-[9px]">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 bg-black/75 backdrop-blur-sm border border-zinc-800 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wide text-amber-500">
                      ID: {prod.id}
                    </div>
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 leading-snug">
                        {prod.descricao}
                      </h4>
                      <p className="text-sm font-extrabold text-amber-400 mt-1">
                        {prod.valor_unitario.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        })}{" "}
                        <span className="text-[9px] font-medium text-zinc-500">unitário</span>
                      </p>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-850/60 rounded-lg p-2 space-y-1">
                      <div className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">
                        Gatilhos no Template:
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[9px]">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Total:</span>
                          <code className="text-amber-500 font-mono select-all bg-zinc-950 px-1 rounded text-[8px]">
                            {"{"}orcamento_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Preço:</span>
                          <code className="text-amber-500 font-mono select-all bg-zinc-950 px-1 rounded text-[8px]">
                            {"{"}preco_unitario_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Nome:</span>
                          <code className="text-amber-500 font-mono select-all bg-zinc-950 px-1 rounded text-[8px]">
                            {"{"}descricao_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Imagem:</span>
                          <code className="text-amber-500 font-mono select-all bg-zinc-950 px-1 rounded text-[8px]">
                            {"{"}imagem_{prod.id}{"}"}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-850/60 flex items-center justify-end gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
                        title="Editar produto"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 rounded-lg transition"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dicas de uso */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 mt-6">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4" />
              Como usar os orçamentos dinâmicos no texto das mensagens?
            </h4>
            <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
              <p>
                No editor das mensagens do workflow, você pode digitar chaves correspondentes aos produtos criados acima.
                O sistema substituirá automaticamente as chaves multiplicando a quantidade de convidados do lead pelo preço unitário do produto.
              </p>
              <div className="bg-zinc-900 rounded-lg p-3 font-mono text-[11px] text-zinc-300 border border-zinc-850/60">
                <span className="text-zinc-500">Exemplo de Mensagem:</span>
                <p className="mt-1.5">
                  Olá {"{"}nome{"}"}, tudo bem? Para o seu casamento com {"{"}convidados{"}"} convidados no local {"{"}local{"}"},
                  nossa sugestão é o produto <span className="text-amber-400">{"{"}descricao_vela_vidro{"}"}</span>.
                </p>
                <p className="mt-1">
                  O orçamento total para as lembranças ficaria em <span className="text-amber-400">{"{"}orcamento_vela_vidro{"}"}</span> (com o preço unitário especial de {"{"}preco_unitario_vela_vidro{"}"}).
                </p>
                <p className="mt-1">
                  Você pode dar uma olhada na imagem dele aqui: {"{"}imagem_vela_vidro{"}"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
