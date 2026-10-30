# Big O Player

Galeria de algoritmos com as contas à mostra, em forma de player de música: cada playlist é um problema (encontrar um item, ordenar uma lista…), e cada algoritmo é uma faixa, um jeito de resolvê-lo. O mapa do conteúdo está em `CONTENT_MAP.md`. O site tem quatro seções, nesta ordem:

- **Conceitos importantes** (`conceitos.json`) e **Fundamentos** (`fundamentos.json`): as duas playlists de vídeo, a de entrada e a da base. Cada uma só aparece quando algum vídeo tem `"video"` (o caminho do arquivo); sem vídeo, nada é mostrado. O `gerar.py` recusa vídeo que aponta para um arquivo que não existe.
- **Playlists** (`playlists.json`): as faixas agrupadas por problema, com as variações em subcategorias. Os problemas com uma faixa só ficam na galeria Problemas gerais (`"gerais": true`). Uma faixa pode morar em duas playlists; a rota dela usa a primeira. O `gerar.py` recusa faixa fora de qualquer playlist.
- **Algoritmos e estruturas**: a página de cada faixa e de cada estrutura de dados (`#estruturas/<nome>`; no código, as estruturas ainda se chamam instrumentos).

A faixa é uma simulação ao vivo, em JavaScript, no visual da skill `explainer-videos`: dá para embaralhar, mudar o tamanho e o tipo da entrada, a velocidade, andar passo a passo e ver, ao lado da animação, a linha do pseudocódigo que está rodando e as variáveis mudando a cada passo. O ritmo é constante (6 passos por segundo a 1×); o botão "accelerando" liga o ritmo que começa devagar e acelera. O pseudocódigo e o fluxograma ficam no encarte, como material de apoio. Cada faixa traz três medidas:

- **tempo**: operações contadas rodando a implementação (não estimadas);
- **memória**: pico de valores guardados além da entrada e da resposta;
- **caminhos**: complexidade ciclomática da função, por duas contas que precisam bater (decisões + 1 e arestas − nós + 2 no grafo de fluxo).

## Ver

Abra `index.html` no navegador (funciona sem servidor) ou sirva a pasta com o servidor do projeto, que atende pedidos por trecho do vídeo (o `python3 -m http.server` não atende, e o seletor de tempo não funciona nele):

```bash
python3 servir.py
```

## Regenerar tudo

```bash
python3 gerar.py --tudo
```

Para cada algoritmo: mede (`medir.py` → `dados.json`), confere contra uma referência no R (`conferir.R` → `conferencia.json`), gera o pôster (`video.py poster` → `.png`, a capa provisória) e junta tudo em `dados.js`, que a página lê. Os instrumentos (estruturas de dados) também são medidos (`instrumentos/<nome>/medir.py` → `dados.json`). Sem `--tudo`, só junta; e recusa uma faixa que credita um instrumento que não existe. Sempre, no fim, roda `testes/conferir_js.mjs`: o JavaScript do site tem de contar igual ao Python nas entradas guardadas (a do encarte e as de conferência: 7 vetores por ordenação, 20 buscas, 25 textos de parênteses, 15 sorteios de clientes, 15 sorteios de pacientes, 21 listas da inversão, 75 vetores da janela deslizante, 42 árvores dos percursos e da busca em árvore, 48 entradas da AVL, 15 grafos por busca em grafo e no Dijkstra, 8 textos da contagem de palavras, 76 vetores de achar repetidos, 56 tabelas por colisão, 61 vetores do máximo, 16 pares de matrizes, 22 n do fatorial e de cada Fibonacci, 59 buscas de padrão e 28 ajustes do FIGS) e, nos instrumentos, em cada chamada medida e em sequências sorteadas de operações.

