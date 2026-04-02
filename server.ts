
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { localDb } from './localDb';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configuración de la base de datos PostgreSQL
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ CRÍTICO: DATABASE_URL no está definida en las variables de entorno.");
} else {
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📡 Intentando conectar a: ${maskedUrl}`);
}

// Desactivamos SSL por defecto para que coincida con la configuración de Coolify (Enable SSL: false)
const sslConfig = false;

const pool = new Pool({
  connectionString: dbUrl,
  ssl: sslConfig,
  // Forzar parámetros para evitar fallbacks a localhost si la URL está presente
  host: dbUrl ? undefined : '127.0.0.1', 
});

let useLocalDb = !dbUrl;

// Función de consulta universal que decide entre Postgres y LocalDB
async function query(text: string, params: any[] = []) {
  if (useLocalDb) {
    return localDb.query(text, params);
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    if ((err as any).code === 'ECONNREFUSED' || (err as any).code === 'ENOTFOUND') {
      console.warn('⚠️ Conexión a PostgreSQL fallida. Cambiando a LocalDB (JSON)...');
      useLocalDb = true;
      return localDb.query(text, params);
    }
    throw err;
  }
}

// Manejador de errores global para el pool
pool.on('error', (err) => {
  console.error('💥 Error inesperado en el pool de PostgreSQL:', err);
});

// Inicialización de tablas
async function initDb() {
  try {
    if (useLocalDb) {
      console.log("📂 Usando LocalDB (JSON) para persistencia.");
      // Inicializar datos por defecto si están vacíos
      const locs = await localDb.query('SELECT count(*) as count FROM locations');
      if (locs.rowCount === 0 || locs.rows.length === 0) {
        await localDb.query("INSERT INTO locations (id, name, type) VALUES ($1, $2, $3)", ['main_warehouse', 'Bodega Principal', 'MAIN_WAREHOUSE']);
        await localDb.query("INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4)", ['user_1', 'admin', 'admin123', 'admin']);
      }
      return;
    }

    const client = await pool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id_venta TEXT PRIMARY KEY,
        id_fabrica TEXT,
        description TEXT,
        price REAL,
        cost REAL,
        min_stock INTEGER DEFAULT 2
      );

      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS stock (
        productId TEXT,
        locationId TEXT,
        quantity INTEGER,
        criticalStock INTEGER,
        PRIMARY KEY (productId, locationId)
      );

      CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        productId TEXT,
        quantity INTEGER,
        type TEXT,
        fromLocationId TEXT,
        toLocationId TEXT,
        timestamp TEXT,
        relatedFile TEXT,
        price REAL,
        cost REAL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
      );
    `);

    // Migración: Asegurar que la columna password existe si la tabla ya fue creada antes
    try {
      const passwordCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='password'
      `);
      if (passwordCheck.rowCount === 0) {
        await client.query('ALTER TABLE users ADD COLUMN password TEXT');
      }
    } catch (e) {
      console.log("Nota: No se pudo verificar/añadir la columna 'password'.", e);
    }

    // Migración: Añadir min_stock a productos si no existe
    try {
      const minStockCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='min_stock'
      `);
      if (minStockCheck.rowCount === 0) {
        await client.query('ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 2');
      }
    } catch (e) {
      console.log("Nota: No se pudo verificar/añadir la columna 'min_stock'.", e);
    }

    // Datos iniciales si las tablas están vacías
    const locationsCheck = await client.query('SELECT count(*) as count FROM locations');
    if (parseInt(locationsCheck.rows[0].count) === 0) {
      await client.query("INSERT INTO locations (id, name, type) VALUES ('main_warehouse', 'Bodega Principal', 'MAIN_WAREHOUSE')");
    }

    const usersCheck = await client.query('SELECT count(*) as count FROM users');
    console.log(`📊 Estadísticas de la base de datos:`);
    const pCount = await client.query('SELECT count(*) as count FROM products');
    const sCount = await client.query('SELECT count(*) as count FROM stock');
    const mCount = await client.query('SELECT count(*) as count FROM movements');
    console.log(`   - Productos: ${pCount.rows[0].count}`);
    console.log(`   - Stock: ${sCount.rows[0].count}`);
    console.log(`   - Movimientos: ${mCount.rows[0].count}`);
    console.log(`   - Usuarios: ${usersCheck.rows[0].count}`);

    if (parseInt(usersCheck.rows[0].count) === 0) {
      await client.query("INSERT INTO users (id, username, password, role) VALUES ('user_1', 'admin', 'admin123', 'admin')");
    } else {
      // Asegurar que el admin existente tenga la contraseña por defecto si no tiene una
      await client.query("UPDATE users SET password = 'admin123' WHERE username = 'admin' AND (password IS NULL OR password = '')");
    }

    client.release();
    console.log("✅ PostgreSQL Database initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
    if ((err as any).code === '28P01') {
      console.error("Error de autenticación: Revisa el usuario y contraseña en DATABASE_URL.");
    } else if ((err as any).code === 'ECONNREFUSED') {
      console.error("Conexión rechazada: Asegúrate de que el servidor de base de datos esté corriendo.");
    } else if ((err as any).message.includes('SSL')) {
      console.error("Error de SSL: Intenta cambiar la configuración de SSL en server.ts.");
    }
    // Log details about the connection string (masked for safety)
    const maskedUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT_SET';
    console.log(`DATABASE_URL used: ${maskedUrl}`);
  }
}

