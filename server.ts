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
import Redis from "ioredis";
const { Pool } = pg;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

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
      lead_history: [],
      financial_contracts: [],
      financial_installments: []
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
      if (!data.financial_contracts) { data.financial_contracts = []; updated = true; }
      if (!data.financial_installments) { data.financial_installments = []; updated = true; }
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
        lead_history: [],
        financial_contracts: [],
        financial_installments: []
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
          followup_especial_1m BOOLEAN DEFAULT FALSE,
          followup_especial_2m BOOLEAN DEFAULT FALSE,
          followup_especial_3m BOOLEAN DEFAULT FALSE,
          whatsapp_retry_count INTEGER DEFAULT 0,
          whatsapp_retry_stage VARCHAR(255),
          email_retry_count INTEGER DEFAULT 0,
          email_retry_stage VARCHAR(255),
          created_at VARCHAR(255),
          updated_at VARCHAR(255)
        );
      `);

      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_especial_1m BOOLEAN DEFAULT FALSE;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_especial_2m BOOLEAN DEFAULT FALSE;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_especial_3m BOOLEAN DEFAULT FALSE;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_retry_count INTEGER DEFAULT 0;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_retry_stage VARCHAR(255);
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_retry_count INTEGER DEFAULT 0;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_retry_stage VARCHAR(255);
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_validation_status VARCHAR(255);
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_validation_http_code INTEGER;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_validation_error TEXT;
      `);
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_validated_at VARCHAR(255);
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

      // 7. Financial Contracts Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial_contracts (
          id VARCHAR(255) PRIMARY KEY,
          lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
          contract_number VARCHAR(255),
          contract_date VARCHAR(255),
          total_value NUMERIC(10,2) DEFAULT 0.00,
          freight_value NUMERIC(10,2) DEFAULT 0.00,
          discount_value NUMERIC(10,2) DEFAULT 0.00,
          final_value NUMERIC(10,2) DEFAULT 0.00,
          payment_method VARCHAR(255),
          installments_count INTEGER DEFAULT 1,
          down_payment NUMERIC(10,2) DEFAULT 0.00,
          status VARCHAR(255) DEFAULT 'active',
          observations TEXT,
          created_at VARCHAR(255),
          updated_at VARCHAR(255)
        );
      `);

      await client.query(`
        ALTER TABLE financial_contracts ADD COLUMN IF NOT EXISTS freight_value NUMERIC(10,2) DEFAULT 0.00;
        ALTER TABLE financial_contracts ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0.00;
        ALTER TABLE financial_contracts ADD COLUMN IF NOT EXISTS final_value NUMERIC(10,2) DEFAULT 0.00;
      `);

      // 8. Financial Installments Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS financial_installments (
          id VARCHAR(255) PRIMARY KEY,
          contract_id VARCHAR(255) REFERENCES financial_contracts(id) ON DELETE CASCADE,
          installment_number INTEGER,
          due_date VARCHAR(255),
          value NUMERIC(10,2) DEFAULT 0.00,
          status VARCHAR(255) DEFAULT 'pending',
          paid_date VARCHAR(255),
          paid_value NUMERIC(10,2) DEFAULT 0.00,
          payment_method VARCHAR(255),
          payment_observations TEXT,
          receipt_number VARCHAR(255),
          created_at VARCHAR(255),
          updated_at VARCHAR(255)
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

async function getAllLeadsUnfiltered(): Promise<any[]> {
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
      }
    } catch (e: any) {}
  }

  if (list.length === 0) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      list = db.leads || [];
    } catch (e) {
      list = [];
    }
  }

  return list;
}

async function findDuplicateLead(email?: string, phone?: string): Promise<any | null> {
  const cleanEmail = email && typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanPhone = phone && typeof phone === "string" ? phone.replace(/\D/g, "") : "";

  if (!cleanEmail && (!cleanPhone || cleanPhone.length < 8)) {
    return null;
  }

  const allLeads = await getAllLeadsUnfiltered();

  for (const lead of allLeads) {
    // 1. Check Email match
    if (cleanEmail && lead.email && String(lead.email).trim().toLowerCase() === cleanEmail) {
      return lead;
    }

    // 2. Check Phone match (minimum 8 digits to avoid short string false positives)
    if (cleanPhone && cleanPhone.length >= 8) {
      const leadPhoneLimpo = lead.telefone_limpo ? String(lead.telefone_limpo).replace(/\D/g, "") : "";
      const leadLinkCelularDigits = lead.link_celular ? String(lead.link_celular).replace(/\D/g, "") : "";

      if (leadPhoneLimpo && leadPhoneLimpo.length >= 8 && (leadPhoneLimpo === cleanPhone || leadPhoneLimpo.endsWith(cleanPhone) || cleanPhone.endsWith(leadPhoneLimpo))) {
        return lead;
      }
      if (leadLinkCelularDigits && leadLinkCelularDigits.length >= 8 && (leadLinkCelularDigits === cleanPhone || leadLinkCelularDigits.endsWith(cleanPhone) || cleanPhone.endsWith(leadLinkCelularDigits))) {
        return lead;
      }
    }
  }

  return null;
}

async function handleDuplicateAttempt(existingLead: any, sourceName: string, payloadData: any): Promise<any> {
  const now = new Date().toISOString();
  existingLead.ultima_interacao_em = now;

  // Enrich missing fields if present in new payload
  if (!existingLead.data_casamento && payloadData.data_casamento) {
    existingLead.data_casamento = payloadData.data_casamento;
  }
  if (!existingLead.local && payloadData.local) {
    existingLead.local = payloadData.local;
  }
  if ((!existingLead.link_celular || existingLead.link_celular === "") && (payloadData.link_celular || payloadData.celular || payloadData.whatsapp || payloadData.phone)) {
    const rawPhone = payloadData.link_celular || payloadData.celular || payloadData.whatsapp || payloadData.phone;
    existingLead.link_celular = rawPhone;
    existingLead.telefone_limpo = String(rawPhone).replace(/\D/g, "");
  }

  const emailAttempt = payloadData.email || payloadData.mail || payloadData.email_cliente || existingLead.email || "N/A";
  const phoneAttempt = payloadData.link_celular || payloadData.celular || payloadData.whatsapp || payloadData.phone || payloadData.telefone || existingLead.link_celular || "N/A";

  let detailsText = `Tentativa de recadastro interceptada para evitar duplicidade.\n`;
  detailsText += `Fonte / Origem que tentou recadastrar: ${sourceName}\n`;
  detailsText += `E-mail informado: ${emailAttempt}\n`;
  detailsText += `Telefone informado: ${phoneAttempt}\n`;

  const obs = payloadData.observacoes || payloadData.notes || payloadData.obs || payloadData.comentarios;
  if (obs) {
    detailsText += `Observações recebidas: ${obs}\n`;
    existingLead.observacoes = (existingLead.observacoes ? existingLead.observacoes + "\n\n" : "") + `[Tentativa Recadastro - ${sourceName}]: ${obs}`;
  }

  await addHistoryEntry(existingLead.id, {
    canal: "SISTEMA",
    tipo: "IMPORT",
    titulo: `Tentativa de Recadastro Bloqueada (${sourceName})`,
    detalhes: detailsText
  });

  const updated = await saveLead(existingLead, false);
  return updated;
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
            followup_especial_1m, followup_especial_2m, followup_especial_3m,
            whatsapp_retry_count, whatsapp_retry_stage, email_retry_count, email_retry_stage,
            whatsapp_validation_status, whatsapp_validation_http_code, whatsapp_validation_error, whatsapp_validated_at,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40)
          RETURNING *
        `;
        const values = [
          lead.id, lead.nome, lead.email, lead.link_celular, lead.telefone_limpo, lead.data_casamento, lead.mes_casamento, lead.local, lead.servicos, lead.convidados,
          lead.soma1, lead.soma2, lead.soma3, lead.soma4, lead.soma5, lead.status_funil, lead.etapa_contato, lead.temperatura, lead.tentativas_email || 0, lead.tentativas_whatsapp || 0,
          lead.observacoes, lead.motivo_perda, lead.origem_portal, lead.ultimo_email_em, lead.ultimo_whatsapp_em, lead.ultima_interacao_em, lead.proxima_acao_em,
          lead.followup_especial_1m ? true : false, lead.followup_especial_2m ? true : false, lead.followup_especial_3m ? true : false,
          Number(lead.whatsapp_retry_count) || 0, lead.whatsapp_retry_stage || null, Number(lead.email_retry_count) || 0, lead.email_retry_stage || null,
          lead.whatsapp_validation_status || null, lead.whatsapp_validation_http_code !== undefined ? lead.whatsapp_validation_http_code : null, lead.whatsapp_validation_error || null, lead.whatsapp_validated_at || null,
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
            ultima_interacao_em = $26, proxima_acao_em = $27, followup_especial_1m = $28, followup_especial_2m = $29, followup_especial_3m = $30,
            whatsapp_retry_count = $31, whatsapp_retry_stage = $32, email_retry_count = $33, email_retry_stage = $34,
            whatsapp_validation_status = $35, whatsapp_validation_http_code = $36, whatsapp_validation_error = $37, whatsapp_validated_at = $38,
            updated_at = $39
          WHERE id = $1
          RETURNING *
        `;
        const values = [
          lead.id, lead.nome, lead.email, lead.link_celular, lead.telefone_limpo, lead.data_casamento, lead.mes_casamento, lead.local,
          lead.servicos, lead.convidados, lead.soma1, lead.soma2, lead.soma3, lead.soma4, lead.soma5,
          lead.status_funil, lead.etapa_contato, lead.temperatura, lead.tentativas_email || 0, lead.tentativas_whatsapp || 0,
          lead.observacoes, lead.motivo_perda, lead.origem_portal, lead.ultimo_email_em, lead.ultimo_whatsapp_em,
          lead.ultima_interacao_em, lead.proxima_acao_em,
          lead.followup_especial_1m ? true : false, lead.followup_especial_2m ? true : false, lead.followup_especial_3m ? true : false,
          Number(lead.whatsapp_retry_count) || 0, lead.whatsapp_retry_stage || null, Number(lead.email_retry_count) || 0, lead.email_retry_stage || null,
          lead.whatsapp_validation_status || null, lead.whatsapp_validation_http_code !== undefined ? lead.whatsapp_validation_http_code : null, lead.whatsapp_validation_error || null, lead.whatsapp_validated_at || null,
          lead.updated_at
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

async function remapLeadsFromStage(oldStage: string, newStage: string): Promise<void> {
  if (usePg && pgPool) {
    try {
      await pgPool.query("UPDATE leads SET etapa_contato = $1 WHERE etapa_contato = $2", [newStage, oldStage]);
      return;
    } catch (e: any) {
      console.warn("PostgreSQL lead stage remapping failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      await supabase.from("leads").update({ etapa_contato: newStage }).eq("etapa_contato", oldStage);
      return;
    } catch (e: any) {
      console.warn("Supabase lead stage remapping failed:", e.message);
    }
  }
  // Local JSON DB
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    let updated = false;
    if (db.leads && Array.isArray(db.leads)) {
      db.leads = db.leads.map((l: any) => {
        if (l.etapa_contato === oldStage) {
          updated = true;
          return { ...l, etapa_contato: newStage };
        }
        return l;
      });
    }
    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
  } catch (e: any) {
    console.warn("Local DB lead stage remapping failed:", e.message);
  }
}

async function getWorkflowConfigs(): Promise<any[]> {
  let configs: any[] = [];
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM workflow_config ORDER BY ordem ASC");
      configs = res.rows;
    } catch (e: any) {
      console.warn("PostgreSQL workflow config fetch failed:", e.message);
    }
  } else if (useSupabase) {
    try {
      const { data, error } = await supabase.from("workflow_config").select("*").order("ordem", { ascending: true });
      if (!error && data && data.length > 0) configs = data;
    } catch (e) {}
  }
  
  if (configs.length === 0) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      configs = db.workflow_config || [];
    } catch (e) {
      configs = [];
    }
  }

  // Ensure sorted strictly by ordem
  configs.sort((a: any, b: any) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

  // Dynamically set proxima_etapa based exclusively on the sorted sequence
  return configs.map((stage, idx) => {
    const nextStage = configs[idx + 1];
    return {
      ...stage,
      proxima_etapa: stage.etapa === "ENCERRADO" ? "ENCERRADO" : (nextStage ? nextStage.etapa : "ENCERRADO")
    };
  });
}

async function saveWorkflowConfigs(configs: any[]): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      const stageEtapas = configs.map(c => c.etapa);
      if (stageEtapas.length > 0) {
        await pgPool.query("DELETE FROM workflow_config WHERE etapa NOT IN (" + stageEtapas.map((_, i) => `$${i + 1}`).join(", ") + ")", stageEtapas);
      }
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
      const stageEtapas = configs.map(c => c.etapa);
      if (stageEtapas.length > 0) {
        await supabase.from("workflow_config").delete().not("etapa", "in", `(${stageEtapas.join(",")})`);
      }
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

async function getFinancialContracts(): Promise<any[]> {
  const parseContract = (row: any) => {
    const total = Number(row.total_value) || 0;
    const freight = Number(row.freight_value) || 0;
    const discount = Number(row.discount_value) || 0;
    const finalVal = row.final_value !== null && row.final_value !== undefined 
      ? Number(row.final_value) 
      : Math.max(0, total + freight - discount);
    return {
      ...row,
      total_value: total,
      freight_value: freight,
      discount_value: discount,
      final_value: finalVal,
      down_payment: Number(row.down_payment) || 0
    };
  };

  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM financial_contracts ORDER BY created_at DESC");
      return res.rows.map(parseContract);
    } catch (e: any) {
      console.warn("PostgreSQL contracts fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("financial_contracts").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        return data.map(parseContract);
      }
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.financial_contracts || []).map(parseContract);
}

async function saveFinancialContract(c: any): Promise<boolean> {
  const totalVal = Number(c.total_value) || 0;
  const freightVal = Number(c.freight_value) || 0;
  const discountVal = Number(c.discount_value) || 0;
  const finalVal = c.final_value !== undefined ? Number(c.final_value) : Math.max(0, totalVal + freightVal - discountVal);

  if (usePg && pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO financial_contracts (id, lead_id, contract_number, contract_date, total_value, freight_value, discount_value, final_value, payment_method, installments_count, down_payment, status, observations, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          lead_id = EXCLUDED.lead_id,
          contract_number = EXCLUDED.contract_number,
          contract_date = EXCLUDED.contract_date,
          total_value = EXCLUDED.total_value,
          freight_value = EXCLUDED.freight_value,
          discount_value = EXCLUDED.discount_value,
          final_value = EXCLUDED.final_value,
          payment_method = EXCLUDED.payment_method,
          installments_count = EXCLUDED.installments_count,
          down_payment = EXCLUDED.down_payment,
          status = EXCLUDED.status,
          observations = EXCLUDED.observations,
          updated_at = EXCLUDED.updated_at
      `, [
        c.id,
        c.lead_id,
        c.contract_number,
        c.contract_date,
        totalVal,
        freightVal,
        discountVal,
        finalVal,
        c.payment_method,
        c.installments_count,
        c.down_payment,
        c.status || 'active',
        c.observations || '',
        c.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL contract save failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("financial_contracts").upsert({
        id: c.id,
        lead_id: c.lead_id,
        contract_number: c.contract_number,
        contract_date: c.contract_date,
        total_value: totalVal,
        freight_value: freightVal,
        discount_value: discountVal,
        final_value: finalVal,
        payment_method: c.payment_method,
        installments_count: Number(c.installments_count),
        down_payment: Number(c.down_payment),
        status: c.status || 'active',
        observations: c.observations || '',
        created_at: c.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.financial_contracts) db.financial_contracts = [];
  const idx = db.financial_contracts.findIndex((item: any) => item.id === c.id);
  const now = new Date().toISOString();
  const savedContract = {
    ...c,
    total_value: totalVal,
    freight_value: freightVal,
    discount_value: discountVal,
    final_value: finalVal,
    status: c.status || 'active',
    observations: c.observations || '',
    created_at: c.created_at || now,
    updated_at: now
  };
  if (idx >= 0) {
    db.financial_contracts[idx] = savedContract;
  } else {
    db.financial_contracts.push(savedContract);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

async function deleteFinancialContract(id: string): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query("DELETE FROM financial_contracts WHERE id = $1", [id]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL contract delete failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("financial_contracts").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (db.financial_contracts) {
    db.financial_contracts = db.financial_contracts.filter((c: any) => c.id !== id);
    if (db.financial_installments) {
      db.financial_installments = db.financial_installments.filter((i: any) => i.contract_id !== id);
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  }
  return true;
}

async function getFinancialInstallments(): Promise<any[]> {
  if (usePg && pgPool) {
    try {
      const res = await pgPool.query("SELECT * FROM financial_installments ORDER BY due_date ASC");
      return res.rows.map(row => ({
        ...row,
        installment_number: Number(row.installment_number),
        value: Number(row.value),
        paid_value: row.paid_value ? Number(row.paid_value) : null
      }));
    } catch (e: any) {
      console.warn("PostgreSQL installments fetch failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { data, error } = await supabase.from("financial_installments").select("*").order("due_date", { ascending: true });
      if (!error && data) {
        return data.map(i => ({
          ...i,
          installment_number: Number(i.installment_number),
          value: Number(i.value),
          paid_value: i.paid_value ? Number(i.paid_value) : null
        }));
      }
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  return (db.financial_installments || []).map((i: any) => ({
    ...i,
    installment_number: Number(i.installment_number),
    value: Number(i.value),
    paid_value: i.paid_value ? Number(i.paid_value) : null
  }));
}

async function saveFinancialInstallment(i: any): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO financial_installments (id, contract_id, installment_number, due_date, value, status, paid_date, paid_value, payment_method, payment_observations, receipt_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          contract_id = EXCLUDED.contract_id,
          installment_number = EXCLUDED.installment_number,
          due_date = EXCLUDED.due_date,
          value = EXCLUDED.value,
          status = EXCLUDED.status,
          paid_date = EXCLUDED.paid_date,
          paid_value = EXCLUDED.paid_value,
          payment_method = EXCLUDED.payment_method,
          payment_observations = EXCLUDED.payment_observations,
          receipt_number = EXCLUDED.receipt_number,
          updated_at = EXCLUDED.updated_at
      `, [
        i.id,
        i.contract_id,
        i.installment_number,
        i.due_date,
        i.value,
        i.status || 'pending',
        i.paid_date || null,
        i.paid_value || null,
        i.payment_method || null,
        i.payment_observations || null,
        i.receipt_number || null,
        i.created_at || new Date().toISOString(),
        new Date().toISOString()
      ]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL installment save failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("financial_installments").upsert({
        id: i.id,
        contract_id: i.contract_id,
        installment_number: Number(i.installment_number),
        due_date: i.due_date,
        value: Number(i.value),
        status: i.status || 'pending',
        paid_date: i.paid_date || null,
        paid_value: i.paid_value !== undefined && i.paid_value !== null ? Number(i.paid_value) : null,
        payment_method: i.payment_method || null,
        payment_observations: i.payment_observations || null,
        receipt_number: i.receipt_number || null,
        created_at: i.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.financial_installments) db.financial_installments = [];
  const idx = db.financial_installments.findIndex((item: any) => item.id === i.id);
  const now = new Date().toISOString();
  const savedInstallment = {
    ...i,
    status: i.status || 'pending',
    created_at: i.created_at || now,
    updated_at: now
  };
  if (idx >= 0) {
    db.financial_installments[idx] = savedInstallment;
  } else {
    db.financial_installments.push(savedInstallment);
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return true;
}

async function deleteFinancialInstallmentsByContract(contractId: string): Promise<boolean> {
  if (usePg && pgPool) {
    try {
      await pgPool.query("DELETE FROM financial_installments WHERE contract_id = $1", [contractId]);
      return true;
    } catch (e: any) {
      console.warn("PostgreSQL installments delete failed:", e.message);
    }
  }
  if (useSupabase) {
    try {
      const { error } = await supabase.from("financial_installments").delete().eq("contract_id", contractId);
      if (!error) return true;
    } catch (e) {}
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (db.financial_installments) {
    db.financial_installments = db.financial_installments.filter((i: any) => i.contract_id !== contractId);
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
        },
        redis_lock: {
          enabled: false,
          host: "127.0.0.1",
          port: 6379,
          username: "",
          password: "",
          use_ssl: false,
          key_template: "pausa:{chatId}",
          value_template: "bloqueado",
          expire: true,
          ttl: 86400
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    settings = db.general_settings;
  }

  // Ensure dynamic options lists are initialized
  let updated = false;
  if (!settings.redis_lock) {
    settings.redis_lock = {
      enabled: false,
      host: "127.0.0.1",
      port: 6379,
      username: "",
      password: "",
      use_ssl: false,
      key_template: "pausa:{chatId}",
      value_template: "bloqueado",
      expire: true,
      ttl: 86400
    };
    updated = true;
  }
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
      bcc: "paulocoala@gmail.com",
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

async function saveRedisLock(chatId: string, customConfig?: any, messageText?: string): Promise<{ success: boolean; log: string }> {
  try {
    let settings = customConfig || await getGeneralSettings();
    if (customConfig && !customConfig.redis_lock) {
      const dbSettings = await getGeneralSettings();
      settings = { ...dbSettings, ...customConfig };
    }
    if (!settings || !settings.redis_lock || !settings.redis_lock.enabled) {
      return { success: true, log: "Redis lock não está ativado ou configurado." };
    }

    const conf = settings.redis_lock;
    if (!conf.host || !conf.port) {
      return { success: false, log: "Host ou Porta do Redis não configurados." };
    }

    const redisOptions: any = {
      host: conf.host,
      port: Number(conf.port),
      username: conf.username || undefined,
      password: conf.password || undefined,
      connectTimeout: 4000,
      maxRetriesPerRequest: 1,
    };

    if (conf.use_ssl) {
      redisOptions.tls = {};
    }

    const redis = new Redis(redisOptions);

    const rawKey = conf.key_template || "pausa:{chatId}";
    const rawValue = conf.value_template || "bloqueado";
    
    let key = rawKey
      .replace(/\{\{\s*\$json\.chatId\s*\}\}/g, chatId)
      .replace(/\{\{\s*chatId\s*\}\}/g, chatId)
      .replace(/\{chatId\}/g, chatId);
    
    let value = rawValue
      .replace(/\{\{\s*\$json\.humanReason\s*\|\|\s*'([^']+)'\s*\}\}/g, "$1")
      .replace(/\{\{\s*\$json\.humanReason\s*\}\}/g, "crm_leads")
      .replace(/\{\{\s*humanReason\s*\}\}/g, "crm_leads")
      .replace(/\{humanReason\}/g, "crm_leads");

    // Bloqueia respostas da IA por exatamente 30 minutos (1800 segundos) para mensagens enviadas por esta aplicação CRM
    const lockTtl = conf.expire === false ? 0 : 1800; // 30 minutos (1800s)

    if (lockTtl > 0) {
      await redis.set(key, value, "EX", lockTtl);
    } else {
      await redis.set(key, value);
    }

    let logMessage = `[Redis] Trava de IA "${key}" gravada por 30 min (1800s)! Valor: "${value}"`;

    // Retenção da mensagem enviada para contextualização da IA quando o lead entrar em contato (pause_log:{chatId})
    if (messageText && messageText.trim()) {
      const logKey = `pause_log:${chatId}`;
      let historico: any[] = [];
      try {
        const rawLog = await redis.get(logKey);
        if (rawLog && rawLog.trim().startsWith("[")) {
          historico = JSON.parse(rawLog);
        }
      } catch {
        historico = [];
      }

      if (!Array.isArray(historico)) historico = [];

      const newPauseEntry = {
        ts: new Date().toISOString(),
        role: "humano_lu",
        fromMe: true,
        actorName: "CRM Casa Colombo",
        text: messageText.trim(),
        tipoMedia: "",
        origem: "crm",
        pauseReason: value || "crm_leads"
      };

      historico.push(newPauseEntry);
      historico = historico.slice(-30);

      // Salva o histórico com TTL de 3 dias (259200s) mantendo a retenção mesmo após a expiração dos 30m de trava
      await redis.set(logKey, JSON.stringify(historico), "EX", 259200);
      logMessage += ` | Mensagem retida em "${logKey}" para contextualização da IA`;
    }

    await redis.quit();
    return {
      success: true,
      log: logMessage
    };
  } catch (err: any) {
    console.error("Erro ao gravar no Redis:", err.message);
    return {
      success: false,
      log: `[Redis] Erro ao gravar chave: ${err.message}`
    };
  }
}

export interface WhatsAppValidationResult {
  isValid: boolean;
  code: "ENVIADO_SUCESSO" | "NUMERO_SEM_WHATSAPP" | "ERRO_TEMPORARIO_WAHA" | "ERRO_COMUNICACAO";
  httpCode: number;
  errorMessage: string | null;
  validatedAt: string;
}

async function checkWhatsAppNumberExists(phone: string, settings?: any): Promise<WhatsAppValidationResult> {
  const validatedAt = new Date().toISOString();
  
  let cleanPhone = (phone || "").replace(/\D/g, "");
  if (!cleanPhone) {
    return {
      isValid: false,
      code: "NUMERO_SEM_WHATSAPP",
      httpCode: 400,
      errorMessage: "Telefone do lead está vazio ou inválido",
      validatedAt
    };
  }

  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = "55" + cleanPhone;
  }

  const wahaConf = settings?.waha_whatsapp;
  if (!wahaConf || !wahaConf.api_url) {
    return {
      isValid: false,
      code: "ERRO_COMUNICACAO",
      httpCode: 0,
      errorMessage: "URL da API do WAHA não configurada",
      validatedAt
    };
  }

  const session = wahaConf.session_name || "default";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (wahaConf.api_key) {
    headers["X-Api-Key"] = wahaConf.api_key;
  }

  const endpoints = [
    { url: `${wahaConf.api_url}/api/contacts/check-exists?phone=${cleanPhone}&session=${session}`, method: "GET" },
    { url: `${wahaConf.api_url}/api/checkNumberStatus?phone=${cleanPhone}&session=${session}`, method: "GET" },
    { url: `${wahaConf.api_url}/api/contacts/check-exists`, method: "POST", body: { phone: cleanPhone, session } }
  ];

  let lastStatus = 0;
  let lastErrorMsg = "";

  for (const ep of endpoints) {
    try {
      const options: any = {
        method: ep.method,
        headers,
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(6000) : undefined
      };
      if (ep.body) {
        options.body = JSON.stringify(ep.body);
      }

      const res = await fetch(ep.url, options);
      lastStatus = res.status;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const numberExists = data.numberExists !== undefined 
          ? Boolean(data.numberExists) 
          : (data.exists !== undefined ? Boolean(data.exists) : Boolean(data.chatId && !data.error));

        if (numberExists) {
          return {
            isValid: true,
            code: "ENVIADO_SUCESSO",
            httpCode: res.status,
            errorMessage: null,
            validatedAt
          };
        } else {
          return {
            isValid: false,
            code: "NUMERO_SEM_WHATSAPP",
            httpCode: res.status,
            errorMessage: `[WAHA ${res.status}] O número ${cleanPhone} não possui conta ativa no WhatsApp`,
            validatedAt
          };
        }
      }

      const text = await res.text().catch(() => "");
      lastErrorMsg = text || `HTTP Status ${res.status}`;

      if ((res.status === 404 || res.status === 400) && (text.toLowerCase().includes("not found") || text.toLowerCase().includes("number_not_exists") || text.toLowerCase().includes("false"))) {
        return {
          isValid: false,
          code: "NUMERO_SEM_WHATSAPP",
          httpCode: res.status,
          errorMessage: `[WAHA ${res.status}] ${text || "Número inexistente no WhatsApp"}`,
          validatedAt
        };
      }

      if (res.status >= 500 || res.status === 401 || res.status === 403 || res.status === 408) {
        return {
          isValid: false,
          code: "ERRO_TEMPORARIO_WAHA",
          httpCode: res.status,
          errorMessage: `[WAHA HTTP ${res.status}] ${text || "Erro temporário no servidor WAHA / Sessão desconectada"}`,
          validatedAt
        };
      }
    } catch (err: any) {
      const isTimeout = err.name === "AbortError" || err.message.toLowerCase().includes("timeout");
      if (isTimeout) {
        return {
          isValid: false,
          code: "ERRO_TEMPORARIO_WAHA",
          httpCode: 408,
          errorMessage: `[WAHA Timeout] Conexão excedeu o tempo limite de resposta: ${err.message}`,
          validatedAt
        };
      }
      return {
        isValid: false,
        code: "ERRO_COMUNICACAO",
        httpCode: 0,
        errorMessage: `[Erro Comunicação] Não foi possível conectar ao WAHA: ${err.message}`,
        validatedAt
      };
    }
  }

  return {
    isValid: false,
    code: lastStatus >= 500 ? "ERRO_TEMPORARIO_WAHA" : "ERRO_COMUNICACAO",
    httpCode: lastStatus,
    errorMessage: `[WAHA HTTP ${lastStatus}] ${lastErrorMsg || "Falha nas tentativas de verificação de número"}`,
    validatedAt
  };
}

async function dispatchWhatsAppMessage(
  phone: string, 
  message: string, 
  customConfig?: any
): Promise<{ 
  success: boolean; 
  log: string;
  code: "ENVIADO_SUCESSO" | "NUMERO_SEM_WHATSAPP" | "ERRO_TEMPORARIO_WAHA" | "ERRO_COMUNICACAO";
  httpCode: number;
  errorMessage: string | null;
  validatedAt: string;
}> {
  const validatedAt = new Date().toISOString();
  try {
    let settings = customConfig || await getGeneralSettings();
    if (customConfig && !customConfig.redis_lock) {
      const dbSettings = await getGeneralSettings();
      settings = { ...dbSettings, ...customConfig };
    }
    if (!settings || !settings.waha_whatsapp) {
      return { 
        success: false, 
        log: "Configurações do WAHA não encontradas no banco.",
        code: "ERRO_COMUNICACAO",
        httpCode: 0,
        errorMessage: "Configurações do WAHA ausentes no banco",
        validatedAt
      };
    }

    const wahaConf = settings.waha_whatsapp;
    if (!wahaConf.api_url) {
      return { 
        success: false, 
        log: "URL da API do WAHA não configurada.",
        code: "ERRO_COMUNICACAO",
        httpCode: 0,
        errorMessage: "URL da API do WAHA não configurada",
        validatedAt
      };
    }

    // 1. Validação prévia da existência do número no WhatsApp antes de disparar /api/sendText
    const validation = await checkWhatsAppNumberExists(phone, settings);

    if (validation.code === "NUMERO_SEM_WHATSAPP") {
      return {
        success: false,
        log: `[NÚMERO SEM WHATSAPP] Validação WAHA cancelou o envio. O número ${phone} não possui conta ativa no WhatsApp.`,
        code: "NUMERO_SEM_WHATSAPP",
        httpCode: validation.httpCode,
        errorMessage: validation.errorMessage,
        validatedAt: validation.validatedAt
      };
    }

    if (!validation.isValid) {
      return {
        success: false,
        log: `[FALHA VALIDAÇÃO WAHA] ${validation.errorMessage}`,
        code: validation.code,
        httpCode: validation.httpCode,
        errorMessage: validation.errorMessage,
        validatedAt: validation.validatedAt
      };
    }

    // 2. Número existe no WhatsApp: realizar o envio da mensagem
    let cleanPhone = (phone || "").replace(/\D/g, "");
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
      let redisLog = "";
      try {
        const redisRes = await saveRedisLock(chatId, settings, message);
        if (settings.redis_lock && settings.redis_lock.enabled) {
          redisLog = ` ${redisRes.log}`;
        }
      } catch (redisErr: any) {
        redisLog = ` [Aviso Redis] Falha: ${redisErr.message}`;
      }

      return { 
        success: true, 
        log: `[SUCESSO WAHA] Mensagem de WhatsApp enviada com sucesso para ${chatId}!${redisLog}`,
        code: "ENVIADO_SUCESSO",
        httpCode: res.status,
        errorMessage: null,
        validatedAt: validation.validatedAt
      };
    } else {
      const responseText = await res.text().catch(() => "");
      const is5xx = res.status >= 500 || res.status === 401 || res.status === 403 || res.status === 408;
      const code = is5xx ? "ERRO_TEMPORARIO_WAHA" : "ERRO_COMUNICACAO";
      return { 
        success: false, 
        log: `[FALHA WAHA] O gateway WAHA retornou status HTTP ${res.status}. Detalhes: ${responseText || "Sem detalhes"}`,
        code,
        httpCode: res.status,
        errorMessage: responseText || `HTTP Status ${res.status}`,
        validatedAt: validation.validatedAt
      };
    }
  } catch (err: any) {
    console.error("Erro ao disparar WAHA real:", err.message);
    const isTimeout = err.name === "AbortError" || err.message.toLowerCase().includes("timeout");
    return { 
      success: false, 
      log: `[FALHA WAHA] Erro ao conectar ao gateway em ${phone}: ${err.message}`,
      code: isTimeout ? "ERRO_TEMPORARIO_WAHA" : "ERRO_COMUNICACAO",
      httpCode: isTimeout ? 408 : 0,
      errorMessage: err.message,
      validatedAt
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

    // Check duplicate lead by email or phone
    const existing = await findDuplicateLead(email, link_celular);
    if (existing) {
      const sourceName = origem_portal || "Manual (CRM)";
      const updated = await handleDuplicateAttempt(existing, sourceName, req.body);
      return res.status(200).json({
        ...updated,
        duplicate: true,
        message: `Lead já cadastrado previamente! Tentativa registrada no histórico de "${existing.nome}".`
      });
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

    // Roda a sequência de número 1 do fluxo imediatamente para o novo lead criado manualmente
    await runAutomationForNewWebhookLead(saved);

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

  const leadMes = lead.mes_casamento || lead.mesCasamento || "breve";

  return text
    .replace(/\{\{nome\}\}/gi, lead.nome || "")
    .replace(/\{nome\}/gi, lead.nome || "")
    .replace(/\{\{email\}\}/gi, lead.email || "")
    .replace(/\{email\}/gi, lead.email || "")
    .replace(/\{\{local\}\}/gi, lead.local || "")
    .replace(/\{local\}/gi, lead.local || "")
    .replace(/\{\{data_casamento\}\}/gi, lead.data_casamento || "")
    .replace(/\{data_casamento\}/gi, lead.data_casamento || "")
    .replace(/\{\{mes_casamento\}\}/gi, leadMes)
    .replace(/\{mes_casamento\}/gi, leadMes)
    .replace(/\{\{mesCasamento\}\}/gi, leadMes)
    .replace(/\{mesCasamento\}/gi, leadMes)
    .replace(/\{\{convidados\}\}/gi, String(lead.convidados || 0))
    .replace(/\{convidados\}/gi, String(lead.convidados || 0))
    .replace(/\{\{status\}\}/gi, lead.status_funil || "")
    .replace(/\{status\}/gi, lead.status_funil || "")
    .replace(/\{\{temperatura\}\}/gi, lead.temperatura || "")
    .replace(/\{temperatura\}/gi, lead.temperatura || "")
    .replace(/\{\{dias_casamento\}\}/gi, diasRestantesStr)
    .replace(/\{dias_casamento\}/gi, diasRestantesStr);
}

// API - Send custom / special follow-up or broadcast message to Lead
app.post("/api/leads/:id/send-message", async (req, res) => {
  try {
    const { canal, mensagem, assunto, titulo_historico, followup_cohort } = req.body;
    if (!canal || !mensagem) {
      return res.status(400).json({ error: "canal and mensagem are required" });
    }

    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Reject message sending for lost or closed leads
    const statusUpperCheck = String(lead.status_funil || "").toUpperCase();
    if (
      statusUpperCheck === "PERDIDO" ||
      statusUpperCheck === "SEM_RETORNO" ||
      lead.status_funil === "Perdido" ||
      lead.status_funil === "Sem Retorno" ||
      lead.status_funil === "Sem WhatsApp" ||
      (lead.motivo_perda && lead.motivo_perda.trim() !== "" && lead.motivo_perda !== "AGUARDANDO_DATA")
    ) {
      return res.status(400).json({ error: `Envio de mensagem cancelado: O lead está com status do funil '${lead.status_funil}'.` });
    }

    // Substitute variables
    const finalSubject = substituteVariables(assunto || "", lead);
    const finalBody = substituteVariables(mensagem, lead);

    let updatedLead = { ...lead };
    
    // Set followup special marks
    if (followup_cohort === "oneMonth") {
      updatedLead.followup_especial_1m = true;
    } else if (followup_cohort === "twoMonths") {
      updatedLead.followup_especial_2m = true;
    } else if (followup_cohort === "threeMonths") {
      updatedLead.followup_especial_3m = true;
    }

    let dispatchStatus = "";

    if (canal === "WHATSAPP") {
      updatedLead.tentativas_whatsapp = (Number(lead.tentativas_whatsapp) || 0) + 1;
      updatedLead.ultimo_whatsapp_em = new Date().toISOString();
      
      const dispatchResult = await dispatchWhatsAppMessage(lead.link_celular, finalBody);
      dispatchStatus = dispatchResult.log;

      updatedLead.whatsapp_validation_status = dispatchResult.code;
      updatedLead.whatsapp_validation_http_code = dispatchResult.httpCode;
      updatedLead.whatsapp_validation_error = dispatchResult.errorMessage;
      updatedLead.whatsapp_validated_at = dispatchResult.validatedAt;

      if (dispatchResult.code === "NUMERO_SEM_WHATSAPP") {
        updatedLead.status_funil = "Sem WhatsApp";
        updatedLead.etapa_contato = "Sem WhatsApp";

        await addHistoryEntry(lead.id, {
          canal: "WHATSAPP",
          tipo: "ENVIO",
          titulo: "Número sem WhatsApp",
          detalhes: `Envio não realizado. Motivo: Número sem WhatsApp<br/>
            <small style="color: #ef4444; font-family: monospace;">
              • Código Interno: NUMERO_SEM_WHATSAPP<br/>
              • Status HTTP: ${dispatchResult.httpCode}<br/>
              • Validado em: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}<br/>
              • Detalhes do WAHA: ${dispatchResult.errorMessage || "O número não possui conta ativa no WhatsApp"}
            </small>`
        });
      } else if (!dispatchResult.success) {
        const rotuloErro = dispatchResult.code === "ERRO_TEMPORARIO_WAHA" ? "Erro Temporário (WAHA)" : "Erro de Comunicação";
        await addHistoryEntry(lead.id, {
          canal: "WHATSAPP",
          tipo: "ENVIO",
          titulo: `Falha de Envio: ${rotuloErro}`,
          detalhes: `${finalBody}<br/><br/>
            <small style="color: #f59e0b; font-family: monospace;">
              ⚠️ ${rotuloErro}<br/>
              • Código Interno: ${dispatchResult.code}<br/>
              • Status HTTP: ${dispatchResult.httpCode}<br/>
              • Validado em: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}<br/>
              • Detalhes do WAHA: ${dispatchResult.errorMessage || dispatchStatus}
            </small>`
        });
      } else {
        await addHistoryEntry(lead.id, {
          canal: "WHATSAPP",
          tipo: "ENVIO",
          titulo: titulo_historico || "Mensagem Especial WhatsApp",
          detalhes: `${finalBody}<br/><br/>
            <small style="color: #10b981; font-family: monospace;">
              🚀 Mensagem enviada com sucesso!<br/>
              • Código Interno: ENVIADO_SUCESSO<br/>
              • Status HTTP: ${dispatchResult.httpCode}<br/>
              • Validado e Enviado em: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}
            </small>`
        });
      }
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
      // 1. Fetch old configs to detect deletions
      const oldConfigs = await getWorkflowConfigs();
      
      // 2. Perform remapping of leads from deleted stages
      const newEtapas = new Set(payload.map((c: any) => c.etapa));
      const deletedConfigs = oldConfigs.filter((c: any) => !newEtapas.has(c.etapa));
      
      for (const deleted of deletedConfigs) {
        // Find the next stage in payload with the closest higher order
        const candidates = payload
          .filter((c: any) => (Number(c.ordem) || 0) > (Number(deleted.ordem) || 0))
          .sort((a: any, b: any) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
        
        const nextStageForLeads = candidates.length > 0 ? candidates[0].etapa : "ENCERRADO";
        console.log(`[Remap Stage] Remapping leads in deleted stage "${deleted.etapa}" to next stage "${nextStageForLeads}"`);
        await remapLeadsFromStage(deleted.etapa, nextStageForLeads);
      }

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

      if (lead) {
        compiledBody = await compileTemplate(compiledBody, lead);
        log(`[TEST COMPILE] Texto compilado com sucesso.`);
      }

      const resWa = await dispatchWhatsAppMessage(test_whatsapp_recipient, compiledBody, config);
      log(`[WAHA TEST SEND] Resultado do envio de texto: ${resWa.log}`);
      let allSuccess = resWa.success;

      return res.json({ success: allSuccess, logs });
    }

    if (action === "test_redis") {
      log(`[REDIS TEST] Iniciando teste de conexão e gravação no Redis...`);
      const redisConf = config.redis_lock;
      if (!redisConf || !redisConf.host || !redisConf.port) {
        log("[REDIS TEST] [ERRO] Host ou Porta do Redis não informados.");
        return res.json({ success: false, logs });
      }

      try {
        const redisOptions: any = {
          host: redisConf.host,
          port: Number(redisConf.port),
          username: redisConf.username || undefined,
          password: redisConf.password || undefined,
          connectTimeout: 4000,
          maxRetriesPerRequest: 1,
        };

        if (redisConf.use_ssl) {
          redisOptions.tls = {};
        }

        log(`[REDIS TEST] Conectando a ${redisConf.host}:${redisConf.port}${redisConf.use_ssl ? " (SSL)" : ""}...`);
        const redisClient = new Redis(redisOptions);

        const testChatId = "5511999999999@c.us";
        const rawKey = redisConf.key_template || "pausa:{chatId}";
        const rawValue = redisConf.value_template || "bloqueado";

        let key = rawKey
          .replace(/\{\{\s*\$json\.chatId\s*\}\}/g, testChatId)
          .replace(/\{\{\s*chatId\s*\}\}/g, testChatId)
          .replace(/\{chatId\}/g, testChatId);

        let value = rawValue
          .replace(/\{\{\s*\$json\.humanReason\s*\|\|\s*'([^']+)'\s*\}\}/g, "$1")
          .replace(/\{\{\s*\$json\.humanReason\s*\}\}/g, "bloqueado")
          .replace(/\{\{\s*humanReason\s*\}\}/g, "bloqueado")
          .replace(/\{humanReason\}/g, "bloqueado");

        log(`[REDIS TEST] Gravando chave de trava de IA "${key}" com valor "${value}" por 30 minutos (1800s)...`);
        await redisClient.set(key, value, "EX", 1800);
        log(`[REDIS TEST] [OK] Trava da IA gravada com sucesso! (TTL: 1800s / 30m)`);

        const testLogKey = `pause_log:${testChatId}`;
        log(`[REDIS TEST] Gravando histórico de contextualização da IA em "${testLogKey}"...`);
        const testLogEntry = [{
          ts: new Date().toISOString(),
          role: "humano_lu",
          fromMe: true,
          actorName: "CRM Casa Colombo",
          text: "Teste de retenção e contextualização de mensagem enviada pelo CRM",
          tipoMedia: "",
          origem: "crm",
          pauseReason: value || "crm_leads"
        }];
        await redisClient.set(testLogKey, JSON.stringify(testLogEntry), "EX", 259200);
        log(`[REDIS TEST] [OK] Histórico de contextualização gravado com sucesso! (TTL: 259200s / 3 dias)`);

        await redisClient.quit();
        log(`[REDIS TEST] Conexão e gravação encerradas com sucesso.`);
        return res.json({ success: true, logs });
      } catch (redisErr: any) {
        log(`[REDIS TEST] [ERRO] Falha ao testar conexão/gravação: ${redisErr.message}`);
        return res.json({ success: false, logs });
      }
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

    // 4. Test Redis Connectivity (if enabled)
    if (config.redis_lock && config.redis_lock.enabled) {
      const redisConf = config.redis_lock;
      log(`[REDIS] Testando Conexão e Gravação com Redis: host=${redisConf.host}, port=${redisConf.port}...`);
      if (!redisConf.host || !redisConf.port) {
        log("[REDIS] [AVISO] Host ou Porta do Redis não configurados.");
      } else {
        try {
          const redisOptions: any = {
            host: redisConf.host,
            port: Number(redisConf.port),
            username: redisConf.username || undefined,
            password: redisConf.password || undefined,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
          };

          if (redisConf.use_ssl) {
            redisOptions.tls = {};
          }

          const redisClient = new Redis(redisOptions);
          await redisClient.ping();
          log("[REDIS] [OK] Conexão com Redis estabelecida com sucesso via PING!");
          await redisClient.quit();
        } catch (redisErr: any) {
          log(`[REDIS] [ERRO] Falha de conexão/autenticação Redis: ${redisErr.message}`);
          success = false;
        }
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

// Helper to add days to ISO string date
function addDaysHelper(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// API - Get Financial Contracts
app.get("/api/financial/contracts", async (req, res) => {
  try {
    const contracts = await getFinancialContracts();
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Get Financial Installments
app.get("/api/financial/installments", async (req, res) => {
  try {
    const installments = await getFinancialInstallments();
    res.json(installments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Create Financial Contract
app.post("/api/financial/contracts", async (req, res) => {
  try {
    const {
      lead_id,
      contract_number,
      contract_date,
      total_value,
      freight_value,
      discount_value,
      payment_method,
      installments_count,
      down_payment,
      observations
    } = req.body;

    if (!lead_id || !contract_date || total_value === undefined || !payment_method) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Verify duplicate contracts for active lead
    const existingContracts = await getFinancialContracts();
    const duplicate = existingContracts.find(
      c => c.lead_id === lead_id && c.status === "active"
    );
    if (duplicate) {
      return res.status(400).json({ error: "Este lead já possui um contrato ativo no sistema." });
    }

    const contractId = "con_" + Math.random().toString(36).substring(2, 11);
    let nextContractNo = 201;
    existingContracts.forEach(c => {
      if (c.contract_number) {
        const numStr = c.contract_number.replace(/\D/g, "");
        if (numStr) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num >= nextContractNo) {
            nextContractNo = num + 1;
          }
        }
      }
    });
    const generatedContractNumber = contract_number || `CTR-${nextContractNo}`;

    const totalVal = Number(total_value) || 0;
    const freightVal = Number(freight_value || 0);
    const discountVal = Number(discount_value || 0);
    const finalVal = Math.max(0, totalVal + freightVal - discountVal);

    const newContract = {
      id: contractId,
      lead_id,
      contract_number: generatedContractNumber,
      contract_date,
      total_value: totalVal,
      freight_value: freightVal,
      discount_value: discountVal,
      final_value: finalVal,
      payment_method,
      installments_count: payment_method === "a_vista" ? 1 : Number(installments_count || 1),
      down_payment: Number(down_payment || 0),
      status: "active",
      observations: observations || "",
      created_at: new Date().toISOString()
    };

    await saveFinancialContract(newContract);

    // Generate installments
    if (payment_method === "a_vista") {
      const instId = "ins_" + Math.random().toString(36).substring(2, 11);
      const installment = {
        id: instId,
        contract_id: contractId,
        installment_number: 1,
        due_date: addDaysHelper(contract_date, 30),
        value: finalVal,
        status: "pending",
        paid_date: null,
        paid_value: null,
        payment_method: null,
        payment_observations: null,
        receipt_number: null,
        created_at: new Date().toISOString()
      };
      await saveFinancialInstallment(installment);
    } else {
      // Parcelado
      const installmentsNum = Number(installments_count || 2);
      const downPaymentVal = Number(down_payment || 0);
      const remainingValue = finalVal - downPaymentVal;
      const installmentVal = Number((remainingValue / installmentsNum).toFixed(2));

      // 1. If there's down payment, create a paid installment number 0
      if (downPaymentVal > 0) {
        const instId = "ins_" + Math.random().toString(36).substring(2, 11);
        
        // Let's generate a unique receipt number for the down payment immediately
        const existingInstallments = await getFinancialInstallments();
        const nextReceiptNo = Math.max(100, existingInstallments.reduce((max, inst) => {
          if (inst.receipt_number && inst.receipt_number.startsWith("REC-")) {
            const num = parseInt(inst.receipt_number.replace("REC-", ""), 10);
            if (!isNaN(num) && num > max) return num;
          }
          return max;
        }, 0)) + 1;
        const receipt_number = `REC-${String(nextReceiptNo).padStart(6, '0')}`;

        const downInstallment = {
          id: instId,
          contract_id: contractId,
          installment_number: 0,
          due_date: contract_date,
          value: downPaymentVal,
          status: "paid",
          paid_date: contract_date,
          paid_value: downPaymentVal,
          payment_method: "Pix", // Default entry payment method
          payment_observations: "Entrada paga no ato do contrato",
          receipt_number,
          created_at: new Date().toISOString()
        };
        await saveFinancialInstallment(downInstallment);
      }

      // 2. Generate subsequent installments
      for (let i = 1; i <= installmentsNum; i++) {
        const instId = "ins_" + Math.random().toString(36).substring(2, 11);
        let currentVal = installmentVal;
        
        // Handle rounding difference on the last installment
        if (i === installmentsNum) {
          const checkSum = installmentVal * (installmentsNum - 1);
          currentVal = Number((remainingValue - checkSum).toFixed(2));
        }

        const installment = {
          id: instId,
          contract_id: contractId,
          installment_number: i,
          due_date: addDaysHelper(contract_date, 30 * i),
          value: currentVal,
          status: "pending",
          paid_date: null,
          paid_value: null,
          payment_method: null,
          payment_observations: null,
          receipt_number: null,
          created_at: new Date().toISOString()
        };
        await saveFinancialInstallment(installment);
      }
    }

    res.status(201).json({ success: true, contract: newContract });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Update/Edit Financial Contract (Allowed only if no installments are paid)
app.put("/api/financial/contracts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contract_number,
      contract_date,
      total_value,
      freight_value,
      discount_value,
      payment_method,
      installments_count,
      down_payment,
      observations
    } = req.body;

    // Check if contract exists
    const contracts = await getFinancialContracts();
    const existing = contracts.find(c => c.id === id);
    if (!existing) {
      return res.status(404).json({ error: "Contrato não encontrado." });
    }

    // Check if there are paid installments
    const installments = await getFinancialInstallments();
    const contractInstallments = installments.filter(inst => inst.contract_id === id);
    const paidInstallments = contractInstallments.filter(inst => inst.status === "paid" && inst.installment_number > 0);

    if (paidInstallments.length > 0) {
      return res.status(400).json({ error: "Não é possível editar este contrato pois já existem parcelas pagas." });
    }

    // Delete old installments
    await deleteFinancialInstallmentsByContract(id);

    const totalVal = total_value !== undefined ? Number(total_value) : existing.total_value;
    const freightVal = freight_value !== undefined ? Number(freight_value) : (existing.freight_value || 0);
    const discountVal = discount_value !== undefined ? Number(discount_value) : (existing.discount_value || 0);
    const finalVal = Math.max(0, totalVal + freightVal - discountVal);

    const updatedContract = {
      ...existing,
      contract_number: contract_number || existing.contract_number,
      contract_date: contract_date || existing.contract_date,
      total_value: totalVal,
      freight_value: freightVal,
      discount_value: discountVal,
      final_value: finalVal,
      payment_method: payment_method || existing.payment_method,
      installments_count: payment_method === "a_vista" ? 1 : Number(installments_count || existing.installments_count || 1),
      down_payment: down_payment !== undefined ? Number(down_payment) : existing.down_payment,
      observations: observations !== undefined ? observations : existing.observations,
      updated_at: new Date().toISOString()
    };

    await saveFinancialContract(updatedContract);

    // Regenerate installments
    const finalDate = updatedContract.contract_date;
    const finalMethod = updatedContract.payment_method;

    if (finalMethod === "a_vista") {
      const instId = "ins_" + Math.random().toString(36).substring(2, 11);
      const installment = {
        id: instId,
        contract_id: id,
        installment_number: 1,
        due_date: addDaysHelper(finalDate, 30),
        value: finalVal,
        status: "pending",
        paid_date: null,
        paid_value: null,
        payment_method: null,
        payment_observations: null,
        receipt_number: null,
        created_at: new Date().toISOString()
      };
      await saveFinancialInstallment(installment);
    } else {
      const finalCount = Number(updatedContract.installments_count || 2);
      const finalDown = Number(updatedContract.down_payment || 0);
      const remainingValue = finalVal - finalDown;
      const installmentVal = Number((remainingValue / finalCount).toFixed(2));

      if (finalDown > 0) {
        const instId = "ins_" + Math.random().toString(36).substring(2, 11);
        
        const existingInstallments = await getFinancialInstallments();
        const nextReceiptNo = Math.max(100, existingInstallments.reduce((max, inst) => {
          if (inst.receipt_number && inst.receipt_number.startsWith("REC-")) {
            const num = parseInt(inst.receipt_number.replace("REC-", ""), 10);
            if (!isNaN(num) && num > max) return num;
          }
          return max;
        }, 0)) + 1;
        const receipt_number = `REC-${String(nextReceiptNo).padStart(6, '0')}`;

        const downInstallment = {
          id: instId,
          contract_id: id,
          installment_number: 0,
          due_date: finalDate,
          value: finalDown,
          status: "paid",
          paid_date: finalDate,
          paid_value: finalDown,
          payment_method: "Pix",
          payment_observations: "Entrada re-gerada na edição do contrato",
          receipt_number,
          created_at: new Date().toISOString()
        };
        await saveFinancialInstallment(downInstallment);
      }

      for (let i = 1; i <= finalCount; i++) {
        const instId = "ins_" + Math.random().toString(36).substring(2, 11);
        let currentVal = installmentVal;

        if (i === finalCount) {
          const checkSum = installmentVal * (finalCount - 1);
          currentVal = Number((remainingValue - checkSum).toFixed(2));
        }

        const installment = {
          id: instId,
          contract_id: id,
          installment_number: i,
          due_date: addDaysHelper(finalDate, 30 * i),
          value: currentVal,
          status: "pending",
          paid_date: null,
          paid_value: null,
          payment_method: null,
          payment_observations: null,
          receipt_number: null,
          created_at: new Date().toISOString()
        };
        await saveFinancialInstallment(installment);
      }
    }

    res.json({ success: true, contract: updatedContract });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Delete Financial Contract (Block if any installment is paid)
app.delete("/api/financial/contracts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const installments = await getFinancialInstallments();
    const contractInstallments = installments.filter(inst => inst.contract_id === id);
    const paidInstallments = contractInstallments.filter(inst => inst.status === "paid");

    if (paidInstallments.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir este contrato pois já existem parcelas pagas." });
    }

    await deleteFinancialContract(id);
    res.json({ success: true, message: "Contrato e parcelas removidos com sucesso." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API - Give Low/Pay Financial Installment ("Dar Baixa")
app.post("/api/financial/installments/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    const { paid_date, paid_value, payment_method, payment_observations } = req.body;

    if (!paid_date || paid_value === undefined || !payment_method) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const installments = await getFinancialInstallments();
    const idx = installments.findIndex(inst => inst.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: "Parcela não encontrada." });
    }

    const installment = installments[idx];

    // Generate unique sequential receipt number
    const nextReceiptNo = Math.max(100, installments.reduce((max, inst) => {
      if (inst.receipt_number && inst.receipt_number.startsWith("REC-")) {
        const num = parseInt(inst.receipt_number.replace("REC-", ""), 10);
        if (!isNaN(num) && num > max) return num;
      }
      return max;
    }, 0)) + 1;
    const receipt_number = `REC-${String(nextReceiptNo).padStart(6, '0')}`;

    installment.status = "paid";
    installment.paid_date = paid_date;
    installment.paid_value = Number(paid_value);
    installment.payment_method = payment_method;
    installment.payment_observations = payment_observations || "";
    installment.receipt_number = receipt_number;
    installment.updated_at = new Date().toISOString();

    await saveFinancialInstallment(installment);

    // Business Rule: Check if all installments for this contract are paid.
    // If so, update contract status to 'completed'
    const contractId = installment.contract_id;
    const allInstallments = await getFinancialInstallments();
    const contractInstallments = allInstallments.filter(inst => inst.contract_id === contractId);
    const unpaid = contractInstallments.filter(inst => inst.status !== "paid");

    if (unpaid.length === 0) {
      const contracts = await getFinancialContracts();
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        contract.status = "completed";
        contract.updated_at = new Date().toISOString();
        await saveFinancialContract(contract);
      }
    }

    res.json({ success: true, installment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to run sequence 1 immediately on webhook lead creation
// Centralized Workflow Action Processor with WhatsApp and Email Retries & Alerts
async function processLeadWorkflowAction(lead: any, configEtapa: any, workflowConfigs: any[], log: (msg: string) => void): Promise<any> {
  const statusUpperCheck = String(lead.status_funil || "").toUpperCase();
  if (
    statusUpperCheck === "PERDIDO" ||
    statusUpperCheck === "SEM_RETORNO" ||
    lead.status_funil === "Perdido" ||
    lead.status_funil === "Sem Retorno" ||
    lead.status_funil === "Sem WhatsApp" ||
    (lead.motivo_perda && lead.motivo_perda.trim() !== "" && lead.motivo_perda !== "AGUARDANDO_DATA")
  ) {
    log(`[IGNORADO] Lead ${lead.nome} (ID: ${lead.id}) possui status '${lead.status_funil}'. Envio de e-mail/WhatsApp cancelado.`);
    return lead;
  }

  const canal = configEtapa.canal;
  const templateName = configEtapa.template_name;
  const etapaAtual = configEtapa.etapa || "SEM_CONTATO";
  
  const nextStageName = configEtapa.proxima_etapa || etapaAtual;
  const nextStageConfig = workflowConfigs.find(
    (c) =>
      c.etapa === nextStageName ||
      (c.etapa && String(c.etapa).toUpperCase() === String(nextStageName).toUpperCase())
  );
  const waitDays = nextStageConfig ? (nextStageConfig.esperar_dias || 0) : (configEtapa.esperar_dias || 0);
  
  let nextActionDate = new Date();
  nextActionDate.setDate(nextActionDate.getDate() + waitDays);

  let updatedLead = { ...lead };
  let msgBody = await compileTemplate(configEtapa.mensagem_template || "", lead);

  if (canal === "WHATSAPP") {
    updatedLead.tentativas_whatsapp = (Number(lead.tentativas_whatsapp) || 0) + 1;
    updatedLead.ultimo_whatsapp_em = new Date().toISOString();
    
    log(`Enviando WhatsApp (${templateName}) para ${lead.nome} (${lead.link_celular || "Sem número"})...`);
    
    const dispatchResult = await dispatchWhatsAppMessage(lead.link_celular, msgBody);
    log(`Resultado do Disparo: ${dispatchResult.log}`);

    updatedLead.whatsapp_validation_status = dispatchResult.code;
    updatedLead.whatsapp_validation_http_code = dispatchResult.httpCode;
    updatedLead.whatsapp_validation_error = dispatchResult.errorMessage;
    updatedLead.whatsapp_validated_at = dispatchResult.validatedAt;

    if (dispatchResult.code === "NUMERO_SEM_WHATSAPP") {
      updatedLead.status_funil = "Sem WhatsApp";
      updatedLead.etapa_contato = "Sem WhatsApp";
      updatedLead.whatsapp_retry_count = 0;
      updatedLead.whatsapp_retry_stage = null;
      updatedLead.proxima_acao_em = "";
      updatedLead.ultima_interacao_em = new Date().toISOString();

      await addHistoryEntry(lead.id, {
        canal: "WHATSAPP",
        tipo: "SISTEMA",
        titulo: "Número sem WhatsApp",
        detalhes: `Validação do WhatsApp falhou. Motivo: Número sem WhatsApp<br/>
          <small style="color: #ef4444; font-family: monospace;">
            • Status da Automação: Sem WhatsApp<br/>
            • Código Interno: NUMERO_SEM_WHATSAPP<br/>
            • Status HTTP: ${dispatchResult.httpCode}<br/>
            • Data/Hora da Validação: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}<br/>
            • Mensagem WAHA: ${dispatchResult.errorMessage || "Número inexistente no WhatsApp"}
          </small>`
      });

      log(`[NÚMERO SEM WHATSAPP] Status da automação atualizado para 'Sem WhatsApp'. Envio e retentativas canceladas para ${lead.nome}.`);

    } else if (!dispatchResult.success) {
      const rotuloErro = dispatchResult.code === "ERRO_TEMPORARIO_WAHA" 
        ? "Erro Temporário (WAHA)" 
        : (dispatchResult.code === "ERRO_COMUNICACAO" ? "Erro de Comunicação" : "Erro no Disparo");

      await addHistoryEntry(lead.id, {
        canal: "WHATSAPP",
        tipo: "ENVIO",
        titulo: `WhatsApp [Workflow]: Falha - ${rotuloErro}`,
        detalhes: `${msgBody}<br/><br/>
          <small style="color: #f59e0b; font-family: monospace;">
            ⚠️ Motivo: ${rotuloErro}<br/>
            • Código Interno: ${dispatchResult.code}<br/>
            • Status HTTP: ${dispatchResult.httpCode}<br/>
            • Data/Hora da Validação: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}<br/>
            • Mensagem WAHA: ${dispatchResult.errorMessage || dispatchResult.log}
          </small>`
      });

      const currentCount = Number(lead.whatsapp_retry_count) || 0;
      if (currentCount < 2) {
        updatedLead.whatsapp_retry_count = currentCount + 1;
        updatedLead.whatsapp_retry_stage = etapaAtual;
        
        let nextRetryDate = new Date();
        nextRetryDate.setHours(nextRetryDate.getHours() + 2);
        updatedLead.proxima_acao_em = nextRetryDate.toISOString();
        
        updatedLead.etapa_contato = etapaAtual;
        updatedLead.status_funil = lead.status_funil;
        updatedLead.temperatura = lead.temperatura;
        
        log(`[ERRO TEMPORÁRIO WAHA - AGENDANDO REENVIO] Tentativa de reenvio agendada para daqui a 2 horas. Tentativa falha #${updatedLead.whatsapp_retry_count} para a etapa "${etapaAtual}"`);

        if (currentCount === 0) {
          try {
            const errorEmailSubject = `⚠️ Erro Temporário WAHA no Envio de WhatsApp para Lead: ${lead.nome}`;
            const errorEmailBody = `
              <h3>Ocorreu uma falha temporária no envio da mensagem de WhatsApp via WAHA</h3>
              <p><b>Lead:</b> ${lead.nome}</p>
              <p><b>E-mail:</b> ${lead.email}</p>
              <p><b>Telefone:</b> ${lead.link_celular}</p>
              <p><b>Etapa do Workflow:</b> ${etapaAtual}</p>
              <p><b>Código do Erro:</b> ${dispatchResult.code}</p>
              <p><b>Status HTTP:</b> ${dispatchResult.httpCode}</p>
              <p><b>Data/Hora Validação:</b> ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}</p>
              <p><b>Mensagem tentada:</b> ${msgBody}</p>
              <p><b>Motivo / Detalhes:</b> ${dispatchResult.errorMessage || dispatchResult.log}</p>
              <p>O CRM agendou automaticamente um reenvio para daqui a 2 horas (tentativa 1 de 2 adicionais).</p>
            `;
            await dispatchEmailMessage("paulocoala@gmail.com", errorEmailSubject, errorEmailBody);
            log(`[NOTIFICAÇÃO FALHA] E-mail de notificação de erro enviado com sucesso para paulocoala@gmail.com`);
          } catch (notifyErr: any) {
            log(`[FALHA NOTIFICAÇÃO] Erro ao enviar e-mail de alerta: ${notifyErr.message}`);
          }
        }
      } else {
        updatedLead.whatsapp_retry_count = 0;
        updatedLead.whatsapp_retry_stage = null;
        
        updatedLead.etapa_contato = configEtapa.proxima_etapa || etapaAtual;
        updatedLead.status_funil = configEtapa.proximo_status || lead.status_funil;
        updatedLead.temperatura = configEtapa.temperatura || lead.temperatura;
        updatedLead.proxima_acao_em = nextActionDate.toISOString();
        updatedLead.ultima_interacao_em = new Date().toISOString();
        
        log(`[FALHA DE WHATSAPP - ESGOTADO] Todas as 3 tentativas falharam. Prosseguindo o workflow para a próxima etapa: "${updatedLead.etapa_contato}"`);
      }
    } else {
      updatedLead.whatsapp_retry_count = 0;
      updatedLead.whatsapp_retry_stage = null;
      
      updatedLead.etapa_contato = configEtapa.proxima_etapa || etapaAtual;
      updatedLead.status_funil = configEtapa.proximo_status || lead.status_funil;
      updatedLead.temperatura = configEtapa.temperatura || lead.temperatura;
      updatedLead.proxima_acao_em = nextActionDate.toISOString();
      updatedLead.ultima_interacao_em = new Date().toISOString();
      
      await addHistoryEntry(lead.id, {
        canal: "WHATSAPP",
        tipo: "ENVIO",
        titulo: `WhatsApp [Workflow]: ${templateName || "Mensagem"}`,
        detalhes: `${msgBody}<br/><br/>
          <small style="color: #10b981; font-family: monospace;">
            🚀 Mensagem enviada com sucesso!<br/>
            • Código Interno: ENVIADO_SUCESSO<br/>
            • Status HTTP: ${dispatchResult.httpCode}<br/>
            • Validado e Enviado em: ${new Date(dispatchResult.validatedAt).toLocaleString("pt-BR")}
          </small>`
      });

      log(`[SUCESSO DE WHATSAPP] Envio bem-sucedido. Transicionando para a próxima etapa: "${updatedLead.etapa_contato}"`);
    }

  } else if (canal === "EMAIL") {
    updatedLead.tentativas_email = (Number(lead.tentativas_email) || 0) + 1;
    updatedLead.ultimo_email_em = new Date().toISOString();
    
    let emailSubject = await compileTemplate(configEtapa.assunto_template || "", lead);

    log(`Enviando E-mail (${templateName}) para ${lead.nome} (${lead.email})...`);
    
    const dispatchResult = await dispatchEmailMessage(lead.email, emailSubject, msgBody);
    log(`Resultado do Disparo: ${dispatchResult.log}`);
    
    await addHistoryEntry(lead.id, {
      canal: "EMAIL",
      tipo: "ENVIO",
      titulo: `E-mail [Workflow]: ${templateName || "Mensagem"}`,
      detalhes: `<b>Assunto:</b> ${emailSubject}<br/><br/>${msgBody.replace(/\n/g, "<br/>")}<br/><br/><small style="color: #a1a1aa; font-family: monospace;">🚀 ${dispatchResult.log}</small>`
    });

    if (!dispatchResult.success) {
      const currentCount = Number(lead.email_retry_count) || 0;
      if (currentCount < 2) {
        updatedLead.email_retry_count = currentCount + 1;
        updatedLead.email_retry_stage = etapaAtual;
        
        let nextRetryDate = new Date();
        nextRetryDate.setHours(nextRetryDate.getHours() + 2);
        updatedLead.proxima_acao_em = nextRetryDate.toISOString();
        
        updatedLead.etapa_contato = etapaAtual;
        updatedLead.status_funil = lead.status_funil;
        updatedLead.temperatura = lead.temperatura;
        
        log(`[FALHA DE EMAIL - AGENDANDO REENVIO] Tentativa de reenvio agendada para daqui a 2 horas. Tentativa falha #${updatedLead.email_retry_count} para a etapa "${etapaAtual}"`);

        if (currentCount === 0) {
          try {
            const alertMsg = `⚠️ *Falha de Envio de E-mail* ⚠️\n\n*Lead:* ${lead.nome}\n*E-mail:* ${lead.email}\n*Etapa:* ${etapaAtual}\n*Assunto:* ${emailSubject}\n*Erro/Log:* ${dispatchResult.log}\n\nO CRM tentará reenviar o e-mail mais 2 vezes, com intervalo de 2 horas.`;
            await dispatchWhatsAppMessage("13991380688", alertMsg);
            log(`[NOTIFICAÇÃO FALHA] Alerta de WhatsApp de falha enviado para 13991380688`);
          } catch (notifyErr: any) {
            log(`[FALHA NOTIFICAÇÃO] Erro ao enviar WhatsApp de alerta: ${notifyErr.message}`);
          }
        }
      } else {
        updatedLead.email_retry_count = 0;
        updatedLead.email_retry_stage = null;
        
        updatedLead.etapa_contato = configEtapa.proxima_etapa || etapaAtual;
        updatedLead.status_funil = configEtapa.proximo_status || lead.status_funil;
        updatedLead.temperatura = configEtapa.temperatura || lead.temperatura;
        updatedLead.proxima_acao_em = nextActionDate.toISOString();
        updatedLead.ultima_interacao_em = new Date().toISOString();
        
        log(`[FALHA DE EMAIL - ESGOTADO] Todas as 3 tentativas falharam. Prosseguindo o workflow para a próxima etapa: "${updatedLead.etapa_contato}"`);
      }
    } else {
      updatedLead.email_retry_count = 0;
      updatedLead.email_retry_stage = null;
      
      updatedLead.etapa_contato = configEtapa.proxima_etapa || etapaAtual;
      updatedLead.status_funil = configEtapa.proximo_status || lead.status_funil;
      updatedLead.temperatura = configEtapa.temperatura || lead.temperatura;
      updatedLead.proxima_acao_em = nextActionDate.toISOString();
      updatedLead.ultima_interacao_em = new Date().toISOString();
      
      log(`[SUCESSO DE EMAIL] Envio bem-sucedido. Transicionando para a próxima etapa: "${updatedLead.etapa_contato}"`);
    }
  }

  return updatedLead;
}

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

    const updatedLead = await processLeadWorkflowAction(lead, config, workflowConfigs, (msg) => console.log(`[Webhook Automation] ${msg}`));

    await saveLead(updatedLead, false);
    console.log(`[Webhook Automation] Lead updated to Stage: ${updatedLead.etapa_contato}, Status: ${updatedLead.status_funil}`);
  } catch (err: any) {
    console.error("[Webhook Automation] Error running immediate workflow:", err);
  }
}