Para exportar um clipe em vídeo de uma faixa: `python3 video.py` dentro da pasta do algoritmo (gera `.mp4`, que não vai para o repositório). Nas buscas, nos parênteses, nas filas de atendimento e de prioridade, na inversão da lista, na janela deslizante, nas três faixas de árvore, nas buscas em grafo, no Dijkstra e no álbum Primeiros passos, o `video.py` só faz o pôster, um quadro parado (`motor/video_casos.py`); a animação dessas faixas mora só na simulação ao vivo.

Requisitos: Python 3 com Pillow, Node, ffmpeg (só para exportar clipes), R com jsonlite e igraph, IBM Plex Mono instalada e a skill `explainer-videos` em `~/.claude/skills/` (o motor `engine.py` é importado de lá, sem cópia).

## Estrutura

```
motor/conta.py         contador de operações, memória (aloca, ocupa) e fotos de estado
motor/ciclomatica.py   M por decisões e por grafo de fluxo (recusa se não baterem)
motor/cena.py          peças de vídeo: texto, render MP4 por pipe, folha de contato, pôster
motor/ordenacao.py     molde das ordenações: ajudantes que contam (maior, troca, escreve) e a medição padrão
motor/ordenacao.R      as ordenações reescritas em R, para conferir contagens e ordem
motor/video_ordenacao.py  vídeo padrão de barrinhas (altura = valor; cor = papel da barra)
motor/busca.py         molde das buscas: os ajudantes que contam (igual, menor), as entradas e a medição padrão
motor/busca.R          as buscas reescritas em R, para conferir posição e comparações
motor/video_casos.py   pôsteres do álbum Primeiros passos, das buscas, dos parênteses, das filas de atendimento e de prioridade, da inversão da lista, da janela deslizante, das faixas de árvore, das buscas em grafo, do Dijkstra e do álbum Estatística
motor/grade.py         os grafos em grade k × k das buscas em grafo (sorteado, grade cheia, caminho), a medição delas e os pesos do Dijkstra
motor/heap.R           o heap do instrumento reescrito em R, contando casas, para conferir a fila de prioridade e o Dijkstra
motor/arvores.py       as entradas das faixas de árvore (crescente, decrescente, embaralhada, cheia) e a árvore comum montada fora da conta
motor/arvore.R         a árvore de busca e a AVL reescritas em R (vetores valor/esq/dir/altura), para conferir as três faixas de árvore
motor/colisao.py       a medição comum das duas faixas de colisão: o exemplo, as sondagens × α e o total × m
motor/colisao.R        as duas colisões refeitas em R com casas sorteadas, conferidas contra as fórmulas de Knuth
motor/fibonacci.py     a medição comum dos três Fibonacci: as mesmas somas para os mesmos n, as três séries em cada dados.json
motor/fibonacci.R      os três Fibonacci refeitos em R, contando as somas e o pico de memória, conferidos contra a fórmula de Binet
algoritmos/<nome>/     implementação instrumentada, medir.py, conferir.R, ficha.json, video.py
motor/instrumento.py   molde dos instrumentos: o custo medido de cada operação e as sequências que o JS refaz
instrumentos/<nome>/   estrutura instrumentada (cada leitura e escrita de casa conta 1), medir.py, ficha.json
simulacao/instrumentos.js  as mesmas estruturas em JS, com os eventos que a demo anima
instrumentos.js        a página do instrumento: placa, demo ao vivo, tabela de operações, gráficos, "toca em"
simulacao/algoritmos.js  os algoritmos em JS, contando como o Python, com a linha do pseudocódigo de cada evento
simulacao/palco.js     a simulação: estado de cada instante, linha do tempo e desenho em canvas
testes/conferir_js.mjs JS × Python nos mesmos vetores, textos, sorteios de clientes, grafos e amostras
gerar.py               junta tudo em dados.js (faixas, estruturas, playlists e vídeos) e roda o teste
playlists.json         as playlists por problema e a galeria Problemas gerais
fundamentos.json       os vídeos de Fundamentos (desligados até existir o primeiro)
conceitos.json         os vídeos de Conceitos importantes (desligados até existir o primeiro)
motor/identidade.py    gera og.png (1200 × 630, para compartilhar) e icone.png
motor/capas.py         recorta uma grade 2×2 de capas desenhadas e exporta para capas/ (240 e 480 px, e só a ilustração para 48 px)
capas/                 as capas desenhadas; a faixa sem capa usa o pôster de algoritmos/<nome>/<nome>.png
_config.yml            o que o GitHub Pages não publica (bastidor: docs, testes, motor, .py, .R, .json)
docs/redirecionamento/ o index.html que leva o endereço antigo (/eh-complexo-baby/) ao novo
index.html, estilo.css, galeria.js
docs/plans/            desenhos aprovados
```

