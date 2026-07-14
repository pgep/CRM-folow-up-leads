/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import net from "net";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import pg from "pg";
import { Jimp } from "jimp";
const { Pool } = pg;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Gemini GenAI initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini GenAI:", err);
  }
}

// Supabase client initialization with graceful checks
const supabaseUrl = process.env.SUPABASE_URL || "https://wkwhhkdpwmmtnuxroagz.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_DvNDiZbbc0hD8CobJ3pAWQ_TmOcRXcF";
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || "sb_secret_Yl9jOdZsh6QvJFZEcFcMeA_I_ktTlvZ";

let supabase: any = null;
let useSupabase = false;

if (supabaseUrl && supabaseServiceKey && !supabaseServiceKey.includes("sb_secret_Yl9jOdZsh6QvJFZEcFcMeA_I_ktTlvZ")) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    useSupabase = true;
    console.log("Supabase Client initialized using provided custom keys.");
  } catch (err) {
    console.error("Failed to initialize Supabase:", err);
  }
} else {
  console.log("Using local JSON-file database fallback (Supabase credentials missing or set to placeholder).");
}

// Local Database File Fallback
const DB_FILE = path.join(process.cwd(), "database.json");

// PostgreSQL client initialization with dotenv
const databaseUrl = process.env.DATABASE_URL;
let pgPool: any = null;
let usePg = false;

if (databaseUrl) {
  try {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("supabase.co") || databaseUrl.includes("render.com") || databaseUrl.includes("elephantsql.com") || databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
    usePg = true;
    console.log("PostgreSQL Pool initialized using DATABASE_URL.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL:", err);
  }
} else {
  console.log("No DATABASE_URL found. PostgreSQL is disabled.");
}

// Default workflow configuration based on the n8n follow-up logic
const defaultWorkflowConfig = [
  {
    etapa: "SEM_CONTATO",
    descricao: "Lead recém importado",
    canal: "WHATSAPP",
    template_name: "WHATSAPP_BOAS_VINDAS",
    esperar_dias: 1,
    proxima_etapa: "WHATSAPP_ENVIADO",
    proximo_status: "PRIMEIRO_CONTATO",
    temperatura: "FRIA",
    mensagem_template: "Olá {{nome}}! Obrigado pelo seu contato com a Casa Colombo Artesanal. Recebemos sua solicitação e em breve enviaremos uma proposta personalizada para o seu casamento. Se desejar conhecer alguns trabalhos, acesse casacolomboartesanal.com.br. Será um prazer fazer parte desse momento especial.",
    assunto_template: null,
    ordem: 1
  },
  {
    etapa: "WHATSAPP_ENVIADO",
    descricao: "WhatsApp enviado",
    canal: "EMAIL",
    template_name: "EMAIL_FOLLOWUP_1",
    esperar_dias: 4,
    proxima_etapa: "EMAIL_FOLLOWUP_1",
    proximo_status: "FOLLOWUP1",
    temperatura: "MORNA",
    mensagem_template: "<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Retomando seu atendimento sobre as lembrancinhas do seu casamento{{complementoMesCasamento}}.</p><p>Se quiser, posso te indicar as opções mais adequadas para o seu perfil de evento e quantidade de convidados, de forma bem objetiva.</p><p>Basta responder este e-mail ou falar com a gente no WhatsApp.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>",
    assunto_template: "Separei novas opções para o seu casamento - {{nome}}",
    ordem: 2
  },
  {
    etapa: "EMAIL_FOLLOWUP_1",
    descricao: "Primeiro e-mail enviado",
    canal: "WHATSAPP",
    template_name: "WHATSAPP_FOLLOWUP_2",
    esperar_dias: 4,
    proxima_etapa: "WHATSAPP_FOLLOWUP_2",
    proximo_status: "FOLLOWUP2",
    temperatura: "MORNA",
    mensagem_template: "Olá {{nome}}! Passando para saber se ainda podemos ajudá-la com as lembranças do seu casamento. Se quiser, posso te orientar nas opções mais adequadas para o seu evento e quantidade de convidados.",
    assunto_template: null,
    ordem: 3
  },
  {
    etapa: "WHATSAPP_FOLLOWUP_2",
    descricao: "Segundo WhatsApp",
    canal: "EMAIL",
    template_name: "EMAIL_FOLLOWUP_2",
    esperar_dias: 7,
    proxima_etapa: "EMAIL_FOLLOWUP_2",
    proximo_status: "FOLLOWUP3",
    temperatura: "MORNA",
    mensagem_template: "<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Esse é mais um retorno para não deixar seu pedido sem resposta.</p><p>Se ainda estiver buscando lembrancinhas para o casamento{{complementoMesCasamento}}, teremos prazer em te atender e montar uma sugestão alinhada ao seu evento.</p><p>Se preferir, basta responder este e-mail with sua dúvida.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>",
    assunto_template: "Ainda posso te ajudar com as lembranças do casamento - {{nome}}",
    ordem: 4
  },
  {
    etapa: "EMAIL_FOLLOWUP_2",
    descricao: "Segundo e-mail",
    canal: "EMAIL",
    template_name: "EMAIL_FINAL",
    esperar_dias: 14,
    proxima_etapa: "EMAIL_FINAL",
    proximo_status: "FOLLOWUPFINAL",
    temperatura: "QUENTE",
    mensagem_template: "<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Esse é um último retorno para não deixar seu pedido sem resposta.</p><p>Se ainda estiver buscando lembrancinhas para o seu casamento, teremos prazer em te atender.</p><p>Se desejar, basta responder este e-mail.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>",
    assunto_template: "Último retorno sobre seu atendimento - {{nome}}",
    ordem: 5
  },
  {
    etapa: "EMAIL_FINAL",
    descricao: "Última tentativa",
    canal: null,
    template_name: null,
    esperar_dias: 0,
    proxima_etapa: "ENCERRADO",
    proximo_status: "SEM_RETORNO",
    temperatura: "FRIA",
    mensagem_template: null,
    assunto_template: null,
    ordem: 6
  },
  {
    etapa: "ENCERRADO",
    descricao: "Fluxo encerrado",
    canal: null,
    template_name: null,
    esperar_dias: 0,
    proxima_etapa: "ENCERRADO",
    proximo_status: "ENCERRADO",
    temperatura: "FRIA",
    mensagem_template: null,
    assunto_template: null,
    ordem: 7
  }
];

const defaultPortalConfig = [
  { id: "portal_noivas", nome: "Portal Noivas", ativo: true },
  { id: "casamentos_com", nome: "Casamentos.com.br", ativo: true },
  { id: "zankyou", nome: "Zankyou", ativo: true },
  { id: "site_direto", nome: "Formulário Site Direto", ativo: true }
];

