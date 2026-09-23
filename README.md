# Diário

Plano de treino, registo de peso, contagem de calorias e acompanhamento do ciclo, tudo num só
sítio. Nasceu como a app dos 10 km de **8 de Novembro de 2026** e da segunda prova a
**13 de Dezembro** — o plano de treino ainda é esse, só a app é que passou a ter nome próprio.

Feita a primeira prova, a contagem decrescente vira-se para a segunda e o objectivo deixa de
ser a distância: passa a ser **bater o tempo da primeira por 2 a 3 minutos**. O alvo é calculado
a partir do tempo que ficou registado a 8 de Novembro, e não de um número decidido de antemão —
por isso só aparece depois de esse tempo estar lá.

É uma PWA: um site que o Android guarda no ecrã inicial com ícone próprio, abre em ecrã
inteiro sem barra do browser e funciona sem internet.

O plano vai de **21 de Setembro a 31 de Dezembro de 2026**: sete semanas até à primeira prova,
cinco de trabalho de ritmo até à segunda, e depois só os dias de PT até ao fim do ano.

## Ver a app no PC

```
npm start
```

Abre <http://localhost:4322>. Não precisa de instalar nada — o servidor não tem dependências.

## Publicar no GitHub Pages

O repositório local já está criado e com o primeiro commit feito. Faltam três passos, todos teus
porque envolvem a tua conta:

**1.** Em <https://github.com/new>, cria um repositório chamado `diario`.
Deixa-o **vazio** — sem README, sem .gitignore, sem licença.

**2.** No terminal, dentro desta pasta (substitui `UTILIZADOR` pelo teu nome de utilizador do GitHub):

```bash
git remote add origin https://github.com/UTILIZADOR/diario.git
git push -u origin main
```

**3.** No repositório, vai a **Settings → Pages**, e em *Source* escolhe **Deploy from a branch**,
com branch `main` e pasta `/ (root)`. Guarda.

Um ou dois minutos depois a app fica em:

```
https://UTILIZADOR.github.io/diario/
```

Este é um site **novo e independente** do `app-treino` que já existia: fica noutro endereço, e por
isso não mexe em nada de quem já usa esse — os dados de cada um vivem presos ao site onde foram
criados. Se quiseres continuar aqui com o que já tinhas lá, exporta a cópia de segurança na app
antiga e importa-a nesta, uma única vez.

## Instalar no telemóvel

**Android (Chrome):** abre o endereço → menu ⋮ → **Adicionar ao ecrã principal**.

**iPhone (Safari):** abre o endereço **no Safari** → botão Partilhar (o quadrado com a seta)
→ **Adicionar ao ecrã principal**. Tem de ser o Safari; noutros browsers do iPhone a opção
pode não aparecer.

Da primeira vez que abres, a app pergunta os teus alvos e tem uma calculadora que os estima
a partir do peso, altura, idade e nível de actividade. Cada pessoa tem os seus, no seu
dispositivo.

## Podem usá-la várias pessoas?

Sim. Cada dispositivo guarda os seus próprios dados, sem qualquer ligação entre eles —
mesma app, alvos e registos independentes. O plano de treino das 7 semanas é que é comum
a todos.

## O separador Mês

É o único ecrã onde as quatro coisas que a app guarda por data — treinos, peso, comida e ciclo —
aparecem no mesmo eixo. Os outros separadores respondem bem a *o que faço hoje*; este responde a
*como é que este mês está*, e é onde os padrões aparecem: o ritmo semanal das sessões, os dias sem
registo, as fases do ciclo ao longo do bloco.

Cada dia mostra:

| Marca | O que é |
|---|---|
| Ponto colorido | Uma sessão, na cor do tipo. Apagado se ainda não foi feita, com ✓ se foi |
| Fundo vermelho e ⚠ | Dor na canela registada nesse dia |
| Cor por baixo | A fase do ciclo — **tracejada** quando é projectada em vez de medida |
| Ponto azul / verde no topo | Houve pesagem / houve comida registada |

Tocar num dia abre-o: a fase e o dia do ciclo, as sessões com o que ficou registado (tocar numa
abre o mesmo diálogo de registo do separador Treinos), um campo para o peso daquele dia, e os
totais de comida contra os alvos.

A navegação limita-se aos meses que o plano cobre — Setembro a Dezembro — em vez de deixar
navegar para o vazio.

