// public/components/user-form.js

class UserForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.user = null;
        this.isSaving = false;
        this.errorMessage = '';
    }

    static get observedAttributes() {
        return ['user-data'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'user-data') {
            try {
                this.user = (!newValue || newValue === 'null' || newValue === 'undefined') ? null : JSON.parse(newValue);
            } catch (e) {
                this.user = null;
            }
            this.render();
        }
    }

    render() {
        const isEditing = this.user !== null;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }

                * {
                    box-sizing: border-box;
                }

                .form-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .form-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                }

                .close-btn {
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    font-size: 20px;
                    line-height: 1;
                    padding: 4px;
                    border-radius: 4px;
                    transition: color 0.2s ease;
                }

                .close-btn:hover {
                    color: #475569;
                }

                form {
                    padding: 24px;
                }

                .form-group {
                    margin-bottom: 18px;
                }

                label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 6px;
                }

                input[type="text"],
                input[type="email"],
                input[type="password"],
                select {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #0f172a;
                    background-color: #ffffff;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    outline: none;
                }

                input[type="text"]:focus,
                input[type="email"]:focus,
                input[type="password"]:focus,
                select:focus {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
                }

                input:disabled {
                    background-color: #f1f5f9;
                    color: #94a3b8;
                    cursor: not-allowed;
                }

                .checkbox-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                    margin-bottom: 24px;
                }

                .checkbox-group input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #2563eb;
                    cursor: pointer;
                }

                .checkbox-group label {
                    margin-bottom: 0;
                    cursor: pointer;
                    user-select: none;
                }

                .error-banner {
                    background-color: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #991b1b;
                    padding: 10px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    margin-bottom: 18px;
                }

                .actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                    margin-top: 10px;
                }

                .btn {
                    padding: 10px 18px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-cancel {
                    background-color: #ffffff;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                }

                .btn-cancel:hover {
                    background-color: #f8fafc;
                }

                .btn-submit {
                    background-color: #2563eb;
                    color: #ffffff;
                    border: none;
                    box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
                }

                .btn-submit:hover {
                    background-color: #1d4ed8;
                }

                .btn-submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>

            <div class="form-header">
                <h3>${isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                <button class="close-btn" id="btnCancelX">&times;</button>
            </div>

            <form id="userForm">
                ${this.errorMessage ? `<div class="error-banner">${this.errorMessage}</div>` : ''}

                <input type="hidden" id="userId" value="${isEditing ? this.user.id : ''}">

                <div class="form-group">
                    <label for="username">Nombre de Usuario *</label>
                    <input type="text" id="username" value="${isEditing ? (this.user.username || '') : ''}" ${isEditing ? 'disabled' : ''} placeholder="ej. jperez" required>
                </div>

                <div class="form-group">
                    <label for="email">Correo Electrónico</label>
                    <input type="email" id="email" value="${isEditing ? (this.user.email || '') : ''}" placeholder="usuario@empresa.com">
                </div>

                ${!isEditing ? `
                    <div class="form-group">
                        <label for="password">Contraseña (Mínimo 6 caracteres) *</label>
                        <input type="password" id="password" required minlength="6" placeholder="••••••••">
                    </div>
                ` : ''}

                <div class="form-group">
                    <label for="role">Rol de Usuario</label>
                    <select id="role">
                        <option value="operador" ${isEditing && this.user.role === 'operador' ? 'selected' : ''}>Operador</option>
                        <option value="supervisor" ${isEditing && this.user.role === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                        <option value="admin" ${isEditing && this.user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="is_active" ${isEditing ? (this.user.is_active ? 'checked' : '') : 'checked'}>
                    <label for="is_active">Usuario Activo</label>
                </div>

                <div class="actions">
                    <button type="button" class="btn btn-cancel" id="btnCancel">Cancelar</button>
                    <button type="submit" class="btn btn-submit" ${this.isSaving ? 'disabled' : ''}>
                        ${this.isSaving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Usuario')}
                    </button>
                </div>
            </form>
        `;

        this.shadowRoot.getElementById('userForm').addEventListener('submit', (e) => this.handleSubmit(e));
        
        const btnCancel = this.shadowRoot.getElementById('btnCancel');
        if (btnCancel) {
            btnCancel.addEventListener('click', () => this.cancel());
        }

        const btnCancelX = this.shadowRoot.getElementById('btnCancelX');
        if (btnCancelX) {
            btnCancelX.addEventListener('click', () => this.cancel());
        }
    }

    cancel() {
        this.dispatchEvent(new CustomEvent('cancel-form', { bubbles: true, composed: true }));
    }

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const userId = form.elements.userId.value;
        const method = userId ? 'PUT' : 'POST';
        const url = userId ? `/api/users/${userId}` : '/api/users';

        const body = {
            username: form.elements.username.value,
            email: form.elements.email.value,
            role: form.elements.role.value,
            is_active: form.elements.is_active.checked,
        };

        if (!userId) {
            body.password = form.elements.password.value;
        }

        this.isSaving = true;
        this.errorMessage = '';
        this.render();

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok || data.error || data.message === 'Acceso denegado') {
                this.errorMessage = data.error || data.message || 'Error al procesar la solicitud.';
                this.isSaving = false;
                this.render();
                return;
            }

            this.dispatchEvent(new CustomEvent('user-saved', { bubbles: true, composed: true }));
        } catch (error) {
            console.error('Fetch error:', error);
            this.errorMessage = 'Hubo un error de conexión con el servidor.';
            this.isSaving = false;
            this.render();
        }
    }
}

customElements.define('user-form', UserForm);
