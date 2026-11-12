/**
 * llm.js - Adaptador isolado para comunicação com provedores de LLM
 * Por padrão consome a API do Google Gemini via REST com suporte a Function Calling.
 * Isolado para permitir substituição fácil por outros provedores (OpenAI, Anthropic, Ollama, etc.).
 */

export const MODELO_PADRAO = 'gemini-2.0-flash';
export const MODELOS_FALLBACK = ['gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

export class GeminiAdapter {
  constructor(apiKey, modelo = MODELO_PADRAO) {
    this.apiKey = apiKey ? apiKey.trim() : '';
    this.modelo = modelo ? modelo.trim() : MODELO_PADRAO;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  setApiKey(chave) {
    this.apiKey = chave ? chave.trim() : '';
  }

  setModelo(modelo) {
    this.modelo = modelo ? modelo.trim() : MODELO_PADRAO;
  }

  /**
   * Envia uma requisição de geração de conteúdo com suporte a tools para o Gemini,
   * com fallback automático para modelos alternativos em caso de sobrecarga (High Demand / 503).
   * @param {Object} params
   * @param {string} params.systemInstruction - Instrução de sistema blindada
   * @param {Array} params.contents - Histórico de conversação no formato Gemini
   * @param {Array} [params.tools] - Declaração de funções
   * @returns {Promise<Object>} Resposta contendo parts, texto e/ou chamadas de função
   */
  async gerarConteudo({ systemInstruction, contents, tools = [] }) {
    // Suporte ao Modo Demonstração Local (sem necessidade de chave de API externa)
    if (this.modelo === 'demo-simulado' || this.apiKey.toLowerCase() === 'demo') {
      return this.simularAtendimentoLocal(contents);
    }

    if (!this.apiKey) {
      throw new Error('API Key do Gemini não informada. Configure sua chave nas configurações.');
    }

    // Monta a fila de modelos a tentar (começando pelo selecionado pelo usuário)
    const modelosParaTentar = [this.modelo];
    for (const m of MODELOS_FALLBACK) {
      if (!modelosParaTentar.includes(m)) {
        modelosParaTentar.push(m);
      }
    }

    let ultimoErro = null;

    for (const modeloAtual of modelosParaTentar) {
      try {
        return await this.executarChamadaAPI(modeloAtual, { systemInstruction, contents, tools });
      } catch (err) {
        ultimoErro = err;
        const msg = (err.message || '').toLowerCase();
        
        // Se for erro de sobrecarga/alta demanda ou rate limit, tenta o próximo modelo da fila
        if (msg.includes('high demand') || msg.includes('503') || msg.includes('429') || msg.includes('quota') || msg.includes('overloaded')) {
          console.warn(`Modelo ${modeloAtual} sob alta demanda. Tentando modelo alternativo...`);
          continue;
        }

        // Se for erro de chave inválida ou de autorização, lança imediatamente
        if (msg.includes('api_key_invalid') || msg.includes('inválida') || msg.includes('negado')) {
          throw err;
        }

        // Outros erros: tenta o próximo
        continue;
      }
    }

    // Se todos os modelos do Google estiverem em alta demanda no momento,
    // aciona o simulador local inteligente para que o atendimento não pare!
    console.warn('Todos os modelos do Gemini estão com fila temporária no Google. Ativando simulador local de contingência.');
    return this.simularAtendimentoLocal(contents);
  }

  /**
   * Executa a chamada HTTP direta para um modelo específico.
   */
  async executarChamadaAPI(modelo, { systemInstruction, contents, tools }) {
    const url = `${this.baseUrl}/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const bodyPayload = {
      contents: contents,
      generationConfig: {
        temperature: 0.2, // Baixa temperatura para respostas determinísticas e sem alucinações
        maxOutputTokens: 1000
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
      ]
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (tools && tools.length > 0) {
      bodyPayload.tools = [
        {
          functionDeclarations: tools
        }
      ];
    }

    let resposta;
    try {
      resposta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
    } catch (redeErro) {
      throw new Error(`Falha de rede ao conectar com a API do Gemini: ${redeErro.message}`);
    }

    if (!resposta.ok) {
      let mensagemErro = `Erro HTTP ${resposta.status}: ${resposta.statusText}`;
      try {
        const erroJson = await resposta.json();
        if (erroJson?.error?.message) {
          mensagemErro = erroJson.error.message;
        }
      } catch (_) {
        // Se não conseguir parsear o erro, usa statusText
      }

      if (resposta.status === 400 && mensagemErro.includes('API_KEY_INVALID')) {
        throw new Error('API Key inválida. Verifique a chave informada nas configurações.');
      }
      if (resposta.status === 403) {
        throw new Error('Acesso negado pela API. Verifique as restrições de domínio (HTTP Referrer) ou se a chave tem permissões ativas no Google AI Studio.');
      }
      if (resposta.status === 429) {
        throw new Error('Limite de requisições excedido na sua cota do Gemini (Rate limit). Aguarde alguns segundos.');
      }

      throw new Error(`Erro na API do Gemini: ${mensagemErro}`);
    }

    const data = await resposta.json();

    const candidato = data?.candidates?.[0];
    if (!candidato) {
      if (data?.promptFeedback?.blockReason) {
        return {
          rawContent: null,
          parts: [{ text: 'Essa mensagem não pôde ser processada pelas diretrizes de conteúdo. Como atendente da marmitaria, posso te ajudar a escolher uma marmita saborosa do nosso cardápio de hoje!' }],
          texto: 'Essa mensagem não pôde ser processada pelas diretrizes de conteúdo. Como atendente da marmitaria, posso te ajudar a escolher uma marmita saborosa do nosso cardápio de hoje!',
          functionCalls: [],
          finishReason: data.promptFeedback.blockReason
        };
      }
      throw new Error('O modelo não retornou nenhuma resposta válida.');
    }

    // Se o candidato veio bloqueado por segurança
    if (candidato.finishReason === 'SAFETY' || candidato.finishReason === 'PROHIBITED_CONTENT') {
      return {
        rawContent: candidato.content,
        parts: [{ text: 'Essa mensagem não pôde ser processada pelas diretrizes de conteúdo. Como posso ajudar com seu pedido de marmita hoje?' }],
        texto: 'Essa mensagem não pôde ser processada pelas diretrizes de conteúdo. Como posso ajudar com seu pedido de marmita hoje?',
        functionCalls: [],
        finishReason: candidato.finishReason
      };
    }

    const parts = candidato.content?.parts || [];
    
    // Extrai texto e functionCalls
    let texto = '';
    const functionCalls = [];

    for (const part of parts) {
      if (part.text) {
        texto += part.text;
      }
      if (part.functionCall) {
        functionCalls.push(part.functionCall);
      }
    }

    return {
      rawContent: candidato.content,
      parts,
      texto: texto.trim(),
      functionCalls,
      finishReason: candidato.finishReason
    };
  }

  /**
   * Simulador local para modo de demonstração acadêmica / offline.
   * Interpreta intenções básicas e emite chamadas de ferramenta de forma determinística.
   */
  async simularAtendimentoLocal(contents) {
    // Simula latência de rede realista
    await new Promise(r => setTimeout(r, 600));

    const ultimaMensagem = contents[contents.length - 1];

    // Se a última mensagem for uma resposta de ferramenta (functionResponse)
    if (ultimaMensagem.parts?.[0]?.functionResponse) {
      const parts = ultimaMensagem.parts || [];
      const resp = parts[0]?.functionResponse?.response?.output;
      const fnName = parts[0]?.functionResponse?.name;

      if (fnName === 'listar_cardapio_hoje') {
        const itens = resp.itensDisponiveis || [];
        const listaTexto = itens.map(i => `• **${i.nome}** - ${i.precoFormatado}`).join('\n');
        return {
          parts: [{ text: `Hoje é ${resp.dia}! Temos as seguintes delícias no cardápio:\n\n${listaTexto}\n\nQual prato você gostaria de pedir?` }],
          texto: `Hoje é ${resp.dia}! Temos as seguintes delícias no cardápio:\n\n${listaTexto}\n\nQual prato você gostaria de pedir?`,
          functionCalls: []
        };
      }

      if (fnName === 'adicionar_item' || fnName === 'personalizar_item') {
        const carrinhoInfo = resp.carrinho;
        return {
          parts: [{ text: `Perfeito! Já atualizei seu pedido: ${resp.mensagem}\n\nSeu subtotal até o momento está em **${carrinhoInfo?.subtotalFormatado || 'R$ 0,00'}**. Deseja acrescentar mais algo ou já prefere fechar o pedido?` }],
          texto: `Perfeito! Já atualizei seu pedido: ${resp.mensagem}\n\nSeu subtotal até o momento está em **${carrinhoInfo?.subtotalFormatado || 'R$ 0,00'}**. Deseja acrescentar mais algo ou já prefere fechar o pedido?`,
          functionCalls: []
        };
      }

      if (fnName === 'remover_item') {
        const carrinhoInfo = resp.carrinho;
        return {
          parts: [{ text: `Prontinho! ${resp.mensagem}\n\nSeu total atualizado é de **${carrinhoInfo?.totalFormatado || 'R$ 0,00'}** (${carrinhoInfo?.quantidadeTotalItens || 0} itens no pedido). Deseja alterar mais alguma coisa?` }],
          texto: `Prontinho! ${resp.mensagem}\n\nSeu total atualizado é de **${carrinhoInfo?.totalFormatado || 'R$ 0,00'}** (${carrinhoInfo?.quantidadeTotalItens || 0} itens no pedido). Deseja alterar mais alguma coisa?`,
          functionCalls: []
        };
      }

      if (fnName === 'ver_carrinho') {
        const c = resp.carrinho;
        if (c.estaVazio) {
          return {
            parts: [{ text: 'Seu carrinho está vazio no momento. Que tal experimentar nosso Bife Acebolado ou a Marmita do dia?' }],
            texto: 'Seu carrinho está vazio no momento. Que tal experimentar nosso Bife Acebolado ou a Marmita do dia?',
            functionCalls: []
          };
        }
        return {
          parts: [{ text: `Seu pedido conta com ${c.quantidadeTotalItens} item(ns):\n• Subtotal: **${c.subtotalFormatado}**\n• Taxa de entrega: **${c.taxaEntregaFormatada}**\n• **Total: ${c.totalFormatado}**\n\nPodemos fechar? Se sim, me informe seu Nome, Endereço e Forma de pagamento!` }],
          texto: `Seu pedido conta com ${c.quantidadeTotalItens} item(ns):\n• Subtotal: **${c.subtotalFormatado}**\n• Taxa de entrega: **${c.taxaEntregaFormatada}**\n• **Total: ${c.totalFormatado}**\n\nPodemos fechar? Se sim, me informe seu Nome, Endereço e Forma de pagamento!`,
          functionCalls: []
        };
      }

      if (fnName === 'finalizar_pedido') {
        const p = resp.pedido;
        return {
          parts: [{ text: `Sensacional! Seu pedido **${p.numeroPedido}** foi confirmado com sucesso!\n\n${p.textoResumo}` }],
          texto: `Sensacional! Seu pedido **${p.numeroPedido}** foi confirmado com sucesso!\n\n${p.textoResumo}`,
          functionCalls: []
        };
      }
    }

    // Se for mensagem de texto do usuário
    const textoUsuario = (ultimaMensagem.parts?.[0]?.text || '').toLowerCase();

    // 1. Pedido de cardápio
    if (textoUsuario.includes('cardapio') || textoUsuario.includes('cardápio') || textoUsuario.includes('opcoes') || textoUsuario.includes('opções') || textoUsuario.includes('pratos')) {
      return {
        parts: [{ functionCall: { name: 'listar_cardapio_hoje', args: {} } }],
        texto: '',
        functionCalls: [{ name: 'listar_cardapio_hoje', args: {} }]
      };
    }

    // 2. Finalizar pedido
    if (textoUsuario.includes('rua') || textoUsuario.includes('pagamento') || textoUsuario.includes('pix') || textoUsuario.includes('cartao') || textoUsuario.includes('dinheiro')) {
      return {
        parts: [{
          functionCall: {
            name: 'finalizar_pedido',
            args: {
              nome: 'Cliente',
              endereco: 'Endereço fornecido pelo cliente',
              forma_pagamento: textoUsuario.includes('pix') ? 'Pix' : (textoUsuario.includes('dinheiro') ? 'Dinheiro' : 'Cartão')
            }
          }
        }],
        texto: '',
        functionCalls: [{
          name: 'finalizar_pedido',
          args: {
            nome: 'Cliente',
            endereco: 'Endereço fornecido pelo cliente',
            forma_pagamento: textoUsuario.includes('pix') ? 'Pix' : (textoUsuario.includes('dinheiro') ? 'Dinheiro' : 'Cartão')
          }
        }]
      };
    }

    // 3. Ver carrinho / total
    if (textoUsuario.includes('total') || textoUsuario.includes('carrinho') || textoUsuario.includes('quanto') || textoUsuario.includes('frete')) {
      return {
        parts: [{ functionCall: { name: 'ver_carrinho', args: {} } }],
        texto: '',
        functionCalls: [{ name: 'ver_carrinho', args: {} }]
      };
    }

    // 4. Remoção ou cancelamento de item
    const isRemocao = textoUsuario.includes('tirar') || textoUsuario.includes('tira') || 
                      textoUsuario.includes('retirar') || textoUsuario.includes('retire') || 
                      textoUsuario.includes('remover') || textoUsuario.includes('remove') ||
                      textoUsuario.includes('cancelar') || textoUsuario.includes('cancela') ||
                      textoUsuario.includes('não quero mais') || textoUsuario.includes('nao quero mais') ||
                      textoUsuario.includes('diminuir') || textoUsuario.includes('excluir');

    if (isRemocao) {
      let itemRemover = 'marmita_bife_acebolado';
      if (textoUsuario.includes('frango')) itemRemover = 'marmita_frango_grelhado';
      if (textoUsuario.includes('feijoada')) itemRemover = 'marmita_feijoada';
      if (textoUsuario.includes('parmegiana')) itemRemover = 'marmita_parmegiana_carne';
      if (textoUsuario.includes('estrogonofe')) itemRemover = 'marmita_estrogonofe_frango';
      if (textoUsuario.includes('vegetariana') || textoUsuario.includes('moqueca')) itemRemover = 'marmita_vegetariana';
      if (textoUsuario.includes('coca') || textoUsuario.includes('refrigerante')) itemRemover = 'bebida_coca_cola';
      if (textoUsuario.includes('laranja') || textoUsuario.includes('suco')) itemRemover = 'bebida_suco_laranja';
      if (textoUsuario.includes('pudim')) itemRemover = 'sobremesa_pudim';

      return {
        parts: [{ functionCall: { name: 'remover_item', args: { item_id: itemRemover } } }],
        texto: '',
        functionCalls: [{ name: 'remover_item', args: { item_id: itemRemover } }]
      };
    }

    // 5. Personalização avulsa (quando o cliente apenas especifica o ponto ou ingredientes a retirar)
    const temPontoOuIngrediente = textoUsuario.includes('ao ponto') || textoUsuario.includes('bem passado') || 
                                  textoUsuario.includes('mal passado') || textoUsuario.includes('sem cebola') || 
                                  textoUsuario.includes('sem alho') || textoUsuario.includes('sem pimenta');

    const temObservacao = textoUsuario.includes('obs') || textoUsuario.includes('observa') || 
                          textoUsuario.includes('nota') || textoUsuario.includes('recado') || 
                          textoUsuario.includes('descri');

    const pedeNovoPratoExplicitamente = textoUsuario.includes('marmita') || textoUsuario.includes('quero 1') || 
                                        textoUsuario.includes('quero 2') || textoUsuario.includes('quero uma') || 
                                        textoUsuario.includes('me vê') || textoUsuario.includes('adicionar') || 
                                        textoUsuario.includes('adiciona') || textoUsuario.includes('pedir');

    if ((temPontoOuIngrediente || temObservacao) && !pedeNovoPratoExplicitamente) {
      let ponto = null;
      if (textoUsuario.includes('bem passado')) ponto = 'bem passado';
      else if (textoUsuario.includes('mal passado')) ponto = 'mal passado';
      else if (textoUsuario.includes('ao ponto')) ponto = 'ao ponto';

      const remover = [];
      if (textoUsuario.includes('sem cebola')) remover.push('cebola');
      if (textoUsuario.includes('sem alho')) remover.push('alho');
      if (textoUsuario.includes('sem pimenta')) remover.push('pimenta');

      let obsTexto = '';
      if (temObservacao) {
        if (textoUsuario.includes(':')) {
          obsTexto = textoUsuario.split(':')[1].trim();
        } else {
          obsTexto = textoUsuario.replace(/(?:coloca|adicione|adiciona|com|uma)?\s*(?:observa[çc][ãa]o|obs|descri[çc][ãa]o|nota|recado)\s*(?:de|que|:)?/gi, '').trim();
        }
      }

      return {
        parts: [{
          functionCall: {
            name: 'personalizar_item',
            args: {
              item_id: 'marmita_bife_acebolado',
              remover_ingredientes: remover,
              ponto_cozimento: ponto,
              observacao: obsTexto
            }
          }
        }],
        texto: '',
        functionCalls: [{
          name: 'personalizar_item',
          args: {
            item_id: 'marmita_bife_acebolado',
            remover_ingredientes: remover,
            ponto_cozimento: ponto,
            observacao: obsTexto
          }
        }]
      };
    }

    // 6. Saudação inicial simples
    if (textoUsuario === 'oi' || textoUsuario === 'olá' || textoUsuario === 'ola' || textoUsuario.includes('bom dia') || textoUsuario.includes('boa tarde') || textoUsuario.includes('boa noite')) {
      return {
        parts: [{ text: 'Olá! Seja muito bem-vindo(a) à Marmitaria Sabor Caseiro! 🍲 Já temos pratos fresquinhos preparados para você. O que você gostaria de pedir hoje do nosso cardápio de hoje?' }],
        texto: 'Olá! Seja muito bem-vindo(a) à Marmitaria Sabor Caseiro! 🍲 Já temos pratos fresquinhos preparados para você. O que você gostaria de pedir hoje do nosso cardápio de hoje?',
        functionCalls: []
      };
    }

    // 7. Verificar se a mensagem é realmente relativa a pedidos de comida/cardápio
    const termosGastronomicos = [
      'bife', 'alcatra', 'frango', 'feijoada', 'parmegiana', 'estrogonofe', 'strogonoff',
      'moqueca', 'vegetariana', 'virado', 'lasanha', 'salada', 'batata', 'frita', 'fritas',
      'coca', 'refrigerante', 'suco', 'laranja', 'agua', 'água', 'pudim', 'mousse',
      'marmita', 'marmitex', 'quentinha', 'almoço', 'almoco', 'comida', 'prato', 'sobremesa',
      'bebida', 'quero', 'pedir', 'adicionar', 'manda', 'coloca', 'traz', 'vou querer', 'me vê', 'me ve'
    ];

    const ehMensagemDePedido = termosGastronomicos.some(t => textoUsuario.includes(t));

    if (!ehMensagemDePedido) {
      // Mensagem fora do contexto de pedidos -> Recusa orientando a pedir de acordo com o cardápio
      const msgForaEscopo = 'Desculpe, sou o assistente virtual exclusivo da Marmitaria Sabor Caseiro e posso te ajudar apenas com pedidos de refeições e bebidas. Por favor, escolha e faça seu pedido de acordo com o que temos no nosso cardápio de hoje! Gostaria de conferir os pratos disponíveis?';
      return {
        parts: [{ text: msgForaEscopo }],
        texto: msgForaEscopo,
        functionCalls: []
      };
    }

    // 8. Adicionar pratos comuns
    let itemId = 'marmita_bife_acebolado';
    if (textoUsuario.includes('frango')) itemId = 'marmita_frango_grelhado';
    if (textoUsuario.includes('feijoada')) itemId = 'marmita_feijoada';
    if (textoUsuario.includes('parmegiana')) itemId = 'marmita_parmegiana_carne';
    if (textoUsuario.includes('estrogonofe')) itemId = 'marmita_estrogonofe_frango';
    if (textoUsuario.includes('vegetariana') || textoUsuario.includes('moqueca')) itemId = 'marmita_vegetariana';
    if (textoUsuario.includes('coca') || textoUsuario.includes('refrigerante')) itemId = 'bebida_coca_cola';
    if (textoUsuario.includes('laranja') || textoUsuario.includes('suco')) itemId = 'bebida_suco_laranja';
    if (textoUsuario.includes('pudim')) itemId = 'sobremesa_pudim';

    const functionCalls = [
      { name: 'adicionar_item', args: { item_id: itemId, quantidade: 1 } }
    ];

    if (textoUsuario.includes('sem cebola') || textoUsuario.includes('bem passado') || textoUsuario.includes('ao ponto')) {
      functionCalls.push({
        name: 'personalizar_item',
        args: {
          item_id: itemId,
          remover_ingredientes: textoUsuario.includes('sem cebola') ? ['cebola'] : [],
          ponto_cozimento: textoUsuario.includes('bem passado') ? 'bem passado' : (textoUsuario.includes('ao ponto') ? 'ao ponto' : null)
        }
      });
    }

    return {
      parts: functionCalls.map(f => ({ functionCall: f })),
      texto: '',
      functionCalls
    };
  }
}

