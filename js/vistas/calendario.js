// Vista de mês. É o único ecrã onde as quatro coisas que a app guarda por data —
// treinos, peso, comida e ciclo — aparecem no mesmo eixo. Os separadores respondem
// bem a "o que faço hoje"; isto responde a "como é que este mês está".

import { PLANO, TIPO_INFO } from '../data/plano.js';
import { obter, registarPeso, totaisDoDia, isoData, somaDias, dataLegivel } from '../store.js';
import { faseDe } from '../ciclo.js';
import { todasAsSessoes, abrirRegisto } from './treinos.js';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CABECALHO = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

let mesVisivel = null; // "2026-09", mantido entre renders do separador

const mesDe = (iso) => iso.slice(0, 7);
const ritmo = (km, min) => {
  const seg = (min * 60) / km;
  return `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}/km`;
};

/** O primeiro e o último mês com plano, para não navegar para o vazio. */
function limites() {
  const datas = PLANO.flatMap((s) => s.sessoes.map((x) => x.data)).sort();
  return { de: mesDe(datas[0]), ate: mesDe(datas[datas.length - 1]) };
}

function mesSeguinte(mes, n) {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(ano, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** As semanas do mês, de segunda a domingo, com os dias vizinhos a preencher. */
function semanasDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  const primeiro = new Date(ano, m - 1, 1);
  const ultimo = new Date(ano, m, 0);

  const recuo = (primeiro.getDay() + 6) % 7; // 0 = segunda
  const inicio = new Date(ano, m - 1, 1 - recuo);
  const total = Math.ceil((recuo + ultimo.getDate()) / 7) * 7;

  const dias = Array.from({ length: total }, (_, i) => isoData(new Date(
    inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i,
  )));
  return Array.from({ length: total / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7));
}

export function renderCalendario(raiz) {
  const hoje = isoData();
  const lim = limites();
  if (!mesVisivel) mesVisivel = mesDe(hoje) < lim.de ? lim.de : mesDe(hoje) > lim.ate ? lim.ate : mesDe(hoje);

  const estado = obter();
  const sessoes = todasAsSessoes();
  const porDia = {};
  sessoes.forEach((s) => { (porDia[s.data] ||= []).push(s); });

  const [ano, m] = mesVisivel.split('-').map(Number);

  raiz.innerHTML = `
    <div class="nav-data">
      <button type="button" id="mes-anterior" ${mesVisivel <= lim.de ? 'disabled' : ''} aria-label="Mês anterior">‹</button>
      <div>
        <strong>${MESES[m - 1]}</strong>
        <span class="legenda">${ano}</span>
      </div>
      <button type="button" id="mes-seguinte" ${mesVisivel >= lim.ate ? 'disabled' : ''} aria-label="Mês seguinte">›</button>
    </div>

    <div class="cartao calendario">
      <div class="grelha-mes cabecalho-mes">
        ${CABECALHO.map((d) => `<span>${d}</span>`).join('')}
      </div>
      <div class="grelha-mes">
        ${semanasDoMes(mesVisivel).flat().map((d) => celula(d, mesVisivel, hoje, porDia[d] || [], estado)).join('')}
      </div>
    </div>

    ${resumoMes(mesVisivel, sessoes, estado)}

    <div class="cartao">
      <h4>O que significam as marcas</h4>
      <div class="chave-mes">
        ${['pt', 'facil', 'ergo', 'intervalos', 'longa', 'prova'].map((t) => `
          <span class="item-chave"><i class="ponto cor-${TIPO_INFO[t].cor}"></i>${TIPO_INFO[t].label}</span>
        `).join('')}
        <span class="item-chave"><i class="ponto cor-cinza feito">✓</i>feita</span>
        <span class="item-chave"><i class="marca peso"></i>pesagem</span>
        <span class="item-chave"><i class="marca comida"></i>comida registada</span>
        <span class="item-chave"><i class="sinal-dor">⚠</i>dor na canela</span>
      </div>
      <p class="legenda">
        A cor por baixo de cada dia é a fase do ciclo, <strong>tracejada</strong> quando é
        projectada a partir da tua média em vez de medida. Toca num dia para o abrir.
      </p>
    </div>
  `;

  raiz.querySelector('#mes-anterior').addEventListener('click', () => {
    mesVisivel = mesSeguinte(mesVisivel, -1);
    renderCalendario(raiz);
  });
  raiz.querySelector('#mes-seguinte').addEventListener('click', () => {
    mesVisivel = mesSeguinte(mesVisivel, 1);
    renderCalendario(raiz);
  });
  raiz.querySelectorAll('[data-dia]').forEach((el) => {
    el.addEventListener('click', () => abrirDia(el.dataset.dia, raiz));
  });
}

function celula(data, mes, hoje, sessoes, estado) {
  const foraDoMes = mesDe(data) !== mes;
  // Mostra também as fases projectadas, mas tracejadas — para se ver o ritmo do
  // ciclo ao longo do plano sem confundir projecção com dados.
  const fase = faseDe(data, true);
  const temPeso = estado.pesos[data] !== undefined;
  const temComida = (estado.diario[data] || []).length > 0;

  const treinaveis = sessoes.filter((s) => s.tipo !== 'descanso');
  // A dor na canela está acima de tudo na hierarquia do plano, por isso marca o dia
  // inteiro e não um anel de 2 px num ponto que ninguém vê.
  const dor = treinaveis.some((s) => estado.treinos[s.id]?.dorCanela);
  const classes = [
    'dia-mes',
    foraDoMes ? 'fora' : '',
    data === hoje ? 'hoje' : '',
    dor ? 'com-dor' : '',
    fase ? `fase-${fase.fase}` : '',
    fase?.projectada ? 'fase-projectada' : '',
  ].filter(Boolean).join(' ');

  return `
    <button type="button" class="${classes}" data-dia="${data}"
      title="${dataLegivel(data)}${fase ? ` · ${fase.label.toLowerCase()}${fase.projectada ? ' (projectada)' : ''}` : ''}">
      <span class="topo">
        <span class="n">${Number(data.slice(8))}</span>
        <span class="marcas">
          ${temPeso ? '<i class="marca peso"></i>' : ''}
          ${temComida ? '<i class="marca comida"></i>' : ''}
        </span>
      </span>
      <span class="pontos">
        ${treinaveis.slice(0, 3).map((s) => {
          const feito = estado.treinos[s.id]?.feito;
          return `<i class="ponto cor-${TIPO_INFO[s.tipo].cor}${feito ? ' feito' : ''}">${feito ? '✓' : ''}</i>`;
        }).join('')}
        ${dor ? '<i class="sinal-dor">⚠</i>' : ''}
      </span>
    </button>
  `;
}

function resumoMes(mes, sessoes, estado) {
  const doMes = sessoes.filter((s) => mesDe(s.data) === mes && s.tipo !== 'descanso');
  if (!doMes.length) return '';
  const feitas = doMes.filter((s) => estado.treinos[s.id]?.feito);
  const km = feitas.reduce((a, s) => a + (estado.treinos[s.id]?.distanciaKm || 0), 0);
  const dores = doMes.filter((s) => estado.treinos[s.id]?.dorCanela).length;
  const pesagens = Object.keys(estado.pesos).filter((d) => mesDe(d) === mes).length;
  const comidas = Object.keys(estado.diario).filter((d) => mesDe(d) === mes && estado.diario[d].length).length;

  return `
    <div class="cartao">
      <h4>${MESES[Number(mes.slice(5, 7)) - 1]} em números</h4>
      <div class="linhas-pt">
        <div class="linha-pt"><span class="mes">Sessões feitas</span><span class="n">${feitas.length} de ${doMes.length}</span></div>
        <div class="linha-pt"><span class="mes">Quilómetros corridos</span><span class="n">${km ? km.toFixed(1).replace('.', ',') : '—'}</span></div>
        <div class="linha-pt"><span class="mes">Dias com pesagem</span><span class="n">${pesagens}</span></div>
        <div class="linha-pt"><span class="mes">Dias com comida registada</span><span class="n">${comidas}</span></div>
        ${dores ? `<div class="linha-pt"><span class="mes">Sessões com dor na canela</span><span class="fora">${dores}</span></div>` : ''}
      </div>
    </div>
  `;
}

function abrirDia(data, raiz) {
  const estado = obter();
  const sessoes = todasAsSessoes().filter((s) => s.data === data);
  const fase = faseDe(data);
  const sint = estado.sintomas[data];
  const t = totaisDoDia(data);
  const temComida = (estado.diario[data] || []).length > 0;

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${dataLegivel(data)}</h3>
      <p class="sub">
        ${fase ? `${fase.label}${fase.estimada ? ' (estimada)' : ''} · dia ${fase.dia} do ciclo` : 'sem ciclo registado'}
      </p>

      ${sessoes.length ? `
        <h4 class="sec">Sessões</h4>
        ${sessoes.map((s) => {
          const r = estado.treinos[s.id] || {};
          const partes = [];
          if (r.distanciaKm) partes.push(`${r.distanciaKm} km`);
          if (r.tempoMin) partes.push(`${r.tempoMin} min`);
          if (r.distanciaKm && r.tempoMin) partes.push(ritmo(r.distanciaKm, r.tempoMin));
          if (r.esforco) partes.push(`esforço ${r.esforco}/5`);
          return `
            <button type="button" class="opcao" ${s.tipo === 'descanso' ? 'disabled' : `data-sessao="${s.id}"`}>
              <span>
                <strong>${TIPO_INFO[s.tipo].label}</strong> — ${s.titulo}
                ${r.feito ? `<em class="feito-em">✓ ${partes.join(' · ') || 'feita'}</em>` : ''}
                ${r.dorCanela ? '<em class="aviso-em">⚠ dor na canela</em>' : ''}
              </span>
              ${s.tipo === 'descanso' ? '' : '<span class="seta">›</span>'}
            </button>`;
        }).join('')}
      ` : '<p class="legenda">Sem sessões marcadas neste dia.</p>'}

      <h4 class="sec">Peso</h4>
      <label>Peso deste dia (kg)
        <input type="number" name="peso" step="0.1" inputmode="decimal"
          placeholder="—" value="${estado.pesos[data] ?? ''}">
      </label>

      <h4 class="sec">Comida</h4>
      <p class="legenda">
        ${temComida
          ? `${Math.round(t.kcal)} kcal · proteína ${Math.round(t.p)} g · de um alvo de ${estado.alvos.kcal} kcal e ${estado.alvos.proteina} g`
          : 'Nada registado. O diário abre-se no separador Comida.'}
      </p>

      ${sint ? `
        <h4 class="sec">Ciclo</h4>
        <p class="legenda">
          ${Object.entries(sint).filter(([, v]) => v > 0)
            .map(([k, v]) => `${{ dores: 'dores', cansaco: 'cansaço', fluxo: 'fluxo' }[k]} ${v === 2 ? 'fortes' : 'leves'}`)
            .join(' · ') || 'sem sintomas registados'}
          — muda-se no separador Ciclo.
        </p>` : ''}

      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Fechar</button>
        <button value="guardar" class="primario">Guardar peso</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  dialogo.querySelectorAll('[data-sessao]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.sessao;
      dialogo.close();
      abrirRegisto(id, () => renderCalendario(raiz));
    });
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const v = dialogo.querySelector('input[name=peso]').value;
      registarPeso(data, v === '' ? null : v);
      renderCalendario(raiz);
    }
    dialogo.remove();
  });
}
