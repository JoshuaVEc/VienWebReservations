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
    const [units, bookings, blocks] = await Promise.all([
      dbRepository.getUnits(),
      dbRepository.getBookings(),
      dbRepository.getCalendarBlocks(),
    ]);

    const allUnitIds = units.map((u) => u.id);
    let unitId: UnitId = allUnitIds[0] || 'depto-612';
    const paramUnit = params.get('unit')?.replace(/\.ics$/i, '')?.trim();

    if (paramUnit && allUnitIds.includes(paramUnit)) {
      unitId = paramUnit;
    } else {
      const matchedFromPath = allUnitIds.find((id) => urlPath.includes(id));
      if (matchedFromPath) {
        unitId = matchedFromPath;
      } else if (paramUnit) {
        unitId = paramUnit;
      }
    }

    const icsContent = generateUnitICalFeed(unitId, bookings, blocks, Date.now(), allUnitIds);

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
