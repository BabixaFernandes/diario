import {
  REFEICOES, refeicaoSugerida, unidadeDe, mostrar, guardar, comUnidade,
} from '../data/alimentos.js';
import {
  obter, isoData, somaDias, dataLegivel, totaisDoDia, alimentoPorId,
  adicionarAoDiario, removerDoDiario, actualizarNoDiario, adicionarAlimento,
  copiarDia, copiarRefeicao, usoDosAlimentos, mediaSemanalComida,
  ajustarAgua, definirAgua, mediaSemanalAgua,
  materializarEmenta, confirmarPlaneada, descartarPlaneada, reporDia,
  refletirDiarioNaEmenta,
  suplementosDoDia, alternarSuplemento, adicionarSuplementoExtra, apagarSuplementoExtra,
  editarSuplemento,
} from '../store.js';
import { todasAsSessoes } from './treinos.js';
import { cartaoEmenta, cartaoCompras, ligarEmenta } from './ementa.js';

let dataActiva = isoData();

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const normalizarPesquisa = (t) => String(t ?? '').toLocaleLowerCase('pt-PT')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const n1 = (v) => v.toFixed(1).replace('.', ',');

/** O plural da porção. O `+s` ingénuo daria "colher de sopas" e "requeijãos",
 *  por isso os casos que não obedecem trazem o plural escrito nos dados. */
const plural = (p) => p.plural || `${p.nome}s`;

/** "2 ovos · 110 g" — o que ela pôs, na linguagem em que o pôs. */
function textoQuantidade(a, gramas) {
  if (!a.porcao?.g) return comUnidade(a, gramas);
  const unidades = gramas / a.porcao.g;
  if (Math.abs(unidades - Math.round(unidades * 2) / 2) > 0.01) return comUnidade(a, gramas);
  const q = Math.round(unidades * 2) / 2;
  return `${n1(q).replace(',0', '')} ${q === 1 ? a.porcao.nome : plural(a.porcao)} · ${comUnidade(a, gramas)}`;
}

const litros = (ml) => `${(ml / 1000).toFixed(1).replace('.', ',')} L`;

/** Quanta água este dia pede. Num dia de treino pede mais — por isso o alvo é
 *  do dia, e não um número fixo que ignora se ela correu 12 km ou ficou em casa. */
function alvoAgua(data, alvos) {
  const treino = todasAsSessoes().some((s) => s.data === data && s.tipo !== 'descanso' && s.tipo !== 'pt');
  const pt = todasAsSessoes().some((s) => s.data === data && s.tipo === 'pt');
  const comEsforco = treino || pt;
  const extra = comEsforco ? (alvos.aguaExtraTreino || 0) : 0;
  return { base: alvos.aguaMl || 0, extra, total: (alvos.aguaMl || 0) + extra, comEsforco };
}

/** Qual dos `<details>` fica aberto depois de voltar a desenhar. Sem isto, cada
 *  item riscado na lista de compras fechava a lista inteira. */
let abrir = null;

/** O dia da comida como estava antes da última remoção, para o desfazer. Um ×
 *  ao lado de uma linha que também se toca para abrir é um convite a apagar sem
 *  querer, e sem volta atrás isso custa o registo de uma refeição. */
let desfazer = null;

/** Guarda o estado antes de uma alteração que possa ser desfeita. */
function guardarParaDesfazer(data, oQue, opcoes = {}) {
  const e = obter();
  desfazer = {
    data,
    oQue,
    mensagem: opcoes.mensagem || `${oQue} — tirado`,
    slot: opcoes.slot || null,
    linhas: (e.diario[data] || []).map((l) => ({ ...l })),
    materializados: [...(e.materializados[data] || [])],
  };
}

