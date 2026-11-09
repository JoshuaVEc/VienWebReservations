import {
  BookingRecord,
  BookingUnitSelection,
  CalendarBlockRecord,
  NightlyRateBreakdownItem,
  PriceBreakdown,
  SeasonalRateRecord,
  UnitId,
  UnitRecord,
} from './schema.js';

export function expandUnitsForSelection(selection: BookingUnitSelection): UnitId[] {
  if (selection === 'vien-residence-experience') {
    return ['depto-612', 'suite-311'];
  }
  return [selection];
}

export function parseDateUtc(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function formatDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getNightsList(checkIn: string, checkOut: string): string[] {
  const start = parseDateUtc(checkIn);
  const end = parseDateUtc(checkOut);
  const nights: string[] = [];
  const cur = new Date(start.getTime());
  while (cur.getTime() < end.getTime() && nights.length < 365) {
    nights.push(formatDateUtc(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return nights;
}

export function isBookingHoldActive(booking: BookingRecord, nowMs = Date.now()): boolean {
  if (booking.status === 'CONFIRMED') return true;
  if (booking.status === 'PENDING') {
    const exp = new Date(booking.expiresAt).getTime();
    return exp > nowMs;
  }
  return false;
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  // Half-open interval [checkIn, checkOut): overlap iff startA < endB && startB < endA
  return startA < endB && startB < endA;
}

export interface OccupiedRange {
  unitId: UnitId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  kind: 'CONFIRMED' | 'PENDING_HOLD' | 'AIRBNB' | 'BOOKING' | 'MANUAL';
  label: string;
  expiresAt?: string;
}

export function computeOccupiedRanges(
  unitSelection: BookingUnitSelection,
  bookings: BookingRecord[],
  blocks: CalendarBlockRecord[],
  nowMs = Date.now()
): OccupiedRange[] {
  const targetUnits = expandUnitsForSelection(unitSelection);
  const occupied: OccupiedRange[] = [];

  for (const b of bookings) {
    if (!isBookingHoldActive(b, nowMs)) continue;
    const bookedUnits = expandUnitsForSelection(b.unitSelection);
    for (const u of targetUnits) {
      if (bookedUnits.includes(u)) {
        occupied.push({
          unitId: u,
          startDate: b.checkIn,
          endDate: b.checkOut,
          kind: b.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_HOLD',
          label:
            b.status === 'CONFIRMED'
              ? `Reservado (${b.bookingCode})`
              : `Pre-reserva temporal 2h (${b.bookingCode})`,
          expiresAt: b.status === 'PENDING' ? b.expiresAt : undefined,
        });
      }
    }
  }

  for (const blk of blocks) {
    if (targetUnits.includes(blk.unitId)) {
      occupied.push({
        unitId: blk.unitId,
        startDate: blk.startDate,
        endDate: blk.endDate,
        kind: blk.source,
        label: blk.summary || blk.source,
      });
    }
  }

  return occupied.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function checkDateRangeAvailability(
  unitSelection: BookingUnitSelection,
  checkIn: string,
  checkOut: string,
  bookings: BookingRecord[],
  blocks: CalendarBlockRecord[],
  nowMs = Date.now()
): { available: boolean; conflicts: OccupiedRange[] } {
  if (!checkIn || !checkOut || checkIn >= checkOut) {
    return { available: false, conflicts: [] };
  }
  const occupied = computeOccupiedRanges(unitSelection, bookings, blocks, nowMs);
  const conflicts = occupied.filter((occ) =>
    rangesOverlap(checkIn, checkOut, occ.startDate, occ.endDate)
  );
  return {
    available: conflicts.length === 0,
    conflicts,
  };
}

export function calculateStayPricing(
  unitSelection: BookingUnitSelection,
  checkIn: string,
  checkOut: string,
  units: UnitRecord[],
  seasonalRates: SeasonalRateRecord[]
): PriceBreakdown {
  const nightsList = getNightsList(checkIn, checkOut);
  const targetUnits = expandUnitsForSelection(unitSelection);
  const nightlyItems: NightlyRateBreakdownItem[] = [];

  let minNightsRequired = 1;

  for (const uId of targetUnits) {
    const unitCfg = units.find((u) => u.id === uId) ?? {
      id: uId,
      name: uId,
      weekdayRate: 85,
      weekendRate: 110,
      cleaningFee: 15,
      minNights: 1,
      dualDiscountPercent: 10,
      airbnbIcalUrl: null,
      bookingIcalUrl: null,
      lastIcalSyncAt: null,
    };

    if (unitCfg.minNights > minNightsRequired) {
      minNightsRequired = unitCfg.minNights;
    }

    for (const nightDate of nightsList) {
      // 1. Check seasonal/holiday rules
      const matchingSeason = seasonalRates.find(
        (s) =>
          (s.unitId === uId || s.unitId === 'ALL') &&
          nightDate >= s.startDate &&
          nightDate <= s.endDate
      );

      if (matchingSeason) {
        if (matchingSeason.minNights > minNightsRequired) {
          minNightsRequired = matchingSeason.minNights;
        }
        nightlyItems.push({
          date: nightDate,
          unitId: uId,
          rateUsd: matchingSeason.nightlyRate,
          rateType: 'SEASONAL',
          seasonLabel: matchingSeason.label,
        });
        continue;
      }

      // 2. Check Friday (5) or Saturday (6) for weekend rate
      const dayOfWeek = parseDateUtc(nightDate).getUTCDay();
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

      nightlyItems.push({
        date: nightDate,
        unitId: uId,
        rateUsd: isWeekend ? unitCfg.weekendRate : unitCfg.weekdayRate,
        rateType: isWeekend ? 'WEEKEND' : 'WEEKDAY',
      });
    }
  }

  const subtotalUsd = nightlyItems.reduce((acc, item) => acc + item.rateUsd, 0);

  const cleaningFeeUsd = targetUnits.reduce((acc, uId) => {
    const unitCfg = units.find((u) => u.id === uId);
    return acc + (unitCfg?.cleaningFee ?? 15);
  }, 0);

  let dualDiscountUsd = 0;
  if (unitSelection === 'vien-residence-experience') {
    const discountPct = units[0]?.dualDiscountPercent ?? 10;
    dualDiscountUsd = Math.round((subtotalUsd * discountPct) / 100);
  }

  const totalUsd = Math.max(0, subtotalUsd - dualDiscountUsd + cleaningFeeUsd);

  return {
    nights: nightsList.length,
    nightlyItems,
    subtotalUsd,
    cleaningFeeUsd,
    dualDiscountUsd,
    totalUsd,
    minNightsRequired,
  };
}
