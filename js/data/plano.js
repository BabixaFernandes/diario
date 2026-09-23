// Plano de treino 10 km — 21 Set a 8 Nov 2026
// Tipos: pt | facil | ergo | intervalos | longa | descanso | prova

// Valores neutros de arranque. Os alvos reais são introduzidos por cada pessoa
// no ecrã de Definições e ficam guardados só no dispositivo dela — nunca aqui.
export const ALVOS_PADRAO = {
  kcal: 2000,
  proteina: 140,
  hidratos: 220,
  gordura: 60,
  pesoInicial: null,
  pesoAlvo: null,
  // Água, em ml: o alvo de um dia parado, o que se acrescenta num dia com
  // treino, e o copo com que se conta (para registar num toque).
  aguaMl: 2000,
  aguaExtraTreino: 500,
  copoMl: 250,
  // Quantos PT já tinham sido feitos no mês em que o plano arranca, antes do
  // primeiro dia dele — o plano começa a meio de Setembro e não os conhece.
  ptAntes: 0,
  // Quantos PT tem um mês normal, para se ver quando um mês foge ao pacote.
  ptPorMes: 8,
  // Mostrar os ritmos em km/h de passadeira ou em min/km de rua.
  modoRitmo: 'passadeira',
  configurado: false,
};

export const RITMOS = [
  { ritmo: 'Caminhada', kmh: '5,5 - 6,0', uso: 'Recuperação entre intervalos' },
  { ritmo: '9:00/km', kmh: '6,7', uso: 'Trote de aquecimento' },
  { ritmo: '8:30/km', kmh: '7,0', uso: 'Ritmo base — fácil e longa', destaque: true },
  { ritmo: '7:10/km', kmh: '8,4', uso: 'Primeiros 2 km da prova', destaque: true },
  { ritmo: '7:00/km', kmh: '8,6', uso: 'Ritmo de prova — km 3 a 8', destaque: true },
  { ritmo: '6:50/km', kmh: '8,8', uso: 'Final da prova' },
  { ritmo: '6:45/km', kmh: '8,9', uso: 'Intervalos', destaque: true },
];

const PT = (data, titulo = 'PT') => ({ data, tipo: 'pt', titulo });
const DESC = (data, titulo = 'Descanso') => ({ data, tipo: 'descanso', titulo });

