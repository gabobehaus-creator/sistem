// public/components/billing-consumption-panel.js
class BillingConsumptionPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.bookingId = null; // Add bookingId property
        this.consumptionsTotal = 0; // Initialize a property to hold the sum of additional consumptions
        this.shadowRoot.innerHTML = `
            <style>
                .billing-section { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
                .consumption-item { display: flex; justify-content: space-between; padding: 5px 0; }
                .total-amount { font-size: 1.2em; font-weight: bold; margin-top: 10px; }
                .form-group { margin-bottom: 15px; }
                input, select, button { padding: 8px; box-sizing: border-box; }
                #consumptionDescription { width: 50%; }
                #consumptionAmount { width: 25%; }
                #addConsumptionButton { width: 20%; }
            </style>
            <div class="billing-section">
                <h4>Facturación y Consumos</h4>
                <p>Estadía Total: <span id="stayDuration">0 noches</span> | Base: $<span id="stayCost">0.00</span></p>
                <h5>Consumos Adicionales:</h5>
                <div id="consumptionsList"></div>
                <div class="form-group">
                    <input type="text" id="consumptionDescription" placeholder="Descripción (ej: Minibar, Lavandería)">
                    <input type="number" id="consumptionAmount" placeholder="Monto ($)" min="0">
                    <button type="button" id="addConsumptionButton">Añadir Consumo</button>
                </div>
                <div class="total-amount">Total a Pagar: $<span id="totalAmountDisplay">0.00</span></div>
                
                <hr>
                <div class="form-group">
                    <label for="paymentMethodSelect">Método de Pago:</label>
                    <select id="paymentMethodSelect">
                        <option value="Contado">Contado</option>
                        <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                        <option value="Cuenta Corriente">Cuenta Corriente (Crédito Hotelero)</option>
                    </select>
                </div>
                
            </div>
        `;
    }

    connectedCallback() {
        this.shadowRoot.getElementById('addConsumptionButton').addEventListener('click', () => this.handleAddConsumption());
    }

    setBookingId(id) {
        this.bookingId = id;
        if (id) {
            this.fetchConsumptions(id);
        } else {
            this.renderConsumptions([]); // Clear consumptions if no booking ID
        }
    }

    // Recibe los detalles de la reserva para calcular totales
    calculateTotals(startDateValue, endDateValue, pricePerNight, minibarTotal = 0, timeSlot = 'full-day') {
        let durationSlots = 0; // Represents the number of morning/afternoon slots
        
        if (startDateValue && endDateValue) {
            // Helper para obtener la fecha y hora de inicio real de una reserva
            const getActualStart = (dateStr, slot) => {
                const datePart = dateStr + 'T';
                return slot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
            };

            // Helper para obtener la fecha y hora de fin real de una reserva (exclusiva)
            const getActualEnd = (dateStr, slot) => {
                const endDateObj = new Date(dateStr + 'T00:00:00Z');
                return slot === 'morning' ? new Date(endDateObj.getTime() + (12 * 60 * 60 * 1000)) : new Date(endDateObj.getTime() + (24 * 60 * 60 * 1000));
            };

            const bookingStart = getActualStart(startDateValue, timeSlot);
            const bookingEnd = getActualEnd(endDateValue, timeSlot);

            let currentSlotPointer = bookingStart.getTime();
            while (currentSlotPointer < bookingEnd.getTime()) {
                durationSlots++;
                // Move to the next half-day slot
                currentSlotPointer += (12 * 60 * 60 * 1000); // Add 12 hours
            }
        }
        
        // Each day is 2 slots. Price per night needs to be adjusted per slot.
        // Assuming pricePerNight is for a full day (2 slots)
        const pricePerSlot = pricePerNight / 2;
        let stayCost = durationSlots * pricePerSlot;

        // Display duration in a more accurate way for slots, or stick to days for simplicity.
        // If we want to display days, we can do durationSlots / 2.
        const durationDaysDisplay = Math.ceil(durationSlots / 2); // Round up to show at least 1 day for a half-day booking
        this.shadowRoot.getElementById('stayDuration').textContent = `${durationDaysDisplay} días (${durationSlots} franjas)`;
        this.shadowRoot.getElementById('stayCost').textContent = stayCost.toFixed(2);
        this.updateTotalAmount(this.consumptionsTotal, minibarTotal); // Ensure minibarTotal is passed correctly
    }

    // Carga consumos existentes para la bookingId
    async fetchConsumptions(bookingId) {
        if (!bookingId) return;
        const response = await fetch(`/api/bookings/${bookingId}/consumptions`);
        if (response.ok) {
            const data = await response.json();
            this.renderConsumptions(data.data);
        } else {
            this.shadowRoot.getElementById('consumptionsList').innerHTML = '<p>Error al cargar consumos.</p>';
        }
    }

    renderConsumptions(consumptions) {
        const list = this.shadowRoot.getElementById('consumptionsList');
        list.innerHTML = '';
        this.consumptionsTotal = 0; // Reset total before re-calculating
        if (consumptions.length === 0) {
            list.innerHTML = '<p>No hay consumos registrados para esta estadía.</p>';
        } else {
            consumptions.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('consumption-item');
                div.innerHTML = `
                    <span>${item.description}</span>
                    <span>$${item.amount.toFixed(2)}</span>
                `;
                list.appendChild(div);
                this.consumptionsTotal += item.amount;
            });
        }
        // When consumptions are rendered, we need to inform the parent about the updated total
        this.updateTotalAmount(this.consumptionsTotal); // Update local total display
        this.dispatchEvent(new CustomEvent('consumptions-total-updated', { bubbles: true, composed: true })); // Notify parent
    }

    updateTotalAmount(consumptionsTotal = 0, minibarTotal = 0) {
         const stayCostText = this.shadowRoot.getElementById('stayCost').textContent.replace('$', '').replace(',', '') || '0.00';
         const stayCost = parseFloat(stayCostText);
         const total = stayCost + consumptionsTotal + minibarTotal;
         this.shadowRoot.getElementById('totalAmountDisplay').textContent = total.toFixed(2);
    }

    // Añadir consumo via API
    async handleAddConsumption() {
        const descriptionInput = this.shadowRoot.getElementById('consumptionDescription');
        const amountInput = this.shadowRoot.getElementById('consumptionAmount');
        const description = descriptionInput.value;
        const amount = parseFloat(amountInput.value);
        const bookingId = this.bookingId; // Use the stored bookingId

        if (!description || isNaN(amount) || amount <= 0 || !bookingId) {
            alert("Ingrese una descripción y un monto válido y asegúrese de que la reserva exista.");
            return;
        }

        try {
            const response = await fetch('/api/consumptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId, description, amount, date: new Date().toISOString().split('T')[0] })
            });

            if (response.ok) {
                descriptionInput.value = '';
                amountInput.value = '';
                await this.fetchConsumptions(bookingId); // Refresca la lista local
            } else {
                const errorData = await response.json();
                alert("Error al añadir consumo: " + (errorData.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Fetch error adding consumption:', error);
            alert("Hubo un error de conexión con el servidor al agregar consumo.");
        }
    }
    
    // Método para obtener el método de pago seleccionado
    getPaymentMethod() {
        return this.shadowRoot.getElementById('paymentMethodSelect').value;
    }

    getTotalConsumptions() {
        return this.consumptionsTotal;
    }
}
customElements.define('billing-consumption-panel', BillingConsumptionPanel);