A dor na canela marca **o dia inteiro** e não só o ponto da sessão. Num ponto de 11 px ninguém a
via, e é o sinal que está acima de tudo na hierarquia do plano: um mês onde se vê logo que houve
três dias com dor vale mais do que qualquer média.

## Quando a semana muda

O plano é um ponto de partida, não uma jaula. Cada sessão tem dois botões:

| Botão | O que faz |
|---|---|
| ✎ | Editar: dia, tipo, título, indicações, ritmos, distância — e apagar a sessão |
| ⇄ | Trocar de dia com outra sessão da mesma semana |

No fim de cada semana há ainda **+ Acrescentar sessão**, para os treinos que o plano não
previu. Um dia pode ficar com duas sessões.

Apagar uma sessão do plano transforma-a em **dia de descanso** — o dia não fica vazio, e a
sessão volta com o repor. Uma sessão acrescentada por ti desaparece mesmo.

As confirmações usam o diálogo da própria app e não o `confirm()` do browser, que em PWA
instalada há contextos em que simplesmente não aparece — e um botão que não faz nada é pior
do que não ter botão.

O que fica registado (distância, tempo, esforço, dor na canela) **acompanha a sessão**, não
o dia: o registo é guardado com a data original do plano, e as alterações ficam à parte, em
mapas próprios (`ajustes`, `edicoes`, `removidas`, `extras`). Por isso é que
**repor o plano original** devolve a semana inteira ao sítio — dias, conteúdos, sessões
apagadas e sessões acrescentadas — sem tocar nos registos das sessões do plano.

Há dois avisos, que assinalam mas não impedem:

- **tira a longa de domingo** — a corrida longa ao domingo é a regra fixa do plano.
- **dois treinos duros seguidos** (ou no mesmo dia) — aparece no topo da semana.

A prova não se edita nem se move.

## Passadeira ou rua

No topo do separador há um interruptor **Passadeira / Rua**. A prescrição de cada sessão é
escrita uma só vez, em velocidades de passadeira, e converte-se para pace quando se escolhe
a rua:

```
🏃  5 min a 6,0 · 33 min a 7,0 · 3 min a 5,5 · inclinação 1%
🛣️  5 min a 10:00/km · 33 min a 8:34/km · 3 min a 10:55/km
```

A inclinação desaparece no modo rua, onde não quer dizer nada. A escolha fica guardada.

Nas semanas 9 a 12 o plano diz *ritmo de prova*, que não é um número decidido de antemão:
é o que ela fizer a 8 de Novembro. Essas sessões escrevem-se com o marcador `{prova}`, e a
app substitui-o pelo ritmo que sai do tempo registado na primeira prova — em km/h ou em
min/km, conforme o modo. O `{alvo}` faz o mesmo para a segunda prova, mas com os 2 a 3
minutos a ganhar já descontados. Enquanto não houver tempo registado, dizem-no em vez de
inventar um número.

## Contagem dos treinos de PT

Cada sessão de PT mostra em que número do mês vai — *treino 5 de 8* — e no fim do
separador há um resumo por mês que assinala quando um mês foge ao pacote (*+1*, *-1*).

Duas regras que não são óbvias:

- **A contagem segue o dia que a sessão tem no plano, não o dia em que foi feita.**
  Um PT marcado para 1 de Outubro que se antecipe para 30 de Setembro continua a
  descontar do pacote de Outubro.
- **Um mês que o plano não cubra até ao fim não é comparado com o pacote** — diz apenas
  quantos tem. É o caso de Novembro, em que o plano acaba no dia da prova.

O tamanho do pacote e quantos PT já tinhas feito antes de o plano começar definem-se
nas definições. São dados teus, por isso ficam no dispositivo e não no código.

## Balanço da semana

Aparece no topo da semana **a decorrer** — *"Semana 1, até agora"* — e fica lá como balanço
fechado quando a semana acaba. Nas semanas futuras não aparece nada.

Numa semana a meio só contam os dias que já passaram, e uma sessão só falta depois de o dia
acabar: a de hoje ainda está a tempo. É de propósito que aparece antes do fim — saber à quarta
que a corrida de terça saiu rápida dá tempo de corrigir; saber na segunda seguinte não dá nada.

O que mostra: sessões feitas, a longa, o ritmo
médio das corridas fáceis, registos de dor na canela, a média do peso contra a da semana
anterior, a média de calorias e proteína dos dias registados, e a média de água.

