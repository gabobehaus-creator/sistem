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
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
                    max-width: 480px;
                    margin: 20px auto;
                    text-align: center;
                }
                h2 {
                    color: #333;
                    margin-bottom: 15px;
                    font-size: 1.8em;
                }
                #qrCodeContainer {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 25px auto;
                    padding: 24px;
                    background-color: #ffffff;
                    border: 3px solid #111111;
                    border-radius: 12px;
                    width: 320px;
                    height: 320px;
                    box-sizing: border-box;
                }
                #qrCodeContainer img, #qrCodeContainer canvas {
                    max-width: 100%;
                    height: auto;
                    display: block;
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
                    font-size: 0.85em;
                    color: #666;
                    margin-top: 15px;
                    font-weight: 500;
                }
            </style>
            <div>
                <h2>Fichaje Móvil con QR</h2>
                <p>Escanea este código con la cámara de tu teléfono para registrar tu asistencia.</p>
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

    // Un token compacto y corto
    generateToken() {
        return Math.random().toString(36).substring(2, 10);
    }

    generateAndDisplayQRCode() {
        const qrContainer = this.shadowRoot.getElementById('qrCodeContainer');
        qrContainer.innerHTML = ''; // Clear previous QR code

        const token = this.generateToken();
        // Usamos una URL corta para minimizar la densidad de puntos del QR
        this.qrCodeData = `${window.location.origin}/attendance-marker.html?t=${token}`;

        // Ensure QRCode library is loaded before use
        if (typeof window.QRCode === 'undefined') {
            console.error('QRCode library not loaded.');
            this.showMessage('Error: Librería de QR no cargada. Por favor, recarga la página.', 'error');
            return;
        }

        this.qrCodeInstance = new window.QRCode(qrContainer, {
            text: this.qrCodeData,
            width: 270,
            height: 270,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.L // Nivel bajo de corrección = Puntos más grandes
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
