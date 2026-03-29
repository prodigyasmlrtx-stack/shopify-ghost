const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/spy', async (req, res) => {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: "Dime qué tienda espiar" });

    try {
        // Entramos por la puerta de atrás (punto de venta)
        const target = `https://${shop.replace('https://', '')}/products.json?limit=250`;
        
        const response = await axios.get(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // ESTO ES LO VENDIBLE: Datos estructurados listos para Excel o Dashboards
        const dataParaVender = response.data.products.map(p => ({
            titulo: p.title,
            precio: p.variants[0]?.price,
            sku: p.variants[0]?.sku,
            imagen: p.images[0]?.src,
            creado: p.created_at,
            disponible: p.variants[0]?.inventory_quantity ?? "Check manual"
        }));

        res.json({
            status: "success",
            tienda: shop,
            total_productos: dataParaVender.length,
            data: dataParaVender
        });

    } catch (e) {
        res.status(500).json({ error: "Shopify bloqueó el acceso. Intenta con otra tienda o verifica el nombre." });
    }
});

app.listen(PORT, () => console.log("Motor activo"));