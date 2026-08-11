// public/components/booking-details-form.js (COMPLETO Y ACTUALIZADO CON CAMBIO DE HABITACIÓN)
class BookingDetailsForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.clients = [];
        this.rooms = [];

        this.shadowRoot.innerHTML = `
            <style>
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, select { width: 100%; padding: 8px; box-sizing: border-box; }
                .price-per-night-input { width: 50% !important; display: inline-block; }
                .client-type-toggle { display: flex; align-items: center; margin-bottom: 10px; }
                .client-type-toggle input[type="checkbox"] { margin-right: 10px; width: auto; }
                .hidden-field { display: none; }
                
                /* Estilos para el botón y modal de cambio de habitación */
                .room-header-container { display: flex; justify-content: space-between; align-items: center; }
                .change-room-link { color: #007bff; text-decoration: underline; cursor: pointer; font-size: 0.9em; font-weight: normal; }
                .change-room-link:hover { color: #0056b3; }

                /* Modal de selección de habitación con clases ultra específicas para evitar colisiones */
                .room-change-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.6);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 20000; /* Mayor z-index para estar por encima de todo */
                }
                .room-change-hidden {
                    display: none !important;
                }
                .room-change-modal-content {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    max-height: 80vh;
                    overflow-y: auto;
                }
                .modal-title { margin-top: 0; margin-bottom: 15px; font-size: 1.2em; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                .room-list { list-style: none; padding: 0; margin: 0; }
                .room-item {
                    padding: 10px;
                    border: 1px solid #ddd;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .room-item:hover { background: #f0f7ff; border-color: #007bff; }
                .room-item .room-price { font-size: 0.9em; color: #666; }
                .close-modal-btn {
                    width: 100%;
                    padding: 10px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 15px;
                }
                .close-modal-btn:hover { background: #5a6268; }
            </style>
            
            <input type="hidden" id="roomIdInput">
            <div class="form-group">
                <div class="room-header-container">
                    <label>Habitación:</label>
                    <span class="change-room-link" id="openRoomModalBtn">Cambiar de habitación</span>
                </div>
                <input type="text" id="roomNameDisplay" readonly>
            </div>
            <div class="form-group">
                <label for="statusSelect">Estado:</label>
                <select id="statusSelect">
                    <option value="liberated">Liberada</option>
                    <option value="reserved">Reservada</option>
                    <option value="occupied">Ocupada</option>
                    <option value="checked-out">Checked-Out (Finalizada)</option>
                </select>
            </div>

            <!-- Checkbox y Dropdown para Empresa -->
            <div class="client-type-toggle">
                <input type="checkbox" id="isCompanyCheckbox">
                <label for="isCompanyCheckbox">Reservado por Empresa</label>
            </div>
            
            <div class="form-group hidden-field" id="companyDropdownGroup">
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
                    <option value="full-day">Día Completo</option>
                    <option value="morning">Mañana</option>
                    <option value="afternoon">Tarde</option>
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
                disabled>
            </div>
            
            <!-- FIN CAMPO DE NOTAS -->

            <!-- MODAL SECUNDARIO PARA SELECCIONAR HABITACIÓN -->
            <div id="roomModal" class="room-change-modal-overlay room-change-hidden">
                <div class="room-change-modal-content">
                    <h3 class="modal-title">Seleccionar Habitación</h3>
                    <ul class="room-list" id="roomListContainer">
                        <!-- Se cargará dinámicamente -->
                    </ul>
                    <button type="button" class="close-modal-btn" id="closeRoomModalBtn">Cancelar</button>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.fetchClientsList();
        this.shadowRoot.getElementById('isCompanyCheckbox').addEventListener('change', (e) => {
            this.toggleCompanySelection(e.target.checked);
        });
        // Emitir evento cuando cambian las fechas o el precio para que el panel de facturación recalcule
        ['startDate', 'endDate', 'pricePerNight', 'notesInput'].forEach(id => {
            this.shadowRoot.getElementById(id).addEventListener('change', () => {
                this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
            });
        });

        // Evento para emitir 'details-changed' cuando cambia la franja horaria
        this.shadowRoot.getElementById('timeSlotSelect').addEventListener('change', () => {
            this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
        });

        // Eventos para el modal de cambio de habitación (deteniendo propagación)
        this.shadowRoot.getElementById('openRoomModalBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openRoomSelectionModal();
        });
        this.shadowRoot.getElementById('closeRoomModalBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeRoomSelectionModal();
        });
        this.shadowRoot.getElementById('roomModal').addEventListener('click', (e) => {
            // Evitar que clics de fondo cierren o afecten modales superiores
            e.stopPropagation();
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
        }
    }

    populateCompanyDropdown() {
        const select = this.shadowRoot.getElementById('companySelect');
        select.innerHTML = '<option value="">Seleccione una empresa...</option>';
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.cuit_cuil})`;
            select.appendChild(option);
        });
    }

    toggleCompanySelection(isCompany) {
        this.shadowRoot.getElementById('companyDropdownGroup').classList.toggle('hidden-field', !isCompany);
        if (!isCompany) {
            this.shadowRoot.getElementById('companySelect').value = '';
        }
    }

    async openRoomSelectionModal() {
        const modal = this.shadowRoot.getElementById('roomModal');
        const container = this.shadowRoot.getElementById('roomListContainer');
        container.innerHTML = '<li>Cargando habitaciones...</li>';
        modal.classList.remove('room-change-hidden');

        try {
            const response = await fetch('/api/rooms');
            if (response.ok) {
                const data = await response.json();
                this.rooms = data.data;
                this.renderRoomsForSelection();
            } else {
                container.innerHTML = '<li>Error al cargar habitaciones.</li>';
            }
        } catch (error) {
            console.error(error);
            container.innerHTML = '<li>Error de conexión.</li>';
        }
    }

    closeRoomSelectionModal() {
        this.shadowRoot.getElementById('roomModal').classList.add('room-change-hidden');
    }

    renderRoomsForSelection() {
        const container = this.shadowRoot.getElementById('roomListContainer');
        container.innerHTML = '';

        if (this.rooms.length === 0) {
            container.innerHTML = '<li>No hay habitaciones registradas.</li>';
            return;
        }

        this.rooms.forEach(room => {
            const li = document.createElement('li');
            li.className = 'room-item';
            li.innerHTML = `
                <span>${room.name}</span>
                <span class="room-price">$${room.price ? parseFloat(room.price).toFixed(2) : '0.00'}</span>
            `;
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectNewRoom(room);
            });
            container.appendChild(li);
        });
    }

    selectNewRoom(room) {
        this.shadowRoot.getElementById('roomIdInput').value = room.id;
        this.shadowRoot.getElementById('roomNameDisplay').value = room.name;
        
        // Si la habitación tiene un precio por defecto, actualizamos el input de precio por noche
        if (room.price) {
            this.shadowRoot.getElementById('pricePerNight').value = parseFloat(room.price).toFixed(2);
        }

        this.closeRoomSelectionModal();
        
        // Disparamos el evento de cambio para que el resto de la UI se entere
        this.dispatchEvent(new CustomEvent('details-changed', { bubbles: true, composed: true }));
    }

    // Método público para establecer datos iniciales (Añadimos email)
    setDetails(details, roomPrice) {
        this.shadowRoot.getElementById('roomIdInput').value = details.roomId;
        this.shadowRoot.getElementById('roomNameDisplay').value = details.roomName;
        this.shadowRoot.getElementById('startDate').value = details.startDate || '';
        this.shadowRoot.getElementById('endDate').value = details.endDate || '';
        this.shadowRoot.getElementById('clientName').value = details.clientName || '';
        // Seteamos el valor del email si existe en los detalles
        this.shadowRoot.getElementById('clientEmail').value = details.clientEmail || '';
        this.shadowRoot.getElementById('statusSelect').value = details.status || 'reserved';
        this.shadowRoot.getElementById('timeSlotSelect').value = details.timeSlot || 'full-day'; // Seteamos la franja horaria
        const price = details.pricePerNight || roomPrice;
        this.shadowRoot.getElementById('pricePerNight').value = price.toFixed(2);
        this.shadowRoot.getElementById('notesInput').value = details.notes || ''; // <-- AÑADIDO


        // Cargar empresa si existe
        if (details.clientId) {
            this.shadowRoot.getElementById('isCompanyCheckbox').checked = true;
            this.toggleCompanySelection(true);
            setTimeout(() => { // Pequeño timeout para asegurar que el dropdown se haya renderizado
                this.shadowRoot.getElementById('companySelect').value = details.clientId;
            }, 50); 
        } else {
            this.shadowRoot.getElementById('isCompanyCheckbox').checked = false;
            this.toggleCompanySelection(false);
        }
    }

    // Método público para extraer todos los datos del formulario (Añadimos email)
    getDetails() {
        const isCompany = this.shadowRoot.getElementById('isCompanyCheckbox').checked;
        const companySelectValue = this.shadowRoot.getElementById('companySelect').value;

        return {
            room_id: parseInt(this.shadowRoot.getElementById('roomIdInput').value),
            status: this.shadowRoot.getElementById('statusSelect').value,
            client_name: this.shadowRoot.getElementById('clientName').value,
            email: this.shadowRoot.getElementById('clientEmail').value, // <-- AÑADIDO
            start_date: this.shadowRoot.getElementById('startDate').value,
            end_date: this.shadowRoot.getElementById('endDate').value,
            price_per_night: parseFloat(this.shadowRoot.getElementById('pricePerNight').value),
            notes: this.shadowRoot.getElementById('notesInput').value, // <-- AÑADIDO
            client_id: (isCompany && companySelectValue) ? parseInt(companySelectValue) : null, // Aseguramos ID numérico o null
            time_slot: this.shadowRoot.getElementById('timeSlotSelect').value // <-- AÑADIDO
        };
    }
}
customElements.define('booking-details-form', BookingDetailsForm);