// API - Webhook for Dynamic Leads Import (n8n or direct) - supports both POST and GET
const webhookHandler = async (req: any, res: any) => {
  try {
    const { portal } = req.query;
    const leadData = { ...req.body, ...req.query };

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

    const status_funil = leadData.status_funil || leadData.status || "Primeiro Contato";
    const etapa_contato = leadData.etapa_contato || leadData.etapa || "Orçamento Enviado";
    const temperatura = leadData.temperatura || leadData.temperature || "Fria";

    if (!email) {
      return res.status(400).json({ error: "E-mail do lead é obrigatório no payload" });
    }

    // Check duplicate lead by email or phone
    const existing = await findDuplicateLead(email, link_celular);
    if (existing) {
      const updated = await handleDuplicateAttempt(existing, `Webhook (${nomePortal})`, leadData);
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Lead já existente no CRM. Tentativa de recadastro via Webhook (${nomePortal}) foi registrada no histórico.`,
        lead_id: existing.id,
        lead: updated
      });
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
      status_funil,
      etapa_contato,
      temperatura,
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
};

app.post("/api/leads/webhook", webhookHandler);
app.get("/api/leads/webhook", webhookHandler);

// API - Webhook para Integração com n8n (Leitura de Leads Zoho Mail)
app.post("/api/leads/n8n-webhook", async (req, res) => {
  try {
    const leadData = { ...req.body, ...req.query };

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

    const status_funil = leadData.status_funil || leadData.status || "Primeiro Contato";
    const etapa_contato = leadData.etapa_contato || leadData.etapa || "Orçamento Enviado";
    const temperatura = leadData.temperatura || leadData.temperature || "Fria";

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: "O campo de e-mail ('email' ou 'mail') é obrigatório para cadastrar o lead no CRM." 
      });
    }

    // Check duplicate lead by email or phone
    const existing = await findDuplicateLead(email, link_celular);
    if (existing) {
      const updated = await handleDuplicateAttempt(existing, `n8n Webhook (${origem_portal})`, leadData);
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: `Lead já existente no CRM. Tentativa de recadastro via n8n Webhook (${origem_portal}) registrada no histórico.`,
        lead_id: existing.id,
        lead: updated
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
      status_funil,
      etapa_contato,
      temperatura,
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

    // Check duplicate lead by email or phone
    const existing = await findDuplicateLead(parsed.email, parsed.linkCelular);
    if (existing) {
      const updated = await handleDuplicateAttempt(existing, "Zoho E-mail / Portal Noivas", {
        texto_email: email_body,
        dados_extraidos: parsed
      });
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Lead já existente no CRM. Tentativa de recadastro via e-mail do Zoho registrada no histórico.",
        lead: updated,
        parser_details: parsed
      });
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
    const allLeads = await getAllLeadsUnfiltered();

    const localLeadIds = allLeads.map((l: any) => l.id);
    const localEmails = allLeads.map((l: any) => l.email ? String(l.email).trim().toLowerCase() : "").filter(Boolean);
    const localPhones = allLeads.map((l: any) => l.telefone_limpo || (l.link_celular ? String(l.link_celular).replace(/\D/g, "") : "")).filter((p) => p && p.length >= 8);

    const result = sheetRows.map((row: any) => {
      const rowEmail = row.email ? String(row.email).trim().toLowerCase() : "";
      const rowPhone = row.linkCelular ? String(row.linkCelular).replace(/\D/g, "") : "";
      const isDuplicate = localLeadIds.includes(row.lead_id) ||
        (rowEmail && localEmails.includes(rowEmail)) ||
        (rowPhone && rowPhone.length >= 8 && localPhones.some((lp) => lp === rowPhone || lp.endsWith(rowPhone) || rowPhone.endsWith(lp)));

      return {
        ...row,
        already_imported: isDuplicate
      };
    });

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

    let importedCount = 0;
    let duplicateCount = 0;

    for (const row of sheetRows) {
      if (!row.lead_id || !row.nome || !row.email) {
        continue;
      }
      if (lead_ids && Array.isArray(lead_ids) && !lead_ids.includes(row.lead_id)) {
        continue;
      }

      // Check if duplicate exists by Email or Phone or ID
      const existing = (await findDuplicateLead(row.email, row.linkCelular)) || (await getLeadById(row.lead_id));
      if (existing) {
        duplicateCount++;
        await handleDuplicateAttempt(existing, "Google Sheets Import", {
          lead_id_planilha: row.lead_id,
          nome: row.nome,
          email: row.email,
          celular: row.linkCelular,
          origem: row.origem || "Google Sheets"
        });
        continue;
      }

      const mappedLead = mapSheetRowToLead(row);
      const saved = await saveLead(mappedLead, true);
      await addHistoryEntry(mappedLead.id, {
        canal: "SISTEMA",
        tipo: "IMPORT",
        titulo: "Lead Importado do Google Sheets",
        detalhes: `Lead '${mappedLead.nome}' importado automaticamente da planilha com status '${mappedLead.status_funil}'.`
      });

      // Roda a sequência de número 1 do fluxo imediatamente para o novo lead importado da planilha
      await runAutomationForNewWebhookLead(saved || mappedLead);

      importedCount++;
    }

    res.json({
      success: true,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      total_found: sheetRows.length,
      message: `${importedCount} novos leads importados. ${duplicateCount} tentativas de duplicidade registradas no histórico.`
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
      const statusUpperAutom = String(lead.status_funil || "").toUpperCase();
      if (
        statusUpperAutom === "PERDIDO" ||
        statusUpperAutom === "SEM_RETORNO" ||
        lead.status_funil === "Perdido" ||
        lead.status_funil === "Sem Retorno" ||
        lead.status_funil === "Sem WhatsApp"
      ) {
        log(`Elegibilidade: Lead PERDIDO / SEM_RETORNO (${lead.status_funil}). Ignorando.`);
        continue;
      }
      if (statusUpperAutom === "FECHOU") {
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

      // 3. Executing workflow action with centralized retry logic
      const updatedLead = await processLeadWorkflowAction(lead, configEtapa, workflowConfigs, log);
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

// API - RETROACTIVE AUTOMATION SYNC FOR EXISTING LEADS
app.post("/api/automation/retroactive-trigger", async (req, res) => {
  try {
    const workflowConfigs = await getWorkflowConfigs();
    const leads = await getLeads();
    
    // Sort configs by order
    const sortedConfigs = [...workflowConfigs].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
    const step1Config = sortedConfigs[0];
    const step2Config = sortedConfigs[1];

    if (!step1Config || !step2Config) {
      return res.status(400).json({ error: "Configurações de fluxo incompletas para rodar sincronização." });
    }

    let updatedCount = 0;
    const logs: string[] = [];

    for (const lead of leads) {
      // Ignore leads who closed/converted, responded, or are lost/canceled
      const statusUpper = String(lead.status_funil || "").toUpperCase();
      const stageUpper = String(lead.etapa_contato || "").toUpperCase();
      
      if (statusUpper === "FECHOU" || 
          statusUpper === "RESPONDIDO" || 
          statusUpper === "PERDIDO" ||
          statusUpper === "SEM_RETORNO" ||
          lead.status_funil === "Perdido" ||
          lead.status_funil === "Sem Retorno" ||
          lead.status_funil === "Sem WhatsApp" ||
          stageUpper === "ENCERRADO" ||
          (lead.motivo_perda && lead.motivo_perda.trim() !== "" && lead.motivo_perda !== "AGUARDANDO_DATA")) {
        continue;
      }

      let updated = false;
      let updatedLead = { ...lead };

      // Case A: Lead is in initial stage but hasn't had Step 1 run (0 email and 0 whatsapp)
      const inStep1 = !lead.etapa_contato || 
                      lead.etapa_contato === "SEM_CONTATO" || 
                      stageUpper === String(step1Config.etapa).toUpperCase();
      
      const hasZeroAttempts = (Number(lead.tentativas_email) || 0) === 0 && (Number(lead.tentativas_whatsapp) || 0) === 0;

      if (inStep1 && hasZeroAttempts) {
        // Queue immediately for Step 1
        updatedLead.proxima_acao_em = new Date().toISOString();
        updatedLead.etapa_contato = step1Config.etapa;
        updated = true;
        logs.push(`Lead "${lead.nome}" (ID: ${lead.id}) estava em espera de importação. Colocado na fila imediata do Passo 1.`);
      } 
      // Case B: Lead is in Step 2 stage but has 0 whatsapp attempts (Meaning they finished Step 1 email but missed Step 2 whatsapp)
      else {
        const inStep2 = stageUpper === String(step2Config.etapa).toUpperCase();
        const hasNoWhatsapp = (Number(lead.tentativas_whatsapp) || 0) === 0;

        if (inStep2 && hasNoWhatsapp) {
          // Queue immediately for Step 2 (WhatsApp)
          updatedLead.proxima_acao_em = new Date().toISOString();
          updated = true;
          logs.push(`Lead "${lead.nome}" (ID: ${lead.id}) havia concluído Passo 1 (E-mail) mas não enviou WhatsApp (Passo 2). Fila do WhatsApp atualizada para envio imediato.`);
        }
      }

      if (updated) {
        await saveLead(updatedLead, false);
        updatedCount++;
      }
    }

    res.json({
      success: true,
      updated_count: updatedCount,
      logs: logs.length > 0 ? logs : ["Todos os leads ativos já estão em conformidade com as regras da sequência."]
    });
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

    const isNovo = (s: string) => !s || s === "NOVO" || s === "Novo" || s === "Primeiro Contato" || s === "PRIMEIRO_CONTATO";
    const isConvertido = (s: string) => s === "FECHOU" || s === "Fechou (Convertido)" || s === "Fechou" || s === "CONVERTIDO";
    const isPerdido = (s: string) => s === "PERDIDO" || s === "SEM_RETORNO" || s === "Perdido" || s === "Sem Retorno / Encerrado" || s === "Sem Retorno" || s === "Sem WhatsApp";

    leads.forEach((l) => {
      if (isPerdido(l.status_funil) || (l.motivo_perda && l.motivo_perda.trim() !== "" && l.motivo_perda !== "AGUARDANDO_DATA")) return;
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
