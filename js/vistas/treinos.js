import { PLANO, TIPO_INFO, RITMOS } from '../data/plano.js';
import { balancoHTML, balancoTexto } from './balanco.js';
import { faseDe } from '../ciclo.js';
import {
  obter, registarTreino, isoData, diaCurto, dataLegivel,
  dataEfectiva, moverSessao, reporSemana, definirModoRitmo,
  editarSessao, reporConteudo, editarExtra, criarSessao, apagarSessao,
} from '../store.js';

const PROVA = '2026-11-08';
const PROVA_2 = '2026-12-13';
// Feita a primeira, a segunda deixa de ser sobre a distância e passa a ser sobre
// o tempo: bater o da primeira, nem que seja por pouco.
const MELHORIA = { min: 2, max: 3 };
const DUROS = ['ergo', 'intervalos', 'longa', 'prova'];

/** Os tipos que ela pode escolher ao editar. A prova não está aqui de propósito. */
const TIPOS_EDITAVEIS = ['pt', 'facil', 'ergo', 'intervalos', 'longa', 'descanso'];

const somaDias = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoData(d);
};

/** Quase sempre o domingo seguinte, mas a última semana acaba a 31 de Dezembro. */
const fimDaSemana = (s) => s.fim || somaDias(s.inicio, 6);

/** Os dias que uma semana do plano cobre. */
function diasDaSemana(s) {
  const dias = [];
  for (let d = s.inicio; d <= fimDaSemana(s); d = somaDias(d, 1)) dias.push(d);
  return dias;
}

/** Todas as sessões que existem hoje: as do plano que sobraram, já com as edições
 *  por cima, mais as que ela criou. `id` é a identidade da sessão, `data` o dia em
 *  que acontece e `dataPlano` o dia a que pertence — é por esse que os PT contam. */
export function todasAsSessoes() {
  const e = obter();

  const doPlano = PLANO.flatMap((s) => s.sessoes)
    .map((x) => ({
      ...x,
      ...(e.edicoes[x.data] || {}),
      id: x.data,
      dataPlano: x.data,
      data: dataEfectiva(x.data),
      extra: false,
      editada: !!e.edicoes[x.data],
    }));

  const extras = Object.entries(e.extras).map(([id, x]) => ({
    ...x, id, dataPlano: x.data, extra: true, editada: false,
  }));

  return [...doPlano, ...extras];
}

/** As sessões que caem dentro de uma semana, pela ordem dos dias. */
function sessoesDaSemana(s) {
  const fim = fimDaSemana(s);
  return todasAsSessoes()
    .filter((x) => x.data >= s.inicio && x.data <= fim)
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Os ids das sessões que uma semana contém, para a poder repor por inteiro. */
function idsDaSemana(s) {
  const naSemana = sessoesDaSemana(s);
  return {
    plano: [...new Set([...s.sessoes.map((x) => x.data), ...naSemana.filter((x) => !x.extra).map((x) => x.id)])],
    extra: naSemana.filter((x) => x.extra).map((x) => x.id),
  };
}

function eDomingo(iso) {
  return new Date(iso + 'T12:00:00').getDay() === 0;
}

const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const nomeMes = (mes) => MESES_LONGOS[Number(mes.slice(5, 7)) - 1];

/** O último dia que o plano cobre. Depois disto não há informação nenhuma. */
function fimDoPlano() {
  return fimDaSemana(PLANO[PLANO.length - 1]);
}

/** Numera as sessões de PT dentro de cada mês e resume cada mês face ao pacote.
 *
 *  Conta pelo dia que a sessão tem no plano, e não pelo dia em que foi feita: um PT
 *  marcado para 1 de Outubro que se antecipa para 30 de Setembro continua a descontar
 *  do pacote de Outubro. O mês em que o plano arranca leva ainda os treinos já feitos
 *  antes do primeiro dia do bloco, que só ela sabe quantos foram. */
function contagemPT() {
  const { ptAntes = 0, ptPorMes = 8 } = obter().alvos;
  const mesInicial = PLANO[0].inicio.slice(0, 7);
  const fim = fimDoPlano();

  const porMes = {};
  todasAsSessoes()
    .filter((x) => x.tipo === 'pt')
    .sort((a, b) => a.dataPlano.localeCompare(b.dataPlano))
    .forEach((p) => { (porMes[p.dataPlano.slice(0, 7)] ||= []).push(p.id); });

  const mapa = {};
  const meses = Object.entries(porMes).map(([mes, ids]) => {
    const base = mes === mesInicial ? ptAntes : 0;
    const total = base + ids.length;
    ids.forEach((id, i) => { mapa[id] = { n: base + i + 1, total }; });

    // Um mês só se pode comparar com o pacote se o plano o cobrir até ao fim.
    const ultimoDia = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0);
    const completo = fim >= isoData(ultimoDia);
    return { mes, total, completo, desvio: total - ptPorMes };
  });

  return { mapa, meses, pacote: ptPorMes };
}

