const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
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
      return res.status(400).json({ mensaje: "Nombre y contraseña son requeridos" });
    }

    const { login } = await connectToMongoDB();

    const usuarioEncontrado = await login.findOne({ nombre, contrasenha: password });

    if (usuarioEncontrado) {
      // Enviamos datos del usuario al frontend
      res.json({
        usuario: {
          nombre: usuarioEncontrado.nombre,
          email: usuarioEncontrado.email,
          _id: usuarioEncontrado._id,
          lista_Fav: usuarioEncontrado.lista_Fav || []
        }
      });



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

    const { mangas } = await connectToMongoDB();

    const filtro = { nombre: { $regex: nombre.trim(), $options: 'i' } };
    const resultados = await mangas.find(filtro).toArray();

    return res.status(200).json(resultados);
  } catch (error) {
    console.error('Error al buscar mangas:', error);
    return res.status(500).json({ mensaje: 'Error interno al buscar mangas' });
  }
});



app.post('/api/gustarManga', async (req, res) => {
  try {
    const { usuarioId, mangaId } = req.body;

    if (!usuarioId || !mangaId) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    const { login } = await connectToMongoDB();

    // Buscar usuario
    const usuario = await login.findOne({ _id: new ObjectId(usuarioId) });
    if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado" });

    let lista_Fav = usuario.lista_Fav || [];
    let accion = "";

    if (lista_Fav.some(id => id.toString() === mangaId)) {
      // Si ya está, eliminarlo
      lista_Fav = lista_Fav.filter(id => id.toString() !== mangaId);
      accion = "eliminado";
    } else {
      // Si no está, agregarlo
      lista_Fav.push(new ObjectId(mangaId));
      accion = "añadido";
    }

    // Actualizar en la base de datos
    await login.updateOne(
      { _id: new ObjectId(usuarioId) },
      { $set: { lista_Fav } }
    );

    res.json({ mensaje: `Manga ${accion} a favoritos`, lista_Fav });

  } catch (error) {
    console.error("Error en gustarManga:", error.message);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});


module.exports = app;