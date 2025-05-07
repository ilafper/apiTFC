// api/index.js
const app = require('./app'); // Importa la app desde app.js
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
