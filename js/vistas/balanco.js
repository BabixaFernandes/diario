// Balanço de uma semana terminada. Não há modelo nenhum por trás: são as regras
// do próprio plano aplicadas aos registos dela. O que a app não conseguir dizer,
// o botão de copiar manda para uma conversa a sério.

import {
  obter, mediaSemanal, totaisDoDia, somaDias, diaCurto, dataLegivel, soPlano, formatarTempo,
  suplementosDoDia,
} from '../store.js';
import { faseDe, sintomasFortes } from '../ciclo.js';

const NOME_SINTOMA = { dores: 'dores', cansaco: 'cansaço', fluxo: 'fluxo' };

/** "dores", "dores e fluxo", "dores, fluxo e cansaço" */
const lista = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);

const nomesSintomas = (fortes) => lista([...new Set(fortes.flatMap((f) => f.quais))].map((k) => NOME_SINTOMA[k] || k));

// O ritmo fácil do plano é 8:15-8:45/km, e correr mais rápido do que isso é o erro
// central dela. Mas 10 s/km de tolerância sobre o limite, senão o aviso dispara por
// causa do GPS ou da passadeira e deixa de valer a pena ler.
const FACIL_RAPIDO_DE_MAIS = 485;
const PERDA_SEMANAL_ALVO = 0.4;
const MINIMO_DIAS_COMIDA = 5;

// A água é o último recado da lista, por isso só vale a pena dizer algo quando há
// dias suficientes para não ser ruído — e a falha que interessa é nos dias de treino.
const MINIMO_DIAS_AGUA = 4;
const AGUA_BAIXA = 0.8;
const DIAS_TREINO_SECOS = 2;

