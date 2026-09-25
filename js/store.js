// Armazenamento local. Toda a leitura e escrita de dados passa por aqui —
// assim, acrescentar sincronização na nuvem mais tarde mexe só neste ficheiro.

import { ALIMENTOS_BASE } from './data/alimentos.js';
import { ALVOS_PADRAO } from './data/plano.js';

const CHAVE = 'diario.v1';

// Sobe sempre que houver uma alteração visível ao que a app faz — aparece nas
// Definições, para ela saber se o telemóvel já actualizou.
export const VERSAO_APP = '1.1.0';

// Nomes usados numa instalação nova. A lista passa para o estado para poder
// ser editada sem obrigar a alterar o código.
export const SUPLEMENTOS_BASE = ['Creatina', 'Colagénio', 'Vitamina C'];

// Função, e não constante: cada chamada devolve objectos novos, para que
// `treinos`, `ajustes` e companhia nunca fiquem partilhados entre estados.
function estadoInicial() {
  return {
    versao: 1,
    alvos: { ...ALVOS_PADRAO },
    treinos: {},    // "2026-09-23": { feito, distanciaKm, tempoMin, esforco, dorCanela, notas }
    ajustes: {},    // "2026-09-21": "2026-09-23" — sessão do plano movida para outro dia
    edicoes: {},    // "2026-09-23": { tipo, titulo, detalhe, passadeira, distanciaKm } — campos por cima do plano
    extras: {},     // "x-1758...": { data, tipo, titulo, detalhe, passadeira, distanciaKm } — sessão criada por ela
    pesos: {},      // "2026-09-21": 95.2
    ciclos: [],     // [{ inicio: "2026-09-18", fim: "2026-09-22" }] — fim null até ser marcado
    sintomas: {},   // "2026-09-19": { dores: 0-2, cansaco: 0-2, fluxo: 0-2 }
    alimentos: [],  // { id, nome, kcal, p, h, g, cat, porcao }
    diario: {},     // "2026-09-21": [ { id, alimentoId, gramas, refeicao } ]
    refeicoes: [],  // { id, nome, itens: [ { alimentoId, gramas } ] } — refeições guardadas, usadas dentro da ementa
    agua: {},       // "2026-09-21": 1750 — total do dia em ml
    semanaTipo: {}, // "0|Almoço": "r-123" — a semana normal, por dia da semana (0 = segunda)
    ementa: {},     // "2026-09-28": { "Almoço": "r-123" } — o que está planeado para cada dia
    compras: {},    // "2026-09-28": { "base-0": true } — o que já está comprado, por semana
    materializados: {}, // "2026-09-22": ["Almoço"] — refeições da ementa já postas no diário
    suplementos: {},      // "2026-09-23": { "Creatina": true, "Magnésio": true } — tomados nesse dia
    suplementosExtra: [], // compatibilidade com versões antigas
    suplementosLista: [...SUPLEMENTOS_BASE], // nomes que aparecem no registo diário
  };
}

let estado = carregar();
const ouvintes = new Set();

/** Um alimento de base ganhou um campo novo (ex.: `factorCru`) depois de já
 *  ter sido semeado no dispositivo dela. Sem isto, quem já usa a app fica
 *  para sempre sem esse campo — o alimento no dispositivo é uma cópia parada
 *  no tempo, não uma referência ao ficheiro de dados. Só preenche o que falta;
 *  o que ela já tiver corrigido à mão não se toca. */
function comCamposDeBase(alimentos) {
  return (alimentos || []).map((a) => {
    const m = /^base-(\d+)$/.exec(a.id);
    const base = m ? ALIMENTOS_BASE[Number(m[1])] : null;
    if (!base) return a.factorCru === undefined ? { ...a, factorCru: null } : a;
    if (a.factorCru !== undefined) return a;
    if (base.factorCru === undefined) return { ...a, factorCru: null };
    return { ...a, factorCru: base.factorCru };
  });
}

/** O mesmo caminho de migração serve para o que está no `localStorage` e para
 *  o que vem de um ficheiro exportado — uma cópia de segurança de uma versão
 *  anterior tem exactamente as mesmas lacunas que um dispositivo por
 *  actualizar, e corrigi-las só num dos dois sítios deixava o outro partir-se. */
