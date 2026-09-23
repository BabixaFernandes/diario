import { obter, registarPeso, isoData, somaDias, dataLegivel, diaCurto } from '../store.js';

export function renderPeso(raiz) {
  const estado = obter();
  const hoje = isoData();
  const pesoHoje = estado.pesos[hoje];
  const semanas = agruparPorSemana(estado.pesos);
  const actual = semanas[semanas.length - 1];
  const anterior = semanas[semanas.length - 2];

  raiz.innerHTML = `
    <div class="destaque">
      <label class="input-grande">
        <span>Peso de hoje (kg)</span>
        <input type="number" id="peso-hoje" step="0.1" inputmode="decimal"
          placeholder="—" value="${pesoHoje ?? ''}">
      </label>
      <p class="legenda">Pesa-te em jejum, sempre à mesma hora.</p>
      <button type="button" id="outro-dia" class="secundario largo">Registar noutro dia</button>
    </div>

    ${actual ? cartaoMedia(actual, anterior, estado.alvos) : `
      <div class="cartao vazio">
        <p>Ainda não há pesagens registadas.</p>
        <p class="legenda">O número que interessa é a <strong>média semanal</strong>, não o peso do dia. O peso diário oscila 1 a 2 kg só por água.</p>
      </div>`}

    ${semanas.length >= 3 ? cartaoAjuste(semanas) : ''}

    ${grafico(estado.pesos, semanas, estado.alvos)}

    <div class="cartao">
      <h4>Últimos registos</h4>
      <p class="legenda">Toca num dia para corrigir ou apagar.</p>
      <div class="lista-pesos">
        ${listaRecente(estado.pesos)}
      </div>
    </div>

    <details class="ritmos">
      <summary>A regra de ajuste das calorias</summary>
      <table>
        <thead><tr><th>Ao fim de 3 semanas</th><th>Acção</th></tr></thead>
        <tbody>
          <tr><td>Média desceu 1 a 1,5 kg</td><td>Está certo. Não mexas.</td></tr>
          <tr><td>Média parada ou a subir</td><td>Cortar 150 kcal/dia</td></tr>
          <tr><td>Média desceu mais de 2,5 kg</td><td>Acrescentar 150 kcal/dia</td></tr>
        </tbody>
      </table>
    </details>
  `;

  const campo = raiz.querySelector('#peso-hoje');
  campo.addEventListener('change', () => {
    registarPeso(hoje, campo.value === '' ? null : campo.value);
    renderPeso(raiz);
  });

  raiz.querySelector('#outro-dia').onclick = () => abrirDia(raiz, null);
  raiz.querySelectorAll('[data-dia]').forEach((b) => {
    b.onclick = () => abrirDia(raiz, b.dataset.dia);
  });
}

/** Pesagem de outro dia — a de ontem que ficou esquecida, ou a correcção de uma
 *  já registada. `data` a null abre em ontem, que é o caso que traz alguém aqui. */
function abrirDia(raiz, data) {
  const estado = obter();
  const hoje = isoData();
  const aEditar = data !== null;
  const inicial = aEditar ? data : somaDias(hoje, -1);

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${aEditar ? dataLegivel(data) : 'Pesagem de outro dia'}</h3>
      ${aEditar ? '' : '<p class="sub">Para a pesagem que te esqueceste de registar no dia.</p>'}
      <div class="par">
        <label>Dia
          <input type="date" name="data" id="p-data" max="${hoje}" value="${inicial}"
            ${aEditar ? 'disabled' : ''}>
        </label>
        <label>Peso (kg)
          <input type="number" name="kg" id="p-kg" step="0.1" min="20" max="300" inputmode="decimal"
            value="${aEditar ? estado.pesos[data] : ''}" placeholder="—">
        </label>
      </div>
      ${aEditar ? '<button type="button" class="secundario largo apagar-sessao" id="p-apagar">Apagar esta pesagem</button>' : ''}
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.querySelector('#p-kg').focus();

  dialogo.querySelector('#p-apagar')?.addEventListener('click', () => {
    registarPeso(data, null);
    dialogo.close();
    renderPeso(raiz);
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      // Com o campo do dia desactivado na edição, o FormData não o traz.
      const dia = aEditar ? data : dialogo.querySelector('#p-data').value;
      const valor = dialogo.querySelector('#p-kg').value;
      if (dia && dia <= hoje) registarPeso(dia, valor === '' ? null : valor);
      renderPeso(raiz);
    }
    dialogo.remove();
  });
}

