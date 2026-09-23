// Lista inicial de alimentos. Valores sempre por 100 **g**, mesmo nos líquidos —
// é a unidade em que a app faz as contas. Um rótulo de bebida dá os valores por
// 100 ml; para o passar para cá, divide-os pela densidade. Nos líquidos criados
// na app a densidade fica em 1, e aí as duas contas dão o mesmo.
// Fonte: valores médios de tabelas de composição de alimentos.
// Podes editar, apagar e acrescentar os teus dentro da app.
//
// `porcao` é o que a comida é na vida real: um ovo, uma fatia, uma lata. A app
// guarda sempre gramas, mas deixa de te obrigar a saber quantas são — que é a
// principal razão por que se desiste de registar comida.
//
// `compra: 'unidade'` diz que a porção também é a unidade de compra: compram-se
// 7 ovos e 4 latas de atum. Sem isso a lista de compras vai a peso, porque
// "6 doses de arroz" não é coisa que se peça no supermercado.
//
// `liquido` diz que este alimento se mede em ml e não em gramas — por dentro
// guarda-se sempre em gramas, e `densidade` (gramas por ml) faz a conversão.
// Sem ela a conta era 1:1, que está certa para o leite mas erra 9% no azeite.
//
// `factorCru` converte os gramas registados (como se come, já cozinhado) para
// os gramas do alimento cru que se compra — é o que a lista de compras usa.
// Carne e peixe **perdem** água a cozinhar, por isso o cru pesa mais do que o
// cozinhado (factor > 1: 100 g de frango grelhado saem de ~135 g de frango
// cru). Arroz, massa e leguminosas **absorvem** água, por isso é o oposto
// (factor < 1: 100 g de arroz cozido vêm de ~40 g de arroz cru). Sem `factorCru`
// assume-se 1 — o caso dos alimentos que já se compram como se comem (ovos,
// fruta, lacticínios, líquidos).

