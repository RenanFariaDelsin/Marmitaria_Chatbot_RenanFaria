/**
 * cart.js - Estado e operações do carrinho de compras
 * Fonte única da verdade para cálculos financeiros e regras de negócio.
 * Todos os cálculos são executados em centavos (inteiros) para evitar erros de ponto flutuante.
 */

import { buscarItemPorId, isItemDisponivelHoje, formatarPreco } from './menu.js';

// Configurações de entrega (em centavos)
export const CONFIG_ENTREGA = {
  taxaPadraoCentavos: 700,      // R$ 7,00
  limiteFreteGratisCentavos: 8000 // R$ 80,00 (frete grátis a partir deste valor)
};

class CarrinhoService {
  constructor() {
    this.itens = []; // Array de itens no carrinho
    this.ouvintes = []; // Callbacks para notificar mudanças na UI
    this.ultimoPedidoFinalizado = null;
  }

  /**
   * Registra um callback para ser notificado sempre que o carrinho mudar.
   * @param {Function} callback 
   */
  inscrever(callback) {
    if (typeof callback === 'function') {
      this.ouvintes.push(callback);
    }
  }

  /**
   * Notifica todos os ouvintes registrados.
   */
  notificar() {
    const estado = this.obterResumoCarrinho();
    for (const ouvinte of this.ouvintes) {
      try {
        ouvinte(estado);
      } catch (err) {
        console.error('Erro ao notificar ouvinte do carrinho:', err);
      }
    }
  }

  /**
   * Limpa todos os itens do carrinho.
   */
  limpar() {
    this.itens = [];
    this.notificar();
    return { sucesso: true, mensagem: 'Carrinho esvaziado com sucesso.' };
  }

  /**
   * Valida quantidade de itens (mínimo 1, máximo 20).
   * @param {*} qtd 
   * @returns {number} quantidade inteira validada
   */
  validarQuantidade(qtd) {
    const parsed = parseInt(qtd, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 20) {
      throw new Error('A quantidade deve ser um número inteiro entre 1 e 20.');
    }
    return parsed;
  }

