// O JavaScript do site tem de contar igual ao Python.
// Roda os algoritmos de simulacao/algoritmos.js nos vetores guardados em
// algoritmos/*/dados.json e compara contagens e resultado; confere também
// se cada evento cai numa linha do pseudocódigo do tipo certo. Para os
// instrumentos (instrumentos/*/dados.json), refaz cada chamada medida e as
// sequências sorteadas e exige o mesmo custo, operação por operação.
//   node testes/conferir_js.mjs
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const exigir = createRequire(import.meta.url);
const A = exigir(join(RAIZ, "simulacao", "algoritmos.js"));
const I = exigir(join(RAIZ, "simulacao", "instrumentos.js"));
const ler = (p) => JSON.parse(readFileSync(join(RAIZ, p), "utf8"));
let falhas = 0;

function confere(nome, obtido, esperado) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) { falhas++; console.log(`  ✗ ${nome}: JS ${JSON.stringify(obtido)} | Python ${JSON.stringify(esperado)}`); }
  return ok;
}

// tipo de cada linha do pseudocódigo
function tipos(pasta) {
  const linhas = ler(`algoritmos/${pasta}/ficha.json`).pseudocodigo.replace(/\n$/, "").split("\n");
  const nome = linhas[0].match(/procedimento\s+(\S+?)\(/)[1];
  return linhas.map((l) => {
    const t = l.trim();
    if (/^(se|enquanto|senão se) /.test(t)) return "decisao";
    if (/^para /.test(t)) return "laco";
    if (t.startsWith(nome + "(") || t.startsWith("procedimento") || new RegExp(`← .*\\b${nome}\\(`).test(t)) return "chamada";   // f ← inserir(p.esq, x) e r ← n · fatorial(n − 1) também chamam
    return "passo";
  });
}

function confereLinhas(pasta, eventos) {
  const tl = tipos(pasta);
  const esperado = { compara: "decisao", troca: "passo", escreve: "passo", pivo: "passo", entra: "chamada",
    menor: "passo", dist: "passo", rotulo: ["decisao", "passo"], volta: "decisao", centros: "passo", testa: "decisao", pare: "passo",
    achou: "passo", devolva: "passo", meio: "passo", corta: "passo", le: "laco", empilha: "passo", desempilha: "passo",
    erro: "passo", enfileira: "passo", maior: "passo", chama: "passo", direto: "passo", atende: "passo",
    atribui: "passo", insere: "passo", descarta: "passo", sai: "chamada", visita: "passo", olha: ["laco", "passo"], topo: "passo", avanca: "passo", classes: "passo", classe: "passo", conta: "passo",
    proximo: "passo", vira: "passo", tira: "passo", poe: "passo", maximo: "passo",
    busca: "decisao", dispersa: "passo", inicio: "passo", sonda: "decisao", liga: "passo",
    desce: "passo", novo: "passo", gira: "passo", girou: "passo", equilibra: "passo",
    multiplica: ["passo", "chamada"], soma: ["passo", "chamada"], ganho: "passo", divide: "passo", residuos: "passo", marca: "passo", lembra: "passo", guarda: "passo", encosta: "laco" };   // o retorno volta à linha da chamada; rótulo: o teste "≠" ou a troca
  let erros = 0;
  for (const e of eventos) {
    if (e.linha === undefined) continue;
    const t = tl[e.linha - 1];
    if (![].concat(esperado[e.t]).includes(t)) {
      if (erros++ < 3) console.log(`  ✗ ${pasta}: evento ${e.t} na linha ${e.linha} (${t})`);
    }
  }
  if (erros) falhas++;
  return erros === 0;
}

// o painel de variáveis do palco: cada evento leva os escalares da vez, na
// convenção do pseudocódigo (índices a partir de 1); eles têm de bater com
// os índices do próprio evento e com o vetor naquele instante
function confereVars(pasta, vetor, eventos) {
  const v = vetor ? vetor.slice() : null;
  const regra = {
    bolha: (e) => e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars["v[i]"] === v[e.i] && e.vars["v[i + 1]"] === v[e.j]),
    insercao: (e) => e.t !== "compara" || (e.vars.j === e.j + 1 && e.vars["v[j − 1]"] === v[e.i] && e.vars["v[j]"] === v[e.j]),
    intercalacao: (e) => (e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1)) && (e.t !== "entra" || (e.vars.a === e.a + 1 && e.vars.b === e.b))
      && (e.t !== "escreve" || e.vars.k === e.k + 1),
    rapida: (e) => (e.t !== "compara" || (e.vars.j === e.j + 1 && e.vars["pivô"] === v[e.i])) && (e.t !== "entra" || (e.vars.a === e.a + 1 && e.vars.b === e.b))
      && (e.t !== "troca" || e.linha !== 7 || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1)),
    selecao: (e) => (e.t !== "compara" || (e.vars.m === e.i + 1 && e.vars.j === e.j + 1 && e.vars["v[m]"] === v[e.i] && e.vars["v[j]"] === v[e.j]))
      && (e.t !== "menor" || e.vars.m === e.m + 1),
    heapsort: (e) => (e.t !== "compara" || (e.linha === 14 ? e.vars.f === e.i + 1 && e.vars.p === e.j + 1 && e.vars["v[f]"] === v[e.i] && e.vars["v[p]"] === v[e.j]
      : e.vars.f === e.j + 1 && e.vars["v[f]"] === v[e.j] && e.i === e.j + 1 && e.i < e.vars.fim))
      && (e.t !== "troca" || e.linha !== 7 || (e.i === 0 && e.j === e.vars.fim - 1)),
    sequencial: (e) => (e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars["v[i]"] === v[e.i])) && (e.t !== "achou" || e.vars.achou === e.i + 1),
    binaria: (e) => (e.t !== "compara" || (e.vars.m === e.i + 1 && e.vars["v[m]"] === v[e.i])) && (e.t !== "meio" || e.vars.m === e.m + 1)
      && (e.t !== "corta" || (e.vars.a === e.a + 1 && e.vars.b === e.b + 1)) && (e.t !== "achou" || e.vars.achou === e.i + 1),
    parenteses: (e) => (e.t !== "le" || e.vars.s === e.s) && (e.t !== "desempilha" || e.vars.topo === e.s)
      && (e.t !== "compara" || (e.vars.topo === e.topo && e.vars.s === e.s)) && (e.t !== "erro" || e.vars.certo === false),
    atendimento: (e) => (e.t !== "enfileira" || (e.vars.i === e.i + 1 && e.vars["tamanho da fila"] === e.casas.filter((x) => x !== null).length))
      && (e.t !== "chama" && e.t !== "direto" || e.vars.k === e.k + 1)
      && (e.t !== "atende" || (e.vars.k === e.k + 1 && e.vars["início"] === e.inicio && e.vars.livre === e.fim)),
    prioridade: (e) => (e.t !== "insere" || (e.vars.i === e.i + 1 && e.vars["tamanho do heap"] === e.casas.length))
      && (e.t !== "chama" && e.t !== "direto" || (e.vars.k === e.k + 1 && e.vars.g === e.g))
      && (e.t !== "atende" || (e.vars.k === e.k + 1 && e.vars["início"] === e.inicio && e.vars.livre === e.fim)),
    largura: (e) => (e.t !== "visita" || (e.vars.u === e.u + 1 && e.vars["v"] === null)) && (e.t !== "olha" || (e.vars.u === e.u + 1 && e.vars.v === e.v + 1))
      && (e.t !== "atribui" || e.v === undefined || e.vars["dist[v]"] === e.d) && (e.t !== "enfileira" || e.vars["tamanho da fila"] >= 1),
    profundidade: (e) => (e.t !== "topo" || e.vars.u === e.u + 1) && (e.t !== "olha" || (e.vars.u === e.u + 1 && e.vars.v === e.v + 1 && e.vars["próximo[u]"] <= e.vars["grau(u)"]))
      && (e.t !== "atribui" || e.v === undefined || (e.vars.k === e.k && e.vars["ordem[v]"] === e.k)) && (e.t !== "desempilha" || e.vars.u === e.u + 1),
    dijkstra: (e) => (e.t !== "tira" || (e.vars.u === e.u + 1 && e.vars.d === e.d && e.vars["tamanho do heap"] === e.casas.length))
      && (e.t !== "olha" || (e.vars.u === e.u + 1 && e.vars.v === e.v + 1 && e.vars.w === e.w))
      && (e.t !== "atribui" || e.v === undefined || (e.vars.v === e.v + 1 && e.vars["dist[v]"] === e.d && e.vars.d + e.vars.w === e.d))
      && (e.t !== "insere" || e.vars["tamanho do heap"] === e.casas.length) && (e.t !== "descarta" || (e.vars.u === e.u + 1 && e.vars["dist[u]"] < e.d)),
    inverter: (e) => (e.t !== "vira" || (e.vars.atual === e.i + 1 && e.vars.anterior === (e.de === null ? null : e.de + 1)))
      && (e.t !== "proximo" || e.vars.atual === e.i + 1),
    janela: (e) => (e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars["v[i]"] === v[e.i] && e.vars.fundo === e.j + 1))
      && (e.t !== "poe" || (e.vars.fundo === e.i + 1 && e.vars["tamanho do deque"] >= 1)) && (e.t !== "maximo" || e.vars["máximo"] === e.m),
    mediana: (e) => (e.t !== "compara" || (e.linha === 8 ? e.vars.j === e.j + 1 && e.vars["pivô"] === v[e.i] : e.vars.m === e.i + 1 && e.vars.j === e.j + 1))
      && (e.t !== "corta" || (e.vars.a === e.a + 1 && e.vars.b === e.b + 1)) && (e.t !== "menor" || e.vars.m === e.m + 1)
      && (e.t !== "troca" || e.linha !== 9 || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1)),
    welford: (e) => e.t !== "le" || e.vars.n === e.i,
    percursos: (e) => (e.t !== "visita" || e.ordem === "largura" || e.vars["p.valor"] !== null) && (e.t !== "entra" || (e.a === null) === (e.vars["p.valor"] === null)),
    abb: (e) => (e.t !== "compara" || (e.vars["p.valor"] !== null && e.vars.x !== null && e.vars["comparações"] >= 1)) && (e.t !== "achou" || e.vars.x === e.vars["p.valor"]),
    avl: (e) => (e.t !== "compara" || (e.vars["p.valor"] !== null && e.vars.x !== e.vars["p.valor"] || e.linha === 4)) && (e.t !== "entra" || (e.a === null) === (e.vars["p.valor"] === null)),
    histograma: (e) => (e.t !== "le" || e.vars.i === e.i + 1) && (e.t !== "conta" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1))
      && (e.t !== "classes" || e.vars.c > 0),
    figs: (e) => (e.t !== "soma" || (e.vars.soma === e.soma && e.vars.i === e.i + 1 && e.vars.j === e.j + 1))
      && (e.t !== "ganho" || (e.vars.ganho === e.g && e.vars.j === e.j + 1)) && (e.t !== "atribui" || e.linha !== 16 || e.vars["c.ganho"] === e.g),
    kmeans: (e) => e.t !== "dist" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1 && e.vars[e.linha === 7 ? "menor" : "d"] === e.x),
    palavras: (e) => e.t === "atribui" || e.t === "devolva" || (e.vars.i === e.i + 1 && typeof e.vars["p[i]"] === "string")
      && (e.t !== "poe" || (e.vars["d[p[i]]"] === 1 && e.vars["palavras distintas"] >= 1)) && (e.t !== "conta" || e.vars["d[p[i]]"] >= 2),
    repetidos: (e) => (e.t !== "le" || (e.vars.i === e.i + 1 && e.vars["v[i]"] === v[e.i])) && (e.t !== "achou" || e.vars["repetido[i]"] === true)
      && (e.t !== "poe" || (e.vars["repetido[i]"] === false && e.vars["valores no dicionário"] >= 1)),
    encadeamento: (e) => (e.t !== "dispersa" || (e.vars.k === e.k && e.vars.i === e.i + 1)) && (e.t !== "avanca" || e.vars["sondagens desta chave"] === e.pos + 1),
    sondagem: (e) => (e.t !== "dispersa" && e.t !== "sonda" && e.t !== "avanca" || (e.vars.k === e.k && e.vars.i === e.i + 1))
      && (e.t !== "poe" || e.vars.n >= 1),
    maximo: (e) => (e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars["v[i]"] === v[e.i])) && (e.t !== "troca" || e.vars.m === v[e.i]),
    multiplicacao: (e) => (e.t !== "multiplica" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1 && e.vars.k === e.k + 1))
      && (e.t !== "escreve" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1 && e.vars.s === e.x)),
    fatorial: (e) => (e.t !== "entra" || e.vars.n === e.a) && (e.t !== "multiplica" || (e.vars.n === e.k && e.vars.r === e.r)),
    fibrecursivo: (e) => (e.t !== "entra" || e.vars.n === e.a) && (e.t !== "soma" || (e.vars.n === e.k && e.vars.r === e.r)),
    fibmemoria: (e) => (e.t !== "entra" || e.vars.n === e.a) && (e.t !== "soma" && e.t !== "lembra" && e.t !== "guarda" || (e.vars.n === e.k && e.vars.r === e.r)),
    fibiterativo: (e) => e.t !== "soma" || (e.vars.i === e.i + 1 && e.vars.a === e.a && e.vars.b === e.b),
    padrao: (e) => (e.t !== "compara" || (e.vars.i === e.i + 1 && e.vars.j === e.j + 1 && e.vars["t[i + j − 1]"] === e.a && e.vars["p[j]"] === e.b))
      && (e.t !== "encosta" || e.vars.i === e.i + 1),
  }[pasta];
  let erros = 0;
  const abertas = [];
  for (const e of eventos) {
    if (e.t === "entra") abertas.push(e.chamada);
    if (e.t === "sai") { abertas.pop(); if (e.nivel !== abertas.length || e.chamada !== (abertas.at(-1) ?? 0)) { if (erros++ < 3) console.log(`  ✗ ${pasta}: retorno no nível ${e.nivel}, chamada ${e.chamada}`); } }
    // escalares: número, booleano, null ou um símbolo (os parênteses mostram o caractere lido)
    // (contar palavras mostra a palavra da vez; o FIGS, a candidata da vez)
    const escalares = e.vars && Object.values(e.vars).every((x) => x === null || typeof x === "number" || typeof x === "boolean" || (typeof x === "string" && (x.length === 1 || pasta === "palavras" || pasta === "fatorial" || pasta === "figs")));
    if (!escalares || !regra(e)) { if (erros++ < 3) console.log(`  ✗ ${pasta}: variáveis do evento ${e.t} ${JSON.stringify(e.vars)}`); }
    if (v && e.t === "troca") { const x = v[e.i]; v[e.i] = v[e.j]; v[e.j] = x; }
    if (v && e.t === "escreve" && e.onde === "v") v[e.k] = e.x;
  }
  if (erros) falhas++;
  return erros === 0;
}