export const PLANO = [
  {
    semana: 1,
    inicio: '2026-09-21',
    titulo: 'Entrada no bloco',
    nota: 'PT à segunda, terça e quinta — sobra a quarta e o domingo. Sem intervalos esta semana, e está bem assim: duas corridas é a forma certa de entrar num bloco novo.',
    sessoes: [
      PT('2026-09-21'),
      PT('2026-09-22'),
      {
        data: '2026-09-23', tipo: 'facil', titulo: 'Corrida fácil — 25 a 30 min',
        duracaoMin: 28,
        detalhe: 'Se vieres esmagada dos dois dias de PT, troca por 30 min de caminhada sem culpa nenhuma.',
        passadeira: '5 min a andar a 6,0 · 25 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      PT('2026-09-24'),
      DESC('2026-09-25'),
      DESC('2026-09-26'),
      {
        data: '2026-09-27', tipo: 'longa', titulo: 'Corrida longa — 6 km',
        distanciaKm: 6,
        detalhe: 'Alterna 9 min a correr com 1 min a andar, seis vezes. Não tentes fazer seguido.',
        passadeira: '9 min a 7,0 / 1 min a 5,5 — seis vezes · inclinação 1% · ~51 min',
      },
    ],
  },
  {
    semana: 2,
    inicio: '2026-09-28',
    titulo: 'Primeiros intervalos',
    nota: 'Os intervalos são no ergómetro — estímulo cardiovascular sem impacto nenhum na tíbia.',
    sessoes: [
      PT('2026-09-28'),
      {
        data: '2026-09-29', tipo: 'facil', titulo: 'Corrida fácil — 30 min',
        duracaoMin: 30,
        detalhe: 'Teste da conversa: tens de conseguir dizer uma frase inteira sem parar para respirar.',
        passadeira: '5 min a 6,0 · 30 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-09-30', tipo: 'ergo', titulo: 'Intervalos no ergómetro',
        detalhe: '8 min aquecimento · 5 × (3 min forte / 2 min leve) · 5 min retorno à calma. Ski Erg, remo ou bicicleta.',
        passadeira: 'Escolhe um split que consigas repetir em TODOS os blocos. Se o último for mais lento que o primeiro, saíste rápido de mais.',
      },
      PT('2026-10-01'),
      DESC('2026-10-02'),
      DESC('2026-10-03'),
      {
        data: '2026-10-04', tipo: 'longa', titulo: 'Corrida longa — 7 km',
        distanciaKm: 7,
        detalhe: 'Tenta seguida. Se precisares, 14 min a correr / 1 min a andar.',
        passadeira: '7,0 km/h · inclinação 1% · ~60 min',
      },
    ],
  },
  {
    semana: 3,
    inicio: '2026-10-05',
    titulo: 'A longa passa para a rua',
    nota: 'A partir deste domingo, a corrida longa faz-se na rua. A prova é na estrada e precisas de aprender a gerir o ritmo sem máquina nenhuma a travar-te.',
    sessoes: [
      PT('2026-10-05'),
      {
        data: '2026-10-06', tipo: 'facil', titulo: 'Corrida fácil — 30 a 35 min',
        duracaoMin: 33,
        passadeira: '5 min a 6,0 · 33 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-10-07', tipo: 'ergo', titulo: 'Intervalos no ergómetro',
        detalhe: '8 min aquecimento · 4 × (4 min forte / 2 min leve) · 5 min retorno à calma.',
        passadeira: 'Mesmo split em todos os blocos. Aponta-o e repete-o.',
      },
      PT('2026-10-08'),
      DESC('2026-10-09'),
      DESC('2026-10-10'),
      {
        data: '2026-10-11', tipo: 'longa', titulo: 'Corrida longa — 8 km',
        distanciaKm: 8,
        detalhe: 'Seguida, a ritmo fácil. Primeiros 2 km deliberadamente mais lentos — é aqui que se ensaia a prova.',
        passadeira: '7,0 km/h · percurso plano, evita cimento · ~69 min',
      },
    ],
  },
  {
    semana: 4,
    inicio: '2026-10-12',
    titulo: 'Semana de alívio',
    nota: 'A longa desce de propósito para abrir espaço aos primeiros intervalos a correr. Não é preguiça, é planeamento.',
    sessoes: [
      PT('2026-10-12'),
      {
        data: '2026-10-13', tipo: 'facil', titulo: 'Corrida fácil — 30 min',
        duracaoMin: 30,
        passadeira: '5 min a 6,0 · 30 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-10-14', tipo: 'intervalos', titulo: 'Primeiros intervalos a correr',
        detalhe: '10 min a trote · 5 × (2 min a 6:45/km / 2 min a andar) · 5 min a trote.',
        passadeira: '10 min a 6,7 · 5 × (2 min a 8,9 / 2 min a 5,5) · 5 min a 6,5 · inclinação 1%',
      },
      PT('2026-10-15'),
      DESC('2026-10-16'),
      DESC('2026-10-17'),
      {
        data: '2026-10-18', tipo: 'longa', titulo: 'Corrida longa — 6 km',
        distanciaKm: 6,
        detalhe: 'Fácil. Semana de alívio — resiste à tentação de fazer mais.',
        passadeira: '7,0 km/h · ~51 min',
      },
    ],
  },
  {
    semana: 5,
    inicio: '2026-10-19',
    titulo: 'Construção',
    nota: 'A longa salta para 9 km. Avisa o PT que domingo é dia de corrida longa — a segunda-feira não pode ser um treino máximo de pernas.',
    sessoes: [
      PT('2026-10-19'),
      {
        data: '2026-10-20', tipo: 'facil', titulo: 'Corrida fácil — 35 min',
        duracaoMin: 35,
        passadeira: '5 min a 6,0 · 35 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-10-21', tipo: 'intervalos', titulo: 'Intervalos',
        detalhe: '10 min a trote · 5 × (3 min a 6:45/km / 2 min a andar) · 5 min a trote.',
        passadeira: '10 min a 6,7 · 5 × (3 min a 8,9 / 2 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-10-22'),
      DESC('2026-10-23'),
      DESC('2026-10-24'),
      {
        data: '2026-10-25', tipo: 'longa', titulo: 'Corrida longa — 9 km, os últimos 2 a ritmo',
        distanciaKm: 9,
        detalhe: '7 km fáceis e os últimos 2 km a ritmo de prova. É o primeiro ensaio de acabar rápido com as pernas já cansadas. Leva água.',
        passadeira: '7 km a 7,0 · 2 km a 8,6 · ~74 min',
      },
    ],
  },
  {
    semana: 6,
    inicio: '2026-10-26',
    titulo: 'A semana mais dura',
    nota: 'O domingo desta semana é o que decide a tua prova.',
    sessoes: [
      PT('2026-10-26'),
      {
        data: '2026-10-27', tipo: 'facil', titulo: 'Corrida fácil — 35 min',
        duracaoMin: 35,
        passadeira: '5 min a 6,0 · 35 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-10-28', tipo: 'intervalos', titulo: 'Intervalos — 4 × 5 min a ritmo de prova',
        detalhe: '10 min a trote · 4 × (5 min a 7:00/km, ritmo de prova / 2 min a andar) · 5 min a trote. Todos os blocos ao mesmo ritmo.',
        passadeira: '10 min a 6,7 · 4 × (5 min a 8,6 / 2 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-10-29'),
      DESC('2026-10-30'),
      DESC('2026-10-31'),
      {
        data: '2026-11-01', tipo: 'longa', titulo: 'Corrida longa — 10 km',
        distanciaKm: 10,
        detalhe: 'Não é para fazer tempo. É para o teu corpo e a tua cabeça saberem, uma semana antes, que a distância é possível. Vai devagar de propósito.',
        passadeira: '7,0 km/h · ~86 min',
      },
    ],
  },
  {
    semana: 7,
    inicio: '2026-11-02',
    titulo: 'Descarga e prova',
    nota: 'Vais sentir-te com energia a mais e tentada a treinar mais. Não o faças. A forma constrói-se na recuperação, não nos últimos sete dias.',
    sessoes: [
      PT('2026-11-02', 'PT leve — pede para aliviar as pernas'),
      {
        data: '2026-11-03', tipo: 'facil', titulo: 'Corrida fácil — 25 min',
        duracaoMin: 25,
        passadeira: '5 min a 6,0 · 25 min a 7,0 · 3 min a 5,5',
      },
      {
        data: '2026-11-04', tipo: 'intervalos', titulo: 'Activação',
        detalhe: '10 min a trote · 4 × (2 min a ritmo de prova / 2 min a andar) · 5 min a trote.',
        passadeira: '10 min a 6,7 · 4 × (2 min a 8,6 / 2 min a 5,5) · 5 min a 6,5',
      },
      DESC('2026-11-05', 'Descanso, ou PT muito leve sem pernas'),
      DESC('2026-11-06'),
      DESC('2026-11-07', 'Descanso ou 15 min de caminhada'),
      {
        data: '2026-11-08', tipo: 'prova', titulo: 'PROVA — 10 km',
        distanciaKm: 10,
        detalhe: 'km 1-2 a 7:10/km (mais lento de propósito) · km 3-8 a 7:00/km · km 9-10 a atacar. Se estiveres a ultrapassar pessoas nos primeiros 2 km, vais depressa de mais.',
        passadeira: 'km 1-2 a 8,4 · km 3-8 a 8,6 · km 9-10 a 8,8 · objectivo: menos de 70 min',
      },
    ],
  },

  // ---- Segundo bloco: 9 de Novembro a 13 de Dezembro ----
  // A distância já está resolvida. Estas cinco semanas são sobre tempo.
  {
    semana: 8,
    inicio: '2026-11-09',
    titulo: 'Recuperação',
    nota: 'Uma prova de 10 km cobra-se. Esta semana só tem as duas corridas fáceis — nada de intervalos, nada de longa a sério. A forma de Dezembro constrói-se em cima de pernas descansadas, não de pernas teimosas.',
    sessoes: [
      PT('2026-11-09'),
      {
        data: '2026-11-10', tipo: 'facil', titulo: 'Corrida fácil — 25 min',
        duracaoMin: 25,
        detalhe: 'Muito fácil. Se as pernas ainda estiverem pesadas da prova, caminha os 25 min e não penses mais nisso.',
        passadeira: '5 min a 6,0 · 25 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      DESC('2026-11-11', 'Descanso — sem intervalos esta semana'),
      PT('2026-11-12'),
      DESC('2026-11-13'),
      DESC('2026-11-14'),
      {
        data: '2026-11-15', tipo: 'longa', titulo: 'Corrida longa — 6 km, muito fácil',
        distanciaKm: 6,
        detalhe: 'Fácil a sério. Não é para testar nada.',
        passadeira: '6,7 km/h · ~53 min',
      },
    ],
  },
  {
    semana: 9,
    inicio: '2026-11-16',
    titulo: 'Volta o ritmo de prova',
    nota: 'Os intervalos mudam de objectivo: já não são para aguentar, são para aprender a viver ao ritmo a que queres correr em Dezembro. Blocos mais longos, e todos iguais.',
    sessoes: [
      PT('2026-11-16'),
      {
        data: '2026-11-17', tipo: 'facil', titulo: 'Corrida fácil — 30 min',
        duracaoMin: 30,
        passadeira: '5 min a 6,0 · 30 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-11-18', tipo: 'intervalos', titulo: 'Intervalos — 4 × 5 min a ritmo de prova',
        detalhe: '10 min a trote · 4 × (5 min a ritmo de prova / 2 min a andar) · 5 min a trote. O ritmo de prova é o que fizeste a 8 de Novembro, não o que gostavas de ter feito.',
        passadeira: '10 min a 6,7 · 4 × (5 min a {prova} / 2 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-11-19'),
      DESC('2026-11-20'),
      DESC('2026-11-21'),
      {
        data: '2026-11-22', tipo: 'longa', titulo: 'Corrida longa — 10 km',
        distanciaKm: 10,
        detalhe: 'Fácil do princípio ao fim. A distância já a fizeste em prova — hoje é só rodagem.',
        passadeira: '7,0 km/h · ~86 min',
      },
    ],
  },
  {
    semana: 10,
    inicio: '2026-11-23',
    titulo: 'Blocos mais longos',
    nota: 'Os intervalos sobem para 6 minutos. Se o quarto bloco for mais lento do que o primeiro, saíste rápido de mais — o mesmo erro de sempre, em ponto pequeno.',
    sessoes: [
      PT('2026-11-23'),
      {
        data: '2026-11-24', tipo: 'facil', titulo: 'Corrida fácil — 35 min',
        duracaoMin: 35,
        passadeira: '5 min a 6,0 · 35 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-11-25', tipo: 'intervalos', titulo: 'Intervalos — 4 × 6 min a ritmo de prova',
        detalhe: '10 min a trote · 4 × (6 min a ritmo de prova / 2 min a andar) · 5 min a trote.',
        passadeira: '10 min a 6,7 · 4 × (6 min a {prova} / 2 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-11-26'),
      DESC('2026-11-27'),
      DESC('2026-11-28'),
      {
        data: '2026-11-29', tipo: 'longa', titulo: 'Corrida longa — 11 km',
        distanciaKm: 11,
        detalhe: 'A mais longa de todo o bloco, e a ritmo fácil. Leva água.',
        passadeira: '7,0 km/h · ~95 min',
      },
    ],
  },
  {
    semana: 11,
    inicio: '2026-11-30',
    titulo: 'A semana que decide Dezembro',
    nota: 'Último trabalho a sério. O domingo tem os últimos 3 km a ritmo de prova com as pernas já cansadas — é o ensaio mais parecido com o que vais sentir no km 8.',
    sessoes: [
      PT('2026-11-30'),
      {
        data: '2026-12-01', tipo: 'facil', titulo: 'Corrida fácil — 35 min',
        duracaoMin: 35,
        passadeira: '5 min a 6,0 · 35 min a 7,0 · 3 min a 5,5 · inclinação 1%',
      },
      {
        data: '2026-12-02', tipo: 'intervalos', titulo: 'Intervalos — 3 × 8 min a ritmo de prova',
        detalhe: '10 min a trote · 3 × (8 min a ritmo de prova / 3 min a andar) · 5 min a trote. Blocos longos, para a cabeça se habituar a estar lá muito tempo.',
        passadeira: '10 min a 6,7 · 3 × (8 min a {prova} / 3 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-12-03'),
      DESC('2026-12-04'),
      DESC('2026-12-05'),
      {
        data: '2026-12-06', tipo: 'longa', titulo: 'Corrida longa — 11 km, os últimos 3 a ritmo',
        distanciaKm: 11,
        detalhe: 'Vai custar, e é suposto — é o ensaio do final da prova.',
        passadeira: '8 km a 7,0 · 3 km a {prova} · ~90 min',
      },
    ],
  },
  {
    semana: 12,
    inicio: '2026-12-07',
    titulo: 'Descarga e segunda prova',
    nota: 'Outra vez: vais sentir-te com energia a mais. Outra vez: não treines mais por isso. O trabalho está feito desde domingo passado.',
    sessoes: [
      PT('2026-12-07', 'PT leve — pede para aliviar as pernas'),
      {
        data: '2026-12-08', tipo: 'facil', titulo: 'Corrida fácil — 25 min',
        duracaoMin: 25,
        passadeira: '5 min a 6,0 · 25 min a 7,0 · 3 min a 5,5',
      },
      {
        data: '2026-12-09', tipo: 'intervalos', titulo: 'Activação — 4 × 2 min a ritmo de prova',
        detalhe: '10 min a trote · 4 × (2 min a ritmo de prova / 2 min a andar) · 5 min a trote. Curto de propósito: é para lembrar as pernas do ritmo, não para as cansar.',
        passadeira: '10 min a 6,7 · 4 × (2 min a {prova} / 2 min a 5,5) · 5 min a 6,5',
      },
      PT('2026-12-10', 'PT leve — sem pernas'),
      DESC('2026-12-11'),
      DESC('2026-12-12', 'Descanso ou 15 min de caminhada'),
      {
        data: '2026-12-13', tipo: 'prova', titulo: 'PROVA 2 — 10 km',
        distanciaKm: 10,
        detalhe: 'O objectivo é bater o tempo de 8 de Novembro. E bate-se da mesma maneira de sempre: os primeiros 2 km mais lentos do que te apetece. Quem ganha tempo no fim é quem o não perdeu no princípio.',
        passadeira: 'Ritmo alvo {alvo} — sai do tempo da primeira prova',
      },
    ],
  },

  // ---- Depois da segunda prova: só os dias de PT até ao fim do ano ----
  {
    semana: 13,
    inicio: '2026-12-14',
    titulo: 'Depois da prova — só PT',
    nota: 'Provas feitas. A corrida fica ao teu critério; o que está marcado é só o PT. É a partir daqui que o défice calórico pode voltar a ser a prioridade número um.',
    sessoes: [PT('2026-12-14'), PT('2026-12-17')],
  },
  {
    semana: 14,
    inicio: '2026-12-21',
    titulo: 'Semana de Natal',
    sessoes: [PT('2026-12-21'), PT('2026-12-24')],
  },
  {
    semana: 15,
    inicio: '2026-12-28',
    fim: '2026-12-31',
    titulo: 'Fim do ano',
    sessoes: [PT('2026-12-28'), PT('2026-12-31')],
  },
];

export const TODAS_SESSOES = PLANO.flatMap((s) => s.sessoes.map((x) => ({ ...x, semana: s.semana })));

export const TIPO_INFO = {
  pt: { label: 'PT', cor: 'roxo' },
  facil: { label: 'Fácil', cor: 'verde' },
  ergo: { label: 'Ergómetro', cor: 'azul' },
  intervalos: { label: 'Intervalos', cor: 'laranja' },
  longa: { label: 'Longa', cor: 'vermelho' },
  descanso: { label: 'Descanso', cor: 'cinza' },
  prova: { label: 'PROVA', cor: 'ouro' },
};
