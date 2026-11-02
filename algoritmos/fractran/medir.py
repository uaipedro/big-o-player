"""Mede o fractran e grava dados.json. Rodar: python3 algoritmos/fractran/medir.py

Antes de medir, confere em todo vetor pequeno e nos casos de ponta: sai em ordem,
os passos batem com (M + 1)(n + 1) + soma − 1 (n, se tudo é zero), e os inteiros
de verdade dão o mesmo N e as mesmas contagens que os expoentes."""
import itertools
import json
import os
import random
import statistics
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [AQUI, os.path.join(AQUI, "..", "..", "motor")]

import fractran
import ordenacao

N_FIXO = 16
MAIORES = [1, 2, 4, 8, 16, 32, 64]     # o eixo do segundo gráfico: o maior número do vetor
SEMENTES = range(1, 11)
PONTA = [[0], [5], [0, 0, 0, 0], [3, 3, 3, 3], [0, 7, 0, 7], [2, 2, 0, 5, 5, 1], [9, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 9]]


def passos_esperados(v):
    return (max(v) + 1) * (len(v) + 1) + sum(v) - 1 if any(v) else len(v)


def conferir_pequenos():
    vetores = [list(w) for n in range(1, 5) for w in itertools.product(range(5), repeat=n)] + PONTA
    for v in vetores:
        r = ordenacao.rodar(fractran, v)    # já exige a saída em ordem
        N, esperado, testes, passos = fractran.fractran_inteiro(v)
        assert N == esperado, f"{v}: N final errado"
        assert passos == r.ops["passos"] == passos_esperados(v), f"{v}: passos"
        assert testes == r.ops["comparacoes"], f"{v}: frações testadas"
    print(f"  {len(vetores)} vetores pequenos: em ordem, passos pela fórmula, inteiros iguais aos expoentes")


def com_maior(n, M, semente):
    """n números de 0 a M, com M garantido no vetor."""
    sorteio = random.Random(semente)
    v = [sorteio.randint(0, M) for _ in range(n)]
    v[sorteio.randrange(n)] = M
    return v


def por_maior():
    """A mesma faixa de números em três ordens, com a média dos sorteios."""
    linhas = []
    for M in MAIORES:
        testes = [ordenacao.rodar(fractran, com_maior(N_FIXO, M, s)).ops["comparacoes"] for s in SEMENTES]
        base = com_maior(N_FIXO, M, SEMENTES[0])
        um = lambda v: {"media": ordenacao.rodar(fractran, v).ops["comparacoes"], "pico": 0}
        linhas.append({"n": M, "aleatorio": {"media": statistics.mean(testes), "min": min(testes), "max": max(testes), "pico": 0},
                       "ordenado": um(sorted(base)), "invertido": um(sorted(base, reverse=True))})
        assert linhas[-1]["ordenado"]["media"] == linhas[-1]["invertido"]["media"] == testes[0], f"M={M}: a ordem mudou a conta"
    return linhas


if __name__ == "__main__":
    conferir_pequenos()
    dados = ordenacao.medir(fractran, AQUI, n_video=8, tamanhos=[4, 8, 16, 32, 64],
                            conferir_em=[(24, s) for s in range(1, 6)], unidade="frações testadas")
    for v in PONTA:     # vão também para o R e para o JS
        r = ordenacao.rodar(fractran, v)
        dados["conferir"].append({"vetor": v, "comparacoes": r.ops["comparacoes"], "movimentos": r.ops["passos"]})

    # o que a ficha diz: a ordem não muda a conta, e dobrar n multiplica por quase 8
    t = dados["tempo"]
    assert len(set(t["distribuicao"]["comparacoes"])) == 1, "a ordem mudou a conta"
    for g in t["crescimento"]:
        assert g["aleatorio"]["min"] == g["aleatorio"]["max"] == g["ordenado"]["comparacoes"] == g["invertido"]["comparacoes"]
    razao = t["crescimento"][-1]["ordenado"]["comparacoes"] / t["crescimento"][-2]["ordenado"]["comparacoes"]
    assert 7.5 < razao < 8, f"dobrar n multiplicou por {razao}"

    # os gráficos de casos: os três tipos de entrada, × n e × o maior número
    del t["distribuicao"]
    for g in t["crescimento"]:
        for caso in ("ordenado", "invertido"):
            g[caso] = {"media": g[caso]["comparacoes"], "pico": g[caso]["pico"]}
    t.update(tipo="fractran", eixo="n (números; dobra a cada passo)", refs=[], banda="aleatorio",
             series=[{"caso": "aleatorio", "nome": "embaralhado (média)"}, {"caso": "ordenado", "nome": "já ordenado"},
                     {"caso": "invertido", "nome": "invertido"}],
             por_k=por_maior(), k_fixo=MAIORES[-1], n_fixo=N_FIXO, eixo_k=f"M, o maior número (n = {N_FIXO})")
    with open(os.path.join(AQUI, "dados.json"), "w") as f:
        json.dump(dados, f, ensure_ascii=False)
