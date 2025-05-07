const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const middlewares = require('./middlewares');
const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Conectar con MongoDB
const uri = "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let usersCollection;
let mangas;
async function conectarMongoBBDD() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB Atlas");
    const db = client.db('tfc');
    usersCollection = db.collection('usuarios');
    mangas = db.collection('mangas');
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
}

conectarMongoBBDD();

// Endpoint GET para obtener usuarios
app.get('/api/users', async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});


app.get('/api/mangas', async (req, res) => {
  try {
    const lista_mangas = await mangas.find().toArray();
    res.json(lista_mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los mangas' });
  }
});


app.use(middlewares.notFound);
app.use(middlewares.errorHandler);
// Exporta la app para usarla en otros archivos
module.exports = app;
