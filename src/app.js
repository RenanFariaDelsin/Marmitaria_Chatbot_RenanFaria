/**
 * app.js - Ponto de entrada da aplicação frontend
 * Gerencia a interface, eventos do chat, renderização acessível e estado do painel lateral.
 */

import { GeminiAdapter, MODELO_PADRAO } from './llm.js';
import { AgenteAtendimento } from './agent.js';
import { carrinho, CONFIG_ENTREGA } from './cart.js';
import { listarCardapioHoje, getNomeDiaSemanaHoje, formatarPreco } from './menu.js';
import { guardrails } from './guardrails.js';

// Chaves de armazenamento
const STORAGE_KEY_API = 'marmitaria_gemini_api_key';
const STORAGE_KEY_MODEL = 'marmitaria_gemini_model';
const STORAGE_KEY_REMEMBER = 'marmitaria_remember_key';
const STORAGE_KEY_TEMA = 'marmitaria_tema';

class App {
  constructor() {
    this.apiKey = this.carregarApiKey();
    this.modelo = this.carregarModelo();
    this.llmAdapter = new GeminiAdapter(this.apiKey, this.modelo);
    this.agente = new AgenteAtendimento(this.llmAdapter);

    this.cacheElementosDOM();
    this.vincularEventos();
    this.inicializarInterface();
  }

  cacheElementosDOM() {
    // Tela Inicial (Landing Page) e Navegação entre Telas
    this.telaInicial = document.getElementById('tela-inicial');
    this.telaChatbot = document.getElementById('tela-chatbot');
    this.btnIrChatbot = document.getElementById('btn-ir-chatbot');
    this.btnIrCardapioInicial = document.getElementById('btn-ir-cardapio-inicial');
    this.btnVoltarInicio = document.getElementById('btn-voltar-inicio');
    this.linkMarcaInicio = document.getElementById('link-marca-inicio');
    this.btnToggleTemaInicial = document.getElementById('btn-toggle-tema-inicial');
    this.iconeTemaInicial = document.getElementById('icone-tema-inicial');
    this.textoTemaInicial = document.getElementById('texto-tema-inicial');
    this.diaHojeInicialElem = document.getElementById('dia-hoje-inicial');

    // Configurações e Modais
    this.btnToggleTema = document.getElementById('btn-toggle-tema');
    this.iconeTema = document.getElementById('icone-tema');
    this.textoTema = document.getElementById('texto-tema');
    this.modalConfig = document.getElementById('modal-config');
    this.btnAbrirConfig = document.getElementById('btn-abrir-config');
    this.btnFecharConfig = document.getElementById('btn-fechar-config');
    this.btnCancelarConfig = document.getElementById('btn-cancelar-config');
    this.btnUsarDemo = document.getElementById('btn-usar-demo');
    this.formConfig = document.getElementById('form-config');
    this.inputApiKey = document.getElementById('input-api-key');
    this.selectModelo = document.getElementById('select-modelo');
    this.checkLembrar = document.getElementById('check-lembrar-chave');
    this.statusApiKeyBadge = document.getElementById('status-api-badge');
    this.alertaBannerApiKey = document.getElementById('alerta-sem-chave');

    // Chat
    this.chatMensagens = document.getElementById('chat-mensagens');
    this.formChat = document.getElementById('form-chat');
    this.inputMensagem = document.getElementById('input-mensagem');
    this.btnEnviar = document.getElementById('btn-enviar');
    this.indicadorDigitando = document.getElementById('indicador-digitando');

    // Botões de atalho
    this.btnAtalhoCardapio = document.getElementById('btn-atalho-cardapio');
    this.btnAtalhoCarrinho = document.getElementById('btn-atalho-carrinho');
    this.btnAtalhoLimpar = document.getElementById('btn-atalho-limpar');

    // Painel lateral
    this.painelLateral = document.getElementById('painel-lateral');
    this.painelBackdrop = document.getElementById('painel-backdrop');
    this.btnAbrirCardapioTopo = document.getElementById('btn-abrir-cardapio-topo');
    this.btnTogglePainel = document.getElementById('btn-toggle-painel');
    this.btnFecharPainel = document.getElementById('btn-fechar-painel');
    this.abaCardapioBtn = document.getElementById('aba-btn-cardapio');
    this.abaCarrinhoBtn = document.getElementById('aba-btn-carrinho');
    this.abaCardapioConteudo = document.getElementById('aba-conteudo-cardapio');
    this.abaCarrinhoConteudo = document.getElementById('aba-conteudo-carrinho');
    this.badgeContadorCarrinho = document.getElementById('badge-contador-carrinho');

    // Elementos do Carrinho
    this.listaItensCarrinho = document.getElementById('lista-itens-carrinho');
    this.carrinhoVazioAviso = document.getElementById('carrinho-vazio-aviso');
    this.carrinhoTotaisContainer = document.getElementById('carrinho-totais-container');
    this.valorSubtotalElem = document.getElementById('resumo-subtotal');
    this.valorFreteElem = document.getElementById('resumo-frete');
    this.valorTotalElem = document.getElementById('resumo-total');
    this.avisoFreteGratisElem = document.getElementById('aviso-frete-gratis');

    // Elementos do Cardápio
    this.listaCardapioContainer = document.getElementById('lista-cardapio');
    this.nomeDiaCardapioElem = document.getElementById('nome-dia-cardapio');

    // Toast de notificação
    this.toastElem = document.getElementById('toast-notificacao');
  }