export const ALIMENTOS_BASE = [
  // Carne e peixe
  { nome: 'Peito de frango grelhado', kcal: 165, p: 31, h: 0, g: 3.6, cat: 'Carne e peixe', porcao: { nome: 'peito', g: 150 }, factorCru: 1.35 },
  { nome: 'Peito de peru grelhado', kcal: 135, p: 29, h: 0, g: 1.7, cat: 'Carne e peixe', porcao: { nome: 'bife', g: 120 }, factorCru: 1.35 },
  { nome: 'Lombo de porco grelhado', kcal: 143, p: 21, h: 0, g: 6, cat: 'Carne e peixe', porcao: { nome: 'bife', g: 120 }, factorCru: 1.35 },
  { nome: 'Carne de vaca magra', kcal: 217, p: 26, h: 0, g: 12, cat: 'Carne e peixe', porcao: { nome: 'bife', g: 150 }, factorCru: 1.35 },
  { nome: 'Atum em água (escorrido)', kcal: 116, p: 26, h: 0, g: 1, cat: 'Carne e peixe', porcao: { nome: 'lata', g: 80 }, compra: 'unidade' },
  { nome: 'Bacalhau cozido', kcal: 105, p: 23, h: 0, g: 1, cat: 'Carne e peixe', porcao: { nome: 'posta', g: 150 }, factorCru: 1.2 },
  { nome: 'Salmão grelhado', kcal: 208, p: 20, h: 0, g: 13, cat: 'Carne e peixe', porcao: { nome: 'posta', g: 130 }, factorCru: 1.25 },
  { nome: 'Sardinha grelhada', kcal: 208, p: 25, h: 0, g: 11, cat: 'Carne e peixe', porcao: { nome: 'sardinha', g: 60 }, factorCru: 1.25 },
  { nome: 'Camarão cozido', kcal: 99, p: 24, h: 0, g: 0.3, cat: 'Carne e peixe', porcao: { nome: 'dose', g: 100 }, factorCru: 1.15 },
  { nome: 'Pescada cozida', kcal: 90, p: 18, h: 0, g: 1.5, cat: 'Carne e peixe', porcao: { nome: 'posta', g: 150 }, factorCru: 1.2 },

  // Ovos e lacticínios
  { nome: 'Ovo inteiro', kcal: 155, p: 13, h: 1.1, g: 11, cat: 'Ovos e lacticínios', porcao: { nome: 'ovo', g: 55 }, compra: 'unidade' },
  { nome: 'Clara de ovo', kcal: 52, p: 11, h: 0.7, g: 0.2, cat: 'Ovos e lacticínios', porcao: { nome: 'clara', g: 33 }, compra: 'unidade' },
  { nome: 'Iogurte grego natural', kcal: 59, p: 10, h: 3.6, g: 0.4, cat: 'Ovos e lacticínios', porcao: { nome: 'iogurte', g: 125 }, compra: 'unidade' },
  { nome: 'Skyr natural', kcal: 63, p: 11, h: 4, g: 0.2, cat: 'Ovos e lacticínios', porcao: { nome: 'embalagem', plural: 'embalagens', g: 150 }, compra: 'unidade' },
  { nome: 'Queijo fresco magro', kcal: 70, p: 11, h: 2, g: 2, cat: 'Ovos e lacticínios', porcao: { nome: 'queijo', g: 50 }, compra: 'unidade' },
  { nome: 'Requeijão', kcal: 174, p: 11, h: 3, g: 13, cat: 'Ovos e lacticínios', porcao: { nome: 'requeijão', plural: 'requeijões', g: 100 }, compra: 'unidade' },
  { nome: 'Queijo flamengo', kcal: 330, p: 25, h: 1, g: 25, cat: 'Ovos e lacticínios', porcao: { nome: 'fatia', g: 20 }, compra: 'unidade' },
  { nome: 'Leite meio-gordo', kcal: 44.7, p: 3.2, h: 4.7, g: 1.6, cat: 'Ovos e lacticínios', porcao: { nome: 'copo', g: 206 }, liquido: true, densidade: 1.03 },
  { nome: 'Proteína whey (pó)', kcal: 400, p: 80, h: 8, g: 5, cat: 'Ovos e lacticínios', porcao: { nome: 'dose', g: 30 } },

  // Hidratos
  { nome: 'Arroz cozido', kcal: 130, p: 2.7, h: 28, g: 0.3, cat: 'Hidratos', porcao: { nome: 'dose', g: 150 }, factorCru: 0.4 },
  { nome: 'Massa cozida', kcal: 158, p: 5.8, h: 31, g: 0.9, cat: 'Hidratos', porcao: { nome: 'dose', g: 150 }, factorCru: 0.45 },
  { nome: 'Batata cozida', kcal: 87, p: 2, h: 20, g: 0.1, cat: 'Hidratos', porcao: { nome: 'batata média', plural: 'batatas médias', g: 150 }, compra: 'unidade' },
  { nome: 'Batata doce cozida', kcal: 90, p: 2, h: 21, g: 0.1, cat: 'Hidratos', porcao: { nome: 'batata média', plural: 'batatas médias', g: 150 }, compra: 'unidade' },
  { nome: 'Pão de mistura', kcal: 250, p: 9, h: 48, g: 2.5, cat: 'Hidratos', porcao: { nome: 'fatia', g: 35 }, compra: 'unidade' },
  { nome: 'Pão integral', kcal: 247, p: 10, h: 41, g: 3.4, cat: 'Hidratos', porcao: { nome: 'fatia', g: 35 }, compra: 'unidade' },
  { nome: 'Flocos de aveia', kcal: 380, p: 13, h: 60, g: 7, cat: 'Hidratos', porcao: { nome: 'taça', g: 40 } },
  { nome: 'Grão-de-bico cozido', kcal: 164, p: 9, h: 27, g: 2.6, cat: 'Hidratos', porcao: { nome: 'dose', g: 120 }, factorCru: 0.42 },
  { nome: 'Feijão cozido', kcal: 132, p: 9, h: 24, g: 0.5, cat: 'Hidratos', porcao: { nome: 'dose', g: 120 }, factorCru: 0.42 },
  { nome: 'Lentilhas cozidas', kcal: 116, p: 9, h: 20, g: 0.4, cat: 'Hidratos', porcao: { nome: 'dose', g: 120 }, factorCru: 0.45 },

  // Fruta e legumes
  { nome: 'Banana', kcal: 89, p: 1.1, h: 23, g: 0.3, cat: 'Fruta e legumes', porcao: { nome: 'banana', g: 120 }, compra: 'unidade' },
  { nome: 'Maçã', kcal: 52, p: 0.3, h: 14, g: 0.2, cat: 'Fruta e legumes', porcao: { nome: 'maçã', g: 180 }, compra: 'unidade' },
  { nome: 'Laranja', kcal: 47, p: 0.9, h: 12, g: 0.1, cat: 'Fruta e legumes', porcao: { nome: 'laranja', g: 150 }, compra: 'unidade' },
  { nome: 'Abacate', kcal: 160, p: 2, h: 9, g: 15, cat: 'Fruta e legumes', porcao: { nome: 'abacate', g: 200 }, compra: 'unidade' },
  { nome: 'Brócolos cozidos', kcal: 34, p: 2.8, h: 7, g: 0.4, cat: 'Fruta e legumes', porcao: { nome: 'dose', g: 150 } },
  { nome: 'Espinafres', kcal: 23, p: 2.9, h: 3.6, g: 0.4, cat: 'Fruta e legumes', porcao: { nome: 'dose', g: 100 } },
  { nome: 'Alface', kcal: 15, p: 1.4, h: 2.9, g: 0.2, cat: 'Fruta e legumes', porcao: { nome: 'dose', g: 50 } },
  { nome: 'Tomate', kcal: 18, p: 0.9, h: 3.9, g: 0.2, cat: 'Fruta e legumes', porcao: { nome: 'tomate', g: 120 }, compra: 'unidade' },
  { nome: 'Cenoura', kcal: 41, p: 0.9, h: 10, g: 0.2, cat: 'Fruta e legumes', porcao: { nome: 'cenoura', g: 80 }, compra: 'unidade' },
  { nome: 'Courgette', kcal: 17, p: 1.2, h: 3.1, g: 0.3, cat: 'Fruta e legumes', porcao: { nome: 'courgette', g: 200 }, compra: 'unidade' },

  // Gorduras e extras
  { nome: 'Azeite', kcal: 884, p: 0, h: 0, g: 100, cat: 'Gorduras e extras', porcao: { nome: 'colher de sopa', plural: 'colheres de sopa', g: 14 }, liquido: true, densidade: 0.91 },
  { nome: 'Amêndoas', kcal: 579, p: 21, h: 22, g: 50, cat: 'Gorduras e extras', porcao: { nome: 'mão', g: 25 } },
  { nome: 'Manteiga de amendoim', kcal: 588, p: 25, h: 20, g: 50, cat: 'Gorduras e extras', porcao: { nome: 'colher de sopa', plural: 'colheres de sopa', g: 15 } },
  { nome: 'Mel', kcal: 304, p: 0.3, h: 82, g: 0, cat: 'Gorduras e extras', porcao: { nome: 'colher de chá', plural: 'colheres de chá', g: 7 } },
  { nome: 'Gel energético (1 un. ~40 g)', kcal: 250, p: 0, h: 62, g: 0, cat: 'Gorduras e extras', porcao: { nome: 'gel', g: 40 }, compra: 'unidade' },
];

