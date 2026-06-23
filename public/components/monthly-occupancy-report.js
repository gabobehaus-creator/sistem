class MonthlyOccupancyReport extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentYear = new Date().getFullYear();
        this.reportData = null; // Para almacenar los datos del reporte
        this.chart = null; // Para almacenar la instancia de Chart.js

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: Arial, sans-serif;
                    background-color: #f4f7f6;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .header h2 {
                    color: #333;
                    margin: 0;
                }
                .year-selector label {
                    font-weight: bold;
                    margin-right: 10px;
                    color: #555;
                }
                .year-selector select {
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 1rem;
                    background-color: #fff;
                    cursor: pointer;
                    transition: border-color 0.2s;
                }
                .year-selector select:hover {
                    border-color: #007bff;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    background-color: #fff;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                th, td {
                    border: 1px solid #e0e0e0;
                    padding: 12px 15px;
                    text-align: left;
                }
                th {
                    background-color: #007bff;
                    color: white;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 0.9em;
                }
                tr:nth-child(even) {
                    background-color: #f8f8f8;
                }
                tr:hover {
                    background-color: #f1f1f1;
                }
                tfoot tr {
                    background-color: #e9ecef;
                    font-weight: bold;
                }
                .summary {
                    margin-top: 20px;
                    padding: 15px;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    border-left: 5px solid #007bff;
                }
                .summary p {
                    margin: 5px 0;
                    color: #333;
                }
                .chart-container {
                    margin-top: 30px;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                canvas {
                    max-width: 100%;
                    height: 400px;
                }
                .message {
                    padding: 10px;
                    margin-top: 15px;
                    border-radius: 4px;
                    font-weight: bold;
                }
                .message.error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .loading {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 1.2em;
                    color: #666;
                }
            </style>
            <div class="header">
                <h2>Reporte de Ocupación Mensual</h2>
                <div class="year-selector">
                    <label for="yearSelect">Año:</label>
                    <select id="yearSelect"></select>
                </div>
            </div>
            <div id="messageArea" class="message" style="display: none;"></div>
            <div id="loading" class="loading" style="display: none;">Cargando reporte...</div>
            <div id="reportContent">
                <table>
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Noches Ocupadas</th>
                            <th>Noches Disponibles</th>
                            <th>% Ocupación</th>
                        </tr>
                    </thead>
                    <tbody id="reportTableBody">
                    </tbody>
                    <tfoot id="reportTableFoot">
                    </tfoot>
                </table>
                <div id="annualSummary" class="summary"></div>
                <div class="chart-container">
                    <h3>Gráfico de Ocupación Mensual</h3>
                    <canvas id="occupancyChart"></canvas>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.populateYearDropdown();
        this.shadowRoot.getElementById('yearSelect').addEventListener('change', this.handleYearChange.bind(this));
        // Dynamically load Chart.js if not already present
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                this.fetchReportData();
            };
            this.shadowRoot.appendChild(script);
        } else {
            this.fetchReportData();
        }
    }

    populateYearDropdown() {
        const yearSelect = this.shadowRoot.getElementById('yearSelect');
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) { // Last 5 years
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === this.currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    handleYearChange(event) {
        this.currentYear = parseInt(event.target.value, 10);
        this.fetchReportData();
    }

    async fetchReportData() {
        this.showMessage('', 'none'); // Clear previous messages
        this.shadowRoot.getElementById('loading').style.display = 'block'; // Show loading indicator
        this.shadowRoot.getElementById('reportContent').style.display = 'none'; // Hide content while loading

        try {
            const response = await fetch(`/api/reports/monthly-occupancy?year=${this.currentYear}`);
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/'; // Redirect to login if not authenticated
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.message === "success") {
                this.reportData = data.data;
                this.renderReport();
            } else {
                throw new Error(data.error || "Error al cargar el reporte.");
            }
        } catch (error) {
            console.error("Error fetching monthly occupancy report:", error);
            this.showMessage(`Error al cargar el reporte: ${error.message}`, 'error');
            this.shadowRoot.getElementById('reportTableBody').innerHTML = '';
            this.shadowRoot.getElementById('reportTableFoot').innerHTML = '';
            this.shadowRoot.getElementById('annualSummary').innerHTML = '';
            if (this.chart) this.chart.destroy(); // Clear chart on error
        } finally {
            this.shadowRoot.getElementById('loading').style.display = 'none'; // Hide loading indicator
            this.shadowRoot.getElementById('reportContent').style.display = 'block'; // Show content (even if empty/error)
        }
    }

    renderReport() {
        const tableBody = this.shadowRoot.getElementById('reportTableBody');
        const tableFoot = this.shadowRoot.getElementById('reportTableFoot');
        const annualSummaryDiv = this.shadowRoot.getElementById('annualSummary');

        tableBody.innerHTML = '';
        tableFoot.innerHTML = '';
        annualSummaryDiv.innerHTML = '';

        if (!this.reportData || !this.reportData.monthly_data || this.reportData.monthly_data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No hay datos de ocupación para el año seleccionado.</td></tr>';
            return;
        }

        this.reportData.monthly_data.forEach(monthData => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${monthData.month}</td>
                <td>${monthData.occupied_nights.toFixed(2)}</td>
                <td>${monthData.total_available_nights}</td>
                <td>${monthData.occupancy_percentage.toFixed(2)}%</td>
            `;
            tableBody.appendChild(row);
        });

        // Annual Summary
        const summary = this.reportData.annual_summary;
        if (summary) {
            tableFoot.innerHTML = `
                <tr>
                    <td><strong>Totales / Promedio Anual</strong></td>
                    <td><strong>${summary.total_occupied_nights.toFixed(2)}</strong></td>
                    <td><strong>${summary.total_available_nights}</strong></td>
                    <td><strong>${summary.overall_occupancy_percentage.toFixed(2)}%</strong></td>
                </tr>
            `;

            annualSummaryDiv.innerHTML = `
                <p><strong>Total Noches Ocupadas (Año):</strong> ${summary.total_occupied_nights.toFixed(2)}</p>
                <p><strong>Total Noches Disponibles (Año):</strong> ${summary.total_available_nights}</p>
                <p><strong>Promedio Noches Ocupadas por Mes:</strong> ${summary.average_occupied_nights_per_month.toFixed(2)}</p>
                <p><strong>% Ocupación Anual:</strong> ${summary.overall_occupancy_percentage.toFixed(2)}%</p>
            `;
        }

        this.renderChart();
    }

    renderChart() {
        const ctx = this.shadowRoot.getElementById('occupancyChart').getContext('2d');
        if (this.chart) {
            this.chart.destroy(); // Destroy existing chart before creating a new one
        }

        const months = this.reportData.monthly_data.map(d => d.month);
        const occupancyPercentages = this.reportData.monthly_data.map(d => d.occupancy_percentage);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: '% Ocupación Mensual',
                    data: occupancyPercentages,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Porcentaje de Ocupación (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Mes'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Ocupación Mensual para el Año ${this.currentYear}`
                    }
                }
            }
        });
    }

    showMessage(message, type) {
        const messageArea = this.shadowRoot.getElementById('messageArea');
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
        messageArea.style.display = type === 'none' ? 'none' : 'block';
    }
}

// Custom element definition.
// The Chart.js library is loaded dynamically in connectedCallback if not already present.
customElements.define('monthly-occupancy-report', MonthlyOccupancyReport);
