"""FIGS (Fast Interpretable Greedy-tree Sums), como o figs() do pacote figsr,
com contadores.

Várias árvores pequenas crescem ao mesmo tempo, e a previsão é a soma delas.
A cada passo, cada folha de cada árvore, e a raiz de uma árvore nova, procura
o corte que mais reduz a soma dos quadrados dos resíduos; o melhor de todos
entra, e os resíduos são refeitos. Classificação com duas classes: y vira 0/1
e a soma das folhas estima a chance da segunda classe.

Tempo: cada resíduo somado na varredura de uma variável passa por
`conta.op("somas")`; cada corte avaliado, por `conta.op("cortes")`. Uma
candidata só é varrida de novo se algum resíduo dela mudou desde a última
busca (o cache do figsr). A ordem dos exemplos por variável é montada uma vez,
quando a candidata nasce, e fica fora da conta. A complexidade ciclomática é
medida na função `figs`.
"""
import bisect
import math

MIN_N = 5            # o min_n do figsr: cada lado de um corte fica com pelo menos 5 exemplos
MAX_CORTES = 30      # com mais cortes que isso, o figsr testa só 30, nos quantis
TOLERANCIA = 1e-10   # ganhos tão perto assim do melhor contam como empate (fica o primeiro)
GANHO_MINIMO = 1e-6  # abaixo disso, o corte não melhora nada e o FIGS para


def bate(ganho, atual):
    """O `beats()` do figsr: o novo só vence se passar do atual pela tolerância."""
    return atual == -math.inf or ganho > atual + TOLERANCIA * abs(atual)


def media(v):
    """A média em duas passadas, como o mean() do R. Somas num laço, da esquerda para a
    direita: o sum() do Python compensa o arredondamento, e o JS não."""
    s = 0.0
    for x in v:
        s += x
    m = s / len(v)
    t = 0.0
    for x in v:
        t += x - m
    return m + t / len(v)


def media_de(residuos, linhas):
    return media([residuos[i] for i in linhas])


def seq_r(de, ate, n):
    """seq(de, ate, length.out = n) do R: o último é exatamente `ate`."""
    passo = (ate - de) / (n - 1)
    return [de] + [de + i * passo for i in range(1, n - 1)] + [ate]


def quantis(xs, probs):
    """quantile(xs, probs, type = 7) com xs já em ordem, pela mesma conta do R."""
    n = len(xs)
    qs = []
    for p in probs:
        indice = 1 + max(n - 1, 0) * p
        lo, hi = math.floor(indice), math.ceil(indice)
        q = xs[lo - 1]
        if indice > lo and xs[hi - 1] != q:
            h = indice - lo
            q = (1 - h) * q + h * xs[hi - 1]
        qs.append(q)
    return qs


def cortes_de(xs):
    """Os cortes de uma variável numa candidata (xs em ordem): os pontos médios entre
    valores vizinhos diferentes, ou 30 quantis quando passam de 30. Devolve, para cada
    corte, o valor e quantos exemplos ficam do lado esquerdo (x ≤ corte)."""
    vals = [xs[0]] + [xs[i] for i in range(1, len(xs)) if xs[i] != xs[i - 1]]
    if len(vals) <= 1:
        return None
    cs = [(vals[i] + vals[i + 1]) / 2 for i in range(len(vals) - 1)]
    if len(cs) > MAX_CORTES:
        cs = list(dict.fromkeys(quantis(xs, seq_r(0.05, 0.95, MAX_CORTES))))
    return [(c, bisect.bisect_right(xs, c)) for c in cs]


def candidata(X, linhas, arvore, no, ordem=None):
    """Uma folha (ou a raiz de uma árvore nova, com arvore = 0) que pode ser cortada.
    Guarda, por variável, os exemplos em ordem de valor e os cortes válidos (os dois
    lados com pelo menos MIN_N exemplos). Uma filha herda a ordem da mãe, sem reordenar."""
    d = len(X[0])
    if ordem is None:
        ordem = [sorted(linhas, key=lambda i: X[i][j]) for j in range(d)]
    else:
        dentro = set(linhas)
        ordem = [[i for i in o if i in dentro] for o in ordem]
    n = len(linhas)
    variaveis, cortes = [], []
    for j in range(d):
        cs = cortes_de([X[i][j] for i in ordem[j]]) if n >= 2 * MIN_N else None
        if cs is not None:   # a variável é varrida, mesmo que nenhum corte dela seja válido
            variaveis.append(j)
            cortes.append([(c, e) for c, e in cs if e >= MIN_N and n - e >= MIN_N])
    return {"arvore": arvore, "no": no, "linhas": linhas, "ordem": ordem, "variaveis": variaveis,
            "cortes": cortes, "suja": True, "ganho": -math.inf, "corte": None}


