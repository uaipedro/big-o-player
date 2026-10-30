// O player: as seções (conceitos, fundamentos, classificar, playlists por problema, algoritmos e
// estruturas), as faixas (algoritmos), o palco que vira mini player arrastável e o
// encarte de cada faixa. Os números vêm de dados.js.
(function () {
  "use strict";

  const { el, mil, esc } = window.Graficos;
  const G = window.GALERIA || [];
  const INSTS = window.INSTRUMENTOS || [];
  const porAlg = Object.fromEntries(G.map((f) => [f.alg, f]));
  // cada playlist é um problema; as subcategorias são os jeitos de resolver, e a playlist toca na ordem delas
  const PLAYLISTS = (window.PLAYLISTS || []).map((p) => {
    const subcategorias = p.subcategorias.map((s) => ({ ...s, faixas: s.faixas.map((n) => porAlg[n]).filter(Boolean) }));
    return { ...p, subcategorias, faixas: subcategorias.flatMap((s) => s.faixas) };
  });
  // as playlists de vídeo, na ordem da home; cada uma só existe com algum vídeo pronto
  const SERIES = [{ id: "conceitos", ...(window.CONCEITOS || {}) }, { id: "fundamentos", ...(window.FUNDAMENTOS || {}) }, { id: "classificar", ...(window.CLASSIFICAR || {}) }]
    .map((s) => ({ ...s, prontos: (s.videos || []).filter((v) => v.video) })).filter((s) => s.prontos.length)
    .map((s) => ({ ...s, faixas: s.prontos.map((v) => ({ id: `${s.id}-${v.n}`, nome: v.titulo, objetivo: v.resumo, arquivo: v.video,
      duracao: v.duracao || 0, capa: v.capa || null, poster: "icone.png", n: v.n })) }));
  const NOME = "Big O Player";
  const $ = (s, raiz = document) => raiz.querySelector(s);
  const calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const casaDe = (f) => PLAYLISTS.find((p) => p.faixas.includes(f));   // a primeira playlist em que a faixa mora
  const rotaFaixa = (f, p) => `#${(p || casaDe(f) || SERIES.find((s) => s.faixas.includes(f))).id}/${f.id}`;
  const relogio = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const nFaixas = (n) => `${n} ${n === 1 ? "faixa" : "faixas"}`;
  // os blocos da home e da lateral: as playlists seguidas com o mesmo "bloco", na ordem do playlists.json
  const blocos = () => PLAYLISTS.reduce((bs, p) => {
    const ultimo = bs[bs.length - 1];
    if (ultimo && ultimo.titulo === p.bloco) ultimo.playlists.push(p); else bs.push({ titulo: p.bloco, playlists: [p] });
    return bs;
  }, []);
  const corDe = (p) => `cor-${(p && p.cor) || "creme"}`;   // a classe com a cor da playlist (estilo.css)
  // links de antes da reorganização: o álbum velho cai na playlist que herdou a maior parte dele
  const ANTIGOS = { "primeiros-passos": "problemas-gerais", busca: "encontrar-um-item", ordenacao: "ordenar-uma-lista",
    "estruturas-lineares": "organizar-uma-fila", "arvores-e-heaps": "encontrar-um-item", grafos: "achar-o-caminho-mais-curto",
    dispersao: "encontrar-um-item", estatistica: "problemas-gerais", instrumentos: "algoritmos-e-estruturas" };

  // ---------- feat.: as estruturas que a faixa toca ----------

  const creditos = (f) => (f.instrumentos || []).map((c) => ({ ...c, inst: INSTS.find((i) => i.id === c.id) })).filter((c) => c.inst);
  const featTexto = (f) => { const cs = creditos(f); return cs.length ? `feat. ${cs.map((c) => c.inst.nome).join(", ")}` : ""; };

  function feat(f) {
    const cs = creditos(f);
    if (!cs.length) return null;
    return el("span", { class: "feat" }, [" feat. ", ...cs.flatMap((c, k) => [k ? ", " : "", el("a", { href: `#estruturas/${c.id}`, text: c.inst.nome })])]);
  }

  // ---------- capas ----------

  // a imagem da capa: a desenhada, quando existe (inteira, ou só a ilustração quando fica pequena); senão, o pôster
  function imgCapa(f, pequena, largura = 240) {
    if (!f.capa && f.medido) return capaProvisoria(f, pequena);   // faixa sem capa desenhada: nunca o print antigo
    if (!f.capa) return el("img", { src: f.poster, alt: "", loading: "lazy" });
    if (pequena) return el("img", { src: f.capa.arte, alt: "", loading: "lazy" });
    const i = f.capa.inteira;
    return el("img", { src: i[240], srcset: `${i[240]} 240w, ${i[480]} 480w`, sizes: `${largura}px`, alt: "", loading: "lazy" });
  }

  function capaFaixa(f, extra = "") {
    return el("span", { class: `capa ${extra}` }, f ? imgCapa(f, extra.includes("mini-48"), 220) : null);
  }

  // a capa provisória de uma faixa que ainda não tem a desenhada, na linguagem das capas: a cor da playlist
  // chapada, o rótulo mono "PROBLEMA · CÓDIGO" no topo e o nome na grotesca embaixo; pequena, só o código
  function capaProvisoria(f, pequena) {
    const p = casaDe(f), codigo = p && p.codigo ? `${p.codigo}-${String(p.faixas.indexOf(f) + 1).padStart(2, "0")}` : "";
    return montarProvisoria(p, p ? p.titulo : "", codigo, f.nome, pequena);
  }
  function montarProvisoria(p, rotulo, codigo, nome, pequena) {
    return el("span", { class: `capa-provisoria ${corDe(p)} ${pequena ? "pequena" : ""}`, "aria-hidden": "true" }, pequena
      ? [el("small", { text: codigo })]
      : [el("small", {}, [el("span", { text: rotulo }), el("span", { text: codigo })]), el("b", { text: nome })]);
  }

  // a capa de uma playlist: só as capas desenhadas (o mosaico de quatro, ou a primeira); nunca o print antigo
  function capaAlbum(a, extra = "") {
    // a playlist que só empresta capas de outra (Achar o maior usa as de Problemas gerais) mostra a provisória até ter a sua
    if (a.capa === "provisoria") return el("span", { class: `capa ${extra}` }, montarProvisoria(a, a.titulo, a.codigo, a.titulo, extra.includes("mini-48")));
    const novas = a.faixas.filter((f) => f.capa);
    const fs = (novas.length ? novas : a.faixas).slice(0, 4);
    if (!fs.length) return el("span", { class: `capa vazia ${extra}` });
    const m = el("span", { class: `capa mosaico ${fs.length < 4 ? "um" : ""} ${extra}` });
    (fs.length < 4 ? fs.slice(0, 1) : fs).forEach((f) => m.append(imgCapa(f, extra.includes("mini-48"), fs.length < 4 ? 232 : 116)));
    return m;
  }

  // a capa das seções sem faixa própria: uma marca de texto no lugar do mosaico
  const capaTexto = (t, extra = "") => el("span", { class: `capa capa-texto ${extra}`, "aria-hidden": "true", text: t });

  // ---------- barra lateral: as seções na ordem do mapa ----------

  function desenharLateral(atual) {
    const linha = (id, capa, titulo, sub, cor = "") => el("a", { class: `album-mini ${cor}`, href: `#${id}`, "aria-current": String(id === atual) }, [
      capa, el("span", {}, [el("b", { text: titulo }), el("small", { text: sub })])]);
    $("#secoes").replaceChildren(
      ...SERIES.map((s) => linha(s.id, capaAlbum(s, "mini-48"), s.titulo, `${s.prontos.length} ${s.prontos.length === 1 ? "vídeo" : "vídeos"}`, corDe(s))),
      ...blocos().flatMap((b) => [el("p", { class: "lateral-titulo rotulo-bloco", text: b.titulo }),
        ...b.playlists.map((p) => linha(p.id, capaAlbum(p, "mini-48"), p.titulo, p.gerais ? `${p.subcategorias.length} problemas` : nFaixas(p.faixas.length), corDe(p)))]),
      el("p", { class: "lateral-titulo rotulo-bloco", text: "Algoritmos e estruturas" }),
      linha("algoritmos-e-estruturas", window.PaginaInstrumento.glifo("vetor", "mini-48"), "Algoritmos e estruturas", `${G.length} algoritmos, ${INSTS.length} estruturas`),
    );
  }

  // ---------- cartões e prateleiras (a home e o "toca em" das estruturas) ----------

  function cartaoFaixa(f, p) {
    const play = el("button", { type: "button", class: "cartao-play", "aria-label": `Tocar ${f.nome}`, text: "▶" });
    play.addEventListener("click", () => tocar(f, p));
    return el("div", { class: "cartao", "data-id": f.id }, [
      el("span", { class: "cartao-capa" }, [capaFaixa(f), play]),
      el("a", { class: "cartao-link", href: rotaFaixa(f, p), text: f.nome }),
      el("small", {}, [el("span", { class: "o", text: f.tempo.notacao }), featTexto(f) ? ` · ${featTexto(f)}` : ""]),
    ]);
  }

  // o cartão de um vídeo: toca no palco, como uma faixa (nada de player solto no cartão)
  function cartaoVideo(f, s) {
    const play = el("button", { type: "button", class: "cartao-play", "aria-label": `Tocar ${f.nome}`, text: "▶" });
    play.addEventListener("click", () => tocar(f, s));
    return el("div", { class: "cartao", "data-id": f.id }, [
      el("span", { class: "cartao-capa" }, [f.capa ? capaFaixa(f) : capaTexto(String(f.n), "capa-video"), play]),
      el("b", { text: `${f.n}. ${f.nome}` }),
      el("small", { text: f.objetivo }),
    ]);
  }

  // uma prateleira: título (link), "Mostrar tudo" e a fileira, que rola na horizontal
  function prateleira(titulo, href, frase, itens, extra = "") {
    const fileira = el("ul", { class: "fileira", "aria-label": titulo }, itens.map((i) => el("li", {}, i)));
    const seta = (dir, rot) => {
      const b = el("button", { type: "button", class: "icone seta", "aria-label": rot, text: dir < 0 ? "‹" : "›" });
      b.addEventListener("click", () => fileira.scrollBy({ left: dir * fileira.clientWidth * 0.8, behavior: calmo ? "auto" : "smooth" }));
      return b;
    };
    return el("section", { class: `prateleira ${extra}` }, [
      el("header", {}, [
        el("div", {}, [el("h2", {}, href ? el("a", { href, text: titulo }) : titulo), frase ? el("p", { text: frase }) : null]),
        el("div", { class: "prateleira-acoes" }, [seta(-1, `${titulo}: voltar`), seta(1, `${titulo}: avançar`),
          href ? el("a", { class: "mostrar-tudo", href, text: "Mostrar tudo" }) : null]),
      ]),
      fileira,
    ]);
  }

  // a home: a abertura, a comparação tocando sozinha e a grade das playlists
  function inicio() {
    return el("div", { class: "inicio" }, [
      el("header", { class: "abertura" }, [
        el("h1", { text: "Algoritmos tocando ao vivo." }),
        el("p", { text: "Cada playlist é um problema; cada faixa, um jeito de resolver." }),
      ]),
      COMPARACAO ? comparacaoAoVivo() : null,
      ...SERIES.map((s) => prateleira(s.titulo, `#${s.id}`, s.frase, s.faixas.map((f) => cartaoVideo(f, s)), `destaque ${corDe(s)}`)),
      ...blocos().map((b) => el("section", { class: "bloco-playlists", "aria-label": b.titulo }, [
        el("h2", { class: "rotulo-bloco", text: b.titulo }),
        el("div", { class: "grade-playlists" }, b.playlists.map(cartaoPlaylist)),
      ])),
      prateleira("Algoritmos e estruturas", "#algoritmos-e-estruturas", "As estruturas de dados que as faixas tocam, cada uma com a demo ao vivo e o custo de cada operação.",
        INSTS.map((i) => window.PaginaInstrumento.cartao(i, ctxInstrumento))),
      rodape(),
    ]);
  }

  // o cartão de uma playlist na grade da home: a capa (o mosaico das capas novas, ou a primeira), o problema e quantas faixas
  function cartaoPlaylist(p) {
    const capa = capaAlbum(p);
    return el("a", { class: `cartao-playlist ${corDe(p)}`, href: `#${p.id}` }, [
      capa,
      el("b", { text: p.titulo }),
      el("small", { text: nFaixas(p.faixas.length) }),
    ]);
  }

  // ---------- a comparação da home: Busca sequencial × Busca binária, o mesmo vetor e o mesmo alvo ----------
  // as duas tocam sozinhas, devagar e em loop, no motor dos palcos (Palco.busca + Palco.pintar), uma em cada canvas;
  // param fora da tela e com a aba escondida; com movimento reduzido, mostram o quadro final, paradas
  // desligada a pedido do Pedro (28/10): a grade das playlists vem logo depois da abertura; o código fica pronto
  const COMPARACAO = false;
  let comparacao = null;
  function comparacaoAoVivo() {
    const seq = porAlg.sequencial, bin = porAlg.binaria, casa = PLAYLISTS.find((p) => p.faixas.includes(seq));
    if (!seq || !bin || !window.Palco.busca) return null;
    const vetor = Array.from({ length: 24 }, (_, k) => 2 * k), alvo = vetor[18];   // ordenado (a binária precisa), o alvo perto do fim
    const lados = [seq, bin].map((f) => {
      const sim = window.Palco.busca(f, vetor, alvo);
      const tela = el("canvas", { class: "comparacao-tela", role: "img", "aria-label": `${f.nome} procurando o ${alvo} em ${vetor.length} números` });
      const conta = el("b", { class: "comparacao-conta" });
      return { f, sim, tela, conta, el: el("figure", { class: "comparacao-lado" }, [tela, el("figcaption", {}, [
        el("span", {}, [el("strong", { text: f.nome }), " ", el("span", { class: "o", text: f.tempo.notacao })]), conta])]) };
    });
    const botao = el("button", { type: "button", class: "tocar-comparacao", text: "▶ Tocar a comparação" });
    // o palco tem um quadro só: o botão toca a playlist Encontrar um item a partir da sequencial (a binária vem em seguida)
    botao.addEventListener("click", () => tocar(seq, casa));
    const raiz = el("section", { class: "comparacao", "aria-label": "Busca sequencial e busca binária, lado a lado" }, [
      el("div", { class: "comparacao-palcos" }, lados.map((l) => l.el)), botao]);

    const VEL = 0.6, PAUSA = 2500;        // devagar; e a pausa no fim antes de recomeçar
    let inicio = performance.now(), visivel = false, quadroId = null, fimEm = null, parouEm = null;
    const pinta = (agora) => {
      const t = (agora - inicio) / 1000;
      let todas = true;
      for (const l of lados) {
        const u = calmo ? l.sim.total : Math.min(l.sim.total, t * l.sim.ritmo * VEL);
        if (u < l.sim.total) todas = false;
        window.Palco.pintar(l.tela, l.sim, u);
        const n = l.sim.contagemEm(u), fim = u >= l.sim.total;
        l.conta.textContent = `${n} ${n === 1 ? "comparação" : "comparações"}`;
        l.conta.classList.toggle("fim", fim);
      }
      if (todas && fimEm === null) fimEm = agora;
      if (fimEm !== null && agora - fimEm > PAUSA) { inicio = agora; fimEm = null; }
    };
    // parada, o relógio da comparação também para: ao voltar, ela segue de onde estava
    const laco = (agora) => {
      pinta(agora);
      if (visivel && !document.hidden && !calmo) quadroId = requestAnimationFrame(laco);
      else { quadroId = null; parouEm = agora; }
    };
    const liga = () => {
      if (quadroId !== null || !visivel || document.hidden || calmo) return;
      if (parouEm !== null) { const d = performance.now() - parouEm; inicio += d; if (fimEm !== null) fimEm += d; parouEm = null; }
      quadroId = requestAnimationFrame(laco);
    };
    const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) liga(); });
    io.observe(raiz);
    const aba = () => liga();
    document.addEventListener("visibilitychange", aba);
    requestAnimationFrame(() => pinta(performance.now()));   // o primeiro quadro (e o único, com movimento reduzido)
    comparacao = { parar() { io.disconnect(); document.removeEventListener("visibilitychange", aba); if (quadroId) cancelAnimationFrame(quadroId); quadroId = null; visivel = false; } };
    return raiz;
  }

  // quem fez e como foi medido: no fim da home e das seções
  function rodape() {
    return el("footer", { class: "autoria", html:
      'Pedro Mambelli e João Paulo Assis Bonifácio · Estatística UFLA · conferido no R · <a href="https://github.com/uaipedro/big-o-player">código</a>' });
  }

  // a playlist: as faixas agrupadas pela subcategoria (o jeito de resolver); em Problemas gerais, uma por problema
  function album(a) {
    const total = a.faixas.reduce((t, f) => t + duracao(f), 0);
    // uma notação longa ("O(h), h de log n a n") quebra só entre as partes, nunca dentro de um O(·)
    const notacao = (t) => t.split(/(?<=,|·) | (?=por |·)/).flatMap((pedaco, i) => (i ? [" ", el("span", { text: pedaco })] : [el("span", { text: pedaco })]));
    let i = 0;
    // em Problemas gerais, cada subcategoria (uma faixa só) herda a cor da capa dela
    const corDaLinha = (s) => (a.gerais && s.faixas[0] && s.faixas[0].capa && s.faixas[0].capa.cor ? { style: `--cor: ${s.faixas[0].capa.cor}` } : {});
    const corpos = a.subcategorias.map((s) => el("tbody", corDaLinha(s), [
      el("tr", { class: "subcategoria" }, el("th", { colspan: "5", scope: "rowgroup", text: s.titulo })),
      ...s.faixas.map((f) => {
        const tr = el("tr", { class: "tocavel", "data-id": f.id }, [
          el("td", { class: "n" }, [el("span", { class: "num", text: String(++i) }), equalizador()]),
          el("td", {}, el("div", { class: "faixa" }, [capaFaixa(f, "mini-48"),
            el("div", {}, [el("a", { href: rotaFaixa(f, a), text: f.nome }), feat(f), el("small", { text: f.objetivo })])])),
          el("td", { class: "o" }, notacao(f.tempo.notacao)),
          el("td", { class: "o esconde-estreito" }, notacao(f.memoria.notacao)),
          el("td", { class: "dur", text: relogio(duracao(f)) }),
        ]);
        tr.addEventListener("click", (e) => { if (!e.target.closest("a")) tocar(f, a); });
        return tr;
      }),
    ]));
    const botao = el("button", { type: "button", class: "tocar-playlist", "aria-label": `Tocar a playlist ${a.titulo}`,
      html: '<svg aria-hidden="true"><use href="#i-tocar"/></svg>' });
    botao.addEventListener("click", () => tocar(a.faixas[0], a));
    return el("div", { class: `playlist ${corDe(a)} ${a.gerais ? "gerais" : ""}` }, [
      el("header", { class: "cabeca colorida" }, [capaAlbum(a), el("div", {}, [
        el("span", { class: "rotulo", text: `${a.gerais ? "galeria" : "playlist"} · ${a.codigo}` }),
        el("h1", { text: a.titulo }),
        el("p", { text: a.frase }),
        el("div", { class: "acoes" }, [botao, el("span", { text: `${nFaixas(a.faixas.length)}, ${relogio(total)}` })]),
      ])]),
      el("table", { class: "faixas" }, [
        el("thead", {}, el("tr", {}, ["#", "faixa", "tempo", "memória", "duração"].map((t, k) =>
          el("th", { class: k === 3 ? "esconde-estreito" : k === 4 ? "dur" : "", text: t })))),
        ...corpos,
      ]),
    ]);
  }

  // as três barras que sobem e descem na faixa que toca (paradas com movimento reduzido)
  const equalizador = () => el("span", { class: "eq", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]);

  // ---------- as playlists de vídeo (Conceitos importantes, Fundamentos e Classificar um exemplo): só com vídeo pronto ----------

  function paginaVideos(s) {
    return el("div", { class: `playlist ${corDe(s)}` }, [
      el("header", { class: "cabeca colorida" }, [capaAlbum(s), el("div", {}, [
        el("span", { class: "rotulo", text: `vídeos · ${s.codigo}` }),
        el("h1", { text: s.titulo }),
        el("p", { text: s.frase }),
      ])]),
      el("div", { class: "estante" }, s.faixas.map((f) => cartaoVideo(f, s))),
    ]);
  }

  // ---------- algoritmos e estruturas: as páginas, sem a ordem das playlists ----------

  function algoritmosEEstruturas() {
    const porNome = [...G].sort((p, q) => p.nome.localeCompare(q.nome, "pt-BR"));
    return el("div", {}, [
      el("header", { class: "cabeca" }, [el("div", {}, [
        el("span", { class: "rotulo", text: "referência" }),
        el("h1", { text: "Algoritmos e estruturas" }),
        el("p", { text: "Cada página com a simulação ao vivo e o custo medido. O rótulo de tempo é o pior caso, salvo quando diz médio ou amortizado." }),
      ])]),
      el("h2", { class: "estante-titulo", id: "estruturas", text: "Estruturas" }),
      el("div", { class: "estante" }, INSTS.map((i) => window.PaginaInstrumento.cartao(i, ctxInstrumento))),
      el("h2", { class: "estante-titulo", text: "Algoritmos" }),
      el("ul", { class: "indice-algoritmos" }, porNome.map((f) => el("li", {}, [
        el("a", { href: rotaFaixa(f), text: f.nome }), " ", el("span", { class: "o", text: f.tempo.notacao }),
        el("small", { text: casaDe(f).titulo }),
      ]))),
    ]);
  }

  // ---------- encarte ----------

  // o que cada tipo de faixa nova diz da entrada do encarte (os números vêm do dados.json)
  const decimal = (x) => (Math.round(x * 10) / 10).toFixed(1).replace(".", ",");
  const ENCARTE = {
    busca: { entrada: "números", conta: (ex) => `${ex.n} números, ${ex.posicao >= 0 ? `o ${ex.alvo} está na casa ${ex.posicao + 1}` : `o ${ex.alvo} não está no vetor`}, na entrada do encarte` },
    parenteses: { entrada: "símbolos", conta: (ex) => `${ex.n} símbolos, ${ex.comparacoes} pares conferidos, na entrada do encarte` },
    atendimento: { entrada: "clientes", conta: (ex) => `${ex.n} clientes, espera média de ${decimal(ex.soma / ex.n)} min, na entrada do encarte` },
    prioridade: { entrada: "pacientes", conta: (ex) => `${ex.n} pacientes, espera média de ${decimal(ex.soma / ex.n)} min (gravidade 1: ${decimal(ex.por_gravidade[0])} min), na entrada do encarte` },
    dijkstra: { entrada: "vértices", conta: (ex) => `${ex.n} vértices e ${ex.arestas.length} arestas com pesos de ${ex.faixa_pesos[0]} a ${ex.faixa_pesos[1]}, heap de até ${ex.estrutura} pares, ${ex.descartados} descartados, no grafo do encarte` },
    inverter: { entrada: "nós", conta: (ex) => `${ex.n} nós, ${ex.casas} casas lidas e escritas, na lista do encarte` },
    percursos: { entrada: "nós", conta: (ex) => `${ex.n} nós, cada um visitado uma vez; a pilha chega a ${ex.pilha} níveis e a fila a ${ex.fila} nós, na árvore do encarte` },
    abb: { entrada: "valores", conta: (ex) => `${ex.n} buscas, ${decimal(ex.ops / ex.n)} comparações por busca em média e ${ex.pior} na mais cara; altura ${ex.altura}, na árvore do encarte` },
    avl: { entrada: "valores", conta: (ex) => `${ex.n} valores ${ex.caso === "crescente" ? "em ordem crescente" : ex.caso === "decrescente" ? "em ordem decrescente" : "embaralhados"}, ${ex.rotacoes} rotações, altura ${ex.altura}; a comum faria ${ex.comum} comparações e ficaria com altura ${ex.altura_comum}` },
    janela: { entrada: "números", conta: (ex) => `${ex.n} números, janela de ${ex.k}; o ingênuo faria ${ex.ingenuo}, no vetor do encarte` },
    grafo: { entrada: "vértices", conta: (ex) => `${ex.n} vértices e ${ex.arestas.length} arestas, ${nomeEstrutura(ex)} de até ${ex.estrutura}, no grafo do encarte` },
    mediana: { entrada: "números", conta: (ex) => `${ex.n} volumes, mediana ${num(ex.mediana, 1)} (a média é ${num(ex.media, 1)}), na entrada do encarte` },
    welford: { entrada: "valores", conta: (ex) => `${ex.n} anos lidos uma vez, variância de ${num(ex.variancia, 4)} pés², na entrada do encarte` },
    figs: { entrada: "carros", conta: (ex) => `${ex.n} carros, ${ex.divisoes} divisões em ${ex.arvores.length} árvores, ${ex.acertos} certos; a árvore única, com as mesmas ${ex.s}, para em ${ex.uma.divisoes} e acerta ${ex.uma.acertos}` },
    histograma: { entrada: "valores", conta: (ex) => `${ex.n} erupções em ${ex.c} classes de ${num(ex.h, 1)} min, na entrada do encarte` },
    palavras: { entrada: "palavras", artigo: "das", conta: (ex) => `${ex.n} palavras, ${ex.d} distintas, numa tabela que terminou com ${ex.m} casas, na Canção do Exílio` },
    repetidos: { entrada: "números", conta: (ex) => `${ex.n} números, ${ex.repetido.filter(Boolean).length} repetidos; o vetor faria ${ex.ops_vetor}, no vetor do encarte` },
    encadeamento: { entrada: "chaves", artigo: "das", conta: (ex) => `${ex.n} chaves em ${ex.m} casas (α = ${num(ex.n / ex.m, 2)}), ${num(ex.ops / ex.n, 2)} por chave, na entrada do encarte` },
    sondagem: { entrada: "chaves", artigo: "das", conta: (ex) => `${ex.n} chaves em ${ex.m} casas (α = ${num(ex.n / ex.m, 2)}), ${num(ex.ops / ex.n, 2)} por chave, na entrada do encarte` },
    maximo: { entrada: "números", conta: (ex) => `${ex.n} números, o maior é ${ex.maximo}, que trocou ${ex.trocas} ${ex.trocas === 1 ? "vez" : "vezes"}, no vetor do encarte` },
    matrizes: { alem: (ex) => `além das duas matrizes ${ex.n} × ${ex.n} de entrada`,
      conta: (ex) => `${ex.n} × ${ex.n}: ${ex.n * ex.n} casas de C, ${ex.n} multiplicações em cada; ${mil(ex.casas)} casas lidas e escritas, nas matrizes do encarte` },
    fatorial: { alem: (ex) => `níveis da pilha, para n = ${ex.n}`, conta: (ex) => `${ex.n}! = ${ex.fatorial}, com ${ex.n} chamadas` },
    fib_recursivo: { alem: (ex) => `níveis da pilha, para n = ${ex.n}`, conta: (ex) => `fib(${ex.n}) = ${ex.fib}, com ${mil(ex.chamadas)} chamadas` },
    fib_memoria: { alem: (ex) => `na pilha e no memo, para n = ${ex.n}`, conta: (ex) => `fib(${ex.n}) = ${ex.fib}, com ${ex.chamadas} chamadas e ${ex.casas} casas lidas e escritas no memo` },
    fib_iterativo: { conta: (ex) => `fib(${ex.n}) = ${ex.fib}, em ${ex.n} voltas` },
    busca_padrao: { entrada: "letras", artigo: "das", conta: (ex) => `${ex.n} letras, padrão de ${ex.m}, "${ex.padrao}" achado nas posições ${ex.achou.map((q) => q + 1).join(" e ")}, na Canção do Exílio` },
  };
  // número com vírgula decimal e um número fixo de casas
  const num = (x, casas) => x.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const preenchido = (x) => !!x && !["—", "-", "sem autoria única"].includes(String(x).trim());
  const decisoes = (c) => (c.decisoes.length === 1 ? "decisão" : "decisões");
  const nomeEstrutura = (ex) => (ex.dist ? "fila" : "pilha");

  const PALAVRAS = /^(\s*)(procedimento|para|enquanto|senão se|senão|se|pare|devolva)\b/;

  function blocoPseudo(f) {
    const p = f.pseudocodigo;
    const porLinha = {};
    p.decisoes.forEach((l) => (porLinha[l] = (porLinha[l] || 0) + 1));
    const ol = el("ol");
    p.linhas.forEach((l, i) => {
      let h = esc(l).replace(PALAVRAS, '$1<span class="kw">$2</span>');
      if (/^\s*(se|senão se|enquanto)\b/.test(l)) h = h.replace(/ (e|ou) /g, ' <span class="kw">$1</span> ');
      const n = porLinha[i + 1];
      ol.append(el("li", n ? { class: "decisao", "data-n": n, "data-linha": i + 1, html: h || " " } : { "data-linha": i + 1, html: h || " " }));
    });
    return el("div", { class: "pseudo", role: "figure", "aria-label": "Pseudocódigo em português", "data-faixa": f.id }, ol);
  }

  function encarte(f, a) {
    const ex = f.exemplo, m = f.medido, c = m.ciclomatica, cf = f.conferencia, p = f.pseudocodigo;
    const ordena = m.tempo.tipo === "ordenacao", casos = !!m.tempo.series;
    const entrada = ENCARTE[m.tempo.tipo] ? ENCARTE[m.tempo.tipo].entrada : ordena ? "números" : "pontos";
    const gr = f.graficos || {};
    // as legendas dos gráficos das faixas novas: texto da ficha, números do dados.json
    const preencher = (t) => (t || "").replace(/\{(\w+)\}/g, (_, c) => ({
      n0: mil(m.tempo.crescimento[0].n), n1: mil(m.tempo.crescimento.at(-1).n), dados: m.tempo.crescimento_dados[0].toUpperCase() + m.tempo.crescimento_dados.slice(1),
      ...(temDist ? { vezes: dist.vezes, nd: dist.n, min: Math.min(...(dist.valores || [0])), max: Math.max(...(dist.valores || [0])),
        acima: (dist.valores || []).filter((x) => x < dist.destaque).length } : {}),
      ...(porK ? { k: m.tempo.k_fixo, nk: m.tempo.n_fixo, k0: porK[0].n, k1: porK.at(-1).n } : {}),
      ...(alfa ? { m: mil(alfa.m), sementes: alfa.sementes, a0: num(alfa.pontos[0].alfa, 2), a1: num(alfa.pontos.at(-1).alfa, 2) } : {}),
    })[c] ?? `{${c}}`);
    // a janela tem um segundo eixo (k, com n fixo): o tempo × k no lugar da distribuição, e a memória × k
    const porK = m.tempo.por_k;
    // as colisões têm o gráfico × α (sondagens contra as fórmulas) no lugar do primeiro, e o total × m ao lado
    const alfa = m.tempo.alfa;
    const temPicoCasos = casos && (porK || m.tempo.crescimento).some((d) => m.tempo.series.some((sr) => d[sr.caso].pico > 0));
    const temPilhaOuAux = ordena && m.tempo.crescimento.some((d) => d.invertido.pico > 0 || d.aleatorio.pico > 0);
    const dist = m.tempo.distribuicao || {}, temDist = !!m.tempo.distribuicao, erro = m.tempo.erro, altura = !!m.tempo.altura;
    const fig1 = el("div"), fig2 = el("div"), fig3 = el("div"), codigo = el("div");
    // o código que roda e é medido, com o grafo de fluxo ao lado: recolhido no fim; desenha ao abrir (fechado, não tem largura)
    const codigoMedido = el("details", { class: "detalhe codigo-medido" }, [
      el("summary", {}, [el("b", { text: "O código medido" }), el("span", { text: `caminhos: M = ${c.M}` })]),
      el("div", { class: "detalhe-corpo" }, [
        el("p", { text: f.ciclomatica.porque }),
        el("div", { class: "contas-m", html:
          `<span>${c.decisoes.length} ${decisoes(c)} + 1 = <b>${c.M}</b></span><span>${c.arestas} arestas − ${c.nos} nós + 2 = <b>${c.M}</b></span>` }),
        codigo,
      ]),
    ]);
    codigoMedido.addEventListener("toggle", () => { if (codigoMedido.open) codigo.replaceChildren(window.Graficos.blocoCodigo(f)); });

    const capa = el("button", { type: "button", class: "capa-tocar", "aria-label": `Tocar ${f.nome}` }, capaFaixa(f));
    capa.addEventListener("click", () => tocar(f, a));
    const botao = el("button", { type: "button", class: "botao-tocar", text: "▶ Tocar" });
    botao.addEventListener("click", () => tocar(f, a));
    const verFluxo = () => {
      const b = el("button", { type: "button", class: "botao-fluxo", text: "ver o fluxograma" });
      b.addEventListener("click", () => abrirFluxograma(f));
      return b;
    };

    // abrir a faixa é ler a letra: o pseudocódigo vem logo abaixo do título; a ficha técnica desce
    const conteudo = el("div", { class: corDe(a) }, [
      el("a", { class: "voltar etiqueta", href: `#${a.id}`, text: `${a.titulo} · ${a.codigo}` }),
      el("div", { class: "encarte-topo" }, [capa, el("div", { class: "encarte-titulo" }, [
        el("h1", { text: f.nome }),
        creditos(f).length ? el("p", { class: "feat-linha" }, feat(f)) : null,
        el("p", { class: "objetivo", text: f.objetivo }),
        el("p", { class: "resumo", text: f.resumo }),
        el("p", { class: "ao-vivo", "data-ao-vivo": f.id }),
        el("div", { class: "acoes" }, [botao, el("span", { text: `faixa ${a.faixas.indexOf(f) + 1} de ${a.faixas.length}, ${relogio(duracao(f))}` })]),
      ])]),

      p && el("section", { class: "letra" }, [
        el("header", {}, [
          el("div", {}, el("h2", { text: "Pseudocódigo" })),
          verFluxo(),
        ]),
        blocoPseudo(f),
      ]),

      el("div", { class: "tres dupla" }, [
        el("section", {}, [
          el("h2", { text: "Tempo" }),
          el("p", { class: "ordem", text: f.tempo.notacao }),
          el("p", { class: "conta", html: `<b>${mil(ex.ops)}</b> ${esc(m.tempo.unidade)}<span>${ENCARTE[m.tempo.tipo] ? ENCARTE[m.tempo.tipo].conta(ex) : ordena ? `${ex.n} números, ${ex.movimentos} ${esc(ex.movimento)} na entrada do encarte` : `${ex.n} × ${ex.k} × ${ex.i} na entrada do encarte`}</span>` }),
          el("p", { class: "porque", text: f.tempo.porque }),
          f.tempo.nota && el("p", { class: "nota", text: f.tempo.nota }),
        ]),
        el("section", {}, [
          el("h2", { text: "Memória" }),
          el("p", { class: "ordem", text: f.memoria.notacao }),
          el("p", { class: "conta", html: m.memoria.pico
            ? `<b>${mil(m.memoria.pico)}</b> ${m.memoria.pico === 1 ? "valor" : "valores"} no pico<span>${(ENCARTE[m.tempo.tipo] || {}).alem ? ENCARTE[m.tempo.tipo].alem(ex) : `além ${(ENCARTE[m.tempo.tipo] || {}).artigo || "dos"} ${ex.n} ${entrada} de entrada`}</span>`
            : `<b>nada</b> que cresça com n<span>${esc(f.memoria.vazio || "ordena dentro do próprio vetor")}</span>` }),
          el("p", { class: "porque", text: f.memoria.porque }),
          f.memoria.nota && el("p", { class: "nota", text: f.memoria.nota }),
        ]),
      ]),



      casos ? el("section", { class: "secao" }, [
        el("h2", { text: gr.titulo }),
        el("p", { text: gr.texto }),
        el("div", { class: temDist || porK || erro || alfa || altura ? "dois" : "um" }, [
          el("figure", { class: "figura" }, [fig1, el("figcaption", { text: preencher(alfa ? gr.alfa : gr.crescimento) })]),
          (temDist || porK || erro || alfa || altura) && el("figure", { class: "figura" }, [fig2, el("figcaption", { text: preencher(porK ? gr.por_k : erro ? gr.erro : alfa ? gr.crescimento : altura ? gr.altura : gr.distribuicao) })]),
        ]),
      ]) : ordena ? el("section", { class: "secao" }, [
        el("h2", { text: "Tempo: como cresce, e o que muda com a entrada" }),
        el("p", { text: "As mesmas contas para vetores cada vez maiores e para três tipos de entrada." }),
        el("div", { class: "dois" }, [
          el("figure", { class: "figura" }, [fig1, el("figcaption", { text:
            `Comparações para n de ${m.tempo.crescimento[0].n} a ${mil(m.tempo.crescimento.at(-1).n)}. ${m.tempo.crescimento_dados}; a faixa cinza vai do menor ao maior dos aleatórios. Tracejadas: n²/2 e n log₂ n, de referência.` })]),
          el("figure", { class: "figura" }, [fig2, el("figcaption", { text:
            `${dist.vetores} vetores embaralhados de ${dist.n} números: ${Math.min(...dist.comparacoes) === Math.max(...dist.comparacoes) ? `sempre ${Math.min(...dist.comparacoes)}` : `de ${Math.min(...dist.comparacoes)} a ${Math.max(...dist.comparacoes)}`} comparações. A entrada do encarte usa a semente ${ex.semente}.` })]),
        ]),
      ]) : el("section", { class: "secao" }, [
        el("h2", { text: "Tempo: o que cresce, e o que não se controla" }),
        el("p", { text: "Cada volta custa exatamente n·k distâncias. O total é isso vezes o número de voltas, e as voltas mudam com os dados e com o começo." }),
        el("div", { class: "dois" }, [
          el("figure", { class: "figura" }, [fig1, el("figcaption", { text:
            `Total medido (preto) e custo de uma volta (cinza) para n de ${mil(m.tempo.crescimento[0].n)} a ${mil(m.tempo.crescimento.at(-1).n)}, k = ${ex.k}, em escala logarítmica: a razão entre os dois é o número de voltas. Um sorteio por n. ${m.tempo.crescimento_dados}.` })]),
          el("figure", { class: "figura" }, [fig2, el("figcaption", { text:
            `O mesmo iris, ${m.tempo.voltas_por_semente.sementes} sorteios diferentes dos centros iniciais: de ${Math.min(...m.tempo.voltas_por_semente.voltas)} a ${Math.max(...m.tempo.voltas_por_semente.voltas)} voltas. A entrada do encarte usa a semente ${ex.semente}.` })]),
        ]),
      ]),

      m.memoria.pico > 0 && el("section", { class: "secao" }, [
        el("h2", { text: "Memória: o que fica guardado" }),
        el("div", { class: "figura" }, window.Graficos.blocoMemoria(f)),
        temPicoCasos && el("figure", { class: "figura" }, [fig3, el("figcaption", { text: preencher(gr.memoria) })]),
        temPilhaOuAux && el("figure", { class: "figura" }, [fig3, el("figcaption", { text:
          "Memória extra no pico para cada n (lista auxiliar e níveis da pilha de recursão), nas três entradas. Aleatório: o maior pico entre os vetores embaralhados." })]),
      ]),

      codigoMedido,
      el("section", { class: "secao ficha" }, [
        el("h2", { text: "Ficha técnica" }),
        el("div", { class: "placa" }, el("dl", { html: `
          <dt>versão</dt><dd>${esc(f.variante)}</dd>
          ${preenchido(f.placa && f.placa.autor) ? `<dt>autoria</dt><dd>${esc(f.placa.autor)}</dd>` : ""}
          ${preenchido(f.placa && f.placa.ano) ? `<dt>quando</dt><dd>${esc(f.placa.ano)}</dd>` : ""}
          <dt>técnica</dt><dd>Python, sobre ${esc(ex.dados)}</dd>
          ${creditos(f).length ? `<dt>estruturas</dt><dd>${creditos(f).map((c) => `<a href="#estruturas/${c.id}">${esc(c.inst.nome)}</a> (${esc(c.papel)})`).join("<br>")}</dd>` : ""}
          <dt>caminhos</dt><dd><span class="o">M = ${c.M}</span>, a complexidade ciclomática da função medida</dd>` })),
      ]),
      cf && el("p", { class: "conferido", html: `<b>Conferido no R.</b> ${esc(cf.resumo)}` }),
    ]);

    redesenhar = () => {
      const Gr = window.Graficos;
      if (casos && alfa) {
        Gr.graficoAlfa(fig1, f);
        Gr.graficoCasos(fig2, f, "ops");
        if (temPicoCasos) Gr.graficoCasos(fig3, f, "pico");
      } else if (casos) {
        Gr.graficoCasos(fig1, f, "ops");
        if (porK) Gr.graficoCasos(fig2, f, "ops", "por_k");
        else if (erro) Gr.graficoErro(fig2, f);
        else if (altura) Gr.graficoCasos(fig2, f, "altura");
        else if (temDist) Gr.graficoHistograma(fig2, dist.valores, dist.destaque, preencher(gr.rotulo));
        if (temPicoCasos) Gr.graficoCasos(fig3, f, "pico", porK ? "por_k" : "crescimento");
      } else if (ordena) {
        Gr.graficoOrdenacao(fig1, f, "comparacoes");
        Gr.graficoHistograma(fig2, dist.comparacoes, ex.ops, `comparações (n = ${dist.n})`);
        if (temPilhaOuAux) Gr.graficoOrdenacao(fig3, f, "pico");
      } else {
        Gr.graficoCrescimento(fig1, f);
        Gr.graficoHistograma(fig2, m.tempo.voltas_por_semente.voltas, ex.i, "voltas até parar (i)");
      }
      if (codigoMedido.open) codigo.replaceChildren(Gr.blocoCodigo(f));
    };
    return conteudo;
  }

  // ---------- fluxograma em lightbox (do encarte e do palco) ----------

  const caixaFluxo = $("#caixa-fluxo");
  function abrirFluxograma(f) {
    const p = f.pseudocodigo, c = f.medido.ciclomatica;
    if (!p) return;
    $("#caixa-fluxo-titulo").replaceChildren(`${f.nome}: fluxograma`);
    $("#caixa-fluxo-corpo").replaceChildren(
      el("p", { class: "caixa-nota", text: "Gerado do pseudocódigo: losango para cada decisão (uma condição com \"e\" vira dois), hexágono para cada laço \"para\", e a seta da esquerda volta ao começo do laço." }),
      el("p", { class: "contas-m", html: `<span>${p.decisoes.length} ${decisoes(p)} + 1 = <b>${p.M}</b></span><span>${p.arestas} setas − ${p.nos} caixas + 2 = <b>${p.M}</b></span><span>código Python: <b>M = ${c.M}</b>${p.M === c.M ? ", os mesmos ramos" : ""}</span>` }),
      el("div", { class: "fluxo", "data-faixa": f.id }, window.Fluxograma(p)),
    );
    if (!caixaFluxo.open) caixaFluxo.showModal();
  }
  $("#caixa-fluxo-fechar").addEventListener("click", () => caixaFluxo.close());
  caixaFluxo.addEventListener("click", (e) => { if (e.target === caixaFluxo) caixaFluxo.close(); });   // clique fora da caixa
  $("#palco-fluxo").addEventListener("click", (e) => { e.stopPropagation(); if (faixa) abrirFluxograma(faixa); });

  // ---------- rotas ----------

  let redesenhar = null, paginaInst = null;
  const ctxInstrumento = { faixas: G, rotaFaixa, feat, tocar: (f) => tocar(f), cartao: (f) => cartaoFaixa(f), prateleira };

  function rota() {
    let h = "";
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = ""; }   // hash malformado: volta ao início
    const [id, sub] = h.split("/");
    const velho = G.find((f) => f.id === id) || (sub && !PLAYLISTS.some((p) => p.id === id) && G.find((f) => f.id === sub));
    if (velho && id !== "estruturas") { location.replace(rotaFaixa(velho)); return; }   // links antigos: #k-means, #estatistica/k-means
    if (id === "instrumentos" && sub) { location.replace(`#estruturas/${sub}`); return; }
    if (ANTIGOS[id]) { location.replace(`#${ANTIGOS[id]}`); return; }
    const a = PLAYLISTS.find((x) => x.id === id);
    const f = a && sub ? a.faixas.find((x) => x.id === sub) : null;
    const inst = id === "estruturas" && sub ? INSTS.find((x) => x.id === sub) : null;
    const main = $("#conteudo");
    redesenhar = null;
    if (paginaInst) { paginaInst.parar(); paginaInst = null; }   // a demo para; a faixa tocando, não
    if (comparacao) { comparacao.parar(); comparacao = null; }
    let titulo = null, atual = a ? a.id : id;
    if (f) { main.replaceChildren(encarte(f, a)); titulo = f.nome; }
    else if (a) { main.replaceChildren(album(a)); titulo = a.titulo; }
    else if (inst) {
      paginaInst = window.PaginaInstrumento.pagina(inst, ctxInstrumento);
      main.replaceChildren(paginaInst.el);
      redesenhar = paginaInst.redesenhar;
      titulo = `${inst.nome} · estruturas`;
      atual = "algoritmos-e-estruturas";
    } else if (id === "algoritmos-e-estruturas" || id === "estruturas") { main.replaceChildren(algoritmosEEstruturas()); titulo = "Algoritmos e estruturas"; atual = "algoritmos-e-estruturas"; }
    else if (SERIES.some((s) => s.id === id)) { const s = SERIES.find((x) => x.id === id); main.replaceChildren(paginaVideos(s)); titulo = s.titulo; }
    else main.replaceChildren(inicio());
    document.title = titulo ? `${titulo} · ${NOME}` : NOME;
    desenharLateral(atual);
    if (redesenhar) redesenhar();
    marcarTocando();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }

  // ---------- player ----------
  // a faixa é uma simulação ao vivo (simulacao/palco.js): o algoritmo roda em
  // JS, e o relógio anda pelas "unidades" da execução (uma comparação = 1)

  const palco = $("#palco"), fundo = $("#fundo"), tela = $("#tela");
  const botaoTocar = $("#tocar"), trilho = $("#trilho");
  const objetivoPalco = $("#palco-objetivo");   // a linha fina da barra do palco, fora da animação
  let faixa = null, fila = [], tocandoEm = null, sim = null, u = 0, tocando = false, vel = 1, ultimoQuadro = 0, painelEm = null;
  let accelerando = false;              // o ritmo que acelera; vale para todas as faixas, só nesta visita
  let pos = null, arrasto = null;
  // o fim da faixa: o resultado e o "a seguir", com a contagem até a próxima (null quando não há fim aberto)
  let fim = null, repetir = false;
  const ESPERA = 5000;
  const cfgs = {};                      // a entrada escolhida em cada faixa
  const padroes = {};                   // simulação padrão (para a duração das listas), por ritmo

  // o menu de entrada de cada tipo de faixa: rótulo, opções, tamanhos e o botão de sorteio
  const ENTRADAS = {
    ordenacao: { rotulo: "entrada", ns: [8, 16, 24, 32, 48, 64], sortear: "embaralhar", sorteado: "aleatorio",
      opcoes: [["padrao", "a do encarte", "a entrada do encarte"], ["aleatorio", "aleatória", "entrada aleatória"], ["ordenado", "já ordenada", "entrada já ordenada"], ["invertido", "invertida", "entrada invertida"]] },
    busca: { rotulo: "alvo", ns: [8, 16, 24, 32, 48, 64], sortear: "sortear", sorteado: "sorteado",
      opcoes: [["padrao", "o do encarte", "o alvo do encarte"], ["sorteado", "sorteado", "alvo sorteado"], ["comeco", "no começo", "alvo no começo"], ["fim", "no fim", "alvo no fim"], ["ausente", "ausente", "alvo ausente"]] },
    parenteses: { rotulo: "texto", ns: [8, 12, 16, 24, 32, 40], sortear: "sortear texto", sorteado: "balanceada",
      opcoes: [["padrao", "o do encarte", "o texto do encarte"], ["balanceada", "balanceado", "texto balanceado"], ["par_errado", "um par errado", "um par errado"], ["sobra_aberto", "sobra aberto", "sobrando aberto"], ["so_abre", "só abre", "só abrindo"]] },
    atendimento: { rotulo: "movimento", ns: [8, 12, 16, 24, 32, 48], sortear: "sortear clientes", sorteado: "no_limite",
      opcoes: [["padrao", "o do encarte", "os clientes do encarte"], ["calmo", "calmo", "movimento calmo"], ["no_limite", "no limite", "movimento no limite"], ["lotado", "lotado", "movimento lotado"]] },
    prioridade: { rotulo: "movimento", ns: [8, 12, 16, 24, 32, 48], sortear: "sortear pacientes", sorteado: "no_limite",
      opcoes: [["padrao", "o do encarte", "os pacientes do encarte"], ["calmo", "calmo", "movimento calmo"], ["no_limite", "no limite", "movimento no limite"], ["lotado", "lotado", "movimento lotado"]] },
    dijkstra: { rotulo: "grafo", n: "V", ns: [9, 16, 25, 36, 49], sortear: "sortear grafo", sorteado: "sorteado",
      opcoes: [["padrao", "o do encarte", "o grafo do encarte"], ["sorteado", "sorteado", "grafo sorteado"], ["grade", "grade cheia", "grade cheia"], ["caminho", "caminho", "caminho em serpentina"]] },
    inverter: { rotulo: "lista", ns: [4, 6, 8, 10], sortear: "sortear lista", sorteado: "sorteada",
      opcoes: [["padrao", "a do encarte", "a lista do encarte"], ["sorteada", "sorteada", "lista sorteada"]] },
    percursos: { rotulo: "árvore", ns: [7, 15, 23, 31], sortear: "sortear árvore", sorteado: "embaralhada",
      opcoes: [["padrao", "a do encarte", "a árvore do encarte"], ["embaralhada", "embaralhada", "valores embaralhados"], ["crescente", "em ordem", "valores em ordem crescente"], ["cheia", "cheia", "árvore cheia"]] },
    abb: { rotulo: "entrada", ns: [7, 11, 15, 23], sortear: "sortear valores", sorteado: "embaralhada",
      opcoes: [["padrao", "a do encarte", "os valores do encarte"], ["embaralhada", "embaralhada", "valores embaralhados"], ["crescente", "em ordem", "valores em ordem crescente"], ["cheia", "cheia", "na ordem da árvore cheia"]] },
    avl: { rotulo: "entrada", ns: [7, 15, 23, 31], sortear: "sortear valores", sorteado: "embaralhada",
      opcoes: [["padrao", "a do encarte", "os valores do encarte, em ordem"], ["embaralhada", "embaralhada", "valores embaralhados"], ["crescente", "em ordem", "valores em ordem crescente"], ["decrescente", "decrescente", "valores em ordem decrescente"]] },
    janela: { rotulo: "vetor", ns: [8, 12, 16, 24, 32], ks: [3, 4, 6, 8], sortear: "sortear vetor", sorteado: "sorteada",
      opcoes: [["padrao", "o do encarte", "o vetor do encarte"], ["sorteada", "sorteado", "vetor sorteado"], ["crescente", "crescente", "vetor crescente"], ["decrescente", "decrescente", "vetor decrescente"]] },
    grafo: { rotulo: "grafo", n: "V", ns: [9, 16, 25, 36, 49], sortear: "sortear grafo", sorteado: "sorteado", fixos: ["grade", "caminho"],
      opcoes: [["padrao", "o do encarte", "o grafo do encarte"], ["sorteado", "sorteado", "grafo sorteado"], ["grade", "grade cheia", "grade cheia"], ["caminho", "caminho", "caminho em serpentina"]] },
    mediana: { rotulo: "entrada", ns: [8, 16, 24, 32, 48, 64], sortear: "embaralhar", sorteado: "aleatorio", fixos: ["ordenado", "invertido"],
      opcoes: [["padrao", "a do encarte", "o trees do encarte"], ["aleatorio", "aleatória", "entrada aleatória"], ["ordenado", "já ordenada", "entrada já ordenada"], ["invertido", "invertida", "entrada invertida"]] },
    // o Welford roda sempre sobre os 98 anos do encarte; o menu só soma uma constante a todos
    welford: { rotulo: "somar", ns: [98], nFixo: true, semSorteio: true,
      opcoes: [["padrao", "nada (o do encarte)", "o LakeHuron do encarte"], ["d6", "10⁶", "o LakeHuron + 10⁶"], ["d8", "10⁸", "o LakeHuron + 10⁸"], ["d9", "10⁹", "o LakeHuron + 10⁹"]] },
    // o FIGS roda sempre sobre os 32 carros do encarte: o menu troca o modelo, e o s é o número de divisões
    figs: { rotulo: "modelo", ns: [32], nFixo: true, semSorteio: true, k: "s", ks: [1, 2, 3, 4, 5, 6, 8, 10],
      opcoes: [["padrao", "FIGS", "o FIGS, com várias árvores"], ["uma", "uma árvore só", "uma árvore só, com as mesmas divisões"]] },
    histograma: { rotulo: "dados", ns: [50, 100, 200, 400], sortear: "sortear", sorteado: "normal",
      opcoes: [["padrao", "o do encarte", "o faithful do encarte"], ["normal", "normal", "amostra normal"], ["uniforme", "uniforme", "amostra uniforme"], ["bimodal", "bimodal", "amostra bimodal"]] },
    // a contagem de palavras roda sempre sobre a Canção do Exílio: inteira, ou as n primeiras palavras
    palavras: { rotulo: "texto", ns: [20, 40, 60, 80], semSorteio: true,
      opcoes: [["padrao", "a canção inteira", "a Canção do Exílio inteira"], ["comeco", "o começo", "o começo da Canção do Exílio"]] },
    repetidos: { rotulo: "vetor", ns: [8, 12, 16, 24, 32], sortear: "sortear vetor", sorteado: "sorteada",
      opcoes: [["padrao", "o do encarte", "o vetor do encarte"], ["sorteada", "sorteado", "vetor sorteado"], ["distintos", "todos diferentes", "vetor sem repetidos"], ["poucos", "poucos valores", "vetor com poucos valores"]] },
    encadeamento: { rotulo: "chaves", ns: [4, 8, 12, 16, 24, 32], sortear: "sortear chaves", sorteado: "sorteadas",
      opcoes: [["padrao", "as do encarte", "as chaves do encarte"], ["sorteadas", "sorteadas", "chaves sorteadas"], ["mesma_casa", "na mesma casa", "todas na mesma casa"]] },
    sondagem: { rotulo: "chaves", ns: [4, 8, 12, 14, 15], sortear: "sortear chaves", sorteado: "sorteadas",
      opcoes: [["padrao", "as do encarte", "as chaves do encarte"], ["sorteadas", "sorteadas", "chaves sorteadas"], ["mesma_casa", "na mesma casa", "todas na mesma casa"]] },
    maximo: { rotulo: "vetor", ns: [8, 16, 24, 32, 48, 64], sortear: "sortear vetor", sorteado: "sorteada",
      opcoes: [["padrao", "o do encarte", "o vetor do encarte"], ["sorteada", "sorteado", "vetor sorteado"], ["crescente", "crescente", "vetor crescente"], ["decrescente", "decrescente", "vetor decrescente"]] },
    matrizes: { rotulo: "matrizes", ns: [2, 3, 4, 5, 6], sortear: "sortear matrizes", sorteado: "sorteadas",
      opcoes: [["padrao", "as do encarte", "as matrizes do encarte"], ["sorteadas", "sorteadas", "matrizes sorteadas"]] },
    // o fatorial e os Fibonacci só têm o n: o menu de entrada é um só, e o n fica livre
    fatorial: { rotulo: "calcular", ns: [3, 5, 8, 10, 15, 20], semSorteio: true, nLivre: true, opcoes: [["padrao", "n!", "o fatorial de n"]] },
    fib_recursivo: { rotulo: "calcular", ns: [5, 8, 10, 12, 15], semSorteio: true, nLivre: true, opcoes: [["padrao", "fib(n)", "fib(n)"]] },
    fib_memoria: { rotulo: "calcular", ns: [5, 8, 10, 15, 20], semSorteio: true, nLivre: true, opcoes: [["padrao", "fib(n)", "fib(n)"]] },
    fib_iterativo: { rotulo: "calcular", ns: [5, 10, 15, 20, 30, 40], semSorteio: true, nLivre: true, opcoes: [["padrao", "fib(n)", "fib(n)"]] },
    busca_padrao: { rotulo: "texto", k: "m", ns: [24, 40, 64, 96], ks: [2, 3, 4, 8], sortear: "sortear DNA", sorteado: "dna", fixos: ["pior"],
      opcoes: [["padrao", "a do encarte", "a Canção do Exílio"], ["dna", "DNA sorteado", "DNA sorteado"], ["pior", "pior caso", "o pior caso, aaa…ab"]] },
  };
  const tipoDe = (f) => f.medido.tempo.tipo || "ordenacao";
  const rotuloCfg = (f, c) => (ENTRADAS[tipoDe(f)].opcoes.find((o) => o[0] === c.tipo) || [])[2];

  const cfgPadrao = (f) => (f.alg === "kmeans" ? { k: f.exemplo.iniciais.length, semente: null }
    : { tipo: "padrao", n: f.exemplo.n, semente: 1, ...(f.exemplo.k && ENTRADAS[tipoDe(f)].ks ? { k: f.exemplo.k } : {}) });
  function duracao(f) {
    if (f.arquivo) return f.duracao || 0;
    const chave = `${f.id}:${accelerando}`;
    if (!padroes[chave]) padroes[chave] = window.Palco.criar(f, cfgPadrao(f), accelerando);
    return padroes[chave].total / padroes[chave].ritmo;   // segundos a 1×
  }

  // o palco grande é um diálogo: o foco entra nele, a página atrás fica inerte, e ao sair o foco volta a quem abriu
  let quemAbriu = null;
  function modo(m) {
    const era = palco.dataset.modo;
    palco.dataset.modo = m;
    palco.hidden = m === "oculto";
    fundo.hidden = m !== "grande";
    $(".app").inert = $(".topo").inert = m === "grande";
    if (m === "grande") palco.setAttribute("aria-modal", "true"); else palco.removeAttribute("aria-modal");
    if (m === "grande" && era !== "grande") {
      quemAbriu = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      palco.focus({ preventScroll: true });
    } else if (m !== "grande" && era === "grande") {
      const volta = quemAbriu && quemAbriu.isConnected ? quemAbriu : $("#conteudo");
      quemAbriu = null;
      volta.focus({ preventScroll: true });
    }
    document.body.classList.toggle("com-mini", m === "mini");
    const tocador = $("#tocador");
    if (m === "grande" && tocador.parentNode !== palco) palco.append(tocador);
    else if (m !== "grande" && tocador.parentNode === palco) document.body.append(tocador);
    const botao = $("#palco-modo");
    botao.textContent = m === "grande" ? "–" : "⤢";
    botao.setAttribute("aria-label", m === "grande" ? "Minimizar" : "Ampliar");
    if (m === "grande") palco.style.left = palco.style.top = "";
    if (m === "mini") posicionarMini();
    pintar();
  }

  // o vídeo é uma faixa cujo quadro é o <video> do palco: o relógio (u) é o currentTime dele
  const telaVideo = $("#palco-video");
  // os vídeos não têm legenda; a escolha do botão CC que existiu por um tempo sai do navegador de quem a guardou
  try { localStorage.removeItem("big-o-legendas"); } catch (e) { /* sem armazenamento: nada a limpar */ }

  function simVideo(f) {
    // o arquivo só é pedido quando o vídeo toca (o <video> do palco é um só, com preload="metadata")
    telaVideo.src = f.arquivo;
    telaVideo.playbackRate = vel;
    const s = { video: telaVideo, total: f.duracao || 0, ritmo: 1, passos: [], resumo: {}, varsEm: () => null, eventoEm: () => -1, uDoEvento: () => 0 };
    telaVideo.onloadedmetadata = () => { s.total = telaVideo.duration; atualizarTempo(); };
    telaVideo.onended = () => { if (sim === s) { u = s.total; play(false); terminou(); pintar(); } };
    return s;
  }

  // o estado que o ícone do meio da tela mostra: "inicio" (▶, antes do primeiro play), "tocando", "pausado" (❚❚) ou "fim"
  let jaTocou = false;
  function marcarEstado() {
    palco.dataset.estado = tocando ? "tocando" : fim || (sim && u >= sim.total) ? "fim" : jaTocou ? "pausado" : "inicio";
  }

  function montarSim() {
    jaTocou = false;
    if (sim && sim.video && !(faixa.arquivo)) { telaVideo.pause(); telaVideo.removeAttribute("src"); telaVideo.load(); }
    palco.classList.toggle("e-video", !!faixa.arquivo);
    sim = faixa.arquivo ? simVideo(faixa) : window.Palco.criar(faixa, cfgs[faixa.id], accelerando);
    u = 0;
    painelEm = null;
    atualizarBarra();
    pintar();
  }

  function tocar(f, a) {
    tocandoEm = a || casaDe(f);
    fila = tocandoEm.faixas;
    cancelarFim();
    if (!faixa || faixa.id !== f.id) {
      if (faixa && vel !== 1) { vel = 1; mudarVel(0); }   // cada faixa começa em 1×
      faixa = f;
      if (!f.arquivo && !cfgs[f.id]) cfgs[f.id] = cfgPadrao(f);
      if (!f.arquivo) sincronizarControles();
      montarSim();
    } else if (u >= sim.total) u = 0;
    modo("grande");
    play(true);
    marcarTocando();
  }

  function play(sim_) {
    tocando = sim_ && !!sim;
    if (tocando) jaTocou = true;
    if (sim && sim.video) {
      if (tocando) { if (u >= sim.total - 0.05) telaVideo.currentTime = u = 0; telaVideo.playbackRate = vel; telaVideo.play().catch(() => play(false)); }
      else telaVideo.pause();
    }
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = !faixa ? "none" : tocando ? "playing" : "paused";
    botaoTocar.firstElementChild.firstElementChild.setAttribute("href", tocando ? "#i-pausar" : "#i-tocar");
    botaoTocar.setAttribute("aria-label", tocando ? "Pausar" : "Tocar");
    anunciar();
    marcarEstado();
    ultimoQuadro = performance.now();
    marcarTocando();
  }

  function pular(passo) {
    if (!faixa) return;
    const i = fila.indexOf(faixa) + passo;
    if (i >= 0 && i < fila.length) {
      const grande = palco.dataset.modo === "grande";
      tocar(fila[i], tocandoEm);
      if (!grande) modo("mini");                    // quem está lendo continua lendo
    }
  }

  // o laço de animação: avança o relógio e redesenha
  function quadro(agora) {
    if (tocando && sim && sim.video) { u = telaVideo.currentTime; pintar(); }   // o vídeo anda sozinho; o fim vem do evento ended
    else if (tocando && sim) {
      u = Math.min(sim.total, u + (agora - ultimoQuadro) / 1000 * sim.ritmo * vel);
      if (u >= sim.total) {
        play(false);
        terminou();
      }
      pintar();
    }
    // a contagem do "a seguir" anda só com a aba visível; com a aba em segundo plano, espera
    if (fim && fim.proxima && !fim.parado) {
      if (document.hidden) fim.ate += agora - ultimoQuadro;
      else if (agora >= fim.ate) { cancelarFim(); pular(1); }
      else desenharFim();
    }
    ultimoQuadro = agora;
    requestAnimationFrame(quadro);
  }

  // ---------- o fim da faixa: o resultado, o "a seguir" e o repetir ----------

  function terminou() {
    if (repetir) { u = 0; play(true); return; }
    const i = fila.indexOf(faixa);
    fim = { proxima: fila[i + 1] || null, ate: performance.now() + ESPERA };
    painelEm = null;
    desenharFim(true);
  }

  function cancelarFim() {
    if (!fim) return;
    fim = null;
    if (sim && sim.video) $("#palco-vars").replaceChildren();   // no vídeo o painel só existe para o fim
    marcarEstado();
    painelEm = null;
    palco.classList.remove("no-fim");
    if (sim) pintar();
  }

  // o cartão do fim mora no painel ao lado do quadro: o resultado em verde, a próxima e as três saídas
  function desenharFim(montar) {
    const caixa = $("#palco-vars");
    const resta = Math.max(0, fim.ate - performance.now()), falta = Math.ceil(resta / 1000);
    const conta = caixa.querySelector(".fim-conta .fim-anel");
    if (!montar && conta) {
      conta.querySelector(".fim-anel b").textContent = String(falta);
      conta.querySelector("circle.anda").style.strokeDashoffset = String(113.1 * (1 - resta / ESPERA));
      return;
    }
    palco.classList.add("no-fim");
    marcarEstado();
    const total = faixa.arquivo ? null : sim.contagemEm ? sim.contagemEm(sim.total) : null;
    const botao = (texto, acao, extra = "") => {
      const b = el("button", { type: "button", class: `botao-fim ${extra}`, text: texto });
      b.addEventListener("click", (e) => { e.stopPropagation(); acao(); });
      return b;
    };
    const p = fim.proxima;
    caixa.replaceChildren(el("div", { class: "fim" }, [
      el("p", { class: "fim-rotulo", text: faixa.arquivo ? "fim do vídeo" : "terminou" }),
      total !== null ? el("p", { class: "fim-resultado" }, [el("b", { text: mil(total) }), ` ${faixa.medido.tempo.unidade}`]) : null,
      faixa.tempo ? el("p", { class: "fim-ordem" }, ["tempo ", el("span", { class: "o", text: faixa.tempo.notacao })]) : null,
      // a próxima fica à vista mesmo com a contagem parada (ficar aqui, Esc ou mexer no player): só some o anel
      p ? el("div", { class: `fim-conta ${fim.parado ? "parada" : ""}`, role: "status" }, [
        fim.parado ? null : el("span", { class: "fim-anel" }, [
          el("span", { html: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18"/><circle class="anda" cx="20" cy="20" r="18"/></svg>' }),
          el("b", { text: String(falta) })]),
        el("span", {}, [el("small", { text: fim.parado ? "a seguir, quando você quiser" : "a seguir" }), el("strong", { text: p.nome }), p.tempo ? el("span", { class: "o", text: p.tempo.notacao }) : null]),
      ]) : el("p", { class: "fim-rotulo", text: `fim de ${tocandoEm.titulo}` }),
      el("div", { class: "fim-acoes" }, [
        p ? botao("▶ tocar agora", () => { cancelarFim(); pular(1); }, "principal") : null,
        botao("↻ de novo", () => { cancelarFim(); u = 0; play(true); }, p ? "" : "principal"),
        p && !fim.parado ? botao("ficar aqui", pararContagem) : null,
      ]),
    ]));
  }

  // parar a contagem do "a seguir" sem esconder a próxima faixa
  function pararContagem() {
    if (!fim || !fim.proxima || fim.parado) return false;
    fim.parado = true;
    desenharFim(true);
    return true;
  }

  function alternarRepetir() {
    pararContagem();
    repetir = !repetir;
    $("#repetir").setAttribute("aria-pressed", String(repetir));
  }

  function pintar() {
    if (!sim || palco.hidden) return atualizarTempo();
    if (!sim.video) window.Palco.pintar(tela, sim, u);
    atualizarTempo();
    pintarVariaveis();
    acenderLetra();
  }

  // ---------- painel de variáveis: a linha que roda e os escalares da vez ----------

  const valor = (x) => (x === null || x === undefined ? "—" : x === true ? "verdadeiro" : x === false ? "falso"
    : Number.isInteger(x) ? mil(x) : x.toLocaleString("pt-BR", { maximumFractionDigits: 3 }));

  // a letra sincronizada: no encarte da faixa que toca, acende a linha do pseudocódigo da vez
  function acenderLetra() {
    const atuais = faixa && sim && !sim.video ? [...document.querySelectorAll(`.letra .pseudo[data-faixa="${faixa.id}"]`)] : [];
    document.querySelectorAll(".letra .pseudo[data-agora]").forEach((x) => {   // a faixa mudou: a letra anterior apaga
      if (atuais.includes(x)) return;
      delete x.dataset.agora;
      x.querySelectorAll("li.da-vez").forEach((li) => li.classList.remove("da-vez"));
    });
    if (!atuais.length) return;
    const p = sim.varsEm(u), n = String(p && p.linha ? p.linha : 0);
    for (const ol of atuais) {
      if (ol.dataset.agora === n) continue;
      ol.dataset.agora = n;
      ol.querySelectorAll("li.da-vez").forEach((li) => li.classList.remove("da-vez"));
      const li = ol.querySelector(`li[data-linha="${n}"]`);
      if (!li) continue;
      li.classList.add("da-vez");
      // no palco, a letra rola dentro do próprio painel até a linha acesa (a página não se mexe)
      const caixa = ol.closest(".palco-letra");
      if (caixa) {
        const c = caixa.getBoundingClientRect(), l = li.getBoundingClientRect();
        if (l.top < c.top + l.height || l.bottom > c.bottom - l.height) caixa.scrollTop += l.top - c.top - caixa.clientHeight / 3;
      }
    }
  }

  // o anúncio do leitor de tela: tocando, só isso; parada, a linha do pseudocódigo da vez
  function anunciar() {
    const caixa = $("#palco-anuncio");
    if (!faixa || !sim) { caixa.textContent = ""; return; }
    const p = sim.varsEm(u);
    const texto = tocando ? `Tocando ${faixa.nome}.`
      : p && p.linha && faixa.pseudocodigo ? `Linha ${p.linha}: ${faixa.pseudocodigo.linhas[p.linha - 1].trim()}` : `${faixa.nome}, parada.`;
    if (caixa.textContent !== texto) caixa.textContent = texto;
  }

  // o painel monta uma vez por faixa: a letra (recolhível no celular) e a caixa das variáveis, que muda a cada passo
  function montarPainel(caixa) {
    const largo = window.matchMedia("(min-width: 861px)").matches;
    const letra = faixa.pseudocodigo ? el("details", { class: "letra palco-letra", ...(largo ? { open: "" } : {}) }, [
      el("summary", { text: "ver código" }), blocoPseudo(faixa)]) : null;
    caixa.replaceChildren(...[letra, el("div", { class: "palco-valores", "aria-label": "Variáveis" })].filter(Boolean));
    caixa.dataset.faixa = faixa.id;
  }

  function pintarVariaveis() {
    const caixa = $("#palco-vars");
    if (palco.dataset.modo !== "grande" || fim || sim.video) return;
    if (caixa.dataset.faixa !== faixa.id || !caixa.querySelector(".palco-valores")) { montarPainel(caixa); painelEm = null; }
    const p = sim.varsEm(u);
    const chave = p ? p.k : -1;
    if (chave === painelEm) return;
    painelEm = chave;
    const valores = caixa.querySelector(".palco-valores");
    if (!p) { valores.replaceChildren(el("p", { class: "vars-vazio", text: "As variáveis aparecem no primeiro passo." })); return; }
    const recursiva = Object.prototype.hasOwnProperty.call(p.vars, "a") && Object.prototype.hasOwnProperty.call(p.vars, "b");
    valores.replaceChildren(
      el("dl", { class: "vars" }, Object.entries(p.vars).flatMap(([n, x]) => {
        const mudou = p.mudou.includes(n);
        return [el("dt", { text: n, class: mudou ? "mudou" : "" }), el("dd", { text: valor(x), class: mudou ? "mudou" : "" })];
      })),
      ...(recursiva && p.nivel ? [el("p", { class: "vars-nivel", text: `chamada aberta no nível ${p.nivel} da pilha de recursão` })] : []),
    );
  }

  function atualizarTempo() {
    if (!sim) return;
    $("#tempo-agora").textContent = relogio(u / (sim.ritmo * vel));
    $("#tempo-total").textContent = relogio(sim.total / (sim.ritmo * vel));
    if (!arrastandoTrilho) trilho.value = String(sim.total ? Math.round(1000 * u / sim.total) : 0);
    // o passo da vez aparece num balão sobre a bolinha do trilho, ao passar o mouse ou arrastar
    const feitos = sim.passos.filter((x) => x <= u + 1e-9).length;
    const conta = sim.video ? `${relogio(u)} de ${relogio(sim.total)}` : `passo ${mil(feitos)} de ${mil(sim.passos.length)}`;
    const dica = $("#passo-conta");
    if (dica.textContent !== conta) { dica.textContent = conta; trilho.setAttribute("aria-valuetext", conta); }
    dica.style.left = `${Number(trilho.value) / 10}%`;
    const vivo = !sim.video && document.querySelector(`[data-ao-vivo="${faixa.id}"]`);
    if (vivo) vivo.textContent = textoAoVivo();
  }

  function textoAoVivo() {
    const r = sim.resumo, c = cfgs[faixa.id];
    if (sim.aoVivo) return sim.aoVivo(u, { rotulo: rotuloCfg(faixa, c) });
    if (faixa.alg === "kmeans") {
      return `Tocando agora: k = ${r.k}, ${c.semente === null ? "os centros do encarte" : "centros sorteados"}; ${mil(sim.contagemEm(u))} de ${mil(r.distancias)} distâncias, ${r.voltas} voltas.`;
    }
    const entrada = { padrao: "a entrada do encarte", aleatorio: "entrada aleatória", ordenado: "entrada já ordenada", invertido: "entrada invertida" }[c.tipo];
    return `Tocando agora: n = ${r.n}, ${entrada}; ${mil(sim.contagemEm(u))} de ${mil(r.comparacoes)} comparações, ${mil(r.movimentos)} ${r.movimento}, ${r.pico ? `pico de ${r.pico} valores extras` : "sem memória extra"}.`;
  }

  function atualizarBarra() {
    const a = tocandoEm;
    palco.classList.remove(...[...palco.classList].filter((c) => c.startsWith("cor-")));
    if (a.cor) palco.classList.add(corDe(a));
    $("#agora-capa").replaceChildren(imgCapa(faixa, true));
    $("#agora-capa").disabled = false;
    sessaoDeMidia();
    $("#agora-nome").replaceChildren(faixa.nome, featTexto(faixa) ? el("span", { class: "feat", text: ` ${featTexto(faixa)}` }) : "");
    $("#agora-album").textContent = `${a.titulo}, faixa ${fila.indexOf(faixa) + 1}`;
    $("#agora").href = rotaFaixa(faixa, a);
    $("#palco-titulo").replaceChildren(faixa.nome, feat(faixa) || "", ` · ${a.titulo}`);
    $("#palco-fluxo").hidden = !faixa.pseudocodigo;
    objetivoPalco.textContent = faixa.objetivo || "";
    // "A seguir": a próxima faixa da playlist, à esquerda do transporte do palco
    const prox = fila[fila.indexOf(faixa) + 1], seguir = $("#a-seguir");
    seguir.hidden = !prox;
    if (prox) {
      seguir.querySelector(".a-seguir-capa").replaceChildren(capaFaixa(prox, "mini-48"));
      seguir.querySelector("b").textContent = prox.nome;
      seguir.setAttribute("aria-label", `A seguir: ${prox.nome}`);
    }
    habilitar();
  }

  function habilitar() {
    const i = faixa ? fila.indexOf(faixa) : -1;
    botaoTocar.disabled = !faixa;
    $("#anterior").disabled = i <= 0;
    $("#proxima").disabled = i < 0 || i >= fila.length - 1;
    trilho.disabled = $("#passo-antes").disabled = $("#passo-depois").disabled = !faixa;
  }

  function marcarTocando() {
    document.querySelectorAll(".faixas tr[data-id]").forEach((tr) => {
      const sim_ = !!faixa && tr.dataset.id === faixa.id;
      tr.classList.toggle("tocando", sim_);               // tocando: o equalizador; pausada: o número, em verde
      tr.classList.toggle("parada", sim_ && !tocando);
    });
    document.querySelectorAll(".cartao[data-id]").forEach((c) => c.classList.toggle("tocando", !!faixa && c.dataset.id === faixa.id));
  }

  // ---------- controles da faixa ----------

  function sincronizarControles() {
    const c = cfgs[faixa.id], km = faixa.alg === "kmeans";
    palco.classList.toggle("e-kmeans", km);
    // o k: o do K-means (sem o menu de entrada) ou o da janela (junto do menu)
    const ks = km ? [2, 3, 4, 5] : ENTRADAS[tipoDe(faixa)].ks;
    palco.classList.toggle("e-com-k", !km && !!ks);
    $("#cfg-k-rotulo").textContent = km ? "k" : ENTRADAS[tipoDe(faixa)].k || "k";
    if (ks) {
      $("#cfg-k").replaceChildren(...ks.map((k) => el("option", { text: String(k) })));
      $("#cfg-k").value = String(c.k);
    }
    if (!km) {
      const E = ENTRADAS[tipoDe(faixa)];
      $("#cfg-tipo-rotulo").textContent = E.rotulo;
      $("#cfg-n-rotulo").textContent = E.n || "n";
      $("#cfg-tipo").replaceChildren(...E.opcoes.map(([v, t]) => el("option", { value: v, text: t })));
      const ns = E.ns.includes(c.n) ? E.ns : [...E.ns, c.n].sort((p, q) => p - q);   // o n do encarte sempre aparece
      $("#cfg-n").replaceChildren(...ns.map((n) => el("option", { text: String(n) })));
      $("#cfg-tipo").value = c.tipo; $("#cfg-n").value = String(c.n); $("#cfg-n").disabled = (c.tipo === "padrao" && !E.nLivre) || !!E.nFixo;
    }
    $("#cfg-sortear").innerHTML = `<svg aria-hidden="true"><use href="#i-dado"/></svg>${esc(km ? "sortear centros" : ENTRADAS[tipoDe(faixa)].sortear)}`;
    $("#cfg-sortear").hidden = !km && !!ENTRADAS[tipoDe(faixa)].semSorteio;
    $(".so-tipo").hidden = !km && ENTRADAS[tipoDe(faixa)].opcoes.length === 1;   // um menu de uma opção só não escolhe nada
    desenharEntrada(km);
  }

  // a entrada como botões de player: chips para o tipo (um por opção do menu) e steppers para o n e o k;
  // cada botão só muda o <select> correspondente e dispara o "change", que já reinicia a faixa
  function desenharEntrada(km) {
    const muda = (sel, v) => { sel.value = v; sel.dispatchEvent(new Event("change")); };
    const tipo = $("#cfg-tipo"), n = $("#cfg-n"), k = $("#cfg-k");
    const grupos = [];
    if (!km && !$(".so-tipo").hidden) {
      grupos.push(el("div", { class: "chips-entrada", role: "group", "aria-label": $("#cfg-tipo-rotulo").textContent },
        [...tipo.options].map((o) => {
          const b = el("button", { type: "button", class: "chip-entrada", "aria-pressed": String(o.value === tipo.value), text: o.textContent });
          b.addEventListener("click", () => { if (o.value !== tipo.value) muda(tipo, o.value); });
          return b;
        })));
    }
    const stepper = (sel, rotulo) => {
      const ops = [...sel.options], i = ops.findIndex((o) => o.value === sel.value);
      const passo = (d, txt, nome) => {
        const b = el("button", { type: "button", class: "icone", text: txt, "aria-label": `${rotulo}: ${nome}` });
        b.disabled = sel.disabled || i + d < 0 || i + d >= ops.length;
        b.addEventListener("click", () => muda(sel, ops[i + d].value));
        return b;
      };
      return el("div", { class: `stepper ${sel.disabled ? "parado" : ""}`, role: "group", "aria-label": rotulo }, [
        el("span", { class: "stepper-rotulo", text: rotulo }), passo(-1, "−", "menos"), el("output", { text: sel.value }), passo(1, "+", "mais")]);
    };
    if (!km) grupos.push(stepper(n, $("#cfg-n-rotulo").textContent));
    if (km || palco.classList.contains("e-com-k")) grupos.push(stepper(k, $("#cfg-k-rotulo").textContent));
    $("#palco-entrada").replaceChildren(...grupos);
  }

  function mudarCfg(muda) {
    if (!faixa) return;
    cancelarFim();
    Object.assign(cfgs[faixa.id], muda);
    sincronizarControles();
    const estava = tocando;
    montarSim();
    play(estava);
  }

  $("#cfg-tipo").addEventListener("change", (e) => {
    const tipo = e.target.value;
    mudarCfg(tipo === "padrao" ? cfgPadrao(faixa) : { tipo, n: Number($("#cfg-n").value), semente: novaSemente() });
  });
  $("#cfg-n").addEventListener("change", (e) => mudarCfg({ n: Number(e.target.value), semente: novaSemente() }));
  $("#cfg-k").addEventListener("change", (e) => mudarCfg({ k: Number(e.target.value), semente: novaSemente() }));
  $("#cfg-sortear").addEventListener("click", () => {
    if (faixa.alg === "kmeans") mudarCfg({ semente: novaSemente() });
    else {
      const E = ENTRADAS[tipoDe(faixa)], atual = cfgs[faixa.id].tipo;
      // ordenações: embaralhar é sempre "aleatória"; nas outras, sorteia de novo o caso escolhido
      // casos sem sorteio (a grade cheia e o caminho dos grafos) também vão para o sorteado
      const tipo = tipoDe(faixa) === "ordenacao" || atual === "padrao" || (E.fixos || []).includes(atual) ? E.sorteado : atual;
      mudarCfg({ tipo, n: Number($("#cfg-n").value), semente: novaSemente() });
    }
  });
  // velocidade: − e + andam pela escada; o valor fica no próprio controle (no rodapé e, no celular, no palco)
  const VELS = [0.25, 0.5, 1, 2, 4, 8, 16];
  function mudarVel(d) {
    pararContagem();
    vel = VELS[Math.min(VELS.length - 1, Math.max(0, VELS.indexOf(vel) + d))];
    document.querySelectorAll(".vel-valor").forEach((o) => { o.textContent = `${vel.toLocaleString("pt-BR")}×`; });
    document.querySelectorAll('.vel [data-vel="-1"]').forEach((b) => { b.disabled = vel === VELS[0]; });
    document.querySelectorAll('.vel [data-vel="1"]').forEach((b) => { b.disabled = vel === VELS[VELS.length - 1]; });
    if (sim && sim.video) telaVideo.playbackRate = vel;
    atualizarTempo();
  }
  document.querySelectorAll(".vel [data-vel]").forEach((b) => b.addEventListener("click", () => mudarVel(Number(b.dataset.vel))));
  // accelerando: um jeito de tocar, não uma velocidade; troca o ritmo sem perder o lugar (o mesmo evento, na linha do tempo nova)
  document.querySelectorAll(".acelera").forEach((b) => b.addEventListener("click", (e) => {
    const botao = e.currentTarget;
    accelerando = !accelerando;
    document.querySelectorAll(".acelera").forEach((x) => x.setAttribute("aria-pressed", String(accelerando)));
    if (!faixa || faixa.arquivo) return;
    const k = sim.eventoEm(u), estava = tocando;
    sim = window.Palco.criar(faixa, cfgs[faixa.id], accelerando);
    u = sim.uDoEvento(k);
    painelEm = null;
    play(estava);
    pintar();
    if (!paginaInst) { const y = window.scrollY; rota(); window.scrollTo(0, y); botao.focus(); }   // as durações mostradas mudam com o ritmo
  }));
  const novaSemente = () => Math.floor(Math.random() * 2 ** 31);

  // passo a passo: pausa e vai ao fim do passo anterior/seguinte
  function passo(dir) {
    if (!sim) return;
    cancelarFim();
    play(false);
    if (sim.video) { u = telaVideo.currentTime = Math.min(sim.total, Math.max(0, u + 5 * dir)); pintar(); return; }   // no vídeo, o passo é 5 s
    const ps = sim.passos, eps = 1e-9;
    if (dir > 0) u = ps.find((x) => x > u + eps) ?? sim.total;
    else u = [...ps].reverse().find((x) => x < u - eps) ?? 0;
    pintar();
    anunciar();
  }
  $("#passo-antes").addEventListener("click", () => passo(-1));
  $("#passo-depois").addEventListener("click", () => passo(1));

  // ---------- barra do player ----------

  botaoTocar.addEventListener("click", () => {
    if (!faixa) return;
    cancelarFim();
    if (!tocando) {
      if (u >= sim.total) u = 0;
      if (palco.dataset.modo === "oculto") modo("mini");
      play(true);
    } else play(false);
  });
  $("#anterior").addEventListener("click", () => pular(-1));
  $("#proxima").addEventListener("click", () => pular(1));
  let arrastandoTrilho = false;
  trilho.addEventListener("input", () => {
    if (!sim) return;
    arrastandoTrilho = true;
    cancelarFim();
    u = sim.total * Number(trilho.value) / 1000;
    if (sim.video) telaVideo.currentTime = u;
    pintar();
  });
  trilho.addEventListener("change", () => { arrastandoTrilho = false; });
  [tela, telaVideo].forEach((x) => x.addEventListener("click", () => { if (palco.dataset.modo === "grande") botaoTocar.click(); }));

  // grande → mini: minimizar, clicar fora ou Esc; a simulação continua
  $("#palco-modo").addEventListener("click", (e) => { e.stopPropagation(); modo(palco.dataset.modo === "grande" ? "mini" : "grande"); });
  $("#palco-fechar").addEventListener("click", (e) => { e.stopPropagation(); play(false); cancelarFim(); modo("oculto"); });
  fundo.addEventListener("click", () => modo("mini"));
  document.querySelectorAll(".palco-controles select").forEach((s) => s.addEventListener("change", () => s.blur()));   // as setas voltam a ser do player
  document.addEventListener("keydown", (e) => {
    if (caixaFluxo.open || caixaAjuda.open) return;   // o Esc e as setas são da caixa aberta
    // "/" leva à busca de qualquer lugar (menos de dentro de um campo); o player não usa essa tecla
    if (e.key === "/" && !e.target.closest("input, select, textarea") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); abrirBusca(); return; }
    if (e.key === "MediaPlayPause" && faixa) { e.preventDefault(); botaoTocar.click(); return; }   // a tecla de mídia, com a página em foco
    if (e.key === "MediaTrackNext") { pular(1); return; }
    if (e.key === "MediaTrackPrevious") { pular(-1); return; }
    if (e.key === "?" && !e.target.closest("input, select, textarea")) { abrirAjuda(); return; }
    if (e.key === "Escape" && pararContagem()) return;   // o primeiro Esc para a contagem; o seguinte minimiza
    if (e.key === "Escape" && palco.dataset.modo === "grande") { modo("mini"); return; }
    if (e.target.closest("input, select, textarea")) return;
    // o espaço toca e pausa; com o palco aberto (mini ou grande), sempre, mesmo com o foco num botão (o Enter continua apertando o botão)
    if (e.key === " " && faixa && (palco.dataset.modo !== "oculto" || !e.target.closest("button, a"))) { e.preventDefault(); botaoTocar.click(); }
    if (!faixa || palco.dataset.modo === "oculto" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); passo(e.key === "ArrowRight" ? 1 : -1); }
    if (e.key === "-" || e.key === "_") mudarVel(-1);
    if (e.key === "+" || e.key === "=") mudarVel(1);
    if (e.key === "r" || e.key === "R") alternarRepetir();
    if (e.key === "n" || e.key === "N") pular(1);
    if (e.key === "p" || e.key === "P") pular(-1);
  });
  $("#repetir").addEventListener("click", alternarRepetir);
  $("#agora-capa").addEventListener("click", () => { if (faixa) modo("grande"); });
  $("#a-seguir").addEventListener("click", () => pular(1));

  // ---------- Media Session: os controles do sistema, do teclado de mídia e do fone ----------

  function sessaoDeMidia() {
    if (!("mediaSession" in navigator) || !faixa) return;
    const capa = faixa.capa ? faixa.capa.inteira[480] : faixa.poster;
    navigator.mediaSession.metadata = new MediaMetadata({ title: faixa.nome, artist: tocandoEm.titulo, album: NOME,
      artwork: [{ src: new URL(capa, location.href).href, sizes: faixa.capa ? "480x480" : "960x540", type: faixa.capa ? "image/webp" : "image/png" }] });
  }
  if ("mediaSession" in navigator) {
    const acoes = { play: () => { if (!tocando) botaoTocar.click(); }, pause: () => { if (tocando) botaoTocar.click(); },
      nexttrack: () => pular(1), previoustrack: () => pular(-1), seekforward: () => passo(1), seekbackward: () => passo(-1) };
    for (const [acao, f] of Object.entries(acoes)) { try { navigator.mediaSession.setActionHandler(acao, f); } catch (e) { /* ação sem suporte */ } }
  }

  // ---------- os atalhos: "?" abre a lista ----------

  // ---------- a ajuda: o projeto, os atalhos e quem fez (um <dialog> modal: foco preso, Esc fecha, o foco volta) ----------

  const caixaAjuda = $("#caixa-ajuda");
  function abrirAjuda() { if (!caixaAjuda.open) caixaAjuda.showModal(); }
  $("#ajuda-botao").addEventListener("click", abrirAjuda);
  $("#caixa-ajuda-fechar").addEventListener("click", () => caixaAjuda.close());
  caixaAjuda.addEventListener("click", (e) => { if (e.target === caixaAjuda) caixaAjuda.close(); });

  // ---------- o idioma: por enquanto, só português; o menu mostra o inglês como "em breve" ----------

  const idiomaBotao = $("#idioma-botao"), idiomaMenu = $("#idioma-menu");
  const fecharIdioma = (devolver) => { idiomaMenu.hidden = true; idiomaBotao.setAttribute("aria-expanded", "false"); if (devolver) idiomaBotao.focus(); };
  idiomaBotao.addEventListener("click", (e) => {
    e.stopPropagation();
    const abrir = idiomaMenu.hidden;
    idiomaMenu.hidden = !abrir;
    idiomaBotao.setAttribute("aria-expanded", String(abrir));
    if (abrir) idiomaMenu.querySelector("button").focus();
  });
  idiomaMenu.addEventListener("click", (e) => { e.stopPropagation(); if (e.target.closest("button:not(:disabled)")) fecharIdioma(true); });
  idiomaMenu.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); fecharIdioma(true); } });
  document.addEventListener("click", () => { if (!idiomaMenu.hidden) fecharIdioma(false); });

  // ---------- a busca: faixas, playlists e estruturas, no próprio navegador ----------
  // o texto de cada item (nome, objetivo, versão, playlist, estruturas) sem acento e em minúsculas;
  // o nome que começa com o termo vem antes do que só contém, e o que só bate fora do nome vem depois

  const semAcento = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const INDICE = [
    ...G.map((f) => ({ tipo: "Faixas", nome: f.nome, href: rotaFaixa(f), sub: casaDe(f).titulo, o: f.tempo.notacao, capa: () => capaFaixa(f, "mini-48"),
      extra: [f.objetivo, f.variante, ...PLAYLISTS.filter((p) => p.faixas.includes(f)).map((p) => p.titulo), ...creditos(f).map((c) => c.inst.nome)].join(" ") })),
    ...PLAYLISTS.map((p) => ({ tipo: "Playlists", nome: p.titulo, href: `#${p.id}`, sub: nFaixas(p.faixas.length), capa: () => capaAlbum(p, "mini-48"),
      extra: [p.frase, ...p.subcategorias.map((s) => s.titulo)].join(" ") })),
    ...INSTS.map((i) => ({ tipo: "Estruturas", nome: i.nome, href: `#estruturas/${i.id}`, sub: i.frase, o: i.memoria && i.memoria.notacao,
      capa: () => window.PaginaInstrumento.glifo(i.id, "mini-48"), extra: [i.objetivo, i.variante].join(" ") })),
  ].map((x) => ({ ...x, _nome: semAcento(x.nome), _extra: semAcento(x.extra) }));

  function buscar(termo) {
    const t = semAcento(termo).trim();
    if (!t) return [];
    const palavras = t.split(/\s+/);
    return INDICE.map((x) => {
      const tudo = `${x._nome} ${x._extra}`;
      if (!palavras.every((w) => tudo.includes(w))) return null;
      const nota = x._nome.startsWith(t) ? 0 : x._nome.includes(t) ? 1 : palavras.every((w) => x._nome.includes(w)) ? 2 : 3;
      return { ...x, nota };
    }).filter(Boolean).sort((a, b) => a.nota - b.nota || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const topo = $(".topo"), campo = $("#busca-campo"), lista = $("#busca-lista");
  let achados = [], ativo = -1;
  const LIMITE = { Faixas: 8, Playlists: 5, Estruturas: 5 };
  function mostrarResultados() {
    const r = buscar(campo.value);
    const porTipo = ["Faixas", "Playlists", "Estruturas"].map((tipo) => [tipo, r.filter((x) => x.tipo === tipo).slice(0, LIMITE[tipo])]).filter(([, xs]) => xs.length);
    achados = porTipo.flatMap(([, xs]) => xs);
    ativo = achados.length ? 0 : -1;
    if (!campo.value.trim()) { fecharLista(); return; }
    let k = 0;
    lista.replaceChildren(...(achados.length ? porTipo.map(([tipo, xs]) => el("div", { role: "group", "aria-label": tipo }, [
      el("p", { class: "busca-grupo rotulo-bloco", text: tipo, "aria-hidden": "true" }),
      ...xs.map((x) => {
        const i = k++;
        const op = el("a", { class: "busca-opcao", href: x.href, role: "option", id: `busca-op-${i}`, tabindex: "-1" }, [
          x.capa(), el("span", {}, [el("b", { text: x.nome }), el("small", {}, [x.o ? el("span", { class: "o", text: x.o }) : null, x.o ? " · " : null, x.sub])])]);
        op.addEventListener("mousedown", (e) => e.preventDefault());   // o clique não tira o foco do campo antes de navegar
        op.addEventListener("click", () => fecharBusca());
        return op;
      }),
    ])) : [el("p", { class: "busca-vazio", text: `Nada com “${campo.value.trim()}”.` })]));
    lista.hidden = false;
    campo.setAttribute("aria-expanded", "true");
    marcarAtivo();
  }
  function marcarAtivo() {
    lista.querySelectorAll(".busca-opcao").forEach((o, i) => o.setAttribute("aria-selected", String(i === ativo)));
    const op = ativo >= 0 ? $(`#busca-op-${ativo}`) : null;
    if (op) { campo.setAttribute("aria-activedescendant", op.id); op.scrollIntoView({ block: "nearest" }); } else campo.removeAttribute("aria-activedescendant");
  }
  function fecharLista() { lista.hidden = true; campo.setAttribute("aria-expanded", "false"); campo.removeAttribute("aria-activedescendant"); }
  function abrirBusca() { topo.classList.add("buscando"); campo.focus(); campo.select(); if (campo.value.trim()) mostrarResultados(); }
  function fecharBusca() { fecharLista(); topo.classList.remove("buscando"); campo.blur(); }
  campo.addEventListener("input", mostrarResultados);
  campo.addEventListener("focus", () => { if (campo.value.trim()) mostrarResultados(); });
  campo.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== campo) { fecharLista(); topo.classList.remove("buscando"); } }, 120));
  campo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (lista.hidden) mostrarResultados();
      if (achados.length) { ativo = (ativo + (e.key === "ArrowDown" ? 1 : -1) + achados.length) % achados.length; marcarAtivo(); }
    } else if (e.key === "Enter") {
      const x = achados[ativo];
      if (x) { e.preventDefault(); location.hash = x.href; campo.value = ""; fecharBusca(); }
    } else if (e.key === "Escape") {
      e.stopPropagation();
      if (campo.value) { campo.value = ""; fecharLista(); } else fecharBusca();
    }
    e.stopPropagation();   // as setas, o espaço e as letras são da busca, não do player
  });
  $("#abrir-busca").addEventListener("click", abrirBusca);
  $("#busca-fechar").addEventListener("click", () => { campo.value = ""; fecharBusca(); });

  // o botão nativo aperta no keyup do espaço: com o palco aberto, o espaço já tocou ou pausou no keydown
  document.addEventListener("keyup", (e) => {
    if (e.key === " " && faixa && palco.dataset.modo !== "oculto" && e.target.closest("button, a")) e.preventDefault();
  });

  // mini player: arrasta pela tela, sempre dentro dela; um toque sem arrastar amplia
  function posicionarMini() {
    const barra = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--barra"), 10) || 84;
    if (!pos) pos = { x: window.innerWidth - palco.offsetWidth - 20, y: window.innerHeight - palco.offsetHeight - barra - 20 };
    prenderMini();
  }

  function prenderMini() {
    if (palco.dataset.modo !== "mini" || !pos) return;
    const barra = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--barra"), 10) || 84;
    pos.x = Math.min(Math.max(8, pos.x), window.innerWidth - palco.offsetWidth - 8);
    pos.y = Math.min(Math.max(8, pos.y), window.innerHeight - barra - palco.offsetHeight - 8);   // nunca atrás da barra
    palco.style.left = `${pos.x}px`;
    palco.style.top = `${pos.y}px`;
  }

  palco.addEventListener("pointerdown", (e) => {
    if (palco.dataset.modo !== "mini" || e.target.closest("button, a")) return;
    e.preventDefault();
    arrasto = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moveu: false };
    palco.setPointerCapture(e.pointerId);
  });
  palco.addEventListener("pointermove", (e) => {
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { arrasto.moveu = true; palco.classList.add("arrastando"); }
    pos.x = arrasto.px + dx;
    pos.y = arrasto.py + dy;
    prenderMini();
  });
  palco.addEventListener("pointerup", () => {
    if (arrasto && !arrasto.moveu) modo("grande");
    arrasto = null;
    palco.classList.remove("arrastando");
  });

  let espera;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => { if (redesenhar) redesenhar(); prenderMini(); pintar(); }, 120);
  });
  window.addEventListener("hashchange", rota);

  habilitar();
  rota();
  requestAnimationFrame(quadro);
})();
