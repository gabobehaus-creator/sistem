// src/auth.js
// const db = require('./database'); // ELIMINAR
const bcrypt = require('bcrypt'); 
const { User } = require('./models'); // USAMOS EL MODELO

// Middleware de Autenticación (Este middleware de cookies no cambia, sigue igual)
async function authenticateMiddleware(req, res, next) {
    if (req.cookies && req.cookies.user_id) {
        try {
            const user = await User.findByPk(req.cookies.user_id, { attributes: ['id', 'username', 'role'] });
            if (user) {
                req.user = user; // Attach user object to request
                // Clear any pending redirect cookie if the user is now authenticated
                if (req.cookies.post_login_redirect) {
                    res.clearCookie('post_login_redirect');
                }
                next();
            } else {
                res.clearCookie('user_id'); // Clear invalid cookie
                // If not authenticated (invalid cookie), handle redirection based on request type
                if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                    return res.status(401).json({ message: 'Unauthorized: Please log in.' });
                } else {
                    // For direct page access, store original URL and redirect to login
                    if (req.originalUrl && req.originalUrl !== '/') {
                        res.cookie('post_login_redirect', req.originalUrl, { httpOnly: true, maxAge: 1000 * 60 * 5 }); // Valid for 5 minutes
                    }
                    res.redirect('/');
                }
            }
        } catch (error) {
            console.error("Error authenticating user:", error);
            res.clearCookie('user_id');
            // If error during auth, handle redirection based on request type
            if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
                return res.status(401).json({ message: 'Unauthorized: Please log in.' });
            } else {
                if (req.originalUrl && req.originalUrl !== '/') {
                    res.cookie('post_login_redirect', req.originalUrl, { httpOnly: true, maxAge: 1000 * 60 * 5 }); // Valid for 5 minutes
                }
                res.redirect('/');
            }
        }
    } else {
        // No user_id cookie. Not authenticated.
        if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
            return res.status(401).json({ message: 'Unauthorized: Please log in.' });
        } else {
            if (req.originalUrl && req.originalUrl !== '/') {
                res.cookie('post_login_redirect', req.originalUrl, { httpOnly: true, maxAge: 1000 * 60 * 5 }); // Valid for 5 minutes
            }
            res.redirect('/');
        }
    }
}

// Lógica de Login (MODIFICADA A ASYNC/AWAIT CON SEQUELIZE)
async function handleLogin(req, res) {
    const { username, password } = req.body;
    
    try {
        // 1. Buscamos el usuario usando el modelo Sequelize
        const user = await User.findOne({ where: { username } });

        if (user) {
            // 2. Comparamos la contraseña ingresada con el hash almacenado
            const result = await bcrypt.compare(password, user.password);
            
            if (result) {
                // Contraseña correcta
                res.cookie('user_id', user.id, { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 });

                let redirectTo = '/dashboard.html'; // Default redirect path after login

                // Prioritize redirect_to from POST body (e.g., from login form passing a query param)
                if (req.body.redirect_to) {
                    redirectTo = req.body.redirect_to;
                } else if (req.cookies.post_login_redirect) {
                    // Fallback to post_login_redirect cookie set by authenticateMiddleware for direct page access
                    redirectTo = req.cookies.post_login_redirect;
                    res.clearCookie('post_login_redirect'); // Clear the temporary cookie
                }

                // Perform a server-side redirect
                // This will change the API contract of /api/login from returning JSON to performing a redirect.
                return res.redirect(redirectTo);
            } else {
                // Contraseña incorrecta
                res.status(401).json({ error: "Usuario o contraseña incorrectos" });
            }
        } else {
            // Usuario no encontrado
            res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

function handleLogout(req, res) {
    res.clearCookie('user_id');
    res.status(200).json({ message: "Sesión cerrada exitosamente" });
}

module.exports = {
    authenticateMiddleware,
    handleLogin,
    handleLogout
};
