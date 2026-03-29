const express = require('express');

const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 10000;



// COPIA TU API KEY DE ZENROWS AQUÍ ABAJO

const ZENROWS_API_KEY = "fa099b8db85ef98afcfacdf7f44a3a9db17354a9"; 



app.get('/api/spy', async (req, res) => {

    const { shop } = req.query;

    if (!shop) return res.status(400).json({ error: "Falta la URL de la tienda" });



    try {

        // Configuramos la URL de la tienda

        const targetUrl = `https://${shop}/products.json?limit=250`;

        

        // Llamamos a ZenRows (ellos usan sus proxies premium por nosotros)

        const zenRowsUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(targetUrl)}&premium_proxy=true`;



        const response = await axios.get(zenRowsUrl);



        // Si ZenRows nos devuelve los datos, los limpiamos para el cliente

        const dataParaVender = response.data.products.map(p => ({

            titulo: p.title,

            precio: p.variants[0]?.price,

            sku: p.variants[0]?.sku,

            imagen: p.images[0]?.src,

            creado: p.created_at

        }));



        res.json({

            status: "success",

            total: dataParaVender.length,

            productos: dataParaVender

        });



    } catch (error) {

        res.status(500).json({ 

            error: "Error de blindaje", 

            message: "ZenRows no pudo entrar o la tienda no es Shopify" 

        });

    }

});



app.listen(PORT, () => console.log("Motor blindado activo en Render"));