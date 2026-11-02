"""Fractran sort, no ábaco de 4n frações: um programa FRACTRAN (Conway, 1987)
que ordena. O programa é uma lista de frações, a memória é um número só, N, e
cada registrador é o expoente de um primo em N. A cada passo, a primeira fração
cujo denominador divide N multiplica N; se nenhuma divide, o programa para.

Cada camada tira uma conta de cada p que ainda tem e põe o mesmo tanto em q, da
direita pra esquerda, como no bead sort. Os registradores:

  p[1..n]    a entrada
  q[1..n]    a saída, em ordem
  s[1..n+1]  qual p a varredura está lendo (s[n+1]: a camada acabou)
  m[0..n]    m[r]: a próxima conta da camada cai em q[r] (m[0]: não cabe mais)
  t          uma conta em trânsito de p para q

As contagens rodam nos expoentes, que dão o mesmo que dividir N de verdade e são
bem mais rápidos; `fractran_inteiro` faz a conta com inteiros, e o medir.py exige
as mesmas contagens e o mesmo N nos dois."""
MOVIMENTO = "passos"


def registradores(n):
    """Onde cada registrador mora na lista de expoentes: 4n + 3 no total."""
    p = list(range(n))
    q = list(range(n, 2 * n))
    s = list(range(2 * n, 3 * n + 1))
    m = list(range(3 * n + 1, 4 * n + 2))
    return p, q, s, m, 4 * n + 2


def programa(n):
    """As 4n frações, na ordem, cada uma como (numerador, denominador): as listas
    dos registradores que a fração soma e dos que ela exige e tira."""
    p, q, s, m, t = registradores(n)
    F = []
    for r in range(n, 0, -1):      # a conta em trânsito cai em q[r]; vem antes de tudo
        F.append(((m[r - 1], q[r - 1]), (t, m[r])))
    for i in range(n):             # a varredura lê p[i]: tira uma conta, ou passa reto
        F.append(((s[i + 1], t), (s[i], p[i])))
        F.append(((s[i + 1],), (s[i],)))
    for r in range(n):             # a camada acabou e alguma conta caiu: volta ao começo
        F.append(((s[0], m[n]), (s[n], m[r])))
    return F


def entrada(v):
    """Os expoentes de N no começo: s[1] · m[n] · p[1]^v[1] · … · p[n]^v[n]."""
    n = len(v)
    p, _, s, m, t = registradores(n)
    expo = [0] * (t + 1)
    expo[s[0]] = expo[m[n]] = 1
    for i in range(n):
        expo[p[i]] = v[i]
    return expo


def divide(expo, den):
    for x in den:
        if not expo[x]:
            return False
    return True


def aplica(expo, f):
    num, den = f
    for x in den:
        expo[x] -= 1
    for x in num:
        expo[x] += 1


def fractran(v, conta):
    n = len(v)
    F = programa(n)
    expo = entrada(v)
    conta.ocupa("programa", len(F))
    conta.ocupa("expoentes", len(expo))
    achou = True
    while achou:
        achou = False
        for f in range(len(F)):
            conta.op("comparacoes")
            if divide(expo, F[f][1]):
                aplica(expo, F[f])
                conta.op(MOVIMENTO)
                conta.evento("aplica", f)
                achou = True
                break
    v[:] = expo[n:2 * n]


ordenar = fractran
MEDIDA = fractran


# ---------- o mesmo programa em inteiros de verdade ----------

def primos(k):
    achados, c = [], 2
    while len(achados) < k:
        if all(c % x for x in achados):
            achados.append(c)
        c += 1
    return achados


def produto(fatores):
    x = 1
    for f in fatores:
        x *= f
    return x


def fractran_inteiro(v):
    """Roda com N inteiro e devolve (N final, N esperado, frações testadas, passos)."""
    n = len(v)
    P = primos(4 * n + 3)
    F = [(produto(P[x] for x in num), produto(P[x] for x in den)) for num, den in programa(n)]
    N = produto(P[x] ** e for x, e in enumerate(entrada(v)))
    testes = passos = 0
    achou = True
    while achou:
        achou = False
        for num, den in F:
            testes += 1
            if N % den == 0:
                N = N * num // den
                passos += 1
                achou = True
                break
    _, q, s, m, _ = registradores(n)
    esperado = P[s[n]] * P[m[n]] * produto(P[q[j]] ** x for j, x in enumerate(sorted(v)))
    return N, esperado, testes, passos
