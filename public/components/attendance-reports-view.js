class AttendanceReportsView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.records = [];
        this.users = [];
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
                this.renderTable();
            } else {
                console.error("Error al obtener el reporte");
            }
        } catch (error) {
            console.error("Error en la solicitud de reporte:", error);
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
            return;
        }

        this.records.forEach(record => {
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
            `;
            tbody.appendChild(tr);
        });
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
                @media print {
                    .filters, button, .header button {
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
                    </tr>
                </thead>
                <tbody id="recordsBody">
                    <tr><td colspan="4" style="text-align:center;">Cargando registros...</td></tr>
                </tbody>
            </table>
        `;

        this.shadowRoot.getElementById('btnFilter').addEventListener('click', () => this.fetchAttendanceReport());
        this.shadowRoot.getElementById('btnExport').addEventListener('click', () => this.exportCSV());
        this.shadowRoot.getElementById('btnPrint').addEventListener('click', () => this.printPDF());
    }
}

customElements.define('attendance-reports-view', AttendanceReportsView);
