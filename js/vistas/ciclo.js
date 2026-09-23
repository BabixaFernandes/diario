import {
  obter, alternarInicioCiclo, marcarFimCiclo, registarSintomas,
  isoData, diaCurto, dataLegivel,
} from '../store.js';
import {
  faseDe, duracaoMedia, duracaoPeriodo, periodoAberto, proximoPeriodo,
  ciclosCompletos, faltamCiclos, padraoPorFase, diasDoCiclo, fortesDoCiclo,
} from '../ciclo.js';

const PROVAS = [
  { data: '2026-11-08', nome: 'PROVA — 10 km' },
  { data: '2026-12-13', nome: 'PROVA 2 — 10 km' },
];

const SINTOMAS = [
  { chave: 'dores', label: 'Dores' },
  { chave: 'cansaco', label: 'Cansaço' },
  { chave: 'fluxo', label: 'Fluxo' },
];
const NIVEIS = ['Nada', 'Leve', 'Forte'];

const ritmo = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`;
const nivelMax = (s) => (s ? Math.max(0, ...Object.values(s)) : 0);

export function renderCiclo(raiz) {
  const estado = obter();
  const hoje = isoData();
  const fase = faseDe(hoje);
  const dur = duracaoMedia();
  const per = duracaoPeriodo();
  const comecouHoje = estado.ciclos.some((c) => c.inicio === hoje);
  const aberto = periodoAberto(hoje);
  const proximo = proximoPeriodo(hoje);

  raiz.innerHTML = `
    <div class="destaque">
      <div class="contagem">
        <strong>${fase ? fase.dia : '—'}</strong>
        <span>${fase
          ? `dia do ciclo · ${fase.label.toLowerCase()}${fase.estimada ? ' (estimada)' : ''}`
          : 'sem ciclo registado'}</span>
      </div>

      ${proximo ? `
        <p class="legenda previsao">
          Próximo período previsto para <strong>${dataLegivel(proximo.data)}</strong> —
          ${proximo.dias === 0 ? 'hoje' : `faltam ${proximo.dias} dias`}.
          É uma estimativa da tua média${dur.estimada ? ', ainda com os 28 dias por omissão' : ''}.
        </p>` : ''}

      <button type="button" class="${comecouHoje ? 'secundario' : 'primario'} largo" id="marcar-inicio">
        ${comecouHoje ? 'Desmarcar — não começou hoje' : 'O período começou hoje'}
      </button>
      ${aberto ? '<button type="button" class="secundario largo" id="marcar-fim">O período acabou hoje</button>' : ''}

      <details class="calculadora">
        <summary>Esqueci-me — marcar noutra data</summary>
        <label>Dia
          <input type="date" id="outra-data" max="${hoje}" value="${hoje}">
        </label>
        <div class="par">
          <button type="button" class="secundario" id="inicio-noutra">Começou neste dia</button>
          <button type="button" class="secundario" id="fim-noutra">Acabou neste dia</button>
        </div>
        <p class="legenda">
          O período não espera que te lembres de abrir a app, e tudo o que a app calcula sai desta
          data. Se já tinhas marcado um início aqui perto, esta data <strong>corrige-o</strong> em
          vez de criar outro período.
        </p>
      </details>

      <p class="legenda">
        ${dur.n
          ? `Os teus ciclos têm em média <strong>${dur.dias} dias</strong>, de ${dur.n} ${dur.n === 1 ? 'intervalo' : 'intervalos'}.`
          : 'Sem dois períodos registados, a app usa 28 dias como referência.'}
        ${per.n ? `O período dura-te em média <strong>${per.dias} dias</strong>.` : 'Marca o fim de um período para a menstruação deixar de ser calculada com 5 dias.'}
      </p>

      ${dur.irregular ? `
        <p class="recado aviso">
          Os teus ciclos variam entre <strong>${dur.min} e ${dur.max} dias</strong>. Com esta variação, a média
          é uma previsão fraca — trata as fases e a data do próximo período como palpites largos,
          não como datas.
        </p>` : ''}
    </div>

    ${cartaoProvas(hoje)}
    ${cartaoCalendario(hoje)}
    ${cartaoPadrao()}
    ${cartaoHistorico(estado)}

    <details class="ritmos">
      <summary>Porque é que a app não muda os treinos por causa da fase</summary>
      <p class="nota">
        Porque a evidência não o sustenta. A meta-análise de referência dá um efeito médio
        <strong>trivial</strong> da fase do ciclo no desempenho, e a revisão de 2025 com critérios
        metodológicos exigentes encontra efeitos inconsistentes de estudo para estudo. O que é
        consistente é a <strong>variabilidade entre pessoas</strong>.
      </p>
      <p class="nota">
        Uma regra do género <em>«não faças intervalos ao dia 2»</em> seria inventar uma certeza que
        não existe. O teu padrão, medido ao longo de vários ciclos, é outra coisa — esse pode ser
        real e grande, e é o que a tabela acima serve para encontrar.
      </p>
      <p class="nota">
        <strong>Fluxo abundante</strong> é uma das causas mais comuns de falta de ferro, e a falta de
        ferro bate directamente na resistência — cansaço que não passa com descanso e ritmos que não
        melhoram com treino. Isso é conversa para análises e médico, não para uma app.
      </p>
    </details>
  `;

  raiz.querySelector('#marcar-inicio').addEventListener('click', () => {
    alternarInicioCiclo(hoje);
    renderCiclo(raiz);
  });

  raiz.querySelector('#marcar-fim')?.addEventListener('click', () => {
    marcarFimCiclo(aberto.inicio, hoje);
    renderCiclo(raiz);
  });

  const outraData = () => raiz.querySelector('#outra-data').value;

  raiz.querySelector('#inicio-noutra').addEventListener('click', () => {
    const d = outraData();
    if (d) alternarInicioCiclo(d);
    renderCiclo(raiz);
  });

  raiz.querySelector('#fim-noutra').addEventListener('click', () => {
    const d = outraData();
    if (!d) return;
    // Fecha o período a que este dia pertence, não o último por ordem.
    const ciclo = [...obter().ciclos].reverse().find((c) => c.inicio <= d);
    if (ciclo) marcarFimCiclo(ciclo.inicio, d);
    renderCiclo(raiz);
  });

  raiz.querySelectorAll('[data-dia-ciclo]').forEach((el) => {
    el.addEventListener('click', () => abrirSintomas(el.dataset.diaCiclo, raiz));
  });

  raiz.querySelectorAll('[data-reabrir]').forEach((el) => {
    el.addEventListener('click', () => {
      marcarFimCiclo(el.dataset.reabrir, null);
      renderCiclo(raiz);
    });
  });

  raiz.querySelectorAll('[data-apagar-ciclo]').forEach((el) => {
    el.addEventListener('click', () => {
      alternarInicioCiclo(el.dataset.apagarCiclo);
      renderCiclo(raiz);
    });
  });
}

/** Em que fase caem as provas. Projecção, e dito como tal. */
function cartaoProvas(hoje) {
  const linhas = PROVAS
    .filter((p) => p.data >= hoje)
    .map((p) => ({ ...p, fase: faseDe(p.data, true) }))
    .filter((p) => p.fase);
  if (!linhas.length) return '';

  return `
    <div class="cartao">
      <h4>As provas</h4>
      <div class="linhas-pt">
        ${linhas.map((p) => `
          <div class="linha-pt">
            <span class="mes">${dataLegivel(p.data)}</span>
            <span class="n">${p.fase.label}</span>
            <span class="parcial">dia ${p.fase.dia}${p.fase.projectada ? ' · projectado' : ''}</span>
          </div>`).join('')}
      </div>
      <p class="legenda">
        Projectado a partir da tua média, por isso move-se quando o próximo período chegar.
        Serve para saberes com o que contar — não para mudar o plano.
      </p>
    </div>
  `;
}

/** O ciclo actual dia a dia. Qualquer dia passado é clicável. */
function cartaoCalendario(hoje) {
  const ciclo = diasDoCiclo(hoje);
  if (!ciclo) {
    return `
      <div class="cartao vazio">
        <p>Marca o primeiro dia de um período para começar.</p>
        <p class="legenda">Daí saem as fases, a previsão e a comparação por fase.</p>
      </div>`;
  }

  return `
    <div class="cartao">
      <h4>Este ciclo, dia a dia</h4>
      <p class="legenda">Toca num dia para registares dores, cansaço ou fluxo. Podes preencher em atraso.</p>
      <div class="grelha-ciclo">
        ${ciclo.dias.map((d) => {
          const f = faseDe(d.data);
          const nivel = nivelMax(d.sintomas);
          const classes = [
            'dia-ciclo',
            f ? `fase-${f.fase}` : '',
            d.futuro ? 'futuro' : '',
            d.data === hoje ? 'hoje' : '',
            nivel === 2 ? 'forte' : nivel === 1 ? 'leve' : '',
          ].filter(Boolean).join(' ');
          return `
            <button type="button" class="${classes}" ${d.futuro ? 'disabled' : `data-dia-ciclo="${d.data}"`}
              title="${dataLegivel(d.data)} · dia ${d.dia}${f ? ` · ${f.label.toLowerCase()}` : ''}">
              <span class="n">${d.dia}</span>
              <span class="ds">${diaCurto(d.data).slice(0, 1)}</span>
            </button>`;
        }).join('')}
      </div>
      <p class="legenda legenda-grelha">
        <span class="amostra forte"></span> forte
        <span class="amostra leve"></span> leve
        <span class="amostra"></span> sem registo
      </p>
    </div>
  `;
}

function abrirSintomas(data, raiz) {
  const actuais = obter().sintomas[data] || {};
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${dataLegivel(data)}</h3>
      <p class="sub">Dia ${faseDe(data)?.dia ?? '—'} do ciclo</p>
      ${SINTOMAS.map((s) => `
        <label>${s.label}
          <select name="${s.chave}">
            ${NIVEIS.map((n, i) => `<option value="${i}" ${(actuais[s.chave] || 0) === i ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
      `).join('')}
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const f = new FormData(dialogo.querySelector('form'));
      registarSintomas(data, Object.fromEntries(SINTOMAS.map((s) => [s.chave, Number(f.get(s.chave))])));
      renderCiclo(raiz);
    }
    dialogo.remove();
  });
}

