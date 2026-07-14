/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Settings, Globe, Mail, Database, Bell, RefreshCw, Star, Info, Download } from "lucide-react";
import { Lead, WorkflowStage, PortalSource, DashboardStats } from "./types";
import Dashboard from "./components/Dashboard";
import LeadsList from "./components/LeadsList";
import LeadDetailsModal from "./components/LeadDetailsModal";
import WorkflowConfig from "./components/WorkflowConfig";
import PortalsConfig from "./components/PortalsConfig";
import ParserTool from "./components/ParserTool";
import DatabaseSetup from "./components/DatabaseSetup";
import SheetImporter from "./components/SheetImporter";

type TabType = "dashboard" | "leads" | "sheet_import" | "workflow" | "portals" | "parser" | "setup";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [portals, setPortals] = useState<PortalSource[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [useSupabase, setUseSupabase] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all necessary data from the backend full-stack endpoints
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const resLeads = await fetch("/api/leads");
      if (resLeads.ok) {
        const dataLeads = await resLeads.json();
        setLeads(dataLeads);
      }

      const resStages = await fetch("/api/workflow");
      if (resStages.ok) {
        const dataStages = await resStages.json();
        setStages(dataStages);
      }

      const resPortals = await fetch("/api/portals");
      if (resPortals.ok) {
        const dataPortals = await resPortals.json();
        setPortals(dataPortals);
      }

      const resStats = await fetch("/api/stats");
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // Check if server is configured with real Supabase connection keys
      // We check this by verifying process.env-like configurations from our backend
      setUseSupabase(Boolean(window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"));

    } catch (e) {
      console.error("Error fetching data from APIs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStage = async (updatedStage: WorkflowStage) => {
    try {
      const res = await fetch("/api/workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStage)
      });
      if (res.ok) {
        await fetchData(); // refresh configurations
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetWorkflow = async () => {
    try {
      const res = await fetch("/api/workflow/reset", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePortal = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/portals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: active })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPortal = async (nome: string) => {
    try {
      const res = await fetch("/api/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchData(); // Refresh leads list and stats
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddManualLead = async (formData: any) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAutomation = async () => {
    const res = await fetch("/api/automation/run", { method: "POST" });
    const data = await res.json();
    await fetchData(); // Refresh dashboard stats and lists
    return data;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-white">
      
      {/* Top Main Navigation Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-850 p-4 sticky top-0 z-40 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo Title Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/10">
              <Star className="w-5 h-5 fill-zinc-950 text-zinc-950 stroke-1.5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white font-mono flex items-center gap-2">
                CASA COLOMBO ARTESANAL
                <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold px-1 rounded uppercase tracking-wider">
                  V2 Beta
                </span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-medium">CRM & Follow-up de Noivas Integrado</p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* DB status flag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
              <span className={`w-2 h-2 rounded-full ${useSupabase ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
              {useSupabase ? "Supabase Cloud" : "Banco Local Ativo"}
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition border border-zinc-800"
              title="Sincronizar CRM"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Tab Switcher Bar */}
      <nav className="bg-zinc-900/60 border-b border-zinc-850 py-1.5 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          
          {/* Dashboard Tab */}
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "dashboard"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard Funil
          </button>

          {/* Leads Tab */}
          <button
            onClick={() => setActiveTab("leads")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "leads"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Users className="w-4 h-4" />
            Lista de Noivas ({leads.length})
          </button>

          {/* Sheet Import Tab */}
          <button
            onClick={() => setActiveTab("sheet_import")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "sheet_import"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Download className="w-4 h-4" />
            Importar Tabela
          </button>

          {/* Workflow Config Tab */}
          <button
            onClick={() => setActiveTab("workflow")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "workflow"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Settings className="w-4 h-4" />
            Configurações Gerais
          </button>

          {/* Portals Config Tab */}
          <button
            onClick={() => setActiveTab("portals")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "portals"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Globe className="w-4 h-4" />
            Portais Captura
          </button>

          {/* Parser Tool Tab */}
          <button
            onClick={() => setActiveTab("parser")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "parser"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Mail className="w-4 h-4" />
            Simulador Zoho Mail
          </button>

          {/* Setup / SQL DDL Tab */}
          <button
            onClick={() => setActiveTab("setup")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "setup"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Database className="w-4 h-4" />
            Banco SQL DDL
          </button>

        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden flex flex-col justify-start">
        
        {loading && leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-[400px]">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-zinc-500 text-sm font-medium">Sincronizando banco de dados...</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            
            {activeTab === "dashboard" && (
              <Dashboard stats={stats} onRunAutomation={handleRunAutomation} />
            )}

            {activeTab === "leads" && (
              <LeadsList
                leads={leads}
                portals={portals}
                onSelectLead={setSelectedLeadId}
                onAddManualLead={handleAddManualLead}
                onRefresh={fetchData}
                onSwitchTab={setActiveTab}
              />
            )}

            {activeTab === "sheet_import" && (
              <SheetImporter onImportComplete={fetchData} />
            )}

            {activeTab === "workflow" && (
              <WorkflowConfig
                stages={stages}
                onUpdateStage={handleUpdateStage}
                onReset={handleResetWorkflow}
              />
            )}

            {activeTab === "portals" && (
              <PortalsConfig
                portals={portals}
                onToggle={handleTogglePortal}
                onAdd={handleAddPortal}
              />
            )}

            {activeTab === "parser" && (
              <ParserTool onLeadAdded={(newLead) => {
                fetchData(); // reload list and stats
                setSelectedLeadId(newLead.id); // open details modal automatically
              }} />
            )}

            {activeTab === "setup" && (
              <DatabaseSetup useSupabase={useSupabase} />
            )}

          </div>
        )}

      </main>

      {/* Footer credits bar */}
      <footer className="bg-zinc-900 border-t border-zinc-850 p-4 text-center text-[10px] text-zinc-500 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <span>CRM Casa Colombo Artesanal • Todos os direitos reservados.</span>
          <span>Sincronizado via Automação V2 Engine • Powered by Express Node.js & Supabase</span>
        </div>
      </footer>

      {/* Lead Details timeline Modal Overlay */}
      {selectedLeadId && (
        <LeadDetailsModal
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onUpdateLead={handleUpdateLead}
        />
      )}

    </div>
  );
}
