const http = require("http");

const server = http.createServer((req, res) => {
  res.write("Servidor da barbearia funcionando");
  res.end();
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});