  /**
   * Adiciona um item ao carrinho ou incrementa sua quantidade.
   * @param {string} itemId 
   * @param {number} [quantidade=1] 
   * @returns {Object}
   */
  adicionarItem(itemId, quantidade = 1) {
    if (!itemId || typeof itemId !== 'string') {
      return { sucesso: false, erro: 'ID do item inválido ou não informado.' };
    }

    const itemCatalogo = buscarItemPorId(itemId);
    if (!itemCatalogo) {
      return { sucesso: false, erro: `Item "${itemId}" não existe no cardápio.` };
    }

    if (!isItemDisponivelHoje(itemId)) {
      return {
        sucesso: false,
        erro: `O item "${itemCatalogo.nome}" não está disponível hoje. Consulte o cardápio do dia.`
      };
    }

    let qtd;
    try {
      qtd = this.validarQuantidade(quantidade);
    } catch (e) {
      return { sucesso: false, erro: e.message };
    }

    // Procura se já existe um item idêntico sem personalizações específicas
    const itemExistente = this.itens.find(i => 
      i.itemId === itemCatalogo.id && 
      (!i.personalizacao || (
        (!i.personalizacao.removerIngredientes || i.personalizacao.removerIngredientes.length === 0) &&
        !i.personalizacao.pontoCozimento &&
        !i.personalizacao.observacao
      ))
    );

    if (itemExistente) {
      const novaQtd = itemExistente.quantidade + qtd;
      if (novaQtd > 20) {
        return {
          sucesso: false,
          erro: `Limite máximo de 20 unidades por item excedido (você já tem ${itemExistente.quantidade}).`
        };
      }
      itemExistente.quantidade = novaQtd;
    } else {
      this.itens.push({
        idUnico: `${itemCatalogo.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        itemId: itemCatalogo.id,
        nome: itemCatalogo.nome,
        precoUnitarioCentavos: itemCatalogo.precoCentavos,
        quantidade: qtd,
        personalizacao: {
          removerIngredientes: [],
          pontoCozimento: null,
          observacao: ''
        }
      });
    }

    this.notificar();
    return {
      sucesso: true,
      mensagem: `${qtd}x "${itemCatalogo.nome}" adicionado(s) com sucesso.`,
      carrinho: this.obterResumoCarrinho()
    };
  }

  /**
   * Remove item ou reduz quantidade. Se quantidade não informada ou >= à existente, remove o item.
   * Suporta identificação flexível por ID exato, id parcial ou nome do prato.
   * @param {string} itemId 
   * @param {number} [quantidade] 
   * @returns {Object}
   */
  removerItem(itemId, quantidade = null) {
    if (!itemId || typeof itemId !== 'string') {
      return { sucesso: false, erro: 'ID do item inválido.' };
    }

    const termo = itemId.trim().toLowerCase();

    // 1. Tenta correspondência exata por itemId
    let index = this.itens.findIndex(i => i.itemId.toLowerCase() === termo);

    // 2. Se não achar, tenta correspondência parcial pelo itemId ou pelo nome do produto
    if (index === -1) {
      index = this.itens.findIndex(i => 
        i.itemId.toLowerCase().includes(termo) || 
        termo.includes(i.itemId.toLowerCase()) ||
        i.nome.toLowerCase().includes(termo)
      );
    }

    // 3. Fallback inteligente para termos comuns (ex: 'coca', 'bife', 'suco', 'feijoada')
    if (index === -1) {
      if (termo.includes('coca') || termo.includes('refrigerante')) {
        index = this.itens.findIndex(i => i.itemId === 'bebida_coca_cola');
      } else if (termo.includes('laranja') || termo.includes('suco')) {
        index = this.itens.findIndex(i => i.itemId === 'bebida_suco_laranja');
      } else if (termo.includes('bife')) {
        index = this.itens.findIndex(i => i.itemId === 'marmita_bife_acebolado');
      } else if (termo.includes('feijoada')) {
        index = this.itens.findIndex(i => i.itemId === 'marmita_feijoada');
      } else if (termo.includes('frango')) {
        index = this.itens.findIndex(i => i.itemId.includes('frango'));
      }
    }

    if (index === -1) {
      return { sucesso: false, erro: `Item "${itemId}" não foi encontrado no seu carrinho.` };
    }

    const itemNoCarrinho = this.itens[index];

    if (quantidade === null || quantidade === undefined) {
      // Remove totalmente o item
      this.itens.splice(index, 1);
      this.notificar();
      return {
        sucesso: true,
        mensagem: `"${itemNoCarrinho.nome}" removido do carrinho.`,
        carrinho: this.obterResumoCarrinho()
      };
    }

    let qtd;
    try {
      qtd = this.validarQuantidade(quantidade);
    } catch (e) {
      return { sucesso: false, erro: e.message };
    }

    if (itemNoCarrinho.quantidade <= qtd) {
      this.itens.splice(index, 1);
      this.notificar();
      return {
        sucesso: true,
        mensagem: `Todas as unidades de "${itemNoCarrinho.nome}" foram removidas.`,
        carrinho: this.obterResumoCarrinho()
      };
    } else {
      itemNoCarrinho.quantidade -= qtd;
      this.notificar();
      return {
        sucesso: true,
        mensagem: `Reduzido ${qtd} unidade(s) de "${itemNoCarrinho.nome}". Restam ${itemNoCarrinho.quantidade}.`,
        carrinho: this.obterResumoCarrinho()
      };
    }
  }

  /**
   * Personaliza um item específico no carrinho.
   * Valida estritamente contra as opções permitidas no catálogo de produtos.
   * Suporta identificação flexível e atualizações incrementais cumulativas.
   * @param {string} itemId 
   * @param {string[]} [removerIngredientes=[]] 
   * @param {string} [pontoCozimento=null] 
   * @param {string} [observacao=''] 
   * @returns {Object}
   */
  personalizarItem(itemId, removerIngredientes = [], pontoCozimento = null, observacao = '') {
    if (this.itens.length === 0) {
      return {
        sucesso: false,
        erro: 'O carrinho está vazio. Adicione um prato antes de personalizar.'
      };
    }

    let itemNoCarrinho = null;
    const termo = (itemId || '').trim().toLowerCase();

    // 1. Busca exata por itemId
    if (termo) {
      itemNoCarrinho = this.itens.find(i => i.itemId.toLowerCase() === termo);
    }

    // 2. Busca flexível por termo contido no itemId ou no nome do prato
    if (!itemNoCarrinho && termo) {
      itemNoCarrinho = this.itens.find(i => 
        i.itemId.toLowerCase().includes(termo) || 
        termo.includes(i.itemId.toLowerCase()) || 
        i.nome.toLowerCase().includes(termo)
      );
    }

    // 3. Se for ponto de carne e não achou, procura item do carrinho que aceita ponto de cozimento
    if (!itemNoCarrinho && pontoCozimento) {
      itemNoCarrinho = this.itens.find(i => {
        const cat = buscarItemPorId(i.itemId);
        return cat && Array.isArray(cat.pontosCozimento) && cat.pontosCozimento.length > 0;
      });
    }

    // 4. Se ainda não achou, assume o último item de prato principal adicionado ao carrinho
    if (!itemNoCarrinho && this.itens.length > 0) {
      itemNoCarrinho = this.itens[this.itens.length - 1];
    }

    if (!itemNoCarrinho) {
      return {
        sucesso: false,
        erro: 'Nenhum prato correspondente encontrado no carrinho para personalizar.'
      };
    }

    const itemCatalogo = buscarItemPorId(itemNoCarrinho.itemId);
    if (!itemCatalogo) {
      return { sucesso: false, erro: 'Item não encontrado no catálogo.' };
    }

    // 1. Validar ingredientes removíveis
    const ingredientesLimpos = [];
    if (Array.isArray(removerIngredientes) && removerIngredientes.length > 0) {
      for (const ing of removerIngredientes) {
        if (typeof ing !== 'string') continue;
        const ingNorm = ing.trim().toLowerCase();
        if (!itemCatalogo.ingredientesRemoviveis.map(i => i.toLowerCase()).includes(ingNorm)) {
          return {
            sucesso: false,
            erro: `O ingrediente "${ing}" não pode ser removido do item "${itemCatalogo.nome}". Ingredientes que podem ser removidos: ${itemCatalogo.ingredientesRemoviveis.join(', ') || 'nenhum'}.`
          };
        }
        ingredientesLimpos.push(ingNorm);
      }
    }

    // 2. Validar ponto de cozimento
    let pontoLimpo = null;
    if (pontoCozimento && typeof pontoCozimento === 'string') {
      const pontoNorm = pontoCozimento.trim().toLowerCase();
      if (!itemCatalogo.pontosCozimento.map(p => p.toLowerCase()).includes(pontoNorm)) {
        if (itemCatalogo.pontosCozimento.length === 0) {
          return {
            sucesso: false,
            erro: `O item "${itemCatalogo.nome}" não aceita escolha de ponto de cozimento.`
          };
        }
        return {
          sucesso: false,
          erro: `Ponto "${pontoCozimento}" inválido para "${itemCatalogo.nome}". Pontos permitidos: ${itemCatalogo.pontosCozimento.join(', ')}.`
        };
      }
      pontoLimpo = pontoNorm;
    }

    // 3. Sanitizar observação (máx 120 caracteres, texto simples)
    let obsLimpa = '';
    if (typeof observacao === 'string') {
      obsLimpa = observacao.slice(0, 120).trim();
    }

    // 4. Atualização incremental (preserva o que já havia sido personalizado no item!)
    const personalizacaoAtual = itemNoCarrinho.personalizacao || {
      removerIngredientes: [],
      pontoCozimento: null,
      observacao: ''
    };

    const ingredientesAtualizados = ingredientesLimpos.length > 0
      ? [...new Set([...(personalizacaoAtual.removerIngredientes || []), ...ingredientesLimpos])]
      : (personalizacaoAtual.removerIngredientes || []);

    const pontoAtualizado = pontoLimpo !== null ? pontoLimpo : personalizacaoAtual.pontoCozimento;
    const obsAtualizada = obsLimpa ? obsLimpa : (personalizacaoAtual.observacao || '');

    itemNoCarrinho.personalizacao = {
      removerIngredientes: ingredientesAtualizados,
      pontoCozimento: pontoAtualizado,
      observacao: obsAtualizada
    };

    this.notificar();
    return {
      sucesso: true,
      mensagem: `Personalização aplicada em "${itemCatalogo.nome}": ${this.descreverPersonalizacao(itemNoCarrinho.personalizacao)}.`,
      carrinho: this.obterResumoCarrinho()
    };
  }

  /**
   * Define ou atualiza diretamente a descrição / observação de um item no carrinho.
   * @param {string} idOuIdUnico 
   * @param {string} observacao 
   * @returns {Object}
   */
  definirObservacaoItem(idOuIdUnico, observacao) {
    if (!idOuIdUnico) return { sucesso: false, erro: 'Item inválido.' };

    const item = this.itens.find(i => i.idUnico === idOuIdUnico || i.itemId === idOuIdUnico);
    if (!item) {
      return { sucesso: false, erro: 'Item não encontrado no carrinho.' };
    }

    if (!item.personalizacao) {
      item.personalizacao = { removerIngredientes: [], pontoCozimento: null, observacao: '' };
    }

    item.personalizacao.observacao = typeof observacao === 'string' ? observacao.slice(0, 120).trim() : '';
    this.notificar();

    return {
      sucesso: true,
      mensagem: item.personalizacao.observacao 
        ? `Observação adicionada em "${item.nome}": "${item.personalizacao.observacao}".` 
        : `Observação removida de "${item.nome}".`,
      carrinho: this.obterResumoCarrinho()
    };
  }

  /**
   * Descreve em texto a personalização do item.
   * @param {Object} p 
   * @returns {string}
   */
  descreverPersonalizacao(p) {
    if (!p) return 'Sem alterações';
    const partes = [];
    if (p.removerIngredientes && p.removerIngredientes.length > 0) {
      partes.push(`Sem ${p.removerIngredientes.join(', ')}`);
    }
    if (p.pontoCozimento) {
      partes.push(`Ponto: ${p.pontoCozimento}`);
    }
    if (p.observacao) {
      partes.push(`Obs: ${p.observacao}`);
    }
    return partes.length > 0 ? partes.join(' | ') : 'Padrão da casa';
  }

  /**
   * Calcula totais e retorna o resumo do carrinho com precisão em centavos.
   * @returns {Object}
   */
  obterResumoCarrinho() {
    let subtotalCentavos = 0;
    let quantidadeTotal = 0;

    const itensDetalhados = this.itens.map(item => {
      const subtotalItem = item.precoUnitarioCentavos * item.quantidade;
      subtotalCentavos += subtotalItem;
      quantidadeTotal += item.quantidade;

      return {
        idUnico: item.idUnico,
        itemId: item.itemId,
        nome: item.nome,
        quantidade: item.quantidade,
        precoUnitarioCentavos: item.precoUnitarioCentavos,
        precoUnitarioFormatado: formatarPreco(item.precoUnitarioCentavos),
        subtotalItemCentavos: subtotalItem,
        subtotalItemFormatado: formatarPreco(subtotalItem),
        personalizacao: { ...item.personalizacao },
        personalizacaoTexto: this.descreverPersonalizacao(item.personalizacao)
      };
    });

    // Regra da taxa de entrega: se carrinho vazio, frete é 0; se subtotal >= limite, frete é 0; senão taxa padrão
    let taxaEntregaCentavos = 0;
    let freteGratisAplicado = false;

    if (subtotalCentavos > 0) {
      if (subtotalCentavos >= CONFIG_ENTREGA.limiteFreteGratisCentavos) {
        taxaEntregaCentavos = 0;
        freteGratisAplicado = true;
      } else {
        taxaEntregaCentavos = CONFIG_ENTREGA.taxaPadraoCentavos;
      }
    }

    const totalCentavos = subtotalCentavos + taxaEntregaCentavos;

    return {
      estaVazio: itensDetalhados.length === 0,
      quantidadeTotalItens: quantidadeTotal,
      itens: itensDetalhados,
      subtotalCentavos,
      subtotalFormatado: formatarPreco(subtotalCentavos),
      taxaEntregaCentavos,
      taxaEntregaFormatada: freteGratisAplicado ? 'GRÁTIS' : formatarPreco(taxaEntregaCentavos),
      freteGratisAplicado,
      limiteFreteGratisFormatado: formatarPreco(CONFIG_ENTREGA.limiteFreteGratisCentavos),
      totalCentavos,
      totalFormatado: formatarPreco(totalCentavos)
    };
  }

  /**
   * Finaliza o pedido criando um resumo e limpando o carrinho.
   * @param {string} nome 
   * @param {string} endereco 
   * @param {string} formaPagamento 
   * @returns {Object}
   */
  finalizarPedido(nome, endereco, formaPagamento) {
    if (this.itens.length === 0) {
      return {
        sucesso: false,
        erro: 'Não é possível finalizar o pedido com o carrinho vazio. Adicione itens antes.'
      };
    }

    if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
      return { sucesso: false, erro: 'Informe o nome do cliente para a entrega.' };
    }

    if (!endereco || typeof endereco !== 'string' || endereco.trim().length < 5) {
      return { sucesso: false, erro: 'Informe um endereço de entrega completo (Rua, Número e Bairro).' };
    }

    if (!formaPagamento || typeof formaPagamento !== 'string' || formaPagamento.trim().length < 2) {
      return { sucesso: false, erro: 'Informe a forma de pagamento (ex.: Pix, Cartão de Crédito, Dinheiro).' };
    }

    const resumoCarrinho = this.obterResumoCarrinho();
    const numeroPedido = `MARM-${Math.floor(1000 + Math.random() * 9000)}`;
    const dataHora = new Date().toLocaleString('pt-BR');

    // Monta texto formatado do resumo para fácil cópia
    let textoResumo = `🍽️ *RESUMO DO PEDIDO - ${numeroPedido}*\n`;
    textoResumo += `📅 Data/Hora: ${dataHora}\n`;
    textoResumo += `👤 Cliente: ${nome.trim()}\n`;
    textoResumo += `📍 Entrega: ${endereco.trim()}\n`;
    textoResumo += `💳 Pagamento: ${formaPagamento.trim()}\n`;
    textoResumo += `------------------------------------\n`;
    textoResumo += `ITENS DO PEDIDO:\n`;

    resumoCarrinho.itens.forEach((it, idx) => {
      textoResumo += `${idx + 1}. ${it.quantidade}x ${it.nome} - ${it.subtotalItemFormatado}\n`;
      if (it.personalizacaoTexto && it.personalizacaoTexto !== 'Padrão da casa') {
        textoResumo += `   (${it.personalizacaoTexto})\n`;
      }
    });

    textoResumo += `------------------------------------\n`;
    textoResumo += `Subtotal: ${resumoCarrinho.subtotalFormatado}\n`;
    textoResumo += `Taxa de Entrega: ${resumoCarrinho.taxaEntregaFormatada}\n`;
    textoResumo += `*TOTAL A PAGAR: ${resumoCarrinho.totalFormatado}*\n`;
    textoResumo += `------------------------------------\n`;
    textoResumo += `Tempo estimado: 35 a 50 minutos.\nObrigado pela preferência!`;

    const pedido = {
      numeroPedido,
      dataHora,
      cliente: {
        nome: nome.trim(),
        endereco: endereco.trim(),
        formaPagamento: formaPagamento.trim()
      },
      itens: resumoCarrinho.itens,
      subtotalFormatado: resumoCarrinho.subtotalFormatado,
      taxaEntregaFormatada: resumoCarrinho.taxaEntregaFormatada,
      totalFormatado: resumoCarrinho.totalFormatado,
      textoResumo
    };

    this.ultimoPedidoFinalizado = pedido;

    // Limpa o carrinho após finalizar com sucesso
    this.itens = [];
    this.notificar();

    return {
      sucesso: true,
      mensagem: `Pedido ${numeroPedido} gerado com sucesso!`,
      pedido
    };
  }
}

// Instância singleton do serviço de carrinho
export const carrinho = new CarrinhoService();

