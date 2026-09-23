// Ementa da semana e lista de compras — a fase 2.
//
// O caso de uso que manda no desenho: ao domingo, planear a semana que vem de
// segunda a domingo, e ficar com a lista de compras pronta para ir às compras
// nesse mesmo fim de semana. Daí duas consequências:
//
//   1. A ementa tem a sua própria navegação de semanas, independente do dia
//      que está aberto no diário. Planear a semana que vem não é folhear dias.
//   2. Cada lugar da ementa guarda a refeição por dentro — escolhem-se os
//      alimentos ali, na hora. As refeições guardadas e a semana-tipo são
//      atalhos para encher mais depressa, nunca pré-requisitos.
//
// O que a ementa tem planeado para um dia entra no diário desse dia quando o
// dia chega — não em cartão separado com um botão a aplicar, que era ter a
// mesma refeição duas vezes no ecrã. Cada linha vinda do plano fica marcada
// como tal até ser corrigida ou confirmada, para a média semanal não passar a
// medir intenções: é ela que manda cortar 150 kcal por dia.

import {
  REFEICOES, unidadeDe, densidadeDe, mostrar, guardar, comUnidade,
} from '../data/alimentos.js';
import {
  obter, isoData, somaDias, diaCurto, dataLegivel, alimentoPorId,
  segundaDe, definirSemanaTipo, aplicarSemanaTipo, definirEmenta, limparEmenta,
  alimentosDaSemana, alternarCompra, limparCompras,
  copiarSemanaEmenta, guardarRefeicao, usoDosAlimentos,
  actualizarRefeicaoGuardada, apagarRefeicaoGuardada,
} from '../store.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = (v) => v.toFixed(1).replace('.', ',');
const plural = (p) => p.plural || `${p.nome}s`;
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
// Duas letras, e não uma: S T Q Q S S D põe segunda, sexta e sábado todas em "S".
const ABREV = ['Sg', 'Te', 'Qa', 'Qi', 'Sx', 'Sá', 'Do'];
// As quatro que quase todos os dias têm. As outras duas ficam atrás de um "+ mais",
// senão são seis botões por dia × sete dias a encher o ecrã de coisas por usar.
const PRINCIPAIS = ['Pequeno-almoço', 'Almoço', 'Lanche', 'Jantar'];

/** Os chips de acrescentar de um dia: as principais que faltam, e as restantes
 *  atrás de um "+ mais". `ref` é a data (ementa) ou o número do dia (tipo). */
function chipsLivres(modo, ref, dia) {
  const livres = REFEICOES.filter((s) => !dia[s]);
  const principais = livres.filter((s) => PRINCIPAIS.includes(s));
  const outras = livres.filter((s) => !PRINCIPAIS.includes(s));

  return `
    <div class="add-slots">
      ${principais.map((slot) => `
        <button type="button" class="chip" data-editar="${modo}|${ref}|${slot}">+ ${slot}</button>`).join('')}
      ${outras.length ? `
        <details class="mais-slots">
          <summary class="chip">+ mais</summary>
          ${outras.map((slot) => `
            <button type="button" class="chip" data-editar="${modo}|${ref}|${slot}">+ ${slot}</button>`).join('')}
        </details>` : ''}
    </div>`;
}

/** A semana que a ementa está a mostrar. Arranca na actual, mas o uso normal é
 *  empurrá-la para a seguinte — é essa que se planeia. */
let semana = segundaDe(isoData());

// `itens` vem sempre do store já migrado, mas estas duas funções são chamadas
// por todo o cartão: uma forma inesperada aqui apagava o separador Comida
// inteiro, e um ecrã vazio sem explicação é o pior erro que a app pode dar.
const itensDe = (r) => (Array.isArray(r?.itens) ? r.itens : []);

const kcalDe = (r) => itensDe(r).reduce((acc, it) => {
  const a = alimentoPorId(it.alimentoId);
  return acc + (a ? (a.kcal * it.gramas) / 100 : 0);
}, 0);

/** O nome de uma refeição planeada. Sem nome escrito, os alimentos servem de
 *  nome — poupa um campo obrigatório que ninguém quer preencher. */
function nomeDe(r) {
  if (r?.nome) return r.nome;
  const nomes = itensDe(r).map((it) => alimentoPorId(it.alimentoId)?.nome).filter(Boolean);
  if (!nomes.length) return 'refeição sem alimentos';
  return nomes.slice(0, 3).join(', ') + (nomes.length > 3 ? '…' : '');
}

const textoSemana = (s) => `${Number(s.slice(8))}/${Number(s.slice(5, 7))} a ${(() => {
  const f = somaDias(s, 6);
  return `${Number(f.slice(8))}/${Number(f.slice(5, 7))}`;
})()}`;

// ---- Ementa da semana ----

