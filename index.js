const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const validateShopDomain = (req, res, next) => {
  const { shop } = req.query;
  if (!shop) {
    return res.status(400).json({ 
      error: 'Parámetro requerido: shop',
      example: '?shop=ejemplo.myshopify.com'
    });
  }
  const shopifyDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  if (!shopifyDomainRegex.test(shop)) {
    return res.status(400).json({ error: 'Dominio Shopify inválido' });
  }
  next();
};

app.get('/', (req, res) => {
  res.json({
    name: 'Shopify Ghost API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      products: '/api/products?shop=tienda.myshopify.com',
      inventory: '/api/inventory?shop=tienda.myshopify.com',
      price_changes: '/api/price-changes?shop=tienda.myshopify.com'
    }
  });
});

app.get('/api/products', validateShopDomain, async (req, res) => {
  const { shop, limit = 250 } = req.query;
  try {
    const response = await axios.get(`https://${shop}/products.json?limit=${limit}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'ShopifyGhostAPI/1.0' }
    });
    const products = response.data.products.map(p => ({
      id: p.id,
      title: p.title,
      vendor: p.vendor,
      type: p.product_type,
      status: p.status,
      tags: p.tags ? p.tags.split(', ') : [],
      variants: p.variants.map(v => ({
        id: v.id,
        title: v.title,
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
      timeout: 10000,
      headers: { 'User-Agent': 'ShopifyGhostAPI/1.0' }
    });
    const inventory = response.data.products.flatMap(p =>
      p.variants.map(v => ({
        product: p.title,
        variant: v.title,
        sku: v.sku,
        price: parseFloat(v.price),
        stock: v.inventory_quantity,
        status: v.inventory_quantity === 0 ? 'out_of_stock' : v.inventory_quantity <= 5 ? 'low_stock' : 'in_stock'
      }))
    );
    const summary = {
      total_variants: inventory.length,
      out_of_stock: inventory.filter(i => i.status === 'out_of_stock').length,
      low_stock: inventory.filter(i => i.status === 'low_stock').length,
      in_stock: inventory.filter(i => i.status === 'in_stock').length
    };
    res.json({ shop, summary, timestamp: new Date().toISOString(), inventory });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener inventario', detail: error.message });
  }
});

app.get('/api/price-changes', validateShopDomain, async (req, res) => {
  const { shop } = req.query;
  try {
    const response = await axios.get(`https://${shop}/products.json?limit=250`, {
      timeout: 10000,
      headers: { 'User-Agent': 'ShopifyGhostAPI/1.0' }
    });
    const discounted = response.data.products.flatMap(p =>
      p.variants
        .filter(v => v.compare_at_price && parseFloat(v.compare_at_price) > parseFloat(v.price))
        .map(v => ({
          product: p.title,
          variant: v.title,
          original_price: parseFloat(v.compare_at_price),
          sale_price: parseFloat(v.price),
          discount_pct: Math.round((1 - parseFloat(v.price) / parseFloat(v.compare_at_price)) * 100),
          url: `https://${shop}/products/${p.handle}`
        }))
    );
    res.json({ shop, total_discounted: discounted.length, timestamp: new Date().toISOString(), discounted_products: discounted });
  } catch (error) {
    res.status(500).json({ error: 'Error al detectar descuentos', detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Shopify Ghost API corriendo en puerto ${PORT}`);
});