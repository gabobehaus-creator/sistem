class OccupancyReportView extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        this.rooms = []; // To store room data for the filter

        shadow.innerHTML = `
            <style>
                .report-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-bottom: 20px; }
                .controls { margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 15px; align-items: center; }
                .control-group label { margin-right: 5px; font-weight: bold; }
                .control-group input, .control-group select, .control-group button { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                .control-group button { background-color: #0056b3; color: white; cursor: pointer; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em; }
                th { background-color: #f2f2f2; }
                .summary-card { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-top: 20px; }
                .summary-card p { margin: 5px 0; }
                .occupied-slot { background-color: #a5d6a7; } /* Light green for occupied slots */
                .free-slot { background-color: #ffe0b2; } /* Light orange for free slots */
                .total-row { font-weight: bold; background-color: #e9e9e9; }
                .total-summary { font-size: 1.1em; font-weight: bold; }
                .message { padding: 10px; background-color: #e0f7fa; border-left: 5px solid #00bcd4; margin-top: 20px; }
            </style>
            <div class="report-card">
                <h2>Reporte de Ocupación por Franjas Horarias</h2>
                <div class="controls">
                    <div class="control-group">
                        <label for="startDate">Desde:</label>
                        <input type="date" id="startDate" value="${this.getFormattedDate(new Date())}">
                    </div>
                    <div class="control-group">
                        <label for="endDate">Hasta:</label>
                        <input type="date" id="endDate" value="${this.getFormattedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}">
                    </div>
                    <div class="control-group">
                        <label for="roomSelect">Habitación:</label>
                        <select id="roomSelect">
                            <option value="">Todas</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <button id="generateReportButton">Generar Reporte</button>
                    </div>
                </div>
                
                <div id="reportSummary" class="summary-card" style="display:none;">
                    <p>Total de franjas disponibles: <span id="totalSlots">0</span></p>
                    <p>Total de franjas ocupadas: <span id="occupiedSlots">0</span></p>
                    <p>Tasa de Ocupación: <span id="occupancyRate">0.00%</span></p>
                </div>

                <div id="reportOutput">
                    <!-- El reporte detallado se renderizará aquí -->
                    <p class="message">Seleccione un rango de fechas y haga clic en "Generar Reporte".</p>
                </div>
            </div>
        `;

        this.shadowRoot.getElementById('generateReportButton').addEventListener('click', () => this.generateReport());
    }

    connectedCallback() {
        this.fetchRooms().then(() => {
            // Generate report on initial load with default dates
            this.generateReport();
        });
    }

    getFormattedDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async fetchRooms() {
        try {
            const response = await fetch('/api/rooms');
            if (response.ok) {
                const data = await response.json();
                this.rooms = data.data;
                this.populateRoomDropdown();
            } else {
                console.error("Error al cargar la lista de habitaciones:", await response.text());
            }
        } catch (error) {
            console.error("Error de red al cargar habitaciones:", error);
        }
    }

    populateRoomDropdown() {
        const roomSelect = this.shadowRoot.getElementById('roomSelect');
        roomSelect.innerHTML = '<option value="">Todas</option>';
        this.rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room.id;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });
    }

    // Helper para obtener la fecha y hora de inicio real de una reserva
    getBookingActualStartDateTime(booking) {
        const datePart = booking.start_date + 'T';
        if (booking.time_slot === 'afternoon') {
            return new Date(datePart + '12:00:00Z');
        }
        return new Date(datePart + '00:00:00Z'); // full-day or morning start at 00:00
    }

    // Helper para obtener la fecha y hora de fin real de una reserva (exclusiva)
    getBookingActualEndDateTime(booking) {
        const endDateObj = new Date(booking.end_date + 'T00:00:00Z'); // Start of the end_date
        if (booking.time_slot === 'morning') {
            return new Date(endDateObj.getTime() + (12 * 60 * 60 * 1000)); // end_date 12:00:00Z
        }
        // For 'full-day' and 'afternoon', the booking occupies until the end of the day.
        // So, the exclusive end is the start of the *next* day.
        return new Date(endDateObj.getTime() + (24 * 60 * 60 * 1000)); // (end_date + 1) 00:00:00Z
    }

    // Helper para obtener la fecha y hora de inicio de un slot
    getSlotStartDateTime(dateString, timeSlot) {
        const datePart = dateString + 'T';
        if (timeSlot === 'afternoon') {
            return new Date(datePart + '12:00:00Z');
        }
        return new Date(datePart + '00:00:00Z');
    }

    // Helper para obtener la fecha y hora de fin de un slot (exclusiva)
    getSlotEndDateTime(dateString, timeSlot) {
        const datePart = dateString + 'T';
        if (timeSlot === 'morning') {
            return new Date(datePart + '12:00:00Z');
        }
        // Afternoon slot ends at midnight of the same day (start of next day)
        return new Date(new Date(datePart + '00:00:00Z').getTime() + (24 * 60 * 60 * 1000)); 
    }

    async generateReport() {
        const startDate = this.shadowRoot.getElementById('startDate').value;
        const endDate = this.shadowRoot.getElementById('endDate').value;
        const selectedRoomId = this.shadowRoot.getElementById('roomSelect').value;
        const reportOutput = this.shadowRoot.getElementById('reportOutput');
        const reportSummary = this.shadowRoot.getElementById('reportSummary');

        if (!startDate || !endDate) {
            reportOutput.innerHTML = '<p class="message error">Por favor, seleccione un rango de fechas válido.</p>';
            reportSummary.style.display = 'none';
            return;
        }

        const queryParams = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        if (selectedRoomId) {
            queryParams.append('room_id', selectedRoomId);
        }

        try {
            // Fetch bookings for the selected date range and optional room
            // NOTE: This endpoint needs to be implemented in your backend!
            const response = await fetch(`/api/bookings/filtered?${queryParams.toString()}`);
            if (response.status === 401) { window.location.href = '/'; return; }
            if (!response.ok) {
                throw new Error(`Error al cargar reservas: ${response.statusText}`);
            }
            const bookingsData = await response.json();
            const filteredBookings = bookingsData.data;

            // Filter rooms based on selection
            const roomsToReport = selectedRoomId ? this.rooms.filter(r => r.id == selectedRoomId) : this.rooms;

            if (roomsToReport.length === 0) {
                reportOutput.innerHTML = '<p class="message">No se encontraron habitaciones para el filtro seleccionado.</p>';
                reportSummary.style.display = 'none';
                return;
            }

            const dailyOccupancy = {}; // { 'YYYY-MM-DD': { 'room_id': { morning: bool, afternoon: bool } } }
            let totalPossibleSlots = 0;
            let totalOccupiedSlots = 0;

            const current = new Date(startDate + 'T00:00:00Z');
            const end = new Date(endDate + 'T00:00:00Z');

            while (current <= end) {
                const dateString = this.getFormattedDate(current);
                dailyOccupancy[dateString] = {};

                roomsToReport.forEach(room => {
                    dailyOccupancy[dateString][room.id] = { morning: false, afternoon: false };
                    totalPossibleSlots += 2; // Each room, each day, has 2 slots

                    // Check morning slot
                    const morningSlotStart = this.getSlotStartDateTime(dateString, 'morning');
                    const morningSlotEnd = this.getSlotEndDateTime(dateString, 'morning');
                    const isMorningOccupied = filteredBookings.some(booking => {
                        const actualBookingStart = this.getBookingActualStartDateTime(booking);
                        const actualBookingEnd = this.getBookingActualEndDateTime(booking);
                        return booking.room_id == room.id &&
                               (booking.status === 'occupied' || booking.status === 'reserved' || booking.status === 'blocked') && // Only active bookings
                               (actualBookingStart < morningSlotEnd && actualBookingEnd > morningSlotStart);
                    });
                    if (isMorningOccupied) {
                        dailyOccupancy[dateString][room.id].morning = true;
                        totalOccupiedSlots++;
                    }

                    // Check afternoon slot
                    const afternoonSlotStart = this.getSlotStartDateTime(dateString, 'afternoon');
                    const afternoonSlotEnd = this.getSlotEndDateTime(dateString, 'afternoon');
                    const isAfternoonOccupied = filteredBookings.some(booking => {
                        const actualBookingStart = this.getBookingActualStartDateTime(booking);
                        const actualBookingEnd = this.getBookingActualEndDateTime(booking);
                        return booking.room_id == room.id &&
                               (booking.status === 'occupied' || booking.status === 'reserved' || booking.status === 'blocked') && // Only active bookings
                               (actualBookingStart < afternoonSlotEnd && actualBookingEnd > afternoonSlotStart);
                    });
                    if (isAfternoonOccupied) {
                        dailyOccupancy[dateString][room.id].afternoon = true;
                        totalOccupiedSlots++;
                    }
                });
                current.setDate(current.getDate() + 1); // Move to next day
            }
            
            this.renderReport(dailyOccupancy, roomsToReport, totalPossibleSlots, totalOccupiedSlots);

        } catch (error) {
            console.error("Error al generar el reporte de ocupación:", error);
            reportOutput.innerHTML = `<p class="message error">Error al generar el reporte: ${error.message}</p>`;
            reportSummary.style.display = 'none';
        }
    }

    renderReport(dailyOccupancy, roomsToReport, totalPossibleSlots, totalOccupiedSlots) {
        const reportOutput = this.shadowRoot.getElementById('reportOutput');
        const reportSummary = this.shadowRoot.getElementById('reportSummary');
        const totalSlotsSpan = this.shadowRoot.getElementById('totalSlots');
        const occupiedSlotsSpan = this.shadowRoot.getElementById('occupiedSlots');
        const occupancyRateSpan = this.shadowRoot.getElementById('occupancyRate');

        if (Object.keys(dailyOccupancy).length === 0 || roomsToReport.length === 0) {
            reportOutput.innerHTML = '<p class="message">No hay datos de ocupación para el rango seleccionado.</p>';
            reportSummary.style.display = 'none';
            return;
        }

        // Render Summary
        totalSlotsSpan.textContent = totalPossibleSlots;
        occupiedSlotsSpan.textContent = totalOccupiedSlots;
        const rate = totalPossibleSlots > 0 ? (totalOccupiedSlots / totalPossibleSlots * 100).toFixed(2) : 0.00;
        occupancyRateSpan.textContent = `${rate}%`;
        reportSummary.style.display = 'block';


        // Render Detailed Table
        let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        ${roomsToReport.map(room => `<th colspan="2">${room.name}</th>`).join('')}
                    </tr>
                    <tr>
                        <th></th>
                        ${roomsToReport.map(() => `<th>M</th><th>T</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        for (const dateString in dailyOccupancy) {
            tableHtml += `<tr><td>${dateString}</td>`;
            roomsToReport.forEach(room => {
                const occupancy = dailyOccupancy[dateString][room.id];
                tableHtml += `<td class="${occupancy.morning ? 'occupied-slot' : 'free-slot'}"></td>`;
                tableHtml += `<td class="${occupancy.afternoon ? 'occupied-slot' : 'free-slot'}"></td>`;
            });
            tableHtml += `</tr>`;
        }
        tableHtml += `</tbody></table>`;
        reportOutput.innerHTML = tableHtml;
    }
}

customElements.define('occupancy-report-view', OccupancyReportView);
