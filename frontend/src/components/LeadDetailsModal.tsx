/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Calendar, User, Mail, Phone, MapPin, Gift, Clipboard, Calculator, Tag, MessageSquare, Plus, Check, Clock, AlertCircle } from "lucide-react";
import { Lead, LeadStatus, LeadEtapa, LeadTemperatura, LeadHistory } from "../types";

interface LeadDetailsModalProps {
  leadId: string;
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
}

export default function LeadDetailsModal({ leadId, onClose, onUpdateLead }: LeadDetailsModalProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // Editable fields states
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [linkCelular, setLinkCelular] = useState("");
  const [dataCasamento, setDataCasamento] = useState("");
  const [mesCasamento, setMesCasamento] = useState("");
  const [local, setLocal] = useState("");
  const [servicos, setServicos] = useState("");
  const [convidados, setConvidados] = useState(0);

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header bar */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold font-mono">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{lead.nome}</h3>
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                  {lead.id}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Origem: <strong>{lead.origem_portal}</strong> • Cadastrado em:{" "}
                {new Date(lead.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Panel Scrollable */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
          
          {/* Left Column - Metadata & Budgets */}
          <div className="lg:col-span-7 p-6 space-y-6">
            
            {/* Quick Status Changers */}
            <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Status Funil
                </span>
                <select
                  value={lead.status_funil}
                  onChange={(e) => handleUpdateStatus("status_funil", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="NOVO">Novo</option>
                  <option value="PRIMEIRO_CONTATO">Primeiro Contato</option>
                  <option value="FOLLOWUP1">Follow-up 1</option>
                  <option value="FOLLOWUP2">Follow-up 2</option>
                  <option value="FOLLOWUP3">Follow-up 3</option>
                  <option value="FOLLOWUPFINAL">Follow-up Final</option>
                  <option value="RESPONDIDO">Respondido</option>
                  <option value="FECHOU">Fechou (Convertido)</option>
                  <option value="PERDIDO">Perdido</option>
                  <option value="SEM_RETORNO">Sem Retorno / Encerrado</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Etapa de Contato
                </span>
                <select
                  value={lead.etapa_contato}
                  onChange={(e) => handleUpdateStatus("etapa_contato", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="SEM_CONTATO">Sem Contato</option>
                  <option value="WHATSAPP_ENVIADO">WhatsApp Enviado</option>
                  <option value="EMAIL_FOLLOWUP_1">E-mail Follow-up 1</option>
                  <option value="WHATSAPP_FOLLOWUP_2">WhatsApp Follow-up 2</option>
                  <option value="EMAIL_FOLLOWUP_2">E-mail Follow-up 2</option>
                  <option value="EMAIL_FINAL">E-mail Final</option>
                  <option value="ENCERRADO">Encerrado</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Temperatura
                </span>
                <select
                  value={lead.temperatura}
                  onChange={(e) => handleUpdateStatus("temperatura", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="FRIA">Fria</option>
                  <option value="MORNA">Morna</option>
                  <option value="QUENTE">Quente</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>
            </div>

            {/* General Metadata form / display */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-500" />
                  Informações Cadastrais da Noiva
                </h4>
                <button
                  onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium transition"
                >
                  {isEditingMetadata ? "Cancelar" : "Editar Dados"}
                </button>
              </div>

              {isEditingMetadata ? (
                <div className="bg-zinc-950/30 border border-zinc-800 rounded-xl p-4 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
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

                  <div className="grid grid-cols-2 gap-3">
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
                <div className="bg-zinc-950/20 border border-zinc-800/80 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="text-white font-medium">{lead.nome}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>{lead.link_celular || "Telefone não informado"}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>
                        Casamento: {lead.data_casamento || "Sem data informada"} ({lead.mes_casamento})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span className="truncate">{lead.local || "Local não informado"}</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-400">
                      <Gift className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>{lead.convidados} convidados • {lead.servicos || "Geral"}</span>
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Mini Vela (Cortiça)</span>
                  <span className="text-sm font-bold text-white mt-1 block">{lead.soma1 || "R$ 0,00"}</span>
                  <span className="text-[9px] text-zinc-600 block mt-0.5">Unitário: R$ 13,90</span>
                </div>

                <div className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Mini Difusor</span>
                  <span className="text-sm font-bold text-white mt-1 block">{lead.soma2 || "R$ 0,00"}</span>
                  <span className="text-[9px] text-zinc-600 block mt-0.5">Unitário: R$ 12,90</span>
                </div>

                <div className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Home Spray 60ml</span>
                  <span className="text-sm font-bold text-white mt-1 block">{lead.soma3 || "R$ 0,00"}</span>
                  <span className="text-[9px] text-zinc-600 block mt-0.5">Unitário: R$ 13,90</span>
                </div>

                <div className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Baby Class 8cm</span>
                  <span className="text-sm font-bold text-white mt-1 block">{lead.soma4 || "R$ 0,00"}</span>
                  <span className="text-[9px] text-zinc-600 block mt-0.5">Unitário: R$ 11,90</span>
                </div>

                <div className="bg-zinc-950/25 border border-zinc-800 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Baby Class 12cm</span>
                  <span className="text-sm font-bold text-white mt-1 block">{lead.soma5 || "R$ 0,00"}</span>
                  <span className="text-[9px] text-zinc-600 block mt-0.5">Unitário: R$ 14,90</span>
                </div>
              </div>
            </div>

            {/* Observacoes / notas adicionais */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-amber-500" />
                Histórico de Observações do CRM
              </h4>
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 max-h-40 overflow-y-auto text-xs text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {lead.observacoes || "Nenhuma observação cadastrada no momento."}
              </div>
            </div>
          </div>

          {/* Right Column - Timeline Logs & Manual note creator */}
          <div className="lg:col-span-5 p-6 flex flex-col h-full overflow-hidden">
            
            {/* Note Creator form */}
            <form onSubmit={handleAddNote} className="space-y-2 shrink-0 mb-5">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                Registrar Atendimento Manual
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escreva nota: 'Noiva ligou solicitando caixinha...'"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 rounded-lg text-black font-semibold text-xs transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Salvar Note
                </button>
              </div>
            </form>

            {/* Chronological timeline list */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <h4 className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-3 shrink-0">
                Timeline de Interações
              </h4>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3 border-l border-zinc-800">
                {history.length > 0 ? (
                  history.map((event) => {
                    const eventDate = new Date(event.created_at);
                    
                    return (
                      <div key={event.id} className="relative group text-xs">
                        {/* Dot indicator on timeline line */}
                        <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-800 border-2 border-zinc-900 group-hover:bg-amber-400 transition shrink-0" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
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
                              className="mt-1.5 p-2 bg-zinc-950/60 border border-zinc-850 rounded-lg text-[11px] text-zinc-400 font-sans leading-relaxed"
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
