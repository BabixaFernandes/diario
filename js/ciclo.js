// Fases do ciclo e o padrão dela por fase.
//
// Uma nota que decide o desenho deste ficheiro: a evidência publicada não sustenta
// regras de manual. A meta-análise de referência (McNulty, Sports Medicine 2020) dá
// um efeito médio *trivial* no desempenho, e a revisão de 2025 com critérios
// metodológicos exigentes encontra efeitos inconsistentes em direcção e magnitude.
// O que sobra é variabilidade individual. Por isso este módulo mede e compara —
// nunca prescreve, e não diz nada antes de ter ciclos suficientes para dizer.

import { obter, somaDias } from './store.js';
import { PLANO } from './data/plano.js';

const CICLO_PADRAO = 28;
const MENSTRUACAO_PADRAO = 5;
const CICLOS_PARA_PADRAO = 2;
// Passados tantos dias sem fim marcado, deixa de fazer sentido oferecer "acabou hoje".
const DIAS_PERIODO_ABERTO = 14;
// Diferença entre o ciclo mais curto e o mais longo a partir da qual a média engana.
const VARIACAO_IRREGULAR = 5;
// Mínimo de corridas fáceis numa fase para a média valer alguma coisa.
const MINIMO_CORRIDAS_FASE = 2;

export const FASES = {
  menstruacao: { label: 'Menstruação', cor: 'vermelho' },
  folicular: { label: 'Folicular', cor: 'verde' },
  ovulacao: { label: 'Ovulação', cor: 'ouro', estimada: true },
  lutea: { label: 'Lútea', cor: 'roxo', estimada: true },
};

const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/** A duração média dos ciclos dela. Assumir 28 dias é um dos erros que a
 *  literatura aponta, por isso só se usa o valor padrão sem histórico. */
export function duracaoMedia() {
  const { ciclos } = obter();
  if (ciclos.length < 2) return { dias: CICLO_PADRAO, estimada: true, n: 0, irregular: false };
  const intervalos = ciclos.slice(1).map((c, i) => diasEntre(ciclos[i].inicio, c.inicio));
  const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
  const min = Math.min(...intervalos);
  const max = Math.max(...intervalos);
  return {
    dias: Math.round(media),
    estimada: false,
    n: intervalos.length,
    min,
    max,
    // Com esta variação, uma média deixa de ser uma boa previsão de fase.
    irregular: max - min >= VARIACAO_IRREGULAR,
  };
}

/** Quando é previsto o próximo período. Estimativa, e assumida como tal. */
export function proximoPeriodo(hoje) {
  const { ciclos } = obter();
  if (!ciclos.length) return null;
  const { dias: duracao } = duracaoMedia();
  let data = somaDias(ciclos[ciclos.length - 1].inicio, duracao);
  // Se já passou a data prevista, projecta o ciclo seguinte.
  while (data < hoje) data = somaDias(data, duracao);
  return { data, dias: diasEntre(hoje, data) };
}

/** Quantos dias duram os períodos dela, dos que tiverem fim marcado. */
export function duracaoPeriodo() {
  const fechados = obter().ciclos.filter((c) => c.fim);
  if (!fechados.length) return { dias: MENSTRUACAO_PADRAO, estimada: true, n: 0 };
  const duracoes = fechados.map((c) => diasEntre(c.inicio, c.fim) + 1);
  const media = duracoes.reduce((a, b) => a + b, 0) / duracoes.length;
  return { dias: Math.round(media), estimada: false, n: fechados.length };
}

/** O último ciclo que começou em ou antes de `data`. */
function cicloAplicavel(data) {
  return [...obter().ciclos].reverse().find((c) => c.inicio <= data) || null;
}

/**
 * Quanto durou um ciclo. Se já veio o período seguinte, a duração é conhecida e é
 * essa que se usa — não a média. Sem isto, cada período novo mexia na média global e
 * reclassificava sessões de meses atrás sem ela tocar em nada.
 */
function duracaoDoCiclo(ciclo) {
  const { ciclos } = obter();
  const i = ciclos.findIndex((c) => c.inicio === ciclo.inicio);
  const seguinte = ciclos[i + 1];
  return seguinte
    ? { dias: diasEntre(ciclo.inicio, seguinte.inicio), real: true }
    : { dias: duracaoMedia().dias, real: false };
}

/** O período que está a decorrer, se houver e se ainda fizer sentido fechá-lo. */
export function periodoAberto(hoje) {
  const c = cicloAplicavel(hoje);
  if (!c || c.fim) return null;
  return diasEntre(c.inicio, hoje) <= DIAS_PERIODO_ABERTO ? c : null;
}

/**
 * Em que fase cai um dia. `null` quando não há dados para o saber.
 * Com `projectar`, estende a média para ciclos futuros — serve para dizer em que
 * fase cai a prova, e vem marcado como projecção para não se confundir com dados.
 */
