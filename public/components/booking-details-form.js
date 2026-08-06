// public/components/booking-details-form.js (COMPLETO Y ACTUALIZADO CON EMAIL, NOTAS, CANAL, EMPRESA Y FRANJA HORARIA)
class BookingDetailsForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.clients = [];

        this.shadowRoot.innerHTML = `
            <style>
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; }
                .price-per-night-input { width: 50% !important; display: inline-block; }
                .client-type-toggle { display: flex; align-items: center; margin-bottom: 10px; }
                .client-type-toggle input[type="checkbox"] { margin-right: 10px; width: auto; }
                .hidden { display: none; }
            </style>
            
            <input type="hidden" id="roomIdInput">
            <div class="form-group">
                <label>Habitación:</label>
                <input type="text" id="roomNameDisplay" readonly>
            </div>
            <div class="form-group">
                <label for="statusSelect">Estado:</label>
                <select id="statusSelect">
                    <option value="liberated">Liberada</option>
                    <option value="reserved">Reservada</option>
                    <option value="occupied">Ocupada</option>
                    <option value="checked-out">Checked-Out (Finalizada)</option>
                    <option value="paid">Pagada</option>
                    <option value="invoiced">Facturada</option>
                    <option value="blocked">Bloqueada</option>
                </select>
            </div>

            <!-- Checkbox y Dropdown para Empresa -->
            <div class="client-type-toggle">
                <input type="checkbox" id="isCompanyCheckbox">
                <label for="isCompanyCheckbox">Reservado por Empresa</label>
            </div>
            
            <div class="form-group hidden" id="companyDropdownGroup">
                <label for="companySelect">Seleccionar Empresa:</label>
                <select id="companySelect"></select>
            </div>
            <!-- Fin Empresa -->

            <div class="form-group">
                <label for="clientName">Nombre del Ocupante/Contacto:</label>
                <input type="text" id="clientName">
            </div>

            <div class="form-group">
                <label for="sourceChannel">Canal de Origen:</label>
                <select id="sourceChannel">
                    <option value="">Seleccione un canal...</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="booking">Booking</option>
                    <option value="expedia">Expedia</option>
                    <option value="walking-in">Walking-In</option>
                    <option value="referidos">Referidos</option>
                </select>
            </div>
            
            <!-- CAMPO DE EMAIL AÑADIDO -->
            <div class="form-group">
                <label for="clientEmail">Correo Electrónico (para confirmación):</label>
                <input type="email" id="clientEmail">
            </div>
            <!-- FIN CAMPO DE EMAIL -->

            <div class="form-group">
                <label for="startDate">Fecha de Inicio (YYYY-MM-DD):</label>
                <input type="date" id="startDate">
            </div>
            <div class="form-group">
                <label for="endDate">Fecha de Fin (YYYY-MM-DD):</label>
                <input type="date" id="endDate">
            </div>
            
            <!-- Selector de Franja Horaria -->
            <div class="form-group">
                <label for="timeSlotSelect">Franja Horaria:</label>
                <select id="timeSlotSelect">
                    <option value="full-day">Día Completo (Check-in 15:00, Check-out 11:00)</option>
                    <option value="morning">Mañana (Check-in 08:00, Check-out 11:00)</option>
                    <option value="afternoon">Tarde (Check-in 15:00, Check-out 19:00)</option>
                </select>
            </div>
            <!-- Fin Selector de Franja Horaria -->

             <!-- CAMPO DE NOTAS AÑADIDO -->
            <div class="form-group">
                <label for="notesInput">Notas/Comentarios Adicionales:</label>
                <textarea id="notesInput" rows="4" style="width: 100%;"></textarea>
            </div>
            <div class="form-group">
                <label for="pricePerNight">Precio por Noche ($):</label>
                <input type="number" id="pricePerNight" class="price-per-night-input" step="0.01" min="0"
                >
            </div>
            
            <!-- FIN CAMPO DE NOTAS -->
        `;
    }

    connectedCallback() {
        this.fetchClientsList();
        this.shadowRoot.getElementById('isCompanyCheckbox').addEventListener('change', (e) => {
            this.toggleCompanySelection(e.target.checked);
        });
        // Emitir evento cuando cambian las fechas o el precio para que el panel de facturación recalcule
        ['startDate', 'endDate', 'pricePerNight', 'notesInput', 'timeSlotSelect', 'sourceChannel'].forEach(id => {
            const element = this.shadowRoot.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
                });
            }
        });

        // Listener para el selector de empresa
        this.shadowRoot.getElementById('companySelect').addEventListener('change', () => {
            this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
        });
    }

    async fetchClientsList() {
        const response = await fetch('/api/clients');
        if (response.ok) {
            const data = await response.json();
            this.clients = data.data;
            this.populateCompanyDropdown();
        } else {
            console.error("Error al cargar la lista de clientes/empresas");
            // En caso de error, el dropdown quedará vacío
        }
    }

    populateCompanyDropdown() {
        const select = this.shadowRoot.getElementById('companySelect');
        select.innerHTML = '<option value="">Cliente particular</option>'; // Opción para no asociar a empresa
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.cuit_cuil})`;
            select.appendChild(option);
        });
    }

    toggleCompanySelection(isCompany) {
        this.shadowRoot.getElementById('companyDropdownGroup').classList.toggle('hidden', !isCompany);
        if (!isCompany) {
            this.shadowRoot.getElementById('companySelect').value = ''; // Clear selection if not a company
            // Dispatch change event to indicate client_id might have changed to null
            this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
        } else {
             // If becoming a company booking, ensure a default selection if available, or just open the dropdown
            if (this.clients.length > 0 && !this.shadowRoot.getElementById('companySelect').value) {
                this.shadowRoot.getElementById('companySelect').value = this.clients[0].id; // Select first company by default
                 this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
            }
        }
    }

    // Método público para establecer datos iniciales
    setDetails(details, roomPrice) {
        this.shadowRoot.getElementById('roomIdInput').value = details.roomId || '';
        this.shadowRoot.getElementById('roomNameDisplay').value = details.roomName || '';
        this.shadowRoot.getElementById('startDate').value = details.startDate || '';
        this.shadowRoot.getElementById('endDate').value = details.endDate || '';
        this.shadowRoot.getElementById('clientName').value = details.clientName || '';
        this.shadowRoot.getElementById('clientEmail').value = details.clientEmail || '';
        this.shadowRoot.getElementById('statusSelect').value = details.status || 'reserved';
        this.shadowRoot.getElementById('timeSlotSelect').value = details.timeSlot || 'full-day';
        this.shadowRoot.getElementById('sourceChannel').value = details.source_channel || ''; // Set source channel
        const price = details.pricePerNight || roomPrice;
        this.shadowRoot.getElementById('pricePerNight').value = price.toFixed(2);
        this.shadowRoot.getElementById('notesInput').value = details.notes || '';

        // Cargar empresa si existe
        if (details.clientId) {
            this.shadowRoot.getElementById('isCompanyCheckbox').checked = true;
            this.toggleCompanySelection(true); // Show dropdown
            // Small timeout to ensure the dropdown is populated before setting value
            setTimeout(() => {
                this.shadowRoot.getElementById('companySelect').value = details.clientId;
            }, 50); 
        } else {
            this.shadowRoot.getElementById('isCompanyCheckbox').checked = false;
            this.toggleCompanySelection(false); // Hide dropdown
        }
    }

    // Método público para extraer todos los datos del formulario
    getDetails() {
        const isCompany = this.shadowRoot.getElementById('isCompanyCheckbox').checked;
        const companySelectValue = this.shadowRoot.getElementById('companySelect').value;

        return {
            room_id: parseInt(this.shadowRoot.getElementById('roomIdInput').value),
            status: this.shadowRoot.getElementById('statusSelect').value,
            client_name: this.shadowRoot.getElementById('clientName').value,
            email: this.shadowRoot.getElementById('clientEmail').value,
            start_date: this.shadowRoot.getElementById('startDate').value,
            end_date: this.shadowRoot.getElementById('endDate').value,
            price_per_night: parseFloat(this.shadowRoot.getElementById('pricePerNight').value),
            notes: this.shadowRoot.getElementById('notesInput').value,
            client_id: (isCompany && companySelectValue) ? parseInt(companySelectValue) : null,
            time_slot: this.shadowRoot.getElementById('timeSlotSelect').value,
            source_channel: this.shadowRoot.getElementById('sourceChannel').value
        };
    }
}
customElements.define('booking-details-form', BookingDetailsForm);
