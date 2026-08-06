// src/routes/api.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { 
    Room, Booking, Consumption, Invoice, Employee, Shift, Expense, 
    Client, MinibarProduct, MinibarConsumption, User 
} = require('../models');
const { getMonthlyOccupancy } = require('../services/monthly-occupancy-service');

const saltRounds = 10; 

// Helper functions for datetime calculations (from room-planner.js and monthly-occupancy-service.js)
function getBookingActualStartDateTime(booking) {
    const datePart = booking.start_date + 'T';
    return booking.time_slot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
}

function getBookingActualEndDateTime(booking) {
    const endDateObj = new Date(booking.end_date + 'T00:00:00Z');
    return booking.time_slot === 'morning' ? new Date(endDateObj.getTime() + (12 * 60 * 60 * 1000)) : new Date(endDateObj.getTime() + (24 * 60 * 60 * 1000));
}

// Middleware de autorización por rol
function authorize(roles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado.' });
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Acceso denegado: rol insuficiente.' });
        }
        next();
    };
}

// --- Endpoints de Habitaciones ---
router.get('/rooms', authorize(['admin', 'supervisor', 'operador', 'limpieza']), async (req, res) => {
    try {
        const rooms = await Room.findAll();
        res.json({ message: 'success', data: rooms });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/rooms/status/:roomId', authorize(['admin', 'supervisor', 'limpieza']), async (req, res) => {
    const { clean_status } = req.body;
    const { roomId } = req.params;
    if (!clean_status) { return res.status(400).json({ error: "Falta el estado de limpieza." }); }
    try {
        const [updated] = await Room.update({ clean_status }, { where: { id: roomId } });
        if (updated) {
            res.json({ message: "Estado de limpieza actualizado.", changes: updated });
        } else {
            res.status(404).json({ error: "Habitación no encontrada." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/rooms/:id/price', authorize(['admin', 'supervisor']), async (req, res) => {
    const { price } = req.body;
    const { id } = req.params;
    if (typeof price !== 'number' || price < 0) { return res.status(400).json({ error: "El precio debe ser un número positivo." }); }
    try {
        const [updated] = await Room.update({ price }, { where: { id } });
        if (updated) {
            res.status(200).json({ message: "Precio de habitación actualizado exitosamente.", changes: updated });
        } else {
            res.status(404).json({ error: "Habitación no encontrada." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Reservas ---
router.get('/bookings', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            include: [{ model: Room }, { model: Client, attributes: ['name', 'cuit_cuil', 'invoice_type'] }]
        });
        res.json({ message: "success", data: bookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para crear una nueva reserva
router.post('/bookings', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { room_id, client_name, start_date, end_date, status, price_per_night, email, notes, client_id, source_channel, time_slot } = req.body;

    if (!room_id || !client_name || !start_date || !end_date || !status || !time_slot) {
        return res.status(400).json({ error: "Faltan campos requeridos (room_id, client_name, start_date, end_date, status, time_slot)." });
    }

    try {
        // Fetch room to confirm existence and get default price if not provided
        const room = await Room.findByPk(room_id);
        if (!room) { return res.status(404).json({ error: "Habitación no encontrada." }); }
        const actualPricePerNight = price_per_night || room.price;

        // Overlap validation logic
        const newBookingTemp = { start_date, end_date, time_slot }; // Create temp object for helpers
        const newBookingActualStart = getBookingActualStartDateTime(newBookingTemp);
        const newBookingActualEnd = getBookingActualEndDateTime(newBookingTemp);

        const overlappingBookings = await Booking.findAll({
            where: {
                room_id: room_id,
                status: { [Op.in]: ['reserved', 'occupied', 'blocked'] }, // Only active statuses
                // Simplified date overlap for initial query, then refine with time_slot
                [Op.and]: [
                    { start_date: { [Op.lt]: end_date } },
                    { end_date: { [Op.gt]: start_date } }
                ]
            }
        });

        const hasOverlap = overlappingBookings.some(existingBooking => {
            const existingBookingActualStart = getBookingActualStartDateTime(existingBooking);
            const existingBookingActualEnd = getBookingActualEndDateTime(existingBooking);
            
            // Overlap check: [A_start, A_end) overlaps with [B_start, B_end) if (A_start < B_end) AND (A_end > B_start)
            return newBookingActualStart < existingBookingActualEnd && newBookingActualEnd > existingBookingActualStart;
        });

        if (hasOverlap) {
            return res.status(409).json({ error: "Conflicto de reserva: La habitación ya está ocupada o reservada en esas fechas/franjas." });
        }

        const newBooking = await Booking.create({
            room_id, client_name, start_date, end_date, status, 
            price_per_night: actualPricePerNight, email, notes, client_id, source_channel, time_slot
        });
        res.status(201).json({ message: "Reserva creada exitosamente", data: newBooking });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para ACTUALIZAR una reserva existente
router.put('/bookings/:id', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { id } = req.params;
    const { room_id, client_name, start_date, end_date, status, price_per_night, email, notes, client_id, source_channel, time_slot } = req.body;

    if (!room_id || !client_name || !start_date || !end_date || !status || !time_slot) {
        return res.status(400).json({ error: "Faltan campos requeridos (room_id, client_name, start_date, end_date, status, time_slot)." });
    }

    try {
        // Fetch room to confirm existence and get default price if not provided
        const room = await Room.findByPk(room_id);
        if (!room) { return res.status(404).json({ error: "Habitación no encontrada." }); }
        const actualPricePerNight = price_per_night || room.price;

        // Overlap validation logic, excluding the current booking
        const updatedBookingTemp = { start_date, end_date, time_slot };
        const updatedBookingActualStart = getBookingActualStartDateTime(updatedBookingTemp);
        const updatedBookingActualEnd = getBookingActualEndDateTime(updatedBookingTemp);

        const overlappingBookings = await Booking.findAll({
            where: {
                room_id: room_id,
                id: { [Op.ne]: id }, // Exclude the current booking being updated
                status: { [Op.in]: ['reserved', 'occupied', 'blocked'] },
                [Op.and]: [
                    { start_date: { [Op.lt]: end_date } },
                    { end_date: { [Op.gt]: start_date } }
                ]
            }
        });

        const hasOverlap = overlappingBookings.some(existingBooking => {
            const existingBookingActualStart = getBookingActualStartDateTime(existingBooking);
            const existingBookingActualEnd = getBookingActualEndDateTime(existingBooking);
            return updatedBookingActualStart < existingBookingActualEnd && updatedBookingActualEnd > existingBookingActualStart;
        });

        if (hasOverlap) {
            return res.status(409).json({ error: "Conflicto de reserva: La habitación ya está ocupada o reservada en esas fechas/franjas." });
        }

        const [updatedRows] = await Booking.update({
            room_id, client_name, start_date, end_date, status,
            price_per_night: actualPricePerNight, email, notes, client_id, source_channel, time_slot
        }, { where: { id } });

        if (updatedRows > 0) {
            res.status(200).json({ message: "Reserva actualizada exitosamente", changes: updatedRows });
        } else {
            res.status(404).json({ error: "Reserva no encontrada." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/bookings/:id', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findByPk(id, {
            include: [{ model: Room }, { model: Client, attributes: ['name', 'cuit_cuil', 'invoice_type'] }]
        });
        if (booking) {
            res.json({ message: "success", data: booking });
        } else {
            res.status(404).json({ error: "Reserva no encontrada." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/bookings/:id', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findByPk(id);
        if (!booking) { return res.status(404).json({ error: "Reserva no encontrada." }); }
        if (booking.status === 'occupied') {
            return res.status(403).json({ error: "No se puede cancelar una reserva con check-in realizado. Use el proceso de check-out." });
        }
        const deletedRows = await Booking.destroy({ where: { id } });
        if (deletedRows > 0) {
            res.json({ message: "Reserva cancelada exitosamente.", changes: deletedRows });
        } else {
            res.status(404).json({ error: "Reserva no encontrada." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoints para obtener reservas filtradas (para el reporte de ocupación visual)
router.get('/bookings/filtered', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { start_date, end_date, room_id } = req.query;
    if (!start_date || !end_date) { return res.status(400).json({ error: "Se requieren fechas de inicio y fin." }); }

    let whereClause = {
        [Op.and]: [
            { start_date: { [Op.lte]: end_date } },
            { end_date: { [Op.gte]: start_date } }
        ],
        status: { [Op.notIn]: ['cancelled', 'pending'] } // Only active bookings
    };

    if (room_id) {
        whereClause.room_id = room_id;
    }

    try {
        const bookings = await Booking.findAll({ where: whereClause });
        res.json({ message: "success", data: bookings });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- Endpoints de Consumos ---
router.get('/bookings/:bookingId/consumptions', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { bookingId } = req.params;
    try {
        const consumptions = await Consumption.findAll({ where: { booking_id: bookingId } });
        res.json({ message: "success", data: consumptions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/consumptions', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { booking_id, description, amount, date } = req.body;
    if (!booking_id || !description || !amount || !date) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        const newConsumption = await Consumption.create({ booking_id, description, amount, date });
        res.status(201).json({ message: "Consumo añadido exitosamente", data: newConsumption });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Minibar Products ---
router.get('/minibar/products', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    try {
        const products = await MinibarProduct.findAll();
        res.json({ message: "success", data: products });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/minibar/products', authorize(['admin', 'supervisor']), async (req, res) => {
    const { name, price, quantity } = req.body;
    if (!name || typeof price !== 'number' || price < 0 || typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: "Datos de producto inválidos." });
    }
    try {
        const newProduct = await MinibarProduct.create({ name, price, quantity });
        res.status(201).json({ message: "Producto de minibar añadido exitosamente", data: newProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
outer.put('/minibar/products/:id', authorize(['admin', 'supervisor']), async (req, res) => {
    const { id } = req.params;
    const { name, price, quantity } = req.body;
    if (!name || typeof price !== 'number' || price < 0 || typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: "Datos de producto inválidos." });
    }
    try {
        const [updatedRows] = await MinibarProduct.update({ name, price, quantity }, { where: { id } });
        if (updatedRows > 0) {
            res.status(200).json({ message: "Producto de minibar actualizado exitosamente", changes: updatedRows });
        } else {
            res.status(404).json({ error: "Producto no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/minibar/products/:id', authorize(['admin', 'supervisor']), async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRows = await MinibarProduct.destroy({ where: { id } });
        if (deletedRows > 0) {
            res.status(200).json({ message: "Producto de minibar eliminado exitosamente", changes: deletedRows });
        } else {
            res.status(404).json({ error: "Producto no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Consumos de Minibar ---
router.get('/bookings/:bookingId/minibar-consumptions', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { bookingId } = req.params;
    try {
        const consumptions = await MinibarConsumption.findAll({
            where: { booking_id: bookingId },
            include: [{ model: MinibarProduct, attributes: ['name'] }]
        });
        res.json({ message: "success", data: consumptions.map(c => ({
            id: c.id,
            booking_id: c.booking_id,
            product_id: c.minibar_product_id,
            product_name: c.MinibarProduct ? c.MinibarProduct.name : 'Desconocido',
            quantity: c.quantity_consumed,
            price: c.unit_price,
            date_consumed: c.date_consumed
        })) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/bookings/:bookingId/minibar-consumptions', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { bookingId } = req.params;
    const { product_id, quantity, price_at_consumption } = req.body;

    if (!product_id || typeof quantity !== 'number' || quantity <= 0 || typeof price_at_consumption !== 'number' || price_at_consumption < 0) {
        return res.status(400).json({ error: "Datos de consumo de minibar inválidos." });
    }
    try {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) { return res.status(404).json({ error: "Reserva no encontrada." }); }
        
        const newConsumption = await MinibarConsumption.create({
            booking_id: bookingId, 
            minibar_product_id: product_id, 
            quantity_consumed: quantity, 
            unit_price: price_at_consumption,
            date_consumed: new Date().toISOString().split('T')[0]
        });
        res.status(201).json({ message: "Consumo de minibar añadido exitosamente", data: newConsumption });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- Endpoints de Facturación (Invoices) ---
router.post('/invoices/generate/:bookingId', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { bookingId } = req.params;
    const { payment_method } = req.body; // Removed late_checkout_applied from request body

    if (!payment_method) {
        return res.status(400).json({ error: "Se requiere el método de pago." });
    }

    try {
        const booking = await Booking.findByPk(bookingId, { include: [Client, Room] });
        if (!booking) { return res.status(404).json({ error: "Reserva no encontrada." }); }

        // Validar que el check-out ya se realizó antes de facturar (o que el estado permita facturar)
        if (booking.status !== 'checked-out' && booking.status !== 'paid' && booking.status !== 'invoiced') {
            return res.status(400).json({ error: "La reserva debe estar en estado 'Checked-Out', 'Paid' o 'Invoiced' para generar factura." });
        }

        const existingInvoice = await Invoice.findOne({ where: { booking_id: bookingId } });
        if (existingInvoice) {
            return res.status(409).json({ error: `Esta reserva ya tiene una factura generada (#${existingInvoice.invoice_number}).`, invoiceId: existingInvoice.id });
        }

        const consumptions = await Consumption.findAll({ where: { booking_id: bookingId } });
        const minibarConsumptions = await MinibarConsumption.findAll({ where: { booking_id: bookingId }, include: [MinibarProduct] });

        // Calcular el costo de la estadía (slot-based)
        const bookingActualStart = getBookingActualStartDateTime(booking);
        const bookingActualEnd = getBookingActualEndDateTime(booking);
        let durationSlots = 0;
        let currentSlotPointer = new Date(bookingActualStart.getTime());
        while (currentSlotPointer.getTime() < bookingActualEnd.getTime()) {
            durationSlots++;
            currentSlotPointer.setUTCHours(currentSlotPointer.getUTCHours() + 12);
        }
        const pricePerSlot = booking.price_per_night / 2;
        const stayCost = durationSlots * pricePerSlot;

        let totalAdditionalConsumptions = consumptions.reduce((sum, item) => sum + item.amount, 0);
        let totalMinibarConsumptions = minibarConsumptions.reduce((sum, item) => sum + (item.quantity_consumed * item.unit_price), 0);

        // Removed the late_checkout_applied logic as it should be added as a consumption on the frontend

        const subtotal = stayCost + totalAdditionalConsumptions + totalMinibarConsumptions;
        // Para este MVP, IVA es 21% sobre el subtotal.
        const vatRate = 0.21;
        const vatAmount = subtotal * vatRate;
        const totalAmount = subtotal + vatAmount;

        const issueDate = new Date().toISOString().split('T')[0];
        const invoiceNumber = `INV-${issueDate.replace(/-/g, '')}-${bookingId}`;

        const invoiceDetails = JSON.stringify({
            stay: { description: `Estadía ${durationSlots / 2} noches (${booking.time_slot} en inicio/fin)`, amount: stayCost },
            consumptions: consumptions.map(c => ({ description: c.description, amount: c.amount })),
            minibarConsumptions: minibarConsumptions.map(mc => ({ 
                product_name: mc.MinibarProduct.name, 
                quantity: mc.quantity_consumed, 
                unit_price: mc.unit_price,
                amount: mc.quantity_consumed * mc.unit_price
            })),
            clientDetails: booking.Client ? { name: booking.Client.name, cuit_cuil: booking.Client.cuit_cuil, invoice_type: booking.Client.invoice_type } : null
        });

        const newInvoice = await Invoice.create({
            booking_id: bookingId, 
            invoice_number: invoiceNumber, 
            issue_date: issueDate, 
            total_amount: totalAmount, 
            details: invoiceDetails, 
            payment_method: payment_method
        });

        // Update room status to dirty only if it was occupied
        if (booking.status === 'occupied' || booking.status === 'checked-out') { // Only mark dirty if it was physically occupied.
             await Room.update({ clean_status: 'dirty' }, { where: { id: booking.room_id } });
        }
       
        // Update booking status to 'invoiced'
        await Booking.update({ status: 'invoiced' }, { where: { id: bookingId } });

        res.status(201).json({
            message: "Factura generada y habitación marcada como sucia (si aplicaba).",
            invoiceId: newInvoice.id,
            invoiceNumber: invoiceNumber,
            totalAmount: totalAmount,
            roomStatusUpdatedTo: 'dirty',
            paymentMethodUsed: payment_method
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/invoices/:id', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { id } = req.params;
    try {
        const invoice = await Invoice.findByPk(id, {
            include: [
                { model: Booking, include: [Client, Room] }, 
                { model: Consumption }, 
                { model: MinibarConsumption, include: [MinibarProduct] }
            ]
        });
        if (!invoice) { return res.status(404).json({ error: "Factura no encontrada." }); }

        // Reconstruct details for the frontend
        const parsedDetails = JSON.parse(invoice.details);
        
        const responseData = {
            id: invoice.id,
            booking_id: invoice.booking_id,
            invoice_number: invoice.invoice_number,
            issue_date: invoice.issue_date,
            total_amount: invoice.total_amount,
            payment_method: invoice.payment_method,
            details: {
                stay: parsedDetails.stay,
                consumptions: parsedDetails.consumptions,
                minibarConsumptions: parsedDetails.minibarConsumptions,
                clientDetails: parsedDetails.clientDetails || (invoice.Booking && invoice.Booking.Client ? { 
                    name: invoice.Booking.Client.name, 
                    cuit_cuil: invoice.Booking.Client.cuit_cuil, 
                    invoice_type: invoice.Booking.Client.invoice_type 
                } : null),
                roomDetails: invoice.Booking && invoice.Booking.Room ? { 
                    name: invoice.Booking.Room.name, 
                    category: invoice.Booking.Room.category 
                } : null
            }
        };
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching invoice details:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/invoices', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    try {
        const invoices = await Invoice.findAll({ attributes: ['id', 'booking_id', 'invoice_number', 'issue_date', 'total_amount', 'payment_method'], order: [['issue_date', 'DESC']] });
        res.json({ data: invoices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Empleados ---
router.get('/employees', authorize(['admin', 'supervisor', 'operador', 'limpieza']), async (req, res) => {
    try {
        const employees = await Employee.findAll();
        res.json({ data: employees });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/employees', authorize(['admin', 'supervisor']), async (req, res) => {
    const { name, role, monthly_salary } = req.body;
    if (!name || !role || typeof monthly_salary !== 'number' || monthly_salary < 0) { return res.status(400).json({ error: "Faltan campos requeridos o son inválidos." }); }
    try {
        const newEmployee = await Employee.create({ name, role, monthly_salary });
        res.status(201).json({ message: "Empleado añadido.", id: newEmployee.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/employees/:id', authorize(['admin', 'supervisor']), async (req, res) => {
    const { name, role, monthly_salary } = req.body;
    if (!name || !role || typeof monthly_salary !== 'number' || monthly_salary < 0) { return res.status(400).json({ error: "Datos de empleado inválidos." }); }
    try {
        const [updated] = await Employee.update({ name, role, monthly_salary }, { where: { id: req.params.id } });
        if (updated) {
            res.status(200).json({ message: "Empleado actualizado.", changes: updated });
        } else {
            res.status(404).json({ error: "Empleado no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/employees/:id', authorize(['admin']), async (req, res) => {
    try {
        const deleted = await Employee.destroy({ where: { id: req.params.id } });
        if (deleted) {
            res.status(200).json({ message: "Empleado eliminado.", changes: deleted });
        } else {
            res.status(404).json({ error: "Empleado no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Turnos ---
router.get('/shifts', authorize(['admin', 'supervisor', 'operador', 'limpieza']), async (req, res) => {
    const { year, month } = req.query; 
    if (!year || !month) { return res.status(400).json({ error: "Se requieren año y mes." }); }
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`; 
    try {
        const shifts = await Shift.findAll({ where: { shift_date: { [Op.between]: [startDate, endDate] } } });
        res.json({ data: shifts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/shifts', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { employee_id, shift_date, shift_type } = req.body;
    if (!employee_id || !shift_date || !shift_type) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        // Upsert: Try to create, if it exists, update it. SQLite specific, but Sequelize handles this with findOrCreate or findOne+update
        const [shift, created] = await Shift.findOrCreate({
            where: { employee_id, shift_date },
            defaults: { shift_type }
        });

        if (!created) {
            await shift.update({ shift_type });
        }

        res.status(201).json({ message: "Turno guardado.", id: shift.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Gastos ---
router.get('/expenses', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    try {
        const expenses = await Expense.findAll({ order: [['date', 'DESC']] });
        res.json({ data: expenses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/expenses', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { description, amount, date, category } = req.body;
    if (!description || typeof amount !== 'number' || amount <= 0 || !date || !category) { return res.status(400).json({ error: "Faltan campos requeridos o son inválidos." }); }
    try {
        const newExpense = await Expense.create({ description, amount, date, category });
        res.status(201).json({ message: "Gasto añadido exitosamente", id: newExpense.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Clientes (Companies) ---
router.get('/clients', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    try {
        const clients = await Client.findAll();
        res.json({ message: "success", data: clients });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/clients', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { name, cuit_cuil, invoice_type } = req.body;
    if (!name || !cuit_cuil || !invoice_type) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        const newClient = await Client.create({ name, cuit_cuil, invoice_type });
        res.status(201).json({ message: "Cliente añadido exitosamente", data: newClient });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/clients/:id', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { id } = req.params;
    const { name, cuit_cuil, invoice_type } = req.body;
    if (!name || !cuit_cuil || !invoice_type) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        const [updatedRows] = await Client.update({ name, cuit_cuil, invoice_type }, { where: { id } });
        if (updatedRows > 0) {
            res.status(200).json({ message: "Cliente actualizado exitosamente", changes: updatedRows });
        } else {
            res.status(404).json({ error: "Cliente no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/clients/:id', authorize(['admin', 'supervisor']), async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRows = await Client.destroy({ where: { id } });
        if (deletedRows > 0) {
            res.status(200).json({ message: "Cliente eliminado exitosamente", changes: deletedRows });
        } else {
            res.status(404).json({ error: "Cliente no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Usuarios (ABM) ---
router.get('/users', authorize(['admin', 'supervisor']), async (req, res) => {
    try {
        // No retornamos el hash de la contraseña
        const users = await User.findAll({ attributes: ['id', 'username', 'email', 'role', 'is_active'] });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users', authorize(['admin']), async (req, res) => {
    const { username, email, password, role, is_active } = req.body;
    if (!username || !password || !role) { return res.status(400).json({ error: "Faltan campos requeridos (username, password, role)." }); }
    if (password.length < 6) { return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." }); }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await User.create({
            username, email, password: hashedPassword, role, is_active: is_active ?? true 
        });
        res.status(201).json({ message: "Usuario creado exitosamente", id: newUser.id });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'El nombre de usuario o email ya existe.' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id', authorize(['admin']), async (req, res) => {
    const { id } = req.params;
    const { email, role, is_active } = req.body;
    // No permitimos cambiar la contraseña o username desde este endpoint directamente
    try {
        const [updatedRows] = await User.update(
            { email, role, is_active: is_active ?? true }, 
            { where: { id } }
        );
        if (updatedRows > 0) {
            res.status(200).json({ message: "Usuario actualizado exitosamente", changes: updatedRows });
        } else {
            res.status(404).json({ error: "Usuario no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Soft delete (desactivar) usuario
router.delete('/users/:id', authorize(['admin']), async (req, res) => {
    const { id } = req.params;
    try {
        const [updatedRows] = await User.update({ is_active: false }, { where: { id } });
        if (updatedRows > 0) {
            res.status(200).json({ message: "Usuario desactivado exitosamente", changes: updatedRows });
        } else {
            res.status(404).json({ error: "Usuario no encontrado." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoint de Cambio de Contraseña ---
router.put('/user/password', authorize(['admin', 'supervisor', 'operador', 'limpieza']), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Obtenemos el ID del usuario autenticado

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Faltan la contraseña actual o la nueva contraseña." });
    }
    if (newPassword.length < 6) { return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." }); }

    try {
        const user = await User.findByPk(userId);
        if (!user) { return res.status(500).json({ error: "Error interno: Usuario no encontrado en DB." }); }사실

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) { return res.status(401).json({ error: "La contraseña actual es incorrecta." }); }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await user.update({ password: hashedPassword });
        res.status(200).json({ message: "Contraseña actualizada exitosamente." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoint de Reporte de Ganancias Mensual ---
router.get('/reports/profit-loss', authorize(['admin', 'supervisor']), async (req, res) => {
    const { year, month } = req.query; 
    if (!year || !month) { return res.status(400).json({ error: "Se requieren los parámetros 'year' y 'month'." }); }

    const monthPadded = month.padStart(2, '0');
    const startDate = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, parseInt(month), 0).getDate(); 
    const endDate = `${year}-${monthPadded}-${lastDay.toString().padStart(2, '0')}`;
    
    try {
        const invoicesTotal = await Invoice.sum('total_amount', { where: { issue_date: { [Op.between]: [startDate, endDate] } } }) || 0;
        const expensesTotal = await Expense.sum('amount', { where: { date: { [Op.between]: [startDate, endDate] } } }) || 0;
        const salariesTotal = await Employee.sum('monthly_salary') || 0; // Asumimos que los salarios son mensuales fijos

        const totalCosts = expensesTotal + salariesTotal;
        const profit = invoicesTotal - totalCosts;

        res.json({
            period: `${year}-${monthPadded}`,
            invoicesTotal: parseFloat(invoicesTotal.toFixed(2)),
            expensesTotal: parseFloat(expensesTotal.toFixed(2)),
            salariesTotal: parseFloat(salariesTotal.toFixed(2)),
            profit: parseFloat(profit.toFixed(2))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoint de Reporte de Ocupación Mensual ---
router.get('/reports/monthly-occupancy', authorize(['admin', 'supervisor', 'operador']), async (req, res) => {
    const { year } = req.query;
    if (!year) { return res.status(400).json({ error: "Se requiere el parámetro 'year'." }); }

    try {
        const report = await getMonthlyOccupancy(parseInt(year));
        res.json({ message: "success", data: report });
    } catch (error) {
        console.error("Error generating monthly occupancy report:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
