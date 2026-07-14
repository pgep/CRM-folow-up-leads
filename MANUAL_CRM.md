# Manual de Uso e Configuração - CRM Casa Colombo Artesanal 💍

Este documento serve como guia oficial de uso, manutenção e configuração do sistema de CRM da **Casa Colombo Artesanal** para a gestão automatizada de leads de casamentos.

---

## 1. Entrada de Leads: Como e Quando Importar

O CRM suporta duas formas principais de entrada de potenciais clientes (Leads):

### A. Importação de Planilha Excel/XLSX
* **Quando usar:** Ideal para subir lotes de contatos recebidos de portais de casamento, feiras, eventos ou exportações históricas.
* **Como fazer:**
  1. No menu principal do CRM, navegue até a aba **Leads**.
  2. Clique no botão **Importar Planilha** (identificado com o ícone de download cor de laranja).
  3. Faça o upload do arquivo Excel contendo as colunas de dados necessários (`Nome`, `E-mail`, `Celular`, `Data do Casamento`, `Local`, etc.).
  4. O sistema irá ler o arquivo, realizar o processamento inteligente, higienizar os números de telefone para formato adequado de WhatsApp, calcular automaticamente o mês correspondente da data do casamento e inseri-los no funil de atendimento.

### B. Integração Automática de E-mails (Zoho Mail Parser)
* **Quando usar:** Toda vez que um novo lead entra em portais parceiros como *Noivas.com*, *Casamentos.com.br* ou similares, um e-mail de notificação é recebido no seu **Zoho Mail**.
* **Como funciona:**
  1. O CRM possui uma funcionalidade de leitura de e-mails (módulo Zoho Email Parser integrado com IA Gemini).
  2. O corpo do e-mail é analisado automaticamente via IA para extrair campos como nome da noiva, telefone, e-mail, data e local do casamento, quantidade de convidados e serviços desejados.
  3. Assim que inserido, o CRM cria o registro do lead e dispara a primeira ação de boas-vindas.

---

## 2. Configurações Gerais de Envio (Zoho & Waha)

Para que os envios automáticos funcionem de verdade em ambiente local ou de produção, você precisa parametrizar os canais de envio na nova aba unificada:

### Acesso à Tela de Parametrização
No menu superior do CRM, acesse a aba **Configurações Gerais** (antiga *Configurar Follow-up*). Você encontrará duas sub-abas cruciais:

1. **Parâmetros de Envio (Zoho & Waha):**
   * **Zoho Mail SMTP (E-mail):**
     * **Servidor SMTP:** `smtp.zoho.com` (padrão)
     * **Porta:** `465` (padrão seguro SSL)
     * **Remetente:** Nome amigável que aparece na caixa do cliente (Ex: `Luciana - Casa Colombo`)
     * **E-mail (Username):** Seu e-mail institucional do Zoho (Ex: `contato@casacolomboartesanal.com.br`)
     * **Senha:** É altamente recomendável gerar um **App Password (Senha de Aplicativo)** de 16 dígitos no painel de segurança do Zoho Mail caso utilize autenticação de dois fatores.
   * **Waha WhatsApp API (WhatsApp):**
     * **Endpoint da API:** URL de onde seu container Waha local está hospedado.
     * **Sessão:** Identificador da conexão (padrão: `default`).
     * **Chave de API:** Token de segurança configurado no seu container.
     * **Intervalo de Segurança:** Segundos de delay recomendados entre disparos automáticos sequenciais para evitar bloqueios por spam no WhatsApp (padrão: `5` segundos).

2. **Esteira de Automação (Follow-up):**
   * Permite alterar o fluxo cronológico, templates de e-mail e mensagens de WhatsApp para cada uma das etapas do funil (`SEM_CONTATO`, `WHATSAPP_ENVIADO`, `EMAIL_FOLLOWUP_1`, etc.).

---

## 3. Fluxo de Follow-up (Como e Quando os Envios Acontecem)

A esteira de atendimento funciona como uma máquina do tempo inteligente. Cada lead segue as etapas abaixo cronologicamente:

```
[Entrada do Lead] 
       │
       ▼
[SEM_CONTATO] ──(Disparo WhatsApp de Boas-vindas)──► Aguarda 1 Dia ──► [WHATSAPP_ENVIADO]
                                                                            │
   ┌────────────────────────────────────────────────────────────────────────┘
   ▼
[WHATSAPP_ENVIADO] ──(Disparo Email Follow-up 1)──► Aguarda 2 Dias ──► [EMAIL_FOLLOWUP_1]
                                                                            │
   ┌────────────────────────────────────────────────────────────────────────┘
   ▼
[EMAIL_FOLLOWUP_1] ──(Disparo WhatsApp Follow-up 2)──► Aguarda 3 Dias ──► [WHATSAPP_FOLLOWUP_2]
                                                                               │
   ┌───────────────────────────────────────────────────────────────────────────┘
   ▼
[WHATSAPP_FOLLOWUP_2] ──(Disparo Email Follow-up 2)──► Aguarda 4 Dias ──► [EMAIL_FOLLOWUP_2]
                                                                               │
   ┌───────────────────────────────────────────────────────────────────────────┘
   ▼
[EMAIL_FOLLOWUP_2] ──(Disparo Email de Encerramento)──► [EMAIL_FINAL] ──► Fim do Fluxo Automatizado
```

