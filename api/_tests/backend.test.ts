import assert from 'node:assert/strict';
import {
  calculateStayPricing,
  checkDateRangeAvailability,
} from '../_lib/pricing';
import { generateUnitICalFeed, parseICalText } from '../_lib/ical';
import {
  buildWhatsAppBookingUrl,
  signQuickActionToken,
  verifyQuickActionToken,
} from '../_lib/notifications';
import {
  BookingRecord,
  CalendarBlockRecord,
  SeasonalRateRecord,
  UnitRecord,
} from '../_lib/schema';

const mockUnits: UnitRecord[] = [
  {
    id: 'depto-612',
    name: 'Departamento 612',
    weekdayRate: 85,
    weekendRate: 110,
    cleaningFee: 15,
    minNights: 1,
    dualDiscountPercent: 10,
    airbnbIcalUrl: null,
    bookingIcalUrl: null,
    lastIcalSyncAt: null,
  },
  {
    id: 'suite-311',
    name: 'Suite 311',
    weekdayRate: 85,
    weekendRate: 110,
    cleaningFee: 15,
    minNights: 1,
    dualDiscountPercent: 10,
    airbnbIcalUrl: null,
    bookingIcalUrl: null,
    lastIcalSyncAt: null,
  },
];

const mockSeasons: SeasonalRateRecord[] = [
  {
    id: 1,
    unitId: 'ALL',
    label: 'Fin de Año',
    startDate: '2026-12-29',
    endDate: '2027-01-02',
    nightlyRate: 150,
    minNights: 3,
    createdAt: new Date().toISOString(),
  },
];

console.log('1. Probando motor de tarifas (Entre semana, Fin de semana, Temporada y Reserva Doble)...');
// 2026-11-12 is Thursday ($85), 2026-11-13 is Friday ($110), 2026-11-14 is Saturday ($110)
const quoteSingle = calculateStayPricing(
  'depto-612',
  '2026-11-12',
  '2026-11-15',
  mockUnits,
  mockSeasons
);
assert.equal(quoteSingle.nights, 3);
assert.equal(quoteSingle.subtotalUsd, 85 + 110 + 110); // 305
assert.equal(quoteSingle.cleaningFeeUsd, 15);
assert.equal(quoteSingle.totalUsd, 320);

// Dual booking (612 + 311) for same dates: subtotal = 610, 10% discount = 61, cleaning = 30 -> total = 579
const quoteDual = calculateStayPricing(
  'vien-residence-experience',
  '2026-11-12',
  '2026-11-15',
  mockUnits,
  mockSeasons
);
assert.equal(quoteDual.subtotalUsd, 610);
assert.equal(quoteDual.dualDiscountUsd, 61);
assert.equal(quoteDual.cleaningFeeUsd, 30);
assert.equal(quoteDual.totalUsd, 579);

// Seasonal pricing test (2026-12-29 to 2027-01-01 = 3 nights @ $150 = $450 + $15 cleaning = $465)
const quoteSeason = calculateStayPricing(
  'suite-311',
  '2026-12-29',
  '2027-01-01',
  mockUnits,
  mockSeasons
);
assert.equal(quoteSeason.subtotalUsd, 450);
assert.equal(quoteSeason.minNightsRequired, 3);
console.log('   ✓ Cálculo de tarifas verificado correctamente.');

console.log('2. Probando bloqueo temporal PENDING de 2 horas y liberación automática...');
const nowMs = Date.parse('2026-11-02T16:00:00Z');
const activeHoldBooking: BookingRecord = {
  id: 'b-active',
  bookingCode: 'VIEN-612-AA11',
  unitSelection: 'depto-612',
  checkIn: '2026-11-12',
  checkOut: '2026-11-15',
  nights: 3,
  adults: 2,
  children: 0,
  guestName: 'Carlos Mendoza',
  guestPhone: '0999002427',
  guestEmail: 'carlos@example.com',
  specialRequests: null,
  totalPriceUsd: 320,
  priceBreakdownJson: quoteSingle,
  status: 'PENDING',
  expiresAt: new Date(nowMs + 90 * 60 * 1000).toISOString(), // 1.5h in future (active)
  createdAt: new Date(nowMs - 30 * 60 * 1000).toISOString(),
};

