import { dbRepository } from './db.js';
import { expandUnitsForSelection, isBookingHoldActive } from './pricing.js';
import { BookingRecord, CalendarBlockRecord, UnitId } from './schema.js';

export interface ParsedICalEvent {
  externalUid: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  summary: string;
}

function normalizeICalDateToYmd(rawVal: string): string | null {
  const cleaned = rawVal.trim().replace(/^.*:/, '');
  // Matches YYYYMMDD or YYYYMMDDTHHMMSSZ
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseICalText(icsContent: string): ParsedICalEvent[] {
  // Unfold RFC 5545 folded lines (CRLF followed by space or tab)
  const unfolded = icsContent.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedICalEvent[] = [];
  let inEvent = false;
  let uid = '';
  let startDate: string | null = null;
  let endDate: string | null = null;
  let summary = 'External Reservation';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      uid = '';
      startDate = null;
      endDate = null;
      summary = 'External Reservation';
      continue;
    }
    if (line === 'END:VEVENT') {
      if (inEvent && startDate && endDate && startDate < endDate) {
        events.push({
          externalUid: uid || `evt-${startDate}-${endDate}`,
          startDate,
          endDate,
          summary,
        });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith('UID:')) {
      uid = line.slice(4).trim();
    } else if (line.startsWith('DTSTART')) {
      startDate = normalizeICalDateToYmd(line);
    } else if (line.startsWith('DTEND')) {
      endDate = normalizeICalDateToYmd(line);
    } else if (line.startsWith('SUMMARY')) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        summary = line.slice(idx + 1).trim() || 'Reserved';
      }
    }
  }

  return events;
}

function ymdToICalCompact(ymd: string): string {
  return ymd.replace(/-/g, '');
}

function formatUtcTimestampCompact(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function generateUnitICalFeed(
  unitId: UnitId,
  bookings: BookingRecord[],
  blocks: CalendarBlockRecord[],
  nowMs = Date.now()
): string {
  const unitLabel =
    unitId === 'depto-612'
      ? 'Makana Resort Tonsupa - Departamento 612'
      : 'Makana Resort Tonsupa - Suite 311';

  const dtStamp = formatUtcTimestampCompact(new Date(nowMs));
  const vevents: string[] = [];

  // 1. Direct website bookings (CONFIRMED + active 2-hour PENDING holds)
  for (const b of bookings) {
    if (!isBookingHoldActive(b, nowMs)) continue;
    const targetUnits = expandUnitsForSelection(b.unitSelection);
    if (!targetUnits.includes(unitId)) continue;

    const statusTag = b.status === 'CONFIRMED' ? 'CONFIRMED' : 'HOLD 2H';
    const summaryText = `VIEN ${statusTag} - ${b.bookingCode} (${b.guestName})`;

    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:booking-${b.id}-${unitId}@vien-vacation-home.makana`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${ymdToICalCompact(b.checkIn)}`,
        `DTEND;VALUE=DATE:${ymdToICalCompact(b.checkOut)}`,
        `SUMMARY:${summaryText.replace(/[\r\n,;]/g, ' ')}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  // 2. Manual calendar blocks created by admin
  for (const blk of blocks) {
    if (blk.unitId !== unitId || blk.source !== 'MANUAL') continue;
    vevents.push(
      [
        'BEGIN:VEVENT',
        `UID:${blk.externalUid}-${unitId}@vien-vacation-home.makana`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART;VALUE=DATE:${ymdToICalCompact(blk.startDate)}`,
        `DTEND;VALUE=DATE:${ymdToICalCompact(blk.endDate)}`,
        `SUMMARY:BLOCKED - ${blk.summary.replace(/[\r\n,;]/g, ' ')}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ].join('\r\n')
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vien Vacation Home Makana Resort Tonsupa//iCal Sync Engine 1.0//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${unitLabel}`,
    'X-WR-TIMEZONE:America/Guayaquil',
    ...vevents,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

const ICAL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function syncExternalCalendarsIfNeeded(force = false): Promise<{
  syncedUnits: string[];
  errors: string[];
}> {
  const units = await dbRepository.getUnits();
  const syncedUnits: string[] = [];
  const errors: string[] = [];
  const now = Date.now();

  for (const unit of units) {
    const lastSyncMs = unit.lastIcalSyncAt ? new Date(unit.lastIcalSyncAt).getTime() : 0;
    const isStale = force || now - lastSyncMs > ICAL_CACHE_TTL_MS;
    if (!isStale) continue;

    let didTouch = false;

    const sources: Array<{ source: 'AIRBNB' | 'BOOKING'; url: string | null }> = [
      { source: 'AIRBNB', url: unit.airbnbIcalUrl },
      { source: 'BOOKING', url: unit.bookingIcalUrl },
    ];

    for (const src of sources) {
      if (!src.url || !src.url.trim()) continue;
      didTouch = true;
      try {
        const res = await fetch(src.url.trim(), {
          headers: { 'User-Agent': 'VienVacationHome-iCalSync/1.0' },
        });
        if (!res.ok) {
          errors.push(`${unit.id} (${src.source}): HTTP ${res.status}`);
          continue;
        }
        const text = await res.text();
        const events = parseICalText(text);
        await dbRepository.replaceExternalBlocksForSource(unit.id, src.source, events);
      } catch (err) {
        errors.push(
          `${unit.id} (${src.source}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (didTouch) {
      syncedUnits.push(unit.id);
    }
  }

  return { syncedUnits, errors };
}