## Instrumentos e o "feat."

Cada estrutura de dados é um instrumento, com página própria (`#instrumentos/<nome>`). Uma faixa credita os instrumentos que toca na ficha: `"instrumentos": [{"id": "pilha", "papel": "a pilha de recursão"}]`; o crédito aparece como "feat." na lista, no encarte, na barra e no palco.

Para acrescentar um instrumento: a estrutura em `instrumentos/<nome>/<nome>.py` (leituras e escritas por `conta.op()`), o `medir.py` com `ESTRUTURAS`, `ENCHER`, `OPERACOES` e `sortear` (veja `motor/instrumento.py`; o `ENCHER` pode ser uma função que monta a estrutura pronta, como o anel de medição do Grafo), a `ficha.json` (texto das operações e quais vão para o gráfico), a mesma estrutura em `simulacao/instrumentos.js`, e o nome em `INSTRUMENTOS` no `gerar.py` e no `testes/conferir_js.mjs`. A demo de um tipo novo de estrutura é desenhada em `instrumentos.js`.

A Fila e a Lista encadeada têm duas versões lado a lado (ingênua × circular; estática × dinâmica): cada operação da demo roda nas duas, e a tabela mede as duas. Na estática, as casas livres formam a lista de livres, encadeada pelo próprio próx, e o vetor dobra quando enche; na dinâmica, cada nó é pedido à memória (sem custo) e tem duas casas, valor e próx. O Deque é a fila circular com as duas pontas abertas.

O Heap (de mínimo, sobre o Vetor) mostra a árvore e o vetor ao mesmo tempo: são as mesmas casas, e cada operação acende a casa nas duas vistas; apontar um nó acende o pai e os filhos. A tabela compara as duas montagens (de uma vez, O(n), e um por um, O(n log n)), que partem do heap vazio: no `medir.py`, uma operação com `vazia` recebe os n valores nos argumentos.

A Árvore de busca tem a comum e a AVL lado a lado, com os mesmos valores. Cada nó da comum tem três casas (valor, esq, dir); o da AVL tem quatro (mais a altura). A demo desenha cada nó na coluna da sua ordem e na linha da sua profundidade; no meio de uma rotação a árvore fica quebrada, e o desenho congela até ela se religar e então desliza (os eventos `gira` e `girou` cercam cada rotação, sem custo). A árvore medida é montada com 0, 1, …, n − 1 em ordem: a comum vira uma fila indiana, a AVL fica com uns log₂ n níveis.

O Dicionário (tabela de dispersão) tem duas versões lado a lado: encadeamento (cada casa guarda o início de uma corrente de nós com chave, valor e próx) e sondagem linear (ocupada, tenta a casa seguinte; remover deixa uma lápide). A casa sai da dispersão multiplicativa de Knuth (os bits de cima de chave × 2654435769, em 32 bits; uma palavra vira número pelo polinômio de base 31), igual em Python e JS (o R das colisões sorteia as casas com `sample.int()`). As duas dobram m quando α = n/m passaria de 3/4; com `fixa`, m não muda. A medição põe chaves embaralhadas (`chave_medida`), porque chaves seguidas quase não colidem nessa dispersão. Fora as leituras e escritas, o registro conta `sondagens` e `comparacoes`.