  carregarApiKey() {
    // 1. Tenta sessionStorage
    let key = sessionStorage.getItem(STORAGE_KEY_API);
    if (!key) {
      // 2. Tenta localStorage se o usuário tiver optado
      key = localStorage.getItem(STORAGE_KEY_API);
    }
    return key || '';
  }

  carregarModelo() {
    let modeloSalvo = sessionStorage.getItem(STORAGE_KEY_MODEL) || 
                      localStorage.getItem(STORAGE_KEY_MODEL) || 
                      MODELO_PADRAO;

    // Migração automática caso o navegador tenha modelos com histórico de fila/indisponibilidade
    if (modeloSalvo === 'gemini-2.5-flash' || modeloSalvo === 'gemini-2.5-pro' || modeloSalvo === 'gemini-3.8-flash') {
      modeloSalvo = MODELO_PADRAO; // gemini-2.0-flash
      if (sessionStorage.getItem(STORAGE_KEY_MODEL)) {
        sessionStorage.setItem(STORAGE_KEY_MODEL, MODELO_PADRAO);
      }
      if (localStorage.getItem(STORAGE_KEY_MODEL)) {
        localStorage.setItem(STORAGE_KEY_MODEL, MODELO_PADRAO);
      }
    }

    return modeloSalvo;
  }

  salvarConfiguracoes(apiKey, modelo, lembrar) {
    this.apiKey = apiKey.trim();
    this.modelo = modelo.trim();

    this.llmAdapter.setApiKey(this.apiKey);
    this.llmAdapter.setModelo(this.modelo);

    if (lembrar) {
      localStorage.setItem(STORAGE_KEY_API, this.apiKey);
      localStorage.setItem(STORAGE_KEY_MODEL, this.modelo);
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
      sessionStorage.removeItem(STORAGE_KEY_API);
      sessionStorage.removeItem(STORAGE_KEY_MODEL);
    } else {
      sessionStorage.setItem(STORAGE_KEY_API, this.apiKey);
      sessionStorage.setItem(STORAGE_KEY_MODEL, this.modelo);
      localStorage.removeItem(STORAGE_KEY_API);
      localStorage.removeItem(STORAGE_KEY_MODEL);
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
    }

    this.atualizarStatusApiKeyUI();
    this.garantirMensagemBoasVindas();
    this.exibirToast('Configurações salvas com sucesso!');
  }

  garantirMensagemBoasVindas() {
    if (this.chatMensagens && this.chatMensagens.children.length === 0) {
      this.renderizarMensagemAgente(
        `Olá! Seja muito bem-vindo(a) à **Marmitaria Sabor Caseiro**! 🍲✨\n\nHoje é **${getNomeDiaSemanaHoje()}**, e já preparamos pratos fresquinhos e deliciosos para o seu almoço. O que você gostaria de pedir hoje? Se quiser ver as opções do dia, basta me pedir ou clicar em "Ver cardápio"!`
      );
    }
  }

