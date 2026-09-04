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
    <div id="products-config-screen" className="bg-[#12151C] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-xs text-white space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
              Catálogo de Produtos & Orçamentos Dinâmicos
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Cadastre os produtos e lembrancinhas. Seus valores unitários e links de imagem serão calculados e substituídos de forma dinâmica nas mensagens enviadas aos noivos.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Produto
        </button>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form modal/overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#12151C] border border-white/[0.1] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-[#171d2b]/60 border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                {isEdit ? `Editar Produto: ${id}` : "Cadastrar Novo Produto"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Chave / Identificador Dinâmico (ID) *
                </label>
                <input
                  type="text"
                  disabled={isEdit}
                  placeholder="Ex: vela_vidro, mini_vela, home_spray"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 font-mono"
                  required
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Usado nas tags do template (ex: {"{"}orcamento_ID{"}"}). Não use espaços ou acentos.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Descrição do Produto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vela Aromática Premium em Vidro de 100g"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Valor Unitário (R$) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={valorUnitario}
                    onChange={(e) => setValorUnitario(e.target.value)}
                    className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Link da Imagem (URL)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={linkImagem}
                    onChange={(e) => setLinkImagem(e.target.value)}
                    className="w-full bg-[#0B0D12] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {linkImagem && (
                  <div className="mt-3 h-24 w-36 border border-white/[0.08] rounded-xl overflow-hidden bg-[#0B0D12] relative shadow-xs">
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

              <div className="pt-3 border-t border-white/[0.06] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  {isEdit ? "Salvar Alterações" : "Adicionar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {products.length === 0 ? (
            <div className="border border-dashed border-white/[0.1] bg-[#0B0D12] rounded-2xl p-12 text-center text-zinc-400">
              <Package className="w-10 h-10 mx-auto text-zinc-600 mb-2.5" />
              <p className="text-sm font-medium text-white">Nenhum produto cadastrado no catálogo.</p>
              <p className="text-xs text-zinc-500 mt-1">Cadastre seus produtos e lembrancinhas para automatizar o envio de orçamentos.</p>
              <button
                onClick={handleOpenCreate}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium font-mono uppercase tracking-wide transition cursor-pointer shadow-sm"
              >
                Cadastrar primeiro produto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#0B0D12] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 group shadow-xs text-xs"
                >
                  <div className="relative h-36 bg-[#12151C] overflow-hidden">
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
                        <ImageIcon className="w-7 h-7 mb-1" />
                        <span className="text-[10px] font-mono">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-sm border border-white/[0.1] px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wide text-indigo-400">
                      ID: {prod.id}
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {prod.descricao}
                      </h4>
                      <p className="text-base font-extrabold text-indigo-400 font-mono mt-1.5">
                        {prod.valor_unitario.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        })}{" "}
                        <span className="text-[10px] font-sans font-normal text-zinc-400">/ un</span>
                      </p>
                    </div>

                    <div className="bg-[#12151C] border border-white/[0.06] rounded-xl p-3 space-y-1.5">
                      <div className="text-[9px] text-zinc-400 uppercase tracking-wider font-mono font-bold">
                        Gatilhos no Template:
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[10px]">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Total:</span>
                          <code className="text-indigo-400 font-mono select-all bg-[#0B0D12] px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px]">
                            {"{"}orcamento_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Preço:</span>
                          <code className="text-indigo-400 font-mono select-all bg-[#0B0D12] px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px]">
                            {"{"}preco_unitario_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Nome:</span>
                          <code className="text-indigo-400 font-mono select-all bg-[#0B0D12] px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px]">
                            {"{"}descricao_{prod.id}{"}"}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Imagem:</span>
                          <code className="text-indigo-400 font-mono select-all bg-[#0B0D12] px-1.5 py-0.5 rounded border border-white/[0.06] text-[9px]">
                            {"{"}imagem_{prod.id}{"}"}
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center justify-end gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 hover:bg-white/[0.06] text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dicas de uso */}
          <div className="bg-[#0B0D12] border border-white/[0.08] rounded-2xl p-6 mt-6 shadow-xs">
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" />
              Como usar os orçamentos dinâmicos no texto das mensagens?
            </h4>
            <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
              <p>
                No editor das mensagens do workflow, você pode digitar chaves correspondentes aos produtos criados acima.
                O sistema substituirá automaticamente as chaves multiplicando a quantidade de convidados do lead pelo preço unitário do produto.
              </p>
              <div className="bg-[#12151C] rounded-xl p-4 font-mono text-[11px] text-zinc-300 border border-white/[0.06] space-y-2">
                <span className="text-zinc-500 block uppercase text-[10px] tracking-wider">Exemplo de Mensagem:</span>
                <p>
                  Olá {"{"}nome{"}"}, tudo bem? Para o seu casamento com {"{"}convidados{"}"} convidados no local {"{"}local{"}"},
                  nossa sugestão é o produto <span className="text-indigo-400">{"{"}descricao_vela_vidro{"}"}</span>.
                </p>
                <p>
                  O orçamento total para as lembranças ficaria em <span className="text-indigo-400">{"{"}orcamento_vela_vidro{"}"}</span> (com o preço unitário especial de {"{"}preco_unitario_vela_vidro{"}"}).
                </p>
                <p>
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