function resumoPT({ meses, pacote }) {
  return `
    <div class="cartao resumo-pt">
      <h4>Treinos de PT</h4>
      <div class="linhas-pt">
        ${meses.map((m) => {
          const estado = !m.completo
            ? '<span class="parcial">o plano só cobre parte do mês</span>'
            : m.desvio === 0
              ? '<span class="certo">certo</span>'
              : `<span class="fora">${m.desvio > 0 ? '+' : ''}${m.desvio}</span>`;
          return `
            <div class="linha-pt">
              <span class="mes">${nomeMes(m.mes)}</span>
              <span class="n">${m.total} ${m.total === 1 ? 'treino' : 'treinos'}</span>
              ${estado}
            </div>`;
        }).join('')}
      </div>
      <p class="legenda">Pacote de ${pacote} por mês. Muda-o nas definições, com os que já tinhas feito antes de o plano começar.</p>
    </div>
  `;
}

export function renderTreinos(raiz) {
  const estado = obter();
  const hoje = isoData();
  const pt = contagemPT();

  raiz.innerHTML = `
    ${cabecalho(hoje)}
    ${selectorModo()}
    <div id="lista-semanas">${PLANO.map((s) => semanaHTML(s, estado, hoje, pt.mapa)).join('')}</div>
    ${resumoPT(pt)}
    ${tabelaRitmos()}
  `;

  raiz.querySelectorAll('[data-abrir]').forEach((el) => {
    el.addEventListener('click', () => {
      const alvo = raiz.querySelector(`#semana-${el.dataset.abrir}`);
      alvo.classList.toggle('fechada');
      el.classList.toggle('fechada');
    });
  });

  raiz.querySelectorAll('[data-modo]').forEach((el) => {
    el.addEventListener('click', () => {
      definirModoRitmo(el.dataset.modo);
      renderTreinos(raiz);
    });
  });

  raiz.querySelectorAll('[data-sessao]').forEach((el) => {
    el.addEventListener('click', () => abrirRegisto(el.dataset.sessao, () => renderTreinos(raiz)));
  });

  raiz.querySelectorAll('[data-mover]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation(); // não abrir também o registo da sessão
      abrirTroca(el.dataset.mover, Number(el.dataset.semana), raiz);
    });
  });

  raiz.querySelectorAll('[data-editar]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      abrirEdicao(el.dataset.editar, Number(el.dataset.semana), raiz);
    });
  });

  raiz.querySelectorAll('[data-nova]').forEach((el) => {
    el.addEventListener('click', () => abrirEdicao(null, Number(el.dataset.nova), raiz));
  });

  raiz.querySelectorAll('[data-balanco]').forEach((el) => {
    el.addEventListener('click', async () => {
      const semana = PLANO.find((s) => s.semana === Number(el.dataset.balanco));
      const texto = balancoTexto(semana, sessoesDaSemana(semana), fimDaSemana(semana), isoData());
      try {
        await navigator.clipboard.writeText(texto);
        el.textContent = 'Copiado ✓';
        setTimeout(() => { el.textContent = 'Copiar'; }, 2000);
      } catch {
        // Sem permissão para a área de transferência — mostra o texto para copiar à mão.
        mostrarTexto(texto);
      }
    });
  });

  raiz.querySelectorAll('[data-repor]').forEach((el) => {
    el.addEventListener('click', async () => {
      const semana = PLANO.find((s) => s.semana === Number(el.dataset.repor));
      const ok = await confirmar({
        titulo: `Repor a semana ${semana.semana}?`,
        texto: 'Os dias, as alterações que fizeste e as sessões que acrescentaste voltam ao plano. '
          + 'Os registos das sessões do plano mantêm-se.',
        rotulo: 'Repor',
      });
      if (!ok) return;
      const ids = idsDaSemana(semana);
      reporSemana(ids.plano, ids.extra);
      renderTreinos(raiz);
    });
  });

  // Abre a semana actual e fecha as outras
  const semanaActual = PLANO.find((s) => fimDaSemana(s) >= hoje) || PLANO[PLANO.length - 1];
  PLANO.forEach((s) => {
    if (s.semana !== semanaActual.semana) {
      raiz.querySelector(`#semana-${s.semana}`)?.classList.add('fechada');
      raiz.querySelector(`[data-abrir="${s.semana}"]`)?.classList.add('fechada');
    }
  });
}