  vincularEventos() {
    // Envio do formulário de chat
    this.formChat.addEventListener('submit', (e) => {
      e.preventDefault();
      this.enviarMensagemUsuario();
    });

    // Atalhos
    if (this.btnAtalhoCardapio) {
      this.btnAtalhoCardapio.addEventListener('click', () => {
        this.abrirPainel('cardapio');
        this.processarMensagemDireta('Por favor, mostre os pratos do cardápio de hoje.');
      });
    }

    if (this.btnAtalhoCarrinho) {
      this.btnAtalhoCarrinho.addEventListener('click', () => {
        this.abrirPainel('carrinho');
        this.processarMensagemDireta('Quanto está dando o meu pedido com o frete?');
      });
    }

    if (this.btnAtalhoLimpar) {
      this.btnAtalhoLimpar.addEventListener('click', () => {
        if (confirm('Deseja realmente limpar a conversa e reiniciar o atendimento?')) {
          this.reiniciarConversa();
        }
      });
    }

    // Controle do Painel Lateral
    if (this.btnAbrirCardapioTopo) {
      this.btnAbrirCardapioTopo.addEventListener('click', () => {
        if (this.painelLateral.classList.contains('aberto') && this.abaCardapioConteudo.classList.contains('ativo')) {
          this.fecharPainel();
        } else {
          this.abrirPainel('cardapio');
        }
      });
    }

    this.btnTogglePainel.addEventListener('click', () => {
      if (this.painelLateral.classList.contains('aberto') && this.abaCarrinhoConteudo.classList.contains('ativo')) {
        this.fecharPainel();
      } else {
        this.abrirPainel('carrinho');
      }
    });

    this.btnFecharPainel.addEventListener('click', () => {
      this.fecharPainel();
    });

    if (this.painelBackdrop) {
      this.painelBackdrop.addEventListener('click', () => {
        this.fecharPainel();
      });
    }

    // Tecla ESC para fechar painel ou modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.painelLateral.classList.contains('aberto')) {
          this.fecharPainel();
        } else if (this.modalConfig.classList.contains('ativo')) {
          this.fecharModalConfig();
        }
      }
    });

    // Abas do Painel Lateral
    this.abaCardapioBtn.addEventListener('click', () => this.trocarAbaPainel('cardapio'));
    this.abaCarrinhoBtn.addEventListener('click', () => this.trocarAbaPainel('carrinho'));

    // Modo Escuro (Cabeçalho do Chat e Tela Inicial)
    if (this.btnToggleTema) {
      this.btnToggleTema.addEventListener('click', () => this.alternarTema());
    }
    if (this.btnToggleTemaInicial) {
      this.btnToggleTemaInicial.addEventListener('click', () => this.alternarTema());
    }

    // Navegação entre Tela Inicial e Tela do Chatbot
    if (this.btnIrChatbot) {
      this.btnIrChatbot.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'chat';
        this.mostrarTelaChatbot(false);
      });
    }

    if (this.btnIrCardapioInicial) {
      this.btnIrCardapioInicial.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'cardapio';
        this.mostrarTelaChatbot(true);
      });
    }

    if (this.btnVoltarInicio) {
      this.btnVoltarInicio.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'inicio';
        this.mostrarTelaInicial();
      });
    }

    if (this.linkMarcaInicio) {
      this.linkMarcaInicio.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'inicio';
        this.mostrarTelaInicial();
      });
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash;
      if (hash === '#chat') {
        this.mostrarTelaChatbot(false);
      } else if (hash === '#cardapio') {
        this.mostrarTelaChatbot(true);
      } else if (hash === '#inicio' || hash === '') {
        this.mostrarTelaInicial();
      }
    });

    // Modal de Configurações
    this.btnAbrirConfig.addEventListener('click', () => this.abrirModalConfig());
    this.btnFecharConfig.addEventListener('click', () => this.fecharModalConfig());
    if (this.btnCancelarConfig) {
      this.btnCancelarConfig.addEventListener('click', () => this.fecharModalConfig());
    }
    if (this.alertaBannerApiKey) {
      this.alertaBannerApiKey.addEventListener('click', () => this.abrirModalConfig());
    }

    // Fechar modal ao clicar fora do card
    this.modalConfig.addEventListener('click', (e) => {
      if (e.target === this.modalConfig) {
        this.fecharModalConfig();
      }
    });

    if (this.btnUsarDemo) {
      this.btnUsarDemo.addEventListener('click', () => {
        this.salvarConfiguracoes('demo', 'demo-simulado', true);
        this.fecharModalConfig();
      });
    }

    this.formConfig.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = this.inputApiKey.value;
      const modelo = this.selectModelo.value;
      const lembrar = this.checkLembrar.checked;
      this.salvarConfiguracoes(key, modelo, lembrar);
      this.fecharModalConfig();
    });

    // Inscrição no estado do carrinho
    carrinho.inscrever((estadoCarrinho) => {
      this.renderizarCarrinho(estadoCarrinho);
    });
  }

  inicializarInterface() {
    this.inicializarTema();
    this.atualizarStatusApiKeyUI();
    this.renderizarCardapioDoDia();
    this.renderizarCarrinho(carrinho.obterResumoCarrinho());

    if (this.diaHojeInicialElem) {
      this.diaHojeInicialElem.textContent = getNomeDiaSemanaHoje();
    }

    // Verifica hash da URL para saber se inicia na Tela Inicial ou direto no Chatbot
    const hash = window.location.hash;
    if (hash === '#chat') {
      this.mostrarTelaChatbot(false);
    } else if (hash === '#cardapio') {
      this.mostrarTelaChatbot(true);
    } else {
      this.mostrarTelaInicial();
    }
  }

  mostrarTelaChatbot(abrirAbaCardapio = false) {
    if (this.telaInicial) {
      this.telaInicial.classList.add('oculta');
    }
    if (this.telaChatbot) {
      this.telaChatbot.classList.remove('oculta');
    }

    if (abrirAbaCardapio) {
      this.abrirPainel('cardapio');
    }

    // Se não tiver chave configurada, abre modal de configurações ao entrar no chatbot
    if (!this.apiKey) {
      setTimeout(() => {
        this.abrirModalConfig();
      }, 300);
    } else {
      this.garantirMensagemBoasVindas();
      if (!abrirAbaCardapio && this.inputMensagem) {
        this.inputMensagem.focus();
      }
    }
  }

  mostrarTelaInicial() {
    this.fecharPainel();
    this.fecharModalConfig();

    if (this.telaChatbot) {
      this.telaChatbot.classList.add('oculta');
    }
    if (this.telaInicial) {
      this.telaInicial.classList.remove('oculta');
    }
  }

  atualizarStatusApiKeyUI() {
    const isDemo = this.modelo === 'demo-simulado' || (this.apiKey && this.apiKey.toLowerCase() === 'demo');
    const temChave = Boolean((this.apiKey && this.apiKey.length > 10) || isDemo);

    if (temChave) {
      if (isDemo) {
        this.statusApiKeyBadge.textContent = 'Modo Demo Ativo';
        this.statusApiKeyBadge.className = 'status-badge conectada';
      } else {
        this.statusApiKeyBadge.textContent = 'API Conectada';
        this.statusApiKeyBadge.className = 'status-badge conectada';
      }
      if (this.alertaBannerApiKey) {
        this.alertaBannerApiKey.style.display = 'none';
      }
    } else {
      this.statusApiKeyBadge.textContent = 'Chave Pendente';
      this.statusApiKeyBadge.className = 'status-badge pendente';
      if (this.alertaBannerApiKey) {
        this.alertaBannerApiKey.style.display = 'block';
      }
    }
  }

  abrirModalConfig() {
    this.inputApiKey.value = this.apiKey;
    this.selectModelo.value = this.modelo;
    this.checkLembrar.checked = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
    this.modalConfig.classList.add('ativo');
    this.inputApiKey.focus();
  }

  fecharModalConfig() {
    this.modalConfig.classList.remove('ativo');
  }

  inicializarTema() {
    const temaSalvo = localStorage.getItem(STORAGE_KEY_TEMA);
    if (temaSalvo) {
      this.aplicarTema(temaSalvo === 'escuro', false);
    } else {
      const prefereEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.aplicarTema(prefereEscuro, false);
    }
  }

  aplicarTema(escuro, salvar = true) {
    if (escuro) {
      document.body.classList.add('modo-escuro');
      if (this.iconeTema) this.iconeTema.textContent = '☀️';
      if (this.textoTema) this.textoTema.textContent = 'Claro';
      if (this.btnToggleTema) this.btnToggleTema.title = 'Alternar para Modo Claro';
      if (this.iconeTemaInicial) this.iconeTemaInicial.textContent = '☀️';
      if (this.textoTemaInicial) this.textoTemaInicial.textContent = 'Claro';
      if (this.btnToggleTemaInicial) this.btnToggleTemaInicial.title = 'Alternar para Modo Claro';
      if (salvar) localStorage.setItem(STORAGE_KEY_TEMA, 'escuro');
    } else {
      document.body.classList.remove('modo-escuro');
      if (this.iconeTema) this.iconeTema.textContent = '🌙';
      if (this.textoTema) this.textoTema.textContent = 'Escuro';
      if (this.btnToggleTema) this.btnToggleTema.title = 'Alternar para Modo Escuro';
      if (this.iconeTemaInicial) this.iconeTemaInicial.textContent = '🌙';
      if (this.textoTemaInicial) this.textoTemaInicial.textContent = 'Escuro';
      if (this.btnToggleTemaInicial) this.btnToggleTemaInicial.title = 'Alternar para Modo Escuro';
      if (salvar) localStorage.setItem(STORAGE_KEY_TEMA, 'claro');
    }
  }

  alternarTema() {
    const estaEscuro = document.body.classList.contains('modo-escuro');
    this.aplicarTema(!estaEscuro, true);
    this.exibirToast(!estaEscuro ? 'Modo Escuro ativado 🌙' : 'Modo Claro ativado ☀️');
  }

  abrirPainel(aba = 'carrinho') {
    this.painelLateral.classList.add('aberto');
    document.body.classList.add('painel-aberto');
    if (this.painelBackdrop) {
      this.painelBackdrop.classList.add('ativo');
    }
    this.trocarAbaPainel(aba);
  }

  fecharPainel() {
    this.painelLateral.classList.remove('aberto');
    document.body.classList.remove('painel-aberto');
    if (this.painelBackdrop) {
      this.painelBackdrop.classList.remove('ativo');
    }
  }

  alternarPainel(aba = 'carrinho') {
    if (this.painelLateral.classList.contains('aberto')) {
      this.fecharPainel();
    } else {
      this.abrirPainel(aba);
    }
  }

  trocarAbaPainel(aba) {
    if (aba === 'cardapio') {
      this.abaCardapioBtn.classList.add('ativa');
      this.abaCarrinhoBtn.classList.remove('ativa');
      this.abaCardapioConteudo.classList.add('ativo');
      this.abaCarrinhoConteudo.classList.remove('ativo');
    } else {
      this.abaCarrinhoBtn.classList.add('ativa');
      this.abaCardapioBtn.classList.remove('ativa');
      this.abaCarrinhoConteudo.classList.add('ativo');
      this.abaCardapioConteudo.classList.remove('ativo');
    }
  }

  reiniciarConversa() {
    carrinho.limpar();
    guardrails.resetarSessao();
    this.agente.limparHistorico();
    this.chatMensagens.innerHTML = '';
    this.renderizarMensagemAgente(
      `Atendimento reiniciado! 🍲 Olá, bem-vindo(a) à **Marmitaria Sabor Caseiro**! Hoje é **${getNomeDiaSemanaHoje()}**. Como posso montar seu pedido?`
    );
    this.exibirToast('Conversa e carrinho reiniciados.');
  }

  renderizarCardapioDoDia() {
    const itensHoje = listarCardapioHoje();
    this.nomeDiaCardapioElem.textContent = getNomeDiaSemanaHoje();
    this.listaCardapioContainer.innerHTML = '';

    itensHoje.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card-item-cardapio';

      const topo = document.createElement('div');
      topo.className = 'card-item-topo';

      const nome = document.createElement('h4');
      nome.textContent = item.nome;

      const preco = document.createElement('span');
      preco.className = 'card-item-preco';
      preco.textContent = item.precoFormatado;

      topo.appendChild(nome);
      topo.appendChild(preco);

      const desc = document.createElement('p');
      desc.className = 'card-item-desc';
      desc.textContent = item.descricao;

      const rodape = document.createElement('div');
      rodape.className = 'card-item-rodape';

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'card-tags';

      if (item.ingredientesRemoviveis && item.ingredientesRemoviveis.length > 0) {
        const tagIng = document.createElement('span');
        tagIng.className = 'tag-cardapio';
        tagIng.textContent = `Pode retirar: ${item.ingredientesRemoviveis.join(', ')}`;
        tagsContainer.appendChild(tagIng);
      }

      if (item.pontosCozimento && item.pontosCozimento.length > 0) {
        const tagPonto = document.createElement('span');
        tagPonto.className = 'tag-cardapio';
        tagPonto.textContent = `Pontos: ${item.pontosCozimento.join(', ')}`;
        tagsContainer.appendChild(tagPonto);
      }

      const btnPedir = document.createElement('button');
      btnPedir.className = 'btn-pedir-item';
      btnPedir.textContent = '+ Pedir';
      btnPedir.title = `Pedir ${item.nome}`;
      btnPedir.addEventListener('click', () => {
        this.processarMensagemDireta(`Gostaria de pedir 1x ${item.nome}.`);
      });

      rodape.appendChild(tagsContainer);
      rodape.appendChild(btnPedir);

      card.appendChild(topo);
      card.appendChild(desc);
      card.appendChild(rodape);

      this.listaCardapioContainer.appendChild(card);
    });
  }

  renderizarCarrinho(resumo) {
    // Atualiza contador badge no botão de carrinho do cabeçalho
    const qtdTotal = resumo.quantidadeTotalItens || 0;
    this.badgeContadorCarrinho.textContent = qtdTotal;
    this.badgeContadorCarrinho.style.display = qtdTotal > 0 ? 'inline-flex' : 'none';

    this.listaItensCarrinho.innerHTML = '';

    if (resumo.estaVazio) {
      this.carrinhoVazioAviso.style.display = 'block';
      this.carrinhoTotaisContainer.style.display = 'none';
      return;
    }

    this.carrinhoVazioAviso.style.display = 'none';
    this.carrinhoTotaisContainer.style.display = 'block';

    resumo.itens.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.className = 'item-carrinho-row';

      const infoContainer = document.createElement('div');
      infoContainer.className = 'item-carrinho-info';

      const titulo = document.createElement('strong');
      titulo.textContent = `${item.quantidade}x ${item.nome}`;

      const precoUnit = document.createElement('span');
      precoUnit.className = 'item-carrinho-sub';
      precoUnit.textContent = `${item.subtotalItemFormatado} (${item.precoUnitarioFormatado}/un)`;

      infoContainer.appendChild(titulo);
      infoContainer.appendChild(precoUnit);

      if (item.personalizacaoTexto && item.personalizacaoTexto !== 'Padrão da casa') {
        const custom = document.createElement('span');
        custom.className = 'item-carrinho-custom';
        custom.textContent = `(${item.personalizacaoTexto})`;
        infoContainer.appendChild(custom);
      }

      // Botão/Link para adicionar ou editar observação do item
      const linkObs = document.createElement('button');
      linkObs.className = 'link-adicionar-obs';
      linkObs.type = 'button';
      if (item.personalizacao?.observacao) {
        linkObs.textContent = `📝 Obs: "${item.personalizacao.observacao}"`;
        linkObs.classList.add('com-obs');
      } else {
        linkObs.textContent = `+ Adicionar observação`;
      }
      linkObs.addEventListener('click', () => {
        const obsAtual = item.personalizacao?.observacao || '';
        const novaObs = prompt(`Observação/descrição para ${item.nome} (ex.: pouco sal, feijão por cima, sem talher):`, obsAtual);
        if (novaObs !== null) {
          carrinho.definirObservacaoItem(item.idUnico, novaObs);
          this.exibirToast(novaObs.trim() ? 'Observação salva no item!' : 'Observação removida.');
        }
      });
      infoContainer.appendChild(linkObs);

      const acoes = document.createElement('div');
      acoes.className = 'item-carrinho-acoes';

      const btnEditarObs = document.createElement('button');
      btnEditarObs.className = 'btn-carrinho-acao btn-obs';
      btnEditarObs.innerHTML = '✏️';
      btnEditarObs.title = item.personalizacao?.observacao ? 'Editar observação' : 'Adicionar observação ao item';
      btnEditarObs.addEventListener('click', () => {
        const obsAtual = item.personalizacao?.observacao || '';
        const novaObs = prompt(`Observação/descrição para ${item.nome}:`, obsAtual);
        if (novaObs !== null) {
          carrinho.definirObservacaoItem(item.idUnico, novaObs);
          this.exibirToast(novaObs.trim() ? 'Observação salva no item!' : 'Observação removida.');
        }
      });

      const btnRemoverUm = document.createElement('button');
      btnRemoverUm.className = 'btn-carrinho-acao';
      btnRemoverUm.innerHTML = '&minus;';
      btnRemoverUm.title = 'Diminuir 1';
      btnRemoverUm.addEventListener('click', () => {
        carrinho.removerItem(item.itemId, 1);
      });

      const btnAdicionarUm = document.createElement('button');
      btnAdicionarUm.className = 'btn-carrinho-acao';
      btnAdicionarUm.innerHTML = '&#43;';
      btnAdicionarUm.title = 'Aumentar 1';
      btnAdicionarUm.addEventListener('click', () => {
        carrinho.adicionarItem(item.itemId, 1);
      });

      acoes.appendChild(btnEditarObs);
      acoes.appendChild(btnRemoverUm);
      acoes.appendChild(btnAdicionarUm);

      itemRow.appendChild(infoContainer);
      itemRow.appendChild(acoes);

      this.listaItensCarrinho.appendChild(itemRow);
    });

    // Atualiza totais na UI (Valores estritamente originados do código JS)
    this.valorSubtotalElem.textContent = resumo.subtotalFormatado;
    this.valorFreteElem.textContent = resumo.taxaEntregaFormatada;
    this.valorTotalElem.textContent = resumo.totalFormatado;

    if (resumo.freteGratisAplicado) {
      this.avisoFreteGratisElem.textContent = '🎉 Parabéns! Você ganhou frete grátis!';
      this.avisoFreteGratisElem.style.display = 'block';
    } else {
      const faltaCentavos = CONFIG_ENTREGA.limiteFreteGratisCentavos - resumo.subtotalCentavos;
      if (faltaCentavos > 0) {
        this.avisoFreteGratisElem.textContent = `Adicione mais ${formatarPreco(faltaCentavos)} para frete grátis!`;
        this.avisoFreteGratisElem.style.display = 'block';
      } else {
        this.avisoFreteGratisElem.style.display = 'none';
      }
    }
  }

  /**
   * Renderiza mensagem com textContent (proteção total contra XSS).
   * Opcionalmente processa formatações seguras de texto (negrito simples com asteriscos).
   */
  criarElementoTextoSeguro(texto) {
    const container = document.createElement('div');
    container.className = 'conteudo-balao';

    // Para evitar XSS estritamente, nunca usamos innerHTML com conteúdo não confiável.
    // Fazemos split por quebras de linha e criamos elementos textuais com textContent.
    const linhas = texto.split('\n');

    linhas.forEach((linha, i) => {
      if (i > 0) {
        container.appendChild(document.createElement('br'));
      }

      // Suporte seguro a **negrito** sem innerHTML
      const partes = linha.split(/(\*\*.*?\*\*)/g);
      partes.forEach(parte => {
        if (parte.startsWith('**') && parte.endsWith('**') && parte.length >= 4) {
          const forte = document.createElement('strong');
          forte.textContent = parte.slice(2, -2);
          container.appendChild(forte);
        } else if (parte) {
          container.appendChild(document.createTextNode(parte));
        }
      });
    });

    return container;
  }

  renderizarMensagemUsuario(texto) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = 'mensagem-wrapper usuario';

    const balao = document.createElement('div');
    balao.className = 'balao usuario';
    balao.appendChild(this.criarElementoTextoSeguro(texto));

    msgWrapper.appendChild(balao);
    this.chatMensagens.appendChild(msgWrapper);
    this.scrollChatParaFim();
  }

  renderizarMensagemAgente(texto, pedidoFinalizado = null) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = 'mensagem-wrapper agente';

    const avatar = document.createElement('div');
    avatar.className = 'avatar-agente';
    avatar.textContent = 'M';
    avatar.setAttribute('aria-hidden', 'true');

    const balao = document.createElement('div');
    balao.className = 'balao agente';
    balao.appendChild(this.criarElementoTextoSeguro(texto));

    // Se houve finalização de pedido, anexa o card de resumo com botão de copiar
    if (pedidoFinalizado) {
      const cardResumo = document.createElement('div');
      cardResumo.className = 'card-pedido-finalizado';

      const tituloCard = document.createElement('div');
      tituloCard.className = 'titulo-pedido-finalizado';
      tituloCard.textContent = `✅ Pedido Confirmado: ${pedidoFinalizado.numeroPedido}`;

      const btnCopiar = document.createElement('button');
      btnCopiar.className = 'btn-copiar-resumo';
      btnCopiar.textContent = '📋 Copiar Resumo do Pedido';
      btnCopiar.addEventListener('click', () => {
        navigator.clipboard.writeText(pedidoFinalizado.textoResumo)
          .then(() => this.exibirToast('Resumo copiado para a área de transferência!'))
          .catch(() => alert('Não foi possível copiar automaticamente. Selecione o texto para copiar.'));
      });

      cardResumo.appendChild(tituloCard);
      cardResumo.appendChild(btnCopiar);
      balao.appendChild(cardResumo);
    }

    msgWrapper.appendChild(avatar);
    msgWrapper.appendChild(balao);

    this.chatMensagens.appendChild(msgWrapper);
    this.scrollChatParaFim();
  }

  scrollChatParaFim() {
    this.chatMensagens.scrollTop = this.chatMensagens.scrollHeight;
  }

  definirIndicadorDigitando(visivel) {
    if (visivel) {
      this.indicadorDigitando.style.display = 'flex';
      this.scrollChatParaFim();
    } else {
      this.indicadorDigitando.style.display = 'none';
    }
  }

  async processarMensagemDireta(texto) {
    this.inputMensagem.value = texto;
    await this.enviarMensagemUsuario();
  }

  async enviarMensagemUsuario() {
    const texto = this.inputMensagem.value.trim();
    if (!texto) return;

    const isDemo = this.modelo === 'demo-simulado' || (this.apiKey && this.apiKey.toLowerCase() === 'demo');
    if (!this.apiKey && !isDemo) {
      this.abrirModalConfig();
      this.exibirToast('Por favor, informe sua API Key do Gemini ou use o Modo Demo.');
      return;
    }

    // Exibe a mensagem do usuário no chat
    this.renderizarMensagemUsuario(texto);
    this.inputMensagem.value = '';
    this.inputMensagem.focus();

    // Ativa loading
    this.definirIndicadorDigitando(true);
    this.btnEnviar.disabled = true;

    try {
      const resultado = await this.agente.processarMensagem(texto);
      this.definirIndicadorDigitando(false);
      this.renderizarMensagemAgente(resultado.texto, resultado.pedidoFinalizado);
    } catch (erro) {
      this.definirIndicadorDigitando(false);
      console.error('Erro ao processar mensagem:', erro);
      this.renderizarMensagemAgente(
        `Desculpe, ocorreu uma instabilidade: ${erro.message || 'Erro de comunicação.'} Por favor, verifique sua API Key nas configurações ou tente novamente.`
      );
    } finally {
      this.btnEnviar.disabled = false;
    }
  }

  exibirToast(mensagem) {
    if (!this.toastElem) return;
    this.toastElem.textContent = mensagem;
    this.toastElem.classList.add('visivel');
    setTimeout(() => {
      this.toastElem.classList.remove('visivel');
    }, 3500);
  }
}

// Inicializacao robusta para scripts tipo modulo (executa imediatamente se o DOM ja carregou)
function inicializarApp() {
  if (!window.appMarmitaria) {
    try {
      window.appMarmitaria = new App();
    } catch (e) {
      console.error('Erro fatal ao inicializar App:', e);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
  inicializarApp();
}

