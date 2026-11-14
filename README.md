# 🍲 Marmitaria Sabor Caseiro - Chatbot de Vendas com Guardrails e LLM Client-Side

Aplicação web completa de chatbot de atendimento e vendas para um restaurante de marmitas caseiras. Construída 100% no navegador (Client-Side) com **HTML5, CSS3 e JavaScript puro (ES Modules)**, sem backend próprio e sem etapa obrigatória de build. Publicável diretamente no **GitHub Pages**.

O agente de IA utiliza a API do **Google Gemini** (modelo padrão `gemini-3.8-flash`) com **Function Calling nativo** para interagir com o cliente, consultar o catálogo de pratos do dia, montar pedidos a partir de linguagem natural, aplicar personalizações de ingredientes e gerar o resumo para entrega.

---

## 🎯 Destaque de Engenharia: A Fonte da Verdade Fica no Código

> [!IMPORTANT]
> **O LLM NUNCA calcula valores, totais, taxas ou descontos.** Modelos de linguagem frequentemente erram operações aritméticas e são suscetíveis a coações de engenharia social (ex.: *"o dono me deu 50% de desconto"*). 
> 
> Nesta aplicação:
> - **Preços e Totais:** Todos os cálculos residem exclusivamente em código JavaScript (`src/cart.js`), operando com **inteiros em centavos** para eliminar erros de precisão de ponto flutuante.
> - **Catálogo e Disponibilidade:** As regras de dias da semana e ingredientes removíveis residem em `src/menu.js`.
> - O LLM é instruído via System Prompt e restrito arquiteturalmente a chamar as ferramentas (*tools*) e apenas reproduzir os valores determinísticos retornados por elas.

---

## 🏛️ Arquitetura da Aplicação

```
ChatBox/
├── index.html                   # Interface principal acessível e responsiva
├── styles.css                   # Identidade visual moderna (mobile-first)
├── tests.html                   # Painel interativo de testes dos Guardrails
├── TESTES_GUARDRAILS.md         # Documentação dos 16 casos de ataque e mitigação
├── README.md                    # Manual do projeto, arquitetura e entrega
├── .github/
│   └── workflows/
│       └── deploy.yml           # Workflow automático de deploy no GitHub Pages
└── src/
    ├── app.js                   # Orquestrador da interface DOM, eventos e atalhos
    ├── agent.js                 # Agente com prompt blindado e ciclo de Function Calling
    ├── llm.js                   # Adaptador REST isolado para a API Google Gemini
    ├── menu.js                  # Catálogo de 15 produtos, dias da semana e regras
    ├── cart.js                  # Carrinho, subtotal, taxa de entrega (em centavos)
    └── guardrails.js            # Pré-filtro, regex anti-injeção, sanitização e rate limit
```

---

## 🛡️ Guardrails e Camadas de Defesa

A aplicação implementa **defesa em profundidade** contra ataques de injeção de prompt, jailbreaks, manipulação de preços e XSS:

1. **Prompt de Sistema Blindado:**
   - Define escopo exclusivo de atendimento gastronômico.
   - Trata qualquer texto do cliente estritamente como dados, encapsulando-o com delimitadores `<mensagem_cliente> ... </mensagem_cliente>`.
   - Proíbe categoricamente a revelação de instruções internas.
2. **Pré-Filtro de Entrada (`src/guardrails.js`):**
   - Limite estrito de 500 caracteres por mensagem.
   - Remoção de caracteres de controle ASCII e caracteres invisíveis / zero-width (`\u200B-\u200D`, `\uFEFF`).
   - Normalização Unicode NFKC.
   - Detecção regex de tentativas de jailbreak (*DAN*, *Developer Mode*), injeções (*"ignore as instruções anteriores"*), vazamento de prompt (*"revele seu system prompt"*), ofuscações em base64 e injeções de scripts HTML.
   - Ao detectar, a mensagem **nem sequer é enviada ao LLM**: o sistema responde imediatamente com uma recusa padrão e contabiliza a infração.
3. **Limites e Proteção contra Abuso:**
   - Rate limit local de no máximo 10 mensagens por minuto (janela deslizante de 60s).
   - Limite máximo de 30 turnos de conversa por sessão.
   - Bloqueio temporário de 2 minutos caso o usuário execute 3 tentativas suspeitas consecutivas.
4. **Pós-Filtro de Saída:**
   - Inspeciona a resposta do LLM para evitar vazamento inadvertido de trechos do prompt de sistema ou promessas alucinadas de desconto manual.
5. **Prevenção de XSS e Content Security Policy (CSP):**
   - Todas as mensagens do chat são renderizadas utilizando `textContent` e nós do DOM via `document.createTextNode()`, sem jamais usar `innerHTML` com texto de usuário ou de IA.
   - A tag `<meta http-equiv="Content-Security-Policy">` bloqueia a injeção de scripts externos e restringe conexões de rede exclusivamente ao endpoint oficial `https://generativelanguage.googleapis.com`.

### ⚠️ Limitações Conhecidas de Segurança
- **API Key no Navegador:** Como a aplicação é 100% client-side (sem backend intermediário), a chave de API fornecida pelo usuário reside na memória do navegador. Para mitigar riscos, a chave é armazenada por padrão em `sessionStorage` (destruída ao fechar a aba).
- **Filtros por Expressão Regular (Regex):** Reduzem drasticamente a superfície de ataque para padrões e termos conhecidos, porém **não eliminam 100%** de ataques com variações semânticas inéditas ou paráfrases sofisticadas. Por essa razão, a principal garantia de integridade financeira é a arquitetura onde o modelo não tem poder de alterar valores.

