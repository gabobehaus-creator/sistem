const { Room, Booking } = require('../models');
const { Op } = require('sequelize');

// Helper para obtener la fecha y hora de inicio real de una reserva (UTC)
function getBookingActualStartDateTime(booking) {
    const datePart = booking.start_date + 'T';
    // Using 00:00:00Z for full-day/morning start, 12:00:00Z for afternoon start
    return booking.time_slot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
}

// Helper para obtener la fecha y hora de fin real de una reserva (exclusiva, UTC)
function getBookingActualEndDateTime(booking) {
    const endDateObj = new Date(booking.end_date + 'T00:00:00Z'); // Start of the booking's end_date
    // 'morning' check-out is at 12:00 of end_date
    // 'full-day' or 'afternoon' check-out implies full occupation until end of end_date, so exclusive end is 00:00 of next day.
    return booking.time_slot === 'morning' ? new Date(endDateObj.getTime() + (12 * 60 * 60 * 1000)) : new Date(endDateObj.getTime() + (24 * 60 * 60 * 1000));
}

// Helper para obtener la fecha y hora de inicio de un slot (UTC)
function getSlotStartDateTime(dateString, timeSlot) {
    const datePart = dateString + 'T';
    return timeSlot === 'afternoon' ? new Date(datePart + '12:00:00Z') : new Date(datePart + '00:00:00Z');
}

// Helper para obtener la fecha y hora de fin de un slot (exclusiva, UTC)
function getSlotEndDateTime(dateString, timeSlot) {
    const datePart = dateString + 'T';
    if (timeSlot === 'morning') {
        return new Date(datePart + '12:00:00Z');
    }
    // Afternoon slot ends at midnight of the same day (start of next day)
    return new Date(new Date(datePart + '00:00:00Z').getTime() + (24 * 60 * 60 * 1000)); 
}

async function getMonthlyOccupancy(year) {
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const reportData = [];
    let totalOccupiedSlotsYear = 0;
    let totalAvailableSlotsYear = 0;

    const rooms = await Room.findAll({ attributes: ['id', 'name', 'price'] });

    // Pre-fetch all relevant bookings for the entire year to optimize queries
    const yearStartDate = new Date(year, 0, 1);
    const yearEndDate = new Date(year, 11, 31, 23, 59, 59, 999); // End of the year

    const allRelevantBookings = await Booking.findAll({
        where: {
            [Op.and]: [
                { start_date: { [Op.lte]: yearEndDate.toISOString().split('T')[0] } },
                { end_date: { [Op.gte]: yearStartDate.toISOString().split('T')[0] } },
                { status: { [Op.notIn]: ['cancelled', 'pending'] } } // Only count active bookings
            ]
        }
    });

    for (let i = 0; i < 12; i++) {
        const monthName = months[i];
        const monthIndex = i; // 0-indexed for Date object

        const firstDayOfMonth = new Date(year, monthIndex, 1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);

        const lastDayOfMonthDate = new Date(year, monthIndex + 1, 0); // Last calendar day of the month

        let occupiedSlotsMonth = 0;
        let totalAvailableSlotsMonth = 0;

        // Iterate day by day within the month (inclusive of first and last calendar days)
        for (let day = firstDayOfMonth.getDate(); day <= lastDayOfMonthDate.getDate(); day++) {
            const currentDate = new Date(year, monthIndex, day);
            const dateString = currentDate.toISOString().split('T')[0];

            for (const room of rooms) {
                totalAvailableSlotsMonth += 2; // Each room has 2 slots per day (morning, afternoon)

                // Check morning slot
                const morningSlotStart = getSlotStartDateTime(dateString, 'morning');
                const morningSlotEnd = getSlotEndDateTime(dateString, 'morning');

                const isMorningOccupied = allRelevantBookings.some(booking => {
                    if (booking.room_id !== room.id) return false;
                    const actualBookingStart = getBookingActualStartDateTime(booking);
                    const actualBookingEnd = getBookingActualEndDateTime(booking);
                    // Check for overlap: [bookingStart, bookingEnd) vs [slotStart, slotEnd)
                    return actualBookingStart < morningSlotEnd && actualBookingEnd > morningSlotStart;
                });

                if (isMorningOccupied) {
                    occupiedSlotsMonth++;
                }

                // Check afternoon slot
                const afternoonSlotStart = getSlotStartDateTime(dateString, 'afternoon');
                const afternoonSlotEnd = getSlotEndDateTime(dateString, 'afternoon');

                const isAfternoonOccupied = allRelevantBookings.some(booking => {
                    if (booking.room_id !== room.id) return false;
                    const actualBookingStart = getBookingActualStartDateTime(booking);
                    const actualBookingEnd = getBookingActualEndDateTime(booking);
                    // Check for overlap: [bookingStart, bookingEnd) vs [slotStart, slotEnd)
                    return actualBookingStart < afternoonSlotEnd && actualBookingEnd > afternoonSlotStart;
                });

                if (isAfternoonOccupied) {
                    occupiedSlotsMonth++;
                }
            }
        }

        const occupiedNightsMonth = occupiedSlotsMonth / 2; // Convert slots to equivalent nights (2 slots = 1 night)
        const totalAvailableNightsMonth = totalAvailableSlotsMonth / 2; // Convert slots to equivalent nights

        const percentage = totalAvailableNightsMonth > 0
            ? (occupiedNightsMonth / totalAvailableNightsMonth) * 100
            : 0;

        reportData.push({
            month: monthName,
            occupied_nights: parseFloat(occupiedNightsMonth.toFixed(2)),
            total_available_nights: totalAvailableNightsMonth,
            occupancy_percentage: parseFloat(percentage.toFixed(2))
        });

        totalOccupiedSlotsYear += occupiedSlotsMonth;
        totalAvailableSlotsYear += totalAvailableSlotsMonth;
    }

    const overallOccupancyPercentage = totalAvailableSlotsYear > 0
        ? (totalOccupiedSlotsYear / totalAvailableSlotsYear) * 100
        : 0;
    
    const totalOccupiedNightsYearConverted = totalOccupiedSlotsYear / 2;
    const totalAvailableNightsYearConverted = totalAvailableSlotsYear / 2;
    const averageOccupiedNights = reportData.length > 0 ? totalOccupiedNightsYearConverted / reportData.length : 0;

    return {
        year,
        monthly_data: reportData,
        annual_summary: {
            total_occupied_nights: parseFloat(totalOccupiedNightsYearConverted.toFixed(2)),
            total_available_nights: parseFloat(totalAvailableNightsYearConverted.toFixed(2)), // Fix toFixed for consistency
            average_occupied_nights_per_month: parseFloat(averageOccupiedNights.toFixed(2)),
            overall_occupancy_percentage: parseFloat(overallOccupancyPercentage.toFixed(2))
        }
    };
}

module.exports = { getMonthlyOccupancy };
