// A simulação ao vivo de uma faixa: roda o algoritmo (simulacao/algoritmos.js),
// guarda o estado depois de cada evento e desenha qualquer instante num
// canvas, no visual dos vídeos (motor/video_ordenacao.py, algoritmos/kmeans/video.py).
// O tempo é medido em "unidades". No ritmo constante (o padrão), cada passo
// vale 1: comparação, troca, escrita, teste, chamada; no K-means, uma flor.
// No "accelerando", uma troca vale 2, o começo vai em câmera lenta e o resto
// corre. A velocidade só escala as unidades por segundo, então o seletor de
// tempo anda por elas.
(function () {
  "use strict";

  const W = 960, H = 540;
  const COR = {
    tinta: "#1e1e1e", cinza: "#686c73", palido: "#cdd0d6", claro: "#f4f5f7", borda: "#dee0e4",
    verde: "#169646", album: "#2869c3", mexeu: "#eb5f46", pivo: "#de9614", menor: "#00919b",
    maior: "#8c50b9", apagado: "#d6d8dd", aux: "#969aa0",
  };
  const GRUPOS = ["#2869c3", "#8c50b9", "#008c96", "#c8641e", "#5a7d1e"];
  const MONO = '"IBM Plex Mono", ui-monospace, monospace';
  const PASSOS_POR_SEGUNDO = 6;                          // ritmo constante, a 1×
  const RITMO = { ordenacao: 15, kmeans: 30, busca: 4, parenteses: 4, atendimento: 6, inverter: 4, janela: 6, grafo: 6, mediana: 15, welford: 8, histograma: 20, palavras: 8, repetidos: 6, colisao: 5,
    percursos: 6, abb: 8, avl: 8, figs: 12,
    matrizes: 8, fatorial: 4, fibonacci: 10, padrao: 8 };          // accelerando: unidades por segundo a 1×
  const CALMO = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // sem deslizar

  // ---------- utilidades de desenho ----------

  function texto(ctx, s, x, y, tam = 13, cor = COR.tinta, peso = 400, alinha = "left") {
    ctx.font = `${peso} ${tam}px ${MONO}`;
    ctx.fillStyle = cor;
    ctx.textAlign = alinha;
    ctx.textBaseline = "top";
    ctx.fillText(s, x, y);
  }

  function linha(ctx, x0, y0, x1, y1, cor, larg = 1) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = larg;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  function seta(ctx, cx, y) {
    ctx.fillStyle = COR.tinta;
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx - 5, y + 8); ctx.lineTo(cx + 5, y + 8); ctx.fill();
  }

  // legenda do topo, centrada; segmentos [texto, "b" negrito | "g" verde negrito | ""]
  function legenda(ctx, segs, y = 26, tam = 18) {
    ctx.font = `400 ${tam}px ${MONO}`;
    const larg = segs.reduce((t, [s, e]) => { ctx.font = `${e ? 600 : 400} ${tam}px ${MONO}`; return t + ctx.measureText(s).width; }, 0);
    let x = W / 2 - larg / 2;
    for (const [s, e] of segs) {
      ctx.font = `${e ? 600 : 400} ${tam}px ${MONO}`;
      ctx.fillStyle = e === "g" ? COR.verde : COR.tinta;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(s, x, y);
      x += ctx.measureText(s).width;
    }
  }

  // ---------- linha do tempo comum ----------

  function linhaDoTempo(pesos) {
    const inicio = new Float64Array(pesos.length + 1);
    for (let k = 0; k < pesos.length; k++) inicio[k + 1] = inicio[k] + pesos[k];
    return {
      inicio,
      total: inicio[pesos.length],
      // índice do último evento já acontecido na posição `u` (-1 = nenhum)
      eventoEm(u) {
        let lo = 0, hi = pesos.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (inicio[m] < u || (inicio[m] === u && pesos[m] === 0)) lo = m + 1; else hi = m; }
        return lo - 1;
      },
    };
  }

  // o painel de variáveis no instante `u`: a linha do pseudocódigo, as
  // variáveis do evento da vez e as que mudaram desde o passo anterior
  function painel(est, tl, pesos) {
    return function varsEm(u) {
      const k = tl.eventoEm(u);
      if (k < 0) return null;
      let linha = null;
      for (let j = k; j >= 0; j--) if (est[j].linha) { linha = est[j].linha; break; }
      // compara com o passo anterior da mesma chamada; numa chamada que acabou de abrir, nada mudou
      let antes = null;
      if (est[k].t !== "entra") for (let j = k - 1; j >= 0; j--) if (pesos[j] > 0 && est[j].chamada === est[k].chamada) { antes = est[j]; break; }
      const vars = est[k].vars || {};
      const mudou = Object.keys(vars).filter((n) => antes && antes.vars && vars[n] !== null && antes.vars[n] !== vars[n]);
      return { linha, vars, mudou, nivel: est[k].nivel, k };
    };
  }

  // ---------- ordenações ----------

  function simOrdenacao(faixa, vetor, accelerando) {
    const alg = faixa.alg;
    const r = Algoritmos.ordenar(alg, vetor);
    const N = vetor.length, ev = r.eventos;
    const temAux = alg === "intercalacao", temPilha = alg === "intercalacao" || alg === "rapida", quick = alg === "rapida";
    // heapsort: o heap mora em v[0, fim); com até 31 números, a árvore dele aparece acima das barras
    const heap = alg === "heapsort", temArvore = heap && N <= 31;
    const ideia = faixa.video.ideia;

    // reprodução: um estado depois de cada evento
    const v = vetor.slice(), aux = new Array(N).fill(null), pilha = [], chamadas = [], abertas = [];
    let part = null, comps = 0, movs = 0, pico = temAux ? N : 0, fimPart1 = -1, menor = null, fimHeap = N;
    const est = [];
    ev.forEach((e, k) => {
      let foco = null, mexeu = [];
      if (e.t === "compara") {
        comps++;
        foco = [e.i, e.j, e.onde];
        if (part && e.i === part.p) part = { ...part, j: e.j, jMenor: v[e.j] < v[part.p] };
      } else if (e.t === "troca") {
        movs++;
        const x = v[e.i]; v[e.i] = v[e.j]; v[e.j] = x;
        if (e.i !== e.j) mexeu = [["v", e.i], ["v", e.j]];
        if (part) {
          if (e.j === part.p) { part = null; if (fimPart1 < 0) fimPart1 = k; }
          else part = { ...part, i: part.i + 1, jMenor: false };
        }
      } else if (e.t === "escreve") {
        movs++;
        (e.onde === "aux" ? aux : v)[e.k] = e.x;
        mexeu = [[e.onde, e.k]];
      } else if (e.t === "entra") {
        pilha.push([e.a, e.b]);
        abertas.push(chamadas.length);
        chamadas.push({ a: e.a, b: e.b, nivel: pilha.length - 1, ini: k, fim: Infinity });
      } else if (e.t === "sai") {
        pilha.pop();
        chamadas[abertas.pop()].fim = k;
      } else if (e.t === "menor") {
        menor = e.m;
      } else if (e.t === "pivo") {
        const [a, b] = pilha[pilha.length - 1];
        part = { a, b, p: e.p, i: a, j: null, jMenor: false };
      }
      pico = Math.max(pico, (temAux ? N : 0) + pilha.length);
      if (e.t === "troca" && alg === "selecao") menor = null;   // o menor foi para a frente
      if (heap && e.t === "troca" && e.linha === 7) fimHeap--;  // a raiz foi para o fim: o heap encolhe
      est.push({ v: v.slice(), aux: temAux ? aux.slice() : null, nPilha: pilha.length, part, foco, mexeu, comps, movs, pico, menor, t: e.t, linha: e.linha, parte: e.parte, vars: e.vars, nivel: e.nivel, chamada: e.chamada, fim: fimHeap });
    });
    if (comps !== r.comparacoes || movs !== r.movimentos || pico !== r.pico) throw new Error("reprodução não bate com a execução");

    // azul = assentou de vez: no lugar final e nenhuma escrita a toca depois
    const ultimo = new Array(N).fill(-1);
    est.forEach((s, k) => s.mexeu.forEach(([onde, i]) => { if (onde === "v") ultimo[i] = k; }));

    // pesos: comparação 1, troca 2, escrita 1; câmera lenta no começo (no quick, a primeira partição) e pausa depois dela
    const visivel = (t) => t === "compara" || t === "troca" || t === "escreve";
    // accelerando: controle (testes, pivô, chamadas, parada) com um tempinho; câmera lenta no começo
    const CONTROLE = { testa: 0.6, pivo: 1.5, pare: 2, entra: 1, menor: 0.6 };
    let nvis = 0;
    const lentos = quick && fimPart1 >= 0 ? est.slice(0, fimPart1 + 1).filter((s) => visivel(s.t)).length : 8;
    const LENTO = quick ? 4.5 : 6.5, PAUSA = quick ? 39 : 0;
    const pesos = !accelerando ? est.map(() => 1) : est.map((s, k) => {
      let p = 0;
      if (visivel(s.t)) { p = (s.t === "troca" ? 2 : 1) * (nvis < lentos ? LENTO : 1); nvis++; }
      else if (CONTROLE[s.t]) p = CONTROLE[s.t] * (nvis < lentos ? 2 : 1);
      if (k === fimPart1) p += PAUSA;
      return p;
    });
    const tl = linhaDoTempo(pesos);
    const uLentoFim = (() => { let n = 0; for (let k = 0; k < est.length; k++) { if (visivel(est[k].t) && ++n === lentos) return tl.inicio[k + 1]; } return 0; })();
    const uPausa = fimPart1 >= 0 ? tl.inicio[fimPart1 + 1] - PAUSA : Infinity;
    const vis = (() => { let n = 0; return est.map((s) => (n += visivel(s.t) ? 1 : 0)); })();
    const kLento = (() => { let n = 0; for (let k = 0; k < est.length; k++) if (visivel(est[k].t) && ++n === lentos) return k; return -1; })();
    // qual legenda do topo: 0 = a primeira ideia, 1 = a do quick depois da 1ª partição, 2 = a última
    function fase(u, k) {
      if (heap) return k >= 0 && est[k].fim < N ? 2 : 0;    // montando o heap, depois tirando a raiz
      if (accelerando) return quick && u >= uPausa && u < uPausa + PAUSA ? 1 : u < (quick ? uPausa : uLentoFim) ? 0 : 2;
      if (quick && fimPart1 >= 0 && k >= fimPart1 && k < fimPart1 + 14) return 1;
      return k < (quick ? fimPart1 : kLento) ? 0 : 2;
    }
    const nivelMax = Math.max(0, ...chamadas.map((c) => c.nivel));

    // geometria (a mesma dos vídeos)
    const BX0 = 70, BX1 = 600, PTOPO = 96, BTOPO = temArvore ? 300 : 96;
    const BBASE = temAux || temPilha ? 316 : temArvore ? 440 : 410;
    const LEG_Y = temAux ? 520 : temArvore ? 484 : 470, PILHA_Y = temAux ? 340 : 350;
    const AUX_TOPO = 420, AUX_BASE = 492;
    const ROW = Math.min(8, ((temAux ? AUX_TOPO - 28 : LEG_Y - 14) - PILHA_Y - 20) / Math.max(1, nivelMax));
    const bw = (BX1 - BX0) / N, bx = (i) => BX0 + i * bw;

    // a árvore do heap: o nó i é a barra i; só a parte que ainda é heap
    function arvoreHeap(ctx, s, k, coral, fim) {
      const L = Math.floor(Math.log2(N)) + 1, TY0 = 84, DY = (BTOPO - 60 - TY0) / Math.max(1, L - 1);
      const R = Math.min(13, (BX1 - BX0) / 2 ** (L - 1) * 0.42);
      const pos = (i) => { const d = Math.floor(Math.log2(i + 1)), j = i + 1 - 2 ** d; return [BX0 + (j + 0.5) * (BX1 - BX0) / 2 ** d, TY0 + d * DY]; };
      const nos = fim ? 0 : s.fim;
      for (let i = 1; i < nos; i++) { const [x0, y0] = pos((i - 1) >> 1), [x1, y1] = pos(i); linha(ctx, x0, y0, x1, y1, COR.palido, 1.5); }
      const foco = !fim && k >= 0 && est[k].t === "compara" ? s.foco : null;
      for (let i = 0; i < nos; i++) {
        const [x, y] = pos(i), mexeu = coral.has(i), olhando = foco && (foco[0] === i || foco[1] === i);
        ctx.beginPath(); ctx.arc(x, y, R, 0, 7);
        ctx.fillStyle = mexeu ? COR.mexeu : "#fff"; ctx.fill();
        ctx.strokeStyle = COR.tinta; ctx.lineWidth = olhando ? 3 : 1.5; ctx.stroke();
        texto(ctx, String(s.v[i]), x, y - 7, 11, mexeu ? "#fff" : COR.tinta, 600, "center");
      }
      if (nos) texto(ctx, "o heap em árvore: o nó i é a barra i", BX0, TY0 - 34, 11, COR.cinza);
    }

    function corBarra(i, x, k, s, coral) {
      const assentou = x === i && k >= ultimo[i];
      if (quick) {
        const p = s.part;
        if (p && p.a <= i && i < p.b) {
          if (i === p.p) return COR.pivo;
          if (i < p.i || (i === p.j && p.jMenor)) return COR.menor;
          if (p.j !== null && i <= p.j) return COR.maior;
          return COR.tinta;
        }
        if (assentou) return COR.album;
        return p ? COR.apagado : COR.tinta;
      }
      if (assentou) return COR.album;
      return coral.has(i) ? COR.mexeu : COR.tinta;
    }

    function barras(ctx, vals, topo, base, cor) {
      vals.forEach((x, i) => {
        if (x === null) return;
        const h = (x + 1) / N * (base - topo);
        ctx.fillStyle = cor(i, x);
        ctx.fillRect(bx(i) + bw * 0.12, base - h, bw * 0.76, h);
      });
    }

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u);
      const fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { v: vetor, aux: temAux ? new Array(N).fill(null) : null, nPilha: 0, part: null, foco: null, comps: 0, movs: 0, pico: temAux ? N : 0, fim: N };
      const agoraVis = k >= 0 ? vis[k] : 0;
      const coral = new Set(), coralAux = new Set();
      if (!quick) for (let j = Math.max(0, k - 12); j <= k; j++) if (agoraVis - vis[j] < 3) est[j].mexeu.forEach(([o, i]) => (o === "v" ? coral : coralAux).add(i));

      if (temArvore) arvoreHeap(ctx, s, k, coral, fim);
      if (heap && !fim && s.fim < N) {   // a fronteira: o heap à esquerda, os já no lugar à direita
        const xf = bx(s.fim);
        ctx.setLineDash([4, 4]); linha(ctx, xf, BTOPO - 14, xf, BBASE + 1, COR.cinza); ctx.setLineDash([]);
        texto(ctx, "heap ←", xf - 6, BTOPO - 26, 11, COR.cinza, 400, "right");
        texto(ctx, "→ no lugar", xf + 6, BTOPO - 26, 11, COR.cinza);
      }
      linha(ctx, BX0, BBASE + 1, BX1, BBASE + 1, COR.palido);
      barras(ctx, s.v, BTOPO, BBASE, (i, x) => corBarra(i, x, k, s, coral));
      const foco = !fim && k >= 0 && est[k].t === "compara" ? s.foco : null;
      if (foco && foco[2] === "v") { seta(ctx, bx(foco[0]) + bw / 2, BBASE + 5); seta(ctx, bx(foco[1]) + bw / 2, BBASE + 5); }
      if (quick && s.part) texto(ctx, "pivô", bx(s.part.p) + bw / 2, BBASE + 14, 11, COR.tinta, 600, "center");
      if (!fim && s.menor != null) texto(ctx, "menor", bx(s.menor) + bw / 2, BBASE + 16, 11, COR.tinta, 600, "center");

      if (temPilha) {
        texto(ctx, `pilha: ${s.nPilha} ${s.nPilha === 1 ? "nível" : "níveis"}   (árvore de chamadas: escuro = aberta, claro = resolvida)`, BX0, PILHA_Y, 11, COR.cinza);
        for (const c of chamadas) {
          if (c.ini > k) break;
          const y = PILHA_Y + 20 + c.nivel * ROW, ativa = c.fim > k, cor = ativa ? COR.tinta : COR.palido;
          if (c.b - c.a <= 1) {
            if (c.b > c.a) { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(bx(c.a) + bw / 2, y, 2, 0, 7); ctx.fill(); }
          } else linha(ctx, bx(c.a) + 2, y, bx(c.b) - 2, y, cor, 3);
        }
      }
      if (temAux) {
        texto(ctx, `lista auxiliar: ${N} posições de memória extra`, BX0, AUX_TOPO - 22, 11, COR.cinza);
        linha(ctx, BX0, AUX_BASE + 1, BX1, AUX_BASE + 1, COR.palido);
        barras(ctx, s.aux, AUX_TOPO, AUX_BASE, (i) => (coralAux.has(i) ? COR.mexeu : COR.aux));
        if (foco && foco[2] === "aux") { seta(ctx, bx(foco[0]) + bw / 2, AUX_BASE + 4); seta(ctx, bx(foco[1]) + bw / 2, AUX_BASE + 4); }
      }

      // painel
      const x = 650;
      texto(ctx, "comparações", x, PTOPO - 6, 13, COR.cinza);
      texto(ctx, String(s.comps), x, PTOPO + 10, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, r.movimento, x, PTOPO + 84, 13, COR.cinza);
      texto(ctx, String(s.movs), x, PTOPO + 100, 26, COR.tinta, 700);
      const extra = (temAux ? N : 0) + s.nPilha;
      texto(ctx, "memória extra agora", x, PTOPO + 154, 13, COR.cinza);
      texto(ctx, `${extra} ${extra === 1 ? "valor" : "valores"}`, x, PTOPO + 170, 20, COR.tinta, 700);
      if (temAux || temPilha) texto(ctx, `pico até aqui: ${s.pico}`, x, PTOPO + 198, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N} números`, x, temArvore ? PTOPO + 228 : Math.max(BBASE - 14, PTOPO + 228), 13, COR.cinza);
      if (heap && !fim) texto(ctx, s.fim < N ? `no heap: ${s.fim}; no lugar: ${N - s.fim}` : "montando o heap", x, PTOPO + 252, 13, COR.cinza);

      // legenda das cores
      const itens = quick
        ? [[COR.pivo, "pivô"], [COR.menor, "menor que o pivô"], [COR.maior, "maior"], [COR.tinta, "falta comparar"], [COR.album, "no lugar final"]]
        : [[COR.album, "no lugar final"], [COR.mexeu, "acabou de se mexer"], [COR.tinta, "o resto"]];
      let lx = BX0;
      for (const [cor, rot] of itens) {
        ctx.fillStyle = cor; ctx.fillRect(lx, LEG_Y + 2, 10, 10);
        texto(ctx, rot, lx + 16, LEG_Y, 11, COR.cinza);
        ctx.font = `400 11px ${MONO}`;
        lx += 16 + ctx.measureText(rot).width + 26;
      }

      // legenda do topo
      if (fim) legenda(ctx, [["ordenado: ", ""], [`${r.comparacoes} comparações`, "g"], [`, ${r.movimentos} ${r.movimento}`, ""]]);
      else legenda(ctx, [[ideia[[0, 1, ideia.length - 1][fase(u, k)]], ""]]);
    }

    return {
      total: tl.total, ritmo: accelerando ? RITMO.ordenacao : PASSOS_POR_SEGUNDO, desenhar,
      varsEm: painel(est, tl, pesos),
      eventoEm: (u) => tl.eventoEm(u), uDoEvento: (k) => (k < 0 ? 0 : tl.inicio[k + 1]),
      passos: est.map((s, k) => (pesos[k] > 0 ? tl.inicio[k + 1] : null)).filter((x) => x !== null),
      resumo: { comparacoes: r.comparacoes, movimentos: r.movimentos, movimento: r.movimento, pico: r.pico, n: N },
      contagemEm(u) { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; },
    };
  }

  // ---------- K-means ----------

  function simKmeans(faixa, pontos, iniciais, accelerando) {
    const r = Algoritmos.kmeans(pontos, iniciais.map((i) => pontos[i]));
    const N = pontos.length, K = iniciais.length, ev = r.eventos;
    const PX0 = 78, PX1 = 540, PY0 = 100, PY1 = 412;
    const xs = pontos.map((p) => p[0]), ys = pontos.map((p) => p[1]);
    const [XMIN, XMAX] = [Math.min(...xs) - 0.4, Math.max(...xs) + 0.4], [YMIN, YMAX] = [Math.min(...ys) - 0.25, Math.max(...ys) + 0.4];
    const P = (x, y) => [PX0 + (x - XMIN) / (XMAX - XMIN) * (PX1 - PX0), PY1 - (y - YMIN) / (YMAX - YMIN) * (PY1 - PY0)];

    // estados: rótulos visíveis, centros (com o deslize), distâncias, voltas
    const rot = new Array(N).fill(-1);
    let centros = null, centrosAntes = null, dists = 0, volta = 0;
    const tabela = [];   // por volta: distâncias acumuladas e quantos mudaram
    let mudaram = 0;
    const est = [];
    for (const e of ev) {
      let foco = null;
      if (e.t === "dist") { dists++; foco = [e.i, e.j]; }
      else if (e.t === "testa" || e.t === "atribui") foco = [e.i, e.j];   // as linhas da flor continuam à vista
      else if (e.t === "rotulo") { rot[e.i] = e.g; if (e.mudou) mudaram++; foco = [e.i, K - 1]; }   // parado na flor: as k medidas dela
      else if (e.t === "volta") { tabela.push({ volta: volta + 1, dists, mudaram }); volta++; mudaram = 0; }
      else if (e.t === "centros") { centrosAntes = centros; centros = e.centros; }
      est.push({ t: e.t, rot: rot.slice(), centros, centrosAntes, dists, nVoltas: tabela.length, foco, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0 });
    }
    if (dists !== r.distancias || tabela.length !== r.voltas) throw new Error("reprodução do k-means não bate");

    // pesos: as 4 primeiras flores devagar; cada centro desliza em 12 unidades; pausa no fim de cada volta
    let flor = 0;
    // ritmo constante: um passo por flor (as contas dela dividem o passo, e ele acaba na escolha do grupo),
    // um por deslize dos centros e um por fim de volta
    const constante = () => {
      const p = new Array(est.length).fill(0);
      let ini = 0;
      est.forEach((s, k) => {
        if (s.t === "rotulo") { for (let j = ini; j <= k; j++) p[j] = 1 / (k - ini + 1); ini = k + 1; }
        else if (s.t === "centros" || s.t === "volta") { p[k] = 1; ini = k + 1; }
      });
      return p;
    };
    const pesos = !accelerando ? constante() : est.map((s, k) => {
      if (s.t === "dist") return flor < 4 ? 6 : 0.2;
      if (s.t === "testa") return flor < 4 ? 3 : 0.1;
      if (s.t === "rotulo") { flor++; return flor <= 4 ? 4 : 0.4; }
      if (s.t === "centros") return k === 0 ? 30 : 24;
      if (s.t === "volta") return 10;
      return 0;
    });
    const tl = linhaDoTempo(pesos);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u);
      const fim = u >= tl.total;
      const s = k >= 0 ? est[k] : est[0];
      // deslize dos centros: durante o evento "centros", vai da posição antiga à nova
      let cs = s.centros;
      if (k >= 0 && s.t === "centros" && s.centrosAntes) {
        const f = Math.min(1, Math.max(0, (u - tl.inicio[k]) / pesos[k]));
        const e = f * f * (3 - 2 * f), a = s.centrosAntes;
        cs = a.map((q, j) => [q[0] + (s.centros[j][0] - q[0]) * e, q[1] + (s.centros[j][1] - q[1]) * e]);
      }
      // eixos
      linha(ctx, PX0, PY1, PX1, PY1, COR.palido); linha(ctx, PX0, PY0, PX0, PY1, COR.palido);
      for (let x = Math.ceil(XMIN); x <= XMAX; x++) { const [X] = P(x, 0); texto(ctx, String(x), X, PY1 + 6, 11, COR.cinza, 400, "center"); }
      for (let y = Math.ceil(YMIN); y <= YMAX; y++) { const [, Y] = P(0, y); texto(ctx, String(y), PX0 - 8, Y - 7, 11, COR.cinza, 400, "right"); }
      texto(ctx, "comprimento da pétala (cm)", PX1, PY1 + 22, 11, COR.cinza, 400, "right");
      texto(ctx, "largura (cm)", PX0 + 6, PY0 - 6, 11, COR.cinza);
      // linhas de medida da flor da vez
      if (!fim && s.foco) {
        const [px, py] = P(...pontos[s.foco[0]]);
        for (let j = 0; j <= s.foco[1]; j++) { const [cx, cy] = P(...cs[j]); linha(ctx, px, py, cx, cy, "#9a9ea6", 1); }
      }
      // flores
      pontos.forEach((p, i) => {
        const [X, Y] = P(p[0], p[1]);
        ctx.fillStyle = s.rot[i] >= 0 ? GRUPOS[s.rot[i] % GRUPOS.length] : "#afb2b8";
        ctx.beginPath(); ctx.arc(X, Y, 3.4, 0, 7); ctx.fill();
      });
      // centros
      cs.forEach((q, j) => {
        const [X, Y] = P(q[0], q[1]);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = GRUPOS[j % GRUPOS.length]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = GRUPOS[j % GRUPOS.length]; ctx.beginPath(); ctx.arc(X, Y, 2.2, 0, 7); ctx.fill();
      });
      // tira de memória: um rótulo por flor
      const SY = 460, w = (PX1 - PX0) / N;
      s.rot.forEach((g, i) => { ctx.fillStyle = g >= 0 ? GRUPOS[g % GRUPOS.length] : COR.claro; ctx.fillRect(PX0 + i * w, SY, w - 0.6, 12); });
      ctx.strokeStyle = COR.borda; ctx.lineWidth = 1; ctx.strokeRect(PX0 - 0.5, SY - 0.5, PX1 - PX0 + 1, 13);
      texto(ctx, `memória: ${N} rótulos (um por flor) + ${r.pico - N} dos centros e somas`, PX0, SY + 20, 12, COR.cinza);
      // painel
      const x = 600;
      texto(ctx, "distâncias calculadas", x, PY0 - 6, 13, COR.cinza);
      texto(ctx, String(s.dists), x, PY0 + 12, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "volta       total  mudaram", x, PY0 + 92, 13, COR.cinza);
      linha(ctx, x, PY0 + 112, x + 300, PY0 + 112, COR.borda);
      tabela.slice(0, s.nVoltas).slice(-9).forEach((t, i) => {
        const y = PY0 + 120 + i * 22, ult = t.mudaram === 0;
        texto(ctx, String(t.volta).padStart(5), x, y, 14);
        texto(ctx, String(t.dists).padStart(10), x + 56, y, 14);
        texto(ctx, String(t.mudaram).padStart(7), x + 166, y, 14, ult ? COR.verde : COR.tinta, ult ? 700 : 400);
      });
      texto(ctx, `n = ${N} flores   k = ${K} centros`, x, PY1 + 20, 13, COR.cinza);
      // legenda do topo
      if (fim) legenda(ctx, [[`na volta ${r.voltas} `, ""], ["ninguém mudou", "b"], [" de grupo: para", ""]]);
      else if (k < 1) legenda(ctx, [[`${K} centros`, "b"], [" sorteados para começar", ""]]);
      else if (s.nVoltas === 0) legenda(ctx, [["cada flor mede a distância até ", ""], ["cada centro", "b"]]);
      else if (s.nVoltas === 1 && s.t !== "centros" && s.t !== "dist") legenda(ctx, [[`${N} × ${K} = `, ""], [`${N * K} distâncias`, "g"], [" por volta", ""]]);
      else if (s.t === "volta" || s.t === "centros") legenda(ctx, [["cada centro vai para a ", ""], ["média", "b"], [" do seu grupo", ""]]);
      else legenda(ctx, [["e repete: ", ""], [`+${N * K}`, "b"], [" a cada volta", ""]]);
    }

    return {
      total: tl.total, ritmo: accelerando ? RITMO.kmeans : PASSOS_POR_SEGUNDO, desenhar,
      varsEm: painel(est, tl, pesos),
      eventoEm: (u) => tl.eventoEm(u), uDoEvento: (k) => (k < 0 ? 0 : tl.inicio[k + 1]),
      passos: est.map((s, k) => (s.t === "rotulo" || s.t === "centros" || s.t === "volta" ? tl.inicio[k + 1] : null)).filter((x) => x !== null),
      resumo: { distancias: r.distancias, voltas: r.voltas, pico: r.pico, n: N, k: K },
      contagemEm(u) { const k = tl.eventoEm(u); return k >= 0 ? est[k].dists : 0; },
    };
  }

  // ---------- comuns às faixas novas ----------

  // número com vírgula decimal e uma casa, como no resto da página
  const decimal = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(".", ",");

  function legendaCores(ctx, itens, y) {
    let lx = 70;
    for (const [cor, rot, borda, larg = 1] of itens) {   // borda: a cor do contorno da amostra, quando ele faz parte do papel
      ctx.fillStyle = cor; ctx.fillRect(lx, y + 2, 10, 10);
      if (borda || cor === COR.claro || cor === "#fff") { ctx.strokeStyle = borda || COR.borda; ctx.lineWidth = larg; ctx.strokeRect(lx + 0.5, y + 2.5, 9, 9); }
      texto(ctx, rot, lx + 16, y, 11, COR.cinza);
      ctx.font = `400 11px ${MONO}`;
      lx += 16 + ctx.measureText(rot).width + 26;
    }
  }

  // pesos com câmera lenta nos primeiros `lentos` eventos que contam
  function pesosLentos(est, peso, conta, lentos, fator) {
    let n = 0;
    return est.map((s) => {
      const p = peso[s.t] || 0;
      const lento = n < lentos;
      if (conta(s.t)) n++;
      return p * (lento ? fator : 1);
    });
  }

  // o que toda simulação expõe ao player: painel de variáveis, troca de ritmo sem perder o lugar e os passos
  function comum(tl, est, pesos, ritmoAccelerando, accelerando) {
    return {
      ritmo: accelerando ? ritmoAccelerando : PASSOS_POR_SEGUNDO,
      varsEm: painel(est, tl, pesos),
      eventoEm: (u) => tl.eventoEm(u), uDoEvento: (k) => (k < 0 ? 0 : tl.inicio[k + 1]),
      passos: est.map((s, k) => (pesos[k] > 0 ? tl.inicio[k + 1] : null)).filter((x) => x !== null),
    };
  }

  // ---------- buscas ----------

  function simBusca(faixa, vetor, alvo, accelerando) {
    const alg = faixa.alg, bin = alg === "binaria";
    const r = Algoritmos.buscar(alg, vetor, alvo);
    const N = vetor.length, ideia = faixa.video.ideia;
    const olhadas = new Set();
    let a = 0, b = N - 1, meio = null, achou = -1, comps = 0;
    const est = r.eventos.map((e) => {
      let foco = null;
      if (e.t === "compara") { comps++; foco = e.i; if (!bin) olhadas.add(e.i); }
      else if (e.t === "corta") { a = e.a; b = e.b; meio = null; }
      else if (e.t === "meio") meio = e.m;
      else if (e.t === "achou") achou = e.i;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, foco, olhadas: olhadas.size, a, b, meio, achou, comps, op: e.op };
    });
    if (comps !== r.comparacoes) throw new Error("reprodução da busca não bate");
    const conta = (t) => t === "compara";
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, bin ? { compara: 3, meio: 1.5, corta: 2.5, testa: 0.6, achou: 3, pare: 1, devolva: 3 }
      : { compara: 1.5, achou: 3, pare: 1, devolva: 3 }, conta, bin ? 0 : 4, 2.5);
    const tl = linhaDoTempo(pesos);
    const BX0 = 70, BX1 = 600, BTOPO = 96, BBASE = bin ? 380 : 410;
    const bw = (BX1 - BX0) / N, bx = (i) => BX0 + i * bw;
    const altura = (x) => (x / 2 + 1) / N * (BBASE - BTOPO);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { foco: null, olhadas: 0, a: 0, b: N - 1, meio: null, achou: -1, comps: 0 };
      const agora = !fim && k >= 0 && est[k].t === "compara" ? s.foco : null;
      linha(ctx, BX0, BBASE + 1, BX1, BBASE + 1, COR.palido);
      vetor.forEach((x, i) => {
        let cor = COR.tinta;
        if (i === s.achou) cor = COR.verde;
        else if (i === agora || (bin && i === s.meio)) cor = COR.mexeu;
        else if (bin ? i < s.a || i > s.b : i < s.olhadas) cor = COR.apagado;   // a sequencial olha na ordem
        const h = altura(x);
        ctx.fillStyle = cor;
        ctx.fillRect(bx(i) + bw * 0.12, BBASE - h, bw * 0.76, h);
      });
      // o alvo: uma linha na altura dele (um ímpar cai entre dois números)
      const ya = Math.max(BTOPO - 6, BBASE - altura(alvo));
      ctx.setLineDash([5, 4]); linha(ctx, BX0, ya, BX1, ya, COR.cinza, 1.2); ctx.setLineDash([]);
      texto(ctx, "alvo", BX0 - 6, ya - 7, 11, COR.cinza, 400, "right");
      const foco = agora !== null ? agora : bin && !fim ? s.meio : null;
      if (foco !== null) seta(ctx, bx(foco) + bw / 2, BBASE + 5);
      if (bin && s.a <= s.b && !(fim && s.achou >= 0)) {
        const y = BBASE + 24;
        linha(ctx, bx(s.a) + 2, y, bx(s.b + 1) - 2, y, COR.tinta, 2);
        linha(ctx, bx(s.a) + 2, y - 4, bx(s.a) + 2, y + 4, COR.tinta, 2);
        linha(ctx, bx(s.b + 1) - 2, y - 4, bx(s.b + 1) - 2, y + 4, COR.tinta, 2);
        const resta = s.b - s.a + 1;
        const meioX = Math.min(BX1 - 120, Math.max(BX0 + 120, (bx(s.a) + bx(s.b + 1)) / 2));
        texto(ctx, `ainda pode estar aqui: ${resta} ${resta === 1 ? "casa" : "casas"}`, meioX, y + 10, 11, COR.cinza, 400, "center");
      } else if (bin && s.a > s.b) texto(ctx, "não sobrou casa nenhuma", BX0, BBASE + 36, 11, COR.cinza);

      const x = 650;
      texto(ctx, "comparações", x, BTOPO - 6, 13, COR.cinza);
      texto(ctx, String(s.comps), x, BTOPO + 10, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "alvo", x, BTOPO + 84, 13, COR.cinza);
      texto(ctx, String(alvo), x, BTOPO + 100, 26, COR.tinta, 700);
      if (bin) {
        const resta = Math.max(0, s.b - s.a + 1);
        texto(ctx, "trecho que sobra", x, BTOPO + 154, 13, COR.cinza);
        texto(ctx, `${resta} ${resta === 1 ? "casa" : "casas"}`, x, BTOPO + 170, 20, COR.tinta, 700);
      } else {
        texto(ctx, "casas olhadas", x, BTOPO + 154, 13, COR.cinza);
        texto(ctx, `${s.olhadas} de ${N}`, x, BTOPO + 170, 20, COR.tinta, 700);
      }
      texto(ctx, "memória extra: 0 valores", x, BTOPO + 210, 13, COR.cinza);
      texto(ctx, `n = ${N} números`, x, BBASE - 14, 13, COR.cinza);

      legendaCores(ctx, bin
        ? [[COR.mexeu, "o meio"], [COR.tinta, "ainda pode ter o alvo"], [COR.apagado, "descartada"], [COR.verde, "achou"]]
        : [[COR.mexeu, "comparando agora"], [COR.apagado, "já olhada"], [COR.tinta, "falta olhar"], [COR.verde, "achou"]], 470);

      if (fim && r.posicao >= 0) legenda(ctx, [["achou o ", ""], [String(alvo), "b"], [` na casa ${r.posicao + 1}: `, ""], [`${r.comparacoes} ${r.comparacoes === 1 ? "comparação" : "comparações"}`, "g"]]);
      else if (fim) legenda(ctx, [["o ", ""], [String(alvo), "b"], [" não está no vetor: ", ""], [`${r.comparacoes} comparações`, "g"]]);
      // a segunda frase da sequencial é sobre o alvo ausente: só aparece quando ele não está lá
      else if (s.comps < (bin ? 2 : 4) || (!bin && r.posicao >= 0)) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.busca, accelerando),
      resumo: { comparacoes: r.comparacoes, posicao: r.posicao, alvo, n: N, pico: 0 }, contagemEm,
      medidor: () => `${r.comparacoes} comparações, n = ${N}<br>sem memória extra`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.comparacoes} comparações, ${r.posicao >= 0 ? `o ${alvo} está na casa ${r.posicao + 1}` : `o ${alvo} não está no vetor`}, sem memória extra.`,
    };
  }

  // ---------- parênteses balanceados ----------

  function simParenteses(faixa, texto_, accelerando) {
    const r = Algoritmos.parenteses(texto_);
    const N = texto_.length, ideia = faixa.video.ideia;
    const pilha = [], pares = [];       // pilha: posições no texto; pares: [abre, fecha] já resolvidos
    let lendo = -1, ops = 0, comps = 0, pico = 0, erro = null;
    const est = r.eventos.map((e) => {
      if (e.t === "le") lendo = e.k;
      else if (e.t === "empilha") { pilha.push(e.k); ops++; }
      else if (e.t === "desempilha") { pares.push([pilha.pop(), e.k]); ops++; }
      else if (e.t === "compara") comps++;
      else if (e.t === "erro" && !erro) erro = { k: e.k, motivo: e.motivo };   // vale o primeiro: depois de um par errado, a pilha também sobra
      pico = Math.max(pico, pilha.length);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, lendo, pilha: pilha.slice(), nPares: pares.length, ops, comps, pico, erro, ok: e.t === "compara" ? e.topo === { ")": "(", "]": "[", "}": "{" }[e.s] : null };
    });
    if (ops !== r.ops || pico !== r.pico) throw new Error("reprodução dos parênteses não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { le: 0.5, empilha: 1.5, desempilha: 1.5, compara: 1, testa: 0.4, erro: 4, pare: 1, devolva: 3 },
      (t) => t === "le", 4, 2.5);
    const tl = linhaDoTempo(pesos);
    const TX0 = 70, TX1 = 500, TY = 120, cw = Math.min(30, (TX1 - TX0) / N), tx = (k) => TX0 + k * cw;
    const PX = 530, PW = 60, PBASE = 460, ch = Math.min(30, 330 / Math.max(1, r.pico)), PTOPO = PBASE - Math.max(3, r.pico) * ch;
    const MOTIVO = { vazia: "fecha sem ninguém aberto", par: "par errado", sobra: "sobrou aberto na pilha" };

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { lendo: -1, pilha: [], nPares: 0, ops: 0, comps: 0, pico: 0, erro: null };
      const naPilha = new Set(s.pilha), resolvidos = new Set(pares.slice(0, s.nPares).flat());
      // o texto: um símbolo por casa
      const tam = Math.max(10, Math.min(24, cw * 0.95));
      for (let i = 0; i < N; i++) {
        let cor = COR.palido, peso = 600;
        if (s.erro && i === s.erro.k) cor = COR.mexeu;
        else if (i === s.lendo && !fim) cor = COR.mexeu;
        else if (naPilha.has(i)) cor = COR.tinta;
        else if (resolvidos.has(i)) cor = COR.cinza;
        else if (i <= s.lendo) cor = COR.cinza;
        else peso = 400;
        texto(ctx, texto_[i], tx(i) + cw / 2, TY, tam, cor, peso, "center");
      }
      if (s.lendo >= 0 && !fim) seta(ctx, tx(s.lendo) + cw / 2, TY + tam + 6);
      // os pares que já fecharam: um arco de quem abriu até quem fechou
      for (const [a, b] of pares.slice(0, s.nPares)) {
        const xa = tx(a) + cw / 2, xb = tx(b) + cw / 2, prof = Math.min(90, 8 + (xb - xa) * 0.35);
        ctx.strokeStyle = COR.palido; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(xa, TY + tam + 18); ctx.quadraticCurveTo((xa + xb) / 2, TY + tam + 18 + prof, xb, TY + tam + 18); ctx.stroke();
      }
      if (s.nPares) texto(ctx, "arcos: os pares que já fecharam", TX0, TY + tam + 116, 11, COR.cinza);
      // a pilha, em pé: o fundo embaixo, o topo em cima
      texto(ctx, "pilha", PX + PW / 2, PTOPO - 36, 13, COR.cinza, 400, "center");
      linha(ctx, PX, PBASE, PX + PW, PBASE, COR.tinta, 2);
      linha(ctx, PX, PTOPO - 14, PX, PBASE, COR.palido); linha(ctx, PX + PW, PTOPO - 14, PX + PW, PBASE, COR.palido);
      s.pilha.forEach((pos, j) => {
        const y = PBASE - (j + 1) * ch, topo = j === s.pilha.length - 1;
        ctx.fillStyle = topo && k >= 0 && est[k].t === "empilha" ? COR.mexeu : COR.claro;
        ctx.fillRect(PX + 4, y + 1, PW - 8, ch - 2);
        if (ch >= 12) texto(ctx, texto_[pos], PX + PW / 2, y + ch / 2 - Math.min(9, ch * 0.4), Math.min(16, ch * 0.75), COR.tinta, 600, "center");
        if (topo) texto(ctx, "topo", PX + PW + 6, y + ch / 2 - 7, 11, COR.cinza);
      });

      const x = 650;
      texto(ctx, "operações na pilha", x, 90, 13, COR.cinza);
      texto(ctx, String(s.ops), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "pares conferidos", x, 174, 13, COR.cinza);
      texto(ctx, String(s.comps), x, 190, 26, COR.tinta, 700);
      texto(ctx, "memória extra agora", x, 244, 13, COR.cinza);
      texto(ctx, `${s.pilha.length} ${s.pilha.length === 1 ? "símbolo" : "símbolos"}`, x, 260, 20, COR.tinta, 700);
      texto(ctx, `pico até aqui: ${s.pico}`, x, 288, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N} símbolos`, x, 330, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "lendo agora"], [COR.tinta, "abriu e espera o par"], [COR.cinza, "já resolvido"], [COR.palido, "falta ler"]], 500);

      if (fim && r.certo) legenda(ctx, [["balanceado: ", ""], [`${r.ops} operações na pilha`, "g"]]);
      else if (fim) legenda(ctx, [["não balanceado (", ""], [MOTIVO[s.erro.motivo], "b"], ["): ", ""], [`${r.ops} operações`, "g"]]);
      else if (s.ops < 6) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.parenteses, accelerando),
      resumo: { ops: r.ops, certo: r.certo, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} operações na pilha, n = ${N}<br>pilha de até ${r.pico}`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} operações na pilha, ${r.certo ? "balanceado" : "não balanceado"}, pilha de até ${r.pico} ${r.pico === 1 ? "símbolo" : "símbolos"}.`,
    };
  }

  // ---------- fila de atendimento ----------

  function simAtendimento(faixa, chegada, duracao, accelerando) {
    const r = Algoritmos.atendimento(chegada, duracao);
    const N = chegada.length, ideia = faixa.video.ideia;
    // o minuto de cada evento: quando chega, quando o caixa chama, quando começa
    let t = 0, casas = [null], inicio = 0, atendendo = null, ops = 0, soma = 0, atendidos = 0, maior = 0, naFila = 0;
    const serie = [[0, 0]];             // [minuto, tamanho da fila]
    const est = r.eventos.map((e) => {
      if (e.t === "enfileira") { t = e.tempo; casas = e.casas; inicio = e.inicio; ops++; naFila++; }
      else if (e.t === "chama") { t = e.tempo; casas = e.casas; inicio = e.inicio; ops++; naFila--; }
      else if (e.t === "direto") t = e.tempo;
      else if (e.t === "atende") { atendendo = e; soma += e.espera; atendidos++; }
      else if (e.t === "maior") maior = e.maior;
      if (e.t === "enfileira" || e.t === "chama") {   // no mesmo minuto, vale o tamanho depois do último evento
        if (serie.at(-1)[0] === t) serie.at(-1)[1] = naFila; else serie.push([t, naFila]);
      }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, tempo: t, casas, inicio, naFila, atendendo, ops, soma, atendidos, maior, e };
    });
    if (ops !== r.ops || soma !== r.soma) throw new Error("reprodução do atendimento não bate");
    const fimDia = Math.max(...r.eventos.filter((e) => e.t === "atende").map((e) => e.fim));
    // ritmo constante: cada evento é um passo, e o relógio anda dentro dele até o minuto do próximo.
    // accelerando: um tempinho em cada evento, mais os minutos até o próximo (o dia corre como um relógio)
    const MIN = 0.5, HOLD = accelerando ? { enfileira: 1.2, chama: 1.2, direto: 1.2, atende: 0.6, testa: 0.15, maior: 0.3, devolva: 2 } : {};
    const pesos = !accelerando ? est.map(() => 1)
      : est.map((s, k) => (HOLD[s.t] || 0) + MIN * ((k + 1 < est.length ? est[k + 1].tempo : fimDia) - s.tempo));
    const tl = linhaDoTempo(pesos);
    const relogio = (u, k) => {
      if (k < 0) return 0;
      const s = est[k], h = HOLD[s.t] || 0, prox = k + 1 < est.length ? est[k + 1].tempo : fimDia;
      return s.tempo + Math.max(0, Math.min(1, (u - tl.inicio[k] - h) / Math.max(1e-9, pesos[k] - h))) * (prox - s.tempo);
    };
    const GX0 = 70, GX1 = 600, GY0 = 250, GY1 = 420, ymax = Math.max(1, r.maior);
    const gx = (m) => GX0 + m / fimDia * (GX1 - GX0), gy = (q) => GY1 - q / ymax * (GY1 - GY0 - 10);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total, agora = fim ? fimDia : relogio(u, k);
      const s = k >= 0 ? est[k] : { casas: [null], inicio: 0, naFila: 0, atendendo: null, ops: 0, soma: 0, atendidos: 0, maior: 0 };
      // o caixa
      const at = s.atendendo && agora < s.atendendo.fim ? s.atendendo : null;
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.strokeRect(GX0, 92, 110, 74);
      texto(ctx, "caixa", GX0 + 55, 74, 11, COR.cinza, 400, "center");
      if (at) {
        texto(ctx, `cliente ${at.k + 1}`, GX0 + 55, 108, 14, COR.tinta, 600, "center");
        const f = Math.min(1, (agora - at.inicio) / (at.fim - at.inicio));
        ctx.fillStyle = COR.claro; ctx.fillRect(GX0 + 12, 138, 86, 8);
        ctx.fillStyle = COR.tinta; ctx.fillRect(GX0 + 12, 138, 86 * f, 8);
      } else texto(ctx, "livre", GX0 + 55, 116, 14, COR.cinza, 400, "center");
      // a fila circular, casa por casa, com o início e o fim marcados
      const C = s.casas.length, FX0 = 220, cwid = Math.min(40, (GX1 - FX0) / C);
      texto(ctx, `fila circular: ${C} ${C === 1 ? "casa" : "casas"} (dobra quando enche)`, FX0, 74, 11, COR.cinza);
      s.casas.forEach((c, i) => {
        const xx = FX0 + i * cwid, mexeu = k >= 0 && (s.t === "enfileira" || s.t === "chama") && est[k].e.i === c && c !== null;
        ctx.fillStyle = c === null ? "#fff" : mexeu ? COR.mexeu : COR.claro;
        ctx.fillRect(xx + 1, 92, cwid - 2, 40);
        ctx.strokeStyle = COR.borda; ctx.lineWidth = 1; ctx.strokeRect(xx + 1, 92, cwid - 2, 40);
        if (c !== null) texto(ctx, String(c + 1), xx + cwid / 2, 104, Math.min(14, cwid * 0.45), mexeu ? "#fff" : COR.tinta, 600, "center");
      });
      if (s.naFila > 0) {
        texto(ctx, "▲ início", FX0 + s.inicio * cwid + 2, 138, 11, COR.tinta);
        const ult = (s.inicio + s.naFila - 1) % C;
        if (ult !== s.inicio) texto(ctx, "▲ fim", FX0 + ult * cwid + 2, 154, 11, COR.tinta);
      }
      // o tamanho da fila ao longo do dia, até o minuto de agora
      texto(ctx, "clientes na fila ao longo do tempo", GX0, GY0 - 22, 11, COR.cinza);
      linha(ctx, GX0, GY1, GX1, GY1, COR.palido);
      for (let q = 0; q <= ymax; q += Math.max(1, Math.ceil(ymax / 4))) texto(ctx, String(q), GX0 - 8, gy(q) - 7, 11, COR.cinza, 400, "right");
      for (const c of chegada) if (c <= agora) linha(ctx, gx(c), GY1 + 3, gx(c), GY1 + 9, COR.cinza);
      texto(ctx, "chegadas", GX0, GY1 + 14, 11, COR.cinza);
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.beginPath();
      let q = 0;
      ctx.moveTo(gx(0), gy(0));
      for (const [m, tam] of serie) { if (m > agora) break; ctx.lineTo(gx(m), gy(q)); ctx.lineTo(gx(m), gy(tam)); q = tam; }
      ctx.lineTo(gx(agora), gy(q)); ctx.stroke();

      const x = 650;
      texto(ctx, "operações na fila", x, 90, 13, COR.cinza);
      texto(ctx, String(s.ops), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "espera média até aqui", x, 174, 13, COR.cinza);
      texto(ctx, s.atendidos ? `${decimal(s.soma / s.atendidos)} min` : "—", x, 190, 26, COR.tinta, 700);
      texto(ctx, "memória extra agora", x, 244, 13, COR.cinza);
      texto(ctx, `${s.naFila} ${s.naFila === 1 ? "cliente" : "clientes"}`, x, 260, 20, COR.tinta, 700);
      texto(ctx, `maior fila até aqui: ${s.maior}`, x, 288, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N} clientes`, x, 330, 13, COR.cinza);
      texto(ctx, `minuto ${Math.floor(agora)}`, x, 350, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "acabou de entrar ou sair"], [COR.claro, "esperando"]], 480);

      if (fim) legenda(ctx, [["espera média ", ""], [`${decimal(r.soma / N)} min`, "g"], [`, maior fila: ${r.maior}`, ""]]);
      else if (s.ops < 4) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.atendimento, accelerando),
      resumo: { ops: r.ops, soma: r.soma, maior: r.maior, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} operações na fila, n = ${N}<br>fila de até ${r.maior}`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} clientes, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} operações na fila, espera média de ${decimal(r.soma / N)} min, maior fila de ${r.maior}.`,
    };
  }

  // ---------- fila de prioridade: o pronto-socorro ----------

  function simPrioridade(faixa, chegada, duracao, gravidade, accelerando) {
    const r = Algoritmos.prioridade(chegada, duracao, gravidade);
    const N = chegada.length, ideia = faixa.video.ideia;
    // o heap depois de cada inserir e tirar (pares [gravidade, paciente]) e as casas que a operação escreveu
    let t = 0, casas = [], escritas = [], atendendo = null, ops = 0, soma = 0, atendidos = 0, maior = 0;
    const serie = [[0, 0]];             // [minuto, pacientes no heap]
    const est = r.eventos.map((e) => {
      escritas = [];
      if (e.t === "insere" || e.t === "chama") { t = e.tempo; casas = e.casas; escritas = e.escritas; ops = e.acessos; }
      else if (e.t === "direto") t = e.tempo;
      else if (e.t === "atende") { atendendo = e; soma += e.espera; atendidos++; }
      else if (e.t === "maior") maior = e.maior;
      if (e.t === "insere" || e.t === "chama") {
        if (serie.at(-1)[0] === t) serie.at(-1)[1] = casas.length; else serie.push([t, casas.length]);
      }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, tempo: t, casas, escritas, atendendo, ops, soma, atendidos, maior, e };
    });
    if (ops !== r.ops || soma !== r.soma) throw new Error("reprodução do pronto-socorro não bate");
    const fimDia = Math.max(...r.eventos.filter((e) => e.t === "atende").map((e) => e.fim));
    const MIN = 0.5, HOLD = accelerando ? { insere: 1.2, chama: 1.2, direto: 1.2, atende: 0.6, testa: 0.15, maior: 0.3, devolva: 2 } : {};
    const pesos = !accelerando ? est.map(() => 1)
      : est.map((s, k) => (HOLD[s.t] || 0) + MIN * ((k + 1 < est.length ? est[k + 1].tempo : fimDia) - s.tempo));
    const tl = linhaDoTempo(pesos);
    const relogio = (u, k) => {
      if (k < 0) return 0;
      const s = est[k], h = HOLD[s.t] || 0, prox = k + 1 < est.length ? est[k + 1].tempo : fimDia;
      return s.tempo + Math.max(0, Math.min(1, (u - tl.inicio[k] - h) / Math.max(1e-9, pesos[k] - h))) * (prox - s.tempo);
    };
    const kChama = (() => { const j = est.findIndex((s) => s.t === "chama"); return j < 0 ? Infinity : j; })();   // a legenda troca no primeiro chamado
    // a espera média de cada gravidade, no fim do dia
    const G = faixa.exemplo.gravidades[1], medias = Array.from({ length: G }, (_, j) => {
      const w = r.esperas.filter((_, k) => gravidade[k] === j + 1);
      return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });

    // geometria: o médico e o heap em cima (a árvore e o vetor embaixo dela), a fila ao longo do dia embaixo
    const GX0 = 70, GX1 = 600, HX0 = 210, NIV = Math.floor(Math.log2(Math.max(1, r.maior))) + 1;
    const TY0 = 96, TY1 = 212, DY = (TY1 - TY0) / Math.max(1, NIV - 1);
    const R = Math.min(15, (GX1 - HX0) / 2 ** (NIV - 1) * 0.42);
    const pos = (i) => { const d = Math.floor(Math.log2(i + 1)), j = i + 1 - 2 ** d; return [HX0 + (j + 0.5) * (GX1 - HX0) / 2 ** d, TY0 + d * DY]; };
    const GY0 = 330, GY1 = 430, ymax = Math.max(1, r.maior);
    const gx = (m) => GX0 + m / fimDia * (GX1 - GX0), gy = (q) => GY1 - q / ymax * (GY1 - GY0 - 10);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total, agora = fim ? fimDia : relogio(u, k);
      const s = k >= 0 ? est[k] : { casas: [], escritas: [], atendendo: null, ops: 0, soma: 0, atendidos: 0, maior: 0 };
      const mexeu = new Set(s.escritas);
      // o médico
      const at = s.atendendo && agora < s.atendendo.fim ? s.atendendo : null;
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.strokeRect(GX0, 92, 110, 74);
      texto(ctx, "médico", GX0 + 55, 74, 11, COR.cinza, 400, "center");
      if (at) {
        texto(ctx, `paciente ${at.k + 1}`, GX0 + 55, 100, 14, COR.tinta, 600, "center");
        texto(ctx, `gravidade ${at.g}`, GX0 + 55, 118, 11, COR.cinza, 400, "center");
        const f = Math.min(1, (agora - at.inicio) / (at.fim - at.inicio));
        ctx.fillStyle = COR.claro; ctx.fillRect(GX0 + 12, 142, 86, 8);
        ctx.fillStyle = COR.tinta; ctx.fillRect(GX0 + 12, 142, 86 * f, 8);
      } else texto(ctx, "livre", GX0 + 55, 116, 14, COR.cinza, 400, "center");

      // o heap: a árvore (no nó, a gravidade; embaixo, o paciente) e o vetor por baixo
      texto(ctx, `fila de prioridade: o heap, ${s.casas.length} ${s.casas.length === 1 ? "paciente" : "pacientes"}`, HX0, 62, 11, COR.cinza);
      for (let i = 1; i < s.casas.length; i++) { const [x0, y0] = pos((i - 1) >> 1), [x1, y1] = pos(i); linha(ctx, x0, y0, x1, y1, COR.palido, 1.5); }
      s.casas.forEach(([g, p], i) => {
        const [x, y] = pos(i), m = mexeu.has(i);
        ctx.beginPath(); ctx.arc(x, y, R, 0, 7);
        ctx.fillStyle = m ? COR.mexeu : "#fff"; ctx.fill();
        ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.5; ctx.stroke();
        texto(ctx, String(g), x, y - Math.min(8, R * 0.55), Math.min(15, R * 1.05), m ? "#fff" : COR.tinta, 700, "center");
        if (R >= 9) texto(ctx, `p${p + 1}`, x, y + R + 2, 9, COR.cinza, 400, "center");
      });
      const VY = 262, cw = Math.min(30, (GX1 - HX0) / Math.max(8, s.casas.length));
      texto(ctx, "o vetor por baixo: a casa i é o nó i", HX0, VY - 18, 11, COR.cinza);
      s.casas.forEach(([g], i) => {
        const xx = HX0 + i * cw, m = mexeu.has(i);
        ctx.fillStyle = m ? COR.mexeu : COR.claro; ctx.fillRect(xx + 1, VY, cw - 2, 26);
        ctx.strokeStyle = COR.borda; ctx.lineWidth = 1; ctx.strokeRect(xx + 1, VY, cw - 2, 26);
        if (cw >= 12) texto(ctx, String(g), xx + cw / 2, VY + 6, Math.min(13, cw * 0.5), m ? "#fff" : COR.tinta, 600, "center");
      });

      // quantos esperam, ao longo do dia, até o minuto de agora
      texto(ctx, "pacientes esperando ao longo do tempo", GX0, GY0 - 22, 11, COR.cinza);
      linha(ctx, GX0, GY1, GX1, GY1, COR.palido);
      for (let q = 0; q <= ymax; q += Math.max(1, Math.ceil(ymax / 4))) texto(ctx, String(q), GX0 - 8, gy(q) - 7, 11, COR.cinza, 400, "right");
      for (const c of chegada) if (c <= agora) linha(ctx, gx(c), GY1 + 3, gx(c), GY1 + 9, COR.cinza);
      texto(ctx, "chegadas", GX0, GY1 + 14, 11, COR.cinza);
      ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.beginPath();
      let q = 0;
      ctx.moveTo(gx(0), gy(0));
      for (const [m, tam] of serie) { if (m > agora) break; ctx.lineTo(gx(m), gy(q)); ctx.lineTo(gx(m), gy(tam)); q = tam; }
      ctx.lineTo(gx(agora), gy(q)); ctx.stroke();

      const x = 650;
      texto(ctx, "acessos ao heap", x, 90, 13, COR.cinza);
      texto(ctx, String(s.ops), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "espera média até aqui", x, 174, 13, COR.cinza);
      texto(ctx, s.atendidos ? `${decimal(s.soma / s.atendidos)} min` : "—", x, 190, 26, COR.tinta, 700);
      texto(ctx, "memória extra agora", x, 244, 13, COR.cinza);
      texto(ctx, `${s.casas.length} ${s.casas.length === 1 ? "paciente" : "pacientes"} no heap`, x, 260, 20, COR.tinta, 700);
      texto(ctx, `maior fila até aqui: ${s.maior}`, x, 288, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N} pacientes`, x, 330, 13, COR.cinza);
      texto(ctx, `minuto ${Math.floor(agora)}`, x, 350, 13, COR.cinza);
      if (fim) medias.forEach((m, j) => texto(ctx, `gravidade ${j + 1}: ${m === null ? "ninguém" : `${decimal(m)} min`}`, x, 382 + j * 18, 12, j === 0 ? COR.verde : COR.cinza, j === 0 ? 600 : 400));
      legendaCores(ctx, [[COR.mexeu, "casa escrita agora (o caminho que subiu ou desceu)"], ["#fff", "no nó: a gravidade, 1 = a mais urgente", COR.tinta]], 486);

      if (fim) legenda(ctx, [["gravidade 1 ", ""], [medias[0] === null ? "ninguém chegou" : `espera ${decimal(medias[0])} min`, "g"],
        [`; gravidade ${G}, ${medias[G - 1] === null ? "ninguém chegou" : `${decimal(medias[G - 1])} min`}`, ""]]);
      else if (k < kChama) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.atendimento, accelerando),
      resumo: { ops: r.ops, soma: r.soma, maior: r.maior, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} acessos ao heap, n = ${N}<br>heap de até ${r.maior}`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} pacientes, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} acessos ao heap, espera média de ${decimal(r.soma / N)} min, maior fila de ${r.maior}.`,
    };
  }

  // ---------- inverter lista encadeada ----------

  function simInverter(faixa, valores, accelerando) {
    const r = Algoritmos.inverter(valores);
    const N = valores.length, ideia = faixa.video.ideia;
    // o próx de cada nó (pela posição na lista de entrada); virar é apontar para o vizinho da esquerda
    const prox = valores.map((_, i) => (i + 1 < N ? i + 1 : null));
    let ops = 0, casas = 0, lido = null, virou = null, inicio = N ? 0 : null;
    const id = (p) => (p === null ? null : p - 1);
    const est = r.eventos.map((e) => {
      lido = null; virou = null;
      if (e.t === "proximo") { lido = e.i; casas++; }
      else if (e.t === "vira") { prox[e.i] = e.de; virou = e.i; ops++; casas++; }
      else if (e.fim) inicio = id(e.vars.anterior);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, prox: prox.slice(), ops, casas, lido, virou, inicio,
        anterior: id(e.vars.anterior), atual: id(e.vars.atual), proximo: id(e.vars["próximo"]), fim: !!e.fim };
    });
    if (ops !== r.ops || casas !== r.casas) throw new Error("reprodução da inversão não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { atribui: 0.5, testa: 0.4, proximo: 1, vira: 1.6 }, (t) => t === "vira", 2, 2.5);
    const tl = linhaDoTempo(pesos);
    const X0 = 60, X1 = 620, passo = Math.min(84, (X1 - X0) / Math.max(1, N)), NW = Math.min(64, passo - 16), VW = NW / 2, NY = 190, NH = 40;
    const nx = (i) => X0 + i * passo + (passo - NW) / 2;

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { prox: valores.map((_, i) => (i + 1 < N ? i + 1 : null)), ops: 0, casas: 0, lido: null, virou: null, inicio: N ? 0 : null, anterior: null, atual: null, proximo: null, fim: false };
      for (let i = 0; i < N; i++) {
        const x = nx(i);
        texto(ctx, `nó ${i + 1}`, x + NW / 2, NY - 22, 11, COR.cinza, 400, "center");
        ctx.fillStyle = "#fff"; ctx.fillRect(x, NY, VW, NH);
        ctx.fillStyle = s.virou === i ? COR.mexeu : s.lido === i ? COR.claro : "#fff"; ctx.fillRect(x + VW, NY, VW, NH);
        ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1.5; ctx.strokeRect(x, NY, VW, NH); ctx.strokeRect(x + VW, NY, VW, NH);
        if (s.lido === i) { ctx.strokeStyle = COR.album; ctx.lineWidth = 2.5; ctx.strokeRect(x + VW + 1, NY + 1, VW - 2, NH - 2); }
        texto(ctx, String(valores[i]), x + VW / 2, NY + NH / 2 - 9, Math.min(17, VW * 0.55), fim ? COR.verde : COR.tinta, 600, "center");
        if (s.prox[i] === null) texto(ctx, "∅", x + VW * 1.5, NY + NH / 2 - 9, 16, s.virou === i ? "#fff" : COR.cinza, 600, "center");
        // a seta do próx: para a direita por cima do vão; para trás, por baixo, em cotovelo
        const cor = s.virou === i ? COR.mexeu : COR.tinta;
        if (s.prox[i] === i + 1) {
          linha(ctx, x + NW - VW / 2, NY + NH / 2, nx(i + 1) - 2, NY + NH / 2, cor, 2);
          pontaSeta(ctx, nx(i + 1) - 2, NY + NH / 2, 0, cor);
        } else if (s.prox[i] === i - 1) {
          const fundo = NY + NH + 16 + (i % 2) * 12, xa = x + VW * 1.5, xb = nx(i - 1) + VW / 2;
          ctx.strokeStyle = cor; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(xa, NY + NH / 2); ctx.lineTo(xa, fundo); ctx.lineTo(xb, fundo); ctx.lineTo(xb, NY + NH + 3); ctx.stroke();
          pontaSeta(ctx, xb, NY + NH + 3, -Math.PI / 2, cor);
        }
      }
      // o início da lista, por cima; os três ponteiros, por baixo (nulo: fora da lista, à esquerda ou à direita)
      if (s.inicio !== null) {
        const x = nx(s.inicio) + VW / 2, cor = fim ? COR.verde : COR.tinta;
        texto(ctx, "início", x, NY - 78, 12, cor, 600, "center");
        linha(ctx, x, NY - 62, x, NY - 26, cor, 2); pontaSeta(ctx, x, NY - 26, Math.PI / 2, cor);
      }
      if (!fim && k >= 0) {
        const marcas = [["anterior", s.anterior, COR.tinta], ["atual", s.atual, COR.mexeu], ["próximo", s.proximo, COR.cinza]];
        const y = NY + NH + 54;
        marcas.filter(([, p]) => p !== null).forEach(([nome, p, cor], j, vivas) => {
          const x = nx(p) + NW / 2, dy = vivas.slice(0, j).filter((m) => m[1] === p).length * 34;   // dois ponteiros no mesmo nó: um embaixo do outro
          ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x, y + dy); ctx.lineTo(x - 6, y + dy + 10); ctx.lineTo(x + 6, y + dy + 10); ctx.fill();
          texto(ctx, nome, x, y + dy + 13, 12, cor, 600, "center");
        });
        const nulos = marcas.filter(([, p]) => p === null).map(([nome]) => nome);   // fora da lista: só dizer
        if (nulos.length) texto(ctx, `${nulos.join(" e ")} ${nulos.length === 1 ? "aponta" : "apontam"} para nulo`, X0, y + 86, 12, COR.cinza);
      }
      if (fim) {
        texto(ctx, "a lista agora, do início ao fim:", X0, 360, 13, COR.cinza);
        texto(ctx, r.invertida.join(" → "), X0, 382, Math.min(18, 900 / Math.max(1, N * 5)), COR.verde, 600);
      }

      const x = 680;
      texto(ctx, "ponteiros trocados", x, 90, 13, COR.cinza);
      texto(ctx, `${s.ops}`, x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "casas lidas e escritas", x, 174, 13, COR.cinza);
      texto(ctx, String(s.casas), x, 190, 26, COR.tinta, 700);
      texto(ctx, "memória extra", x, 244, 13, COR.cinza);
      texto(ctx, "3 ponteiros", x, 260, 20, COR.tinta, 700);
      texto(ctx, "nenhum valor copiado", x, 288, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N} nós`, x, 330, 13, COR.cinza);
      legendaCores(ctx, [[COR.claro, "próx lido agora", COR.album, 2], [COR.mexeu, "próx virado agora"]], 480);

      if (fim) legenda(ctx, [["invertida: ", ""], [`${r.ops} ponteiros trocados`, "g"], [", nenhum valor saiu do lugar", ""]]);
      else if (s.ops < 2) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.inverter, accelerando),
      resumo: { ops: r.ops, pico: 0, n: N }, contagemEm,
      medidor: () => `${r.ops} ponteiros trocados, n = ${N}<br>3 ponteiros, nenhum valor`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} nós, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} ponteiros trocados, sem memória extra além de três ponteiros.`,
    };
  }

  function pontaSeta(ctx, x, y, ang, cor) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 9 * Math.cos(ang - 0.45), y - 9 * Math.sin(ang - 0.45));
    ctx.lineTo(x - 9 * Math.cos(ang + 0.45), y - 9 * Math.sin(ang + 0.45));
    ctx.fill();
  }

  // ---------- árvores: percursos, busca em árvore e AVL ----------
  // Cada nó fica na coluna da sua ordem (o k-ésimo menor na coluna k) e na
  // linha da sua profundidade: nenhum nó encosta noutro. No meio de uma
  // rotação da AVL a árvore fica quebrada (um nó sem pai); o arranjo congela
  // até ela se religar, e então os nós deslizam até o lugar novo.

  function arranjoArvore(nos, raiz, antes) {
    const L = new Map(), vistos = new Set();
    let col = 0, ok = true;
    const anda = (id, prof) => {
      if (id === null || id === undefined || !ok) return;
      if (vistos.has(id) || !nos.has(id)) { ok = false; return; }
      vistos.add(id);
      const no = nos.get(id);
      anda(no.esq, prof + 1);
      L.set(id, [col++, prof]);
      anda(no.dir, prof + 1);
    };
    anda(raiz, 0);
    if (antes) for (const id of antes.keys()) if (!L.has(id) && nos.has(id)) ok = false;
    return ok ? L : null;
  }
  const mapaNos = (foto) => new Map(foto.nos.map((no) => [no.id, no]));
  const mesmoArranjo = (a, b) => a && b && a.size === b.size && [...a].every(([id, [c, l]]) => b.has(id) && b.get(id)[0] === c && b.get(id)[1] === l);
  const suave = (k) => k * k * (3 - 2 * k);

  // a árvore na caixa [x0, y0, x1, y1], com `cols` colunas e `linhas` linhas fixas
  // (a escala não muda durante a faixa); P: id → [coluna, linha], pode ser fracionário
  function escalaArvore(caixa, cols, linhas) {
    const [x0, y0, x1, y1] = caixa;
    const DX = Math.min(56, (x1 - x0) / Math.max(1, cols)), DY = Math.min(72, linhas > 1 ? (y1 - y0) / (linhas - 1) : 72);
    const R = Math.max(8, Math.min(17, DX * 0.42, DY * 0.45));
    const xa = x0 + (x1 - x0 - cols * DX) / 2;
    const esc = { R, DX, DY, centro: 0, px: ([c, l]) => [xa + (c + esc.centro) * DX + DX / 2, y0 + l * DY] };
    // a árvore de agora, com `n` colunas, fica no meio da caixa
    esc.centrar = (n) => { esc.centro = (cols - n) / 2; return esc; };
    return esc;
  }

  function desenhaArvore(ctx, nos, P, esc, o = {}) {
    const { R, px } = esc, arestas = o.arestas || {}, cheio = o.cheio || {}, contorno = o.contorno || {};
    for (const [id, no] of nos) {
      const a = P.get(id);
      if (!a) continue;
      const [x, y] = px(a);
      for (const lado of ["esq", "dir"]) {
        const f = no[lado];
        if (f === null || f === undefined || !P.has(f)) continue;
        const [x2, y2] = px(P.get(f)), cor = arestas[`${id},${lado}`];
        linha(ctx, x, y + R * 0.7, x2, y2 - R * 0.7, cor || COR.palido, cor ? 3 : 1.5);
      }
    }
    for (const [id, no] of nos) {
      const a = P.get(id);
      if (!a) continue;
      const [x, y] = px(a), w = R * 2.1, h = R * 1.5, f = cheio[id], c = contorno[id];
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 5); else ctx.rect(x - w / 2, y - h / 2, w, h);
      ctx.fillStyle = f || "#fff"; ctx.fill();
      ctx.strokeStyle = c ? c[0] : COR.tinta; ctx.lineWidth = c ? c[1] : 1.5; ctx.stroke();
      texto(ctx, String(no.valor), x, y - R * 0.5, Math.round(R * 0.95), f ? "#fff" : o.verde ? COR.verde : COR.tinta, 600, "center");
      if (o.altura) texto(ctx, String(no.altura), x + w / 2 + 2, y - h / 2 - 9, Math.max(9, Math.round(R * 0.62)), (o.alturaCor || {})[id] || COR.cinza, 600);
    }
  }

  // uma fileira de valores pequenos (as ordens dos percursos, as entradas)
  function fileiraValores(ctx, vals, x0, y, larg, cor = () => COR.tinta, tam = 15) {
    const passo = Math.min(42, larg / Math.max(1, vals.length));
    vals.forEach((v, i) => texto(ctx, String(v), x0 + i * passo, y, Math.min(tam, passo * 0.55), cor(i), 600));
  }

  // ---------- percursos ----------

  function simPercursos(faixa, valores, accelerando) {
    const r = Algoritmos.percursos(valores);
    const N = valores.length, ideia = faixa.video.ideia, nos = mapaNos(r.nos), P = arranjoArvore(nos, r.nos.raiz) || new Map();
    const linhas = Math.max(1, ...[...P.values()].map(([, l]) => l + 1));
    const ESC = escalaArvore([40, 92, 600, 318], N, linhas);
    const pilha = [], ordens = { pre: [], em: [], pos: [], largura: [] };
    let fila = [], visitas = 0, largura = false, atual = null, ultimo = null;
    const est = r.eventos.map((e) => {
      ultimo = null;
      if (e.t === "entra") { pilha.push(e.a); atual = e.a; }
      else if (e.t === "sai") { pilha.pop(); atual = pilha.length ? pilha.at(-1) : null; }
      else if (e.t === "visita") {
        ordens[e.ordem].push(nos.get(e.no).valor);
        ultimo = { no: e.no, ordem: e.ordem };
        if (e.ordem === "pre") visitas++;
        if (e.ordem === "largura") { largura = true; fila = e.fila; atual = e.no; }
      } else if (e.t === "enfileira") { largura = true; fila = e.fila; }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: e.nivel, chamada: e.chamada, pilha: pilha.slice(), fila: fila.slice(),
        ordens: { pre: ordens.pre.length, em: ordens.em.length, pos: ordens.pos.length, largura: ordens.largura.length }, visitas, largura, atual, ultimo };
    });
    if (visitas !== r.visitas || ordens.largura.join() !== r.largura.join()) throw new Error("reprodução dos percursos não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { entra: 0.35, testa: 0.2, visita: 1, sai: 0.2, enfileira: 0.5 }, (t) => t === "visita", 4, 2.5);
    const tl = linhaDoTempo(pesos);
    const NOMES = [["pre", "pré-ordem"], ["em", "em ordem"], ["pos", "pós-ordem"], ["largura", "em largura"]];

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { pilha: [], fila: [], ordens: { pre: 0, em: 0, pos: 0, largura: 0 }, visitas: 0, largura: false, atual: null, ultimo: null };
      const cheio = {}, contorno = {};
      if (!fim) {
        if (!s.largura) s.pilha.forEach((id) => { if (id !== null) contorno[id] = [COR.album, 2.5]; });
        else s.fila.forEach((id) => { contorno[id] = [COR.menor, 2.5]; });
        if (s.atual !== null && s.atual !== undefined) contorno[s.atual] = [COR.album, 4];
        if (s.ultimo) cheio[s.ultimo.no] = COR.mexeu;
      }
      desenhaArvore(ctx, nos, P, ESC, { cheio, contorno, verde: fim });
      // as quatro ordens, embaixo; o valor anotado agora em coral, tudo verde no fim
      NOMES.forEach(([ch, nome], j) => {
        const y = 352 + j * 34, m = s.ordens[ch], vals = (ch === "largura" ? r.largura : r[ch]).slice(0, m);
        texto(ctx, nome, 40, y + 2, 13, COR.cinza);
        fileiraValores(ctx, vals, 150, y, 470, (i) => (fim ? COR.verde : s.ultimo && s.ultimo.ordem === ch && i === m - 1 ? COR.mexeu : COR.tinta));
      });

      const x = 660;
      texto(ctx, "nós visitados", x, 74, 13, COR.cinza);
      texto(ctx, `${s.visitas}`, x, 90, 36, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, `de ${N}, cada um uma vez`, x + 70, 106, 13, COR.cinza);
      // a pilha de chamadas (um nível por chamada, com o p dela) ou, na em largura, a fila
      const coluna = !s.largura ? s.pilha : s.fila, nome = !s.largura ? "pilha de chamadas" : "fila (a frente em cima)";
      const pico = !s.largura ? r.pilha : r.fila;
      texto(ctx, `${nome}: ${coluna.length}`, x, 150, 13, COR.tinta, 600);
      texto(ctx, `pico ${pico}`, x + 250, 150, 12, COR.cinza, 400, "right");
      const caixas = !s.largura ? coluna.slice().reverse() : coluna, cabe = 11, BH = 22;
      caixas.slice(0, cabe).forEach((id, j) => {
        const y = 172 + j * (BH + 3), topo = j === 0;
        ctx.fillStyle = topo && !fim ? (s.largura ? COR.claro : COR.claro) : "#fff"; ctx.fillRect(x, y, 250, BH);
        ctx.strokeStyle = topo ? (s.largura ? COR.menor : COR.album) : COR.borda; ctx.lineWidth = topo ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, 249, BH - 1);
        texto(ctx, s.largura ? `nó ${nos.get(id).valor}` : id === null ? "percorrer(nulo)" : `percorrer(nó ${nos.get(id).valor})`, x + 8, y + BH / 2 - 7, 12, COR.tinta);
      });
      if (caixas.length > cabe) texto(ctx, `… mais ${caixas.length - cabe} ${s.largura ? "na fila" : "níveis embaixo"}`, x, 172 + cabe * (BH + 3) + 2, 12, COR.cinza);
      texto(ctx, `n = ${N} nós, altura ${r.altura}`, x, 474, 12, COR.cinza);
      legendaCores(ctx, [["#fff", "na pilha", COR.album, 2.5], ["#fff", "na fila", COR.menor, 2.5], [COR.mexeu, "anotado agora"]], 498);

      if (fim) legenda(ctx, [["quatro ordens, ", ""], [`${N} visitas cada`, "g"], ["; a em ordem saiu ordenada", ""]]);
      else if (s.largura) legenda(ctx, [["em largura: tira o primeiro da fila e põe os filhos no fim", ""]]);
      else legenda(ctx, [[s.visitas < 3 ? ideia[0] : ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].visitas : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.percursos, accelerando),
      resumo: { ops: r.visitas, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${N} nós visitados em cada percurso<br>pilha de ${r.pilha} níveis, fila de ${r.fila} nós`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} nós, ${cfg.rotulo}; ${contagemEm(u)} de ${N} visitados na descida, a pilha chega a ${r.pilha} níveis e a fila da em largura a ${r.fila} nós.`,
    };
  }

  // ---------- busca em árvore ----------

  function simAbb(faixa, valores, accelerando) {
    const r = Algoritmos.buscaArvore(valores);
    const N = valores.length, ideia = faixa.video.ideia;
    const ESC = escalaArvore([40, 92, 610, 380], N, Math.max(1, r.altura));
    let nos = new Map(), P = new Map(), k = -1, x = null, caminho = [], atual = null, achou = null, comps = 0, total = 0, montando = true;
    const feitas = [];
    const est = r.eventos.map((e) => {
      achou = null;
      if (e.t === "monta") { nos = mapaNos(e); P = arranjoArvore(nos, e.raiz) || P; atual = e.raiz === null ? null : [...nos.values()].find((no) => no.valor === e.x).id; }
      else {
        if (montando) { montando = false; atual = null; }
        if (e.k !== k) { k = e.k; x = valores[k]; caminho = []; comps = 0; }
        if (e.t === "compara") { comps++; total++; if (caminho.at(-1) !== e.no) caminho.push(e.no); atual = e.no; }
        else if (e.t === "achou") achou = e.no;
        else if (e.t === "desce" || e.t === "atribui") atual = e.no;
        else if (e.t === "devolva") feitas[k] = comps;
      }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, nos, P, k, x, caminho: caminho.slice(), atual, achou, comps, total, montando, feitas: feitas.slice() };
    });
    if (total !== r.ops) throw new Error("reprodução da busca em árvore não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { monta: 0.6, atribui: 0.3, testa: 0.2, compara: 1, achou: 1, pare: 0.3, desce: 0.6, devolva: 0.5 }, (t) => t === "compara", 6, 2.5);
    const tl = linhaDoTempo(pesos);
    const media = r.ops / Math.max(1, N), pior = Math.max(0, ...r.comparacoes);

    function desenhar(ctx, u) {
      const kk = tl.eventoEm(u), fim = u >= tl.total;
      const s = kk >= 0 ? est[kk] : { nos: new Map(), P: new Map(), k: -1, caminho: [], atual: null, achou: null, comps: 0, total: 0, montando: true, feitas: [] };
      const cheio = {}, contorno = {};
      if (!fim) {
        s.caminho.forEach((id) => { contorno[id] = [COR.album, 2.5]; });
        if (s.atual !== null) { if (s.montando) cheio[s.atual] = COR.mexeu; else contorno[s.atual] = [COR.album, 4]; }
        if (s.t === "compara") cheio[s.atual] = COR.album;
        if (s.achou !== null) cheio[s.achou] = COR.verde;
      }
      desenhaArvore(ctx, s.nos, s.P, ESC.centrar(s.P.size), { cheio, contorno, verde: fim });
      // as buscas, embaixo: cada valor com o que a busca dele custou
      const passo = Math.min(40, 570 / Math.max(1, N));
      texto(ctx, s.montando ? "chegam, nesta ordem:" : "buscas (comparações embaixo):", 40, 418, 12, COR.cinza);
      valores.forEach((v, i) => {
        const xx = 40 + i * passo, agora = !s.montando && i === s.k && !fim;
        texto(ctx, String(v), xx, 438, Math.min(15, passo * 0.5), agora ? COR.album : fim ? COR.tinta : COR.tinta, agora ? 700 : 600);
        if (s.feitas[i] !== undefined) texto(ctx, String(s.feitas[i]), xx, 460, Math.min(13, passo * 0.45), fim ? COR.verde : COR.cinza, 600);
      });

      const xp = 660;
      if (s.montando) {
        texto(ctx, "montando a árvore", xp, 74, 13, COR.cinza);
        texto(ctx, `${s.nos.size} de ${N}`, xp, 90, 30, COR.tinta, 700);
        texto(ctx, "a montagem não conta: a faixa mede as buscas", xp, 136, 12, COR.cinza);
      } else {
        texto(ctx, fim ? "buscas feitas" : `busca ${s.k + 1} de ${N}: x = ${s.x}`, xp, 74, 13, COR.cinza);
        texto(ctx, "comparações nesta busca", xp, 100, 13, COR.cinza);
        texto(ctx, fim ? "—" : String(s.comps), xp, 116, 30, COR.tinta, 700);
        texto(ctx, "comparações no total", xp, 166, 13, COR.cinza);
        texto(ctx, String(s.total), xp, 182, 30, fim ? COR.verde : COR.tinta, 700);
      }
      texto(ctx, "altura da árvore", xp, 240, 13, COR.cinza);
      texto(ctx, `${r.altura} ${r.altura === 1 ? "nível" : "níveis"}`, xp, 256, 20, COR.tinta, 700);
      texto(ctx, `de ${Math.ceil(Math.log2(N + 1))} (cheia) a ${N} (fila indiana)`, xp, 284, 12, COR.cinza);
      if (fim) {
        texto(ctx, "média por busca", xp, 320, 13, COR.cinza);
        texto(ctx, decimalPt(media), xp, 336, 30, COR.verde, 700);
        texto(ctx, `a mais cara: ${pior}`, xp, 378, 13, COR.verde, 600);
      }
      legendaCores(ctx, [[COR.album, "comparando agora"], ["#fff", "caminho da busca", COR.album, 2.5], [COR.verde, "achou"]], 498);

      if (fim) legenda(ctx, [["média de ", ""], [`${decimalPt(media)} comparações por busca`, "g"], [`, altura ${r.altura}`, ""]]);
      else if (s.montando) legenda(ctx, [["a ordem de chegada decide a forma da árvore", ""]]);
      else legenda(ctx, [[ideia[0], ""]]);
    }

    const contagemEm = (u) => { const k2 = tl.eventoEm(u); return k2 >= 0 ? est[k2].total : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.abb, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} comparações em ${N} buscas, altura ${r.altura}<br>${r.pico} casas na árvore`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} valores, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} comparações, ${decimalPt(media)} por busca, numa árvore de altura ${r.altura}.`,
    };
  }

  const decimalPt = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(".", ",");

  // ---------- AVL ----------

  function simAvl(faixa, valores, accelerando) {
    const r = Algoritmos.avl(valores);
    const N = valores.length, ideia = faixa.video.ideia;
    // a comum com os mesmos valores, para o placar: a profundidade de cada nó novo é metade das comparações
    const alturaComum = [];
    r.porComum.reduce((h, c, i) => (alturaComum[i] = Math.max(h, c / 2 + 1)), 0);
    let nos = new Map(), raiz = null, L = new Map(), pilha = [], rot = null, k = -1, comps = 0, rotacoes = 0, arestas = {}, novoEm = null, antesGiro = null;
    let linhasMax = 1;
    const est = r.eventos.map((e) => {
      let de = null;
      arestas = e.t === "girou" || e.t === "liga" || e.t === "equilibra" || e.t === "inseriu" ? arestas : {};
      if (e.t === "entra") pilha.push(e.a);
      else if (e.t === "sai") pilha.pop();
      else if (e.t === "compara") { comps++; rot = null; }
      if (e.nos) {
        const fotoNos = mapaNos(e);
        if (e.t === "gira") {
          const p = fotoNos.get(e.no), f = fotoNos.get(e.sobe), neto = e.lado === "dir" ? f.dir : f.esq;
          rot = { lado: e.lado, valor: p.valor, nos: [e.no, e.sobe, neto].filter((id) => id !== null) };
          antesGiro = fotoNos;
        } else if (e.t === "girou" && antesGiro) {
          // os ponteiros que a rotação reescreveu
          arestas = {};
          for (const [id, no] of fotoNos) for (const lado of ["esq", "dir"]) if (antesGiro.has(id) && antesGiro.get(id)[lado] !== no[lado]) arestas[`${id},${lado}`] = COR.mexeu;
          rotacoes++;
        } else if (e.t === "liga") arestas = { ...arestas, [`${e.no},${e.lado}`]: COR.mexeu };
        else if (e.t === "novo") {
          // o nó novo aparece embaixo do pai, do lado em que vai ficar, antes de se ligar
          const pai = pilha.length >= 2 ? pilha[pilha.length - 2] : null, x = fotoNos.get(e.no).valor;
          novoEm = pai !== null && L.has(pai) ? [L.get(pai)[0] + (x < fotoNos.get(pai).valor ? -0.5 : 0.5), L.get(pai)[1] + 1] : [L.size ? L.size / 2 : 0, 0];
        }
        nos = fotoNos; raiz = e.raiz;
        const novo = arranjoArvore(nos, raiz, L);
        if (novo && !mesmoArranjo(novo, L)) { de = L; L = novo; }
      }
      // a rotação na raiz só se religa aqui (a raiz fica à parte): o deslizar ainda leva o nome dela
      if (e.t === "inseriu") { k = e.k; if (!de) rot = null; }
      for (const [, l] of L.values()) linhasMax = Math.max(linhasMax, l + 1);
      const solto = [...nos.keys()].find((id) => !L.has(id));
      const estado = { t: e.t, linha: e.linha, vars: e.vars, nivel: e.nivel, chamada: e.chamada, nos, L, de, novoEm: solto !== undefined ? [solto, novoEm] : null,
        pilha: pilha.slice(), rot, k, comps, rotacoes, arestas: { ...arestas }, compara: e.t === "compara" ? e.no : null, novo: e.t === "novo" ? e.no : null };
      if (e.t === "inseriu") rot = null;
      return estado;
    });
    if (comps !== r.ops || rotacoes !== r.rotacoes) throw new Error("reprodução da AVL não bate");
    // o deslizar dura 3 unidades nos dois ritmos (meio segundo a 1×); o resto, como nas outras faixas
    const pesos = (!accelerando ? est.map(() => 1)
      : pesosLentos(est, { entra: 0.3, testa: 0.2, compara: 0.8, novo: 1, liga: 0.8, gira: 1.2, girou: 0.6, equilibra: 0.3, devolva: 0.2, sai: 0.15, inseriu: 0.6 }, (t) => t === "compara", 6, 2.5))
      .map((p, i) => (est[i].de && est[i].de.size ? 3 : p));
    const tl = linhaDoTempo(pesos);
    const ESC = escalaArvore([40, 96, 600, 372], N, linhasMax);

    function posicoes(s, u, kk) {
      if (!s.de || !s.de.size || CALMO) return s.L;
      const f = suave(Math.max(0, Math.min(1, (u - tl.inicio[kk]) / pesos[kk])));
      const m = new Map();
      for (const [id, [c, l]] of s.L) {
        const [c0, l0] = s.de.get(id) || (s.novoEm === null && est[kk - 1] && est[kk - 1].novoEm && est[kk - 1].novoEm[0] === id ? est[kk - 1].novoEm[1] : [c, l]);
        m.set(id, [c0 + (c - c0) * f, l0 + (l - l0) * f]);
      }
      return m;
    }

    function desenhar(ctx, u) {
      const kk = tl.eventoEm(u), fim = u >= tl.total;
      const s = kk >= 0 ? est[kk] : { nos: new Map(), L: new Map(), de: null, novoEm: null, pilha: [], rot: null, k: -1, comps: 0, rotacoes: 0, arestas: {}, compara: null, novo: null };
      const P = new Map(posicoes(s, u, kk));
      if (s.novoEm) P.set(s.novoEm[0], s.novoEm[1]);
      const cheio = {}, contorno = {};
      if (!fim) {
        s.pilha.forEach((id) => { if (id !== null) contorno[id] = [COR.album, 2.5]; });
        if (s.rot) s.rot.nos.forEach((id) => { contorno[id] = [COR.maior, 4]; });
        if (s.compara !== null) cheio[s.compara] = COR.album;
        if (s.novo !== null) cheio[s.novo] = COR.mexeu;
      }
      desenhaArvore(ctx, s.nos, P, ESC.centrar(s.L.size), { cheio, contorno, arestas: fim ? {} : s.arestas, verde: fim, altura: true });

      // os valores, embaixo: os já inseridos em tinta, o da vez em azul, os que faltam em cinza
      const atualK = s.t === "inseriu" ? s.k : s.k + 1;
      texto(ctx, "chegam, nesta ordem:", 40, 418, 12, COR.cinza);
      fileiraValores(ctx, valores, 40, 438, 570, (i) => (fim ? COR.verde : i < atualK ? COR.tinta : i === atualK ? COR.album : COR.palido));

      const xp = 660, feitos = Math.max(0, s.k + 1), comumComp = r.porComum.slice(0, feitos).reduce((a, b) => a + b, 0);
      const h = Math.max(0, ...[...s.L.values()].map(([, l]) => l + 1));
      texto(ctx, "comparações", xp, 74, 13, COR.cinza);
      texto(ctx, String(s.comps), xp, 90, 32, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "rotações", xp, 140, 13, COR.cinza);
      texto(ctx, String(s.rotacoes), xp, 156, 24, COR.tinta, 700);
      texto(ctx, "altura", xp, 196, 13, COR.cinza);
      texto(ctx, String(h), xp, 212, 24, fim ? COR.verde : COR.tinta, 700);
      // o placar da comum, com os mesmos valores até aqui
      ctx.strokeStyle = COR.borda; ctx.lineWidth = 1; ctx.strokeRect(xp - 10.5, 262.5, 270, 104);
      texto(ctx, "a comum, com os mesmos valores", xp, 274, 12, COR.cinza);
      texto(ctx, `${comumComp} comparações`, xp, 296, 18, COR.tinta, 700);
      texto(ctx, `altura ${feitos ? alturaComum[feitos - 1] : 0}`, xp, 324, 18, COR.tinta, 700);
      texto(ctx, `inseridos: ${feitos} de ${N}`, xp, 380, 12, COR.cinza);
      legendaCores(ctx, [["#fff", "caminho da inserção", COR.album, 2.5], ["#fff", "nós da rotação", COR.maior, 4], [COR.mexeu, "nó novo; ponteiro reescrito"]], 498);

      if (fim) legenda(ctx, [[`${N} valores, `, ""], [`altura ${r.altura}`, "g"], [`; a comum ficaria com ${r.altura_comum}`, ""]]);
      else if (s.rot) legenda(ctx, [["rotação ", ""], [`à ${s.rot.lado === "dir" ? "direita" : "esquerda"} em ${s.rot.valor}`, "b"], [": o filho do lado alto sobe", ""]]);
      else legenda(ctx, [[s.rotacoes < 1 ? ideia[0] : ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const kk = tl.eventoEm(u); return kk >= 0 ? est[kk].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.avl, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} comparações, ${r.rotacoes} rotações, altura ${r.altura}<br>${r.pico} valores (casas e pilha)`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} valores, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} comparações e ${r.rotacoes} rotações; altura ${r.altura} no fim, contra ${r.altura_comum} da árvore comum.`,
    };
  }

  // ---------- máximo em janela deslizante ----------

  function simJanela(faixa, v, K, accelerando) {
    const r = Algoritmos.janela(v, K);
    const N = v.length, ideia = faixa.video.ideia;
    const dq = [], achados = [];
    let i = -1, foco = null, comps = 0, pico = 0;
    const est = r.eventos.map((e) => {
      foco = null;
      if (e.t === "le") i = e.i;
      else if (e.t === "compara") { comps++; foco = e.j; }
      else if (e.t === "tira") { if (e.ponta === "frente") dq.shift(); else dq.pop(); foco = e.j; }
      else if (e.t === "poe") dq.push(e.i);
      else if (e.t === "maximo") achados.push(e.m);
      pico = Math.max(pico, dq.length);
      const ing = achados.length ? r.ingenuoAte[achados.length - 1] : 0;   // o ingênuo, até a última janela já fechada
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i, foco, dq: dq.slice(), nAchados: achados.length, comps, pico, ing, ponta: e.ponta };
    });
    if (comps !== r.ops || pico !== r.pico) throw new Error("reprodução da janela não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { le: 0.4, testa: 0.3, compara: 1, tira: 1.2, poe: 1, maximo: 1.2, atribui: 0.4, devolva: 2 }, (t) => t === "maximo", 3, 2.5);
    const tl = linhaDoTempo(pesos);
    const X0 = 70, X1 = 610, cw = Math.min(40, (X1 - X0) / N), VY = 120, SW = Math.min(58, (X1 - X0) / Math.max(K, 1)), DY = 236, MY = 350;
    const tam = Math.min(15, cw * 0.5);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { i: -1, foco: null, dq: [], nAchados: 0, comps: 0, pico: 0, ing: 0 };
      // o vetor, com a janela que termina no da vez
      texto(ctx, "vetor", X0, VY - 46, 11, COR.cinza);
      const a = Math.max(0, s.i - K + 1);
      for (let p = 0; p < N; p++) {
        const x = X0 + p * cw, dentro = s.i >= 0 && p >= a && p <= s.i && !fim;
        ctx.fillStyle = p === s.i && !fim ? COR.mexeu : dentro ? COR.claro : "#fff";
        ctx.fillRect(x + 1, VY, cw - 2, 34);
        ctx.strokeStyle = s.foco === p && !fim ? COR.album : dentro ? COR.tinta : COR.borda;
        ctx.lineWidth = s.foco === p && !fim ? 2.5 : 1;
        ctx.strokeRect(x + 1, VY, cw - 2, 34);
        texto(ctx, String(v[p]), x + cw / 2, VY + 17 - tam * 0.6, tam, p === s.i && !fim ? "#fff" : COR.tinta, 600, "center");
        if (cw >= 22 || p % 2 === 0) texto(ctx, String(p + 1), x + cw / 2, VY + 38, 9, COR.cinza, 400, "center");
      }
      if (s.i >= 0 && !fim) {
        const xa = X0 + a * cw, xb = X0 + (s.i + 1) * cw;
        linha(ctx, xa + 1, VY - 10, xb - 1, VY - 10, COR.tinta, 3);
        texto(ctx, s.i >= K - 1 ? `janela de ${K}` : `janela enchendo (${s.i + 1} de ${K})`, (xa + xb) / 2, VY - 30, 11, COR.tinta, 400, "center");
      }
      // o deque: posições da frente para o fundo, cada uma com o seu valor
      texto(ctx, "deque de posições (frente → fundo)", X0, DY - 24, 11, COR.cinza);
      for (let j = 0; j < Math.max(K, s.dq.length); j++) {
        const x = X0 + j * SW, p = s.dq[j];
        ctx.strokeStyle = COR.borda; ctx.lineWidth = 1; ctx.setLineDash(p === undefined ? [3, 3] : []);
        ctx.strokeRect(x + 2, DY, SW - 6, 46); ctx.setLineDash([]);
        if (p === undefined) continue;
        const novo = k >= 0 && est[k].t === "poe" && j === s.dq.length - 1, comparado = s.foco === p && est[k].t === "compara";
        ctx.fillStyle = novo ? COR.mexeu : COR.claro; ctx.fillRect(x + 3, DY + 1, SW - 8, 44);
        if (comparado) { ctx.strokeStyle = COR.album; ctx.lineWidth = 2.5; ctx.strokeRect(x + 3, DY + 1, SW - 8, 44); }
        texto(ctx, String(v[p]), x + SW / 2 - 1, DY + 6, Math.min(17, SW * 0.32), novo ? "#fff" : COR.tinta, 600, "center");
        texto(ctx, `pos ${p + 1}`, x + SW / 2 - 1, DY + 28, 10, novo ? "#fff" : COR.cinza, 400, "center");
      }
      if (s.dq.length) {
        texto(ctx, "frente", X0 + SW / 2 - 1, DY + 52, 11, COR.tinta, 600, "center");
        if (s.dq.length > 1) texto(ctx, "fundo", X0 + (s.dq.length - 0.5) * SW - 1, DY + 52, 11, COR.tinta, 600, "center");
      }
      // os máximos já achados, embaixo da casa em que cada janela termina: são o resultado
      texto(ctx, "máximo de cada janela", X0, MY - 22, 11, COR.cinza);
      for (let j = 0; j < s.nAchados; j++) {
        const x = X0 + (j + K - 1) * cw;
        texto(ctx, String(r.maximos[j]), x + cw / 2, MY, tam, COR.verde, 600, "center");
      }

      const x = 680;
      texto(ctx, "comparações", x, 90, 13, COR.cinza);
      texto(ctx, String(s.comps), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "o ingênuo, até aqui", x, 174, 13, COR.cinza);
      texto(ctx, String(fim ? r.ingenuo : s.ing), x, 190, 26, COR.tinta, 700);
      texto(ctx, `de ${r.ingenuo} no total`, x, 222, 12, COR.cinza);
      texto(ctx, "memória extra agora", x, 256, 13, COR.cinza);
      texto(ctx, `${s.dq.length} ${s.dq.length === 1 ? "posição" : "posições"}`, x, 272, 20, COR.tinta, 700);
      texto(ctx, `deque mais cheio: ${s.pico}`, x, 300, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `n = ${N}, k = ${K}`, x, 342, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "o da vez"], [COR.claro, "na janela, ou no deque"], ["#fff", "comparado", COR.album, 2.5]], 480);

      if (fim) legenda(ctx, [[`n = ${N}, k = ${K}: `, ""], [`${r.ops} comparações`, "g"], [` (o ingênuo: ${r.ingenuo})`, ""]]);
      else if (s.nAchados < 2) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.janela, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} comparações (ingênuo: ${r.ingenuo}), n = ${N}, k = ${K}<br>deque de até ${r.pico}`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, k = ${K}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} comparações (o ingênuo faria ${r.ingenuo}), deque de até ${r.pico} ${r.pico === 1 ? "posição" : "posições"}.`,
    };
  }

  // ---------- busca em largura e em profundidade ----------

  function simGrafo(faixa, k, arestas, accelerando) {
    const largura = faixa.alg === "largura", V = k * k;
    const r = Algoritmos[faixa.alg](V, arestas);
    const ideia = faixa.video.ideia, nomeEst = largura ? "fila" : "pilha";
    const chave = (u, v) => (u < v ? `${u},${v}` : `${v},${u}`);
    // papel de cada vértice: 0 = não visto, 1 = na fila ou na pilha, 2 = o da vez, 3 = já saiu
    const papel = new Array(V).fill(0), num = new Array(V).fill(null), arvore = new Set(), olhadas = new Set();
    const est_ = [];   // a fila ou a pilha: os vértices, do início (ou fundo) para o fim (ou topo)
    let vez = null, ops = 0, viz = 0, pico = 0, visitados = 0, olhando = null;   // olhando: a aresta da vez, até o próximo vértice
    const est = r.eventos.map((e) => {
      if (e.t === "visita" || e.t === "topo" || e.t === "desempilha" || e.t === "testa" || e.t === "devolva") olhando = null;
      if (e.t === "enfileira" || e.t === "empilha") {
        est_.push(e.v); papel[e.v] = 1; ops++;
        if (vez !== null) arvore.add(chave(vez, e.v));     // quem descobriu e quem foi descoberto
        if (largura) { if (num[e.v] === null) num[e.v] = 0; }   // a origem; os outros já ganharam a distância
        else { num[e.v] = ++visitados; if (vez !== null) papel[vez] = 1; vez = e.v; papel[e.v] = 2; }
      } else if (e.t === "visita") {
        est_.shift(); ops++;
        if (vez !== null) papel[vez] = 3;
        vez = e.u; papel[e.u] = 2;
      } else if (e.t === "topo") {
        ops++;
        if (vez !== null && vez !== e.u && papel[vez] === 2) papel[vez] = 1;
        vez = e.u; papel[e.u] = 2;
      } else if (e.t === "desempilha") {
        est_.pop(); ops++; papel[e.u] = 3; vez = null;
      } else if (e.t === "olha") {
        viz++; ops++; olhando = [e.u, e.v]; olhadas.add(chave(e.u, e.v));
      } else if (e.t === "atribui" && largura && e.v !== undefined) {
        num[e.v] = e.d;
      } else if (e.t === "devolva") {
        if (vez !== null) papel[vez] = 3;
        vez = null;
      }
      pico = Math.max(pico, est_.length);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, papel: papel.slice(), num: num.slice(), arvore: new Set(arvore),
        nOlhadas: olhadas.size, olhando, est: est_.slice(), ops, viz, pico };
    });
    if (ops !== r.ops || pico !== r.estrutura) throw new Error("reprodução da busca no grafo não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { atribui: 0.4, enfileira: 1, empilha: 1, visita: 1.5, topo: 0.5, testa: 0.3,
      olha: 1, avanca: 0.2, compara: 0.4, desempilha: 1, devolva: 3 }, (t) => t === "olha", 6, 2.5);
    const tl = linhaDoTempo(pesos);

    // geometria: a grade à esquerda, a fila ou a pilha em pé no meio, o painel à direita
    const GX0 = 90, GY0 = 100, LADO = Math.min(360, 110 * (k - 1)), passo = LADO / Math.max(1, k - 1);
    const raio = Math.min(17, passo * 0.3);
    const pos = (u) => [GX0 + (u % k) * passo, GY0 + Math.floor(u / k) * passo];
    const SX = 540, SW = 64, SBASE = 470, sh = Math.min(28, 340 / Math.max(4, r.estrutura)), STOPO = SBASE - Math.max(4, r.estrutura) * sh;
    const maisLonge = largura ? Math.max(...r.dist) : null;

    function desenhar(ctx, u) {
      const k_ = tl.eventoEm(u), fim = u >= tl.total;
      const s = k_ >= 0 ? est[k_] : { papel: new Array(V).fill(0), num: new Array(V).fill(null), arvore: new Set(), olhando: null, est: [], ops: 0, viz: 0, pico: 0, nOlhadas: 0 };
      // arestas: as da árvore da busca em tinta; a que está sendo olhada em coral
      for (const [a, b] of arestas) {
        const [x0, y0] = pos(a), [x1, y1] = pos(b);
        const naArvore = s.arvore.has(chave(a, b));
        linha(ctx, x0, y0, x1, y1, naArvore ? COR.tinta : COR.palido, naArvore ? 3 : 1.5);
      }
      if (s.olhando && !fim) { const [x0, y0] = pos(s.olhando[0]), [x1, y1] = pos(s.olhando[1]); linha(ctx, x0, y0, x1, y1, COR.mexeu, 4); }
      for (let v = 0; v < V; v++) {
        const [x, y] = pos(v), p = fim ? 3 : s.papel[v];
        ctx.beginPath(); ctx.arc(x, y, raio, 0, 7);
        ctx.fillStyle = p === 2 ? COR.mexeu : p === 3 ? COR.claro : "#fff"; ctx.fill();
        ctx.strokeStyle = p === 0 ? COR.palido : p === 3 ? COR.cinza : COR.tinta; ctx.lineWidth = p === 1 ? 2.5 : 1.5; ctx.stroke();
        if (s.num[v] !== null) texto(ctx, String(s.num[v]), x, y - Math.min(8, raio * 0.5), Math.min(15, raio * 0.95), fim ? COR.verde : p === 2 ? "#fff" : COR.tinta, 700, "center");
        if (raio >= 9) texto(ctx, String(v + 1), x + raio * 0.75, y - raio - 11, 10, COR.cinza);
      }
      // a fila (o início em cima: sai por cima, entra por baixo) ou a pilha (o fundo embaixo, o topo em cima)
      texto(ctx, nomeEst, SX + SW / 2, STOPO - 36, 13, COR.cinza, 400, "center");
      linha(ctx, SX, STOPO - 14, SX, SBASE, COR.palido); linha(ctx, SX + SW, STOPO - 14, SX + SW, SBASE, COR.palido);
      if (!largura) linha(ctx, SX, SBASE, SX + SW, SBASE, COR.tinta, 2);
      const ult = k_ >= 0 ? est[k_].t : null;
      s.est.forEach((v, j) => {
        const y = largura ? STOPO + j * sh : SBASE - (j + 1) * sh;
        const novo = j === s.est.length - 1 && (ult === "enfileira" || ult === "empilha");
        ctx.fillStyle = novo ? COR.mexeu : COR.claro;
        ctx.fillRect(SX + 4, y + 1, SW - 8, sh - 2);
        if (sh >= 12) texto(ctx, String(v + 1), SX + SW / 2, y + sh / 2 - Math.min(8, sh * 0.38), Math.min(15, sh * 0.7), novo ? "#fff" : COR.tinta, 600, "center");
      });
      if (s.est.length) {
        if (largura) {
          texto(ctx, "← sai", SX + SW + 6, STOPO + sh / 2 - 7, 11, COR.cinza);
          texto(ctx, "← entra", SX + SW + 6, STOPO + (s.est.length - 1) * sh + sh / 2 - 7 + (s.est.length === 1 ? 14 : 0), 11, COR.cinza);
        } else texto(ctx, "topo", SX + SW + 6, SBASE - s.est.length * sh + sh / 2 - 7, 11, COR.cinza);
      }

      const x = 680;
      texto(ctx, "operações", x, 90, 13, COR.cinza);
      texto(ctx, String(s.ops), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "vizinhos olhados", x, 174, 13, COR.cinza);
      texto(ctx, `${s.viz} de ${2 * arestas.length}`, x, 190, 26, COR.tinta, 700);
      const fixo = largura ? V : 2 * V;
      texto(ctx, "memória extra agora", x, 244, 13, COR.cinza);
      texto(ctx, `${fixo} + ${s.est.length} ${nomeEst === "fila" ? "na fila" : "na pilha"}`, x, 260, 20, COR.tinta, 700);
      texto(ctx, `${nomeEst} mais ${largura ? "longa" : "alta"}: ${s.pico}`, x, 288, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `V = ${V} vértices, E = ${arestas.length} arestas`, x, 330, 13, COR.cinza);
      texto(ctx, largura ? "no vértice: a distância à origem" : "no vértice: a ordem de visita", x, 350, 13, COR.cinza);
      legendaCores(ctx, [["#fff", "não visto", COR.palido], ["#fff", `na ${nomeEst}`, COR.tinta, 2], [COR.mexeu, "o da vez"], [COR.claro, "já saiu", COR.cinza], [COR.tinta, "aresta da árvore"]], 500);

      if (fim && largura) legenda(ctx, [["visitou os ", ""], [`${V} vértices`, "b"], [": ", ""], [`${r.ops} operações`, "g"], [`, o mais longe a ${maisLonge} arestas`, ""]]);
      else if (fim) legenda(ctx, [["visitou os ", ""], [`${V} vértices`, "b"], [": ", ""], [`${r.ops} operações`, "g"], [`, pilha de até ${r.estrutura}`, ""]]);
      else if (s.viz < 6) legenda(ctx, [[ideia[0], ""]]);
      else legenda(ctx, [[ideia[ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k_ = tl.eventoEm(u); return k_ >= 0 ? est[k_].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.grafo, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: V }, contagemEm,
      medidor: () => `${r.ops} operações, V = ${V}, E = ${arestas.length}<br>${nomeEst} de até ${r.estrutura}`,
      aoVivo: (u, cfg) => `Tocando agora: ${V} vértices e ${arestas.length} arestas, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} operações, ${nomeEst} de até ${r.estrutura} ${r.estrutura === 1 ? "vértice" : "vértices"}.`,
    };
  }

  // ---------- Dijkstra ----------

  function simDijkstra(faixa, k, arestas, pesos, accelerando) {
    const V = k * k, r = Algoritmos.dijkstra(V, arestas, pesos), ideia = faixa.video.ideia;
    const chave = (u, v) => (u < v ? `${u},${v}` : `${v},${u}`);
    const peso = new Map(arestas.map(([u, v], j) => [chave(u, v), pesos[j]]));
    // papel de cada vértice: 0 = não alcançado, 1 = alcançado (tem par no heap), 2 = o da vez, 3 = já saiu valendo
    const papel = new Array(V).fill(0), num = new Array(V).fill(null), pai = new Array(V).fill(null);
    let vez = null, ops = 0, viz = 0, desc = 0, pico = 0, casas = [], escritas = [], olhando = null, saiu = null;
    const est = r.eventos.map((e, j) => {
      escritas = [];
      if (e.t === "tira" || e.t === "testa" || e.t === "devolva") olhando = null;
      if (e.t === "insere") {
        casas = e.casas; escritas = e.escritas; ops = e.acessos;
        num[e.v] = e.d; if (papel[e.v] !== 3 && e.v !== vez) papel[e.v] = 1;
      } else if (e.t === "tira") {
        casas = e.casas; escritas = e.escritas; ops = e.acessos; saiu = { u: e.u, d: e.d, vencido: !!r.eventos[j + 2] && r.eventos[j + 2].t === "descarta" };   // depois do tira: o teste d = dist[u] e o descarte
        if (!saiu.vencido) { if (vez !== null) papel[vez] = 3; vez = e.u; papel[e.u] = 2; }
      } else if (e.t === "olha") {
        viz++; ops = e.acessos; olhando = [e.u, e.v]; saiu = null;
      } else if (e.t === "atribui" && e.v !== undefined) {
        pai[e.v] = e.pai;
      } else if (e.t === "descarta") {
        desc++;
      } else if (e.t === "devolva") {
        if (vez !== null) papel[vez] = 3;
        vez = null; saiu = null;
      }
      pico = Math.max(pico, casas.length);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, papel: papel.slice(), num: num.slice(), pai: pai.slice(),
        casas, escritas, olhando, saiu, ops, viz, desc, pico };
    });
    if (ops !== r.ops || pico !== r.estrutura || desc !== r.descartados) throw new Error("reprodução do Dijkstra não bate");
    const pesosEv = !accelerando ? est.map(() => 1) : pesosLentos(est, { atribui: 0.6, insere: 1, tira: 1.5, compara: 0.4, testa: 0.3,
      olha: 1, descarta: 3, devolva: 3 }, (t) => t === "olha", 6, 2.5);
    const tl = linhaDoTempo(pesosEv);

    // geometria: a grade à esquerda, o heap em pé no meio, o painel à direita
    const GX0 = 90, GY0 = 100, LADO = Math.min(340, 110 * (k - 1)), passo = LADO / Math.max(1, k - 1);
    const raio = Math.min(17, passo * 0.3);
    const pos = (u) => [GX0 + (u % k) * passo, GY0 + Math.floor(u / k) * passo];
    const SX = 500, SW = 92, STOPO = 104, sh = Math.min(26, 330 / Math.max(4, r.estrutura));
    const maisLonge = Math.max(...r.dist);

    function desenhar(ctx, u) {
      const kk = tl.eventoEm(u), fim = u >= tl.total;
      const s = kk >= 0 ? est[kk] : { papel: new Array(V).fill(0), num: new Array(V).fill(null), pai: new Array(V).fill(null), casas: [], escritas: [],
        olhando: null, saiu: null, ops: 0, viz: 0, desc: 0, pico: 0 };
      // arestas: as da árvore de caminhos mínimos em tinta, a olhada em coral; o peso no meio
      for (const [a, b] of arestas) {
        const [x0, y0] = pos(a), [x1, y1] = pos(b);
        const naArvore = s.pai[b] === a || s.pai[a] === b;
        linha(ctx, x0, y0, x1, y1, naArvore ? COR.tinta : COR.palido, naArvore ? 3 : 1.5);
      }
      if (s.olhando && !fim) { const [x0, y0] = pos(s.olhando[0]), [x1, y1] = pos(s.olhando[1]); linha(ctx, x0, y0, x1, y1, COR.mexeu, 4); }
      if (passo >= 44) for (const [a, b] of arestas) {
        const [x0, y0] = pos(a), [x1, y1] = pos(b), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        ctx.fillStyle = "#fff"; ctx.fillRect(mx - 7, my - 8, 14, 16);
        const aceso = s.olhando && !fim && chave(...s.olhando) === chave(a, b);
        texto(ctx, String(peso.get(chave(a, b))), mx, my - 7, 11, aceso ? COR.mexeu : COR.cinza, aceso ? 700 : 400, "center");
      }
      for (let v = 0; v < V; v++) {
        const [x, y] = pos(v), p = fim ? 3 : s.papel[v];
        ctx.beginPath(); ctx.arc(x, y, raio, 0, 7);
        ctx.fillStyle = p === 2 ? COR.mexeu : p === 3 ? COR.claro : "#fff"; ctx.fill();
        ctx.strokeStyle = p === 0 ? COR.palido : p === 3 ? COR.cinza : COR.tinta; ctx.lineWidth = p === 1 ? 2.5 : 1.5; ctx.stroke();
        const d = s.num[v] === null ? "∞" : String(s.num[v]);
        texto(ctx, d, x, y - Math.min(8, raio * 0.5), Math.min(14, raio * 0.85), fim ? COR.verde : p === 2 ? "#fff" : p === 0 ? COR.cinza : COR.tinta, 700, "center");
        if (raio >= 9) texto(ctx, String(v + 1), x + raio * 0.75, y - raio - 11, 10, COR.cinza);
      }

      // o heap: o vetor em pé, a casa 0 (o menor) em cima; as casas que a operação escreveu em coral
      texto(ctx, "heap (distância, vértice)", SX + SW / 2, STOPO - 54, 12, COR.cinza, 400, "center");
      linha(ctx, SX, STOPO - 4, SX, STOPO + Math.max(4, r.estrutura) * sh, COR.palido);
      linha(ctx, SX + SW, STOPO - 4, SX + SW, STOPO + Math.max(4, r.estrutura) * sh, COR.palido);
      const mex = new Set(s.escritas);
      s.casas.forEach(([d, v], i) => {
        const y = STOPO + i * sh, m = mex.has(i);
        ctx.fillStyle = m ? COR.mexeu : COR.claro;
        ctx.fillRect(SX + 4, y + 1, SW - 8, sh - 2);
        if (sh >= 12) texto(ctx, `(${d}, ${v + 1})`, SX + SW / 2, y + sh / 2 - Math.min(8, sh * 0.36), Math.min(13, sh * 0.6), m ? "#fff" : COR.tinta, 600, "center");
      });
      if (s.casas.length) texto(ctx, "← o menor", SX + SW + 6, STOPO + sh / 2 - 7, 11, COR.cinza);
      if (s.saiu && !fim) {   // o par que acabou de sair: riscado se está vencido
        const t = `saiu (${s.saiu.d}, ${s.saiu.u + 1})`, y = STOPO - 28;
        texto(ctx, t, SX + SW / 2, y, 12, s.saiu.vencido ? COR.cinza : COR.tinta, 600, "center");
        if (s.saiu.vencido) {
          ctx.font = `600 12px ${MONO}`; const w = ctx.measureText(t).width;
          linha(ctx, SX + SW / 2 - w / 2, y + 8, SX + SW / 2 + w / 2, y + 8, COR.cinza, 1.5);
          texto(ctx, "vencido", SX + SW + 6, y, 11, COR.cinza);
        }
      }

      const x = 680;
      texto(ctx, "acessos ao heap e à lista", x, 90, 13, COR.cinza);
      texto(ctx, String(s.ops), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "vizinhos olhados", x, 168, 13, COR.cinza);
      texto(ctx, `${s.viz} de ${2 * arestas.length}`, x, 184, 22, COR.tinta, 700);
      texto(ctx, "pares descartados", x, 220, 13, COR.cinza);
      texto(ctx, String(s.desc), x, 236, 22, COR.tinta, 700);
      texto(ctx, "memória extra agora", x, 272, 13, COR.cinza);
      texto(ctx, `${V} + ${s.casas.length} no heap`, x, 288, 20, COR.tinta, 700);
      texto(ctx, `heap mais alto: ${s.pico}`, x, 314, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      texto(ctx, `V = ${V}, E = ${arestas.length}`, x, 350, 13, COR.cinza);
      texto(ctx, "na aresta: o peso", x, 370, 13, COR.cinza);
      texto(ctx, "no vértice: a distância à origem", x, 390, 13, COR.cinza);
      legendaCores(ctx, [["#fff", "não alcançado", COR.palido], ["#fff", "alcançado, no heap", COR.tinta, 2], [COR.mexeu, "o da vez"], [COR.claro, "já saiu valendo", COR.cinza], [COR.tinta, "caminho mais curto"]], 500);

      if (fim) legenda(ctx, [["distâncias de ", ""], [`${V} vértices`, "b"], [": ", ""], [`${r.ops} acessos`, "g"], [`, o mais longe a ${maisLonge}`, ""]]);
      else if (kk >= 0 && s.saiu && s.saiu.vencido) legenda(ctx, [[ideia[ideia.length - 1], ""]]);
      else legenda(ctx, [[ideia[0], ""]]);
    }

    const contagemEm = (u) => { const kk = tl.eventoEm(u); return kk >= 0 ? est[kk].ops : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesosEv, RITMO.grafo, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: V }, contagemEm,
      medidor: () => `${r.ops} acessos, V = ${V}, E = ${arestas.length}<br>heap de até ${r.estrutura}, ${r.descartados} descartados`,
      aoVivo: (u, cfg) => `Tocando agora: ${V} vértices e ${arestas.length} arestas com pesos, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} acessos, heap de até ${r.estrutura} pares.`,
    };
  }

  // ---------- estatística ----------

  // número com vírgula decimal e separador de milhar
  const num = (x, casas) => x.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  // seis algarismos significativos, para variâncias que podem vir de 10⁻³ a 10³
  const milhar = (x) => x.toLocaleString("pt-BR");   // separador de milhar, como na página
  const sig = (x) => (x === 0 ? "0" : num(x, Math.max(0, Math.min(10, 5 - Math.floor(Math.log10(Math.abs(x)))))));

  function simMediana(faixa, vetor, accelerando) {
    const r = Algoritmos.mediana(vetor);
    const N = vetor.length, k = r.k, ideia = faixa.video.ideia;
    const v = vetor.slice();
    let a = 0, b = N - 1, part = null, comps = 0, trocas = 0, m = null, fimPart1 = -1;
    const est = r.eventos.map((e, idx) => {
      let foco = null;
      if (e.t === "compara") {
        comps++;
        foco = [e.i, e.j];
        if (part) part = { ...part, j: e.j, jMenor: v[e.j] < v[e.i] };
      } else if (e.t === "troca") {
        trocas++;
        const x = v[e.i]; v[e.i] = v[e.j]; v[e.j] = x;
        if (part) {
          if (e.j === part.p) { part = null; if (fimPart1 < 0) fimPart1 = idx; }
          else part = { ...part, i: part.i + 1, jMenor: false };
        }
      } else if (e.t === "corta") { a = e.a; b = e.b; }
      else if (e.t === "pivo") part = { p: e.p, i: e.a, j: null, jMenor: false };
      else if (e.t === "menor") m = e.m;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, v: v.slice(), a, b, part, foco, comps, trocas, m };
    });
    if (comps !== r.comparacoes || trocas !== r.trocas) throw new Error("reprodução da mediana não bate");
    const conta = (t) => t === "compara" || t === "troca";
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { compara: 1, troca: 2, pivo: 1.5, corta: 1.5, testa: 0.6, pare: 2, atribui: 1, menor: 1, devolva: 3 }, conta, 10, 4);
    const tl = linhaDoTempo(pesos);
    const BX0 = 70, BX1 = 600, BTOPO = 96, BBASE = 400;
    const bw = (BX1 - BX0) / N, bx = (i) => BX0 + i * bw;
    const lo = Math.min(...vetor), hi = Math.max(...vetor), folga = (hi - lo) / N || 1;
    const altura = (x) => (x - lo + folga) / (hi - lo + folga) * (BBASE - BTOPO);
    const media = vetor.reduce((s, x) => s + x, 0) / N;
    const par = N % 2 === 0, mFinal = par ? est.at(-1).m : null;   // n par: a outra casa do meio

    function desenhar(ctx, u) {
      const kk = tl.eventoEm(u), fim = u >= tl.total;
      const s = kk >= 0 ? est[kk] : { v: vetor, a: 0, b: N - 1, part: null, foco: null, comps: 0, trocas: 0, m: null };
      const agora = !fim && kk >= 0 && est[kk].t === "compara" ? s.foco : null;
      const segunda = s.m !== null;      // n par: procurando o menor do lado direito
      linha(ctx, BX0, BBASE + 1, BX1, BBASE + 1, COR.palido);
      s.v.forEach((x, i) => {
        let cor = COR.tinta;
        if (fim) cor = i === k || (par && i === mFinal) ? COR.verde : COR.apagado;
        else if (segunda) cor = i === s.m ? COR.mexeu : i === k ? COR.album : i > k ? COR.tinta : COR.apagado;
        else if (i < s.a || i > s.b) cor = COR.apagado;
        else if (s.part) {
          const p = s.part;
          if (i === p.p) cor = COR.pivo;
          else if (i < p.i || (i === p.j && p.jMenor)) cor = COR.menor;
          else if (p.j !== null && i <= p.j) cor = COR.maior;
        }
        const h = altura(x);
        ctx.fillStyle = cor;
        ctx.fillRect(bx(i) + bw * 0.12, BBASE - h, bw * 0.76, h);
      });
      if (agora) { seta(ctx, bx(agora[0]) + bw / 2, BBASE + 5); seta(ctx, bx(agora[1]) + bw / 2, BBASE + 5); }
      if (!fim && s.part) texto(ctx, "pivô", bx(s.part.p) + bw / 2, BBASE + 14, 11, COR.tinta, 600, "center");
      // a casa do meio, sempre marcada embaixo
      texto(ctx, "▲ meio", bx(k) + bw / 2, BBASE + 30, 11, fim ? COR.verde : COR.tinta, 600, "center");
      if (!fim && !segunda && s.a <= s.b) {
        const y = BBASE + 52;
        linha(ctx, bx(s.a) + 2, y, bx(s.b + 1) - 2, y, COR.tinta, 2);
        const resta = s.b - s.a + 1;
        const meioX = Math.min(BX1 - 110, Math.max(BX0 + 110, (bx(s.a) + bx(s.b + 1)) / 2));
        texto(ctx, `o meio está aqui: ${resta} ${resta === 1 ? "casa" : "casas"}`, meioX, y + 8, 11, COR.cinza, 400, "center");
      }
      if (fim) {   // a média, tracejada: o que a mediana não é
        const ym = BBASE - altura(media);
        ctx.setLineDash([5, 4]); linha(ctx, BX0, ym, BX1, ym, COR.cinza, 1.2); ctx.setLineDash([]);
        texto(ctx, "média", BX0 - 6, ym - 7, 11, COR.cinza, 400, "right");
      }

      const x = 650;
      texto(ctx, "comparações", x, BTOPO - 6, 13, COR.cinza);
      texto(ctx, String(s.comps), x, BTOPO + 10, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "trocas", x, BTOPO + 84, 13, COR.cinza);
      texto(ctx, String(s.trocas), x, BTOPO + 100, 26, COR.tinta, 700);
      texto(ctx, fim ? "mediana" : "casa do meio", x, BTOPO + 154, 13, COR.cinza);
      texto(ctx, fim ? num(r.mediana, 1) : `${k + 1}ª de ${N}`, x, BTOPO + 170, 20, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "memória extra: 0 valores", x, BTOPO + 210, 13, COR.cinza);
      texto(ctx, `n = ${N} números`, x, BBASE - 14, 13, COR.cinza);

      legendaCores(ctx, segunda && !fim
        ? [[COR.album, "a casa do meio"], [COR.mexeu, "o menor à direita até aqui"], [COR.apagado, "fora da conta"]]
        : [[COR.pivo, "pivô"], [COR.menor, "menor que o pivô"], [COR.maior, "maior"], [COR.apagado, "descartado"], [COR.verde, "a mediana"]], 480);

      if (fim) legenda(ctx, [["mediana ", ""], [num(r.mediana, 1), "g"], [`: ${r.comparacoes} comparações, sem ordenar tudo`, ""]]);
      else if (segunda) legenda(ctx, [["n par: o outro do meio é o menor à direita", ""]]);
      else legenda(ctx, [[ideia[kk < fimPart1 || fimPart1 < 0 ? 0 : kk < fimPart1 + 12 ? 1 : ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const kk = tl.eventoEm(u); return kk >= 0 ? est[kk].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.mediana, accelerando),
      resumo: { comparacoes: r.comparacoes, mediana: r.mediana, n: N, pico: 0 }, contagemEm,
      medidor: () => `${r.comparacoes} comparações, n = ${N}<br>sem memória extra`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.comparacoes} comparações, mediana ${num(r.mediana, 1)}, sem memória extra.`,
    };
  }

  function simWelford(faixa, x, anos, menu, accelerando) {
    const r = Algoritmos.welford(x), sq = Algoritmos.somaDosQuadrados(x), dp = Algoritmos.duasPassadas(x);
    const N = x.length, ideia = faixa.video.ideia, desloc = menu.deslocamento;
    // a soma dos quadrados corre junto, valor a valor, na mesma ordem do Python
    // nw: quantos valores o Welford já somou (o valor lido só entra na conta na linha seguinte)
    let lidos = 0, s1 = 0, s2 = 0, media = 0, m2 = 0, nw = 0;
    const est = r.eventos.map((e) => {
      if (e.t === "le") lidos++;
      if (e.t === "atribui" && e.linha === 6) { s1 += x[e.i]; s2 += x[e.i] * x[e.i]; }   // a soma dos quadrados anda junto com o n do Welford
      if (e.t === "atribui") { media = e.vars["média"]; m2 = e.vars.M2; nw = e.vars.n; }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i: e.i, lidos, s1, s2, media, m2, nw };
    });
    if (lidos !== r.leituras) throw new Error("reprodução do Welford não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { le: 1, atribui: 0.5, devolva: 3 }, (t) => t === "le", 6, 3);
    const tl = linhaDoTempo(pesos);
    // a curva corrente (média e ±1 dp depois de cada valor), para o desenho
    const curva = [];
    { let n = 0, me = 0, q = 0; for (const v of x) { n++; const d = v - me; me += d / n; q += d * (v - me); curva.push([me, n > 1 ? Math.sqrt(q / (n - 1)) : 0]); } }
    const GX0 = 70, GX1 = 600, GY0 = 80, GY1 = 290;
    const lo = Math.min(...x), hi = Math.max(...x), pad = (hi - lo) * 0.12;
    const gx = (i) => GX0 + i / (N - 1) * (GX1 - GX0), gy = (y) => GY1 - (y - lo + pad) / (hi - lo + 2 * pad) * (GY1 - GY0);
    const certo = (v) => Math.abs(v - menu.exata) / menu.exata < 1e-6;
    const nivel = (y) => num(y, Math.abs(y) >= 1e6 ? 1 : 2);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { lidos: 0, s1: 0, s2: 0, media: 0, m2: 0, nw: 0, i: -1 };
      const n = s.lidos;
      // a série até aqui: faixa de ±1 dp, a média corrente e os pontos
      texto(ctx, `nível do lago Huron${desloc ? ` + ${num(desloc, 0)}` : ""}, de ${nivel(lo)} a ${nivel(hi)} pés`, GX0, GY0 - 22, 11, COR.cinza);
      linha(ctx, GX0, GY1 + 6, GX1, GY1 + 6, COR.palido);
      texto(ctx, String(anos[0]), GX0, GY1 + 12, 11, COR.cinza);
      texto(ctx, String(anos[N - 1]), GX1, GY1 + 12, 11, COR.cinza, 400, "right");
      if (n >= 2) {
        ctx.fillStyle = COR.claro; ctx.beginPath();
        for (let i = 1; i < n; i++) ctx.lineTo(gx(i), gy(curva[i][0] + curva[i][1]));
        for (let i = n - 1; i >= 1; i--) ctx.lineTo(gx(i), gy(curva[i][0] - curva[i][1]));
        ctx.fill();
      }
      if (n >= 1) {
        ctx.strokeStyle = COR.tinta; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < n; i++) ctx.lineTo(gx(i), gy(curva[i][0]));
        ctx.stroke();
      }
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i === n - 1 && !fim ? COR.mexeu : COR.cinza;
        ctx.beginPath(); ctx.arc(gx(i), gy(x[i]), i === n - 1 && !fim ? 4.5 : 2.5, 0, 7); ctx.fill();
      }

      // as três contas, lado a lado
      const TY = 342, cols = [GX0, 250, 400, 520];
      texto(ctx, "conta", cols[0], TY, 11, COR.cinza);
      texto(ctx, "variância", cols[1], TY, 11, COR.cinza);
      texto(ctx, "lê", cols[2], TY, 11, COR.cinza);
      texto(ctx, "guarda", cols[3], TY, 11, COR.cinza);
      linha(ctx, GX0, TY + 18, GX1, TY + 18, COR.palido);
      const varSoma = s.nw >= 2 ? (s.s2 - s.s1 * s.s1 / s.nw) / (s.nw - 1) : null, varW = s.nw >= 2 ? s.m2 / (s.nw - 1) : null;
      const linhas = [
        ["Welford", fim ? r.variancia : varW, `${n}`, "3 números"],
        ["soma dos quadrados", fim ? sq.variancia : varSoma, `${n}`, "3 números"],
        ["duas passadas", fim ? dp.variancia : null, fim ? `${2 * N}` : `${n} (e de novo)`, `${n} valores`],
      ];
      linhas.forEach(([nome, val, le, guarda], i) => {
        const y = TY + 28 + i * 26;
        texto(ctx, nome, cols[0], y, 13, COR.tinta, i === 0 ? 600 : 400);
        const ok = fim && certo(val);
        texto(ctx, val === null ? (i === 2 ? "falta a 2ª leitura" : "—") : sig(val) + (fim && !ok ? "  ✗" : ""), cols[1], y, 13, ok ? COR.verde : COR.tinta, ok || (fim && !ok) ? 600 : 400);
        texto(ctx, le, cols[2], y, 13, COR.cinza);
        texto(ctx, guarda, cols[3], y, 13, COR.cinza);
      });
      texto(ctx, `variância certa (em frações): ${sig(menu.exata)}`, GX0, TY + 110, 11, COR.cinza);

      const px = 650;
      texto(ctx, "leituras", px, 90, 13, COR.cinza);
      texto(ctx, String(n), px, 106, 40, COR.tinta, 700);
      texto(ctx, "média até aqui", px, 174, 13, COR.cinza);
      texto(ctx, s.nw ? num(s.media, Math.abs(s.media) >= 1e6 ? 2 : 3) : "—", px, 190, 20, COR.tinta, 700);
      texto(ctx, "variância (Welford)", px, 234, 13, COR.cinza);
      texto(ctx, varW === null ? "—" : sig(fim ? r.variancia : varW), px, 250, 20, fim && certo(r.variancia) ? COR.verde : COR.tinta, 700);
      texto(ctx, "memória extra: 0 valores", px, 296, 13, COR.cinza);
      texto(ctx, `n = ${N} anos`, px, 318, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "o ano lido agora"], [COR.claro, "média ± 1 desvio-padrão"]], 488);

      if (fim) legenda(ctx, [["Welford: variância ", ""], [sig(r.variancia), "g"], [certo(sq.variancia) ? "; a soma dos quadrados também bate" : `; a soma dos quadrados dá ${sig(sq.variancia)}`, ""]], 26, 17);
      else legenda(ctx, [[ideia[n < 12 ? 0 : ideia.length - 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].lidos : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.welford, accelerando),
      resumo: { leituras: r.leituras, n: N, pico: 0 }, contagemEm,
      medidor: () => `${r.leituras} leituras, n = ${N}<br>sem memória extra`,
      aoVivo: (u, cfg) => `Tocando agora: ${cfg.rotulo}; ${contagemEm(u)} de ${r.leituras} leituras, variância ${sig(r.variancia)} pelo Welford e ${sig(sq.variancia)} pela soma dos quadrados (a certa é ${sig(menu.exata)}), sem memória extra.`,
    };
  }

  function simHistograma(faixa, x, accelerando) {
    const r = Algoritmos.histograma(x);
    const N = x.length, C = r.c, ideia = faixa.video.ideia;
    const cont = new Array(C).fill(0);
    let lidos = 0, menor = x[0], maior = x[0], classes = false, ultimo = null;
    const est = r.eventos.map((e) => {
      if (e.t === "le" || (e.t === "atribui" && e.linha === 2)) { lidos++; ultimo = e.i; }
      else if (e.t === "menor") menor = x[e.i];
      else if (e.t === "maior") maior = x[e.i];
      else if (e.t === "classes") classes = true;
      else if (e.t === "classe") { lidos++; ultimo = e.i; }
      else if (e.t === "conta") cont[e.j]++;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, lidos, menor, maior, classes, ultimo, cont: cont.slice(), j: e.j };
    });
    if (lidos !== r.ops || cont.some((q, j) => q !== r.contagens[j])) throw new Error("reprodução do histograma não bate");
    // ritmo constante: a primeira passada corre (só procura o menor e o maior); cada valor da segunda vale 1
    const pesos = !accelerando
      ? est.map((s) => ({ le: 0.25, menor: 0.25, maior: 0.25, classe: 0.5, conta: 0.5 }[s.t] ?? 1))
      : pesosLentos(est, { le: 0.12, menor: 0.3, maior: 0.3, classes: 4, atribui: 0.6, classe: 0.4, conta: 0.6, devolva: 3 }, (t) => t === "conta", 6, 5);
    const tl = linhaDoTempo(pesos);
    const BX0 = 70, BX1 = 600, BTOPO = 124, BBASE = 380, EIXO = 420;
    const a = r.a, b = r.a + C * r.h;
    const ex = (v) => BX0 + (v - a) / (b - a) * (BX1 - BX0);
    const topo = Math.max(...r.contagens), cw = (BX1 - BX0) / C;
    const casas = r.h >= 1 ? 0 : r.h >= 0.1 ? 1 : 2;
    const valor = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });   // como veio nos dados

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { lidos: 0, menor: x[0], maior: x[0], classes: false, ultimo: null, cont: new Array(C).fill(0), t: null };
      const segunda = s.classes;
      // o eixo dos valores: cada valor lido aparece como um risco; o da vez, maior e em coral
      linha(ctx, BX0, EIXO, BX1, EIXO, COR.palido);
      if (!segunda) {
        for (let i = 0; i <= (s.ultimo ?? -1); i++) linha(ctx, ex(x[i]), EIXO - 5, ex(x[i]), EIXO + 5, COR.cinza);
        if (s.ultimo !== null && !fim) linha(ctx, ex(x[s.ultimo]), EIXO - 14, ex(x[s.ultimo]), EIXO + 14, COR.mexeu, 3);
        texto(ctx, `menor ${valor(s.menor)}`, ex(s.menor), EIXO + 18, 11, COR.tinta, 600, "center");
        texto(ctx, `maior ${valor(s.maior)}`, ex(s.maior), EIXO + 34, 11, COR.tinta, 600, "center");
        texto(ctx, "1ª passada: acha o menor e o maior", BX0, 66, 11, COR.cinza);
      } else {
        // as classes e as barras: a altura é a contagem; a cor nunca é
        for (let j = 0; j < C; j++) {
          const h = s.cont[j] / topo * (BBASE - BTOPO), vez = !fim && s.t === "conta" && s.j === j;
          ctx.fillStyle = fim ? COR.verde : vez ? COR.mexeu : COR.tinta;
          ctx.fillRect(BX0 + j * cw + 2, BBASE - h, cw - 4, h);
          if (s.cont[j]) texto(ctx, String(s.cont[j]), BX0 + (j + 0.5) * cw, BBASE - h - 16, 11, COR.tinta, 400, "center");
        }
        linha(ctx, BX0, BBASE + 1, BX1, BBASE + 1, COR.palido);
        const passo = C > 12 ? 2 : 1;
        for (let j = 0; j <= C; j += passo) texto(ctx, num(a + j * r.h, casas), BX0 + j * cw, BBASE + 6, 10, COR.cinza, 400, "center");
        if (s.ultimo !== null && !fim) {
          const vx = ex(x[s.ultimo]);
          linha(ctx, vx, EIXO - 14, vx, EIXO + 14, COR.mexeu, 3);
          linha(ctx, vx, EIXO - 14, vx, BBASE + 22, COR.mexeu, 1);
          texto(ctx, valor(x[s.ultimo]), vx, EIXO + 18, 11, COR.tinta, 600, "center");
        }
        texto(ctx, `2ª passada: cada valor cai na sua classe (${C} classes de ${num(r.h, casas)})`, BX0, 66, 11, COR.cinza);
      }

      const px = 650;
      texto(ctx, "leituras", px, 90, 13, COR.cinza);
      texto(ctx, String(s.lidos), px, 106, 40, COR.tinta, 700);
      texto(ctx, "classes", px, 174, 13, COR.cinza);
      texto(ctx, segunda ? String(C) : "—", px, 190, 26, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "memória extra agora", px, 244, 13, COR.cinza);
      texto(ctx, segunda ? `${C} contagens` : "0 valores", px, 260, 20, COR.tinta, 700);
      texto(ctx, `n = ${N} valores`, px, 300, 13, COR.cinza);
      texto(ctx, `Sturges: ⌈log₂ n + 1⌉ = ${Algoritmos.sturges(N)}`, px, 320, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "o valor lido agora"], [COR.verde, "o histograma pronto"]], 488);

      if (fim) legenda(ctx, [[`${N} valores em `, ""], [`${C} classes`, "g"], [`: ${r.ops} leituras`, ""]]);
      else legenda(ctx, [[ideia[segunda ? ideia.length - 1 : 0], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].lidos : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.histograma, accelerando),
      resumo: { leituras: r.ops, classes: C, n: N, pico: r.pico }, contagemEm,
      medidor: () => `${r.ops} leituras, n = ${N}<br>${C} contagens`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} valores, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} leituras, ${C} classes de ${num(r.h, casas)}.`,
    };
  }

  // ---------- dispersão: a tabela do Dicionário (sondagem) numa grade ----------

  // a cópia da tabela que o palco desenha: aplica os eventos do dicionário (simulacao/instrumentos.js)
  function tabelaDic() {
    const q = { m: 8, chaves: new Array(8).fill(null), valores: new Array(8).fill(null), lidas: [], escritas: [], alvo: null, dobrou: null };
    q.aplicar = (evs) => {
      q.lidas = []; q.escritas = []; q.alvo = null; q.dobrou = null;
      for (const ev of evs) {
        if (ev.t === "dispersa") q.alvo = ev.i;
        else if (ev.t === "le") q.lidas.push(ev.i);
        else if (ev.t === "escreve") { (ev.campo === "chave" ? q.chaves : q.valores)[ev.i] = ev.x; q.escritas.push(ev.i); }
        else if (ev.t === "realoca") q.dobrou = [ev.de, ev.para];
        else if (ev.t === "trocou") { q.m = ev.foto.m; q.chaves = ev.foto.chaves.slice(); q.valores = ev.foto.valores.slice(); q.lidas = []; q.escritas = []; q.alvo = null; }
      }
    };
    q.foto = () => ({ m: q.m, chaves: q.chaves.slice(), valores: q.valores.slice(), lidas: q.lidas.slice(), escritas: q.escritas.slice(), alvo: q.alvo, dobrou: q.dobrou });
    return q;
  }

  // a grade de m casas (8 por linha), cada uma com a chave e, se houver, o valor; altura total `alto`
  function grade(ctx, t, x0, y0, larg, alto, rotulo, fim) {
    const col = 8, linhas = Math.ceil(t.m / col), cw = larg / col, ch = Math.min(44, alto / linhas);
    const tam = Math.max(8, Math.min(13, ch * 0.42));
    texto(ctx, `${rotulo}: m = ${t.m} casas`, x0, y0 - 20, 11, COR.cinza);
    for (let i = 0; i < t.m; i++) {
      const x = x0 + (i % col) * cw, y = y0 + Math.floor(i / col) * ch, k = t.chaves[i];
      const escrita = t.escritas.includes(i) && !fim, lida = t.lidas.includes(i) && !fim;
      ctx.fillStyle = escrita ? COR.mexeu : k === null ? COR.claro : "#fff";
      ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      ctx.strokeStyle = lida ? COR.album : COR.borda; ctx.lineWidth = lida ? 2.5 : 1;
      ctx.strokeRect(x + 1, y + 1, cw - 2, ch - 2);
      if (t.alvo === i && !fim) { ctx.fillStyle = COR.tinta; ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 9, y + 1); ctx.lineTo(x + 1, y + 9); ctx.fill(); }
      if (k !== null) {
        const v = t.valores[i], w = String(k), tw = Math.min(tam, (cw - (typeof v === "number" ? 30 : 12)) / (w.length * 0.62));   // a palavra cabe na casa
        texto(ctx, w, x + 6, y + ch / 2 - tw * 0.6, tw, escrita ? "#fff" : COR.tinta, 600);
        if (typeof v === "number") texto(ctx, String(v), x + cw - 6, y + ch / 2 - tam * 0.6, tam, escrita ? "#fff" : COR.cinza, 600, "right");
      }
    }
  }

  function simPalavras(faixa, p, accelerando) {
    const r = Algoritmos.palavras(p), N = p.length, ideia = faixa.video.ideia;
    const t = tabelaDic();
    let gasto = 0, distintas = 0, vez = -1;
    const est = r.eventos.map((e) => {
      if (e.i !== undefined) vez = e.i;                // a palavra da vez fica acesa até a próxima
      t.aplicar(e.dic || []);                         // sem eventos do dicionário, nenhuma casa acesa
      if (e.dic) gasto = e.gasto;
      if (e.t === "poe") distintas++;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i: vez, achou: e.achou, tab: t.foto(), gasto, distintas };
    });
    if (gasto !== r.ops || distintas !== r.d) throw new Error("reprodução da contagem de palavras não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { le: 0.5, busca: 1, conta: 1, poe: 1, atribui: 0.4, devolva: 2 }, (x) => x === "conta" || x === "poe", 6, 2.5);
    const tl = linhaDoTempo(pesos);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { i: -1, tab: tabelaDic().foto(), gasto: 0, distintas: 0 };
      const i = fim ? -1 : s.i;
      // o texto: algumas palavras antes e depois da da vez
      texto(ctx, "texto", 40, 68, 11, COR.cinza);
      ctx.font = `400 15px ${MONO}`;
      const a = Math.max(0, i - 4);
      let x = 40;
      for (let j = a; j < N; j++) {
        const w = ctx.measureText(p[j]).width;
        if (x + w > 640) break;                      // o placar da direita começa em 680
        if (j === i) { ctx.fillStyle = COR.mexeu; ctx.fillRect(x - 4, 84, w + 8, 26); }
        texto(ctx, p[j], x, 88, 15, j === i ? "#fff" : j < i || fim ? COR.cinza : COR.tinta, j === i ? 600 : 400);
        x += w + 14;
      }
      grade(ctx, s.tab, 40, 156, 600, 330, "dicionário (palavra e contagem)", fim);

      const X = 680;
      texto(ctx, "casas lidas e escritas", X, 90, 13, COR.cinza);
      texto(ctx, milhar(fim ? r.ops : s.gasto), X, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "palavras lidas", X, 174, 13, COR.cinza);
      texto(ctx, `${fim ? N : i >= 0 ? i + 1 : 0} de ${N}`, X, 190, 22, COR.tinta, 700);
      texto(ctx, "palavras distintas (d)", X, 236, 13, COR.cinza);
      texto(ctx, String(fim ? r.d : s.distintas), X, 252, 22, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, `α = ${s.distintas}/${s.tab.m} = ${num(s.distintas / s.tab.m, 2)}`, X, 298, 13, COR.cinza);
      if (fim) {
        texto(ctx, "as mais frequentes", X, 332, 13, COR.cinza);
        r.contagens.slice(0, 5).forEach(([w, c], j) => texto(ctx, `${w} ${c}`, X, 350 + j * 20, 14, COR.verde, 600));
      }
      legendaCores(ctx, [[COR.mexeu, "casa escrita"], ["#fff", "casa lida", COR.album, 2.5], [COR.claro, "vazia"], [COR.tinta, "a casa calculada"]], 500);

      if (fim) legenda(ctx, [[`${N} palavras, ${r.d} distintas: `, ""], [`${milhar(r.ops)} casas`, "g"], [` (${num(r.ops / N, 1)} por palavra)`, ""]]);
      else if (s.tab.dobrou) legenda(ctx, [["α ia passar de 3/4: a tabela dobra de ", ""], [`${s.tab.dobrou[0]} para ${s.tab.dobrou[1]}`, "b"], [" casas", ""]]);
      else legenda(ctx, [[ideia[s.distintas < 6 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].gasto : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.palavras, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${milhar(r.ops)} casas, n = ${N} palavras<br>${r.d} distintas (${r.pico} valores)`,
      aoVivo: (u, cfg) => `Tocando agora: ${cfg.rotulo}, ${N} palavras; ${milhar(contagemEm(u))} de ${milhar(r.ops)} casas lidas e escritas, ${r.d} palavras distintas numa tabela de ${r.m} casas.`,
    };
  }

  function simRepetidos(faixa, v, accelerando) {
    const r = Algoritmos.repetidos(v), N = v.length, ideia = faixa.video.ideia;
    const t = tabelaDic();
    let comps = 0, i = -1;
    const est = r.eventos.map((e) => {
      t.aplicar(e.dic || []);
      if (e.dic) comps = e.comps;
      if (e.i !== undefined) i = e.i;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i, achou: e.achou, tab: t.foto(), comps };
    });
    if (comps !== r.ops) throw new Error("reprodução de achar repetidos não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { le: 0.5, busca: 1, achou: 1.2, poe: 1, atribui: 0.4, devolva: 2 }, (x) => x === "busca", 4, 2.5);
    const tl = linhaDoTempo(pesos);
    const cw = Math.min(40, 600 / N), tam = Math.min(15, cw * 0.45);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { i: -1, tab: tabelaDic().foto(), comps: 0 };
      // o vetor; embaixo de cada valor já visto, a resposta
      texto(ctx, "vetor", 40, 62, 11, COR.cinza);
      for (let p = 0; p < N; p++) {
        const x = 40 + p * cw, vez = p === s.i && !fim;
        ctx.fillStyle = vez ? COR.mexeu : "#fff"; ctx.fillRect(x + 1, 80, cw - 2, 34);
        ctx.strokeStyle = vez ? COR.mexeu : COR.borda; ctx.lineWidth = 1; ctx.strokeRect(x + 1, 80, cw - 2, 34);
        texto(ctx, String(v[p]), x + cw / 2, 97 - tam * 0.6, tam, vez ? "#fff" : COR.tinta, 600, "center");
        const visto = fim || p < s.i || (p === s.i && (est[k].t === "achou" || est[k].t === "atribui" || est[k].t === "poe"));
        if (visto) texto(ctx, r.repetido[p] ? "sim" : "não", x + cw / 2, 120, Math.min(11, cw * 0.32), r.repetido[p] ? COR.verde : COR.cinza, r.repetido[p] ? 600 : 400, "center");
      }
      texto(ctx, "repetido?", 40, 140, 11, COR.cinza);
      grade(ctx, s.tab, 40, 200, 600, 280, "dicionário (os valores já vistos)", fim);

      const X = 680, ate = s.i >= 0 ? r.vetorAte[s.i] : 0;
      texto(ctx, "comparações", X, 90, 13, COR.cinza);
      texto(ctx, String(fim ? r.ops : s.comps), X, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "o vetor, até aqui", X, 174, 13, COR.cinza);
      texto(ctx, String(fim ? r.ops_vetor : ate), X, 190, 26, COR.tinta, 700);
      texto(ctx, `de ${r.ops_vetor} no total`, X, 222, 12, COR.cinza);
      texto(ctx, "memória extra agora", X, 256, 13, COR.cinza);
      const n = s.tab.chaves.filter((x) => x !== null).length;
      texto(ctx, `${n} ${n === 1 ? "valor" : "valores"}`, X, 272, 20, COR.tinta, 700);
      texto(ctx, `o vetor não guarda nada`, X, 300, 13, COR.cinza);
      texto(ctx, `${r.repetido.filter(Boolean).length} repetidos`, X, 342, 13, fim ? COR.verde : COR.cinza, fim ? 600 : 400);
      legendaCores(ctx, [[COR.mexeu, "o da vez, ou casa escrita"], ["#fff", "casa lida", COR.album, 2.5], [COR.tinta, "a casa calculada"]], 500);

      if (fim) legenda(ctx, [[`n = ${N}: `, ""], [`${r.ops} comparações`, "g"], [` (o vetor: ${r.ops_vetor})`, ""]]);
      else if (s.tab.dobrou) legenda(ctx, [["α ia passar de 3/4: a tabela dobra de ", ""], [`${s.tab.dobrou[0]} para ${s.tab.dobrou[1]}`, "b"], [" casas", ""]]);
      else legenda(ctx, [[ideia[s.i < N / 2 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.repetidos, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} comparações (vetor: ${r.ops_vetor}), n = ${N}<br>${r.pico} valores no dicionário`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} comparações (o vetor faria ${r.ops_vetor}), ${r.repetido.filter(Boolean).length} repetidos, até ${r.pico} valores no dicionário.`,
    };
  }

  // ---------- colisão: encadeamento e sondagem linear, m fixo ----------

  const FORMULA = { encadeamento: (a) => 1 + a, sondagem: (a) => (a < 1 ? (1 + 1 / (1 - a) ** 2) / 2 : Infinity) };

  function simColisao(faixa, chaves, bits, accelerando) {
    const alg = faixa.alg, enc = alg === "encadeamento";
    const r = Algoritmos[alg](chaves, bits), N = chaves.length, m = r.m, ideia = faixa.video.ideia;
    const casas = new Array(m).fill(null), correntes = Array.from({ length: m }, () => []);
    // k: a chave da vez; h: a casa calculada; atual: a casa olhada (na sondagem); no: o nó olhado na corrente de h
    let k = null, h = null, atual = null, no = 0, s = 0, total = 0, feitas = 0, olhadas = [], posta = false;
    const pontos = [];                                  // [α antes de pôr, sondagens] de cada chave já posta
    const est = r.eventos.map((e) => {
      if (e.t === "dispersa") { k = e.k; h = e.i; atual = null; no = 0; s = 0; olhadas = []; posta = false; }
      else if (e.t === "inicio" || e.t === "sonda") { s++; total++; atual = e.i; olhadas.push(e.i); }
      else if (e.t === "avanca") { if (enc) { s++; total++; no++; } else atual = e.i; }
      else if (e.t === "poe" && !enc) { casas[e.i] = e.k; posta = true; }
      else if (e.t === "liga") { correntes[e.i].unshift(e.k); posta = true; }
      else if (e.t === "devolva") { pontos.push([feitas / m, s]); feitas++; }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, k, h, atual, no, s, total, feitas, olhadas: olhadas.slice(), posta,
        casas: casas.slice(), correntes: correntes.map((c) => c.slice()), npontos: pontos.length };
    });
    if (total !== r.ops) throw new Error("reprodução da colisão não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { dispersa: 0.6, inicio: 1, sonda: 1, compara: 0.5, avanca: 0.6, testa: 0.3, poe: 1, liga: 0.6, pare: 0.3, devolva: 0.8 },
        (x) => x === "devolva", 3, 2.5);
    const tl = linhaDoTempo(pesos);
    const amax = Math.max(enc ? 1 : 0.5, N / m), smax = Math.max(4, ...r.sondagens);
    const vazio = { t: null, k: null, h: null, atual: null, no: 0, s: 0, total: 0, feitas: 0, olhadas: [], posta: false,
      casas: new Array(m).fill(null), correntes: correntes.map(() => []), npontos: 0 };

    function desenhar(ctx, u) {
      const q = tl.eventoEm(u), fim = u >= tl.total, e = q >= 0 ? est[q] : vazio;
      // as chaves, na ordem em que entram; a da vez em destaque
      const kw = Math.min(46, 600 / Math.max(1, N));
      texto(ctx, "chaves", 40, 58, 11, COR.cinza);
      chaves.forEach((c, j) => {
        const vez = !fim && e.k !== null && j === e.feitas;
        texto(ctx, String(c), 40 + j * kw + kw / 2, 76, Math.min(13, kw * 0.36), vez ? COR.mexeu : j < e.feitas || fim ? COR.cinza : COR.tinta, vez ? 700 : 400, "center");
      });
      // a tabela: m casas numa fileira
      const X0 = 40, cw = 600 / m, Y = 150, ch = enc ? 24 : 34;
      texto(ctx, `tabela de m = ${m} casas fixas`, X0, Y - 40, 11, COR.cinza);
      for (let i = 0; i < m; i++) {
        const x = X0 + i * cw, chave = enc ? null : e.casas[i];
        const nova = !fim && e.posta && !enc && chave === e.k;
        const olhando = !fim && (enc ? e.t === "inicio" && e.h === i : e.atual === i && ["sonda", "compara", "avanca"].includes(e.t));
        ctx.fillStyle = nova ? COR.mexeu : (enc ? e.correntes[i].length : chave !== null) ? "#fff" : COR.claro;
        ctx.fillRect(x + 1, Y, cw - 2, ch);
        ctx.strokeStyle = olhando ? COR.album : COR.borda; ctx.lineWidth = olhando ? 2.5 : 1;
        ctx.strokeRect(x + 1, Y, cw - 2, ch);
        if (enc) texto(ctx, e.correntes[i].length ? "•" : "∅", x + cw / 2, Y + 5, 13, COR.tinta, 600, "center");
        else if (chave !== null) texto(ctx, String(chave), x + cw / 2, Y + 10, Math.min(13, cw * 0.36), nova ? "#fff" : COR.tinta, 600, "center");
        texto(ctx, String(i + 1), x + cw / 2, Y - 14, 9, COR.cinza, 400, "center");
        if (e.h === i && !fim) { ctx.fillStyle = COR.tinta; ctx.beginPath(); ctx.moveTo(x + cw / 2 - 5, Y - 24); ctx.lineTo(x + cw / 2 + 5, Y - 24); ctx.lineTo(x + cw / 2, Y - 17); ctx.fill(); }
        // na sondagem, um ponto embaixo de cada casa que a chave da vez já olhou
        if (!enc && !fim && e.olhadas.includes(i)) { ctx.fillStyle = COR.album; ctx.beginPath(); ctx.arc(x + cw / 2, Y + ch + 8, 3, 0, 2 * Math.PI); ctx.fill(); }
      }
      if (enc) {   // as correntes penduradas em cada casa; a mais nova em cima
        const maior = Math.max(1, ...e.correntes.map((c) => c.length)), nh = Math.min(28, 300 / maior), bh = Math.max(4, nh - 5);
        e.correntes.forEach((c, i) => {
          const x = X0 + i * cw;
          c.forEach((chave, j) => {
            const y = Y + ch + 6 + j * nh;
            const nova = !fim && e.posta && i === e.h && j === 0;
            const olhado = !fim && i === e.h && j === e.no && !e.posta && (e.t === "compara" || e.t === "avanca" || e.t === "testa");
            linha(ctx, x + cw / 2, y - (nh - bh), x + cw / 2, y, COR.borda, 1);
            ctx.fillStyle = nova ? COR.mexeu : "#fff"; ctx.fillRect(x + 2, y, cw - 4, bh);
            ctx.strokeStyle = olhado ? COR.album : COR.tinta; ctx.lineWidth = olhado ? 2.5 : 1; ctx.strokeRect(x + 2, y, cw - 4, bh);
            if (bh >= 12) texto(ctx, String(chave), x + cw / 2, y + bh / 2 - 6, Math.min(12, cw * 0.34), nova ? "#fff" : COR.tinta, 600, "center");
          });
        });
      }

      const X = 680, n = fim ? N : e.feitas;
      texto(ctx, "ocupação", X, 70, 13, COR.cinza);
      texto(ctx, `α = ${n}/${m} = ${num(n / m, 2)}`, X, 86, 20, COR.tinta, 700);
      texto(ctx, "sondagens desta chave", X, 124, 13, COR.cinza);
      texto(ctx, fim || e.k === null ? "—" : String(e.s), X, 140, 22, COR.tinta, 700);
      texto(ctx, "sondagens no total", X, 178, 13, COR.cinza);
      texto(ctx, String(fim ? r.ops : e.total), X, 194, 30, fim ? COR.verde : COR.tinta, 700);
      // o gráfico pequeno: um ponto por chave posta, sobre a curva da fórmula
      const gx = X + 16, gy = 270, gw = 230, gh = 160;
      const PX = (a) => gx + a / amax * gw, PY = (v) => gy + gh - Math.min(v, smax) / smax * gh;
      texto(ctx, "sondagens de cada chave × α", X, gy - 26, 11, COR.cinza);
      linha(ctx, gx, gy + gh, gx + gw, gy + gh, COR.borda); linha(ctx, gx, gy, gx, gy + gh, COR.borda);
      texto(ctx, "0", gx, gy + gh + 4, 10, COR.cinza); texto(ctx, num(amax, 2), gx + gw, gy + gh + 4, 10, COR.cinza, 400, "right");
      texto(ctx, String(smax), gx - 4, gy - 5, 10, COR.cinza, 400, "right"); texto(ctx, "1", gx - 4, PY(1) - 5, 10, COR.cinza, 400, "right");
      ctx.strokeStyle = COR.cinza; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let j = 0; j <= 80; j++) {
        const a = amax * j / 80, f = FORMULA[alg](a);
        if (!isFinite(f) || f > smax) break;
        if (j) ctx.lineTo(PX(a), PY(f)); else ctx.moveTo(PX(a), PY(f));
      }
      ctx.stroke(); ctx.setLineDash([]);
      const np = fim ? pontos.length : e.npontos;
      for (let j = 0; j < np; j++) {
        const [a, v] = pontos[j];
        ctx.fillStyle = j === np - 1 && !fim ? COR.mexeu : COR.tinta;
        ctx.beginPath(); ctx.arc(PX(a), PY(v), 3.5, 0, 2 * Math.PI); ctx.fill();
      }
      texto(ctx, enc ? "tracejada: 1 + α" : "tracejada: ½(1 + 1/(1 − α)²)", X, gy + gh + 22, 11, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "a chave da vez, posta"], ["#fff", "olhada agora", COR.album, 2.5], [COR.claro, enc ? "corrente vazia" : "casa vazia"], [COR.tinta, "a casa calculada"]], 500);

      if (fim) legenda(ctx, [[`${N} chaves em ${m} casas: `, ""], [`${r.ops} sondagens`, "g"], [` (${num(r.ops / Math.max(1, N), 2)} por chave)`, ""]]);
      else legenda(ctx, [[ideia[n / m < (enc ? 1 : 0.6) ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const q = tl.eventoEm(u); return q >= 0 ? est[q].total : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.colisao, accelerando),
      resumo: { ops: r.ops, pico: r.pico, n: N }, contagemEm,
      medidor: () => `${r.ops} sondagens, ${N} chaves em ${m} casas<br>α = ${num(N / m, 2)}, ${r.pico} casas`,
      aoVivo: (u, cfg) => `Tocando agora: ${N} chaves em ${m} casas (α = ${num(N / m, 2)}), ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} sondagens, ${num(r.ops / Math.max(1, N), 2)} por chave.`,
    };
  }

  // ---------- fachada ----------

  /** Cria a simulação de uma faixa para uma configuração de entrada; `accelerando` liga o ritmo que acelera. */
  // ---------- primeiros passos ----------

  function simMaximo(faixa, v, accelerando) {
    const r = Algoritmos.maximo(v), N = v.length, ideia = faixa.video.ideia;
    let comps = 0, trocas = 0, m = 0, olhou = 0;
    const est = r.eventos.map((e) => {
      let foco = null;
      if (e.t === "compara") { comps++; foco = e.i; olhou = e.i + 1; }
      else if (e.t === "troca") { trocas++; m = e.i; foco = e.i; }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, foco, comps, trocas, m, olhou };
    });
    if (comps !== r.ops || trocas !== r.trocas) throw new Error("reprodução do máximo não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { le: 0.4, compara: 1, troca: 1.5, atribui: 0.6, devolva: 3 }, (t) => t === "compara", 4, 2.5);
    const tl = linhaDoTempo(pesos);
    const BX0 = 70, BX1 = 600, BTOPO = 96, BBASE = 410;
    const bw = (BX1 - BX0) / N, bx = (i) => BX0 + i * bw, alt = (x) => x / 100 * (BBASE - BTOPO);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { foco: null, comps: 0, trocas: 0, m: 0, olhou: 1 };
      const agora = !fim && k >= 0 && (est[k].t === "compara" || est[k].t === "troca") ? s.foco : null;
      linha(ctx, BX0, BBASE + 1, BX1, BBASE + 1, COR.palido);
      v.forEach((x, i) => {
        let cor = i < s.olhou ? COR.apagado : COR.tinta;
        if (i === s.m) cor = fim ? COR.verde : COR.album;
        if (i === agora && !(fim)) cor = est[k].t === "troca" ? COR.album : COR.mexeu;
        ctx.fillStyle = cor;
        ctx.fillRect(bx(i) + bw * 0.12, BBASE - alt(x), bw * 0.76, alt(x));
      });
      // o maior até aqui: uma linha na altura dele, que só sobe
      const ym = BBASE - alt(v[s.m]);
      ctx.setLineDash([5, 4]); linha(ctx, BX0, ym, BX1, ym, fim ? COR.verde : COR.album, 1.2); ctx.setLineDash([]);
      texto(ctx, "maior", BX0 - 6, ym - 7, 11, fim ? COR.verde : COR.album, 600, "right");
      if (agora !== null) seta(ctx, bx(agora) + bw / 2, BBASE + 5);

      const x = 650;
      texto(ctx, "comparações", x, 90, 13, COR.cinza);
      texto(ctx, String(s.comps), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "trocas do maior", x, 174, 13, COR.cinza);
      texto(ctx, String(s.trocas), x, 190, 26, COR.tinta, 700);
      texto(ctx, "maior até aqui", x, 244, 13, COR.cinza);
      texto(ctx, String(v[s.m]), x, 260, 26, fim ? COR.verde : COR.album, 700);
      texto(ctx, "memória extra: 0 valores", x, 316, 13, COR.cinza);
      texto(ctx, `n = ${N} números`, x, 338, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "comparando agora"], [COR.album, "o maior até aqui"], [COR.apagado, "já olhado"], [COR.tinta, "falta olhar"], [COR.verde, "o máximo"]], 470);

      if (fim) legenda(ctx, [["o máximo é ", ""], [String(r.maximo), "b"], [": ", ""], [`${r.ops} comparações`, "g"], [`, ${r.trocas} ${r.trocas === 1 ? "troca" : "trocas"} do maior`, ""]]);
      else legenda(ctx, [[ideia[s.comps < N / 2 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.busca, accelerando),
      resumo: { ops: r.ops, n: N, pico: 0 }, contagemEm,
      medidor: () => `${r.ops} comparações, n = ${N}<br>${r.trocas} trocas do maior, sem memória extra`,
      aoVivo: (u, cfg) => `Tocando agora: n = ${N}, ${cfg.rotulo}; ${contagemEm(u)} de ${r.ops} comparações, o máximo é ${r.maximo}, com ${r.trocas} ${r.trocas === 1 ? "troca" : "trocas"} do maior, sem memória extra.`,
    };
  }

  function simMatrizes(faixa, a, b, accelerando) {
    const r = Algoritmos.multiplicacao(a, b), N = a.length, ideia = faixa.video.ideia;
    const C = Array.from({ length: N }, () => new Array(N).fill(null));
    let mults = 0, i = null, j = null, kk = null, termos = [], escritas = 0;
    const est = r.eventos.map((e) => {
      if (e.t === "atribui" && e.i !== undefined) { i = e.i; j = e.j; kk = null; termos = []; }
      else if (e.t === "multiplica") { mults++; kk = e.k; termos = termos.concat([[e.x, e.y]]); }
      else if (e.t === "escreve") { C[e.i][e.j] = e.x; escritas++; kk = null; }
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i, j, k: kk, termos, mults, escritas, C: C.map((l) => l.slice()) };
    });
    if (mults !== r.ops) throw new Error("reprodução da multiplicação não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { multiplica: 1, escreve: 1.5, atribui: 0.4, devolva: 3 }, (t) => t === "multiplica", 2 * N, 2.5);
    const tl = linhaDoTempo(pesos);
    const cs = Math.min(42, 560 / (3 * N + 2)), GY = 110, gx = [40, 40 + (N + 1) * cs, 40 + 2 * (N + 1) * cs];

    function grade_(ctx, M, x0, nome, cor) {
      texto(ctx, nome, x0 + N * cs / 2, GY - 24, 13, COR.cinza, 600, "center");
      for (let p = 0; p < N; p++) for (let q = 0; q < N; q++) {
        const x = x0 + q * cs, y = GY + p * cs, c = cor(p, q);
        ctx.fillStyle = c.fundo || "#fff"; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        ctx.strokeStyle = c.borda || COR.borda; ctx.lineWidth = c.borda ? 2 : 1; ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
        const val = M[p][q];
        if (val !== null) texto(ctx, String(val), x + cs / 2, y + cs / 2 - Math.min(14, cs * 0.4) * 0.6, Math.min(14, cs * 0.4), c.letra || COR.tinta, 600, "center");
      }
    }

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { i: null, j: null, k: null, termos: [], mults: 0, escritas: 0, C: C.map((l) => l.map(() => null)) };
      const vivo = !fim && s.i !== null;
      grade_(ctx, a, gx[0], "A", (p, q) => (vivo && p === s.i ? (q === s.k ? { fundo: COR.mexeu, letra: "#fff", borda: COR.mexeu } : { borda: COR.album }) : {}));
      grade_(ctx, b, gx[1], "B", (p, q) => (vivo && q === s.j ? (p === s.k ? { fundo: COR.mexeu, letra: "#fff", borda: COR.mexeu } : { borda: COR.album }) : {}));
      grade_(ctx, s.C, gx[2], "C", (p, q) => (fim ? { letra: COR.verde } : vivo && p === s.i && q === s.j ? { borda: COR.tinta, fundo: COR.claro } : {}));
      const ym = GY + N * cs / 2 - 12;
      texto(ctx, "·", gx[1] - cs / 2, ym, 22, COR.tinta, 700, "center");
      texto(ctx, "=", gx[2] - cs / 2, ym, 22, COR.tinta, 700, "center");
      // B na memória: a coluna j pula de N em N casas
      const ys = GY + N * cs + 34, sw = Math.min(26, 580 / (N * N));
      texto(ctx, `B na memória, linha a linha: a coluna ${vivo ? s.j + 1 : "j"} pula de ${N} em ${N} casas`, 40, ys - 18, 11, COR.cinza);
      for (let t = 0; t < N * N; t++) {
        const p = Math.floor(t / N), q = t % N, x = 40 + t * sw;
        const naColuna = vivo && q === s.j, agora = naColuna && p === s.k;
        ctx.fillStyle = agora ? COR.mexeu : "#fff"; ctx.fillRect(x + 1, ys, sw - 2, 22);
        ctx.strokeStyle = naColuna ? COR.album : COR.borda; ctx.lineWidth = naColuna ? 2 : 1; ctx.strokeRect(x + 1, ys, sw - 2, 22);
        if (sw >= 14) texto(ctx, String(b[p][q]), x + sw / 2, ys + 5, Math.min(12, sw * 0.5), agora ? "#fff" : COR.tinta, 400, "center");
      }
      // a conta da casa da vez
      if (vivo && s.termos.length) {
        const conta = s.termos.map(([x, y]) => `${x}·${y}`).join(" + ");
        const tot = s.termos.reduce((t, [x, y]) => t + x * y, 0);
        const txt = `C[${s.i + 1}][${s.j + 1}] = ${conta}${s.termos.length === N ? ` = ${tot}` : " + …"}`;
        texto(ctx, txt, 40, ys + 44, Math.min(15, 1100 / txt.length), COR.tinta, 600);
      }

      const x = 680;
      texto(ctx, "multiplicações", x, 90, 13, COR.cinza);
      texto(ctx, milhar(s.mults), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "casas de C prontas", x, 174, 13, COR.cinza);
      texto(ctx, `${s.escritas} de ${N * N}`, x, 190, 22, COR.tinta, 700);
      texto(ctx, "a resposta C (não é memória extra)", x, 236, 13, COR.cinza);
      texto(ctx, `${N}² = ${N * N} casas`, x, 252, 20, COR.tinta, 700);
      texto(ctx, `n = ${N}: n³ = ${N ** 3}`, x, 296, 13, COR.cinza);
      legendaCores(ctx, [[COR.mexeu, "o par multiplicado agora"], ["#fff", "a linha de A e a coluna de B", COR.album, 2], [COR.claro, "a casa de C da vez", COR.tinta, 2]], 488);

      if (fim) legenda(ctx, [[`${N} × ${N}: `, ""], [`${milhar(r.ops)} multiplicações`, "g"], [` = ${N}³`, ""]]);
      else legenda(ctx, [[ideia[s.escritas < 2 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].mults : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.matrizes, accelerando),
      resumo: { ops: r.ops, n: N, pico: r.pico }, contagemEm,
      medidor: () => `${milhar(r.ops)} multiplicações, n = ${N}<br>sem memória extra: C é a resposta`,
      aoVivo: (u, cfg) => `Tocando agora: matrizes ${N} × ${N}, ${cfg.rotulo}; ${milhar(contagemEm(u))} de ${milhar(r.ops)} multiplicações, sem memória extra (C, com ${N * N} casas, é a resposta).`,
    };
  }

  // a pilha de chamadas de uma faixa recursiva (o fatorial): cada quadro com o seu n e, depois que a de baixo volta, a conta
  function simFatorial(faixa, n, accelerando) {
    const r = Algoritmos.fatorial(n), ideia = faixa.video.ideia;
    const pilha = [];   // do fundo para o topo: { k, volta, conta }
    let mults = 0, pico = 0, voltou = null;
    const est = r.eventos.map((e) => {
      voltou = null;
      if (e.t === "entra") pilha.push({ k: e.a, volta: null, conta: null });
      else if (e.t === "atribui") pilha.at(-1).volta = "1";
      else if (e.t === "multiplica") { mults++; pilha.at(-1).volta = e.r; }
      else if (e.t === "sai") { const q = pilha.pop(); voltou = q.volta; if (pilha.length) pilha.at(-1).sub = q.volta; }
      pico = Math.max(pico, pilha.length);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: e.nivel, chamada: e.chamada, pilha: pilha.map((q) => ({ ...q })), mults, pico, voltou };
    });
    if (mults !== r.ops || pico !== r.pico) throw new Error("reprodução do fatorial não bate");
    const pesos = !accelerando ? est.map(() => 1) : pesosLentos(est, { entra: 1.2, testa: 0.5, atribui: 1, multiplica: 1.5, sai: 1 }, (t) => t === "entra", 3, 2);
    const tl = linhaDoTempo(pesos);
    const X0 = 70, X1 = 600, BASE = 450, TOPO = 80, hq = Math.min(40, (BASE - TOPO) / Math.max(n, 1));

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { pilha: [], mults: 0, pico: 0 };
      texto(ctx, "a pilha de chamadas (o fundo embaixo)", X0, TOPO - 26, 11, COR.cinza);
      linha(ctx, X0 - 4, BASE + 2, X1 + 4, BASE + 2, COR.tinta, 2);
      const tam = Math.max(9, Math.min(15, hq * 0.5));
      s.pilha.forEach((q, p) => {
        const y = BASE - (p + 1) * hq, topo = p === s.pilha.length - 1;
        ctx.fillStyle = topo && !fim ? COR.claro : "#fff"; ctx.fillRect(X0, y + 1, X1 - X0, hq - 2);
        ctx.strokeStyle = topo && !fim ? COR.tinta : COR.borda; ctx.lineWidth = topo ? 2 : 1; ctx.strokeRect(X0, y + 1, X1 - X0, hq - 2);
        texto(ctx, `fatorial(${q.k})`, X0 + 10, y + hq / 2 - tam * 0.6, tam, COR.tinta, 600);
        const conta = q.volta !== null ? (q.k <= 1 ? "= 1" : `= ${q.k} · ${q.sub} = ${q.volta}`) : q.sub !== undefined ? `= ${q.k} · ${q.sub}` : `espera fatorial(${q.k - 1})`;
        texto(ctx, conta, X0 + 140, y + hq / 2 - tam * 0.6, tam, q.volta !== null ? COR.tinta : COR.cinza, q.volta !== null ? 600 : 400);
      });
      if (fim) texto(ctx, `${n}! = ${r.fatorial}`, X0, BASE - 40, 22, COR.verde, 700);

      const x = 650;
      texto(ctx, "multiplicações", x, 90, 13, COR.cinza);
      texto(ctx, String(s.mults), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "níveis na pilha", x, 174, 13, COR.cinza);
      texto(ctx, `${s.pilha.length} (pico ${s.pico})`, x, 190, 22, COR.tinta, 700);
      if (s.voltou !== null && s.voltou !== undefined && !fim) {
        texto(ctx, "voltou", x, 236, 13, COR.cinza);
        texto(ctx, s.voltou, x, 252, Math.min(20, 520 / s.voltou.length), COR.tinta, 700);
      }
      texto(ctx, `n = ${n}`, x, 300, 13, COR.cinza);
      legendaCores(ctx, [[COR.claro, "a chamada da vez (o topo)", COR.tinta, 2], ["#fff", "esperando a de cima voltar"]], 488);

      if (fim) legenda(ctx, [[`${n}! = `, ""], [r.fatorial, "g"], [`: ${r.ops} multiplicações, pilha de ${r.pico} níveis`, ""]], 26, r.fatorial.length > 12 ? 16 : 18);
      else legenda(ctx, [[ideia[s.mults === 0 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].mults : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.fatorial, accelerando),
      resumo: { ops: r.ops, n, pico: r.pico }, contagemEm,
      medidor: () => `${r.ops} multiplicações, n = ${n}<br>pilha de ${r.pico} níveis`,
      aoVivo: (u) => `Tocando agora: ${n}!; ${contagemEm(u)} de ${r.ops} multiplicações, pilha de até ${r.pico} níveis, resultado ${r.fatorial}.`,
    };
  }

  // os três Fibonacci: a árvore de chamadas (recursivo e com memória) ou o par (a, b) andando pela sequência (iterativo)
  function simFibonacci(faixa, n, accelerando) {
    const versao = faixa.medido.tempo.tipo.replace("fib_", "");
    const f = { recursivo: Algoritmos.fibRecursivo, memoria: Algoritmos.fibMemoria, iterativo: Algoritmos.fibIterativo }[versao];
    const r = f(n), ideia = faixa.video.ideia, arvore = versao !== "iterativo";
    const longe = faixa.medido.tempo.crescimento.at(-1);
    // a árvore inteira, das chamadas: x pela ordem das folhas, y pela profundidade
    const nos = [], abertos = [];
    r.eventos.forEach((e, t) => {
      if (e.t === "entra") { const no = { k: e.a, pai: abertos.at(-1) ?? null, filhos: [], ini: t, fim: Infinity, lembrou: false, prof: abertos.length }; if (no.pai !== null) nos[no.pai].filhos.push(nos.length); abertos.push(nos.length); nos.push(no); }
      else if (e.t === "sai") nos[abertos.pop()].fim = t;
      else if (e.t === "lembra") nos[abertos.at(-1)].lembrou = true;
    });
    let folhas = 0;
    const posX = (id) => { const no = nos[id]; if (!no.filhos.length) { no.x = folhas++; return no.x; } const xs = no.filhos.map(posX); no.x = (xs[0] + xs.at(-1)) / 2; return no.x; };
    if (nos.length) posX(0);
    const prof = Math.max(1, ...nos.map((q) => q.prof));
    // o memo: o vetor de n + 1 casas depois de cada evento (a casa k guarda fib(k)), e a casa olhada agora
    const memo = new Array(n + 1).fill(null);
    let somas = 0, casas = 0, chamadas = 0, pilha = 0, pico = 0, a = 0, b = 1, i = 0;
    const seq = [0];
    const est = r.eventos.map((e, t) => {
      if (versao === "memoria") { if (e.t === "guarda") memo[e.k] = e.r; if (e.gasto !== undefined) casas = e.gasto; }
      if (e.t === "entra") { chamadas++; pilha++; }
      else if (e.t === "sai") pilha--;
      else if (e.t === "soma") { somas++; if (!arvore) { a = e.a; b = e.b; i = e.i + 1; seq.push(e.a); } }
      pico = Math.max(pico, pilha);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: e.nivel, chamada: e.chamada, somas, casas, chamadas, pilha, pico, a, b, i, nSeq: seq.length,
        memo: versao === "memoria" ? memo.slice() : null, olha: e.t === "busca" || e.t === "lembra" || e.t === "guarda" ? e.k : null };
    });
    if (somas !== r.ops || (arvore && chamadas !== r.chamadas) || casas !== r.casas) throw new Error("reprodução do Fibonacci não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { entra: 1, testa: 0.3, atribui: 0.6, busca: 0.8, lembra: 1.2, soma: 1, guarda: 1, sai: 0.4, le: 0.5, devolva: 3 }, (x) => x === "entra" || x === "soma", 6, 2.5);
    const tl = linhaDoTempo(pesos);
    const AX0 = 50, AX1 = 620, AY0 = 92, AY1 = versao === "memoria" ? 300 : 440;
    const dx = (AX1 - AX0) / Math.max(1, folhas), dy = (AY1 - AY0) / prof;
    const R = Math.max(1.2, Math.min(14, dx * 0.38, dy * 0.32));
    const px = (q) => AX0 + (q.x + 0.5) * dx, py = (q) => AY0 + q.prof * dy;

    function desenharArvore(ctx, k, fim) {
      const agora = !fim && k >= 0 ? est[k].chamada - 1 : -1;   // a chamada da vez (os ids começam em 1)
      ctx.lineWidth = R > 4 ? 1.2 : 0.6; ctx.strokeStyle = COR.palido; ctx.beginPath();
      for (const q of nos) if (q.pai !== null && q.ini <= k) { const p = nos[q.pai]; ctx.moveTo(px(p), py(p)); ctx.lineTo(px(q), py(q)); }
      ctx.stroke();
      nos.forEach((q, id) => {
        if (q.ini > k) return;
        const aberto = q.fim > k;
        const cor = fim && id === 0 ? COR.verde : id === agora ? COR.mexeu : q.lembrou && !aberto ? COR.album : aberto ? COR.tinta : COR.apagado;
        ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(px(q), py(q), R, 0, 7); ctx.fill();
        if (R >= 9) texto(ctx, String(q.k), px(q), py(q) - R * 0.62, R * 1.05, "#fff", 600, "center");
      });
    }

    function desenharSequencia(ctx, s, fim) {
      const col = 8, bw = 70, bh = 34, X0 = 50, Y0 = 96;
      texto(ctx, "a sequência, de fib(0) em diante; só a e b ficam guardados", X0, Y0 - 26, 11, COR.cinza);
      for (let p = 0; p < s.nSeq + 1 && p <= n + 1; p++) {
        const x = X0 + (p % col) * (bw + 4), y = Y0 + Math.floor(p / col) * (bh + 22);
        const ehA = p === s.i, ehB = p === s.i + 1;
        const val = p < s.nSeq ? fibs[p] : ehB ? s.b : null;
        if (val === null) continue;
        const cor = fim ? (p === n ? COR.verde : null) : ehA || ehB ? COR.mexeu : null;
        const passou = !fim && p < s.i;   // o que ficou para trás já não está guardado: só a e b
        ctx.fillStyle = cor || "#fff"; ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = cor || (passou ? COR.claro : COR.borda); ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh);
        texto(ctx, milhar(val), x + bw / 2, y + 10, Math.min(14, 120 / String(val).length + 4), cor ? "#fff" : passou ? COR.palido : COR.tinta, 600, "center");
        const marca = !fim && (ehA || ehB);
        texto(ctx, marca ? `${ehA ? "a" : "b"} = fib(${p})` : `fib(${p})`, x + bw / 2, y + bh + 4, 10, marca ? COR.tinta : COR.cinza, marca ? 600 : 400, "center");
      }
    }
    // o memo: uma fileira de casas, a k-ésima com fib(k); a casa olhada acende (azul: achou; vermelho: guardou)
    function desenharMemo(ctx, s, fim) {
      const col = Math.min(n + 1, 21), bw = Math.min(40, Math.floor(570 / col) - 3), bh = 30, X0 = AX0, Y0 = 372;
      texto(ctx, "o memo: a casa k guarda fib(k)", X0, Y0 - 24, 11, COR.cinza);
      for (let p = 0; p <= n; p++) {
        const x = X0 + (p % col) * (bw + 3), y = Y0 + Math.floor(p / col) * (bh + 20);
        const val = s.memo[p], agora = !fim && s.olha === p;
        const cor = agora ? (s.t === "guarda" ? COR.mexeu : COR.album) : null;
        ctx.fillStyle = cor || (val === null ? COR.claro : "#fff"); ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = cor || COR.borda; ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh);
        if (val !== null) texto(ctx, milhar(val), x + bw / 2, y + 9, Math.min(12, (bw - 4) / (0.62 * String(milhar(val)).length)), cor ? "#fff" : COR.tinta, 600, "center");
        texto(ctx, String(p), x + bw / 2, y + bh + 3, 10, agora ? COR.tinta : COR.cinza, agora ? 600 : 400, "center");
      }
    }
    const fibs = [0, 1];
    for (let p = 2; p <= n + 1; p++) fibs.push(fibs[p - 1] + fibs[p - 2]);

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { somas: 0, casas: 0, chamadas: 0, pilha: 0, pico: 0, a: 0, b: 1, i: 0, nSeq: 1, memo: new Array(n + 1).fill(null), olha: null };
      if (arvore) {
        texto(ctx, versao === "memoria" ? "a árvore de chamadas (azul: a resposta já estava guardada)" : `a árvore de chamadas: ${milhar(r.chamadas)} no total`, AX0, AY0 - 34, 11, COR.cinza);
        desenharArvore(ctx, fim ? Infinity : k, fim);
        if (versao === "memoria") desenharMemo(ctx, s, fim);
      } else desenharSequencia(ctx, s, fim);

      const x = 680;
      texto(ctx, "somas", x, 90, 13, COR.cinza);
      texto(ctx, milhar(s.somas), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      if (arvore) {
        texto(ctx, "chamadas", x, 174, 13, COR.cinza);
        texto(ctx, milhar(s.chamadas), x, 190, 22, COR.tinta, 700);
        texto(ctx, "níveis na pilha", x, 236, 13, COR.cinza);
        texto(ctx, `${s.pilha} (pico ${s.pico})`, x, 252, 22, COR.tinta, 700);
        if (versao === "memoria") {
          texto(ctx, "casas lidas e escritas no memo", x, 298, 13, COR.cinza);
          texto(ctx, milhar(s.casas), x, 314, 22, COR.tinta, 700);
        } else {
          texto(ctx, `com n = ${longe.n}, seriam`, x, 298, 13, COR.cinza);
          texto(ctx, `${milhar(longe.recursivo.ops)} somas`, x, 314, 20, COR.tinta, 700);
        }
      } else {
        texto(ctx, "a e b", x, 174, 13, COR.cinza);
        const ab = `${milhar(s.a)} e ${milhar(s.b)}`;
        texto(ctx, ab, x, 190, Math.min(22, 270 / (0.6 * ab.length)), COR.tinta, 700);
        texto(ctx, "memória extra: O(1), duas variáveis", x, 236, 13, COR.cinza);
      }
      if (fim) texto(ctx, `fib(${n}) = ${milhar(r.fib)}`, x, versao === "memoria" ? 376 : 370, 20, COR.verde, 700);
      legendaCores(ctx, arvore
        ? [[COR.mexeu, "a chamada da vez"], [COR.tinta, "na pilha"], [COR.apagado, "já voltou"], ...(versao === "memoria" ? [[COR.album, "achou no memo"]] : [])]
        : [[COR.mexeu, "a e b"], [COR.verde, "fib(n)"]], 500);

      if (fim) legenda(ctx, [[`fib(${n}) = ${milhar(r.fib)}: `, ""], [`${milhar(r.ops)} somas`, "g"], [arvore ? `, ${milhar(r.chamadas)} chamadas` : ", duas variáveis", ""]]);
      else legenda(ctx, [[ideia[s.somas < 3 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].somas : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.fibonacci, accelerando),
      resumo: { ops: r.ops, n, pico: r.pico }, contagemEm,
      medidor: () => `${milhar(r.ops)} somas, n = ${n}<br>${arvore ? `${milhar(r.chamadas)} chamadas, pilha de ${r.pico}` : "duas variáveis"}`,
      aoVivo: (u) => `Tocando agora: fib(${n}); ${milhar(contagemEm(u))} de ${milhar(r.ops)} somas${arvore ? `, ${milhar(r.chamadas)} chamadas, pilha de até ${r.pico} níveis` : ", sem memória extra além de duas variáveis"}, resultado ${milhar(r.fib)}.`,
    };
  }

  function simPadrao(faixa, t, p, accelerando) {
    const r = Algoritmos.padrao(t, p), N = t.length, M = p.length, ideia = faixa.video.ideia;
    let comps = 0, i = 0, j = null, ok = null, achou = [];
    const est = r.eventos.map((e) => {
      if (e.t === "encosta") { i = e.i; j = null; ok = null; }
      else if (e.t === "compara") { comps++; j = e.j; ok = e.ok; }
      else if (e.t === "achou") achou = achou.concat([e.i]);
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, i, j, ok, comps, achou };
    });
    if (comps !== r.ops) throw new Error("reprodução da busca de padrão não bate");
    const pesos = !accelerando ? est.map(() => 1)
      : pesosLentos(est, { encosta: 0.6, atribui: 0.3, compara: 1, testa: 0.3, achou: 3, devolva: 3 }, (x) => x === "compara", 8, 2.5);
    const tl = linhaDoTempo(pesos);
    const letra = (c) => (c === " " ? "·" : c);
    const COL = 40, cw = 14.5, ch = 20, X0 = 40, Y0 = 90;

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const s = k >= 0 ? est[k] : { i: 0, j: null, ok: null, comps: 0, achou: [] };
      // o texto inteiro, pequeno: a janela do padrão acesa e as posições achadas sublinhadas
      texto(ctx, `o texto: n = ${N} letras`, X0, Y0 - 22, 11, COR.cinza);
      const achadas = new Set(s.achou.flatMap((q) => Array.from({ length: M }, (_, d) => q + d)));
      for (let q = 0; q < N; q++) {
        const x = X0 + (q % COL) * cw, y = Y0 + Math.floor(q / COL) * (ch + 6);
        const naJanela = !fim && q >= s.i && q < s.i + M;
        if (naJanela) { ctx.fillStyle = COR.claro; ctx.fillRect(x, y, cw, ch); }
        texto(ctx, letra(t[q]), x + cw / 2, y + 3, 13, achadas.has(q) ? COR.verde : t[q] === " " ? COR.palido : COR.tinta, achadas.has(q) ? 700 : 400, "center");
        if (achadas.has(q)) linha(ctx, x, y + ch, x + cw, y + ch, COR.verde, 2);
      }
      // de perto: o trecho em volta da janela e o padrão encostado embaixo
      const yz = Y0 + Math.ceil(N / COL) * (ch + 6) + 58, zw = 30, zh = 36, antes = 6;
      const a = Math.max(0, Math.min(s.i - antes, N - 18)), vis = Math.min(N, 18);
      texto(ctx, `de perto: o padrão encostado na posição ${s.i + 1}`, X0, yz - 36, 11, COR.cinza);
      for (let q = a; q < a + vis; q++) {
        const x = X0 + (q - a) * zw, d = q - s.i, naJanela = d >= 0 && d < M;
        const atual = !fim && naJanela && d === s.j;
        ctx.fillStyle = atual ? (s.ok ? COR.tinta : COR.mexeu) : naJanela && s.j !== null && d < s.j ? COR.claro : "#fff";
        ctx.fillRect(x + 1, yz, zw - 2, zh);
        ctx.strokeStyle = naJanela ? COR.tinta : COR.borda; ctx.lineWidth = 1; ctx.strokeRect(x + 1, yz, zw - 2, zh);
        texto(ctx, letra(t[q]), x + zw / 2, yz + 9, 16, atual ? "#fff" : COR.tinta, 600, "center");
        texto(ctx, String(q + 1), x + zw / 2, yz - 13, 9, COR.cinza, 400, "center");
      }
      for (let d = 0; d < M; d++) {
        const q = s.i + d - a;
        if (q < 0 || q >= vis) continue;
        const x = X0 + q * zw, atual = !fim && d === s.j, y = yz + zh + 26;
        ctx.fillStyle = atual ? (s.ok ? COR.tinta : COR.mexeu) : s.j !== null && d < s.j ? COR.claro : "#fff";
        ctx.fillRect(x + 1, y, zw - 2, zh);
        ctx.strokeStyle = COR.tinta; ctx.lineWidth = 1; ctx.strokeRect(x + 1, y, zw - 2, zh);
        texto(ctx, letra(p[d]), x + zw / 2, y + 9, 16, atual ? "#fff" : COR.tinta, 600, "center");
        if (s.j !== null && d <= s.j && !fim) texto(ctx, d < s.j || s.ok ? "=" : "≠", x + zw / 2, yz + zh + 5, 14, d < s.j || s.ok ? COR.cinza : COR.mexeu, 700, "center");
      }

      const x = 680;
      texto(ctx, "comparações", x, 90, 13, COR.cinza);
      texto(ctx, milhar(s.comps), x, 106, 40, fim ? COR.verde : COR.tinta, 700);
      texto(ctx, "posição do padrão", x, 174, 13, COR.cinza);
      texto(ctx, `${s.i + 1} de ${N - M + 1}`, x, 190, 22, COR.tinta, 700);
      texto(ctx, "achou em", x, 236, 13, COR.cinza);
      const ach = s.achou.length ? s.achou.map((q) => q + 1).join(", ") : "—";
      texto(ctx, ach, x, 252, Math.min(20, 270 / (0.6 * Math.max(1, ach.length))), s.achou.length ? COR.verde : COR.tinta, 700);   // cabe até a borda (960)
      texto(ctx, `n = ${N}, m = ${M}`, x, 298, 13, COR.cinza);
      texto(ctx, `pior caso: (n − m + 1)·m = ${milhar((N - M + 1) * M)}`, x, 320, 11, COR.cinza);
      texto(ctx, "memória extra: 0 valores", x, 342, 11, COR.cinza);
      legendaCores(ctx, [[COR.tinta, "letra igual"], [COR.mexeu, "letra diferente"], [COR.claro, "a janela do padrão"], [COR.verde, "achou"]], 500);

      if (fim) legenda(ctx, [[`"${p}" ${r.achou.length ? `aparece ${r.achou.length} ${r.achou.length === 1 ? "vez" : "vezes"}` : "não aparece"}: `, ""], [`${milhar(r.ops)} comparações`, "g"]], 26, p.length > 16 ? 16 : 18);
      else legenda(ctx, [[ideia[s.comps < 6 ? 0 : 1], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].comps : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.padrao, accelerando),
      resumo: { ops: r.ops, n: N, pico: 0 }, contagemEm,
      medidor: () => `${milhar(r.ops)} comparações, n = ${N}, m = ${M}<br>sem memória extra`,
      aoVivo: (u, cfg) => `Tocando agora: ${cfg.rotulo}, n = ${N} letras e padrão de ${M}; ${milhar(contagemEm(u))} de ${milhar(r.ops)} comparações, ${r.achou.length ? `achou em ${r.achou.map((q) => q + 1).join(", ")}` : "não achou"}, sem memória extra.`,
    };
  }

  // ---------- FIGS: árvores pequenas que crescem juntas e somam ----------

  function simFigs(faixa, X, y, s, maxArvores, accelerando) {
    const r = Algoritmos.figs(X, y, s, maxArvores);
    const N = y.length, ex = faixa.exemplo, nomes = ex.variaveis, ideia = faixa.video.ideia;
    const CORES = [COR.album, COR.maior, COR.menor, COR.pivo, "#5a7d1e"];   // a cor diz qual árvore, nunca quanto
    // reprodução: o estado depois de cada evento
    let arvores = [], res = y.map(Number), cand = null, j = null, i = null, melhorCorte = null, varrendo = null;
    let somas = 0, cortes = 0, passo = 0, ultima = null;
    const est = r.eventos.map((e) => {
      if (e.t === "atribui" && e.linha === 5) { passo++; cand = null; }
      else if (e.t === "testa" && e.linha === 7) { cand = [e.c, e.no]; j = null; i = null; varrendo = null; if (e.suja) melhorCorte = null; }
      else if (e.t === "atribui" && e.linha === 10) { j = e.j; i = null; varrendo = e.j; }
      else if (e.t === "soma") { somas++; i = e.i; }
      else if (e.t === "ganho") { cortes++; i = null; }
      else if (e.t === "atribui" && e.linha === 16) melhorCorte = [e.j, e.corte];
      else if (e.t === "testa" && e.linha === 19) { cand = null; varrendo = null; j = null; i = null; }
      else if (e.t === "divide") { arvores = e.arvores; ultima = [e.arvore, e.no]; melhorCorte = null; }
      else if (e.t === "residuos") res = e.residuos;
      return { t: e.t, linha: e.linha, vars: e.vars, nivel: 0, chamada: 0, arvores, res, cand, j, i, melhorCorte, varrendo, somas, cortes, passo, ultima,
        corte: e.t === "ganho" ? [e.j, e.corte] : null };
    });
    if (somas !== r.somas || cortes !== r.cortes) throw new Error("reprodução do FIGS não bate");
    // ritmo constante: cada varredura de uma variável vale 1 passo (as somas dividem o passo) e os cortes dela outro;
    // escolher, dividir e refazer os resíduos, 1 cada
    const pesos = new Array(est.length).fill(0);
    const reparte = (ini, fim, total) => { for (let q = ini; q <= fim; q++) pesos[q] = total / (fim - ini + 1); };
    for (let q = 0; q < est.length;) {
      const t = est[q].t;
      if (t === "soma" || t === "ganho" || t === "compara" && est[q].linha === 15 || t === "atribui" && est[q].linha === 16) {
        let f = q;
        const bloco = t === "soma" ? (x) => x.t === "soma" : (x) => x.t === "ganho" || (x.t === "compara" && x.linha === 15) || (x.t === "atribui" && x.linha === 16);
        while (f + 1 < est.length && bloco(est[f + 1])) f++;
        reparte(q, f, accelerando ? (t === "soma" ? 0.5 : 0.3) : 1);
        q = f + 1;
      } else {
        pesos[q] = { divide: 1.5, residuos: 1.5, pare: 1, devolva: 1 }[t] ?? (accelerando ? 0.05 : 0.2);
        q++;
      }
    }
    const tl = linhaDoTempo(pesos);

    // a dispersão: peso × potência; manual cheio, automático vazado
    const PX0 = 78, PX1 = 420, PY0 = 104, PY1 = 360;
    const xs = X.map((p) => p[0]), ys = X.map((p) => p[1]);
    const lim = [[Math.min(...xs), Math.max(...xs)], [Math.min(...ys), Math.max(...ys)]].map(([a, b]) => [a - (b - a) * 0.06, b + (b - a) * 0.06]);
    const PXv = (v) => PX0 + (v - lim[0][0]) / (lim[0][1] - lim[0][0]) * (PX1 - PX0);
    const PYv = (v) => PY1 - (v - lim[1][0]) / (lim[1][1] - lim[1][0]) * (PY1 - PY0);
    const fmt = (v, jj) => v.toLocaleString("pt-BR", { maximumFractionDigits: jj === 0 ? 2 : 1 });
    const sinal = (v) => `${v < -1e-9 ? "−" : "+"}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    // a região de um nó: o retângulo que os cortes acima dele deixam
    function regiao(a, id) {
      const caixa = [[-Infinity, Infinity], [-Infinity, Infinity]];
      const desce = (no, alvo) => {
        if (no.id === alvo) return true;
        if (no.folha) return false;
        for (const [filho, lado] of [[no.esq, 1], [no.dir, 0]]) {
          const antes = caixa[no.variavel].slice();
          if (lado) caixa[no.variavel][1] = Math.min(caixa[no.variavel][1], no.corte); else caixa[no.variavel][0] = Math.max(caixa[no.variavel][0], no.corte);
          if (desce(a[filho - 1], alvo)) return true;
          caixa[no.variavel] = antes;
        }
        return false;
      };
      desce(a[0], id);
      return caixa;
    }
    const naTela = (cx) => [[Math.max(cx[0][0], lim[0][0]), Math.min(cx[0][1], lim[0][1])], [Math.max(cx[1][0], lim[1][0]), Math.min(cx[1][1], lim[1][1])]];
    // os cortes de uma árvore na dispersão, cada um só dentro da região do seu nó
    function cortesNaTela(ctx, a, cor, larg) {
      for (const no of a) {
        if (no.folha) continue;
        const cx = naTela(regiao(a, no.id));
        if (no.variavel === 0) linha(ctx, PXv(no.corte), PYv(cx[1][0]), PXv(no.corte), PYv(cx[1][1]), cor, larg);
        else linha(ctx, PXv(cx[0][0]), PYv(no.corte), PXv(cx[0][1]), PYv(no.corte), cor, larg);
      }
    }
    // a árvore desenhada: folhas na ordem, cada nó na linha da sua profundidade
    function posicoes(a) {
      const P = {};
      let folhas = 0;
      const anda = (no, nivel) => {
        if (no.folha) { P[no.id] = [folhas++, nivel]; return; }
        anda(a[no.esq - 1], nivel + 1); anda(a[no.dir - 1], nivel + 1);
        P[no.id] = [(P[no.esq][0] + P[no.dir][0]) / 2, nivel];
      };
      anda(a[0], 0);
      return { P, folhas, fundo: Math.max(...Object.values(P).map((p) => p[1])) };
    }

    function desenhar(ctx, u) {
      const k = tl.eventoEm(u), fim = u >= tl.total;
      const st = k >= 0 ? est[k] : est[0];
      const busca = !fim && st.cand;
      // eixos da dispersão
      linha(ctx, PX0, PY1, PX1, PY1, COR.palido); linha(ctx, PX0, PY0, PX0, PY1, COR.palido);
      for (let v = Math.ceil(lim[0][0]); v <= lim[0][1]; v++) texto(ctx, String(v), PXv(v), PY1 + 6, 11, COR.cinza, 400, "center");
      for (let v = 100; v <= lim[1][1]; v += 100) texto(ctx, String(v), PX0 - 8, PYv(v) - 7, 11, COR.cinza, 400, "right");
      texto(ctx, `${nomes[0]} (mil libras)`, PX1, PY1 + 22, 11, COR.cinza, 400, "right");
      texto(ctx, `${nomes[1]} (hp)`, PX0 + 6, PY0 - 18, 11, COR.cinza);
      // a candidata da vez: a região dela, clara, e a varredura
      if (busca) {
        const a = st.cand[0] ? st.arvores[st.cand[0] - 1] : null;
        const cx = naTela(a ? regiao(a, st.cand[1]) : [[-Infinity, Infinity], [-Infinity, Infinity]]);
        ctx.fillStyle = COR.claro;
        ctx.fillRect(PXv(cx[0][0]), PYv(cx[1][1]), PXv(cx[0][1]) - PXv(cx[0][0]), PYv(cx[1][0]) - PYv(cx[1][1]));
        ctx.setLineDash([4, 3]); ctx.strokeStyle = COR.mexeu; ctx.lineWidth = 1.2;
        ctx.strokeRect(PXv(cx[0][0]), PYv(cx[1][1]), PXv(cx[0][1]) - PXv(cx[0][0]), PYv(cx[1][0]) - PYv(cx[1][1])); ctx.setLineDash([]);
        const risco = (jj, v, cor, larg, tracejado) => {
          if (tracejado) ctx.setLineDash([5, 4]);
          if (jj === 0) linha(ctx, PXv(v), PYv(cx[1][0]), PXv(v), PYv(cx[1][1]), cor, larg);
          else linha(ctx, PXv(cx[0][0]), PYv(v), PXv(cx[0][1]), PYv(v), cor, larg);
          ctx.setLineDash([]);
        };
        if (st.melhorCorte) risco(st.melhorCorte[0], st.melhorCorte[1], COR.tinta, 1.5, true);
        if (st.i !== null) risco(st.varrendo, X[st.i][st.varrendo], COR.mexeu, 2);
        if (st.corte) risco(st.corte[0], st.corte[1], COR.mexeu, 1.5, true);
      }
      // os cortes que já entraram, na cor da árvore de cada um
      st.arvores.forEach((a, t) => cortesNaTela(ctx, a, CORES[t % CORES.length], !fim && st.ultima && st.ultima[0] === t + 1 && st.t === "divide" ? 3 : 2));
      // os carros
      X.forEach((p, q) => {
        const vez = busca && q === st.i;
        ctx.beginPath(); ctx.arc(PXv(p[0]), PYv(p[1]), vez ? 5.5 : 4, 0, 7);
        if (y[q]) { ctx.fillStyle = vez ? COR.mexeu : COR.tinta; ctx.fill(); }
        else { ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = vez ? COR.mexeu : COR.tinta; ctx.lineWidth = 1.5; ctx.stroke(); }
      });
      // os resíduos: uma barra por carro, na ordem do peso; o que ainda falta explicar
      const RY = 432, RH = 32, ordem = X.map((_, q) => q).sort((p, q) => X[p][0] - X[q][0]), bw = (PX1 - PX0) / N;
      linha(ctx, PX0, RY, PX1, RY, COR.palido);
      ordem.forEach((q, pos) => {
        const v = st.res[q], h = Math.max(-1, Math.min(1, v)) * RH;
        ctx.fillStyle = busca && q === st.i ? COR.mexeu : COR.tinta;
        ctx.fillRect(PX0 + pos * bw + bw * 0.15, h > 0 ? RY - h : RY, bw * 0.7, Math.abs(h));
      });
      const erro = st.res.reduce((sm, v) => sm + v * v, 0);
      texto(ctx, "resíduos, um por carro, do mais leve ao mais pesado", PX0, RY + RH + 6, 11, COR.cinza);
      texto(ctx, `soma dos quadrados: ${num(erro, 2)}`, PX0, RY + RH + 21, 11, COR.cinza);

      // as árvores somadas, lado a lado (e em mais de uma linha quando não cabem), e a raiz de uma
      // árvore nova esperando a vez
      const TX0 = 470, TX1 = 940, TY0 = 104, gap = 22, fw = 56, dy = 42;
      const vistas = st.arvores.map(posicoes);
      const abre = maxArvores === null || st.arvores.length < maxArvores;   // a raiz de uma árvore nova ainda disputa
      let x0 = TX0, y0 = TY0, fundoLinha = 0;
      const lugar = (largura, fundo) => {
        if (x0 > TX0 && x0 + largura > TX1) { y0 += fundoLinha * dy + 58; x0 = TX0; fundoLinha = 0; }
        fundoLinha = Math.max(fundoLinha, fundo);
      };
      vistas.forEach((v, t) => {
        const a = st.arvores[t], cor = CORES[t % CORES.length];
        lugar(v.folhas * fw, v.fundo);
        texto(ctx, `árvore ${t + 1}`, x0, y0 - 18, 11, cor, 600);
        const pos = (id) => [x0 + (v.P[id][0] + 0.5) * fw, y0 + 12 + v.P[id][1] * dy];
        for (const no of a) if (!no.folha) for (const f of [no.esq, no.dir]) { const [ax, ay] = pos(no.id), [bx, by] = pos(f); linha(ctx, ax, ay + 12, bx, by - 9, COR.palido, 1.2); }
        for (const no of a) {
          const [cx, cy] = pos(no.id);
          const daVez = busca && st.cand[0] === t + 1 && st.cand[1] === no.id;
          if (no.folha) {
            ctx.fillStyle = daVez ? COR.mexeu : "#fff"; ctx.strokeStyle = daVez ? COR.mexeu : cor; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.rect(cx - fw / 2 + 4, cy - 9, fw - 8, 18); ctx.fill(); ctx.stroke();
            texto(ctx, sinal(no.valor), cx, cy - 6, 10, daVez ? "#fff" : COR.tinta, 600, "center");
          } else {   // a variável em cima e o corte embaixo: os rótulos de dois nós vizinhos não se encostam
            const novo = !fim && st.t === "divide" && st.ultima[0] === t + 1 && st.ultima[1] === no.id;
            texto(ctx, nomes[no.variavel], cx, cy - 12, 10, novo ? COR.mexeu : COR.tinta, 600, "center");
            texto(ctx, `≤ ${fmt(no.corte, no.variavel)}`, cx, cy, 10, novo ? COR.mexeu : COR.tinta, 600, "center");
          }
        }
        x0 += v.folhas * fw + gap;
        if (t < vistas.length - 1 || abre) texto(ctx, "+", x0 - gap / 2, y0 + 2, 16, COR.cinza, 600, "center");
      });
      if (abre) {
        lugar(fw, 0);
        const daVez = busca && st.cand[0] === 0;
        ctx.setLineDash([4, 3]); ctx.strokeStyle = daVez ? COR.mexeu : COR.aux; ctx.lineWidth = 1.5;
        ctx.strokeRect(x0 + 4, y0 + 3, fw - 8, 18); ctx.setLineDash([]);
        texto(ctx, "nova", x0 + fw / 2, y0 - 18, 11, daVez ? COR.mexeu : COR.cinza, 600, "center");
      }
      // os números, logo abaixo das árvores
      const py = Math.min(420, Math.max(320, y0 + fundoLinha * dy + 44));
      const acertos = X.filter((p, q) => Algoritmos.classeFigs(Algoritmos.preverFigs(st.arvores, p)) === y[q]).length;
      texto(ctx, "resíduos somados", TX0, py, 13, COR.cinza);
      texto(ctx, milhar(st.somas), TX0, py + 16, 30, COR.tinta, 700);
      texto(ctx, "cortes testados", TX0 + 170, py, 13, COR.cinza);
      texto(ctx, milhar(st.cortes), TX0 + 170, py + 16, 30, COR.tinta, 700);
      texto(ctx, "acertos", TX0 + 330, py, 13, COR.cinza);
      texto(ctx, st.arvores.length ? `${acertos} de ${N}` : "—", TX0 + 330, py + 16, 30, fim ? COR.verde : COR.tinta, 700);
      const div = st.arvores.reduce((sm, a) => sm + (a.length - 1) / 2, 0);
      texto(ctx, `passo ${Math.min(st.passo, s)} de ${s}   ${div} ${div === 1 ? "divisão" : "divisões"} em ${st.arvores.length} ${st.arvores.length === 1 ? "árvore" : "árvores"}`, TX0, py + 58, 13, COR.cinza);
      legendaCores(ctx, [[COR.tinta, "manual"], ["#fff", "automático", COR.tinta, 1.5], [COR.claro, "a candidata da vez", COR.mexeu], [COR.mexeu, "o carro somado agora"]], 504);

      if (fim) legenda(ctx, [[`${r.arvores.length} ${r.arvores.length === 1 ? "árvore" : "árvores"}, ${r.divisoes} ${r.divisoes === 1 ? "divisão" : "divisões"}: `, ""], [`${r.acertos} de ${N} carros certos`, "g"]]);
      else legenda(ctx, [[ideia[st.arvores.length ? 1 : 0], ""]]);
    }

    const contagemEm = (u) => { const k = tl.eventoEm(u); return k >= 0 ? est[k].somas : 0; };
    return {
      total: tl.total, desenhar, ...comum(tl, est, pesos, RITMO.figs, accelerando),
      resumo: { somas: r.somas, cortes: r.cortes, acertos: r.acertos, n: N, pico: r.pico }, contagemEm,
      medidor: () => `${milhar(r.somas)} resíduos somados, n = ${N}<br>${r.acertos} de ${N} certos`,
      aoVivo: (u, cfg) => `Tocando agora: ${cfg.rotulo}, ${N} carros, até ${s} divisões; ${milhar(contagemEm(u))} de ${milhar(r.somas)} resíduos somados, ${r.arvores.length} ${r.arvores.length === 1 ? "árvore" : "árvores"} e ${r.acertos} de ${N} carros certos no fim.`,
    };
  }

  function criar(faixa, cfg, accelerando = false) {
    const tipo = faixa.medido.tempo.tipo, ex = faixa.exemplo, padrao = cfg.tipo === "padrao";
    if (tipo === "busca") {
      const e = padrao ? { vetor: ex.vetor, alvo: ex.alvo } : Algoritmos.entradaBusca(cfg.n, faixa.alg === "binaria", cfg.tipo, cfg.semente);
      return simBusca(faixa, e.vetor, e.alvo, accelerando);
    }
    if (tipo === "parenteses") return simParenteses(faixa, padrao ? ex.texto : Algoritmos.textoParenteses(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "atendimento") {
      const e = padrao ? ex : Algoritmos.clientes(cfg.n, ex.movimentos[cfg.tipo], cfg.semente);
      return simAtendimento(faixa, e.chegada, e.duracao, accelerando);
    }
    if (tipo === "prioridade") {
      const e = padrao ? ex : Algoritmos.pacientes(cfg.n, ex.movimentos[cfg.tipo], ex.gravidades, cfg.semente);
      return simPrioridade(faixa, e.chegada, e.duracao, e.gravidade, accelerando);
    }
    if (tipo === "inverter") return simInverter(faixa, padrao ? ex.valores : Algoritmos.valoresSorteados(cfg.n, "sorteada", cfg.semente), accelerando);
    if (tipo === "percursos") return simPercursos(faixa, padrao ? ex.valores : Algoritmos.valoresArvore(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "abb") return simAbb(faixa, padrao ? ex.valores : Algoritmos.valoresArvore(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "avl") return simAvl(faixa, padrao ? ex.valores : Algoritmos.valoresArvore(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "janela") return simJanela(faixa, padrao ? ex.vetor : Algoritmos.valoresSorteados(cfg.n, cfg.tipo, cfg.semente), cfg.k || ex.k, accelerando);
    if (tipo === "grafo") {
      const k = padrao ? ex.k : Math.round(Math.sqrt(cfg.n));
      return simGrafo(faixa, k, padrao ? ex.arestas : Algoritmos.grafoGrade(k, cfg.tipo, cfg.semente), accelerando);
    }
    if (tipo === "dijkstra") {
      const k = padrao ? ex.k : Math.round(Math.sqrt(cfg.n));
      const arestas = padrao ? ex.arestas : Algoritmos.grafoGrade(k, cfg.tipo, cfg.semente);
      return simDijkstra(faixa, k, arestas, padrao ? ex.pesos : Algoritmos.pesosGrade(arestas.length, ex.faixa_pesos, cfg.semente + 1), accelerando);
    }
    if (tipo === "mediana") return simMediana(faixa, padrao ? ex.vetor : Algoritmos.entrada(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "welford") {
      const d = { padrao: 0, d6: 1e6, d8: 1e8, d9: 1e9 }[cfg.tipo];
      return simWelford(faixa, ex.x.map((v) => v + d), ex.anos, ex.menu.find((m) => m.deslocamento === d), accelerando);
    }
    if (tipo === "figs") return simFigs(faixa, ex.X, ex.y, cfg.k || ex.s, cfg.tipo === "uma" ? 1 : null, accelerando);
    if (tipo === "histograma") return simHistograma(faixa, padrao ? ex.x : Algoritmos.amostra(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "palavras") return simPalavras(faixa, padrao ? ex.palavras : ex.palavras.slice(0, cfg.n), accelerando);
    if (tipo === "repetidos") return simRepetidos(faixa, padrao ? ex.vetor : Algoritmos.valoresRepetidos(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "encadeamento" || tipo === "sondagem") {
      return simColisao(faixa, padrao ? ex.chaves : Algoritmos.chavesColisao(cfg.n, cfg.tipo, ex.bits, cfg.semente), ex.bits, accelerando);
    }
    if (tipo === "maximo") return simMaximo(faixa, padrao ? ex.vetor : Algoritmos.valoresSorteados(cfg.n, cfg.tipo, cfg.semente), accelerando);
    if (tipo === "matrizes") {
      const e = padrao ? ex : Algoritmos.matrizesSorteadas(cfg.n, cfg.semente);
      return simMatrizes(faixa, e.A, e.B, accelerando);
    }
    // o fatorial e os Fibonacci só têm o n: o do encarte, ou o escolhido no menu
    if (tipo === "fatorial") return simFatorial(faixa, cfg.n, accelerando);
    if ((tipo || "").startsWith("fib_")) return simFibonacci(faixa, cfg.n, accelerando);   // o K-means não tem tipo
    if (tipo === "busca_padrao") {
      const m = cfg.k || ex.m;
      const e = padrao ? { texto: ex.texto, padrao: ex.padrao.slice(0, m) } : Algoritmos.textoPadrao(cfg.n, m, cfg.tipo, cfg.semente);
      return simPadrao(faixa, e.texto, e.padrao, accelerando);
    }
    if (faixa.alg === "kmeans") {
      const pontos = faixa.exemplo.pontos;
      const iniciais = cfg.semente === null ? faixa.exemplo.iniciais : Algoritmos.centrosIniciais(pontos, cfg.k, cfg.semente);
      return simKmeans(faixa, pontos, iniciais, accelerando);
    }
    const vetor = cfg.tipo === "padrao" ? faixa.exemplo.vetor : Algoritmos.entrada(cfg.n, cfg.tipo, cfg.semente);
    return simOrdenacao(faixa, vetor, accelerando);
  }

  /** Desenha a simulação na posição `u` num canvas de qualquer tamanho. */
  function pintar(canvas, sim, u) {
    const dpr = window.devicePixelRatio || 1;
    const larg = canvas.clientWidth || W;
    const alt = larg * H / W;
    if (canvas.width !== Math.round(larg * dpr) || canvas.height !== Math.round(alt * dpr)) {
      canvas.width = Math.round(larg * dpr);
      canvas.height = Math.round(alt * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx.fillStyle = papel();   // o mesmo papel da página (--papel)
    ctx.fillRect(0, 0, W, H);
    sim.desenhar(ctx, u);
  }

  // a cor do papel vem do CSS, para o canvas seguir a variante escolhida (data-papel no <html>)
  let papelLido = null, papelEm = null;
  function papel() {
    const v = document.documentElement.dataset.papel || "";
    if (papelEm !== v || !papelLido) { papelEm = v; papelLido = getComputedStyle(document.documentElement).getPropertyValue("--papel").trim() || "#fff"; }
    return papelLido;
  }

  // a comparação da home: as duas buscas num vetor e num alvo escolhidos de fora (o mesmo para as duas)
  const busca = (faixa, vetor, alvo) => simBusca(faixa, vetor, alvo, false);

  window.Palco = { criar, pintar, busca, W, H };
})();
