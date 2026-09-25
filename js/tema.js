const CHAVE_TEMA = 'diario.tema';

export function obterTema() {
  return localStorage.getItem(CHAVE_TEMA) === 'claro' ? 'claro' : 'escuro';
}

export function aplicarTema(tema) {
  const escolhido = tema === 'claro' ? 'claro' : 'escuro';
  document.documentElement.dataset.tema = escolhido;
  localStorage.setItem(CHAVE_TEMA, escolhido);
}

export function iniciarTema() {
  aplicarTema(obterTema());
}