function cabecalho(hoje) {
  const treinos = obter().treinos;
  const prova1 = treinos[PROVA] || {};
  const feita1 = !!prova1.feito;

  // Feita a primeira prova, a contagem vira-se para a segunda.
  const alvo = feita1 ? PROVA_2 : PROVA;
  const dias = Math.round((new Date(alvo) - new Date(hoje)) / 86400000);

  // Conta as sessões que existem agora, e não as do plano: ela pode ter apagado
  // umas e acrescentado outras.
  const sessoes = todasAsSessoes().filter((s) => s.tipo !== 'descanso');
  const feitos = sessoes.filter((s) => treinos[s.id]?.feito).length;
  const total = sessoes.length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;

  return `
    <div class="destaque">
      <div class="contagem">
        <strong>${dias > 0 ? dias : 0}</strong>
        <span>${dias === 1 ? 'dia' : 'dias'} até ${feita1 ? 'à segunda prova' : 'aos 10 km'}</span>
      </div>
      <div class="barra-progresso"><div style="width:${pct}%"></div></div>
      <p class="legenda">${feitos} de ${total} sessões feitas · ${pct}%</p>
      ${feita1 ? objectivoProva2(prova1) : ''}
    </div>
  `;
}

/** O alvo de 13 de Dezembro sai do tempo que ela fez a 8 de Novembro, não de um
 *  número decidido de antemão. */
function objectivoProva2(prova1) {
  if (!prova1.tempoMin) {
    return `
      <div class="objectivo-2 falta">
        <strong>13 de Dezembro</strong>
        <p>Regista o tempo de 8 de Novembro para o objectivo desta prova ficar definido.</p>
      </div>`;
  }

  const t = prova1.tempoMin;
  const rapido = t - MELHORIA.max;
  const lento = t - MELHORIA.min;
  const km = prova1.distanciaKm || 10;

  return `
    <div class="objectivo-2">
      <strong>Objectivo a 13 de Dezembro</strong>
      <p class="alvo">${rapido} a ${lento} min</p>
      <p>
        Menos ${MELHORIA.min} a ${MELHORIA.max} min do que os ${t} de 8 de Novembro.
        Dá ${ritmoPorKm(lento, km)} a ${ritmoPorKm(rapido, km)}, contra os ${ritmoPorKm(t, km)} que fizeste.
      </p>
    </div>`;
}

// ---- Passadeira ou rua ----
//
// A prescrição de cada sessão é escrita em velocidades de passadeira. Na rua não
// se corre a 7,0 km/h, corre-se a 8:34/km — por isso o mesmo texto converte-se,
// em vez de haver duas versões para manter.

