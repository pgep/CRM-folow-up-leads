/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Plus, Calendar, User, Phone, Mail, ChevronRight, Calculator, RefreshCw, Star, ArrowUpDown, X, Download } from "lucide-react";
import { Lead, LeadStatus, LeadTemperatura, PortalSource } from "../types";

interface LeadsListProps {
  leads: Lead[];
  portals: PortalSource[];
  onSelectLead: (id: string) => void;
  onAddManualLead: (formData: any) => Promise<void>;
  onRefresh: () => void;
  onSwitchTab?: (tab: "sheet_import") => void;
}

export default function LeadsList({ leads, portals, onSelectLead, onAddManualLead, onRefresh, onSwitchTab }: LeadsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | "ALL">("ALL");
  const [selectedTemp, setSelectedTemp] = useState<string | "ALL">("ALL");
  const [selectedPortal, setSelectedPortal] = useState<string | "ALL">("ALL");
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [sortField, setSortField] = useState<"created_at" | "nome" | "convidados">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Dynamic Options states
  const [statusList, setStatusList] = useState<string[]>([]);
  const [tempsList, setTempsList] = useState<string[]>([]);

  React.useEffect(() => {
    fetch("/api/settings")
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return {} as any;
      })
      .then((data: any) => {
        if (data && data.status_funil) setStatusList(data.status_funil);
        if (data && data.temperaturas) setTempsList(data.temperaturas);
      })
      .catch(err => console.error("Erro ao carregar listas dinâmicas em LeadsList:", err));
  }, []);

  const mapLegacyValue = (field: string, val: string): string => {
    if (!val) return val;
    const upperVal = val.toUpperCase().trim();
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
        case "FRIA": return "Fria";
        case "MORNA": return "Morna";
        case "QUENTE": return "Quente";
        case "CLIENTE": return "Cliente";
        default: return val;
      }
    }
    return val;
  };

  // Form states for adding a lead manually
  const [formNome, setFormNome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGuests, setFormGuests] = useState(100);
  const [formDate, setFormDate] = useState("");
  const [formMonth, setFormMonth] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formPortal, setFormPortal] = useState("Manual");
  const [formNotes, setFormNotes] = useState("");
  const [formServices, setFormServices] = useState("");

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) return;

    try {
      await onAddManualLead({
        nome: formNome.trim(),
        email: formEmail.trim(),
        link_celular: formPhone.trim(),
        convidados: Number(formGuests),
        data_casamento: formDate.trim(),
        mes_casamento: formMonth.trim(),
        local: formVenue.trim(),
        origem_portal: formPortal,
        observacoes: formNotes.trim(),
        servicos: formServices.trim()
      });

      // Reset Form
      setFormNome("");
      setFormEmail("");
      setFormPhone("");
      setFormGuests(100);
      setFormDate("");
      setFormMonth("");
      setFormVenue("");
      setFormPortal("Manual");
      setFormNotes("");
      setFormServices("");
      setIsAddingLead(false);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSort = (field: "created_at" | "nome" | "convidados") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "NOVO":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PRIMEIRO_CONTATO":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "FOLLOWUP1":
      case "FOLLOWUP2":
      case "FOLLOWUP3":
      case "FOLLOWUPFINAL":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "RESPONDIDO":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "FECHOU":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PERDIDO":
      case "SEM_RETORNO":
      case "SEM_WHATSAPP":
      case "Sem WhatsApp":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  const getTempColor = (temp: LeadTemperatura) => {
    switch (temp) {
      case "FRIA":
        return "text-sky-400 bg-sky-500/10 border-sky-500/10";
      case "MORNA":
        return "text-orange-400 bg-orange-500/10 border-orange-500/10";
      case "QUENTE":
        return "text-red-400 bg-red-500/10 border-red-500/10";
      case "CLIENTE":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/10";
      default:
        return "text-zinc-400 bg-zinc-800 border-zinc-700";
    }
  };

  // Helper to parse wedding dates robustly
  const parseWeddingDateLocal = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (!cleanStr) return null;

    let d: Date | null = null;
    const parts = cleanStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const fullYear = year < 100 ? 2000 + year : year;
        d = new Date(fullYear, month - 1, day);
      }
    } else {
      const parsed = Date.parse(cleanStr);
      if (!isNaN(parsed)) {
        d = new Date(parsed);
      }
    }

    if (d && !isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  };

  // Filter & Search Logic
  const filteredLeads = leads
    .filter((lead) => {
      // Exclude past weddings
      if (lead.data_casamento) {
        const wDate = parseWeddingDateLocal(lead.data_casamento);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (wDate && wDate < today) return false;
      }

      const matchSearch =
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.id && lead.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.link_celular && lead.link_celular.toLowerCase().includes(searchTerm.toLowerCase()));

      const normalizePortal = (portal?: string): string => {
        if (!portal) return "manual";
        const p = portal.toLowerCase().trim();
        if (p === "portal_noivas" || p === "portal noivas" || p === "portal de noivas") {
          return "portal_noivas";
        }
        if (p === "casamentos.com.br" || p === "casamentos") {
          return "casamentos";
        }
        if (p === "zankyou") {
          return "zankyou";
        }
        if (p === "manual" || p === "manual / cadastro crm" || p === "cadastro crm") {
          return "manual";
        }
        return p;
      };

      const isPerdido = (status?: string, motivo?: string) => {
        if (motivo && motivo.trim() !== "" && motivo !== "AGUARDANDO_DATA") return true;
        const s = String(status || "").toUpperCase();
        return s === "PERDIDO" || s === "SEM_RETORNO" || status === "Perdido" || status === "Sem Retorno" || status === "Sem Retorno / Encerrado" || status === "Sem WhatsApp";
      };

      const matchStatus = selectedStatus === "ALL" 
        ? !isPerdido(lead.status_funil, lead.motivo_perda)
        : (lead.status_funil === selectedStatus || mapLegacyValue("status_funil", lead.status_funil) === selectedStatus);
      const matchTemp = selectedTemp === "ALL" || lead.temperatura === selectedTemp || mapLegacyValue("temperatura", lead.temperatura) === selectedTemp;
      const matchPortal = selectedPortal === "ALL" || normalizePortal(lead.origem_portal) === normalizePortal(selectedPortal);

      return matchSearch && matchStatus && matchTemp && matchPortal;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "nome") {
        comparison = a.nome.localeCompare(b.nome);
      } else if (sortField === "convidados") {
        comparison = (a.convidados || 0) - (b.convidados || 0);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const isPerdido = (status?: string, motivo?: string) => {
    if (motivo && motivo.trim() !== "" && motivo !== "AGUARDANDO_DATA") return true;
    const s = String(status || "").toUpperCase();
    return s === "PERDIDO" || s === "SEM_RETORNO" || status === "Perdido" || status === "Sem Retorno" || status === "Sem Retorno / Encerrado" || status === "Sem WhatsApp";
  };

  const activeLeadsCount = leads.filter(l => !isPerdido(l.status_funil, l.motivo_perda)).length;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, email, celular ou ID..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-zinc-600"
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos Status Ativos ({activeLeadsCount})</option>
            {statusList.length > 0 ? (
              statusList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))
            ) : (
              <>
                <option value="NOVO">Novos</option>
                <option value="PRIMEIRO_CONTATO">Primeiro Contato</option>
                <option value="FOLLOWUP1">Follow-up 1</option>
                <option value="FOLLOWUP2">Follow-up 2</option>
                <option value="FOLLOWUP3">Follow-up 3</option>
                <option value="FOLLOWUPFINAL">Follow-up Final</option>
                <option value="RESPONDIDO">Respondidos</option>
                <option value="FECHOU">Fechou (Convertido)</option>
                <option value="PERDIDO">Perdidos / Encerrados</option>
              </>
            )}
          </select>

          {/* Temperature filter */}
          <select
            value={selectedTemp}
            onChange={(e) => setSelectedTemp(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas Temperaturas</option>
            {tempsList.length > 0 ? (
              tempsList.map((tmp) => (
                <option key={tmp} value={tmp}>{tmp}</option>
              ))
            ) : (
              <>
                <option value="FRIA">Fria</option>
                <option value="MORNA">Morna</option>
                <option value="QUENTE">Quente</option>
                <option value="CLIENTE">Cliente</option>
              </>
            )}
          </select>

          {/* Origin Portal filter */}
          <select
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos Portais</option>
            <option value="Portal Noivas">Portal Noivas</option>
            <option value="Casamentos.com.br">Casamentos.com.br</option>
            <option value="Zankyou">Zankyou</option>
            <option value="Manual">Manual / Cadastro CRM</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onSwitchTab && (
            <button
              onClick={() => onSwitchTab("sheet_import")}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-semibold text-xs rounded-lg transition"
            >
              <Download className="w-4 h-4 text-amber-500" />
              Importar Planilha
            </button>
          )}

          <button
            onClick={() => setIsAddingLead(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Criar Lead
          </button>
        </div>

      </div>

      {/* Database table header sort indicators */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-lg px-4 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:grid grid-cols-12 gap-4 items-center shrink-0">
        <button onClick={() => toggleSort("nome")} className="col-span-3 flex items-center gap-1 text-left hover:text-white">
          Lead
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <span className="col-span-3">Email • Telefone</span>
        <button onClick={() => toggleSort("convidados")} className="col-span-1 flex items-center gap-1 hover:text-white">
          Convidados
          <ArrowUpDown className="w-3 h-3" />
        </button>
        <span className="col-span-2">Detalhes Evento</span>
        <span className="col-span-2">Status / Etapa</span>
        <button onClick={() => toggleSort("created_at")} className="col-span-1 flex items-center gap-1 hover:text-white justify-end">
          Criado
          <ArrowUpDown className="w-3 h-3" />
        </button>
      </div>

      {/* Database Leads list row entries */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => {
            const date = new Date(lead.created_at || Date.now());
            
            return (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 md:grid md:grid-cols-12 md:gap-4 flex flex-col gap-3.5 items-start md:items-center text-xs text-zinc-300 text-left transition"
              >
                {/* Bride identity */}
                <div className="md:col-span-3 w-full flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold shrink-0">
                    {lead.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-white block truncate">{lead.nome}</span>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{lead.id}</span>
                  </div>
                </div>

                {/* Email / phone contact */}
                <div className="md:col-span-3 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 md:truncate space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>{lead.link_celular || "Sem fone"}</span>
                  </div>
                </div>

                {/* Guests */}
                <div className="md:col-span-1 w-full flex justify-between md:block text-zinc-400 md:text-white border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 font-semibold">
                  <span className="md:hidden font-medium text-zinc-500">Convidados:</span>
                  <span>{lead.convidados}</span>
                </div>

                {/* Event Details */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 md:truncate space-y-1 pr-2">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{lead.data_casamento || "Não inf."}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block truncate">{lead.local || "Local não informado"}</span>
                </div>

                {/* Status Badges */}
                <div className="md:col-span-2 w-full border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0 flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${getStatusColor(lead.status_funil)}`}>
                      {lead.status_funil}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getTempColor(lead.temperatura)}`}>
                      {lead.temperatura}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate block">Etapa: {lead.etapa_contato}</span>
                </div>

                {/* Date created & arrow */}
                <div className="md:col-span-1 w-full flex items-center justify-between md:justify-end gap-1 font-mono text-[10px] text-zinc-500 border-t border-zinc-850/60 pt-3 md:pt-0 md:border-t-0">
                  <span className="md:hidden text-zinc-500 font-sans">Data de criação:</span>
                  <div className="flex items-center gap-1">
                    {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    <ChevronRight className="w-4 h-4 text-zinc-600 hidden md:block" />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl p-12 text-center text-zinc-500">
            Nenhum lead encontrado com os filtros e busca aplicados.
          </div>
        )}
      </div>

      {/* Add Lead Drawer Modal Overlay */}
      {isAddingLead && createPortal(
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleAddSubmit} 
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[85vh] h-auto my-auto animate-fade-in"
          >
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-semibold text-white">Cadastrar Novo Lead</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingLead(false)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs min-h-0">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Nome do Lead *</label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Larissa Souza"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="larissa@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">WhatsApp / Celular</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(13) 99655-1212"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Número de Convidados (Estimativa)</label>
                  <input
                    type="number"
                    min="0"
                    value={formGuests}
                    onChange={(e) => setFormGuests(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Data do Casamento (DD/MM/AAAA)</label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="12/10/2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Mês do Casamento (Extenso)</label>
                  <input
                    type="text"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                    placeholder="Outubro"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Local do Casamento</label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="Recanto dos Sonhos, Santos"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Canal Originário</label>
                  <select
                    value={formPortal}
                    onChange={(e) => setFormPortal(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Manual">Manual / CRM Interior</option>
                    <option value="Portal Noivas">Portal Noivas</option>
                    <option value="Casamentos.com.br">Casamentos.com.br</option>
                    <option value="Zankyou">Zankyou</option>
                    <option value="site_direto">Site Direto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Serviços Solicitados</label>
                <input
                  type="text"
                  value={formServices}
                  onChange={(e) => setFormServices(e.target.value)}
                  placeholder="Lembrancinhas Mini Velas, Difusores etc."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-medium">Observações Iniciais</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Lead solicitou rótulo personalizado rústico."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500 placeholder-zinc-700 resize-none"
                />
              </div>

              {/* Informative Auto budget calculation */}
              <div className="p-3 bg-zinc-950 border border-zinc-800/85 rounded-lg flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <Calculator className="w-4 h-4 text-zinc-600" />
                <span>O CRM calculará os orçamentos para {formGuests} convidados de forma automática ao salvar.</span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 p-5 border-t border-zinc-800 bg-zinc-950/20 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddingLead(false)}
                className="px-4 py-2 hover:bg-zinc-800 text-zinc-300 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition"
              >
                Cadastrar Lead
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
