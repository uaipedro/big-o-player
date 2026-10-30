# Confere o FIGS instrumentado (Python) contra o figs() do pacote figsr.
# Nos mesmos dados e com as mesmas divisões (max_splits = s, min_n = 5), as
# árvores precisam ser as mesmas (variável, corte e filhos de cada nó, o valor
# de cada folha) e as previsões também, no exemplo e em cada entrada de
# conferência do dados.json (o mtcars com s de 1 a 10, com várias árvores e com
# uma só, e carros sorteados, onde os cortes passam de 30 e viram quantis).
# Rodar da raiz do projeto, depois do medir.py:
#   Rscript algoritmos/figs/conferir.R

library(figsr)
pasta <- "algoritmos/figs"
py <- jsonlite::read_json(file.path(pasta, "dados.json"))
ex <- py$exemplo
nomes <- c("peso", "potencia")

ajustar <- function(X, y, s, max_arvores) {
  df <- data.frame(peso = vapply(X, `[[`, numeric(1), 1),
                   potencia = vapply(X, `[[`, numeric(1), 2),
                   y = factor(unlist(y), levels = c(0, 1)))
  fit <- figs(y ~ peso + potencia, df, max_splits = s, min_n = 5,
              max_trees = max_arvores, mode = "classification")
  list(fit = fit, previsoes = predict(fit, df, type = "numeric")$.pred)
}

# a maior diferença entre as árvores do R e as do Python (Inf se a forma diverge)
diferenca <- function(fit, arvores) {
  if (length(fit$trees) != length(arvores)) return(Inf)
  d <- 0
  for (t in seq_along(arvores)) {
    r <- fit$trees[[t]]
    p <- arvores[[t]]
    if (length(r) != length(p)) return(Inf)
    for (k in seq_along(p)) {
      if (r[[k]]$is_leaf != p[[k]]$folha) return(Inf)
      if (r[[k]]$is_leaf) {
        d <- max(d, abs(r[[k]]$value - p[[k]]$valor))
      } else {
        if (r[[k]]$feature != nomes[p[[k]]$variavel + 1] ||
            r[[k]]$left_child != p[[k]]$esq || r[[k]]$right_child != p[[k]]$dir) return(Inf)
        d <- max(d, abs(r[[k]]$split_val - p[[k]]$corte))
      }
    }
  }
  d
}

casos <- c(list(list(caso = "exemplo", X = ex$X, y = ex$y, s = ex$s, max_arvores = NULL,
                     arvores = ex$arvores, previsoes = ex$previsoes)),
           py$conferir)
linhas <- lapply(casos, function(q) {
  r <- ajustar(q$X, q$y, q$s, q$max_arvores)
  d <- max(diferenca(r$fit, q$arvores), abs(r$previsoes - unlist(q$previsoes)))
  data.frame(caso = q$caso, arvores = length(r$fit$trees), divisoes = r$fit$total_splits, diferenca = d)
})
tab <- do.call(rbind, linhas)
print(tab, row.names = FALSE)
maior <- max(tab$diferenca)
ok <- maior < 1e-12

r <- ajustar(ex$X, ex$y, ex$s, NULL)
acertos_r <- sum((r$previsoes >= 0.5) == (unlist(ex$y) == 1))
cat("maior diferença (árvores e previsões):", format(maior, digits = 3), "\n")
cat("acertos no exemplo: R", acertos_r, "| Python", ex$acertos, "\n")
stopifnot(ok, acertos_r == ex$acertos)
cat("ok: Python e figsr concordam\n")

versao <- as.character(packageVersion("figsr"))
jsonlite::write_json(
  list(
    referencia = sprintf("figsr::figs(mode = \"classification\", min_n = 5), figsr %s", versao),
    versao_r = paste(R.version$major, R.version$minor, sep = "."),
    versao_figsr = versao,
    casos = nrow(tab),
    maior_diferenca = maior,
    acertos_r = acertos_r,
    acertos_python = ex$acertos,
    tudo_ok = ok && acertos_r == ex$acertos,
    resumo = sprintf(
      "Nos mesmos dados, o figs() do figsr %s (R %s) monta as mesmas árvores, com os mesmos cortes, e dá as mesmas previsões em %d ajustes (o mtcars com s de 1 a 10, com várias árvores e com uma só, e carros sorteados); a maior diferença é %s. No exemplo, os dois acertam %d de %d carros.",
      versao, paste(R.version$major, R.version$minor, sep = "."), nrow(tab),
      format(maior, digits = 3), acertos_r, length(ex$y)
    )
  ),
  file.path(pasta, "conferencia.json"), auto_unbox = TRUE, pretty = TRUE
)