export function renderComida(raiz, manter = null) {
  if (manter) abrir = manter;
  // O que a ementa tem planeado para este dia entra no diário ao abrir o dia —
  // é o que ela pediu: ver as refeições do dia já preenchidas e corrigir o que
  // falhou, em vez de as ter em duplicado com um botão a aplicar.
  materializarEmenta(dataActiva);
  const estado = obter();
  const totais = totaisDoDia(dataActiva);
  const alvos = estado.alvos;
  const linhas = estado.diario[dataActiva] || [];
  const semana = mediaSemanalComida(dataActiva);
  const semanaAgua = mediaSemanalAgua(dataActiva);

  raiz.innerHTML = `
    <div class="nav-data">
      <button id="dia-anterior" aria-label="Dia anterior">‹</button>
      <div>
        <strong>${dataActiva === isoData() ? 'Hoje' : dataLegivel(dataActiva)}</strong>
        ${dataActiva !== isoData() ? `<br><span class="legenda">${dataLegivel(dataActiva)}</span>` : ''}
      </div>
      <button id="dia-seguinte" aria-label="Dia seguinte">›</button>
    </div>

    <div class="destaque">
      <div class="anel-kcal">
        <div class="numero-grande">${Math.round(totais.kcal)}</div>
        <span class="legenda">de ${alvos.kcal} kcal</span>
        <div class="restante ${totais.kcal > alvos.kcal ? 'excedido' : ''}">
          ${totais.kcal > alvos.kcal
      ? `${Math.round(totais.kcal - alvos.kcal)} kcal acima`
      : `faltam ${Math.round(alvos.kcal - totais.kcal)} kcal`}
        </div>
      </div>
      ${barra('Proteína', totais.p, alvos.proteina, 'g', 'proteina')}
      ${barra('Hidratos', totais.h, alvos.hidratos, 'g')}
      ${barra('Gordura', totais.g, alvos.gordura, 'g')}
    </div>

    ${totais.p < alvos.proteina * 0.8 && totais.kcal > alvos.kcal * 0.7
      ? '<div class="cartao aviso"><p><strong>Proteína a ficar para trás.</strong> É ela que impede que o peso perdido venha de músculo. Ainda vais a tempo de corrigir hoje.</p></div>'
      : ''}

    ${cartaoAgua(estado, alvos)}

    ${cartaoSuplementos()}

    <div class="acoes-comida">
      <button id="add-comida" class="primario">+ Alimento</button>
      <button id="copiar-dia" class="secundario">Copiar um dia</button>
    </div>

    <div class="refeicoes">
      ${REFEICOES.map((r) => blocoRefeicao(r, linhas)).join('')}
    </div>
    ${desfazer && desfazer.data === dataActiva ? `
      <div class="faixa-desfazer">
        <span>${esc(desfazer.mensagem)}</span>
        <button type="button" id="desfazer">Desfazer</button>
      </div>` : ''}

    ${linhas.length ? '' : `
      <div class="cartao vazio">
        <p>Nada registado neste dia.</p>
        <p class="legenda">Começa por registar uma refeição ou traz uma de outro dia.</p>
      </div>`}

    ${cartaoSemana(semana, semanaAgua, alvos)}
    ${cartaoEmenta()}
    ${cartaoCompras()}

  `;

  const irParaDia = (n) => { dataActiva = somaDias(dataActiva, n); desfazer = null; renderComida(raiz); };
  raiz.querySelector('#dia-anterior').onclick = () => irParaDia(-1);
  raiz.querySelector('#dia-seguinte').onclick = () => irParaDia(1);
  raiz.querySelector('#add-comida').onclick = () => abrirAdicionar(raiz);
  raiz.querySelector('#copiar-dia').onclick = () => abrirCopiarDia(raiz);
  raiz.querySelectorAll('[data-copiar-refeicao]').forEach((b) => {
    b.onclick = () => abrirCopiarRefeicao(raiz, b.dataset.copiarRefeicao);
  });
  raiz.querySelector('#agua-exacta').onclick = () => abrirAgua(raiz);

  raiz.querySelectorAll('[data-agua]').forEach((b) => {
    b.onclick = () => { ajustarAgua(dataActiva, Number(b.dataset.agua)); renderComida(raiz); };
  });
  // Tocar num copo põe o total nesse copo — um toque para "já vou em quatro".
  raiz.querySelectorAll('[data-copo]').forEach((b) => {
    b.onclick = () => { definirAgua(dataActiva, Number(b.dataset.copo)); renderComida(raiz); };
  });

  raiz.querySelectorAll('[data-editar-linha]').forEach((b) => {
    b.onclick = () => abrirAdicionar(raiz, b.dataset.editarLinha);
  });
  raiz.querySelectorAll('[data-remover-linha]').forEach((b) => {
    b.onclick = () => {
      const l = (obter().diario[dataActiva] || []).find((x) => x.id === b.dataset.removerLinha);
      guardarParaDesfazer(dataActiva, alimentoPorId(l?.alimentoId)?.nome || 'Alimento');
      removerDoDiario(dataActiva, b.dataset.removerLinha);
      refletirDiarioNaEmenta(dataActiva, l?.refeicao);
      renderComida(raiz);
    };
  });
  raiz.querySelector('#desfazer')?.addEventListener('click', () => {
    const d = desfazer;
    desfazer = null;
    reporDia(d.data, d.linhas, d.materializados);
    if (d.slot) refletirDiarioNaEmenta(d.data, d.slot);
    renderComida(raiz);
  });
  raiz.querySelectorAll('[data-confirmar]').forEach((b) => {
    b.onclick = () => { confirmarPlaneada(dataActiva, b.dataset.confirmar); renderComida(raiz); };
  });
  raiz.querySelectorAll('[data-descartar]').forEach((b) => {
    b.onclick = () => {
      guardarParaDesfazer(dataActiva, b.dataset.descartar);
      descartarPlaneada(dataActiva, b.dataset.descartar);
      renderComida(raiz);
    };
  });
  raiz.querySelectorAll('[data-suplemento]').forEach((b) => {
    b.onclick = () => { alternarSuplemento(dataActiva, b.dataset.suplemento); renderComida(raiz); };
  });
  raiz.querySelector('#add-suplemento')?.addEventListener('click', () => abrirNovoSuplemento(raiz));
  raiz.querySelectorAll('[data-apagar-suplemento]').forEach((b) => {
    b.onclick = () => { apagarSuplementoExtra(b.dataset.apagarSuplemento); renderComida(raiz); };
  });
  raiz.querySelectorAll('[data-editar-suplemento]').forEach((b) => {
    b.onclick = () => abrirEditarSuplemento(raiz, b.dataset.editarSuplemento);
  });

  ligarEmenta(raiz, dataActiva, (manter = null) => renderComida(raiz, manter));

  if (abrir) {
    const d = raiz.querySelector(`#${abrir}`);
    if (d) d.open = true;
    abrir = null;
  }
}

