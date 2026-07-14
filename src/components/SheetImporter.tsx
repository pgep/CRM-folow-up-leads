/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Download, Search, Check, ExternalLink, RefreshCw, Users, ArrowUpDown, CheckCircle, AlertTriangle } from "lucide-react";

interface SheetLead {
  lead_id: string;
  origem: string;
  nome: string;
  email: string;
  linkCelular: string;
  dataCasamento: string;
  mesCasamento: string;
  local: string;
  convidados: string;
  status_funil: string;
  already_imported: boolean;
}

interface SheetImporterProps {
  onImportComplete: () => void;
}

export default function SheetImporter({ onImportComplete }: SheetImporterProps) {
  const [sheetLeads, setSheetLeads] = useState<SheetLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "IMPORTED" | "PENDING">("ALL");
  const [importResult, setImportResult] = useState<{ imported_count: number } | null>(null);

  const fetchSheetData = async () => {
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/leads/import-sheet/preview");
      if (!res.ok) {
        throw new Error("Não foi possível carregar os dados da planilha Google Sheets.");
      }
      const data = await res.json();
      setSheetLeads(data);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar planilha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, []);

  const handleImportAllPending = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/import-sheet/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        throw new Error("Erro ao executar importação em lote.");
      }
      const result = await res.json();
      setImportResult(result);
      await fetchSheetData(); // refresh list
      onImportComplete(); // reload main app metrics and list
    } catch (err: any) {
      setError(err.message || "Falha ao importar leads.");
    } finally {
      setImporting(false);
    }
  };

  const handleImportSingle = async (leadId: string) => {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/import-sheet/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [leadId] })
      });
      if (!res.ok) {
        throw new Error(`Erro ao importar o lead ${leadId}.`);
      }
      const result = await res.json();
      setImportResult(result);
      await fetchSheetData(); // refresh list
      onImportComplete(); // reload main app metrics and list
    } catch (err: any) {
      setError(err.message || "Falha ao importar o lead.");
    } finally {
      setImporting(false);
    }
  };

  // Filter leads based on search term and import status
  const filteredLeads = sheetLeads.filter((lead) => {
    const matchSearch =
      (lead.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.lead_id || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchFilter =
      filterStatus === "ALL" ||
      (filterStatus === "IMPORTED" && lead.already_imported) ||
      (filterStatus === "PENDING" && !lead.already_imported);

    return matchSearch && matchFilter;
  });

  const pendingCount = sheetLeads.filter((l) => !l.already_imported).length;
  const importedCount = sheetLeads.filter((l) => l.already_imported).length;

  return (
    <div className="space-y-6">
      
      {/* Banner / Sheet Information Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Importador de Leads via Planilha Google Sheets
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sincronize o CRM diretamente com a planilha oficial de captação de leads. O sistema realiza uma varredura automática, valida se o lead já foi importado através do identificador único <code className="text-amber-400 font-mono bg-zinc-950 px-1 py-0.5 rounded text-[10px]">lead_id</code> para evitar duplicidades e exibe os registros em tempo real.
          </p>
          <div className="pt-2 flex items-center gap-4 text-[11px] font-mono">
            <a
              href="https://docs.google.com/spreadsheets/d/16_gt6qo7fT9r2WMxLUwWxhYT4HKOrhvjoD--CdDz124/edit?gid=0#gid=0"
              target="_blank"
              referrerPolicy="no-referrer"
              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 bg-amber-500/5 px-2.5 py-1 rounded border border-amber-500/10 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visualizar Planilha Google original
            </a>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">Total na Planilha: <strong className="text-white">{sheetLeads.length}</strong></span>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchSheetData}
            disabled={loading || importing}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-semibold text-xs rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sincronizar Planilha
          </button>

          <button
            onClick={handleImportAllPending}
            disabled={loading || importing || pendingCount === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs rounded-lg transition shadow-sm shadow-amber-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            Importar {pendingCount} Pendentes
          </button>
        </div>
      </div>

      {/* Result feedback */}
      {importResult && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          <div>
            <span className="font-semibold block">Importação concluída com sucesso!</span>
            <p className="text-[11px] text-emerald-500/80 mt-0.5">
              Novos leads adicionados ao funil de vendas: <strong className="text-white">{importResult.imported_count}</strong>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou lead_id da planilha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-850 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] font-semibold transition ${
              filterStatus === "ALL" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Todos ({sheetLeads.length})
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] font-semibold transition ${
              filterStatus === "PENDING" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("IMPORTED")}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] font-semibold transition ${
              filterStatus === "IMPORTED" ? "bg-amber-500 text-black font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Já Importados ({importedCount})
          </button>
        </div>

      </div>

      {/* Leads table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        
        {loading && sheetLeads.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center h-[300px]">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <span className="text-zinc-500 text-xs">Acessando Google Sheets e sincronizando dados...</span>
          </div>
        ) : filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-4 font-semibold">Lead ID / Origem</th>
                  <th className="py-3 px-4 font-semibold">Lead</th>
                  <th className="py-3 px-4 font-semibold">Casamento</th>
                  <th className="py-3 px-4 font-semibold">Local & Convidados</th>
                  <th className="py-3 px-4 font-semibold">Status Planilha</th>
                  <th className="py-3 px-4 font-semibold text-center">Status CRM</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/60">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.lead_id}
                    className={`hover:bg-zinc-850/40 transition-colors ${
                      lead.already_imported ? "bg-zinc-900/10" : ""
                    }`}
                  >
                    
                    {/* Lead ID & Portal */}
                    <td className="py-3 px-4 space-y-1">
                      <span className="font-mono text-[11px] font-medium text-zinc-300 block">{lead.lead_id}</span>
                      <span className="text-[10px] text-zinc-500 block">{lead.origem || "Portal Noivas"}</span>
                    </td>

                    {/* Bride info */}
                    <td className="py-3 px-4 space-y-0.5">
                      <span className="font-semibold text-white block">{lead.nome}</span>
                      <span className="text-[10px] text-zinc-400 block">{lead.email}</span>
                      {lead.linkCelular && (
                        <span className="text-[10px] text-zinc-500 font-mono block">{lead.linkCelular}</span>
                      )}
                    </td>

                    {/* Wedding date */}
                    <td className="py-3 px-4 space-y-0.5">
                      <span className="font-medium text-zinc-200 block">{lead.dataCasamento || "—"}</span>
                      {lead.mesCasamento && (
                        <span className="text-[10px] text-zinc-500 font-medium block">Mês: {lead.mesCasamento}</span>
                      )}
                    </td>

                    {/* Venue & Guests */}
                    <td className="py-3 px-4 space-y-0.5">
                      <span className="text-zinc-300 truncate max-w-[150px] block" title={lead.local}>
                        {lead.local || "Não informado"}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Convidados: <strong className="text-zinc-400">{lead.convidados || "—"}</strong>
                      </span>
                    </td>

                    {/* Spreadsheet stage */}
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {lead.status_funil || "PENDENTE"}
                      </span>
                    </td>

                    {/* CRM integration status */}
                    <td className="py-3 px-4 text-center">
                      {lead.already_imported ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Check className="w-3 h-3" />
                          Importado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Individual Import action */}
                    <td className="py-3 px-4 text-right">
                      {lead.already_imported ? (
                        <span className="text-[10px] text-zinc-500 font-mono italic">Sincronizado</span>
                      ) : (
                        <button
                          onClick={() => handleImportSingle(lead.lead_id)}
                          disabled={importing}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold text-[10px] rounded transition"
                        >
                          Importar
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center h-[250px]">
            <AlertTriangle className="w-6 h-6 text-zinc-700 mb-2" />
            <span>Nenhum registro encontrado na planilha com os filtros selecionados.</span>
          </div>
        )}

      </div>

    </div>
  );
}
