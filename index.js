const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); 

const app = express();
const PORT = process.env.PORT || 3000;

// TUS DATOS DE WEBSHARE (LONDRES)
const proxyUrl = "http://arzktwer:f552fuaoo921@31.59.20.176:6754";
const agent = new HttpsProxyAgent(proxyUrl);

app.get('/api/spy', async (req, res) => {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: "Falta el nombre de la tienda" });

    try {
        const target = `https://${shop.replace('https://', '')}/products.json?limit=250`;
        
        const response = await axios.get(target, {
            httpsAgent: agent, // AQUÍ USA EL PROXY DE LONDRES
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000 
        });

        const dataLimpia = response.data.products.map(p => ({
            titulo: p.title,
            precio: p.variants[0]?.price,
            sku: p.variants[0]?.sku,
            imagen: p.images[0]?.src,
            disponible: p.variants[0]?.available ? "SÍ" : "NO"
        }));

        res.json({
            status: "success",
            tienda: shop,
            total: dataLimpia.length,
            productos: dataLimpia
        });

    } catch (e) {
        res.status(500).json({ 
            error: "Shopify sigue bloqueando o el Proxy falló", 
            detalle: e.message 
        });
    }
});

app.listen(PORT, () => console.log(`Motor blindado en puerto ${PORT}`));