function barra(rotulo, valor, alvo, unidade, classe = '') {
  const pct = Math.min(100, (valor / alvo) * 100);
  return `
    <div class="macro ${classe}">
      <div class="macro-topo"><span>${rotulo}</span><span>${Math.round(valor)} / ${alvo} ${unidade}</span></div>
      <div class="barra-progresso"><div style="width:${pct}%"></div></div>
    </div>`;
}

function blocoRefeicao(nome, linhas) {
  const itens = linhas.filter((l) => l.refeicao === nome);
  if (!itens.length) return '';
  const kcal = itens.reduce((acc, l) => {
    const a = alimentoPorId(l.alimentoId);
    return acc + (a ? (a.kcal * l.gramas) / 100 : 0);
  }, 0);

  // A refeição veio da ementa e ainda ninguém lhe tocou. Fica com a marca até
  // ser corrigida ou confirmada — assim o plano pode entrar no diário sozinho
  // sem que se confunda o que está previsto com o que foi comido.
  const doPlano = itens.every((l) => l.planeado);
  const temPlano = itens.some((l) => l.planeado);
  const estadoRefeicao = doPlano
    ? { texto: 'Planeada', classe: 'planeada' }
    : temPlano
      ? { texto: 'Parcial', classe: 'parcial' }
      : { texto: 'Registada', classe: 'registada' };

  return `
    <div class="cartao refeicao ${doPlano ? 'do-plano' : ''}">
      <div class="refeicao-topo">
        <div class="titulo-refeicao">
          <h4>${nome}</h4>
          <span class="estado-refeicao ${estadoRefeicao.classe}">${estadoRefeicao.texto}</span>
        </div>
        <div class="acoes-refeicao">
          <span class="legenda">${Math.round(kcal)} kcal</span>
          <button type="button" class="mover" data-copiar-refeicao="${esc(nome)}"
            aria-label="Copiar refeição" title="Copiar refeição">⧉</button>
        </div>
      </div>

      ${doPlano ? `
        <!-- Faixa própria, e não uma etiqueta no cabeçalho: encostada ao título
             ficava alinhada com a primeira linha e lia-se como sendo daquele
             alimento, quando é da refeição toda. -->
        <div class="faixa-plano">
          <span>Planeada na <strong>ementa</strong> — ainda não confirmada</span>
          <div class="actos-plano">
            <button type="button" class="acto ok" data-confirmar="${nome}">✓ Comi isto</button>
            <button type="button" class="acto nao" data-descartar="${nome}">× Não comi</button>
          </div>
        </div>` : ''}
      ${itens.map((l) => {
    const a = alimentoPorId(l.alimentoId);
    if (!a) return '';
    const f = l.gramas / 100;
    // Duas acções na mesma linha, e por isso dois botões lado a lado em vez
    // de um botão dentro do outro, que é HTML inválido: abrir para corrigir,
    // e o × para tirar um alimento posto por engano sem abrir nada.
    return `
          <div class="linha-diario">
            <button type="button" class="abre-linha" data-editar-linha="${l.id}">
              <div>
                <strong>${esc(a.nome)}</strong><br>
                <span class="legenda">${textoQuantidade(a, l.gramas)} · ${Math.round(a.kcal * f)} kcal · ${n1(a.p * f)} g prot.</span>
              </div>
              <span class="seta">›</span>
            </button>
            <button type="button" class="apagar tira-linha" data-remover-linha="${l.id}"
              aria-label="Tirar ${esc(a.nome)}">×</button>
          </div>`;
  }).join('')}
    </div>`;
}

// ---- Água ----