export function cartaoEmenta() {
  const { ementa, semanaTipo } = obter();
  const estaSemana = segundaDe(isoData());
  const anterior = somaDias(semana, -7);
  const total = Array.from({ length: 7 }, (_, i) => Object.keys(ementa[somaDias(semana, i)] || {}).length)
    .reduce((a, b) => a + b, 0);
  const temAnterior = Array.from({ length: 7 }, (_, i) => ementa[somaDias(anterior, i)]).some(Boolean);

  const etiqueta = semana === estaSemana ? 'esta semana'
    : semana === somaDias(estaSemana, 7) ? 'próxima semana'
      : semana === somaDias(estaSemana, -7) ? 'semana passada' : textoSemana(semana);

  return `
    <details class="ritmos" id="det-ementa" ${total ? '' : 'open'}>
      <summary>Ementa da semana (${total} ${total === 1 ? 'refeição' : 'refeições'})</summary>

      <div class="nav-semana">
        <button type="button" id="sem-antes" aria-label="Semana anterior">‹</button>
        <div>
          <strong>${etiqueta}</strong><br>
          <span class="legenda">${dataLegivel(semana)} a ${dataLegivel(somaDias(semana, 6))}</span>
        </div>
        <button type="button" id="sem-depois" aria-label="Semana seguinte">›</button>
      </div>

      ${semana === estaSemana ? `
        <button type="button" class="secundario largo" id="sem-proxima">
          Planear a próxima semana ›
        </button>` : ''}

      <div class="grelha-ementa">
        ${DIAS.map((nome, i) => {
          const data = somaDias(semana, i);
          const dia = ementa[data] || {};
          const usadas = REFEICOES.filter((s) => dia[s]);
          const kcal = usadas.reduce((a, s) => a + kcalDe(dia[s]), 0);

          return `
            <div class="dia-ementa ${data === isoData() ? 'activo' : ''}">
              <div class="dia-ementa-topo">
                <strong>${diaCurto(data)} ${Number(data.slice(8))}</strong>
                <span class="legenda">${usadas.length ? `${Math.round(kcal)} kcal` : 'livre'}</span>
              </div>
              ${usadas.map((slot) => `
                <button type="button" class="linha-plano" data-editar="ementa|${data}|${slot}">
                  <span class="slot">${slot}</span>
                  <span class="nome">${esc(nomeDe(dia[slot]))}</span>
                </button>`).join('')}
              ${chipsLivres('ementa', data, dia)}
            </div>`;
        }).join('')}
      </div>

      <div class="acoes-ementa">
        ${temAnterior ? '<button type="button" class="secundario" id="copiar-semana">Copiar a semana anterior</button>' : ''}
        ${Object.keys(semanaTipo).length ? '<button type="button" class="secundario" id="aplicar-tipo">Usar a semana-tipo</button>' : ''}
        ${total ? '<button type="button" class="secundario" id="guardar-tipo">Gravar como semana-tipo</button>' : ''}
        ${total ? '<button type="button" class="secundario" id="limpar-semana">Limpar esta semana</button>' : ''}
      </div>
      <p class="legenda">
        Copiar e a semana-tipo <strong>acrescentam</strong> aos dias livres e não apagam o que
        já puseste à mão nesta semana.
      </p>
      ${blocoSemanaTipo()}
      ${cartaoRefeicoesGuardadas()}
    </details>`;
}

/** As refeições guardadas vivem aqui, ao lado da ementa que as usa, e abrem-se
 *  para edição no mesmo editor. Mudar uma **não** reescreve as semanas onde já
 *  foi usada: cada lugar da ementa tem a sua cópia, senão corrigir uma receita
 *  mudava listas de compras já impressas. */
export function cartaoRefeicoesGuardadas() {
  const { refeicoes } = obter();
  if (!refeicoes.length) {
    return `
      <p class="legenda nota-guardadas">
        Podes guardar uma refeição que uses muito — no editor de qualquer refeição da ementa, ou
        no botão <strong>guardar</strong> de um bloco do diário. Depois entra numa ementa em dois toques.
      </p>`;
  }

  return `
    <div class="guardadas">
      <h5>Refeições guardadas</h5>
      ${refeicoes.map((r) => `
        <div class="linha-alimento">
          <button type="button" class="abre-guardada" data-editar="guardada|${r.id}|">
            <strong>${esc(nomeDe(r))}</strong><br>
            <span class="legenda">${itensDe(r).length} ${itensDe(r).length === 1 ? 'item' : 'itens'} · ${Math.round(kcalDe(r))} kcal</span>
          </button>
          <button type="button" class="apagar" data-apagar-refeicao="${r.id}" aria-label="Apagar ${esc(nomeDe(r))}">×</button>
        </div>`).join('')}
      <p class="legenda">
        Editar uma destas não muda as semanas já planeadas — cada dia da ementa tem a sua cópia.
      </p>
    </div>`;
}

/** A semana-tipo vive dentro da ementa, e não em cartão próprio: é material de
 *  preparação, não uma coisa que se consulte todos os dias. */
