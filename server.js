require('dotenv').config(); // Load environment variables at the very beginning
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const app = express();

const seedDatabase = require('./src/utils/seeder'); // Importamos el seeder
const { authenticateMiddleware, handleLogin, handleLogout } = require('./src/auth'); 
const apiRoutes = require('./src/routes/api'); 

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// --- Rutas de Autenticación (Login/Logout no usan el API router) ---
app.post('/api/login', handleLogin);
app.post('/api/logout', handleLogout);


// --- Rutas de Frontend (todas requieren autenticación excepto login) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.get('/planner.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planner.html'));
});
app.get('/reports.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});
app.get('/housekeeping.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'housekeeping.html'));
});
app.get('/invoices.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'invoices.html'));
});
app.get('/expenses.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'expenses.html'));
});
app.get('/prices.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'prices.html'));
});
app.get('/clients.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'clients.html'));
});
app.get('/employees.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'employees.html'));
});
app.get('/minibar.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'minibar.html'));
});
app.get('/shifts-planner.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shifts-planner.html'));
});
app.get('/settings-panel.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings-panel.html'));
});
app.get('/users-abm.html', authenticateMiddleware, (req, res) => { // Corregida la ruta
    res.sendFile(path.join(__dirname, 'public', 'users-abm.html'));
});
app.get('/invoice-detail.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'invoice-detail.html'));
});
app.get('/profit-loss-report.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profit-loss-report.html'));
});
// Rutas para reportes específicos (si se cargan como páginas separadas)
app.get('/reports/profit-montly.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'profit-montly.html'));
});
app.get('/reports/profit-montly-asoc.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'profit-montly-asoc.html'));
});
app.get('/reports/profit-montly-efectiv-asoc.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'profit-montly-efectiv-asoc.html'));
});
app.get('/reports/profit-types.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'profit-types.html'));
});
app.get('/reports/bills.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'bills.html'));
});
app.get('/reports/ia-report.html', authenticateMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports', 'ia-report.html'));
});

// ----------------------------------------
// Todas las rutas /api/* requieren autenticación
app.use('/api', authenticateMiddleware, apiRoutes);


// --- Iniciar DB y Servidor ---
seedDatabase().then(() => {
    console.log("Base de datos sincronizada y sembrada.");
    
    // --- CAMBIO CLAVE EN app.listen() ---
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
    // ------------------------------------

}).catch(err => {
    console.error("Error al iniciar la base de datos:", err);
});
