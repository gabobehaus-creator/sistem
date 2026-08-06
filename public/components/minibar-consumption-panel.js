class MinibarConsumptionPanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.bookingId = null;
        this.minibarProducts = []; // List of all available minibar products
        this.currentConsumptions = []; // Consumptions for the current booking
        this.minibarTotal = 0;

        this.shadowRoot.innerHTML = `
            <style>
                .minibar-section { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
                .consumption-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
                .add-consumption-form { display: flex; gap: 10px; margin-top: 15px; }
                .add-consumption-form select, .add-consumption-form input, .add-consumption-form button { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                .add-consumption-form button { background-color: #5cb85c; color: white; cursor: pointer; }
                .minibar-total { font-size: 1.2em; font-weight: bold; margin-top: 10px; text-align: right; }
            </style>
            <div class="minibar-section">
                <h4>Consumos de Frigobar</h4>
                <div id="minibarConsumptionsList">
                    <p>No hay consumos de frigobar registrados para esta estadía.</p>
                </div>
                <div class="minibar-total">Total Frigobar: $<span id="minibarTotalDisplay">0.00</span></div>

                <div class="add-consumption-form">
                    <select id="productSelect">
                        <option value="">Seleccione un producto</option>
                    </select>
                    <input type="number" id="productQuantity" value="1" min="1" placeholder="Cantidad" style="width: 80px;">
                    <button id="addMinibarConsumptionButton">Agregar</button>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.shadowRoot.getElementById('addMinibarConsumptionButton').addEventListener('click', () => this.handleAddMinibarConsumption());
        this.fetchMinibarProducts(); // Fetch products when component is connected
    }

    setBookingId(id) {
        this.bookingId = id;
        if (id) {
            this.fetchMinibarConsumptions(id);
        } else {
            this.currentConsumptions = [];
            this.renderMinibarConsumptions([]);
        }
    }

    async fetchMinibarProducts() {
        try {
            const response = await fetch('/api/minibar/products');
            if (response.ok) {
                const data = await response.json();
                this.minibarProducts = data.data;
                this.populateProductDropdown();
            } else {
                console.error('Error fetching minibar products:', await response.text());
            }
        } catch (error) {
            console.error('Network error fetching minibar products:', error);
        }
    }

    populateProductDropdown() {
        const select = this.shadowRoot.getElementById('productSelect');
        select.innerHTML = '<option value="">Seleccione un producto</option>';
        this.minibarProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} ($${product.price.toFixed(2)})`;
            select.appendChild(option);
        });
    }

    async fetchMinibarConsumptions(bookingId) {
        if (!bookingId) {
            this.renderMinibarConsumptions([]);
            return;
        }
        try {
            const response = await fetch(`/api/bookings/${bookingId}/minibar-consumptions`);
            if (response.ok) {
                const data = await response.json();
                this.currentConsumptions = data.data;
                this.renderMinibarConsumptions(this.currentConsumptions);
            } else {
                this.shadowRoot.getElementById('minibarConsumptionsList').innerHTML = '<p>Error al cargar consumos de frigobar.</p>';
                this.renderMinibarConsumptions([]);
            }
        } catch (error) {
            console.error('Network error fetching minibar consumptions:', error);
            this.shadowRoot.getElementById('minibarConsumptionsList').innerHTML = '<p>Error de conexión al cargar consumos de frigobar.</p>';
            this.renderMinibarConsumptions([]);
        }
    }

    renderMinibarConsumptions(consumptions) {
        const list = this.shadowRoot.getElementById('minibarConsumptionsList');
        list.innerHTML = '';
        this.minibarTotal = 0;

        if (consumptions.length === 0) {
            list.innerHTML = '<p>No hay consumos de frigobar registrados para esta estadía.</p>';
        } else {
            consumptions.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('consumption-item');
                div.innerHTML = `
                    <span>${item.product_name} x ${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                `;
                list.appendChild(div);
                this.minibarTotal += (item.price * item.quantity);
            });
        }
        this.shadowRoot.getElementById('minibarTotalDisplay').textContent = this.minibarTotal.toFixed(2);
        this.dispatchMinibarConsumptionChanged();
    }

    async handleAddMinibarConsumption() {
        const productSelect = this.shadowRoot.getElementById('productSelect');
        const quantityInput = this.shadowRoot.getElementById('productQuantity');

        const productId = productSelect.value;
        const quantity = parseInt(quantityInput.value);

        if (!this.bookingId) {
            alert("Seleccione una reserva antes de agregar consumos de frigobar.");
            return;
        }
        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert("Seleccione un producto y una cantidad válida.");
            return;
        }

        const selectedProduct = this.minibarProducts.find(p => p.id == productId);
        if (!selectedProduct) {
            alert("Producto no encontrado.");
            return;
        }

        try {
            const response = await fetch(`/api/bookings/${this.bookingId}/minibar-consumptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    price_at_consumption: selectedProduct.price // Store price at the time of consumption
                })
            });

            if (response.ok) {
                // Refresh consumptions
                await this.fetchMinibarConsumptions(this.bookingId);
                // Reset form
                productSelect.value = '';
                quantityInput.value = '1';
            } else {
                const errorData = await response.json();
                alert("Error al agregar consumo de frigobar: " + (errorData.error || "Error desconocido"));
            }
        } catch (error) {
            console.error('Fetch error adding minibar consumption:', error);
            alert("Hubo un error de conexión con el servidor al agregar consumo de frigobar.");
        }
    }

    getMinibarTotal() {
        return this.minibarTotal;
    }

    dispatchMinibarConsumptionChanged() {
        this.dispatchEvent(new CustomEvent('minibar-consumption-changed', {
            bubbles: true,
            composed: true,
            detail: { total: this.minibarTotal }
        }));
    }
}

customElements.define('minibar-consumption-panel', MinibarConsumptionPanel);