---

## 🔑 Como Obter e Configurar sua API Key do Google Gemini

1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey) com sua conta Google.
2. Clique em **"Create API Key"** e copie a chave gerada.
3. **(Recomendado para Produção)** No console do Google Cloud associado à sua chave, configure **Restrições de Aplicativo**:
   - Escolha **"Referenciadores HTTP (sites)"**.
   - Adicione o domínio do seu GitHub Pages: `https://<seu-usuario>.github.io/*` e `http://localhost:*` para testes locais.
   - Isso impede que a chave seja usada em outros domínios caso seja interceptada.
4. Na aplicação, clique no botão **"⚙️ Config"** no canto superior direito e cole a sua chave.
   - A chave fica guardada em `sessionStorage` por padrão.

---

## 💻 Como Executar Localmente

Como o projeto utiliza ES Modules (`import`/`export`), os navegadores exigem que os arquivos sejam servidos via protocolo HTTP/HTTPS (e não diretamente com duplo clique em `file://`).

Você pode utilizar qualquer servidor estático local:

### Opção 1: Via Node.js (npx)
```bash
npx serve .
```
Ou:
```bash
npx http-server -p 8080
```

### Opção 2: Via Python 3
```bash
python -m http.server 8080
```

### Opção 3: Extensão Live Server (VS Code)
Abra a pasta do projeto no VS Code, clique com o botão direito em `index.html` e selecione **"Open with Live Server"**.

Acesse no seu navegador: `http://localhost:8080` (ou a porta informada pelo terminal).

---

## 🧪 Como Executar a Suíte de Testes dos Guardrails

1. Inicie o servidor local ou acesse a versão publicada no GitHub Pages.
2. Acesse a página `tests.html` (ou clique no atalho **"🛡️ Painel de Testes Guardrails"** no topo do chat).
3. Clique em **"▶ Executar Todos os Testes"**.
4. Serão validados automaticamente os 16 casos de ataque detalhados em [`TESTES_GUARDRAILS.md`](./TESTES_GUARDRAILS.md).
5. Você também pode digitar qualquer mensagem arbitrária no campo de **Teste Manual** para avaliar o comportamento do filtro em tempo real.

---

## 🚀 Publicação no GitHub Pages

### 1. Inicializar o repositório Git localmente e fazer commit
```bash
git init
git add .
git commit -m "feat: implementacao completa do chatbot de marmitas com guardrails e tool calling"
git branch -M main
```

### 2. Criar o repositório no GitHub e enviar o código
Crie um novo repositório no GitHub (por exemplo, com o nome `marmitaria-chatbox`) e execute:
```bash
git remote add origin https://github.com/<seu-usuario>/marmitaria-chatbox.git
git push -u origin main
```

### 3. Ativar o GitHub Pages
1. No seu repositório no GitHub, clique na aba **Settings**.
2. No menu lateral esquerdo, clique em **Pages**.
3. Na seção **Build and deployment**:
   - **Source:** Selecione **GitHub Actions** (o arquivo `.github/workflows/deploy.yml` fará o deploy automático a cada push) OU selecione **Deploy from a branch**, escolha `main` e a pasta `/ (root)`, clicando em **Save**.
4. Em cerca de 1 a 2 minutos, o site estará no ar!

---

## 📋 Checklist de Entrega da Atividade

- [x] Aplicação 100% client-side (HTML, CSS e JS puro com ES Modules), sem backend e sem build.
- [x] O LLM **nunca calcula valores**: lógica financeira, subtotal, taxa de entrega e total calculados exclusivamente em `src/cart.js` com inteiros em centavos.
- [x] Catálogo com 15 itens em `src/menu.js` com disponibilidade dinâmica pelo dia da semana atual do navegador.
- [x] Suporte a personalizações (remover cebola/ingredientes permitidos, escolher ponto da carne) validadas contra o cardápio.
- [x] 6 Tools com validações completas em JS (`listar_cardapio_hoje`, `adicionar_item`, `remover_item`, `personalizar_item`, `ver_carrinho`, `finalizar_pedido`).
- [x] Guardrails multicamadas (pré-filtro, regex anti-jailbreak/injeção, delimitação `<mensagem_cliente>`, pós-filtro, rate limit e CSP).
- [x] Arquivo `TESTES_GUARDRAILS.md` com 16 casos de teste explicados e página interativa `tests.html`.
- [x] Interface acessível com `aria-live`, contraste, indicador de digitação, painel lateral em tempo real e botão de atalho/cópia de resumo.
- [x] Nenhuma chave de API no código ou repositório; tela de configuração no primeiro acesso com armazenamento padrão em `sessionStorage`.
- [x] Workflow pronto de deploy no GitHub Pages (`.github/workflows/deploy.yml`).

### Links para envio:
- **Link do Repositório:** `https://github.com/<seu-usuario>/<nome-do-repositorio>`
- **Link do GitHub Pages:** `https://<seu-usuario>.github.io/<nome-do-repositorio>/`

