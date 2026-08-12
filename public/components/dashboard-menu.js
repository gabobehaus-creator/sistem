// public/components/dashboard-menu.js (VERSIÓN DINÁMICA CON CONTROL DE ROLES Y DISEÑO PREMIUM)

class DashboardMenu extends HTMLElement {
    constructor() {
        super();
        this.userRole = this.getCurrentUserRole(); 
        this.shadow = this.attachShadow({ mode: 'open' });
        this.render();
    }

    getCurrentUserRole() {
        const userRole = localStorage.getItem('userRole') || 'operador'; 
        console.log('DashboardMenu: Rol de usuario detectado:', userRole);
        return userRole;
    }

    userHasRequiredRole(requiredRoles) {
        return requiredRoles.includes(this.userRole);
    }
    
    getIconSvg(name) {
        const icons = {
            dashboard: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`,
            planner: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" /></svg>`,
            reports: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>`,
            housekeeping: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21m0 0-.813-5.096M9 21h3.375c.621 0 1.125-.504 1.125-1.125V14.25M9 21H5.625C5.004 21 4.5 20.496 4.5 19.875V14.25m12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m-3.478.562A2.25 2.25 0 0 1 16.5 12.75v-.186m4.022 1.498a2.25 2.25 0 0 0 1.352-1.767m-1.352 1.767c-.29.044-.58.085-.87.123m0 0a48.11 48.11 0 0 1-3.478.397m3.478-.52V12.75m-3.478.562A2.25 2.25 0 0 1 13.5 11.25v-.186m0 0A2.25 2.25 0 0 1 15.75 8.813t3.375-1.125M13.5 11.25a2.25 2.25 0 0 0 2.25 2.25h.186c.621 0 1.125-.504 1.125-1.125v-.186M13.5 11.25V8.813m0 2.437c-.34-.059-.68-.114-1.022-.165m0 0a48.11 48.11 0 0 0-3.478-.397m3.478.562A2.25 2.25 0 0 0 12 12.75v-.186m-4.022 1.498a2.25 2.25 0 0 1-1.352-1.767m1.352 1.767c.29.044.58.085.87.123m0 0a48.11 48.11 0 0 0 3.478.397m-3.478-.52V12.75m3.478.562A2.25 2.25 0 0 0 10.5 11.25v-.186m0 0A2.25 2.25 0 0 0 8.25 8.813t-3.375-1.125M10.5 11.25a2.25 2.25 0 0 1-2.25 2.25h-.186c-.621 0-1.125-.504-1.125-1.125v-.186M10.5 11.25V8.813M9 3.75c0 .621-.504 1.125-1.125 1.125H5.625A1.125 1.125 0 0 1 4.5 3.75V2.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V3.75Zm9 0c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V2.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V3.75Z" /></svg>`,
            invoices: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>`,
            expenses: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 11.25h18M5.25 12h13.5A2.25 2.25 0 0 0 21 9.75V5.625A2.25 2.25 0 0 0 18.75 3.5H5.25A2.25 2.25 0 0 0 3 5.625v4.125A2.25 2.25 0 0 0 5.25 12Z" /></svg>`,
            settings: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`,
            mobile: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18h9" /></svg>`
        };
        return icons[name] || '';
    }
    
