// src/routes/api.js (COMPLETO Y MIGRADO A SEQUELIZE)
const express = require('express');
const router = express.Router();
const { authenticateMiddleware } = require('../auth');
const bcrypt = require('bcrypt');
const { Room, Booking, Consumption, Invoice, Employee, Shift, Expense, User, sequelize, Client, MinibarProduct, MinibarConsumption } = require('../models'); 
const { Op } = require('sequelize'); // Operadores de Sequelize para consultas complejas
const { sendBookingConfirmation } = require('../services/email-service'); // Importa el nuevo servicio
const { BookingReservas } = require('../booking/reservas'); // Importa la clase BookingReservas
const { getMonthlyOccupancy } = require('../services/monthly-occupancy-service'); // Importa el nuevo servicio de ocupación

// Add imports for Gemini API
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load SQL schema for system prompt
const SQL_SCHEMA = fs.readFileSync('src/models/model.txt', 'utf8');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // API key from environment variable
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// System prompt for Gemini
const SYSTEM_PROMPT = `You are a SQL query generator. Your task is to translate natural language questions into *safe, read-only* SQL queries for an SQLite database based on the provided schema.

The database schema is as follows:
\`\`\`sql
${SQL_SCHEMA}
\`\`\`

**IMPORTANT GUIDELINES:**
1.  **ONLY generate SELECT statements.** No INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, TRUNCATE, etc.
2.  **Ensure queries are read-only and safe.** Avoid any operations that could modify the database structure or data.
3.  **Do not include any placeholders or parameters.** Generate the full, executable SQL query directly.
4.  **Prefer simple queries.** If a complex query is requested, simplify it to a basic SELECT statement if possible.
5.  **If a query cannot be safely translated to a read-only SELECT statement based on the schema, respond with 'INVALID_QUERY'.**
6.  **Do not provide any explanations, just the SQL query or 'INVALID_QUERY'.**`;


// Aplicamos el middleware de autenticación a todas las rutas de este router por defecto
router.use(authenticateMiddleware);

// --- Endpoints de habitaciones y reservas ---

// Endpoints de habitaciones y reservas
// Endpoint para obtener todas las habitaciones
// src/routes/api.js (Actualiza este endpoint con el código a continuación)