function cartaoAgua(estado, alvos) {
  const bebido = estado.agua[dataActiva] ?? 0;
  const registado = estado.agua[dataActiva] !== undefined;
  const alvo = alvoAgua(dataActiva, alvos);
  const copo = alvos.copoMl || 250;
  const pct = alvo.total ? Math.min(100, (bebido / alvo.total) * 100) : 0;

  // Um copo por cada copo do alvo, mais um para quando passa dele.
  const nCopos = Math.min(16, Math.ceil(alvo.total / copo) + (bebido > alvo.total ? 1 : 0));
  const cheios = Math.floor(bebido / copo);

  const copos = Array.from({ length: nCopos }, (_, i) => {
    const cheio = i < cheios;
    const ml = (i + 1) * copo;
    return `<button type="button" class="copo ${cheio ? 'cheio' : ''}" data-copo="${ml}"
      aria-label="${i + 1} ${i === 0 ? 'copo' : 'copos'} — ${litros(ml)}">${cheio ? '●' : '○'}</button>`;
  }).join('');

  return `
    <div class="cartao agua">
      <div class="agua-topo">
        <h4>Água</h4>
        <span class="n-agua ${registado && bebido >= alvo.total ? 'certo' : ''}">
          ${registado ? litros(bebido) : '—'} <span class="legenda">de ${litros(alvo.total)}</span>
        </span>
      </div>
      <div class="barra-progresso"><div style="width:${pct}%"></div></div>
      <div class="copos">${copos}</div>
      <div class="botoes-agua">
        <button type="button" data-agua="-${copo}" aria-label="Menos um copo">−</button>
        <button type="button" data-agua="${copo}" class="largo-agua">+ copo (${copo} ml)</button>
        <button type="button" data-agua="500">+ 500 ml</button>
        <button type="button" id="agua-exacta" aria-label="Escrever o valor">…</button>
      </div>
      <p class="legenda">
        ${alvo.comEsforco
      ? `Dia com treino: mais ${litros(alvo.extra)} do que num dia parado.`
      : 'Dia sem treino, alvo base.'}
        ${registado && bebido < alvo.total * 0.5
      ? ' Estás a menos de metade — o cansaço a meio do dia costuma ser isto antes de ser falta de comida.'
      : ''}
      </p>
    </div>`;
}

function abrirAgua(raiz) {
  const actual = obter().agua[dataActiva];
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Água do dia</h3>
      <p class="sub">Total de ${dataActiva === isoData() ? 'hoje' : dataLegivel(dataActiva)}, em mililitros.</p>
      <label>Total (ml)<input type="number" name="ml" id="ml" step="50" min="0" inputmode="numeric"
        value="${actual ?? ''}" placeholder="1500"></label>
      <p class="legenda">Deixa em branco para apagar o registo do dia.</p>
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.querySelector('#ml').select();

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const v = dialogo.querySelector('#ml').value.trim();
      definirAgua(dataActiva, v === '' ? null : v);
      renderComida(raiz);
    }
    dialogo.remove();
  });
}

function cartaoSemana(s, sa, alvos) {
  if (!s.dias && !sa.dias) return '';
  if (!s.dias) {
    return `
      <div class="cartao">
        <h4>Média da semana</h4>
        <div class="linhas-pt">${linhaAgua(sa, alvos)}</div>
      </div>`;
  }
  const fim = somaDias(s.segunda, 6);
  const poucos = s.dias < 4;
  return `
    <div class="cartao">
      <h4>Média da semana</h4>
      <p class="legenda">${dataLegivel(s.segunda)} a ${dataLegivel(fim)} · ${s.dias} de ${s.deDias} dias registados</p>
      <div class="linhas-pt">
        <div class="linha-pt">
          <span class="mes">Calorias</span>
          <span class="n">${Math.round(s.kcal)}</span>
          <span class="parcial">de ${alvos.kcal}</span>
        </div>
        <div class="linha-pt">
          <span class="mes">Proteína</span>
          <span class="n">${Math.round(s.proteina)} g</span>
          <span class="${s.proteina < alvos.proteina * 0.9 ? 'fora' : 'certo'}">de ${alvos.proteina} g</span>
        </div>
        ${linhaAgua(sa, alvos)}
      </div>
      <p class="legenda">
        ${poucos
      ? 'Com menos de quatro dias registados, esta média diz pouco.'
      : 'É a média semanal que decide se ajustas as calorias, não o total de um dia.'}
        ${s.diasPlano
      ? `<strong>${s.diasPlano} ${s.diasPlano === 1 ? 'dia vem' : 'dias vêm'} da ementa sem confirmação</strong> —
             se comeste outra coisa, corrige aí antes de olhares para este número.`
      : ''}
      </p>
    </div>`;
}

function linhaAgua(sa, alvos) {
  if (!sa.dias) return '';
  const alvo = alvos.aguaMl || 0;
  return `
    <div class="linha-pt">
      <span class="mes">Água</span>
      <span class="n">${litros(sa.media)}</span>
      <span class="${sa.media < alvo ? 'fora' : 'certo'}">
        de ${litros(alvo)}${sa.dias < 7 ? ` · ${sa.dias} ${sa.dias === 1 ? 'dia' : 'dias'}` : ''}
      </span>
    </div>`;
}

// As refeições vivem-se e editam-se dentro da ementa — aqui só se lhes acede
// através do que ela planeou entrar no diário. Guardar uma refeição para
// reutilizar noutra semana faz-se lá, no editor de qualquer lugar da ementa.

// ---- Suplementos ----

