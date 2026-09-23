import { obter, guardarAlvos, calcularAlvos, apagarAlimento, VERSAO_APP } from '../store.js';
import { comUnidade } from '../data/alimentos.js';
import { PLANO } from '../data/plano.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ACTIVIDADES = [
  { v: 1.35, label: 'Sedentário, 2 a 3 treinos por semana' },
  { v: 1.5, label: 'Sedentário, 4 a 5 treinos por semana' },
  { v: 1.65, label: 'Activo durante o dia, 5 ou mais treinos' },
];

const DEFICES = [
  { v: 0, label: 'Manter o peso' },
  { v: 400, label: 'Perder devagar — cerca de 0,4 kg/semana' },
  { v: 600, label: 'Perder depressa — cerca de 0,6 kg/semana' },
];

/** A lista dos alimentos dela. Vive aqui, e não no separador Comida: é consulta
 *  e arrumação, não uma coisa que se use todos os dias. */
function listaAlimentos() {
  return obter().alimentos.map((a) => `
    <div class="linha-alimento">
      <div>
        <strong>${esc(a.nome)}</strong><br>
        <span class="legenda">
          ${a.kcal} kcal · ${a.p} g proteína / 100 g
          ${a.porcao?.g ? ` · 1 ${esc(a.porcao.nome)} = ${comUnidade(a, a.porcao.g)}` : ''}
        </span>
      </div>
      <button type="button" class="apagar" data-apagar="${a.id}" aria-label="Apagar ${esc(a.nome)}">×</button>
    </div>`).join('');
}