function migrarEstado(guardado) {
  const suplementosLista = Array.isArray(guardado.suplementosLista)
    ? guardado.suplementosLista
    : [...SUPLEMENTOS_BASE, ...(guardado.suplementosExtra || [])];
  return {
    ...estadoInicial(),
    ...guardado,
    suplementosLista,
    alvos: { ...ALVOS_PADRAO, ...(guardado.alvos || {}) },
    // Os ciclos começaram por ser só a data de início, em texto.
    ciclos: (guardado.ciclos || []).map((c) => (typeof c === 'string' ? { inicio: c, fim: null } : c)),
    alimentos: comCamposDeBase(guardado.alimentos),
    // A ementa começou por guardar o id de uma refeição guardada em vez da
    // refeição. Sem isto, um plano feito na versão anterior fazia rebentar o
    // separador Comida inteiro — um ecrã vazio, sem explicação nenhuma.
    semanaTipo: migrarPlano(guardado.semanaTipo, guardado.refeicoes),
    ementa: migrarEmenta(guardado.ementa, guardado.refeicoes),
  };
}

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return semear(estadoInicial());
    return migrarEstado(JSON.parse(bruto));
  } catch {
    return semear(estadoInicial());
  }
}

/** Uma refeição de um plano, seja ela um id antigo ou já a refeição por dentro.
 *  Devolve `null` para o que não se consegue aproveitar — um id que apontava
 *  para uma refeição guardada que já não existe não tem nada a dizer. */
function refeicaoDoPlano(valor, refeicoes) {
  if (typeof valor === 'string') {
    const r = (refeicoes || []).find((x) => x.id === valor);
    return r ? { nome: r.nome || '', itens: r.itens.map((it) => ({ ...it })) } : null;
  }
  if (valor && Array.isArray(valor.itens) && valor.itens.length) {
    return { nome: valor.nome || '', itens: valor.itens.map((it) => ({ ...it })) };
  }
  return null;
}

/** `{ "0|Almoço": ... }` — a semana-tipo. */
function migrarPlano(plano, refeicoes) {
  const saida = {};
  Object.keys(plano || {}).forEach((chave) => {
    const r = refeicaoDoPlano(plano[chave], refeicoes);
    if (r) saida[chave] = r;
  });
  return saida;
}

/** `{ "2026-09-28": { "Almoço": ... } }` — a ementa. */
function migrarEmenta(ementa, refeicoes) {
  const saida = {};
  Object.keys(ementa || {}).forEach((data) => {
    const dia = migrarPlano(ementa[data], refeicoes);
    if (Object.keys(dia).length) saida[data] = dia;
  });
  return saida;
}

function semear(base) {
  base.alimentos = ALIMENTOS_BASE.map((a, i) => ({ id: `base-${i}`, ...a, factorCru: a.factorCru ?? null }));
  return base;
}

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    alert('Não foi possível guardar. O armazenamento do browser pode estar cheio.');
  }
  ouvintes.forEach((fn) => fn(estado));
}

export function obter() {
  return estado;
}