// ---- Unidades ----
//
// Por dentro guarda-se sempre em gramas: é o que os valores nutricionais usam,
// e mudar isso obrigava a converter o histórico todo. O que muda é só o que se
// mostra e o que se escreve — ml nos líquidos, gramas no resto.

/** "ml" ou "g", conforme o alimento. */
export const unidadeDe = (a) => (a?.liquido ? 'ml' : 'g');

/** Gramas por ml. 1 quando não está dito, que é o certo para a água. */
export const densidadeDe = (a) => a?.densidade || 1;

/** Dos gramas guardados para o número que se mostra na unidade do alimento. */
export const mostrar = (a, gramas) => Math.round(gramas / densidadeDe(a));

/** Do número que ela escreveu para os gramas que se guardam. */
export const guardar = (a, valor) => Math.round(valor * densidadeDe(a));

/** "200 ml" ou "150 g". */
export const comUnidade = (a, gramas) => `${mostrar(a, gramas)} ${unidadeDe(a)}`;

export const REFEICOES = ['Pequeno-almoço', 'Meio da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];

/** A refeição mais provável à hora a que se está a registar. */
export function refeicaoSugerida(agora = new Date()) {
  const h = agora.getHours() + agora.getMinutes() / 60;
  if (h < 10.5) return 'Pequeno-almoço';
  if (h < 12) return 'Meio da manhã';
  if (h < 15) return 'Almoço';
  if (h < 18.5) return 'Lanche';
  if (h < 21.5) return 'Jantar';
  return 'Ceia';
}