for (const pasta of ["bolha", "insercao", "selecao", "intercalacao", "rapida", "heapsort"]) {
  const d = ler(`algoritmos/${pasta}/dados.json`);
  const casos = [{ nome: "vídeo", vetor: d.exemplo.vetor, comparacoes: d.exemplo.ops, movimentos: d.exemplo.movimentos, pico: d.memoria.pico },
    ...d.conferir.map((c, i) => ({ nome: `conferir ${i + 1}`, ...c }))];
  let ok = true;
  for (const c of casos) {
    const r = A.ordenar(pasta, c.vetor);
    ok = confere(`${pasta} ${c.nome} comparações`, r.comparacoes, c.comparacoes) && ok;
    ok = confere(`${pasta} ${c.nome} movimentos`, r.movimentos, c.movimentos) && ok;
    if (c.pico !== undefined) ok = confere(`${pasta} ${c.nome} pico`, r.pico, c.pico) && ok;
  }
  ok = confereLinhas(pasta, A.ordenar(pasta, d.exemplo.vetor).eventos) && ok;
  for (const c of casos) ok = confereVars(pasta, c.vetor, A.ordenar(pasta, c.vetor).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos.length} vetores)`);
}

{
  const d = ler("algoritmos/kmeans/dados.json");
  const ex = d.exemplo;
  const r = A.kmeans(ex.pontos, ex.iniciais.map((i) => ex.pontos[i]));
  let ok = confere("kmeans voltas", r.voltas, ex.i);
  ok = confere("kmeans distâncias", r.distancias, ex.ops) && ok;
  ok = confere("kmeans rótulos", r.rotulos, ex.final.rotulos) && ok;
  const dif = Math.max(...r.centros.flatMap((q, j) => q.map((x, c) => Math.abs(x - ex.final.centros[j][c]))));
  ok = confere("kmeans centros (diferença < 1e-12)", dif < 1e-12, true) && ok;
  ok = confere("kmeans pico", r.pico, d.memoria.pico) && ok;
  ok = confereLinhas("kmeans", r.eventos) && ok;
  ok = confereVars("kmeans", null, r.eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: kmeans`);
}

