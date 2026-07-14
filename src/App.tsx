/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Settings, Globe, Mail, Database, Bell, RefreshCw, Star, Info, Download, Megaphone, Sliders, Package, Home } from "lucide-react";
import { Lead, WorkflowStage, PortalSource, DashboardStats } from "./types";
import Dashboard from "./components/Dashboard";
import LeadsList from "./components/LeadsList";
import LeadDetailsModal from "./components/LeadDetailsModal";
import WorkflowConfig from "./components/WorkflowConfig";
import PortalsConfig from "./components/PortalsConfig";
import SheetImporter from "./components/SheetImporter";
import BroadcastManager from "./components/BroadcastManager";
import ProductsConfig from "./components/ProductsConfig";

type TabType = "dashboard" | "leads" | "sheet_import" | "workflow" | "portals" | "broadcast" | "products";

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
      
      const parseWeddingDate = (dateStr?: string): Date | null => {
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

      const resLeads = await fetch("/api/leads");
      if (resLeads.ok) {
        const dataLeads: Lead[] = await resLeads.json();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = dataLeads.filter((l) => {
          if (!l.data_casamento) return true;
          const wDate = parseWeddingDate(l.data_casamento);
          if (!wDate) return true;
          return wDate >= today;
        });

        setLeads(filtered);
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

  const handleUpdateStage = async (updatedStage: WorkflowStage | WorkflowStage[]) => {
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

  const handleDeleteLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSelectedLeadId(null);
        await fetchData(); // Refresh leads list and stats
      } else {
        alert("Não foi possível excluir o lead.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de rede ao excluir o lead.");
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
            <div className="relative w-10 h-10 flex items-center justify-center rounded-full border border-zinc-850 bg-zinc-900 shadow-md shadow-amber-500/5 overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="Casa Colombo Artesanal Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = document.getElementById("header-logo-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
              <Home id="header-logo-fallback" className="hidden w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white font-mono">
                CASA COLOMBO ARTESANAL
              </h1>
              <p className="text-[10px] text-zinc-500 font-medium">CRM & Follow-up de Leads Integrado</p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {/* DB status flag (PostgreSQL or Local DB) */}
            {stats?.systemStatus?.pgConnected ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-emerald-400 font-mono" title="Banco de dados PostgreSQL conectado com sucesso">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Postgres Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-amber-500 font-mono" title="Usando banco de dados local database.json">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Banco Local Ativo</span>
              </div>
            )}

            {/* Automation status flag */}
            {!stats?.systemStatus?.schedulerPaused ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-emerald-400 font-mono" title="Automações automáticas estão ativas">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Automações Ativas</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-red-400 font-mono" title="Automações automáticas estão pausadas">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>Automações Pausadas</span>
              </div>
            )}

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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-1.5">
          
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
            Lista de Leads ({leads.length})
          </button>

          {/* Broadcast / Campaigns Tab */}
          <button
            onClick={() => setActiveTab("broadcast")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "broadcast"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Ações Especiais & Broadcast
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

          {/* Products Config Tab */}
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition shrink-0 ${
              activeTab === "products"
                ? "bg-amber-500 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo de Produtos
          </button>

        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-y-auto flex flex-col justify-start">
        
        {loading && leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-[400px]">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
            <p className="text-zinc-500 text-sm font-medium">Sincronizando banco de dados...</p>
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            
            {activeTab === "dashboard" && (
              <Dashboard stats={stats} onRunAutomation={handleRunAutomation} onRefresh={fetchData} />
            )}

            {activeTab === "broadcast" && (
              <BroadcastManager
                leads={leads}
                portals={portals}
                onRefresh={fetchData}
              />
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

            {activeTab === "products" && (
              <ProductsConfig />
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
          onDeleteLead={handleDeleteLead}
        />
      )}

    </div>
  );
}
