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
                    max-width: 90%;
                    max-height: 50vh;
                    margin-top: 30px;
                    padding: 20px;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                canvas {
                    max-width: 100%;
                    height: 350px; /* Reduced chart height */
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
                /* New styles for download buttons and report controls */
                .report-controls {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    justify-content: flex-end; /* Align buttons to the right */
                }
                .report-controls button {
                    padding: 10px 15px;
                    background-color: #28a745; /* Green for success/download */
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background-color 0.2s ease;
                }
                .report-controls button:hover {
                    background-color: #218838;
                }
                .report-controls button:active {
                    background-color: #1e7e34;
                }
                .report-content {
                    margin-top: 20px;
                }
                /* Dark mode adjustments */
                :host-context(html.dark-mode) {
                    background-color: #282c34;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }
                :host-context(html.dark-mode) .header h2 {
                    color: #e0e0e0;
                }
                :host-context(html.dark-mode) .year-selector label {
                    color: #ccc;
                }
                :host-context(html.dark-mode) .year-selector select {
                    background-color: #4a4f59;
                    color: #e0e0e0;
                    border-color: #666;
                }
                :host-context(html.dark-mode) table {
                    background-color: #3a3f4a;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                :host-context(html.dark-mode) th, :host-context(html.dark-mode) td {
                    border-color: #555;
                    color: #e0e0e0;
                }
                :host-context(html.dark-mode) th {
                    background-color: var(--primary-color); /* Use primary color from global CSS */
                    color: white;
                }
                :host-context(html.dark-mode) tr:nth-child(even) {
                    background-color: #3a3f4a; /* Darker even rows */
                }
                :host-context(html.dark-mode) tr:hover {
                    background-color: #4a4f59;
                }
                :host-context(html.dark-mode) tfoot tr {
                    background-color: #2b3038;
                    color: #f0f0f0;
                }
                :host-context(html.dark-mode) .summary {
                    background-color: #2b3038;
                    border-left-color: var(--primary-color);
                }
                :host-context(html.dark-mode) .summary p {
                    color: #f0f0f0;
                }
                :host-context(html.dark-mode) .chart-container {
                    background-color: #3a3f4a;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }
                :host-context(html.dark-mode) .message.error {
                    background-color: #5b3636;
                    color: #ffcccc;
                    border-color: #f44336;
                }
                :host-context(html.dark-mode) .report-controls button {
                    background-color: #388e3c; /* Darker green for dark mode */
                }
                :host-context(html.dark-mode) .report-controls button:hover {
                    background-color: #2e7d32;
                }
            </style>
            <div class="header">
                <h2>Reporte de Ocupación Mensual</h2>
                <div class="year-selector">
                    <label for="yearSelect">Año:</label>
                    <select id="yearSelect"></select>
                </div>
            </div>
            <div class="report-controls">
                <button id="downloadExcelButton">Descargar Excel</button>
                <button id="downloadPdfButton">Descargar PDF</button>
            </div>
            <div id="messageArea" class="message" style="display: none;"></div>
            <div id="loading" class="loading" style="display: none;">Cargando reporte...</div>
            <div id="reportContent" class="report-content">
                <div id="reportPrintArea">
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
            </div>
        `;
    }

    connectedCallback() {
        this.populateYearDropdown();
        this.shadowRoot.getElementById('yearSelect').addEventListener('change', this.handleYearChange.bind(this));
        
        // Add event listeners for download buttons
        this.shadowRoot.getElementById('downloadExcelButton').addEventListener('click', this.downloadExcelReport.bind(this));
        this.shadowRoot.getElementById('downloadPdfButton').addEventListener('click', this.downloadPdfReport.bind(this));

        // Dynamically load Chart.js, XLSX, and html2pdf.js, then fetch data
        this._loadRequiredScripts().then(() => {
            this.fetchReportData();
        }).catch(error => {
            console.error("Failed to load report dependencies:", error);
            this.showMessage("Error al cargar las librerías necesarias para el reporte.", 'error');
        });
    }

    async _loadRequiredScripts() {
        const scriptsToLoad = [];

        // Only add script to list if it's not globally available and not already in shadow DOM
        const addScriptIfMissing = (src, globalVarName) => {
            if (typeof window[globalVarName] === 'undefined' && !this.shadowRoot.querySelector(`script[src="${src}"]`)) {
                scriptsToLoad.push(src);
            }
        };

        addScriptIfMissing('https://cdn.jsdelivr.net/npm/chart.js', 'Chart');
        addScriptIfMissing('https://unpkg.com/xlsx/dist/xlsx.full.min.js', 'XLSX');
        addScriptIfMissing('https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js', 'html2pdf');
        
        for (const src of scriptsToLoad) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                this.shadowRoot.appendChild(script);
            });
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
                    <td><strong>${summary.total_available_nights.toFixed(2)}</strong></td>
                    <td><strong>${summary.overall_occupancy_percentage.toFixed(2)}%</strong></td>
                </tr>
            `;

            annualSummaryDiv.innerHTML = `
                <p><strong>Total Noches Ocupadas (Año):</strong> ${summary.total_occupied_nights.toFixed(2)}</p>
                <p><strong>Total Noches Disponibles (Año):</strong> ${summary.total_available_nights.toFixed(2)}</p>
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

    downloadExcelReport() {
        if (!this.reportData || !this.reportData.monthly_data || typeof XLSX === 'undefined') {
            this.showMessage("No hay datos para exportar o la librería de Excel no está cargada.", 'error');
            return;
        }

        const ws_data = [];
        // Headers
        ws_data.push(['Mes', 'Noches Ocupadas', 'Noches Disponibles', '% Ocupación']);

        // Monthly data
        this.reportData.monthly_data.forEach(monthData => {
            ws_data.push([
                monthData.month,
                parseFloat(monthData.occupied_nights.toFixed(2)),
                parseFloat(monthData.total_available_nights.toFixed(2)),
                `${monthData.occupancy_percentage.toFixed(2)}%`
            ]);
        });

        // Annual Summary
        const summary = this.reportData.annual_summary;
        if (summary) {
            ws_data.push([]); // Empty row for spacing
            ws_data.push(['Totales / Promedio Anual', parseFloat(summary.total_occupied_nights.toFixed(2)), parseFloat(summary.total_available_nights.toFixed(2)), `${summary.overall_occupancy_percentage.toFixed(2)}%`]);
            ws_data.push([]);
            ws_data.push([`Resumen Anual ${this.currentYear}`]);
            ws_data.push(['Total Noches Ocupadas (Año)', parseFloat(summary.total_occupied_nights.toFixed(2))]);
            ws_data.push(['Total Noches Disponibles (Año)', parseFloat(summary.total_available_nights.toFixed(2))]);
            ws_data.push(['Promedio Noches Ocupadas por Mes', parseFloat(summary.average_occupied_nights_per_month.toFixed(2))]);
            ws_data.push(['% Ocupación Anual', `${summary.overall_occupancy_percentage.toFixed(2)}%`]);
        }

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Ocupacion_${this.currentYear}`);

        XLSX.writeFile(wb, `ReporteOcupacionMensual_${this.currentYear}.xlsx`);
        this.showMessage('Reporte Excel generado exitosamente.', 'success');
    }

    downloadPdfReport() {
        if (!this.reportData || !this.reportData.monthly_data || typeof html2pdf === 'undefined') {
            this.showMessage("No hay datos para exportar o la librería de PDF no está cargada.", 'error');
            return;
        }

        const element = this.shadowRoot.getElementById('reportPrintArea');
        const filename = `ReporteOcupacionMensual_${this.currentYear}.pdf`;

        // Create a temporary container for PDF generation, adding a title
        const pdfWrapper = document.createElement('div');
        pdfWrapper.style.padding = '10mm';
        pdfWrapper.style.fontFamily = 'Arial, sans-serif'; // Ensure font consistency

        const title = document.createElement('h2');
        title.textContent = `Reporte de Ocupación Mensual - Año ${this.currentYear}`;
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        pdfWrapper.appendChild(title);

        // Clone the content of reportPrintArea and append it to pdfWrapper
        pdfWrapper.appendChild(element.cloneNode(true));

        const options = {
            margin: [10, 10, 10, 10], // top, left, bottom, right in mm
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: false, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(pdfWrapper).set(options).save().then(() => {
            this.showMessage('Reporte PDF generado exitamente.', 'success');
        }).catch(error => {
            console.error("Error generating PDF:", error);
            this.showMessage(`Error al generar el reporte PDF: ${error.message}`, 'error');
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
customElements.define('monthly-occupancy-report', MonthlyOccupancyReport);