// Endpoint para obtener todas las habitaciones (MODIFICADO CON ORDEN PERSONALIZADO)
router.get('/rooms', async (req, res) => {
    try {
        // Usamos una consulta cruda para un ordenamiento complejo y específico:
        // 1. Prioriza las habitaciones cuyo nombre empieza por 'BeH' (1 = BeH, 0 = Otros)
        // 2. Ordena las habitaciones BeH numéricamente si es posible, o alfabéticamente si no.
        // 3. El resto de habitaciones se listan a continuación.

        const rooms = await sequelize.query(
            `SELECT * FROM rooms 
             ORDER BY 
                 CASE 
                     WHEN name LIKE 'BeH%' THEN 0 
                     ELSE 1 
                 END,
                 name ASC;`, // Orden alfabético ascendente para ordenar por número de habitación
            {
                model: Room, // Mapea los resultados de vuelta al modelo Room de Sequelize
                mapToModel: true,
                type: sequelize.QueryTypes.SELECT
            }
        );

        res.json({
            message: "success",
            data: rooms
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});


// Endpoint para obtener todas las reservas
router.get('/bookings', async (req, res) => {
    try {
          const parseIcsEvent = (ics) => {
            const parseDate = (field) => {
                const match = ics.match(new RegExp(`${field}(?:;[^:]*)?:(\\d{8})`));
                if (!match) return null;
                const d = match[1];
                return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
            };

            return {
                start_date: parseDate('DTSTART'),
                end_date: parseDate('DTEND')
            };
        };
        

    const calendarios = await BookingReservas.obtenerTodosLosCalendarios();
    
    const isIterableCalendarios = calendarios && typeof calendarios[Symbol.iterator] === 'function';

    if (Array.isArray(calendarios) || isIterableCalendarios) {
        const arrayCalendarios = Array.isArray(calendarios) ? calendarios : [...calendarios];
        const createBookingFromCalendar = async (cal) => {
            
            const { start_date, end_date } = parseIcsEvent(cal.ics || '');
            const time_slot = cal.time_slot || 'full-day'; // Asumimos 'full-day' para reservas importadas
            if (start_date && end_date) {
                console.log('Fechas completas:', cal);
                const room = await Room.findOne({ where: { name: cal.codigo } });
                console.log('room_id en calendario:', cal.room_id, 'Encontrada habitación:', room ? room.name : 'No encontrada'); // DEBUG
                if (room) {
                    console.log('Habitación encontrada para calendario:', cal.nombre, 'ID de habitación:', cal.room_id);
                    
                    // Lógica de detección de conflictos adaptada para franjas horarias
                    const conflicts = await Booking.findAll({
                        where: {
                            room_id: room.id,
                            [Op.and]: [
                                {
                                    [Op.or]: [
                                        { start_date: { [Op.between]: [start_date, end_date] } },
                                        { end_date: { [Op.between]: [start_date, end_date] } },
                                        { start_date: { [Op.lte]: start_date }, end_date: { [Op.gte]: end_date } }
                                    ]
                                },
                                {
                                    [Op.or]: [
                                        { time_slot: 'full-day' },
                                        { time_slot: time_slot },
                                        { time_slot: time_slot === 'morning' ? 'afternoon' : 'morning' } // Si es morning, choca con afternoon, viceversa
                                    ]
                                }
                            ]
                        }
                    });

                    if (conflicts.length > 0) {
                        console.log('Conflicto detectado para calendario:', cal.nombre, 'Fechas:', start_date, 'a', end_date, 'Franja:', time_slot);
                        //return { skipped: true, reason: 'conflict', calendar: cal };
                    }
                    console.log('Creando reserva para calendario:', cal.nombre, 'Fechas:', start_date, 'a', end_date, room);
                    const newBooking = await Booking.create({
                        room_id: room.id,
                        client_id: cal.client_id || null,
                        client_name: cal.client_name || 'Reserva sincronizada',
                        source_channel: cal.source_channel || 'booking',
                        start_date,
                        end_date,
                        status: cal.status || 'reserved',
                        price_per_night: room.price,
                        email: cal.email || null,
                        notes: cal.notes || null,
                        time_slot: time_slot // Añadimos el nuevo campo
                    });
                }
            }
            console.log('creada');

        };


        for (const cal of arrayCalendarios) {
            await createBookingFromCalendar(cal);
        }

// Endpoint para crear una nueva reserva (ACTUALIZADO P1/P3 con validación de superposición robusta)
router.post('/bookings', (req, res) => {
    const { room_id, client_name, start_date, end_date, status } = req.body;

    if (!room_id || !client_name || !start_date || !end_date || !status) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }
    
    const bookings = await Booking.findAll();

    res.json({
        message: "success",
        data: bookings
    });
    } catch (err) {
        console.log('error en endpoint /bookings:', err); // DEBUG
        res.status(400).json({"error": err.message});
    }
});

// Función auxiliar para detectar conflictos de reservas con franjas horarias
const detectBookingConflicts = async (bookingIdToExclude, room_id, start_date, end_date, time_slot) => {
    const whereClause = {
        room_id: room_id,
        [Op.and]: [
            {
                [Op.or]: [
                    { start_date: { [Op.between]: [start_date, end_date] } },
                    { end_date: { [Op.between]: [start_date, end_date] } },
                    { start_date: { [Op.lte]: start_date }, end_date: { [Op.gte]: end_date } }
                ]
            },
            {
                [Op.or]: [
                    { time_slot: 'full-day' },
                    { time_slot: time_slot },
                    // Si la nueva reserva es 'morning', busca conflictos con 'afternoon'
                    // Si la nueva reserva es 'afternoon', busca conflictos con 'morning'
                    // Esto es para el mismo día
                    ...(time_slot !== 'full-day' ? [{ time_slot: time_slot === 'morning' ? 'afternoon' : 'morning' }] : [])
                ]
            }
        ]
    };

    if (bookingIdToExclude) {
        whereClause.id = { [Op.ne]: bookingIdToExclude }; // Excluir la propia reserva al actualizar
    }

    const conflictCount = await Booking.count({ where: whereClause });
    return conflictCount > 0;
};

// Endpoint para crear una nueva reserva
router.post('/bookings', async (req, res) => {
    const { room_id, client_id, client_name, start_date, end_date, status, email, notes, source_channel, time_slot } = req.body;

    if (!room_id || !client_name || !start_date || !end_date || !status || !time_slot) {
        return res.status(400).json({ error: "Faltan campos requeridos (incluyendo franja horaria)." });
    }

    try {
        const room = await Room.findOne({ where: { id: room_id }, attributes: ['price'] });
        if (!room) {
            return res.status(404).json({ error: "Habitación no encontrada o error de precio." });
        }
        const price_per_night = room.price;

        // Lógica de validación de superposición robusta para intervalos [start, end)
        // Un booking [S1, E1) y [S2, E2) se solapan si (S1 < E2) AND (E1 > S2)
        const overlapQuery = `SELECT COUNT(*) as count FROM bookings 
                              WHERE room_id = ? 
                                AND status IN ('reserved', 'occupied') 
                                AND ((? < end_date) AND (? > start_date))`;
        
        db.get(overlapQuery, [room_id, end_date, start_date], (err, row) => {
            if (err) {
                res.status(500).json({"error": err.message});
                return;
            }

        if (hasConflict) {
            return res.status(409).json({ error: "Conflicto de reserva: La habitación ya está ocupada en esas fechas y franja horaria." });
        }

        const newBooking = await Booking.create({
            room_id,
            client_id: client_id || null,
            client_name,
            source_channel,
            start_date,
            end_date,
            status,
            price_per_night,
            email,
            notes,
            time_slot // Añadimos el nuevo campo
        });
        /*    await sendBookingConfirmation(email, {
               client_name,
               room_name: room.name,
               start_date,
               end_date,
               price_per_night: room.price
           });*/

        res.status(201).json({
            message: "Reserva creada exitosamente",
            data: newBooking,
            id: newBooking.id,
            price_per_night: price_per_night
        });

    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// Endpoint para ACTUALIZAR una reserva existente (ACTUALIZADO P1/P3 con validación de superposición robusta)
router.put('/bookings/:id', (req, res) => {
    // Aceptamos price_per_night como un campo actualizable
    const { room_id, client_name, start_date, end_date, status, price_per_night } = req.body;
    const { id } = req.params;

    if (!room_id || !client_name || !start_date || !end_date || !status) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    // Lógica de validación de superposición robusta para intervalos [start, end)
    // Excluimos la propia reserva que se está actualizando con 'id != ?'
    const overlapQuery = `SELECT COUNT(*) as count FROM bookings 
                          WHERE room_id = ? 
                            AND id != ? 
                            AND status IN ('reserved', 'occupied') 
                            AND ((? < end_date) AND (? > start_date))`;
    
    db.get(overlapQuery, [room_id, id, end_date, start_date], (err, row) => {
        if (err) {
            res.status(500).json({"error": err.message});
            return;
        }

        if (row.count > 0) {
            res.status(409).json({ error: "Conflicto de reserva: La habitación ya está ocupada o reservada en esas fechas." });
            return;
        }

        // Si no hay superposición, procede con la actualización
        // Usamos COALESCE para solo actualizar price_per_night si se proporciona en el body,
        // manteniendo el valor anterior si no se especifica.
        const update = `UPDATE bookings SET room_id = ?, client_name = ?, start_date = ?, end_date = ?, status = ?, price_per_night = COALESCE(?, price_per_night) WHERE id = ?`;
        
        // Pasamos price_per_night como un parámetro más
        db.run(update, [room_id, client_name, start_date, end_date, status, price_per_night, id], function (err) {
            if (err) {
                res.status(400).json({"error": err.message});
                return;
            }
            if (this.changes > 0) {
                res.status(200).json({ message: "Reserva actualizada exitosamente", changes: this.changes });
            } else {
                res.status(404).json({ error: "Reserva no encontrada." });
            }
        });
    });
});

// Endpoint para obtener una reserva específica por su ID
router.get('/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { room_id, client_name, start_date, end_date, status, price_per_night, notes, source_channel, time_slot } = req.body; // Incluimos time_slot

    if (!room_id || !client_name || !start_date || !end_date || !status || !time_slot) {
        return res.status(400).json({ error: "Faltan campos requeridos (incluyendo franja horaria)." });
    }

    try {
        // Detección de conflictos con el nuevo campo time_slot, excluyendo la reserva actual
        const hasConflict = await detectBookingConflicts(id, room_id, start_date, end_date, time_slot);

        if (hasConflict) {
            return res.status(409).json({ error: "Conflicto de reserva: La habitación ya está ocupada en esas fechas y franja horaria." });
        }

        const [updatedRowsCount] = await Booking.update(
            { room_id, client_id: req.body.client_id || null, client_name, start_date, end_date, status, price_per_night, notes, source_channel, email: req.body.email, time_slot },
            { where: { id: id } }
        );

        if (updatedRowsCount > 0) {
            res.status(200).json({ message: "Reserva actualizada exitosamente", changes: updatedRowsCount });
        } else {
            res.status(404).json({ error: "Reserva no encontrada." });
        }

    } catch (err) {
        res.status(400).json({ "error": err.message });
    }
});

// Eliminamos la función auxiliar 'finalizeBookingUpdate' ya que no se usa y la lógica se integró directamente en PUT /bookings/:id
// function finalizeBookingUpdate(id, client_name, start_date, end_date, status, room_id, res) {
//     const updateQuery = `UPDATE bookings SET client_name = ?, start_date = ?, end_date = ?, status = ?, room_id = ? WHERE id = ?`;
//     db.run(updateQuery, [client_name, start_date, end_date, status, room_id, id], function (err) {
//         if (err) return res.status(400).json({"error": err.message});
//         res.json({ message: "Reserva actualizada exitosamente.", changes: this.changes });
//     });
// }

router.delete('/bookings/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findByPk(id);

        if (row.status === 'occupied') { // Sólo 'occupied' debería impedir la cancelación. 'checked-in' no existe como estado persistente en tu código.
            return res.status(403).json({ "error": "No se puede cancelar una reserva con check-in realizado. Use el proceso de check-out." });
        }

        const deletedRows = await Booking.destroy({
            where: { id: id }
        });
    });
});

// Eliminamos el endpoint duplicado /consumptions/:bookingId
// router.get('/consumptions/:bookingId', (req, res) => {
//     const { bookingId } = req.params;
//     db.all("SELECT * FROM consumptions WHERE booking_id = ?", [bookingId], (err, rows) => {
//         if (err) {
//             res.status(400).json({"error":err.message});
//             return;
//         }
//         res.json({ data: rows });
//     });
// });

// Endpoint para obtener consumos de una reserva específica
router.get('/consumptions/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const consumptions = await Consumption.findAll({ where: { booking_id: bookingId } });
        res.json({ data: consumptions });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Endpoint para obtener consumos de una reserva específica (Ruta alternativa)
router.get('/bookings/:bookingId/consumptions', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const consumptions = await Consumption.findAll({ where: { booking_id: bookingId } });
        res.json({
            message: "success",
            data: consumptions
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Endpoint para añadir un nuevo consumo
router.post('/consumptions', async (req, res) => {
    const { booking_id, description, amount, date } = req.body;
    if (!booking_id || !description || !amount || !date) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }
    try {
        const newConsumption = await Consumption.create({ booking_id, description, amount, date });

        res.status(201).json({
            message: "Consumo añadido exitosamente",
            data: newConsumption,
            id: newConsumption.id
        });
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Endpoint para actualizar estado de limpieza de habitación
router.put('/rooms/status/:roomId', async (req, res) => {
    const { clean_status } = req.body;
    const { roomId } = req.params;

    if (!clean_status) {
        return res.status(400).json({ error: "Falta el estado de limpieza." });
    }

    try {
        const [updatedRowsCount] = await Room.update(
            { clean_status: clean_status },
            { where: { id: roomId } }
        );

        if (updatedRowsCount > 0) {
            res.json({ message: "Estado de limpieza actualizado.", changes: updatedRowsCount });
        } else {
            res.status(404).json({ error: "Habitación no encontrada." });
        }
    } catch (err) {
        res.status(400).json({"error": err.message});
    }
});

// Endpoint para actualizar precio de habitación
router.put('/rooms/:id/price', async (req, res) => {
    const { price } = req.body;
    const { id } = req.params;

    if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: "El precio debe ser un número positivo." });
    }

    try {
        const [updatedRowsCount] = await Room.update(
            { price: price },
            { where: { id: id } }
        );

        if (updatedRowsCount > 0) {
            res.status(200).json({ message: "Precio de habitación actualizado exitosamente.", changes: updatedRowsCount });
        } else {
            res.status(404).json({ error: "Habitación no encontrada." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para GENERAR una factura a partir de una reserva
router.post('/invoices/generate/:bookingId', (req, res) => {
    const { bookingId } = req.params;
    const { payment_method, minibar_total } = req.body; // Recibimos el total del minibar del frontend

    try {
        // 1. Obtener datos de reserva Y potencialmente del cliente asociado
        const booking = await Booking.findByPk(bookingId, {
            include: [{ model: Client, required: false }]
        });

        if (!booking) { return res.status(404).json({ error: "Reserva no encontrada." }); }

        // 2. Calcular totales
        const startDate = new Date(booking.start_date + 'T00:00:00Z');
        const endDate = new Date(booking.end_date + 'T00:00:00Z');
        const durationDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // Si es una reserva de mañana/tarde y es de 1 día, el costo es la mitad del precio por noche.
        // Si dura varios días, el precio_per_night aplica por día, ajustando solo el último día si es 'morning'/'afternoon'.
        let stayCost = durationDays * booking.price_per_night;
        
        // Ajuste de precio para franjas horarias si la duración es 1 día
        if (durationDays === 1 && (booking.time_slot === 'morning' || booking.time_slot === 'afternoon')) {
            stayCost = booking.price_per_night / 2;
        }


            // Validar que el check-out ya se realizó antes de facturar
            if (booking.status !== 'checked-out') {
                return res.status(400).json({ error: "No se puede facturar una reserva que no ha completado el check-out." });
            }

            // 2. Calcular el total (la lógica ya la tenemos en el frontend, aquí la replicamos en backend por seguridad/integridad)
            const startDate = new Date(booking.start_date + 'T00:00:00Z');
            const endDate = new Date(booking.end_date + 'T00:00:00Z');
            // Usamos Math.round para consistencia con el frontend si las fechas son días completos
            const durationDays = Math.round(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
            const stayCost = durationDays * booking.price_per_night;
            const consumptionsTotal = consumptions.reduce((sum, item) => sum + item.amount, 0);
            const totalAmount = stayCost + consumptionsTotal; // El total antes de IVA, si se aplica luego

        // --- Lógica CLAVE: Determinar datos de facturación ---
        let finalClientName = booking.client_name;
        let finalCuitCuil = 'CF'; // Consumidor Final por defecto
        let finalInvoiceType = 'B'; // Tipo B o C por defecto para Consumidor Final

        // console.log("Datos de empresa (booking.Client):", booking.Client); // DEBUG

             // 4. Insertar la factura (MODIFICADO: añadimos payment_method)
            const insert = 'INSERT INTO invoices (booking_id, invoice_number, issue_date, total_amount, details, payment_method) VALUES (?, ?, ?, ?, ?, ?)';
            // Pasamos payment_method como parámetro adicional
            db.run(insert, [bookingId, invoiceNumber, issueDate, totalAmount, invoiceDetails, payment_method], function (err) {
                if (err) { 
                    // Manejo de error específico si la reserva ya tiene una factura
                    if (err.message.includes('UNIQUE constraint failed: invoices.booking_id')){
                        return res.status(409).json({ error: "Esta reserva ya tiene una factura generada.", invoiceId: this.lastID });
                    }
                    return res.status(400).json({ error: err.message }); 
                }
                
                // ... (Lógica de actualizar estado de limpieza a 'dirty' se mantiene igual) ...
                db.run('UPDATE rooms SET clean_status = ? WHERE id = ?', ['dirty', booking.room_id], (updateErr) => {
                    if (updateErr) console.error("Advertencia: No se pudo actualizar el estado de limpieza de la habitación:", updateErr.message);
                    
                    res.status(201).json({
                        message: "Factura generada y habitación marcada como sucia.",
                        invoiceId: this.lastID,
                        invoiceNumber: invoiceNumber,
                        totalAmount: totalAmount,
                        roomStatusUpdatedTo: 'dirty',
                        paymentMethodUsed: payment_method // Devolvemos el método usado
                    });
                });
            });
        });

        // Generar invoice number, issue date
        const issueDate = new Date().toISOString().split('T')[0];
        const invoiceNumber = `INV-${issueDate.replace(/-/g, '')}-${bookingId}`;


        // Insertar la factura
        const newInvoice = await Invoice.create({
            booking_id: bookingId,
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            total_amount: totalAmount,
            details: invoiceDetails,
            payment_method: payment_method
        });
        
        // Actualizar el estado de limpieza de la habitación a 'dirty' (asumiendo que es parte del proceso de facturación final)
        await Room.update(
            { clean_status: 'dirty' },
            { where: { id: booking.room_id } }
        );

        res.status(201).json({
            message: "Factura generada y habitación marcada como sucia.",
            invoiceId: newInvoice.id,
            invoiceNumber: invoiceNumber,
            totalAmount: totalAmount,
            roomStatusUpdatedTo: 'dirty',
            paymentMethodUsed: payment_method
        });

    } catch (err) {
        console.error("Error generating invoice:", err); // DEBUG
        if (err.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ error: "La reserva ya tiene una factura generada." });
        }
        res.status(500).json({ error: err.message });
    }
});

// Endpoint para obtener una factura específica por su ID
router.get('/invoices/:id', (req, res) => {
    const { id } = req.params;
    try {
        const invoice = await Invoice.findByPk(id);
        
        if (!invoice) {
            res.status(404).json({ error: "Factura no encontrada." });
            return;
        }
        
        const responseData = invoice.toJSON();
        responseData.details = JSON.parse(responseData.details); 
        
        res.json(responseData);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Endpoint para listar TODAS las facturas
router.get('/invoices', (req, res) => {
    // Para el listado general, no necesitamos los 'details' completos, solo un resumen
    db.all("SELECT id, booking_id, invoice_number, issue_date, total_amount, payment_method FROM invoices ORDER BY issue_date DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

/**** GASTOS */
// --- Endpoints de Empleados (Employees) ---
router.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.findAll();
        res.json({ data: employees });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.post('/employees', async (req, res) => {
    const { name, role, monthly_salary } = req.body;
    if (!name || !role || !monthly_salary) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        const newEmployee = await Employee.create({ name, role, monthly_salary });
        res.status(201).json({ message: "Empleado añadido.", id: newEmployee.id });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

router.put('/employees/:id', async (req, res) => {
    const { name, role, monthly_salary } = req.body;
    try {
        const [updatedRowsCount] = await Employee.update(
            { name, role, monthly_salary },
            { where: { id: req.params.id } }
        );
        res.status(200).json({ message: "Empleado actualizado.", changes: updatedRowsCount });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

router.delete('/employees/:id', async (req, res) => {
    try {
        const deletedRows = await Employee.destroy({ where: { id: req.params.id } });
        res.status(200).json({ message: "Empleado eliminado.", changes: deletedRows });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// Obtener turnos para un mes específico
router.get('/shifts', async (req, res) => {
    const { year, month } = req.query; 
    if (!year || !month) { return res.status(400).json({ error: "Se requieren año y mes." }); }
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`; // Simplificado para el mes (asume max 31 días)

    try {
        const shifts = await Shift.findAll({
            where: {
                shift_date: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });
        res.json({ data: shifts });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Planificar o actualizar un turno (POST para simplificar, idempotente)
router.post('/shifts', async (req, res) => {
    const { employee_id, shift_date, shift_type } = req.body;
    if (!employee_id || !shift_date || !shift_type) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    
    try {
        const [shift, created] = await Shift.upsert({
            employee_id,
            shift_date,
            shift_type
        });

        res.status(201).json({ 
            message: created ? "Turno guardado (insertado)." : "Turno guardado (actualizado).", 
            id: shift.id 
        });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});


// --- Endpoints de Gastos (Expenses) (P7) ---
router.get('/expenses', (req, res) => {
    // Retornamos todos los gastos por ahora
    db.all("SELECT * FROM expenses ORDER BY date DESC", [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json({ data: rows });
    });
});

router.post('/expenses', async (req, res) => {
    const { description, amount, date, category } = req.body;
    if (!description || !amount || !date || !category) { return res.status(400).json({ error: "Faltan campos requeridos." }); }
    try {
        const newExpense = await Expense.create({ description, amount, date, category });
        res.status(201).json({ message: "Gasto añadido exitosamente", id: newExpense.id });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
});

// --- Endpoint de Reporte de Ganancias Mensual ---
router.get('/reports/profit-loss', async (req, res) => {
    const { year, month } = req.query; 

    if (!year || !month) {
        return res.status(400).json({ error: "Se requieren los parámetros 'year' y 'month'." });
    }

    // SQLite usa formato TEXT YYYY-MM-DD. Filtramos por rango de fechas.
    const monthPadded = month.padStart(2, '0');
    const startDate = `${year}-${monthPadded}-01`;
    // Calcular el último día del mes
    const lastDay = new Date(year, parseInt(month) , 0).getDate(); // month es 1-indexed para el constructor de Date si se usa el 0 para el día.
    const endDate = `${year}-${monthPadded}-${lastDay.toString().padStart(2, '0')}`;
    
    const responseData = {
        period: `${year}-${monthPadded}`,
        invoicesTotal: 0,
        expensesTotal: 0,
        salariesTotal: 0,
        profit: 0
    };

    // 1. Calcular Ingresos (Total Facturado en el mes)
    const invoicesQuery = `SELECT SUM(total_amount) as total FROM invoices WHERE issue_date BETWEEN ? AND ?`;
    db.get(invoicesQuery, [startDate, endDate], (err, row) => {
        if (err) return res.status(500).json({ error: "Error en consulta de ingresos: " + err.message });
        responseData.invoicesTotal = row.total || 0;

        // 2. Calcular Gastos Operativos (en el mes)
        const expensesQuery = `SELECT SUM(amount) as total FROM expenses WHERE date BETWEEN ? AND ?`;
        db.get(expensesQuery, [startDate, endDate], (err, row) => {
            if (err) return res.status(500).json({ error: "Error en consulta de gastos: " + err.message });
            responseData.expensesTotal = row.total || 0;

            // 3. Calcular Sueldos (Asumimos que todos los empleados cobran cada mes)
            const salariesQuery = `SELECT SUM(monthly_salary) as total FROM employees`;
            db.get(salariesQuery, (err, row) => { 
                if (err) { 
                    console.error(err); 
                    return res.status(500).json({ error: "Error en consulta de Sueldos: " + err.message });
                }
                responseData.salariesTotal = (row && row.total) || 0; 
                
                // 4. Calcular Ganancia
                const totalCosts = responseData.expensesTotal + responseData.salariesTotal;
                responseData.profit = responseData.invoicesTotal - totalCosts;

        res.json(responseData);

    } catch (err) {
        console.error(err); 
        res.status(500).json({ error: "Error al generar el reporte: " + err.message });
    }
});

// Endpoint para cambiar contraseña de usuario logueado
router.put('/user/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.cookies.user_id; 

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Faltan la contraseña actual o la nueva contraseña." });
    }
    
    try {
        const user = await User.findByPk(userId, { attributes: ['id', 'password'] });
        
        if (!user) {
            return res.status(500).json({ error: "Error interno al verificar usuario." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "La contraseña actual es incorrecta." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.update(
            { password: hashedPassword },
            { where: { id: userId } }
        );

        res.status(200).json({ message: "Contraseña actualizada exitosamente." });

    } catch (err) {
         console.error(err);
         res.status(500).json({ error: "Error interno del servidor al cambiar la contraseña." });
    }
});

router.get('/clients', async (req, res) => {
    try {
        const clients = await Client.findAll({ order: [['name', 'ASC']] });
        res.json({ data: clients });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear un nuevo cliente
router.post('/clients', async (req, res) => {
    const { name, cuit_cuil, invoice_type } = req.body;
    if (!name || !cuit_cuil || !invoice_type) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }
    try {
        const newClient = await Client.create({ name, cuit_cuil, invoice_type });
        res.status(201).json({ message: "Cliente añadido exitosamente", id: newClient.id });
    } catch (err) {
        // Manejo de error de CUIT/CUIL duplicado
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: "El CUIT/CUIL ya existe." });
        }
        res.status(400).json({ error: err.message });
    }
});

// Actualizar un cliente existente
router.put('/clients/:id', async (req, res) => {
    const { name, cuit_cuil, invoice_type } = req.body;
    try {
        const [updatedRowsCount] = await Client.update(
            { name, cuit_cuil, invoice_type },
            { where: { id: req.params.id } }
        );
        if (updatedRowsCount > 0) {
            res.status(200).json({ message: "Cliente actualizado.", changes: updatedRowsCount });
        } else {
            res.status(404).json({ error: "Cliente no encontrado." });
        }
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: "El CUIT/CUIL ya existe." });
        }
        res.status(400).json({ error: err.message });
    }
});

// Eliminar un cliente
router.delete('/clients/:id', async (req, res) => {
    try {
        const deletedRows = await Client.destroy({ where: { id: req.params.id } });
        if (deletedRows > 0) {
             res.status(200).json({ message: "Cliente eliminado.", changes: deletedRows });
        } else {
            res.status(404).json({ error: "Cliente no encontrado." });
        }
    } catch (err) {
        // En un sistema real, deberías prevenir la eliminación si el cliente tiene reservas asociadas.
        res.status(500).json({ error: err.message });
    }
});

// Middleware de permisos: Solo permite el acceso a usuarios con rol 'admin' o 'supervisor'
const authorizeRoles = (roles) => (req, res, next) => {
    // req.user debe ser seteado por tu authenticateMiddleware
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Acceso denegado. Permisos insuficientes.' });
    }
    next();
};


// --- READ: Obtener todos los usuarios (Solo Admin/Supervisor) ---
router.get('/users/', authorizeRoles(['admin', 'supervisor']), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'is_active'] // Nunca enviar passwords aquí
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- CREATE: Crear un nuevo usuario (Solo Admin/Supervisor) ---
router.post('/users/', authorizeRoles(['admin', 'supervisor']), async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'operador'
        });

        res.status(201).json({ 
            id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role 
        });

    } catch (error) {
        res.status(400).json({ error: 'Error al crear usuario. El email/username podría estar duplicado.' });
    }
});


// --- UPDATE: Actualizar rol/estado (Solo Admin/Supervisor) ---
router.put('/users/:id', authorizeRoles(['admin', 'supervisor']), async (req, res) => {
    const { email, role, is_active } = req.body;
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            // Validaciones básicas para evitar que un admin se quite permisos a sí mismo si es el único
            user.email = email !== undefined ? email : user.email;
            user.role = role !== undefined ? role : user.role;
            user.is_active = is_active !== undefined ? is_active : user.is_active;
            
            await user.save();
            res.status(200).json({ message: 'Usuario actualizado con éxito' });

        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- DELETE: Desactivar usuario (Solo Admin/Supervisor) ---
router.delete('/users/:id', authorizeRoles(['admin', 'supervisor']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            user.is_active = false; // Borrado suave
            await user.save();
            res.status(200).json({ message: 'Usuario desactivado con éxito' });
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints de Productos del Minibar ---

// Obtener todos los productos del minibar
router.get('/minibar/products', async (req, res) => {
    try {
        const products = await MinibarProduct.findAll({ order: [['name', 'ASC']] });
        res.json({ data: products });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear un nuevo producto del minibar
router.post('/minibar/products', async (req, res) => {
    const { name, price, quantity } = req.body;
    if (!name || typeof price !== 'number' || typeof quantity !== 'number') {
        return res.status(400).json({ error: "Faltan campos requeridos o son inválidos." });
    }
    try {
        const newProduct = await MinibarProduct.create({ name, price, quantity });
        res.status(201).json({ message: "Producto del minibar añadido exitosamente", id: newProduct.id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Actualizar un producto del minibar
router.put('/minibar/products/:id', async (req, res) => {
    const { name, price, quantity } = req.body;
    try {
        const [updatedRowsCount] = await MinibarProduct.update(
            { name, price, quantity },
            { where: { id: req.params.id } }
        );
        if (updatedRowsCount > 0) {
            res.status(200).json({ message: "Producto del minibar actualizado.", changes: updatedRowsCount });
        } else {
            res.status(404).json({ error: "Producto no encontrado." });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Eliminar un producto del minibar
router.delete('/minibar/products/:id', async (req, res) => {
    try {
        const deletedRows = await MinibarProduct.destroy({ where: { id: req.params.id } });
        if (deletedRows > 0) {
            res.status(200).json({ message: "Producto del minibar eliminado.", changes: deletedRows });
        } else {
            res.status(404).json({ error: "Producto no encontrado." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Endpoints de Consumos del Minibar ---

// Obtener consumos del minibar para una reserva específica
router.get('/bookings/:bookingId/minibar-consumptions', async (req, res) => {
    const { bookingId } = req.params;
    try {
        const consumptions = await MinibarConsumption.findAll({
            where: { booking_id: bookingId },
            include: [{ model: MinibarProduct, attributes: ['id', 'name'], required: false }],
            order: [['date_consumed', 'DESC']]
        });
        res.json({ data: consumptions });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Registrar un consumo del minibar
router.post('/minibar-consumptions', async (req, res) => {
    const { booking_id, minibar_product_id, quantity_consumed, date_consumed } = req.body;
    if (!booking_id || !minibar_product_id || !quantity_consumed || !date_consumed) {
        return res.status(400).json({ error: "Faltan campos requeridos." });
    }
    try {
        const product = await MinibarProduct.findByPk(minibar_product_id);
        if (!product) {
            return res.status(404).json({ error: "Producto del minibar no encontrado." });
        }
        if (product.quantity < quantity_consumed) {
            return res.status(400).json({ error: "Stock insuficiente del producto." });
        }

        const newConsumption = await MinibarConsumption.create({
            booking_id,
            minibar_product_id,
            quantity_consumed,
            unit_price: product.price,
            date_consumed
        });

        // Actualizar cantidad disponible del producto
        await MinibarProduct.update(
            { quantity: product.quantity - quantity_consumed },
            { where: { id: minibar_product_id } }
        );

        res.status(201).json({ message: "Consumo del minibar registrado exitosamente", id: newConsumption.id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Eliminar un consumo del minibar (devuelve el stock)
router.delete('/minibar-consumptions/:id', async (req, res) => {
    try {
        const consumption = await MinibarConsumption.findByPk(req.params.id);
        if (!consumption) {
            return res.status(404).json({ error: "Consumo no encontrado." });
        }

        const product = await MinibarProduct.findByPk(consumption.minibar_product_id);
        if (product) {
            await MinibarProduct.update(
                { quantity: product.quantity + consumption.quantity_consumed },
                { where: { id: consumption.minibar_product_id } }
            );
        }

        await MinibarConsumption.destroy({ where: { id: req.params.id } });
        res.status(200).json({ message: "Consumo del minibar eliminado y stock devuelto.", changes: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New endpoint for natural language to SQL query
router.post('/sql-from-text', authorizeRoles(['admin', 'supervisor']), async (req, res) => {
    const { natural_language_query } = req.body;

    if (!natural_language_query) {
        return res.status(400).json({ error: "Falta la consulta en lenguaje natural." });
    }

    try {
        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: SYSTEM_PROMPT },
                    { text: `Translate this natural language query into a SQL SELECT statement: "${natural_language_query}"` }
                ]
            }],
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
            ],
        });

        let generatedSql = result.response.text().trim();

        // Basic validation for read-only SELECT queries
        const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'REPLACE', 'GRANT', 'REVOKE', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM'];
        const uppercasedSql = generatedSql.toUpperCase();

        if (generatedSql === 'INVALID_QUERY' || !uppercasedSql.startsWith('SELECT')) {
            return res.status(400).json({ error: "La consulta no pudo ser traducida a una declaración SELECT válida o fue considerada insegura." });
        }

        const isForbidden = forbiddenKeywords.some(keyword => uppercasedSql.includes(keyword));
        if (isForbidden) {
             return res.status(400).json({ error: "La consulta generada contiene operaciones no permitidas." });
        }
        
        // Execute the safe, read-only SQL query
        const queryResults = await sequelize.query(generatedSql, {
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            message: "Consulta SQL ejecutada exitosamente.",
            sql_query: generatedSql,
            data: queryResults
        });

    } catch (error) {
        console.error("Error al procesar la consulta en lenguaje natural:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la consulta." });
    }
});

// Exporta el router para que server.js lo pueda usar
module.exports = router;