A Matriz guarda as linhas × colunas casas num bloco só, linha a linha: a casa (i, j) mora no endereço i·colunas + j. A demo mostra a grade e o bloco ao mesmo tempo, e a casa lida ou escrita acende nas duas vistas; percorrer uma coluna lê o mesmo tanto que uma linha, pulando de colunas em colunas casas. A medição usa a matriz n × n (`quadrada`); transpor e criar custam n².

O Texto é um vetor de caracteres em duas versões lado a lado: concatenar no laço (o texto imutável, como a str do Python: acrescentar uma letra copia todas para um bloco novo) e juntar no fim (os pedaços numa lista sobre o Vetor, e um "".join que copia cada letra uma vez). A tabela compara montar n letras nas duas: perto de n² contra perto de 5n.

O Grafo tem três vistas lado a lado (matriz de adjacência, lista de adjacência e matriz de incidência): cada operação da demo roda nas três ao mesmo tempo, e a tabela mede as três num grafo de medição fixo, com V vértices e E = 3V arestas.

## Faixas que usam um instrumento por dentro

Os parênteses balanceados, a fila de atendimento, a inversão da lista e a janela deslizante rodam sobre as classes dos instrumentos, a `Pilha`, a `FilaCircular`, a `ListaDinamica` e o `Deque`, em Python (`instrumentos/*/`) e em JS (`simulacao/instrumentos.js`). O tempo conta as operações na estrutura (empilhar e desempilhar; enfileirar e desenfileirar); a memória é quantos valores ela guarda no pico (`conta.ocupa()`), sem a folga do vetor que dobra. O teste confere também as casas lidas e escritas por dentro da estrutura. A inversão conta os ponteiros trocados e não guarda nada além de três ponteiros. A janela deslizante conta as comparações entre valores, as suas e as do ingênuo (k − 1 por janela), e tem um segundo eixo nos gráficos: `tempo.por_k`, as mesmas contas com n fixo e k dobrando; o palco usa o seletor de k do K-means.

A fila de prioridade (o pronto-socorro) é a fila de atendimento com o `Heap` no lugar da fila: a chave é o par (gravidade, chegada), e o tempo conta os acessos ao heap, não as operações, para o log n aparecer. O heapsort mora no molde das ordenações, com o heap de máximo no próprio vetor; o palco desenha a árvore do heap acima das barras quando n ≤ 31.

O Dijkstra roda na mesma grade das buscas, com um peso de 1 a 9 sorteado por aresta; cada casa da lista de adjacência guarda o par (vizinho, peso). O heap reinsere o par quando a distância melhora e descarta o par vencido quando ele sai. O `conferir.R` usa o `distances()` do igraph e o heap de `motor/heap.R`.

As três faixas de árvore rodam sobre as árvores do instrumento. Os Percursos fazem uma descida recursiva só, que anota o nó em três momentos (pré, em e pós-ordem), e depois a em largura com a `FilaCircular`; a memória é o pico da pilha de chamadas (a altura + 1) ou o da fila. A Busca em árvore monta a comum com os valores na ordem de chegada (fora da conta) e busca cada um, contando até duas comparações por nó, como a busca binária. A AVL insere um por um e equilibra na volta; o palco mostra a comum com os mesmos valores num placar ao lado. As duas últimas trazem um segundo gráfico, a altura × n (`tempo.altura`). O `conferir.R` das três usa `motor/arvore.R`, e o dos Percursos confere as ordens com o `dfs()` e o `bfs()` do igraph.

As buscas em largura e em profundidade rodam sobre a `GrafoLista` (a lista de adjacência do Grafo), com a `FilaCircular` e a `Pilha`, num grafo em grade k × k (`motor/grade.py`) que sai do vértice 0. O `conferir.R` delas usa o igraph (`bfs()` e `dfs()`) para conferir a ordem de visita e as distâncias.

## As faixas do antigo álbum Primeiros passos

