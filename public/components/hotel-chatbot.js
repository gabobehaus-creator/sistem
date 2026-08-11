class HotelChatbot extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isOpen = false;
        this.render();
    }

    connectedCallback() {
        this.setupListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .chat-toggle {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .chat-container {
                    position: fixed;
                    bottom: 90px;
                    right: 20px;
                    width: 350px;
                    height: 450px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    z-index: 1000;
                    display: none;
                }
                .chat-container.open {
                    display: flex;
                }
                .chat-header {
                    background: #007bff;
                    color: white;
                    padding: 15px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                }
                .chat-messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #f8f9fa;
                }
                .message {
                    padding: 10px;
                    border-radius: 8px;
                    max-width: 80%;
                    word-break: break-word;
                    font-size: 14px;
                }
                .message.user {
                    background: #007bff;
                    color: white;
                    align-self: flex-end;
                }
                .message.bot {
                    background: #e9ecef;
                    color: #333;
                    align-self: flex-start;
                }
                .chat-input-area {
                    display: flex;
                    padding: 10px;
                    background: white;
                    border-top: 1px solid #ddd;
                }
                .chat-input-area input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    outline: none;
                }
                .chat-input-area button {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    margin-left: 5px;
                    border-radius: 4px;
                    cursor: pointer;
                }
            </style>

            <button class="chat-toggle" id="toggleBtn">💬</button>

            <div class="chat-container" id="chatContainer">
                <div class="chat-header">
                    <span>Asistente Hotelero IA</span>
                    <button class="close-btn" id="closeBtn">✕</button>
                </div>
                <div class="chat-messages" id="messageArea">
                    <div class="message bot">¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy con las habitaciones, facturación o reportes?</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" id="userInput" placeholder="Escribe tu consulta...">
                    <button id="sendBtn">Enviar</button>
                </div>
            </div>
        `;
    }

    setupListeners() {
        const toggleBtn = this.shadowRoot.getElementById('toggleBtn');
        const closeBtn = this.shadowRoot.getElementById('closeBtn');
        const chatContainer = this.shadowRoot.getElementById('chatContainer');
        const sendBtn = this.shadowRoot.getElementById('sendBtn');
        const userInput = this.shadowRoot.getElementById('userInput');

        toggleBtn.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            chatContainer.classList.toggle('open', this.isOpen);
        });

        closeBtn.addEventListener('click', () => {
            this.isOpen = false;
            chatContainer.classList.remove('open');
        });

        const handleSend = async () => {
            const text = userInput.value.trim();
            if (!text) return;

            this.appendMessage(text, 'user');
            userInput.value = '';

            try {
                const response = await fetch('/api/chatbot/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });

                const data = await response.json();
                if (response.ok) {
                    this.appendMessage(data.reply, 'bot');
                } else {
                    this.appendMessage('Error: ' + (data.error || 'No se pudo conectar.'), 'bot');
                }
            } catch (err) {
                console.error(err);
                this.appendMessage('Error de red al comunicarse con el asistente.', 'bot');
            }
        };

        sendBtn.addEventListener('click', handleSend);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    appendMessage(text, sender) {
        const messageArea = this.shadowRoot.getElementById('messageArea');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = text;
        messageArea.appendChild(msgDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}

customElements.define('hotel-chatbot', HotelChatbot);