// initDb(); // Se llamará dentro de startServer

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type;
    let uploadPath = 'public';
    if (type === 'product' || type === 'product-bulk') {
      uploadPath = 'public/products';
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const type = req.query.type;
    if (type === 'logo') {
      cb(null, 'logo.png'); // Siempre logo.png para el logo
    } else if (type === 'product') {
      const factoryId = req.query.factoryId;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${factoryId}${ext}`);
    } else if (type === 'product-bulk') {
      // En subida masiva, usamos el nombre original (ej: 2343.jpg)
      cb(null, file.originalname);
    } else {
      cb(null, file.originalname);
    }
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  }
});

// Endpoint para subir logo o imagen de producto
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }
  res.json({ 
    success: true, 
    filename: req.file.filename,
    path: req.query.type === 'product' ? `/products/${req.file.filename}` : `/${req.file.filename}`
  });
});

// Endpoint para subida masiva de imágenes de productos
app.post('/api/upload-bulk', upload.array('files', 50), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).json({ error: 'No se subieron archivos' });
  }
  
  const files = req.files as Express.Multer.File[];
  const results = files.map(file => ({
    filename: file.filename,
    path: `/products/${file.filename}`
  }));

  res.json({ 
    success: true, 
    count: results.length,
    files: results
  });
});

// API routes go here
app.get('/api/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: useLocalDb ? 'local' : 'connected', 
      time: result.rows[0]?.now || new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: (err as Error).message 
    });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const result = await query('SELECT id_venta, id_fabrica, description, price, cost, min_stock AS "minStock" FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id_venta, id_fabrica, description, price, cost, minStock } = req.body;
  try {
    await query(
      'INSERT INTO products (id_venta, id_fabrica, description, price, cost, min_stock) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id_venta) DO UPDATE SET id_fabrica=$2, description=$3, price=$4, cost=$5, min_stock=$6',
      [id_venta, id_fabrica, description, price, cost, minStock !== undefined ? minStock : 2]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id_venta = $1', [req.params.id]);
    await query('DELETE FROM stock WHERE productId = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM locations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/locations', async (req, res) => {
  const { id, name, type } = req.body;
  try {
    await query(
      'INSERT INTO locations (id, name, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name=$2, type=$3',
      [id, name, type]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    await query('DELETE FROM locations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Stock
app.get('/api/stock', async (req, res) => {
  try {
    const result = await query('SELECT productId AS "productId", locationId AS "locationId", quantity, criticalStock AS "criticalStock" FROM stock');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/stock/update', async (req, res) => {
  const { productId, locationId, quantityChange } = req.body;
  try {
    const current = await query('SELECT quantity FROM stock WHERE productId = $1 AND locationId = $2', [productId, locationId]);
    const newQuantity = (current.rows[0]?.quantity || 0) + quantityChange;
    await query(
      'INSERT INTO stock (productId, locationId, quantity) VALUES ($1, $2, $3) ON CONFLICT (productId, locationId) DO UPDATE SET quantity = $3',
      [productId, locationId, newQuantity]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Movements
app.get('/api/movements', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        productId AS "productId", 
        quantity, 
        type, 
        fromLocationId AS "fromLocationId", 
        toLocationId AS "toLocationId", 
        timestamp, 
        relatedFile AS "relatedFile", 
        price, 
        cost 
      FROM movements 
      ORDER BY timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/movements', async (req, res) => {
  const { id, productId, quantity, type, fromLocationId, toLocationId, timestamp, relatedFile, price, cost } = req.body;
  try {
    await query(
      'INSERT INTO movements (id, productId, quantity, type, fromLocationId, toLocationId, timestamp, relatedFile, price, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [id || `mov_${Date.now()}`, productId, quantity, type, fromLocationId, toLocationId, timestamp || new Date().toISOString(), relatedFile, price, cost]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Bulk Import
app.post('/api/bulk-import', async (req, res) => {
  const { products, stock, movements } = req.body;
  try {
    // Si es local, procesamos uno a uno (no hay transacciones reales en el mock)
    // Si es Postgres, idealmente usaríamos una transacción, pero para simplificar el fallback
    // usamos la función query universal.
    
    // Upsert Products
    for (const p of products) {
      await query(
        'INSERT INTO products (id_venta, id_fabrica, description, price, cost, min_stock) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id_venta) DO UPDATE SET id_fabrica=$2, description=$3, price=$4, cost=$5, min_stock=$6',
        [p.id_venta, p.id_fabrica, p.description, p.price, p.cost, p.minStock !== undefined ? p.minStock : 2]
      );
    }

    // Upsert Stock
    for (const s of stock) {
      await query(
        'INSERT INTO stock (productId, locationId, quantity) VALUES ($1, $2, $3) ON CONFLICT (productId, locationId) DO UPDATE SET quantity = $3',
        [s.productId, s.locationId, s.quantity]
      );
    }

    // Insert Movements
    for (const m of movements) {
      await query(
        'INSERT INTO movements (id, productId, quantity, type, fromLocationId, toLocationId, timestamp, relatedFile, price, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [m.id || `mov_${Date.now()}_${Math.random()}`, m.productId, m.quantity, m.type, m.fromLocationId, m.toLocationId, m.timestamp || new Date().toISOString(), m.relatedFile, m.price, m.cost]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/users', async (req, res) => {
  const { id, username, password, role } = req.body;
  try {
    await query(
      'INSERT INTO users (id, username, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET username=$2, password=$3, role=$4',
      [id || `user_${Date.now()}`, username, password || '', role]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- CLEAR DATA ENDPOINTS ---

app.post('/api/clear/products', async (req, res) => {
  try {
    await query('DELETE FROM movements');
    await query('DELETE FROM stock');
    await query('DELETE FROM products');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/clear/locations', async (req, res) => {
  try {
    await query('DELETE FROM stock');
    await query('DELETE FROM locations');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/clear/users', async (req, res) => {
  try {
    await query('DELETE FROM users');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/clear', async (req, res) => {
  try {
    await query('DELETE FROM movements');
    await query('DELETE FROM stock');
    await query('DELETE FROM products');
    await query('DELETE FROM locations');
    await query('DELETE FROM users');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  // Inicializar base de datos antes de arrancar el servidor
  await initDb();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
  });
}

startServer();