function blocoSemanaTipo() {
  const { semanaTipo } = obter();
  const n = Object.keys(semanaTipo).length;
  if (!n) return '';

  return `
    <details class="sub-detalhe" id="det-tipo">
      <summary>A minha semana-tipo (${n} ${n === 1 ? 'refeição' : 'refeições'})</summary>
      <p class="legenda">
        A tua semana normal, sem datas. Serve de base a qualquer semana — os lugares em branco
        ficam por tua conta, que é o que faz sentido num almoço fora ou num jantar de sexta.
      </p>
      <div class="grelha-ementa">
        ${DIAS.map((nome, i) => {
          const dia = {};
          Object.keys(semanaTipo).forEach((chave) => {
            const [d, slot] = chave.split('|');
            if (Number(d) === i) dia[slot] = semanaTipo[chave];
          });
          const usadas = REFEICOES.filter((s) => dia[s]);

          return `
            <div class="dia-ementa">
              <div class="dia-ementa-topo">
                <strong>${nome}</strong>
                <span class="legenda">${usadas.length ? `${usadas.length} ${usadas.length === 1 ? 'refeição' : 'refeições'}` : 'livre'}</span>
              </div>
              ${usadas.map((slot) => `
                <button type="button" class="linha-plano" data-editar="tipo|${i}|${slot}">
                  <span class="slot">${slot}</span>
                  <span class="nome">${esc(nomeDe(dia[slot]))}</span>
                </button>`).join('')}
              ${chipsLivres('tipo', i, dia)}
            </div>`;
        }).join('')}
      </div>
    </details>`;
}

// ---- Lista de compras ----

/** Os gramas registados são os do alimento **como se come** — grelhado,
 *  cozido. O que se compra é cru, e a diferença não é cosmética: 100 g de
 *  frango grelhado saem de ~135 g de frango cru, e 100 g de arroz cozido saem
 *  de ~40 g de arroz cru. `factorCru` faz a conversão; sem ele assume-se 1,
 *  que é o caso dos alimentos que se compram como se comem. */
function gramasCrus(a, gramas) {
  return Math.round(gramas * (a.factorCru || 1));
}

/** Quanto se compra de um alimento. A porção só vira unidade de compra quando
 *  é isso que ela é no supermercado — arredondada para cima, porque não se
 *  compram 7,4 ovos. */
function textoCompra(a, gramasComidos) {
  const gramas = gramasCrus(a, gramasComidos);
  if (a.compra === 'unidade' && a.porcao?.g) {
    const u = Math.ceil(gramas / a.porcao.g - 0.001);
    return { principal: `${u} ${u === 1 ? a.porcao.nome : plural(a.porcao)}`, secundario: `${gramas} g` };
  }
  if (a.liquido) {
    const ml = mostrar(a, gramas);
    return ml >= 1000
      ? { principal: `${(ml / 1000).toFixed(2).replace('.', ',')} L`, secundario: null }
      : { principal: `${ml} ml`, secundario: null };
  }
  return gramas >= 1000
    ? { principal: `${(gramas / 1000).toFixed(2).replace('.', ',')} kg`, secundario: `${gramas} g` }
    : { principal: `${gramas} g`, secundario: null };
}

/** A lista de compras em dados, para o cartão, a impressão e a imagem partirem
 *  todos do mesmo sítio — três versões da mesma lista que discordem é pior do
 *  que não ter as três. */
function listaDeCompras() {
  const soma = alimentosDaSemana(semana);
  const compradas = obter().compras[semana] || {};
  const itens = Object.keys(soma)
    .map((id) => ({ id, a: alimentoPorId(id), gramas: Math.round(soma[id]) }))
    .filter((x) => x.a)
    .map((x) => ({ ...x, texto: textoCompra(x.a, x.gramas), feito: !!compradas[x.id] }));

  const cats = [...new Set(itens.map((x) => x.a.cat || 'Outros'))];
  return {
    itens,
    feitos: itens.filter((x) => x.feito).length,
    grupos: cats.map((cat) => ({ cat, itens: itens.filter((x) => (x.a.cat || 'Outros') === cat) })),
  };
}

