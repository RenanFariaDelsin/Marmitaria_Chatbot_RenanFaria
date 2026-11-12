/**
 * menu.js - Catálogo de produtos e regras de disponibilidade
 * Fonte da verdade dos preços, ingredientes e itens.
 * Preços estritamente armazenados em centavos (inteiros).
 */

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export const CATALOGO = [
  {
    id: 'marmita_bife_acebolado',
    nome: 'Marmita Bife Acebolado',
    descricao: 'Bife de alcatra acebolado, arroz branco, feijão carioca, farofa da casa e fritas.',
    precoCentavos: 2890, // R$ 28,90
    categoria: 'prato_principal',
    diasSemana: [1, 2, 3, 4, 5, 6], // Seg a Sáb
    ingredientesRemoviveis: ['cebola', 'alho', 'pimenta', 'farofa'],
    pontosCozimento: ['mal passado', 'ao ponto', 'bem passado']
  },
  {
    id: 'marmita_frango_grelhado',
    nome: 'Marmita Frango Grelhado Fit',
    descricao: 'Filé de peito de frango grelhado com ervas finas, arroz integral, feijão e legumes no vapor.',
    precoCentavos: 2550, // R$ 25,50
    categoria: 'prato_principal',
    diasSemana: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
    ingredientesRemoviveis: ['alho', 'cebola', 'ervas', 'legumes'],
    pontosCozimento: []
  },
  {
    id: 'marmita_feijoada',
    nome: 'Marmita Feijoada Completa',
    descricao: 'Feijoada tradicional com carnes nobres, arroz branco, couve refogada, farofa e laranja.',
    precoCentavos: 3490, // R$ 34,90
    categoria: 'prato_principal',
    diasSemana: [3, 6], // Quarta e Sábado
    ingredientesRemoviveis: ['bacon', 'linguiça', 'couve', 'alho', 'laranja'],
    pontosCozimento: []
  },
  {
    id: 'marmita_parmegiana_carne',
    nome: 'Marmita Parmegiana de Carne',
    descricao: 'Bife bovino empanado crocante, molho de tomate caseiro, queijo gratinado e purê de batatas.',
    precoCentavos: 3200, // R$ 32,00
    categoria: 'prato_principal',
    diasSemana: [0, 2, 4, 5], // Dom, Ter, Qui, Sex
    ingredientesRemoviveis: ['queijo', 'molho de tomate', 'orégano'],
    pontosCozimento: []
  },
  {
    id: 'marmita_estrogonofe_frango',
    nome: 'Marmita Estrogonofe de Frango',
    descricao: 'Cubos de frango em molho cremoso com champignon, arroz branco soltinho e batata palha.',
    precoCentavos: 2700, // R$ 27,00
    categoria: 'prato_principal',
    diasSemana: [1, 3, 5], // Seg, Qua, Sex
    ingredientesRemoviveis: ['champignon', 'batata palha', 'cebola'],
    pontosCozimento: []
  },
  {
    id: 'marmita_virado_paulista',
    nome: 'Marmita Virado Paulista',
    descricao: 'Bisteca de porco grelhada, tutu de feijão cremoso, couve na manteiga, ovo frito e banana empanada.',
    precoCentavos: 2990, // R$ 29,90
    categoria: 'prato_principal',
    diasSemana: [1, 5], // Seg e Sex
    ingredientesRemoviveis: ['ovo', 'bisteca', 'banana', 'couve', 'alho'],
    pontosCozimento: ['ao ponto', 'bem passado']
  },
  {
    id: 'marmita_lasanha_bolonhesa',
    nome: 'Marmita Lasanha à Bolonhesa',
    descricao: 'Camadas de massa artesanal, carne moída ao molho rústico, queijo mussarela e presunto gratinados.',
    precoCentavos: 2800, // R$ 28,00
    categoria: 'prato_principal',
    diasSemana: [0, 4, 6], // Dom, Qui, Sáb
    ingredientesRemoviveis: ['queijo', 'presunto', 'orégano'],
    pontosCozimento: []
  },
  {
    id: 'marmita_vegetariana',
    nome: 'Marmita Moqueca Vegetariana',
    descricao: 'Moqueca de palmito pupunha e banana-da-terra com leite de coco, arroz branco e farofa de dendê.',
    precoCentavos: 2600, // R$ 26,00
    categoria: 'prato_principal',
    diasSemana: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
    ingredientesRemoviveis: ['coentro', 'pimentão', 'cebola', 'pimenta'],
    pontosCozimento: []
  },
  {
    id: 'acompanhamento_salada',
    nome: 'Salada Verde da Casa',
    descricao: 'Alface americana, rúcula, tomate cereja, cenoura ralada e molho cítrico especial.',
    precoCentavos: 850, // R$ 8,50
    categoria: 'acompanhamento',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: ['molho', 'tomate', 'cenoura'],
    pontosCozimento: []
  },
  {
    id: 'acompanhamento_batata_frita',
    nome: 'Porção Batata Frita Individual',
    descricao: 'Batatas fritas sequinhas e crocantes temperadas com leve toque de sal e alecrim.',
    precoCentavos: 900, // R$ 9,00
    categoria: 'acompanhamento',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: ['sal', 'alecrim'],
    pontosCozimento: []
  },
  {
    id: 'bebida_coca_cola',
    nome: 'Coca-Cola Lata 350ml',
    descricao: 'Refrigerante Coca-Cola em lata 350ml, servido bem gelado.',
    precoCentavos: 600, // R$ 6,00
    categoria: 'bebida',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: [],
    pontosCozimento: []
  },
  {
    id: 'bebida_suco_laranja',
    nome: 'Suco Natural de Laranja 400ml',
    descricao: 'Suco 100% natural espremido na hora.',
    precoCentavos: 800, // R$ 8,00
    categoria: 'bebida',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: ['açúcar', 'gelo'],
    pontosCozimento: []
  },
  {
    id: 'bebida_agua_mineral',
    nome: 'Água Mineral 500ml',
    descricao: 'Água mineral sem gás 500ml garrafinha gelada.',
    precoCentavos: 400, // R$ 4,00
    categoria: 'bebida',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: [],
    pontosCozimento: []
  },
  {
    id: 'sobremesa_pudim',
    nome: 'Pudim de Leite Condensado',
    descricao: 'Fatia individual de pudim artesanal super cremoso com calda de caramelo.',
    precoCentavos: 750, // R$ 7,50
    categoria: 'sobremesa',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: ['calda'],
    pontosCozimento: []
  },
  {
    id: 'sobremesa_mousse_maracuja',
    nome: 'Mousse de Maracujá',
    descricao: 'Mousse aerado de maracujá com redução artesanal de fruta fresca.',
    precoCentavos: 700, // R$ 7,00
    categoria: 'sobremesa',
    diasSemana: [0, 1, 2, 3, 4, 5, 6],
    ingredientesRemoviveis: ['sementes'],
    pontosCozimento: []
  }
];

