class PanelFichajeMovil extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.qrCodeInstance = null;
        this.refreshInterval = null;
        this.qrCodeData = null; // Stores the current data displayed in QR

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    max-width: 400px;
                    margin: 20px;
                    text-align: center;
                }
                h2 {
                    color: #333;
                    margin-bottom: 25px;
                    font-size: 1.8em;
                }
                #qrCodeContainer {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 30px auto;
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    border-radius: 5px;
                    width: 200px; /* Adjust size as needed */
                    height: 200px; /* Adjust size as needed */
                }
                #qrCodeContainer img {
                    max-width: 100%;
                    height: auto;
                }
                #messageArea {
                    margin-top: 20px;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 0.9em;
                    min-height: 20px;
                }
                .message.success {
                    background-color: #d4edda;
                    color: #155724;
                    border-color: #c3e6cb;
                }
                .message.error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border-color: #f5c6cb;
                }
                .timer {
                    font-size: 0.8em;
                    color: #666;
                    margin-top: 15px;
                }
            </style>
            <div>
                <h2>Fichaje Móvil con QR</h2>
                <p>Escanea este código con tu dispositivo para registrar tu asistencia.</p>
                <div id="qrCodeContainer"></div>
                <div class="timer" id="qrRefreshTimer">El código se actualizará en 30 segundos.</div>
                <div id="messageArea" class="message" style="display: none;"></div>
            </div>
        `;
    }

    connectedCallback() {
        this.generateAndDisplayQRCode();
        // Refresh QR code every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.generateAndDisplayQRCode();
        }, 30000); // 30 seconds
    }

    disconnectedCallback() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // A simple function to generate a unique token for the QR code payload.
    generateToken() {
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        return `ATTENDANCE-${timestamp}-${random}`;
    }

    generateAndDisplayQRCode() {
        const qrContainer = this.shadowRoot.getElementById('qrCodeContainer');
        qrContainer.innerHTML = ''; // Clear previous QR code

        this.qrCodeData = {
            token: this.generateToken(),
            timestamp: new Date().toISOString(),
            expiry: new Date(Date.now() + 30000).toISOString() // Valid for 30 seconds
        };

        // Ensure QRCode library is loaded before use
        if (typeof window.QRCode === 'undefined') {
            console.error('QRCode library not loaded. Please ensure qrcode.min.js is included in your HTML and window.QRCode is available.');
            this.showMessage('Error: Librería de QR no cargada (window.QRCode no encontrado). Por favor, recarga la página.', 'error');
            return;
        }

        this.qrCodeInstance = new window.QRCode(qrContainer, {
            text: JSON.stringify(this.qrCodeData), // Send JSON string as QR data
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        const timerElement = this.shadowRoot.getElementById('qrRefreshTimer');
        timerElement.textContent = `El código se actualizará en 30 segundos.`;
        this.showMessage('Nuevo código QR generado. Escanéalo ahora.', 'success');
    }

    showMessage(message, type = 'info') {
        const messageArea = this.shadowRoot.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, 5000); // Hide message after 5 seconds
    }
}

customElements.define('panel-fichaje-movil', PanelFichajeMovil);
