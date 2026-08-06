class RoomPlanner extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        
        this.rooms = []; this.bookings = []; this.today = new Date();
        this.currentViewDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
        this.monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        this.daysInMonth = 0; this.currentYear = 0; this.currentMonthIndex = 0; this.startDate = null;

        shadow.innerHTML = `
            <style>
            .planner-container { overflow-x: auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; }
            .planner-grid { display: grid; border-collapse: collapse; width: max-content; }
            /* Celdas ahora más pequeñas para morning/afternoon */
            .cell { border: 1px solid #e0e0e0; padding: 4px 2px; text-align: center; cursor: pointer; min-height: 20px; box-sizing: border-box; transition: background-color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8em;}
            .cell:hover { background-color: #f2f2f2; }
            .header-cell { background-color: #0056b3; color: white; font-weight: bold; position: sticky; top: 0; z-index: 10; }
            .room-header { background-color: #f9f9f9; color: #333; text-align: left; font-weight: normal; position: sticky; left: 0; z-index: 5; padding: 8px 5px;}
            /* .date-header { /* Estilo para el header de la fecha */ border-right: 1px solid #004494; } */
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

            /* Estilos para celdas de franja horaria específicas */
            /* .cell.morning-slot { border-right: 1px dashed #ccc; } */ /* Separador visual entre mañana y tarde */
            /* .cell.afternoon-slot { } */

            /* --- LEYENDA DE COLORES --- */
            .legend { padding: 15px; background-color: #f5f5f5; border-bottom: 1px solid #e0e0e0; display: flex; gap: 20px; flex-wrap: wrap; }
            .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
            .legend-color { width: 20px; height: 20px; border: 1px solid #ccc; border-radius: 3px; }

            /*
            This block contains a commented-out section for .
            The request is to enable this functionality. The following changes
            will move this logic out of comments and integrate it properly.
            */
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
        // Usamos delegación de eventos en el contenedor principal
        this.shadowRoot.getElementById('plannerGrid').addEventListener('click', (event) => this.handleGridClick(event));
        document.addEventListener('booking-saved', () => this.refreshPlanner());
        this.shadowRoot.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        this.shadowRoot.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));
        // Add event listener for room header clicks
        this.shadowRoot.getElementById('plannerGrid').addEventListener('click', (event) => this.handleRoomHeaderClick(event));
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
//test
    renderView() {
        this.currentYear = this.currentViewDate.getFullYear();
        this.currentMonthIndex = this.currentViewDate.getMonth();
        this.daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();
        this.startDate = new Date(this.currentYear, this.currentMonthIndex, 1);
        this.shadowRoot.getElementById('currentMonthDisplay').textContent = `${this.monthNames[this.currentMonthIndex]} ${this.currentYear}`;
        this.renderGrid();
    }

     // ... dentro de RoomPlanner class ...

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

    // Encuentra una reserva para un slot específico
    findBookingForSlot(roomId, dateString, timeSlot) {
        const slotStart = this.getSlotStartDateTime(dateString, timeSlot);
        const slotEnd = this.getSlotEndDateTime(dateString, timeSlot);

        return this.bookings.find(b => {
            if (b.room_id != roomId || !b.start_date || !b.end_date) return false;

            const actualBookingStart = this.getBookingActualStartDateTime(b);
            const actualBookingEnd = this.getBookingActualEndDateTime(b);

            // Check for overlap: [actualBookingStart, actualBookingEnd) vs [slotStart, slotEnd)
            const overlaps = actualBookingStart < slotEnd && actualBookingEnd > slotStart;

            // Only consider active bookings for display
            const isActive = (b.status === 'occupied' || b.status === 'reserved' || b.status === 'checked-out' || b.status === 'paid' || b.status === 'invoiced' || b.status === 'blocked');
            
            return overlaps && isActive;
        });
    }

    // Calcula cuántos slots ocupa una reserva a partir de un slot dado
    getBookingSpanInSlots(booking, currentDay, initialTimeSlot) {
        const actualBookingStart = this.getBookingActualStartDateTime(booking);
        const actualBookingEnd = this.getBookingActualEndDateTime(booking);

        let span = 0;
        let day = currentDay;
        let timeSlot = initialTimeSlot;

        while (day <= this.daysInMonth) {
            const dateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const slotStart = this.getSlotStartDateTime(dateString, timeSlot);
            const slotEnd = this.getSlotEndDateTime(dateString, timeSlot);

            if (actualBookingStart < slotEnd && actualBookingEnd > slotStart) {
                span++;
                // Move to the next slot
                if (timeSlot === 'morning') {
                    timeSlot = 'afternoon';
                } else {
                    timeSlot = 'morning';
                    day++; // Move to next day
                }
            } else {
                break; // No more overlap
            }
            // If the booking fully covers the current slot, continue to the next
            // If the booking ends mid-slot, stop counting.
            if (slotStart >= actualBookingEnd) break;
        }
        return span;
    }

    renderGrid() {
        const grid = this.shadowRoot.getElementById('plannerGrid');
        grid.innerHTML = '';

        const numDaySlots = this.daysInMonth * 2; // Each day has a morning and an afternoon slot
        this.shadowRoot.querySelector('.planner-grid').style.gridTemplateColumns = `150px repeat(${numDaySlots}, 40px)`;
        // Set up 2 grid rows for headers initially
        this.shadowRoot.querySelector('.planner-grid').style.gridTemplateRows = `auto auto repeat(${this.rooms.length}, auto)`;

        let dayOfWeek = new Date(this.currentYear, this.currentMonthIndex, 1).getDay(); // 0 for Sunday, 6 for Saturday
        const isCurrentMonth = this.currentYear === this.today.getFullYear() && this.currentMonthIndex === this.today.getMonth();

        // 1. Room Header (Top-left, spans 2 header rows)
        const roomHeaderCorner = document.createElement('div');
        roomHeaderCorner.classList.add('cell', 'header-cell', 'room-header');
        roomHeaderCorner.style.gridColumn = `1`;
        roomHeaderCorner.style.gridRow = `1 / span 2`;
        roomHeaderCorner.textContent = 'Habitación';
        grid.appendChild(roomHeaderCorner);

        // 2. Day Headers (Row 1) and Time Slot Sub-headers (Row 2)
        for (let i = 1; i <= this.daysInMonth; i++) {
            const date = new Date(this.currentYear, this.currentMonthIndex, i);
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isToday = isCurrentMonth && i === this.today.getDate();
            
            // Day number header (spans 2 columns, Row 1)
            const dayHeaderCell = document.createElement('div');
            dayHeaderCell.classList.add('cell', 'header-cell');
            if (isWeekend) { dayHeaderCell.classList.add('weekend-header'); }
            if (isToday) { dayHeaderCell.classList.add('today-column'); }
            dayHeaderCell.style.gridColumn = `span 2`; // Spans morning and afternoon slots
            dayHeaderCell.style.gridRow = `1`;
            dayHeaderCell.textContent = i;
            grid.appendChild(dayHeaderCell);

            // Morning Sub-header (Row 2)
            const morningSubHeaderCell = document.createElement('div');
            morningSubHeaderCell.classList.add('cell', 'time-slot-sub-header');
            if (isWeekend) { morningSubHeaderCell.classList.add('weekend-slot-header'); }
            if (isToday) { morningSubHeaderCell.classList.add('today-column'); }
            morningSubHeaderCell.style.gridRow = `2`;
            morningSubHeaderCell.textContent = 'M';
            grid.appendChild(morningSubHeaderCell);

            // Afternoon Sub-header (Row 2)
            const afternoonSubHeaderCell = document.createElement('div');
            afternoonSubHeaderCell.classList.add('cell', 'time-slot-sub-header');
            if (isWeekend) { afternoonSubHeaderCell.classList.add('weekend-slot-header'); }
            if (isToday) { afternoonSubHeaderCell.classList.add('today-column'); }
            afternoonSubHeaderCell.style.gridRow = `2`;
            afternoonSubHeaderCell.textContent = 'T';
            grid.appendChild(afternoonSubHeaderCell);

            dayOfWeek = (dayOfWeek + 1) % 7;
        }

        // 3. Room Rows and Slot Cells
        if (this.rooms && this.rooms.length > 0) {
            this.rooms.forEach((room, roomIndex) => {
                const roomGridRow = roomIndex + 3; // Grid row starts after 2 header rows

                // Room Name Header for this row
                const roomHeaderCell = document.createElement('div');
                roomHeaderCell.classList.add('cell', 'room-header', 'clean-status-header', room.clean_status);
                roomHeaderCell.dataset.roomId = room.id;
                roomHeaderCell.style.gridColumn = `1`;
                roomHeaderCell.style.gridRow = `${roomGridRow}`;
                roomHeaderCell.textContent = room.name;
                grid.appendChild(roomHeaderCell);

                for (let i = 1; i <= this.daysInMonth; i++) {
                    const dateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                    const day = new Date(this.currentYear, this.currentMonthIndex, i);
                    const isWeekend = (day.getDay() === 0 || day.getDay() === 6);
                    const isToday = isCurrentMonth && i === this.today.getDate();
                    
                    // Morning slot cell
                    const morningCell = document.createElement('div');
                    morningCell.classList.add('cell', 'status-liberated', 'morning-slot');
                    morningCell.dataset.roomId = room.id;
                    morningCell.dataset.day = i;
                    morningCell.dataset.timeSlot = 'morning';
                    morningCell.style.gridRow = `${roomGridRow}`;
                    if (isWeekend) { morningCell.classList.add('weekend-cell'); }
                    if (isToday) { morningCell.classList.add('today-column'); }
                    grid.appendChild(morningCell);

                    // Afternoon slot cell
                    const afternoonCell = document.createElement('div');
                    afternoonCell.classList.add('cell', 'status-liberated', 'afternoon-slot');
                    afternoonCell.dataset.roomId = room.id;
                    afternoonCell.dataset.day = i;
                    afternoonCell.dataset.timeSlot = 'afternoon';
                    afternoonCell.style.gridRow = `${roomGridRow}`;
                    if (isWeekend) { afternoonCell.classList.add('weekend-cell'); }
                    if (isToday) { afternoonCell.classList.add('today-column'); }
                    grid.appendChild(afternoonCell);
                }
            });
        }

        // 4. Overlay bookings onto the grid
        const renderedBookings = new Set(); // To track which bookings have been visually rendered with span
        this.bookings.forEach(booking => {
            const roomId = booking.room_id;
            const room = this.rooms.find(r => r.id === roomId);
            if (!room) return; // Skip if room not found

            const actualBookingStart = this.getBookingActualStartDateTime(booking);
            const actualBookingEnd = this.getBookingActualEndDateTime(booking);

            for (let i = 1; i <= this.daysInMonth; i++) {
                const dateString = `${this.currentYear}-${String(this.currentMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                
                ['morning', 'afternoon'].forEach(timeSlot => {
                    const slotStart = this.getSlotStartDateTime(dateString, timeSlot);
                    const slotEnd = this.getSlotEndDateTime(dateString, timeSlot);

                    // Check if the current slot is the *start* of this booking's presence in the planner.
                    // This means `actualBookingStart` is less than or equal to `slotStart`, AND
                    // `slotStart` is within the month being viewed.
                    // And we haven't rendered this booking's span already.
                    if (actualBookingStart <= slotStart && actualBookingStart < actualBookingEnd && slotStart.getMonth() === this.currentMonthIndex) {
                        // Find the corresponding cell element
                        const cellSelector = `[data-room-id="${roomId}"][data-day="${i}"][data-time-slot="${timeSlot}"]`;
                        const cell = grid.querySelector(cellSelector);

                        if (cell && !renderedBookings.has(booking.id)) { // Render only once per booking
                            const spanInSlots = this.getBookingSpanInSlots(booking, i, timeSlot);
                            if (spanInSlots > 0) {
                                cell.classList.remove('status-liberated');
                                cell.classList.add(`status-${booking.status}`);
                                // Check if the current day is a weekend for removing weekend-cell class from occupied cells
                                const currentDateForCheck = new Date(this.currentYear, this.currentMonthIndex, i);
                                if((currentDateForCheck.getDay() === 0 || currentDateForCheck.getDay() === 6) && booking.status !== 'liberated') { 
                                    cell.classList.remove('weekend-cell'); 
                                }
                                cell.textContent = `${booking.client_name.split(' ')[0]} (${booking.time_slot.charAt(0).toUpperCase()})`;
                                cell.dataset.bookingId = booking.id;
                                cell.style.gridColumn = `span ${spanInSlots}`;
                                cell.classList.add('booking-merged');
                                renderedBookings.add(booking.id); // Mark as rendered
                            }
                        }
                    }
                });
            }
        });
    }

    // Maneja todos los clics del grid a través de delegación
    handleGridClick(event) {
        let cell = event.target;
        while (cell !== this.shadowRoot.getElementById('plannerGrid') && !cell.classList.contains('cell')) {
            cell = cell.parentNode;
        }

        if (cell.classList.contains('cell') && !cell.classList.contains('header-cell')) {
            this.handleCellClickLogic(cell);
        }
    }
   
    // Lógica de click separada que EMITE UN EVENTO
    handleCellClickLogic(cell) {
        const day = cell.dataset.day;
        const timeSlot = cell.dataset.timeSlot; // Get the time slot from the clicked cell
        const clickedDate = new Date(Date.UTC(this.currentYear, this.currentMonthIndex, day));
        const formattedDate = clickedDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const roomId = parseInt(cell.dataset.roomId);
        const roomDetails = this.rooms.find(r => r.id === roomId);

        // Find existing booking that starts *at or before* this specific slot, and covers it.
        const existingBooking = this.findBookingForSlot(roomId, formattedDate, timeSlot);

        const eventDetail = {
            roomId: roomId,
            roomName: roomDetails ? roomDetails.name : `Habitación ${roomId}`,
            roomPrice: roomDetails ? roomDetails.price : 0,
            
            // Usamos los datos de la reserva existente o valores por defecto para NUEVA RESERVA
            startDate: existingBooking ? existingBooking.start_date : formattedDate,
            // For a new booking, if a timeSlot is selected, it should start with that.
            // If it's an existing booking, use its time_slot.
            timeSlot: existingBooking ? existingBooking.time_slot : timeSlot, 
            endDate: existingBooking ? existingBooking.end_date : '', 
            clientName: existingBooking ? existingBooking.client_name : '',
            status: existingBooking ? existingBooking.status : 'reserved', // Nueva reserva por defecto es 'reserved'
            pricePerNight: existingBooking ? existingBooking.price_per_night : roomDetails.price,

            bookingId: existingBooking ? existingBooking.id : null, // null para nueva reserva
            notes: existingBooking ? existingBooking.notes : '', // Notas de la reserva existente o vacío
            clientEmail: existingBooking ? existingBooking.email : '', // Pass email if exists
            clientId: existingBooking ? existingBooking.client_id : null, // Pass client ID for company dropdown
            source_channel: existingBooking ? existingBooking.source_channel : ''
        };

        document.dispatchEvent(new CustomEvent('open-booking-modal', {
            detail: eventDetail
        }));
    }

    handleRoomHeaderClick(event) {
        const cell = event.target;
        if (cell.classList.contains('room-header') && cell.dataset.roomId) { // Ensure it's a room header and has an ID
            const roomId = parseInt(cell.dataset.roomId);
            const roomDetails = this.rooms.find(r => r.id === roomId);
            
            if (roomDetails) {
                document.dispatchEvent(new CustomEvent('open-room-details-modal', {
                    detail: roomDetails
                }));
            }
        }
    }
} 
customElements.define('room-planner', RoomPlanner);
