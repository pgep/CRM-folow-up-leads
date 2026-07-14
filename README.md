# 💍 CRM Follow-up Noivas V2 — Casa Colombo Artesanal

<p align="center">
  <img src="assets/logo.png" alt="Casa Colombo Artesanal Logo" width="180" style="border-radius: 50%;" />
</p>

O **CRM Follow-up Noivas V2** é um sistema full-stack completo e sob medida para a **Casa Colombo Artesanal**, projetado especificamente para gerenciar e automatizar a jornada de comunicação e prospecção de noivas e noivos interessados em lembrancinhas de casamento de alto padrão (velas aromáticas veganas, difusores, home sprays, etc.). 

A aplicação foi reestruturada para operar com máxima robustez e flexibilidade, tanto na nuvem quanto em ambiente **Home Lab** auto-hospedado de forma 100% independente, integrando automação de mensagens multi-canal (WhatsApp e E-mail), inteligência de orçamentos dinâmicos, captura automatizada de portais por webhook e inteligência de vendas.

---

## 🗺️ Visão Geral da Arquitetura do Sistema

A aplicação é dividida em duas camadas principais operando de forma integrada:

1. **Frontend (SPA - React 19 + Vite + Tailwind CSS + Framer Motion):**
   * Interface de usuário escura (Dark Theme), polida, altamente responsiva e moderna.
   * Utiliza **Lucide React** para iconografia unificada e **Recharts** para relatórios e indicadores dinâmicos.
   * Totalmente modularizada para prevenir sobrecarga de arquivos e garantir legibilidade técnica.

2. **Backend (Node.js + Express + PostgreSQL / JSON Fallback):**
   * Servidor integrado em `server.ts` que gerencia toda a lógica de persistência, disparadores automáticos (scheduler), envio de e-mails, despachos de WhatsApp e webhooks de entrada.
   * **Modo Dual-Database Inteligente:**
     * **Modo Produção (Banco Relacional):** Conecta-se nativamente a um servidor de banco de dados **PostgreSQL** através da variável de ambiente `DATABASE_URL` (ideal para o LXC Proxmox).
     * **Modo Simulação (Sem Nuvem/Local):** Caso a variável `DATABASE_URL` não esteja definida, o CRM armazena e lê os dados automaticamente em um arquivo estruturado `database.json`, o que permite testes locais rápidos e total portabilidade sem infraestrutura prévia.
   * **Compilação CJS com esbuild:** No processo de build, o backend TypeScript é empacotado em um único arquivo otimizado `dist/server.cjs` para evitar problemas de caminhos e garantir inicializações extremamente rápidas.

---

## 🛠️ Cadastros Básicos e Parâmetros (Master Data)

O CRM é altamente parametrizável por meio de suas abas administrativas na interface gráfica. Nenhuma configuração técnica precisa ser feita diretamente no banco de dados.

### A. Catálogo de Produtos (Orçamento)
Permite cadastrar os produtos de lembrancinhas fornecidos pela Casa Colombo. Cada produto possui:
* **Nome do Produto** (Ex: *Mini vela aromática (vidro/cortiça)*).
* **Preço Unitário** (Ex: *R$ 13,90*).
* **Descrição/Particularidades**.
* **Como é utilizado:** Com base no número de convidados registrado no perfil do lead, o sistema consulta estes valores para projetar **5 combinações diferentes de orçamentos dinâmicos** para a noiva, atualizando instantaneamente as propostas no momento do atendimento.

### B. Listas de Opções Dinâmicas (Campos Customizados)
O usuário pode gerenciar os valores aceitos no CRM para categorização dos leads:
* **Status do Funil:** Permite adicionar, remover ou reordenar os status operacionais (padrões: *Primeiro Contato, Follow-up 1, Follow-up 2, Follow-up 3, Follow-up Final, Respondido, Fechou, Perdido, Sem Retorno*).
* **Temperaturas de Lead:** Níveis de interesse comercial (padrões: *Fria, Morna, Quente, Cliente*).

### C. Parâmetros de Envio (Canais de Comunicação)
Centraliza a configuração dos canais de transmissão do CRM:
* **Zoho Mail SMTP (E-mail):** Parametrização do servidor seguro (`smtp.zoho.com`), porta segura (`465`), remetente nominal e senha de aplicativo (App Password) para disparo automático de propostas e follow-ups por correio eletrônico.
* **Waha WhatsApp API (WhatsApp):** Integração com o container local de automação de WhatsApp (Waha). Configura-se a URL do endpoint, o nome da sessão de comunicação, chaves de API e um **Intervalo de Segurança (delay)** entre envios sucessivos para evitar bloqueio do chip telefônico.
* **Módulos de Teste:** Botões integrados para enviar mensagens de teste imediatas (WhatsApp e e-mail) a fim de homologar a conectividade dos canais.

---

## 📥 Canais de Entrada de Leads e Integrações

O CRM elimina a necessidade de digitação manual exaustiva, oferecendo canais manuais e automatizados robustos:

