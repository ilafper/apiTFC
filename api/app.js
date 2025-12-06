const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ========== MIDDLEWARES BÁSICOS ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // IMPORTANTE para FormData

// ========== CORS ==========
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== FUNCIÓN PARA ENCONTRAR CARPETA src ==========
function encontrarCarpetaSrc() {
  const posiblesNombres = ['src', 'cliente/src', 'frontend/src', 'public/src'];
  const bases = [__dirname, process.cwd(), path.join(__dirname, '..')];
  
  for (const base of bases) {
    for (const nombre of posiblesNombres) {
      const ruta = path.join(base, nombre);
      if (fs.existsSync(ruta)) {
        console.log(`✓ Encontrada carpeta src en: ${ruta}`);
        return ruta;
      }
    }
  }
  
  // Si no la encuentra, crear una en el directorio actual
  const rutaDefault = path.join(__dirname, 'uploads');
  console.log(`⚠️ No se encontró src, creando: ${rutaDefault}`);
  
  if (!fs.existsSync(rutaDefault)) {
    fs.mkdirSync(rutaDefault, { recursive: true });
  }
  
  return rutaDefault;
}

// ========== CONFIGURACIÓN MULTER ==========
// 1. PRIMERO encontrar carpeta
const carpetaSrc = encontrarCarpetaSrc();
console.log(`📁 Carpeta de destino para imágenes: ${carpetaSrc}`);

// 2. LUEGO definir storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, carpetaSrc);
  },
  filename: function (req, file, cb) {
    // Para evitar sobreescritura: nombre-timestamp.extensión
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const timestamp = Date.now();
    const finalName = `${originalName}-${timestamp}${extension}`;
    
    console.log(`✓ Guardando imagen como: ${finalName}`);
    cb(null, finalName);
  }
});

// 3. FINALMENTE crear upload con storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
});

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


app.post('/api/registrarse', async (req, res) => {
  try {
    const { nombre, email, password1 } = req.body;

    if (!nombre || !email || !password1) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
    }

    // Conectar a la base de datos y acceder a la colección
    const { login } = await connectToMongoDB();

    //buscar si hay otro igual
    const usuarioExistente = await login.findOne({ 
      $or: [
        { nombre: nombre },
        { email: email }
      ]
    });

    if (usuarioExistente) {
      return res.status(400).json({ 
        mensaje: "El nombre de usuario o email ya está en uso" 
      });
    }

    // Crear el nuevo usuario
    const nuevoUser = {
      nombre: nombre,
      email: email,
      contrasenha: password1,
      rol: "user",
      lista_Fav: [], 
      capitulos_vistos: [],
    };

    const resultado = await login.insertOne(nuevoUser);

    res.status(201).json({ 
      success: true,
      mensaje: "Usuario creado correctamente",
      usuario: {
        _id: resultado.insertedId,
        nombre: nombre,
        email: email,
        rol: "user"
      }
    });
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    res.status(500).json({ 
      success: false,
      mensaje: "Error al crear el usuario" 
    });
  }
});

app.get('/api/mangas', async (req, res) => {
  try {
    const { mangas } = await connectToMongoDB();
    const lista_mangas = await mangas.find().toArray();
    res.json(lista_mangas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los mangas' });
  }
});




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
    const { usuarioId, manga } = req.body;

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



//prueba manga nuevo con imagen
app.post('/api/nuevomanga', upload.single('imagen'), async (req, res) => {
  console.log('🔵 === INICIO /api/nuevomanga ===');
  
  try {
    console.log('📄 Archivo recibido:', req.file ? req.file.filename : 'Ninguno');
    console.log('📋 Datos del body:', req.body);
    
    let mangaData = req.body;
    
    if (req.file) {
      mangaData.imagen = req.file.filename;
      console.log('✅ Imagen asignada:', mangaData.imagen);
    } else {
      mangaData.imagen = 'default-manga.png';
      console.log('⚠️ No se recibió imagen, usando por defecto');
    }
    
    // Parsear datos
    if (typeof mangaData.genero === 'string') {
      try {
        mangaData.genero = JSON.parse(mangaData.genero);
      } catch (e) {
        mangaData.genero = [];
      }
    }
    
    if (typeof mangaData.temporadas === 'string') {
      try {
        mangaData.temporadas = JSON.parse(mangaData.temporadas);
      } catch (e) {
        mangaData.temporadas = [];
      }
    }
    
    mangaData.volumenes = parseInt(mangaData.volumenes) || 0;
    mangaData.capitulos = parseInt(mangaData.capitulos) || 0;
    mangaData.fecha_creacion = new Date();
    
    const { mangas } = await connectToMongoDB();
    const result = await mangas.insertOne(mangaData);
    
    console.log('✅ Manga insertado con ID:', result.insertedId);
    
    res.json({ 
      success: true,
      mensaje: "Manga creado exitosamente", 
      id: result.insertedId,
      imagen: mangaData.imagen
    });
    
  } catch (error) {
    console.error("❌ Error en /api/nuevomanga:", error.message);
    console.error("Stack:", error.stack);
    
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        success: false,
        mensaje: error.code === 'LIMIT_FILE_SIZE' 
          ? 'La imagen es demasiado grande. Máximo 5MB' 
          : 'Error al subir la imagen'
      });
    }
    
    res.status(500).json({ 
      success: false,
      mensaje: "Error interno del servidor al crear el manga" 
    });
  }
});




//endpoint de borrar manga, en los mangas y la parte de favoritos
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
