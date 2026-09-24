import test from 'node:test';
import assert from 'node:assert/strict';

class MemoriaLocal {
  #dados = new Map();

  getItem(chave) {
    return this.#dados.get(chave) ?? null;
  }

  setItem(chave, valor) {
    this.#dados.set(chave, String(valor));
  }

  removeItem(chave) {
    this.#dados.delete(chave);
  }
}

globalThis.localStorage = new MemoriaLocal();
globalThis.alert = () => { };

const store = await import('../js/store.js?test=store');

function prepararEstado() {
  store.actualizar((estado) => {
    estado.diario = {};
    estado.ementa = {};
    estado.materializados = {};
  });
}

test('copia uma refeição acrescentando ao destino', () => {
  prepararEstado();
  store.actualizar((estado) => {
    estado.diario['2026-09-23'] = [
      { id: 'origem-1', alimentoId: 'base-1', gramas: 120, refeicao: 'Almoço' },
    ];
    estado.diario['2026-09-24'] = [
      { id: 'destino-1', alimentoId: 'base-2', gramas: 80, refeicao: 'Jantar' },
    ];
  });

  store.copiarRefeicao('2026-09-23', '2026-09-24', 'Almoço');
  const linhas = store.obter().diario['2026-09-24'];

  assert.equal(linhas.length, 2);
  assert.equal(linhas[1].refeicao, 'Almoço');
  assert.equal(linhas[1].gramas, 120);
  assert.notEqual(linhas[1].id, 'origem-1');
});

test('copia uma refeição substituindo apenas o mesmo slot', () => {
  prepararEstado();
  store.actualizar((estado) => {
    estado.diario['2026-09-23'] = [
      { id: 'origem-1', alimentoId: 'base-1', gramas: 120, refeicao: 'Almoço' },
    ];
    estado.diario['2026-09-24'] = [
      { id: 'antigo-1', alimentoId: 'base-2', gramas: 50, refeicao: 'Almoço' },
      { id: 'outro-1', alimentoId: 'base-3', gramas: 80, refeicao: 'Jantar' },
    ];
  });

  store.copiarRefeicao('2026-09-23', '2026-09-24', 'Almoço', 'substituir');
  const linhas = store.obter().diario['2026-09-24'];

  assert.equal(linhas.length, 2);
  assert.deepEqual(linhas.map((linha) => linha.refeicao), ['Jantar', 'Almoço']);
  assert.equal(linhas[1].gramas, 120);
});

test('confirma uma refeição planeada como registada', () => {
  prepararEstado();
  store.actualizar((estado) => {
    estado.diario['2026-09-24'] = [
      { id: 'planeado-1', alimentoId: 'base-1', gramas: 100, refeicao: 'Jantar', planeado: true },
    ];
  });

  store.confirmarPlaneada('2026-09-24', 'Jantar');

  assert.equal(store.obter().diario['2026-09-24'][0].planeado, undefined);
});

test('reflete o diário na ementa sem substituir um plano manual', () => {
  prepararEstado();
  store.actualizar((estado) => {
    estado.diario['2026-09-24'] = [
      { id: 'registo-1', alimentoId: 'base-1', gramas: 100, refeicao: 'Almoço' },
    ];
  });

  store.refletirDiarioNaEmenta('2026-09-24', 'Almoço');
  assert.equal(store.obter().ementa['2026-09-24'].Almoço.origem, 'diario');

  store.actualizar((estado) => {
    estado.ementa['2026-09-25'] = {
      Almoço: { nome: 'Plano manual', itens: [{ alimentoId: 'base-2', gramas: 200 }] },
    };
    estado.diario['2026-09-25'] = [
      { id: 'registo-2', alimentoId: 'base-1', gramas: 100, refeicao: 'Almoço' },
    ];
  });
  store.refletirDiarioNaEmenta('2026-09-25', 'Almoço');

  assert.equal(store.obter().ementa['2026-09-25'].Almoço.nome, 'Plano manual');
  assert.equal(store.obter().ementa['2026-09-25'].Almoço.itens[0].gramas, 200);
});