export function subscrever(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function actualizar(mutador) {
  mutador(estado);
  gravar();
}

// ---- Definições ----

export function guardarAlvos(novos) {
  actualizar((e) => {
    e.alvos = { ...e.alvos, ...novos, configurado: true, configuracaoAdiada: false };
  });
}

export function adiarConfiguracaoInicial() {
  actualizar((e) => { e.alvos.configuracaoAdiada = true; });
}

/** Mostrar os ritmos em velocidade de passadeira ou em pace de rua. */
export function definirModoRitmo(modo) {
  actualizar((e) => { e.alvos.modoRitmo = modo; });
}

/** Alvos estimados a partir das medidas. Mifflin-St Jeor + factor de actividade. */
export function calcularAlvos({ peso, altura, idade, sexo, actividade, defice }) {
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + (sexo === 'm' ? 5 : -161);
  const manutencao = tmb * actividade;
  const kcal = Math.round((manutencao - defice) / 10) * 10;
  const proteina = Math.round(peso * 1.6);
  const gordura = Math.round(peso * 0.65);
  const hidratos = Math.max(0, Math.round((kcal - proteina * 4 - gordura * 9) / 4));
  return { tmb: Math.round(tmb), manutencao: Math.round(manutencao), kcal, proteina, hidratos, gordura };
}

// ---- Treinos ----

export function registarTreino(data, dados) {
  actualizar((e) => {
    e.treinos[data] = { ...(e.treinos[data] || {}), ...dados };
  });
}

export function apagarTreino(data) {
  actualizar((e) => { delete e.treinos[data]; });
}

// ---- Reorganizar a semana ----
//
// Cada sessão é identificada pela data que tem no plano original, e é essa a
// chave usada em `treinos` — assim o registo acompanha a sessão quando ela muda
// de dia. `ajustes` guarda apenas para onde é que ela foi.

/** O dia em que a sessão acontece realmente. */
export function dataEfectiva(idSessao) {
  return estado.ajustes[idSessao] || idSessao;
}

/** Troca de dia duas sessões. Se a troca as devolve ao lugar original, o ajuste desaparece. */
export function trocarSessoes(idA, idB) {
  actualizar((e) => {
    const diaA = e.ajustes[idA] || idA;
    const diaB = e.ajustes[idB] || idB;
    if (diaB === idA) delete e.ajustes[idA]; else e.ajustes[idA] = diaB;
    if (diaA === idB) delete e.ajustes[idB]; else e.ajustes[idB] = diaA;
  });
}

/** Move uma sessão do plano para outro dia, sem trocar com ninguém. */
export function moverSessao(id, data) {
  actualizar((e) => {
    if (data === id) delete e.ajustes[id]; else e.ajustes[id] = data;
  });
}

// ---- Editar, criar e apagar sessões ----

/** Guarda por cima do plano só os campos que ela mudou. */
export function editarSessao(id, campos) {
  actualizar((e) => { e.edicoes[id] = { ...(e.edicoes[id] || {}), ...campos }; });
}

/** Sessão nova, que não existe no plano. Devolve o id criado. */
export function criarSessao(dados) {
  const id = `x-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  actualizar((e) => { e.extras[id] = dados; });
  return id;
}

/** Deita fora as alterações de conteúdo e devolve a sessão ao que o plano diz. */
export function reporConteudo(id) {
  actualizar((e) => { delete e.edicoes[id]; });
}

export function editarExtra(id, campos) {
  actualizar((e) => { e.extras[id] = { ...(e.extras[id] || {}), ...campos }; });
}

/** Apaga uma sessão. As que ela criou desaparecem; as do plano passam a dia de
 *  descanso, para o dia não ficar vazio e para poderem voltar com o repor. */
export function apagarSessao(id) {
  actualizar((e) => {
    if (e.extras[id]) {
      delete e.extras[id];
      delete e.treinos[id];
      delete e.ajustes[id];
    } else {
      e.edicoes[id] = {
        tipo: 'descanso', titulo: 'Descanso', detalhe: '', passadeira: '', distanciaKm: null,
      };
    }
  });
}

/** Devolve uma semana ao plano original: dias, conteúdos e sessões criadas. */
export function reporSemana(idsPlano, idsExtra) {
  actualizar((e) => {
    idsPlano.forEach((id) => {
      delete e.ajustes[id];
      delete e.edicoes[id];
    });
    idsExtra.forEach((id) => {
      delete e.extras[id];
      delete e.treinos[id];
    });
  });
}

// ---- Peso ----

export function registarPeso(data, kg) {
  actualizar((e) => {
    if (kg === null || kg === '' || Number.isNaN(Number(kg))) delete e.pesos[data];
    else e.pesos[data] = Number(kg);
  });
}

/** Média dos pesos registados na semana que contém `data` (segunda a domingo). */
export function mediaSemanal(data) {
  const d = new Date(data + 'T12:00:00');
  const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
  const segunda = new Date(d);
  segunda.setDate(d.getDate() - diaSemana);

  const valores = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(segunda);
    dia.setDate(segunda.getDate() + i);
    const v = estado.pesos[isoData(dia)];
    if (typeof v === 'number') valores.push(v);
  }
  if (!valores.length) return null;
  return { media: valores.reduce((a, b) => a + b, 0) / valores.length, n: valores.length };
}

// ---- Ciclo menstrual ----

// Um período não volta a começar dentro de tantos dias, por isso uma marca nova
// aqui perto é uma correcção da data e não um período novo.
const DIAS_MESMO_PERIODO = 10;

const distancia = (a, b) => Math.abs(Math.round((new Date(a) - new Date(b)) / 86400000));

/**
 * Marca um dia como primeiro dia de período; se já estava marcado, desmarca.
 * Se houver um início a menos de 10 dias, **corrige-o** em vez de acrescentar outro —
 * sem isto, corrigir uma data esquecida deixava dois inícios juntos e a média do
 * ciclo passava a contar um intervalo de dois dias.
 */
export function alternarInicioCiclo(data) {
  actualizar((e) => {
    if (e.ciclos.some((c) => c.inicio === data)) {
      e.ciclos = e.ciclos.filter((c) => c.inicio !== data);
      return;
    }
    const perto = e.ciclos.find((c) => distancia(c.inicio, data) <= DIAS_MESMO_PERIODO);
    if (perto) {
      perto.inicio = data;
      if (perto.fim && perto.fim < data) perto.fim = null; // o fim deixou de fazer sentido
    } else {
      e.ciclos.push({ inicio: data, fim: null });
    }
    e.ciclos.sort((a, b) => a.inicio.localeCompare(b.inicio));
  });
}

/** Fecha o período em curso, ou reabre-o se `data` for null. */
export function marcarFimCiclo(inicio, data) {
  actualizar((e) => {
    const c = e.ciclos.find((x) => x.inicio === inicio);
    if (c) c.fim = data;
  });
}

export function registarSintomas(data, dados) {
  actualizar((e) => {
    const novo = { ...(e.sintomas[data] || {}), ...dados };
    // Um dia sem nada não fica a ocupar espaço nem a contar como registo.
    if (Object.values(novo).every((v) => !v)) delete e.sintomas[data];
    else e.sintomas[data] = novo;
  });
}

// ---- Alimentos ----

// Um id só com o relógio dá ids iguais a duas coisas criadas no mesmo
// milissegundo — e como se apaga por id, apagar uma apagava as duas. As sessões
// e as linhas do diário já levavam sufixo aleatório; estas duas não levavam.
const novoId = (prefixo) => `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function adicionarAlimento(alimento) {
  const id = novoId('u');
  actualizar((e) => { e.alimentos.push({ id, ...alimento }); });
  return id;
}

export function actualizarAlimento(id, campos) {
  actualizar((e) => {
    const alimento = e.alimentos.find((a) => a.id === id);
    if (alimento) Object.assign(alimento, campos);
  });
}

export function apagarAlimento(id) {
  actualizar((e) => {
    e.alimentos = e.alimentos.filter((a) => a.id !== id);
  });
}

export function alimentoPorId(id) {
  return estado.alimentos.find((a) => a.id === id);
}

// ---- Diário alimentar ----

// Uma linha do diário que veio da ementa traz `planeado: true` até ela mexer
// nessa refeição. É a única forma de o plano poder entrar no diário sozinho sem
// a app começar a medir intenções em vez de refeições — e é a média semanal que
// manda cortar 150 kcal por dia, por isso a diferença não é cosmética.
function confirmarRefeicao(e, data, slot) {
  (e.diario[data] || []).forEach((l) => {
    if (l.refeicao === slot) delete l.planeado;
  });
}

export function adicionarAoDiario(data, entrada) {
  actualizar((e) => {
    if (!e.diario[data]) e.diario[data] = [];
    e.diario[data].push({ id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...entrada });
    if (!entrada.planeado) confirmarRefeicao(e, data, entrada.refeicao);
  });
}

export function removerDoDiario(data, id) {
  actualizar((e) => {
    const linha = (e.diario[data] || []).find((x) => x.id === id);
    e.diario[data] = (e.diario[data] || []).filter((x) => x.id !== id);
    if (!linha) return;
    confirmarRefeicao(e, data, linha.refeicao);
    // Tirar a última linha de uma refeição vinda da ementa é dizer que não a
    // comeste — e não pode fazê-la voltar ao próximo desenho do dia.
    if (!e.diario[data].some((l) => l.refeicao === linha.refeicao)) {
      const jaFeitos = e.materializados[data] || [];
      if (!jaFeitos.includes(linha.refeicao)) e.materializados[data] = [...jaFeitos, linha.refeicao];
    }
  });
}

/** Devolve o dia da comida ao que era antes da última remoção. Guarda-se o dia
 *  inteiro e não a linha tirada: assim o mesmo desfazer serve para o × de uma
 *  linha e para o × de uma refeição da ementa, e não há dois caminhos a manter. */
export function reporDia(data, linhas, refeicoesMaterializadas) {
  actualizar((e) => {
    if (linhas.length) e.diario[data] = linhas.map((l) => ({ ...l }));
    else delete e.diario[data];
    if (refeicoesMaterializadas.length) e.materializados[data] = [...refeicoesMaterializadas];
    else delete e.materializados[data];
  });
}

/** "Comi isto como estava planeado" — tira a marca de plano a uma refeição. */
export function confirmarPlaneada(data, slot) {
  actualizar((e) => confirmarRefeicao(e, data, slot));
}

/** Põe no diário o que a ementa tem planeado para o dia, nas refeições que
 *  ainda não têm nada registado. Só para hoje e para trás: encher o diário de
 *  uma semana que ainda não aconteceu era dar por comida a comida do futuro. */
export function materializarEmenta(data) {
  if (data > isoData()) return false;
  const plano = estado.ementa[data];
  if (!plano) return false;

  const jaFeitos = estado.materializados[data] || [];
  const porFazer = Object.keys(plano).filter((slot) => {
    const r = plano[slot];
    // `jaFeitos` é o que impede uma refeição removida de voltar. Sem isto,
    // remover não fazia nada visível: a materialização corre ao desenhar o dia
    // e punha a refeição de volta no mesmo instante.
    return r?.itens?.length
      && !jaFeitos.includes(slot)
      && !(estado.diario[data] || []).some((l) => l.refeicao === slot);
  });
  if (!porFazer.length) return false;

  actualizar((e) => {
    if (!e.diario[data]) e.diario[data] = [];
    porFazer.forEach((slot) => {
      plano[slot].itens.forEach((it, i) => {
        e.diario[data].push({
          id: `p-${data}-${slot}-${i}`,
          alimentoId: it.alimentoId,
          gramas: it.gramas,
          refeicao: slot,
          planeado: true,
        });
      });
    });
    e.materializados[data] = [...jaFeitos, ...porFazer];
  });
  return true;
}

/** "Não comi isto" — tira a refeição planeada do diário e não a deixa voltar.
 *  A ementa fica como está: o plano era esse, é o dia que não foi. */
export function descartarPlaneada(data, slot) {
  actualizar((e) => {
    e.diario[data] = (e.diario[data] || []).filter((l) => l.refeicao !== slot);
    if (!e.diario[data].length) delete e.diario[data];
    const jaFeitos = e.materializados[data] || [];
    if (!jaFeitos.includes(slot)) e.materializados[data] = [...jaFeitos, slot];
  });
}

/** Corrigir uma entrada sem a apagar e voltar a fazer o caminho todo. */
export function actualizarNoDiario(data, id, campos) {
  actualizar((e) => {
    const linha = (e.diario[data] || []).find((x) => x.id === id);
    if (!linha) return;
    Object.assign(linha, campos);
    // Corrigir uma linha é a forma natural de dizer "foi assim que comi".
    confirmarRefeicao(e, data, linha.refeicao);
  });
}

/** Reflecte uma refeição registada no dia na ementa, quando esse lugar ainda
 *  não era um plano feito à mão. Um plano existente fica intacto para poder
 *  ser comparado com o que foi realmente comido. */
export function refletirDiarioNaEmenta(data, slot) {
  actualizar((e) => {
    const itens = (e.diario[data] || [])
      .filter((l) => l.refeicao === slot && !l.planeado)
      .map((l) => ({ alimentoId: l.alimentoId, gramas: l.gramas }));
    const dia = { ...(e.ementa[data] || {}) };
    const anterior = dia[slot];

    if (anterior && anterior.origem !== 'diario') return;
    if (itens.length) dia[slot] = { nome: '', itens, origem: 'diario' };
    else delete dia[slot];

    if (Object.keys(dia).length) e.ementa[data] = dia;
    else delete e.ementa[data];
  });
}

/** Traz o diário de outro dia para cá. Acrescenta, não substitui. */
export function copiarDia(de, para) {
  actualizar((e) => {
    const origem = e.diario[de] || [];
    if (!origem.length) return;
    e.diario[para] = [...(e.diario[para] || []), ...origem.map((l, i) => ({
      ...l, id: `d-${Date.now()}-${i}`,
    }))];
  });
}

/** Traz uma refeição de outro dia para cá. O que veio de um plano passa a ser
 *  uma escolha efetivamente registada no novo dia. Acrescenta, não substitui. */
export function copiarRefeicao(de, para, slot, modo = 'acrescentar') {
  actualizar((e) => {
    const origem = (e.diario[de] || []).filter((l) => l.refeicao === slot);
    if (!origem.length) return;
    if (!e.diario[para]) e.diario[para] = [];
    if (modo === 'substituir') {
      e.diario[para] = e.diario[para].filter((l) => l.refeicao !== slot);
    }
    e.diario[para].push(...origem.map((l, i) => {
      const { planeado, ...linha } = l;
      return { ...linha, id: `d-${Date.now()}-${i}` };
    }));
  });
}

/** Quantas vezes cada alimento foi usado, e quando foi a última — para o pôr à mão. */
export function usoDosAlimentos() {
  const uso = {};
  Object.entries(estado.diario).forEach(([data, linhas]) => {
    linhas.forEach((l) => {
      const u = (uso[l.alimentoId] ||= { n: 0, ultima: '' });
      u.n += 1;
      if (data > u.ultima) u.ultima = data;
    });
  });
  return uso;
}

// ---- Refeições guardadas ----

export function guardarRefeicao(nome, itens) {
  const id = novoId('r');
  actualizar((e) => { e.refeicoes.push({ id, nome, itens }); });
  return id;
}

/** Muda uma refeição guardada. Não toca nas ementas onde ela já foi usada —
 *  cada lugar da ementa tem a sua própria cópia, de propósito: mudar a receita
 *  não devia reescrever semanas já planeadas nem listas de compras já feitas. */
export function actualizarRefeicaoGuardada(id, { nome, itens }) {
  actualizar((e) => {
    const r = e.refeicoes.find((x) => x.id === id);
    if (!r) return;
    r.nome = nome || r.nome;
    r.itens = itens.map((it) => ({ ...it }));
  });
}

export function apagarRefeicaoGuardada(id) {
  actualizar((e) => { e.refeicoes = e.refeicoes.filter((r) => r.id !== id); });
}

export function aplicarRefeicao(data, refeicaoId, slot) {
  actualizar((e) => {
    const r = e.refeicoes.find((x) => x.id === refeicaoId);
    if (!r) return;
    e.diario[data] = [...(e.diario[data] || []), ...r.itens.map((it, i) => ({
      id: `d-${Date.now()}-${i}`, alimentoId: it.alimentoId, gramas: it.gramas, refeicao: slot,
    }))];
  });
}

export function refeicaoPorId(id) {
  return estado.refeicoes.find((r) => r.id === id) || null;
}

// ---- Ementa: a semana-tipo, o plano de cada semana e as compras ----

/** A segunda-feira da semana que contém `data`. É a chave de tudo o que é semanal. */
export function segundaDe(data) {
  const d = new Date(`${data}T12:00:00`);
  return somaDias(data, -((d.getDay() + 6) % 7));
}

/** 0 = segunda, 6 = domingo. */
export function diaDaSemana(data) {
  return (new Date(`${data}T12:00:00`).getDay() + 6) % 7;
}

// Cada lugar da ementa e da semana-tipo guarda a refeição **por dentro** —
// `{ nome, itens: [{ alimentoId, gramas }] }` — e não uma referência a uma
// refeição guardada. Foi uma correcção de rumo: obrigar a criar refeições
// guardadas antes de se poder planear uma semana era pôr uma abstração à frente
// da tarefa. As refeições guardadas passam a ser atalho, não pré-requisito.
const copiar = (r) => (r ? { nome: r.nome || '', itens: r.itens.map((it) => ({ ...it })) } : null);

export function definirSemanaTipo(dia, refeicao, valor) {
  actualizar((e) => {
    const chave = `${dia}|${refeicao}`;
    if (valor && valor.itens.length) e.semanaTipo[chave] = copiar(valor);
    else delete e.semanaTipo[chave];
  });
}

/** Escreve a semana-tipo nos sete dias da semana de `segunda`.
 *
 *  `preservar` mantém o que já estava planeado à mão nessa semana — a semana-tipo
 *  é o ponto de partida, não uma coisa que apaga as excepções que ela pôs. */
export function aplicarSemanaTipo(segunda, preservar = true) {
  actualizar((e) => {
    for (let i = 0; i < 7; i += 1) {
      const data = somaDias(segunda, i);
      const daSemana = {};
      Object.keys(e.semanaTipo).forEach((chave) => {
        const [dia, refeicao] = chave.split('|');
        if (Number(dia) === i) daSemana[refeicao] = copiar(e.semanaTipo[chave]);
      });
      const junto = preservar ? { ...daSemana, ...(e.ementa[data] || {}) } : daSemana;
      if (Object.keys(junto).length) e.ementa[data] = junto;
      else delete e.ementa[data];
    }
  });
}

/** Traz a semana de `de` para a semana de `para`, dia a dia. É o atalho que
 *  interessa a quem come parecido de semana para semana: copia-se e ajusta-se. */
export function copiarSemanaEmenta(de, para) {
  actualizar((e) => {
    for (let i = 0; i < 7; i += 1) {
      const origem = e.ementa[somaDias(de, i)];
      const destino = somaDias(para, i);
      if (!origem) { delete e.ementa[destino]; continue; }
      const dia = {};
      Object.keys(origem).forEach((slot) => { dia[slot] = copiar(origem[slot]); });
      e.ementa[destino] = dia;
    }
  });
}

export function definirEmenta(data, refeicao, valor) {
  actualizar((e) => {
    // Mudar o plano de uma refeição deixa-a voltar a entrar no diário: a versão
    // nova é outra coisa, e não a que já tinha sido posta e tirada.
    const jaFeitos = e.materializados[data] || [];
    if (jaFeitos.includes(refeicao)) {
      const resto = jaFeitos.filter((s) => s !== refeicao);
      if (resto.length) e.materializados[data] = resto; else delete e.materializados[data];
    }
    const dia = { ...(e.ementa[data] || {}) };
    if (valor && valor.itens.length) dia[refeicao] = copiar(valor);
    else delete dia[refeicao];
    if (Object.keys(dia).length) e.ementa[data] = dia;
    else delete e.ementa[data];
  });
}

export function limparEmenta(segunda) {
  actualizar((e) => {
    for (let i = 0; i < 7; i += 1) {
      delete e.ementa[somaDias(segunda, i)];
      delete e.materializados[somaDias(segunda, i)];
    }
    delete e.compras[segunda];
  });
}

/** O que está planeado para um dia: { refeicao: { nome, itens } }. */
export function ementaDoDia(data) {
  return estado.ementa[data] || {};
}

/** Põe no diário a refeição que estava planeada para aquele lugar. */
export function aplicarPlanoAoDiario(data, slot) {
  const planeada = (estado.ementa[data] || {})[slot];
  if (!planeada || !planeada.itens?.length) return;
  actualizar((e) => {
    e.diario[data] = [...(e.diario[data] || []), ...planeada.itens.map((it, i) => ({
      id: `d-${Date.now()}-${i}`, alimentoId: it.alimentoId, gramas: it.gramas, refeicao: slot,
    }))];
  });
}

/** Soma dos alimentos de uma semana planeada, em gramas, por alimento.
 *  É daqui que sai a lista de compras: o que se vai cozinhar, não o que se comeu. */
export function alimentosDaSemana(segunda) {
  const soma = {};
  for (let i = 0; i < 7; i += 1) {
    const dia = estado.ementa[somaDias(segunda, i)] || {};
    Object.values(dia).forEach((r) => {
      (r.itens || []).forEach((it) => {
        soma[it.alimentoId] = (soma[it.alimentoId] || 0) + it.gramas;
      });
    });
  }
  return soma;
}

export function alternarCompra(segunda, alimentoId) {
  actualizar((e) => {
    const semana = { ...(e.compras[segunda] || {}) };
    if (semana[alimentoId]) delete semana[alimentoId];
    else semana[alimentoId] = true;
    if (Object.keys(semana).length) e.compras[segunda] = semana;
    else delete e.compras[segunda];
  });
}

export function limparCompras(segunda) {
  actualizar((e) => { delete e.compras[segunda]; });
}

/** Soma dos macros de um dia. */
export function totaisDoDia(data) {
  const linhas = estado.diario[data] || [];
  return linhas.reduce(
    (acc, linha) => {
      const a = alimentoPorId(linha.alimentoId);
      if (!a) return acc;
      const f = linha.gramas / 100;
      acc.kcal += a.kcal * f;
      acc.p += a.p * f;
      acc.h += a.h * f;
      acc.g += a.g * f;
      return acc;
    },
    { kcal: 0, p: 0, h: 0, g: 0 }
  );
}

/** Média de calorias e proteína na semana (segunda a domingo) que contém `data`.
 *  Conta só os dias com algo registado — a média de sete dias com três em branco
 *  não é uma média, é um erro. */
export function mediaSemanalComida(data) {
  const d = new Date(data + 'T12:00:00');
  const segunda = somaDias(data, -((d.getDay() + 6) % 7));

  const dias = Array.from({ length: 7 }, (_, i) => somaDias(segunda, i));
  const comRegisto = dias.filter((x) => (estado.diario[x] || []).length);
  if (!comRegisto.length) return { dias: 0, deDias: 7, segunda };

  const totais = comRegisto.map((x) => totaisDoDia(x));
  return {
    dias: comRegisto.length,
    deDias: 7,
    segunda,
    // Dias em que tudo o que lá está veio da ementa e ainda não foi confirmado.
    // Entram na média — excluí-los dizia "3 de 7 dias" a quem cumpriu o plano à
    // risca — mas a média tem de dizer de onde vem.
    diasPlano: comRegisto.filter((x) => soPlano(x)).length,
    kcal: totais.reduce((a, t) => a + t.kcal, 0) / totais.length,
    proteina: totais.reduce((a, t) => a + t.p, 0) / totais.length,
  };
}

/** O dia tem linhas, e todas vieram do plano sem ninguém lhes tocar. */
export function soPlano(data) {
  const linhas = estado.diario[data] || [];
  return linhas.length > 0 && linhas.every((l) => l.planeado);
}

// ---- Água ----

/** Soma (ou subtrai) ml ao dia. Nunca desce abaixo de zero. */
export function ajustarAgua(data, ml) {
  actualizar((e) => {
    e.agua[data] = Math.max(0, (e.agua[data] || 0) + ml);
  });
}

/** Põe o total do dia. `null` apaga o registo — que não é o mesmo que zero:
 *  zero é "bebi muito pouco", apagado é "não registei". */
export function definirAgua(data, ml) {
  actualizar((e) => {
    if (ml === null || ml === '' || Number.isNaN(Number(ml))) delete e.agua[data];
    else e.agua[data] = Math.max(0, Math.round(Number(ml)));
  });
}

/** Média de água na semana (segunda a domingo) que contém `data`.
 *  Conta só os dias com registo, pela mesma razão que a comida. */
export function mediaSemanalAgua(data) {
  const d = new Date(data + 'T12:00:00');
  const segunda = somaDias(data, -((d.getDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => somaDias(segunda, i))
    .filter((x) => estado.agua[x] !== undefined);

  if (!dias.length) return { dias: 0, deDias: 7, segunda, media: 0 };
  return {
    dias: dias.length,
    deDias: 7,
    segunda,
    media: dias.reduce((a, x) => a + estado.agua[x], 0) / dias.length,
  };
}

// ---- Suplementos ----

/** A lista configurável, sem nomes repetidos. */
export function suplementosDoDia() {
  return [...new Set(estado.suplementosLista || SUPLEMENTOS_BASE)];
}

export function alternarSuplemento(data, nome) {
  actualizar((e) => {
    const dia = { ...(e.suplementos[data] || {}) };
    if (dia[nome]) delete dia[nome]; else dia[nome] = true;
    if (Object.keys(dia).length) e.suplementos[data] = dia;
    else delete e.suplementos[data];
  });
}

/** Um suplemento novo. Sem nome repetido — repetir só faria a lista crescer
 *  sem acrescentar nada de novo para marcar. */
export function adicionarSuplementoExtra(nome) {
  actualizar((e) => {
    if (!suplementosDoDia().some((s) => s.toLowerCase() === nome.toLowerCase())) {
      e.suplementosLista = [...suplementosDoDia(), nome];
    }
  });
}

/** Tira da lista de escolha; o que já ficou marcado em dias passados mantém-se
 *  no histórico desse dia. */
export function apagarSuplementoExtra(nome) {
  actualizar((e) => {
    e.suplementosLista = suplementosDoDia().filter((s) => s !== nome);
  });
}

/** Renomeia também as marcações antigas para não quebrar o histórico. */
export function editarSuplemento(nome, novoNome) {
  actualizar((e) => {
    const lista = suplementosDoDia();
    if (lista.some((s) => s !== nome && s.toLowerCase() === novoNome.toLowerCase())) return;
    e.suplementosLista = lista.map((s) => (s === nome ? novoNome : s));
    Object.values(e.suplementos).forEach((dia) => {
      if (dia[nome] === undefined) return;
      dia[novoNome] = dia[nome];
      delete dia[nome];
    });
  });
}

// ---- Cópia de segurança ----

export function exportar() {
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diario-backup-${isoData(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importar(texto) {
  const dados = JSON.parse(texto);
  if (!dados || typeof dados !== 'object' || !('versao' in dados)) {
    throw new Error('Este ficheiro não parece ser uma cópia de segurança da app.');
  }
  // Mesmo caminho de `carregar()`: uma cópia de segurança de uma versão
  // anterior tem de entrar pela mesma migração, ou traz as mesmas lacunas
  // que o dispositivo antigo já tinha corrigido sozinho ao abrir.
  estado = migrarEstado(dados);
  gravar();
}

// ---- Utilitários de data ----

export function isoData(d = new Date()) {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function somaDias(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoData(d);
}

export function dataLegivel(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${dias[d.getDay()]}, ${d.getDate()} ${meses[d.getMonth()]}`;
}

/** Mostra minutos guardados como minutos e segundos, sem perder a precisão interna. */
export function formatarTempo(minutos) {
  if (minutos === null || minutos === undefined || Number.isNaN(Number(minutos))) return '';
  const totalSegundos = Math.max(0, Math.round(Number(minutos) * 60));
  return `${Math.floor(totalSegundos / 60)}:${String(totalSegundos % 60).padStart(2, '0')}`;
}

export function diaCurto(iso) {
  const d = new Date(iso + 'T12:00:00');
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
}
