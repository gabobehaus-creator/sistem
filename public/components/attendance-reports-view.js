class AttendanceReportsView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.records = [];
        this.users = [];
        this.activeTab = 'dashboard'; // 'dashboard', 'jornadas', 'monthly', 'historial'
        
        // Search filters
        this.searchTermJornadas = '';
        this.searchTermMonthly = '';
        this.searchTermHistorial = '';

        // Pagination for Historial
        this.currentPageHistorial = 1;
        this.itemsPerPageHistorial = 15;

        // Pagination for Jornadas
        this.currentPageJornadas = 1;
        this.itemsPerPageJornadas = 15;

        // Pagination for Monthly
        this.currentPageMonthly = 1;
        this.itemsPerPageMonthly = 15;
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
                // Re-render once users are loaded to resolve any pending IDs to names
                this.updateDashboardAndTables();
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
                this.currentPageHistorial = 1;
                this.currentPageJornadas = 1;
                this.currentPageMonthly = 1;
                this.updateDashboardAndTables();
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
        if (!select) return;
        select.innerHTML = '<option value="">Todos los Usuarios</option>';
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (${user.role})`;
            select.appendChild(option);
        });
    }

    // Helper to resolve user details reliably
    resolveUser(userId, recordUserRelation) {
        const found = this.users.find(u => u.id == userId);
        if (found) return found;
        if (recordUserRelation) return recordUserRelation;
        return { username: `Usuario #${userId}`, role: '-' };
    }

    // Process raw records to calculate shifts (Jornadas)
    calculateShifts() {
        const userRecords = {};
        this.records.forEach(record => {
            const uid = record.user_id;
            if (!userRecords[uid]) userRecords[uid] = [];
            userRecords[uid].push(record);
        });

        const shifts = [];

        Object.keys(userRecords).forEach(uid => {
            const sorted = userRecords[uid].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            let i = 0;
            while (i < sorted.length) {
                const current = sorted[i];
                const userObj = this.resolveUser(uid, current.User);

                if (current.action_type === 'IN') {
                    const next = sorted[i + 1];
                    if (next && next.action_type === 'OUT') {
                        const durationMs = new Date(next.timestamp) - new Date(current.timestamp);
                        const hours = durationMs / (1000 * 60 * 60);
                        shifts.push({
                            user_id: uid,
                            user: userObj,
                            date: new Date(current.timestamp).toLocaleDateString('es-AR'),
                            inTime: new Date(current.timestamp),
                            outTime: new Date(next.timestamp),
                            hours: hours,
                            status: 'completed',
                            device: current.device || 'MOBILE'
                        });
                        i += 2;
                    } else {
                        shifts.push({
                            user_id: uid,
                            user: userObj,
                            date: new Date(current.timestamp).toLocaleDateString('es-AR'),
                            inTime: new Date(current.timestamp),
                            outTime: null,
                            hours: 0,
                            status: 'incomplete',
                            device: current.device || 'MOBILE'
                        });
                        i += 1;
                    }
                } else {
                    shifts.push({
                        user_id: uid,
                        user: userObj,
                        date: new Date(current.timestamp).toLocaleDateString('es-AR'),
                        inTime: null,
                        outTime: new Date(current.timestamp),
                        hours: 0,
                        status: 'orphan_out',
                        device: current.device || 'MOBILE'
                    });
                    i += 1;
                }
            }
        });

        return shifts.sort((a, b) => {
            const timeA = a.inTime || a.outTime;
            const timeB = b.inTime || b.outTime;
            return timeB - timeA;
        });
    }

    // Consolidate monthly user hours
    calculateMonthlySummary(shifts) {
        const userSummaryMap = {};

        shifts.forEach(shift => {
            const uid = shift.user_id;
            if (!userSummaryMap[uid]) {
                userSummaryMap[uid] = {
                    user: shift.user,
                    totalHours: 0,
                    totalShifts: 0,
                    completedShifts: 0,
                    incompleteShifts: 0
                };
            }

            userSummaryMap[uid].totalShifts += 1;
            userSummaryMap[uid].totalHours += shift.hours;
            if (shift.status === 'completed') {
                userSummaryMap[uid].completedShifts += 1;
            } else {
                userSummaryMap[uid].incompleteShifts += 1;
            }
        });

        return Object.values(userSummaryMap).sort((a, b) => b.totalHours - a.totalHours);
    }

    updateDashboardAndTables() {
        const shifts = this.calculateShifts();
        const monthlySummaries = this.calculateMonthlySummary(shifts);
        
        // 1. Calculate Metrics
        const activeUsersMap = {};
        const chronoRecords = [...this.records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        chronoRecords.forEach(r => {
            const userObj = this.resolveUser(r.user_id, r.User);
            activeUsersMap[r.user_id] = {
                action: r.action_type,
                username: userObj.username,
                role: userObj.role,
                time: new Date(r.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            };
        });

        const activeStaff = Object.values(activeUsersMap).filter(u => u.action === 'IN');
        
        // Today's Attendance Rate
        const todayStr = new Date().toLocaleDateString('es-AR');
        const usersToday = new Set(
            this.records
                .filter(r => new Date(r.timestamp).toLocaleDateString('es-AR') === todayStr)
                .map(r => r.user_id)
        );
        const totalUsersCount = this.users.length || 1;
        const attendanceRate = Math.round((usersToday.size / totalUsersCount) * 100);

        // Total Hours
        const totalHours = shifts.reduce((sum, s) => sum + s.hours, 0);

        // Hours by Role/Department
        const hoursByRole = {};
        shifts.forEach(s => {
            const role = s.user.role || 'Sin Rol';
            hoursByRole[role] = (hoursByRole[role] || 0) + s.hours;
        });

        // Update UI Widgets
        this.shadowRoot.getElementById('metricActiveCount').textContent = activeStaff.length;
        this.shadowRoot.getElementById('metricAttendanceRate').textContent = `${attendanceRate}%`;
        this.shadowRoot.getElementById('metricTotalHours').textContent = `${totalHours.toFixed(1)} hrs`;

        // Render Active Staff List
        const activeListContainer = this.shadowRoot.getElementById('activeStaffList');
        activeListContainer.innerHTML = '';
        if (activeStaff.length === 0) {
            activeListContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: #94a3b8;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <div>No hay personal activo en este momento.</div>
                </div>`;
        } else {
            activeStaff.forEach(member => {
                const div = document.createElement('div');
                div.className = 'active-member-card';
                div.innerHTML = `
                    <div class="avatar">${member.username.charAt(0).toUpperCase()}</div>
                    <div class="info">
                        <span class="name">${member.username}</span>
                        <span class="role">${member.role}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="pulse-dot"></span>
                        <span class="badge-active">Activo desde ${member.time}</span>
                    </div>
                `;
                activeListContainer.appendChild(div);
            });
        }

        // Render SVG Chart for Hours by Role
        this.renderHoursChart(hoursByRole);

        // 2. Render Tables
        this.renderJornadasTable(shifts);
        this.renderMonthlyTable(monthlySummaries);
        this.renderHistorialTable();
    }

    renderHoursChart(hoursByRole) {
        const chartContainer = this.shadowRoot.getElementById('hoursChartContainer');
        chartContainer.innerHTML = '';

        const roles = Object.keys(hoursByRole);
        if (roles.length === 0) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: #94a3b8;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    <div>No hay datos de horas para graficar.</div>
                </div>`;
            return;
        }

        const maxHours = Math.max(...Object.values(hoursByRole), 1);

        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';

        roles.forEach(role => {
            const hours = hoursByRole[role];
            const percentage = (hours / maxHours) * 100;
            const barRow = document.createElement('div');
            barRow.className = 'chart-bar-row';
            barRow.innerHTML = `
                <div class="chart-label" title="${role}">${role}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-value">${hours.toFixed(1)} hrs</div>
            `;
            chartWrapper.appendChild(barRow);
        });

        chartContainer.appendChild(chartWrapper);
    }

    renderJornadasTable(shifts) {
        const tbody = this.shadowRoot.getElementById('jornadasBody');
        tbody.innerHTML = '';

        // Filter shifts by search term
        const filteredShifts = shifts.filter(s => {
            const term = this.searchTermJornadas.toLowerCase();
            return s.user.username.toLowerCase().includes(term) || (s.user.role && s.user.role.toLowerCase().includes(term));
        });

        if (filteredShifts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 32px; color: #64748b;">No se encontraron jornadas calculadas.</td></tr>';
            this.renderJornadasPagination(0);
            return;
        }

        const totalPages = Math.ceil(filteredShifts.length / this.itemsPerPageJornadas);
        if (this.currentPageJornadas > totalPages) this.currentPageJornadas = totalPages;
        if (this.currentPageJornadas < 1) this.currentPageJornadas = 1;

        const start = (this.currentPageJornadas - 1) * this.itemsPerPageJornadas;
        const end = start + this.itemsPerPageJornadas;
        const pageShifts = filteredShifts.slice(start, end);

        pageShifts.forEach(shift => {
            const tr = document.createElement('tr');
            const formatTime = (date) => date ? date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            let statusBadge = '';
            if (shift.status === 'completed') {
                statusBadge = `<span class="badge-shift completed">Completado</span>`;
            } else if (shift.status === 'incomplete') {
                statusBadge = `<span class="badge-shift incomplete">Falta Salida</span>`;
            } else {
                statusBadge = `<span class="badge-shift orphan">Falta Entrada</span>`;
            }

            const hoursDisplay = shift.hours > 0 ? `<strong>${shift.hours.toFixed(2)} hrs</strong>` : '-';

            tr.innerHTML = `
                <td><strong>${shift.user.username}</strong> <span class="role-tag">${shift.user.role}</span></td>
                <td>${shift.date}</td>
                <td>
                    <div class="shift-times">
                        <span class="time-in">In: ${formatTime(shift.inTime)}</span>
                        <span class="time-out">Out: ${formatTime(shift.outTime)}</span>
                    </div>
                </td>
                <td>${hoursDisplay}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });

        this.renderJornadasPagination(totalPages);
    }

    renderMonthlyTable(monthlySummaries) {
        const tbody = this.shadowRoot.getElementById('monthlyBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const filtered = monthlySummaries.filter(summary => {
            const term = this.searchTermMonthly.toLowerCase();
            return summary.user.username.toLowerCase().includes(term) || (summary.user.role && summary.user.role.toLowerCase().includes(term));
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 32px; color: #64748b;">No hay datos de resumen mensual acumulado para mostrar.</td></tr>';
            this.renderMonthlyPagination(0);
            return;
        }

        const totalPages = Math.ceil(filtered.length / this.itemsPerPageMonthly);
        if (this.currentPageMonthly > totalPages) this.currentPageMonthly = totalPages;
        if (this.currentPageMonthly < 1) this.currentPageMonthly = 1;

        const start = (this.currentPageMonthly - 1) * this.itemsPerPageMonthly;
        const end = start + this.itemsPerPageMonthly;
        const pageItems = filtered.slice(start, end);

        pageItems.forEach(item => {
            const tr = document.createElement('tr');
            const avgHours = item.completedShifts > 0 ? (item.totalHours / item.completedShifts).toFixed(1) : '0.0';

            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="avatar" style="width:32px; height:32px; font-size:12px;">${item.user.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${item.user.username}</strong>
                            <div style="font-size: 11px; color: #64748b;">ID: #${item.user.id || '-'}</div>
                        </div>
                    </div>
                </td>
                <td><span class="role-tag">${item.user.role || 'Sin Rol'}</span></td>
                <td>${item.totalShifts} jornadas</td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 12px; color: #16a34a; font-weight:600;">✓ ${item.completedShifts} completas</span>
                        ${item.incompleteShifts > 0 ? `<span style="font-size: 11px; color: #d97706;">⚠️ ${item.incompleteShifts} pendientes</span>` : ''}
                    </div>
                </td>
                <td><span style="font-size: 13px; color: #475569;">~${avgHours} hrs/día</span></td>
                <td><span class="highlight-hours">${item.totalHours.toFixed(2)} hrs</span></td>
            `;
            tbody.appendChild(tr);
        });

        this.renderMonthlyPagination(totalPages);
    }

    renderHistorialTable() {
        const tbody = this.shadowRoot.getElementById('recordsBody');
        tbody.innerHTML = '';

        // Filter records by search term
        const filteredRecords = this.records.filter(r => {
            const userObj = this.resolveUser(r.user_id, r.User);
            const term = this.searchTermHistorial.toLowerCase();
            return userObj.username.toLowerCase().includes(term) || (userObj.role && userObj.role.toLowerCase().includes(term));
        });

        if (filteredRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 32px; color: #64748b;">No se encontraron registros.</td></tr>';
            this.renderHistorialPagination(0);
            return;
        }

        const totalPages = Math.ceil(filteredRecords.length / this.itemsPerPageHistorial);
        if (this.currentPageHistorial > totalPages) this.currentPageHistorial = totalPages;
        if (this.currentPageHistorial < 1) this.currentPageHistorial = 1;

        const start = (this.currentPageHistorial - 1) * this.itemsPerPageHistorial;
        const end = start + this.itemsPerPageHistorial;
        const pageRecords = filteredRecords.slice(start, end);

        pageRecords.forEach(record => {
            const tr = document.createElement('tr');
            const dateObj = new Date(record.timestamp);
            const formattedDate = dateObj.toLocaleDateString('es-AR');
            const formattedTime = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            const isEntry = record.action_type === 'IN';
            const actionBadge = isEntry
                ? `<span class="badge in">Entrada (IN)</span>`
                : `<span class="badge out">Salida (OUT)</span>`;

            const userObj = this.resolveUser(record.user_id, record.User);

            tr.innerHTML = `
                <td><strong>${userObj.username}</strong> <span style="color: #64748b; font-size: 0.9em;">(${userObj.role})</span></td>
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

        this.renderHistorialPagination(totalPages);
    }

    renderJornadasPagination(totalPages) {
        const prevBtn = this.shadowRoot.getElementById('prevJornadasBtn');
        const nextBtn = this.shadowRoot.getElementById('nextJornadasBtn');
        const pageInfo = this.shadowRoot.getElementById('jornadasPageInfo');

        if (totalPages === 0) {
            pageInfo.textContent = 'Página 0 de 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        pageInfo.textContent = `Página ${this.currentPageJornadas} de ${totalPages}`;
        prevBtn.disabled = this.currentPageJornadas <= 1;
        nextBtn.disabled = this.currentPageJornadas >= totalPages;
    }

    renderMonthlyPagination(totalPages) {
        const prevBtn = this.shadowRoot.getElementById('prevMonthlyBtn');
        const nextBtn = this.shadowRoot.getElementById('nextMonthlyBtn');
        const pageInfo = this.shadowRoot.getElementById('monthlyPageInfo');

        if (!prevBtn || !nextBtn || !pageInfo) return;

        if (totalPages === 0) {
            pageInfo.textContent = 'Página 0 de 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        pageInfo.textContent = `Página ${this.currentPageMonthly} de ${totalPages}`;
        prevBtn.disabled = this.currentPageMonthly <= 1;
        nextBtn.disabled = this.currentPageMonthly >= totalPages;
    }

    renderHistorialPagination(totalPages) {
        const prevBtn = this.shadowRoot.getElementById('prevHistorialBtn');
        const nextBtn = this.shadowRoot.getElementById('nextHistorialBtn');
        const pageInfo = this.shadowRoot.getElementById('historialPageInfo');

        if (totalPages === 0) {
            pageInfo.textContent = 'Página 0 de 0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        pageInfo.textContent = `Página ${this.currentPageHistorial} de ${totalPages}`;
        prevBtn.disabled = this.currentPageHistorial <= 1;
        nextBtn.disabled = this.currentPageHistorial >= totalPages;
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `${tabName}TabContent`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    exportCSV() {
        if (this.records.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        let csv = "Usuario,Rol,Fecha y Hora,Accion,Dispositivo\n";
        this.records.forEach(r => {
            const userObj = this.resolveUser(r.user_id, r.User);
            const dateStr = new Date(r.timestamp).toLocaleString('es-AR');
            csv += `"${userObj.username}","${userObj.role}","${dateStr}","${r.action_type}","${r.device || 'MOBILE'}"\n`;
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
                    color: #1e293b;
                    background-color: #f8fafc;
                }

                /* Header & Actions */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 16px;
                }
                .header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: #0f172a;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .header-actions {
                    display: flex;
                    gap: 12px;
                }

                /* Filters Panel */
                .filters {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                    background: #ffffff;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    align-items: flex-end;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04);
                    border: 1px solid #e2e8f0;
                }
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    min-width: 180px;
                }
                label {
                    font-weight: 600;
                    margin-bottom: 8px;
                    font-size: 13px;
                    color: #475569;
                }
                input, select, button {
                    padding: 10px 14px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    outline: none;
                }
                input:focus, select:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }
                button {
                    background-color: #3b82f6;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                button:hover {
                    background-color: #2563eb;
                }
                button:disabled {
                    background-color: #e2e8f0;
                    color: #94a3b8;
                    cursor: not-allowed;
                }
                button.export {
                    background-color: #10b981;
                }
                button.export:hover {
                    background-color: #059669;
                }
                button.print {
                    background-color: #64748b;
                }
                button.print:hover {
                    background-color: #475569;
                }

                /* Search Bar inside Tabs */
                .search-container {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 16px;
                }
                .search-input {
                    width: 100%;
                    max-width: 300px;
                    padding: 8px 12px;
                    font-size: 13px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                }

                /* Tabs Navigation */
                .tabs-nav {
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 24px;
                }
                .tab-btn {
                    padding: 12px 20px;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    border-bottom: 2px solid transparent;
                    border-radius: 0;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .tab-btn:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                }
                .tab-btn.active {
                    color: #3b82f6;
                    border-bottom-color: #3b82f6;
                }

                /* Tab Contents */
                .tab-content {
                    display: none;
                }
                .tab-content.active {
                    display: block;
                }

                /* Dashboard Grid */
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
                }
                .metric-card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                }
                .metric-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                    background: #3b82f6;
                }
                .metric-card.active-presence::before {
                    background: #10b981;
                }
                .metric-card.hours-registered::before {
                    background: #8b5cf6;
                }
                .metric-card .title {
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }
                .metric-card .value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0f172a;
                }

                /* Dashboard Layout (Split) */
                .dashboard-split {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 900px) {
                    .dashboard-split {
                        grid-template-columns: 1fr;
                    }
                }
                .panel-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 24px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .panel-card h3 {
                    margin-top: 0;
                    margin-bottom: 20px;
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    border-bottom: 1px solid #f1f5f9;
                    padding-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* Active Staff List */
                .active-staff-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: 320px;
                    overflow-y: auto;
                }
                .active-member-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #f1f5f9;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .active-member-card:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #e2e8f0;
                    color: #334155;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 14px;
                }
                .active-member-card .info {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                }
                .active-member-card .info .name {
                    font-weight: 600;
                    font-size: 14px;
                    color: #0f172a;
                }
                .active-member-card .info .role {
                    font-size: 12px;
                    color: #64748b;
                }
                .badge-active {
                    font-size: 11px;
                    font-weight: 600;
                    color: #15803d;
                    background: #dcfce7;
                    padding: 4px 8px;
                    border-radius: 6px;
                }

                /* Pulsing Dot */
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #10b981;
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    animation: pulse 1.6s infinite;
                }
                @keyframes pulse {
                    0% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    }
                    70% {
                        transform: scale(1);
                        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
                    }
                    100% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                }

                /* Custom HTML/CSS Chart */
                .chart-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .chart-bar-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .chart-label {
                    width: 110px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #475569;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    white-space: nowrap;
                }
                .chart-bar-container {
                    flex-grow: 1;
                    height: 14px;
                    background: #f1f5f9;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .chart-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #3b82f6, #60a5fa);
                    border-radius: 8px;
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .chart-value {
                    width: 70px;
                    text-align: right;
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                }

                /* Tables Styling */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                th, td {
                    padding: 14px 16px;
                    text-align: left;
                    border-bottom: 1px solid #f1f5f9;
                }
                th {
                    background-color: #f8fafc;
                    font-weight: 600;
                    color: #475569;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                .role-tag {
                    background: #f1f5f9;
                    color: #475569;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-left: 6px;
                    font-weight: 500;
                }

                /* Badges */
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
                    background-color: #10b981;
                }
                .badge.out {
                    background-color: #ef4444;
                }

                .badge-shift {
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .badge-shift.completed {
                    background-color: #dcfce7;
                    color: #15803d;
                }
                .badge-shift.incomplete {
                    background-color: #fef3c7;
                    color: #b45309;
                }
                .badge-shift.orphan {
                    background-color: #fee2e2;
                    color: #b91c1c;
                }

                .highlight-hours {
                    font-size: 15px;
                    font-weight: 700;
                    color: #2563eb;
                    background: #eff6ff;
                    padding: 4px 10px;
                    border-radius: 8px;
                    display: inline-block;
                }

                .shift-times {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    font-size: 13px;
                }
                .shift-times .time-in {
                    color: #16a34a;
                }
                .shift-times .time-out {
                    color: #dc2626;
                }

                /* Pagination */
                .pagination {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 12px;
                    margin-top: 20px;
                }

                /* Delete Button */
                button.btn-delete {
                    background-color: #fff;
                    color: #ef4444;
                    border: 1px solid #fecaca;
                    padding: 6px 12px;
                    font-size: 12px;
                    border-radius: 6px;
                }
                button.btn-delete:hover {
                    background-color: #fee2e2;
                    border-color: #ef4444;
                }

                .empty-state {
                    text-align: center;
                    padding: 32px 16px;
                    color: #64748b;
                    font-size: 14px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }

                .print-header {
                    display: none;
                }

                /* High-quality UX Print Stylesheet */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
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
                    .filters, button, .header, .pagination, .no-print, .tabs-nav, .dashboard-grid, .dashboard-split, .search-container {
                        display: none !important;
                    }
                    .tab-content {
                        display: block !important;
                    }
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
                    .badge, .badge-shift {
                        background: transparent !important;
                        padding: 2px 6px !important;
                        font-size: 10px !important;
                        border-radius: 4px !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .badge.in, .badge-shift.completed {
                        border: 1px solid #10b981 !important;
                        color: #047857 !important;
                    }
                    .badge.out, .badge-shift.incomplete, .badge-shift.orphan {
                        border: 1px solid #ef4444 !important;
                        color: #b91c1c !important;
                    }
                    .highlight-hours {
                        background: transparent !important;
                        color: #000 !important;
                        padding: 0 !important;
                        font-weight: bold !important;
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
                    <button class="export" id="btnExport">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Exportar CSV
                    </button>
                    <button class="print" id="btnPrint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Imprimir / PDF
                    </button>
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
                <button id="btnFilter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    Filtrar
                </button>
            </div>

            <!-- Tabs Navigation -->
            <div class="tabs-nav">
                <button class="tab-btn active" data-tab="dashboard">Vista General (Dashboard)</button>
                <button class="tab-btn" data-tab="jornadas">Jornadas y Horas Trabajadas</button>
                <button class="tab-btn" data-tab="monthly">Resumen Mensual por Empleado</button>
                <button class="tab-btn" data-tab="historial">Historial de Fichajes</button>
            </div>

            <!-- TAB 1: DASHBOARD -->
            <div id="dashboardTabContent" class="tab-content active">
                <div class="dashboard-grid">
                    <div class="metric-card active-presence">
                        <span class="title">Presencia Actual</span>
                        <span class="value" id="metricActiveCount">0</span>
                    </div>
                    <div class="metric-card">
                        <span class="title">Tasa de Asistencia (Hoy)</span>
                        <span class="value" id="metricAttendanceRate">0%</span>
                    </div>
                    <div class="metric-card hours-registered">
                        <span class="title">Total Horas Registradas</span>
                        <span class="value" id="metricTotalHours">0.0 hrs</span>
                    </div>
                </div>

                <div class="dashboard-split">
                    <div class="panel-card">
                        <h3>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            Personal Activo en el Hotel
                        </h3>
                        <div class="active-staff-list" id="activeStaffList">
                            <div class="empty-state">Cargando personal activo...</div>
                        </div>
                    </div>
                    <div class="panel-card">
                        <h3>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            Horas Acumuladas por Rol
                        </h3>
                        <div id="hoursChartContainer">
                            <div class="empty-state">Cargando gráfico...</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: JORNADAS CALCULADAS -->
            <div id="jornadasTabContent" class="tab-content">
                <div class="search-container">
                    <input type="text" id="searchJornadas" class="search-input" placeholder="Buscar por empleado o rol...">
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Fecha</th>
                            <th>Horarios</th>
                            <th>Horas Trabajadas</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="jornadasBody">
                        <tr><td colspan="5" style="text-align:center;">Cargando jornadas...</td></tr>
                    </tbody>
                </table>

                <div class="pagination">
                    <button id="prevJornadasBtn">Anterior</button>
                    <span id="jornadasPageInfo">Página 1 de 1</span>
                    <button id="nextJornadasBtn">Siguiente</button>
                </div>
            </div>

            <!-- TAB 3: RESUMEN MENSUAL POR EMPLEADO -->
            <div id="monthlyTabContent" class="tab-content">
                <div class="search-container">
                    <input type="text" id="searchMonthly" class="search-input" placeholder="Buscar por empleado o rol...">
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Empleado</th>
                            <th>Rol / Área</th>
                            <th>Jornadas Totales</th>
                            <th>Estado de Fichajes</th>
                            <th>Promedio Diario</th>
                            <th>Total Horas Acumuladas</th>
                        </tr>
                    </thead>
                    <tbody id="monthlyBody">
                        <tr><td colspan="6" style="text-align:center;">Cargando resumen mensual...</td></tr>
                    </tbody>
                </table>

                <div class="pagination">
                    <button id="prevMonthlyBtn">Anterior</button>
                    <span id="monthlyPageInfo">Página 1 de 1</span>
                    <button id="nextMonthlyBtn">Siguiente</button>
                </div>
            </div>

            <!-- TAB 4: HISTORIAL DE FICHAJES -->
            <div id="historialTabContent" class="tab-content">
                <div class="search-container">
                    <input type="text" id="searchHistorial" class="search-input" placeholder="Buscar por empleado o rol...">
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
                    <button id="prevHistorialBtn">Anterior</button>
                    <span id="historialPageInfo">Página 1 de 1</span>
                    <button id="nextHistorialBtn">Siguiente</button>
                </div>
            </div>
        `;

        // Event Listeners
        this.shadowRoot.getElementById('btnFilter').addEventListener('click', () => this.fetchAttendanceReport());
        this.shadowRoot.getElementById('btnExport').addEventListener('click', () => this.exportCSV());
        this.shadowRoot.getElementById('btnPrint').addEventListener('click', () => this.printPDF());

        // Search inputs
        this.shadowRoot.getElementById('searchJornadas').addEventListener('input', (e) => {
            this.searchTermJornadas = e.target.value;
            this.currentPageJornadas = 1;
            this.updateDashboardAndTables();
        });
        this.shadowRoot.getElementById('searchMonthly').addEventListener('input', (e) => {
            this.searchTermMonthly = e.target.value;
            this.currentPageMonthly = 1;
            this.updateDashboardAndTables();
        });
        this.shadowRoot.getElementById('searchHistorial').addEventListener('input', (e) => {
            this.searchTermHistorial = e.target.value;
            this.currentPageHistorial = 1;
            this.renderHistorialTable();
        });

        // Tab switching
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Pagination: Jornadas
        this.shadowRoot.getElementById('prevJornadasBtn').addEventListener('click', () => {
            if (this.currentPageJornadas > 1) {
                this.currentPageJornadas--;
                this.updateDashboardAndTables();
            }
        });
        this.shadowRoot.getElementById('nextJornadasBtn').addEventListener('click', () => {
            const shifts = this.calculateShifts();
            const totalPages = Math.ceil(shifts.length / this.itemsPerPageJornadas);
            if (this.currentPageJornadas < totalPages) {
                this.currentPageJornadas++;
                this.updateDashboardAndTables();
            }
        });

        // Pagination: Monthly
        this.shadowRoot.getElementById('prevMonthlyBtn').addEventListener('click', () => {
            if (this.currentPageMonthly > 1) {
                this.currentPageMonthly--;
                this.updateDashboardAndTables();
            }
        });
        this.shadowRoot.getElementById('nextMonthlyBtn').addEventListener('click', () => {
            const shifts = this.calculateShifts();
            const monthlySummaries = this.calculateMonthlySummary(shifts);
            const totalPages = Math.ceil(monthlySummaries.length / this.itemsPerPageMonthly);
            if (this.currentPageMonthly < totalPages) {
                this.currentPageMonthly++;
                this.updateDashboardAndTables();
            }
        });

        // Pagination: Historial
        this.shadowRoot.getElementById('prevHistorialBtn').addEventListener('click', () => {
            if (this.currentPageHistorial > 1) {
                this.currentPageHistorial--;
                this.renderHistorialTable();
            }
        });
        this.shadowRoot.getElementById('nextHistorialBtn').addEventListener('click', () => {
            const totalPages = Math.ceil(this.records.length / this.itemsPerPageHistorial);
            if (this.currentPageHistorial < totalPages) {
                this.currentPageHistorial++;
                this.renderHistorialTable();
            }
        });
    }
}

customElements.define('attendance-reports-view', AttendanceReportsView);
