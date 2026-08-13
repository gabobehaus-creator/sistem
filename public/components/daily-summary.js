class DailySummary extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Inter', sans-serif;
                }

                /* Grid de KPIs superiores */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }

                .kpi-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02);
                    border: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }

                .kpi-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .kpi-title {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .kpi-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .kpi-value {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1;
                    margin-bottom: 8px;
                }

                .kpi-subtext {
                    font-size: 0.8rem;
                    color: #64748b;
                }

                /* Barra de progreso para ocupación */
                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background-color: #f1f5f9;
                    border-radius: 3px;
                    margin-top: 8px;
                    overflow: hidden;
                }

                .progress-bar {
                    height: 100%;
                    background-color: #3b82f6;
                    border-radius: 3px;
                    width: 0%;
                    transition: width 0.5s ease-in-out;
                }

                /* Grid Principal de Contenido */
                .main-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 1fr;
                    gap: 24px;
                }

                @media (max-width: 1024px) {
                    .main-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .panel-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02);
                    border: 1px solid #f1f5f9;
                    padding: 24px;
                }

                .panel-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0 0 20px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* Listas de Actividad */
                .activity-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .activity-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background-color: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #f1f5f9;
                    transition: transform 0.15s ease;
                }

                .activity-item:hover {
                    transform: translateY(-1px);
                }

                .activity-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .activity-main {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #1e293b;
                }

                .activity-sub {
                    font-size: 0.8rem;
                    color: #64748b;
                }

                /* Badges de Estado */
                .badge {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 6px;
                    text-transform: uppercase;
                }

                .badge-blue { background-color: #eff6ff; color: #1d4ed8; }
                .badge-amber { background-color: #fffbeb; color: #b45309; }
                .badge-emerald { background-color: #ecfdf5; color: #047857; }
                .badge-rose { background-color: #fff1f2; color: #be123c; }

                /* Sub-secciones divididas */
                .split-sections {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                @media (max-width: 640px) {
                    .split-sections {
                        grid-template-columns: 1fr;
                    }
                }

                .empty-state {
                    text-align: center;
                    padding: 30px 20px;
                    color: #94a3b8;
                    font-size: 0.85rem;
                }

                .empty-state svg {
                    width: 32px;
                    height: 32px;
                    margin-bottom: 8px;
                    color: #cbd5e1;
                }
            </style>

            <!-- FILA DE KPIS SUPERIORES -->
            <div class="kpi-grid">
                <!-- KPI 1: Ocupación -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <span class="kpi-title">Ocupación Hoy</span>
                        <div class="kpi-icon" style="background-color: #eff6ff; color: #3b82f6;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="kpi-value" id="occupancyValue">0%</div>
                        <div class="kpi-subtext" id="occupancySubtext">Calculando disponibilidad...</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="occupancyProgress"></div>
                        </div>
                    </div>
                </div>

                <!-- KPI 2: Check-ins Pendientes -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <span class="kpi-title">Check-Ins Hoy</span>
                        <div class="kpi-icon" style="background-color: #ecfdf5; color: #10b981;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="kpi-value" id="kpiCheckins">0</div>
                        <div class="kpi-subtext">Reservas listas para ingreso</div>
                    </div>
                </div>

                <!-- KPI 3: Estado Limpieza -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <span class="kpi-title">Habitaciones Sucias</span>
                        <div class="kpi-icon" style="background-color: #fff1f2; color: #f43f5e;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="kpi-value" id="kpiDirtyRooms">0</div>
                        <div class="kpi-subtext" id="kpiDirtySubtext">Requieren atención inmediata</div>
                    </div>
                </div>

                <!-- KPI 4: Cotización Dólar -->
                <div class="kpi-card">
                    <div class="kpi-header" style="margin-bottom: 6px;">
                        <span class="kpi-title">Dólar Oficial</span>
                    </div>
                    <dollar-price-widget></dollar-price-widget>
                </div>
            </div>

            <!-- GRID PRINCIPAL DE CONTENIDO -->
            <div class="main-grid">
                <!-- COLUMNA IZQUIERDA: Check-ins y Check-outs -->
                <div class="panel-card">
                    <h3 class="panel-title">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; color: #4f46e5;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                        Movimiento de Huéspedes (Hoy)
                    </h3>
                    
                    <div class="split-sections">
                        <div>
                            <h4 style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Check-Ins</h4>
                            <ul class="activity-list" id="checkInsList"></ul>
                        </div>
                        <div>
                            <h4 style="font-size: 0.85rem; color: #64748b; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Check-Outs</h4>
                            <ul class="activity-list" id="checkOutsList"></ul>
                        </div>
                    </div>
                </div>

                <!-- COLUMNA DERECHA: Limpieza y Personal -->
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    <!-- Limpieza -->
                    <div class="panel-card">
                        <h3 class="panel-title">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; color: #0891b2;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091.58.07 1.175-.163 1.742m0 0a4.012 4.012 0 0 1-1.483 1.754l-1.5 1.5" />
                            </svg>
                            Estado de Habitaciones
                        </h3>
                        <ul class="activity-list" id="housekeepingList"></ul>
                    </div>

                    <!-- Personal de Turno -->
                    <div class="panel-card">
                        <h3 class="panel-title">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; color: #059669;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 10.089 20c-2.213 0-4.302-.63-6.089-1.73v-.109A11.386 11.386 0 0 1 10.089 17c2.213 0 4.302.63 6.089 1.73M15 12.75a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM18.75 7.5a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0ZM12.75 12a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                            </svg>
                            Personal de Turno Hoy
                        </h3>
                        <ul class="activity-list" id="shiftsList"></ul>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.fetchDailyData();
    }

    async fetchDailyData() {
        const todayISO = new Date().toISOString().split('T')[0];

        try {
            const [bookingsRes, roomsRes, shiftsRes, employeesRes] = await Promise.all([
                fetch('/api/bookings'),
                fetch('/api/rooms'),
                fetch(`/api/shifts?year=${todayISO.substring(0,4)}&month=${todayISO.substring(5,7)}`), 
                fetch('/api/employees')
            ]);
            
            if (bookingsRes.status === 401) { window.location.href = '/'; return; }

            const bookingsData = await bookingsRes.json();
            const roomsData = await roomsRes.json();
            const shiftsData = await shiftsRes.json();
            const employeesData = await employeesRes.json();

            this.calculateAndRenderKPIs(roomsData.data, bookingsData.data, todayISO);
            this.renderBookingsLists(bookingsData.data, roomsData.data, todayISO);
            this.renderHousekeepingList(roomsData.data);
            this.renderShiftsList(shiftsData.data, employeesData.data, todayISO);

        } catch (error) {
            console.error("Error fetching daily data:", error);
            const root = this.shadowRoot;
            root.getElementById('checkInsList').innerHTML = '<li>Error al cargar datos.</li>';
            root.getElementById('checkOutsList').innerHTML = '<li>Error al cargar datos.</li>';
            root.getElementById('housekeepingList').innerHTML = '<li>Error al cargar datos.</li>';
            root.getElementById('shiftsList').innerHTML = '<li>Error al cargar datos.</li>';
        }
    }

    calculateAndRenderKPIs(rooms, bookings, todayISO) {
        // 1. Calcular Ocupación
        // Consideramos ocupadas las habitaciones que tienen reservas activas hoy
        const totalRooms = rooms.length || 1;
        const activeBookingsToday = bookings.filter(b => {
            return b.start_date <= todayISO && b.end_date >= todayISO && b.status === 'checked-in';
        });
        const occupiedCount = activeBookingsToday.length;
        const occupancyPercentage = Math.round((occupiedCount / totalRooms) * 100);

        const occupancyValue = this.shadowRoot.getElementById('occupancyValue');
        const occupancySubtext = this.shadowRoot.getElementById('occupancySubtext');
        const occupancyProgress = this.shadowRoot.getElementById('occupancyProgress');

        if (occupancyValue) occupancyValue.textContent = `${occupancyPercentage}%`;
        if (occupancySubtext) occupancySubtext.textContent = `${occupiedCount} de ${totalRooms} hab. ocupadas`;
        if (occupancyProgress) occupancyProgress.style.width = `${occupancyPercentage}%`;

        // 2. Check-ins de hoy
        const checkInsCount = bookings.filter(b => b.start_date === todayISO && b.status === 'reserved').length;
        const kpiCheckins = this.shadowRoot.getElementById('kpiCheckins');
        if (kpiCheckins) kpiCheckins.textContent = checkInsCount;

        // 3. Habitaciones Sucias
        const dirtyRoomsCount = rooms.filter(r => r.clean_status === 'dirty').length;
        const kpiDirtyRooms = this.shadowRoot.getElementById('kpiDirtyRooms');
        const kpiDirtySubtext = this.shadowRoot.getElementById('kpiDirtySubtext');
        if (kpiDirtyRooms) kpiDirtyRooms.textContent = dirtyRoomsCount;
        if (kpiDirtySubtext) {
            kpiDirtySubtext.textContent = dirtyRoomsCount === 1 ? '1 habitación requiere limpieza' : `${dirtyRoomsCount} habitaciones requieren limpieza`;
        }
    }

    renderBookingsLists(bookings, rooms, todayISO) {
        const checkInsList = this.shadowRoot.getElementById('checkInsList');
        const checkOutsList = this.shadowRoot.getElementById('checkOutsList');
        
        checkInsList.innerHTML = '';
        checkOutsList.innerHTML = '';

        const roomMap = new Map(rooms.map(r => [r.id, r.name]));

        // Filtrar y eliminar duplicados por ID de reserva
        const checkIns = [];
        const seenCheckIns = new Set();
        bookings.filter(b => b.start_date === todayISO && b.status === 'reserved').forEach(b => {
            if (!seenCheckIns.has(b.id)) {
                seenCheckIns.add(b.id);
                checkIns.push(b);
            }
        });

        const checkOuts = [];
        const seenCheckOuts = new Set();
        bookings.filter(b => b.end_date === todayISO && b.status !== 'checked-out').forEach(b => {
            if (!seenCheckOuts.has(b.id)) {
                seenCheckOuts.add(b.id);
                checkOuts.push(b);
            }
        });
        
        if (checkIns.length > 0) {
            checkIns.forEach(booking => {
                const roomName = roomMap.get(booking.room_id) || `ID: ${booking.room_id}`;
                const li = document.createElement('li');
                li.className = 'activity-item';
                li.innerHTML = `
                    <div class="activity-info">
                        <span class="activity-main">${booking.client_name}</span>
                        <span class="activity-sub">Habitación: ${roomName}</span>
                    </div>
                    <span class="badge badge-blue">Pendiente</span>
                `;
                checkInsList.appendChild(li);
            });
        } else {
            checkInsList.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>No hay check-ins hoy</div>
                </div>
            `;
        }

        if (checkOuts.length > 0) {
            checkOuts.forEach(booking => {
                const roomName = roomMap.get(booking.room_id) || `ID: ${booking.room_id}`;
                const li = document.createElement('li');
                li.className = 'activity-item';
                li.innerHTML = `
                    <div class="activity-info">
                        <span class="activity-main">${booking.client_name}</span>
                        <span class="activity-sub">Habitación: ${roomName}</span>
                    </div>
                    <span class="badge badge-amber">Por Salir</span>
                `;
                checkOutsList.appendChild(li);
            });
        } else {
            checkOutsList.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>No hay check-outs hoy</div>
                </div>
            `;
        }
    }

    renderHousekeepingList(rooms) {
        const list = this.shadowRoot.getElementById('housekeepingList');
        list.innerHTML = '';
        
        const nonCleanRooms = rooms.filter(r => r.clean_status !== 'clean');
        
        if (nonCleanRooms.length > 0) {
            nonCleanRooms.forEach(room => {
                const li = document.createElement('li');
                li.className = 'activity-item';
                
                let badgeClass = 'badge-rose';
                let statusText = 'Sucia';
                if (room.clean_status === 'servicing') {
                    badgeClass = 'badge-amber';
                    statusText = 'En Limpieza';
                }

                li.innerHTML = `
                    <div class="activity-info">
                        <span class="activity-main">${room.name}</span>
                        <span class="activity-sub">Requiere atención</span>
                    </div>
                    <span class="badge ${badgeClass}">${statusText}</span>
                `;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="color: #10b981;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div style="color: #047857; font-weight: 500;">Todas las habitaciones están limpias 🎉</div>
                </div>
            `;
        }
    }

    renderShiftsList(shifts, employees, todayISO) {
        const list = this.shadowRoot.getElementById('shiftsList');
        list.innerHTML = '';
        
        const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));
        const todayShifts = shifts.filter(s => s.shift_date === todayISO);

        // Agrupar turnos por empleado para evitar duplicados
        const shiftsByEmployee = new Map();
        todayShifts.forEach(shift => {
            if (!shiftsByEmployee.has(shift.employee_id)) {
                shiftsByEmployee.set(shift.employee_id, []);
            }
            shiftsByEmployee.get(shift.employee_id).push(shift.shift_type);
        });

        if (shiftsByEmployee.size > 0) {
            shiftsByEmployee.forEach((shiftTypes, employeeId) => {
                const li = document.createElement('li');
                li.className = 'activity-item';
                const employeeName = employeeMap.get(employeeId) || 'Empleado Desconocido';
                const uniqueShiftTypes = [...new Set(shiftTypes)].join(', ');
                
                li.innerHTML = `
                    <div class="activity-info">
                        <span class="activity-main">${employeeName}</span>
                        <span class="activity-sub">Fecha: ${todayISO}</span>
                    </div>
                    <span class="badge badge-emerald">Turno: ${uniqueShiftTypes}</span>
                `;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94-3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                    </svg>
                    <div>No hay personal programado hoy</div>
                </div>
            `;
        }
    }
}

customElements.define('daily-summary', DailySummary);