export function faseDe(data, projectar = false) {
  const ciclo = cicloAplicavel(data);
  if (!ciclo) return null;

  const doCiclo = duracaoDoCiclo(ciclo);
  let duracao = doCiclo.dias;
  let inicio = ciclo.inicio;
  let dia = diasEntre(inicio, data) + 1;
  let projectada = false;

  if (dia > duracao + 14) {
    if (!projectar) return null;
    // Para o futuro não há duração conhecida: projecta-se com a média.
    duracao = duracaoMedia().dias;
    inicio = somaDias(inicio, Math.floor((dia - 1) / duracao) * duracao);
    dia = diasEntre(inicio, data) + 1;
    projectada = true;
  }

  // Se o fim do período foi marcado, a menstruação é medida e não estimada.
  const fimConhecido = !projectada && ciclo.fim;
  const diasPeriodo = fimConhecido ? diasEntre(ciclo.inicio, ciclo.fim) + 1 : duracaoPeriodo().dias;

  const ovulacao = duracao - 14;
  let fase;
  if (dia <= diasPeriodo) fase = 'menstruacao';
  else if (dia < ovulacao - 1) fase = 'folicular';
  else if (dia <= ovulacao + 1) fase = 'ovulacao';
  else fase = 'lutea';

  const info = FASES[fase];
  // A menstruação só é medida quando o fim do período está marcado neste ciclo.
  const estimada = projectada || (fase === 'menstruacao' ? !fimConhecido : !!info.estimada);
  return { fase, dia, label: info.label, cor: info.cor, estimada, projectada };
}

/** Quantos ciclos completos existem — dois primeiros dias seguidos fazem um ciclo. */
export function ciclosCompletos() {
  return Math.max(0, obter().ciclos.length - 1);
}

export const faltamCiclos = () => Math.max(0, CICLOS_PARA_PADRAO - ciclosCompletos());

/** Sintomas fortes registados num intervalo de dias. */
export function sintomasFortes(de, ate) {
  const { sintomas } = obter();
  const fortes = [];
  for (let d = de; d <= ate; d = somaDias(d, 1)) {
    const s = sintomas[d];
    if (!s) continue;
    const quais = Object.entries(s).filter(([, v]) => v >= 2).map(([k]) => k);
    if (quais.length) fortes.push({ data: d, quais });
  }
  return fortes;
}

/**
 * O padrão dela, agrupado pela fase em que as sessões caíram.
 *
 * O ritmo e o esforço saem **só das corridas fáceis**, e não de todas as sessões.
 * Juntar longas e intervalos no mesmo "ritmo médio" dava um número que reflectia a
 * distribuição do calendário — que tipo de sessão calhou em que fase — e não a fase.
 * As fáceis têm todas o mesmo ritmo prescrito e duração parecida, por isso uma
 * diferença entre fases é sinal e não composição da amostra.
 *
 * Devolve `null` enquanto não houver ciclos suficientes: uma conclusão tirada de um
 * ciclo é pior do que não dizer nada.
 */
export function padraoPorFase() {
  if (faltamCiclos() > 0) return null;

  const { treinos } = obter();
  const porPlano = new Map();
  PLANO.flatMap((s) => s.sessoes).forEach((s) => porPlano.set(s.data, s.tipo));

  const grupos = {};
  Object.entries(treinos).forEach(([id, r]) => {
    if (!r.feito) return;
    const f = faseDe(id);
    if (!f) return;
    const tipo = obter().edicoes[id]?.tipo || obter().extras[id]?.tipo || porPlano.get(id);

    const g = (grupos[f.fase] ||= {
      fase: f.fase, label: f.label, sessoes: 0, faceis: 0, ritmos: [], esforcos: [], canela: 0,
    });
    g.sessoes += 1;
    if (r.dorCanela) g.canela += 1;
    if (tipo !== 'facil') return;
    g.faceis += 1;
    if (r.distanciaKm && r.tempoMin) g.ritmos.push((r.tempoMin * 60) / r.distanciaKm);
    if (r.esforco) g.esforcos.push(r.esforco);
  });

  const media = (a) => (a.length >= MINIMO_CORRIDAS_FASE ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const linhas = Object.values(grupos)
    .map((g) => ({ ...g, ritmo: media(g.ritmos), esforco: media(g.esforcos) }))
    .sort((a, b) => Object.keys(FASES).indexOf(a.fase) - Object.keys(FASES).indexOf(b.fase));

  return linhas.length ? { linhas, minimo: MINIMO_CORRIDAS_FASE } : null;
}

/** Os dias do ciclo que contém `data`, para o calendário de sintomas. */
export function diasDoCiclo(data) {
  const ciclo = cicloAplicavel(data);
  if (!ciclo) return null;
  const { dias: duracao } = duracaoDoCiclo(ciclo);
  const { sintomas } = obter();
  const dias = [];
  for (let i = 0; i < duracao; i++) {
    const d = somaDias(ciclo.inicio, i);
    dias.push({ data: d, dia: i + 1, sintomas: sintomas[d] || null, futuro: d > data });
  }
  return { inicio: ciclo.inicio, fim: ciclo.fim, dias };
}

/** Quantos dias de sintomas fortes tem um ciclo, para o histórico. */
export function fortesDoCiclo(inicio, fimExclusivo) {
  const { sintomas } = obter();
  return Object.entries(sintomas).filter(([d, s]) => (
    d >= inicio && (!fimExclusivo || d < fimExclusivo) && Object.values(s).some((v) => v >= 2)
  )).length;
}