const modoRitmo = () => obter().alvos.modoRitmo || 'passadeira';

/** 7,0 (km/h) → "8:34/km" */
function paceDe(velocidade) {
  const kmh = Number(String(velocidade).replace(',', '.'));
  if (!kmh) return velocidade;
  const seg = 3600 / kmh;
  return `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`;
}

const kmhDe = (minutos, km) => (60 / (minutos / km)).toFixed(1).replace('.', ',');

/** O ritmo de prova das semanas 9 a 12 é o que ela fizer a 8 de Novembro. */
function valorRitmoDeProva(modo) {
  const p = obter().treinos[PROVA] || {};
  if (!p.tempoMin) return 'ritmo de prova';
  const km = p.distanciaKm || 10;
  // Sem unidade em modo passadeira: vai no meio de uma lista de velocidades.
  return modo === 'rua' ? ritmoPorKm(p.tempoMin, km) : kmhDe(p.tempoMin, km);
}

/** O alvo da segunda prova: o tempo da primeira menos os 2 a 3 minutos a ganhar. */
function valorRitmoAlvo(modo) {
  const p = obter().treinos[PROVA] || {};
  if (!p.tempoMin) return 'por definir';
  const km = p.distanciaKm || 10;
  const lento = p.tempoMin - MELHORIA.min;
  const rapido = p.tempoMin - MELHORIA.max;
  return modo === 'rua'
    ? `${ritmoPorKm(lento, km)} a ${ritmoPorKm(rapido, km)}`
    : `${kmhDe(lento, km)}-${kmhDe(rapido, km)} km/h`;
}

function textoPrescricao(texto, modo) {
  let t = texto;
  if (modo === 'rua') {
    t = t.replace(/(\d{1,2},\d)\s*km\/h/g, (_, v) => paceDe(v));
    t = t.replace(/(\d{1,2},\d)/g, (_, v) => paceDe(v));
    t = t.replace(/\s*·?\s*inclinação \d+%/g, ''); // não existe na rua
  }
  return t
    .replace(/\{prova\}/g, valorRitmoDeProva(modo))
    .replace(/\{alvo\}/g, valorRitmoAlvo(modo));
}

function linhaPrescricao(sessao) {
  if (!sessao.passadeira) return '';
  const modo = modoRitmo();
  return `<p class="passadeira">${modo === 'rua' ? '🛣️' : '🏃'} ${escapar(textoPrescricao(sessao.passadeira, modo))}</p>`;
}

function selectorModo() {
  const modo = modoRitmo();
  return `
    <div class="modo-ritmo" role="group" aria-label="Mostrar ritmos para">
      <button type="button" data-modo="passadeira" class="${modo === 'passadeira' ? 'activo' : ''}">🏃 Passadeira</button>
      <button type="button" data-modo="rua" class="${modo === 'rua' ? 'activo' : ''}">🛣️ Rua</button>
    </div>`;
}

function ritmoPorKm(minutos, km) {
  const seg = (minutos * 60) / km;
  return `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`;
}

function semanaHTML(s, estado, hoje, pt) {
  const lista = sessoesDaSemana(s);
  const activa = hoje >= s.inicio && hoje <= fimDaSemana(s);
  const ajustada = lista.some((x) => x.extra || x.editada || x.data !== x.id);
  const aviso = avisoDaSemana(lista);

  return `
    <section class="semana">
      <button class="cabecalho-semana ${activa ? 'activa' : ''}" data-abrir="${s.semana}">
        <span class="num">S${s.semana}</span>
        <span class="tit">${s.titulo}</span>
        ${ajustada ? '<span class="sinal-ajuste" title="Semana reorganizada">⇄</span>' : ''}
        <span class="seta">▾</span>
      </button>
      <div class="corpo-semana" id="semana-${s.semana}">
        ${s.nota ? `<p class="nota">${s.nota}</p>` : ''}
        ${ajustada ? `
          <p class="ajustada">
            Semana alterada
            <button type="button" data-repor="${s.semana}">repor o plano original</button>
          </p>` : ''}
        ${aviso ? `<p class="nota aviso-semana">⚠ ${aviso}</p>` : ''}
        ${balancoHTML(s, lista, fimDaSemana(s), hoje)}
        ${lista.map((x) => sessaoHTML(x, estado, hoje, s.semana, pt)).join('')}
        ${lista.length ? '' : '<p class="legenda vazia-semana">Semana sem sessões.</p>'}
        <button type="button" class="nova-sessao" data-nova="${s.semana}">+ Acrescentar sessão</button>
      </div>
    </section>
  `;
}