    render() {
        const menuConfig = [
            { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['admin', 'supervisor', 'operador', 'limpieza'] },
            { href: '/planner.html', label: 'Planificador Ocupación', icon: 'planner', roles: ['admin', 'supervisor', 'operador', 'limpieza'] },
            { 
                label: 'Reportes', icon: 'reports', roles: ['admin', 'supervisor'], 
                submenu: [
                    { href: '/attendance-reports.html', label: 'Reportes de Asistencia', roles: ['admin'] },
                    { href: '/reports.html', label: 'Ocupación', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-montly.html', label: 'Rentabilidad', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-montly-asoc.html', label: 'Rentabilidad de socios', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-montly-efectiv-asoc.html', label: 'Rentabilidad efectiva de socios', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-types.html', label: 'Conformación de ingresos', roles: ['admin', 'supervisor'] },
                    { href: '/reports/profit-loss.html', label: 'Ingresos/Egresos', roles: ['admin', 'supervisor'] },
                    { href: '/reports/bills.html', label: 'Gastos', roles: ['admin', 'supervisor'] }
                ]
            },
            { href: '/housekeeping.html', label: 'Limpieza', icon: 'housekeeping', roles: ['admin', 'supervisor', 'operador', 'limpieza' ] },
            { href: '/invoices.html', label: 'Facturación', icon: 'invoices', roles: ['admin', 'supervisor', 'operador'] },
            { href: '/expenses.html', label: 'Gastos Operativos', icon: 'expenses', roles: ['admin', 'supervisor', 'operador'] },
            
            { 
                label: 'Configuración', icon: 'settings', roles: ['admin', 'supervisor', 'operador', 'limpieza'], 
                submenu: [
                    { href: '/prices.html', label: 'Precios y Tarifas', roles: ['admin', 'supervisor'] },
                    { href: '/clients.html', label: 'Administrar Clientes', roles: ['admin', 'supervisor', 'operador'] },
                    { href: '/employees.html', label: 'Gestión Empleados', roles: ['admin', 'supervisor'] },
                    { href: '/minibar.html', label: 'Administrar Minibar', roles: ['admin', 'supervisor', 'operador'] },
                    { href: '/users-abm.html', label: 'Gestión Usuarios', roles: ['admin'] },
                    { href: '/shifts-planner.html', label: 'Planificador Turnos', roles: ['admin', 'supervisor', 'operador'] },
                    { href: '/settings-panel.html', label: 'Ajustes Cuenta', roles: ['admin', 'supervisor', 'operador', 'limpieza'] }
                ]
            },
            { href: '/fichar.html', label: 'Mi Asistencia Móvil', icon: 'mobile', roles: ['admin', 'supervisor', 'operador', 'limpieza'], mobileOnly: false }
        ];

        const generateLinkHtml = (item) => {
            if (!this.userHasRequiredRole(item.roles)) return '';

            let linkClass = item.mobileOnly ? 'mobile-only-link' : '';
            const iconSvg = item.icon ? this.getIconSvg(item.icon) : '';

            let itemHtml = `<li class="menu-item ${item.submenu ? 'has-submenu' : ''} ${linkClass}">
                <a href="${item.href || '#'}">
                    ${iconSvg ? `<span class="icon">${iconSvg}</span>` : ''}
                    <span class="label-text">${item.label}</span>
                </a>`;

            if (item.submenu) {
                const submenuHtml = item.submenu.map(subItem => generateLinkHtml(subItem)).join('');
                if (submenuHtml) {
                    itemHtml += `<ul class="submenu">${submenuHtml}</ul>`;
                } else {
                    return ''; 
                }
            }
            itemHtml += `</li>`;
            return itemHtml;
        };

        const navHtml = menuConfig.map(generateLinkHtml).join('');

        this.shadow.innerHTML = `
            <style>
                :host {
                    --bg-sidebar: #0f172a;
                    --bg-sidebar-hover: #1e293b;
                    --bg-active: #1e293b;
                    --text-primary: #f8fafc;
                    --text-secondary: #94a3b8;
                    --accent-color: #3b82f6;
                    --border-color: #1e293b;
                    display: block;
                }

                .menu-container {
                    width: 260px;
                    background-color: var(--bg-sidebar);
                    color: var(--text-primary);
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    top: 0;
                    left: 0;
                    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
                    font-family: 'Inter', sans-serif;
                    border-right: 1px solid var(--border-color);
                    z-index: 100;
                }

                /* Header de la barra lateral */
                .logo-area {
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid var(--border-color);
                }

                .logo-icon {
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.2rem;
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .logo-text {
                    font-weight: 700;
                    font-size: 1.1rem;
                    letter-spacing: -0.02em;
                    background: linear-gradient(to right, #ffffff, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                /* Navegación */
                nav {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 20px 12px;
                }

                nav::-webkit-scrollbar {
                    width: 4px;
                }
                nav::-webkit-scrollbar-thumb {
                    background: var(--border-color);
                    border-radius: 2px;
                }

                ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .menu-item a {
                    display: flex;
                    align-items: center;
                    padding: 10px 16px;
                    text-decoration: none;
                    color: var(--text-secondary);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    gap: 12px;
                }

                .menu-item a:hover {
                    background-color: var(--bg-sidebar-hover);
                    color: var(--text-primary);
                }

                .menu-item a.active {
                    background-color: var(--bg-active);
                    color: var(--text-primary);
                    font-weight: 600;
                    border-left: 3px solid var(--accent-color);
                    border-top-left-radius: 0;
                    border-bottom-left-radius: 0;
                }

                .menu-item span.icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    color: inherit;
                }

                .menu-item span.icon svg {
                    width: 20px;
                    height: 20px;
                }

                /* Submenús */
                .submenu {
                    display: none;
                    padding-left: 32px;
                    margin-top: 4px;
                    margin-bottom: 4px;
                    border-left: 1px solid var(--border-color);
                    margin-left: 24px;
                }

                .menu-item.expanded .submenu {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .submenu .menu-item a {
                    padding: 8px 12px;
                    font-size: 0.85rem;
                }

                .menu-item.has-submenu > a::after {
                    content: '';
                    margin-left: auto;
                    width: 12px;
                    height: 12px;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2.5' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
                    background-size: contain;
                    background-repeat: no-repeat;
                    transition: transform 0.2s ease;
                }

                .menu-item.expanded.has-submenu > a::after {
                    transform: rotate(180deg);
                }

                /* Footer de Perfil de Usuario */
                .user-profile-footer {
                    padding: 16px;
                    border-top: 1px solid var(--border-color);
                    background-color: rgba(15, 23, 42, 0.6);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    background-color: var(--bg-sidebar-hover);
                    border: 2px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: var(--accent-color);
                    font-size: 0.9rem;
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    flex-grow: 1;
                    min-width: 0;
                }

                .username {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .role-badge {
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: var(--accent-color);
                    background-color: rgba(59, 130, 246, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    width: fit-content;
                    text-transform: uppercase;
                }

                .logout-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .logout-btn:hover {
                    background-color: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                .logout-btn svg {
                    width: 18px;
                    height: 18px;
                }

                .mobile-menu-toggle {
                    display: none;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .menu-container {
                        width: 100%;
                        height: 64px;
                        position: relative;
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0 16px;
                        box-sizing: border-box;
                        border-bottom: 1px solid var(--border-color);
                    }

                    .logo-area {
                        padding: 0;
                        border-bottom: none;
                    }

                    .mobile-menu-toggle {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: none;
                        border: none;
                        color: var(--text-primary);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 8px;
                    }

                    nav {
                        display: none;
                        position: absolute;
                        top: 64px;
                        left: 0;
                        width: 100%;
                        background-color: var(--bg-sidebar);
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                        box-sizing: border-box;
                        max-height: calc(100vh - 64px);
                    }

                    .menu-container.mobile-expanded nav {
                        display: block;
                    }

                    .user-profile-footer {
                        display: none;
                    }

                    .menu-container.mobile-expanded .user-profile-footer {
                        display: flex;
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        box-sizing: border-box;
                    }
                }
            </style>
            
            <div class="menu-container">
                <div class="logo-area">
                    <div class="logo-icon">H</div>
                    <div class="logo-text">Hotel Admin</div>
                </div>
                
                <button class="mobile-menu-toggle" aria-label="Abrir menú">☰</button>
                
                <nav>
                    <ul>
                        ${navHtml}
                    </ul>
                </nav>

                <div class="user-profile-footer">
                    <div class="avatar">${this.userRole.substring(0, 2).toUpperCase()}</div>
                    <div class="user-info">
                        <span class="username">Usuario Activo</span>
                        <span class="role-badge">${this.userRole}</span>
                    </div>
                    <button class="logout-btn" id="logoutButton" title="Cerrar Sesión">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.shadowRoot.getElementById('logoutButton').addEventListener('click', () => this.handleLogout());
        this.highlightActiveLink();
        this.setupSubMenus();
        this.setupMobileMenuToggle();
    }
    
    handleLogout() {
        fetch('/api/logout', { method: 'POST' })
            .then(() => {
                localStorage.removeItem('userRole');
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

        toggleButton.addEventListener('click', () => {
            menuContainer.classList.toggle('mobile-expanded');
        });

        navElement.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    menuContainer.classList.remove('mobile-expanded');
                }
            });
        });
    }
}

customElements.define('dashboard-menu', DashboardMenu);
