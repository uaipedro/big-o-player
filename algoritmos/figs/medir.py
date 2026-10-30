"""Roda o FIGS instrumentado e grava todos os números em dados.json.

Nada na página nem no vídeo é digitado à mão: tudo sai daqui.
Rodar da raiz do projeto: python algoritmos/figs/medir.py

O exemplo é o mtcars do R: 32 carros, o câmbio (automático ou manual) pelo
peso e pela potência, com s = 5 divisões. Ao lado, a árvore única (o mesmo
FIGS com uma árvore só) nos mesmos carros. As curvas usam carros sorteados.
"""
import csv
import json
import math
import os
import random
import statistics
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [AQUI, os.path.join(AQUI, "..", "..", "motor")]

from conta import Contador  # noqa: E402
from ciclomatica import medir as ciclomatica  # noqa: E402
import figs as fg  # noqa: E402

S = 5                                          # as divisões do exemplo
TAMANHOS = [32, 64, 128, 256, 512, 1024, 2048, 4096]
DIVISOES = [1, 2, 4, 8, 16, 32]
N_FIXO = 512
SEMENTES = range(1, 11)
CASOS = {"figs": None, "uma": 1}               # max_arvores de cada caso
NOMES = {"figs": "FIGS", "uma": "uma árvore só"}


def mtcars():
    with open(os.path.join(AQUI, "mtcars.csv"), encoding="utf-8") as f:
        linhas = list(csv.DictReader(f))
    X = [[float(l["peso"]), float(l["potencia"])] for l in linhas]
    y = [1 if l["cambio"] == "manual" else 0 for l in linhas]
    return X, y, [l["carro"] for l in linhas]


def sortear(n, r):
    """Carros inventados no jeito do mtcars: peso de 1,5 a 5,5 mil libras, potência de 50
    a 340 hp; quanto mais leve, mais chance de câmbio manual."""
    X, y = [], []
    for _ in range(n):
        peso, pot = round(r.uniform(1.5, 5.5), 3), r.randint(50, 340)
        chance = 1 / (1 + math.exp(3 * (peso - 3.2) - 0.008 * (pot - 150)))
        X.append([peso, pot])
        y.append(1 if r.random() < chance else 0)
    return X, y


