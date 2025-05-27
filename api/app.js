const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
app.use(express.json());

// Configura la conexión a MongoDB
const uri = "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Función para conectar a la base de datos y obtener las colecciones
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB Atlas");
    const db = client.db('tfc');
    return {
      login: db.collection('usuarios'),
      // citas: db.collection('citas'),
      // pacientes: db.collection('pacientes'),
      // especialistas: db.collection('especialista')
    };
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    throw new Error('Error al conectar a la base de datos');
  }
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});


// parte para encontrar al usuario del login
app.post('/api/checkLogin', async (req, res) => {
  try {
    const { nombre, password } = req.body;

    // Validación de campos
    if (!nombre || !password) {
      return res.status(400).json({ mensaje: "Nombre y contraseña son requeridos" });
    }

    const { login } = await connectToMongoDB();

    // Buscar usuario por nombre y contraseña (en texto plano)
    const usuarioEncontrado = await login.findOne({ nombre, contrasenha: password });

    if (usuarioEncontrado) {
      //res.json({ mensaje: "Inicio de sesión exitoso", usuario: usuarioEncontrado.nombre });
    } else {
      //res.status(401).json({ mensaje: "Nombre o contraseña incorrecta" });
    }

  } catch (error) {
    console.error("Error en checkLogin:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

app.post('/api/registrarse', async (req, res) => {
  try {
    const { nombre, email, password1} = req.body;

    // Validación básica
    if (!nombre || !email || !password1) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    // Conectar a la base de datos y acceder a la colección
    const { usuarios } = await connectToMongoDB();

    // Crear el nuevo especialista
    const nuevoUser = {
      nombre,
      email,
      password1
    };

    await nuevoUser.insertOne(usuarios);

    res.status(201).json({ mensaje: "Especialista creado correctamente" });
  } catch (error) {
    console.error("Error al crear el especialista:", error);
    res.status(500).json({ mensaje: "Error al crear el especialista" });
  }
});
module.exports = app;