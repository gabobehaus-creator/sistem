class RoomDetails extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.addEvents();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .trigger {
          color: blue;
          text-decoration: underline;
          cursor: pointer;
        }
        .modal {
          display: none; /* Oculto por defecto */
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: white;
          padding: 20px;
          border: 1px solid #ccc;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          z-index: 1000;
        }
        .modal.active {
          display: block; /* Mostrar modal */
        }
        .overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 999;
        }
        .overlay.active {
          display: block;
        }
      </style>
      <span class="trigger">Pasa el ratón sobre mí</span>
      <div class="overlay"></div>
      <div class="modal">
        <p>¡Este es el contenido del modal!</p>
      </div>
    `;
  }

  addEvents() {
    const trigger = this.shadowRoot.querySelector('.trigger');
    const modal = this.shadowRoot.querySelector('.modal');
    const overlay = this.shadowRoot.querySelector('.overlay');

    const showModal = () => {
      modal.classList.add('active');
      overlay.classList.add('active');
    };

    const hideModal = () => {
      modal.classList.remove('active');
      overlay.classList.remove('active');
    };

    // Eventos mouseover y mouseout
    trigger.addEventListener('mouseover', showModal);
    trigger.addEventListener('mouseout', hideModal);
  }
}

customElements.define('room-details', RoomDetails);