/** Dois treinos duros em dias seguidos — o risco real quando se reorganiza a semana. */
function avisoDaSemana(lista) {
  for (let i = 1; i < lista.length; i++) {
    const anterior = lista[i - 1];
    const actual = lista[i];
    if (!DUROS.includes(anterior.tipo) || !DUROS.includes(actual.tipo)) continue;
    const dias = (new Date(actual.data) - new Date(anterior.data)) / 86400000;
    const par = `${TIPO_INFO[anterior.tipo].label} e ${TIPO_INFO[actual.tipo].label}`;
    if (dias === 0) {
      return `${par} ficaram no mesmo dia (${diaCurto(actual.data)}). São dois treinos duros de uma vez.`;
    }
    if (dias === 1) {
      return `${par} ficaram em dias seguidos (${diaCurto(anterior.data)} e ${diaCurto(actual.data)}). `
        + 'Se vieres cansada ou a canela reclamar, o segundo passa a fácil ou a descanso.';
    }
  }
  return null;
}

function sessaoHTML(sessao, estado, hoje, semana, pt) {
  const contagem = pt[sessao.id];
  const reg = estado.treinos[sessao.id] || {};
  const info = TIPO_INFO[sessao.tipo];
  const registavel = sessao.tipo !== 'descanso';
  const movivel = sessao.tipo !== 'prova';
  const classes = [
    'sessao', `cor-${info.cor}`,
    sessao.data === hoje ? 'hoje' : '',
    reg.feito ? 'feita' : '',
    reg.dorCanela ? 'alerta' : '',
    !sessao.extra && sessao.data !== sessao.id ? 'movida' : '',
  ].filter(Boolean).join(' ');

  return `
    <article class="${classes}" ${registavel ? `data-sessao="${sessao.id}"` : ''}>
      <div class="dia">
        <span class="ds">${diaCurto(sessao.data)}</span>
        <span class="dn">${Number(sessao.data.slice(8))}</span>
      </div>
      <div class="conteudo">
        <div class="linha-topo">
          <span class="etiqueta">${info.label}</span>
          ${reg.feito ? '<span class="visto">✓</span>' : ''}
          ${reg.dorCanela ? '<span class="aviso">⚠ canela</span>' : ''}
          ${!sessao.extra && sessao.data !== sessao.id ? `<span class="etiqueta-movida">movida de ${diaCurto(sessao.id)}</span>` : ''}
          ${sessao.extra ? '<span class="etiqueta-movida">acrescentada</span>' : ''}
          ${sessao.editada ? '<span class="etiqueta-movida">alterada</span>' : ''}
          ${etiquetaFase(sessao)}
          ${movivel ? `
            <span class="acoes-sessao">
              <button type="button" class="mover" data-editar="${sessao.id}" data-semana="${semana}"
                aria-label="Editar sessão" title="Editar sessão">✎</button>
              <button type="button" class="mover" data-mover="${sessao.id}" data-semana="${semana}"
                aria-label="Trocar de dia" title="Trocar de dia">⇄</button>
            </span>` : ''}
        </div>
        <h4>${escapar(sessao.titulo)}${contagem ? ` <span class="contagem-pt">treino ${contagem.n} de ${contagem.total}</span>` : ''}</h4>
        ${sessao.detalhe ? `<p class="detalhe">${escapar(sessao.detalhe)}</p>` : ''}
        ${linhaPrescricao(sessao)}
        ${reg.feito ? resumoRegisto(reg) : ''}
      </div>
    </article>
  `;
}