- **Máximo de um vetor** (`algoritmos/maximo/`): sempre n − 1 comparações; o encarte mostra também quantas vezes o maior troca (perto de ln n num vetor sorteado), conferido no R contra a soma harmônica.
- **Multiplicação de matrizes** (`algoritmos/multiplicacao/`): os três laços sobre a Matriz do instrumento; n³ multiplicações. A matriz C é a resposta e não conta como memória extra. Confere com o `%*%`.
- **Fatorial recursivo** (`algoritmos/fatorial/`): a pilha de chamadas desce n níveis. Os fatoriais vão como texto no `dados.json`, e o JS usa BigInt (19! já passa de 2⁵³). Confere com o `factorial()`.
- **Os três Fibonacci** (`algoritmos/fibrecursivo/`, `fibmemoria/`, `fibiterativo/`): a mesma unidade (somas) para os mesmos n, medida em `motor/fibonacci.py`; o gráfico de tempo de cada um traz os outros dois por trás (séries com `"fundo": true`). O com memória guarda as respostas num Vetor de n + 1 casas (a casa k é fib(k)), em Python, JS e R. O palco do recursivo desenha a árvore de chamadas inteira e vai até n = 15.
- **Busca de padrão ingênua** (`algoritmos/padrao/`): a primeira estrofe da Canção do Exílio no palco, procurando "gorjeiam"; as curvas usam o Dom Casmurro, DNA sorteado e o pior caso ("aaa…ab"), com o segundo eixo m (`tempo.por_k`, o seletor do palco com o rótulo m). Confere com o `gregexpr()`.

A Pilha repassa a pilha de chamadas do fatorial e dos dois Fibonacci recursivos, além do merge e do quick.

## As faixas do antigo álbum Dispersão

As quatro faixas rodam sobre o Dicionário (`instrumentos/dicionario/dicionario.py` e `Instrumentos.DicSondagem`/`DicEncadeamento` em JS):

- **Contar palavras** (`algoritmos/palavras/`): a Canção do Exílio no palco e trechos do Dom Casmurro (Projeto Gutenberg, na pasta da faixa) nas curvas. O tempo conta as casas lidas e escritas no dicionário; a memória, as palavras distintas e as contagens. O `conferir.R` separa as palavras do seu jeito e confere cada contagem com o `table()`.
- **Achar repetidos** (`algoritmos/repetidos/`): o dicionário anima, e a versão com o vetor só conta, como o ingênuo da janela. O tempo conta as comparações entre valores nas duas. O `conferir.R` usa o `duplicated()`.
- **Colisão por encadeamento e por sondagem linear** (`algoritmos/encadeamento/`, `algoritmos/sondagem/`): m fixo; o tempo conta as sondagens (casas olhadas). O encarte tem o gráfico × α (`tempo.alfa`, `graficoAlfa` em `graficos.js`) com as fórmulas de Knuth, e o total × m com α fixo. O `conferir.R` refaz as tabelas em R com casas sorteadas (`motor/colisao.R`) e confere as médias do R e do Python contra as fórmulas, com tolerância.

## As faixas do antigo álbum Estatística

Cada faixa usa um conjunto embutido no R, exportado para CSV por um script na própria pasta (`trees.R`, `lakehuron.R`, `faithful.R`), e o `conferir.R` confere o resultado contra a função do R:

- **Mediana por quickselect** (`algoritmos/mediana/`): a partição do quick sort sem recursão, sobre o `trees$Volume` na ordem do R (quase ordenado: com o pivô no último, mais cara que quase todos os embaralhamentos). Confere com o `median()` e com uma reimplementação em R que conta comparações e trocas.
- **Média e variância em uma passada** (`algoritmos/welford/`): o Welford comparado com a soma dos quadrados e as duas passadas, sobre o `LakeHuron` com uma constante somada (o menu do palco). O erro de cada conta é medido contra a variância exata em frações (`fractions.Fraction`). Confere com o `var()`; a soma dos quadrados é refeita num laço em R, porque o `sum()` acumula em precisão estendida e não reproduziria o erro. O gráfico do erro × constante é o `graficoErro` em `graficos.js` (`tempo.erro` no `dados.json`).
- **Histograma** (`algoritmos/histograma/`): as classes do `hist()` (Sturges e o `R_pretty` do R, reescrito em Python e em JS) sobre o `faithful$eruptions`. Confere `$breaks` e `$counts` classe por classe.

