# Confere o fractran do Python contra uma reimplementação independente em R.
# Rodar da raiz do projeto, depois do medir.py:
#   Rscript algoritmos/fractran/conferir.R
# Aqui os registradores têm nome e cada fração é uma regra com nomes; o Python
# indexa uma lista. A ordem final tem de bater com sort(), as contagens com as
# do Python e os passos com a fórmula.
regras_fractran <- function(n) {
  regra <- function(num, den) list(num = num, den = den)
  c(
    lapply(n:1, function(r) regra(c(paste0("m", r - 1), paste0("q", r)), c("t", paste0("m", r)))),
    unlist(lapply(1:n, function(i) list(
      regra(c(paste0("s", i + 1), "t"), c(paste0("s", i), paste0("p", i))),
      regra(paste0("s", i + 1), paste0("s", i))
    )), recursive = FALSE),
    lapply(0:(n - 1), function(r) regra(c("s1", paste0("m", n)), c(paste0("s", n + 1), paste0("m", r))))
  )
}

fractran_r <- function(v) {
  n <- length(v)
  regras <- regras_fractran(n)
  nomes <- c(paste0("p", 1:n), paste0("q", 1:n), paste0("s", 1:(n + 1)), paste0("m", 0:n), "t")
  stopifnot(length(regras) == 4 * n, length(nomes) == 4 * n + 3)
  reg <- setNames(numeric(length(nomes)), nomes)
  reg[paste0("p", 1:n)] <- v
  reg[c("s1", paste0("m", n))] <- 1
  # índices prontos: nomes em cada teste deixariam o R lento demais
  regras <- lapply(regras, function(f) list(num = match(f$num, nomes), den = match(f$den, nomes)))
  testes <- 0; passos <- 0
  repeat {
    aplicou <- FALSE
    for (f in regras) {
      testes <- testes + 1
      if (all(reg[f$den] >= 1)) {
        reg[f$den] <- reg[f$den] - 1
        reg[f$num] <- reg[f$num] + 1
        passos <- passos + 1
        aplicou <- TRUE
        break
      }
    }
    if (!aplicou) break
  }
  list(v = unname(reg[paste0("q", 1:n)]), testes = testes, passos = passos,
       sobrou = unname(sum(reg[paste0("p", 1:n)])))
}

pasta <- "algoritmos/fractran"
casos <- jsonlite::read_json(file.path(pasta, "dados.json"))$conferir
tab <- do.call(rbind, lapply(casos, function(caso) {
  v <- as.numeric(unlist(caso$vetor))
  r <- fractran_r(v)
  formula <- if (any(v > 0)) (max(v) + 1) * (length(v) + 1) + sum(v) - 1 else length(v)
  data.frame(
    n = length(v), ordem_ok = identical(r$v, sort(v)) && r$sobrou == 0,
    testes_r = r$testes, testes_py = caso$comparacoes,
    passos_r = r$passos, passos_py = caso$movimentos, formula = formula
  )
}))
print(tab, row.names = FALSE)
tudo_ok <- all(tab$ordem_ok) && all(tab$testes_r == tab$testes_py) &&
  all(tab$passos_r == tab$passos_py) && all(tab$passos_r == tab$formula)
versao <- paste(R.version$major, R.version$minor, sep = ".")
jsonlite::write_json(
  list(
    referencia = "fractran_r() (reimplementação em R) e sort()",
    versao_r = versao,
    vetores = nrow(tab),
    tudo_ok = tudo_ok,
    resumo = sprintf(
      "Reescrito em R %s e rodado em %d vetores (de %d a %d números, com repetidos e zeros): %s",
      versao, nrow(tab), min(tab$n), max(tab$n),
      if (tudo_ok) "a ordem final bate com sort(), as frações testadas e os passos batem um a um com o Python, e os passos batem com (M + 1)(n + 1) + soma − 1."
      else "há divergência; veja conferir.R."
    )
  ),
  file.path(pasta, "conferencia.json"), auto_unbox = TRUE, pretty = TRUE
)
stopifnot(tudo_ok)
cat("ok: fractran_r() em R concorda com o Python\n")
