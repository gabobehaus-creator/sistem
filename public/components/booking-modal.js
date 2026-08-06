class BookingModal extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.currentBookingId = null; 
        this.currentRoomPrice = 0; 
        this.checkout = false; 

        this.shadow.innerHTML = `
            <style>
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.6); display: none; 
                    justify-content: center; align-items: center; z-index: 1000;
                }
                .modal-content {
                    background: var(--card-bg); padding: 30px; border-radius: 8px;
                    width: 500px; box-shadow: var(--shadow); 
                    max-height: 80vh; overflow-y: auto;
                    color: var(--text-color);
                }
                .modal-header {
                    display: flex; justify-content: space-between;
                    align-items: center; border-bottom: 1px solid var(--text-color);
                    padding-bottom: 10px; margin-bottom: 20px;
                }
                .modal-header h3 { color: var(--primary-color); }
                .close-button {
                    background: none; border: none; font-size: 24px; cursor: pointer;
                    color: var(--text-color);
                }
                .button-group { display: flex; justify-content: space-between; margin-top: 20px; gap: 10px; flex-wrap: wrap;}
                button { padding: 10px 15px; border: none; cursor: pointer; border-radius: 4px; font-size: 0.9em; }
                .btn-save { background-color: var(--primary-color); color: white; }
                .btn-save:hover { background-color: #004494; }
                .btn-delete { background-color: #f44336; color: white; }
                .btn-delete:hover { background-color: #c0392b; }
                .btn-cancel { background-color: #ccc; color: black; }
                .btn-cancel:hover { background-color: #bbb; }
                .btn-checkin { background-color: #ff9800; color: white; }
                .btn-checkin:hover { background-color: #e68a00; }
                .btn-checkout { background-color: #607d8b; color: white; }
                .btn-checkout:hover { background-color: #4a6572; }
                .btn-cobrar { background-color: #4caf50; color: white; }
                .btn-cobrar:hover { background-color: #43a047; }
                .btn-facturar { background-color: #2196f3; color: white; }
                .btn-facturar:hover { background-color: #1976d2; }
                
                /* Dark Mode overrides for buttons */
                :host-context(html.dark-mode) .btn-save { background-color: var(--primary-color); }
                :host-context(html.dark-mode) .btn-save:hover { background-color: #6b98d2; }
                :host-context(html.dark-mode) .btn-delete { background-color: #b71c1c; }
                :host-context(html.dark-mode) .btn-delete:hover { background-color: #921515; }
                :host-context(html.dark-mode) .btn-cancel { background-color: #666; color: white; }
                :host-context(html.dark-mode) .btn-cancel:hover { background-color: #555; }
                :host-context(html.dark-mode) .btn-checkin { background-color: #d35400; }
                :host-context(html.dark-mode) .btn-checkin:hover { background-color: #bb4d00; }
                :host-context(html.dark-mode) .btn-checkout { background-color: #4a6572; }
                :host-context(html.dark-mode) .btn-checkout:hover { background-color: #3e5663; }
                :host-context(html.dark-mode) .btn-cobrar { background-color: #388e3c; }
                :host-context(html.dark-mode) .btn-cobrar:hover { background-color: #2e7d32; }
                :host-context(html.dark-mode) .btn-facturar { background-color: #1976d2; }
                :host-context(html.dark-mode) .btn-facturar:hover { background-color: #1565c0; }

                /* Dialog styles */
                dialog {
                    border: none;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: var(--shadow);
                    background-color: var(--card-bg);
                    color: var(--text-color);
                }
                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                }
                dialog button {
                    margin-top: 10px;
                    margin-right: 10px;
                }
                dialog #confirmBtn { background-color: #4CAF50; color: white; }
                dialog #confirmBtn:hover { background-color: #43a047; }
                dialog [value="cancel"] { background-color: #ccc; color: black; }
                dialog [value="cancel"]:hover { background-color: #bbb; }


                /* SVG icons styling for dark mode */
                :host-context(html.dark-mode) svg {
                    fill: var(--text-color);
                }
            </style>
            <div class="modal-overlay" id="bookingModalOverlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitle">Detalle de Reserva</h3>
                        
                        <div class="bed-icons" style="width: 60%; text-align: right;">
                         <svg viewBox="0 0 24 24" fill="gray">
       <path d="M20 10V7c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v3c-1.1 0-2 .9-2 2v5h1.33L3 19h1l.67-2h12.67l.66 2h1l.67-2H22v-5c0-1.1-.9-2-2-2zm-2 0h-5V7h5v3zM6 7h5v3H6V7zm-2 5v3h16v-3H4z"/>
      </svg>
      <svg viewBox="0 0 24 24" fill="gray">
       <path d="M19 7h-8V3H3v18h2v-4h14v4h2v-8c0-1.1-.9-2-2-2zM5 5h4v4H5V5zm14 8H5v-2h14v2z"/>
      </svg>
      </div>
                        <button class="close-button" id="closeModal">&times;</button>
                    </div>
                    <form id="bookingForm">
                        <!-- Componente de Detalles -->
                        <booking-details-form id="detailsForm"></booking-details-form>
                        
                        <!-- Componente de Facturación/Consumos -->
                        <billing-consumption-panel id="billingPanel" style="display:none;"></billing-consumption-panel>
                        
                        <!-- Componente de Consumos de Frigobar -->
                        <minibar-consumption-panel id="minibarConsumptionPanel" style="display:none;"></minibar-consumption-panel>

                        <div class="button-group">
                            <button type="button" class="btn-cancel" id="cancelButton">Cancelar</button>
                            <button type="button" class="btn-delete" id="deleteButton" style="display:none;">Cancelar Reserva (Eliminar)</button>
                            <button type="button" class="btn-checkin" id="checkInButton" style="display:none;">Realizar Check-In</button>
                            <button type="button" class="btn-cobrar" id="cobrarButton">Cobrar</button>
                            <button type="button" class="btn-facturar" id="facturarButton">Facturar</button>
                            <button type="button" class="btn-checkout" id="checkOutButton" style="display:none;">Checkout</button>
                            
                            <button type="button" class="btn-save" id="saveButton">Guardar Cambios</button>
                        </div>
                        
                    </form>
                    <dialog id="myDialog">
                    <form method="dialog">
                        <h3>Confirmacion de Cobro</h3>
                        <p>
                            <input type="checkbox" id="checkOption" name="checkOption">
                            <label for="checkOption">Se debe aplicar late checkout?</label>
                        </p>
                        <button value="cancel">Cancelar</button>
                        <button id="confirmBtn" value="default">Aceptar</button>
                    </form>
                </dialog>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.shadow.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        this.shadow.getElementById('cancelButton').addEventListener('click', () => this.closeModal());
        this.shadow.getElementById('deleteButton').addEventListener('click', () => this.handleDelete());
        this.shadow.getElementById('checkInButton').addEventListener('click', () => this.handleCheckIn());
        this.shadow.getElementById('checkOutButton').addEventListener('click', () => this.handleCheckOut());
        this.shadow.getElementById('cobrarButton').addEventListener('click', () => this.handleCobrar());
        this.shadow.getElementById('facturarButton').addEventListener('click', () => this.handleFacturar());
        this.shadow.getElementById('saveButton').addEventListener('click', () => this.handleSave());
        
        document.addEventListener('open-booking-modal', (e) => this.openModal(e.detail));
        
        this.shadow.getElementById('detailsForm').addEventListener('details-changed', () => this.syncDetailsToBilling());
        this.shadow.getElementById('minibarConsumptionPanel').addEventListener('minibar-consumption-changed', (e) => this.shadow.getElementById('billingPanel').updateTotalAmount(this.shadow.getElementById('billingPanel').consumptionsTotal, e.detail.total));
    }
    
    // Sincroniza datos del formulario principal al panel de facturación
    syncDetailsToBilling() {
        const details = this.shadow.getElementById('detailsForm').getDetails();
        this.shadow.getElementById('billingPanel').calculateTotals(
            details.start_date, details.end_date, details.price_per_night, this.shadow.getElementById('minibarConsumptionPanel').getMinibarTotal(), details.time_slot
        );
    }

    async openModal(data) {
        this.currentBookingId = data.bookingId;
        this.currentRoomPrice = data.roomPrice || 0;
        
        // Pasar datos iniciales al subcomponente de detalles
        // Pasar datos iniciales al subcomponente de detalles, incluyendo timeSlot
        this.shadow.getElementById('detailsForm').setDetails(data, this.currentRoomPrice);

        // Actualizar visibilidad de botones y panel de facturación
        this.updateActionButtonVisibility(data.status);
        if (data.status === 'occupied' || data.status === 'checked-out' || data.status === 'paid' || data.status === 'invoiced') {
            const billingPanel = this.shadow.getElementById('billingPanel');
            if (billingPanel && typeof billingPanel.fetchConsumptions === 'function') {
                billingPanel.setBookingId(this.currentBookingId);
            } else {
                console.warn("Billing panel not ready or missing fetchConsumptions method.");
            }

            const minibarPanel = this.shadow.getElementById('minibarConsumptionPanel');
            if (minibarPanel && typeof minibarPanel.setBookingId === 'function') {
                minibarPanel.setBookingId(this.currentBookingId);
            } else {
                console.warn("Minibar consumption panel not ready or missing setBookingId method. Element:", minibarPanel);
            }
        }

        this.shadow.getElementById('modalTitle').textContent = data.bookingId ? 'Editar Reserva' : 'Nueva Reserva';
        this.syncDetailsToBilling();
        this.shadow.getElementById('bookingModalOverlay').style.display = 'flex';
    }
    
    closeModal() {
        this.shadow.getElementById('bookingModalOverlay').style.display = 'none';
        // Emitir evento personalizado para que el padre (dashboard) refresque datos
        this.dispatchEvent(new CustomEvent('booking-updated', { bubbles: true, composed: true }));
        this.shadow.getElementById('bookingForm').reset();
    }
    
    updateActionButtonVisibility(status) {
        const saveButton = this.shadow.getElementById('saveButton');
        const facturarButton = this.shadow.getElementById('facturarButton');
        const cobrarButton = this.shadow.getElementById('cobrarButton');
        const checkOutButton = this.shadow.getElementById('checkOutButton');
        const deleteButton = this.shadow.getElementById('deleteButton');
        const checkInButton = this.shadow.getElementById('checkInButton');
        const billingPanel = this.shadow.getElementById('billingPanel');
        const minibarConsumptionPanel = this.shadow.getElementById('minibarConsumptionPanel'); // Se añade el panel de minibar

        const hasBooking = Boolean(this.currentBookingId);
        const isReserved = status === 'reserved';
        const isLiberated = status === 'liberated';
        const isOccupied = status === 'occupied';
        const isCheckedOut = status === 'checked-out';
        const isPaid = status === 'paid'; // Se renombra de isCobrado a isPaid para mayor claridad
        const isInvoiced = status === 'invoiced';

        // Mostrar siempre el botón Guardar
        saveButton.style.display = 'inline-block';

        // Lógica condicional para los botones según el estado
        deleteButton.style.display = hasBooking && isReserved ? 'inline-block' : 'none';
        checkInButton.style.display = hasBooking && (isReserved || isLiberated) ? 'inline-block' : 'none';
        
        // Cobrar y Facturar son visibles si está ocupada o ya cobrada/facturada
        cobrarButton.style.display = hasBooking && (isOccupied || isPaid) ? 'inline-block' : 'none';
        facturarButton.style.display = hasBooking && (isOccupied || isPaid || isCheckedOut || isInvoiced) ? 'inline-block' : 'none';
        
        // CheckOut es visible si está ocupada o cobrada
        checkOutButton.style.display = hasBooking && (isOccupied || isPaid) ? 'inline-block' : 'none';

        // Paneles de consumos son visibles si hay una reserva y no está en estado inicial de "liberated" o "reserved"
        billingPanel.style.display = hasBooking && (isOccupied || isCheckedOut || isPaid || isInvoiced) ? 'block' : 'none';
        minibarConsumptionPanel.style.display = hasBooking && (isOccupied || isCheckedOut || isPaid || isInvoiced) ? 'block' : 'none';

        // Deshabilitar cobrar si ya está cobrado
        if (isPaid) {
            cobrarButton.disabled = true;
            cobrarButton.textContent = 'Cobrado';
        } else {
            cobrarButton.disabled = false;
            cobrarButton.textContent = 'Cobrar';
        }

        // Si estamos creando una nueva reserva, ocultamos botones de actions que no aplican
        if (!hasBooking) {
            deleteButton.style.display = 'none';
            checkInButton.style.display = 'none';
            facturarButton.style.display = 'none';
            checkOutButton.style.display = 'none';
            cobrarButton.style.display = 'none';
            billingPanel.style.display = 'none';
            minibarConsumptionPanel.style.display = 'none'; // Se oculta el panel de minibar también
        }
    }

    // --- Funciones de Acción ---

    async handleSave(status = null) {
        // Obtiene TODOS los datos, incluyendo client_email, gracias a la modificación anterior de getDetails()
        const bookingData = this.shadow.getElementById('detailsForm').getDetails();
        bookingData.status = status || bookingData.status; // Permite actualizar el estado si se pasa como argumento

        // Añadimos validación básica para el email si es una nueva reserva o si lo requieres siempre
        if (!bookingData.client_name || !bookingData.start_date || !bookingData.end_date || !bookingData.time_slot) {
            alert("Por favor complete todos los campos requeridos (Nombre, Fecha Inicio, Fecha Fin, Franja Horaria).");
            return;
        }

        const method = this.currentBookingId ? 'PUT' : 'POST';
        const url = this.currentBookingId ? `/api/bookings/${this.currentBookingId}` : '/api/bookings';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    // Asegúrate de añadir tu token de auth aquí si lo usas con cookies/localStorage
                },
                body: JSON.stringify(bookingData) // Envía el objeto completo, ahora con 'client_email'
            });

            if (response.ok) {
                const result = await response.json();
                if (method === 'POST' && result.id) {
                    this.currentBookingId = result.id;
                }
                document.dispatchEvent(new CustomEvent('booking-saved'));
                this.closeModal(); 

            } else {
                const errorData = await response.json();
                alert("Error al guardar la reserva: " + (errorData.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            alert("Hubo un error de conexión con el servidor.");
        }
    }
    
    handleCheckIn() {
        // Obtenemos el statusSelect del subcomponente y lo actualizamos antes de guardar
        this.shadow.getElementById('detailsForm').shadowRoot.getElementById('statusSelect').value = 'occupied';
        this.handleSave();
    }

    async handleCobrar() {
        // Aquí podrías abrir un submodal específico para el proceso de cobro o simplemente cambiar el estado a "cobrado"
        if (!this.currentBookingId) {
             alert("Error: No se puede cobrar una reserva inexistente.");
             return;
        }

              const dialog = this.shadow.getElementById('myDialog');
            const confirmBtn = this.shadow.getElementById('confirmBtn');
                dialog.showModal();
                confirmBtn.onclick = () => {
                    const checkbox = this.shadow.getElementById('checkOption');
                    let lateAdd = 0;
                    if (checkbox.checked) {
                        const price = this.shadow.getElementById('detailsForm').getDetails();
                        lateAdd += (price.price_per_night / 2);
                    }   


                    const billingPanel = this.shadow.getElementById('billingPanel');
                    const paymentMethod = billingPanel.getPaymentMethod();
                    const minibarConsumptionPanel = this.shadow.getElementById('minibarConsumptionPanel');
                    const total = parseFloat(billingPanel.shadowRoot.getElementById('totalAmountDisplay').textContent) + lateAdd + minibarConsumptionPanel.getMinibarTotal();

                    if (confirm(`El total a pagar es $${total.toFixed(2)}. ¿Confirmar el cobro?`)) {
                        // Establecer el estado a 'paid' en el subcomponente
                        this.shadow.getElementById('detailsForm').shadowRoot.getElementById('statusSelect').value = 'paid';
                        try {
                            // Guardar/actualizar la reserva.
                            this.handleSave('paid');

                        } catch (error) {
                            console.error("Error durante el cobro:", error);
                            alert("Ocurrió un error crítico durante el cobro: " + error.message);
                        }
                    }



         }

    }

    async handleFacturar() {
        if (!this.currentBookingId) {
             alert("Error: No se puede facturar una reserva inexistente.");
             return;
        }

        const billingPanel = this.shadow.getElementById('billingPanel');
        const minibarConsumptionPanel = this.shadow.getElementById('minibarConsumptionPanel');
        const paymentMethod = billingPanel.getPaymentMethod();
        const total = parseFloat(billingPanel.shadowRoot.getElementById('totalAmountDisplay').textContent) + minibarConsumptionPanel.getMinibarTotal();

        if (confirm(`¿Confirma generar factura?`)) {
            // 1. Establecer el estado a checked-out en el subcomponente
            this.shadow.getElementById('detailsForm').shadowRoot.getElementById('statusSelect').value = 'invoiced';
            
            try {
                // 2. Guardar/actualizar la reserva.
               await this.handleSave(); 
                
                // 3. Generamos la factura.
                await this.generateInvoice(this.currentBookingId, paymentMethod); 
                
            } catch (error) {
                console.error("Error durante el check-out:", error);
                alert("Ocurrió un error crítico durante el check-out o la facturación: " + error.message);
            }
        }
    }


    async facturar(lateCheckout) {
        // Aquí podrías abrir un submodal específico para el proceso de facturación o simplemente cambiar el estado a "facturado"
        if (!this.currentBookingId) {
             alert("Error: No se puede facturar una reserva inexistente.");
             return;
        }  
    }

    async handleCheckOut() {
        if (!this.currentBookingId) {
             alert("Error: No se puede facturar una reserva inexistente.");
             return;
        }

        const billingPanel = this.shadow.getElementById('billingPanel');
        const paymentMethod = billingPanel.getPaymentMethod();
        const total = billingPanel.shadowRoot.getElementById('totalAmountDisplay').textContent;

        if (confirm(`El total a pagar es $${total}. ¿Confirmar Check-Out y generar factura?`)) {
            // 1. Establecer el estado a checked-out en el subcomponente
            this.shadow.getElementById('detailsForm').shadowRoot.getElementById('statusSelect').value = 'checked-out';

            try {
                // 2. Guardar/actualizar la reserva.
                await this.handleSave('checked-out');

                // 3. Generamos la factura.
                await this.generateInvoice(this.currentBookingId, paymentMethod);

            } catch (error) {
                console.error("Error durante el check-out:", error);
                alert("Ocurrió un error crítico durante el check-out o la facturación: " + error.message);
            }
        }
    }

    async generateInvoice(bookingId, paymentMethod) {
        try {
            const minibarTotal = this.shadow.getElementById('minibarConsumptionPanel').getMinibarTotal();

            const response = await fetch(`/api/invoices/generate/${bookingId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_method: paymentMethod,
                    minibar_total: minibarTotal // Enviar el total del minibar al backend para la factura
                })
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Factura #${data.invoiceNumber} generada exitosamente.`);
                document.dispatchEvent(new CustomEvent('booking-saved'));
                this.closeModal();
            } else {
                const errorData = await response.json();
                alert(`Facturación completada con advertencias: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Error generating invoice:", error);
            alert("Error de conexión al generar la factura. Revise el backend.");
        }
    }

    async handleDelete() {
        if (!this.currentBookingId || !confirm("¿Está seguro de que desea eliminar esta reserva?")) return;

        try {
            const response = await fetch(`/api/bookings/${this.currentBookingId}`, { method: 'DELETE' });
            if (response.ok) {
                alert("Reserva eliminada exitosamente.");
                this.closeModal();
                document.dispatchEvent(new CustomEvent('booking-saved'));
            } else {
                const errorData = await response.json();
                alert(`Error al eliminar reserva: ${errorData.error}`);
            }
        } catch (error) {
            alert("Error de conexión al eliminar la reserva.");
        }
    }
}

customElements.define('booking-modal', BookingModal);
