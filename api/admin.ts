import { dbRepository } from './_lib/db.js';
import {
  ApiRequest,
  ApiResponse,
  getQueryParams,
  getRequestOrigin,
  readJsonBody,
  sendJson,
} from './_lib/http.js';
import { syncExternalCalendarsIfNeeded } from './_lib/ical.js';
import {
  buildWhatsAppBookingUrl,
  verifyAdminPassword,
  verifyQuickActionToken,
} from './_lib/notifications.js';
import { BookingStatus, UnitId } from './_lib/schema.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const params = getQueryParams(req);

  // 1. One-click HMAC signed link from email
  if (req.method === 'GET' && params.get('action') === 'quick') {
    const id = params.get('id') || '';
    const status = params.get('status') as BookingStatus;
    const sig = params.get('sig') || '';

    if (
      !id ||
      (status !== 'CONFIRMED' && status !== 'CANCELLED') ||
      !verifyQuickActionToken(id, status, sig)
    ) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<h1>Enlace inválido o no autorizado</h1>');
      return;
    }

    const updated = await dbRepository.updateBookingStatus(id, status);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Reserva Actualizada — Makana Resort</title>
          <style>
            body { background: #12100e; color: #f5f2eb; font-family: sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1rem; }
            .card { max-width: 480px; background: #1c1916; border: 1px solid rgba(201,169,124,0.35); border-radius: 16px; padding: 2rem; text-align: center; }
            .badge { color: #c9a97c; font-size: 0.75rem; letter-spacing: 0.16em; text-transform: uppercase; }
            a { display: inline-block; margin-top: 1.25rem; padding: 0.75rem 1.4rem; background: #c9a97c; color: #12100e; text-decoration: none; border-radius: 8px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">MAKANA RESORT · TONSUPA</span>
            <h2>${
              status === 'CONFIRMED'
                ? '✅ Reserva Confirmada Definitivamente'
                : '❌ Reserva Cancelada / Fechas Liberadas'
            }</h2>
            <p>Código: <strong>${updated?.bookingCode || id}</strong></p>
            <p>Huésped: ${updated?.guestName || '-'}</p>
            <p>Fechas: ${updated?.checkIn || '-'} → ${updated?.checkOut || '-'}</p>
            <a href="/?admin=1">Ir al Panel de Administración</a>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // 2. Password authentication for Admin Dashboard & Mutations
  const headerPwd =
    (req.headers['x-admin-password'] as string) ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
    params.get('password') ||
    '';

  if (!verifyAdminPassword(headerPwd)) {
    sendJson(res, 401, {
      error: 'Contraseña de administrador incorrecta.',
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      await syncExternalCalendarsIfNeeded(false);
      const origin = getRequestOrigin(req);
      const [units, seasonalRates, bookings, calendarBlocks] = await Promise.all([
        dbRepository.getUnits(),
        dbRepository.getSeasonalRates(),
        dbRepository.getBookings(),
        dbRepository.getCalendarBlocks(),
      ]);

      const icalExportUrls: Record<string, string> = {};
      for (const u of units) {
        icalExportUrls[u.id] = `${origin}/api/ical/${encodeURIComponent(u.id)}.ics`;
      }

      sendJson(res, 200, {
        storageEngine: dbRepository.isUsingNeon()
          ? 'Neon PostgreSQL (Serverless)'
          : 'Persistencia Local (data/local-db.json — Configura DATABASE_URL para Neon)',
        units,
        seasonalRates,
        bookings: bookings.map((b) => ({
          ...b,
          whatsappUrl: buildWhatsAppBookingUrl(b),
        })),
        calendarBlocks,
        icalExportUrls,
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody<Record<string, unknown>>(req);
      const op = String(body.op || '');

      if (op === 'updateBookingStatus') {
        const id = String(body.id || '');
        const status = body.status as BookingStatus;
        if (!id || !['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
          sendJson(res, 400, { error: 'Parámetros inválidos' });
          return;
        }
        const updated = await dbRepository.updateBookingStatus(id, status);
        sendJson(res, 200, { booking: updated });
        return;
      }

      if (op === 'createUnit') {
        const name = String(body.name || '').trim();
        if (!name) {
          sendJson(res, 400, { error: 'El nombre de la suite es obligatorio.' });
          return;
        }
        const galleryImages = Array.isArray(body.galleryImages)
          ? body.galleryImages.map(String).filter(Boolean)
          : [];
        const coverImage = String(body.coverImage || galleryImages[0] || '/images/apt-612/apt612-4.jpg').trim();

        const created = await dbRepository.createUnit({
          id: body.id ? String(body.id).trim() : undefined,
          name,
          unitNumber: body.unitNumber ? String(body.unitNumber).trim() : undefined,
          tagline: body.tagline ? String(body.tagline).trim() : undefined,
          description: body.description ? String(body.description).trim() : undefined,
          bedsLabel: body.bedsLabel ? String(body.bedsLabel).trim() : undefined,
          capacityLabel: body.capacityLabel ? String(body.capacityLabel).trim() : undefined,
          maxGuests: body.maxGuests !== undefined ? Number(body.maxGuests) : 4,
          coverImage,
          galleryImages: galleryImages.length > 0 ? galleryImages : [coverImage],
          weekdayRate: Number(body.weekdayRate) || 85,
          weekendRate: Number(body.weekendRate) || 110,
          cleaningFee: Number(body.cleaningFee ?? 15),
          minNights: Number(body.minNights) || 1,
          dualDiscountPercent: Number(body.dualDiscountPercent ?? 10),
          airbnbIcalUrl: body.airbnbIcalUrl ? String(body.airbnbIcalUrl).trim() || null : null,
          bookingIcalUrl: body.bookingIcalUrl ? String(body.bookingIcalUrl).trim() || null : null,
        });
        if (created.airbnbIcalUrl || created.bookingIcalUrl) {
          await syncExternalCalendarsIfNeeded(true);
        }
        sendJson(res, 201, { unit: created });
        return;
      }

      if (op === 'updateUnit') {
        const unitId = String(body.unitId || '').trim();
        if (!unitId) {
          sendJson(res, 400, { error: 'ID de unidad requerido' });
          return;
        }
        const galleryImages = Array.isArray(body.galleryImages)
          ? body.galleryImages.map(String).filter(Boolean)
          : undefined;

        const updated = await dbRepository.updateUnit(unitId, {
          name: body.name !== undefined ? String(body.name).trim() : undefined,
          unitNumber: body.unitNumber !== undefined ? String(body.unitNumber).trim() : undefined,
          tagline: body.tagline !== undefined ? String(body.tagline).trim() : undefined,
          description: body.description !== undefined ? String(body.description).trim() : undefined,
          bedsLabel: body.bedsLabel !== undefined ? String(body.bedsLabel).trim() : undefined,
          capacityLabel:
            body.capacityLabel !== undefined ? String(body.capacityLabel).trim() : undefined,
          maxGuests: body.maxGuests !== undefined ? Number(body.maxGuests) : undefined,
          coverImage: body.coverImage !== undefined ? String(body.coverImage).trim() : undefined,
          galleryImages,
          weekdayRate:
            body.weekdayRate !== undefined ? Number(body.weekdayRate) : undefined,
          weekendRate:
            body.weekendRate !== undefined ? Number(body.weekendRate) : undefined,
          cleaningFee:
            body.cleaningFee !== undefined ? Number(body.cleaningFee) : undefined,
          minNights: body.minNights !== undefined ? Number(body.minNights) : undefined,
          dualDiscountPercent:
            body.dualDiscountPercent !== undefined
              ? Number(body.dualDiscountPercent)
              : undefined,
          airbnbIcalUrl:
            body.airbnbIcalUrl !== undefined
              ? String(body.airbnbIcalUrl).trim() || null
              : undefined,
          bookingIcalUrl:
            body.bookingIcalUrl !== undefined
              ? String(body.bookingIcalUrl).trim() || null
              : undefined,
        });
        if (!updated) {
          sendJson(res, 404, { error: 'Suite no encontrada' });
          return;
        }
        if (updated.airbnbIcalUrl || updated.bookingIcalUrl) {
          await syncExternalCalendarsIfNeeded(true);
        }
        sendJson(res, 200, { unit: updated });
        return;
      }

      if (op === 'deleteUnit') {
        const unitId = String(body.unitId || '').trim();
        if (!unitId) {
          sendJson(res, 400, { error: 'ID de suite requerido' });
          return;
        }
        const deleted = await dbRepository.deleteUnit(unitId);
        sendJson(res, 200, { deleted });
        return;
      }

      if (op === 'addSeasonalRate') {
        const unitId = (body.unitId as UnitId | 'ALL') || 'ALL';
        const label = String(body.label || '').trim();
        const startDate = String(body.startDate || '').trim();
        const endDate = String(body.endDate || '').trim();
        const nightlyRate = Number(body.nightlyRate || 0);
        const minNights = Number(body.minNights || 2);

        if (!label || !startDate || !endDate || startDate > endDate || nightlyRate <= 0) {
          sendJson(res, 400, { error: 'Datos de temporada inválidos' });
          return;
        }
        const created = await dbRepository.addSeasonalRate({
          unitId,
          label,
          startDate,
          endDate,
          nightlyRate,
          minNights,
        });
        sendJson(res, 201, { seasonalRate: created });
        return;
      }

      if (op === 'deleteSeasonalRate') {
        const id = Number(body.id || 0);
        await dbRepository.deleteSeasonalRate(id);
        sendJson(res, 200, { deleted: true });
        return;
      }

      if (op === 'addManualBlock') {
        const unitId = String(body.unitId || '').trim();
        const startDate = String(body.startDate || '').trim();
        const endDate = String(body.endDate || '').trim();
        const summary = String(body.summary || 'Bloqueo Manual Admin').trim();

        if (!unitId || !startDate || !endDate || startDate >= endDate) {
          sendJson(res, 400, { error: 'Rango de fechas de bloqueo inválido' });
          return;
        }
        const block = await dbRepository.addManualBlock({
          unitId,
          startDate,
          endDate,
          summary,
        });
        sendJson(res, 201, { block });
        return;
      }

      if (op === 'deleteCalendarBlock') {
        const id = Number(body.id || 0);
        await dbRepository.deleteCalendarBlock(id);
        sendJson(res, 200, { deleted: true });
        return;
      }

      if (op === 'forceSyncICal') {
        const result = await syncExternalCalendarsIfNeeded(true);
        sendJson(res, 200, result);
        return;
      }

      sendJson(res, 400, { error: `Operación desconocida: ${op}` });
      return;
    }

    sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error interno en panel admin',
    });
  }
}
