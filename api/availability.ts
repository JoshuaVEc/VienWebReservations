import { dbRepository } from './_lib/db';
import { ApiRequest, ApiResponse, getQueryParams, sendJson } from './_lib/http';
import { syncExternalCalendarsIfNeeded } from './_lib/ical';
import {
  calculateStayPricing,
  checkDateRangeAvailability,
  computeOccupiedRanges,
} from './_lib/pricing';
import { BookingUnitSelection } from './_lib/schema';

const VALID_SELECTIONS: BookingUnitSelection[] = [
  'depto-612',
  'suite-311',
  'vien-residence-experience',
];

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    await syncExternalCalendarsIfNeeded(false);

    const params = getQueryParams(req);
    const rawUnit = (params.get('unit') || 'depto-612') as BookingUnitSelection;
    const unitSelection: BookingUnitSelection = VALID_SELECTIONS.includes(rawUnit)
      ? rawUnit
      : 'depto-612';

    const checkIn = params.get('checkIn')?.trim() || '';
    const checkOut = params.get('checkOut')?.trim() || '';

    const [units, seasonalRates, bookings, blocks] = await Promise.all([
      dbRepository.getUnits(),
      dbRepository.getSeasonalRates(),
      dbRepository.getBookings(),
      dbRepository.getCalendarBlocks(),
    ]);

    const occupiedRanges = computeOccupiedRanges(unitSelection, bookings, blocks);

    let available: boolean | null = null;
    let conflicts: typeof occupiedRanges = [];
    let pricing = null;

    if (checkIn && checkOut && checkIn < checkOut) {
      const checkResult = checkDateRangeAvailability(
        unitSelection,
        checkIn,
        checkOut,
        bookings,
        blocks
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
