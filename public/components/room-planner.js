class RoomPlanner extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        this.rooms = []; this.bookings = []; this.today = new Date();
        this.currentViewDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
        this.monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        this.daysInMonth = 0; this.currentYear = 0; 
        this.currentMonthIndex = 0; 

        shadow.innerHTML = `
            <style>
            .planner-container { overflow-x: auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; }
            .planner-grid { display: grid; border-collapse: collapse; width: max-content; }
            /* Celdas ahora más pequeñas para morning/afternoon */
            .cell { border: 1px solid #e0e0e0; padding: 4px 2px; text-align: center; cursor: pointer; min-height: 20px; box-sizing: border-box; transition: background-color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em;}
            .cell:hover { background-color: #f2f2f2; }
            .header-cell { background-color: #0056b3; color: white; font-weight: bold; position: sticky; top: 0; z-index: 10; }
            .room-header { background-color: #f9f9f9; color: #333; text-align: left; font-weight: normal; position: sticky; left: 0; z-index: 5; padding: 8px 5px;}
            .time-slot-sub-header { background-color: #0069d9; color: white; font-size: 0.7em; padding: 2px 0; border: 1px solid #e0e0e0; }

            .weekend-cell { background-color: #f0f0f0 !important; color: #555; }
            .weekend-header { background-color: #004494 !important; }
            .weekend-slot-header { background-color: #004494 !important; }
            
            /* Clases de estado de reserva */
            .status-reserved { background-color: #ffeb3b; color: #333; }
            .status-occupied { background-color: #4caf50; color: white; }
            .status-checked-out { background-color: #9e9e9e; color: white; }
            .status-blocked { background-color: #f44336; color: white; }
            .status-liberated { background-color: white; }
            
            /* --- ESTILOS PARA COLUMNA DEL DÍA DE HOY --- */
            .today-column { background-color: #e3f2fd !important; }
            .today-column.weekend-cell { background-color: #bbdefb !important; }
            .today-column.header-cell { background-color: #1976d2 !important; }
            .today-column.time-slot-sub-header { background-color: #1976d2 !important; }

            /* --- NUEVOS ESTILOS PARA EL ESTADO DE LIMPIEZA --- */
            .clean-status-header.clean { border-left: 5px solid #4CAF50; }
            .clean-status-header.dirty { border-left: 5px solid #F44336; }
            .clean-status-header.servicing { border-left: 5px solid #FF9800; }

            /* --- LEYENDA DE COLORES --- */
            .legend { padding: 15px; background-color: #f5f5f5; border-bottom: 1px solid #e0e0e0; display: flex; gap: 20px; flex-wrap: wrap; }
            .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
            .legend-color { width: 20px; height: 20px; border: 1px solid #ccc; border-radius: 3px; }

            .month-selector { padding: 10px; background-color: #e9e9e9; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
            .nav-button { background: #0056b3; color: white; border: none; padding: 5px 10px; cursor: pointer; }
            </style>
            <div class="month-selector">
            <button class="nav-button" id="prevMonth">&lt; Anterior</button>
            <span id="currentMonthDisplay">Mes Actual</span>
            <button class="nav-button" id="nextMonth">Siguiente &gt;</button>
            </div>
            <div class="legend">
            <div class="legend-item">
            <div class="legend-color" style="background-color: #ffeb3b;"></div>
            <span>Reservado</span>
            </div>
            <div class="legend-item">
            <div class="legend-color" style="background-color: #4caf50;"></div>
            <span>Ocupado</span>
            </div>
            <div class="legend-item">
            <div class="legend-color" style="background-color: #9e9e9e;"></div>
            <span>Checkout Realizado</span>
            </div>
            <div class="legend-item">
            <div class="legend-color" style="background-color: #f44336;"></div>
            <span>Bloqueado</span>
            </div>
            <div class="legend-item">
            <div class="legend-color" style="background-color: #e3f2fd;"></div>
            <span>Hoy</span>
            </div>
            </div>
            <div class="planner-container">
            <div class="planner-grid" id="plannerGrid"></div>
            </div>
        `;
    }

    async connectedCallback() {
        await this.fetchData(); 
        this.renderView();
        this.shadowRoot.getElementById('plannerGrid').addEventListener('click', (event) => this.handleGridClick(event));
        document.addEventListener('booking-saved', () => this.refreshPlanner());
        this.shadowRoot.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        this.shadowRoot.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));
        // The event listener for room header clicks was commented out, leaving it that way as it's an enhancement not bug fix.
        // this.shadowRoot.getElementById('plannerGrid').addEventListener('click', (event) => this.handleRoomHeaderClick(event));
    }

    async fetchData() {
        try {
            const [roomsRes, bookingsRes] = await Promise.all([
                fetch('/api/rooms'), fetch('/api/bookings')
            ]);
            if (roomsRes.status === 401 || bookingsRes.status === 401) { window.location.href = '/'; return; }
            const roomsData = await roomsRes.json();
            const bookingsData = await bookingsRes.json();
            this.rooms = roomsData.data; this.bookings = bookingsData.data;
        } catch (error) {
            console.error("Error en fetchData:", error);
        }
    }

    refreshPlanner() {
        this.fetchData().then(() => this.renderView());
    }

    navigateMonth(offset) {
        this.currentViewDate.setMonth(this.currentViewDate.getMonth() + offset);
        this.renderView();
    }

    renderView() {
        this.currentYear = this.currentViewDate.getFullYear();
        this.currentMonthIndex = this.currentViewDate.getMonth();
        this.daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();
        this.shadowRoot.getElementById('currentMonthDisplay').textContent = `${this.monthNames[this.currentMonthIndex]} ${this.currentYear}`;
        this.renderGrid();
    }

    // Helper para obtener la fecha y hora de inicio real de una reserva (UTC)
    getBookingActualStartDateTime(booking) {
        const datePart = booking.start_date + 'T';
        return booking.time_slot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
    }

    // Helper para obtener la fecha y hora de fin real de una reserva (exclusiva, UTC)
    getBookingActualEndDateTime(booking) {
        const endDateObj = new Date(booking.end_date + 'T00:00:00Z'); 
        return booking.time_slot === 'morning' ? new Date(endDateObj.getTime() + (12 * 60 * 60 * 1000)) : new Date(endDateObj.getTime() + (24 * 60 * 60 * 1000));
    }

    // Helper para obtener la fecha y hora de inicio de un slot (UTC)
    getSlotStartDateTime(dateString, timeSlot) {
        const datePart = dateString + 'T';
        return timeSlot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
    }

    // Helper para obtener la fecha y hora de fin de un slot (exclusiva, UTC)
    getSlotEndDateTime(dateString, timeSlot) {
        const datePart = dateString + 'T';
        if (timeSlot === 'morning') {
            return new Date(datePart + '12:00:00Z');
        }
        return new Date(new Date(datePart + '00:00:00Z').getTime() + (24 * 60 * 60 * 1000)); 
    }

    // Encuentra una reserva para un slot específico
    findBookingForSlot(roomId, dateString, timeSlot) {
        const slotStart = this.getSlotStartDateTime(dateString, timeSlot);
        const slotEnd = this.getSlotEndDateTime(dateString, timeSlot);

        return this.bookings.find(b => {
            if (b.room_id != roomId || !b.start_date || !b.end_date) return false;

            const actualBookingStart = this.getBookingActualStartDateTime(b);
            const actualBookingEnd = this.getBookingActualEndDateTime(b);

            // Overlap check: [bookingStart, bookingEnd) vs [slotStart, slotEnd)
            const overlaps = actualBookingStart < slotEnd && actualBookingEnd > slotStart;

            // Only consider active bookings for display
            const isActive = (b.status === 'occupied' || b.status === 'reserved' || b.status === 'checked-out' || b.status === 'paid' || b.status === 'invoiced' || b.status === 'blocked');
            
            return overlaps && isActive;
        });
    }

    // Calcula cuántos slots ocupa una reserva a partir de un slot dado, dentro del mes visible
    getBookingSpanInSlots(booking, startDay, initialTimeSlot) {
        const actualBookingStart = this.getBookingActualStartDateTime(booking);
        const actualBookingEnd = this.getBookingActualEndDateTime(booking);

        let span = 0;
        let currentDay = startDay;
        let currentTimeSlot = initialTimeSlot;

        while (currentDay <= this.daysInMonth) {
            const dateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
            const slotStart = this.getSlotStartDateTime(dateString, currentTimeSlot);
            const slotEnd = this.getSlotEndDateTime(dateString, currentTimeSlot);

            if (actualBookingStart < slotEnd && actualBookingEnd > slotStart) {
                span++;
                // Move to the next logical slot for calculation
                if (currentTimeSlot === 'morning') {
                    currentTimeSlot = 'afternoon';
                } else {
                    currentTimeSlot = 'morning';
                    currentDay++; 
                }
            } else {
                break; // No more overlap within the current month view
            }
            // Stop if the next slot would be beyond the booking's end
            if (slotStart >= actualBookingEnd) break; 
        }
        return span;
    }

    renderGrid() {
        const grid = this.shadowRoot.getElementById('plannerGrid');
        grid.innerHTML = '';

        this.currentYear = this.currentViewDate.getFullYear();
        this.currentMonthIndex = this.currentViewDate.getMonth();
        this.daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();
        
        const numDaySlots = this.daysInMonth * 2; // Each day has a morning and an afternoon slot
        grid.style.gridTemplateColumns = `150px repeat(${numDaySlots}, 40px)`; // Define grid columns

        // --- Render Headers (Rows 1 & 2) ---
        const roomHeaderCorner = document.createElement('div');
        roomHeaderCorner.classList.add('cell', 'header-cell', 'room-header');
        roomHeaderCorner.style.gridColumn = `1`;
        roomHeaderCorner.style.gridRow = `1 / span 2`;
        roomHeaderCorner.textContent = 'Habitación';
        grid.appendChild(roomHeaderCorner);

        let dayOfWeek = new Date(this.currentYear, this.currentMonthIndex, 1).getDay();
        const isCurrentMonthViewed = this.currentYear === this.today.getFullYear() && this.currentMonthIndex === this.today.getMonth();

        for (let i = 1; i <= this.daysInMonth; i++) {
            const date = new Date(this.currentYear, this.currentMonthIndex, i);
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isTodayDay = isCurrentMonthViewed && i === this.today.getDate();
            
            const dayHeaderCell = document.createElement('div');
            dayHeaderCell.classList.add('cell', 'header-cell');
            if (isWeekend) { dayHeaderCell.classList.add('weekend-header'); }
            if (isTodayDay) { dayHeaderCell.classList.add('today-column'); }
            dayHeaderCell.style.gridColumn = `${(i - 1) * 2 + 2} / span 2`; // Starts at column 2, spans 2 slots (morning+afternoon)
            dayHeaderCell.style.gridRow = `1`;
            dayHeaderCell.textContent = i;
            grid.appendChild(dayHeaderCell);

            const morningSubHeaderCell = document.createElement('div');
            morningSubHeaderCell.classList.add('cell', 'time-slot-sub-header');
            if (isWeekend) { morningSubHeaderCell.classList.add('weekend-slot-header'); }
            if (isTodayDay) { morningSubHeaderCell.classList.add('today-column'); }
            morningSubHeaderCell.style.gridColumn = `${(i - 1) * 2 + 2}`; // Specific column for morning slot
            morningSubHeaderCell.style.gridRow = `2`;
            morningSubHeaderCell.textContent = 'M';
            grid.appendChild(morningSubHeaderCell);

            const afternoonSubHeaderCell = document.createElement('div');
            afternoonSubHeaderCell.classList.add('cell', 'time-slot-sub-header');
            if (isWeekend) { afternoonSubHeaderCell.classList.add('weekend-slot-header'); }
            if (isTodayDay) { afternoonSubHeaderCell.classList.add('today-column'); }
            afternoonSubHeaderCell.style.gridColumn = `${(i - 1) * 2 + 3}`; // Specific column for afternoon slot
            afternoonSubHeaderCell.style.gridRow = `2`;
            afternoonSubHeaderCell.textContent = 'T';
            grid.appendChild(afternoonSubHeaderCell);

            dayOfWeek = (dayOfWeek + 1) % 7;
        }

        // --- Pre-process the grid state for visual rendering ---
        // This map tracks which logical grid position (`${roomId}-${gridColumnIndex}`) is covered by a booking
        // and if it's the *start* of a new visual span.
        // Value: { booking: Booking | null, isStartOfSpan: boolean, spanLength: number }
        const visualGridState = new Map();

        // Iterate through rooms and days to determine occupancy for each logical grid slot
        this.rooms.forEach(room => {
            for (let i = 1; i <= this.daysInMonth; i++) {
                const dateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const timeSlots = ['morning', 'afternoon'];

                for (let s = 0; s < timeSlots.length; s++) {
                    const timeSlot = timeSlots[s];
                    const currentGridColumnIndex = (i - 1) * 2 + s + 2; // CSS grid column index (1-based, +1 for room header)
                    const key = `${room.id}-${currentGridColumnIndex}`;

                    const bookingForSlot = this.findBookingForSlot(room.id, dateString, timeSlot);

                    if (bookingForSlot) {
                        // Check if the previous logical slot was part of the same booking
                        let isStartOfSpan = true;
                        if (s > 0) { // Check morning if current is afternoon
                            const prevGridColumnIndex = currentGridColumnIndex - 1;
                            const prevSlotState = visualGridState.get(`${room.id}-${prevGridColumnIndex}`);
                            if (prevSlotState && prevSlotState.booking && prevSlotState.booking.id === bookingForSlot.id) {
                                isStartOfSpan = false;
                            }
                        } else if (i > 1) { // Check previous day's afternoon if current is day's morning
                            const prevDayDate = new Date(this.currentYear, this.currentMonthIndex, i - 1);
                            const prevDateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(prevDayDate.getDate()).padStart(2, '0')}`;
                            // Need to account for the actual column index of the previous day's afternoon slot
                            const prevGridColumnIndex = ((i - 1) - 1) * 2 + 1 + 2; // Previous day's last slot (afternoon) +2 for offset
                            const prevSlotState = visualGridState.get(`${room.id}-${prevGridColumnIndex}`);
                            if (prevSlotState && prevSlotState.booking && prevSlotState.booking.id === bookingForSlot.id) {
                                isStartOfSpan = false;
                            }
                        }

                        // If it's the start of a span, calculate its visual length
                        let spanLength = 1;
                        if (isStartOfSpan) {
                            spanLength = this.getBookingSpanInSlots(bookingForSlot, i, timeSlot);
                        }
                        
                        visualGridState.set(key, { booking: bookingForSlot, isStartOfSpan: isStartOfSpan, spanLength: spanLength });
                    } else {
                        visualGridState.set(key, { booking: null, isStartOfSpan: false, spanLength: 1 }); // Free slot
                    }
                }
            }
        });

        // --- Render Room Rows and Actual Slot Cells based on `visualGridState` ---
        if (this.rooms && this.rooms.length > 0) {
            this.rooms.forEach((room, roomIndex) => {
                const roomGridRow = roomIndex + 3; // Grid row starts after 2 header rows

                const roomHeaderCell = document.createElement('div');
                roomHeaderCell.classList.add('cell', 'room-header', 'clean-status-header', room.clean_status);
                roomHeaderCell.dataset.roomId = room.id;
                roomHeaderCell.style.gridColumn = `1`;
                roomHeaderCell.style.gridRow = `${roomGridRow}`;
                roomHeaderCell.textContent = room.name;
                grid.appendChild(roomHeaderCell);

                for (let i = 1; i <= this.daysInMonth; i++) {
                    const date = new Date(this.currentYear, this.currentMonthIndex, i);
                    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                    const isTodayDay = isCurrentMonthViewed && i === this.today.getDate();

                    const timeSlots = ['morning', 'afternoon'];
                    for (let s = 0; s < timeSlots.length; s++) {
                        const timeSlot = timeSlots[s];
                        const currentGridColumnIndex = (i - 1) * 2 + s + 2; // CSS grid column index
                        const key = `${room.id}-${currentGridColumnIndex}`;
                        const slotInfo = visualGridState.get(key);

                        if (slotInfo && slotInfo.booking && slotInfo.isStartOfSpan) {
                            // This is the start of a booking span. Render one large cell.
                            const booking = slotInfo.booking;
                            const spanLength = slotInfo.spanLength;

                            const bookingCell = document.createElement('div');
                            bookingCell.classList.add('cell', `status-${booking.status}`);
                            if (isTodayDay) { bookingCell.classList.add('today-column'); }
                            // Only liberated cells get weekend styling if a booking is covering it
                            // Otherwise, the booking status color should take precedence.
                            if (isWeekend && booking.status === 'liberated') { bookingCell.classList.add('weekend-cell'); }

                            bookingCell.textContent = `${booking.client_name.split(' ')[0] || ''}`;
                            bookingCell.title = `Reserva: ${booking.client_name} (${booking.start_date} ${booking.time_slot} - ${booking.end_date})`;

                            bookingCell.dataset.bookingId = booking.id;
                            bookingCell.dataset.roomId = room.id;
                            // For click events, data-day and data-time-slot should refer to the start of the span
                            bookingCell.dataset.day = i; 
                            bookingCell.dataset.timeSlot = timeSlot; 

                            bookingCell.style.gridColumn = `${currentGridColumnIndex} / span ${spanLength}`;
                            bookingCell.style.gridRow = `${roomGridRow}`;
                            grid.appendChild(bookingCell);

                        } else if (!slotInfo.booking) { // If it's a free slot
                            // This slot is completely free. Render a single empty cell.
                            const cell = document.createElement('div');
                            cell.classList.add('cell', 'status-liberated');
                            if (isWeekend) { cell.classList.add('weekend-cell'); }
                            if (isTodayDay) { cell.classList.add('today-column'); }
                            
                            cell.dataset.roomId = room.id;
                            cell.dataset.day = i;
                            cell.dataset.timeSlot = timeSlot;
                            cell.style.gridColumn = `${currentGridColumnIndex}`;
                            cell.style.gridRow = `${roomGridRow}`;
                            grid.appendChild(cell);
                        }
                        // If slotInfo exists but is NOT isStartOfSpan (meaning it's covered by a previous span),
                        // we do nothing. The previous spanning div already covers this visual grid cell.
                    }
                }
            });
        }
    }

    // Maneja todos los clics del grid a través de delegación
    handleGridClick(event) {
        let cell = event.target;
        // Traverse up the DOM tree until we find a cell or the plannerGrid container itself
        while (cell && cell !== this.shadowRoot.getElementById('plannerGrid') && !cell.classList.contains('cell')) {
            cell = cell.parentNode;
        }

        // Ensure a valid cell was clicked and it's not a header
        if (cell && cell.classList.contains('cell') && !cell.classList.contains('header-cell') && !cell.classList.contains('room-header')) {
            this.handleCellClickLogic(cell);
        }
    }
   
    // Lógica de click separada que EMITE UN EVENTO
    handleCellClickLogic(cell) {
        const day = parseInt(cell.dataset.day);
        const timeSlot = cell.dataset.timeSlot; 
        const clickedDate = new Date(Date.UTC(this.currentYear, this.currentMonthIndex, day));
        const formattedDate = clickedDate.toISOString().split('T')[0]; 
        const roomId = parseInt(cell.dataset.roomId);
        const roomDetails = this.rooms.find(r => r.id === roomId);

        // Find existing booking that starts *at or before* this specific slot, and covers it.
        // If the cell has a bookingId dataset, it means it's a rendered booking span.
        const existingBookingId = cell.dataset.bookingId ? parseInt(cell.dataset.bookingId) : null;
        const existingBooking = existingBookingId ? this.bookings.find(b => b.id === existingBookingId) : null;

        const eventDetail = {
            roomId: roomId,
            roomName: roomDetails ? roomDetails.name : `Habitación ${roomId}`,
            roomPrice: roomDetails ? roomDetails.price : 0,
            roomCategory: roomDetails ? roomDetails.category : 'standard', // Passing room category for potential icon use
            
            // Usamos los datos de la reserva existente o valores por defecto para NUEVA RESERVA
            startDate: existingBooking ? existingBooking.start_date : formattedDate,
            timeSlot: existingBooking ? existingBooking.time_slot : timeSlot, 
            endDate: existingBooking ? existingBooking.end_date : formattedDate, // For new booking, default end date to start date initially
            clientName: existingBooking ? existingBooking.client_name : '',
            status: existingBooking ? existingBooking.status : 'reserved', // Nueva reserva por defecto es 'reserved'
            pricePerNight: existingBooking ? existingBooking.price_per_night : roomDetails.price,

            bookingId: existingBookingId, // null para nueva reserva
            notes: existingBooking ? existingBooking.notes : '', 
            clientEmail: existingBooking ? existingBooking.email : '', 
            clientId: existingBooking ? existingBooking.client_id : null, 
            source_channel: existingBooking ? existingBooking.source_channel : ''
        };

        document.dispatchEvent(new CustomEvent('open-booking-modal', {
            detail: eventDetail
        }));
    }

    // handleRoomHeaderClick was commented out, leaving it that way as it's an enhancement not bug fix.
    // handleRoomHeaderClick(event) {
    //     const cell = event.target;
    //     if (cell.classList.contains('room-header') && cell.dataset.roomId) { // Ensure it's a room header and has an ID
    //         const roomId = parseInt(cell.dataset.roomId);
    //         const roomDetails = this.rooms.find(r => r.id === roomId);
            
    //         if (roomDetails) {
    //             document.dispatchEvent(new CustomEvent('open-room-details-modal', {
    //                 detail: roomDetails
    //             }));
    //         }
    //     }
    // }
}
customElements.define('room-planner', RoomPlanner);