const defaultProducts = [
  { id: "vela_vidro", descricao: "Vela Aromática Premium em Pote de Vidro 100g", valor_unitario: 13.90, link_imagem: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=300" },
  { id: "mini_vela", descricao: "Mini Vela Aromática em Latinha de Alumínio 40g", valor_unitario: 8.50, link_imagem: "https://images.unsplash.com/photo-1596435707241-797cf4268944?auto=format&fit=crop&q=80&w=300" },
  { id: "home_spray", descricao: "Home Spray Aromático em Frasco de Vidro 50ml", valor_unitario: 11.50, link_imagem: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=300" }
];

function initLocalDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      leads: [],
      workflow_config: defaultWorkflowConfig,
      portal_config: defaultPortalConfig,
      products: defaultProducts,
      lead_history: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  } else {
    // Validate database format has all root keys
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      let updated = false;
      if (!data.leads) { data.leads = []; updated = true; }
      if (!data.workflow_config || data.workflow_config.length === 0) { data.workflow_config = defaultWorkflowConfig; updated = true; }
      if (!data.portal_config || data.portal_config.length === 0) { data.portal_config = defaultPortalConfig; updated = true; }
      if (!data.products || data.products.length === 0) { data.products = defaultProducts; updated = true; }
      if (!data.lead_history) { data.lead_history = []; updated = true; }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch (e) {
      // Recreate if corrupted
      const defaultData = {
        leads: [],
        workflow_config: defaultWorkflowConfig,
        portal_config: defaultPortalConfig,
        products: defaultProducts,
        lead_history: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    }
  }
}

initLocalDatabase();

async function initPgDatabase() {
  if (!usePg || !pgPool) return;
  try {
    const client = await pgPool.connect();
    try {
      // 1. Leads Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS leads (
          id VARCHAR(255) PRIMARY KEY,
          nome VARCHAR(255),
          email VARCHAR(255),
          link_celular VARCHAR(255),
          telefone_limpo VARCHAR(255),
          data_casamento VARCHAR(255),
          mes_casamento VARCHAR(255),
          local VARCHAR(255),
          servicos VARCHAR(255),
          convidados INTEGER,
          soma1 VARCHAR(255),
          soma2 VARCHAR(255),
          soma3 VARCHAR(255),
          soma4 VARCHAR(255),
          soma5 VARCHAR(255),
          status_funil VARCHAR(255),
          etapa_contato VARCHAR(255),
          temperatura VARCHAR(255),
          tentativas_email INTEGER DEFAULT 0,
          tentativas_whatsapp INTEGER DEFAULT 0,
          observacoes TEXT,
          motivo_perda VARCHAR(255),
          origem_portal VARCHAR(255),
          ultimo_email_em VARCHAR(255),
          ultimo_whatsapp_em VARCHAR(255),
          ultima_interacao_em VARCHAR(255),
          proxima_acao_em VARCHAR(255),
          created_at VARCHAR(255),
          updated_at VARCHAR(255)
        );
      `);

      // 2. Workflow Config Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS workflow_config (
          etapa VARCHAR(255) PRIMARY KEY,
          descricao VARCHAR(255),
          canal VARCHAR(50),
          esperar_dias INTEGER DEFAULT 0,
          proximo_status VARCHAR(255),
          temperatura VARCHAR(255),
          mensagem_template TEXT,
          assunto_template VARCHAR(255),
          imagens_template TEXT,
          ordem INTEGER DEFAULT 0
        );
      `);
      await client.query(`
        ALTER TABLE workflow_config ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
      `);
      await client.query(`
        ALTER TABLE workflow_config ADD COLUMN IF NOT EXISTS imagens_template TEXT;
      `);

      // 3. Portal Config Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS portal_config (
          id VARCHAR(255) PRIMARY KEY,
          nome VARCHAR(255),
          automacao_ativa BOOLEAN DEFAULT TRUE,
          prefixo_filtro VARCHAR(255),
          canal_preferencial VARCHAR(50)
        );
      `);

      // 4. Lead History Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS lead_history (
          id VARCHAR(255) PRIMARY KEY,
          lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
          canal VARCHAR(255),
          tipo VARCHAR(255),
          titulo VARCHAR(255),
          detalhes TEXT,
          created_at VARCHAR(255)
        );
      `);

      // 5. General Settings Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS general_settings (
          id INTEGER PRIMARY KEY,
          settings JSONB
        );
      `);

      // 6. Products Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(255) PRIMARY KEY,
          descricao TEXT,
          valor_unitario NUMERIC(10,2) DEFAULT 0.00,
          link_imagem TEXT,
          created_at VARCHAR(255)
        );
      `);

      // Seed workflow_config if empty
      const configCheck = await client.query("SELECT COUNT(*) FROM workflow_config");
      if (parseInt(configCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default workflow configs to PostgreSQL...");
        for (const stage of defaultWorkflowConfig) {
          await client.query(`
            INSERT INTO workflow_config (etapa, descricao, canal, esperar_dias, proximo_status, temperatura, mensagem_template, assunto_template, ordem)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            stage.etapa,
            stage.descricao,
            stage.canal,
            stage.esperar_dias,
            stage.proximo_status,
            stage.temperatura,
            stage.mensagem_template,
            stage.assunto_template,
            stage.ordem
          ]);
        }
      }

      // Seed portal_config if empty
      const portalCheck = await client.query("SELECT COUNT(*) FROM portal_config");
      if (parseInt(portalCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default portal configs to PostgreSQL...");
        for (const portal of defaultPortalConfig) {
          await client.query(`
            INSERT INTO portal_config (id, nome, automacao_ativa, prefixo_filtro, canal_preferencial)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            portal.id,
            portal.nome,
            true,
            "",
            ""
          ]);
        }
      }

      // Seed products if empty
      const productsCheck = await client.query("SELECT COUNT(*) FROM products");
      if (parseInt(productsCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default products to PostgreSQL...");
        for (const prod of defaultProducts) {
          await client.query(`
            INSERT INTO products (id, descricao, valor_unitario, link_imagem, created_at)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            prod.id,
            prod.descricao,
            prod.valor_unitario,
            prod.link_imagem,
            new Date().toISOString()
          ]);
        }
      }

      console.log("PostgreSQL tables checked/created successfully!");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error initializing PostgreSQL schema:", err);
    usePg = false;
    console.log("PostgreSQL initialization failed. Gracefully falling back to other database providers.");
  }
}

initPgDatabase();

function parseWeddingDateGlobal(dateStr?: string): Date | null {
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
}

// Database Helper methods that abstract Supabase vs. Local JSON
async function getLeads(): Promise<any[]> {
  let list: any[] = [];
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM leads ORDER BY created_at DESC");
      list = res.rows;
    } catch (e: any) {
      console.warn("PostgreSQL leads fetch failed:", e.message);
    }
  } else if (useSupabase) {
    try {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        list = data;
      } else {
        console.warn("Supabase lead fetch error (checking if table exists):", error?.message);
      }
    } catch (e: any) {
      console.warn("Supabase fetch failed, falling back to local file:", e.message);
    }
  }

  if (list.length === 0) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      list = db.leads || [];
    } catch (e) {
      list = [];
    }
  }

  // Filter out any lead with a wedding date in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return list.filter((l) => {
    if (!l.data_casamento) return true; // Keep if no wedding date specified
    const wDate = parseWeddingDateGlobal(l.data_casamento);
    if (!wDate) return true; // Keep if invalid date format
    return wDate >= today; // Keep only if wedding is today or in the future
  });
}

async function getLeadById(id: string): Promise<any | null> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM leads WHERE id = $1", [id]);
      if (res.rows.length > 0) return res.rows[0];
      return null;
    } catch (e: any) {
      console.warn("PostgreSQL lead fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return db.leads.find((l: any) => l.id === id) || null;
}

async function saveLead(lead: any, isNew: boolean = false): Promise<any> {
  lead.updated_at = new Date().toISOString();
  if (isNew) {
    lead.created_at = lead.created_at || new Date().toISOString();
  }

  if (usePg && pgPool) {
    try {
      if (isNew) {
        const query = `
          INSERT INTO leads (
            id, nome, email, link_celular, telefone_limpo, data_casamento, mes_casamento, local, servicos, convidados,
            soma1, soma2, soma3, soma4, soma5, status_funil, etapa_contato, temperatura, tentativas_email, tentativas_whatsapp,
            observacoes, motivo_perda, origem_portal, ultimo_email_em, ultimo_whatsapp_em, ultima_interacao_em, proxima_acao_em,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
          RETURNING *
        `;
        const values = [
          lead.id, lead.nome, lead.email, lead.link_celular, lead.telefone_limpo, lead.data_casamento, lead.mes_casamento, lead.local, lead.servicos, lead.convidados,
          lead.soma1, lead.soma2, lead.soma3, lead.soma4, lead.soma5, lead.status_funil, lead.etapa_contato, lead.temperatura, lead.tentativas_email || 0, lead.tentativas_whatsapp || 0,
          lead.observacoes, lead.motivo_perda, lead.origem_portal, lead.ultimo_email_em, lead.ultimo_whatsapp_em, lead.ultima_interacao_em, lead.proxima_acao_em,
          lead.created_at, lead.updated_at
        ];
        const res = await pgPool.query(query, values);
        return res.rows[0];
      } else {
        const query = `
          UPDATE leads SET
            nome = $2, email = $3, link_celular = $4, telefone_limpo = $5, data_casamento = $6, mes_casamento = $7, local = $8,
            servicos = $9, convidados = $10, soma1 = $11, soma2 = $12, soma3 = $13, soma4 = $14, soma5 = $15,
            status_funil = $16, etapa_contato = $17, temperatura = $18, tentativas_email = $19, tentativas_whatsapp = $20,
            observacoes = $21, motivo_perda = $22, origem_portal = $23, ultimo_email_em = $24, ultimo_whatsapp_em = $25,
            ultima_interacao_em = $26, proxima_acao_em = $27, updated_at = $28
          WHERE id = $1
          RETURNING *
        `;
        const values = [
          lead.id, lead.nome, lead.email, lead.link_celular, lead.telefone_limpo, lead.data_casamento, lead.mes_casamento, lead.local,
          lead.servicos, lead.convidados, lead.soma1, lead.soma2, lead.soma3, lead.soma4, lead.soma5,
          lead.status_funil, lead.etapa_contato, lead.temperatura, lead.tentativas_email || 0, lead.tentativas_whatsapp || 0,
          lead.observacoes, lead.motivo_perda, lead.origem_portal, lead.ultimo_email_em, lead.ultimo_whatsapp_em,
          lead.ultima_interacao_em, lead.proxima_acao_em, lead.updated_at
        ];
        const res = await pgPool.query(query, values);
        return res.rows[0];
      }
    } catch (e: any) {
      console.warn("PostgreSQL lead save failed:", e.message);
    }
  }

  if (useSupabase) {
    try {
      let result;
      if (isNew) {
        result = await supabase.from("leads").insert(lead).select().single();
      } else {
        result = await supabase.from("leads").update(lead).eq("id", lead.id).select().single();
      }
      if (!result.error && result.data) {
        return result.data;
      }
      console.warn("Supabase lead save failed (reverting to local JSON):", result.error?.message);
    } catch (e: any) {
      console.warn("Supabase insert/update exception, saving locally:", e.message);
    }
  }

  // Local Save
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (isNew) {
    db.leads.unshift(lead);
  } else {
    const idx = db.leads.findIndex((l: any) => l.id === lead.id);
    if (idx !== -1) {
      db.leads[idx] = { ...db.leads[idx], ...lead };
    } else {
      db.leads.unshift(lead); // fallback
    }
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return lead;
}

async function deleteLeadById(id: string): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query("DELETE FROM lead_history WHERE lead_id = $1", [id]);
      await pgPool.query("DELETE FROM leads WHERE id = $1", [id]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL lead delete failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  const lengthBefore = db.leads.length;
  db.leads = db.leads.filter((l: any) => l.id !== id);
  db.lead_history = db.lead_history.filter((h: any) => h.lead_id !== id);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return db.leads.length < lengthBefore;
}

async function getWorkflowConfigs(): Promise<any[]> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM workflow_config ORDER BY ordem ASC");
      return res.rows;
    } catch (e: any) {
      console.warn("PostgreSQL workflow config fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("workflow_config").select("*").order("ordem", { ascending: true });
      if (!error && data && data.length > 0) return data;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  const configs = db.workflow_config || [];
  return configs.sort((a: any, b: any) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
}

async function saveWorkflowConfigs(configs: any[]): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      for (const stage of configs) {
        await pgPool.query(`
          INSERT INTO workflow_config (etapa, descricao, canal, esperar_dias, proximo_status, temperatura, mensagem_template, assunto_template, imagens_template, ordem)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (etapa) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            canal = EXCLUDED.canal,
            esperar_dias = EXCLUDED.esperar_dias,
            proximo_status = EXCLUDED.proximo_status,
            temperatura = EXCLUDED.temperatura,
            mensagem_template = EXCLUDED.mensagem_template,
            assunto_template = EXCLUDED.assunto_template,
            imagens_template = EXCLUDED.imagens_template,
            ordem = EXCLUDED.ordem
        `, [
          stage.etapa,
          stage.descricao,
          stage.canal,
          stage.esperar_dias,
          stage.proximo_status,
          stage.temperatura,
          stage.mensagem_template,
          stage.assunto_template,
          stage.imagens_template,
          stage.ordem || 0
        ]);
      }
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL workflow config save failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      // Upsert in Supabase
      const { error } = await supabase.from("workflow_config").upsert(configs);
      if (!error) return true;
      console.warn("Supabase workflow upsert failed:", error?.message);
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  db.workflow_config = configs;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

async function getPortalConfigs(): Promise<any[]> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM portal_config");
      return res.rows.map(row => ({
        ...row,
        ativo: row.automacao_ativa ?? true
      }));
    } catch (e: any) {
      console.warn("PostgreSQL portal config fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("portal_config").select("*");
      if (!error && data && data.length > 0) {
        return data.map(row => ({
          ...row,
          ativo: row.automacao_ativa ?? row.ativo ?? true
        }));
      }
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.portal_config || []).map((p: any) => ({
    ...p,
    ativo: p.ativo ?? true
  }));
}

async function savePortalConfigs(configs: any[]): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      for (const p of configs) {
        const activeVal = p.ativo ?? p.automacao_ativa ?? true;
        await pgPool.query(`
          INSERT INTO portal_config (id, nome, automacao_ativa, prefixo_filtro, canal_preferencial)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            automacao_ativa = EXCLUDED.automacao_ativa,
            prefixo_filtro = EXCLUDED.prefixo_filtro,
            canal_preferencial = EXCLUDED.canal_preferencial
        `, [
          p.id,
          p.nome,
          activeVal,
          p.prefixo_filtro ?? null,
          p.canal_preferencial ?? null
        ]);
      }
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL portal config save failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const mapped = configs.map(p => ({
        ...p,
        automacao_ativa: p.ativo ?? p.automacao_ativa ?? true,
        ativo: p.ativo ?? p.automacao_ativa ?? true
      }));
      const { error } = await supabase.from("portal_config").upsert(mapped);
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  db.portal_config = configs.map(p => ({
    ...p,
    ativo: p.ativo ?? p.automacao_ativa ?? true
  }));
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

async function getProducts(): Promise<any[]> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM products ORDER BY id ASC");
      return res.rows.map(row => ({
        ...row,
        valor_unitario: Number(row.valor_unitario)
      }));
    } catch (e: any) {
      console.warn("PostgreSQL products fetch failed, attempting schema fallback:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("products").select("*").order("id", { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(p => ({
          ...p,
          valor_unitario: Number(p.valor_unitario)
        }));
      }
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.products || defaultProducts).map((p: any) => ({
    ...p,
    valor_unitario: Number(p.valor_unitario)
  }));
}

async function saveProduct(p: any): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO products (id, descricao, valor_unitario, link_imagem, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          descricao = EXCLUDED.descricao,
          valor_unitario = EXCLUDED.valor_unitario,
          link_imagem = EXCLUDED.link_imagem
      `, [
        p.id,
        p.descricao,
        p.valor_unitario,
        p.link_imagem,
        new Date().toISOString()
      ]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL product save failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("products").upsert({
        id: p.id,
        descricao: p.descricao,
        valor_unitario: Number(p.valor_unitario),
        link_imagem: p.link_imagem,
        created_at: new Date().toISOString()
      });
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.products) db.products = [];
  const idx = db.products.findIndex((item: any) => item.id === p.id);
  if (idx >= 0) {
    db.products[idx] = { ...db.products[idx], ...p };
  } else {
    db.products.push(p);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

async function deleteProduct(id: string): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query("DELETE FROM products WHERE id = $1", [id]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL product delete failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (db.products) {
    db.products = db.products.filter((p: any) => p.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  }
  return true;
}

async function getLeadHistory(leadId: string): Promise<any[]> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM lead_history WHERE lead_id = $1 ORDER BY created_at DESC", [leadId]);
      return res.rows;
    } catch (e: any) {
      console.warn("PostgreSQL lead history fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("lead_history").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return db.lead_history.filter((h: any) => h.lead_id === leadId).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

async function addHistoryEntry(leadId: string, entry: { canal: string; tipo: string; titulo: string; detalhes?: string }): Promise<any> {
  const newEntry = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    lead_id: leadId,
    canal: entry.canal,
    tipo: entry.tipo,
    titulo: entry.titulo,
    detalhes: entry.detalhes,
    created_at: new Date().toISOString()
  };

  if (usePg && pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO lead_history (id, lead_id, canal, tipo, titulo, detalhes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [newEntry.id, newEntry.lead_id, newEntry.canal, newEntry.tipo, newEntry.titulo, newEntry.detalhes, newEntry.created_at]);
      return newEntry;
    } catch (e: any) {
      console.warn("PostgreSQL add history failed:", e.message);
    }
  }

  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("lead_history").insert({ ...newEntry, id: undefined }).select().single();
      if (!error && data) return data;
    } catch (e) {}
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  db.lead_history.unshift(newEntry);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return newEntry;
}

// Settings Helpers
async function getGeneralSettings(): Promise<any> {
  let settings: any = null;
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT settings FROM general_settings WHERE id = 1");
      if (res.rows.length > 0) {
        settings = res.rows[0].settings;
      }
    } catch (e: any) {
      console.warn("PostgreSQL get general settings failed:", e.message);
    }
  }
  if (!settings && useSupabase) {
    try {
      const { data, error } = await supabase.from("general_settings").select("*").maybeSingle();
      if (!error && data) {
        settings = data.settings;
      }
    } catch (e) {}
  }
  if (!settings) {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.general_settings) {
      db.general_settings = {
        zoho_mail: {
          smtp_host: "smtp.zoho.com",
          smtp_port: 465,
          user: "contato@casacolomboartesanal.com.br",
          pass: "",
          from_name: "Luciana - Casa Colombo",
          use_ssl: true
        },
        waha_whatsapp: {
          api_url: "http://localhost:3000",
          api_key: "",
          session_name: "default",
          delay_seconds: 5
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    settings = db.general_settings;
  }

  // Ensure dynamic options lists are initialized
  let updated = false;
  if (!settings.etapas_contato || !Array.isArray(settings.etapas_contato)) {
    settings.etapas_contato = [
      "Sem Contato",
      "Orçamento Enviado",
      "WhatsApp Enviado",
      "E-mail Follow-up 1",
      "WhatsApp Follow-up 2",
      "E-mail Follow-up 2",
      "E-mail Final",
      "Encerrado"
    ];
    updated = true;
  }
  if (!settings.status_funil || !Array.isArray(settings.status_funil)) {
    settings.status_funil = [
      "Primeiro Contato",
      "Follow-up 1",
      "Follow-up 2",
      "Follow-up 3",
      "Follow-up Final",
      "Respondido",
      "Fechou (Convertido)",
      "Perdido",
      "Sem Retorno / Encerrado"
    ];
    updated = true;
  }
  if (!settings.temperaturas || !Array.isArray(settings.temperaturas)) {
    settings.temperaturas = [
      "Fria",
      "Morna",
      "Quente",
      "Cliente"
    ];
    updated = true;
  }

  if (updated) {
    await saveGeneralSettings(settings);
  }

  return settings;
}

async function saveGeneralSettings(settings: any): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO general_settings (id, settings)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings
      `, [JSON.stringify(settings)]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL save general settings failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("general_settings").upsert({ id: 1, settings });
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  db.general_settings = settings;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

// Real Dispatch Helpers (using the stored Zoho & WAHA configurations)
async function dispatchEmailMessage(toEmail: string, subject: string, bodyHtml: string, customConfig?: any): Promise<{ success: boolean; log: string }> {
  try {
    const settings = customConfig || await getGeneralSettings();
    if (!settings || !settings.zoho_mail) {
      return { success: false, log: "Configurações de E-mail não encontradas no banco." };
    }

    const mailConf = settings.zoho_mail;
    if (!mailConf.user) {
      return { success: false, log: "Remetente de E-mail (user) não configurado." };
    }

    if (!mailConf.pass) {
      return { 
        success: true, 
        log: `[SIMULAÇÃO] Envio para ${toEmail} simulado (senha SMTP não cadastrada).` 
      };
    }

    const transporter = nodemailer.createTransport({
      host: mailConf.smtp_host || "smtp.zoho.com",
      port: Number(mailConf.smtp_port) || 465,
      secure: mailConf.use_ssl || Number(mailConf.smtp_port) === 465,
      auth: {
        user: mailConf.user,
        pass: mailConf.pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000
    });

    await transporter.sendMail({
      from: `"${mailConf.from_name || 'CRM Casa Colombo'}" <${mailConf.user}>`,
      to: toEmail,
      subject: subject,
      html: bodyHtml,
    });

    return { 
      success: true, 
      log: `[SUCESSO SMTP] E-mail enviado com sucesso via ${mailConf.smtp_host} para ${toEmail}.` 
    };
  } catch (err: any) {
    console.error("Erro ao disparar SMTP real:", err.message);
    return { 
      success: false, 
      log: `[FALHA SMTP] Erro de rede/autenticação ao enviar para ${toEmail}: ${err.message}` 
    };
  }
}

async function dispatchWhatsAppMessage(phone: string, message: string, customConfig?: any): Promise<{ success: boolean; log: string }> {
  try {
    const settings = customConfig || await getGeneralSettings();
    if (!settings || !settings.waha_whatsapp) {
      return { success: false, log: "Configurações do WAHA não encontradas no banco." };
    }

    const wahaConf = settings.waha_whatsapp;
    if (!wahaConf.api_url) {
      return { success: false, log: "URL da API do WAHA não configurada." };
    }

    // Clean phone number
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, log: "Telefone do lead está vazio ou inválido." };
    }

    // Add Brazilian country code if missing
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = "55" + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;
    const apiUrl = `${wahaConf.api_url}/api/sendText`;
    const session = wahaConf.session_name || "default";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (wahaConf.api_key) {
      headers["X-Api-Key"] = wahaConf.api_key;
    }

    const body = {
      chatId,
      text: message,
      session
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(6000) : undefined
    });

    if (res.ok) {
      return { 
        success: true, 
        log: `[SUCESSO WAHA] Mensagem de WhatsApp enviada com sucesso para ${chatId}!` 
      };
    } else {
      const responseText = await res.text().catch(() => "");
      return { 
        success: false, 
        log: `[FALHA WAHA] O gateway WAHA retornou status HTTP ${res.status}. Detalhes: ${responseText || "Sem detalhes"}` 
      };
    }
  } catch (err: any) {
    console.error("Erro ao disparar WAHA real:", err.message);
    return { 
      success: false, 
      log: `[FALHA WAHA] Erro ao conectar ao gateway em ${phone}: ${err.message}` 
    };
  }
}

async function prepareImageForWaha(imageUrl: string): Promise<{ mimetype: string; filename: string; data: string } | null> {
  try {
    console.log(`[WAHA IMAGE PREP] Baixando imagem de: ${imageUrl}`);
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Falha ao baixar imagem, HTTP status: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get content type from headers
    let contentType = res.headers.get("content-type") || "";
    console.log(`[WAHA IMAGE PREP] Content-Type original: ${contentType}`);

    // Clean up content type (remove charsets, etc.)
    contentType = contentType.split(";")[0].trim().toLowerCase();

    // Determine filename
    let ext = "jpg";
    if (contentType === "image/png") ext = "png";
    else if (contentType === "image/gif") ext = "gif";
    else if (contentType === "image/webp") ext = "webp";
    
    // Extract filename from URL or build one
    let filename = "image." + ext;
    try {
      const urlPath = new URL(imageUrl).pathname;
      const base = urlPath.substring(urlPath.lastIndexOf("/") + 1);
      if (base && base.includes(".")) {
        filename = base;
      }
    } catch (_) {}

    // Check if it's already a standard format that WAHA/WhatsApp accepts directly
    if (contentType === "image/jpeg" || contentType === "image/jpg" || contentType === "image/png") {
      console.log(`[WAHA IMAGE PREP] Imagem já em formato compatível (${contentType}). Convertendo para Base64 direto.`);
      return {
        mimetype: contentType === "image/jpg" ? "image/jpeg" : contentType,
        filename,
        data: buffer.toString("base64")
      };
    }

    // Otherwise, convert it using Jimp to a clean image/jpeg
    console.log(`[WAHA IMAGE PREP] Convertendo imagem via Jimp para image/jpeg...`);
    const image = await Jimp.read(buffer);
    const convertedBuffer = await image.getBuffer("image/jpeg");
    
    // Change filename extension to .jpg
    const baseName = filename.substring(0, filename.lastIndexOf(".")) || "image";
    filename = baseName + ".jpg";

    return {
      mimetype: "image/jpeg",
      filename,
      data: convertedBuffer.toString("base64")
    };
  } catch (err: any) {
    console.error(`[WAHA IMAGE PREP] Erro ao preparar imagem ${imageUrl}:`, err.message);
    return null;
  }
}

async function dispatchWhatsAppImage(phone: string, imagePayload: { mimetype: string; filename: string; data: string }, caption?: string, customConfig?: any): Promise<{ success: boolean; log: string }> {
  try {
    const settings = customConfig || await getGeneralSettings();
    if (!settings || !settings.waha_whatsapp) {
      return { success: false, log: "Configurações do WAHA não encontradas no banco." };
    }

    const wahaConf = settings.waha_whatsapp;
    if (!wahaConf.api_url) {
      return { success: false, log: "URL da API do WAHA não configurada." };
    }

    // Clean phone number
    let cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, log: "Telefone do lead está vazio ou inválido." };
    }

    // Add Brazilian country code if missing
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = "55" + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;
    const apiUrl = `${wahaConf.api_url}/api/sendFile`;
    const session = wahaConf.session_name || "default";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (wahaConf.api_key) {
      headers["X-Api-Key"] = wahaConf.api_key;
    }

    const body = {
      chatId,
      file: {
        mimetype: imagePayload.mimetype,
        filename: imagePayload.filename,
        data: imagePayload.data
      },
      caption: caption || "",
      session
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(15000) : undefined
    });

    if (res.ok) {
      return { 
        success: true, 
        log: `[SUCESSO WAHA FILE] Imagem de WhatsApp enviada com sucesso para ${chatId}!` 
      };
    } else {
      const responseText = await res.text().catch(() => "");
      return { 
        success: false, 
        log: `[FALHA WAHA FILE] O gateway WAHA retornou status HTTP ${res.status}. Detalhes: ${responseText || "Sem detalhes"}` 
      };
    }
  } catch (err: any) {
    console.error("Erro ao disparar imagem WAHA real:", err.message);
    return { 
      success: false, 
      log: `[FALHA WAHA FILE] Erro ao conectar ao gateway em ${phone} para enviar imagem: ${err.message}` 
    };
  }
}

// -------------------------------------------------------------
// Zoho Noivas Email parsing & automated calculations
// -------------------------------------------------------------
function parseZohoEmailText(text: string): any {
  // Simple regex parsing following n8n Code Parser logic
  const limpo = text.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ");

  let nome = "Noiva";
  let dataCasamento = "";
  let email = "";
  let linkCelular = "";
  let local = "";
  let servicos = "";
  let convidados = 0;

  if (limpo) {
    nome = limpo.match(/Nome:\s*(.*?)\s*Data do Casamento:/i)?.[1]?.trim() || nome;
    dataCasamento = limpo.match(/Data do Casamento:\s*([\d\/]+)/i)?.[1]?.trim() || "";
    
    let emailRaw = limpo.match(/E-mail:\s*(.*?)\s*Celular:/i)?.[1] || "";
    email = emailRaw.replace(/mailto:/i, "").trim();

    linkCelular = limpo.match(/Celular:\s*(.*?)\s*Local do casamento:/i)?.[1]?.trim() || "";
    local = limpo.match(/Local do casamento:\s*(.*?)\s*Servi/i)?.[1]?.trim() || "";
    servicos = limpo.match(/Servi(?:ç|Ã§)os:\s*(.*?)\s*N(?:ú|Ãº)mero/i)?.[1]?.trim() || "";
    
    const convidadosRaw = limpo.match(/N(?:ú|Ãº)mero de Convidados:\s*(\d+)/i)?.[1];
    convidados = convidadosRaw ? parseInt(convidadosRaw, 10) : 0;
  }

  // Month extraction
  let mesCasamento = "breve";
  if (dataCasamento) {
    const partes = dataCasamento.split("/");
    if (partes.length === 3) {
      const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const indexMes = parseInt(partes[1], 10) - 1;
      if (indexMes >= 0 && indexMes < 12) {
        mesCasamento = meses[indexMes];
      }
    }
  }

  return {
    nome,
    dataCasamento,
    mesCasamento,
    email,
    linkCelular,
    local,
    servicos,
    convidados
  };
}

// Pricing table and formatter
const precoVelaVidro = 13.90;
const precoDifusor = 12.90;
const precoHomeSpray = 13.90;
const precoVelaBaby8 = 11.90;
const precoVelaBaby12 = 14.90;

const formatarBRL = (valor: number) => {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

function calcularOrcamentos(convidados: number) {
  const qtd = convidados || 0;
  return {
    soma1: formatarBRL(qtd * precoVelaVidro),
    soma2: formatarBRL(qtd * precoDifusor),
    soma3: formatarBRL(qtd * precoHomeSpray),
    soma4: formatarBRL(qtd * precoVelaBaby8),
    soma5: formatarBRL(qtd * precoVelaBaby12)
  };
}

async function compileTemplate(template: string, lead: any): Promise<string> {
  if (!template) return "";
  let text = template;
  
  const leadName = lead.nome || lead.name || "";
  const leadLocal = lead.local || "sua região";
  const leadServicos = lead.servicos || lead.services || "nossos produtos";
  const leadConvidados = String(lead.convidados || lead.guests || "100");
  const leadMes = lead.mes_casamento || lead.mesCasamento || lead.wedding_month || "breve";

  // Substituições básicas (suporta tanto {variavel} quanto {{variavel}})
  text = text
    .replace(/{{nome}}/g, leadName)
    .replace(/{nome}/g, leadName)
    .replace(/{{local}}/g, leadLocal)
    .replace(/{local}/g, leadLocal)
    .replace(/{{servicos}}/g, leadServicos)
    .replace(/{servicos}/g, leadServicos)
    .replace(/{{convidados}}/g, leadConvidados)
    .replace(/{convidados}/g, leadConvidados)
    .replace(/{{mes_casamento}}/g, leadMes)
    .replace(/{mes_casamento}/g, leadMes)
    .replace(/{{mesCasamento}}/g, leadMes)
    .replace(/{mesCasamento}/g, leadMes);

  // Substituições de produtos do banco
  try {
    const products = await getProducts();
    const guests = Number(lead.convidados) || 100;
    
    for (const prod of products) {
      const id = prod.id;
      const totalCalculado = guests * (Number(prod.valor_unitario) || 0);
      const valTotal = formatarBRL(totalCalculado);
      const valImg = prod.link_imagem || "";
      const valPrecoUnit = formatarBRL(Number(prod.valor_unitario) || 0);
      const valDesc = prod.descricao || "";
      
      text = text
        .replace(new RegExp(`{{orcamento_${id}}}`, "g"), valTotal)
        .replace(new RegExp(`{orcamento_${id}}`, "g"), valTotal)
        .replace(new RegExp(`{{imagem_${id}}}`, "g"), valImg)
        .replace(new RegExp(`{imagem_${id}}`, "g"), valImg)
        .replace(new RegExp(`{{preco_unitario_${id}}}`, "g"), valPrecoUnit)
        .replace(new RegExp(`{preco_unitario_${id}}`, "g"), valPrecoUnit)
        .replace(new RegExp(`{{descricao_${id}}}`, "g"), valDesc)
        .replace(new RegExp(`{descricao_${id}}`, "g"), valDesc);
    }
  } catch (err) {
    console.error("Erro ao processar variáveis de produtos no template:", err);
  }

  // Fallback para as variáveis legadas de soma
  text = text
    .replace(/{{soma1}}/g, lead.soma1 || "")
    .replace(/{soma1}/g, lead.soma1 || "")
    .replace(/{{soma2}}/g, lead.soma2 || "")
    .replace(/{soma2}/g, lead.soma2 || "")
    .replace(/{{soma3}}/g, lead.soma3 || "")
    .replace(/{soma3}/g, lead.soma3 || "")
    .replace(/{{soma4}}/g, lead.soma4 || "")
    .replace(/{soma4}/g, lead.soma4 || "")
    .replace(/{{soma5}}/g, lead.soma5 || "")
    .replace(/{soma5}/g, lead.soma5 || "");

  return text;
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// API - Leads List
app.get("/api/leads", async (req, res) => {
  try {
    const list = await getLeads();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Lead Detail
app.get("/api/leads/:id", async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Lead History (Timeline)
app.get("/api/leads/:id/history", async (req, res) => {
  try {
    const history = await getLeadHistory(req.params.id);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Manual Lead Creation
app.post("/api/leads", async (req, res) => {
  try {
    const { nome, email, link_celular, data_casamento, mes_casamento, local, servicos, convidados, origem_portal, observacoes } = req.body;
    
    if (!nome || !email) {
      return res.status(400).json({ error: "Nome e Email são obrigatórios" });
    }

    const leadId = `CRM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const orcamentos = calcularOrcamentos(Number(convidados || 0));

    const phoneDigits = (link_celular || "").replace(/\D/g, "");

    const newLead = {
      id: leadId,
      nome,
      email: email.trim().toLowerCase(),
      link_celular,
      telefone_limpo: phoneDigits,
      data_casamento,
      mes_casamento: mes_casamento || "breve",
      local,
      servicos,
      convidados: Number(convidados || 0),
      ...orcamentos,
      status_funil: "Primeiro Contato",
      etapa_contato: "SEM_CONTATO",
      temperatura: "Fria",
      tentativas_email: 0,
      tentativas_whatsapp: 0,
      observacoes,
      origem_portal: origem_portal || "Manual",
      ultima_interacao_em: new Date().toISOString(),
      proxima_acao_em: new Date().toISOString()
    };

    const saved = await saveLead(newLead, true);
    await addHistoryEntry(leadId, {
      canal: "SISTEMA",
      tipo: "IMPORT",
      titulo: "Lead Criado Manualmente",
      detalhes: `Lead registrado diretamente no CRM. Origem: ${origem_portal || "Manual"}`
    });

    res.status(201).json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Lead Update
app.put("/api/leads/:id", async (req, res) => {
  try {
    const existing = await getLeadById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Lead not found" });

    // Track status and stage changes for timeline logs
    const statusChanged = req.body.status_funil && req.body.status_funil !== existing.status_funil;
    const stageChanged = req.body.etapa_contato && req.body.etapa_contato !== existing.etapa_contato;

    // Recalculate budgets if guests count changed
    let budgetUpdates = {};
    if (req.body.convidados !== undefined && Number(req.body.convidados) !== Number(existing.convidados)) {
      budgetUpdates = calcularOrcamentos(Number(req.body.convidados));
    }

    const updatedLead = {
      ...existing,
      ...req.body,
      ...budgetUpdates,
      id: existing.id // protect ID from changing
    };

    if (req.body.link_celular !== undefined) {
      updatedLead.telefone_limpo = req.body.link_celular.replace(/\D/g, "");
    }

    const saved = await saveLead(updatedLead, false);

    // Timeline logging
    if (statusChanged) {
      await addHistoryEntry(existing.id, {
        canal: "SISTEMA",
        tipo: "STATUS_CHANGE",
        titulo: "Status Alterado",
        detalhes: `De "${existing.status_funil}" para "${req.body.status_funil}". Motivo/Obs: ${req.body.observacoes || "Alteração manual"}`
      });
    }
    if (stageChanged) {
      await addHistoryEntry(existing.id, {
        canal: "SISTEMA",
        tipo: "STATUS_CHANGE",
        titulo: "Etapa de Contato Alterada",
        detalhes: `De "${existing.etapa_contato}" para "${req.body.etapa_contato}".`
      });
    }

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Delete Lead
app.delete("/api/leads/:id", async (req, res) => {
  try {
    const success = await deleteLeadById(req.params.id);
    if (!success) return res.status(404).json({ error: "Lead not found" });
    res.json({ success: true, message: "Lead successfully deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Add Manual Notes to Lead
app.post("/api/leads/:id/notes", async (req, res) => {
  try {
    const { nota } = req.body;
    if (!nota) return res.status(400).json({ error: "Nota content is required" });

    const existing = await getLeadById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Lead not found" });

    const history = await addHistoryEntry(existing.id, {
      canal: "MANUAL",
      tipo: "NOTA_MANUAL",
      titulo: "Nota de Atendimento",
      detalhes: nota
    });

    // Also update lead's observations
    existing.observacoes = `${existing.observacoes || ""}\n[Nota ${new Date().toLocaleDateString("pt-BR")}]: ${nota}`.trim();
    existing.ultima_interacao_em = new Date().toISOString();
    await saveLead(existing, false);

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to substitute variables in templates
function substituteVariables(template: string, lead: any): string {
  if (!template) return "";
  let text = template;
  
  let diasRestantesStr = "N/A";
  if (lead.data_casamento) {
    try {
      let weddingDate: Date | null = null;
      if (lead.data_casamento.includes("/")) {
        const parts = lead.data_casamento.split("/");
        if (parts.length === 3) {
          weddingDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      } else {
        weddingDate = new Date(lead.data_casamento);
      }
      
      if (weddingDate && !isNaN(weddingDate.getTime())) {
        const diffTime = weddingDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        diasRestantesStr = String(diffDays);
      }
    } catch (e) {}
  }

  return text
    .replace(/\{nome\}/gi, lead.nome || "")
    .replace(/\{email\}/gi, lead.email || "")
    .replace(/\{local\}/gi, lead.local || "")
    .replace(/\{data_casamento\}/gi, lead.data_casamento || "")
    .replace(/\{mes_casamento\}/gi, lead.mes_casamento || "")
    .replace(/\{convidados\}/gi, String(lead.convidados || 0))
    .replace(/\{status\}/gi, lead.status_funil || "")
    .replace(/\{temperatura\}/gi, lead.temperatura || "")
    .replace(/\{dias_casamento\}/gi, diasRestantesStr);
}

// API - Send custom / special follow-up or broadcast message to Lead
app.post("/api/leads/:id/send-message", async (req, res) => {
  try {
    const { canal, mensagem, assunto, titulo_historico } = req.body;
    if (!canal || !mensagem) {
      return res.status(400).json({ error: "canal and mensagem are required" });
    }

    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Substitute variables
    const finalSubject = substituteVariables(assunto || "", lead);
    const finalBody = substituteVariables(mensagem, lead);

    let updatedLead = { ...lead };
    let dispatchStatus = "";

    if (canal === "WHATSAPP") {
      updatedLead.tentativas_whatsapp = (Number(lead.tentativas_whatsapp) || 0) + 1;
      updatedLead.ultimo_whatsapp_em = new Date().toISOString();
      
      const dispatchResult = await dispatchWhatsAppMessage(lead.link_celular, finalBody);
      dispatchStatus = dispatchResult.log;

      await addHistoryEntry(lead.id, {
        canal: "WHATSAPP",
        tipo: "ENVIO",
        titulo: titulo_historico || "Mensagem Especial WhatsApp",
        detalhes: `${finalBody}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchStatus}</small>`
      });
    } else if (canal === "EMAIL") {
      updatedLead.tentativas_email = (Number(lead.tentativas_email) || 0) + 1;
      updatedLead.ultimo_email_em = new Date().toISOString();
      
      const dispatchResult = await dispatchEmailMessage(lead.email, finalSubject, finalBody);
      dispatchStatus = dispatchResult.log;

      await addHistoryEntry(lead.id, {
        canal: "EMAIL",
        tipo: "ENVIO",
        titulo: titulo_historico || "Mensagem Especial E-mail",
        detalhes: `<b>Assunto:</b> ${finalSubject}<br/>${finalBody}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchStatus}</small>`
      });
    }

    updatedLead.ultima_interacao_em = new Date().toISOString();
    updatedLead.updated_at = new Date().toISOString();
    await saveLead(updatedLead, false);

    res.json({ success: true, lead: updatedLead });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Get Workflow Configuration
app.get("/api/workflow", async (req, res) => {
  try {
    const configs = await getWorkflowConfigs();
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Update Workflow Stage
app.put("/api/workflow", async (req, res) => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      await saveWorkflowConfigs(payload);
      return res.json({ success: true, message: "Workflow configs updated successfully" });
    }

    const updatedStage = payload; // Expects a complete WorkflowStage object
    if (!updatedStage || !updatedStage.etapa) {
      return res.status(400).json({ error: "Etapa is required in the payload" });
    }

    const currentConfigs = await getWorkflowConfigs();
    const idx = currentConfigs.findIndex((c) => c.etapa === updatedStage.etapa);
    if (idx !== -1) {
      currentConfigs[idx] = { ...currentConfigs[idx], ...updatedStage };
    } else {
      currentConfigs.push(updatedStage);
    }

    await saveWorkflowConfigs(currentConfigs);
    res.json({ success: true, stage: updatedStage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Reset Workflow Config to Default
app.post("/api/workflow/reset", async (req, res) => {
  try {
    await saveWorkflowConfigs(defaultWorkflowConfig);
    res.json({ success: true, message: "Workflow configs restored to default" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Get General Settings (Zoho & Waha)
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await getGeneralSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Save General Settings (Zoho & Waha)
app.post("/api/settings", async (req, res) => {
  try {
    const success = await saveGeneralSettings(req.body);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Test General Settings Connectivity
app.post("/api/settings/test-connection", async (req, res) => {
  const logs: string[] = [];
  function log(msg: string) {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    logs.push(`[${timestamp}] ${msg}`);
  }

  let success = true;

  try {
    const { action, lead_id, test_email_recipient, test_email_subject, test_email_body, test_whatsapp_recipient, test_whatsapp_body, test_whatsapp_images } = req.body;
    const config = req.body.config || req.body;

    let lead: any = null;
    if (lead_id) {
      const leads = await getLeads();
      lead = leads.find(l => String(l.id) === String(lead_id));
      if (lead) {
        log(`[TEST COMPILE] Lead encontrado: "${lead.nome}". Compilando tags de template...`);
      } else {
        log(`[TEST COMPILE] [AVISO] Lead ID "${lead_id}" não encontrado no banco.`);
      }
    } else {
      const leads = await getLeads();
      if (leads && leads.length > 0) {
        lead = leads[0];
        log(`[TEST COMPILE] Utilizando o lead "${lead.nome}" do banco de dados para compilar as tags do modelo de teste.`);
      } else {
        lead = {
          id: "mock_teste",
          nome: "Maria Helena (Noiva Teste)",
          email: "noivateste@exemplo.com",
          link_celular: "5511999999999",
          telefone_limpo: "11999999999",
          data_casamento: "14/11/2026",
          mes_casamento: "Novembro",
          local: "Espaço das Palmeiras",
          servicos: "Lembrancinhas Velas Aromáticas",
          convidados: 150,
          status_funil: "PRIMEIRO_CONTATO",
          etapa_contato: "SEM_CONTATO",
          temperatura: "MORNA"
        };
        log(`[TEST COMPILE] Sem leads cadastrados no banco. Utilizando dados fictícios para compilar as tags.`);
      }
    }

    if (action === "send_test_email") {
      log(`[SMTP TEST SEND] Iniciando disparo de e-mail real para ${test_email_recipient}...`);
      if (!test_email_recipient) {
        log("[SMTP TEST SEND] [ERRO] Destinatário de e-mail não informado.");
        return res.json({ success: false, logs });
      }

      let compiledSubject = test_email_subject || "Teste de Conexão CRM";
      let compiledBody = test_email_body || "<p>Este é um e-mail de teste.</p>";

      if (lead) {
        compiledSubject = await compileTemplate(compiledSubject, lead);
        compiledBody = await compileTemplate(compiledBody, lead);
        log(`[TEST COMPILE] Assunto compilado: "${compiledSubject}"`);
      }

      const resMail = await dispatchEmailMessage(test_email_recipient, compiledSubject, compiledBody, config);
      log(`[SMTP TEST SEND] Resultado do envio: ${resMail.log}`);
      return res.json({ success: resMail.success, logs });
    }

    if (action === "send_test_whatsapp") {
      log(`[WAHA TEST SEND] Iniciando disparo de WhatsApp real para ${test_whatsapp_recipient}...`);
      if (!test_whatsapp_recipient) {
        log("[WAHA TEST SEND] [ERRO] Telefone de destino do WhatsApp não informado.");
        return res.json({ success: false, logs });
      }

      let compiledBody = test_whatsapp_body || "Mensagem de teste do CRM.";
      let compiledImagesRaw = test_whatsapp_images || "";

      if (lead) {
        compiledBody = await compileTemplate(compiledBody, lead);
        compiledImagesRaw = await compileTemplate(compiledImagesRaw, lead);
        log(`[TEST COMPILE] Texto compilado com sucesso.`);
      }

      const resWa = await dispatchWhatsAppMessage(test_whatsapp_recipient, compiledBody, config);
      log(`[WAHA TEST SEND] Resultado do envio de texto: ${resWa.log}`);
      let allSuccess = resWa.success;

      // Send test images if present
      if (compiledImagesRaw) {
        const imageUrls = compiledImagesRaw
          .split(/[\n,]+/)
          .map((url: string) => url.trim())
          .filter((url: string) => url.startsWith("http://") || url.startsWith("https://"));

        if (imageUrls.length > 0) {
          log(`[WAHA TEST SEND] Identificadas ${imageUrls.length} imagem(ns) para envio no WhatsApp.`);
          for (const imgUrl of imageUrls) {
            log(`[WAHA TEST SEND] Processando e convertendo imagem: ${imgUrl}`);
            const preparedImg = await prepareImageForWaha(imgUrl);
            if (preparedImg) {
              log(`[WAHA TEST SEND] Enviando Imagem (${preparedImg.filename}) para ${test_whatsapp_recipient} no WhatsApp...`);
              const imgResult = await dispatchWhatsAppImage(test_whatsapp_recipient, preparedImg, "", config);
              log(`[WAHA TEST SEND] Resultado do Envio da Imagem: ${imgResult.log}`);
              if (!imgResult.success) {
                allSuccess = false;
              }
            } else {
              log(`[WAHA TEST SEND] [ERRO] Não foi possível processar a imagem "${imgUrl}"`);
              allSuccess = false;
            }
          }
        }
      }

      return res.json({ success: allSuccess, logs });
    }

    log("Iniciando diagnósticos de conectividade para canais cadastrados...");

    // 1. Test Zoho SMTP (Outbound)
    if (config.zoho_mail) {
      const mailConf = config.zoho_mail;
      log(`[SMTP] Testando Conexão de Envio via SMTP: host=${mailConf.smtp_host}, port=${mailConf.smtp_port}, user=${mailConf.user}...`);
      
      if (!mailConf.pass) {
        log("[SMTP] [AVISO] Nenhuma senha SMTP configurada. O envio real de e-mails será simulado.");
      } else {
        try {
          const transporter = nodemailer.createTransport({
            host: mailConf.smtp_host,
            port: Number(mailConf.smtp_port),
            secure: mailConf.use_ssl || Number(mailConf.smtp_port) === 465,
            auth: {
              user: mailConf.user,
              pass: mailConf.pass,
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000
          });
          
          await transporter.verify();
          log("[SMTP] [OK] Autenticação SMTP concluída com sucesso! Servidor de saída operacional.");
        } catch (mailErr: any) {
          log(`[SMTP] [ERRO] Falha de autenticação/conexão SMTP: ${mailErr.message}`);
          success = false;
        }
      }

      // 2. Test Zoho IMAP (Inbound Port Check)
      if (mailConf.enable_reception) {
        log(`[IMAP] Testando Conexão de Entrada via TCP IMAP: host=${mailConf.imap_host}, port=${mailConf.imap_port}...`);
        
        const socketCheck = await new Promise<boolean>((resolve) => {
          const socket = new net.Socket();
          let resolved = false;
          socket.setTimeout(4000);

          socket.connect(Number(mailConf.imap_port), mailConf.imap_host, () => {
            if (!resolved) {
              resolved = true;
              socket.destroy();
              resolve(true);
            }
          });

          const onFail = () => {
            if (!resolved) {
              resolved = true;
              socket.destroy();
              resolve(false);
            }
          };

          socket.on("error", onFail);
          socket.on("timeout", onFail);
        });

        if (socketCheck) {
          log("[IMAP] [OK] Porta IMAP aberta e respondendo a conexões TCP. Servidor de entrada acessível.");
        } else {
          log("[IMAP] [ERRO] Não foi possível conectar à porta IMAP. Verifique se o host e a porta estão corretos ou se há bloqueios.");
          success = false;
        }
      } else {
        log("[IMAP] Sincronização de entrada (IMAP) desativada pelo usuário.");
      }
    } else {
      log("[SMTP/IMAP] Sem configurações de e-mail enviadas.");
    }

    // 3. Test WAHA Whatsapp API
    if (config.waha_whatsapp) {
      const wahaConf = config.waha_whatsapp;
      log(`[WAHA] Testando Gateway WhatsApp via WAHA API em: ${wahaConf.api_url}...`);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (wahaConf.api_key) {
          headers["X-Api-Key"] = wahaConf.api_key;
        }

        const fetchUrl = `${wahaConf.api_url}/api/version`;
        log(`[WAHA] Consultando endpoint de status: ${fetchUrl}...`);
        
        // Use generic fetch with any timeout signal if supported
        const wahaRes = await fetch(fetchUrl, {
          headers,
          signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(4000) : undefined
        });

        if (wahaRes.ok) {
          const versionData = await wahaRes.json();
          const verStr = typeof versionData === "object" ? JSON.stringify(versionData) : versionData;
          log(`[WAHA] [OK] Conexão bem-sucedida! Retorno do servidor: ${verStr}`);
        } else {
          log(`[WAHA] [AVISO] Servidor WAHA retornou status HTTP ${wahaRes.status}. Verificando se é por falta de sessão.`);
          const sessionsUrl = `${wahaConf.api_url}/api/sessions`;
          const sessionsRes = await fetch(sessionsUrl, { 
            headers, 
            signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(4000) : undefined 
          });
          if (sessionsRes.ok) {
            log("[WAHA] [OK] Conexão bem-sucedida com endpoint de sessões!");
          } else {
            throw new Error(`Endpoint de sessões retornou erro HTTP ${sessionsRes.status}`);
          }
        }
      } catch (wahaErr: any) {
        log(`[WAHA] [ERRO] Não foi possível conectar ao servidor WAHA em ${wahaConf.api_url}: ${wahaErr.message}. O sistema continuará em modo de simulação.`);
        success = false;
      }
    }

    log(`Diagnóstico concluído. Status final: ${success ? "CONECTADO" : "FALHA"}`);
    res.json({ success, logs });
  } catch (err: any) {
    log(`[ERRO GERAL]: Falha inesperada durante o teste: ${err.message}`);
    res.status(500).json({ success: false, logs, error: err.message });
  }
});

// API - Get Portals
app.get("/api/portals", async (req, res) => {
  try {
    const portals = await getPortalConfigs();
    res.json(portals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Toggle Portal Active Status / Save Portals
app.put("/api/portals/:id", async (req, res) => {
  try {
    const { ativo, nome } = req.body;
    const currentPortals = await getPortalConfigs();
    const idx = currentPortals.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) {
      if (ativo !== undefined) currentPortals[idx].ativo = ativo;
      if (nome !== undefined) currentPortals[idx].nome = nome;
      await savePortalConfigs(currentPortals);
      res.json({ success: true, portal: currentPortals[idx] });
    } else {
      res.status(404).json({ error: "Portal not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Create Dynamic Portal Source
app.post("/api/portals", async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome do portal é obrigatório" });

    const id = nome.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const currentPortals = await getPortalConfigs();
    if (currentPortals.some((p) => p.id === id)) {
      return res.status(400).json({ error: "Este portal já existe" });
    }

    const newPortal = {
      id,
      nome,
      ativo: true,
      url_webhook: `/api/leads/webhook?portal=${id}`
    };

    currentPortals.push(newPortal);
    await savePortalConfigs(currentPortals);
    res.status(201).json(newPortal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Get Products
app.get("/api/products", async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Add or Update Product
app.post("/api/products", async (req, res) => {
  try {
    const { id, descricao, valor_unitario, link_imagem } = req.body;
    if (!id || !descricao || valor_unitario === undefined) {
      return res.status(400).json({ error: "id, descricao e valor_unitario são campos obrigatórios." });
    }

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanId) {
      return res.status(400).json({ error: "ID inválido. Use letras, números e underline." });
    }

    const product = {
      id: cleanId,
      descricao: descricao.trim(),
      valor_unitario: Number(valor_unitario) || 0,
      link_imagem: link_imagem || ""
    };

    await saveProduct(product);
    res.status(201).json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Delete Product
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await deleteProduct(id);
    res.json({ success: true, message: "Produto removido com sucesso." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to run sequence 1 immediately on webhook lead creation
async function runAutomationForNewWebhookLead(lead: any) {
  try {
    const workflowConfigs = await getWorkflowConfigs();
    // Try to find a config that matches the lead's current stage (e.g., "Orçamento Enviado")
    let config = workflowConfigs.find(
      (c) =>
        c.etapa === lead.etapa_contato ||
        (c.etapa && String(c.etapa).toUpperCase() === String(lead.etapa_contato).toUpperCase())
    );

    // If not found, fall back to the config with ordem === 1, or the first config in the list
    if (!config) {
      config = workflowConfigs.find((c) => c.ordem === 1) || workflowConfigs[0];
    }

    if (!config) {
      console.warn(`[Webhook Automation] No workflow configuration found for lead ${lead.id}`);
      return;
    }

    const canal = config.canal;
    if (!canal) {
      console.log(`[Webhook Automation] Config stage "${config.etapa}" does not have an active channel.`);
      return;
    }

    console.log(`[Webhook Automation] Triggering immediate dispatch of sequence 1 ("${config.etapa}") for Lead ${lead.nome}`);

    // Compile message template
    const msgBody = await compileTemplate(config.mensagem_template || "", lead);
    const updatedLead = { ...lead };

    if (canal === "WHATSAPP") {
      updatedLead.tentativas_whatsapp = (Number(lead.tentativas_whatsapp) || 0) + 1;
      updatedLead.ultimo_whatsapp_em = new Date().toISOString();

      const dispatchResult = await dispatchWhatsAppMessage(lead.link_celular, msgBody);

      let imagesHtml = "";
      if (config.imagens_template) {
        const compiledImagensRaw = await compileTemplate(config.imagens_template, lead);
        const imageUrls = compiledImagensRaw
          .split(/[\n,]+/)
          .map((url: string) => url.trim())
          .filter((url: string) => url.startsWith("http://") || url.startsWith("https://"));

        for (const imgUrl of imageUrls) {
          const preparedImg = await prepareImageForWaha(imgUrl);
          if (preparedImg) {
            await dispatchWhatsAppImage(lead.link_celular, preparedImg);
            imagesHtml += `<br/><img src="${imgUrl}" alt="${preparedImg.filename}" style="max-width: 200px; border-radius: 8px; margin-top: 8px; border: 1px solid #3f3f46;" referrerPolicy="no-referrer" />`;
          }
        }
      }

      await addHistoryEntry(lead.id, {
        canal: "WHATSAPP",
        tipo: "ENVIO",
        titulo: `WhatsApp [Sequência 1 - Auto]: ${config.template_name || "Boas-Vindas"}`,
        detalhes: `${msgBody}${imagesHtml}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchResult.log}</small>`
      });
    } else if (canal === "EMAIL") {
      updatedLead.tentativas_email = (Number(lead.tentativas_email) || 0) + 1;
      updatedLead.ultimo_email_em = new Date().toISOString();

      let emailSubject = await compileTemplate(config.assunto_template || "", lead);
      const dispatchResult = await dispatchEmailMessage(lead.email, emailSubject, msgBody);

      await addHistoryEntry(lead.id, {
        canal: "EMAIL",
        tipo: "ENVIO",
        titulo: `E-mail [Sequência 1 - Auto]: ${config.template_name || "Boas-Vindas"}`,
        detalhes: `<b>Assunto:</b> ${emailSubject}<br/><br/>${msgBody.replace(/\n/g, "<br/>")}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchResult.log}</small>`
      });
    }

    // Set transitions based on the executed config!
    const waitDays = config.esperar_dias || 0;
    let nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + waitDays);

    updatedLead.etapa_contato = config.proxima_etapa || lead.etapa_contato;
    updatedLead.status_funil = config.proximo_status || lead.status_funil;
    updatedLead.temperatura = config.temperatura || lead.temperatura;
    updatedLead.proxima_acao_em = nextActionDate.toISOString();
    updatedLead.ultima_interacao_em = new Date().toISOString();

    await saveLead(updatedLead, false);
    console.log(`[Webhook Automation] Lead updated to Stage: ${updatedLead.etapa_contato}, Status: ${updatedLead.status_funil}`);
  } catch (err: any) {
    console.error("[Webhook Automation] Error running immediate workflow:", err);
  }
}

// API - Webhook for Dynamic Leads Import (n8n or direct)
app.post("/api/leads/webhook", async (req, res) => {
  try {
    const { portal } = req.query;
    const leadData = req.body;

    const portalId = String(portal || "portal_noivas");
    const portalList = await getPortalConfigs();
    const currentPortal = portalList.find((p) => p.id === portalId);

    if (currentPortal && !currentPortal.ativo) {
      return res.status(400).json({ error: `Portal ${currentPortal.nome} está inativo.` });
    }

    const nomePortal = currentPortal ? currentPortal.nome : "Webhook API";

    // Extract fields (with default mappings or flexible structure)
    const nome = leadData.nome || leadData.name || "Cliente Webhook";
    const email = leadData.email || leadData.mail;
    const link_celular = leadData.link_celular || leadData.celular || leadData.whatsapp || leadData.phone;
    const data_casamento = leadData.data_casamento || leadData.wedding_date;
    const mes_casamento = leadData.mes_casamento || leadData.wedding_month;
    const local = leadData.local || leadData.venue;
    const servicos = leadData.servicos || leadData.services;
    const convidados = Number(leadData.convidados || leadData.guests || 0);

    if (!email) {
      return res.status(400).json({ error: "E-mail do lead é obrigatório no payload" });
    }

    const leadId = `CRM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const orcamentos = calcularOrcamentos(convidados);
    const phoneDigits = (link_celular || "").replace(/\D/g, "");

    const newLead = {
      id: leadId,
      nome,
      email: email.trim().toLowerCase(),
      link_celular,
      telefone_limpo: phoneDigits,
      data_casamento,
      mes_casamento: mes_casamento || "breve",
      local,
      servicos,
      convidados,
      ...orcamentos,
      status_funil: "Primeiro Contato",
      etapa_contato: "Orçamento Enviado",
      temperatura: "Fria",
      tentativas_email: 0,
      tentativas_whatsapp: 0,
      observacoes: leadData.observacoes || leadData.notes || `Importado via Webhook ${nomePortal}`,
      origem_portal: nomePortal,
      ultima_interacao_em: new Date().toISOString(),
      proxima_acao_em: new Date().toISOString()
    };

    const saved = await saveLead(newLead, true);
    await addHistoryEntry(leadId, {
      canal: "SISTEMA",
      tipo: "IMPORT",
      titulo: `Lead Importado - ${nomePortal}`,
      detalhes: `Integração bem-sucedida! Payload recebido: ${JSON.stringify(leadData)}`
    });

    // Send sequence 1 immediately
    await runAutomationForNewWebhookLead(saved);

    res.status(201).json({ success: true, lead_id: leadId, lead: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Webhook para Integração com n8n (Leitura de Leads Zoho Mail)
app.post("/api/leads/n8n-webhook", async (req, res) => {
  try {
    const leadData = req.body;

    // Mapeamento flexível de campos vindos do n8n (Suporta múltiplos formatos de chaves)
    const nome = leadData.nome || leadData.name || leadData.noiva || leadData.cliente || "Noiva - n8n";
    const email = leadData.email || leadData.mail || leadData.email_cliente;
    const link_celular = leadData.link_celular || leadData.celular || leadData.whatsapp || leadData.phone || leadData.telefone;
    const data_casamento = leadData.data_casamento || leadData.data || leadData.wedding_date || leadData.date;
    const mes_casamento = leadData.mes_casamento || leadData.mes || leadData.wedding_month || leadData.month;
    const local = leadData.local || leadData.venue || leadData.local_casamento;
    const servicos = leadData.servicos || leadData.services || leadData.itens;
    const convidados = Number(leadData.convidados || leadData.guests || leadData.quantidade_convidados || leadData.num_convidados || 100);
    const observacoes = leadData.observacoes || leadData.notes || leadData.obs || leadData.comentarios || "Importado automaticamente via n8n Zoho Mail Integration";
    const origem_portal = leadData.origem_portal || leadData.portal || leadData.origem || "n8n Zoho Mail";

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: "O campo de e-mail ('email' ou 'mail') é obrigatório para cadastrar o lead no CRM." 
      });
    }

    const leadId = `CRM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const orcamentos = calcularOrcamentos(convidados);
    const phoneDigits = String(link_celular || "").replace(/\D/g, "");

    const newLead = {
      id: leadId,
      nome,
      email: String(email).trim().toLowerCase(),
      link_celular: link_celular || "",
      telefone_limpo: phoneDigits,
      data_casamento: data_casamento || "",
      mes_casamento: mes_casamento || "breve",
      local: local || "",
      servicos: servicos || "",
      convidados,
      ...orcamentos,
      status_funil: "Primeiro Contato",
      etapa_contato: "Orçamento Enviado",
      temperatura: "Fria",
      tentativas_email: 0,
      tentativas_whatsapp: 0,
      observacoes,
      origem_portal,
      ultima_interacao_em: new Date().toISOString(),
      proxima_acao_em: new Date().toISOString()
    };

    const saved = await saveLead(newLead, true);

    // Registra a entrada no histórico de auditoria
    await addHistoryEntry(leadId, {
      canal: "SISTEMA",
      tipo: "IMPORT",
      titulo: "Lead Cadastrado via n8n Webhook",
      detalhes: `Lead recebido e cadastrado com sucesso! Origem: ${origem_portal}. Dados mapeados: ${JSON.stringify({
        nome, email, link_celular, data_casamento, convidados
      })}`
    });

    // Roda a sequência de número 1 do fluxo imediatamente para o novo lead
    await runAutomationForNewWebhookLead(saved);

    res.status(201).json({
      success: true,
      message: "Lead cadastrado e incluído na esteira de automação com sucesso!",
      lead_id: leadId,
      lead: saved,
      automation: {
        success: true,
        processed: 1,
        actions_taken: 1,
        logs: ["Sequência 1 enviada imediatamente de forma automatizada"]
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API - Zoho Email Parsing & Simulation
app.post("/api/leads/zoho-email", async (req, res) => {
  try {
    const { email_body, use_ai } = req.body;
    if (!email_body) {
      return res.status(400).json({ error: "O conteúdo do e-mail é obrigatório" });
    }

    let parsed: any = null;

    if (use_ai && ai) {
      try {
        console.log("Using Gemini to parse email body...");
        const prompt = `Analise o seguinte e-mail do "Portal Noivas" ou "Casamento" e extraia os detalhes do Lead no formato JSON plano com as seguintes chaves:
        nome (String),
        data_casamento (String formato DD/MM/AAAA ou vazio se não houver),
        mes_casamento (Mês por extenso com base na data do casamento ou vazio),
        email (String do email),
        link_celular (String do celular),
        local (String do local do casamento ou vazio),
        servicos (String de serviços solicitados ou vazio),
        convidados (Número inteiro de convidados).
        
        Texto do e-mail:
        ${email_body}
        
        Retorne APENAS o JSON válido, sem tags markdown, sem comentários.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });

        const textResponse = response.text || "";
        const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
        const aiParsed = JSON.parse(cleanJson);
        
        parsed = {
          nome: aiParsed.nome || "Noiva",
          dataCasamento: aiParsed.data_casamento || "",
          mesCasamento: aiParsed.mes_casamento || "breve",
          email: aiParsed.email || "",
          linkCelular: aiParsed.link_celular || "",
          local: aiParsed.local || "",
          servicos: aiParsed.servicos || "",
          convidados: Number(aiParsed.convidados || 0)
        };
      } catch (aiErr) {
        console.warn("AI Email parsing failed, rolling back to Regex:", aiErr);
        parsed = parseZohoEmailText(email_body);
      }
    } else {
      parsed = parseZohoEmailText(email_body);
    }

    if (!parsed.email) {
      return res.status(400).json({ error: "Não foi possível extrair um endereço de e-mail válido deste texto" });
    }

    // Calculations & insert
    const leadId = `CRM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    const orcamentos = calcularOrcamentos(parsed.convidados);
    const phoneDigits = String(parsed.linkCelular || "").replace(/\D/g, "");

    const newLead = {
      id: leadId,
      nome: parsed.nome,
      email: parsed.email.trim().toLowerCase(),
      link_celular: parsed.linkCelular,
      telefone_limpo: phoneDigits,
      data_casamento: parsed.dataCasamento,
      mes_casamento: parsed.mesCasamento || "breve",
      local: parsed.local,
      servicos: parsed.servicos,
      convidados: parsed.convidados,
      ...orcamentos,
      status_funil: "Primeiro Contato",
      etapa_contato: "Orçamento Enviado",
      temperatura: "Fria",
      tentativas_email: 0,
      tentativas_whatsapp: 0,
      observacoes: `Lead capturado automaticamente do Zoho E-mail (Remetente Portal Noivas)`,
      origem_portal: "Portal Noivas",
      ultima_interacao_em: new Date().toISOString(),
      proxima_acao_em: new Date().toISOString()
    };

    const saved = await saveLead(newLead, true);

    // Save Timeline Logs
    await addHistoryEntry(leadId, {
      canal: "EMAIL",
      tipo: "IMPORT",
      titulo: "Lead Importado via Zoho Mail Parser",
      detalhes: `Corpo de e-mail lido e processado pelo CRM.`
    });

    // Roda a sequência de número 1 do fluxo imediatamente para o novo lead
    await runAutomationForNewWebhookLead(saved);

    res.status(201).json({
      success: true,
      lead: saved,
      parser_details: parsed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Google Sheets Import Helper and Routes
// -------------------------------------------------------------
function parseCSV(csvText: string): any[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else if (char === '\r' && !inQuotes) {
      // skip CR
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let cell = "";
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        insideQuotes = !insideQuotes;
      } else if (c === ',' && !insideQuotes) {
        result.push(cell.trim());
        cell = "";
      } else {
        cell += c;
      }
    }
    result.push(cell.trim());
    return result;
  };

  const headers = splitCSVLine(lines[0]);
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = splitCSVLine(line);
    const row: any = {};
    headers.forEach((header, index) => {
      let val = cells[index] || "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      row[header] = val;
    });
    data.push(row);
  }
  return data;
}

function mapSheetRowToLead(row: any): any {
  const statusMap: any = {
    'FOLLOWUP_1': 'FOLLOWUP1',
    'FOLLOWUP_2': 'FOLLOWUP2',
    'FOLLOWUP_3': 'FOLLOWUP3',
    'FOLLOWUP_FINAL': 'FOLLOWUPFINAL',
    'SEM_RETORNO': 'SEM_RETORNO',
    'PERDIDO': 'PERDIDO',
    'FECHOU': 'FECHOU',
    'RESPONDIDO': 'RESPONDIDO',
    'PRIMEIRO_CONTATO': 'PRIMEIRO_CONTATO',
    'NOVO': 'NOVO'
  };

  let status = row.status_funil || 'NOVO';
  status = status.toUpperCase().trim();
  status = statusMap[status] || (['NOVO', 'PRIMEIRO_CONTATO', 'FOLLOWUP1', 'FOLLOWUP2', 'FOLLOWUP3', 'FOLLOWUPFINAL', 'RESPONDIDO', 'FECHOU', 'PERDIDO', 'SEM_RETORNO'].includes(status) ? status : 'NOVO');

  const validEtapas = ['SEM_CONTATO', 'WHATSAPP_ENVIADO', 'EMAIL_FOLLOWUP_1', 'WHATSAPP_FOLLOWUP_2', 'EMAIL_FOLLOWUP_2', 'EMAIL_FINAL', 'ENCERRADO'];
  let etapa = row.etapa_contato || 'SEM_CONTATO';
  etapa = etapa.toUpperCase().trim();
  etapa = validEtapas.includes(etapa) ? etapa : 'SEM_CONTATO';

  const validTemps = ['FRIA', 'MORNA', 'QUENTE', 'CLIENTE'];
  let temp = row.temperatura || 'FRIA';
  temp = temp.toUpperCase().trim();
  temp = validTemps.includes(temp) ? temp : 'FRIA';

  const convidados = parseInt(row.convidados, 10) || 0;
  const orcamentos = calcularOrcamentos(convidados);

  return {
    id: row.lead_id,
    nome: row.nome || 'Noiva Importada',
    email: (row.email || '').trim().toLowerCase(),
    link_celular: row.linkCelular || '',
    telefone_limpo: (row.linkCelular || '').replace(/\D/g, ""),
    data_casamento: row.dataCasamento || '',
    mes_casamento: row.mesCasamento || 'breve',
    local: row.local || '',
    servicos: row.servicos || '',
    convidados: convidados,
    soma1: row.soma1 || orcamentos.soma1,
    soma2: row.soma2 || orcamentos.soma2,
    soma3: row.soma3 || orcamentos.soma3,
    soma4: row.soma4 || orcamentos.soma4,
    soma5: row.soma5 || orcamentos.soma5,
    status_funil: status,
    etapa_contato: etapa,
    temperatura: temp,
    tentativas_email: parseInt(row.tentativas_email, 10) || 0,
    tentativas_whatsapp: parseInt(row.tentativas_whatsapp, 10) || 0,
    observacoes: row.observacoes || 'Importado da planilha de noivas Google Sheets.',
    motivo_perda: row.motivo_perda || '',
    origem_portal: row.origem || 'Portal Noivas',
    ultimo_email_em: row.ultimo_email_em || '',
    ultimo_whatsapp_em: row.ultimo_whatsapp_em || '',
    ultima_interacao_em: row.ultima_interacao_em || new Date().toISOString(),
    proxima_acao_em: row.proxima_acao_em || new Date().toISOString(),
    created_at: row.data_entrada || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

app.get("/api/leads/import-sheet/preview", async (req, res) => {
  try {
    const csvUrl = "https://docs.google.com/spreadsheets/d/16_gt6qo7fT9r2WMxLUwWxhYT4HKOrhvjoD--CdDz124/export?format=csv&gid=0";
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet. HTTP status: ${response.status}`);
    }
    const csvText = await response.text();
    const sheetRows = parseCSV(csvText);
    const localLeads = await getLeads();
    const localLeadIds = localLeads.map((l: any) => l.id);

    const result = sheetRows.map((row: any) => ({
      ...row,
      already_imported: localLeadIds.includes(row.lead_id)
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leads/import-sheet/execute", async (req, res) => {
  try {
    const { lead_ids } = req.body;
    const csvUrl = "https://docs.google.com/spreadsheets/d/16_gt6qo7fT9r2WMxLUwWxhYT4HKOrhvjoD--CdDz124/export?format=csv&gid=0";
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet. HTTP status: ${response.status}`);
    }
    const csvText = await response.text();
    const sheetRows = parseCSV(csvText);
    const localLeads = await getLeads();
    const localLeadIds = localLeads.map((l: any) => l.id);

    const rowsToImport = sheetRows.filter((row: any) => {
      if (localLeadIds.includes(row.lead_id)) {
        return false;
      }
      if (lead_ids && Array.isArray(lead_ids)) {
        return lead_ids.includes(row.lead_id);
      }
      return true;
    });

    let importedCount = 0;
    for (const row of rowsToImport) {
      if (!row.lead_id || !row.nome || !row.email) {
        continue;
      }
      const mappedLead = mapSheetRowToLead(row);
      await saveLead(mappedLead, true);
      await addHistoryEntry(mappedLead.id, {
        canal: "SISTEMA",
        tipo: "IMPORT",
        titulo: "Lead Importado do Google Sheets",
        detalhes: `Lead '${mappedLead.nome}' importado automaticamente da planilha com status '${mappedLead.status_funil}'.`
      });
      importedCount++;
    }

    res.json({
      success: true,
      imported_count: importedCount,
      total_found: sheetRows.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Core Logic for CRM Automation Varredura
async function runCRMAutomationLogic(force: boolean = false): Promise<{ success: boolean; processed: number; actions_taken: number; logs: string[] }> {
  const executionLogs: string[] = [];
  function log(msg: string) {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    executionLogs.push(`[${timestamp}] ${msg}`);
  }

  try {
    const settings = await getGeneralSettings();
    const isPaused = settings?.scheduler?.paused ?? false;

    if (isPaused && !force) {
      log("Aviso: A automação de disparo automático está pausada nas Configurações Gerais.");
      return {
        success: true,
        processed: 0,
        actions_taken: 0,
        logs: executionLogs
      };
    }

    log("Iniciando varredura do CRM (Motor de Follow-up Casa Colombo - V2)...");

    const leads = await getLeads();
    const workflowConfigs = await getWorkflowConfigs();
    
    log(`Buscando leads ativos... Total de leads no CRM: ${leads.length}`);
    
    let processedCount = 0;
    let actionTakenCount = 0;

    for (const lead of leads) {
      log(`------------------------------------------------------------------`);
      log(`Analisando Lead ID: ${lead.id} | Nome: ${lead.nome}`);

      // 1. Validation Logic
      if (String(lead.status_funil).toUpperCase() === "FECHOU") {
        log("Elegibilidade: Lead já CONVERTIDO (fechou). Ignorando.");
        continue;
      }
      if (String(lead.status_funil).toUpperCase() === "RESPONDIDO") {
        log("Elegibilidade: Lead RESPONDEU ao contato. Ignorando automação de envio.");
        continue;
      }
      if (lead.motivo_perda && lead.motivo_perda.trim() !== "" && lead.motivo_perda !== "AGUARDANDO_DATA") {
        log(`Elegibilidade: Lead ENCERRADO/PERDIDO (${lead.motivo_perda}). Ignorando.`);
        continue;
      }
      if (lead.etapa_contato === "ENCERRADO" || lead.etapa_contato === "Encerrado" || (lead.etapa_contato && lead.etapa_contato.toUpperCase() === "ENCERRADO")) {
        log("Elegibilidade: Fluxo de follow-up do lead está ENCERRADO. Ignorando.");
        continue;
      }

      // Check date trigger (proxima_acao_em)
      const agora = new Date();
      const proximaAcao = lead.proxima_acao_em ? new Date(lead.proxima_acao_em) : agora;
      
      if (proximaAcao > agora) {
        const diffMinutes = Math.round((proximaAcao.getTime() - agora.getTime()) / 1000 / 60);
        log(`Elegibilidade: Ainda não chegou a hora da próxima ação. Agendado para em ${diffMinutes} minutos. Ignorando.`);
        continue;
      }

      processedCount++;

      // 2. Resolve Stage Rules
      const etapaAtual = lead.etapa_contato || "SEM_CONTATO";
      const configEtapa = workflowConfigs.find((c) => c.etapa === etapaAtual || (c.etapa && c.etapa.toUpperCase() === etapaAtual.toUpperCase()));

      if (!configEtapa) {
        log(`Erro: Nenhuma configuração de regra encontrada para a etapa "${etapaAtual}".`);
        continue;
      }

      if (!configEtapa.canal) {
        // No action required, or terminal state
        log(`Workflow: Etapa "${etapaAtual}" é um estado terminal ou sem ação de envio.`);
        continue;
      }

      log(`Workflow ativo: Etapa atual "${etapaAtual}" solicita envio por [${configEtapa.canal}]`);

      // 3. Simulating the send and processing response
      const canal = configEtapa.canal;
      const templateName = configEtapa.template_name;
      const waitDays = configEtapa.esperar_dias || 0;
      
      let nextActionDate = new Date();
      nextActionDate.setDate(nextActionDate.getDate() + waitDays);

      let updatedLead = { ...lead };
      
      // Substitute template variables
      let msgBody = await compileTemplate(configEtapa.mensagem_template || "", lead);
 
      if (canal === "WHATSAPP") {
        updatedLead.tentativas_whatsapp = (Number(lead.tentativas_whatsapp) || 0) + 1;
        updatedLead.ultimo_whatsapp_em = new Date().toISOString();
        
        log(`Enviando WhatsApp (${templateName}) para ${lead.nome} (${lead.link_celular || "Sem número"})...`);
        log(`\n--- CONTEÚDO ENVIADO (WHATSAPP) ---\n${msgBody}\n------------------------------------`);
        
        const dispatchResult = await dispatchWhatsAppMessage(lead.link_celular, msgBody);
        log(`Resultado do Disparo: ${dispatchResult.log}`);

        let imageDispatches: string[] = [];
        let imagesHtml = "";

        if (configEtapa.imagens_template) {
          const compiledImagensRaw = await compileTemplate(configEtapa.imagens_template, lead);
          const imageUrls = compiledImagensRaw
            .split(/[\n,]+/)
            .map(url => url.trim())
            .filter(url => url.startsWith("http://") || url.startsWith("https://"));

          if (imageUrls.length > 0) {
            log(`Workflow: Identificadas ${imageUrls.length} imagem(ns) para envio no WhatsApp.`);
            for (const imgUrl of imageUrls) {
              log(`Processando e convertendo imagem: ${imgUrl}`);
              const preparedImg = await prepareImageForWaha(imgUrl);
              if (preparedImg) {
                log(`Enviando Imagem (${preparedImg.filename}) para ${lead.nome} no WhatsApp...`);
                const imgResult = await dispatchWhatsAppImage(lead.link_celular, preparedImg);
                log(`Resultado do Disparo da Imagem: ${imgResult.log}`);
                imageDispatches.push(`${preparedImg.filename}: ${imgResult.log}`);
                imagesHtml += `<br/><img src="${imgUrl}" alt="${preparedImg.filename}" style="max-width: 200px; border-radius: 8px; margin-top: 8px; border: 1px solid #3f3f46;" referrerPolicy="no-referrer" />`;
              } else {
                log(`Erro: Não foi possível processar a imagem "${imgUrl}"`);
                imageDispatches.push(`Falha no processamento da imagem: ${imgUrl}`);
              }
            }
          }
        }

        const imagensLog = imageDispatches.length > 0 
          ? `<br/><br/><b>Disparos de Imagens:</b><br/>${imageDispatches.join("<br/>")}` 
          : "";
        
        await addHistoryEntry(lead.id, {
          canal: "WHATSAPP",
          tipo: "ENVIO",
          titulo: `WhatsApp Follow-up Enviado: ${templateName}`,
          detalhes: `${msgBody}${imagesHtml}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchResult.log}${imagensLog}</small>`
        });
      } else if (canal === "EMAIL") {
        updatedLead.tentativas_email = (Number(lead.tentativas_email) || 0) + 1;
        updatedLead.ultimo_email_em = new Date().toISOString();
        
        let emailSubject = await compileTemplate(configEtapa.assunto_template || "", lead);
 
        log(`Enviando E-mail (${templateName}) para ${lead.nome} (${lead.email})...`);
        log(`Assunto: "${emailSubject}"`);
        log(`\n--- CONTEÚDO ENVIADO (E-MAIL) ---\n${msgBody}\n----------------------------------`);
        
        const dispatchResult = await dispatchEmailMessage(lead.email, emailSubject, msgBody);
        log(`Resultado do Disparo: ${dispatchResult.log}`);
        
        await addHistoryEntry(lead.id, {
          canal: "EMAIL",
          tipo: "ENVIO",
          titulo: `E-mail Follow-up Enviado: ${templateName}`,
          detalhes: `<b>Assunto:</b> ${emailSubject}<br/><br/>${msgBody.replace(/\n/g, "<br/>")}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchResult.log}</small>`
        });
      }

      // Update lead stages
      updatedLead.etapa_contato = configEtapa.proxima_etapa || etapaAtual;
      updatedLead.status_funil = configEtapa.proximo_status || lead.status_funil;
      updatedLead.temperatura = configEtapa.temperatura || lead.temperatura;
      updatedLead.proxima_acao_em = nextActionDate.toISOString();
      updatedLead.ultima_interacao_em = new Date().toISOString();

      log(`Ajustando Lead: Etapa -> ${updatedLead.etapa_contato} | Status -> ${updatedLead.status_funil} | Próxima ação em: ${nextActionDate.toLocaleDateString("pt-BR")}`);

      await saveLead(updatedLead, false);
      actionTakenCount++;
    }

    log(`==================================================================`);
    log(`Varredura concluída! Leads avaliados: ${processedCount} | Ações de envio tomadas: ${actionTakenCount}`);

    return {
      success: true,
      processed: processedCount,
      actions_taken: actionTakenCount,
      logs: executionLogs
    };
  } catch (err: any) {
    log(`FALHA CRÍTICA NA AUTOMAÇÃO: ${err.message}`);
    return {
      success: false,
      processed: 0,
      actions_taken: 0,
      logs: executionLogs
    };
  }
}

// API - RUN CRM AUTOMATION (Scheduler Simulator)
app.post("/api/automation/run", async (req, res) => {
  try {
    const force = req.body?.force === true;
    const result = await runCRMAutomationLogic(force);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Dashboard Statistics
app.get("/api/stats", async (req, res) => {
  try {
    const leads = await getLeads();

    // Helper to parse DD/MM/YYYY or standard formats
    const parseWeddingDate = (dateStr?: string): Date | null => {
      return parseWeddingDateGlobal(dateStr);
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Exclude past weddings from the dashboard metrics
    const dashboardLeads = leads.filter((l) => {
      if (!l.data_casamento) return true; // keep if no wedding date specified
      const wDate = parseWeddingDate(l.data_casamento);
      if (!wDate) return true; // keep if invalid date format
      return wDate >= today; // keep only if wedding is today or in the future
    });

    // 2. Group upcoming weddings (next 3 months) for proactive contact
    const upcoming1Month: any[] = [];
    const upcoming2Months: any[] = [];
    const upcoming3Months: any[] = [];

    leads.forEach((l) => {
      if (!l.data_casamento) return;
      const wDate = parseWeddingDate(l.data_casamento);
      if (!wDate) return;
      
      const diffTime = wDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 30) {
        upcoming1Month.push({ ...l, dias_restantes: diffDays });
      } else if (diffDays > 30 && diffDays <= 60) {
        upcoming2Months.push({ ...l, dias_restantes: diffDays });
      } else if (diffDays > 60 && diffDays <= 90) {
        upcoming3Months.push({ ...l, dias_restantes: diffDays });
      }
    });

    const sortByDays = (a: any, b: any) => a.dias_restantes - b.dias_restantes;
    upcoming1Month.sort(sortByDays);
    upcoming2Months.sort(sortByDays);
    upcoming3Months.sort(sortByDays);

    const isNovo = (s: string) => !s || s === "NOVO" || s === "Novo" || s === "Primeiro Contato" || s === "PRIMEIRO_CONTATO";
    const isConvertido = (s: string) => s === "FECHOU" || s === "Fechou (Convertido)" || s === "Fechou" || s === "CONVERTIDO";
    const isPerdido = (s: string) => s === "PERDIDO" || s === "SEM_RETORNO" || s === "Perdido" || s === "Sem Retorno / Encerrado" || s === "Sem Retorno";

    const totalLeads = dashboardLeads.length;
    const leadsNovos = dashboardLeads.filter((l) => isNovo(l.status_funil)).length;
    const leadsAtivos = dashboardLeads.filter((l) => !isConvertido(l.status_funil) && !isPerdido(l.status_funil)).length;
    const leadsConvertidos = dashboardLeads.filter((l) => isConvertido(l.status_funil)).length;
    const leadsPerdidos = dashboardLeads.filter((l) => isPerdido(l.status_funil)).length;
    
    const taxaConversao = totalLeads > 0 ? parseFloat(((leadsConvertidos / totalLeads) * 100).toFixed(1)) : 0;

    const leadsPorStatus: any = {};
    const leadsPorEtapa: any = {};
    const leadsPorTemperatura: any = {};
    const leadsPorOrigem: any = {};

    dashboardLeads.forEach((l) => {
      leadsPorStatus[l.status_funil] = (leadsPorStatus[l.status_funil] || 0) + 1;
      leadsPorEtapa[l.etapa_contato] = (leadsPorEtapa[l.etapa_contato] || 0) + 1;
      leadsPorTemperatura[l.temperatura] = (leadsPorTemperatura[l.temperatura] || 0) + 1;
      
      let originName = l.origem_portal || "Manual";
      const upperOrigin = originName.toUpperCase().trim();
      if (upperOrigin === "PORTAL_NOIVAS" || upperOrigin === "PORTAL NOIVAS") {
        originName = "Portal Noivas";
      } else if (upperOrigin === "CASAMENTOS" || upperOrigin === "CASAMENTOS.COM.BR") {
        originName = "Casamentos.com.br";
      } else if (upperOrigin === "ZANKYOU") {
        originName = "Zankyou";
      } else if (upperOrigin === "MANUAL") {
        originName = "Manual";
      }
      leadsPorOrigem[originName] = (leadsPorOrigem[originName] || 0) + 1;
    });

    // Generate last 7 days history for entry chart
    const historyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      historyMap[str] = 0;
    }

    dashboardLeads.forEach((l) => {
      const date = new Date(l.created_at || l.updated_at || Date.now());
      const str = date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
      if (historyMap[str] !== undefined) {
        historyMap[str]++;
      }
    });

    const historicoEntrada = Object.entries(historyMap).map(([data, quantidade]) => ({ data, quantidade }));

    const settings = await getGeneralSettings();
    const schedulerPaused = settings?.scheduler?.paused ?? false;

    res.json({
      totalLeads,
      leadsNovos,
      leadsAtivos,
      leadsConvertidos,
      leadsPerdidos,
      taxaConversao,
      leadsPorStatus,
      leadsPorEtapa,
      leadsPorTemperatura,
      leadsPorOrigem,
      historicoEntrada,
      upcomingWeddings: {
        oneMonth: upcoming1Month,
        twoMonths: upcoming2Months,
        threeMonths: upcoming3Months
      },
      systemStatus: {
        usePg: usePg,
        pgConnected: !!pgPool,
        schedulerPaused: schedulerPaused
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Background Scheduler for CRM Automation (Brazil Timezone America/Sao_Paulo)
let lastScheduledRunMinute = "";

function startAutomationScheduler() {
  console.log("Background Automation Scheduler initialized.");
  setInterval(async () => {
    try {
      const settings = await getGeneralSettings();
      if (!settings) return;

      const schedulerConfig = settings.scheduler || {
        paused: false,
        hours: ["09:00", "14:00", "18:00"]
      };

      if (schedulerConfig.paused) {
        return; // Paused/Disabled
      }

      const nowInBrazil = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const hour = String(nowInBrazil.getHours()).padStart(2, "0");
      const minute = String(nowInBrazil.getMinutes()).padStart(2, "0");
      const timeStr = `${hour}:${minute}`;

      if (timeStr === lastScheduledRunMinute) {
        return; // Already run this minute
      }

      const configuredHours = schedulerConfig.hours || [];
      if (configuredHours.includes(timeStr)) {
        lastScheduledRunMinute = timeStr;
        console.log(`[Scheduler] Automation Trigger Hit at ${timeStr} (Brazil Time). Running varredura...`);
        const result = await runCRMAutomationLogic(false);
        console.log(`[Scheduler] Completed varredura! Success=${result.success}, Processed=${result.processed}, Sent=${result.actions_taken}`);
      }
    } catch (err: any) {
      console.error("Error in Background Automation Scheduler:", err.message);
    }
  }, 30000); // Check every 30 seconds
}

// Start Background Scheduler
startAutomationScheduler();

// Serving built client assets in production, otherwise Vite middleware
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Development Server running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production Server running on http://localhost:${PORT}`);
  });
}