**Os números estão colapsados; o recado não.** Colapsar tudo mataria a razão de existir — era
preciso abrir o cartão para descobrir que valia a pena abri-lo. Assim uma semana boa ocupa duas
linhas e uma semana com problema grita à mesma.

Vêm **no máximo dois recados**, por esta ordem de prioridade:

1. **Dor na canela** — passa à frente de tudo, com a regra de paragem do plano.
2. **A longa não feita** — a única sessão que não se salta.
3. **Fáceis corridas depressa de mais** — acima de 8:05/km, ou seja o limite de 8:15 com
   10 s de tolerância, para o aviso não disparar por causa do GPS.
4. **A média do peso parada** face aos −0,4 kg/semana.
5. **Proteína abaixo de 90% do alvo** — e só com 5 ou mais dias registados; com menos,
   diz que não tem dados em vez de tirar conclusões.
6. **Dias de treino com pouca água** — dois ou mais dias com treino abaixo de 80% do alvo
   daquele dia, e só com 4 ou mais dias de água registados. É o último da lista de propósito:
   sendo o recado menos grave, só chega à superfície numa semana em que não há canela, longa
   falhada nem proteína em falta — que é exactamente quando vale a pena lê-lo. Nos dias de
   descanso não conta, porque uma garrafa a menos num sábado parado não muda nada.

Um recado que não passa o corte **não desaparece**: o número fica sempre na lista colapsada e no
texto do botão *Copiar*. O limite de dois é sobre o que grita, não sobre o que se sabe.

Não há modelo nenhum por trás disto: são as regras do plano aplicadas aos registos, e corre
offline como o resto da app. Para uma leitura a sério há o botão **Copiar**, que põe a semana
inteira em texto — sessão por sessão — para colar numa conversa com o Claude e pedir o que
umas regras não conseguem dar. Se o telemóvel não deixar copiar, abre o texto já selecionado.

## Ciclo

O separador **Ciclo** tem dois botões — *o período começou hoje* e, enquanto houver um período
aberto, *o período acabou hoje* — e, opcionalmente, dores / cansaço / fluxo em três níveis nos
últimos três dias. Daí a app deriva a fase e mostra-a como etiqueta em cada sessão de treino,
com o dia do ciclo no tooltip.

Nada é assumido quando pode ser medido:

- **A duração do ciclo** sai da média dos ciclos dela, não dos 28 dias por omissão — assumir 28
  é um dos erros metodológicos que a literatura aponta. Sem dois períodos registados usa 28 e di-lo.
- **A duração da menstruação** sai dos períodos que tenham fim marcado. Sem nenhum, usa 5 dias e
  a fase aparece com asterisco. Marcado o fim, a menstruação passa a medida e o asterisco cai —
  e a fronteira entre menstruação e folicular muda em consequência.
- As fases **pós-menstruais levam sempre asterisco**, porque sem temperatura ou testes a ovulação
  é estimada e apresentá-la como facto seria desonesto.

Na lista de períodos, a duração é clicável para reabrir um período fechado por erro, e mostra
quantos dias desse ciclo tiveram sintomas fortes. O `×` apaga o registo todo.

**Marcar noutra data.** Os botões rápidos são para hoje, mas há um campo de data para os dias
esquecidos — e é importante que exista: tudo o que a app calcula sai dessa data, e um início
errado por dois dias desloca as fases todas. Marcar um início a menos de 10 dias de um já
registado **corrige-o** em vez de criar outro período; sem essa regra, corrigir uma data deixava
dois inícios juntos e a média do ciclo passava a contar um intervalo de dois dias.

**Previsão.** O cartão do topo diz quando é previsto o próximo período, e um cartão à parte diz em
que fase caem as provas de 8 de Novembro e 13 de Dezembro — projectado a partir da média, e
marcado como projecção. Serve para saber com o que contar, não para mudar o plano.

**Calendário.** O ciclo actual aparece dia a dia, com a fase por baixo de cada dia e a cor do
fundo a marcar sintomas leves ou fortes. Qualquer dia passado é tocável para registar em atraso.

**Irregularidade.** Quando o ciclo mais curto e o mais longo diferem 5 dias ou mais, a app diz o
intervalo real e avisa que as fases e a previsão são palpites largos — em vez de apresentar uma
média com a mesma cara de sempre.

### Como as médias se comportam ao longo do tempo

