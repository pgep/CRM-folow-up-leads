/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Database, Copy, Check, Info, Server, Terminal } from "lucide-react";

interface DatabaseSetupProps {
  useSupabase: boolean;
}

export default function DatabaseSetup({ useSupabase }: DatabaseSetupProps) {
  const [copied, setCopied] = useState(false);

  const sqlScript = `-- SQL Script para Configuração do CRM Follow-up Noivas V2
-- Execute este script no SQL Editor do seu console Supabase para criar as tabelas necessárias.

-- 1. Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    link_celular TEXT,
    telefone_limpo TEXT,
    data_casamento TEXT,
    mes_casamento TEXT,
    local TEXT,
    servicos TEXT,
    convidados INTEGER DEFAULT 0,
    soma1 TEXT,
    soma2 TEXT,
    soma3 TEXT,
    soma4 TEXT,
    soma5 TEXT,
    status_funil TEXT DEFAULT 'NOVO', -- 'NOVO', 'PRIMEIRO_CONTATO', 'FOLLOWUP1', 'FOLLOWUP2', 'FOLLOWUP3', 'FOLLOWUPFINAL', 'RESPONDIDO', 'FECHOU', 'PERDIDO'
    etapa_contato TEXT DEFAULT 'SEM_CONTATO', -- 'SEM_CONTATO', 'WHATSAPP_ENVIADO', 'EMAIL_FOLLOWUP_1', 'WHATSAPP_FOLLOWUP_2', 'EMAIL_FOLLOWUP_2', 'EMAIL_FINAL', 'ENCERRADO'
    temperatura TEXT DEFAULT 'FRIA', -- 'FRIA', 'MORNA', 'QUENTE'
    tentativas_email INTEGER DEFAULT 0,
    tentativas_whatsapp INTEGER DEFAULT 0,
    observacoes TEXT,
    motivo_perda TEXT,
    origem_portal TEXT DEFAULT 'Portal Noivas',
    ultimo_email_em TIMESTAMP WITH TIME ZONE,
    ultimo_whatsapp_em TIMESTAMP WITH TIME ZONE,
    ultima_interacao_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    proxima_acao_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Configuração de Workflows (Passos do Follow-up)
CREATE TABLE IF NOT EXISTS workflow_config (
    etapa TEXT PRIMARY KEY,
    descricao TEXT NOT NULL,
    canal TEXT, -- 'WHATSAPP', 'EMAIL', NULL
    template_name TEXT,
    esperar_dias INTEGER DEFAULT 0,
    proxima_etapa TEXT,
    proximo_status TEXT,
    temperatura TEXT,
    mensagem_template TEXT,
    assunto_template TEXT
);

-- 3. Tabela de Portais de Leads
CREATE TABLE IF NOT EXISTS portal_config (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    url_webhook TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Histórico e Timeline dos Leads
CREATE TABLE IF NOT EXISTS lead_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
    canal TEXT, -- 'WHATSAPP', 'EMAIL', 'SISTEMA', 'MANUAL'
    tipo TEXT NOT NULL, -- 'ENVIO', 'RESPOSTA', 'STATUS_CHANGE', 'NOTA_MANUAL', 'IMPORT'
    titulo TEXT NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Configurações de Workflow Iniciais
INSERT INTO workflow_config (etapa, descricao, canal, template_name, esperar_dias, proxima_etapa, proximo_status, temperatura, mensagem_template, assunto_template)
VALUES 
('SEM_CONTATO', 'Lead recém importado', 'WHATSAPP', 'WHATSAPP_BOAS_VINDAS', 1, 'WHATSAPP_ENVIADO', 'PRIMEIRO_CONTATO', 'FRIA', 'Olá {{nome}}! Obrigado pelo seu contato com a Casa Colombo Artesanal. Recebemos sua solicitação e em breve enviaremos uma proposta personalizada para o seu casamento. Se desejar conhecer alguns trabalhos, acesse casacolomboartesanal.com.br. Será um prazer fazer parte desse momento especial.', NULL),

('WHATSAPP_ENVIADO', 'WhatsApp enviado', 'EMAIL', 'EMAIL_FOLLOWUP_1', 4, 'EMAIL_FOLLOWUP_1', 'FOLLOWUP1', 'MORNA', '<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Retomando seu atendimento sobre as lembrancinhas do seu casamento{{complementoMesCasamento}}.</p><p>Se quiser, posso te indicar as opções mais adequadas para o seu perfil de evento e quantidade de convidados, de forma bem objetiva.</p><p>Basta responder este e-mail ou falar com a gente no WhatsApp.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>', 'Separei novas opções para o seu casamento - {{nome}}'),

('EMAIL_FOLLOWUP_1', 'Primeiro e-mail enviado', 'WHATSAPP', 'WHATSAPP_FOLLOWUP_2', 4, 'WHATSAPP_FOLLOWUP_2', 'FOLLOWUP2', 'MORNA', 'Olá {{nome}}! Passando para saber se ainda podemos ajudá-la com as lembranças do seu casamento. Se quiser, posso te orientar nas opções mais adequadas para o seu evento e quantidade de convidados.', NULL),

('WHATSAPP_FOLLOWUP_2', 'Segundo WhatsApp', 'EMAIL', 'EMAIL_FOLLOWUP_2', 7, 'EMAIL_FOLLOWUP_2', 'FOLLOWUP3', 'MORNA', '<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Esse é mais um retorno para não deixar seu pedido sem resposta.</p><p>Se ainda estiver buscando lembrancinhas para o casamento{{complementoMesCasamento}}, teremos prazer em te atender e montar uma sugestão alinhada ao seu evento.</p><p>Se preferir, basta responder este e-mail com sua dúvida.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>', 'Ainda posso te ajudar com as lembranças do casamento - {{nome}}'),

('EMAIL_FOLLOWUP_2', 'Segundo e-mail', 'EMAIL', 'EMAIL_FINAL', 14, 'EMAIL_FINAL', 'FOLLOWUPFINAL', 'QUENTE', '<p>Olá <strong>{{nome}}</strong>, tudo bem?</p><p>Esse é um último retorno para não deixar seu pedido sem resposta.</p><p>Se ainda estiver buscando lembrancinhas para o seu casamento, teremos prazer em te atender.</p><p>Se desejar, basta responder este e-mail.</p><p>Com carinho,<br><strong>Luciana</strong><br>Casa Colombo Artesanal</p>', 'Último retorno sobre seu atendimento - {{nome}}'),

('EMAIL_FINAL', 'Última tentativa', NULL, NULL, 0, 'ENCERRADO', 'SEM_RETORNO', 'FRIA', NULL, NULL),

('ENCERRADO', 'Fluxo encerrado', NULL, NULL, 0, 'ENCERRADO', 'ENCERRADO', 'FRIA', NULL, NULL)
ON CONFLICT (etapa) DO NOTHING;

-- Inserir Configurações de Portais Iniciais
INSERT INTO portal_config (id, nome, ativo)
VALUES 
('portal_noivas', 'Portal Noivas', true),
('casamentos_com', 'Casamentos.com.br', true),
('zankyou', 'Zankyou', true),
('site_direto', 'Formulário Site Direto', true)
ON CONFLICT (id) DO NOTHING;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* DB Connection Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Status do Banco de Dados
            </h3>
            <p className="text-sm text-zinc-400">
              O CRM gerencia a persistência das informações de forma híbrida.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-800 border border-zinc-700">
            <span className={`w-2.5 h-2.5 rounded-full ${useSupabase ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
            {useSupabase ? "Supabase Cloud Conectado" : "Banco Local JSON Ativo"}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex gap-3">
            <Server className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-white">Armazenamento Local</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Atualmente salvando em <strong>database.json</strong>. Todos os dados, configurações de templates e histórico de leads persistem localmente caso o Supabase não esteja totalmente provisionado. Perfeito para testes imediatos!
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex gap-3">
            <Database className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-white">Supabase Cloud (PostgreSQL)</h4>
              <p className="text-xs text-zinc-500 mt-1">
                Para ativar a sincronização na nuvem permanente, configure as variáveis secretas <strong>SUPABASE_URL</strong> e <strong>SUPABASE_SECRET_KEY</strong>. O sistema migrará a gravação automaticamente sem reiniciar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SQL Setup Script */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-zinc-400" />
              Script de Inicialização do Banco
            </h3>
            <p className="text-sm text-zinc-400">
              Execute este script DDL no console de desenvolvimento do Supabase para inicializar as tabelas.
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg text-sm font-medium transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar SQL
              </>
            )}
          </button>
        </div>

        <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-400 overflow-y-auto max-h-96 whitespace-pre">
          {sqlScript}
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-start gap-2 text-xs text-zinc-500">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <p>
            Dica: Se você não executar as tabelas no Supabase, a aplicação continuará funcionando normalmente usando o arquivo local de persistência, de modo que você nunca perderá os leads inseridos ou as modificações feitas de teste no simulador.
          </p>
        </div>
      </div>
    </div>
  );
}