function cartaoPadrao() {
  const faltam = faltamCiclos();
  if (faltam > 0) {
    return `
      <div class="cartao">
        <h4>O teu padrão</h4>
        <p class="legenda">
          Faltam <strong>${faltam} ${faltam === 1 ? 'ciclo' : 'ciclos'}</strong> de registos para valer a pena
          comparar fases. Com menos, qualquer conclusão seria ruído — e um número errado aqui levava-te
          a mudar treinos sem motivo.
        </p>
      </div>`;
  }

  const padrao = padraoPorFase();
  if (!padrao) {
    return `
      <div class="cartao">
        <h4>O teu padrão</h4>
        <p class="legenda">Já há ciclos suficientes, mas ainda não há treinos registados dentro deles.</p>
      </div>`;
  }

  return `
    <div class="cartao">
      <h4>O teu padrão, por fase</h4>
      <table class="tabela-fases">
        <thead>
          <tr><th>Fase</th><th>Fáceis</th><th>Ritmo</th><th>Esforço</th></tr>
        </thead>
        <tbody>
          ${padrao.linhas.map((l) => `
            <tr>
              <td>${l.label}</td>
              <td>${l.faceis}<span class="de-total"> de ${l.sessoes}</span></td>
              <td>${l.ritmo ? ritmo(l.ritmo) : '—'}</td>
              <td>${l.esforco ? `${l.esforco.toFixed(1).replace('.', ',')}/5` : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p class="legenda">
        Só as <strong>corridas fáceis</strong> entram no ritmo e no esforço, e só com
        ${padrao.minimo} ou mais na mesma fase. Misturar longas e intervalos dava um número que
        refletia o calendário — que sessão calhou em que fase — e não a fase. As fáceis têm todas
        o mesmo ritmo prescrito, por isso uma diferença aqui é sinal.
      </p>
      <p class="legenda">
        Ritmos parecidos com esforço mais alto numa fase significam que foi mais difícil pelo mesmo
        resultado. Isso é teu, não é do manual.
      </p>
    </div>
  `;
}

function cartaoHistorico(estado) {
  if (!estado.ciclos.length) return '';
  const ordenados = [...estado.ciclos].reverse();

  return `
    <div class="cartao">
      <h4>Períodos registados</h4>
      <div class="lista-ciclos">
        ${ordenados.map((c, i) => {
          const anterior = ordenados[i + 1];
          const seguinte = ordenados[i - 1];
          const intervalo = anterior ? Math.round((new Date(c.inicio) - new Date(anterior.inicio)) / 86400000) : null;
          const dias = c.fim ? Math.round((new Date(c.fim) - new Date(c.inicio)) / 86400000) + 1 : null;
          const fortes = fortesDoCiclo(c.inicio, seguinte?.inicio);
          return `
            <div class="linha-ciclo">
              <span>
                ${dataLegivel(c.inicio)}
                ${dias
                  ? `<button type="button" class="duracao" data-reabrir="${c.inicio}"
                       title="Marcar outra vez como não terminado">${dias} ${dias === 1 ? 'dia' : 'dias'}</button>`
                  : '<em class="duracao aberto">fim não marcado</em>'}
                ${fortes ? `<em class="duracao fortes">${fortes} ${fortes === 1 ? 'dia forte' : 'dias fortes'}</em>` : ''}
              </span>
              <span class="intervalo">${intervalo ? `${intervalo} dias depois` : 'primeiro registo'}</span>
              <button type="button" class="apagar" data-apagar-ciclo="${c.inicio}" aria-label="Apagar">×</button>
            </div>`;
        }).join('')}
      </div>
      <p class="legenda">${ciclosCompletos()} ${ciclosCompletos() === 1 ? 'ciclo completo' : 'ciclos completos'}.</p>
    </div>
  `;
}