def figs(X, y, max_divisoes, conta, max_arvores=None):
    n = len(y)
    residuos = conta.aloca("residuos", list(map(float, y)))
    arvores = []
    candidatas = [candidata(X, list(range(n)), 0, 1)]
    conta.ocupa("ordens", len(X[0]) * n)
    for passo in range(max_divisoes):
        melhor, ganho = None, -math.inf
        for c in candidatas:
            if c["suja"]:
                c["suja"], c["ganho"], c["corte"] = False, -math.inf, None
                m = media_de(residuos, c["linhas"])
                for q, j in enumerate(c["variaveis"]):
                    s, soma = [0.0], 0.0
                    for i in c["ordem"][j]:
                        conta.op("somas")
                        soma += residuos[i] - m
                        s.append(soma)
                    conta.aloca("somas", s)
                    for corte, e in c["cortes"][q]:
                        conta.op("cortes")
                        g = s[e] ** 2 / e + (soma - s[e]) ** 2 / (len(s) - 1 - e) - soma ** 2 / (len(s) - 1)
                        if bate(g, c["ganho"]):
                            c["ganho"], c["corte"] = g, (j, corte)
            if bate(c["ganho"], ganho):
                melhor, ganho = c, c["ganho"]
        if ganho <= GANHO_MINIMO:
            break
        dividir(X, melhor, residuos, arvores, candidatas, max_arvores, conta)
    return arvores


def dividir(X, c, residuos, arvores, candidatas, max_arvores, conta):
    """Corta a candidata escolhida: as duas folhas novas somam a média dos seus resíduos
    ao que a folha mãe já previa, e os resíduos delas caem dessa média. As candidatas
    com algum resíduo mudado são marcadas para uma busca nova."""
    (j, corte), ganho = c["corte"], c["ganho"]
    esq = [i for i in c["linhas"] if X[i][j] <= corte]
    dir_ = [i for i in c["linhas"] if X[i][j] > corte]
    me, md = media([residuos[i] for i in esq]), media([residuos[i] for i in dir_])
    if c["arvore"] == 0:   # a raiz de uma árvore nova
        arvores.append([no(1, 0.0, len(c["linhas"])), no(2, me, len(esq)), no(3, md, len(dir_))])
        t, mae, base, ordem = len(arvores), 1, 0.0, c["ordem"]
    else:
        t, mae = c["arvore"], c["no"]
        base, ordem = arvores[t - 1][mae - 1]["valor"], c["ordem"]
        arvore = arvores[t - 1]
        arvore.append(no(len(arvore) + 1, base + me, len(esq)))
        arvore.append(no(len(arvore) + 1, base + md, len(dir_)))
        candidatas.remove(c)
    pai = arvores[t - 1][mae - 1]
    pai.update(folha=False, variavel=j, corte=corte, esq=len(arvores[t - 1]) - 1, dir=len(arvores[t - 1]), ganho=ganho)
    for i in esq:
        residuos[i] -= me
    for i in dir_:
        residuos[i] -= md
    mudou = set(c["linhas"])
    for o in candidatas:
        if o["arvore"] == 0 or any(i in mudou for i in o["linhas"]):
            o["suja"] = True
    novas = [candidata(X, esq, t, pai["esq"], ordem), candidata(X, dir_, t, pai["dir"], ordem)]
    raiz, folhas = candidatas[0], candidatas[1:] + novas
    if max_arvores is not None and len(arvores) >= max_arvores:   # sem árvore nova: a raiz sai da disputa
        raiz["suja"], raiz["ganho"], raiz["corte"] = False, -math.inf, None
        raiz["variaveis"] = []
    candidatas[:] = [raiz] + sorted(folhas, key=lambda o: (o["arvore"], o["no"]))
    conta.ocupa("ordens", sum(len(o["ordem"]) * len(o["linhas"]) for o in candidatas))
    conta.ocupa("arvores", 3 * sum(len(a) for a in arvores))
    conta.foto(arvores=arvores, residuos=residuos, escolhida=[t, mae], variavel=j, corte=corte, ganho=ganho)


def no(id_, valor, n):
    return {"id": id_, "folha": True, "valor": valor, "n": n, "variavel": None, "corte": None, "esq": None, "dir": None}


def prever(arvores, x):
    """A soma das folhas em que x cai, uma por árvore (sem árvore, a média fica de fora)."""
    total = 0.0
    for a in arvores:
        p = a[0]
        while not p["folha"]:
            p = a[(p["esq"] if x[p["variavel"]] <= p["corte"] else p["dir"]) - 1]
        total += p["valor"]
    return total


def classe(p):
    """A chance da segunda classe presa a [1e-6, 1 − 1e-6], como o predict() do figsr;
    1 (a segunda classe) se for pelo menos 0,5."""
    return 1 if min(max(p, 1e-6), 1 - 1e-6) >= 0.5 else 0


MEDIDA = figs
