// public/components/dashboard-menu.js (VERSIÓN DINÁMICA CON CONTROL DE ROLES)

class DashboardMenu extends HTMLElement {
    constructor() {
        super();
        this.userRole = this.getCurrentUserRole(); 
        this.shadow = this.attachShadow({ mode: 'open' });
        
        this.render(); // Llamamos a render() en el constructor para generar el HTML dinámico
    }

    getCurrentUserRole() {
        // Lee directamente de localStorage. Usamos 'operador' como fallback seguro.
        return localStorage.getItem('userRole') || 'operador'; 
    }

    // Función auxiliar para verificar si el rol del usuario tiene permiso
    userHasRequiredRole(requiredRoles) {
        return requiredRoles.includes(this.userRole);
    }
    
    render() {
        // --- 1. Definición de la estructura del menú y roles requeridos ---
        const menuConfig = [
            { href: '/dashboard', label: 'Dashboard', icon: '🏠', roles: ['admin', 'supervisor', 'operador', 'limpieza'] },
            { href: '/planner.html', label: 'Planificador Ocupación', icon: '📅', roles: ['admin', 'supervisor', 'operador', 'limpieza'] },
            { 
                label: 'Reportes', icon: '📊', roles: ['admin', 'supervisor'], 
                submenu: [
                    { href: '/reports.html', label: 'Ocupacion', roles: ['admin', 'supervisor'] },
                    // Solo Admin y Supervisor pueden ver Ganancias/Pérdidas
                    { href: '/profit-montly.html', label: 'Rentabilidad', roles: ['admin', 'supervisor'] },
                    { href: '/profit-montly-asoc.html', label: 'Rentabilidad de socios', roles: ['admin', 'supervisor'] },
                    { href: '/profit-montly-efectiv-asoc.html', label: 'Rentabilidad efectiva de socios', roles: ['admin', 'supervisor'] },
                    { href: '/profit-types.html', label: 'Conformacion de ingresos', roles: ['admin', 'supervisor'] },
                    { href: '/profit-loss.html', label: 'Ingresos/Egresos', roles: ['admin', 'supervisor'] },
                    { href: '/bills.html', label: 'Gastos', roles: ['admin', 'supervisor'] }
                ]
            },
            { href: '/housekeeping.html', label: 'Limpieza', icon: '🧹', roles: ['admin', 'supervisor', 'operador', 'limpieza' ] },
            { href: '/invoices.html', label: 'Facturación', icon: '🧾', roles: ['admin', 'supervisor', 'operador'] },
            { href: '/expenses.html', label: 'Gastos Operativos', icon: '💸', roles: ['admin', 'supervisor', 'operador'] },
            
            { 
                label: 'Configuración', icon: '⚙️', roles: ['admin', 'supervisor', 'operador', 'limpieza'], 
                submenu: [
                    { href: '/prices.html', label: 'Precios y Tarifas', roles: ['admin', 'supervisor'] },
                    { href: '/clients.html', label: 'Administrar Clientes', roles: ['admin', 'supervisor', 'operador'] },
                    { href: '/employees.html', label: 'Gestión Empleados', roles: ['admin', 'supervisor'] },
                    { href: '/minibar.html', label: 'Administrar Minibar', icon: '🛒', roles: ['admin', 'supervisor', 'operador'] }, // Nueva entrada del menú
                    // ESTA OPCIÓN ES SOLO PARA ADMINS:
                    { href: '/users-abm.html', label: 'Gestión Usuarios', roles: ['admin'] },
                    { href: '/shifts-planner.html', label: 'Planificador Turnos', roles: ['admin', 'supervisor', 'operador'] },
                    { href: '/settings-panel.html', label: 'Ajustes Cuenta', roles: ['admin', 'supervisor', 'operador', 'limpieza'] }
                ]
            }
        ];

        // --- 2. Función auxiliar para generar el HTML de los enlaces dinámicamente ---
        const generateLinkHtml = (item) => {
            // Si el usuario no tiene el rol necesario, no generamos HTML para este ítem
            if (!this.userHasRequiredRole(item.roles)) return '';

            let itemHtml = `<li class="menu-item ${item.submenu ? 'has-submenu' : ''}">
                <a href="${item.href || '#'}">
                    <span class="icon">${item.icon || ''}</span> ${item.label}
                </a>`;

            if (item.submenu) {
                // Generamos el HTML del submenú
                const submenuHtml = item.submenu.map(subItem => generateLinkHtml(subItem)).join('');
                if (submenuHtml) {
                    // Si el submenú tiene elementos visibles, lo incluimos
                    itemHtml += `<ul class="submenu">${submenuHtml}</ul>`;
                } else {
                    // Si el submenú está vacío (todos los items ocultos), ocultamos el padre también
                    return ''; 
                }
            }
            itemHtml += `</li>`;
            return itemHtml;
        };

        // Generamos todo el contenido de navegación
        const navHtml = menuConfig.map(generateLinkHtml).join('');


        // --- 3. Renderizado final en el Shadow DOM ---
        this.shadow.innerHTML = `
            <style>
                /* Pega todo tu CSS existente aquí, sin cambios */
                :host {
                    --primary-color: #0056b3; 
                    --secondary-color: #ff9800;
                    --text-color-light: white;
                    --menu-bg: #2C3E50;
                    --menu-hover-bg: #34495E;
                }

                .menu-container {
                    width: 220px; background-color: var(--menu-bg); color: var(--text-color-light); padding: 20px 0;
                    height: 100vh; display: flex; flex-direction: column; box-shadow: 2px 0 5px rgba(0,0,0,0.2);
                    position: fixed; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .logo { text-align: center; margin-bottom: 30px; font-size: 1.5em; font-weight: bold; color: var(--secondary-color); }
                nav ul { list-style: none; padding: 0; flex-grow: 1; }
                .menu-item a, .logout-btn { display: flex; align-items: center; padding: 12px 20px; text-decoration: none; color: var(--text-color-light); transition: background-color 0.3s; font-size: 0.9em; }
                .menu-item a:hover, .menu-item a.active { background-color: var(--menu-hover-bg); border-left: 4px solid var(--secondary-color); }
                .menu-item span.icon { margin-right: 10px; font-size: 1.1em; }
                .submenu { display: none; background-color: #34495E; padding-left: 30px; }
                .menu-item.expanded .submenu { display: block; }
                .menu-item.has-submenu > a::after { content: '▼'; margin-left: auto; font-size: 0.7em; transition: transform 0.2s; }
                .menu-item.expanded.has-submenu > a::after { transform: rotate(180deg); }
                .logout-section { padding: 10px 20px; }
                #logoutButton { background-color: #e74c3c; color: white; border: none; padding: 10px; width: 100%; cursor: pointer; border-radius: 4px; font-size: 0.9em; }
            </style>
            
            <div class="menu-container">
                <div class="logo">🏨 Hotel Admin (${this.userRole})</div>
                <nav>
                    <ul>
                        ${navHtml} <!-- Insertamos el HTML dinámico aquí -->
                    </ul>
                </nav>
                <div class="logout-section">
                    <button id="logoutButton">Cerrar Sesión</button>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        // Adjuntamos listeners después de que render() ha creado los elementos en el shadow DOM
        this.shadowRoot.getElementById('logoutButton').addEventListener('click', () => this.handleLogout());
        this.highlightActiveLink();
        this.setupSubMenus();
    }

    // handleLogout, highlightActiveLink, y setupSubMenus se mantienen igual que tu código original, 
    // solo asegúrate de que handleLogout borre localStorageItem('userRole') como te indiqué antes.
    
    handleLogout() {
        fetch('/api/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem('userRole'); // Limpia el rol al cerrar sesión
                window.location.href = '/'; 
            });
    }

    highlightActiveLink() {
        const links = this.shadowRoot.querySelectorAll('a');
        const currentPath = window.location.pathname;

        links.forEach(link => {
            if (currentPath.includes(link.getAttribute('href'))) {
                link.classList.add('active');
                const parentSubmenu = link.closest('.submenu');
                if (parentSubmenu) {
                    const parentItem = parentSubmenu.closest('.menu-item');
                    if (parentItem) {
                         parentItem.classList.add('expanded');
                    }
                }
            }
        });
    }

    setupSubMenus() {
        this.shadowRoot.querySelectorAll('.has-submenu > a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const parentItem = link.closest('.menu-item');
                parentItem.classList.toggle('expanded');
            });
        });
    }
}

customElements.define('dashboard-menu', DashboardMenu);