const ritmo = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`;
const num = (v, casas = 1) => v.toFixed(casas).replace('.', ',');
const litros = (ml) => `${(ml / 1000).toFixed(1).replace('.', ',')} L`;

function diasEntre(inicio, fim) {
  const dias = [];
  for (let d = inicio; d <= fim; d = somaDias(d, 1)) dias.push(d);
  return dias;
}

export function calcularBalanco(semana, sessoes, fim, hoje) {
  const e = obter();
  const reg = (s) => e.treinos[s.id] || {};

  // Numa semana a decorrer só se contam os dias que já passaram — dizer "2 de 5"
  // à terça-feira seria uma acusação, não um balanço.
  const emCurso = fim >= hoje;
  const ate = emCurso ? hoje : fim;

  // Uma sessão só falta depois de o dia acabar. A de hoje ainda está a tempo.
  const limiteFalta = emCurso ? hoje : somaDias(fim, 1);

  const treinaveis = sessoes.filter((s) => s.tipo !== 'descanso' && s.data <= ate);
  const feitas = treinaveis.filter((s) => reg(s).feito);
  const faltaram = treinaveis.filter((s) => !reg(s).feito && s.data < limiteFalta);
  const canela = treinaveis.filter((s) => reg(s).dorCanela);

  const longa = sessoes.find((s) => s.tipo === 'longa' || s.tipo === 'prova');
  // O registo da longa só conta depois do dia dela — senão o balanço de hoje
  // relatava um domingo que ainda não aconteceu.
  const longaReg = longa && longa.data <= ate ? reg(longa) : null;

  // Ritmo médio das corridas fáceis que tenham distância e tempo registados.
  const faceis = sessoes
    .filter((s) => s.tipo === 'facil' && s.data <= ate)
    .map((s) => reg(s))
    .filter((r) => r.distanciaKm && r.tempoMin);
  const ritmoFacil = faceis.length
    ? faceis.reduce((a, r) => a + (r.tempoMin * 60) / r.distanciaKm, 0) / faceis.length
    : null;

  const peso = mediaSemanal(semana.inicio);
  const pesoAnterior = mediaSemanal(somaDias(semana.inicio, -7));

  const dias = diasEntre(semana.inicio, ate);
  const comidos = dias.filter((d) => (e.diario[d] || []).length);
  const totais = comidos.map((d) => totaisDoDia(d));
  const comida = {
    dias: comidos.length,
    deDias: dias.length,
    // Dias cuja comida veio da ementa e nunca foi confirmada. Um balanço que
    // trate isso como registo está a avaliar o plano, não a semana.
    diasPlano: comidos.filter((d) => soPlano(d)).length,
    kcal: totais.length ? totais.reduce((a, t) => a + t.kcal, 0) / totais.length : null,
    proteina: totais.length ? totais.reduce((a, t) => a + t.p, 0) / totais.length : null,
  };

  // A água tem alvo por dia, e não um alvo fixo: um dia de treino pede mais. Comparar
  // tudo contra o mesmo número dava semanas "no sítio" que secaram os dias que contam.
  const comTreino = (d) => sessoes.some((s) => s.data === d && s.tipo !== 'descanso');
  const alvoDia = (d) => (e.alvos.aguaMl || 0) + (comTreino(d) ? (e.alvos.aguaExtraTreino || 0) : 0);
  const aguaDias = dias.filter((d) => e.agua[d] !== undefined);
  const agua = {
    dias: aguaDias.length,
    deDias: dias.length,
    media: aguaDias.length ? aguaDias.reduce((a, d) => a + e.agua[d], 0) / aguaDias.length : null,
    secos: aguaDias.filter((d) => comTreino(d) && e.agua[d] < alvoDia(d) * AGUA_BAIXA),
  };

  const suplementosDias = dias.filter((d) => Object.keys(e.suplementos[d] || {}).length);
  const suplementos = {
    dias: suplementosDias.length,
    deDias: dias.length,
    tomados: suplementosDoDia().map((nome) => ({
      nome,
      dias: dias.filter((d) => e.suplementos[d]?.[nome]).length,
    })),
  };

  // As fases por que a semana passou, e os dias que ela marcou como fortes.
  const fases = [...new Set(dias.map((d) => faseDe(d)?.label).filter(Boolean))];
  const fortes = sintomasFortes(semana.inicio, ate);

  return {
    semana, fim, hoje, emCurso, treinaveis, feitas, faltaram, canela,
    longa, longaReg, ritmoFacil, peso, pesoAnterior, comida, agua, suplementos,
    fases, fortes, alvos: e.alvos,
  };
}

/** No máximo dois recados, pela ordem em que importam. A canela vem sempre primeiro. */
function veredictos(b) {
  const msgs = [];

  if (b.canela.length) {
    msgs.push({
      tom: 'mau',
      texto: `Dor na canela registada em ${b.canela.length === 1 ? 'uma sessão' : `${b.canela.length} sessões`}. `
        + 'Regra do plano: se doer no aquecimento, ou ainda doer 24 h depois de correr, não corres no dia seguinte. '
        + 'Cortas a semana e retomas onde estavas — isto está acima de qualquer tempo.',
    });
  }

  // Só é falta depois de o dia passar. Numa semana a decorrer, a longa ainda vem a caminho.
  if (b.longa && b.longa.data < b.hoje && !b.longaReg?.feito) {
    msgs.push({
      tom: 'mau',
      texto: 'A corrida longa não ficou feita. É a única sessão da semana que não se salta — '
        + 'falhar terças e quartas não tem importância, falhar domingos faz descarrilar o plano.',
    });
  }

  // Não é prescrição nem desculpa: é impedir que uma semana difícil seja lida como
  // perda de forma. Por isso só aparece quando houve mesmo algo a correr mal.
  if (b.fortes.length && (b.faltaram.length || b.canela.length)) {
    msgs.push({
      tom: 'aviso',
      texto: `${b.fortes.length} ${b.fortes.length === 1 ? 'dia' : 'dias'} com ${nomesSintomas(b.fortes)} forte nesta semana. `
        + 'Antes de a ler como perda de forma, conta com isso — uma semana assim custa mais pelo mesmo treino.',
    });
  }

  if (b.ritmoFacil && b.ritmoFacil < FACIL_RAPIDO_DE_MAIS) {
    msgs.push({
      tom: 'mau',
      texto: `As corridas fáceis saíram a ${ritmo(b.ritmoFacil)}, mais rápido do que o limite de 8:15/km. `
        + 'É o teu erro de sempre, em ponto pequeno: o ganho vem de correr devagar nos dias fáceis '
        + 'para poder correr forte nos dias fortes.',
    });
  }

  if (b.peso && b.pesoAnterior) {
    const delta = b.peso.media - b.pesoAnterior.media;
    if (delta > -0.1) {
      msgs.push({
        tom: 'aviso',
        texto: `A média do peso ${delta >= 0.05 ? `subiu ${num(delta)} kg` : 'ficou parada'} em relação à semana anterior, `
          + `contra os −${num(PERDA_SEMANAL_ALVO)} kg previstos. Uma semana não diz nada; três seguidas pedem menos 150 kcal por dia.`,
      });
    }
  }

  if (b.comida.dias >= MINIMO_DIAS_COMIDA && b.comida.proteina < b.alvos.proteina * 0.9) {
    msgs.push({
      tom: 'aviso',
      texto: `Proteína numa média de ${Math.round(b.comida.proteina)} g, com alvo de ${b.alvos.proteina} g. `
        + 'É o que impede que o peso perdido venha do músculo que construíste em dois anos.',
    });
  }

  // Último da lista de propósito: é o recado menos grave dos sete, por isso só chega
  // à superfície numa semana em que não há canela, longa falhada nem proteína em falta
  // — que é exactamente quando vale a pena lê-lo.
  if (b.agua.dias >= MINIMO_DIAS_AGUA && b.agua.secos.length >= DIAS_TREINO_SECOS) {
    msgs.push({
      tom: 'aviso',
      texto: `${b.agua.secos.length} dias de treino com pouca água (${b.agua.secos.map((d) => `${diaCurto(d)} ${Number(d.slice(8))}`).join(', ')}), `
        + `numa média de ${litros(b.agua.media)} na semana. Desidratada, o mesmo treino sai com mais esforço percebido `
        + 'e pulsação mais alta — não é falta de forma, é só água a menos.',
    });
  }

  if (!msgs.length) {
    if (!b.treinaveis.length) {
      msgs.push({ tom: 'bom', texto: 'A semana ainda não tem sessões para avaliar. Volta aqui depois do primeiro treino.' });
    } else {
      const partes = [b.emCurso ? 'Por agora, tudo no sítio' : 'Semana no sítio'];
      if (b.longaReg?.feito) partes.push('a longa feita');
      if (b.ritmoFacil) partes.push(`as fáceis a ${ritmo(b.ritmoFacil)}`);
      msgs.push({
        tom: 'bom',
        texto: `${partes.join(', ')}. ${b.emCurso ? 'Continua assim o resto da semana.' : 'Sem nada a corrigir — continua.'}`,
      });
    }
  }

  return msgs.slice(0, 2);
}

function linhaLonga(b) {
  if (!b.longa) return null;
  if (!b.longaReg?.feito) {
    if (b.longa.data > b.hoje) return `${diaCurto(b.longa.data)} ${Number(b.longa.data.slice(8))} — ainda por fazer`;
    return 'não feita';
  }
  const p = [];
  if (b.longaReg.distanciaKm) p.push(`${num(b.longaReg.distanciaKm)} km`);
  if (b.longaReg.tempoMin) p.push(formatarTempo(b.longaReg.tempoMin));
  if (b.longaReg.distanciaKm && b.longaReg.tempoMin) {
    p.push(ritmo((b.longaReg.tempoMin * 60) / b.longaReg.distanciaKm));
  }
  if (b.longaReg.esforco) p.push(`esforço ${b.longaReg.esforco}/5`);
  return p.length ? p.join(' · ') : 'feita';
}

function linhaPeso(b) {
  if (!b.peso) return 'sem pesagens esta semana';
  const base = `média ${num(b.peso.media)} kg (${b.peso.n} ${b.peso.n === 1 ? 'pesagem' : 'pesagens'})`;
  if (!b.pesoAnterior) return base;
  const delta = b.peso.media - b.pesoAnterior.media;
  if (Math.abs(delta) < 0.05) return `${base} · igual à semana anterior`;
  return `${base} · ${delta < 0 ? '−' : '+'}${num(Math.abs(delta))} kg`;
}

function linhaComida(b) {
  if (!b.comida.dias) return 'nenhum dia registado';
  let t = `${b.comida.dias} de ${b.comida.deDias} dias · ${Math.round(b.comida.kcal)} kcal · proteína ${Math.round(b.comida.proteina)} g`;
  if (b.comida.diasPlano) t += ` · ${b.comida.diasPlano} da ementa sem confirmação`;
  if (b.comida.dias < MINIMO_DIAS_COMIDA) t += ' — poucos dias para tirar conclusões';
  return t;
}

const linhas = (b) => [
  ['Sessões', b.treinaveis.length
    ? `${b.feitas.length} de ${b.treinaveis.length}${b.emCurso ? ' até hoje' : ''}`
    + (b.faltaram.length
      ? ` — faltou ${b.faltaram.map((s) => `${diaCurto(s.data)} ${Number(s.data.slice(8))}`).join(', ')}`
      : '')
    : 'a semana ainda não começou a contar'],
  ['A longa', linhaLonga(b)],
  ['Ritmo fácil', b.ritmoFacil ? ritmo(b.ritmoFacil) : 'sem distância e tempo registados'],
  ['Canela', b.canela.length ? `${b.canela.length} ${b.canela.length === 1 ? 'registo' : 'registos'} de dor` : 'sem registos'],
  ['Peso', linhaPeso(b)],
  ['Comida', linhaComida(b)],
  ['Água', linhaAgua(b)],
  ['Suplementos', linhaSuplementos(b)],
  ['Ciclo', linhaCiclo(b)],
].filter(([, v]) => v !== null);

function linhaAgua(b) {
  if (!b.agua.dias) return 'nenhum dia registado';
  const base = `média ${litros(b.agua.media)} · ${b.agua.dias} de ${b.agua.deDias} dias registados`;
  if (!b.agua.secos.length) return base;
  return `${base} · ${b.agua.secos.length} ${b.agua.secos.length === 1 ? 'dia' : 'dias'} de treino com pouca`;
}

function linhaSuplementos(b) {
  if (!b.suplementos.dias) return 'nenhum dia registado';
  return b.suplementos.tomados
    .map((x) => `${x.nome} ${x.dias}/${b.suplementos.deDias}`)
    .join(' · ');
}

function linhaCiclo(b) {
  if (!b.fases.length) return null;
  const base = b.fases.join(' → ').toLowerCase();
  if (!b.fortes.length) return base;
  return `${base} · ${b.fortes.length} ${b.fortes.length === 1 ? 'dia' : 'dias'} com ${nomesSintomas(b.fortes)} forte`;
}

/** Aparece na semana a decorrer e nas que já passaram — nunca nas futuras. */
export function balancoHTML(semana, sessoes, fim, hoje) {
  if (semana.inicio > hoje) return '';
  const b = calcularBalanco(semana, sessoes, fim, hoje);

  return `
    <div class="balanco ${b.emCurso ? 'em-curso' : ''}">
      <div class="balanco-topo">
        <h5>${b.emCurso ? `Semana ${semana.semana}, até agora` : `Balanço da semana ${semana.semana}`}</h5>
        <button type="button" class="copiar-balanco" data-balanco="${semana.semana}">Copiar</button>
      </div>
      ${veredictos(b).map((m) => `<p class="recado ${m.tom}">${m.texto}</p>`).join('')}
      <details class="numeros">
        <summary>Ver os números</summary>
        <dl>
          ${linhas(b).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        </dl>
      </details>
    </div>
  `;
}

/** A mesma coisa em texto, para colar numa conversa e pedir uma leitura a sério. */
export function balancoTexto(semana, sessoes, fim, hoje) {
  const b = calcularBalanco(semana, sessoes, fim, hoje);
  const alvos = b.alvos;

  return [
    `Balanço da semana ${semana.semana} do meu plano de 10 km (${dataLegivel(semana.inicio)} a ${dataLegivel(fim)}).`,
    `Semana: "${semana.titulo}".`,
    b.emCurso ? `A semana ainda vai a meio — hoje é ${dataLegivel(hoje)}.` : null,
    '',
    ...linhas(b).map(([k, v]) => `- ${k}: ${v}`),
    '',
    'Sessões, uma por uma:',
    ...sessoes.map((s) => {
      const r = obter().treinos[s.id] || {};
      const det = [];
      if (r.feito) det.push('feita');
      else if (s.tipo === 'descanso') { /* nada a dizer */ }
      else det.push(s.data > hoje ? 'ainda por fazer' : 'não feita');
      if (r.distanciaKm) det.push(`${num(r.distanciaKm)} km`);
      if (r.tempoMin) det.push(formatarTempo(r.tempoMin));
      if (r.distanciaKm && r.tempoMin) det.push(ritmo((r.tempoMin * 60) / r.distanciaKm));
      if (r.esforco) det.push(`esforço ${r.esforco}/5`);
      if (r.dorCanela) det.push('DOR NA CANELA');
      if (r.notas) det.push(`nota: ${r.notas}`);
      return `- ${diaCurto(s.data)} ${Number(s.data.slice(8))} · ${s.titulo}${det.length ? ` — ${det.join(' · ')}` : ''}`;
    }),
    '',
    `Alvos: ${alvos.kcal} kcal, ${alvos.proteina} g de proteína, ritmo fácil 8:15-8:45/km, `
    + `água ${litros(alvos.aguaMl || 0)} (${litros((alvos.aguaMl || 0) + (alvos.aguaExtraTreino || 0))} nos dias de treino).`,
    b.emCurso
      ? 'Diz-me o que ler nisto e o que ajustar no resto da semana.'
      : 'Diz-me o que ler nisto e o que mudar na próxima semana.',
  ].filter((l) => l !== null).join('\n');
}
