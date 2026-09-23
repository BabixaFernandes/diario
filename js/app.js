import { renderTreinos } from './vistas/treinos.js';
import { renderPeso } from './vistas/peso.js';
import { renderComida } from './vistas/comida.js';
import { renderCiclo } from './vistas/ciclo.js';
import { renderCalendario } from './vistas/calendario.js';
import { abrirDefinicoes } from './vistas/definicoes.js';
import { abrirCompras } from './vistas/ementa.js';
import { exportar, importar, obter } from './store.js';

const VISTAS = {
  treinos: { titulo: 'Treinos', render: renderTreinos },
  calendario: { titulo: 'Mês', render: renderCalendario },
  peso: { titulo: 'Peso', render: renderPeso },
  comida: { titulo: 'Comida', render: renderComida },
  ciclo: { titulo: 'Ciclo', render: renderCiclo },
};

const raiz = document.querySelector('#vista');
const titulo = document.querySelector('#titulo');
let actual = localStorage.getItem('diario.vista') || 'treinos';

function mostrar(nome) {
  actual = nome;
  localStorage.setItem('diario.vista', nome);
  titulo.textContent = VISTAS[nome].titulo;
  raiz.innerHTML = '';
  VISTAS[nome].render(raiz);
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('activa', t.dataset.vista === nome);
    t.setAttribute('aria-current', t.dataset.vista === nome ? 'page' : 'false');
  });
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => mostrar(t.dataset.vista));
});

document.querySelector('#definicoes').addEventListener('click', () => {
  abrirDefinicoes(() => mostrar(actual));
});

// Cópia de segurança
// A lista de compras chega-se pelo cabeçalho porque é para ser aberta no
// supermercado, de mão na mão — e não depois de percorrer o separador Comida.
document.querySelector('#compras').addEventListener('click', abrirCompras);

document.querySelector('#exportar').addEventListener('click', exportar);
document.querySelector('#importar').addEventListener('change', (ev) => {
  const ficheiro = ev.target.files[0];
  if (!ficheiro) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      importar(leitor.result);
      alert('Dados restaurados.');
      mostrar(actual);
    } catch (e) {
      alert('Não consegui ler esse ficheiro: ' + e.message);
    }
  };
  leitor.readAsText(ficheiro);
  ev.target.value = '';
});

mostrar(actual);

// Primeira utilização: pede os alvos antes de mais nada.
if (!obter().alvos.configurado) {
  abrirDefinicoes(() => mostrar(actual));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