/** A fase do ciclo, só como contexto. Não muda nada no plano de propósito. */
function etiquetaFase(sessao) {
  if (sessao.tipo === 'descanso') return '';
  const f = faseDe(sessao.data);
  if (!f) return '';
  return `<span class="etiqueta-fase cor-${f.cor}" title="Dia ${f.dia} do ciclo${f.estimada ? ' · fase estimada' : ''}">${f.label}${f.estimada ? '*' : ''}</span>`;
}

function resumoRegisto(reg) {
  const partes = [];
  if (reg.distanciaKm) partes.push(`${reg.distanciaKm} km`);
  if (reg.tempoMin) partes.push(`${reg.tempoMin} min`);
  if (reg.distanciaKm && reg.tempoMin) {
    const seg = (reg.tempoMin * 60) / reg.distanciaKm;
    partes.push(`${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`);
  }
  if (reg.esforco) partes.push(`esforço ${reg.esforco}/5`);
  if (!partes.length && !reg.notas) return '';
  return `<div class="registo">${partes.join(' · ')}${reg.notas ? `<br><em>${escapar(reg.notas)}</em>` : ''}</div>`;
}

function tabelaRitmos() {
  return `
    <details class="ritmos">
      <summary>Tabela de ritmos e velocidades de passadeira</summary>
      <table>
        <thead><tr><th>Ritmo</th><th>km/h</th><th>Onde se usa</th></tr></thead>
        <tbody>
          ${RITMOS.map((r) => `
            <tr class="${r.destaque ? 'destaque-linha' : ''}">
              <td>${r.ritmo}</td><td><strong>${r.kmh}</strong></td><td>${r.uso}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="nota">Inclinação sempre a 1%, nunca 0%. E não te agarres aos corrimãos.</p>
    </details>
  `;
}

/** Plano B da cópia: o texto num campo já selecionado, para copiar à mão. */
function mostrarTexto(texto) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  d.innerHTML = `
    <form method="dialog">
      <h3>Copiar o balanço</h3>
      <p class="sub">O telemóvel não deixou copiar automaticamente. Está aqui, selecionado.</p>
      <textarea rows="10" class="texto-balanco"></textarea>
      <div class="botoes um"><button value="fechar" class="primario" formnovalidate>Fechar</button></div>
    </form>`;
  document.body.appendChild(d);
  const campo = d.querySelector('textarea');
  campo.value = texto;
  d.showModal();
  campo.select();
  d.addEventListener('close', () => d.remove());
}

/** Confirmação feita com o diálogo da app. O `confirm()` do browser não é de
 *  confiança dentro de uma PWA instalada — há contextos em que nunca aparece. */
function confirmar({ titulo, texto, rotulo = 'Confirmar' }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = `
      <form method="dialog">
        <h3>${titulo}</h3>
        <p class="sub">${texto}</p>
        <div class="botoes">
          <button value="nao" class="secundario" formnovalidate>Cancelar</button>
          <button value="sim" class="primario">${rotulo}</button>
        </div>
      </form>`;
    document.body.appendChild(d);
    d.showModal();
    d.addEventListener('close', () => {
      const sim = d.returnValue === 'sim';
      d.remove();
      resolve(sim);
    });
  });
}

// ---- Trocar uma sessão de dia ----

/** As sessões do plano mudam de dia por ajuste; as acrescentadas guardam o dia nelas. */
function porSessaoNoDia(sessao, data) {
  if (sessao.extra) editarExtra(sessao.id, { data });
  else moverSessao(sessao.id, data);
}

function abrirTroca(id, numSemana, raiz) {
  const semana = PLANO.find((s) => s.semana === numSemana);
  const lista = sessoesDaSemana(semana);
  const sessao = lista.find((x) => x.id === id);
  const outras = lista.filter((x) => x.id !== id && x.tipo !== 'prova');

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Trocar de dia</h3>
      <p class="sub">${escapar(sessao.titulo)} — está em ${dataLegivel(sessao.data)}</p>
      <h4 class="sec">Trocar com</h4>
      <div class="resultados">
        ${outras.map((alvo) => {
          const aviso = avisoDaTroca(sessao, alvo);
          return `
            <button type="button" class="opcao" data-troca="${alvo.id}">
              <span>
                <strong>${diaCurto(alvo.data)} ${Number(alvo.data.slice(8))}</strong>
                — ${escapar(alvo.titulo)}
                ${aviso ? `<em class="aviso-troca">${aviso}</em>` : ''}
              </span>
              <span class="seta">⇄</span>
            </button>`;
        }).join('')}
      </div>
      <div class="botoes um">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  dialogo.querySelectorAll('[data-troca]').forEach((el) => {
    el.addEventListener('click', () => {
      const alvo = outras.find((x) => x.id === el.dataset.troca);
      const dia = sessao.data;
      porSessaoNoDia(sessao, alvo.data);
      porSessaoNoDia(alvo, dia);
      dialogo.close();
      renderTreinos(raiz);
    });
  });

  dialogo.addEventListener('close', () => dialogo.remove());
}

/** A regra fixa do plano: a corrida longa é ao domingo. Avisa, mas não impede. */
function avisoDaTroca(sessao, alvo) {
  if (sessao.tipo === 'longa' && !eDomingo(alvo.data)) return 'tira a longa de domingo';
  if (alvo.tipo === 'longa' && !eDomingo(sessao.data)) return 'tira a longa de domingo';
  return null;
}

// ---- Editar, criar e apagar uma sessão ----

function abrirEdicao(id, numSemana, raiz) {
  const semana = PLANO.find((s) => s.semana === numSemana);
  const sessao = id ? todasAsSessoes().find((x) => x.id === id) : null;
  const nova = !sessao;
  const original = id ? semana.sessoes.find((x) => x.data === id) : null;

  const v = sessao || { tipo: 'facil', titulo: '', detalhe: '', passadeira: '', data: semana.inicio };

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${nova ? 'Nova sessão' : 'Editar sessão'}</h3>
      <p class="sub">Semana ${semana.semana} — ${semana.titulo}</p>

      <label>Dia
        <select name="data">
          ${diasDaSemana(semana).map((d) => `
            <option value="${d}" ${d === v.data ? 'selected' : ''}>${dataLegivel(d)}</option>`).join('')}
        </select>
      </label>

      <label>Tipo
        <select name="tipo">
          ${TIPOS_EDITAVEIS.map((t) => `
            <option value="${t}" ${t === v.tipo ? 'selected' : ''}>${TIPO_INFO[t].label}</option>`).join('')}
        </select>
      </label>

      <label>Título
        <input type="text" name="titulo" value="${escapar(v.titulo)}" placeholder="Corrida fácil — 30 min" required>
      </label>

      <label>Indicações
        <textarea name="detalhe" rows="3" placeholder="opcional">${escapar(v.detalhe || '')}</textarea>
      </label>

      <label>Passadeira / ritmos
        <textarea name="passadeira" rows="2" placeholder="opcional">${escapar(v.passadeira || '')}</textarea>
      </label>

      <label>Distância prevista (km)
        <input type="number" name="distanciaKm" step="0.1" inputmode="decimal" value="${v.distanciaKm ?? ''}">
      </label>

      ${!nova ? `
        <button type="button" class="secundario largo apagar-sessao" id="e-apagar">
          ${sessao.extra ? 'Apagar esta sessão' : 'Apagar — passa a dia de descanso'}
        </button>` : ''}
      ${original && sessao.editada ? `
        <button type="button" class="secundario largo" id="e-repor">
          Repor o conteúdo do plano
        </button>` : ''}

      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  dialogo.querySelector('#e-apagar')?.addEventListener('click', () => {
    apagarSessao(sessao.id);
    dialogo.close();
    renderTreinos(raiz);
  });

  dialogo.querySelector('#e-repor')?.addEventListener('click', () => {
    reporConteudo(sessao.id);
    dialogo.close();
    renderTreinos(raiz);
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const f = new FormData(dialogo.querySelector('form'));
      const campos = {
        tipo: f.get('tipo'),
        titulo: (f.get('titulo') || '').trim() || TIPO_INFO[f.get('tipo')].label,
        detalhe: (f.get('detalhe') || '').trim(),
        passadeira: (f.get('passadeira') || '').trim(),
        distanciaKm: f.get('distanciaKm') ? Number(f.get('distanciaKm')) : null,
      };
      const data = f.get('data');

      if (nova) {
        criarSessao({ ...campos, data });
      } else if (sessao.extra) {
        editarExtra(sessao.id, { ...campos, data });
      } else {
        editarSessao(sessao.id, campos);
        moverSessao(sessao.id, data);
      }
      renderTreinos(raiz);
    }
    dialogo.remove();
  });
}

/** O título e as indicações são texto dela e vão para dentro de HTML. */
function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

// ---- Registo de uma sessão ----

/** Registo de uma sessão. `aoFechar` corre depois de guardar, para quem chamou
 *  se redesenhar — é usado pelo separador Treinos e pelo calendário. */
export function abrirRegisto(id, aoFechar) {
  const sessao = todasAsSessoes().find((x) => x.id === id);
  if (!sessao) return;
  const reg = obter().treinos[id] || {};
  const corrida = ['facil', 'intervalos', 'longa', 'prova'].includes(sessao.tipo);
  const data = sessao.data;

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${escapar(sessao.titulo)}</h3>
      <p class="sub">${dataLegivel(data)}${!sessao.extra && data !== id ? ` · movida de ${dataLegivel(id)}` : ''}</p>

      <label class="check">
        <input type="checkbox" name="feito" ${reg.feito ? 'checked' : ''}>
        <span>Sessão feita</span>
      </label>

      ${corrida ? `
        <div class="par">
          <label>Distância (km)
            <input type="number" name="distanciaKm" step="0.1" inputmode="decimal"
              value="${reg.distanciaKm ?? sessao.distanciaKm ?? ''}">
          </label>
          <label>Tempo (min)
            <input type="number" name="tempoMin" step="1" inputmode="numeric" value="${reg.tempoMin ?? ''}">
          </label>
        </div>
      ` : ''}

      <label>Como correu
        <select name="esforco">
          <option value="">—</option>
          ${[1, 2, 3, 4, 5].map((n) => `
            <option value="${n}" ${reg.esforco == n ? 'selected' : ''}>
              ${n} — ${['muito fácil', 'fácil', 'certo', 'duro', 'muito duro'][n - 1]}
            </option>`).join('')}
        </select>
      </label>

      ${corrida ? `
        <label class="check alerta-check">
          <input type="checkbox" name="dorCanela" ${reg.dorCanela ? 'checked' : ''}>
          <span>Senti dor na canela</span>
        </label>
      ` : ''}

      <label>Notas
        <textarea name="notas" rows="2" placeholder="opcional">${escapar(reg.notas ?? '')}</textarea>
      </label>

      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const f = new FormData(dialogo.querySelector('form'));
      registarTreino(id, {
        feito: f.get('feito') === 'on',
        distanciaKm: f.get('distanciaKm') ? Number(f.get('distanciaKm')) : null,
        tempoMin: f.get('tempoMin') ? Number(f.get('tempoMin')) : null,
        esforco: f.get('esforco') ? Number(f.get('esforco')) : null,
        dorCanela: f.get('dorCanela') === 'on',
        notas: (f.get('notas') || '').trim(),
      });
      aoFechar?.();
      if (f.get('dorCanela') === 'on') {
        setTimeout(() => alert(
          'Dor na canela registada.\n\nRegra do plano: se a canela doer no aquecimento, ou ainda doer 24 h depois de correr, não corres no dia seguinte. Cortas a semana e retomas onde estavas.'
        ), 150);
      }
    }
    dialogo.remove();
  });
}
