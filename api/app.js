const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
app.use(express.json());

const uri = "mongodb+srv://ialfper:ialfper21@alumnos.zoinj.mongodb.net/alumnos?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Conectado a MongoDB Atlas");
    const db = client.db('tfc');
    return {
      login: db.collection('usuarios'),
      mangas: db.collection('mangasPrueba')
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

app.post('/api/checkLogin', async (req, res) => {
  try {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    const { login } = await connectToMongoDB();

    const usuarioEncontrado = await login.findOne({
      nombre: nombre,
      contrasenha: password
    });

    if (usuarioEncontrado) {
      res.json({ mensaje: "Inicio de sesión exitoso", usuario: usuarioEncontrado.nombre });
    } else {
      res.status(401).json({ mensaje: "Nombre o contraseña incorrecta" });
    }

  } catch (error) {
    console.error("Error en checkLogin:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});


// app.post('/api/registrarse', async (req, res) => {
//   try {
//     const { nombre, email, password1} = req.body;

//     // Validación básica
//     if (!nombre || !email || !password1) {
//       return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
//     }

//     // Conectar a la base de datos y acceder a la colección
//     const { login } = await connectToMongoDB();

//     // Crear el nuevo especialista
//     const nuevoUser = {
//       nombre:nombre,
//       email:email,
//       contrasenha:password1
//     };

//     await login.insertOne(nuevoUser);

//     res.status(201).json({ mensaje: "Especialista creado correctamente" });
//   } catch (error) {
//     console.error("Error al crear el especialista:", error);
//     res.status(500).json({ mensaje: "Error al crear el especialista" });
//   }

// });

app.get('/api/mangas', async (req, res) => {
  try {
    const { mangas } = await connectToMongoDB();
    const lista_mangas = await mangas.find().toArray();
    res.json(lista_mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los especialistas' });
  }
});



//BUSCAR MANGAS

app.get('/api/mangas/buscar', async (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(200).json([]);
    }

    // 👇 Desestructura directamente la colección "mangas"
    const { mangas } = await connectToMongoDB();

    const filtro = { nombre: { $regex: nombre.trim(), $options: 'i' } };
    const resultados = await mangas.find(filtro).toArray();

    return res.status(200).json(resultados);
  } catch (error) {
    console.error('Error al buscar mangas:', error);
    return res.status(500).json({ mensaje: 'Error interno al buscar mangas' });
  }
});





module.exports = app;