export function cartaoCompras() {
  const { itens, feitos, grupos } = listaDeCompras();
  if (!itens.length) return '';

  return `
    <details class="ritmos" id="det-compras">
      <summary>Lista de compras (${feitos} de ${itens.length})</summary>
      <p class="legenda">
        Da semana de <strong>${textoSemana(semana)}</strong>, somada. Fica guardada — podes riscar
        no supermercado e voltar cá no dia seguinte que está tudo como estava.
      </p>
      ${grupos.map((g) => `
        <div class="grupo-compras">
          <h5>${esc(g.cat)}</h5>
          ${g.itens.map((x) => `
            <button type="button" class="linha-compra ${x.feito ? 'feito' : ''}" data-comprar="${x.id}">
              <span class="caixa">${x.feito ? '☑' : '☐'}</span>
              <span class="nome">${esc(x.a.nome)}</span>
              <span class="qtd">${x.texto.principal}${x.texto.secundario ? `<span class="legenda"> · ${x.texto.secundario}</span>` : ''}</span>
            </button>`).join('')}
        </div>`).join('')}
      <p class="legenda">
        As quantidades já são <strong>do alimento cru</strong>, mesmo quando o registas cozinhado
        ou grelhado — é isso que se pede no supermercado.
      </p>
      <div class="acoes-ementa">
        <button type="button" class="secundario" id="imprimir-compras">Imprimir ou PDF</button>
        <button type="button" class="secundario" id="png-compras">Imagem para enviar</button>
      </div>
      <button type="button" class="secundario largo" id="limpar-compras" ${feitos ? '' : 'disabled'}>
        Desmarcar tudo
      </button>
    </details>`;
}

// ---- Levar a lista para fora da app ----

/** Imprimir usa o próprio diálogo do browser, que em Android e no PC tem
 *  "Guardar como PDF" — evita uma biblioteca de 300 KB numa app sem build. */
function imprimirLista() {
  const { grupos, itens, feitos } = listaDeCompras();
  const alvo = document.getElementById('impressao');
  alvo.innerHTML = `
    <h1>Lista de compras</h1>
    <p>Semana de ${dataLegivel(semana)} a ${dataLegivel(somaDias(semana, 6))}
      · ${itens.length} ${itens.length === 1 ? 'artigo' : 'artigos'}${feitos ? ` · ${feitos} já comprados` : ''}</p>
    ${grupos.map((g) => `
      <h2>${esc(g.cat)}</h2>
      <ul>
        ${g.itens.map((x) => `
          <li class="${x.feito ? 'feito' : ''}">
            <span class="cx">${x.feito ? '☑' : '☐'}</span>
            <span class="nm">${esc(x.a.nome)}</span>
            <span class="qt">${x.texto.principal}${x.texto.secundario ? ` · ${x.texto.secundario}` : ''}</span>
          </li>`).join('')}
      </ul>`).join('')}`;
  window.print();
}

/** A imagem é desenhada no canvas linha a linha, e não a partir de HTML: é a
 *  única forma que não precisa de biblioteca nem de conversões que o browser
 *  possa recusar por causa de recursos externos. */
function imagemDaLista() {
  const { grupos, itens } = listaDeCompras();
  const L = 28, M = 34, TOPO = 128, CABECA = 36;
  const altura = TOPO + grupos.reduce((a, g) => a + CABECA + 12 + g.itens.length * L, 0) + M;
  const largura = 720;

  const c = document.createElement('canvas');
  // ×2 para não sair desfocada num ecrã de telemóvel.
  c.width = largura * 2; c.height = altura * 2;
  const x = c.getContext('2d');
  x.scale(2, 2);

  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, largura, altura);

  x.fillStyle = '#111111';
  x.font = '700 30px system-ui, sans-serif';
  x.fillText('Lista de compras', M, 56);
  x.fillStyle = '#666666';
  x.font = '17px system-ui, sans-serif';
  x.fillText(`${dataLegivel(semana)} a ${dataLegivel(somaDias(semana, 6))} · ${itens.length} artigos`, M, 84);

  let y = TOPO;
  grupos.forEach((g) => {
    x.fillStyle = '#888888';
    x.font = '600 14px system-ui, sans-serif';
    x.fillText(g.cat.toUpperCase(), M, y);
    x.strokeStyle = '#dddddd';
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(M, y + 7); x.lineTo(largura - M, y + 7); x.stroke();
    y += CABECA;

    g.itens.forEach((it) => {
      x.fillStyle = '#111111';
      x.font = '18px system-ui, sans-serif';
      x.fillText(it.feito ? '☑' : '☐', M, y);
      x.fillText(it.a.nome, M + 30, y);
      x.font = '700 18px system-ui, sans-serif';
      x.textAlign = 'right';
      x.fillText(it.texto.principal, largura - M, y);
      x.textAlign = 'left';
      if (it.feito) {
        x.strokeStyle = '#999999';
        x.beginPath(); x.moveTo(M + 30, y - 6); x.lineTo(largura - M, y - 6); x.stroke();
      }
      y += L;
    });
    y += 12;
  });

  return c;
}

