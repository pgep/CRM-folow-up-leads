/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Calendar, User, Mail, Phone, MapPin, Gift, Clipboard, Calculator, Tag, MessageSquare, Plus, Check, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Lead, LeadStatus, LeadEtapa, LeadTemperatura, LeadHistory } from "../types";
import { useToast } from "./Toast";

interface LeadDetailsModalProps {
  leadId: string;
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead?: (id: string) => Promise<void>;
}

export default function LeadDetailsModal({ leadId, onClose, onUpdateLead, onDeleteLead }: LeadDetailsModalProps) {
  const { toast, confirm } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [etapasList, setEtapasList] = useState<string[]>([]);
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error("Erro ao carregar produtos no modal:", err));

    // Fetch dynamic options lists
    fetch("/api/settings")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {} as any;
      })
      .then((data: any) => {
        if (data && data.etapas_contato) setEtapasList(data.etapas_contato);
        if (data && data.status_funil) setStatusList(data.status_funil);
        if (data && data.temperaturas) setTempsList(data.temperaturas);
      })
      .catch(err => console.error("Erro ao carregar listas dinâmicas no modal:", err));
  }, [leadId]);

  // Editable fields states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [linkCelular, setLinkCelular] = useState("");
  const [dataCasamento, setDataCasamento] = useState("");
  const [mesCasamento, setMesCasamento] = useState("");
  const [local, setLocal] = useState("");
  const [servicos, setServicos] = useState("");
  const [convidados, setConvidados] = useState(0);

  const mapLegacyValue = (field: string, val: string): string => {
    if (!val) return val;
    const upperVal = val.toUpperCase().trim();
    if (field === "etapa_contato") {
      switch (upperVal) {
        case "SEM_CONTATO": return "Sem Contato";
        case "WHATSAPP_ENVIADO": return "WhatsApp Enviado";
        case "EMAIL_FOLLOWUP_1": return "E-mail Follow-up 1";
        case "WHATSAPP_FOLLOWUP_2": return "WhatsApp Follow-up 2";
        case "EMAIL_FOLLOWUP_2": return "E-mail Follow-up 2";
        case "EMAIL_FINAL": return "E-mail Final";
        case "ENCERRADO": return "Encerrado";
        default: return val;
      }
    }
    if (field === "status_funil") {
      switch (upperVal) {
        case "NOVO": return "Primeiro Contato";
        case "PRIMEIRO_CONTATO": return "Primeiro Contato";
        case "FOLLOWUP1": return "Follow-up 1";
        case "FOLLOWUP2": return "Follow-up 2";
        case "FOLLOWUP3": return "Follow-up 3";
        case "FOLLOWUPFINAL": return "Follow-up Final";
        case "RESPONDIDO": return "Respondido";
        case "FECHOU": return "Fechou (Convertido)";
        case "PERDIDO": return "Perdido";
        case "SEM_RETORNO": return "Sem Retorno / Encerrado";
        default: return val;
      }
    }
    if (field === "temperatura") {
      switch (upperVal) {
        case "FRIA": return "FRIA";
        case "MORNA": return "MORNA";
        case "QUENTE": return "QUENTE";
        case "CLIENTE": return "CLIENTE";
        default: return upperVal;
      }
    }
    return val;
  };

  const fetchLeadDetails = async () => {
    try {
      setLoading(true);
      const resLead = await fetch(`/api/leads/${leadId}`);
      if (!resLead.ok) throw new Error("Failed to fetch lead");
      const dataLead = await resLead.json();
      setLead(dataLead);

      // Sync edit fields
      setNome(dataLead.nome);
      setEmail(dataLead.email);
      setLinkCelular(dataLead.link_celular || "");
      setDataCasamento(dataLead.data_casamento || "");
      setMesCasamento(dataLead.mes_casamento || "");
      setLocal(dataLead.local || "");
      setServicos(dataLead.servicos || "");
      setConvidados(dataLead.convidados || 0);

      const resHist = await fetch(`/api/leads/${leadId}/history`);
      if (resHist.ok) {
        const dataHist = await resHist.json();
        setHistory(dataHist);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  const handleUpdateStatus = async (field: "status_funil" | "etapa_contato" | "temperatura", value: string) => {
    if (!lead) return;
    try {
      await onUpdateLead(lead.id, { [field]: value });
      // Fetch details again to refresh history timeline and model states
      fetchLeadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!lead || !onDeleteLead) return;
    const confirmed = await confirm(`Deseja realmente EXCLUIR o lead "${lead.nome}" permanentemente? Esta ação não pode ser desfeita.`);
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDeleteLead(lead.id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveMetadata = async () => {
    if (!lead) return;
    try {
      await onUpdateLead(lead.id, {
        nome,
        email,
        link_celular: linkCelular,
        data_casamento: dataCasamento,
        mes_casamento: mesCasamento,
        local,
        servicos,
        convidados: Number(convidados)
      });
      setIsEditingMetadata(false);
      fetchLeadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !lead) return;

    setIsSubmittingNote(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nota: newNote.trim() })
      });

      if (response.ok) {
        setNewNote("");
        fetchLeadDetails(); // refresh details and history logs
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (loading && !lead) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <Clock className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando detalhes do lead...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2.5rem)] md:h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Header bar */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold font-mono text-xs sm:text-base shrink-0">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                <h3 className="text-xs sm:text-base font-semibold text-white truncate max-w-[130px] sm:max-w-xs">{lead.nome}</h3>
                <span className="text-[9px] sm:text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                  {lead.id}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                Origem: <strong>{lead.origem_portal}</strong> • Cadastrado em:{" "}
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onDeleteLead && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 border border-rose-500/30 hover:border-rose-500 text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-lg text-[11px] sm:text-xs font-semibold transition disabled:opacity-40"
                title="Excluir Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isDeleting ? "Excluindo..." : "Excluir Lead"}</span>
                <span className="sm:hidden">{isDeleting ? "..." : "Excluir"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Panel Scrollable */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          
          {/* Left Column - Metadata & Budgets */}
          <div className="lg:col-span-7 p-4 sm:p-6 space-y-5 sm:space-y-6">
            
            {/* Quick Status Changers */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Status Funil
                </span>
                <select
                  value={mapLegacyValue("status_funil", lead.status_funil)}
                  onChange={(e) => handleUpdateStatus("status_funil", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {statusList.length > 0 ? (
                    statusList.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))
                  ) : (
                    <>
                      <option value="Primeiro Contato">Primeiro Contato</option>
                      <option value="Follow-up 1">Follow-up 1</option>
                      <option value="Follow-up 2">Follow-up 2</option>
                      <option value="Follow-up 3">Follow-up 3</option>
                      <option value="Follow-up Final">Follow-up Final</option>
                      <option value="Respondido">Respondido</option>
                      <option value="Fechou (Convertido)">Fechou (Convertido)</option>
                      <option value="Perdido">Perdido</option>
                      <option value="Sem Retorno / Encerrado">Sem Retorno / Encerrado</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Etapa de Contato
                </span>
                <select
                  value={mapLegacyValue("etapa_contato", lead.etapa_contato)}
                  onChange={(e) => handleUpdateStatus("etapa_contato", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {etapasList.length > 0 ? (
                    etapasList.map((et) => (
                      <option key={et} value={et}>{et}</option>
                    ))
                  ) : (
                    <>
                      <option value="Sem Contato">Sem Contato</option>
                      <option value="Orçamento Enviado">Orçamento Enviado</option>
                      <option value="WhatsApp Enviado">WhatsApp Enviado</option>
                      <option value="E-mail Follow-up 1">E-mail Follow-up 1</option>
                      <option value="WhatsApp Follow-up 2">WhatsApp Follow-up 2</option>
                      <option value="E-mail Follow-up 2">E-mail Follow-up 2</option>
                      <option value="E-mail Final">E-mail Final</option>
                      <option value="Encerrado">Encerrado</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Temperatura
                </span>
                <select
                  value={mapLegacyValue("temperatura", lead.temperatura)}
                  onChange={(e) => handleUpdateStatus("temperatura", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {tempsList.length > 0 ? (
                    tempsList.map((tmp) => {
                      const normTmp = String(tmp).trim().toUpperCase();
                      return <option key={normTmp} value={normTmp}>{normTmp}</option>;
                    })
                  ) : (
                    <>
                      <option value="FRIA">FRIA</option>
                      <option value="MORNA">MORNA</option>
                      <option value="QUENTE">QUENTE</option>
                      <option value="CLIENTE">CLIENTE</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* General Metadata form / display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  Informações Cadastrais do Lead
                </h4>
                <button
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
                >
                  {isEditingMetadata ? "Cancelar" : "Editar Dados"}
                </button>
              </div>

              {isEditingMetadata ? (
                <div className="bg-zinc-950/30 border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-500">Nome</label>
                      <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Celular</label>
                      <input
                        type="text"
                        value={linkCelular}
                        onChange={(e) => setLinkCelular(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Número Convidados</label>
                      <input
                        type="number"
                        value={convidados}
                        onChange={(e) => setConvidados(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Data Casamento (DD/MM/AAAA)</label>
                      <input
                        type="text"
                        value={dataCasamento}
                        onChange={(e) => setDataCasamento(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Mês do Casamento</label>
                      <input
                        type="text"
                        value={mesCasamento}
                        onChange={(e) => setMesCasamento(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-500">Local da Cerimônia</label>
                      <input
                        type="text"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-500">Serviços Solicitados</label>
                      <input
                        type="text"
                        value={servicos}
                        onChange={(e) => setServicos(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveMetadata}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar Dados
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-white font-medium truncate">{lead.nome}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-zinc-400 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{lead.link_celular || "Telefone não informado"}</span>
                      </div>
                      {lead.whatsapp_validation_status && (
                        <div className="pl-6 flex flex-wrap items-center gap-1.5">
                          {lead.whatsapp_validation_status === "NUMERO_SEM_WHATSAPP" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              title={lead.whatsapp_validation_error || "Número sem WhatsApp"}
                            >
                              🚫 Número sem WhatsApp
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_TEMPORARIO_WAHA" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              title={lead.whatsapp_validation_error || "Erro Temporário WAHA"}
                            >
                              ⚠️ Erro Temporário WAHA {lead.whatsapp_validation_http_code ? `(HTTP ${lead.whatsapp_validation_http_code})` : ""}
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ERRO_COMUNICACAO" && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700"
                              title={lead.whatsapp_validation_error || "Erro de Comunicação com WAHA"}
                            >
                              ⚡ Erro Conexão WAHA
                            </span>
                          )}
                          {lead.whatsapp_validation_status === "ENVIADO_SUCESSO" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              ✓ WhatsApp Válido
                            </span>
                          )}
                          {lead.whatsapp_validated_at && (
                            <span className="text-[10px] text-zinc-500">
                              ({new Date(lead.whatsapp_validated_at).toLocaleDateString("pt-BR")} {new Date(lead.whatsapp_validated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        Casamento: {lead.data_casamento || "Sem data"} ({lead.mes_casamento})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.local || "Local não informado"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400 min-w-0">
                      <Gift className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.convidados} convidados • {lead.servicos || "Geral"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated budget cards */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-500" />
                Orçamento Sugerido Automático ({lead.convidados} itens)
              </h4>

              {products.length === 0 ? (
                <div className="border border-zinc-800/80 rounded-xl p-4 text-center text-zinc-500 text-xs">
                  Nenhum produto cadastrado no catálogo para cálculo de orçamentos dinâmicos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((prod) => {
                    const totalOrcamento = prod.valor_unitario * (lead.convidados || 0);
                    return (
                      <div key={prod.id} className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 block uppercase font-bold truncate" title={prod.descricao}>
                            {prod.descricao}
                          </span>
                          <span className="text-sm font-extrabold text-amber-500 mt-1 block">
                            {totalOrcamento.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL"
                            })}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-600 block mt-1">
                          Unitário: {prod.valor_unitario.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Observacoes / notas adicionais */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-amber-500" />
                Histórico de Observações do CRM
              </h4>
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 sm:p-4 max-h-36 sm:max-h-40 overflow-y-auto text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {lead.observacoes || "Nenhuma observação cadastrada no momento."}
              </div>
            </div>
          </div>

          {/* Right Column - Timeline Logs & Manual note creator */}
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col space-y-5 lg:space-y-4 lg:h-full lg:overflow-hidden min-h-0">
            
            {/* Note Creator form */}
            <form onSubmit={handleAddNote} className="space-y-2 shrink-0">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                Registrar Atendimento Manual
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escreva nota: 'Lead ligou solicitando caixinha...'"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-lg text-black font-semibold text-xs transition flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Note
                </button>
              </div>
            </form>

            {/* Chronological timeline list */}
            <div className="flex flex-col lg:flex-1 lg:min-h-0 pt-2 lg:pt-0">
              <h4 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-3 shrink-0">
                Timeline de Interações
              </h4>

              <div className="max-h-[350px] sm:max-h-[450px] lg:max-h-none lg:flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3 border-l border-zinc-800">
                {history.length > 0 ? (
                  history.map((event) => {
                    const eventDate = new Date(event.created_at);
                    
                    return (
                      <div key={event.id} className="relative group text-xs">
                        {/* Dot indicator on timeline line */}
                        <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-zinc-900 group-hover:bg-amber-400 transition shrink-0" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-semibold text-white leading-none">
                              {event.titulo}
                            </span>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {eventDate.toLocaleDateString("pt-BR")} às {eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono px-1 rounded uppercase font-semibold ${
                              event.canal === "WHATSAPP" ? "bg-emerald-500/10 text-emerald-400" :
                              event.canal === "EMAIL" ? "bg-blue-500/10 text-blue-400" :
                              event.canal === "MANUAL" ? "bg-purple-500/10 text-purple-400" :
                              "bg-zinc-800 text-zinc-400"
                            }`}>
                              {event.canal}
                            </span>
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">{event.tipo}</span>
                          </div>

                          {event.detalhes && (
                            <div
                              className="mt-1.5 p-2 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[11px] text-zinc-400 font-sans leading-relaxed break-words"
                              dangerouslySetInnerHTML={{ __html: event.detalhes }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-600 text-xs">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-zinc-750" />
                    Nenhuma interação registrada.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
