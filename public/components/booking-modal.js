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
                    background: white; padding: 30px; border-radius: 8px;
                    width: 500px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); 
                    max-height: 80vh; overflow-y: auto;
                }
                .modal-header {
                    display: flex; justify-content: space-between;
                    align-items: center; border-bottom: 1px solid #eee;
                    padding-bottom: 10px; margin-bottom: 20px;
                }
                .close-button {
                    background: none; border: none; font-size: 24px; cursor: pointer;
                }
                .button-group { display: flex; justify-content: space-between; margin-top: 20px; }
                button { padding: 10px 15px; border: none; cursor: pointer; }
                .btn-save { background-color: #0056b3; color: white; }
                .btn-delete { background-color: #f44336; color: white; }
                .btn-cancel { background-color: #ccc; color: black; }
                .btn-checkin { background-color: #ff9800; color: white; }
                .btn-checkout { background-color: #607d8b; color: white; }
                .btn-cobrar { background-color: #4caf50; color: white; }
                .btn-facturar { background-color: #2196f3; color: white; }
                svg { width: 10%; height: 10%; }
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
        // Event listeners locales del shell
        this.shadow.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        this.shadow.getElementById('cancelButton').addEventListener('click', () => this.closeModal());
        this.shadow.getElementById('deleteButton').addEventListener('click', () => this.handleDelete());
        this.shadow.getElementById('checkInButton').addEventListener('click', () => this.handleCheckIn());
        this.shadow.getElementById('checkOutButton').addEventListener('click', () => this.handleCheckOut());
        this.shadow.getElementById('cobrarButton').addEventListener('click', () => this.handleCobrar());
        this.shadow.getElementById('facturarButton').addEventListener('click', () => this.handleFacturar());
        this.shadow.getElementById('saveButton').addEventListener('click', () => this.handleSave());
        
        // Escuchar eventos globales del dashboard
        document.addEventListener('open-booking-modal', (e) => this.openModal(e.detail));
        






        // Escuchar eventos de los subcomponentes
        this.shadow.getElementById('detailsForm').addEventListener('details-changed', () => this.syncDetailsToBilling());
        this.addEventListener('get-booking-id', (e) => e.detail.callback(this.currentBookingId)); // Maneja la petición de ID desde el panel de consumos
    }
    
    // Sincroniza datos del formulario principal al panel de facturación
    syncDetailsToBilling() {
        const details = this.shadow.getElementById('detailsForm').getDetails();
        this.shadow.getElementById('billingPanel').calculateTotals(
            details.start_date, details.end_date, details.price_per_night
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
            this.shadow.getElementById('billingPanel').fetchConsumptions(this.currentBookingId);
            this.shadow.getElementById('minibarConsumptionPanel').setBookingId(this.currentBookingId);
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

        if (confirm(`El total a pagar es $${total.toFixed(2)}. ¿Confirmar Check-Out y generar factura?`)) {
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