const expiredHoldBooking: BookingRecord = {
  ...activeHoldBooking,
  id: 'b-expired',
  bookingCode: 'VIEN-311-BB22',
  unitSelection: 'suite-311',
  expiresAt: new Date(nowMs - 5 * 60 * 1000).toISOString(), // Expired 5 mins ago
};

// Depto 612 should be blocked while within 2h window
const avail612 = checkDateRangeAvailability(
  'depto-612',
  '2026-11-13',
  '2026-11-16',
  [activeHoldBooking, expiredHoldBooking],
  [],
  nowMs
);
assert.equal(avail612.available, false);

// Dual booking should also be blocked because Depto 612 is occupied
const availDual = checkDateRangeAvailability(
  'vien-residence-experience',
  '2026-11-13',
  '2026-11-16',
  [activeHoldBooking, expiredHoldBooking],
  [],
  nowMs
);
assert.equal(availDual.available, false);

// Suite 311 hold expired (> 2h), so Suite 311 is automatically free!
const avail311 = checkDateRangeAvailability(
  'suite-311',
  '2026-11-13',
  '2026-11-16',
  [activeHoldBooking, expiredHoldBooking],
  [],
  nowMs
);
assert.equal(avail311.available, true);
console.log('   ✓ Bloqueo temporal de 2h y expiración automática verificados.');

console.log('3. Probando exportación e importación iCal (.ics) para Airbnb y Booking.com...');
const manualBlocks: CalendarBlockRecord[] = [
  {
    id: 1,
    unitId: 'depto-612',
    source: 'MANUAL',
    externalUid: 'manual-1',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    summary: 'Mantenimiento',
    updatedAt: new Date(nowMs).toISOString(),
  },
];
const icsFeed612 = generateUnitICalFeed(
  'depto-612',
  [activeHoldBooking, expiredHoldBooking],
  manualBlocks,
  nowMs
);
assert.ok(icsFeed612.includes('BEGIN:VCALENDAR'));
assert.ok(icsFeed612.includes('VIEN HOLD 2H - VIEN-612-AA11'));
assert.ok(icsFeed612.includes('DTSTART;VALUE=DATE:20261112'));

const parsedEvents = parseICalText(icsFeed612);
assert.equal(parsedEvents.length, 2); // active hold + manual block
assert.equal(parsedEvents[0].startDate, '2026-11-12');
assert.equal(parsedEvents[0].endDate, '2026-11-15');
assert.equal(parsedEvents[1].startDate, '2026-12-01');
assert.equal(parsedEvents[1].endDate, '2026-12-05');
console.log('   ✓ Sincronización bidireccional iCal (.ics) verificada.');

console.log('4. Probando enlaces firmados HMAC de 1 clic y generador de WhatsApp (0999 00 24 27)...');
const sig = signQuickActionToken(activeHoldBooking.id, 'CONFIRMED');
assert.equal(verifyQuickActionToken(activeHoldBooking.id, 'CONFIRMED', sig), true);
assert.equal(verifyQuickActionToken(activeHoldBooking.id, 'CANCELLED', sig), false);

const waUrl = buildWhatsAppBookingUrl(activeHoldBooking);
assert.ok(waUrl.startsWith('https://wa.me/593999002427?text='));
assert.ok(decodeURIComponent(waUrl).includes('VIEN-612-AA11'));
console.log('   ✓ Enlaces de 1 clic y WhatsApp verificados.');

console.log('\n✅ TODAS LAS PRUEBAS DEL BACKEND PASARON EXITOSAMENTE.');
