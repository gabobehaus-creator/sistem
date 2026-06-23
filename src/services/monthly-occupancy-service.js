const { Room, Booking } = require('../models');
const { Op } = require('sequelize');

async function getMonthlyOccupancy(year) {
    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const reportData = [];
    let totalOccupiedNightsYear = 0;
    let totalAvailableNightsYear = 0;

    const rooms = await Room.findAll({ attributes: ['id', 'name'] });

    for (let i = 0; i < 12; i++) {
        const monthName = months[i];
        const monthIndex = i; // 0-indexed for Date object
        // const monthNumber = i + 1; // 1-indexed for SQL queries/display

        const startDate = new Date(year, monthIndex, 1);
        startDate.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
        const endDate = new Date(year, monthIndex + 1, 0); // Last day of the month
        endDate.setUTCHours(23, 59, 59, 999); // Normalize to end of day UTC
        const daysInMonth = (new Date(year, monthIndex + 1, 0)).getDate(); // Get actual number of days

        let occupiedNightsMonth = 0;
        let totalAvailableNightsMonth = rooms.length * daysInMonth;

        for (const room of rooms) {
            const roomBookings = await Booking.findAll({
                where: {
                    room_id: room.id,
                    // Consider bookings that overlap with the current month
                    [Op.and]: [
                        {
                            start_date: { [Op.lte]: endDate.toISOString().split('T')[0] }
                        },
                        {
                            end_date: { [Op.gte]: startDate.toISOString().split('T')[0] }
                        },
                        {
                             status: { [Op.notIn]: ['cancelled', 'pending'] } // Only count confirmed/occupied bookings
                        }
                    ]
                }
            });

            for (const booking of roomBookings) {
                // Ensure dates are compared consistently, e.g., as UTC midnight
                const bookingStartDate = new Date(booking.start_date + 'T00:00:00Z');
                const bookingEndDate = new Date(booking.end_date + 'T00:00:00Z');

                // Calculate overlap with the current month
                const overlapStart = new Date(Math.max(startDate.getTime(), bookingStartDate.getTime()));
                const overlapEnd = new Date(Math.min(endDate.getTime(), bookingEndDate.getTime()));

                // If there's an actual overlap period
                if (overlapStart < overlapEnd) {
                    const durationMs = overlapEnd.getTime() - overlapStart.getTime();
                    let nights = durationMs / (1000 * 60 * 60 * 24); // Floating point for partial days

                    // Adjust for half-day bookings based on 'time_slot' and if it's a same-day booking
                    const bookingActualDurationDays = (bookingEndDate.getTime() - bookingStartDate.getTime()) / (1000 * 60 * 60 * 24);

                    if (booking.time_slot === 'morning' || booking.time_slot === 'afternoon') {
                        // If it's a single-day half-slot booking (e.g., check-in and check-out on the same calendar day),
                        // and it overlaps, count it as 0.5 occupied nights.
                        if (bookingActualDurationDays === 0) {
                            occupiedNightsMonth += 0.5;
                        } else {
                            // If it's a multi-day booking, even if one end is a half-slot,
                            // we count full nights for the full overlapping days.
                            // This part might need further refinement depending on exact business rules for
                            // how 'morning'/'afternoon' slots impact total 'nights' for multi-day stays.
                            // For simplicity, if it results in crossing a midnight within the month, it's a full night.
                            occupiedNightsMonth += Math.round(nights); // Round to nearest full night
                        }
                    } else {
                        occupiedNightsMonth += Math.round(nights); // Round to nearest full night for full-day bookings
                    }
                }
            }
        }

        const percentage = totalAvailableNightsMonth > 0
            ? (occupiedNightsMonth / totalAvailableNightsMonth) * 100
            : 0;

        reportData.push({
            month: monthName,
            occupied_nights: parseFloat(occupiedNightsMonth.toFixed(2)),
            total_available_nights: totalAvailableNightsMonth,
            occupancy_percentage: parseFloat(percentage.toFixed(2))
        });

        totalOccupiedNightsYear += occupiedNightsMonth;
        totalAvailableNightsYear += totalAvailableNightsMonth;
    }

    const overallOccupancyPercentage = totalAvailableNightsYear > 0
        ? (totalOccupiedNightsYear / totalAvailableNightsYear) * 100
        : 0;
    
    const averageOccupiedNights = reportData.length > 0 ? totalOccupiedNightsYear / reportData.length : 0;

    return {
        year,
        monthly_data: reportData,
        annual_summary: {
            total_occupied_nights: parseFloat(totalOccupiedNightsYear.toFixed(2)),
            total_available_nights: totalAvailableNightsYear,
            average_occupied_nights_per_month: parseFloat(averageOccupiedNights.toFixed(2)),
            overall_occupancy_percentage: parseFloat(overallOccupancyPercentage.toFixed(2))
        }
    };
}

module.exports = { getMonthlyOccupancy };
