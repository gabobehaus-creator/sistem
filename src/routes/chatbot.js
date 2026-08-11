const express = require('express');
const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en el servidor.' });
        }

        // Try to load all models dynamically from database instance or individual files
        let dbModels = {};
        try {
            const db = require('../database');
            if (db.sequelize && db.sequelize.models) {
                dbModels = db.sequelize.models;
            } else {
                dbModels = db;
            }
        } catch (e) {
            console.error("Error loading db models:", e);
        }

        // Gather data from all available models in the system automatically
        const contextData = {};
        for (const [modelName, modelObj] of Object.entries(dbModels)) {
            if (modelObj && typeof modelObj.findAll === 'function') {
                try {
                    const records = await modelObj.findAll({ limit: 100 });
                    contextData[modelName] = records.map(r => r.toJSON ? r.toJSON() : r);
                } catch (err) {
                    console.warn(`Could not fetch data for model ${modelName}:`, err.message);
                }
            }
        }

        const systemPrompt = `Eres el asistente virtual experto e inteligente de un hotel con acceso total a toda la base de datos y ecosistema del sistema de gestión hotelera. 
Tienes acceso a la siguiente información actual del sistema en formato JSON (que incluye habitaciones, reservas, clientes, facturas, gastos, minibar, usuarios, registros de asistencia/fichajes y cualquier otra entidad disponible):

${JSON.stringify(contextData)}

Instrucciones:
- Responde de manera amable, profesional, precisa y detallada a las consultas del recepcionista o administrador.
- Puedes informar sobre habitaciones disponibles u ocupadas, estado del minibar, stock, reportes de asistencia de empleados por fecha/hora, ganancias y facturación, presupuestos, gastos y cualquier dato presente en el sistema.
- Si te piden calcular algo, hazlo basándote en los datos provistos.`;

        // Call Gemini API using fetch with gemini-pro model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\nPregunta del usuario: " + message }] }
                ]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const reply = data.candidates[0].content.parts[0].text;
            res.json({ reply });
        } else {
            res.status(500).json({ error: 'No se pudo obtener respuesta.', details: data });
        }

    } catch (error) {
        console.error('Error en chatbot:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el chat.' });
    }
});

module.exports = router;
