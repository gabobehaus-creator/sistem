const express = require('express');
const router = express.Router();
const { Room, Invoice, Expense, Booking, User } = require('../database'); // Adjust based on your models

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en el servidor.' });
        }

        // 1. Gather context from database
        const rooms = await Room.findAll();
        const invoices = await Invoice.findAll({ limit: 50 });
        const expenses = await Expense.findAll({ limit: 50 });

        const contextData = {
            rooms: rooms.map(r => ({ name: r.name, category: r.category, status: r.clean_status, price: r.price })),
            totalInvoicesCount: invoices.length,
            recentInvoices: invoices.map(i => ({ id: i.id, total: i.total, date: i.issue_date })),
            recentExpenses: expenses.map(e => ({ description: e.description, amount: e.amount, date: e.date }))
        };

        const systemPrompt = `Eres el asistente virtual inteligente de un hotel. Tienes acceso a la siguiente información actual del sistema en formato JSON:
${JSON.stringify(contextData)}

Responde de manera amable, profesional y precisa a las consultas del recepcionista o administrador. Puedes informar sobre habitaciones disponibles u ocupadas, calcular totales, estimar presupuestos basados en los precios de las habitaciones y dar reportes rápidos.`;

        // Call Gemini API using fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            res.status(500).json({ error: 'No se pudo obtener respuesta de Gemini.', details: data });
        }

    } catch (error) {
        console.error('Error en chatbot:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el chat.' });
    }
});

module.exports = router;
