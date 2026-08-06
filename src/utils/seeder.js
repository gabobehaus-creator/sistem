// src/utils/seeder.js
const bcrypt = require('bcrypt');
const { Room, User, Employee, Client, MinibarProduct, sequelize } = require('../models');

async function seedDatabase() {
    // Usamos { alter: true } en desarrollo para actualizar el esquema sin perder datos
    await sequelize.sync({ alter: true }); 

    // Seed Rooms
    const roomCount = await Room.count();
    if (roomCount === 0) {
         const roomsData = [
            { name: 'BeH101', category: 'executive', price: 80.00 }, 
            { name: 'BeH103', category: 'executive', price: 120.00 }, 
            { name: 'BeH201', category: 'executive', price: 250.00 }, 
            { name: 'BeH203', category: 'executive', price: 85.00 }, 
            { name: 'BeH301', category: 'executive', price: 130.00 }, 
            { name: 'BeH303', category: 'executive', price: 180.00 }, 
            { name: 'BeH401', category: 'executive', price: 400.00 },
            { name: 'BeH102', category: 'studio', price: 80.00 }, 
            { name: 'BeH104', category: 'studio', price: 120.00 }, 
            { name: 'BeH204', category: 'studio', price: 250.00 }, 
            { name: 'BeH202', category: 'studio', price: 85.00 }, 
            { name: 'BeH302', category: 'studio', price: 130.00 }, 
            { name: 'BeH304', category: 'studio', price: 180.00 }, 
            { name: 'BeH402', category: 'studio', price: 400.00 },
            { name: 'BeH403', category: 'loft', price: 80.00 }, 
            { name: 'De6-5D', category: 'studio', price: 120.00 }, 
            { name: 'De6-6D', category: 'studio', price: 250.00 }, 
            { name: 'De6-6C', category: 'executive', price: 85.00 }, 
            { name: 'De6-7C', category: 'executive', price: 130.00 }, 
            { name: 'De6-7E', category: 'executive', price: 180.00 }, 
            { name: 'De6-11E', category: 'executive', price: 400.00 },
            { name: 'De4-9D', category: 'executive', price: 80.00 }, 
            { name: 'De4-10D', category: 'executive', price: 120.00 }, 
            { name: 'Mi3-1B', category: 'family', price: 250.00 } 
        ];
        await Room.bulkCreate(roomsData);
        console.log("Habitaciones iniciales con precios insertadas.");
    }

    // Seed Users
    // await User.truncate(); // Solo usar si se quiere borrar y recrear usuarios en cada `seed`
    const userCount = await User.count();
    if (userCount === 0) {
        const passwordTextoPlano = 'Behaus2026';
        const hashedPassword = await bcrypt.hash(passwordTextoPlano, 10);
        await User.bulkCreate([
            { username: 'gustavo.funcia@behaus.com', email: 'gustavo.funcia@behaus.com', password: hashedPassword, role: 'admin' },
            { username: 'gabriel.fernandez@behaus.com', email: 'gabriel.fernandez@behaus.com', password: hashedPassword, role: 'admin' },
            { username: 'nicolas.perone@behaus.com', email: 'nicolas.perone@behaus.com', password: hashedPassword, role: 'operador' },
            { username: 'ariel.jofre@behaus.com', email: 'ariel.jofre@behaus.com', password: hashedPassword, role: 'operador' },
            { username: 'martin.guzman@behaus.com', email: 'martin.guzman@behaus.com', password: hashedPassword, role: 'operador' },
            { username: 'jose.basconcelo@behaus.com', email: 'jose.basconcelo@behaus.com', password: hashedPassword, role: 'operador' },
            { username: 'giselle.moreno@behaus.com', email: 'giselle.moreno@behaus.com', password: hashedPassword, role: 'limpieza' },
            { username: 'dalma.orozco@behaus.com', email: 'dalma.orozco@behaus.com', password: hashedPassword, role: 'limpieza' },
            { username: 'micaela.cabrera@behaus.com', email: 'micaela.cabrera@behaus.com', password: hashedPassword, role: 'limpieza' }          
            
        ]);
        console.log("Usuarios iniciales insertados.");
    }

    // Seed Employees
    const employeeCount = await Employee.count();
    if (employeeCount === 0) {
        await Employee.bulkCreate([
            { name: 'Juan Perez', role: 'Gerente', monthly_salary: 8000.00 },
            { name: 'Maria Garcia', role: 'Recepcionista', monthly_salary: 4500.00 }
        ]);
        console.log("Empleados iniciales insertados.");
    }

    // Seed Clients (Companies)
    const clientCount = await Client.count();
    if (clientCount === 0) {
        await Client.bulkCreate([
            { name: 'Tech Solutions S.A.', cuit_cuil: '30-71234567-8', invoice_type: 'A' },
            { name: 'Global Travel SRL', cuit_cuil: '20-56789012-3', invoice_type: 'B' },
            { name: 'Viajes Locos LTDA.', cuit_cuil: '33-98765432-1', invoice_type: 'T' }
        ]);
        console.log("Clientes iniciales insertados.");
    }

    // Seed Minibar Products
    const minibarProductCount = await MinibarProduct.count();
    if (minibarProductCount === 0) {
        await MinibarProduct.bulkCreate([
            { name: 'Agua Mineral', price: 1.50, quantity: 50 },
            { name: 'Coca Cola', price: 2.00, quantity: 40 },
            { name: 'Cerveza Patagonia', price: 3.50, quantity: 30 },
            { name: 'Chocolate Milka', price: 2.50, quantity: 25 }
        ]);
        console.log("Productos de minibar iniciales insertados.");
    }

   console.log("Seed function finished execution.");
}

module.exports = seedDatabase;
