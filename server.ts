
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configuración de la base de datos PostgreSQL
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL no está configurada. La aplicación podría no funcionar correctamente.");
} else {
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`📡 Intentando conectar a: ${maskedUrl}`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En Coolify/Docker interno, a menudo el servidor Postgres no soporta SSL.
  // Desactivamos SSL por defecto para evitar el error "The server does not support SSL connections".
  ssl: false
});

// Manejador de errores global para el pool
pool.on('error', (err) => {
  console.error('💥 Error inesperado en el pool de PostgreSQL:', err);
});

// Inicialización de tablas
async function initDb() {
  try {
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
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT');
    } catch (e) {
      // Ignorar si ya existe o hay error (Postgres 9.6+ soporta IF NOT EXISTS en ADD COLUMN)
      console.log("Nota: Columna 'password' ya existe o no pudo ser añadida automáticamente.");
    }

    // Migración: Añadir min_stock a productos si no existe
    try {
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 2');
    } catch (e) {
      console.log("Nota: Columna 'min_stock' ya existe o no pudo ser añadida.");
    }

    // Datos iniciales si las tablas están vacías
    const locationsCheck = await client.query('SELECT count(*) as count FROM locations');
    if (parseInt(locationsCheck.rows[0].count) === 0) {
      await client.query("INSERT INTO locations (id, name, type) VALUES ('main_warehouse', 'Bodega Principal', 'MAIN_WAREHOUSE')");
    }

    const usersCheck = await client.query('SELECT count(*) as count FROM users');
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
    // Log details about the connection string (masked for safety)
    const maskedUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'NOT_SET';
    console.log(`DATABASE_URL used: ${maskedUrl}`);
  }
}

initDb();

app.use(cors());
app.use(express.json());

// API routes go here
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id_venta, id_fabrica, description, price, cost, min_stock AS "minStock" FROM products');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id_venta, id_fabrica, description, price, cost, minStock } = req.body;
  try {
    await pool.query(
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
    await pool.query('DELETE FROM products WHERE id_venta = $1', [req.params.id]);
    await pool.query('DELETE FROM stock WHERE productId = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Locations
app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/locations', async (req, res) => {
  const { id, name, type } = req.body;
  try {
    await pool.query(
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
    await pool.query('DELETE FROM locations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Stock
app.get('/api/stock', async (req, res) => {
  try {
    const result = await pool.query('SELECT productId AS "productId", locationId AS "locationId", quantity, criticalStock AS "criticalStock" FROM stock');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/stock/update', async (req, res) => {
  const { productId, locationId, quantityChange } = req.body;
  try {
    const current = await pool.query('SELECT quantity FROM stock WHERE productId = $1 AND locationId = $2', [productId, locationId]);
    const newQuantity = (current.rows[0]?.quantity || 0) + quantityChange;
    await pool.query(
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
    const result = await pool.query(`
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
    await pool.query(
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert Products
    for (const p of products) {
      await client.query(
        'INSERT INTO products (id_venta, id_fabrica, description, price, cost, min_stock) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id_venta) DO UPDATE SET id_fabrica=$2, description=$3, price=$4, cost=$5, min_stock=$6',
        [p.id_venta, p.id_fabrica, p.description, p.price, p.cost, p.minStock !== undefined ? p.minStock : 2]
      );
    }

    // Upsert Stock
    for (const s of stock) {
      await client.query(
        'INSERT INTO stock (productId, locationId, quantity) VALUES ($1, $2, $3) ON CONFLICT (productId, locationId) DO UPDATE SET quantity = $3',
        [s.productId, s.locationId, s.quantity]
      );
    }

    // Insert Movements
    for (const m of movements) {
      await client.query(
        'INSERT INTO movements (id, productId, quantity, type, fromLocationId, toLocationId, timestamp, relatedFile, price, cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [m.id || `mov_${Date.now()}_${Math.random()}`, m.productId, m.quantity, m.type, m.fromLocationId, m.toLocationId, m.timestamp || new Date().toISOString(), m.relatedFile, m.price, m.cost]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/users', async (req, res) => {
  const { id, username, password, role } = req.body;
  try {
    await pool.query(
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
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Clear Data
// --- CLEAR DATA ENDPOINTS ---

app.post('/api/clear/products', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM movements');
    await client.query('DELETE FROM stock');
    await client.query('DELETE FROM products');
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

app.post('/api/clear/locations', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM stock');
    await client.query('DELETE FROM locations');
    // Re-insert default locations if needed or let the app handle it
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

app.post('/api/clear/users', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM users');
    // Re-insert default admin? The app usually does this on restart if table is empty
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

app.post('/api/clear', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM movements');
    await client.query('DELETE FROM stock');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM locations');
    await client.query('DELETE FROM users');
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // En Express 5, los comodines en rutas pueden ser problemáticos. 
    // Usar un middleware de fallback con app.use() es la forma más robusta de manejar una SPA.
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready at http://0.0.0.0:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(process.cwd(), 'dist')}`);
  });
}

startServer();
