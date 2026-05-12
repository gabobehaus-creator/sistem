const bookingCalendarSources = [
    {
        nombre: 'Apart Estudio Economy #102',
        codigo: 'BeH102',
        url: 'https://ical.booking.com/v1/export?t=8ace2e6e-f5f2-4c93-bf2f-47bcd15c9879'
    },
    {
        nombre: 'Apart Estudio #104',
        codigo: 'BeH104',
        url: 'https://ical.booking.com/v1/export?t=b9508e7d-1585-43ec-9ab0-ed5140aee3a9'
    },
    {
        nombre: 'Apart Estudio Economy #202',
        codigo: 'BeH202',
        url: 'https://ical.booking.com/v1/export?t=4600a081-92b7-4502-8eaf-e93c33aba416'
    },
    {
        nombre: 'Apart Ejecutivo #203',
        codigo: 'BeHAE203',
        url: 'https://ical.booking.com/v1/export?t=a4b8c5ff-323e-445a-90a6-d0a29b828aa6'
    },
    {
        nombre: 'Apart Estudio #204',
        codigo: 'AE204',
        url: 'https://ical.booking.com/v1/export?t=7ca104db-8d84-422b-8e62-277d1d52c407'
    },
    {
        nombre: 'Apart Ejecutivo #301',
        codigo: 'BeH301',
        url: 'https://ical.booking.com/v1/export?t=523e0efd-f742-42a4-90f8-835194b4499f'
    },
    {
        nombre: 'Apart Estudio #302',
        codigo: 'BeH302',
        url: 'https://ical.booking.com/v1/export?t=079c3dc6-91e2-414a-94f5-ea99d624d3c3'
    },
    {
        nombre: 'Apart Ejecutivo #303',
        codigo: 'BeH303',
        url: 'https://ical.booking.com/v1/export?t=9fdcd7b5-1b71-4857-90a1-7fbe8981c376'
    },
    {
        nombre: 'Apart Estudio #304',
        codigo: 'BeH304',
        url: 'https://ical.booking.com/v1/export?t=bfdb77d4-d52d-42d0-a9ad-4ce96d4f8e84'
    },
    {
        nombre: 'Apart Ejecutivo #401',
        codigo: 'BeH401',
        url: 'https://ical.booking.com/v1/export?t=a46e613e-e96c-4d86-9a8e-6b7f1963ebe5'
    },
    {
        nombre: 'Apart Estudio #402',
        codigo: 'BeH402',
        url: 'https://ical.booking.com/v1/export?t=f4d9a189-e8d8-4e1e-ba7f-aba65c09e01c'
    },
    {
        nombre: 'Loft Suite #403',
        codigo: 'BeH403',
        url: 'https://ical.booking.com/v1/export?t=51402a52-6a79-40d2-b4fe-10544e71a323'
    },
    {
        nombre: 'Apart Estudio #5D',
        codigo: 'De6-5D',
        url: 'https://ical.booking.com/v1/export?t=52039ef4-e371-4e26-b8ac-330edcf1515b'
    },
    {
        nombre: 'Apart Estudio #6D',
        codigo: 'De5-6D',
        url: 'https://ical.booking.com/v1/export?t=e42e578c-2f98-4fe0-b82f-23ef445e9a9c'
    },
    {
        nombre: 'Apart Ejecutivo #6C',
        codigo: 'De6-6C',
        url: 'https://ical.booking.com/v1/export?t=450b2c6a-10e3-4ce6-a544-bdf4d4eae6d1'
    },
    {
        nombre: 'Apart Ejecutivo #7C',
        codigo: 'De5-7C',
        url: 'https://ical.booking.com/v1/export?t=952d7c60-294b-487d-9e07-d5fa0684379d'
    }
]

class BookingReservas {
    static fuentes = bookingCalendarSources

    static obtenerFuentePorCodigo(codigo) {
        return this.fuentes.find(f => f.codigo === codigo || f.nombre === codigo)
    }

    static async obtenerCalendario(url) {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Error al obtener calendario: ${response.statusText}`)
        }
        return response.text()
    }

    static async obtenerTodosLosCalendarios() {
        return Promise.all(
            this.fuentes.map(async fuente => ({
                ...fuente,
                ics: await this.obtenerCalendario(fuente.url)
            }))
        )
    }
}

export { BookingReservas, bookingCalendarSources }