/**
 * Retorna o dia da semana atual no navegador (0 a 6).
 */
export function getDiaSemanaHoje() {
  return new Date().getDay();
}

/**
 * Retorna o nome do dia da semana atual.
 */
export function getNomeDiaSemanaHoje() {
  return DIAS_SEMANA[getDiaSemanaHoje()];
}

/**
 * Formata um valor em centavos para a representação monetária brasileira (ex.: R$ 28,90).
 * @param {number} centavos 
 * @returns {string}
 */
export function formatarPreco(centavos) {
  if (typeof centavos !== 'number' || isNaN(centavos)) {
    return 'R$ 0,00';
  }
  const valor = centavos / 100;
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Retorna a lista de itens disponíveis hoje.
 * @param {number} [diaSemana] - Opcional, por padrão usa o dia atual
 * @returns {Array} Itens disponíveis hoje com preço formatado
 */
export function listarCardapioHoje(diaSemana = getDiaSemanaHoje()) {
  return CATALOGO
    .filter(item => item.diasSemana.includes(diaSemana))
    .map(item => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao,
      categoria: item.categoria,
      precoCentavos: item.precoCentavos,
      precoFormatado: formatarPreco(item.precoCentavos),
      ingredientesRemoviveis: [...item.ingredientesRemoviveis],
      pontosCozimento: [...item.pontosCozimento]
    }));
}

/**
 * Busca um item pelo id no catálogo completo.
 * @param {string} itemId 
 * @returns {Object|null}
 */
export function buscarItemPorId(itemId) {
  if (!itemId || typeof itemId !== 'string') return null;
  const limpo = itemId.trim().toLowerCase();
  return CATALOGO.find(item => item.id.toLowerCase() === limpo) || null;
}

/**
 * Busca itens pelo nome ou palavras-chave (busca tolerante a acentuação e caixa).
 * @param {string} termo 
 * @returns {Array}
 */
export function buscarItensPorTermo(termo) {
  if (!termo || typeof termo !== 'string') return [];
  const normalizado = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CATALOGO.filter(item => {
    const nomeNorm = item.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const descNorm = item.descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return nomeNorm.includes(normalizado) || descNorm.includes(normalizado);
  });
}

/**
 * Verifica se um item está disponível no dia de hoje.
 * @param {string} itemId 
 * @param {number} [diaSemana]
 * @returns {boolean}
 */
export function isItemDisponivelHoje(itemId, diaSemana = getDiaSemanaHoje()) {
  const item = buscarItemPorId(itemId);
  if (!item) return false;
  return item.diasSemana.includes(diaSemana);
}

