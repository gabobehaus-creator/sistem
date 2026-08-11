const express = require('express');
const router = express.Router();

// Intentamos importar los modelos desde la ubicación correcta del proyecto
let Room, Invoice, Expense, Booking, User;
try {
    const db = require('../database');
    Room = db.Room;
    Invoice = db.Invoice;
    Expense = db.Expense;
    Booking = db.Booking;
    User = db.User;
} catch (e) {
    // Fallback si los modelos se exportan individualmente o desde models
    try {
        Room = require('../models/room');
        Invoice = require('../models/invoice');
        Expense = require('../models/expense');
        Booking = require('../models/booking');
        User = require('../models/user');
    } catch (err) {
        console.error("No se pudieron cargar los modelos de la base de datos:", err);
    }
}

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en el servidor.' });
        }

        // 1. Gather context from database safely including Bookings
        const rooms = Room ? await Room.findAll() : [];
        const bookings = Booking ? await Booking.findAll() : [];
        const invoices = Invoice ? await Invoice.findAll({ limit: 50 }) : [];
        const expenses = Expense ? await Expense.findAll({ limit: 50 }) : [];

        const contextData = {
            rooms: rooms.map(r => ({ id: r.id, name: r.name, category: r.category, status: r.clean_status, price: r.price })),
            bookings: bookings.map(b => ({ id: b.id, roomId: b.room_id || b.roomId, status: b.status, checkIn: b.check_in || b.checkIn, checkOut: b.check_out || b.checkOut })),
            totalInvoicesCount: invoices.length,
            recentInvoices: invoices.map(i => ({ id: i.id, total: i.total, date: i.issue_date })),
            recentExpenses: expenses.map(e => ({ description: e.description, amount: e.amount, date: e.date }))
        };

        const systemPrompt = `Eres el asistente virtual inteligente de un hotel. Tienes acceso a la siguiente información actual del sistema en formato JSON:
${JSON.stringify(contextData)}

Responde de manera amable, profesional y precisa a las consultas del recepcionista o administrador. Puedes informar sobre habitaciones disponibles u ocupadas (revisando el estado de las reservas y habitaciones), calcular totales, estimar presupuestos basados en los precios de las habitaciones y dar reportes rápidos.`;

        // Call Gemini API using fetch with gemini-2.5-flash model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
