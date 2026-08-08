// public/components/dashboard-menu.js (VERSIÓN DINÁMICA CON CONTROL DE ROLES)

class DashboardMenu extends HTMLElement {
    constructor() {
        super();
        this.userRole = this.getCurrentUserRole(); 
        this.shadow = this.attachShadow({ mode: 'open' });
        
        this.render(); // Llamamos a render() en el constructor para generar el HTML dinámico
    }

    getCurrentUserRole() {
        const userRole = localStorage.getItem('userRole') || 'operador'; 
        console.log('DashboardMenu: Rol de usuario detectado:', userRole); // LOG DE DEPURACIÓN
        return userRole;
    }

    // Función auxiliar para verificar si el rol del usuario tiene permiso
    userHasRequiredRole(requiredRoles) {
        const hasRole = requiredRoles.includes(this.userRole);
        // console.log(`DashboardMenu: Comprobando si el rol '${this.userRole}' está en [${requiredRoles.join(', ')}]: ${hasRole}`); // LOG DE DEPURACIÓN (puede ser muy ruidoso)
        return hasRole;
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
                    { href: '/reports/profit-montly.html', label: 'Rentabilidad', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-montly-asoc.html', label: 'Rentabilidad de socios', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-montly-efectiv-asoc.html', label: 'Rentabilidad efectiva de socios', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-types.html', label: 'Conformacion de ingresos', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-loss.html', label: 'Ingresos/Egresos', roles: ['admin', 'supervisor'] },
                    { href: '/reports/bills.html', label: 'Gastos', roles: ['admin', 'supervisor'] }
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

                /* Estilos para el enlace móvil-only */
                .mobile-only-link {
                    display: none; /* Oculto por defecto en escritorio */
                }

                @media (max-width: 768px) {
                    .mobile-only-link {
                        display: block; /* Visible en móvil */
                    }
                    /* Estilos para el menú en móviles */
                    .menu-container {
                        width: 100%;
                        height: auto;
                        position: relative;
                        box-shadow: none;
                        padding: 0;
                        flex-direction: row; /* Horizontal layout for header on mobile */
                        justify-content: space-between;
                        align-items: center;
                    }
                    .logo {
                        flex-grow: 1;
                        text-align: left;
                        padding-left: 20px;
                        margin-bottom: 0;
                    }
                    nav {
                        display: none; /* Ocultar nav por defecto en móvil */
                        width: 100%;
                        position: absolute;
                        top: 100%; /* Debajo del logo/toggle */
                        left: 0;
                        background-color: var(--menu-bg);
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        z-index: 1000; /* Asegurarse de que esté por encima de otros contenidos */
                    }
                    .menu-container.mobile-expanded nav {
                        display: flex;
                        flex-direction: column;
                    }
                    nav ul {
                        width: 100%;
                        padding: 0;
                    }
                    .menu-item a {
                        border-left: none; /* Eliminar borde activo en móvil por defecto */
                        text-align: center;
                        justify-content: center;
                    }
                    .mobile-menu-toggle {
                        display: block !important; /* Asegurar que el botón se muestre */
                        padding: 10px 20px;
                        font-size: 1.5em;
                        cursor: pointer;
                        color: var(--text-color-light);
                    }
                    .logout-section {
                        display: none; /* Ocultar logout por defecto en móvil */
                    }
                    .menu-container.mobile-expanded .logout-section {
                        display: block; /* Mostrar logout cuando el menú está expandido */
                        width: 100%;
                        position: absolute;
                        /* Ajusta el 'top' dinámicamente o con calc() si es posible, o usa flexbox */
                        top: calc(100% + var(--nav-height, 0px)); 
                        left: 0;
                        background-color: var(--menu-bg);
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        padding-top: 0;
                        padding-bottom: 20px;
                        z-index: 1000;
                    }
                }
            </style>
            
            <div class="menu-container">
                <div class="logo">🏨 Hotel Admin (${this.userRole})</div>
                <div class="mobile-menu-toggle">☰</div> <!-- Botón para menú móvil -->
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
        this.setupMobileMenuToggle(); // Nuevo setup para el toggle móvil
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

    setupMobileMenuToggle() {
        const toggleButton = this.shadowRoot.querySelector('.mobile-menu-toggle');
        const menuContainer = this.shadowRoot.querySelector('.menu-container');
        const navElement = this.shadowRoot.querySelector('nav');
        const logoutSection = this.shadowRoot.querySelector('.logout-section');

        toggleButton.addEventListener('click', () => {
            menuContainer.classList.toggle('mobile-expanded');
            // Calcula y setea la altura de la navegación para el posicionamiento del logout-section
            if (menuContainer.classList.contains('mobile-expanded')) {
                const navHeight = navElement.offsetHeight;
                logoutSection.style.top = `calc(100% + ${navHeight}px)`;
            }
        });

        // Cierra el menú si se hace clic en un enlace (solo para móvil)
        navElement.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) { // Considera "móvil" si el ancho es menor o igual a 768px
                    menuContainer.classList.remove('mobile-expanded');
                }
            });
        });
    }
}

customElements.define('dashboard-menu', DashboardMenu);
