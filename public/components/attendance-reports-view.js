class AttendanceReportsView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.records = [];
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
    }

    connectedCallback() {
        this.render();
        this.fetchUsers();
        this.fetchAttendanceReport();
    }

    async fetchUsers() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                this.users = await response.json();
                this.populateUserSelect();
            }
        } catch (error) {
            console.error("Error al cargar lista de usuarios:", error);
        }
    }

    async fetchAttendanceReport() {
        const startDate = this.shadowRoot.getElementById('startDate').value;
        const endDate = this.shadowRoot.getElementById('endDate').value;
        const userId = this.shadowRoot.getElementById('userSelect').value;

        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (userId) params.append('userId', userId);

        try {
            const response = await fetch(`/api/asistencia/reporte?${params.toString()}`);
            if (response.status === 401 || response.status === 403) {
                alert("No tiene permisos para ver este reporte.");
                return;
            }
            if (response.ok) {
                const result = await response.json();
                this.records = result.data || [];
                this.currentPage = 1;
                this.renderTable();
            } else {
                console.error("Error al obtener el reporte");
            }
        } catch (error) {
            console.error("Error en la solicitud de reporte:", error);
        }
    }

    async deleteRecord(recordId) {
        if (!confirm('¿Está seguro de que desea eliminar este registro de asistencia?')) {
            return;
        }

        try {
            const response = await fetch(`/api/asistencia/${recordId}`, {
                method: 'DELETE'
            });

            if (response.status === 401 || response.status === 403) {
                alert('No tiene permisos para eliminar este registro.');
                return;
            }

            if (response.ok) {
                alert('Registro eliminado correctamente.');
                this.fetchAttendanceReport();
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(`Error al eliminar el registro: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error al eliminar registro:', error);
            alert('Ocurrió un error al intentar eliminar el registro.');
        }
    }

    populateUserSelect() {
        const select = this.shadowRoot.getElementById('userSelect');
        select.innerHTML = '<option value="">Todos los Usuarios</option>';
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (${user.role})`;
            select.appendChild(option);
        });
    }

    renderTable() {
        const tbody = this.shadowRoot.getElementById('recordsBody');
        tbody.innerHTML = '';

        if (this.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No se encontraron registros.</td></tr>';
            this.renderPaginationControls(0);
            return;
        }

        const totalPages = Math.ceil(this.records.length / this.itemsPerPage);
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageRecords = this.records.slice(start, end);

        pageRecords.forEach(record => {
            const tr = document.createElement('tr');
            const dateObj = new Date(record.timestamp);
            const formattedDate = dateObj.toLocaleDateString('es-AR');
            const formattedTime = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const isEntry = record.action_type === 'IN';
            const actionBadge = isEntry
                ? `<span class="badge in">Entrada (IN)</span>`
                : `<span class="badge out">Salida (OUT)</span>`;

            const username = record.User ? record.User.username : `Usuario #${record.user_id}`;
            const role = record.User ? record.User.role : '-';

            tr.innerHTML = `
                <td><strong>${username}</strong> <span style="color: #666; font-size: 0.9em;">(${role})</span></td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${actionBadge}</td>
                <td>${record.device || 'MOBILE'}</td>
                <td class="no-print">
                    <button class="btn-delete" data-id="${record.id}">Eliminar</button>
                </td>
            `;

            const deleteBtn = tr.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => this.deleteRecord(record.id));

            tbody.appendChild(tr);
        });

        this.renderPaginationControls(totalPages);
    }

    renderPaginationControls(totalPages) {
        const prevBtn = this.shadowRoot.getElementById('prevPageBtn');
        const nextBtn = this.shadowRoot.getElementById('nextPageBtn');
        const pageInfo = this.shadowRoot.getElementById('pageInfo');

        if (totalPages === 0) {
            pageInfo.textContent = 'Página 0 de 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
    }

    exportCSV() {
        if (this.records.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        let csv = "Usuario,Rol,Fecha y Hora,Accion,Dispositivo\n";
        this.records.forEach(r => {
            const username = r.User ? r.User.username : r.user_id;
            const role = r.User ? r.User.role : '';
            const dateStr = new Date(r.timestamp).toLocaleString('es-AR');
            csv += `"${username}","${role}","${dateStr}","${r.action_type}","${r.device || 'MOBILE'}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_asistencia_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    printPDF() {
        // Populate print-only metadata before printing
        const startDate = this.shadowRoot.getElementById('startDate').value;
        const endDate = this.shadowRoot.getElementById('endDate').value;
        const userSelect = this.shadowRoot.getElementById('userSelect');
        const selectedUserText = userSelect.options[userSelect.selectedIndex]?.text || 'Todos';

        let filterText = `Filtros aplicados: Usuario: ${selectedUserText}`;
        if (startDate || endDate) {
            filterText += ` | Período: ${startDate || 'Inicio'} al ${endDate || 'Fin'}`;
        }

        this.shadowRoot.getElementById('printFiltersInfo').textContent = filterText;
        this.shadowRoot.getElementById('printGenerationDate').textContent = new Date().toLocaleString('es-AR');

        window.print();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 24px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #333;
                    background-color: #fcfcfc;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    border-bottom: 1px solid #eaeaea;
                    padding-bottom: 16px;
                }
                .header h2 {
                    margin: 0;
                    font-size: 22px;
                    color: #1a1a1a;
                    font-weight: 600;
                }
                .header-actions {
                    display: flex;
                    gap: 10px;
                }
                .filters {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 24px;
                    align-items: flex-end;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border: 1px solid #eaeaea;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    min-width: 150px;
                }
                label {
                    font-weight: 600;
                    margin-bottom: 6px;
                    font-size: 13px;
                    color: #555;
                }
                input, select, button {
                    padding: 10px 14px;
                    border: 1px solid #dcdcdc;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    outline: none;
                }
                input:focus, select:focus {
                    border-color: #007bff;
                    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
                }
                button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                }
                button:hover {
                    background-color: #0056b3;
                }
                button:disabled {
                    background-color: #e0e0e0;
                    color: #a0a0a0;
                    cursor: not-allowed;
                }
                button.export {
                    background-color: #28a745;
                }
                button.export:hover {
                    background-color: #218838;
                }
                button.print {
                    background-color: #6c757d;
                }
                button.print:hover {
                    background-color: #5a6268;
                }
                button.btn-delete {
                    background-color: #fff;
                    color: #dc3545;
                    border: 1px solid #dc3545;
                    padding: 6px 12px;
                    font-size: 12px;
                    border-radius: 4px;
                }
                button.btn-delete:hover {
                    background-color: #dc3545;
                    color: #fff;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid #eaeaea;
                }
                th, td {
                    padding: 14px 16px;
                    text-align: left;
                    border-bottom: 1px solid #f0f0f0;
                }
                th {
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #444;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                .badge {
                    padding: 4px 10px;
                    border-radius: 50px;
                    color: white;
                    font-size: 11px;
                    font-weight: 600;
                    display: inline-block;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .badge.in {
                    background-color: #28a745;
                }
                .badge.out {
                    background-color: #dc3545;
                }
                .pagination {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 12px;
                    margin-top: 20px;
                }
                .print-header {
                    display: none;
                }

                /* High-quality UX Print Stylesheet */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm 15mm 15mm 15mm;
                    }
                    :host {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                    body {
                        background: white !important;
                        color: #000 !important;
                    }
                    /* Hide interactive elements and actions column */
                    .filters, button, .header, .pagination, .no-print {
                        display: none !important;
                    }
                    /* Show elegant print header */
                    .print-header {
                        display: block !important;
                        margin-bottom: 25px;
                        border-bottom: 2px solid #1a1a1a;
                        padding-bottom: 12px;
                    }
                    .print-header h1 {
                        margin: 0;
                        font-size: 24px;
                        color: #1a1a1a;
                        font-weight: 700;
                    }
                    .print-header p {
                        margin: 6px 0 0 0;
                        font-size: 11px;
                        color: #555;
                    }
                    /* Table styling optimized for print */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        box-shadow: none !important;
                        border: 1px solid #ccc !important;
                        font-size: 11px !important;
                    }
                    th, td {
                        padding: 10px 12px !important;
                        border: 1px solid #ddd !important;
                    }
                    th {
                        background-color: #f5f5f5 !important;
                        color: #000 !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Clean, ink-friendly badges for print */
                    .badge {
                        background: transparent !important;
                        padding: 2px 6px !important;
                        font-size: 10px !important;
                        border-radius: 4px !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .badge.in {
                        border: 1px solid #28a745 !important;
                        color: #1e7e34 !important;
                    }
                    .badge.out {
                        border: 1px solid #dc3545 !important;
                        color: #bd2130 !important;
                    }
                }
            </style>

            <!-- Print-Only Header -->
            <div class="print-header">
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1>Reporte de Asistencia y Fichajes</h1>
                        <p id="printFiltersInfo"></p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0;">Generado el: <span id="printGenerationDate"></span></p>
                    </div>
                </div>
            </div>

            <div class="header">
                <h2>Reporte de Asistencias y Fichajes</h2>
                <div class="header-actions">
                    <button class="export" id="btnExport">Exportar a CSV/Excel</button>
                    <button class="print" id="btnPrint">Imprimir / PDF</button>
                </div>
            </div>

            <div class="filters">
                <div class="filter-group">
                    <label for="startDate">Fecha Desde:</label>
                    <input type="date" id="startDate">
                </div>
                <div class="filter-group">
                    <label for="endDate">Fecha Hasta:</label>
                    <input type="date" id="endDate">
                </div>
                <div class="filter-group">
                    <label for="userSelect">Usuario:</label>
                    <select id="userSelect">
                        <option value="">Todos los Usuarios</option>
                    </select>
                </div>
                <button id="btnFilter">Filtrar</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Fecha y Hora</th>
                        <th>Acción</th>
                        <th>Dispositivo</th>
                        <th class="no-print">Acciones</th>
                    </tr>
                </thead>
                <tbody id="recordsBody">
                    <tr><td colspan="5" style="text-align:center;">Cargando registros...</td></tr>
                </tbody>
            </table>

            <div class="pagination">
                <button id="prevPageBtn">Anterior</button>
                <span id="pageInfo">Página 1 de 1</span>
                <button id="nextPageBtn">Siguiente</button>
            </div>
        `;

        this.shadowRoot.getElementById('btnFilter').addEventListener('click', () => this.fetchAttendanceReport());
        this.shadowRoot.getElementById('btnExport').addEventListener('click', () => this.exportCSV());
        this.shadowRoot.getElementById('btnPrint').addEventListener('click', () => this.printPDF());

        this.shadowRoot.getElementById('prevPageBtn').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTable();
            }
        });

        this.shadowRoot.getElementById('nextPageBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(this.records.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTable();
            }
        });
    }
}

customElements.define('attendance-reports-view', AttendanceReportsView);