### 1. Entrada de Leads Manuais (Vendas Diretas)
* **Fluxo:** Utilizado para contatos diretos do Instagram, telefone ou indicações.
* **Estado Inicial:** O lead inicia obrigatoriamente com a etapa **Sem Contato** (`SEM_CONTATO`) e status de funil **Primeiro Contato**.
* **Temperatura:** Inicia como **Fria**.

### 2. Entrada de Leads via Webhooks de Portais (n8n ou API Direta)
* **Endpoints Disponíveis:** `/api/leads/webhook?portal=PORTAL` e `/api/leads/n8n-webhook`
* **Fluxo:** Integração com fluxos n8n, Zapier ou chamadas diretas de portais parceiros (Casamentos.com.br, Zankyou, Noivas.com.br).
* **Estado Inicial Diferenciado:** Todo lead criado via webhook inicia na etapa **Orçamento Enviado** e status de funil **Primeiro Contato**.
* **🚀 Automação de Disparo Imediato:** Assim que o banco de dados registra a inserção do lead pelo webhook, o backend intercepta o evento e **dispara imediatamente a sequência de número 1 do fluxo de automação (Boas-Vindas)**, enviando o WhatsApp e/ou e-mail configurados para o cliente de forma instantânea.

### 3. Zoho Email Parser (IA Gemini)
* **Endpoint Disponível:** `/api/leads/zoho-email`
* **Fluxo:** Quando o portal de noivas envia um e-mail de alerta padrão para a caixa Zoho Mail do usuário, o parser de e-mail integrado entra em ação.
* **Uso de IA:** O corpo do e-mail é passado para o modelo **Gemini 2.5/1.5** via API para ler e extrair campos cruciais (Nome da noiva, telefone higienizado para WhatsApp, e-mail, mês do casamento, local, estimativa de convidados e observações).
* **Estado Inicial:** Assim como o webhook, o lead é inserido na etapa **Orçamento Enviado / Primeiro Contato** e recebe o primeiro follow-up de forma **imediata**.

### 4. Importador de Planilhas em Lote (Excel)
* **Fluxo:** Permite subir arquivos `.xlsx` ou `.csv` diretamente na tela.
* **Tratamento de Dados:** O sistema sanitiza automaticamente as colunas de telefone, calcula a data correspondente do casamento, padroniza as temperaturas e os aloca no início do fluxo.

---

## ⚙️ A Esteira de Automação & Workflows (Follow-up)

A esteira de automação do CRM é o coração pensante do sistema de vendas da Casa Colombo Artesanal. Ela funciona de forma sequencial com base nas configurações criadas no **Editor de Etapas**.

### 📋 Funcionamento do Editor de Etapa (Campos do Fluxo)

Cada etapa do fluxo automatizado de follow-up representa uma "estação" pela qual o lead passará. Seus campos representam:

| Campo | O que representa | Comportamento no Sistema |
| :--- | :--- | :--- |
| **Etapa ID** | Identificador de sistema da etapa. | Usado internamente para mapear onde o lead está posicionado (Ex: `SEM_CONTATO`, `WHATSAPP_ENVIADO`). |
| **Descrição / Nome** | O rótulo amigável daquela etapa do fluxo. | Exibido nas fichas e no pipeline (Ex: *"WhatsApp de Boas-Vindas"*). |
| **Canal** | O meio físico de envio da mensagem. | Opções: `WHATSAPP`, `EMAIL` ou `NENHUM` (interrupção/manual). |
| **Ordem (Seq.)** | A numeração cronológica sequencial. | Define em qual posição do ciclo de vendas esta mensagem é disparada (Sequência 1, Sequência 2, etc.). |
| **Esperar Dias** | Tempo de carência/espera necessário nesta etapa. | Quantidade de dias que o CRM aguardará **após** enviar a mensagem desta etapa para permitir o disparo da próxima sequência. |
| **Próxima Etapa** | Destino automático do lead após o envio. | O sistema mudará o campo `etapa_contato` do lead para este valor imediatamente após o despacho bem-sucedido. |
| **Próximo Status** | Atualização automática do status do funil. | Atualiza o `status_funil` do lead (Ex: muda de *"Primeiro Contato"* para *"Follow-up 1"*). |
| **Temperatura** | Atualização automática de interesse. | Atualiza o termômetro de interesse do lead (Ex: muda de *"Fria"* para *"Morna"*). |
| **Template de Mensagem** | O corpo de texto a ser enviado. | Suporta tags dinâmicas como `{{nome}}`, `{{convidados}}`, `{{mes_casamento}}` e valores de propostas `{{soma1}}`, `{{soma2}}`, que são substituídas em tempo de execução pelos dados reais do cliente. |
| **Assunto (E-mail)** | Linha de assunto do e-mail. | Utilizado apenas quando o canal é `EMAIL`. Também aceita tags dinâmicas. |
| **Imagens Anexas** | URLs de imagens (separadas por vírgulas). | O sistema baixa e anexa estas imagens no envio de WhatsApp/E-mail (imagens das lembrancinhas de casamento para encantar a noiva). |