{
  const d = ler("algoritmos/figs/dados.json"), ex = d.exemplo;
  // as árvores comparadas campo a campo, na mesma ordem (o JSON do Python e o objeto do JS)
  const forma = (arvores) => arvores.map((a) => a.map((q) => [q.id, q.folha, q.valor, q.n, q.variavel, q.corte, q.esq, q.dir]));
  const medidas = (r) => ({ arvores: forma(r.arvores), previsoes: r.previsoes, acertos: r.acertos, somas: r.somas, cortes: r.cortes, pico: r.pico });
  const casos = [{ caso: "encarte", X: ex.X, y: ex.y, s: ex.s, max_arvores: null, arvores: ex.arvores, previsoes: ex.previsoes, acertos: ex.acertos,
    somas: ex.ops, cortes: ex.cortes, pico: d.memoria.pico },
  { caso: "encarte, uma árvore só", X: ex.X, y: ex.y, s: ex.s, max_arvores: 1, ...ex.uma, somas: ex.uma.ops, pico: undefined }, ...d.conferir];
  let ok = true;
  for (const c of casos) {
    const r = A.figs(c.X, c.y, c.s, c.max_arvores), m = medidas(r), e = medidas(c);
    if (c.pico === undefined) delete m.pico, delete e.pico;
    ok = confere(`figs ${c.caso}`, m, e) && ok;
    ok = confereLinhas("figs", r.eventos) && confereVars("figs", null, r.eventos) && ok;
  }
  console.log(`${ok ? "ok" : "FALHOU"}: figs (${casos.length} ajustes)`);
}

