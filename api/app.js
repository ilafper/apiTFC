const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
//añadido lo de cors


//const cors = require('cors');
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


// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));


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

// CONFIGURACIÓN COMPLETA DE CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
});

// Resto de tu código sigue igual...
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
          rol: usuarioEncontrado.rol || 'user',
          email: usuarioEncontrado.email,
          _id: usuarioEncontrado._id,
          lista_Fav: usuarioEncontrado.lista_Fav || [],
          capitulos_vistos: usuarioEncontrado.capitulos_vistos || []
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

// ... resto de tus endpoints ...

app.delete('/api/borrarmanga/:id', async (req, res) => {
  try {
    const idEliminarManga = req.params.id;
    console.log("ID recibido para eliminar:", idEliminarManga);

    const { mangas } = await connectToMongoDB();
    const result = await mangas.deleteOne({ _id: new ObjectId(idEliminarManga) });  
    
    const { login } = await connectToMongoDB();
    await login.updateMany(
      {},
      { $pull: { lista_Fav: { _id: new ObjectId(idEliminarManga) } } }
    );
    
    res.json({ 
      mensaje: "Manga eliminado correctamente", 
      eliminados: result.deletedCount 
    });
    
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ mensaje: "Error interno", error: error.message });
  }
});

module.exports = app;