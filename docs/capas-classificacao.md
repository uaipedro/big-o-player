# Capas de Classificar um exemplo

A playlist nova (issue #1) e a primeira faixa, o FIGS, entram com a capa provisória do site: o laranja da playlist, o rótulo `CLASSIFICAR UM EXEMPLO · CE-01` e o nome na grotesca. Este arquivo guarda o prompt da capa desenhada, no estilo da skill `big-o-player-capas` (fundo chapado, formas em preto e creme, um destaque só, título embaixo à esquerda, rótulo mono em cima à direita).

## A cor e o código

| playlist | código | fundo | formas | destaque | título |
|---|---|---|---|---|---|
| Classificar um exemplo | CE | laranja `#EC7A2C` (o `--laranja` do `estilo.css`) | preto `#1E1E1E` e creme `#FBF1D7` | azul `#0140C7` | preto |

O fundo é claro, então o título e o rótulo saem em preto, como em Contar ocorrências e Organizar uma fila. O azul do destaque é o mesmo dessas duas playlists.

A capa da playlist não precisa de arte própria: com uma faixa só, o site usa a capa da faixa (e o mosaico, quando houver quatro).

## CE-01 · FIGS

A ideia: várias árvores pequenas que, somadas, dão a resposta. Três árvores rasas lado a lado, ligadas por sinais de mais, e o resultado da soma como o único elemento azul. Uma árvore só, funda, não seria o FIGS; as três rasas e o "+" entre elas é o pulo do gato.

Lote 1×2 (a CE-01 e a próxima faixa da playlist, quando existir). Enquanto não houver a segunda, gere a CE-01 sozinha com o prompt de uma capa, mais abaixo.

```text
Uma imagem horizontal 2:1 com 2 capas quadradas lado a lado, separadas e contornadas por uma borda creme fina e contínua (#FBF1D7). As duas seguem o mesmo estilo de cartaz suíço dos anos 60: design gráfico plano, formas geométricas chapadas, sem gradiente, sem sombra, sem 3D, com uma textura leve de papel impresso.

Em todas as capas:
- fundo chapado laranja (#EC7A2C);
- ilustração geométrica no centro, ocupando da parte de cima até uns 70% da altura, só em preto (#1E1E1E) e creme (#FBF1D7), com UM único elemento de destaque em azul (#0140C7);
- no topo, alinhado à direita, um rótulo pequeno em fonte monoespaçada, caixa alta: "CLASSIFICAR UM EXEMPLO" e, separado por um espaço largo, o código da capa;
- embaixo, alinhado à esquerda, o título numa fonte grotesca pesadíssima (tipo Archivo Black), em preto, grande, ocupando quase toda a largura, entrelinha apertada;
- nenhum outro texto além do rótulo e do título.

Capa 1 (à esquerda) · código "CE-01" · título "FIGS":
três árvores pequenas e rasas, lado a lado, na mesma altura: cada uma é um círculo creme no topo ligado por linhas pretas grossas a dois ou três quadrados pretos embaixo (as folhas); a do meio tem um nível a mais de um lado. Entre uma árvore e a outra, um sinal de mais preto e grosso. À direita da última, um sinal de igual preto e um círculo azul cheio, do tamanho de um quadrado-folha: a soma.

Capa 2 (à direita) · código "CE-02" · título "{a próxima faixa}":
{a ideia, em formas concretas}

Escreva os títulos exatamente assim, com os acentos: "FIGS", "{título 2}".
```

Uma capa só, quadrada:

```text
Uma capa quadrada no estilo de cartaz suíço dos anos 60: design gráfico plano, formas geométricas chapadas, sem gradiente, sem sombra, sem 3D, com uma textura leve de papel impresso.

- fundo chapado laranja (#EC7A2C);
- ilustração geométrica no centro, ocupando da parte de cima até uns 70% da altura, só em preto (#1E1E1E) e creme (#FBF1D7), com UM único elemento de destaque em azul (#0140C7): três árvores pequenas e rasas, lado a lado, na mesma altura; cada uma é um círculo creme no topo ligado por linhas pretas grossas a dois ou três quadrados pretos embaixo (as folhas), e a do meio tem um nível a mais de um lado. Entre uma árvore e a outra, um sinal de mais preto e grosso. À direita da última, um sinal de igual preto e um círculo azul cheio, do tamanho de um quadrado-folha: a soma;
- no topo, alinhado à direita, um rótulo pequeno em fonte monoespaçada, caixa alta: "CLASSIFICAR UM EXEMPLO" e, separado por um espaço largo, "CE-01";
- embaixo, alinhado à esquerda, o título "FIGS" numa fonte grotesca pesadíssima (tipo Archivo Black), em preto, grande, ocupando quase toda a largura;
- nenhum outro texto além do rótulo e do título.
```

## Depois de gerar

Conferir no lote: o fundo laranja, o rótulo e o código, o título letra por letra, um azul só, nenhum texto na arte. Recortar com `python motor/capas.py` (ou o `scripts/recortar.py` da skill) com o nome `figs`, para sair `capas/figs-240.webp`, `capas/figs-480.webp` e `capas/figs-arte.webp`. O `gerar.py` liga a capa à faixa sozinho quando os três arquivos existem.
