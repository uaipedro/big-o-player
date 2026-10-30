// Os algoritmos rodando no navegador, instrumentados como em Python
// (motor/conta.py, motor/ordenacao.py): mesma variante, mesmas contagens.
// Cada evento traz `linha`, a linha do pseudocódigo da ficha em que o
// algoritmo está, para o painel de variáveis mostrar. testes/conferir_js.mjs exige
// contagens iguais às do Python nos vetores do dados.json. Cada evento leva
// também `vars`, as variáveis escalares da vez com o nome e a convenção do
// pseudocódigo (índices a partir de 1), para o painel de variáveis do palco.
(function (raiz) {
  "use strict";

  // ---------- contador ----------

  function contador() {
    return {
      ops: {}, vivos: {}, pico: 0, detalhe: {}, eventos: [],
      vars: {}, quadros: [], chamada: 0, seq: 0,   // a chamada aberta (variáveis e id); as de fora, na pilha
      op(nome) { this.ops[nome] = (this.ops[nome] || 0) + 1; },
      push(e) { this.eventos.push({ ...e, vars: { ...this.vars }, nivel: this.quadros.length, chamada: this.chamada }); },
      aloca(nome, tamanho) { this.vivos[nome] = tamanho; this._pico(); },
      // uma chamada recursiva: as variáveis dela começam com o trecho (a, b) do pseudocódigo
      entra(a, b, linha, vars) {
        this.vivos.pilha = (this.vivos.pilha || 0) + 1;
        this._pico();
        this.quadros.push({ vars: this.vars, chamada: this.chamada, linha });
        this.vars = vars;
        this.chamada = ++this.seq;
        this.push({ t: "entra", a, b, linha });
      },
      // o retorno já mostra quem chamou, na linha de onde a chamada partiu
      sai() {
        this.vivos.pilha -= 1;
        const q = this.quadros.pop();
        this.vars = q.vars;
        this.chamada = q.chamada;
        this.push({ t: "sai", linha: q.linha });
      },
      _pico() {
        const total = Object.values(this.vivos).reduce((s, x) => s + x, 0);
        if (total > this.pico) { this.pico = total; this.detalhe = { ...this.vivos }; }
      },
    };
  }

  // ---------- ajudantes das ordenações ----------

  // `parte`: qual condição da linha, quando um "e" a divide em dois losangos
  function maior(v, i, j, c, linha, onde = "v", parte) {
    c.op("comparacoes");
    c.push(parte === undefined ? { t: "compara", i, j, onde, linha } : { t: "compara", i, j, onde, linha, parte });
    return v[i] > v[j];
  }

  function troca(v, i, j, c, linha) {
    c.op("trocas");
    const x = v[i]; v[i] = v[j]; v[j] = x;
    c.push({ t: "troca", i, j, linha });
  }

  function escreve(v, k, x, c, onde, linha) {
    c.op("escritas");
    v[k] = x;
    c.push({ t: "escreve", k, x, onde, linha });
  }

  // ---------- ordenações (mesmas variantes do Python) ----------

  // eventos de controle: não contam, só mostram por onde o algoritmo passa
  const testa = (c, linha, parte) => c.push(parte === undefined ? { t: "testa", linha } : { t: "testa", linha, parte });

  function bolha(v, c) {
    const V = c.vars = { fim: null, i: null, trocou: null, "v[i]": null, "v[i + 1]": null };
    for (let fim = v.length - 1; fim >= 1; fim--) {
      let trocou = false;
      Object.assign(V, { fim, i: null, trocou, "v[i]": null, "v[i + 1]": null });
      for (let i = 0; i < fim; i++) {
        Object.assign(V, { i: i + 1, "v[i]": v[i], "v[i + 1]": v[i + 1] });
        if (maior(v, i, i + 1, c, 5)) {
          // o evento da troca já mostra os valores trocados, como as barras
          Object.assign(V, { trocou: (trocou = true), "v[i]": v[i + 1], "v[i + 1]": v[i] });
          troca(v, i, i + 1, c, 6);
        }
      }
      testa(c, 8);
      if (!trocou) { c.push({ t: "pare", linha: 9 }); break; }
    }
  }

  function insercao(v, c) {
    const V = c.vars = { i: null, j: null, "v[j − 1]": null, "v[j]": null };
    for (let i = 1; i < v.length; i++) {
      let j = i;
      Object.assign(V, { i: i + 1, j: j + 1, "v[j − 1]": v[j - 1], "v[j]": v[j] });
      // enquanto j > 1 e v[j−1] > v[j]: dois losangos, o segundo só se o primeiro deixar
      for (;;) {
        testa(c, 4, 0);
        if (!(j > 0) || !maior(v, j - 1, j, c, 4, "v", 1)) break;
        Object.assign(V, { "v[j − 1]": v[j], "v[j]": v[j - 1] });   // a troca já mostra os valores trocados
        troca(v, j - 1, j, c, 5);
        j--;
        Object.assign(V, { j: j + 1, "v[j − 1]": j > 0 ? v[j - 1] : null, "v[j]": v[j] });
      }
    }
  }

  function selecao(v, c) {
    const n = v.length;
    const V = c.vars = { i: null, m: null, j: null, "v[m]": null, "v[j]": null };
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      Object.assign(V, { i: i + 1, m: m + 1, j: null, "v[m]": v[m], "v[j]": null });
      c.push({ t: "menor", m, linha: 3 });
      for (let j = i + 1; j < n; j++) {
        Object.assign(V, { j: j + 1, "v[j]": v[j] });
        if (maior(v, m, j, c, 5)) { m = j; Object.assign(V, { m: m + 1, "v[m]": v[m] }); c.push({ t: "menor", m, linha: 6 }); }
      }
      // o evento da troca já mostra o vetor trocado
      Object.assign(V, { j: null, "v[j]": null, "v[m]": v[i] });
      troca(v, i, m, c, 7);
    }
  }

  // heap de máximo em v[0, fim): os filhos de p são 2p + 1 e 2p + 2 (2p e 2p + 1 no pseudocódigo)
  function heapsort(v, c) {
    const n = v.length;
    const V = c.vars = { fim: n, i: null, p: null, f: null, "v[p]": null, "v[f]": null };
    let fim = n, i = n >> 1;
    V.i = i + 1;
    while (fim > 1) {
      if (i > 0) { i--; V.i = i + 1; }
      else {
        fim--;
        // o evento da troca já mostra os valores trocados; fim ainda é o de antes
        Object.assign(V, { p: null, f: null, "v[p]": null, "v[f]": null });
        troca(v, 0, fim, c, 7);
        V.fim = fim;
      }
      let p = i;
      Object.assign(V, { p: p + 1, f: null, "v[p]": v[p], "v[f]": null });
      while (2 * p + 1 < fim) {
        let f = 2 * p + 1;
        Object.assign(V, { f: f + 1, "v[f]": v[f] });
        testa(c, 12, 0);
        if (f + 1 < fim && maior(v, f + 1, f, c, 12, "v", 1)) { f++; Object.assign(V, { f: f + 1, "v[f]": v[f] }); }
        if (maior(v, f, p, c, 14)) {
          Object.assign(V, { "v[p]": v[f], "v[f]": v[p] });
          troca(v, p, f, c, 15);
          p = f;
          Object.assign(V, { p: p + 1, f: null, "v[p]": v[p], "v[f]": null });
        } else { c.push({ t: "pare", linha: 17 }); break; }
      }
    }
  }

  // trecho [a, b) do JS = de a + 1 até b no pseudocódigo; m é o mesmo nos dois
  function intercalacao(v, a, b, aux, c, linha) {
    const V = { a: a + 1, b, m: null, i: null, j: null, k: null };
    c.entra(a, b, linha, V);
    testa(c, 2);
    if (b - a > 1) {
      const m = Math.floor((a + b) / 2);
      V.m = m;
      c.push({ t: "atribui", linha: 3 });
      intercalacao(v, a, m, aux, c, 4);
      intercalacao(v, m, b, aux, c, 5);
      for (let k = a; k < b; k++) { V.k = k + 1; escreve(aux, k, v[k], c, "aux", 7); }
      let i = a, j = m, k = a;
      const anda = () => Object.assign(V, { i: i + 1, j: j + 1, k: k + 1 });
      anda();
      while (i < m && j < b) {
        if (maior(aux, i, j, c, 10, "aux")) { escreve(v, k, aux[j], c, "v", 11); j++; }
        else { escreve(v, k, aux[i], c, "v", 13); i++; }
        k++;
        anda();
      }
      while (i < m) { escreve(v, k, aux[i], c, "v", 16); i++; k++; anda(); }
      while (j < b) { escreve(v, k, aux[j], c, "v", 18); j++; k++; anda(); }
    }
    c.sai();
  }

  function rapida(v, a, b, c, linha) {
    const V = { a: a + 1, b, "pivô": null, i: null, j: null };
    c.entra(a, b, linha, V);
    testa(c, 2);
    if (b - a > 1) {
      const p = b - 1;
      V["pivô"] = v[p];
      c.push({ t: "pivo", p, linha: 3 });
      let i = a;
      V.i = i + 1;
      for (let j = a; j < b - 1; j++) {
        V.j = j + 1;
        if (maior(v, p, j, c, 6)) { troca(v, i, j, c, 7); i++; V.i = i + 1; }
      }
      V.j = null;
      troca(v, i, p, c, 9);
      rapida(v, a, i, c, 10);
      rapida(v, i + 1, b, c, 11);
    }
    c.sai();
  }

  const ORDENACOES = {
    bolha: { movimento: "trocas", ordenar: (v, c) => bolha(v, c) },
    insercao: { movimento: "trocas", ordenar: (v, c) => insercao(v, c) },
    selecao: { movimento: "trocas", ordenar: (v, c) => selecao(v, c) },
    intercalacao: {
      movimento: "escritas",
      ordenar(v, c) {
        const aux = new Array(v.length).fill(0);
        c.aloca("auxiliar", v.length);
        intercalacao(v, 0, v.length, aux, c, 1);
      },
    },
    rapida: { movimento: "trocas", ordenar: (v, c) => rapida(v, 0, v.length, c, 1) },
    heapsort: { movimento: "trocas", ordenar: (v, c) => heapsort(v, c) },
  };

  /** Roda uma ordenação numa cópia de `vetor` e devolve contagens e eventos. */
  function ordenar(nome, vetor) {
    const alg = ORDENACOES[nome];
    const c = contador();
    const v = vetor.slice();
    alg.ordenar(v, c);
    for (let i = 1; i < v.length; i++) if (v[i - 1] > v[i]) throw new Error(`${nome} não ordenou`);
    return {
      vetor: vetor.slice(), final: v, eventos: c.eventos, movimento: alg.movimento,
      comparacoes: c.ops.comparacoes || 0, movimentos: c.ops[alg.movimento] || 0,
      pico: c.pico, detalhe: c.detalhe,
    };
  }

  // ---------- K-means (Lloyd, como algoritmos/kmeans/kmeans.py) ----------

  function kmeans(pontos, iniciais, maxVoltas = 100) {
    const c = contador();
    const V = c.vars = { volta: null, i: null, j: null, d: null, menor: null, melhor: null, mudou: null };
    const k = iniciais.length;
    // a conta já aparece no painel no passo dela: `guarda` põe o valor em d ou em menor antes do evento
    const dist = (p, q, i, j, linha, guarda) => {
      c.op("distancias");
      const x = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      guarda(x);
      c.push({ t: "dist", i, j, linha, x });
      return x;
    };
    const centros = iniciais.map((q) => q.slice());
    c.aloca("centros", 2 * k);
    const rotulos = new Array(pontos.length).fill(-1);
    c.aloca("rotulos", pontos.length);
    c.push({ t: "centros", centros: centros.map((q) => q.slice()), linha: 2 });
    let voltas = 0;
    for (let volta = 0; volta < maxVoltas; volta++) {
      voltas++;
      let mudou = false;
      Object.assign(V, { volta: volta + 1, i: null, j: null, d: null, menor: null, melhor: null, mudou });
      for (let i = 0; i < pontos.length; i++) {
        const p = pontos[i];
        let melhor = 0;
        Object.assign(V, { i: i + 1, j: 1, d: null, melhor: 1, menor: null });
        let menor = dist(p, centros[0], i, 0, 7, (x) => { V.menor = x; });
        for (let j = 1; j < k; j++) {
          V.j = j + 1;
          const d = dist(p, centros[j], i, j, 9, (x) => { V.d = x; });
          c.push({ t: "testa", linha: 10, i, j });
          if (d < menor) {
            melhor = j; menor = d;
            Object.assign(V, { melhor: j + 1, menor });
            c.push({ t: "atribui", linha: 11, i, j });
          }
        }
        const trocou = rotulos[i] !== melhor;
        if (trocou) { rotulos[i] = melhor; mudou = true; V.mudou = true; }
        c.push({ t: "rotulo", i, g: melhor, mudou: trocou, linha: trocou ? 13 : 12 });
      }
      c.push({ t: "volta", volta, mudou, linha: 14 });
      if (!mudou) break;
      const sx = new Array(k).fill(0), sy = new Array(k).fill(0), cont = new Array(k).fill(0);
      c.aloca("soma_x", k); c.aloca("soma_y", k); c.aloca("contagens", k);
      for (let i = 0; i < pontos.length; i++) {
        const j = rotulos[i];
        sx[j] += pontos[i][0]; sy[j] += pontos[i][1]; cont[j] += 1;
      }
      for (let j = 0; j < k; j++) if (cont[j] > 0) centros[j] = [sx[j] / cont[j], sy[j] / cont[j]];
      c.push({ t: "centros", centros: centros.map((q) => q.slice()), linha: 21 });
    }
    return {
      eventos: c.eventos, rotulos, centros, voltas, distancias: c.ops.distancias || 0,
      pico: c.pico, detalhe: c.detalhe,
    };
  }

  // ---------- FIGS (como algoritmos/figs/figs.py, o figs() do figsr) ----------
  // várias árvores crescem juntas; a cada passo, cada folha e a raiz de uma árvore nova
  // procuram o corte que mais reduz a soma dos quadrados dos resíduos, e o melhor entra

  const FIGS = { minN: 5, maxCortes: 30, tolerancia: 1e-10, ganhoMinimo: 1e-6 };
  const bate = (g, atual) => atual === -Infinity || g > atual + FIGS.tolerancia * Math.abs(atual);
  function mediaR(v) {   // duas passadas, como o mean() do R
    let s = 0;
    for (const x of v) s += x;
    const m = s / v.length;
    let t = 0;
    for (const x of v) t += x - m;
    return m + t / v.length;
  }
  function quantis7(xs, probs) {   // quantile(type = 7) com xs em ordem
    const n = xs.length;
    return probs.map((p) => {
      const ind = 1 + Math.max(n - 1, 0) * p, lo = Math.floor(ind), hi = Math.ceil(ind);
      let q = xs[lo - 1];
      if (ind > lo && xs[hi - 1] !== q) { const h = ind - lo; q = (1 - h) * q + h * xs[hi - 1]; }
      return q;
    });
  }
  const direitaDe = (xs, c) => { let lo = 0, hi = xs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] <= c) lo = m + 1; else hi = m; } return lo; };
  function cortesDe(xs) {
    const vals = [xs[0]];
    for (let i = 1; i < xs.length; i++) if (xs[i] !== xs[i - 1]) vals.push(xs[i]);
    if (vals.length <= 1) return null;
    let cs = vals.slice(0, -1).map((v, i) => (v + vals[i + 1]) / 2);
    if (cs.length > FIGS.maxCortes) {
      const n1 = FIGS.maxCortes - 1, passo = (0.95 - 0.05) / n1;
      const probs = [0.05, ...Array.from({ length: n1 - 1 }, (_, i) => 0.05 + (i + 1) * passo), 0.95];
      cs = [...new Set(quantis7(xs, probs))];
    }
    return cs.map((c) => [c, direitaDe(xs, c)]);
  }
  function candidataFigs(X, linhas, arvore, no, ordemMae) {
    const d = X[0].length, n = linhas.length;
    let ordem;
    if (!ordemMae) ordem = Array.from({ length: d }, (_, j) => linhas.slice().sort((a, b) => X[a][j] - X[b][j]));
    else { const dentro = new Set(linhas); ordem = ordemMae.map((o) => o.filter((i) => dentro.has(i))); }
    const variaveis = [], cortes = [];
    for (let j = 0; j < d; j++) {
      const cs = n >= 2 * FIGS.minN ? cortesDe(ordem[j].map((i) => X[i][j])) : null;
      if (cs) { variaveis.push(j); cortes.push(cs.filter(([, e]) => e >= FIGS.minN && n - e >= FIGS.minN)); }
    }
    return { arvore, no, linhas, ordem, variaveis, cortes, suja: true, ganho: -Infinity, corte: null };
  }
  const noFigs = (id, valor, n) => ({ id, folha: true, valor, n, variavel: null, corte: null, esq: null, dir: null });
  function preverFigs(arvores, x) {
    let total = 0;
    for (const a of arvores) {
      let p = a[0];
      while (!p.folha) p = a[(x[p.variavel] <= p.corte ? p.esq : p.dir) - 1];
      total += p.valor;
    }
    return total;
  }
  const classeFigs = (p) => (Math.min(Math.max(p, 1e-6), 1 - 1e-6) >= 0.5 ? 1 : 0);
  const copiaArvores = (arvores) => arvores.map((a) => a.map((q) => ({ ...q })));

  /** FIGS em X (n × d), y em 0/1, até s divisões; maxArvores = 1 é a árvore única. */
  function figs(X, y, s, maxArvores = null) {
    const c = contador(), n = y.length, d = X[0].length;
    const nomeC = (o) => (o.arvore === 0 ? "raiz nova" : `árvore ${o.arvore}, nó ${o.no}`);
    const V = c.vars = { passo: null, c: null, j: null, i: null, soma: null, ganho: null, "c.ganho": null, maior: null };
    const residuos = y.map(Number);
    c.aloca("residuos", n);
    const arvores = [];
    const candidatas = [candidataFigs(X, Array.from({ length: n }, (_, i) => i), 0, 1)];
    c.aloca("ordens", d * n);
    c.push({ t: "atribui", linha: 2, residuos: residuos.slice() });
    c.push({ t: "atribui", linha: 3 });
    let somas = 0, cortes = 0, divisoes = 0;
    for (let passo = 0; passo < s; passo++) {
      let melhor = null, ganho = -Infinity;
      Object.assign(V, { passo: passo + 1, c: null, j: null, i: null, soma: null, ganho: null, "c.ganho": null, maior: null });
      c.push({ t: "atribui", linha: 5 });
      for (const o of candidatas) {
        Object.assign(V, { c: nomeC(o), j: null, i: null, soma: null, ganho: null, "c.ganho": o.ganho === -Infinity ? null : o.ganho });
        c.push({ t: "testa", linha: 7, c: o.arvore, no: o.no, suja: o.suja });
        if (o.suja) {
          o.suja = false; o.ganho = -Infinity; o.corte = null;
          const m = mediaR(o.linhas.map((i) => residuos[i]));
          V["c.ganho"] = null;
          c.push({ t: "atribui", linha: 8, c: o.arvore, no: o.no });
          o.variaveis.forEach((j, q) => {
            const S = [0];
            let soma = 0;
            Object.assign(V, { j: j + 1, i: null, soma: 0, ganho: null });
            c.push({ t: "atribui", linha: 10, c: o.arvore, no: o.no, j });
            for (const i of o.ordem[j]) {
              c.op("somas"); somas++;
              soma += residuos[i] - m;
              S.push(soma);
              Object.assign(V, { i: i + 1, soma });
              c.push({ t: "soma", linha: 12, c: o.arvore, no: o.no, j, i, k: S.length - 1, soma });
            }
            c.aloca("somas", S.length);
            V.i = null;
            for (const [corte, e] of o.cortes[q]) {
              c.op("cortes"); cortes++;
              const g = S[e] ** 2 / e + (soma - S[e]) ** 2 / (S.length - 1 - e) - soma ** 2 / (S.length - 1);
              V.ganho = g;
              c.push({ t: "ganho", linha: 14, c: o.arvore, no: o.no, j, corte, e, g });
              c.push({ t: "compara", linha: 15, c: o.arvore, no: o.no, j, corte });
              if (bate(g, o.ganho)) {
                o.ganho = g; o.corte = [j, corte];
                V["c.ganho"] = g;
                c.push({ t: "atribui", linha: 16, c: o.arvore, no: o.no, j, corte, g });
              }
            }
          });
        }
        c.push({ t: "compara", linha: 17, c: o.arvore, no: o.no });
        if (bate(o.ganho, ganho)) {
          melhor = o; ganho = o.ganho;
          V.maior = ganho === -Infinity ? null : ganho;
          c.push({ t: "atribui", linha: 18, c: o.arvore, no: o.no });
        }
      }
      Object.assign(V, { c: melhor && ganho > -Infinity ? nomeC(melhor) : null, j: null, i: null, soma: null, ganho: null });
      c.push({ t: "testa", linha: 19 });
      if (ganho <= FIGS.ganhoMinimo) { c.push({ t: "pare", linha: 20 }); break; }
      // dividir (algoritmos/figs/figs.py:dividir)
      const [j, corte] = melhor.corte;
      const esq = melhor.linhas.filter((i) => X[i][j] <= corte), dir = melhor.linhas.filter((i) => X[i][j] > corte);
      const me = mediaR(esq.map((i) => residuos[i])), md = mediaR(dir.map((i) => residuos[i]));
      let t, mae;
      if (melhor.arvore === 0) {
        arvores.push([noFigs(1, 0, melhor.linhas.length), noFigs(2, me, esq.length), noFigs(3, md, dir.length)]);
        t = arvores.length; mae = 1;
      } else {
        t = melhor.arvore; mae = melhor.no;
        const a = arvores[t - 1], base = a[mae - 1].valor;
        a.push(noFigs(a.length + 1, base + me, esq.length));
        a.push(noFigs(a.length + 1, base + md, dir.length));
        candidatas.splice(candidatas.indexOf(melhor), 1);
      }
      const pai = arvores[t - 1][mae - 1];
      Object.assign(pai, { folha: false, variavel: j, corte, esq: arvores[t - 1].length - 1, dir: arvores[t - 1].length, ganho });
      divisoes++;
      c.push({ t: "divide", linha: 21, arvore: t, no: mae, j, corte, arvores: copiaArvores(arvores) });
      for (const i of esq) residuos[i] -= me;
      for (const i of dir) residuos[i] -= md;
      c.push({ t: "residuos", linha: 23, residuos: residuos.slice(), arvore: t, no: mae });
      const mudou = new Set(melhor.linhas);
      for (const o of candidatas) if (o.arvore === 0 || o.linhas.some((i) => mudou.has(i))) o.suja = true;
      const novas = [candidataFigs(X, esq, t, pai.esq, melhor.ordem), candidataFigs(X, dir, t, pai.dir, melhor.ordem)];
      const raiz = candidatas[0], folhas = candidatas.slice(1).concat(novas);
      if (maxArvores !== null && arvores.length >= maxArvores) { raiz.suja = false; raiz.ganho = -Infinity; raiz.corte = null; raiz.variaveis = []; }
      folhas.sort((p, q) => p.arvore - q.arvore || p.no - q.no);
      candidatas.splice(0, candidatas.length, raiz, ...folhas);
      c.aloca("ordens", candidatas.reduce((sm, o) => sm + o.ordem.length * o.linhas.length, 0));
      c.aloca("arvores", 3 * arvores.reduce((sm, a) => sm + a.length, 0));
      c.push({ t: "marca", linha: 24 });
    }
    c.push({ t: "devolva", linha: 25 });
    const previsoes = X.map((x) => preverFigs(arvores, x));
    return {
      eventos: c.eventos, arvores, previsoes, acertos: previsoes.filter((p, i) => classeFigs(p) === y[i]).length, divisoes,
      somas: c.ops.somas || 0, cortes: c.ops.cortes || 0, pico: c.pico, detalhe: c.detalhe,
    };
  }

  // ---------- buscas (motor/busca.py) ----------
  // o vetor guarda pares; cada comparação de uma casa com o alvo conta 1

  function buscar(nome, vetor, alvo) {
    const c = contador(), v = vetor;
    const igual = (i, linha) => { c.op("comparacoes"); c.push({ t: "compara", i, op: "=", linha }); return v[i] === alvo; };
    const menor = (i, linha) => { c.op("comparacoes"); c.push({ t: "compara", i, op: "<", linha }); return v[i] < alvo; };
    let achou = -1;
    if (nome === "sequencial") {
      const V = c.vars = { alvo, i: null, "v[i]": null, achou: 0 };
      for (let i = 0; i < v.length; i++) {
        Object.assign(V, { i: i + 1, "v[i]": v[i] });
        if (igual(i, 4)) { achou = i; V.achou = i + 1; c.push({ t: "achou", i, linha: 5 }); c.push({ t: "pare", linha: 6 }); break; }
      }
      c.push({ t: "devolva", linha: 7 });
    } else {
      let a = 0, b = v.length - 1;
      const V = c.vars = { alvo, a: a + 1, b: b + 1, m: null, "v[m]": null, achou: 0 };
      c.push({ t: "corta", a, b, linha: 2 });
      for (;;) {
        c.push({ t: "testa", linha: 3 });
        if (!(a <= b)) break;
        const m = Math.floor((a + b) / 2);
        Object.assign(V, { m: m + 1, "v[m]": v[m] });
        c.push({ t: "meio", m, linha: 4 });
        if (igual(m, 5)) { achou = m; V.achou = m + 1; c.push({ t: "achou", i: m, linha: 6 }); c.push({ t: "pare", linha: 7 }); break; }
        else if (menor(m, 8)) { a = m + 1; V.a = a + 1; c.push({ t: "corta", a, b, linha: 9 }); }
        else { b = m - 1; V.b = b + 1; c.push({ t: "corta", a, b, linha: 11 }); }
      }
      c.push({ t: "devolva", linha: 12 });
    }
    const certo = v.indexOf(alvo);
    if (achou !== certo) throw new Error(`${nome} achou ${achou}, devia ${certo}`);
    return { vetor: v, alvo, posicao: achou, eventos: c.eventos, comparacoes: c.ops.comparacoes || 0, pico: c.pico };
  }

  // ---------- estruturas lineares: as classes do instrumento (simulacao/instrumentos.js) ----------

  const instrumentos = () => (typeof module !== "undefined" && module.exports ? require("./instrumentos.js") : raiz.Instrumentos);
  const ABRE = "([{", PAR = { ")": "(", "]": "[", "}": "{" };

  /** Parênteses balanceados (algoritmos/parenteses/parenteses.py), com a Pilha do instrumento. */
  function parenteses(texto) {
    const c = contador(), pilha = instrumentos().Pilha();
    // s e topo são símbolos (texto de um caractere); da pilha, só o tamanho (os símbolos aparecem na animação)
    const V = c.vars = { s: null, topo: null, certo: true, "tamanho da pilha": 0 };
    let certo = true;
    for (let k = 0; k < texto.length; k++) {
      const s = texto[k];
      Object.assign(V, { s, topo: null });
      c.push({ t: "le", k, s, linha: 3 });
      if (ABRE.includes(s)) {
        c.op("empilhar"); pilha.empilhar(s); c.aloca("simbolos", pilha.n); V["tamanho da pilha"] = pilha.n;
        c.push({ t: "empilha", k, s, linha: 5 });
        continue;
      }
      c.push({ t: "testa", linha: 6 });
      if (pilha.n === 0) { certo = false; V.certo = false; c.push({ t: "erro", k, motivo: "vazia", linha: 7 }); c.push({ t: "pare", linha: 8 }); break; }
      c.op("desempilhar"); const topo = pilha.desempilhar(); c.aloca("simbolos", pilha.n);
      Object.assign(V, { topo, "tamanho da pilha": pilha.n });
      c.push({ t: "desempilha", k, s: topo, linha: 10 });
      c.op("comparacoes");
      c.push({ t: "compara", k, topo, s, linha: 11 });
      if (topo !== PAR[s]) { certo = false; V.certo = false; c.push({ t: "erro", k, motivo: "par", linha: 12 }); c.push({ t: "pare", linha: 13 }); break; }
    }
    c.push({ t: "testa", linha: 14 });
    if (pilha.n > 0) { certo = false; V.certo = false; c.push({ t: "erro", k: texto.length, motivo: "sobra", linha: 15 }); }
    c.push({ t: "devolva", certo, linha: 16 });
    return { texto, certo, eventos: c.eventos, ops: (c.ops.empilhar || 0) + (c.ops.desempilhar || 0),
      comparacoes: c.ops.comparacoes || 0, pico: c.pico, casas: pilha.reg.leituras + pilha.reg.escritas, sobra: pilha.n };
  }

  /** Fila de atendimento (algoritmos/atendimento/atendimento.py), com a Fila circular do instrumento. */
  function atendimento(chegada, duracao) {
    const c = contador(), fila = instrumentos().FilaCircular(), n = chegada.length;
    const esperas = new Array(n).fill(null);
    let livre = 0, soma = 0, maior = 0, i = 0;
    // índices de cliente a partir de 1, como no pseudocódigo; da fila, só o tamanho (quem espera aparece na animação)
    const V = c.vars = { atendimento: null, i: 1, k: null, livre: 0, "início": null, soma: 0, maior: 0, "tamanho da fila": 0 };
    for (let volta = 0; volta < n; volta++) {
      Object.assign(V, { atendimento: volta + 1, k: null, "início": null });
      for (;;) {
        c.push({ t: "testa", linha: 5 });
        if (!(i < n && chegada[i] < livre)) break;
        c.op("enfileirar"); fila.enfileirar(i); c.aloca("fila", fila.n);
        V["tamanho da fila"] = fila.n;
        c.push({ t: "enfileira", i, tempo: chegada[i], casas: fila.casas(), inicio: fila.inicio, linha: 6 });
        i++;
        V.i = i + 1;
        maior = Math.max(maior, fila.n);
        V.maior = maior;
        c.push({ t: "maior", maior, linha: 7 });
      }
      c.push({ t: "testa", linha: 8 });
      let k;
      if (fila.n > 0) {
        c.op("desenfileirar"); k = fila.desenfileirar(); c.aloca("fila", fila.n);
        Object.assign(V, { k: k + 1, "tamanho da fila": fila.n });
        c.push({ t: "chama", k, tempo: livre, casas: fila.casas(), inicio: fila.inicio, linha: 9 });
      } else {
        k = i; i++;
        Object.assign(V, { k: k + 1, i: i + 1 });
        c.push({ t: "direto", k, tempo: chegada[k], linha: 11 });
      }
      const inicio = Math.max(livre, chegada[k]);
      esperas[k] = inicio - chegada[k];
      soma += esperas[k];
      livre = inicio + duracao[k];
      Object.assign(V, { "início": inicio, soma, livre });
      c.push({ t: "atende", k, inicio, fim: livre, espera: esperas[k], linha: 12 });
    }
    c.push({ t: "devolva", linha: 15 });
    return { chegada, duracao, eventos: c.eventos, soma, maior, esperas, pico: c.pico,
      ops: (c.ops.enfileirar || 0) + (c.ops.desenfileirar || 0), casas: fila.reg.leituras + fila.reg.escritas };
  }

  /** Pronto-socorro (algoritmos/prioridade/prioridade.py), com o Heap do instrumento: chave (gravidade, chegada). */
  function prioridade(chegada, duracao, gravidade) {
    const c = contador(), I = instrumentos(), heap = I.Heap(), n = chegada.length;
    const esperas = new Array(n).fill(null), ordem = [];
    let livre = 0, soma = 0, maior = 0, i = 0, acessos = 0;
    // cada operação no heap: soma o custo e guarda as casas que ela escreveu (o caminho que subiu ou desceu)
    const noHeap = (chamada, args) => {
      const r = I.operar(heap, chamada, args);
      acessos += r.leituras + r.escritas;
      return { volta: r.volta, casas: heap.casas().slice(0, heap.n), escritas: [...new Set(r.eventos.filter((e) => e.t === "escreve").map((e) => e.i))] };
    };
    const V = c.vars = { atendimento: null, i: 1, k: null, g: null, livre: 0, "início": null, soma: 0, maior: 0, "tamanho do heap": 0 };
    for (let volta = 0; volta < n; volta++) {
      Object.assign(V, { atendimento: volta + 1, k: null, g: null, "início": null });
      for (;;) {
        c.push({ t: "testa", linha: 5 });
        if (!(i < n && chegada[i] < livre)) break;
        c.op("inserir"); const r = noHeap("inserir", [[gravidade[i], i]]); c.aloca("heap", heap.n);
        V["tamanho do heap"] = heap.n;
        c.push({ t: "insere", i, g: gravidade[i], tempo: chegada[i], ...r, acessos, linha: 6 });
        i++;
        V.i = i + 1;
        maior = Math.max(maior, heap.n);
        V.maior = maior;
        c.push({ t: "maior", maior, linha: 7 });
      }
      c.push({ t: "testa", linha: 8 });
      let k;
      if (heap.n > 0) {
        c.op("tirar"); const r = noHeap("tirar", []); c.aloca("heap", heap.n);
        k = r.volta[1];
        Object.assign(V, { k: k + 1, g: gravidade[k], "tamanho do heap": heap.n });
        c.push({ t: "chama", k, g: gravidade[k], tempo: livre, casas: r.casas, escritas: r.escritas, acessos, linha: 9 });
      } else {
        k = i; i++;
        Object.assign(V, { k: k + 1, g: gravidade[k], i: i + 1 });
        c.push({ t: "direto", k, g: gravidade[k], tempo: chegada[k], linha: 11 });
      }
      const inicio = Math.max(livre, chegada[k]);
      esperas[k] = inicio - chegada[k];
      ordem.push(k);
      soma += esperas[k];
      livre = inicio + duracao[k];
      Object.assign(V, { "início": inicio, soma, livre });
      c.push({ t: "atende", k, g: gravidade[k], inicio, fim: livre, espera: esperas[k], linha: 12 });
    }
    c.push({ t: "devolva", linha: 15 });
    return { chegada, duracao, gravidade, eventos: c.eventos, soma, maior, esperas, ordem, pico: c.pico,
      ops: acessos, operacoes: (c.ops.inserir || 0) + (c.ops.tirar || 0) };
  }

  /** Inverter lista encadeada (algoritmos/inverter/inverter.py), sobre a Lista dinâmica do instrumento.
   *  Os nós nascem na ordem da lista, então o id de cada um é a posição dele na lista de entrada. */
  function inverter(valores) {
    const c = contador(), lista = instrumentos().ListaDinamica();
    for (const x of valores) lista.inserir_fim(x);
    const reg = lista.reg;
    reg.leituras = 0; reg.escritas = 0; reg.eventos = [];   // a entrada é montada fora da conta
    const pos = (p) => (p === null ? null : p.id + 1);       // posições a partir de 1, como no pseudocódigo
    const V = c.vars = { anterior: null, atual: null, "próximo": null, "ponteiros trocados": 0 };
    let anterior = null;
    c.push({ t: "atribui", linha: 2 });
    let atual = lista.inicio;
    V.atual = pos(atual);
    c.push({ t: "atribui", linha: 3 });
    for (;;) {
      c.push({ t: "testa", linha: 4 });
      if (atual === null) break;
      const proximo = lista.leProx(atual);
      V["próximo"] = pos(proximo);
      c.push({ t: "proximo", i: atual.id, linha: 5 });
      lista.escreveProx(atual, anterior);
      c.op("ponteiros");
      V["ponteiros trocados"]++;
      c.push({ t: "vira", i: atual.id, de: anterior === null ? null : anterior.id, linha: 6 });
      anterior = atual;
      V.anterior = pos(anterior);
      c.push({ t: "atribui", linha: 7 });
      atual = proximo;
      V.atual = pos(atual);
      c.push({ t: "atribui", linha: 8 });
    }
    lista.fim = lista.inicio;
    c.push({ t: "atribui", linha: 9 });
    lista.inicio = anterior;
    c.push({ t: "atribui", fim: true, linha: 10 });
    return { valores, invertida: lista.valores(), eventos: c.eventos, ops: c.ops.ponteiros || 0, pico: c.pico,
      casas: reg.leituras + reg.escritas };
  }

  /** Máximo em janela deslizante (algoritmos/janela/janela.py), sobre o Deque do instrumento, que guarda posições. */
  function janela(v, k) {
    const c = contador(), d = instrumentos().Deque(), n = v.length, maximos = [];
    // do deque, o painel mostra as pontas e o tamanho, lidos sem contar (as posições aparecem na animação)
    const V = c.vars = { i: null, "v[i]": null, frente: null, fundo: null, "tamanho do deque": 0, "máximo": null };
    const pontas = () => {
      const p = d.valores();
      Object.assign(V, { frente: p.length ? p[0] + 1 : null, fundo: p.length ? p[p.length - 1] + 1 : null, "tamanho do deque": p.length });
      c.aloca("posicoes", p.length);
    };
    c.push({ t: "atribui", linha: 2 });
    for (let i = 0; i < n; i++) {
      Object.assign(V, { i: i + 1, "v[i]": v[i] });
      c.push({ t: "le", i, linha: 3 });
      c.push({ t: "testa", linha: 4 });
      if (i >= k && d.frente() === i - k) {
        const j = d.tirar_frente(); c.op("deque"); pontas();
        c.push({ t: "tira", j, ponta: "frente", linha: 5 });
      }
      for (;;) {
        if (d.n === 0) { c.push({ t: "testa", linha: 6 }); break; }
        const j = d.fundo();
        c.op("comparacoes");
        c.push({ t: "compara", i, j, linha: 6 });
        if (!(v[j] <= v[i])) break;
        d.tirar_tras(); c.op("deque"); pontas();
        c.push({ t: "tira", j, ponta: "fundo", linha: 7 });
      }
      d.por_tras(i); c.op("deque"); pontas();
      c.push({ t: "poe", i, linha: 8 });
      c.push({ t: "testa", linha: 9 });
      if (i >= k - 1) {
        const m = v[d.frente()];
        maximos.push(m);
        V["máximo"] = m;
        c.push({ t: "maximo", i, m, linha: 10 });
      }
    }
    c.push({ t: "devolva", linha: 11 });
    const ing = janelaIngenua(v, k);
    if (JSON.stringify(ing.maximos) !== JSON.stringify(maximos)) throw new Error("o deque e o ingênuo discordam");
    return { vetor: v, k, maximos, eventos: c.eventos, ops: c.ops.comparacoes || 0, deque: c.ops.deque || 0,
      ingenuo: ing.comparacoes, ingenuoAte: ing.ate, pico: c.pico, casas: d.reg.leituras + d.reg.escritas };
  }

  /** O ingênuo da janela: k − 1 comparações por janela. `ate[a]`: as comparações até a janela a (inclusive). */
  function janelaIngenua(v, k) {
    const maximos = [], ate = [];
    let comparacoes = 0;
    for (let a = 0; a + k <= v.length; a++) {
      let m = v[a];
      for (let j = a + 1; j < a + k; j++) { comparacoes++; if (v[j] > m) m = v[j]; }
      maximos.push(m);
      ate.push(comparacoes);
    }
    return { maximos, comparacoes, ate };
  }

  // ---------- dispersão (algoritmos/palavras, repetidos, encadeamento, sondagem) ----------

  // os eventos do dicionário desde a última vez (o palco os aplica à sua cópia da tabela)
  const eventosDic = (d) => { const ev = d.reg.eventos; d.reg.eventos = []; return ev; };
  // em ordem: da maior contagem para a menor e, no empate, pela palavra (como o sorted do Python)
  const porContagem = (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

  /** Contar palavras (algoritmos/palavras/palavras.py), sobre o Dicionário com sondagem linear. */
  function palavras(p) {
    const c = contador(), d = instrumentos().DicSondagem();
    const V = c.vars = { i: null, "p[i]": null, "d[p[i]]": null, "palavras distintas": 0 };
    c.push({ t: "atribui", linha: 2 });
    for (let i = 0; i < p.length; i++) {
      const x = p[i];
      Object.assign(V, { i: i + 1, "p[i]": x, "d[p[i]]": null });
      c.push({ t: "le", i, linha: 3 });
      const tem = d.tem(x);
      c.push({ t: "busca", i, achou: tem, dic: eventosDic(d), gasto: d.reg.leituras + d.reg.escritas, linha: 4 });
      if (tem) {
        const k = d.ler(x) + 1;
        d.por(x, k);
        V["d[p[i]]"] = k;
        c.push({ t: "conta", i, dic: eventosDic(d), gasto: d.reg.leituras + d.reg.escritas, linha: 5 });
      } else {
        d.por(x, 1);
        Object.assign(V, { "d[p[i]]": 1, "palavras distintas": d.n });
        c.push({ t: "poe", i, dic: eventosDic(d), gasto: d.reg.leituras + d.reg.escritas, linha: 7 });
      }
      c.aloca("palavras", d.n); c.aloca("contagens", d.n);
    }
    c.push({ t: "devolva", linha: 8 });
    return { n: p.length, d: d.n, m: d.m, ops: d.reg.leituras + d.reg.escritas, comparacoes: d.reg.comparacoes, pico: c.pico,
      contagens: d.valores().sort(porContagem), eventos: c.eventos };
  }

  /** Achar repetidos (algoritmos/repetidos/repetidos.py): o dicionário anima; a versão com o vetor só conta. */
  function repetidos(v) {
    const c = contador(), d = instrumentos().DicSondagem(), rep = [];
    const V = c.vars = { i: null, "v[i]": null, "repetido[i]": null, "valores no dicionário": 0 };
    c.push({ t: "atribui", linha: 2 });
    for (let i = 0; i < v.length; i++) {
      Object.assign(V, { i: i + 1, "v[i]": v[i], "repetido[i]": null });
      c.push({ t: "le", i, linha: 3 });
      const tem = d.tem(v[i]);
      c.push({ t: "busca", i, achou: tem, dic: eventosDic(d), comps: d.reg.comparacoes, linha: 4 });
      if (tem) {
        rep.push(true); V["repetido[i]"] = true;
        c.push({ t: "achou", i, linha: 5 });
      } else {
        rep.push(false); V["repetido[i]"] = false;
        c.push({ t: "atribui", i, linha: 7 });
        d.por(v[i], true);
        V["valores no dicionário"] = d.n;
        c.aloca("chaves", d.n);
        c.push({ t: "poe", i, dic: eventosDic(d), comps: d.reg.comparacoes, linha: 8 });
      }
    }
    c.push({ t: "devolva", linha: 9 });
    const ve = repetidosVetor(v);
    if (JSON.stringify(ve.repetido) !== JSON.stringify(rep)) throw new Error("o dicionário e o vetor discordam");
    return { repetido: rep, ops: d.reg.comparacoes, ops_vetor: ve.comparacoes, vetorAte: ve.ate, pico: c.pico,
      casas: d.reg.leituras + d.reg.escritas, eventos: c.eventos };
  }

  /** Sem dicionário: cada valor contra os anteriores, até achar um igual. `ate[i]`: as comparações até a posição i (inclusive). */
  function repetidosVetor(v) {
    const repetido = [], ate = [];
    let comparacoes = 0;
    for (let i = 0; i < v.length; i++) {
      let achou = false;
      for (let j = 0; j < i; j++) { comparacoes++; if (v[j] === v[i]) { achou = true; break; } }
      repetido.push(achou); ate.push(comparacoes);
    }
    return { repetido, comparacoes, ate };
  }

  /** Colisão por encadeamento (algoritmos/encadeamento): as chaves, uma a uma, numa tabela de 2^bits casas fixas. */
  function encadeamento(chaves, bits) {
    const c = contador(), I_ = instrumentos(), t = I_.DicEncadeamento(undefined, bits, true), sondagens = [];
    c.aloca("tabela", t.m);
    const V = c.vars = { k: null, i: null, "sondagens desta chave": 0, n: 0 };
    let id = 0;
    for (const k of chaves) {
      let s = 1;
      const i = I_.casaDe(k, t.bits);
      Object.assign(V, { k, i: i + 1, "sondagens desta chave": 0 });
      c.push({ t: "dispersa", k, i, linha: 2 });
      let p = t.leCabeca(i), pos = 0;
      V["sondagens desta chave"] = s;
      c.push({ t: "inicio", k, i, pos, linha: 3 });
      for (;;) {
        c.push({ t: "testa", linha: 4 });
        if (p === null) break;
        c.push({ t: "compara", k, i, pos, linha: 5 });
        if (t.leChave(p) === k) { c.push({ t: "pare", linha: 6 }); break; }
        p = t.leProx(p); s++; pos++;
        V["sondagens desta chave"] = s;
        c.push({ t: "avanca", k, i, pos, linha: 7 });
      }
      c.push({ t: "testa", linha: 8 });
      if (p === null) {
        p = { id: id++, chave: null, valor: null, prox: null };
        t.escreve(p, "chave", k); t.escreve(p, "valor", k); t.escreve(p, "prox", t.leCabeca(i));
        c.push({ t: "poe", k, i, linha: 9 });
        t.escreveCabeca(i, p);
        t.n++; V.n = t.n;
        c.aloca("nos", 3 * t.n);
        c.push({ t: "liga", k, i, linha: 10 });
      }
      c.push({ t: "devolva", k, i, linha: 11 });
      sondagens.push(s);
    }
    return { sondagens, ops: sondagens.reduce((a, b) => a + b, 0), pico: c.pico, casas: t.reg.leituras + t.reg.escritas,
      tabela: t.valores(), m: t.m, eventos: c.eventos };
  }

  /** Colisão por sondagem linear (algoritmos/sondagem): as chaves, uma a uma, numa tabela de 2^bits casas fixas. */
  function sondagem(chaves, bits) {
    const c = contador(), I_ = instrumentos(), t = I_.DicSondagem(undefined, bits, true), sondagens = [];
    c.aloca("tabela", 2 * t.m);
    const V = c.vars = { k: null, i: null, "sondagens desta chave": 0, n: 0 };
    for (const k of chaves) {
      let i = I_.casaDe(k, t.bits), s = 1;
      Object.assign(V, { k, i: i + 1, "sondagens desta chave": 0 });
      c.push({ t: "dispersa", k, i, linha: 2 });
      let x = t.leChave(i);
      V["sondagens desta chave"] = s;
      c.push({ t: "sonda", k, i, ocupada: x !== null, linha: 3 });
      while (x !== null) {
        c.push({ t: "compara", k, i, linha: 4 });
        if (x === k) { c.push({ t: "pare", linha: 5 }); break; }
        i = (i + 1) % t.m; V.i = i + 1;
        c.push({ t: "avanca", k, i, linha: 6 });
        x = t.leChave(i); s++;
        V["sondagens desta chave"] = s;
        c.push({ t: "sonda", k, i, ocupada: x !== null, linha: 3 });
      }
      c.push({ t: "testa", linha: 7 });
      if (x === null) {
        t.escreveChave(i, k); t.escreveValor(i, k); t.n++; V.n = t.n;
        c.push({ t: "poe", k, i, linha: 8 });
      }
      c.push({ t: "devolva", k, i, linha: 9 });
      sondagens.push(s);
    }
    return { sondagens, ops: sondagens.reduce((a, b) => a + b, 0), pico: c.pico, casas: t.reg.leituras + t.reg.escritas,
      tabela: t.valores(), m: t.m, eventos: c.eventos };
  }

  // ---------- árvores (algoritmos/percursos, algoritmos/abb, algoritmos/avl) ----------
  // Rodam sobre as árvores do instrumento (simulacao/instrumentos.js). Os nós
  // têm id de criação; os eventos que mudam a forma levam um retrato da árvore
  // (`nos`: todos os nós vivos, com esq e dir como ids, e a `raiz`), que o palco
  // desenha. No meio de uma rotação o retrato pode estar "quebrado" (um nó sem pai).

  // a árvore comum com os valores na ordem dada, montada fora da conta
  function arvoreComum(valores) {
    const a = instrumentos().ArvoreComum();
    for (const x of valores) a.inserir(x);
    a.reg.leituras = 0; a.reg.escritas = 0; a.reg.eventos = [];
    return a;
  }

  // retrato de todos os nós guardados em `vivos` (Map id → nó)
  const retrato = (vivos, raiz) => ({ raiz: raiz ? raiz.id : null,
    nos: [...vivos.values()].map((p) => ({ id: p.id, valor: p.valor, esq: p.esq && p.esq.id, dir: p.dir && p.dir.id, altura: p.altura })) });
  const nosDe = (a) => { const m = new Map(), pilha = a.raiz ? [a.raiz] : []; while (pilha.length) { const p = pilha.pop(); m.set(p.id, p); if (p.esq) pilha.push(p.esq); if (p.dir) pilha.push(p.dir); } return m; };

  /** Percursos (algoritmos/percursos/percursos.py): a descida recursiva que dá
   *  pré, em e pós-ordem; depois, a em largura com a Fila circular. */
  function percursos(valores) {
    const c = contador(), a = arvoreComum(valores), reg = a.reg;
    const ordens = { pre: [], em: [], pos: [] }, nos = retrato(nosDe(a), a.raiz);
    c.vars = {};
    const percorrer = (p, linha) => {
      const V = { "p.valor": p ? p.valor : null, "pré-ordem": ordens.pre.length, "em-ordem": ordens.em.length, "pós-ordem": ordens.pos.length };
      c.entra(p ? p.id : null, null, linha, V);
      c.push({ t: "testa", no: p ? p.id : null, linha: 2 });
      if (p !== null) {
        c.op("visitas");
        const v = a.leValor(p);
        const anota = (ordem, l) => { ordens[ordem].push(v); V[{ pre: "pré-ordem", em: "em-ordem", pos: "pós-ordem" }[ordem]] = ordens[ordem].length; c.push({ t: "visita", no: p.id, ordem, linha: l }); };
        anota("pre", 3);
        percorrer(a.leEsq(p), 4);
        anota("em", 5);
        percorrer(a.leDir(p), 6);
        anota("pos", 7);
      }
      c.sai();
    };
    percorrer(a.raiz, 1);
    const pilha = c.pico, casas = reg.leituras;
    // a em largura: fora do pseudocódigo (sem linha), com a fila circular do instrumento Fila
    const fila = instrumentos().FilaCircular(), largura = [];
    let filaPico = 0;
    const V = c.vars = { "p.valor": null, "tamanho da fila": 0 };
    const poe = (p) => { fila.enfileirar(p); filaPico = Math.max(filaPico, fila.n); V["tamanho da fila"] = fila.n; c.push({ t: "enfileira", no: p.id, fila: fila.valores().map((q) => q.id) }); };
    if (a.raiz !== null) poe(a.raiz);
    while (fila.n > 0) {
      const p = fila.desenfileirar();
      V["tamanho da fila"] = fila.n;
      largura.push(a.leValor(p));
      V["p.valor"] = p.valor;
      c.push({ t: "visita", no: p.id, ordem: "largura", fila: fila.valores().map((q) => q.id) });
      for (const f of [a.leEsq(p), a.leDir(p)]) if (f !== null) poe(f);
    }
    return { valores, ...ordens, largura, visitas: c.ops.visitas || 0, pilha, fila: filaPico, casas, altura: a.altura(), nos, eventos: c.eventos, pico: Math.max(pilha, filaPico) };
  }

  /** Busca em árvore (algoritmos/abb/abb.py): monta a comum com os valores e busca cada alvo. */
  function buscaArvore(valores, alvos = valores) {
    const c = contador(), a = arvoreComum([]), reg = a.reg;
    // a montagem não conta, mas o palco a mostra nó por nó
    const vivos = new Map();
    for (const x of valores) {
      a.inserir(x);
      for (const [id, p] of nosDe(a)) vivos.set(id, p);
      c.push({ t: "monta", x, ...retrato(vivos, a.raiz) });
    }
    reg.leituras = 0; reg.escritas = 0; reg.eventos = [];
    c.aloca("arvore", a.capacidade);
    const comparacoes = [], achou = [];
    const V = c.vars = { x: null, "p.valor": null, "comparações": 0 };
    alvos.forEach((x, k) => {
      const antes = c.ops.comparacoes || 0;
      Object.assign(V, { x, "p.valor": null, "comparações": 0 });
      const compara = (no, linha) => { c.op("comparacoes"); V["comparações"]++; c.push({ t: "compara", no, k, linha }); };
      let p = a.raiz, r = false;
      V["p.valor"] = p ? p.valor : null;
      c.push({ t: "atribui", no: p ? p.id : null, k, linha: 2 });
      for (;;) {
        c.push({ t: "testa", no: p ? p.id : null, k, linha: 3 });
        if (p === null) break;
        const v = a.leValor(p);
        compara(p.id, 4);
        if (x === v) { r = true; c.push({ t: "achou", no: p.id, k, linha: 5 }); c.push({ t: "pare", no: p.id, k, linha: 6 }); break; }
        compara(p.id, 7);
        if (x < v) p = a.leEsq(p); else p = a.leDir(p);
        V["p.valor"] = p ? p.valor : null;
        c.push({ t: "desce", no: p ? p.id : null, k, linha: x < v ? 8 : 10 });
      }
      c.push({ t: "devolva", k, achou: r, linha: 11 });
      comparacoes.push((c.ops.comparacoes || 0) - antes);
      achou.push(r);
    });
    return { valores, alvos, comparacoes, achou, ops: c.ops.comparacoes || 0, altura: a.altura(), pico: c.pico, casas: reg.leituras, eventos: c.eventos };
  }

  /** AVL (algoritmos/avl/avl.py): insere um por um na AVL do instrumento, equilibrando na volta. */
  function avl(valores) {
    const c = contador(), I = instrumentos(), a = I.ArvoreAVL(), reg = a.reg;
    const vivos = new Map();
    const foto = (e) => c.push({ ...e, ...retrato(vivos, a.raiz) });
    let rotacoes = 0, naVolta = false, depoisDoGiro = false, ligaPendente = null;
    const comparacoes = [];
    // os retratos da rotação saem na hora em que o instrumento avisa: "gira" antes de reescrever
    // os ponteiros, "girou" depois; na dupla, a religação entre as duas rotações também
    const eventos = [];
    eventos.push = (ev) => {
      Array.prototype.push.call(eventos, ev);
      if (!naVolta) return;
      if (ligaPendente) { foto(ligaPendente); ligaPendente = null; }   // o escreve avisa antes de gravar
      if (ev.t === "gira") { depoisDoGiro = false; foto({ t: "gira", lado: ev.lado, no: ev.no, sobe: ev.sobe, linha: 13 }); }
      else if (ev.t === "girou") { rotacoes++; depoisDoGiro = true; foto({ t: "girou", lado: ev.lado, no: ev.no, sobe: ev.sobe, linha: 13 }); }
      else if (depoisDoGiro && ev.t === "escreve" && (ev.campo === "esq" || ev.campo === "dir")) {
        depoisDoGiro = false;
        ligaPendente = { t: "liga", no: ev.no, lado: ev.campo, linha: 13 };
      }
    };
    reg.eventos = eventos;
    const inserir = (p, x, linha) => {
      const V = { x, "p.valor": p ? p.valor : null, "altura de p": p ? p.altura : null };
      c.entra(p ? p.id : null, null, linha, V);
      c.push({ t: "testa", no: p ? p.id : null, linha: 2 });
      if (p === null) {
        p = a.nova(x);
        vivos.set(p.id, p);
        Object.assign(V, { "p.valor": x, "altura de p": 1 });
        foto({ t: "novo", no: p.id, linha: 3 });
      } else {
        const v = a.leValor(p);
        c.op("comparacoes");
        c.push({ t: "compara", no: p.id, linha: 4 });
        if (x !== v) {
          c.op("comparacoes");
          c.push({ t: "compara", no: p.id, linha: 5 });
          if (x < v) {
            const e = a.leEsq(p), f = inserir(e, x, 6);
            c.push({ t: "testa", no: p.id, linha: 7 });
            if (f !== e) { a.escreveEsq(p, f); foto({ t: "liga", no: p.id, lado: "esq", linha: 8 }); }
          } else {
            const d = a.leDir(p), f = inserir(d, x, 10);
            c.push({ t: "testa", no: p.id, linha: 11 });
            if (f !== d) { a.escreveDir(p, f); foto({ t: "liga", no: p.id, lado: "dir", linha: 12 }); }
          }
          // equilibra(p): as alturas e, se precisar, as rotações; os eventos do instrumento dizem quais
          const q = p;
          naVolta = true;
          p = a.equilibra(p);
          naVolta = false; depoisDoGiro = false;
          if (ligaPendente) { foto(ligaPendente); ligaPendente = null; }
          Object.assign(V, { "p.valor": p.valor, "altura de p": p.altura });
          foto({ t: "equilibra", no: q.id, sobe: p.id, linha: 13 });
        }
      }
      c.push({ t: "devolva", no: p.id, linha: 14 });
      c.sai();
      return p;
    };
    valores.forEach((x, k) => {
      c.aloca("arvore", 4 * (a.n + 1));      // o nó novo já conta
      const antes = c.ops.comparacoes || 0;
      const r = inserir(a.raiz, x, 1);
      a.raiz = r;                            // a raiz fica à parte: não conta
      a.n++;
      comparacoes.push((c.ops.comparacoes || 0) - antes);
      foto({ t: "inseriu", k, x });
    });
    // a árvore comum com os mesmos valores, contando as mesmas comparações (avl.py:inserir_comum)
    const b = I.ArvoreComum();
    let comum = 0;
    const porComum = [];
    for (const x of valores) {
      const antes = comum;
      let p = b.raiz;
      while (p !== null) { comum++; if (x === p.valor) break; comum++; p = x < p.valor ? p.esq : p.dir; }
      b.inserir(x);
      porComum.push(comum - antes);
    }
    return { valores, comparacoes, ops: c.ops.comparacoes || 0, rotacoes, altura: a.altura(), comum, porComum, altura_comum: b.altura(),
      casas: reg.leituras + reg.escritas, pico: c.pico, eventos: c.eventos };
  }

  /** n valores distintos (de 10 a 99), como motor/arvores.py:valores (com outro sorteador):
   *  crescente, decrescente, embaralhada ou na ordem que monta a árvore cheia. */
  function valoresArvore(n, caso, semente) {
    const r = sorteador(semente), faixa = Array.from({ length: 90 }, (_, i) => 10 + i);
    for (let i = faixa.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = faixa[i]; faixa[i] = faixa[j]; faixa[j] = x; }
    const v = faixa.slice(0, n).sort((a, b) => a - b);
    if (caso === "crescente") return v;
    if (caso === "decrescente") return v.reverse();
    if (caso === "cheia") {
      const ordem = [], fila = n ? [[0, n - 1]] : [];
      while (fila.length) { const [a, b] = fila.shift(); if (a > b) continue; const m = (a + b) >> 1; ordem.push(v[m]); fila.push([a, m - 1], [m + 1, b]); }
      return ordem;
    }
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = v[i]; v[i] = v[j]; v[j] = x; }
    return v;
  }

  // ---------- grafos (algoritmos/largura, algoritmos/profundidade) ----------

  // a lista de adjacência do instrumento Grafo, montada sem entrar na conta
  function listaDe(V, arestas) {
    const g = instrumentos().GrafoLista(undefined, V);
    for (const [u, v] of arestas) g.por(u, v);
    g.reg.leituras = 0; g.reg.escritas = 0; g.reg.eventos = [];
    return g;
  }
  const rotulo = (v) => (v === null ? null : v + 1);   // vértices a partir de 1, como no pseudocódigo

  /** Busca em largura a partir do vértice 0, com a Fila circular do instrumento. */
  function largura(V, arestas) {
    const c = contador(), g = listaDe(V, arestas), fila = instrumentos().FilaCircular();
    const dist = new Array(V).fill(null);       // null = ∞, ainda não visto
    c.aloca("dist", V);
    const d = (x) => (x === null ? "∞" : x);
    const vars = c.vars = { u: null, v: null, "dist[u]": null, "dist[v]": null, "tamanho da fila": 0 };
    const enfileira = (v, linha) => {
      c.op("enfileirar"); fila.enfileirar(v); c.aloca("fila", fila.n); vars["tamanho da fila"] = fila.n;
      c.push({ t: "enfileira", v, linha });
    };
    c.push({ t: "atribui", linha: 2 });
    dist[0] = 0;
    enfileira(0, 3);
    const visitas = [];
    for (;;) {
      c.push({ t: "testa", linha: 4 });
      if (fila.n === 0) break;
      c.op("desenfileirar"); const u = fila.desenfileirar(); c.aloca("fila", fila.n);
      visitas.push(u);
      Object.assign(vars, { u: rotulo(u), v: null, "dist[u]": dist[u], "dist[v]": null, "tamanho da fila": fila.n });
      c.push({ t: "visita", u, linha: 5 });
      for (let i = 0; i < g.grau(u); i++) {
        c.op("vizinhos"); const v = g.vizinho(u, i);
        Object.assign(vars, { v: rotulo(v), "dist[v]": d(dist[v]) });
        c.push({ t: "olha", u, v, linha: 6 });
        c.push({ t: "compara", v, linha: 7 });
        if (dist[v] === null) {
          dist[v] = dist[u] + 1;
          vars["dist[v]"] = dist[v];
          c.push({ t: "atribui", v, d: dist[v], linha: 8 });
          enfileira(v, 9);
        }
      }
    }
    c.push({ t: "devolva", linha: 10 });
    return { V, arestas, dist, visitas, eventos: c.eventos, pico: c.pico, estrutura: c.pico - V,
      ops: (c.ops.enfileirar || 0) + (c.ops.desenfileirar || 0) + (c.ops.vizinhos || 0),
      casas: g.reg.leituras + g.reg.escritas + fila.reg.leituras + fila.reg.escritas };
  }

  /** Busca em profundidade a partir do vértice 0: topo + próximo vizinho, com a Pilha do instrumento. */
  function profundidade(V, arestas) {
    const c = contador(), g = listaDe(V, arestas), pilha = instrumentos().Pilha();
    const ordem = new Array(V).fill(0), proximo = new Array(V).fill(0);
    c.aloca("ordem", V); c.aloca("proximo", V);
    // próximo[u] a partir de 1, como no pseudocódigo
    const vars = c.vars = { u: null, v: null, "próximo[u]": null, "grau(u)": null, "ordem[v]": null, k: null, "tamanho da pilha": 0 };
    const empilha = (v, linha) => {
      c.op("empilhar"); pilha.empilhar(v); c.aloca("pilha", pilha.n); vars["tamanho da pilha"] = pilha.n;
      c.push({ t: "empilha", v, linha });
    };
    c.push({ t: "atribui", linha: 2 });
    let k = 1;
    ordem[0] = k;
    vars.k = k;
    empilha(0, 3);
    const visitas = [0];
    for (;;) {
      c.push({ t: "testa", linha: 4 });
      if (pilha.n === 0) break;
      c.op("topo"); const u = pilha.topo();
      Object.assign(vars, { u: rotulo(u), v: null, "próximo[u]": proximo[u] + 1, "grau(u)": g.grau(u), "ordem[v]": null });
      c.push({ t: "topo", u, linha: 5 });
      c.push({ t: "testa", linha: 6 });
      if (proximo[u] < g.grau(u)) {
        c.op("vizinhos"); const v = g.vizinho(u, proximo[u]);
        Object.assign(vars, { v: rotulo(v), "ordem[v]": ordem[v] });
        c.push({ t: "olha", u, v, linha: 7 });
        proximo[u]++;
        vars["próximo[u]"] = proximo[u] + 1;
        c.push({ t: "avanca", u, linha: 8 });
        c.push({ t: "compara", v, linha: 9 });
        if (ordem[v] === 0) {
          k++; ordem[v] = k;
          Object.assign(vars, { k, "ordem[v]": k });
          c.push({ t: "atribui", v, k, linha: 10 });
          empilha(v, 11);
          visitas.push(v);
        }
      } else {
        c.op("desempilhar"); pilha.desempilhar(); c.aloca("pilha", pilha.n); vars["tamanho da pilha"] = pilha.n;
        c.push({ t: "desempilha", u, linha: 13 });
      }
    }
    c.push({ t: "devolva", linha: 14 });
    return { V, arestas, ordem, visitas, eventos: c.eventos, pico: c.pico, estrutura: c.pico - 2 * V,
      ops: (c.ops.empilhar || 0) + (c.ops.desempilhar || 0) + (c.ops.topo || 0) + (c.ops.vizinhos || 0),
      casas: g.reg.leituras + g.reg.escritas + pilha.reg.leituras + pilha.reg.escritas };
  }

  /** Dijkstra a partir do vértice 0 (algoritmos/dijkstra/dijkstra.py): a lista de adjacência guarda o par
   *  (vizinho, peso) em cada casa; o Heap guarda pares (distância, vértice); o par vencido é descartado. */
  function dijkstra(V, arestas, pesos) {
    const c = contador(), I = instrumentos(), heap = I.Heap(), g = I.GrafoLista(undefined, V);
    arestas.forEach(([u, v], j) => { g.listas[u].anexar([v, pesos[j]]); g.listas[v].anexar([u, pesos[j]]); g.E++; });
    g.reg.leituras = 0; g.reg.escritas = 0; g.reg.eventos = [];
    const dist = new Array(V).fill(Infinity), ordem = [];
    c.aloca("dist", V);
    let noHeap = 0, descartados = 0;
    // cada operação no heap: soma o custo e guarda o heap depois dela e as casas que ela escreveu
    const opHeap = (chamada, args) => {
      const r = I.operar(heap, chamada, args);
      noHeap += r.leituras + r.escritas;
      return { volta: r.volta, casas: heap.casas().slice(0, heap.n), escritas: [...new Set(r.eventos.filter((e) => e.t === "escreve").map((e) => e.i))] };
    };
    const acessos = () => noHeap + g.reg.leituras + g.reg.escritas;
    const D = (x) => (x === Infinity ? "∞" : x);
    const vars = c.vars = { u: null, d: null, v: null, w: null, "dist[u]": null, "dist[v]": null, "tamanho do heap": 0 };
    const insere = (v, linha) => {
      c.op("inserir"); const r = opHeap("inserir", [[dist[v], v]]); c.aloca("heap", heap.n); vars["tamanho do heap"] = heap.n;
      c.push({ t: "insere", v, d: dist[v], ...r, acessos: acessos(), linha });
    };
    c.push({ t: "atribui", linha: 2 });
    dist[0] = 0;
    insere(0, 3);
    for (;;) {
      c.push({ t: "testa", linha: 4 });
      if (heap.n === 0) break;
      c.op("tirar"); const r = opHeap("tirar", []); c.aloca("heap", heap.n);
      const [d, u] = r.volta;
      Object.assign(vars, { u: rotulo(u), d, v: null, w: null, "dist[u]": D(dist[u]), "dist[v]": null, "tamanho do heap": heap.n });
      c.push({ t: "tira", u, d, casas: r.casas, escritas: r.escritas, acessos: acessos(), linha: 5 });
      c.push({ t: "compara", u, linha: 6 });
      if (d === dist[u]) {
        ordem.push(u);
        for (let i = 0; i < g.grau(u); i++) {
          c.op("vizinhos"); const [v, w] = g.vizinho(u, i);
          Object.assign(vars, { v: rotulo(v), w, "dist[v]": D(dist[v]) });
          c.push({ t: "olha", u, v, w, acessos: acessos(), linha: 7 });
          c.push({ t: "compara", v, linha: 8 });
          if (d + w < dist[v]) {
            dist[v] = d + w;
            vars["dist[v]"] = dist[v];
            c.push({ t: "atribui", v, d: dist[v], pai: u, linha: 9 });
            insere(v, 10);
          }
        }
      } else {
        c.op("descartados"); descartados++;
        c.push({ t: "descarta", u, d, linha: 12 });
      }
    }
    c.push({ t: "devolva", linha: 13 });
    return { V, arestas, pesos, dist: dist.map((x) => (x === Infinity ? null : x)), ordem, eventos: c.eventos, pico: c.pico, estrutura: c.pico - V,
      ops: acessos(), operacoes: (c.ops.inserir || 0) + (c.ops.tirar || 0), vizinhos: c.ops.vizinhos || 0, descartados };
  }

  // ---------- estatística (algoritmos/mediana, algoritmos/welford, algoritmos/histograma) ----------

  /** Mediana por quickselect (algoritmos/mediana/mediana.py): a partição do quick sort, sem recursão. */
  function mediana(vetor) {
    const c = contador(), v = vetor.slice(), n = v.length, k = Math.floor((n - 1) / 2);
    const V = c.vars = { k: k + 1, a: 1, b: n, "pivô": null, i: null, j: null, m: null, resposta: null };
    let a = 0, b = n - 1;
    c.push({ t: "corta", a, b, linha: 3 });
    for (;;) {
      testa(c, 4);
      if (!(a < b)) break;
      V["pivô"] = v[b];
      c.push({ t: "pivo", p: b, a, b, linha: 5 });
      let i = a;
      V.i = i + 1;
      for (let j = a; j < b; j++) {
        V.j = j + 1;
        if (maior(v, b, j, c, 8)) { troca(v, i, j, c, 9); i++; V.i = i + 1; }
      }
      V.j = null;
      troca(v, i, b, c, 11);
      testa(c, 12);
      if (i === k) { c.push({ t: "pare", linha: 13 }); break; }
      testa(c, 14);
      if (i < k) { a = i + 1; V.a = a + 1; c.push({ t: "corta", a, b, linha: 15 }); }
      else { b = i - 1; V.b = b + 1; c.push({ t: "corta", a, b, linha: 17 }); }
    }
    let resposta = v[k];
    V.resposta = resposta;
    c.push({ t: "atribui", linha: 18 });
    testa(c, 19);
    if (n % 2 === 0) {
      let m = k + 1;
      V.m = m + 1;
      c.push({ t: "menor", m, linha: 20 });
      for (let j = k + 2; j < n; j++) {
        V.j = j + 1;
        if (maior(v, m, j, c, 22)) { m = j; V.m = m + 1; c.push({ t: "menor", m, linha: 23 }); }
      }
      V.j = null;
      resposta = (v[k] + v[m]) / 2;
      V.resposta = resposta;
      c.push({ t: "atribui", m, linha: 24 });
    }
    c.push({ t: "devolva", linha: 25 });
    return { vetor: vetor.slice(), final: v, k, mediana: resposta, eventos: c.eventos,
      comparacoes: c.ops.comparacoes || 0, trocas: c.ops.trocas || 0, pico: c.pico };
  }

  /** Média e variância em uma passada (algoritmos/welford/welford.py). */
  function welford(x) {
    const c = contador();
    let n = 0, media = 0, m2 = 0;
    const V = c.vars = { n: 0, x: null, "δ": null, "média": 0, M2: 0 };
    for (let i = 0; i < x.length; i++) {
      c.op("leituras");
      V.x = x[i];
      c.push({ t: "le", i, linha: 3 });
      n += 1;
      const delta = x[i] - media;
      media += delta / n;
      Object.assign(V, { n, "δ": delta, "média": media });
      c.push({ t: "atribui", i, linha: 6 });
      m2 += delta * (x[i] - media);
      V.M2 = m2;
      c.push({ t: "atribui", i, linha: 7 });
    }
    c.push({ t: "devolva", linha: 8 });
    return { media, variancia: m2 / (n - 1), eventos: c.eventos, leituras: c.ops.leituras || 0, pico: c.pico };
  }

  /** As duas contas com que o Welford é comparado, na mesma ordem do Python (leituras e pico, sem eventos). */
  function somaDosQuadrados(x) {
    let n = 0, s1 = 0, s2 = 0;
    for (const v of x) { n += 1; s1 += v; s2 += v * v; }
    return { media: s1 / n, variancia: (s2 - s1 * s1 / n) / (n - 1), leituras: n, pico: 0 };
  }

  function duasPassadas(x) {
    let s = 0;
    for (const v of x) s += v;
    const media = s / x.length;
    let q = 0;
    for (const v of x) { const d = v - media; q += d * d; }
    return { media, variancia: q / (x.length - 1), leituras: 2 * x.length, pico: x.length };
  }

  // o pretty() do R (src/appl/pretty.c), como algoritmos/histograma/histograma.py
  const EPS = 2 ** -52, FOLGA = 1e-7;
  const sturges = (n) => Math.ceil(Math.log2(n) + 1);
  const potencia10 = (e) => (e >= 0 ? 10 ** e : 1 / 10 ** -e);
  function pretty(menor, maior, ndiv, minN = 1, h = 1.5, h5 = 2.75) {
    const dx = maior - menor;
    let cell, pequeno;
    if (dx === 0 && maior === 0) { cell = 1; pequeno = true; }
    else {
      cell = Math.max(Math.abs(menor), Math.abs(maior));
      let u = 1 + (h5 >= 1.5 * h + 0.5 ? 1 / (1 + h) : 1.5 / (1 + h5));
      u *= Math.max(1, ndiv) * EPS;
      pequeno = dx < cell * u * 3;
    }
    if (pequeno) { if (cell > 10) cell = 9 + cell / 10; cell *= 0.75; if (minN > 1) cell /= minN; }
    else { cell = dx; if (ndiv > 1) cell /= ndiv; }
    const base = potencia10(Math.floor(Math.log10(cell)));
    let unit = base;
    if (2 * base - cell < h * (cell - unit)) {
      unit = 2 * base;
      if (5 * base - cell < h5 * (cell - unit)) {
        unit = 5 * base;
        if (10 * base - cell < h * (cell - unit)) unit = 10 * base;
      }
    }
    let ns = Math.floor(menor / unit + 1e-10), nu = Math.ceil(maior / unit - 1e-10);
    while (ns * unit > menor + 1e-10 * unit) ns--;
    while (nu * unit < maior - 1e-10 * unit) nu++;
    let k = Math.trunc(0.5 + nu - ns);
    if (k < minN) {
      k = minN - k;
      if (ns >= 0) { nu += Math.floor(k / 2); ns -= Math.floor(k / 2) + (k % 2); }
      else { ns -= Math.floor(k / 2); nu += Math.floor(k / 2) + (k % 2); }
    }
    return { a: ns * unit, b: nu * unit, h: unit };
  }

  /** Histograma com as classes do hist() do R (algoritmos/histograma/histograma.py). */
  function histograma(x) {
    const c = contador(), n = x.length;
    c.op("leituras");
    let menor = x[0], maior = x[0];
    const V = c.vars = { i: 1, "x[i]": x[0], menor, maior, c: null, a: null, h: null, j: null, "contagens[j]": null };
    c.push({ t: "atribui", i: 0, linha: 2 });
    for (let i = 1; i < n; i++) {
      c.op("leituras");
      Object.assign(V, { i: i + 1, "x[i]": x[i] });
      c.push({ t: "le", i, linha: 3 });
      if (x[i] < menor) { menor = x[i]; V.menor = menor; c.push({ t: "menor", i, linha: 5 }); }
      else if (x[i] > maior) { maior = x[i]; V.maior = maior; c.push({ t: "maior", i, linha: 7 }); }
    }
    const p = pretty(menor, maior, sturges(n)), a = p.a, h = p.h, nc = Math.round((p.b - p.a) / p.h);
    Object.assign(V, { i: null, "x[i]": null, c: nc, a, h });
    c.push({ t: "classes", linha: 8 });
    const contagens = new Array(nc).fill(0);
    c.aloca("contagens", nc);
    c.push({ t: "atribui", linha: 9 });
    const folga = FOLGA * (nc <= 2 ? (maior - menor) / h : 1);   // o diddle do hist(): com até 2 classes, vale a amplitude dos dados
    for (let i = 0; i < n; i++) {
      c.op("leituras");
      let j = Math.ceil((x[i] - a) / h - folga);
      Object.assign(V, { i: i + 1, "x[i]": x[i], j, "contagens[j]": j >= 1 ? contagens[j - 1] : null });
      c.push({ t: "classe", i, linha: 11 });
      if (j < 1) { j = 1; Object.assign(V, { j, "contagens[j]": contagens[0] }); c.push({ t: "atribui", i, linha: 13 }); }
      contagens[j - 1] += 1;
      V["contagens[j]"] = contagens[j - 1];
      c.push({ t: "conta", i, j: j - 1, linha: 14 });
    }
    c.push({ t: "devolva", linha: 15 });
    return { x, menor, maior, a, h, c: nc, contagens, eventos: c.eventos, ops: c.ops.leituras || 0, pico: c.pico };
  }

  // ---------- primeiros passos ----------

  /** Máximo de um vetor (algoritmos/maximo/maximo.py): n − 1 comparações; as trocas do maior dependem da ordem. */
  function maximo(v) {
    const c = contador();
    let m = v[0], trocas = 0;
    const V = c.vars = { m, i: null, "v[i]": null };
    c.push({ t: "atribui", i: 0, linha: 2 });
    for (let i = 1; i < v.length; i++) {
      Object.assign(V, { i: i + 1, "v[i]": v[i] });
      c.push({ t: "le", i, linha: 3 });
      c.op("comparacoes");
      c.push({ t: "compara", i, linha: 4 });
      if (v[i] > m) { m = v[i]; trocas++; V.m = m; c.push({ t: "troca", i, linha: 5 }); }
    }
    c.push({ t: "devolva", linha: 6 });
    return { maximo: m, ops: c.ops.comparacoes || 0, trocas, pico: c.pico, eventos: c.eventos };
  }

  /** Multiplicação de matrizes (algoritmos/multiplicacao), sobre a Matriz do instrumento: n³ multiplicações. */
  function multiplicacao(a, b) {
    const c = contador(), I_ = instrumentos(), n = a.length;
    const reg = { leituras: 0, escritas: 0, eventos: [] };
    const A = I_.Matriz(reg, n, n), B = I_.Matriz(reg, n, n), C = I_.Matriz(reg, n, n);
    A.carregar(a.flat()); B.carregar(b.flat());
    const V = c.vars = { i: null, j: null, k: null, s: null };
    c.push({ t: "atribui", linha: 2 });
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        Object.assign(V, { i: i + 1, j: j + 1, k: null, s });
        c.push({ t: "atribui", i, j, linha: 5 });
        for (let k = 0; k < n; k++) {
          const x = A.ler(i, k), y = B.ler(k, j);
          s += x * y;
          c.op("multiplicacoes");
          Object.assign(V, { k: k + 1, s });
          c.push({ t: "multiplica", i, j, k, x, y, linha: 7 });
        }
        C.escrever(i, j, s);
        reg.eventos = [];
        V.k = null;
        c.push({ t: "escreve", i, j, x: s, onde: "C", linha: 8 });
      }
    }
    c.push({ t: "devolva", linha: 9 });
    return { C: C.valores(), ops: c.ops.multiplicacoes || 0, pico: c.pico, casas: reg.leituras + reg.escritas, eventos: c.eventos };
  }

  /** Fatorial recursivo (algoritmos/fatorial): inteiros grandes (BigInt), porque 19! já passa de 2⁵³. */
  function fatorial(n) {
    const c = contador();
    function f(k, linha) {
      const V = { n: k, r: null };
      c.entra(k, null, linha, V);
      c.push({ t: "testa", linha: 2 });
      let r;
      if (k <= 1) { r = 1n; V.r = "1"; c.push({ t: "atribui", k, linha: 3 }); }
      else {
        r = BigInt(k) * f(k - 1, 5);
        c.op("multiplicacoes");
        V.r = r.toString();
        c.push({ t: "multiplica", k, r: r.toString(), linha: 5 });
      }
      c.sai();
      return r;
    }
    const r = f(n, 1);
    return { fatorial: r.toString(), ops: c.ops.multiplicacoes || 0, pico: c.pico, eventos: c.eventos };
  }

  /** Fibonacci recursivo (algoritmos/fibrecursivo): fib(n + 1) − 1 somas. */
  function fibRecursivo(n) {
    const c = contador();
    function f(k, linha) {
      const V = { n: k, r: null };
      c.entra(k, null, linha, V);
      c.push({ t: "testa", linha: 2 });
      let r;
      if (k <= 1) { r = k; V.r = r; c.push({ t: "atribui", k, linha: 3 }); }
      else {
        const x = f(k - 1, 5), y = f(k - 2, 5);
        r = x + y;
        c.op("somas");
        V.r = r;
        c.push({ t: "soma", k, r, linha: 5 });
      }
      c.sai();
      return r;
    }
    const r = f(n, 1);
    return { fib: r, ops: c.ops.somas || 0, pico: c.pico, casas: 0, chamadas: c.seq, eventos: c.eventos };
  }

  /** Fibonacci com memória (algoritmos/fibmemoria): o memo é o Vetor do instrumento, com a casa k para fib(k). */
  function fibMemoria(n) {
    const c = contador(), d = instrumentos().Vetor(undefined, n + 1);
    let guardadas = 0;
    const gasto = () => d.reg.leituras + d.reg.escritas;
    function f(k, linha) {
      const V = { n: k, r: null, "respostas guardadas": guardadas };
      c.entra(k, null, linha, V);
      c.push({ t: "testa", linha: 2 });
      let r, guardado;
      if (k <= 1) { r = k; V.r = r; c.push({ t: "atribui", k, linha: 3 }); }
      else if ((guardado = d.ler(k)) !== null) {
        c.push({ t: "busca", k, achou: true, gasto: gasto(), linha: 4 });
        r = guardado;
        V.r = r;
        c.push({ t: "lembra", k, r, gasto: gasto(), linha: 5 });
      } else {
        c.push({ t: "busca", k, achou: false, gasto: gasto(), linha: 4 });
        const x = f(k - 1, 7), y = f(k - 2, 7);
        r = x + y;
        c.op("somas");
        V.r = r;
        c.push({ t: "soma", k, r, linha: 7 });
        d.escrever(k, r);
        guardadas++;
        c.aloca("memo", guardadas);
        V["respostas guardadas"] = guardadas;
        c.push({ t: "guarda", k, r, gasto: gasto(), linha: 8 });
      }
      c.sai();
      return r;
    }
    const r = f(n, 1);
    return { fib: r, ops: c.ops.somas || 0, pico: c.pico, casas: gasto(), chamadas: c.seq, guardadas, eventos: c.eventos };
  }

  /** Fibonacci iterativo (algoritmos/fibiterativo): n somas, duas variáveis. */
  function fibIterativo(n) {
    const c = contador();
    let a = 0, b = 1;
    const V = c.vars = { a, b, i: null };
    c.push({ t: "atribui", linha: 2 });
    for (let i = 0; i < n; i++) {
      V.i = i + 1;
      c.push({ t: "le", i, linha: 3 });
      [a, b] = [b, a + b];
      c.op("somas");
      Object.assign(V, { i: i + 1, a, b });
      c.push({ t: "soma", i, a, b, linha: 4 });
    }
    c.push({ t: "devolva", linha: 5 });
    return { fib: a, ops: c.ops.somas || 0, pico: c.pico, casas: 0, chamadas: 0, eventos: c.eventos };
  }

  /** Busca de padrão ingênua (algoritmos/padrao), com o texto no Texto do instrumento: cada letra lida conta. */
  function padrao(texto, p) {
    const c = contador(), t = instrumentos().TextoImutavel(), n = texto.length, m = p.length, achou = [];
    t.carregar([...texto]);
    const V = c.vars = { i: null, j: null, "t[i + j − 1]": null, "p[j]": null, "posições achadas": 0 };
    for (let i = 0; i <= n - m; i++) {
      Object.assign(V, { i: i + 1, j: null, "t[i + j − 1]": null, "p[j]": null });
      c.push({ t: "encosta", i, linha: 2 });
      let j = 0;
      V.j = 1;
      c.push({ t: "atribui", i, linha: 3 });
      for (;;) {
        if (!(j < m)) { c.push({ t: "testa", i, linha: 4, parte: 0 }); break; }
        const x = t.ler(i + j), ok = x === p[j];
        c.op("comparacoes");
        Object.assign(V, { "t[i + j − 1]": x, "p[j]": p[j] });
        c.push({ t: "compara", i, j, ok, a: x, b: p[j], linha: 4, parte: 1 });
        if (!ok) break;
        j++;
        V.j = j + 1;
        c.push({ t: "atribui", i, j, linha: 5 });
      }
      c.push({ t: "testa", i, linha: 6 });
      if (j === m) { achou.push(i); V["posições achadas"] = achou.length; c.push({ t: "achou", i, linha: 7 }); }
    }
    c.push({ t: "devolva", linha: 8 });
    return { achou, ops: c.ops.comparacoes || 0, pico: c.pico, casas: t.reg.leituras, eventos: c.eventos };
  }

  // ---------- entradas ----------

  // gerador com semente (mulberry32): o mesmo número de sorteio dá o mesmo vetor
  function sorteador(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function entrada(n, tipo, semente) {
    const v = Array.from({ length: n }, (_, i) => i);
    if (tipo === "ordenado") return v;
    if (tipo === "invertido") return v.reverse();
    const r = sorteador(semente);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = v[i]; v[i] = v[j]; v[j] = x; }
    return v;
  }

  /** k pontos sorteados como centros iniciais, em posições distintas. */
  function centrosIniciais(pontos, k, semente) {
    const r = sorteador(semente);
    for (;;) {
      const idx = [];
      while (idx.length < k) { const i = Math.floor(r() * pontos.length); if (!idx.includes(i)) idx.push(i); }
      if (new Set(idx.map((i) => pontos[i].join(","))).size === k) return idx;
    }
  }

  /** Busca: os pares 0, 2, …, 2(n − 1) (embaralhados se a busca não precisa
   *  de ordem) e o alvo do caso: o primeiro, o último, um ímpar ausente ou um sorteado. */
  function entradaBusca(n, ordenado, caso, semente) {
    const v = Array.from({ length: n }, (_, k) => 2 * k);
    const r = sorteador(semente);
    if (!ordenado) for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = v[i]; v[i] = v[j]; v[j] = x; }
    const alvo = caso === "comeco" ? v[0] : caso === "fim" ? v[n - 1]
      : caso === "ausente" ? 2 * Math.floor(r() * (n + 1)) - 1 : v[Math.floor(r() * n)];
    return { vetor: v, alvo };
  }

  /** Texto de n símbolos (n par), como algoritmos/parenteses/parenteses.py:gerar. */
  function textoParenteses(n, caso, semente) {
    if (n % 2) throw new Error("o texto precisa de um número par de símbolos");
    const r = sorteador(semente), FECHA = { "(": ")", "[": "]", "{": "}" }, escolhe = (s) => s[Math.floor(r() * s.length)];
    if (caso === "so_abre") return Array.from({ length: n }, () => escolhe(ABRE)).join("");
    const t = [], pilha = [];
    for (let k = 0; k < n; k++) {
      if (pilha.length && (pilha.length === n - k || r() < 0.5)) t.push(FECHA[pilha.pop()]);
      else { const a = escolhe(ABRE); pilha.push(a); t.push(a); }
    }
    if (caso === "par_errado") {
      const fechas = t.map((s, k) => (s in PAR ? k : -1)).filter((k) => k >= 0), j = escolhe(fechas);
      t[j] = escolhe(Object.keys(PAR).filter((f) => f !== t[j]));
    } else if (caso === "sobra_aberto") t[n - 1] = escolhe(ABRE);
    return t.join("");
  }

  /** n clientes: o minuto em que cada um chega e quanto demora, com os intervalos do movimento. */
  function clientes(n, movimento, semente) {
    const r = sorteador(semente), entre = ([a, b]) => a + Math.floor(r() * (b - a + 1));
    const chegada = [], duracao = [];
    let t = 0;
    for (let k = 0; k < n; k++) { t += entre(movimento.chegada); chegada.push(t); }
    for (let k = 0; k < n; k++) duracao.push(entre(movimento.atendimento));
    return { chegada, duracao };
  }

  /** n pacientes: como os clientes, mais a gravidade de cada um (de g0 a g1, sorteada). */
  function pacientes(n, movimento, gravidades, semente) {
    const r = sorteador(semente), entre = ([a, b]) => a + Math.floor(r() * (b - a + 1));
    const chegada = [], duracao = [], gravidade = [];
    let t = 0;
    for (let k = 0; k < n; k++) { t += entre(movimento.chegada); chegada.push(t); }
    for (let k = 0; k < n; k++) duracao.push(entre(movimento.atendimento));
    for (let k = 0; k < n; k++) gravidade.push(entre(gravidades));
    return { chegada, duracao, gravidade };
  }

  /** n valores de 10 a 99, como algoritmos/janela/janela.py:gerar (com outro sorteador): sorteados
   *  (podem repetir), crescentes ou decrescentes (sem repetir). A lista da inversão usa os sorteados. */
  function valoresSorteados(n, caso, semente) {
    const r = sorteador(semente);
    if (caso === "sorteada") return Array.from({ length: n }, () => 10 + Math.floor(r() * 90));
    const faixa = Array.from({ length: 90 }, (_, i) => 10 + i);
    for (let i = faixa.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = faixa[i]; faixa[i] = faixa[j]; faixa[j] = x; }
    const v = faixa.slice(0, n).sort((a, b) => a - b);
    return caso === "crescente" ? v : v.reverse();
  }

  /** Valores para achar repetidos: sorteados de 10 a 99, todos diferentes, ou poucos (de 10 a 19). */
  function valoresRepetidos(n, caso, semente) {
    const r = sorteador(semente);
    if (caso === "poucos") return Array.from({ length: n }, () => 10 + Math.floor(r() * 10));
    if (caso !== "distintos") return Array.from({ length: n }, () => 10 + Math.floor(r() * 90));
    const faixa = Array.from({ length: 90 }, (_, i) => 10 + i);
    for (let i = faixa.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = faixa[i]; faixa[i] = faixa[j]; faixa[j] = x; }
    return faixa.slice(0, n);
  }

  /** n chaves distintas de 100 a 999 para as colisões: sorteadas, ou todas caindo na mesma casa de 2^bits. */
  function chavesColisao(n, caso, bits, semente) {
    const r = sorteador(semente), casa = instrumentos().casaDe;
    let todas = Array.from({ length: 900 }, (_, i) => 100 + i);
    if (caso === "mesma_casa") { const alvo = casa(todas[Math.floor(r() * 900)], bits); todas = todas.filter((k) => casa(k, bits) === alvo); }
    for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = todas[i]; todas[i] = todas[j]; todas[j] = x; }
    return todas.slice(0, n);
  }

  /** As arestas de um grafo em grade k × k, como motor/grade.py:gerar (com outro sorteador):
   *  a grade cheia, um sorteado conexo (árvore que cobre a grade + cada aresta que sobra com chance 1/3)
   *  ou o caminho em serpentina que começa no vértice 0. */
  function grafoGrade(k, caso, semente) {
    const todas = [];
    for (let u = 0; u < k * k; u++) {
      if ((u % k) + 1 < k) todas.push([u, u + 1]);
      if (Math.floor(u / k) + 1 < k) todas.push([u, u + k]);
    }
    const ordena = (as) => as.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    if (caso === "grade") return ordena(todas);
    if (caso === "caminho") {
      const ordem = [];
      for (let l = 0; l < k; l++) for (let c = 0; c < k; c++) ordem.push(l * k + (l % 2 ? k - 1 - c : c));
      return ordena(ordem.slice(1).map((v, i) => [Math.min(ordem[i], v), Math.max(ordem[i], v)]));
    }
    const r = sorteador(semente), pai = Array.from({ length: k * k }, (_, i) => i);
    const raiz = (x) => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
    for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = todas[i]; todas[i] = todas[j]; todas[j] = x; }
    const escolhidas = [];
    for (const [u, v] of todas) {
      const a = raiz(u), b = raiz(v);
      if (a !== b) { pai[a] = b; escolhidas.push([u, v]); } else if (r() < 1 / 3) escolhidas.push([u, v]);
    }
    return ordena(escolhidas);
  }

  /** Um peso inteiro de p0 a p1 para cada uma das m arestas (o Dijkstra), sorteado com semente. */
  function pesosGrade(m, [p0, p1], semente) {
    const r = sorteador(semente);
    return Array.from({ length: m }, () => p0 + Math.floor(r() * (p1 - p0 + 1)));
  }

  /** n valores com uma casa decimal, na forma pedida (como algoritmos/histograma/medir.py:sortear, com outro sorteador). */
  function amostra(n, forma, semente) {
    const r = sorteador(semente);
    const normal = (m, s) => m + s * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const umaCasa = (v) => Math.round(v * 10) / 10;
    return Array.from({ length: n }, () => umaCasa(forma === "normal" ? normal(50, 10)
      : forma === "uniforme" ? 100 * r() : r() < 0.5 ? normal(35, 6) : normal(65, 6)));
  }

  /** Duas matrizes n × n com valores de 0 a 9, para a multiplicação. */
  function matrizesSorteadas(n, semente) {
    const r = sorteador(semente), m = () => Array.from({ length: n }, () => Array.from({ length: n }, () => Math.floor(r() * 10)));
    return { A: m(), B: m() };
  }

  /** O texto e o padrão da busca: o pior caso ("aaa…ab" procurando "aa…ab") ou DNA sorteado, com o padrão sorteado à parte. */
  function textoPadrao(n, m, caso, semente) {
    if (caso === "pior") return { texto: "a".repeat(n - 1) + "b", padrao: "a".repeat(m - 1) + "b" };
    const r = sorteador(semente), base = (k) => Array.from({ length: k }, () => "ACGT"[Math.floor(r() * 4)]).join("");
    return { texto: base(n), padrao: base(m) };
  }

  const api = { ordenar, kmeans, figs, preverFigs, classeFigs, buscar, parenteses, atendimento, inverter, janela, janelaIngenua, percursos, buscaArvore, avl, valoresArvore, largura, profundidade, mediana, welford, somaDosQuadrados, duasPassadas,
    histograma, pretty, sturges, prioridade, dijkstra, entrada, valoresSorteados, entradaBusca, textoParenteses, clientes, pacientes, grafoGrade, pesosGrade,
    centrosIniciais, amostra, palavras, repetidos, repetidosVetor, encadeamento, sondagem, valoresRepetidos, chavesColisao, ORDENACOES,
    maximo, multiplicacao, fatorial, fibRecursivo, fibMemoria, fibIterativo, padrao, matrizesSorteadas, textoPadrao };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Algoritmos = api;
})(typeof window !== "undefined" ? window : globalThis);
