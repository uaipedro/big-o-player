# Exporta o peso, a potência e o câmbio dos 32 carros do mtcars (o mesmo
# conjunto que o R traz embutido).
# Rodar desta pasta: Rscript mtcars.R
carros <- data.frame(
  carro = rownames(mtcars),
  peso = mtcars$wt,
  potencia = mtcars$hp,
  cambio = ifelse(mtcars$am == 1, "manual", "automático")
)
write.csv(carros, "mtcars.csv", row.names = FALSE, fileEncoding = "UTF-8")
cat("mtcars.csv:", nrow(carros), "carros\n")
