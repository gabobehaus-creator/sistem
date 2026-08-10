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
                    border-radius: 16px;
                    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
                    max-width: 480px;
                    margin: 20px auto;
                    text-align: center;
                    font-family: Arial, sans-serif;
                }
                h2 {
                    color: #1a1a1a;
                    margin-bottom: 10px;
                    font-size: 1.8em;
                }
                p {
                    color: #555;
                    font-size: 0.95em;
                    line-height: 1.4;
                }
                #qrCodeContainer {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 20px auto;
                    padding: 20px;
                    background-color: #ffffff;
                    border: 4px solid #000000;
                    border-radius: 16px;
                    width: 340px;
                    height: 340px;
                    box-sizing: border-box;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                #qrCodeContainer img, #qrCodeContainer canvas {
                    width: 100% !important;
                    height: 100% !important;
                    display: block;
                    image-rendering: pixelated;
                }
                #messageArea {
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 0.9em;
                    min-height: 20px;
                }
                .message.success {
                    background-color: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .message.error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .timer {
                    font-size: 0.9em;
                    color: #444;
                    margin-top: 15px;
                    font-weight: bold;
                }
                .direct-link {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                .btn-fichar {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    text-decoration: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 0.9em;
                    transition: background-color 0.2s;
                }
                .btn-fichar:hover {
                    background-color: #0056b3;
                }
            </style>
            <div>
                <h2>Fichaje Móvil con QR</h2>
                <p>Escanea este código con la cámara de tu teléfono para registrar tu asistencia.</p>
                <div id="qrCodeContainer"></div>
                <div class="timer" id="qrRefreshTimer">El código se actualizará en 30 segundos.</div>
                <div id="messageArea" class="message" style="display: none;"></div>
                <div class="direct-link">
                    <p style="margin-bottom: 8px; font-size: 0.85em; color: #666;">¿Problemas con la cámara?</p>
                    <a id="directLink" class="btn-fichar" href="#" target="_blank">Fichar directamente aquí</a>
                </div>
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

    // Un token de solo 6 caracteres hexadecimales para generar la menor matriz de QR posible
    generateToken() {
        return Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    generateAndDisplayQRCode() {
        const qrContainer = this.shadowRoot.getElementById('qrCodeContainer');
        qrContainer.innerHTML = ''; // Clear previous QR code

        const token = this.generateToken();
        
        // URL con el parámetro 'token' esperado por attendance-marker-component.js
        this.qrCodeData = `${window.location.origin}/attendance-marker.html?token=${token}`;

        // Actualizar enlace directo de respaldo para teléfonos con cámaras defectuosas
        const directLink = this.shadowRoot.getElementById('directLink');
        if (directLink) {
            directLink.href = this.qrCodeData;
        }

        // Ensure QRCode library is loaded before use
        if (typeof window.QRCode === 'undefined') {
            console.error('QRCode library not loaded.');
            this.showMessage('Error: Librería de QR no cargada. Por favor, recarga la página.', 'error');
            return;
        }

        // Renderizado de alta definición con baja densidad de puntos (CorrectLevel.L para cuadros grandes y fáciles de leer)
        this.qrCodeInstance = new window.QRCode(qrContainer, {
            text: this.qrCodeData,
            width: 400,
            height: 400,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.L 
        });

        const timerElement = this.shadowRoot.getElementById('qrRefreshTimer');
        timerElement.textContent = `El código se actualizará en 30 segundos.`;
        this.showMessage('Nuevo código QR generado.', 'success');
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