// ---------- buscas, parênteses e fila de atendimento ----------

for (const pasta of ["sequencial", "binaria"]) {
  const d = ler(`algoritmos/${pasta}/dados.json`), ex = d.exemplo;
  const casos = [{ caso: "encarte", vetor: ex.vetor, alvo: ex.alvo, posicao: ex.posicao, comparacoes: ex.ops }, ...d.conferir];
  let ok = true;
  for (const c of casos) {
    const r = A.buscar(pasta, c.vetor, c.alvo);
    ok = confere(`${pasta} ${c.caso} alvo ${c.alvo}`, { posicao: r.posicao, comparacoes: r.comparacoes }, { posicao: c.posicao, comparacoes: c.comparacoes }) && ok;
  }
  ok = confere(`${pasta} pico`, A.buscar(pasta, ex.vetor, ex.alvo).pico, d.memoria.pico) && ok;
  for (const c of casos) ok = confereLinhas(pasta, A.buscar(pasta, c.vetor, c.alvo).eventos) && ok;
  for (const c of casos) ok = confereVars(pasta, c.vetor, A.buscar(pasta, c.vetor, c.alvo).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos.length} buscas)`);
}

{
  const d = ler("algoritmos/parenteses/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ certo: r.certo, ops: r.ops, comparacoes: r.comparacoes, pico: r.pico, casas: r.casas });
  const casos = [{ caso: "encarte", texto: ex.texto, certo: ex.certo, ops: ex.ops, comparacoes: ex.comparacoes, pico: d.memoria.pico, casas: ex.casas }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`parenteses ${c.caso} ${c.texto}`, medidas(A.parenteses(c.texto)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("parenteses", A.parenteses(c.texto).eventos) && ok;
  for (const c of casos) ok = confereVars("parenteses", null, A.parenteses(c.texto).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: parenteses (${casos.length} textos)`);
}

