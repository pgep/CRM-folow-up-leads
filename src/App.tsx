/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LayoutDashboard, Users, Settings, Globe, Mail, Database, Bell, RefreshCw, Star, Info, Megaphone, Sliders, Package, Home, DollarSign, Menu, X, Columns, CalendarCheck, Sun, Moon } from "lucide-react";
import { Lead, WorkflowStage, PortalSource, DashboardStats } from "./types";
import Dashboard from "./components/Dashboard";
import MinhaAgenda from "./components/MinhaAgenda";
import LeadsList from "./components/LeadsList";
import LeadDetailsModal from "./components/LeadDetailsModal";
import WorkflowConfig from "./components/WorkflowConfig";
import PortalsConfig from "./components/PortalsConfig";
import BroadcastManager from "./components/BroadcastManager";
import ProductsConfig from "./components/ProductsConfig";
import FinancialManager from "./components/FinancialManager";
import KanbanBoard from "./components/KanbanBoard";
import { useToast } from "./components/Toast";

type TabType = "dashboard" | "agenda" | "kanban" | "leads" | "workflow" | "portals" | "broadcast" | "products" | "financial";

export default function App() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_theme");
      if (saved === "dark" || saved === "light") return saved;
    }
    return "light"; // LIGHT is the default theme
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("crm_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

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

      // Safe JSON fetch helper
      const fetchJsonSafe = async <T,>(url: string): Promise<T | null> => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const ct = res.headers.get("content-type");
          if (!ct || !ct.includes("application/json")) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [dataLeads, dataStages, dataPortals, dataStats, dataHealth] = await Promise.all([
        fetchJsonSafe<Lead[]>("/api/leads"),
        fetchJsonSafe<WorkflowStage[]>("/api/workflow"),
        fetchJsonSafe<PortalSource[]>("/api/portals"),
        fetchJsonSafe<DashboardStats>("/api/stats"),
        fetchJsonSafe<{ pgConnected: boolean; database: string }>("/api/health")
      ]);

      if (dataLeads) {
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

      if (dataStages) {
        setStages(dataStages);
      }

      if (dataPortals) {
        setPortals(dataPortals);
      }

      if (dataStats) {
        setStats(dataStats);
      } else if (dataHealth) {
        setStats({
          totalLeads: 0,
          leadsNovos: 0,
          leadsAtivos: 0,
          leadsConvertidos: 0,
          leadsPerdidos: 0,
          leadsEmNegociacao: 0,
          taxaConversao: 0,
          leadsPorStatus: {} as any,
          leadsPorEtapa: {} as any,
          leadsPorTemperatura: {} as any,
          leadsPorOrigem: {} as any,
          historicoEntrada: [],
          upcomingWeddings: { oneMonth: [], twoMonths: [], threeMonths: [] },
          systemStatus: {
            database: dataHealth.database || "PostgreSQL",
            pgConnected: Boolean(dataHealth.pgConnected),
            schedulerPaused: false
          }
        });
      }
    } catch (e) {
      console.warn("Aviso ao carregar dados das APIs:", e);
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

  const handleDeletePortal = async (id: string) => {
    try {
      const res = await fetch(`/api/portals/${id}`, {
        method: "DELETE"
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
        } else if (data.automation_error) {
          toast.success(`Lead "${data.nome}" cadastrado com sucesso!`);
          toast.warning(`Aviso: O lead foi salvo com sucesso, mas a automação inicial externa reportou falha (${data.automation_error}).`);
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
    <div
      className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row font-sans selection:bg-indigo-500/20 w-full transition-colors duration-200"
      style={{ backgroundColor: "var(--crm-bg)", color: "var(--crm-text)" }}
    >
      
      {/* Mobile Top Header */}
      <header
        className="md:hidden border-b p-3.5 sticky top-0 z-40 flex items-center justify-between shrink-0 w-full transition-colors duration-200"
        style={{ backgroundColor: "var(--crm-surface)", borderColor: "var(--crm-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-lg transition hover:opacity-80"
            style={{ color: "var(--crm-text-secondary)" }}
            aria-label="Abrir menu lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center rounded-lg border overflow-hidden shrink-0"
              style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)" }}
            >
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
              <Home id="mobile-logo-fallback" className="hidden w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-semibold" style={{ color: "var(--crm-text)" }}>Casa Colombo</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition border hover:opacity-80"
            style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)", color: "var(--crm-text-secondary)" }}
            title={theme === "light" ? "Alternar para modo escuro" : "Alternar para modo claro"}
          >
            {theme === "light" ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg transition border hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)", color: "var(--crm-text-secondary)" }}
            title="Sincronizar CRM"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Drawer (Fixed on mobile, static on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 md:w-60 lg:w-64 border-r z-50 flex flex-col justify-between transform transition-transform duration-200 md:relative md:transform-none md:flex shrink-0 md:h-screen md:sticky md:top-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ backgroundColor: "var(--crm-surface)", borderColor: "var(--crm-border)" }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Sidebar Header */}
          <div
            className="p-4 border-b flex items-center justify-between shrink-0"
            style={{ borderColor: "var(--crm-border)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="relative w-9 h-9 flex items-center justify-center rounded-xl border overflow-hidden shrink-0 shadow-xs"
                style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)" }}
              >
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
                <Home id="aside-logo-fallback" className="hidden w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate" style={{ color: "var(--crm-text)" }}>
                  Casa Colombo
                </h1>
                <p className="text-[11px] font-normal truncate" style={{ color: "var(--crm-text-secondary)" }}>
                  CRM Comercial
                </p>
              </div>
            </div>
            
            {/* Close button for Mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg transition hover:opacity-80"
              style={{ color: "var(--crm-text-secondary)" }}
              aria-label="Fechar menu lateral"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Tabs Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {/* Section: Principal */}
            <div>
              <span className="px-3 text-[11px] font-medium block mb-1.5 tracking-wider uppercase" style={{ color: "var(--crm-text-muted)" }}>
                Principal
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => handleTabChange("dashboard")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "dashboard"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "dashboard" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "dashboard" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "dashboard" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "dashboard" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <LayoutDashboard className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "dashboard" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Dashboard Funil</span>
                </button>

                <button
                  onClick={() => handleTabChange("agenda")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "agenda"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "agenda" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "agenda" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "agenda" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "agenda" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <CalendarCheck className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "agenda" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="flex-1 truncate">Minha Agenda</span>
                </button>

                <button
                  onClick={() => handleTabChange("kanban")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "kanban"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "kanban" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "kanban" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "kanban" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "kanban" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Columns className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "kanban" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="flex-1 truncate">Pipeline Comercial</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium ml-1.5"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      color: "var(--crm-text-secondary)",
                      border: "1px solid var(--crm-border)"
                    }}
                  >
                    Kanban
                  </span>
                </button>

                <button
                  onClick={() => handleTabChange("leads")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "leads"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "leads" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "leads" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "leads" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "leads" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Users className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "leads" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="flex-1 truncate">Lista de Leads</span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium ml-1.5"
                    style={{
                      backgroundColor: "var(--crm-surface-subtle)",
                      color: "var(--crm-text-secondary)",
                      border: "1px solid var(--crm-border)"
                    }}
                  >
                    {leads.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Section: Operação & Vendas */}
            <div>
              <span className="px-3 text-[11px] font-medium block mb-1.5 tracking-wider uppercase" style={{ color: "var(--crm-text-muted)" }}>
                Operação & Vendas
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => handleTabChange("financial")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "financial"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "financial" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "financial" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "financial" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "financial" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <DollarSign className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "financial" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Financeiro</span>
                </button>

                <button
                  onClick={() => handleTabChange("broadcast")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "broadcast"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "broadcast" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "broadcast" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "broadcast" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "broadcast" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Megaphone className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "broadcast" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Ações & Broadcast</span>
                </button>
              </div>
            </div>

            {/* Section: Configurações */}
            <div>
              <span className="px-3 text-[11px] font-medium block mb-1.5 tracking-wider uppercase" style={{ color: "var(--crm-text-muted)" }}>
                Configurações
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => handleTabChange("portals")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "portals"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "portals" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "portals" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "portals" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "portals" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Globe className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "portals" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Canais Originários</span>
                </button>

                <button
                  onClick={() => handleTabChange("products")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "products"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "products" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "products" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "products" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "products" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Package className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "products" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Catálogo Produtos</span>
                </button>

                <button
                  onClick={() => handleTabChange("workflow")}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm transition text-left cursor-pointer border ${
                    activeTab === "workflow"
                      ? "font-semibold shadow-xs"
                      : "font-medium hover:opacity-90 border-transparent"
                  }`}
                  style={{
                    backgroundColor: activeTab === "workflow" ? "var(--crm-surface-subtle)" : "transparent",
                    borderColor: activeTab === "workflow" ? "var(--crm-border)" : "transparent",
                    color: activeTab === "workflow" ? "var(--crm-text)" : "var(--crm-text-secondary)",
                  }}
                >
                  <span
                    className={`w-1 h-4 rounded-full mr-2.5 shrink-0 transition-colors ${
                      activeTab === "workflow" ? "bg-indigo-600 dark:bg-indigo-400" : "bg-transparent"
                    }`}
                  />
                  <Settings className={`w-4 h-4 shrink-0 mr-2.5 ${activeTab === "workflow" ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--crm-text-muted)]"}`} />
                  <span className="truncate">Configurações Gerais</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Footer status badges inside sidebar: compact and elegant */}
          <div
            className="p-3 border-t space-y-2 shrink-0 transition-colors"
            style={{ borderColor: "var(--crm-border)", backgroundColor: "var(--crm-surface)" }}
          >
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs"
              style={{ backgroundColor: "var(--crm-surface-subtle)", borderColor: "var(--crm-border)" }}
            >
              <div className="flex items-center gap-2 truncate">
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate font-medium" style={{ color: "var(--crm-text)" }}>PostgreSQL</span>
              </div>
              {stats?.systemStatus?.pgConnected ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 shrink-0 font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 shrink-0 font-medium text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Offline
                </span>
              )}
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border cursor-pointer disabled:opacity-50 hover:opacity-90"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
              <span>{loading ? "Sincronizando..." : "Sincronizar CRM"}</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Main content body wrapper */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        
        {/* Desktop Top Header Bar */}
        <header
          className="hidden md:flex items-center justify-between px-4 sm:px-5 md:px-6 xl:px-8 py-2.5 border-b sticky top-0 z-30 shrink-0 transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)"
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: "var(--crm-text-muted)" }}>Casa Colombo</span>
            <span style={{ color: "var(--crm-border-strong)" }}>/</span>
            <span className="font-semibold" style={{ color: "var(--crm-text)" }}>
              {activeTab === "dashboard" && "Dashboard Funil"}
              {activeTab === "agenda" && "Minha Agenda"}
              {activeTab === "kanban" && "Pipeline Comercial"}
              {activeTab === "leads" && "Lista de Leads"}
              {activeTab === "financial" && "Financeiro"}
              {activeTab === "broadcast" && "Ações & Broadcast"}
              {activeTab === "portals" && "Canais Originários"}
              {activeTab === "products" && "Catálogo de Produtos"}
              {activeTab === "workflow" && "Configurações Gerais"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Automation Status */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Automações Ativas</span>
            </div>

            <div className="h-4 w-px" style={{ backgroundColor: "var(--crm-border)" }} />

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer hover:opacity-90 shadow-2xs"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
              title={theme === "light" ? "Alternar para modo escuro" : "Alternar para modo claro"}
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Claro</span>
                </>
              )}
            </button>

            {/* Atualizar / Sincronizar Button */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer disabled:opacity-50 hover:opacity-90 shadow-2xs"
              style={{
                backgroundColor: "var(--crm-surface-subtle)",
                borderColor: "var(--crm-border)",
                color: "var(--crm-text-secondary)"
              }}
              title="Sincronizar CRM com PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </header>

        {/* Main Content Scroll container */}
        <main className="flex-1 w-full px-4 sm:px-5 md:px-6 xl:px-8 py-4 sm:py-5 lg:py-6 overflow-y-auto flex flex-col justify-start">
          
          {stats && stats.systemStatus && stats.systemStatus.pgConnected === false && (
            <div id="pg-offline-alert" className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-start gap-3 text-xs leading-relaxed animate-fade-in">
              <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-300">Banco de Dados PostgreSQL Desconectado ou Não Autenticado</p>
                <p className="mt-1 text-amber-200/80">
                  O servidor não conseguiu autenticar no banco PostgreSQL (verifique se o usuário e senha em <code className="bg-amber-900/40 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-100">DATABASE_URL</code> nas configurações do ambiente estão corretos).
                </p>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 transition shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reconectar
              </button>
            </div>
          )}

          {loading && leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-[400px]">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-zinc-500 text-sm font-medium">Sincronizando banco de dados...</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-6">
              
              {activeTab === "dashboard" && (
                <Dashboard 
                  stats={stats} 
                  leads={leads}
                  onRunAutomation={handleRunAutomation} 
                  onRefresh={fetchData} 
                  onSelectNegociacao={() => {
                    setShowNegociacaoOnly(true);
                    setActiveTab("leads");
                  }}
                  onGoToAgenda={() => setActiveTab("agenda")}
                />
              )}

              {activeTab === "agenda" && (
                <MinhaAgenda
                  leads={leads}
                  onSelectLead={setSelectedLeadId}
                  onUpdateLead={handleUpdateLead}
                  onRefresh={fetchData}
                />
              )}

              {activeTab === "kanban" && (
                <KanbanBoard
                  leads={leads}
                  onSelectLead={setSelectedLeadId}
                  onUpdateLead={handleUpdateLead}
                  onRefresh={fetchData}
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
                  initialNegociacaoOnly={showNegociacaoOnly}
                  onClearNegociacaoOnly={() => setShowNegociacaoOnly(false)}
                />
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
                  onDelete={handleDeletePortal}
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
        <footer
          className="border-t px-4 sm:px-5 md:px-6 xl:px-8 py-3.5 text-[11px] shrink-0 w-full mt-auto transition-colors"
          style={{
            backgroundColor: "var(--crm-surface)",
            borderColor: "var(--crm-border)",
            color: "var(--crm-text-muted)"
          }}
        >
          <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span>Casa Colombo CRM Comercial • Todos os direitos reservados.</span>
            <span>Sincronizado via Automação V2 • PostgreSQL</span>
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
