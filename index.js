const express = require('express');

const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 10000;



// TU API KEY DE ZENROWS

const ZENROWS_API_KEY = "fa099b8db85ef98afcfacdf7f44a3a9db17354a9"; 



app.get('/api/spy', async (req, res) => {

    const { shop } = req.query;

    if (!shop) return res.status(400).json({ error: "Falta la tienda" });



    try {

        // Limpiamos la URL por si acaso

        const cleanShop = shop.replace('https://', '').replace('http://', '').split('/')[0];

        const targetUrl = `https://${cleanShop}/products.json?limit=250`;

        

        // ESTA ES LA LLAVE MAESTRA:

        // premium_proxy=true (IPs de casas reales)

        // js_render=true (Simula un navegador de verdad, esto evita el 99% de bloqueos)

        const zenRowsUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(targetUrl)}&premium_proxy=true&js_render=true`;



        console.log(`Espiando a: ${cleanShop}...`);



        const response = await axios.get(zenRowsUrl);



        // Validamos si Shopify respondió con productos

        if (!response.data || !response.data.products) {

            return res.status(404).json({ error: "No se encontraron productos o la tienda no es Shopify" });

        }



        const productos = response.data.products.map(p => ({

            titulo: p.title,

            precio: p.variants[0]?.price || "N/A",

            sku: p.variants[0]?.sku || "N/A",

            imagen: p.images[0]?.src || "",

            fecha: p.created_at

        }));



        res.json({

            status: "success",

            tienda: cleanShop,

            total: productos.length,

            data: productos

        });



    } catch (e) {

        // Esto te dirá exactamente qué falló

        res.status(500).json({ 

            error: "Fallo de conexión", 

            mensaje: e.response?.data?.message || e.message 

        });

    }

});



app.listen(PORT, () => console.log(`Tanque activo en puerto ${PORT}`));