def rodar(X, y, s, max_arvores=None, gravar=False):
    c = Contador()
    c.gravar = gravar
    arvores = fg.figs(X, y, s, c, max_arvores)
    p = [fg.prever(arvores, x) for x in X]
    return {"arvores": arvores, "previsoes": p, "acertos": sum(fg.classe(q) == v for q, v in zip(p, y)),
            "divisoes": sum(len(a) // 2 for a in arvores), "somas": c.ops.get("somas", 0),
            "cortes": c.ops.get("cortes", 0), "pico": c.pico}, c


def varios(n, s, max_arvores):
    rs = [rodar(*sortear(n, random.Random(sem)), s, max_arvores)[0] for sem in SEMENTES]
    ops = [r["somas"] for r in rs]
    return {"media": statistics.mean(ops), "min": min(ops), "max": max(ops), "pico": max(r["pico"] for r in rs)}


def passos(X, y, c):
    """O estado depois de cada divisão: a folha cortada, o corte, o erro e os acertos."""
    out = []
    for f in c.fotos:
        p = [fg.prever(f["arvores"], x) for x in X]
        out.append({"arvore": f["escolhida"][0], "no": f["escolhida"][1], "variavel": f["variavel"], "corte": f["corte"],
                    "ganho": f["ganho"], "somas": f["ops"].get("somas", 0), "cortes": f["ops"].get("cortes", 0),
                    "erro": sum(r * r for r in f["residuos"]), "acertos": sum(fg.classe(q) == v for q, v in zip(p, y)),
                    "arvores": f["arvores"], "residuos": f["residuos"]})
    return out


def main():
    X, y, carros = mtcars()
    n = len(X)
    r, c = rodar(X, y, S)
    u, cu = rodar(X, y, S, 1)
    media_y = sum(y) / n

    crescimento = [{"n": tam, **{k: varios(tam, S, m) for k, m in CASOS.items()}} for tam in TAMANHOS]
    por_s = [{"n": s, **{k: varios(N_FIXO, s, m) for k, m in CASOS.items()}} for s in DIVISOES]

    # as entradas que o teste JS × Python e o conferir.R refazem
    conferir = []
    for s in range(1, 11):
        for k, m in CASOS.items():
            conferir.append({"caso": f"mtcars, {NOMES[k]}, s = {s}", "X": X, "y": y, "s": s, "max_arvores": m})
    for sem, tam in ((1, 60), (2, 120), (3, 200)):
        for k, m in CASOS.items():
            Xs, ys = sortear(tam, random.Random(sem))
            conferir.append({"caso": f"sorteados {tam}, {NOMES[k]}, s = 8", "X": Xs, "y": ys, "s": 8, "max_arvores": m})
    for q in conferir:
        rr = rodar(q["X"], q["y"], q["s"], q["max_arvores"])[0]
        q.update({k: rr[k] for k in ("arvores", "previsoes", "acertos", "somas", "cortes", "pico")})

    dados = {
        "exemplo": {
            "dados": "mtcars (R): o câmbio de 32 carros pelo peso (mil libras) e pela potência (hp)",
            "n": n, "d": 2, "s": S, "k": S, "variaveis": ["peso", "potência"], "classes": ["automático", "manual"],
            "carros": carros, "X": X, "y": y, "min_n": fg.MIN_N, "media_y": media_y,
            "erro_inicial": sum((v - 0) ** 2 for v in y),
            "arvores": r["arvores"], "previsoes": r["previsoes"], "acertos": r["acertos"],
            "divisoes": r["divisoes"], "ops": r["somas"], "cortes": r["cortes"],
            "passos": passos(X, y, c),
            "uma": {"arvores": u["arvores"], "previsoes": u["previsoes"], "acertos": u["acertos"],
                    "divisoes": u["divisoes"], "ops": u["somas"], "cortes": u["cortes"]},
            "passos_uma": passos(X, y, cu),
        },
        "tempo": {
            "unidade": "resíduos somados",
            "tipo": "figs",
            "series": [{"caso": k, "nome": f"{NOMES[k]} (média)"} for k in CASOS],
            "banda": "figs",
            "crescimento": crescimento,
            "eixo": "n (carros; dobra a cada passo)",
            "refs": [],
            "refs_memoria": [],
            "crescimento_dados": f"carros sorteados, média de {len(SEMENTES)} sorteios por tamanho, s = {S}",
            "por_k": por_s,
            "eixo_k": "s (divisões; dobra a cada passo)",
            "k_fixo": S,
            "n_fixo": N_FIXO,
        },
        "memoria": {"pico": c.pico, "detalhe": c.pico_detalhe},
        "ciclomatica": ciclomatica(fg.MEDIDA),
        "conferir": conferir,
    }
    with open(os.path.join(AQUI, "dados.json"), "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False)

    print(f"figs: mtcars n={n}, s={S}: {len(r['arvores'])} árvores, {r['divisoes']} divisões, {r['acertos']}/{n} acertos, "
          f"{r['somas']} somas, {r['cortes']} cortes, pico {c.pico} {c.pico_detalhe}, M={dados['ciclomatica']['M']}")
    print(f"  uma árvore só: {u['divisoes']} divisões, {u['acertos']}/{n} acertos, {u['somas']} somas")
    for g in crescimento:
        print(f"  n={g['n']:5d} " + "  ".join(f"{k} {g[k]['media']:.0f} somas, pico {g[k]['pico']}" for k in CASOS))
    for g in por_s:
        print(f"  s={g['n']:3d} " + "  ".join(f"{k} {g[k]['media']:.0f} somas" for k in CASOS))


if __name__ == "__main__":
    main()