function cartaoMedia(actual, anterior, alvos) {
  const delta = anterior ? actual.media - anterior.media : null;
  const temInicial = typeof alvos.pesoInicial === 'number';
  const temAlvo = typeof alvos.pesoAlvo === 'number';
  const perdido = temInicial ? alvos.pesoInicial - actual.media : null;
  const faltam = temAlvo ? actual.media - alvos.pesoAlvo : null;

  const estatisticas = (temInicial || temAlvo) ? `
    <div class="par-estatisticas">
      ${temInicial ? `<div><strong>${perdido >= 0 ? '−' : '+'}${kg(Math.abs(perdido))} kg</strong><span>vs. início do plano</span></div>` : ''}
      ${temAlvo ? `<div><strong>${faltam > 0 ? '' : '−'}${kg(Math.abs(faltam))} kg</strong><span>até aos ${alvos.pesoAlvo}</span></div>` : ''}
    </div>` : '';

  return `
    <div class="cartao media">
      <div class="numero-grande">${kg(actual.media)} <small>kg</small></div>
      <p class="legenda">Média desta semana · ${actual.n} ${actual.n === 1 ? 'pesagem' : 'pesagens'}</p>
      ${delta !== null ? `
        <div class="delta ${delta < 0 ? 'bom' : delta > 0 ? 'mau' : ''}">
          ${delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} ${kg(Math.abs(delta), 2)} kg vs. semana anterior
        </div>` : '<p class="legenda">Precisas de outra semana para haver comparação.</p>'}
      ${estatisticas}
    </div>
  `;
}

function cartaoAjuste(semanas) {
  const ultimas = semanas.slice(-3);
  if (ultimas.length < 3) return '';
  const variacao = ultimas[2].media - ultimas[0].media;

  let veredicto, classe;
  if (variacao <= -2.5) {
    veredicto = 'Estás a perder depressa de mais. Acrescenta 150 kcal/dia — perder rápido em bloco de corrida custa músculo e recuperação.';
    classe = 'aviso';
  } else if (variacao >= -0.5) {
    veredicto = 'A média está praticamente parada. Corta 150 kcal/dia e volta a avaliar daqui a 3 semanas.';
    classe = 'aviso';
  } else {
    veredicto = 'Está no ritmo certo. Não mexas em nada.';
    classe = 'bom';
  }

  return `
    <div class="cartao ajuste ${classe}">
      <h4>Últimas 3 semanas: ${variacao > 0 ? '+' : '−'}${kg(Math.abs(variacao))} kg</h4>
      <p>${veredicto}</p>
    </div>
  `;
}

/** Vírgula decimal, como no resto da app. O ponto só fica nas coordenadas do SVG. */
const kg = (v, casas = 1) => v.toFixed(casas).replace('.', ',');
const dataCurta = (iso) => `${Number(iso.slice(8))}/${Number(iso.slice(5, 7))}`;
const ms = (iso) => new Date(`${iso}T12:00:00`).getTime();

/** O peso do dia e a média da semana no mesmo eixo.
 *
 *  Os dias ficam em pontos soltos e a média em linha cheia, de propósito: é a
 *  forma de se ver com os olhos que os dentes de 1 a 2 kg de um dia para o outro
 *  são água, e que a linha por baixo deles é a única coisa que está a acontecer.
 *
 *  O eixo do x é o tempo a sério, não a ordem dos registos — uma semana sem te
 *  pesares tem de aparecer como um vazio, e não encolhida até parecer um dia. */
