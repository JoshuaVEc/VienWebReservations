import { dbRepository } from './_lib/db.js';
import { ApiRequest, ApiResponse, getQueryParams, sendJson } from './_lib/http.js';
import { syncExternalCalendarsIfNeeded } from './_lib/ical.js';
import {
  calculateStayPricing,
  checkDateRangeAvailability,
  computeOccupiedRanges,
} from './_lib/pricing.js';
import { BookingUnitSelection } from './_lib/schema.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    await syncExternalCalendarsIfNeeded(false);

    const [units, seasonalRates, bookings, blocks] = await Promise.all([
      dbRepository.getUnits(),
      dbRepository.getSeasonalRates(),
      dbRepository.getBookings(),
      dbRepository.getCalendarBlocks(),
    ]);

    const allUnitIds = units.map((u) => u.id);
    const defaultUnitId = allUnitIds[0] || 'depto-612';

    const params = getQueryParams(req);
    const rawUnit = (params.get('unit') || defaultUnitId).trim();
    const isValidSelection =
      rawUnit === 'vien-residence-experience' || allUnitIds.includes(rawUnit);
    const unitSelection: BookingUnitSelection = isValidSelection ? rawUnit : defaultUnitId;

    const checkIn = params.get('checkIn')?.trim() || '';
    const checkOut = params.get('checkOut')?.trim() || '';

    const occupiedRanges = computeOccupiedRanges(
      unitSelection,
      bookings,
      blocks,
      Date.now(),
      allUnitIds
    );

    let available: boolean | null = null;
    let conflicts: typeof occupiedRanges = [];
    let pricing = null;

    if (checkIn && checkOut && checkIn < checkOut) {
      const checkResult = checkDateRangeAvailability(
        unitSelection,
        checkIn,
        checkOut,
        bookings,
        blocks,
        Date.now(),
        allUnitIds
      );
      available = checkResult.available;
      conflicts = checkResult.conflicts;
      pricing = calculateStayPricing(unitSelection, checkIn, checkOut, units, seasonalRates);
    }

    sendJson(res, 200, {
      unitSelection,
      occupiedRanges,
      available,
      conflicts,
      pricing,
      units,
      seasonalRates,
      holdDurationHours: 2,
    });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Internal Server Error',
    });
  }
}