### 🔍 Como o Sistema escolhe qual mensagem enviar para cada Lead?

O motor de automação (rodado manualmente ou via cron automático agendado) executa a seguinte lógica seletiva para cada lead:

1. **Validação de Bloqueio (Auto-Stop):**
   * Se o lead estiver com status de funil igual a **RESPONDIDO**, **FECHOU (Convertido)**, ou **PERDIDO/ENCERRADO**, ele é **completamente ignorado** pelo robô de automação. Isso garante que noivas que já responderam ou fecharam contrato nunca recebam mensagens automatizadas inoportunas.
2. **Identificação da Etapa Atual:**
   * O sistema lê o campo `etapa_contato` gravado no registro do lead.
3. **Mapeamento do Workflow:**
   * O motor busca na tabela `workflow_config` qual etapa cadastrada corresponde à etapa do lead.
4. **Verificação da Carência Cronológica:**
   * O sistema avalia se a data atual é igual ou posterior à data calculada em `proxima_acao_em` (ou se o tempo configurado em `esperar_dias` desde a `ultima_interacao_em` já passou). Se o lead ainda estiver no período de carência, ele é pulado.
5. **Transmissão e Transição:**
   * Cumpridos os requisitos, o CRM gera a mensagem personalizada compilando o template.
   * Dispara o e-mail via Zoho SMTP ou WhatsApp via WAHA.
   * Grava o evento de envio com o texto integral na **Linha do Tempo (Histórico)** do lead.
   * **Executa as Transições:** Altera a etapa do lead para a `Próxima Etapa` configurada, atualiza o status de funil para o `Próximo Status`, altera a temperatura de interesse comercial e atualiza `proxima_acao_em` somando o número de dias especificado no campo `Esperar Dias`.

---

## 📊 Dashboard & Inteligência Comercial de Vendas

O painel de comando estratégico do CRM fornece insights visuais para tomadas de decisão rápidas:

* **Estatísticas Gerenciais Ativas:** Total de leads, receita potencial estimada no funil, taxa de conversão e distribuição gráfica de leads por canal, temperatura e status.
* **Higienização de Casamentos Passados:** O dashboard **ignora automaticamente** casamentos cuja data limite já passou em relação ao dia de hoje. Isso impede que noivas antigas inflem os dados atuais, deixando a equipe comercial focada exclusivamente em eventos futuros e negociações reais.
* **🚨 Módulo de Proximidade de Casamento (Contagem Regressiva):**
  * Alertas em destaque para casamentos que acontecerão em **até 1 mês** (urgência crítica), **até 2 meses** (fase de refinamento) e **até 3 meses** (início de prospecção comercial).
  * Exibe ações rápidas de **WhatsApp de 1 Clique** e **E-mail de 1 Clique** para acionar a noiva diretamente sem precisar abrir o cadastro.

---

## 🏠 Configuração de Infraestrutura (Home Lab / LXC Proxmox / Docker)

O sistema foi otimizado para rodar de forma auto-hospedada em sua infraestrutura local:

### 💾 Arquivos e Volumes Principais
* `docker-compose.yml`: Define a orquestração do container do CRM.
* `database.json`: Usado como banco de dados NoSQL portátil caso você opte por não configurar um banco de dados relacional tradicional.
* `.env.example`: Modelo de variáveis de ambiente.

### 🌐 Variáveis de Ambiente Necessárias (`.env`)
Configure um arquivo `.env` na raiz do seu projeto local:

```env
# Banco de Dados (PostgreSQL local ou na rede)
# Exemplo apontando para seu LXC 105 PostgreSQL:
DATABASE_URL="postgresql://crm_user:crm_password@192.168.1.64:5432/leads_db"

# API Key da Inteligência Artificial (Gemini) para leitura automática de e-mails
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere..."

# Ambiente
NODE_ENV="production"
```

### 🚀 Comandos Rápidos para Execução Local

**Modo de Desenvolvimento:**
```bash
npm install
npm run dev
```

**Modo de Produção (Compilação e Execução):**
```bash
# Compila o frontend React e empacota o backend via esbuild
npm run build

# Inicia o servidor unificado em Node.js
npm run start
```

---

## 💎 Diferenciais e Boas Práticas Implementadas

* **Higienização Automática de Telefones:** Todo telefone inserido via webhook ou planilha é higienizado removendo parênteses, traços e espaços, adicionando o DDI `55` caso ausente, para perfeita compatibilidade com a API de WhatsApp.
* **Tratamento de Erros Resiliente:** Caso o servidor de e-mail SMTP ou o WhatsApp falhem temporariamente, as tentativas de entrega são registradas na linha do tempo do lead com os logs de falha para auditoria, sem travar a execução do sistema.
* **Privacidade e Segurança:** As senhas de SMTP e chaves de WhatsApp são tratadas de forma estrita, permanecendo salvas localmente e ocultas do painel do cliente.

---
*Desenvolvido com carinho para a gestão e o encantamento das noivas da **Casa Colombo Artesanal** 💍🕯️*
