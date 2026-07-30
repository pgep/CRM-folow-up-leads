/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Settings, Globe, Mail, Database, Bell, RefreshCw, Star, Info, Download, Megaphone, Sliders, Package, Home, DollarSign, Menu, X } from "lucide-react";
import { Lead, WorkflowStage, PortalSource, DashboardStats } from "./types";
import Dashboard from "./components/Dashboard";
import LeadsList from "./components/LeadsList";
import LeadDetailsModal from "./components/LeadDetailsModal";
import WorkflowConfig from "./components/WorkflowConfig";
import PortalsConfig from "./components/PortalsConfig";
import SheetImporter from "./components/SheetImporter";
import BroadcastManager from "./components/BroadcastManager";
import ProductsConfig from "./components/ProductsConfig";
import FinancialManager from "./components/FinancialManager";
import { useToast } from "./components/Toast";

type TabType = "dashboard" | "leads" | "sheet_import" | "workflow" | "portals" | "broadcast" | "products" | "financial";

export default function App() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [portals, setPortals] = useState<PortalSource[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNegociacaoOnly, setShowNegociacaoOnly] = useState(false);

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
        toast.success("Lead excluído com sucesso!");
      } else {
        toast.error("Não foi possível excluir o lead.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede ao excluir o lead.");
    }
  };

  const handleAddManualLead = async (formData: any) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.duplicate) {
          toast.warning(`Lead já cadastrado previamente! Tentativa registrada no histórico de "${data.nome}".`);
        } else {
          toast.success(`Lead "${data.nome}" cadastrado com sucesso!`);
        }
        await fetchData();
      } else {
        toast.error(data.error || "Erro ao cadastrar lead.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de rede ao cadastrar lead.");
    }
  };

  const handleRunAutomation = async () => {
    const res = await fetch("/api/automation/run", { method: "POST" });
    const data = await res.json();
    await fetchData(); // Refresh dashboard stats and lists
    return data;
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-amber-500/30 selection:text-white w-full">
      
      {/* Mobile Top Header */}
      <header className="md:hidden bg-zinc-900 border-b border-zinc-850 p-4 sticky top-0 z-40 flex items-center justify-between shrink-0 w-full">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-lg transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 overflow-hidden shrink-0">
              <img
                src="/assets/logo.png"
                alt="Casa Colombo Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = document.getElementById("mobile-logo-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
              <Home id="mobile-logo-fallback" className="hidden w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-bold tracking-wide text-white font-mono">CASA COLOMBO</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition border border-zinc-850"
            title="Sincronizar CRM"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Drawer (Fixed on mobile, static on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-850 z-50 flex flex-col justify-between transform transition-transform duration-300 md:relative md:transform-none md:flex shrink-0 md:h-screen md:sticky md:top-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Sidebar Header */}
          <div className="p-5 border-b border-zinc-850 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 overflow-hidden shrink-0">
                <img
                  src="/assets/logo.png"
                  alt="Casa Colombo Logo"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = document.getElementById("aside-logo-fallback");
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
                <Home id="aside-logo-fallback" className="hidden w-4.5 h-4.5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xs font-bold tracking-wider text-white font-mono uppercase">
                  CASA COLOMBO
                </h1>
                <p className="text-[9px] text-zinc-500 font-medium">CRM & Funil de Leads</p>
              </div>
            </div>
            
            {/* Close button for Mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Tabs Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
            <button
              onClick={() => handleTabChange("dashboard")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "dashboard"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard Funil</span>
            </button>

            <button
              onClick={() => handleTabChange("leads")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "leads"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1">Lista de Leads</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${activeTab === "leads" ? "bg-zinc-950 text-amber-400" : "bg-zinc-850 text-zinc-400"}`}>
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("financial")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "financial"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Financeiro</span>
            </button>

            <button
              onClick={() => handleTabChange("broadcast")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "broadcast"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>Ações & Broadcast</span>
            </button>

            <button
              onClick={() => handleTabChange("sheet_import")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "sheet_import"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Importar Planilha</span>
            </button>

            <button
              onClick={() => handleTabChange("portals")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "portals"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Portais Captura</span>
            </button>

            <button
              onClick={() => handleTabChange("products")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "products"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Catálogo Produtos</span>
            </button>

            <button
              onClick={() => handleTabChange("workflow")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition text-left ${
                activeTab === "workflow"
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Configurações Gerais</span>
            </button>
          </nav>

          {/* Footer status badges inside sidebar */}
          <div className="p-4 border-t border-zinc-850 space-y-2 bg-zinc-950/20 shrink-0">
            {stats?.systemStatus?.pgConnected ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-850 text-[10px] text-emerald-400 font-mono" title="PostgreSQL conectado">
                <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate">Postgres Ativo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-850 text-[10px] text-amber-500 font-mono" title="Banco database.json ativo">
                <Database className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="truncate">Banco Local</span>
              </div>
            )}

            {!stats?.systemStatus?.schedulerPaused ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-850 text-[10px] text-emerald-400 font-mono" title="Automações ativas">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="truncate">Automações On</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-850 text-[10px] text-red-400 font-mono" title="Automações pausadas">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                <span className="truncate">Automações Off</span>
              </div>
            )}

            <button
              onClick={fetchData}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] font-semibold tracking-wide transition border border-zinc-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar CRM
            </button>
          </div>

        </div>
      </aside>

      {/* Main content body wrapper */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        
        {/* Main Content Scroll container - expanded to 95% total width */}
        <main className="flex-1 max-w-[95%] w-full mx-auto p-4 md:p-8 overflow-y-auto flex flex-col justify-start">
          
          {loading && leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-[400px]">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-zinc-500 text-sm font-medium">Sincronizando banco de dados...</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-6">
              
              {activeTab === "dashboard" && (
                <Dashboard 
                  stats={stats} 
                  onRunAutomation={handleRunAutomation} 
                  onRefresh={fetchData} 
                  onSelectNegociacao={() => {
                    setShowNegociacaoOnly(true);
                    setActiveTab("leads");
                  }}
                />
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
                  initialNegociacaoOnly={showNegociacaoOnly}
                  onClearNegociacaoOnly={() => setShowNegociacaoOnly(false)}
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

              {activeTab === "financial" && (
                <FinancialManager leads={leads} />
              )}

            </div>
          )}

        </main>

        {/* Footer credits bar */}
        <footer className="bg-zinc-900 border-t border-zinc-850 p-4 text-center text-[10px] text-zinc-500 shrink-0 w-full mt-auto">
          <div className="max-w-[95%] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
            <span>CRM Casa Colombo Artesanal • Todos os direitos reservados.</span>
            <span>Sincronizado via Automação V2 Engine • Powered by Express Node.js & PostgreSQL</span>
          </div>
        </footer>

      </div>

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
