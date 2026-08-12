class AttendanceMarkerComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.userName = '';
        this.lastAttendance = null; // To store last attendance type (e.g., 'ingreso', 'egreso')
        this.qrToken = null;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: #ffffff;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    max-width: 500px;
                    margin: 20px;
                    text-align: center;
                }
                h2 {
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 2em;
                }
                p {
                    color: #555;
                    font-size: 1.1em;
                    margin-bottom: 25px;
                }
                .buttons-container {
                    margin-top: 30px;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 5px;
                    font-size: 1.1em;
                    cursor: pointer;
                    margin: 0 10px;
                    transition: background-color 0.3s ease;
                }
                button:hover {
                    background-color: #0056b3;
                }
                button:disabled {
                    background-color: #cccccc;
                    cursor: not-allowed;
                }
                #messageArea {
                    margin-top: 25px;
                    padding: 15px;
                    border-radius: 5px;
                    font-size: 1em;
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
                .message.info {
                    background-color: #e2e3e5;
                    color: #383d41;
                    border-color: #d6d8db;
                }
                .welcome-message {
                    font-size: 1.3em;
                    color: #007bff;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
            </style>
            <div>
                <h2>Marcar Asistencia</h2>
                <div id="welcomeUser" class="welcome-message"></div>
                <p id="instructionText">Por favor, selecciona si deseas registrar tu ingreso o egreso.</p>
                <div id="buttonsContainer" class="buttons-container">
                    <button id="checkInButton" disabled>Marcar Ingreso</button>
                    <button id="checkOutButton" disabled>Marcar Egreso</button>
                </div>
                <div id="messageArea" class="message" style="display: none;"></div>
            </div>
        `;

        this.shadowRoot.getElementById('checkInButton').addEventListener('click', () => this.markAttendance('ingreso'));
        this.shadowRoot.getElementById('checkOutButton').addEventListener('click', () => this.markAttendance('egreso'));
    }

    connectedCallback() {
        this.checkAuthAndToken();
    }

    async checkAuthAndToken() {
        // Extract the token from the QR code URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        this.qrToken = urlParams.get('token');

        if (!this.qrToken) {
            // Si no viene con token QR (ej. ingreso manual desde el navegador), ir siempre al login
            window.location.href = '/';
            return;
        }

        const redirectToLogin = () => {
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/?redirect_to=${currentPath}`;
        };

        // Check if the user is authenticated and get their last attendance status, passing the token
        try {
            const response = await fetch(`/api/attendance/status?token=${encodeURIComponent(this.qrToken)}`);
            
            if (response.status === 401 || response.status === 403) {
                // Not authenticated or session missing, redirect to login page
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                // Si la respuesta no es OK y es un posible fallo de autenticación/sesión, redirigir al login
                redirectToLogin();
                return;
            }

            const data = await response.json();
            if (!data || !data.user) {
                redirectToLogin();
                return;
            }

            this.userName = data.user.username;
            this.lastAttendance = data.lastAttendanceType; // 'IN', 'OUT', or null
            this.updateUI();
            this.showMessage(`Bienvenido, ${this.userName}.`, 'info');

        } catch (error) {
            console.error('Error checking authentication status:', error);
            // Ante cualquier fallo en la verificación de estado/sesión por primera vez, redirigir al login
            redirectToLogin();
        }
    }

    updateUI() {
        const welcomeUserElement = this.shadowRoot.getElementById('welcomeUser');
        welcomeUserElement.textContent = `¡Hola, ${this.userName}!`;

        const checkInButton = this.shadowRoot.getElementById('checkInButton');
        const checkOutButton = this.shadowRoot.getElementById('checkOutButton');

        checkInButton.disabled = false;
        checkOutButton.disabled = false;

        if (this.lastAttendance === 'IN') { // Note: Backend returns 'IN'/'OUT', frontend uses 'ingreso'/'egreso'
            checkInButton.disabled = true; // Cannot check-in again if last was ingreso
            this.showMessage('Tu último registro fue un ingreso. Puedes marcar egreso.', 'info');
        } else if (this.lastAttendance === 'OUT') { // Note: Backend returns 'IN'/'OUT', frontend uses 'ingreso'/'egreso'
            checkOutButton.disabled = true; // Cannot check-out again if last was egreso
            this.showMessage('Tu último registro fue un egreso. Puedes marcar ingreso.', 'info');
        } else if (this.lastAttendance === null) {
            checkOutButton.disabled = true; // Cannot check-out if never checked in
            this.showMessage('Es tu primer registro del día. Por favor, marca tu ingreso.', 'info');
        }
    }

    disableButtons() {
        this.shadowRoot.getElementById('checkInButton').disabled = true;
        this.shadowRoot.getElementById('checkOutButton').disabled = true;
    }

    async markAttendance(type) {
        this.showMessage(`Registrando ${type}...`, 'info');
        this.disableButtons(); // Disable buttons to prevent double-submitting

        try {
            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type: type, token: this.qrToken }),
            });

            if (response.status === 401 || response.status === 403) {
                const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/?redirect_to=${currentPath}`;
                return;
            }

            const data = await response.json();

            if (response.ok) {
                // Ocultar botones e instrucciones para no generar confusión
                const buttonsContainer = this.shadowRoot.getElementById('buttonsContainer');
                const instructionText = this.shadowRoot.getElementById('instructionText');
                if (buttonsContainer) buttonsContainer.style.display = 'none';
                if (instructionText) instructionText.style.display = 'none';

                const successText = `${data.message || 'Asistencia registrada correctamente.'} Ya puedes cerrar esta ventana.`;
                this.showMessage(successText, 'success');

                this.lastAttendance = (type === 'ingreso' ? 'IN' : 'OUT'); 
            } else {
                this.showMessage(data.message || 'Error al registrar asistencia.', 'error');
                this.updateUI(); // Re-enable buttons if there was an error
            }
        } catch (error) {
            console.error('Error marking attendance:', error);
            this.showMessage('Error de conexión al registrar asistencia.', 'error');
            this.updateUI(); // Re-enable buttons if there was a connection error
        }
    }

    showMessage(message, type = 'info') {
        const messageArea = this.shadowRoot.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = 'block';

        // Do not auto-hide error or success messages
        if (type !== 'error' || type !== 'success') {
            setTimeout(() => {
                messageArea.style.display = 'none';
            }, 5000);
        }
    }
}

customElements.define('attendance-marker-component', AttendanceMarkerComponent);
