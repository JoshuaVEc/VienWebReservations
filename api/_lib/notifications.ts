import crypto from 'node:crypto';
import { BookingRecord, BookingStatus } from './schema';

const DEFAULT_WHATSAPP_PRIMARY = '593999002427'; // 0999 00 24 27 (Ecuador +593)

export function getAdminSecret(): string {
  return process.env.ADMIN_PASSWORD?.trim() || 'vien-makana-admin-2026';
}

export function signQuickActionToken(bookingId: string, status: BookingStatus): string {
  const hmac = crypto.createHmac('sha256', getAdminSecret());
  hmac.update(`${bookingId}:${status}`);
  return hmac.digest('hex');
}

export function verifyQuickActionToken(
  bookingId: string,
  status: BookingStatus,
  signature: string
): boolean {
  const expected = signQuickActionToken(bookingId, status);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyAdminPassword(inputPassword: string | null | undefined): boolean {
  if (!inputPassword) return false;
  const inputHash = crypto.createHash('sha256').update(inputPassword.trim()).digest();
  const secretHash = crypto.createHash('sha256').update(getAdminSecret()).digest();
  return crypto.timingSafeEqual(inputHash, secretHash);
}

export function getUnitDisplayName(unitSelection: BookingRecord['unitSelection']): string {
  if (unitSelection === 'depto-612') {
    return 'Departamento 612 (Full Equipado · Vista al Mar)';
  }
  if (unitSelection === 'suite-311') {
    return 'Suite 311 (Tercer Piso · 49 m² · Vista al Mar)';
  }
  return 'Reserva Doble: Departamento 612 + Suite 311 (Makana Resort)';
}

export function buildWhatsAppBookingUrl(booking: BookingRecord): string {
  const phone = (process.env.WHATSAPP_PRIMARY || DEFAULT_WHATSAPP_PRIMARY).replace(/\D/g, '');
  const unitTitle = getUnitDisplayName(booking.unitSelection);
  const expiresLocal = new Date(booking.expiresAt).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });

  const messageLines = [
    '🌴 *PRE-RESERVA MAKANA RESORT — TONSUPA*',
    `🔖 *Código:* ${booking.bookingCode}`,
    `🏨 *Unidad:* ${unitTitle}`,
    `📅 *Check-in:* ${booking.checkIn}`,
    `📅 *Check-out:* ${booking.checkOut} (${booking.nights} ${booking.nights === 1 ? 'noche' : 'noches'})`,
    `👥 *Huéspedes:* ${booking.adults} adulto(s), ${booking.children} niño(s)`,
    `💵 *Total estimado:* $${booking.totalPriceUsd} USD`,
    `⏳ *Bloqueo temporal 2h activo hasta:* ${expiresLocal}`,
    '',
    `👤 *Huésped:* ${booking.guestName}`,
    `📱 *Teléfono:* ${booking.guestPhone}`,
    `✉️ *Email:* ${booking.guestEmail}`,
    booking.specialRequests ? `📝 *Notas:* ${booking.specialRequests}` : '',
    '',
    'Hola, acabo de registrar esta pre-reserva en la web. Envío este mensaje para coordinar la transferencia/pago y confirmar definitivamente las fechas.',
  ].filter(Boolean);

  const encoded = encodeURIComponent(messageLines.join('\n'));
  return `https://wa.me/${phone}?text=${encoded}`;
}

export async function sendBookingNotificationEmails(
  booking: BookingRecord,
  originUrl: string
): Promise<{ sent: boolean; detail: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!resendKey) {
    return { sent: false, detail: 'RESEND_API_KEY no configurada (modo WhatsApp directo activo)' };
  }

  const confirmSig = signQuickActionToken(booking.id, 'CONFIRMED');
  const cancelSig = signQuickActionToken(booking.id, 'CANCELLED');

  const confirmUrl = `${originUrl}/api/admin?action=quick&id=${encodeURIComponent(
    booking.id
  )}&status=CONFIRMED&sig=${confirmSig}`;
  const cancelUrl = `${originUrl}/api/admin?action=quick&id=${encodeURIComponent(
    booking.id
  )}&status=CANCELLED&sig=${cancelSig}`;

  const unitTitle = getUnitDisplayName(booking.unitSelection);

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #141210; color: #f5f2eb; border-radius: 12px;">
      <p style="color: #c9a97c; letter-spacing: 0.14em; font-size: 12px; text-transform: uppercase;">MAKANA RESORT · TONSUPA — VIEN VACATION HOME</p>
      <h2 style="margin-top: 4px;">Nueva Pre-Reserva Temporal (Bloqueo 2 Horas): ${booking.bookingCode}</h2>
      <p>Se ha registrado una solicitud de reserva con bloqueo temporal de <strong>2 horas</strong> en el calendario:</p>
      <ul style="line-height: 1.7;">
        <li><strong>Unidad:</strong> ${unitTitle}</li>
        <li><strong>Check-in:</strong> ${booking.checkIn}</li>
        <li><strong>Check-out:</strong> ${booking.checkOut} (${booking.nights} noches)</li>
        <li><strong>Huéspedes:</strong> ${booking.adults} adultos, ${booking.children} niños</li>
        <li><strong>Total calculado:</strong> $${booking.totalPriceUsd} USD</li>
        <li><strong>Nombre:</strong> ${booking.guestName}</li>
        <li><strong>WhatsApp / Teléfono:</strong> ${booking.guestPhone}</li>
        <li><strong>Email:</strong> ${booking.guestEmail}</li>
        <li><strong>Notas:</strong> ${booking.specialRequests || 'Ninguna'}</li>
      </ul>
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <a href="${confirmUrl}" style="background: #2e7d32; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 12px;">
          ✅ CONFIRMAR RESERVA DEFINITIVA (1 CLIC)
        </a>
        <a href="${cancelUrl}" style="background: #c62828; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          ❌ CANCELAR Y LIBERAR FECHAS
        </a>
      </div>
    </div>
  `;

  try {
    const recipients = [adminEmail, booking.guestEmail].filter(Boolean) as string[];
    if (recipients.length === 0) {
      return { sent: false, detail: 'Sin destinatarios configurados' };
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Vien Vacation Home <onboarding@resend.dev>',
        to: recipients,
        subject: `[${booking.bookingCode}] Pre-Reserva ${unitTitle} (${booking.checkIn} al ${booking.checkOut})`,
        html: htmlBody,
      }),
    });
    if (!res.ok) {
      return { sent: false, detail: `Resend HTTP ${res.status}` };
    }
    return { sent: true, detail: 'Correo enviado correctamente vía Resend' };
  } catch (err) {
    return {
      sent: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
