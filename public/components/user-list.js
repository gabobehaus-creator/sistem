// public/components/user-list.js

class UserList extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
        this.searchTerm = '';
    }

    static get observedAttributes() {
        return ['users-data'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'users-data') {
            try {
                this.users = JSON.parse(newValue) || [];
            } catch (e) {
                this.users = [];
            }
            this.render();
        }
    }

    render() {
        const filteredUsers = this.users.filter(user => {
            const term = this.searchTerm.toLowerCase();
            return (user.username && user.username.toLowerCase().includes(term)) ||
                   (user.email && user.email.toLowerCase().includes(term)) ||
                   (user.role && user.role.toLowerCase().includes(term));
        });

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
                    overflow: hidden;
                }

                .toolbar {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                }

                .search-box {
                    position: relative;
                    width: 100%;
                    max-width: 320px;
                }

                .search-box input {
                    width: 100%;
                    padding: 8px 12px 8px 36px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }

                .search-box input:focus {
                    border-color: #2563eb;
                }

                .search-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    pointer-events: none;
                }

                .table-container {
                    overflow-x: auto;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 14px;
                }

                th {
                    background-color: #f8fafc;
                    color: #64748b;
                    font-weight: 600;
                    padding: 12px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }

                td {
                    padding: 14px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                    vertical-align: middle;
                }

                tr:last-child td {
                    border-bottom: none;
                }

                tr:hover td {
                    background-color: #f8fafc;
                }

                .user-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #e0e7ff;
                    color: #4338ca;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 14px;
                    text-transform: uppercase;
                }

                .username {
                    font-weight: 600;
                    color: #0f172a;
                }

                .badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 3px 10px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .badge-admin {
                    background-color: #eff6ff;
                    color: #1d4ed8;
                }

                .badge-supervisor {
                    background-color: #f0fdf4;
                    color: #15803d;
                }

                .badge-operador {
                    background-color: #f8fafc;
                    color: #475569;
                    border: 1px solid #e2e8f0;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 500;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .status-active .status-dot {
                    background-color: #16a34a;
                }

                .status-inactive .status-dot {
                    background-color: #94a3b8;
                }

                .actions-cell {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }

                .btn-icon {
                    background: transparent;
                    border: 1px solid #cbd5e1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    color: #475569;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                }

                .btn-icon:hover {
                    background-color: #f1f5f9;
                    color: #0f172a;
                }

                .btn-icon-danger:hover {
                    background-color: #fef2f2;
                    color: #dc2626;
                    border-color: #fecaca;
                }

                .empty-state {
                    padding: 40px;
                    text-align: center;
                    color: #64748b;
                }
            </style>

            <div class="card">
                <div class="toolbar">
                    <div class="search-box">
                        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="searchInput" placeholder="Buscar por usuario, email o rol..." value="${this.searchTerm}">
                    </div>
                </div>

                <div class="table-container">
                    ${filteredUsers.length === 0 ? `
                        <div class="empty-state">No se encontraron usuarios.</div>
                    ` : `
                        <table>
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th style="text-align: right;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredUsers.map(user => `
                                    <tr>
                                        <td>
                                            <div class="user-cell">
                                                <div class="avatar">${(user.username || 'U').substring(0, 2)}</div>
                                                <div class="username">${user.username}</div>
                                            </div>
                                        </td>
                                        <td>${user.email || '<span style="color: #94a3b8;">Sin email</span>'}</td>
                                        <td>
                                            <span class="badge badge-${user.role || 'operador'}">
                                                ${user.role || 'operador'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">
                                                <span class="status-dot"></span>
                                                ${user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="actions-cell">
                                                <button class="btn-icon btn-edit" data-user='${JSON.stringify(user).replace(/'/g, "&apos;")}'>
                                                    Editar
                                                </button>
                                                <button class="btn-icon btn-icon-danger btn-delete" data-user='${JSON.stringify(user).replace(/'/g, "&apos;")}'>
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;

        const searchInput = this.shadowRoot.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.render();
            });
        }

        this.shadowRoot.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', () => {
                const user = JSON.parse(button.getAttribute('data-user'));
                this.dispatchEvent(new CustomEvent('edit-user', { detail: user, bubbles: true, composed: true }));
            });
        });

        this.shadowRoot.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', () => {
                const user = JSON.parse(button.getAttribute('data-user'));
                this.dispatchEvent(new CustomEvent('delete-user', { detail: user, bubbles: true, composed: true }));
            });
        });
    }
}

customElements.define('user-list', UserList);