### Regras Importantes de Disparo:
* **Gatilho de Carência:** O sistema calcula a diferença em dias entre a data da última interação (`ultima_interacao_em`) e a data atual. A próxima automação só roda se o prazo em dias configurado na etapa tiver decorrido.
* **Auto-parada (Interrupção):** Se em qualquer momento a noiva ou noivo responder à sua mensagem e o status do funil for alterado para **RESPONDIDO** ou **FECHOU**, o sistema **cessa imediatamente** os envios automáticos para aquele contato.

---

## 4. Onde Olhar Detalhes e Histórico do Lead

Toda a jornada de comunicação fica registrada no prontuário do lead para que você nunca perca o fio da meada:

1. Acesse a aba **Leads** no menu superior.
2. Clique no lead desejado na listagem esquerda.
3. No lado direito, o CRM expandirá o **Painel de Detalhes do Lead**:
   * **Informações Cadastrais:** Dados do evento (local, quantidade de convidados, serviços), temperatura de interesse (`QUENTE`, `MORNA`, `FRIA`) e status do funil.
   * **Observações:** Anotações manuais sobre negociações ou particularidades das lembrancinhas.
   * **Linha do Tempo (Histórico):** Registra cada e-mail enviado, tentativas de entrega, logs de importação e respostas. Você pode visualizar o corpo exato do e-mail simulado enviado clicando em detalhes da linha do tempo.

---

## 5. Como Acompanhar os Status pelo Dashboard

O **Dashboard** é o painel de comando estratégico do CRM e foi otimizado para as suas necessidades de vendas:

### A. Filtro Inteligente de Casamentos Passados
* **O que mudou:** Casamentos cuja data já passou em relação ao dia de hoje são **removidos automaticamente** dos indicadores numéricos principais do dashboard. Isso evita que noivas antigas inflem os dados de leads ativos e foca o trabalho exclusivamente nos eventos vigentes e futuros.

### B. Módulo de Proximidade de Casamento (3, 2 e 1 Mês)
Para garantir que você mantenha contato aquecido perto da data mais importante, o dashboard apresenta um card exclusivo: **Proximidade de Casamentos (Próximos 3 Meses)**:
1. **🚨 Em até 1 Mês (Faltam 0 a 30 dias):** Noivas em contagem regressiva crítica. Necessitam de contato urgente para fechamento final de detalhes e lembrancinhas.
2. **⚠️ Em até 2 Meses (Faltam 31 a 60 dias):** Fase importante de refinamento do orçamento e amostras.
3. **📅 Em até 3 Meses (Faltam 61 a 90 dias):** Início de aproximação comercial para fechar a proposta.
* **Ações Rápidas:** Cada linha de lead próximo exibe botões rápidos de **Enviar E-mail (via Zoho)** e **Enviar WhatsApp (via Waha)** para entrar em contato com apenas um clique.

---

## 6. Arquitetura de Produção: Home Lab (Proxmox + Docker + PostgreSQL)

Conforme solicitado, a aplicação foi reestruturada para rodar de forma completamente independente da nuvem, de forma auto-hospedada em seu Home Lab:

### Configuração de Rede e Banco
* **IP do LXC PostgreSQL (LXC 105):** `192.168.1.64`
* **Porta Padrão:** `5432`
* **Docker Compose:** O arquivo `docker-compose.yml` na raiz gerencia os três serviços:
  * Banco de Dados PostgreSQL local (com persistência de dados).
  * Backend em Node.js (conectando nativamente com pool de conexões do PostgreSQL).
  * Frontend em ambiente otimizado e estático via Nginx.
  * **Nginx Proxy Manager:** Para controle de subdomínios, balanceamento de carga e geração fácil de certificados SSL (HTTPS).

### Mudança Dinâmica via Variável de Ambiente (`DATABASE_URL`)
A conexão com o banco de dados é totalmente baseada em ambiente.
* No seu arquivo `.env` local na máquina Proxmox, basta definir:
  ```env
  DATABASE_URL="postgresql://crm_user:crm_password@192.168.1.64:5432/leads_db"
  ```
* Se a variável `DATABASE_URL` estiver vazia ou ausente, a aplicação rodará em modo de simulação local utilizando o arquivo seguro `database.json`, permitindo testes e homologações rápidas antes do deploy definitivo no servidor.
