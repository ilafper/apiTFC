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
      res.json({
        usuario: {
          nombre: usuarioEncontrado.nombre,
          rol:usuarioEncontrado.rol || 'user',
          email: usuarioEncontrado.email,
          _id: usuarioEncontrado._id,
          lista_Fav: usuarioEncontrado.lista_Fav || [],
          capitulos_vistos: usuarioEncontrado.capitulos_vistos || [] // ← NUEVO
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
//       contrasenha:password1,
//       lista_Fav: [],               // ← Inicializar arrays
//       capitulos_vistos: []         // ← NUEVO
//     };

//     await login.insertOne(nuevoUser);

//     res.status(201).json({ mensaje: "Usuario creado correctamente" });
//   } catch (error) {
//     console.error("Error al crear el usuario:", error);
//     res.status(500).json({ mensaje: "Error al crear el usuario" });
//   }
// });

// ============================================
// ENDPOINT: OBTENER TODOS LOS MANGAS
// ============================================
app.get('/api/mangas', async (req, res) => {
  try {
    const { mangas } = await connectToMongoDB();
    const lista_mangas = await mangas.find().toArray();
    res.json(lista_mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los mangas' });
  }
});



// ============================================
// ENDPOINT: BUSCAR MANGAS
// ============================================
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
    const { usuarioId, manga } = req.body; // ← CAMBIO: 'manga' en lugar de 'mangaId'

    if (!usuarioId || !manga) {
      return res.status(400).json({ mensaje: "Faltan datos (usuarioId, manga)" });
    }

    const { login } = await connectToMongoDB();
    const usuario = await login.findOne({ _id: new ObjectId(usuarioId) });
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    let lista_Fav = usuario.lista_Fav || [];
    let capitulos_vistos = usuario.capitulos_vistos || [];

    // Buscar por _id del manga (objeto completo)
    const index = lista_Fav.findIndex(fav => {
      const favId = typeof fav === 'object' && fav._id ? fav._id.toString() : fav.toString();
      return favId === manga._id.toString();
    });

    if (index > -1) {
      lista_Fav.splice(index, 1);
    } else {
      lista_Fav.push(manga); // ← Guardar objeto completo
    }

    await login.updateOne(
      { _id: new ObjectId(usuarioId) },
      { $set: { lista_Fav, capitulos_vistos } }
    );

    res.json({ mensaje: "Actualizado", lista_Fav, capitulos_vistos });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ mensaje: "Error interno" });
  }
});


app.post('/api/marcarCapituloVisto', async (req, res) => {
  try {
    const { usuarioId, mangaId, tomo, visto } = req.body;

    if (!usuarioId || !mangaId || tomo === undefined || visto === undefined) {
      return res.status(400).json({ mensaje: "Faltan datos" });
    }

    const { login } = await connectToMongoDB();
    const usuario = await login.findOne({ _id: new ObjectId(usuarioId) });
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    let capitulos_vistos = usuario.capitulos_vistos || [];

    const index = capitulos_vistos.findIndex(
      cv => cv.mangaId === mangaId && cv.tomo === tomo
    );

    if (visto) {
      if (index > -1) {
        capitulos_vistos[index].visto = true;
      } else {
        capitulos_vistos.push({ mangaId, tomo, visto: true });
      }
    } else {
      if (index > -1) {
        capitulos_vistos.splice(index, 1);
      }
    }

    await login.updateOne(
      { _id: new ObjectId(usuarioId) },
      { $set: { capitulos_vistos } }
    );

    res.json({ mensaje: "Actualizado", capitulos_vistos });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ mensaje: "Error interno" });
  }
});


module.exports = app;