async function enviarImagem() {
  const nome = `compras-${semana}.png`;
  const blob = await new Promise((r) => imagemDaLista().toBlob(r, 'image/png'));
  const ficheiro = new File([blob], nome, { type: 'image/png' });

  // No telemóvel abre o menu de partilha; no PC descarrega, que é o que há.
  if (navigator.canShare?.({ files: [ficheiro] })) {
    try {
      await navigator.share({ files: [ficheiro], title: 'Lista de compras' });
      return;
    } catch {
      // Partilha cancelada ou recusada — cai para o descarregamento.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** A lista de compras em ecrã cheio, a partir do carrinho no cabeçalho. É para
 *  ser aberta no supermercado, de mão na mão: sem passar pelo separador Comida,
 *  e com as setas para trocar de semana ali mesmo.
 *
 *  Parte da mesma `listaDeCompras()` que o cartão, a impressão e a imagem — o
 *  que se risca aqui aparece riscado lá, porque é o mesmo dado. */
export function abrirCompras() {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  document.body.appendChild(dialogo);

  function desenhar() {
    const { itens, feitos, grupos } = listaDeCompras();
    dialogo.innerHTML = `
      <form method="dialog">
        <h3>Lista de compras</h3>
        <div class="nav-semana">
          <button type="button" id="cs-antes" aria-label="Semana anterior">‹</button>
          <div>
            <strong>${textoSemana(semana)}</strong><br>
            <span class="legenda">${itens.length ? `${feitos} de ${itens.length} artigos` : 'sem nada planeado'}</span>
          </div>
          <button type="button" id="cs-depois" aria-label="Semana seguinte">›</button>
        </div>

        ${itens.length ? grupos.map((g) => `
          <div class="grupo-compras">
            <h5>${esc(g.cat)}</h5>
            ${g.itens.map((x) => `
              <button type="button" class="linha-compra ${x.feito ? 'feito' : ''}" data-comprar="${x.id}">
                <span class="caixa">${x.feito ? '☑' : '☐'}</span>
                <span class="nome">${esc(x.a.nome)}</span>
                <span class="qtd">${x.texto.principal}${x.texto.secundario ? `<span class="legenda"> · ${x.texto.secundario}</span>` : ''}</span>
              </button>`).join('')}
          </div>`).join('')
        : '<p class="legenda">Esta semana não tem ementa, por isso não há nada a comprar. A lista sai do que planeares no separador Comida.</p>'}

        ${itens.length ? `
          <div class="acoes-ementa">
            <button type="button" class="secundario" id="cs-imprimir">Imprimir ou PDF</button>
            <button type="button" class="secundario" id="cs-png">Imagem para enviar</button>
          </div>` : ''}
        <div class="botoes um"><button value="fechar" class="secundario" formnovalidate>Fechar</button></div>
      </form>`;

    dialogo.querySelector('#cs-antes').onclick = () => { semana = somaDias(semana, -7); desenhar(); };
    dialogo.querySelector('#cs-depois').onclick = () => { semana = somaDias(semana, 7); desenhar(); };
    dialogo.querySelector('#cs-imprimir')?.addEventListener('click', imprimirLista);
    dialogo.querySelector('#cs-png')?.addEventListener('click', enviarImagem);
    dialogo.querySelectorAll('[data-comprar]').forEach((b) => {
      b.onclick = () => { alternarCompra(semana, b.dataset.comprar); desenhar(); };
    });
  }

  desenhar();
  dialogo.showModal();
  dialogo.addEventListener('close', () => dialogo.remove());
}

// ---- Ligações ----

export function ligarEmenta(raiz, dataActiva, aoMudar) {
  const irPara = (s) => { semana = s; aoMudar('det-ementa'); };
  raiz.querySelector('#sem-antes')?.addEventListener('click', () => irPara(somaDias(semana, -7)));
  raiz.querySelector('#sem-depois')?.addEventListener('click', () => irPara(somaDias(semana, 7)));
  raiz.querySelector('#sem-proxima')?.addEventListener('click', () => irPara(somaDias(semana, 7)));

  raiz.querySelector('#copiar-semana')?.addEventListener('click', () => {
    copiarSemanaEmenta(somaDias(semana, -7), semana);
    aoMudar('det-ementa');
  });
  raiz.querySelector('#aplicar-tipo')?.addEventListener('click', () => {
    aplicarSemanaTipo(semana);
    aoMudar('det-ementa');
  });
  raiz.querySelector('#guardar-tipo')?.addEventListener('click', () => gravarComoTipo(aoMudar));
  raiz.querySelector('#limpar-semana')?.addEventListener('click', () => {
    limparEmenta(semana);
    aoMudar('det-ementa');
  });

  raiz.querySelector('#limpar-compras')?.addEventListener('click', () => {
    limparCompras(semana);
    aoMudar('det-compras');
  });
  raiz.querySelector('#imprimir-compras')?.addEventListener('click', imprimirLista);
  raiz.querySelector('#png-compras')?.addEventListener('click', enviarImagem);

  raiz.querySelectorAll('[data-apagar-refeicao]').forEach((b) => {
    b.onclick = () => { apagarRefeicaoGuardada(b.dataset.apagarRefeicao); aoMudar('det-ementa'); };
  });
  raiz.querySelectorAll('[data-comprar]').forEach((b) => {
    b.onclick = () => { alternarCompra(semana, b.dataset.comprar); aoMudar('det-compras'); };
  });

  raiz.querySelectorAll('[data-editar]').forEach((b) => {
    const [modo, chave, slot] = b.dataset.editar.split('|');
    b.onclick = () => abrirRefeicao(modo, chave, slot, aoMudar);
  });
}

function gravarComoTipo(aoMudar) {
  const { ementa } = obter();
  for (let i = 0; i < 7; i += 1) {
    const dia = ementa[somaDias(semana, i)] || {};
    REFEICOES.forEach((slot) => definirSemanaTipo(i, slot, dia[slot] || null));
  }
  aoMudar('det-tipo');
}

// ---- O editor de uma refeição da ementa ----

/** Monta a refeição de um lugar da ementa (ou da semana-tipo) escolhendo os
 *  alimentos ali mesmo. Duas vistas dentro do mesmo diálogo em vez de diálogos
 *  encaixados, que em PWA instalada dão problemas. */
function abrirRefeicao(modo, chave, slot, aoMudar) {
  const estado = obter();
  // Três sítios de onde uma refeição pode vir, mesmo editor: um dia da ementa,
  // um dia da semana-tipo, ou a lista de refeições guardadas.
  const guardada = modo === 'guardada' ? estado.refeicoes.find((r) => r.id === chave) : null;
  const actual = modo === 'guardada' ? guardada
    : modo === 'tipo' ? estado.semanaTipo[`${chave}|${slot}`]
      : (estado.ementa[chave] || {})[slot];

  // Cópia de trabalho: só se escreve no estado ao guardar, para o Cancelar
  // cancelar de facto.
  let itens = itensDe(actual).map((it) => ({ ...it }));
  let nome = actual?.nome || '';

  const cabecalho = modo === 'guardada' ? 'Refeição guardada' : slot;
  const titulo = modo === 'guardada' ? nomeDe(guardada)
    : modo === 'tipo' ? DIAS[Number(chave)] : dataLegivel(chave);
  // Numa refeição guardada, "começar de uma guardada" não faz sentido.
  const guardadas = modo === 'guardada' ? [] : estado.refeicoes;
  const comDias = modo !== 'guardada';

  // Que dia da semana é este lugar. Serve de arranque aos dias a repetir: encher
  // sete dias × quatro refeições um diálogo de cada vez são 28 diálogos, e é aí
  // que se desiste de planear uma semana.
  const diaAlvo = modo === 'tipo' ? Number(chave)
    : comDias ? (new Date(`${chave}T12:00:00`).getDay() + 6) % 7 : 0;
  const base = modo === 'ementa' ? somaDias(chave, -diaAlvo) : null;

  // A fila de dias tem de dizer a verdade sobre onde esta refeição já está —
  // acender só o dia de onde se abriu, com a refeição repetida em cinco dias,
  // fazia o controlo mentir. Assim também serve para a tirar de um dia.
  const assinatura = (r) => itensDe(r).map((it) => `${it.alimentoId}:${it.gramas}`).sort().join('|');
  const noDia = (i) => (modo === 'tipo'
    ? estado.semanaTipo[`${i}|${slot}`]
    : (estado.ementa[somaDias(base, i)] || {})[slot]);
  const original = assinatura(actual);
  const jaEm = comDias
    ? Array.from({ length: 7 }, (_, i) => i).filter((i) => original && assinatura(noDia(i)) === original)
    : [];

  const uso = usoDosAlimentos();
  const recentes = Object.entries(uso)
    .sort((a, b) => b[1].n - a[1].n || b[1].ultima.localeCompare(a[1].ultima))
    .map(([id]) => alimentoPorId(id))
    .filter(Boolean)
    .slice(0, 8);
  const cats = [...new Set(estado.alimentos.map((a) => a.cat || 'Outros'))];
  const grupos = [
    ...(recentes.length ? [{ nome: 'Mais usados', itens: recentes }] : []),
    ...cats.map((c) => ({ nome: c, itens: estado.alimentos.filter((a) => (a.cat || 'Outros') === c) })),
  ];

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  dialogo.innerHTML = `
    <form method="dialog">
      <h3>${esc(cabecalho)}</h3>
      <p class="sub">${esc(titulo)}</p>

      <div id="v-lista">
        ${guardadas.length ? `
          <label>Começar de uma refeição guardada
            <select id="r-guardada">
              <option value="">—</option>
              ${guardadas.map((r) => `<option value="${r.id}">${esc(r.nome)}</option>`).join('')}
            </select>
          </label>` : ''}
        <div class="itens-refeicao" id="itens"></div>
        <button type="button" class="secundario largo" id="ir-alimentos">+ Alimento</button>
        <label>Nome (opcional)
          <input id="r-nome" value="${esc(nome)}" placeholder="fica com os alimentos se deixares em branco">
        </label>

        ${comDias ? `
        <span class="rot-repetir">Pôr este ${slot.toLowerCase()} em</span>
        <div class="repetir" id="repetir">
          ${DIAS.map((d, i) => {
            const ligado = jaEm.length ? jaEm.includes(i) : i === diaAlvo;
            // Um dia que já tenha outro ${slot} vai ser substituído se for aceso.
            // Marcá-lo é mais barato — e mais honesto — do que uma confirmação.
            const ocupado = !ligado && !!noDia(i);
            return `
              <button type="button" data-dia="${i}"
                class="${ligado ? 'ligado' : ''} ${ocupado ? 'ocupado' : ''}"
                aria-label="${d}${ocupado ? `, já tem outro ${slot.toLowerCase()}` : ''}"
                aria-pressed="${ligado}">${ABREV[i]}</button>`;
          }).join('')}
        </div>
        <p class="legenda">
          Os dias acesos são os que levam esta refeição. Acrescenta ou tira — poupa repetir
          o mesmo ${slot.toLowerCase()} cinco vezes, e as outras refeições do dia não são tocadas.
          ${Array.from({ length: 7 }, (_, i) => i).some((i) => !(jaEm.length ? jaEm.includes(i) : i === diaAlvo) && noDia(i))
            ? `Os dias com <span class="marca-ocupado">•</span> já têm outro ${slot.toLowerCase()}, que seria substituído.`
            : ''}
        </p>` : ''}
        ${comDias && itens.length
          ? '<button type="button" class="secundario largo" id="r-guardar-como">Guardar também como refeição reutilizável</button>'
          : ''}
        ${actual && comDias ? '<button type="button" class="secundario largo apagar-sessao" id="r-tirar">Deixar este lugar livre</button>' : ''}
        <div class="botoes">
          <button value="cancelar" class="secundario" formnovalidate>Cancelar</button>
          <button value="guardar" class="primario" id="r-guardar">Guardar</button>
        </div>
      </div>

      <div id="v-alimentos" hidden>
        <input type="search" id="r-pesquisa" placeholder="Pesquisar..." autocomplete="off">
        <div class="resultados">
          ${grupos.map((g) => `
            <div class="grupo" data-cat="${esc(g.nome)}">
              <h5>${esc(g.nome)}</h5>
              ${g.itens.map((a) => `
                <button type="button" class="opcao" data-alimento="${a.id}" data-nome="${esc(a.nome.toLowerCase())}">
                  <span>${esc(a.nome)}</span><span class="legenda">${a.kcal} kcal · ${a.p} g P</span>
                </button>`).join('')}
            </div>`).join('')}
        </div>
        <div class="botoes um"><button type="button" class="secundario" id="voltar-lista">Voltar</button></div>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  const alvoItens = dialogo.querySelector('#itens');
  const vLista = dialogo.querySelector('#v-lista');
  const vAlimentos = dialogo.querySelector('#v-alimentos');

  function desenhar() {
    const kcal = itens.reduce((acc, it) => {
      const a = alimentoPorId(it.alimentoId);
      return acc + (a ? (a.kcal * it.gramas) / 100 : 0);
    }, 0);
    const p = itens.reduce((acc, it) => {
      const a = alimentoPorId(it.alimentoId);
      return acc + (a ? (a.p * it.gramas) / 100 : 0);
    }, 0);

    alvoItens.innerHTML = itens.length
      ? `${itens.map((it, i) => {
        const a = alimentoPorId(it.alimentoId);
        const emPorcao = a?.porcao?.g && Math.abs(it.gramas / a.porcao.g - Math.round((it.gramas / a.porcao.g) * 2) / 2) < 0.01;
        const u = a?.porcao?.g ? Math.round((it.gramas / a.porcao.g) * 2) / 2 : null;
        return `
          <div class="item-refeicao">
            <div class="nome">${esc(a?.nome || '?')}</div>
            <input type="number" class="qtd-item" data-i="${i}" step="${emPorcao ? '0.5' : '1'}"
              inputmode="decimal" value="${emPorcao ? u : mostrar(a, it.gramas)}"
              aria-label="Quantidade de ${esc(a?.nome || '')}">
            <span class="unidade-item">${emPorcao ? (u === 1 ? a.porcao.nome : plural(a.porcao)) : unidadeDe(a)}</span>
            <button type="button" class="apagar" data-tirar="${i}" aria-label="Tirar">×</button>
          </div>`;
      }).join('')}
        <p class="legenda total-refeicao">${Math.round(kcal)} kcal · ${n1(p)} g de proteína</p>`
      : '<p class="legenda">Sem alimentos. Carrega em <strong>+ Alimento</strong>.</p>';

    alvoItens.querySelectorAll('[data-tirar]').forEach((b) => {
      b.onclick = () => { itens.splice(Number(b.dataset.tirar), 1); desenhar(); };
    });
    alvoItens.querySelectorAll('.qtd-item').forEach((campo) => {
      campo.addEventListener('change', () => {
        const i = Number(campo.dataset.i);
        const a = alimentoPorId(itens[i].alimentoId);
        const v = Number(campo.value) || 0;
        const emPorcao = campo.nextElementSibling.textContent !== unidadeDe(a);
        itens[i].gramas = emPorcao && a?.porcao?.g ? Math.round(v * a.porcao.g) : guardar(a, v);
        if (itens[i].gramas <= 0) itens.splice(i, 1);
        desenhar();
      });
    });
  }

  desenhar();

  dialogo.querySelector('#ir-alimentos').onclick = () => {
    vLista.hidden = true; vAlimentos.hidden = false;
    dialogo.querySelector('#r-pesquisa').focus();
  };
  dialogo.querySelector('#voltar-lista').onclick = () => {
    vAlimentos.hidden = true; vLista.hidden = false;
  };

  dialogo.querySelector('#r-pesquisa').addEventListener('input', (ev) => {
    const q = ev.target.value.toLowerCase().trim();
    dialogo.querySelectorAll('.opcao').forEach((o) => { o.hidden = q && !o.dataset.nome.includes(q); });
    dialogo.querySelectorAll('.grupo').forEach((g) => {
      g.hidden = ![...g.querySelectorAll('.opcao')].some((o) => !o.hidden);
    });
  });

  // Escolher um alimento volta logo à lista, com uma porção lá posta — é o que
  // se quer em 90% dos casos, e o número corrige-se ali mesmo.
  dialogo.querySelectorAll('[data-alimento]').forEach((o) => {
    o.onclick = () => {
      const a = alimentoPorId(o.dataset.alimento);
      itens.push({ alimentoId: a.id, gramas: a.porcao?.g || 100 });
      vAlimentos.hidden = true; vLista.hidden = false;
      dialogo.querySelector('#r-pesquisa').value = '';
      dialogo.querySelectorAll('.opcao').forEach((x) => { x.hidden = false; });
      dialogo.querySelectorAll('.grupo').forEach((g) => { g.hidden = false; });
      desenhar();
    };
  });

  dialogo.querySelector('#r-guardada')?.addEventListener('change', (ev) => {
    const r = obter().refeicoes.find((x) => x.id === ev.target.value);
    if (!r) return;
    itens = r.itens.map((it) => ({ ...it }));
    if (!dialogo.querySelector('#r-nome').value) dialogo.querySelector('#r-nome').value = r.nome;
    ev.target.value = '';
    desenhar();
  });

  dialogo.querySelectorAll('#repetir button').forEach((b) => {
    b.onclick = () => {
      const ligado = b.classList.toggle('ligado');
      b.setAttribute('aria-pressed', String(ligado));
    };
  });

  const diasEscolhidos = () => [...dialogo.querySelectorAll('#repetir button.ligado')]
    .map((b) => Number(b.dataset.dia));

  /** Escreve nos dias acesos e tira dos apagados — mas só tira onde estava
   *  exactamente esta refeição. Um dia apagado que tenha outro almoço fica como
   *  está: o controlo é sobre esta refeição, não sobre o lugar. */
  const alvoDetalhe = modo === 'tipo' ? 'det-tipo' : 'det-ementa';

  const gravar = (valor) => {
    if (modo === 'guardada') {
      if (valor) actualizarRefeicaoGuardada(chave, valor);
      aoMudar('det-ementa');
      return;
    }
    const acesos = diasEscolhidos();
    const por = (i, v) => (modo === 'tipo'
      ? definirSemanaTipo(i, slot, v)
      : definirEmenta(somaDias(base, i), slot, v));

    for (let i = 0; i < 7; i += 1) {
      if (acesos.includes(i)) por(i, valor);
      else if (assinatura(noDia(i)) === original && original) por(i, null);
    }
    // Sem nenhum dia aceso, fica pelo menos o dia de onde se abriu — senão
    // guardar uma refeição acabada de montar não guardava nada.
    if (!acesos.length && valor) por(diaAlvo, valor);
    aoMudar(alvoDetalhe);
  };

  dialogo.querySelector('#r-guardar-como')?.addEventListener('click', (ev) => {
    const n = dialogo.querySelector('#r-nome').value.trim() || nomeDe({ itens });
    guardarRefeicao(n, itens);
    ev.target.textContent = `Guardada como "${n}"`;
    ev.target.disabled = true;
  });

  dialogo.querySelector('#r-tirar')?.addEventListener('click', () => {
    // Deixar livre é sempre só este lugar, independentemente do que esteja marcado.
    if (modo === 'tipo') definirSemanaTipo(diaAlvo, slot, null);
    else definirEmenta(chave, slot, null);
    dialogo.close();
    aoMudar(alvoDetalhe);
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      nome = dialogo.querySelector('#r-nome').value.trim();
      gravar(itens.length ? { nome, itens } : null);
    }
    dialogo.remove();
  });
}