As três médias — duração do ciclo, duração do período, e a tabela por fase — recalculam sobre
**tudo** o que está registado, sem janela nem pesos. Com poucos ciclos é o correcto; se um dia
houver um ano de dados e um mês estranho estiver a distorcer, aí vale a pena passar a usar só os
últimos seis.

Mas as fases de um ciclo **não** saem da média global. Saem da duração real desse ciclo, que é o
intervalo até ao período seguinte:

- Enquanto um ciclo está **aberto** (ainda não veio o período seguinte), as fases dele são
  estimadas pela média e **vão ser revistas** quando ele fechar. Se o ciclo acabar por durar 35
  dias em vez de 28, a ovulação passa do dia 14 para o 21 e uma sessão reclassifica-se — porque a
  estimativa estava errada, não porque a app mudou de ideias.
- Um ciclo já **fechado** tem duração conhecida e as fases dele **nunca mais mudam**.

Antes esta distinção não existia: todas as fases saíam da média global, e cada período novo
reclassificava sessões de meses atrás sem ninguém tocar em nada.

### Porque é que a app não muda os treinos por causa da fase

Porque a evidência não o sustenta. A meta-análise de referência
([McNulty et al., *Sports Medicine* 2020](https://pubmed.ncbi.nlm.nih.gov/32661839/)) encontra um
efeito médio **trivial** da fase no desempenho, com grande sobreposição entre fases; uma
[revisão de 2025 restrita a estudos de metodologia exigente](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00223.2025)
encontra efeitos em 58% dos estudos mas com direcção e magnitude inconsistentes. O que é
consistente é a variabilidade individual.

Logo: a app **mede e revela o padrão dela**, e não aplica regras de manual. A secção
*O teu padrão* compara ritmo e esforço médios por fase, e **só aparece com dois ciclos
completos** — antes disso diz quantos faltam, em vez de produzir um número que a levaria a
mudar treinos sem motivo.

Essa comparação usa **só as corridas fáceis**, e só com duas ou mais na mesma fase. Juntar longas
e intervalos no mesmo «ritmo médio» dava um número que refletia a distribuição do calendário —
que tipo de sessão calhou em que fase — e não a fase. As fáceis têm todas o mesmo ritmo prescrito
e duração parecida, por isso uma diferença entre fases é sinal. A coluna *Fáceis* mostra
`2 de 3` para o tamanho da amostra ficar à vista.

A única coisa que o balanço semanal diz sobre o ciclo é contexto, e só quando houve falhas ou
dor na canela **e** dias marcados como fortes: serve para uma semana difícil não ser lida como
perda de forma.

## O separador Peso

**O gráfico tem duas coisas no mesmo eixo:** o peso de cada dia em pontos soltos e a média da
semana em linha cheia. É a forma de se ver com os olhos que os dentes de 1 a 2 kg de um dia para
o outro são água, e que a linha por baixo deles é a única coisa que está de facto a acontecer.
Aparece a partir de três pesagens. Se houver um peso alvo definido e ele couber no que está
desenhado, entra como linha tracejada; um alvo 8 kg abaixo ficava de fora, porque esmagava a
evolução toda contra o topo do gráfico.

O eixo do x é **o tempo a sério**, não a ordem dos registos. Uma semana em que não te pesaste tem
de aparecer como um vazio, e não encolhida até parecer um dia — senão o gráfico mente sobre o
ritmo. Já a média da semana fica no meio dos dias que essa semana tem, e não na segunda-feira,
que podia ser um dia sem pesagem nenhuma.

**Registar noutro dia.** O botão abre em *ontem*, que é o caso que traz alguém ali: a pesagem que
ficou esquecida. Datas futuras não passam. E cada linha dos *Últimos registos* abre-se ao toque
para corrigir o valor ou apagar a pesagem — a lista mostra também a diferença para o registo
anterior, que é o número que se procura quando se olha para ela.

## O separador Comida

O registo alimentar não se abandona por falta de funcionalidades — abandona-se por cansaço. Cada
entrada eram seis passos, e num dia de dez itens isso são setenta interacções. Tudo aqui vai no
sentido de **menos toques por dia**:

**Líquidos em ml.** O leite, o azeite e qualquer bebida que crie medem-se em mililitros — no
diário, no selector, na ementa e na lista de compras. Por dentro guarda-se sempre em **gramas**,
que é a unidade dos valores nutricionais, e a conversão usa a densidade de cada um: 1,03 g/ml no
leite, 0,91 no azeite. A conta 1:1 está certa no leite mas erra 9% no azeite, e num alimento de
884 kcal/100 g isso são 11 kcal por colher.

Ao criar um alimento há uma caixa *É líquido — mede-se em ml*; com ela marcada os textos passam a
dizer *por 100 ml*, que é o que vem no rótulo de uma bebida, e a densidade fica em 1 — a essa
densidade as duas contas dão o mesmo, e é o caso da quase totalidade das bebidas.

Isto obrigou a corrigir dois erros nos dados de base, que estavam escritos em gramas a 1:1: o copo
de leite era *200 g* (é 200 ml, ou seja 206 g) e a colher de azeite era *10 g* (uma colher de sopa
são 15 ml, ou seja 14 g). E os valores do leite estavam por 100 ml, como vêm no pacote, quando a
app conta por 100 g. Depois de acertados, um copo dá 92 kcal e uma colher de azeite 124 — os dois
certos. Os registos antigos não mudam, porque guardam gramas; só as entradas novas feitas
*por porção* é que passam a usar os valores corrigidos.

Na lista de alimentos das Definições a linha dos macros diz sempre **/ 100 g**, mesmo nos
líquidos: é a unidade a que o número se refere, e escrever */ 100 ml* ao lado de um valor por
100 g era uma mentira de 3%.

**Porções.** Cada alimento sabe o que é na vida real — um ovo são 55 g, uma fatia de pão 35 g, uma
lata de atum 80 g. Escreves `2 ovos` em vez de 110 g, e a app guarda gramas por baixo. O diário
mostra as duas coisas: *2 ovos · 110 g*. Alimentos criados por ti podem ter porção também.

Os plurais irregulares estão escritos nos dados (`colheres de sopa`, `requeijões`,
`batatas médias`), porque o `+s` ingénuo dava *colher de sopas*. E o campo diz
*Quantidade (fatias)* em vez de *quantas/quantos* — o género de cada porção não é adivinhável.

**Mais usados primeiro.** O diálogo de adicionar abre com os alimentos que mais usaste, ordenados
por frequência. Sem isso, o iogurte de todas as manhãs ficava ao mesmo nível do bacalhau que
comeste uma vez.

**Copiar um dia.** Um toque traz as entradas de outro dia, com os totais à vista para escolheres
qual. Come-se parecido de um dia para o outro, e isto elimina o trabalho de dias inteiros.

**Refeição adivinhada pela hora.** Às 13h o campo vem em *Almoço*.

**Editar uma entrada.** Tocar numa linha do diário abre-a — e abre **na unidade em que foi
registada**. Abrir sempre em gramas era a maneira mais fácil de trocar «3 fatias» por «3 gramas»
sem se dar por isso.

**Tirar uma entrada, com desfazer.** Cada linha tem um **×** à direita: um alimento posto por
engano sai num toque, sem abrir nada. O corpo da linha continua a abrir para corrigir, e o × tem
alvo de toque próprio, afastado, para o dedo não escorregar de um para o outro.

Como um × ao lado de uma zona que também se toca é um convite a apagar sem querer, aparece uma
faixa **«Arroz cozido — tirado · Desfazer»**. O desfazer guarda o **dia inteiro**, e não a linha
tirada: assim o mesmo botão serve para o × de uma linha e para o × de uma refeição da ementa, com
a marca de *da ementa* incluída, e não há dois caminhos a manter. Trocar de dia limpa a faixa,
que era de outro dia.

**As refeições não se guardam a partir daqui.** Criar e reaproveitar uma refeição é trabalho da
*ementa* — lá escolhes os alimentos de um dia e, se quiseres reutilizá-la noutra semana, há um
botão *guardar também como refeição reutilizável* dentro do próprio editor. Isto mantém o diário
simples: um alimento de cada vez, e a refeição toda só quando vem da ementa.

**Média da semana.** Calorias e proteína médias dos dias registados, que é o número que decide se
ajustas as calorias — não o total de um dia. Conta só os dias com registo, e com menos de quatro
di-lo em vez de apresentar uma média de três dias como se fosse de sete.

O alvo de calorias **não muda nos dias de treino**, de propósito: o plano fixa 2100 kcal todos os
dias, e um alvo que se move sozinho tira a única referência estável que há.

**Água.** Um cartão próprio, acima dos botões. A fila de copos é o registo: tocas no quarto copo
e o dia fica em quatro — um toque, não seis. Os botões `+ copo`, `+ 500 ml` e `−` somam e
subtraem para as quantidades que não dão copos redondos, e `…` abre um campo para escrever o
total exacto. Deixar esse campo em branco **apaga** o registo do dia, que não é a mesma coisa que
zero: zero é *bebi muito pouco*, apagado é *não registei* — e só os dias registados entram na
média da semana.

Ao contrário das calorias, o alvo da água **muda com o dia**: 2,0 L num dia parado e 2,5 L num dia
com treino ou PT. Aqui um alvo que se move faz sentido, porque o que se perde num longão de
domingo não é comparável a um sábado de descanso. Os três números — alvo base, extra de treino e o
tamanho do teu copo — estão em *Definições*; mede o copo uma vez e não voltas a pensar nisso.

**Suplementos.** Três checks fixos — creatina, colagénio, vitamina C — por dia, e um botão
*+ Suplemento* para acrescentar outros que precises de acompanhar (ex.: magnésio). Um suplemento
acrescentado por ti pode voltar a sair da lista de escolha; o que já ficou marcado em dias
passados não desaparece com ele.

## Ementa da semana e lista de compras

O caso de uso que manda no desenho: **ao domingo, planear a semana que vem de segunda a domingo,
e ficar com a lista de compras pronta** para ir às compras nesse mesmo fim de semana.

**A ementa tem a sua própria navegação de semanas**, independente do dia que está aberto no
diário — planear a semana que vem não pode obrigar a folhear dias. Na semana actual há um atalho
directo, *Planear a próxima semana ›*.

**Cada lugar da ementa guarda a refeição por dentro.** Tocas em *+ Almoço* no dia que quiseres e
escolhes os alimentos ali, na hora. Foi uma correcção de rumo: a primeira versão obrigava a criar
*refeições guardadas* antes de se poder planear uma semana, o que é pôr uma abstração à frente da
tarefa. As refeições guardadas e a semana-tipo passaram a ser **atalhos para encher mais depressa,
nunca pré-requisitos**.

**Uma refeição em vários dias de uma vez.** Dentro do editor há uma fila com os sete dias, e os
dias acesos são os que levam aquela refeição. Encher sete dias × quatro refeições um diálogo de
cada vez são 28 diálogos, e é aí que se desiste de planear uma semana. A fila também serve para
tirar a refeição de um dia, ou para a mudar de dia.

Duas garantias, porque um controlo destes tem de dizer a verdade:

- Apagar um dia só tira a refeição desse lugar se for **exactamente** esta. Um dia com outro
  almoço fica como está — o controlo é sobre esta refeição, não sobre o lugar.
- Os dias que já têm outro almoço aparecem com **•** a laranja. Acendê-los substitui o que lá
  está, e é melhor marcá-lo do que pedir uma confirmação que ninguém lê.

**Os quatro atalhos da semana:** copiar a semana anterior, usar a semana-tipo, gravar a semana
actual como semana-tipo, e limpar. Copiar e a semana-tipo **acrescentam aos dias livres** e não
apagam o que já puseste à mão.

**O nome de uma refeição é opcional.** Sem nome, os alimentos servem de nome — poupa um campo
obrigatório que ninguém quer preencher.

**A lista dos alimentos está nas Definições**, e não no separador Comida — é consulta e
arrumação, não uma coisa de uso diário. O diálogo de Definições tem as cinco secções — *Alvos e
medidas*, *Água*, *Peso*, *Treinos de PT*, *Os meus alimentos* — **todas fechadas e ao mesmo
nível**, num ecrã. Antes a lista estava no fim de um formulário longo, e ficava enterrada; a
alternativa de lhe dar um ícone próprio no cabeçalho punha uma coisa de uso mensal a competir em
destaque com o que se usa mais.

O formulário leva `novalidate` de propósito. Com a validação do browser, um campo obrigatório
vazio **dentro de uma secção fechada** bloqueava o guardar antes de o nosso código correr, e sem
mensagem nenhuma — o browser não consegue focar o que está escondido. Agora o guardar abre todas
as secções e só depois valida, para a mensagem aparecer em cima do campo certo. Mas o **+ Criar alimento** ficou no selector de alimentos,
que é o sítio onde se descobre que um alimento falta: pesquisas *skyr morango*, não há, e o botão
passa a dizer *+ Criar «skyr morango»* com o nome já preenchido. Ao guardar, volta ao selector com
o alimento novo lá, em vez de te deixar no diário a recomeçar o caminho.

**A semana-tipo e as refeições guardadas vivem dentro do cartão da ementa**, e não em cartões
próprios — são material de preparação, não coisas que se consultem todos os dias. O separador
tinha seis cartões de topo e passou a quatro.

**As refeições guardadas** estão no fim da ementa, e abrem-se no mesmo editor para serem
mudadas — antes só se podiam apagar. Mudar uma **não** reescreve as semanas onde já foi usada:
cada lugar da ementa tem a sua própria cópia, senão corrigir uma receita mudava listas de compras
já impressas. Dentro do editor de qualquer refeição da ementa há também *guardar também como
refeição reutilizável*, para o caminho inverso.

### A ementa preenche o dia

**Quando o dia chega, o que estava planeado entra no diário desse dia.** Não há cartão separado
nem botão a aplicar — isso era ter a mesma refeição duas vezes no mesmo ecrã. Abres o dia, as
refeições estão lá, e corriges o que não cumpriste.

Só para hoje e para trás. Encher o diário de uma semana que ainda não aconteceu era dar por comida
a comida do futuro, e deixava a média semanal a medir o plano inteiro.

**Cada linha vinda da ementa fica marcada** com *da ementa · confirmar*, e o cartão da refeição
fica tracejado até ela deixar de ser previsão:

| O que fazes | O que acontece |
|---|---|
| Tocas no **✓** | Comeste como estava planeado; a marca sai |
| Tocas no **×** | Não comeste; a refeição sai do diário e **não volta** |
| Corriges uma linha, acrescentas ou tiras algo | Essa refeição deixa de ser plano — corrigir *é* dizer o que comeste |
| Não fazes nada | Continua a contar nos macros do dia, mas a marca fica |

Os dois botões estão numa **faixa própria** dentro do cartão, entre o título e as linhas, e
dizem *Toda esta refeição veio da ementa* com **✓ Comi isto** e **× Não comi**. As linhas por
baixo levam todas uma marca azul à esquerda.

A primeira versão punha a etiqueta e dois símbolos soltos no cabeçalho da refeição. Encostados ao
título ficavam alinhados com a primeira linha, e liam-se como sendo **daquele alimento** em vez de
serem da refeição toda — foi assim que apareceram. A faixa e as marcas em todas as linhas resolvem
isso sem tirar nada: dizer *comi* ou *não comi* continua a não obrigar a abrir a refeição.

O × precisou de um registo próprio, `materializados`, com as refeições que já foram postas no
diário de cada dia. Sem ele o botão parecia não funcionar: a materialização corre ao desenhar o
dia, e punha a refeição de volta no mesmo instante em que ela saía. Mudar o plano dessa refeição
tira-a dessa lista, porque a versão nova é outra coisa e merece entrar.

A última linha é a que importa. Um dia sem confirmação **conta nos macros** — excluí-lo dizia
*3 de 7 dias registados* a quem cumpriu o plano à risca — mas a **média da semana e o balanço dizem
quantos dias vêm da ementa sem confirmação**. É a média semanal que manda cortar 150 kcal por dia,
por isso ela tem de dizer de onde vem, em vez de tratar uma intenção como um registo.

Isto foi uma inversão a meio: a primeira versão tinha o botão *Aplicar ao diário* por refeição.
Na prática era atrito e informação repetida, e ver as refeições do dia já preenchidas — para depois
as corrigir — é como as pessoas usam uma ementa.

### A lista de compras

É a soma dos alimentos de tudo o que essa semana tem planeado, agrupada por categoria, e **fica
guardada**: riscas no supermercado e no dia seguinte está como estava. É por semana, por isso a
lista da semana que vem já está pronta enquanto a desta ainda está a meio.

Cada alimento diz se se compra **a contar** ou **a peso**, com `compra: 'unidade'` nos dados. É a
diferença entre *7 ovos* e *6 doses de arroz* — a segunda não é coisa que se peça no
supermercado. As unidades arredondam para cima, porque não se compram 7,4 ovos, e o peso exacto
vai ao lado para quando é ele que interessa. Azeite e leite vão em litros.

As quantidades são as do alimento **cru**, mesmo quando o registas cozinhado ou grelhado — é
isso que se pede no supermercado, e não o peso já cozinhado. A conversão está nos dados de cada
alimento (`factorCru`): carne e peixe perdem água a cozinhar, por isso o cru pesa mais do que o
registado; arroz, massa e leguminosas absorvem água, por isso é o oposto. Um alimento sem
`factorCru` compra-se como se come (ovos, fruta, lacticínios, líquidos).

#### O carrinho no cabeçalho

O 🛒 abre a lista da semana em ecrã cheio, a partir de qualquer separador. É o único atalho no
cabeçalho que não é de configuração, e tem uma razão concreta: a lista é para ser usada **no
supermercado**, de mão na mão, e chegar lá passando pelo separador Comida e a descer até ao fim
do ecrã não serve nesse momento. Tem as setas para trocar de semana ali mesmo, porque a lista que
interessa no sábado é quase sempre a da semana seguinte.

Parte da mesma função que o cartão, a impressão e a imagem: o que se risca no supermercado aparece
riscado no separador, porque é o mesmo dado e não uma segunda cópia.

#### Levar a lista para fora da app

| Botão | O que faz |
|---|---|
| **Imprimir ou PDF** | Abre o diálogo de impressão do browser, que no Android e no PC tem *Guardar como PDF* |
| **Imagem para enviar** | Gera um PNG e abre o menu de partilha do telemóvel; no PC descarrega o ficheiro |

Nenhum dos dois usa bibliotecas. A impressão é uma folha `@media print` que esconde a app e
mostra só a lista, a preto no branco para não gastar tinta. O PNG é desenhado no `canvas` linha a
linha, e não convertido a partir do HTML — é a única forma que não precisa de uma dependência de
300 KB numa app sem build, nem de conversões que o browser possa recusar por causa de recursos
externos. Sai a 2× para não ficar desfocado num ecrã de telemóvel.

Os dois levam a lista inteira, com os artigos já comprados marcados e riscados em vez de
omitidos — imprimir antes de ir às compras e imprimir a meio têm de dar a mesma lista.

## Cópias de segurança

Os dados ficam guardados no próprio dispositivo (`localStorage`), não numa nuvem. Isto quer dizer:

- Cada dispositivo tem os seus dados. Não há sincronização automática entre o telemóvel e o PC.
- **Se limpares os dados de navegação do Chrome, perdes o histórico da app.**

Por isso há dois botões no canto superior direito:

| Botão | O que faz |
|---|---|
| 🛒 | Abre a lista de compras da semana |
| ⚙ | Definições: alvos, água, peso, PT e a lista de alimentos |
| ⤓ | Descarrega um ficheiro `.json` com tudo |
| ⤒ | Restaura a partir desse ficheiro |

Vale a pena exportar uma vez por semana — ao domingo, depois da corrida longa.

Um ficheiro exportado por uma versão mais antiga **importa-se sem problemas** numa versão mais
recente: a importação passa pelo mesmo caminho de migração que a app usa ao abrir os dados
guardados no dispositivo, incluindo preencher campos novos (como o `factorCru` de um alimento)
que a cópia antiga não tinha.

A versão instalada aparece em **Definições**, no fim do formulário.

## Estrutura

```
index.html              página única
app.css                 estilos
manifest.webmanifest    metadados da PWA (ícone, nome, cores)
sw.js                   service worker — faz a app funcionar offline
servidor.js             servidor estático para desenvolvimento
js/
  app.js                navegação entre separadores e cópias de segurança
  store.js              leitura e escrita de dados (ponto único)
  ciclo.js              fases do ciclo e análise por fase
  data/plano.js         as 7 semanas de treino (sem dados pessoais)
  data/alimentos.js     lista inicial de alimentos, por 100 g
  vistas/treinos.js     separador Treinos
  vistas/peso.js        separador Peso
  vistas/comida.js      separador Comida
  vistas/ementa.js      ementa da semana e lista de compras
  vistas/definicoes.js  alvos, calculadora de calorias e a lista de alimentos
  vistas/balanco.js     balanço da semana
  vistas/ciclo.js       separador Ciclo
  vistas/calendario.js  separador Mês
```

Nenhum dado pessoal está no código. Peso, altura, idade e alvos são introduzidos na app
e ficam apenas no dispositivo — o repositório pode ser público sem problema.

Toda a leitura e escrita de dados passa por `store.js`. Acrescentar sincronização na
nuvem mais tarde mexe só nesse ficheiro.

Ao alterar ficheiros, sobe a constante `VERSAO` em `sw.js` — caso contrário os dispositivos
continuam a servir a versão antiga que está em cache.

## Por fazer

- Sincronização entre telemóvel e PC
