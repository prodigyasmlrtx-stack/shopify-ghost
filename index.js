const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI;
let db;

async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('shopify_ghost');
  console.log('MongoDB conectado');
}

const validateShopDomain = (req, res, next) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).json({ error: 'Falta el parámetro shop' });
  const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  if (!regex.test(shop)) return res.status(400).json({ error: 'Dominio inválido' });
  next();
};

app.get('/', (req, res) => {
  res.json({
    name: 'Shopify Ghost API',
    version: '2.0.0',
    endpoints: {
      products: '/api/products?shop=tienda.myshopify.com',
      inventory: '/api/inventory?shop=tienda.myshopify.com',
      price_history: '/api/price-history?shop=tienda.myshopify.com',
      compare: '/api/compare?shops=tienda1.myshopify.com,tienda2.myshopify.com'
    }
  });
});

app.get('/api/products', validateShopDomain, async (req, res) => {
  const { shop } = req.query;
  try {
    const response = await axios.get(`https://${shop}/products.json?limit=250`, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const products = response.data.products.map(p => ({
      id: p.id,
      title: p.title,
      vendor: p.vendor,
      variants: p.variants.map(v => ({
        price: parseFloat(v.price),
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity
      })),
      url: `https://${shop}/products/${p.handle}`
    }));
    res.json({ shop, total: products.length, timestamp: new Date().toISOString(), products });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos', detail: error.message });
  }
});

app.get('/api/inventory', validateShopDomain, async (req, res) => {
  const { shop } = req.query;
  try {
    const response = await axios.get(`https://${shop}/products.json?limit=250`, {
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const inventory = response.data.products.flatMap(p =>
      p.variants.map(v => ({
        product: p.title, sku: v.sku, price: parseFloat(v.price),
        stock: v.inventory_quantity,
        status: v.inventory_quantity === 0 ? 'out_of_stock' : v.inventory_quantity <= 5 ? 'low_stock' : 'in_stock'
      }))
    );
    res.json({ shop, summary: {
      total: inventory.length,
      out_of_stock: inventory.filter(i => i.status === 'out_of_stock').length,
      low_stock: inventory.filter(i => i.status === 'low_stock').length,
      in_stock: inventory.filter(i => i.status === 'in_stock').length
    }, inventory });
  } catch (error) {
    res.status(500).json({ error: 'Error', detail: error.message });
  }
});

app.get('/api/price-history', validateShopDomain, async (req, res) => {
  const { shop } = req.query;
  try {
    const response = await axios.get(`https://${shop}/products.json?limit=250`, {
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const snapshot = {
      shop, timestamp: new Date(),
      products: response.data.products.map(p => ({
        id: p.id, title: p.title,
        price: parseFloat(p.variants[0]?.price || 0)
      }))
    };
    await db.collection('price_history').insertOne(snapshot);
    const history = await db.collection('price_history')
      .find({ shop }).sort({ timestamp: -1 }).limit(10).toArray();
    res.json({ shop, snapshots: history.length, history });
  } catch (error) {
    res.status(500).json({ error: 'Error', detail: error.message });
  }
});

app.get('/api/compare', async (req, res) => {
  const { shops } = req.query;
  if (!shops) return res.status(400).json({ error: 'Falta el parámetro shops' });
  const shopList = shops.split(',').slice(0, 5);
  try {
    const results = await Promise.all(shopList.map(async shop => {
      const response = await axios.get(`https://${shop.trim()}/products.json?limit=50`, {
        timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      return {
        shop, total_products: response.data.products.length,
        avg_price: (response.data.products.reduce((sum, p) =>
          sum + parseFloat(p.variants[0]?.price || 0), 0) / response.data.products.length).toFixed(2),
        products: response.data.products.slice(0, 5).map(p => ({
          title: p.title, price: parseFloat(p.variants[0]?.price || 0)
        }))
      };
    }));
    res.json({ compared: shopList.length, timestamp: new Date().toISOString(), results });
  } catch (error) {
    res.status(500).json({ error: 'Error comparando tiendas', detail: error.message });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Shopify Ghost API v2.0 corriendo en puerto ${PORT}`));
});