Essas faixas, e as buscas, descrevem os próprios casos de entrada no `dados.json` (`tempo.series`, `tempo.banda`, `tempo.refs`, `tempo.eixo`); o encarte desenha os gráficos a partir disso, e as legendas vêm de `graficos` na ficha, com os números preenchidos dos dados (`{n0}`, `{min}`, …). O menu de entrada de cada tipo de faixa fica em `ENTRADAS`, no `galeria.js`.

## A faixa de Classificar um exemplo

- **FIGS** (`algoritmos/figs/`): várias árvores pequenas somadas, como o `figs()` do pacote `figsr` (classificação com duas classes, `min_n = 5`), sobre o câmbio dos 32 carros do `mtcars` pelo peso e pela potência (`mtcars.R` exporta o CSV). O tempo conta os resíduos somados na varredura de cada variável (`somas`); os cortes avaliados vão à parte (`cortes`). A régua é a soma, e não o corte, porque o figsr testa no máximo 30 cortes por variável: os cortes param de crescer com n, e a varredura não. O menu do palco troca o FIGS pela árvore única (o mesmo código com uma árvore só) e o s, as divisões. O `conferir.R` monta as mesmas árvores no figsr e confere cortes, folhas e previsões em 27 ajustes. A faixa ainda não tem `video.py`: o pôster saiu do site, e a capa provisória fica até a capa desenhada (`docs/capas-classificacao.md`).

## Acrescentar uma ordenação

O molde faz quase tudo: escreva `algoritmos/<nome>/<nome>.py` com `ordenar(v, conta)`, `MEDIDA` (a função medida) e `MOVIMENTO` ("trocas" ou "escritas"), usando `maior()`, `troca()` e `escreve()` de `motor/ordenacao.py`; acrescente a versão em R em `motor/ordenacao.R` e a versão em JS em `simulacao/algoritmos.js` (`ORDENACOES`); copie `medir.py`, `conferir.R` e `video.py` de outra ordenação trocando o nome; escreva a `ficha.json` (com `video.ideia`, as duas legendas do vídeo).

## Acrescentar um algoritmo

1. `algoritmos/<nome>/<nome>.py`: a implementação, recebendo um `Contador`. Toda operação contada passa por `conta.op()`, toda lista auxiliar por `conta.aloca()`; `conta.foto()` guarda o estado para o vídeo. Na função medida, laços explícitos em vez de compreensões de lista (a ciclomática recusa compreensões, que escondem laços).
2. `medir.py`: roda o exemplo do vídeo e as séries do painel e grava `dados.json`. Nenhum número digitado à mão, nem na página nem no vídeo.
3. `conferir.R`: compara com a implementação de referência do R e grava `conferencia.json`.
4. `ficha.json`: o texto (nome, família, resumo, notação e o porquê de cada complexidade). Números no texto só se vierem dos dados.
5. `video.py`: lê `dados.json`; `python3 video.py folha 3,10,20 f.png` mostra quadros sem renderizar.
6. Acrescentar o nome em `ALGORITMOS` no `gerar.py`.

## Cache

O `gerar.py` põe `?v=<hash do conteúdo>` no endereço de cada script e do CSS do `index.html`. Depois de mexer em qualquer `.js` ou no `estilo.css`, rode o `gerar.py` antes de publicar: assim o navegador não mistura o HTML novo com um arquivo antigo guardado no cache.

## Autoria

Pedro Mambelli e João Paulo Assis Bonifácio.
