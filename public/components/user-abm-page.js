// public/components/user-abm-page.js
import './user-list.js';
import './user-form.js';

class UserAbmPage extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.users = [];
        this.editingUser = null;
        this.isFormOpen = false;
        this.userToDelete = null;
    }

    connectedCallback() {
        this.render();
        this.fetchUsers();

        this.shadowRoot.addEventListener('open-create-form', () => this.openForm(null));
        this.shadowRoot.addEventListener('edit-user', (event) => this.openForm(event.detail));
        this.shadowRoot.addEventListener('delete-user', (event) => this.confirmDelete(event.detail));
        this.shadowRoot.addEventListener('user-saved', () => this.handleUserSaved());
        this.shadowRoot.addEventListener('cancel-form', () => this.closeForm());
    }

    async fetchUsers() {
        try {
            const response = await fetch('/api/users');
            if (response.status === 401) {
                window.location.href = '/';
                return;
            }
            if (response.ok) {
                this.users = await response.json();
                this.render();
            } else {
                console.error('Error fetching users:', await response.json());
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    openForm(user = null) {
        this.editingUser = user;
        this.isFormOpen = true;
        this.render();
    }

    closeForm() {
        this.editingUser = null;
        this.isFormOpen = false;
        this.render();
    }

    handleUserSaved() {
        this.closeForm();
        this.fetchUsers();
    }

    confirmDelete(user) {
        this.userToDelete = user;
        this.render();
    }

    cancelDelete() {
        this.userToDelete = null;
        this.render();
    }

    async executeDelete() {
        if (!this.userToDelete) return;
        
        try {
            const response = await fetch(`/api/users/${this.userToDelete.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.userToDelete = null;
                this.fetchUsers();
            } else {
                const data = await response.json();
                alert(`Error al eliminar usuario: ${data.error || data.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error de conexión al intentar eliminar el usuario.');
        }
    }

    render() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(u => u.is_active).length;
        const adminUsers = this.users.filter(u => u.role === 'admin').length;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #1e293b;
                    background-color: #f8fafc;
                    min-height: 100vh;
                    box-sizing: border-box;
                }

                * {
                    box-sizing: border-box;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 32px 24px;
                }

                /* Header section */
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .title-area h1 {
                    font-size: 26px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.02em;
                }

                .title-area p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                }

                .btn-primary {
                    background-color: #2563eb;
                    color: #ffffff;
                    border: none;
                    padding: 10px 18px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
                }

                .btn-primary:hover {
                    background-color: #1d4ed8;
                    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
                }

                /* Metric cards */
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 16px;
                    margin-bottom: 28px;
                }

                .metric-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
                }

                .metric-card .label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #64748b;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .metric-card .value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1;
                }

                /* Modal styling */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.55);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 16px;
                    animation: fadeIn 0.2s ease-out;
                }

                .modal-content {
                    background: #ffffff;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 520px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    animation: slideUp 0.2s ease-out;
                }

                .delete-modal {
                    max-width: 440px;
                    padding: 24px;
                }

                .delete-modal h3 {
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    color: #0f172a;
                }

                .delete-modal p {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0 0 24px 0;
                    line-height: 1.5;
                }

                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }

                .btn-secondary {
                    background-color: #f1f5f9;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    padding: 9px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .btn-secondary:hover {
                    background-color: #e2e8f0;
                }

                .btn-danger {
                    background-color: #dc2626;
                    color: #ffffff;
                    border: none;
                    padding: 9px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .btn-danger:hover {
                    background-color: #b91c1c;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>

            <div class="container">
                <div class="header-container">
                    <div class="title-area">
                        <h1>Gestión de Usuarios y Roles</h1>
                        <p>Administre el acceso, credenciales y permisos del personal de la plataforma.</p>
                    </div>
                    <button class="btn-primary" id="btnCreate">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Nuevo Usuario
                    </button>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="label">Total Usuarios</div>
                        <div class="value">${totalUsers}</div>
                    </div>
                    <div class="metric-card">
                        <div class="label">Usuarios Activos</div>
                        <div class="value" style="color: #16a34a;">${activeUsers}</div>
                    </div>
                    <div class="metric-card">
                        <div class="label">Administradores</div>
                        <div class="value" style="color: #2563eb;">${adminUsers}</div>
                    </div>
                </div>

                <user-list users-data='${JSON.stringify(this.users).replace(/'/g, "&apos;")}'></user-list>

                ${this.isFormOpen ? `
                    <div class="modal-overlay">
                        <div class="modal-content">
                            <user-form user-data='${JSON.stringify(this.editingUser).replace(/'/g, "&apos;")}'></user-form>
                        </div>
                    </div>
                ` : ''}

                ${this.userToDelete ? `
                    <div class="modal-overlay">
                        <div class="modal-content delete-modal">
                            <h3>Confirmar Eliminación</h3>
                            <p>¿Está seguro de que desea eliminar al usuario <strong>"${this.userToDelete.username}"</strong>? Esta acción no se puede deshacer.</p>
                            <div class="modal-actions">
                                <button class="btn-secondary" id="btnCancelDelete">Cancelar</button>
                                <button class="btn-danger" id="btnConfirmDelete">Eliminar</button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        const btnCreate = this.shadowRoot.getElementById('btnCreate');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => this.openForm(null));
        }

        const btnCancelDelete = this.shadowRoot.getElementById('btnCancelDelete');
        if (btnCancelDelete) {
            btnCancelDelete.addEventListener('click', () => this.cancelDelete());
        }

        const btnConfirmDelete = this.shadowRoot.getElementById('btnConfirmDelete');
        if (btnConfirmDelete) {
            btnConfirmDelete.addEventListener('click', () => this.executeDelete());
        }
    }
}

customElements.define('user-abm-page', UserAbmPage);