function grafico(pesos, semanas, alvos) {
  const datas = Object.keys(pesos).sort();
  if (datas.length < 3) return '';

  const w = 320, h = 150, padX = 12, padTopo = 10, padBaixo = 24;
  const t0 = ms(datas[0]);
  const intervalo = Math.max(1, ms(datas[datas.length - 1]) - t0);

  const vals = datas.map((d) => pesos[d]);
  const medias = semanas.map((s) => s.media);
  let min = Math.min(...vals, ...medias);
  let max = Math.max(...vals, ...medias);
  // Uma linha de alvo muito abaixo esmagaria a evolução toda contra o topo; só
  // entra quando cabe no que já está desenhado.
  const alvo = typeof alvos.pesoAlvo === 'number' ? alvos.pesoAlvo : null;
  const alvoCabe = alvo !== null && alvo > min - 2 && alvo < max + 2;
  if (alvoCabe) { min = Math.min(min, alvo); max = Math.max(max, alvo); }

  const folga = Math.max(0.4, (max - min) * 0.12);
  min -= folga; max += folga;

  const X = (iso) => padX + ((ms(iso) - t0) / intervalo) * (w - padX * 2);
  const Y = (v) => padTopo + (1 - (v - min) / (max - min)) * (h - padTopo - padBaixo);

  const dias = datas.map((d) => `<circle cx="${X(d).toFixed(1)}" cy="${Y(pesos[d]).toFixed(1)}" r="2" class="pt-dia"/>`).join('');

  // A média da semana fica no meio dos dias que essa semana tem — pô-la na
  // segunda-feira punha uma média de sábado num dia em que não houve pesagem.
  const pontosMedia = semanas
    .filter((s) => s.datas.length)
    .map((s) => `${X(s.datas[Math.floor(s.datas.length / 2)]).toFixed(1)},${Y(s.media).toFixed(1)}`);

  const primeiro = semanas[0], ultimo = semanas[semanas.length - 1];
  const variacao = ultimo.media - primeiro.media;

  return `
    <div class="cartao">
      <h4>Evolução</h4>
      <svg viewBox="0 0 ${w} ${h}" class="gr-peso" role="img"
           aria-label="Peso diário e média semanal, de ${dataCurta(datas[0])} a ${dataCurta(datas[datas.length - 1])}">
        ${alvoCabe ? `
          <line x1="${padX}" y1="${Y(alvo).toFixed(1)}" x2="${w - padX}" y2="${Y(alvo).toFixed(1)}" class="lin-alvo"/>
          <text x="${w - padX}" y="${(Y(alvo) - 3).toFixed(1)}" class="rot alvo" text-anchor="end">alvo ${kg(alvo)}</text>` : ''}
        ${dias}
        ${pontosMedia.length > 1
          ? `<polyline points="${pontosMedia.join(' ')}" class="lin-media"/>`
          : ''}
        ${pontosMedia.map((p) => { const [x, y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="3.5" class="pt-media"/>`; }).join('')}
        <text x="0" y="${padTopo}" class="rot">${kg(max)}</text>
        <text x="0" y="${h - padBaixo}" class="rot">${kg(min)}</text>
        <text x="${padX}" y="${h - 6}" class="rot">${dataCurta(datas[0])}</text>
        <text x="${w - padX}" y="${h - 6}" class="rot" text-anchor="end">${dataCurta(datas[datas.length - 1])}</text>
      </svg>
      <p class="legenda">
        <span class="chave dia">●</span> peso do dia ·
        <span class="chave media">●</span> média da semana${alvoCabe ? ' · <span class="chave alvo">–</span> alvo' : ''}
      </p>
      <p class="legenda">
        ${semanas.length > 1
          ? `${kg(primeiro.media)} kg → ${kg(ultimo.media)} kg em ${semanas.length} semanas`
            + ` (${variacao > 0 ? '+' : '−'}${kg(Math.abs(variacao))} kg).`
            + ' Os dentes de um dia para o outro são água; a linha é o que interessa.'
          : `${datas.length} pesagens nesta semana. A partir da segunda semana há linha de média para comparar.`}
      </p>
    </div>
  `;
}

function listaRecente(pesos) {
  const datas = Object.keys(pesos).sort().reverse().slice(0, 14);
  if (!datas.length) return '<p class="legenda">Nada registado ainda.</p>';
  return datas.map((d, i) => {
    const anterior = datas[i + 1];
    const delta = anterior ? pesos[d] - pesos[anterior] : null;
    return `
      <button type="button" class="linha-peso editavel" data-dia="${d}">
        <span>${diaCurto(d)} ${dataCurta(d)}</span>
        <strong>
          ${kg(pesos[d])} kg
          ${delta !== null && Math.abs(delta) >= 0.05
            ? `<span class="legenda">${delta < 0 ? '−' : '+'}${kg(Math.abs(delta))}</span>`
            : ''}
        </strong>
      </button>`;
  }).join('');
}

function agruparPorSemana(pesos) {
  const mapa = new Map();
  Object.keys(pesos).sort().forEach((iso) => {
    const d = new Date(iso + 'T12:00:00');
    const segunda = new Date(d);
    segunda.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const chave = isoData(segunda);
    if (!mapa.has(chave)) mapa.set(chave, { vals: [], datas: [] });
    mapa.get(chave).vals.push(pesos[iso]);
    mapa.get(chave).datas.push(iso);
  });
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([inicio, { vals, datas }]) => ({
      inicio, datas, n: vals.length, media: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));
}
