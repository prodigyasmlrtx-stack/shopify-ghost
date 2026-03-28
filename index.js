const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/products', async (req, res) => {
    const shop = req.query.shop; // Aquí recibe "colourpop.myshopify.com"

    if (!shop) {
        return res.status(400).json({ error: "Falta el parámetro 'shop'" });
    }

    try {
        // La URL correcta para espiar tiendas públicas es esta:
        const url = `https://${shop}/products.json`;
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        res.json({
            success: true,
            count: response.data.products.length,
            products: response.data.products
        });

    } catch (error) {
        res.status(500).json({ 
            error: "Error al obtener productos", 
            message: error.message,
            tip: "Asegúrate de que la URL de la tienda termina en .myshopify.com"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});