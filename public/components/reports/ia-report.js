class ReporteInteligente extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.datos = [];
    this.descripcion = '';
  }

  connectedCallback() {
    this.render();
    this.shadowRoot.querySelector('#btn-buscar').addEventListener('click', () => this.cargarReporte());
  }

  async cargarReporte() {
    const input = this.shadowRoot.querySelector('#prompt-input').value;
    if (!input) return;

    try {
      this.shadowRoot.querySelector('#loading').textContent = "Generando reporte inteligente...";
      
      const response = await fetch('/api/sql-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language_query: input, hotelId: 1 }) // El hotelId vendría de tu sesión
      });
      
      const res = await response.json();
      this.datos = res.datos || [];
      this.descripcion = res.descripcion || '';
      
      this.renderResultados();
    } catch (err) {
      this.shadowRoot.querySelector('#loading').textContent = "Error al generar el reporte.";
    }
  }

  renderResultados() {
    const container = this.shadowRoot.querySelector('#resultados');
    container.innerHTML = `<p><strong>Reporte:</strong> ${this.descripcion}</p>`;

    if (this.datos.length === 0) {
      container.innerHTML += '<p>No se encontraron registros para esta consulta.</p>';
      return;
    }

    // Extraemos las columnas dinámicamente según las propiedades del primer objeto
    const columnas = Object.keys(this.datos[0]);

    let tablaHTML = `
      <style>
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; text-transform: capitalize; }
      </style>
      <table>
        <thead>
          <tr>${columnas.map(col => `<th>${col.replace('_', ' ')}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${this.datos.map(fila => `
            <tr>${columnas.map(col => `<td>${fila[col] !== null ? fila[col] : '-'}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    this.shadowRoot.querySelector('#loading').textContent = "";
    container.innerHTML += tablaHTML;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .control { display: flex; gap: 10px; margin-bottom: 15px; }
        input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        button { padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
      </style>
      <div>
        <h3>🔍 Asistente de Reportes Inteligentes</h3>
        <div class="control">
          <input id="prompt-input" type="text" placeholder="Ej: ¿Cuánto gastamos este mes en mantenimiento agrupado por categoría?">
          <button id="btn-buscar">Generar</button>
        </div>
        <div id="loading"></div>
        <div id="resultados"></div>
      </div>
    `;
  }
}

customElements.define('ia-report', ReporteInteligente);