export function abrirDefinicoes(aoFechar) {
  const alvos = obter().alvos;
  const primeira = !alvos.configurado;
  const inicio = PLANO[0].inicio;
  const mesInicio = MESES_LONGOS[Number(inicio.slice(5, 7)) - 1];
  const diaInicio = Number(inicio.slice(8));

  const dialogo = document.createElement('dialog');
  dialogo.className = 'modal';
  // `novalidate` de propósito: com a validação do browser, um campo obrigatório
  // dentro de uma secção fechada bloqueava o guardar antes de o evento de submit
  // chegar ao nosso código, e sem mensagem nenhuma. Assim validamos nós, depois
  // de abrir as secções.
  dialogo.innerHTML = `
    <form method="dialog" novalidate>
      <h3>${primeira ? 'Bem-vinda' : 'Definições'}</h3>
      <p class="sub">
        ${primeira
          ? 'Antes de começares, os teus alvos. Ficam guardados só neste telemóvel.'
          : 'Tudo o que é teu fica guardado só neste dispositivo.'}
      </p>

      <details class="sec-def" ${primeira ? 'open' : ''}>
        <summary>Alvos e medidas</summary>
        <p class="legenda">
          Preenche as medidas e carrega em <strong>calcular</strong>, ou escreve os alvos à mão.
        </p>
        <div class="par">
          <label>Peso actual (kg)<input type="number" id="c-peso" step="0.1" inputmode="decimal"
            value="${alvos.pesoInicial ?? ''}"></label>
          <label>Altura (cm)<input type="number" id="c-altura" step="1" inputmode="numeric"
            value="${alvos.altura ?? ''}"></label>
        </div>
        <div class="par">
          <label>Idade<input type="number" id="c-idade" step="1" inputmode="numeric"
            value="${alvos.idade ?? ''}"></label>
          <label>Sexo
            <select id="c-sexo">
              <option value="f" ${alvos.sexo !== 'm' ? 'selected' : ''}>Feminino</option>
              <option value="m" ${alvos.sexo === 'm' ? 'selected' : ''}>Masculino</option>
            </select>
          </label>
        </div>
        <label>Nível de actividade
          <select id="c-actividade">
            ${ACTIVIDADES.map((a) => `<option value="${a.v}" ${alvos.actividade == a.v ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </label>
        <label>Objectivo
          <select id="c-defice">
            ${DEFICES.map((x) => `<option value="${x.v}" ${alvos.defice == x.v ? 'selected' : ''}>${x.label}</option>`).join('')}
          </select>
        </label>
        <button type="button" id="c-calcular" class="secundario largo">Calcular alvos</button>
        <p class="legenda" id="c-resultado"></p>

        <h4 class="sec">Alvos diários</h4>
        <div class="par">
          <label>Calorias<input type="number" name="kcal" id="f-kcal" step="10" inputmode="numeric"
            value="${alvos.kcal}" required></label>
          <label>Proteína (g)<input type="number" name="proteina" id="f-proteina" step="1" inputmode="numeric"
            value="${alvos.proteina}" required></label>
        </div>
        <div class="par">
          <label>Hidratos (g)<input type="number" name="hidratos" id="f-hidratos" step="1" inputmode="numeric"
            value="${alvos.hidratos}" required></label>
          <label>Gordura (g)<input type="number" name="gordura" id="f-gordura" step="1" inputmode="numeric"
            value="${alvos.gordura}" required></label>
        </div>
      </details>

      <details class="sec-def">
        <summary>Água</summary>
        <div class="par">
          <label>Alvo diário (ml)<input type="number" name="aguaMl" step="100" min="0" inputmode="numeric"
            value="${alvos.aguaMl ?? 2000}"></label>
          <label>Mais, em dia de treino (ml)<input type="number" name="aguaExtraTreino" step="100" min="0"
            inputmode="numeric" value="${alvos.aguaExtraTreino ?? 500}"></label>
        </div>
        <label>O teu copo tem (ml)<input type="number" name="copoMl" step="10" min="50" inputmode="numeric"
          value="${alvos.copoMl ?? 250}"></label>
        <p class="legenda">O copo é só para registares num toque. Mede o teu uma vez e não voltas a pensar nisso.</p>
      </details>

      <details class="sec-def">
        <summary>Peso</summary>
        <div class="par">
          <label>Peso de partida (kg)<input type="number" name="pesoInicial" id="f-inicial" step="0.1" inputmode="decimal"
            value="${alvos.pesoInicial ?? ''}"></label>
          <label>Peso alvo (kg)<input type="number" name="pesoAlvo" step="0.1" inputmode="decimal"
            value="${alvos.pesoAlvo ?? ''}"></label>
        </div>
        <p class="legenda">O peso de partida serve só de referência para veres quanto já andaste.</p>
      </details>

      <details class="sec-def">
        <summary>Treinos de PT</summary>
        <div class="par">
          <label>Quantos por mês<input type="number" name="ptPorMes" step="1" min="0" inputmode="numeric"
            value="${alvos.ptPorMes ?? 8}"></label>
          <label>Já feitos em ${mesInicio} antes de ${diaInicio}<input type="number" name="ptAntes" step="1" min="0"
            inputmode="numeric" value="${alvos.ptAntes ?? 0}"></label>
        </div>
        <p class="legenda">
          O plano arranca a ${diaInicio} de ${mesInicio}, a meio do mês. O segundo número diz à app
          quantos PT já lá tinhas antes disso, para a contagem do mês bater certo.
        </p>
      </details>

      ${primeira ? '' : `
        <details class="sec-def" id="det-alimentos">
          <summary>Os meus alimentos (${obter().alimentos.length})</summary>
          <p class="legenda">
            A lista de onde escolhes ao registar comida. Criam-se novos no próprio selector,
            ao pesquisar um que ainda não existe.
          </p>
          <div class="lista-alimentos" id="lista-alimentos">${listaAlimentos()}</div>
        </details>`}

      ${primeira ? '' : `<p class="legenda versao-app">Versão ${VERSAO_APP}</p>`}

      <div class="botoes">
        ${primeira ? '' : '<button value="cancelar" class="secundario" formnovalidate>Cancelar</button>'}
        <button value="guardar" class="primario" ${primeira ? 'style="grid-column:1/-1"' : ''}>Guardar</button>
      </div>
    </form>`;

  document.body.appendChild(dialogo);
  dialogo.showModal();

  const num = (id) => Number(dialogo.querySelector(id).value);

  // Um campo obrigatório dentro de uma secção fechada bloqueia o guardar em
  // silêncio: o browser não consegue focar o que está escondido. Abrir tudo
  // antes de validar transforma isso numa mensagem em cima do campo certo.
  const forma = dialogo.querySelector('form');
  forma.addEventListener('submit', (ev) => {
    if (forma.checkValidity()) return;
    ev.preventDefault();
    dialogo.querySelectorAll('details.sec-def').forEach((s) => { s.open = true; });
    forma.reportValidity();
  });

  // Apagar redesenha só a lista: redesenhar o diálogo perdia os alvos que ela
  // já tivesse escrito e ainda não guardado.
  const alvo = dialogo.querySelector('#lista-alimentos');
  function ligarApagar() {
    alvo?.querySelectorAll('[data-apagar]').forEach((b) => {
      b.onclick = () => {
        apagarAlimento(b.dataset.apagar);
        alvo.innerHTML = listaAlimentos();
        const s = dialogo.querySelector('#det-alimentos summary');
        if (s) s.textContent = `Os meus alimentos (${obter().alimentos.length})`;
        ligarApagar();
      };
    });
  }
  ligarApagar();

  dialogo.querySelector('#c-calcular').addEventListener('click', () => {
    const peso = num('#c-peso'), altura = num('#c-altura'), idade = num('#c-idade');
    if (!peso || !altura || !idade) {
      dialogo.querySelector('#c-resultado').textContent = 'Preenche peso, altura e idade.';
      return;
    }
    const r = calcularAlvos({
      peso, altura, idade,
      sexo: dialogo.querySelector('#c-sexo').value,
      actividade: num('#c-actividade'),
      defice: num('#c-defice'),
    });
    dialogo.querySelector('#f-kcal').value = r.kcal;
    dialogo.querySelector('#f-proteina').value = r.proteina;
    dialogo.querySelector('#f-hidratos').value = r.hidratos;
    dialogo.querySelector('#f-gordura').value = r.gordura;
    if (!dialogo.querySelector('#f-inicial').value) dialogo.querySelector('#f-inicial').value = peso;
    dialogo.querySelector('#c-resultado').innerHTML =
      `Metabolismo basal ~${r.tmb} kcal · manutenção estimada ~${r.manutencao} kcal.<br>` +
      `É uma estimativa de partida — ajusta-a ao fim de 3 semanas pelo que a média do peso fizer.`;
  });

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'guardar') {
      const f = new FormData(dialogo.querySelector('form'));
      guardarAlvos({
        kcal: Number(f.get('kcal')) || 2000,
        proteina: Number(f.get('proteina')) || 140,
        hidratos: Number(f.get('hidratos')) || 220,
        gordura: Number(f.get('gordura')) || 60,
        aguaMl: Number(f.get('aguaMl')) || 2000,
        aguaExtraTreino: Number(f.get('aguaExtraTreino')) || 0,
        copoMl: Number(f.get('copoMl')) || 250,
        pesoInicial: f.get('pesoInicial') ? Number(f.get('pesoInicial')) : null,
        pesoAlvo: f.get('pesoAlvo') ? Number(f.get('pesoAlvo')) : null,
        ptPorMes: Number(f.get('ptPorMes')) || 0,
        ptAntes: Number(f.get('ptAntes')) || 0,
        altura: num('#c-altura') || null,
        idade: num('#c-idade') || null,
        sexo: dialogo.querySelector('#c-sexo').value,
        actividade: num('#c-actividade'),
        defice: num('#c-defice'),
      });
      aoFechar?.();
    }
    dialogo.remove();
  });
}