{
  const d = ler("algoritmos/atendimento/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ soma: r.soma, maior: r.maior, esperas: r.esperas, ops: r.ops, pico: r.pico, casas: r.casas });
  const casos = [{ movimento: "encarte", ...ex, pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`atendimento ${c.movimento}`, medidas(A.atendimento(c.chegada, c.duracao)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("atendimento", A.atendimento(c.chegada, c.duracao).eventos) && ok;
  for (const c of casos) ok = confereVars("atendimento", null, A.atendimento(c.chegada, c.duracao).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: atendimento (${casos.length} sorteios)`);
}

{
  const d = ler("algoritmos/prioridade/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ soma: r.soma, maior: r.maior, esperas: r.esperas, ordem: r.ordem, ops: r.ops, operacoes: r.operacoes, pico: r.pico });
  const casos = [{ movimento: "encarte", ...ex, pico: d.memoria.pico }, ...d.conferir];
  const roda = (c) => A.prioridade(c.chegada, c.duracao, c.gravidade);
  let ok = true;
  for (const c of casos) ok = confere(`prioridade ${c.movimento}`, medidas(roda(c)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("prioridade", roda(c).eventos) && ok;
  for (const c of casos) ok = confereVars("prioridade", null, roda(c).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: prioridade (${casos.length} sorteios)`);
}

{
  const d = ler("algoritmos/inverter/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ invertida: r.invertida, ops: r.ops, pico: r.pico, casas: r.casas });
  const casos = [{ ...ex, pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`inverter n=${c.valores.length}`, medidas(A.inverter(c.valores)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("inverter", A.inverter(c.valores).eventos) && ok;
  for (const c of casos) ok = confereVars("inverter", null, A.inverter(c.valores).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: inverter (${casos.length} listas)`);
}

{
  const d = ler("algoritmos/janela/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ maximos: r.maximos, ops: r.ops, deque: r.deque, ingenuo: r.ingenuo, pico: r.pico, casas: r.casas });
  const casos = [{ ...ex, caso: "encarte", pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`janela ${c.caso} n=${c.vetor.length} k=${c.k}`, medidas(A.janela(c.vetor, c.k)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("janela", A.janela(c.vetor, c.k).eventos) && ok;
  for (const c of casos) ok = confereVars("janela", c.vetor, A.janela(c.vetor, c.k).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: janela (${casos.length} vetores)`);
}

for (const pasta of ["largura", "profundidade"]) {
  const d = ler(`algoritmos/${pasta}/dados.json`), ex = d.exemplo;
  const res = pasta === "largura" ? "dist" : "ordem";
  const medidas = (r) => ({ visitas: r.visitas, [res]: r[res], ops: r.ops, estrutura: r.estrutura, casas: r.casas });
  const casos = [{ ...ex, caso: "encarte" }, ...d.conferir];
  let ok = confere(`${pasta} pico`, A[pasta](ex.k * ex.k, ex.arestas).pico, d.memoria.pico);
  for (const c of casos) ok = confere(`${pasta} ${c.caso} k=${c.k}`, medidas(A[pasta](c.k * c.k, c.arestas)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas(pasta, A[pasta](c.k * c.k, c.arestas).eventos) && ok;
  for (const c of casos) ok = confereVars(pasta, null, A[pasta](c.k * c.k, c.arestas).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos.length} grafos)`);
}

{
  const d = ler("algoritmos/dijkstra/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ dist: r.dist, ordem: r.ordem, ops: r.ops, operacoes: r.operacoes, vizinhos: r.vizinhos, descartados: r.descartados, estrutura: r.estrutura });
  const casos = [{ ...ex, caso: "encarte" }, ...d.conferir];
  const roda = (c) => A.dijkstra(c.k * c.k, c.arestas, c.pesos);
  let ok = confere("dijkstra pico", roda(ex).pico, d.memoria.pico);
  for (const c of casos) ok = confere(`dijkstra ${c.caso} k=${c.k}`, medidas(roda(c)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("dijkstra", roda(c).eventos) && ok;
  for (const c of casos) ok = confereVars("dijkstra", null, roda(c).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: dijkstra (${casos.length} grafos)`);
}

// ---------- dispersão ----------

{
  const d = ler("algoritmos/palavras/dados.json");
  const medidas = (r) => ({ d: r.d, m: r.m, ops: r.ops, comparacoes: r.comparacoes, pico: r.pico, contagens: r.contagens });
  let ok = confere("palavras pico", A.palavras(d.exemplo.palavras).pico, d.memoria.pico);
  for (const c of d.conferir) ok = confere(`palavras ${c.texto}`, medidas(A.palavras(c.palavras)), medidas(c)) && ok;
  for (const c of d.conferir) ok = confereLinhas("palavras", A.palavras(c.palavras).eventos) && confereVars("palavras", null, A.palavras(c.palavras).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: palavras (${d.conferir.length} textos)`);
}

{
  const d = ler("algoritmos/repetidos/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ repetido: r.repetido, ops: r.ops, ops_vetor: r.ops_vetor, pico: r.pico, casas: r.casas });
  const casos = [{ ...ex, caso: "encarte", pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`repetidos ${c.caso} n=${c.vetor.length}`, medidas(A.repetidos(c.vetor)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("repetidos", A.repetidos(c.vetor).eventos) && confereVars("repetidos", c.vetor, A.repetidos(c.vetor).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: repetidos (${casos.length} vetores)`);
}

for (const pasta of ["encadeamento", "sondagem"]) {
  const d = ler(`algoritmos/${pasta}/dados.json`), ex = d.exemplo;
  const medidas = (r) => ({ sondagens: r.sondagens, ops: r.ops, pico: r.pico, casas: r.casas, tabela: r.tabela });
  const casos = [{ ...ex, caso: "encarte", pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`${pasta} ${c.caso} n=${c.chaves.length}`, medidas(A[pasta](c.chaves, c.bits)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas(pasta, A[pasta](c.chaves, c.bits).eventos) && confereVars(pasta, null, A[pasta](c.chaves, c.bits).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos.length} tabelas)`);
}

// ---------- primeiros passos ----------

{
  const d = ler("algoritmos/maximo/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ maximo: r.maximo, ops: r.ops, trocas: r.trocas, pico: r.pico });
  const casos = [{ ...ex, caso: "encarte" }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`maximo ${c.caso} n=${c.vetor.length}`, medidas(A.maximo(c.vetor)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("maximo", A.maximo(c.vetor).eventos) && confereVars("maximo", c.vetor, A.maximo(c.vetor).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: maximo (${casos.length} vetores)`);
}

{
  const d = ler("algoritmos/multiplicacao/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ C: r.C, ops: r.ops, pico: r.pico, casas: r.casas });
  const casos = [ex, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`multiplicacao n=${c.A.length}`, medidas(A.multiplicacao(c.A, c.B)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("multiplicacao", A.multiplicacao(c.A, c.B).eventos) && confereVars("multiplicacao", null, A.multiplicacao(c.A, c.B).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: multiplicacao (${casos.length} pares de matrizes)`);
}

{
  const d = ler("algoritmos/fatorial/dados.json");
  const medidas = (r) => ({ fatorial: r.fatorial, ops: r.ops, pico: r.pico });
  let ok = confere("fatorial encarte", medidas(A.fatorial(d.exemplo.n)), medidas(d.exemplo));
  for (const c of d.conferir) ok = confere(`fatorial n=${c.n}`, medidas(A.fatorial(c.n)), medidas(c)) && ok;
  for (const c of d.conferir) ok = confereLinhas("fatorial", A.fatorial(c.n).eventos) && confereVars("fatorial", null, A.fatorial(c.n).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: fatorial (${d.conferir.length + 1} n)`);
}

for (const [pasta, f] of [["fibrecursivo", A.fibRecursivo], ["fibmemoria", A.fibMemoria], ["fibiterativo", A.fibIterativo]]) {
  const d = ler(`algoritmos/${pasta}/dados.json`);
  const medidas = (r) => ({ fib: r.fib, ops: r.ops, pico: r.pico, casas: r.casas });
  let ok = confere(`${pasta} encarte`, { ...medidas(f(d.exemplo.n)), chamadas: f(d.exemplo.n).chamadas }, { ...medidas(d.exemplo), chamadas: d.exemplo.chamadas });
  for (const c of d.conferir) ok = confere(`${pasta} n=${c.n}`, medidas(f(c.n)), medidas(c)) && ok;
  for (const c of d.conferir) ok = confereLinhas(pasta, f(c.n).eventos) && confereVars(pasta, null, f(c.n).eventos) && ok;
  // as três séries do gráfico comum, nos n que o palco toca
  for (const t of d.tempo.crescimento.filter((t) => t.n <= 20)) {
    ok = confere(`${pasta} gráfico n=${t.n}`, [A.fibRecursivo(t.n).ops, A.fibMemoria(t.n).ops, A.fibIterativo(t.n).ops, A.fibRecursivo(t.n).pico, A.fibMemoria(t.n).pico],
      [t.recursivo.ops, t.memoria.ops, t.iterativo.ops, t.recursivo.pico, t.memoria.pico]) && ok;
  }
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${d.conferir.length + 1} n)`);
}

{
  const d = ler("algoritmos/padrao/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ achou: r.achou, ops: r.ops, pico: r.pico, casas: r.casas });
  const casos = [{ ...ex, caso: "encarte" }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`padrao ${c.caso} "${c.padrao}"`, medidas(A.padrao(c.texto, c.padrao)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("padrao", A.padrao(c.texto, c.padrao).eventos) && confereVars("padrao", null, A.padrao(c.texto, c.padrao).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: padrao (${casos.length} buscas)`);
}

// ---------- árvores ----------

for (const [pasta, roda, chaves] of [
  ["percursos", (c) => A.percursos(c.valores), ["pre", "em", "pos", "largura", "visitas", "pilha", "fila", "casas", "altura"]],
  ["abb", (c) => A.buscaArvore(c.valores, c.alvos), ["comparacoes", "achou", "ops", "altura", "pico", "casas"]],
  ["avl", (c) => A.avl(c.valores), ["comparacoes", "ops", "rotacoes", "altura", "comum", "altura_comum", "casas", "pico"]],
]) {
  const d = ler(`algoritmos/${pasta}/dados.json`), ex = d.exemplo;
  const medidas = (r, ref) => Object.fromEntries(chaves.filter((k) => k in ref).map((k) => [k, r[k]]));   // o que o Python gravou
  const casos = [{ ...ex, caso: "encarte", ...(pasta === "percursos" ? { visitas: ex.ops } : {}) }, ...d.conferir];
  let ok = confere(`${pasta} pico`, roda(ex).pico, d.memoria.pico);
  for (const c of casos) ok = confere(`${pasta} ${c.caso} n=${c.valores.length}`, medidas(roda(c), c), medidas(c, c)) && ok;
  for (const c of casos) ok = confereLinhas(pasta, roda(c).eventos) && confereVars(pasta, null, roda(c).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos.length} árvores)`);
}

// ---------- estatística ----------

{
  const d = ler("algoritmos/mediana/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ mediana: r.mediana, comparacoes: r.comparacoes, trocas: r.trocas });
  const casos = [{ caso: "encarte", vetor: ex.vetor, mediana: ex.mediana, comparacoes: ex.ops, trocas: ex.trocas }, ...d.conferir];
  let ok = confere("mediana pico", A.mediana(ex.vetor).pico, d.memoria.pico);
  for (const c of casos) ok = confere(`mediana ${c.caso}`, medidas(A.mediana(c.vetor)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("mediana", A.mediana(c.vetor).eventos) && ok;
  for (const c of casos) ok = confereVars("mediana", c.vetor, A.mediana(c.vetor).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: mediana (${casos.length} vetores)`);
}

{
  const d = ler("algoritmos/welford/dados.json"), ex = d.exemplo;
  const par = (r) => [r.media, r.variancia];
  let ok = confere("welford pico", A.welford(ex.x).pico, d.memoria.pico) && confere("welford leituras", A.welford(ex.x).leituras, ex.ops);
  for (const c of d.conferir) {
    ok = confere(`welford ${c.caso}`, { welford: par(A.welford(c.x)), soma: par(A.somaDosQuadrados(c.x)), duas: par(A.duasPassadas(c.x)) },
      { welford: c.welford, soma: c.soma, duas: c.duas }) && ok;
  }
  for (const m of ex.menu) {   // o palco soma o deslocamento aos anos do encarte, como o Python
    const y = ex.x.map((v) => v + m.deslocamento);
    ok = confere(`welford menu +${m.deslocamento}`, [A.welford(y).variancia, A.somaDosQuadrados(y).variancia, A.duasPassadas(y).variancia],
      [m.welford.variancia, m.soma.variancia, m.duas.variancia]) && ok;
  }
  for (const c of d.conferir) ok = confereLinhas("welford", A.welford(c.x).eventos) && confereVars("welford", null, A.welford(c.x).eventos) && ok;
  for (const t of d.tempo.crescimento) ok = confere(`welford leituras n=${t.n}`, [t.welford.ops, t.soma.ops, t.duas.ops, t.duas.pico], [t.n, t.n, 2 * t.n, t.n]) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: welford (${d.conferir.length} vetores, ${ex.menu.length} deslocamentos)`);
}

{
  const d = ler("algoritmos/histograma/dados.json"), ex = d.exemplo;
  const medidas = (r) => ({ contagens: r.contagens, a: r.a, h: r.h, ops: r.ops, pico: r.pico });
  const casos = [{ caso: "encarte", x: ex.x, contagens: ex.contagens, a: ex.a, h: ex.h, ops: ex.ops, pico: d.memoria.pico }, ...d.conferir];
  let ok = true;
  for (const c of casos) ok = confere(`histograma ${c.caso}`, medidas(A.histograma(c.x)), medidas(c)) && ok;
  for (const c of casos) ok = confereLinhas("histograma", A.histograma(c.x).eventos) && confereVars("histograma", null, A.histograma(c.x).eventos) && ok;
  console.log(`${ok ? "ok" : "FALHOU"}: histograma (${casos.length} vetores)`);
}

// os geradores de entrada do palco (o menu "sortear"): cada caso tem de dar o que promete
{
  let ok = true;
  const mov = ler("algoritmos/atendimento/dados.json").exemplo.movimentos;
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [8, 12, 16, 24, 32, 40, 48, 64]) {
      for (const alg of ["sequencial", "binaria"]) {
        const pos = (caso) => { const e = A.entradaBusca(n, alg === "binaria", caso, semente); return A.buscar(alg, e.vetor, e.alvo).posicao; };
        ok = confere(`entrada ${alg} n=${n} s=${semente}`, [pos("comeco"), pos("fim"), pos("ausente"), pos("sorteado") >= 0], [0, n - 1, -1, true]) && ok;
      }
      const certo = (caso) => A.parenteses(A.textoParenteses(n, caso, semente)).certo;
      ok = confere(`texto n=${n} s=${semente}`, ["balanceada", "par_errado", "sobra_aberto", "so_abre"].map(certo), [true, false, false, false]) && ok;
      for (const [m, lim] of Object.entries(mov)) {
        const { chegada, duracao } = A.clientes(n, lim, semente);
        const dentro = (x, [a, b]) => x >= a && x <= b;
        const intervalos = chegada.every((c, k) => dentro(c - (k ? chegada[k - 1] : 0), lim.chegada));
        ok = confere(`clientes ${m} n=${n} s=${semente}`, [chegada.length, intervalos, duracao.every((d) => dentro(d, lim.atendimento))], [n, true, true]) && ok;
        const p = A.pacientes(n, lim, [1, 5], semente);
        ok = confere(`pacientes ${m} n=${n} s=${semente}`, [p.gravidade.length, p.gravidade.every((g) => dentro(g, [1, 5])), A.prioridade(p.chegada, p.duracao, p.gravidade).ordem.length],
          [n, true, n]) && ok;
      }
    }
  }
  // grafos: o número de arestas de cada caso e o sorteado conexo (a busca visita todos)
  for (let semente = 1; semente <= 60; semente++) {
    for (const k of [3, 4, 5, 6, 7]) {
      const V = k * k, E = (caso) => A.grafoGrade(k, caso, semente).length;
      const visitou = A.largura(V, A.grafoGrade(k, "sorteado", semente)).visitas.length;
      ok = confere(`grafo k=${k} s=${semente}`, [E("grade"), E("caminho"), E("sorteado") >= V - 1, visitou], [2 * k * (k - 1), V - 1, true, V]) && ok;
      const as = A.grafoGrade(k, "sorteado", semente), ps = A.pesosGrade(as.length, [1, 9], semente);
      const dj = A.dijkstra(V, as, ps);
      ok = confere(`dijkstra k=${k} s=${semente}`, [ps.every((w) => w >= 1 && w <= 9), dj.dist.every((x) => x !== null), dj.ordem.length], [true, true, V]) && ok;
    }
  }
  // janela: crescente sobe, decrescente desce, todos de 10 a 99; o deque nunca passa de k
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [8, 12, 16, 24, 32]) {
      const sobe = (v) => v.every((x, i) => !i || x > v[i - 1]), desce = (v) => v.every((x, i) => !i || x < v[i - 1]);
      const [s, c, d] = ["sorteada", "crescente", "decrescente"].map((caso) => A.valoresSorteados(n, caso, semente));
      const dentro = [s, c, d].every((v) => v.length === n && v.every((x) => Number.isInteger(x) && x >= 10 && x <= 99));
      const picos = [3, 4, 6, 8].every((k) => A.janela(s, k).pico <= k && A.janela(d, k).pico === Math.min(k, n));
      ok = confere(`valores n=${n} s=${semente}`, [dentro, sobe(c), desce(d), picos], [true, true, true, true]) && ok;
    }
  }
  // repetidos: valores de 10 a 99 (poucos: de 10 a 19), distintos sem repetir; colisões: chaves distintas de 100 a 999, e "mesma casa" numa casa só
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [8, 12, 16, 24, 32]) {
      const [s, dd, p] = ["sorteada", "distintos", "poucos"].map((caso) => A.valoresRepetidos(n, caso, semente));
      ok = confere(`repetidos n=${n} s=${semente}`, [s.every((x) => x >= 10 && x <= 99), new Set(dd).size, p.every((x) => x >= 10 && x <= 19), A.repetidos(dd).ops_vetor],
        [true, n, true, n * (n - 1) / 2]) && ok;
    }
    for (const n of [4, 8, 12, 15, 32]) {
      const so = A.chavesColisao(n, "sorteadas", 4, semente), mc = A.chavesColisao(n, "mesma_casa", 4, semente);
      const casas = new Set(mc.map((k) => I.casaDe(k, 4)));
      ok = confere(`chaves n=${n} s=${semente}`, [new Set(so).size, so.every((k) => k >= 100 && k <= 999), new Set(mc).size, casas.size],
        [n, true, n, 1]) && ok;
    }
  }
  // árvores: n valores distintos de 10 a 99; a crescente sobe; a cheia monta a árvore mais baixa
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [7, 15, 23, 31]) {
      const [cr, de, em, ch] = ["crescente", "decrescente", "embaralhada", "cheia"].map((caso) => A.valoresArvore(n, caso, semente));
      const certos = [cr, de, em, ch].every((v) => v.length === n && new Set(v).size === n && v.every((x) => Number.isInteger(x) && x >= 10 && x <= 99));
      const mesmos = [de, em, ch].every((v) => JSON.stringify([...v].sort((a, b) => a - b)) === JSON.stringify(cr));
      ok = confere(`valores de árvore n=${n} s=${semente}`, [certos, mesmos, cr.every((x, i) => !i || x > cr[i - 1]), A.percursos(ch).altura, [cr, de, em].every((v) => A.avl(v).altura <= 1.4405 * Math.log2(n + 2))],
        [true, true, true, Math.ceil(Math.log2(n + 1)), true]) && ok;
    }
  }
  // as amostras do histograma: n valores com uma casa decimal, e as contagens somam n
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [50, 100, 200, 272, 400]) {
      for (const forma of ["normal", "uniforme", "bimodal"]) {
        const x = A.amostra(n, forma, semente), r = A.histograma(x);
        ok = confere(`amostra ${forma} n=${n} s=${semente}`, [x.length, x.every((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6), r.contagens.reduce((s, q) => s + q, 0), r.c >= 1],
          [n, true, n, true]) && ok;
      }
    }
  }
  // primeiros passos: matrizes de 0 a 9; o pior caso da busca dá (n − m + 1)·m e acha no fim; o DNA só tem ACGT
  for (let semente = 1; semente <= 60; semente++) {
    for (const n of [2, 3, 4, 5, 6]) {
      const { A: a, B: b } = A.matrizesSorteadas(n, semente);
      ok = confere(`matrizes n=${n} s=${semente}`, [a.length, b[0].length, [...a.flat(), ...b.flat()].every((x) => Number.isInteger(x) && x >= 0 && x <= 9)], [n, n, true]) && ok;
    }
    for (const n of [24, 40, 64, 96]) {
      for (const m of [2, 3, 4, 8]) {
        const pi = A.textoPadrao(n, m, "pior", semente), dn = A.textoPadrao(n, m, "dna", semente), r = A.padrao(pi.texto, pi.padrao);
        ok = confere(`padrao n=${n} m=${m} s=${semente}`, [r.ops, r.achou, dn.texto.length, dn.padrao.length, /^[ACGT]+$/.test(dn.texto + dn.padrao)],
          [(n - m + 1) * m, [n - m], n, m, true]) && ok;
      }
    }
  }
  console.log(`${ok ? "ok" : "FALHOU"}: geradores de entrada do palco`);
}

// ---------- instrumentos ----------

const INSTRUMENTOS = readdirSync(join(RAIZ, "instrumentos"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
if (!INSTRUMENTOS.length) { console.log("nenhum instrumento em instrumentos/"); process.exit(1); }
for (const pasta of INSTRUMENTOS) {
  const d = ler(`instrumentos/${pasta}/dados.json`);
  const custo = (r) => ({ leituras: r.leituras, escritas: r.escritas });
  let ok = true, casos = 0;
  for (const [id, o] of Object.entries(d.operacoes)) {
    for (const t of [...o.tabela, ...o.serie]) {
      casos++;
      let obtido;
      if (o.seguidas) {
        const e = I.montar(o.estrutura, d.encher, 0);
        let soma = { leituras: 0, escritas: 0 }, pior = null;
        for (let i = 0; i < t.n; i++) {
          const r = I.operar(e, o.chamada, [i]);
          soma = { leituras: soma.leituras + r.leituras, escritas: soma.escritas + r.escritas };
          if (!pior || r.leituras + r.escritas > pior.leituras + pior.escritas) pior = { k: i + 1, ...custo(r) };
        }
        obtido = o.seguidas === "pior" ? { n: t.n, ...pior } : { n: t.n, vezes: t.n, ...soma };
      } else {
        const e = I.montar(o.estrutura, d.encher, o.vazia ? 0 : t.n);   // as montagens partem da estrutura vazia
        obtido = { n: t.n, args: t.args, ...(o.vazia ? { vezes: t.n } : {}), ...custo(I.operar(e, o.chamada, t.args)) };
      }
      ok = confere(`${pasta} ${id} n=${t.n}`, obtido, t) && ok;
    }
  }
  for (const [v, serie] of Object.entries(d.capacidade)) {
    for (const t of serie) { casos++; ok = confere(`${pasta} ${v} capacidade n=${t.n}`, I.montar(v, d.encher, t.n).capacidade, t.casas) && ok; }
  }
  for (const c of d.conferir) {
    casos++;
    const e = I.montar(c.estrutura, d.encher, c.inicio ?? 0);
    const passos = c.passos.map((p) => ({ chamada: p.chamada, args: p.args, ...((r) => ({ volta: r.volta, ...custo(r) }))(I.operar(e, p.chamada, p.args)) }));
    ok = confere(`${pasta} ${c.estrutura} sequência ${c.semente}`, { passos, valores: e.valores(), casas: e.capacidade },
      { passos: c.passos, valores: c.valores, casas: c.casas }) && ok;
  }
  console.log(`${ok ? "ok" : "FALHOU"}: ${pasta} (${casos} medidas)`);
}

// a pilha de recursão que a página do instrumento repassa: o pico é o da faixa
const RECURSIVAS = { fatorial: (ex) => A.fatorial(ex.n), fibrecursivo: (ex) => A.fibRecursivo(ex.n), fibmemoria: (ex) => A.fibMemoria(ex.n) };
for (const pasta of ["intercalacao", "rapida", "fatorial", "fibrecursivo", "fibmemoria"]) {
  const d = ler(`algoritmos/${pasta}/dados.json`);
  const r = RECURSIVAS[pasta] ? RECURSIVAS[pasta](d.exemplo) : A.ordenar(pasta, d.exemplo.vetor);
  const p = I.Pilha();
  let pico = 0;
  for (const e of r.eventos) {
    if (e.t === "entra") I.operar(p, "empilhar", [[e.a, e.b]]);
    else if (e.t === "sai") I.operar(p, "desempilhar");
    pico = Math.max(pico, p.n);
  }
  const ok = confere(`${pasta} pico da pilha de chamadas`, pico, d.memoria.detalhe.pilha) && confere(`${pasta} pilha vazia no fim`, p.n, 0);
  console.log(`${ok ? "ok" : "FALHOU"}: pilha de chamadas de ${pasta}`);
}

if (falhas) { console.log(`${falhas} divergência(s) entre JS e Python`); process.exit(1); }
console.log("JS e Python contam igual.");