/** Checks para os suplementos configurados, com edição e remoção no próprio cartão. */
function cartaoSuplementos() {
  const estado = obter();
  const tomados = estado.suplementos[dataActiva] || {};
  const lista = suplementosDoDia();

  return `
    <div class="cartao suplementos">
      <h4>Suplementos</h4>
      <div class="lista-suplementos">
        ${lista.map((nome) => `
          <div class="linha-suplemento">
            <button type="button" class="caixa-suplemento ${tomados[nome] ? 'marcado' : ''}" data-suplemento="${esc(nome)}">
              <span class="caixa">${tomados[nome] ? '☑' : '☐'}</span>
              <span>${esc(nome)}</span>
            </button>
            <button type="button" class="mover" data-editar-suplemento="${esc(nome)}"
              aria-label="Editar suplemento" title="Editar suplemento">✎</button>
            <button type="button" class="apagar" data-apagar-suplemento="${esc(nome)}" aria-label="Deixar de acompanhar ${esc(nome)}">×</button>
          </div>`).join('')}
      </div>
      <button type="button" class="secundario largo" id="add-suplemento">+ Suplemento</button>
    </div>`;
}

function abrirEditarSuplemento(raiz, nome) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Editar suplemento</h3>
      <label>Nome<input name="nome" required value="${esc(nome)}" autofocus></label>
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Guardar</button>
      </div>
    </form>`;
  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const novoNome = new FormData(dialogo.querySelector('form')).get('nome').trim();
      if (novoNome) { editarSuplemento(nome, novoNome); renderComida(raiz); }
    }
    dialogo.remove();
  });
}

function abrirNovoSuplemento(raiz) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Novo suplemento</h3>
      <label>Nome<input name="nome" required placeholder="ex.: Magnésio" autofocus></label>
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Acrescentar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const nome = new FormData(dialogo.querySelector('form')).get('nome').trim();
      if (nome) { adicionarSuplementoExtra(nome); renderComida(raiz); }
    }
    dialogo.remove();
  });
}

// ---- Adicionar ou editar uma entrada ----

function abrirAdicionar(raiz, idLinha = null) {
  const estado = obter();
  const linha = idLinha ? (estado.diario[dataActiva] || []).find((l) => l.id === idLinha) : null;
  const aEditar = !!linha;

  // Os que ela usa mais, primeiro. Sem isto, o iogurte de todas as manhãs fica
  // ao mesmo nível do bacalhau que comeu uma vez.
  const uso = usoDosAlimentos();
  const recentes = Object.entries(uso)
    .sort((a, b) => b[1].n - a[1].n || b[1].ultima.localeCompare(a[1].ultima))
    .map(([id]) => alimentoPorId(id))
    .filter(Boolean)
    .slice(0, 8);

  const cats = [...new Set(estado.alimentos.map((a) => a.cat || 'Outros'))];
  const grupos = [
    ...(recentes.length && !aEditar ? [{ nome: 'Mais usados', itens: recentes }] : []),
    ...cats.map((c) => ({
      nome: c,
      itens: estado.alimentos
        .filter((a) => (a.cat || 'Outros') === c)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-PT', { sensitivity: 'base' })),
    })),
  ];

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${aEditar ? 'Editar' : 'Adicionar alimento'}</h3>
      ${aEditar ? '' : `
        <input type="search" id="pesquisa" placeholder="Pesquisar..." autocomplete="off">
        <div class="resultados" id="resultados">
          ${grupos.map((g) => `
            <div class="grupo" data-cat="${esc(g.nome)}">
              <h5>${esc(g.nome)}</h5>
              ${g.itens.map((a) => `
                <button type="button" class="opcao" data-id="${a.id}" data-nome="${esc(normalizarPesquisa(a.nome))}">
                  <span>${esc(a.nome)}</span><span class="legenda">${a.kcal} kcal · ${a.p} g P</span>
                </button>`).join('')}
            </div>`).join('')}
          <p class="legenda sem-resultados" id="sem-resultados" hidden></p>
        </div>
        <!-- O sítio onde se descobre que um alimento falta é aqui, a pesquisá-lo.
             Antes era preciso sair para o fim do separador para o criar. -->
        <button type="button" class="secundario largo" id="criar-aqui">+ Criar alimento</button>`}

      <div class="escolhido" id="escolhido" ${aEditar ? '' : 'hidden'}>
        <h4 id="nome-escolhido">${aEditar ? esc(alimentoPorId(linha.alimentoId)?.nome || '') : ''}</h4>
        <div class="unidade" id="unidade" hidden>
          <button type="button" data-unidade="porcao" class="activa"></button>
          <button type="button" data-unidade="g" id="btn-base">gramas</button>
        </div>
        <div class="par">
          <label id="rot-qtd">Quantidade
            <input type="number" name="qtd" id="qtd" step="0.5" inputmode="decimal"
              value="${aEditar ? mostrar(alimentoPorId(linha.alimentoId), linha.gramas) : 100}">
          </label>
          <label>Refeição
            <select name="refeicao" id="refeicao">
              ${REFEICOES.map((r) => {
    const sel = aEditar ? linha.refeicao === r : refeicaoSugerida() === r;
    return `<option ${sel ? 'selected' : ''}>${r}</option>`;
  }).join('')}
            </select>
          </label>
        </div>
        <p class="legenda" id="previsao"></p>
      </div>

      ${aEditar ? '<button type="button" class="secundario largo apagar-sessao" id="remover-linha">Remover do diário</button>' : ''}

      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario" id="btn-guardar" ${aEditar ? '' : 'disabled'}>
          ${aEditar ? 'Guardar' : 'Adicionar'}
        </button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.tabIndex = -1;
  dialogo.showModal();
  dialogo.focus({ preventScroll: true });

  let idEscolhido = aEditar ? linha.alimentoId : null;

  // Ao editar, abre na unidade em que foi registado. Abrir sempre em gramas era a
  // maneira mais fácil de trocar "3 fatias" por "3 gramas" sem se dar por isso.
  const porcaoDe = (id, gramas) => {
    const p = alimentoPorId(id)?.porcao;
    if (!p?.g) return null;
    const u = gramas / p.g;
    return Math.abs(u - Math.round(u * 2) / 2) < 0.01 ? Math.round(u * 2) / 2 : null;
  };
  const unidadesIniciais = aEditar ? porcaoDe(linha.alimentoId, linha.gramas) : null;
  let modo = unidadesIniciais !== null ? 'porcao' : 'g'; // "g" ou "porcao"

  const qtd = dialogo.querySelector('#qtd');
  const previsao = dialogo.querySelector('#previsao');
  const unidade = dialogo.querySelector('#unidade');
  const rotulo = dialogo.querySelector('#rot-qtd');
  const btnGuardar = dialogo.querySelector('#btn-guardar');

  const gramasActuais = () => {
    const a = alimentoPorId(idEscolhido);
    const v = Number(qtd.value) || 0;
    // Em modo "base" o que ela escreve está na unidade do alimento — ml num
    // líquido — e converte-se para os gramas que se guardam.
    return modo === 'porcao' && a?.porcao?.g ? Math.round(v * a.porcao.g) : guardar(a, v);
  };

  function desenharEscolhido() {
    const a = alimentoPorId(idEscolhido);
    if (!a) return;
    dialogo.querySelector('#nome-escolhido').textContent = a.nome;
    dialogo.querySelector('#escolhido').hidden = false;
    btnGuardar.disabled = false;

    if (a.porcao?.g) {
      unidade.hidden = false;
      unidade.querySelector('[data-unidade="porcao"]').textContent = `${a.porcao.nome} (${comUnidade(a, a.porcao.g)})`;
    } else {
      unidade.hidden = true;
      modo = 'g';
    }
    // Sem "quantos/quantas": o género de cada porção não é adivinhável, e a
    // unidade já está escrita no botão activo logo acima.
    dialogo.querySelector('#btn-base').textContent = unidadeDe(a) === 'ml' ? 'mililitros' : 'gramas';
    rotulo.firstChild.textContent = modo === 'porcao'
      ? `Quantidade (${plural(a.porcao)})`
      : `Quantidade (${unidadeDe(a)})`;
    qtd.step = modo === 'porcao' ? '0.5' : '1';
    actualizarPrevisao();
  }

  function actualizarPrevisao() {
    const a = alimentoPorId(idEscolhido);
    if (!a) return;
    const f = gramasActuais() / 100;
    previsao.textContent = `${comUnidade(a, gramasActuais())} · ${Math.round(a.kcal * f)} kcal · ${n1(a.p * f)} g proteína · ${n1(a.h * f)} g hidratos · ${n1(a.g * f)} g gordura`;
  }

  unidade.querySelectorAll('[data-unidade]').forEach((b) => {
    b.addEventListener('click', () => {
      const a = alimentoPorId(idEscolhido);
      const gramas = gramasActuais();
      modo = b.dataset.unidade;
      unidade.querySelectorAll('[data-unidade]').forEach((x) => x.classList.toggle('activa', x === b));
      // Converte o que já estava escrito, para não perder o que ela pôs.
      qtd.value = modo === 'porcao' ? Math.round((gramas / a.porcao.g) * 2) / 2 : mostrar(a, gramas);
      desenharEscolhido();
    });
  });

  const criarAqui = dialogo.querySelector('#criar-aqui');
  const semResultados = dialogo.querySelector('#sem-resultados');

  dialogo.querySelector('#pesquisa')?.addEventListener('input', (ev) => {
    const q = normalizarPesquisa(ev.target.value).trim();
    dialogo.querySelectorAll('.opcao').forEach((o) => { o.hidden = q && !o.dataset.nome.includes(q); });
    dialogo.querySelectorAll('.grupo').forEach((g) => {
      g.hidden = ![...g.querySelectorAll('.opcao')].some((o) => !o.hidden);
    });
    const nada = q && ![...dialogo.querySelectorAll('.opcao')].some((o) => !o.hidden);
    semResultados.hidden = !nada;
    semResultados.textContent = nada ? `Nada com «${ev.target.value.trim()}».` : '';
    criarAqui.textContent = nada ? `+ Criar «${ev.target.value.trim()}»` : '+ Criar alimento';
  });

  // Leva o que ela escreveu como nome: se pesquisou "iogurte proteico morango"
  // e não existe, é esse o nome do alimento que quer criar.
  criarAqui?.addEventListener('click', () => {
    const escrito = dialogo.querySelector('#pesquisa').value.trim();
    dialogo.close();
    abrirNovoAlimento(raiz, escrito, () => abrirAdicionar(raiz));
  });

  dialogo.querySelectorAll('.opcao').forEach((o) => {
    o.addEventListener('click', () => {
      idEscolhido = o.dataset.id;
      const a = alimentoPorId(idEscolhido);
      dialogo.querySelectorAll('.opcao').forEach((x) => x.classList.remove('activa'));
      o.classList.add('activa');
      // Com porção conhecida, arranca em "1 porção" — é o caso comum.
      modo = a.porcao?.g ? 'porcao' : 'g';
      unidade.querySelectorAll('[data-unidade]').forEach((x) => x.classList.toggle('activa', x.dataset.unidade === modo));
      qtd.value = modo === 'porcao' ? 1 : 100;
      desenharEscolhido();
      qtd.focus();
      qtd.select();
    });
  });

  qtd.addEventListener('input', () => { if (idEscolhido) actualizarPrevisao(); });

  dialogo.querySelector('#remover-linha')?.addEventListener('click', () => {
    removerDoDiario(dataActiva, idLinha);
    dialogo.close();
    renderComida(raiz);
  });

  if (aEditar) {
    if (unidadesIniciais !== null) qtd.value = unidadesIniciais;
    unidade.querySelectorAll('[data-unidade]').forEach((x) => x.classList.toggle('activa', x.dataset.unidade === modo));
    desenharEscolhido();
  }

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar' && idEscolhido) {
      const campos = { gramas: gramasActuais(), refeicao: dialogo.querySelector('#refeicao').value };
      if (aEditar) actualizarNoDiario(dataActiva, idLinha, campos);
      else adicionarAoDiario(dataActiva, { alimentoId: idEscolhido, ...campos });
      refletirDiarioNaEmenta(dataActiva, campos.refeicao);
      if (aEditar && linha.refeicao !== campos.refeicao) refletirDiarioNaEmenta(dataActiva, linha.refeicao);
      renderComida(raiz);
    }
    dialogo.remove();
  });
}

// ---- Copiar ----

function abrirCopiarRefeicao(raiz, slot) {
  const origem = dataActiva;
  const destinoInicial = somaDias(origem, 1);

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Copiar ${esc(slot.toLowerCase())}</h3>
      <p class="sub">Escolhe o dia onde queres colar esta refeição. Será acrescentada ao que já lá estiver.</p>
      <label>Colar em
        <input type="date" id="destino-refeicao" value="${destinoInicial}" required>
      </label>
      <label>O que fazer com a refeição que já lá está
        <select id="modo-copia">
          <option value="acrescentar">Acrescentar os alimentos</option>
          <option value="substituir">Substituir esta refeição</option>
        </select>
      </label>
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Colar refeição</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  const destino = dialogo.querySelector('#destino-refeicao');
  dialogo.querySelector('form').addEventListener('submit', (ev) => {
    destino.setCustomValidity(destino.value === origem ? 'Escolhe um dia diferente do dia de origem.' : '');
    if (!destino.checkValidity()) {
      ev.preventDefault();
      destino.reportValidity();
    }
  });
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const modo = dialogo.querySelector('#modo-copia').value;
      guardarParaDesfazer(destino.value, null, {
        slot,
        mensagem: `${modo === 'substituir' ? 'Refeição substituída' : 'Refeição copiada'}: ${slot.toLowerCase()}`,
      });
      copiarRefeicao(origem, destino.value, slot, modo);
      refletirDiarioNaEmenta(destino.value, slot);
      dataActiva = destino.value;
      renderComida(raiz);
    }
    dialogo.remove();
  });
}

function abrirCopiarDia(raiz) {
  const estado = obter();
  const comRegisto = Object.keys(estado.diario)
    .filter((d) => estado.diario[d].length && d !== dataActiva)
    .sort().reverse().slice(0, 14);

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Copiar um dia</h3>
      <p class="sub">Traz as entradas desse dia para ${dataActiva === isoData() ? 'hoje' : dataLegivel(dataActiva)}. Acrescenta ao que já cá está.</p>
      ${comRegisto.length ? `
        <div class="resultados">
          ${comRegisto.map((d) => {
    const t = totaisDoDia(d);
    return `
              <button type="button" class="opcao" data-copiar="${d}">
                <span><strong>${dataLegivel(d)}</strong><br><span class="legenda">${estado.diario[d].length} itens · ${Math.round(t.kcal)} kcal · ${Math.round(t.p)} g prot.</span></span>
                <span class="seta">›</span>
              </button>`;
  }).join('')}
        </div>` : '<p class="legenda">Ainda não há outros dias com comida registada.</p>'}
      <div class="botoes um"><button value="cancelar" class="secundario" formnovalidate>Cancelar</button></div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  dialogo.querySelectorAll('[data-copiar]').forEach((b) => {
    b.addEventListener('click', () => {
      copiarDia(b.dataset.copiar, dataActiva);
      dialogo.close();
      renderComida(raiz);
    });
  });
  dialogo.addEventListener('close', () => dialogo.remove());
}

// ---- Criar alimento ----

function abrirNovoAlimento(raiz, nomeInicial = '', aoCriar = null) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>Criar alimento</h3>
      <p class="sub" id="na-sub">Valores por 100 g. Vêm no rótulo da embalagem.</p>
      <label class="caixa-linha">
        <input type="checkbox" name="liquido" id="na-liquido">
        É líquido — mede-se em ml
      </label>
      <label>Nome<input name="nome" id="na-nome" required value="${esc(nomeInicial)}"
        placeholder="ex.: Iogurte proteico morango"></label>
      <div class="par">
        <label>Calorias<input type="number" name="kcal" step="1" inputmode="numeric" required></label>
        <label>Proteína (g)<input type="number" name="p" step="0.1" inputmode="decimal" required></label>
      </div>
      <div class="par">
        <label>Hidratos (g)<input type="number" name="h" step="0.1" inputmode="decimal" value="0"></label>
        <label>Gordura (g)<input type="number" name="g" step="0.1" inputmode="decimal" value="0"></label>
      </div>
      <label>Categoria
        <select name="cat">
          ${['Carne e peixe', 'Ovos e lacticínios', 'Hidratos', 'Fruta e legumes', 'Gorduras e extras', 'Outros']
      .map((c) => `<option>${c}</option>`).join('')}
        </select>
      </label>
      <label>Factor cru (opcional)
        <input type="number" name="factorCru" step="0.01" min="0.01" inputmode="decimal" placeholder="ex.: 1,35">
      </label>
      <p class="legenda">Multiplica o peso comido para calcular quanto comprar em cru. Deixa vazio se não souberes.</p>
      <h4 class="sec">Porção (opcional)</h4>
      <div class="par">
        <label>Como se conta<input name="porcaoNome" placeholder="ex.: iogurte, fatia, lata"></label>
        <label id="na-rot-porcao">Quantos gramas tem<input type="number" name="porcaoG" step="1" inputmode="numeric" placeholder="125"></label>
      </div>
      <p class="legenda">Com isto preenchido, passas a poder escrever <strong>1 iogurte</strong> em vez de 125 g.</p>
      <div class="botoes">
        <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
        <button value="guardar" class="primario">Criar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  // Num líquido o rótulo da embalagem vem por 100 ml, e é isso que ela vai
  // copiar — por isso os textos acompanham a caixa.
  const caixa = dialogo.querySelector('#na-liquido');
  caixa.addEventListener('change', () => {
    const u = caixa.checked ? 'ml' : 'g';
    dialogo.querySelector('#na-sub').textContent = `Valores por 100 ${u}. Vêm no rótulo da embalagem.`;
    dialogo.querySelector('#na-rot-porcao').firstChild.textContent = `Quantos ${caixa.checked ? 'ml' : 'gramas'} tem`;
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const f = new FormData(dialogo.querySelector('form'));
      if (f.get('nome') && f.get('kcal') !== '') {
        const pNome = (f.get('porcaoNome') || '').trim();
        const pG = Number(f.get('porcaoG')) || 0;
        const factorTexto = String(f.get('factorCru') || '').replace(',', '.').trim();
        const factorCru = factorTexto ? Number(factorTexto) : null;
        adicionarAlimento({
          nome: f.get('nome').trim(),
          kcal: Number(f.get('kcal')),
          p: Number(f.get('p')) || 0,
          h: Number(f.get('h')) || 0,
          g: Number(f.get('g')) || 0,
          cat: f.get('cat'),
          factorCru: Number.isFinite(factorCru) && factorCru > 0 ? factorCru : null,
          ...(pNome && pG ? { porcao: { nome: pNome, g: pG } } : {}),
          // Densidade 1: os rótulos de bebidas dão os valores por 100 ml, e a
          // 1 g/ml as duas contas dão o mesmo. Quem souber a densidade a sério
          // acerta-a no ficheiro dos alimentos.
          ...(f.get('liquido') ? { liquido: true } : {}),
        });
        renderComida(raiz);
        // Quem veio do selector de alimentos quer voltar para lá e escolhê-lo,
        // não ficar no diário a ter de recomeçar o caminho todo.
        if (aoCriar) aoCriar();
      }
    }
    dialogo.remove();
  });
}
