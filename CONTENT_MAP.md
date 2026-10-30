# Mapa de conteúdo

A organização do Big O Player (https://uaipedro.github.io/big-o-player/): as seções, as playlists por problema e de onde vem cada faixa. O mapa foi proposto em 28/10/2026 a partir do handoff do Pedro, que aprovou as decisões no mesmo dia.

O inventário de partida é o que estava no ar no commit `4d27f95`: 8 álbuns, 34 faixas, 11 instrumentos e a prateleira "Comece por aqui".

## Estado em 28/10/2026

A reorganização e a Fase 1 dos QAs estão implementadas no branch `claude/mapa-de-conteudo`, **sem push e sem merge**: o Pedro vê a prévia local primeiro (`python3 -m http.server 8765` na raiz).

- As playlists, a galeria Problemas gerais e Algoritmos e estruturas estão no código: `playlists.json` e `galeria.js`. A home é só prateleiras, como a do Spotify.
- **Conceitos importantes está ligada (28/10):** os 7 vídeos narrados (CI-00 a CI-06, 29 a 85 s, 20,8 MB em `videos/`) tocam no palco, com "a seguir" entre um e outro, velocidade e pause. Sem legenda: o Pedro preferiu os vídeos sem ela (28/10), e o `<track>`, o botão CC e os `.vtt` saíram. A seção abre a home, antes dos blocos de playlists. Cada vídeo só é baixado quando toca.
- **Fundamentos está completa (29/10):** os 11 vídeos (FU-01 a FU-11, de 1:09 a 2:03, uns 47 MB em `videos/`), narrados com a mesma voz de Conceitos, sem legenda, tocando em sequência até "fim de Fundamentos". Os briefings estão em `docs/fundamentos-briefings.md`.
- **Aprender com exemplos, a playlist de vídeo (30/10):** a terceira série de vídeos (`classificar.json`, `window.CLASSIFICAR`), no molde de Conceitos e Fundamentos, com os vídeos das faixas de Classificar um exemplo, com o CE-01 · FIGS (1:26, narrado com a mesma voz, sem legenda, `videos/classificar-1.mp4`). Fica na home depois de Fundamentos, com a capa provisória laranja até a CE-01 desenhada. Decisão do Pedro: série nova, e não vídeo dentro da página da faixa, com o nome "Aprender com exemplos" para não repetir o da playlist de faixas. O projeto do vídeo é o `bonijoao/big-o-player-videos`.
- **Fundamentos**, antes (`fundamentos.json`), era playlist de vídeo pronta no código e **desligada**: cada uma só aparece quando algum vídeo ganha `"video"` (o caminho do arquivo). Sem vídeo, a vitrine não mostra cartão vazio nem "em breve".
- O "Comece por aqui" saiu. Instrumento virou estrutura (`#estruturas/<nome>`), e os links antigos (`#busca/…`, `#instrumentos/…`, `#k-means`) redirecionam.
- Os 11 vídeos de Fundamentos têm a lista aprovada e ainda não têm roteiro.

### 2ª rodada de UX e a linguagem das capas (28/10, no mesmo branch)

- **Consertos:** a linha da vez do pseudocódigo mantém o recuo (a classe virou `.da-vez`), o cabeçalho da playlist é um grid (o título longo não derruba o bloco), a estante tem duas colunas no celular e o espaço só toca e pausa com o palco aberto, mini ou grande.
- **Fim da faixa:** o painel do palco mostra o resultado em verde e o "a seguir" com 5 s de contagem (tocar agora, de novo, ficar aqui; Esc cancela). A barra ganhou o repetir (R).
- **Estados de player:** ▶ no hover da linha, equalizador na faixa que toca, o botão redondo de tocar a playlist, o "pressionado" dos botões, a capa da barra abrindo o palco, a Media Session e os atalhos N, P, R e ? (a lista).
- **Vídeo:** um vídeo pronto de Conceitos ou Fundamentos é uma faixa da série. O quadro é um `<video>` dentro do palco, controlado pela barra, pela fila, pelo teclado, pela velocidade e pela Media Session. O cartão não tem mais player solto.
- **O papel (28/10, depois do primeiro ar):** o creme da página saiu. A página é branco quente (variante a, `#fdfcf9`, lateral `#f4f3ef`), com o branco neutro (variante b, `#ffffff`, lateral `#f5f5f4`) pronto para trocar no `<html data-papel>` do `index.html`. O véu do palco é preto com alfa baixo, e o canvas pinta o `--papel`.
- **A home nova (28/10, prévia):** a abertura ("Algoritmos tocando ao vivo." e uma linha), a comparação ao vivo (Busca sequencial × Busca binária no mesmo vetor de 24 números, procurando o 36, nos palcos de verdade, em loop, devagar; para fora da tela e com a aba escondida, e mostra o quadro final parado com movimento reduzido) e a grade das 8 playlists (4 colunas no desktop, 2 no celular), no lugar das 9 prateleiras. O botão "Tocar a comparação" toca a playlist Encontrar um item a partir da sequencial, porque o palco tem um quadro só. A home caiu de 3.922 para 2.060 px no desktop e de 3.942 para 2.676 px no celular.
- **A linguagem das capas:** papel claro, a cor e o código de cada playlist (`cor` e `codigo` no `playlists.json`), títulos em Archivo Black e a IBM Plex Mono nos rótulos, no código e nos números. Todos os pares de texto e fundo passam no AA. As cores estão em tokens no topo do `estilo.css`.

**Ordem das playlists** (a mesma na grade da home e na lateral; 28/10): cada uma usa só estruturas que já apareceram antes.

1. Achar o maior (vetor; a janela traz o deque)
2. Encontrar um item (vetor, árvore, tabela hash)
3. Calcular Fibonacci (variáveis, pilha de chamadas, o vetor do memo)
4. Ordenar uma lista (vetor, pilha, heap)
5. Contar ocorrências (vetor, dicionário)
6. Organizar uma fila (fila, heap)
7. Percorrer tudo (árvore, grafo, pilha, fila)
8. Achar o caminho mais curto (grafo, fila, heap)
9. Problemas gerais

Na grade da home e na lateral, as playlists ficam em blocos, cada um com um rótulo mono pequeno, em caixa alta (o `bloco` de cada playlist no `playlists.json`): PARA COMEÇAR (Achar o maior, Encontrar um item, Calcular Fibonacci, Ordenar uma lista), CONTAR E ORGANIZAR (Contar ocorrências, Organizar uma fila), ÁRVORES E GRAFOS (Percorrer tudo, Achar o caminho mais curto) e PROBLEMAS GERAIS (o cartão sozinho, no fim).

A home abre com "Algoritmos tocando ao vivo." e "Cada playlist é um problema; cada faixa, um jeito de resolver.", e a grade vem logo abaixo. A comparação ao vivo está pronta no código e desligada (`COMPARACAO = false` no `galeria.js`).

**Barra de cima (28/10):** a marca (o disco e o nome), a busca no meio e, à direita, a bandeira (só português; "English (em breve)" desabilitado) e o "?", que abre a ajuda: o que é o projeto, os atalhos e quem fez. A busca procura em faixas, playlists e estruturas pelo nome, objetivo, versão, playlist e estruturas creditadas, sem acento; `/` foca, as setas andam, Enter abre e Esc fecha. No celular, a lupa abre a busca em tela cheia e o nome some. Na ajuda, quem fez: Pedro Mambelli e João Paulo Assis Bonifácio (só o nome do João, até chegarem a descrição e o link).

**Palco (28/10):** à direita da animação, o pseudocódigo inteiro da faixa (o mesmo bloco do encarte), com a linha da vez acesa na cor da playlist e rolando dentro do painel; embaixo, as variáveis, com um destaque breve no valor que mudou. No celular, o código fica recolhível ("ver código") e as variáveis numa faixa compacta. Num vídeo, o painel some e só volta no fim, com o "a seguir".

**Palco grande como "agora tocando" (28/10):** ocupa a tela, com uma margem fina, e leva o transporte para dentro (a barra global some e volta ao minimizar ou fechar). Em cima, a entrada: chips para o tipo, um stepper para o n (e o k) e o botão "Sortear" com dado, na cor da playlist. No meio, a animação, que cabe na altura sem distorcer, e o painel com o código e as variáveis colados. Embaixo, o trilho na largura toda, o tocar grande com os passos e as faixas, a velocidade e o repetir à direita e "A seguir" à esquerda. No celular fica tudo em coluna, com o transporte fixo embaixo; nos vídeos, sem entrada e sem painel. A tela da simulação tem moldura própria (linha fina e cantos de 8 px sobre um fundo levemente diferente), e no meio dela aparece ▶ antes do primeiro play e ❚❚ com a faixa pausada; clicar na tela alterna.

**Achados do agente estudante (28/10), corrigidos:** o `<select>` de k não aparece mais ao lado do stepper; o mini palco reserva o seu lugar (folga embaixo e, na tela larga, uma coluna à direita) e some no celular, onde a barra de baixo basta; no fim da faixa, "ficar aqui", o Esc e mexer na velocidade ou no repetir param a contagem sem esconder a próxima faixa; cada faixa começa em 1×; o "+1" das decisões saiu do pseudocódigo (fica no código medido); a linha da vez é tinta com a cor da playlist numa faixa à esquerda; e Achar o maior usa uma capa provisória (mostarda, "ACHAR O MAIOR · AM") até a AM-01. Fica para depois: o ritmo das faixas curtas (a Busca binária dura 2 s em 1×).

**Cache (29/10):** o `gerar.py` carimba `?v=<hash do conteúdo>` em cada script e no CSS do `index.html`, para o navegador não misturar o HTML novo com arquivos antigos depois de uma publicação.

**Marca:** o disco de vinil da capa CI-00, recortado com fundo transparente, ao lado de "Big O Player" na grotesca (`marca/`); o favicon é o disco simplificado em SVG; a `og:image` usa o disco e o título da capa sobre o fundo preto de Conceitos importantes. Tudo sai do `motor/identidade.py`, a partir de `marca/ci-00.webp`.

| playlist | cor | código |
|---|---|---|
| Achar o maior | mostarda, a cor da capa do Máximo (28/10: o Máximo também abre o site, além de ficar em Problemas gerais) | AM |
| Encontrar um item | azul | EI |
| Ordenar uma lista | vermelho (um tom abaixo do da capa, para o texto creme passar no AA) | OL |
| Contar ocorrências | rosa | CO |
| Calcular Fibonacci | creme | FI |
| Organizar uma fila | amarelo | OF |
| Percorrer tudo | verde-escuro (a cor da capa, não o verde do resultado) | PT |
| Achar o caminho mais curto | roxo | CC |
| Classificar um exemplo | laranja (`#ec7a2c`, com o texto em tinta: 5,9:1) | CE |
| Problemas gerais | neutro (a cor da lateral); cada linha leva a cor da própria capa na marca da subcategoria e no equalizador | PG |

## As quatro seções, nesta ordem

1. **Conceitos importantes**: 7 vídeos novos, com o vídeo 0 apresentando o site. É a porta de entrada e termina onde começa o primeiro algoritmo. Os roteiros estão prontos: o Pedro grava o áudio primeiro, e a animação vem por cima.
2. **Fundamentos**: a playlist inicial de vídeos curtos sobre a base (variável, laço, vetor, pilha, n, passo…), que deixa a pessoa pronta para ver qualquer faixa.
3. **Playlists por problema**: 8 playlists com 25 faixas, e as variações ficam como subcategorias.
   - Encontrar um item
   - Ordenar uma lista
   - Contar ocorrências
   - Calcular Fibonacci
   - Organizar uma fila
   - Percorrer tudo
   - Achar o caminho mais curto
   - Classificar um exemplo (issue #1; por enquanto só com o FIGS, que é a primeira faixa)

   Os problemas com uma faixa só vão para a galeria **Problemas gerais**, que tem 10 faixas, uma por problema e no fim das playlists. Quando um desses problemas ganha a segunda faixa, ele sai da galeria e vira playlist.
4. **Algoritmos e estruturas**: as páginas interativas de hoje, isto é, as 11 estruturas (os antigos "instrumentos") e a página de cada uma das 35 faixas.

Status usados na tabela:
- **no ar**: fica onde está.
- **mudou de lugar**: já existia e trocou de casa no branch; entre parênteses, a casa de antes. Vai ao ar com o merge.
- **feito**: novo e implementado no branch.
- **novo**: ainda não existe. "Novo · roteiro pronto" indica que o roteiro já foi escrito na sessão coordenadora.

O id entre crases é o nome da pasta em `algoritmos/` ou `instrumentos/`.

## Tabela

| seção | playlist (problema) | subcategoria | vídeo/faixa | status | resumo | capa |
|---|---|---|---|---|---|---|
| Conceitos importantes | — | — | 0. Big O Player | feito (narrado) | Algoritmos tocam como música; aqui se comparam jeitos diferentes de resolver o mesmo problema. | nova |
| Conceitos importantes | — | — | 1. O que é um algoritmo | feito (narrado) | Uma sequência finita de passos precisos, da entrada à resposta. | nova |
| Conceitos importantes | — | — | 2. Complexidade sem jargão | feito (narrado) | Comparar é analisar como a tarefa é feita (passos em função de n), não só se é rápida. | nova |
| Conceitos importantes | — | — | 3. Quando dá para comparar | feito (narrado) | O mesmo problema, a mesma entrada, a mesma régua e o mesmo critério. | nova |
| Conceitos importantes | — | — | 4. Melhor, pior e caso médio | feito (narrado) | O custo muda com a entrada, e o pior caso é a promessa. | nova |
| Conceitos importantes | — | — | 5. Como escolher | feito (narrado) | A escolha importa com n grande ou muitas repetições; senão, o simples ganha. | nova |
| Conceitos importantes | — | — | 6. Fechamento | feito (narrado) | Cada playlist é um problema, e cada faixa é um jeito de resolvê-lo. | nova |
| Playlists | Achar o maior | no vetor inteiro | Máximo de um vetor (`maximo`) | mudou de lugar (também em Problemas gerais) | O primeiro algoritmo: um laço e uma decisão, sempre n − 1 comparações. | nova |
| Playlists | Achar o maior | em cada trecho | Máximo em janela deslizante (`janela`) | mudou de lugar (também em Problemas gerais) | O maior de cada trecho de k casas: ingênuo × deque. | nova |
| Playlists | Encontrar um item | numa lista | Busca sequencial (`sequencial`) | mudou de lugar (Busca) | Olha casa por casa: serve para qualquer vetor, custa até n. | nova |
| Playlists | Encontrar um item | numa lista | Busca binária (`binaria`) | mudou de lugar (Busca) | Corta pela metade num vetor já ordenado: log n comparações. | nova |
| Playlists | Encontrar um item | numa árvore de busca | Busca em árvore (`abb`) | mudou de lugar (Árvores e heaps) | Desce um nível por comparação; a altura depende da ordem em que os valores chegaram. | nova |
| Playlists | Encontrar um item | numa árvore de busca | Árvore equilibrada AVL (`avl`) | mudou de lugar (Árvores e heaps) | Gira a árvore enquanto os valores chegam, para ela ficar com uns log n níveis. | nova |
| Playlists | Encontrar um item | pela chave (tabela hash) | Colisão por encadeamento (`encadeamento`) | mudou de lugar (Dispersão) | Duas chaves na mesma casa ficam penduradas nela, numa corrente. | nova |
| Playlists | Encontrar um item | pela chave (tabela hash) | Colisão por sondagem linear (`sondagem`) | mudou de lugar (Dispersão) | Casa ocupada, tenta a seguinte; custa cada vez mais à medida que a tabela enche. | nova |
| Playlists | Ordenar uma lista | um por um, O(n²) | Bubble sort (`bolha`) | mudou de lugar (Ordenação) | Troca vizinhos fora de lugar até nada mais mudar. | nova |
| Playlists | Ordenar uma lista | um por um, O(n²) | Insertion sort (`insercao`) | mudou de lugar (Ordenação) | Encaixa cada número no trecho já ordenado. | nova |
| Playlists | Ordenar uma lista | um por um, O(n²) | Selection sort (`selecao`) | mudou de lugar (Ordenação) | Escolhe o menor que falta a cada passada; n²/2 em qualquer ordem. | nova |
| Playlists | Ordenar uma lista | dividir e juntar, O(n log n) | Merge sort (`intercalacao`) | mudou de lugar (Ordenação) | Divide ao meio, ordena as metades e intercala. | nova |
| Playlists | Ordenar uma lista | dividir e juntar, O(n log n) | Quick sort (`rapida`) | mudou de lugar (Ordenação) | Separa menores e maiores em volta de um pivô; n² no pior caso. | nova |
| Playlists | Ordenar uma lista | com um heap | Heapsort (`heapsort`) | mudou de lugar (Ordenação) | Monta um heap no próprio vetor e tira sempre o maior. | nova |
| Playlists | Contar ocorrências | por palavra | Contar palavras (`palavras`) | mudou de lugar (Dispersão) | Um dicionário com uma contagem por palavra, numa leitura só do texto. | nova |
| Playlists | Contar ocorrências | por faixa de valores | Histograma (`histograma`) | mudou de lugar (Estatística) | Conta quantos valores caem em cada classe, para ver a forma dos dados. | nova |
| Playlists | Contar ocorrências | já apareceu? | Achar repetidos (`repetidos`) | mudou de lugar (Dispersão) | Vetor × dicionário: n² comparações contra n consultas. | nova |
| Playlists | Calcular Fibonacci | descendo (recursão) | Fibonacci recursivo (`fibrecursivo`) | mudou de lugar (Primeiros passos) | Direto da definição: φⁿ somas, e fib(2) recalculado centenas de vezes. | nova |
| Playlists | Calcular Fibonacci | descendo (recursão) | Fibonacci com memória (`fibmemoria`) | mudou de lugar (Primeiros passos) | A mesma recursão, guardando cada resposta: troca memória por tempo. | nova |
| Playlists | Calcular Fibonacci | subindo (laço) | Fibonacci iterativo (`fibiterativo`) | mudou de lugar (Primeiros passos) | Sobe do começo com duas variáveis: n somas e memória constante. | nova |
| Playlists | Organizar uma fila | por ordem de chegada | Fila de atendimento (`atendimento`) | mudou de lugar (Estruturas lineares) | Um caixa e uma fila: prevê quanto cada cliente espera. | nova |
| Playlists | Organizar uma fila | por urgência | Fila de prioridade (`prioridade`) | mudou de lugar (Árvores e heaps) | O mais grave passa na frente, com um heap. | nova |
| Playlists | Percorrer tudo | numa árvore | Percursos de árvore (`percursos`) | mudou de lugar (Árvores e heaps) | Pré, em e pós-ordem com uma descida recursiva; em largura com uma fila. | nova |
| Playlists | Percorrer tudo | num grafo | Busca em profundidade (`profundidade`) | mudou de lugar (Grafos) | Vai o mais fundo possível e volta, com uma pilha. | nova |
| Playlists | Percorrer tudo | num grafo | Busca em largura (`largura`) | mudou de lugar (Grafos) | A mesma faixa de Achar o caminho mais curto: visita em ondas, com uma fila. | nova |
| Playlists | Achar o caminho mais curto | sem custo nas ligações | Busca em largura (`largura`) | mudou de lugar (Grafos) | Anda em ondas a partir da origem: o caminho com menos passos. | nova |
| Playlists | Achar o caminho mais curto | com custo nas ligações | Dijkstra (`dijkstra`) | mudou de lugar (Grafos) | Expande sempre o ponto mais perto, com um heap. | nova |
| Playlists | Classificar um exemplo | somando árvores pequenas | FIGS (`figs`) | feito | Várias árvores rasas que crescem juntas; a previsão é a soma delas. Conferido contra o `figsr`. | provisória (CE-01) |
| Playlists | Problemas gerais | achar o maior | Máximo de um vetor (`maximo`) | mudou de lugar (Primeiros passos) | Sempre n − 1 comparações, e nenhum algoritmo faz menos. | nova |
| Playlists | Problemas gerais | achar o maior de cada trecho | Máximo em janela deslizante (`janela`) | mudou de lugar (Estruturas lineares) | O maior de cada trecho de k casas: com um deque, n passos; ingênuo, n·k. | nova |
| Playlists | Problemas gerais | achar o valor do meio | Mediana por quickselect (`mediana`) | mudou de lugar (Estatística) | Acha o valor do meio sem ordenar o vetor inteiro, em n passos na média. | nova |
| Playlists | Problemas gerais | encontrar uma palavra num texto | Busca de padrão ingênua (`padrao`) | mudou de lugar (Primeiros passos) | Encosta a palavra em cada posição e compara letra a letra; pior caso n·m. | nova |
| Playlists | Problemas gerais | calcular o fatorial | Fatorial recursivo (`fatorial`) | mudou de lugar (Primeiros passos) | n! com uma função que chama a si mesma; a pilha desce n níveis. | nova |
| Playlists | Problemas gerais | multiplicar matrizes | Multiplicação de matrizes (`multiplicacao`) | mudou de lugar (Primeiros passos) | Três laços pela definição: n³. | nova |
| Playlists | Problemas gerais | conferir se os símbolos fecham | Parênteses balanceados (`parenteses`) | mudou de lugar (Estruturas lineares) | Confere com uma pilha se cada símbolo que abre fecha no lugar certo. | nova |
| Playlists | Problemas gerais | inverter uma lista | Inverter lista encadeada (`inverter`) | mudou de lugar (Estruturas lineares) | Vira a ordem com três ponteiros, sem copiar valores. | nova |
| Playlists | Problemas gerais | calcular média e variância | Média e variância em uma passada (`welford`) | mudou de lugar (Estatística) | Welford: lê os dados uma vez, sem guardá-los. | nova |
| Playlists | Problemas gerais | separar em grupos | K-means (`kmeans`) | mudou de lugar (Estatística) | Separa pontos em k grupos sem conhecê-los antes. | nova |
| Fundamentos | — | — | 1. Variável | feito (narrado) | Um nome com um valor: anotar apaga o valor velho, ler não apaga. | nova |
| Fundamentos | — | — | 2. Laço e decisão | feito (narrado) | O laço repete o mesmo passo; a decisão escolhe, em cada volta, o que fazer. | nova |
| Fundamentos | — | — | 3. Função e recursão | feito (narrado) | Uma função que chama a si mesma num problema menor, e a pilha de chamadas que espera a volta. | nova |
| Fundamentos | — | — | 4. Vetor | feito (narrado) | Casas em sequência, cada uma achada pelo número dela, e o vetor que dobra quando enche. | nova |
| Fundamentos | — | — | 5. Pilha e fila | feito (narrado) | O último que entra sai primeiro; o primeiro que entra sai primeiro. | nova |
| Fundamentos | — | — | 6. Lista encadeada | feito (narrado) | Valores ligados por ponteiros: inserir no meio sem empurrar os outros. | nova |
| Fundamentos | — | — | 7. Árvore e heap | feito (narrado) | Guardar em níveis para achar, ou tirar o menor, descendo poucos níveis. | nova |
| Fundamentos | — | — | 8. Grafo | feito (narrado) | Pontos ligados por arestas, como esquinas ligadas por ruas. | nova |
| Fundamentos | — | — | 9. Dicionário | feito (narrado) | Achar pela chave calculando a casa, em vez de procurar; e quando duas chaves colidem. | nova |
| Fundamentos | — | — | 10. n, passo e memória | feito (narrado) | O que se conta neste site: o tamanho da entrada, as operações básicas e o que se guarda além da entrada e da resposta. | nova |
| Fundamentos | — | — | 11. Ler o gráfico log-log | feito (narrado) | Com os dois eixos em log, a inclinação da reta é o expoente. | nova |
| Aprender com exemplos | — | — | 1. FIGS | feito (narrado) | Árvores rasas que crescem juntas, um corte por vez; a previsão é a soma de uma folha de cada. | provisória (CE-01) |
| Algoritmos e estruturas | — | estruturas | Vetor (`vetor`) | mudou de lugar (Instrumentos) | Valores em sequência; chega a qualquer um pelo número da casa. | — |
| Algoritmos e estruturas | — | estruturas | Matriz (`matriz`) | mudou de lugar (Instrumentos) | Uma tabela por linha e coluna, guardada linha a linha num bloco só. | — |
| Algoritmos e estruturas | — | estruturas | Texto (`texto`) | mudou de lugar (Instrumentos) | Um vetor de letras: concatenar no laço × juntar no fim. | — |
| Algoritmos e estruturas | — | estruturas | Pilha (`pilha`) | mudou de lugar (Instrumentos) | O último que entra é o primeiro que sai. | — |
| Algoritmos e estruturas | — | estruturas | Fila (`fila`) | mudou de lugar (Instrumentos) | Atende na ordem de chegada: ingênua × circular. | — |
| Algoritmos e estruturas | — | estruturas | Deque (`deque`) | mudou de lugar (Instrumentos) | Põe e tira pelas duas pontas. | — |
| Algoritmos e estruturas | — | estruturas | Lista encadeada (`lista`) | mudou de lugar (Instrumentos) | Insere e remove no meio sem empurrar os outros: estática × dinâmica. | — |
| Algoritmos e estruturas | — | estruturas | Grafo (`grafo`) | mudou de lugar (Instrumentos) | Ligações entre pontos, em três vistas: matriz, lista e incidência. | — |
| Algoritmos e estruturas | — | estruturas | Árvore de busca (`arvore`) | mudou de lugar (Instrumentos) | Guarda em ordem e acha descendo poucos níveis: comum × AVL. | — |
| Algoritmos e estruturas | — | estruturas | Heap (`heap`) | mudou de lugar (Instrumentos) | Tira sempre o menor sem ordenar tudo: árvore e vetor ao mesmo tempo. | — |
| Algoritmos e estruturas | — | estruturas | Dicionário (`dicionario`) | mudou de lugar (Instrumentos) | Acha o valor pela chave quase sem procurar: encadeamento × sondagem. | — |
| Algoritmos e estruturas | — | algoritmos | as 35 faixas | no ar | A página de cada faixa (encarte, palco, gráficos) é a mesma; a playlist só aponta para ela. | a da faixa |

Conferência: 25 faixas nas 8 playlists (a Busca em largura aparece em duas) + 10 em Problemas gerais = 35; 11 estruturas.

**Classificar um exemplo (29/10, issue #1):** a playlist é o problema "classificar" (dado um exemplo, decidir a que classe ele pertence), no bloco novo "Aprender com exemplos", antes de Problemas gerais. Fica como playlist, e não em Problemas gerais, porque a issue pede a playlist com o FIGS como primeira faixa e os outros algoritmos de classificação depois. O FIGS roda sobre o câmbio dos 32 carros do `mtcars`, e o palco compara com a árvore única. A cor é o laranja, que nenhuma playlist usava; a capa CE-01 e a da playlist estão por fazer, com os prompts em `docs/capas-classificacao.md`.

### Capas

As capas novas vêm em grades 2×2 desenhadas pelo Pedro (o código da faixa impresso no canto). O `motor/capas.py` recorta cada grade (2×2, ou 1×2 com duas capas lado a lado) e exporta para `capas/`: a capa inteira em WebP de 240 e 480 px (cartões, cabeça da playlist, encarte) e só a ilustração em 96 px, que entra onde a capa fica com 48 px (a lateral, as linhas da playlist, a barra do player), porque ali o título grande vira mancha. Quando o título da capa começa mais alto, o recorte da ilustração é menor (`alg@0.5` no comando). O `gerar.py` liga a capa à faixa quando os arquivos existem e tira dela a cor de fundo; sem capa, a faixa fica com o pôster antigo.

**As 34 capas dos algoritmos estão completas** (EI-01 a EI-06, OL-01 a OL-06, CO-01 a CO-03, FI-01 a FI-03, OF-01, OF-02, PT-01, PT-02, CC-01, CC-02 e PG-01 a PG-10). A numeração PG das capas bate com a ordem de Problemas gerais. A Busca em largura usa a CC-01 também em Percorrer tudo, que por isso não tem PT-03. Nenhuma rota do site mostra mais o pôster antigo; a capa provisória (a cor da playlist, o rótulo mono e o nome na grotesca) fica no código só para uma faixa futura que chegue sem capa.

Nenhuma capa ficou sem faixa: Parênteses balanceados (PG-07) e Inverter lista encadeada (PG-08) existem como faixas.

Os 18 vídeos também têm capa (CI-00 a CI-06 e FU-01 a FU-11), ligada pelo `capa` de cada item no `conceitos.json` e no `fundamentos.json`. Conceitos importantes fica preto, e Fundamentos, azul-petróleo, nos cabeçalhos. As duas séries continuam escondidas até o primeiro vídeo; ligadas de teste, as capas aparecem na home, na lateral, nas páginas das séries e na barra.

Grafia: as capas dizem "Quick sort", "Insertion sort", "Selection sort" e "Heapsort", como o site. A única diferença é "Árvore equilibrada AVL" na capa contra "Árvore equilibrada (AVL)" no site; o texto da capa não foi mexido.

Problemas gerais que já têm um segundo jeito à vista, todos novos:
- encontrar uma palavra: o KMP, citado na própria faixa;
- calcular média e variância: a versão em duas passadas;
- multiplicar matrizes: Strassen, ou a ordem dos laços pensando no cache;
- separar em grupos: k-medoides ou agrupamento hierárquico;
- calcular o fatorial: o laço, que a própria faixa cita ("guardaria só o produto: O(1)").

## De onde vem cada faixa

| hoje | faixas | destino |
|---|---|---|
| Comece por aqui (prateleira da home) | sequencial, binária, bubble, merge, K-means | Sai. A porta de entrada passa a ser Conceitos importantes. |
| Primeiros passos | máximo, multiplicação, fatorial, Fibonacci ×3, padrão | Vira **Conceitos importantes**, que só tem vídeos novos. Os três Fibonacci formam a playlist Calcular Fibonacci. Máximo, padrão, fatorial e multiplicação vão para Problemas gerais, e o fatorial e a multiplicação também servem de palco a dois vídeos de Fundamentos. |
| Busca | sequencial, binária | Encontrar um item / numa lista. |
| Ordenação | as 6 | Ordenar uma lista, com 3 subcategorias. |
| Estruturas lineares | parênteses, atendimento, inverter, janela | Atendimento → Organizar uma fila; janela, parênteses e inverter → Problemas gerais. |
| Árvores e heaps | percursos, busca em árvore, AVL, prioridade | Busca em árvore e AVL → Encontrar um item; percursos → Percorrer tudo; prioridade → Organizar uma fila. |
| Grafos | largura, profundidade, Dijkstra | Largura e Dijkstra → Achar o caminho mais curto; profundidade → Percorrer tudo. |
| Dispersão | contar palavras, repetidos, encadeamento, sondagem | Encadeamento e sondagem → Encontrar um item / pela chave; contar palavras e repetidos → Contar ocorrências. |
| Estatística | Welford, mediana, histograma, K-means | Histograma → Contar ocorrências; Welford, mediana e K-means → Problemas gerais (decisão 3). |
| Instrumentos | as 11 estruturas | Algoritmos e estruturas. |

## Conceitos importantes: os 7 vídeos

Os roteiros dos 7 vídeos estão na sessão coordenadora, e os resumos de 1 linha estão na tabela acima. O Pedro grava o áudio primeiro, e a animação vem por cima, com o palco gravado sem moldura (pendência S1). As animações abaixo são sugestões para a etapa de animar. Quando divergirem do roteiro, vale o roteiro.

| # | vídeo | animação simples sobre o áudio | palco que dá para reaproveitar |
|---|---|---|---|
| 0 | Big O Player | Tela do site: a home, uma faixa tocando no player do rodapé e, em seguida, duas faixas da mesma playlist, uma depois da outra. | Gravação de tela do site novo. Nenhum palco novo. |
| 1 | O que é um algoritmo | Os passos do Máximo aparecem escritos à máquina, um por linha, e o palco os executa num vetor de 8 números, com a linha da vez acesa. Fecha com a cartela "entrada → passos → resposta". | **Máximo de um vetor**, com o pseudocódigo que já acende a linha da vez. A cartela é nova e simples. |
| 2 | Complexidade sem jargão | Dois jeitos de achar um nome numa lista ordenada, lado a lado: casa por casa e cortando pela metade, cada um com o seu contador. Depois, a lista dobra de tamanho: um contador dobra e o outro ganha só +1. Só no fim aparece o rótulo O(n) × O(log n), como o resumo do que se viu. | **Busca sequencial** e **Busca binária**. Falta compor os dois palcos lado a lado com a mesma entrada, o que é novo. |
| 3 | Quando dá para comparar | Uma corrida entre o Bubble e o Insertion no mesmo vetor, com um placar de passos. Depois, a trapaça: o Bubble recebe o vetor já ordenado e o Merge um embaralhado, e o placar ganha um "injusto". Fecha com o mesmo algoritmo em duas máquinas: os segundos mudam e os passos não. | **Bubble sort**, **Insertion sort** e **Merge sort**, que já aceitam escolher o tipo de entrada. O placar e o lado a lado são novos. |
| 4 | Melhor, pior e caso médio | A Busca sequencial roda três vezes, com o alvo no começo, sorteado e ausente, e os três contadores ficam em fila. Depois, o gráfico "onde está o alvo" com as três linhas. Gancho final: o Quick sort num vetor já ordenado vira n². | **Busca sequencial** e o gráfico dela, que já separa os lugares do alvo. Para o gancho, **Quick sort** com a entrada crescente. |
| 5 | Como escolher | Uma régua de crescimento com 1, log n, n, n log n, n² e 2ⁿ para n = 10, 1.000 e 1.000.000, convertida em tempo de verdade (a 1 bilhão de passos por segundo). Depois, dois casos de escolha: ordenar uma vez para buscar muitas vezes com a binária, e os três Fibonacci no gráfico comum. | O **gráfico comum dos três Fibonacci** já existe. A régua é nova, mas sai dos dados dos gráficos que o site já tem. |
| 6 | Fechamento | Três ordenações correm no mesmo vetor (Bubble, Merge e Quick) e terminam em tempos diferentes. Depois, a tela das playlists se monta, problema por problema, com as faixas caindo nas subcategorias. | O palco das **ordenações**, com o mesmo lado a lado do vídeo 3. A tela das playlists é gravação da home nova. |

## Fundamentos

Fundamentos é a playlist inicial: vídeos curtos sobre a base, para a pessoa entender os demais. Sabendo a base, ela consegue ver qualquer vídeo ou simulação. Vem depois de Conceitos importantes e antes das playlists por problema.

A fronteira com Algoritmos e estruturas: o vídeo de Fundamentos apresenta a ideia (o que é uma pilha, por que o vetor dobra); a página da estrutura é onde se mexe nela e se vê o custo de cada operação.

Os 11 vídeos estão em `fundamentos.json`, com a lista aprovada pelo Pedro e ainda sem roteiro. Algoritmo, variável, laço e decisão, e custo podem partir das fichas da trilha "Do zero" (branch `claude/compassionate-dhawan-92e734`, commit `74cc438`). O glossário rápido que esta seção chegou a ter saiu do site: Fundamentos não é glossário.

## Pendências que não são de mapa

Vêm dos relatórios de QA de 28/10, que ficam fora do repositório, no PC do Pedro: `~/Documentos/qa-big-o-player/conteudo.md` e `~/Documentos/qa-big-o-player/sistema.md`. A ordem que eles propõem para Primeiros passos, e a trilha de 13 vídeos do QA de conteúdo, foram **substituídas** por este mapa.

### Fase 1: feita no branch

Erros técnicos (QA de conteúdo). Regra do site: o rótulo é o pior caso, salvo quando diz "médio" ou "amortizado".
- **E1. Feito.** A resposta não conta como memória extra. A Multiplicação passou a O(1) extra, remedida e conferida no R.
- **E2. Feito.** O Quick sort aparece como O(n log n) médio.
- **E3. Feito.** As duas colisões rotulam o custo de uma inserção com ocupação α: O(1 + α) e O(1/(1 − α)²).
- **E4. Feito.** O texto diz que só o KMP garante O(n + m).
- **E5. Feito.** O Fibonacci iterativo diz "duas variáveis" no encarte e "O(1), duas variáveis" no palco, e as casas que passaram apagam.
- **E6. Feito.** A profundidade média da árvore embaralhada aparece como uns 1,4 log₂ n.
- **E7. Feito.** O memo do Fibonacci é um Vetor (a casa k guarda fib(k)), em Python, JS e R. O feat. ficou "Vetor, Pilha", e o palco desenha o vetor.
- **E8. Feito.** A regra está escrita uma vez, na abertura de Algoritmos e estruturas. Ω e Θ ficam para o vídeo de Fundamentos sobre n, passo e memória.
- **E9. Feito.** A autoria do Fibonacci iterativo virou "—", e a linha some da ficha.

Sistema (QA de sistema):
- **S3. Feito.** O espaço pausa em vez de recomeçar a playlist. O palco grande é um diálogo (`role="dialog"`, `aria-modal`, o foco entra e volta, a página atrás fica `inert`) e anuncia a linha da vez por `aria-live` com a faixa parada (achados 1 e 5).
- **S2. Feito em parte.** O cinza do canvas passou a `#686c73`, e o objetivo virou a linha fina da barra do palco, fora da animação (achados 4, 6 e 13). Falta a fonte mínima no celular (Fase 2).
- **S4. Feito, menos a URL antiga.** Big O Player no título, na marca e no README; ícone, `og:image` 1200 × 630, `og:*` e `twitter:card`; linha fina e autoria na home. O redirecionamento de `/eh-complexo-baby/` está pronto em `docs/redirecionamento/` e falta o Pedro criar o repositório (passo a passo no `LEIA.md` de lá).
- **Achado 17. Feito.** O `_config.yml` tira do Pages o `CLAUDE.md`, o README, `docs/`, `testes/`, `motor/` e os `.py`, `.R` e `.json`.
- **Achados 10 e 12.** A lateral nova tem uma faixa de navegação só no celular, e não fica mais presa em "Instrumentos".

Do QA de conteúdo, seção 2.0 (molde da faixa), feito: pseudocódigo sem parágrafo-padrão, a ciclomática fora do destaque (M na ficha e o código medido recolhido, com as linhas `conta.*` esmaecidas), a seção de memória só quando há memória extra, e a ficha técnica sem repetir o topo nem mostrar linhas vazias.

### Fase 2 e depois

- **Da 2ª rodada de UX, ainda abertos:** a tela de "agora tocando" (mockup m1), o celular com abas embaixo e um mini player só (m4), o ritmo uniforme das faixas, comparar duas, a busca "/", as rotas inexistentes, os alvos de toque abaixo de 44 px, as setas da prateleira e o `requestAnimationFrame` sempre ligado.
- **S1. Gravação.** Um modo de gravação sem moldura, um ritmo por faixa com duração-alvo e os quadros pequenos centralizados (achado 7). Sem isso, os vídeos dos Conceitos não saem limpos.
- **S2, o resto.** A fonte mínima real do palco no celular (achado 3).
- **S5.** As capas desenhadas (achado 9), as rotas inexistentes (achado 11) e os P2 que sobram (achados 14, 15, 16 e 18).
- Do QA de conteúdo: as legendas dos gráficos com o método completo (seção 2.0) e a fusão das duas colisões numa faixa só, como o Dicionário já faz.

## Decisões do Pedro

Todas tomadas em 28/10/2026 ("aceito as sugestões, mete marcha"):

1. **Playlists:** os nomes ficam "Encontrar um item" (sem "numa lista"), "Contar ocorrências", "Organizar uma fila" e "Percorrer tudo". A Busca em largura mora em duas playlists, Percorrer tudo e Achar o caminho mais curto.
2. **Nome do site:** Big O Player, no `<title>`, na marca, no README e no vídeo 0.
3. **Estatística:** o álbum se dissolve. O Histograma vai para Contar ocorrências; Welford, Mediana e K-means vão para Problemas gerais.
4. **Ordem das seções:** Conceitos importantes → Fundamentos → Playlists (com Problemas gerais no fim) → Algoritmos e estruturas.
5. **Termos:** "feat." fica, como metáfora do player. "Instrumento" vira "estrutura" no texto e na navegação.
6. **Ordem das playlists:** a deste mapa.
7. **Trilha "Do zero":** a trilha fica arquivada. As 4 fichas de fundamentos dela viram ponto de partida dos vídeos de Fundamentos.
8. **Fundamentos não é glossário** (28/10, depois da prévia): vira a playlist inicial de vídeos, desligada até o primeiro vídeo. A home é só prateleiras.

Antes disso, também ficou decidido que os problemas com uma faixa só vão para a galeria Problemas gerais e que o vídeo 0 apresenta o site, separado do vídeo 1.
