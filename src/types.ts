/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus =
  | 'NOVO'
  | 'PRIMEIRO_CONTATO'
  | 'FOLLOWUP1'
  | 'FOLLOWUP2'
  | 'FOLLOWUP3'
  | 'FOLLOWUPFINAL'
  | 'RESPONDIDO'
  | 'FECHOU'
  | 'PERDIDO'
  | 'SEM_RETORNO'
  | 'SEM_WHATSAPP'
  | 'Sem WhatsApp';

export type LeadEtapa = string;

export type LeadTemperatura = 'FRIA' | 'MORNA' | 'QUENTE' | 'CLIENTE';

export interface Lead {
  id: string;
  nome: string;
  email: string;
  link_celular?: string;
  telefone_limpo?: string;
  data_casamento?: string;
  mes_casamento?: string;
  local?: string;
  servicos?: string;
  convidados: number;
  soma1?: string;
  soma2?: string;
  soma3?: string;
  soma4?: string;
  soma5?: string;
  status_funil: LeadStatus;
  etapa_contato: LeadEtapa;
  temperatura: LeadTemperatura;
  tentativas_email: number;
  tentativas_whatsapp: number;
  observacoes?: string;
  motivo_perda?: string;
  origem_portal: string;
  ultimo_email_em?: string;
  ultimo_whatsapp_em?: string;
  ultima_interacao_em: string;
  proxima_acao_em: string;
  followup_especial_1m?: boolean;
  followup_especial_2m?: boolean;
  followup_especial_3m?: boolean;
  whatsapp_validation_status?: 'NUMERO_SEM_WHATSAPP' | 'ERRO_TEMPORARIO_WAHA' | 'ERRO_COMUNICACAO' | 'ENVIADO_SUCESSO' | string;
  whatsapp_validation_http_code?: number;
  whatsapp_validation_error?: string;
  whatsapp_validated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStage {
  etapa: LeadEtapa;
  descricao: string;
  canal: 'WHATSAPP' | 'EMAIL' | null;
  template_name: string | null;
  esperar_dias: number;
  proxima_etapa: LeadEtapa | null;
  proximo_status: LeadStatus | null;
  temperatura: LeadTemperatura;
  mensagem_template: string | null;
  assunto_template: string | null;
  imagens_template?: string | null;
  ordem?: number;
}

export interface PortalSource {
  id: string;
  nome: string;
  ativo: boolean;
  url_webhook?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  descricao: string;
  valor_unitario: number;
  link_imagem: string;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  canal: 'WHATSAPP' | 'EMAIL' | 'SISTEMA' | 'MANUAL';
  tipo: 'ENVIO' | 'RESPOSTA' | 'STATUS_CHANGE' | 'NOTA_MANUAL' | 'IMPORT';
  titulo: string;
  detalhes?: string;
  created_at: string;
}

export interface DashboardStats {
  totalLeads: number;
  leadsNovos: number;
  leadsAtivos: number;
  leadsConvertidos: number;
  leadsPerdidos: number;
  taxaConversao: number; // percentage
  leadsPorStatus: Record<LeadStatus, number>;
  leadsPorEtapa: Record<LeadEtapa, number>;
  leadsPorTemperatura: Record<LeadTemperatura, number>;
  leadsPorOrigem: Record<string, number>;
  historicoEntrada: { data: string; quantidade: number }[];
  upcomingWeddings?: {
    oneMonth: any[];
    twoMonths: any[];
    threeMonths: any[];
  };
  systemStatus?: {
    usePg: boolean;
    pgConnected: boolean;
    schedulerPaused: boolean;
  };
}
