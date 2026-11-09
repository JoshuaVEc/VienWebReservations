import crypto from 'node:crypto';
import { z } from 'zod';
import { dbRepository } from './_lib/db.js';
import { ApiRequest, ApiResponse, getRequestOrigin, readJsonBody, sendJson } from './_lib/http.js';
import { syncExternalCalendarsIfNeeded } from './_lib/ical.js';
import { buildWhatsAppBookingUrl, sendBookingNotificationEmails } from './_lib/notifications.js';
import { calculateStayPricing, checkDateRangeAvailability } from './_lib/pricing.js';
import { BookingRecord } from './_lib/schema.js';

const CreateBookingSchema = z.object({
  unitSelection: z.enum(['depto-612', 'suite-311', 'vien-residence-experience']),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).default(0),
  guestName: z.string().trim().min(2, 'Ingresa tu nombre completo').max(120),
  guestPhone: z.string().trim().min(6, 'Ingresa tu número de WhatsApp / Teléfono').max(40),
  guestEmail: z.string().trim().email('Ingresa un correo electrónico válido').max(120),
  specialRequests: z.string().trim().max(500).optional().nullable(),
});

const HOLD_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

function generateBookingCode(unitSelection: BookingRecord['unitSelection']): string {
  const unitTag =
    unitSelection === 'depto-612' ? '612' : unitSelection === 'suite-311' ? '311' : 'DUAL';
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `VIEN-${unitTag}-${rand}`;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const rawBody = await readJsonBody(req);
    const parsed = CreateBookingSchema.safeParse(rawBody);
    if (!parsed.success) {
      sendJson(res, 400, {
        error: parsed.error.issues[0]?.message || 'Datos de reserva inválidos',
        issues: parsed.error.issues,
      });
      return;
    }

    const data = parsed.data;
    if (data.checkIn >= data.checkOut) {
      sendJson(res, 400, {
        error: 'La fecha de salida (check-out) debe ser posterior a la fecha de entrada (check-in).',
      });
      return;
    }

    await syncExternalCalendarsIfNeeded(false);

    const [units, seasonalRates, bookings, blocks] = await Promise.all([
      dbRepository.getUnits(),
      dbRepository.getSeasonalRates(),
      dbRepository.getBookings(),
      dbRepository.getCalendarBlocks(),
    ]);

    const availability = checkDateRangeAvailability(
      data.unitSelection,
      data.checkIn,
      data.checkOut,
      bookings,
      blocks
    );

    if (!availability.available) {
      sendJson(res, 409, {
        error:
          'Las fechas seleccionadas ya se encuentran ocupadas o con una pre-reserva activa. Por favor elige otro rango de fechas.',
        conflicts: availability.conflicts,
      });
      return;
    }

    const pricing = calculateStayPricing(
      data.unitSelection,
      data.checkIn,
      data.checkOut,
      units,
      seasonalRates
    );

    if (pricing.nights < pricing.minNightsRequired) {
      sendJson(res, 400, {
        error: `Esta temporada requiere una estadía mínima de ${pricing.minNightsRequired} noches.`,
        pricing,
      });
      return;
    }

    const nowMs = Date.now();
    const createdAtIso = new Date(nowMs).toISOString();
    const expiresAtIso = new Date(nowMs + HOLD_DURATION_MS).toISOString();

    const bookingRecord: BookingRecord = {
      id: crypto.randomUUID(),
      bookingCode: generateBookingCode(data.unitSelection),
      unitSelection: data.unitSelection,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: pricing.nights,
      adults: data.adults,
      children: data.children,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail,
      specialRequests: data.specialRequests || null,
      totalPriceUsd: pricing.totalUsd,
      priceBreakdownJson: pricing,
      status: 'PENDING',
      expiresAt: expiresAtIso,
      createdAt: createdAtIso,
    };

    await dbRepository.createBooking(bookingRecord);

    const originUrl = getRequestOrigin(req);
    const whatsappUrl = buildWhatsAppBookingUrl(bookingRecord);
    const emailStatus = await sendBookingNotificationEmails(bookingRecord, originUrl);

    sendJson(res, 201, {
      booking: bookingRecord,
      pricing,
      whatsappUrl,
      emailStatus,
      holdDurationHours: 2,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno al registrar la reserva',
    });
  }
}
