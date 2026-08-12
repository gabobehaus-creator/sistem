// public/components/dollar-price-widget.js
class DollarPriceWidget extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                }
                .widget {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .price-container {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .price-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.85rem;
                    color: #475569;
                }
                .price-value {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .badge {
                    background-color: #e0f2fe;
                    color: #0369a1;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .icon-container {
                    background-color: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 12px;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .icon-container svg {
                    width: 20px;
                    height: 20px;
                    color: #16a34a;
                }
            </style>
            <div class="widget">
                <div class="price-container" id="priceDisplay">
                    <div style="color: #64748b; font-size: 0.8rem;">Cargando cotización...</div>
                </div>
                <div class="icon-container">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.fetchDollarPrice();
    }

    async fetchDollarPrice() {
        try {
            const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
            if (!response.ok) {
                throw new Error('No se pudo obtener la cotización del dólar');
            }
            const data = await response.json();
            
            const compra = parseFloat(data.compra).toFixed(2); 
            const venta = parseFloat(data.venta).toFixed(2); 
            
            this.shadowRoot.getElementById('priceDisplay').innerHTML = `
                <div class="price-row">
                    <span class="badge">Compra</span>
                    <span class="price-value">$${compra}</span>
                </div>
                <div class="price-row">
                    <span class="badge" style="background-color: #fef3c7; color: #b45309;">Venta</span>
                    <span class="price-value">$${venta}</span>
                </div>
            `;

        } catch (error) {
            console.error("Error fetching dollar price:", error);
            this.shadowRoot.getElementById('priceDisplay').innerHTML = `
                <div style="color: #ef4444; font-size: 0.85rem; font-weight: 500;">Error al cargar cotización</div>
            `;
        }
    }
}

customElements.define('dollar-price-widget', DollarPriceWidget);
