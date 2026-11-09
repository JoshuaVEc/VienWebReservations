import { dbRepository } from './_lib/db.js';
import { ApiRequest, ApiResponse, getQueryParams, sendJson } from './_lib/http.js';
import { generateUnitICalFeed } from './_lib/ical.js';
import { UnitId } from './_lib/schema.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const params = getQueryParams(req);
    const urlPath = (req.url || '').split('?')[0];

    let unitId: UnitId = 'depto-612';
    const paramUnit = params.get('unit')?.replace(/\.ics$/i, '');

    if (paramUnit === 'suite-311' || urlPath.includes('suite-311')) {
      unitId = 'suite-311';
    } else if (paramUnit === 'depto-612' || urlPath.includes('depto-612')) {
      unitId = 'depto-612';
    }

    const [bookings, blocks] = await Promise.all([
      dbRepository.getBookings(),
      dbRepository.getCalendarBlocks(unitId),
    ]);

    const icsContent = generateUnitICalFeed(unitId, bookings, blocks);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${unitId}.ics"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(icsContent);
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Error generating iCal feed',
    });
  }
}
