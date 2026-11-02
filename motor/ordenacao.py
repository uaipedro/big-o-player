"""Molde comum das ordenações: ajudantes que contam e a medição padrão.

Toda comparação passa por `maior()` e todo movimento por `troca()` (vizinhos
ou não) ou `escreve()` (o merge, que copia valores). Assim as contagens saem
do próprio algoritmo rodando, e os eventos alimentam o vídeo.

Cada algoritmo é um módulo com:
  ordenar(v, conta)   ponto de entrada (ordena v no lugar)
  MEDIDA              a função cuja complexidade ciclomática é medida
  MOVIMENTO           "trocas" ou "escritas"
"""
import json
import os
import random
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from conta import Contador
from ciclomatica import medir as ciclomatica

N_VIDEO = 24          # o mesmo vetor em todos os vídeos de ordenação
SEMENTE_VIDEO = 11
TAMANHOS = [16, 32, 64, 128, 256, 512, 1024]
SEMENTES = range(1, 11)        # 10 vetores aleatórios por tamanho
DISTRIBUICAO = range(1, 201)   # 200 vetores no tamanho do vídeo
CONFERIR = [(50, s) for s in range(1, 6)]   # vetores que o R refaz


# ---------- ajudantes usados dentro dos algoritmos ----------

def maior(v, i, j, conta, onde="v"):
    """v[i] > v[j], contando uma comparação."""
    conta.op("comparacoes")
    conta.evento("compara", i, j, onde)
    return v[i] > v[j]


def troca(v, i, j, conta):
    conta.op("trocas")
    v[i], v[j] = v[j], v[i]
    conta.evento("troca", i, j)


def escreve(v, k, x, conta, onde="v"):
    conta.op("escritas")
    v[k] = x
    conta.evento("escreve", k, x, onde)


# ---------- medição ----------

def vetor(n, semente):
    v = list(range(n))
    random.Random(semente).shuffle(v)
    return v


def rodar(modulo, v, gravar=False):
    conta = Contador()
    conta.gravar = gravar
    w = list(v)
    modulo.ordenar(w, conta)
    if w != sorted(v):
        raise AssertionError(f"{modulo.__name__} não ordenou")
    return conta


def _resumo(c, modulo):
    return {"comparacoes": c.ops.get("comparacoes", 0),
            "movimentos": c.ops.get(modulo.MOVIMENTO, 0), "pico": c.pico}


def medir(modulo, pasta, n_video=N_VIDEO, tamanhos=TAMANHOS, conferir_em=CONFERIR, unidade="comparações"):
    """Os parâmetros servem à faixa que não aguenta o vetor do vídeo nem n = 1024 (o Fractran)."""
    sys.setrecursionlimit(20000)   # quicksort em vetor já ordenado desce n níveis
    v = vetor(n_video, SEMENTE_VIDEO)
    c = rodar(modulo, v, gravar=True)

    crescimento = []
    for n in tamanhos:
        alea = [_resumo(rodar(modulo, vetor(n, s)), modulo) for s in SEMENTES]
        comps = [a["comparacoes"] for a in alea]
        crescimento.append({
            "n": n,
            "aleatorio": {"media": statistics.mean(comps), "min": min(comps), "max": max(comps),
                          "movimentos": statistics.mean(a["movimentos"] for a in alea),
                          "pico": max(a["pico"] for a in alea)},
            "ordenado": _resumo(rodar(modulo, list(range(n))), modulo),
            "invertido": _resumo(rodar(modulo, list(range(n - 1, -1, -1))), modulo),
        })

    dist = [rodar(modulo, vetor(n_video, s)).ops.get("comparacoes", 0) for s in DISTRIBUICAO]

    conferir = []
    n_conferir = conferir_em[0][0]
    for n, s in conferir_em + [(n_conferir, "ordenado"), (n_conferir, "invertido")]:
        w = list(range(n)) if s == "ordenado" else list(range(n - 1, -1, -1)) if s == "invertido" else vetor(n, s)
        r = _resumo(rodar(modulo, w), modulo)
        conferir.append({"vetor": w, "comparacoes": r["comparacoes"], "movimentos": r["movimentos"]})

    dados = {
        "exemplo": {
            "dados": f"{n_video} números (de 0 a {n_video - 1}) embaralhados com a semente {SEMENTE_VIDEO}",
            "n": n_video, "semente": SEMENTE_VIDEO, "vetor": v,
            "ops": c.ops.get("comparacoes", 0), "movimentos": c.ops.get(modulo.MOVIMENTO, 0),
            "movimento": modulo.MOVIMENTO, "eventos": c.eventos,
        },
        "tempo": {
            "unidade": unidade,
            "tipo": "ordenacao",
            "crescimento": crescimento,
            "crescimento_dados": (f"Aleatório: média de {len(SEMENTES)} vetores embaralhados por tamanho; "
                                  "ordenado e invertido: um vetor cada"),
            "distribuicao": {"n": n_video, "vetores": len(DISTRIBUICAO), "comparacoes": dist},
        },
        "memoria": {"pico": c.pico, "detalhe": c.pico_detalhe},
        "ciclomatica": ciclomatica(modulo.MEDIDA),
        "conferir": conferir,
    }
    with open(os.path.join(pasta, "dados.json"), "w") as f:
        json.dump(dados, f, ensure_ascii=False)

    nome = modulo.__name__
    print(f"{nome}: vídeo n={n_video} → {dados['exemplo']['ops']} comparações, "
          f"{dados['exemplo']['movimentos']} {modulo.MOVIMENTO}, pico {c.pico} {c.pico_detalhe}, "
          f"{len(c.eventos)} eventos, M={dados['ciclomatica']['M']}")
    for g in crescimento:
        a = g["aleatorio"]
        print(f"  n={g['n']:5d} aleatório {a['media']:10.1f} [{a['min']}–{a['max']}]  "
              f"ordenado {g['ordenado']['comparacoes']:7d}  invertido {g['invertido']['comparacoes']:7d}  "
              f"pico {a['pico']}/{g['ordenado']['pico']}/{g['invertido']['pico']}")
    print(f"  {len(DISTRIBUICAO)} vetores n={n_video}: {min(dist)} a {max(dist)} comparações")
    return dados
