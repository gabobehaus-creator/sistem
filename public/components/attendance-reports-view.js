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
                <td>${username} (${role})</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${actionBadge}</td>
                <td>${record.device || 'MOBILE'}</td>
                <td>
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
        window.print();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .filters {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    align-items: flex-end;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                }
                label {
                    font-weight: bold;
                    margin-bottom: 5px;
                    font-size: 14px;
                }
                input, select, button {
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                }
                button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: bold;
                }
                button:hover {
                    background-color: #0056b3;
                }
                button:disabled {
                    background-color: #cccccc;
                    cursor: not-allowed;
                }
                button.export {
                    background-color: #28a745;
                }
                button.export:hover {
                    background-color: #218838;
                }
                button.print {
                    background-color: #17a2b8;
                }
                button.print:hover {
                    background-color: #138496;
                }
                button.btn-delete {
                    background-color: #dc3545;
                    padding: 4px 8px;
                    font-size: 12px;
                }
                button.btn-delete:hover {
                    background-color: #bd2130;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
                .badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
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
                    gap: 10px;
                    margin-top: 15px;
                }
                @media print {
                    .filters, button, .header button, .pagination {
                        display: none !important;
                    }
                }
            </style>

            <div class="header">
                <h2>Reporte de Asistencias y Fichajes</h2>
                <div>
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
                        <th>Acciones</th>
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
