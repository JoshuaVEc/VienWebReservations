import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import {
  BlockSource,
  BookingRecord,
  BookingStatus,
  BookingUnitSelection,
  CalendarBlockRecord,
  PriceBreakdown,
  SeasonalRateRecord,
  UnitId,
  UnitRecord,
} from './schema.js';

const DEFAULT_UNITS: UnitRecord[] = [
  {
    id: 'depto-612',
    name: 'Departamento 612 — Full Equipado | Vista al Mar',
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
    name: 'Suite 311 — Tercer Piso | 49 m² | Vista al Mar',
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

const DEFAULT_SEASONAL_RATES: Omit<SeasonalRateRecord, 'id' | 'createdAt'>[] = [
  {
    unitId: 'ALL',
    label: 'Feriado Independencia de Cuenca y Difuntos',
    startDate: '2026-10-31',
    endDate: '2026-11-04',
    nightlyRate: 135,
    minNights: 2,
  },
  {
    unitId: 'ALL',
    label: 'Temporada Navidad y Fin de Año',
    startDate: '2026-12-23',
    endDate: '2027-01-03',
    nightlyRate: 150,
    minNights: 3,
  },
  {
    unitId: 'ALL',
    label: 'Feriado de Carnaval 2027',
    startDate: '2027-02-06',
    endDate: '2027-02-10',
    nightlyRate: 145,
    minNights: 3,
  },
];

interface LocalDatabaseState {
  units: UnitRecord[];
  seasonalRates: SeasonalRateRecord[];
  bookings: BookingRecord[];
  calendarBlocks: CalendarBlockRecord[];
  nextSeasonId: number;
  nextBlockId: number;
}

const LOCAL_DB_PATH = path.resolve(process.cwd(), 'data', 'local-db.json');

let cachedLocalState: LocalDatabaseState | null = null;
let cachedLocalMtimeMs = 0;

function readLocalDb(): LocalDatabaseState {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const stat = fs.statSync(LOCAL_DB_PATH);
      if (cachedLocalState && stat.mtimeMs === cachedLocalMtimeMs) {
        return cachedLocalState;
      }
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      cachedLocalState = JSON.parse(raw) as LocalDatabaseState;
      cachedLocalMtimeMs = stat.mtimeMs;
      return cachedLocalState;
    }
  } catch {
    // Fallback to initial seed
  }
  const nowIso = new Date().toISOString();
  const initialState: LocalDatabaseState = {
    units: structuredClone(DEFAULT_UNITS),
    seasonalRates: DEFAULT_SEASONAL_RATES.map((s, idx) => ({
      ...s,
      id: idx + 1,
      createdAt: nowIso,
    })),
    bookings: [],
    calendarBlocks: [],
    nextSeasonId: DEFAULT_SEASONAL_RATES.length + 1,
    nextBlockId: 1,
  };
  writeLocalDb(initialState);
  return initialState;
}

function writeLocalDb(state: LocalDatabaseState): void {
  cachedLocalState = state;
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(state, null, 2), 'utf8');
    cachedLocalMtimeMs = fs.statSync(LOCAL_DB_PATH).mtimeMs;
  } catch {
    // Ignore read-only filesystem errors in ephemeral environments
  }
}

let neonSchemaInitialized = false;

async function getNeonClient() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) return null;
  const sql = neon(dbUrl);

  if (!neonSchemaInitialized) {
    await sql`
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        weekday_rate INTEGER NOT NULL DEFAULT 85,
        weekend_rate INTEGER NOT NULL DEFAULT 110,
        cleaning_fee INTEGER NOT NULL DEFAULT 15,
        min_nights INTEGER NOT NULL DEFAULT 1,
        dual_discount_percent INTEGER NOT NULL DEFAULT 10,
        airbnb_ical_url TEXT,
        booking_ical_url TEXT,
        last_ical_sync_at TIMESTAMPTZ
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS seasonal_rates (
        id SERIAL PRIMARY KEY,
        unit_id TEXT NOT NULL,
        label TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        nightly_rate INTEGER NOT NULL,
        min_nights INTEGER NOT NULL DEFAULT 2,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        booking_code TEXT NOT NULL UNIQUE,
        unit_selection TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        nights INTEGER NOT NULL,
        adults INTEGER NOT NULL,
        children INTEGER NOT NULL DEFAULT 0,
        guest_name TEXT NOT NULL,
        guest_phone TEXT NOT NULL,
        guest_email TEXT NOT NULL,
        special_requests TEXT,
        total_price_usd INTEGER NOT NULL,
        price_breakdown_json JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS calendar_blocks (
        id SERIAL PRIMARY KEY,
        unit_id TEXT NOT NULL,
        source TEXT NOT NULL,
        external_uid TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        summary TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(unit_id, source, external_uid)
      );
    `;

    for (const u of DEFAULT_UNITS) {
      await sql`
        INSERT INTO units (id, name, weekday_rate, weekend_rate, cleaning_fee, min_nights, dual_discount_percent)
        VALUES (${u.id}, ${u.name}, ${u.weekdayRate}, ${u.weekendRate}, ${u.cleaningFee}, ${u.minNights}, ${u.dualDiscountPercent})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    const existingSeasons = await sql`SELECT COUNT(*)::int AS cnt FROM seasonal_rates`;
    if ((existingSeasons[0]?.cnt ?? 0) === 0) {
      for (const s of DEFAULT_SEASONAL_RATES) {
        await sql`
          INSERT INTO seasonal_rates (unit_id, label, start_date, end_date, nightly_rate, min_nights)
          VALUES (${s.unitId}, ${s.label}, ${s.startDate}, ${s.endDate}, ${s.nightlyRate}, ${s.minNights});
        `;
      }
    }

    neonSchemaInitialized = true;
  }

  return sql;
}

export const dbRepository = {
  isUsingNeon(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim());
  },

  async getUnits(): Promise<UnitRecord[]> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`SELECT * FROM units ORDER BY id ASC`;
      return rows.map((r) => ({
        id: r.id as UnitId,
        name: String(r.name),
        weekdayRate: Number(r.weekday_rate),
        weekendRate: Number(r.weekend_rate),
        cleaningFee: Number(r.cleaning_fee),
        minNights: Number(r.min_nights),
        dualDiscountPercent: Number(r.dual_discount_percent),
        airbnbIcalUrl: r.airbnb_ical_url ? String(r.airbnb_ical_url) : null,
        bookingIcalUrl: r.booking_ical_url ? String(r.booking_ical_url) : null,
        lastIcalSyncAt: r.last_ical_sync_at ? new Date(r.last_ical_sync_at).toISOString() : null,
      }));
    }
    return readLocalDb().units;
  },

  async updateUnit(
    unitId: UnitId,
    patch: Partial<
      Pick<
        UnitRecord,
        | 'weekdayRate'
        | 'weekendRate'
        | 'cleaningFee'
        | 'minNights'
        | 'dualDiscountPercent'
        | 'airbnbIcalUrl'
        | 'bookingIcalUrl'
        | 'lastIcalSyncAt'
      >
    >
  ): Promise<UnitRecord | null> {
    const sql = await getNeonClient();
    if (sql) {
      const current = (await this.getUnits()).find((u) => u.id === unitId);
      if (!current) return null;
      const updated: UnitRecord = { ...current, ...patch };
      await sql`
        UPDATE units
        SET weekday_rate = ${updated.weekdayRate},
            weekend_rate = ${updated.weekendRate},
            cleaning_fee = ${updated.cleaningFee},
            min_nights = ${updated.minNights},
            dual_discount_percent = ${updated.dualDiscountPercent},
            airbnb_ical_url = ${updated.airbnbIcalUrl},
            booking_ical_url = ${updated.bookingIcalUrl},
            last_ical_sync_at = ${updated.lastIcalSyncAt}
        WHERE id = ${unitId};
      `;
      return updated;
    }

    const state = readLocalDb();
    const idx = state.units.findIndex((u) => u.id === unitId);
    if (idx === -1) return null;
    state.units[idx] = { ...state.units[idx], ...patch };
    writeLocalDb(state);
    return state.units[idx];
  },

  async getSeasonalRates(): Promise<SeasonalRateRecord[]> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`SELECT * FROM seasonal_rates ORDER BY start_date ASC`;
      return rows.map((r) => ({
        id: Number(r.id),
        unitId: r.unit_id as UnitId | 'ALL',
        label: String(r.label),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        nightlyRate: Number(r.nightly_rate),
        minNights: Number(r.min_nights),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return readLocalDb().seasonalRates.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async addSeasonalRate(
    input: Omit<SeasonalRateRecord, 'id' | 'createdAt'>
  ): Promise<SeasonalRateRecord> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`
        INSERT INTO seasonal_rates (unit_id, label, start_date, end_date, nightly_rate, min_nights)
        VALUES (${input.unitId}, ${input.label}, ${input.startDate}, ${input.endDate}, ${input.nightlyRate}, ${input.minNights})
        RETURNING *;
      `;
      const r = rows[0];
      return {
        id: Number(r.id),
        unitId: r.unit_id as UnitId | 'ALL',
        label: String(r.label),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        nightlyRate: Number(r.nightly_rate),
        minNights: Number(r.min_nights),
        createdAt: new Date(r.created_at).toISOString(),
      };
    }

    const state = readLocalDb();
    const record: SeasonalRateRecord = {
      ...input,
      id: state.nextSeasonId++,
      createdAt: new Date().toISOString(),
    };
    state.seasonalRates.push(record);
    writeLocalDb(state);
    return record;
  },

  async deleteSeasonalRate(id: number): Promise<boolean> {
    const sql = await getNeonClient();
    if (sql) {
      await sql`DELETE FROM seasonal_rates WHERE id = ${id}`;
      return true;
    }
    const state = readLocalDb();
    const before = state.seasonalRates.length;
    state.seasonalRates = state.seasonalRates.filter((s) => s.id !== id);
    writeLocalDb(state);
    return state.seasonalRates.length < before;
  },

  async getBookings(): Promise<BookingRecord[]> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
      return rows.map((r) => ({
        id: String(r.id),
        bookingCode: String(r.booking_code),
        unitSelection: r.unit_selection as BookingUnitSelection,
        checkIn: String(r.check_in),
        checkOut: String(r.check_out),
        nights: Number(r.nights),
        adults: Number(r.adults),
        children: Number(r.children),
        guestName: String(r.guest_name),
        guestPhone: String(r.guest_phone),
        guestEmail: String(r.guest_email),
        specialRequests: r.special_requests ? String(r.special_requests) : null,
        totalPriceUsd: Number(r.total_price_usd),
        priceBreakdownJson: (typeof r.price_breakdown_json === 'string'
          ? JSON.parse(r.price_breakdown_json)
          : r.price_breakdown_json) as PriceBreakdown,
        status: r.status as BookingStatus,
        expiresAt: new Date(r.expires_at).toISOString(),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }
    return readLocalDb().bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getBookingByIdOrCode(idOrCode: string): Promise<BookingRecord | null> {
    const all = await this.getBookings();
    return all.find((b) => b.id === idOrCode || b.bookingCode === idOrCode) ?? null;
  },

  async createBooking(record: BookingRecord): Promise<BookingRecord> {
    const sql = await getNeonClient();
    if (sql) {
      await sql`
        INSERT INTO bookings (
          id, booking_code, unit_selection, check_in, check_out, nights,
          adults, children, guest_name, guest_phone, guest_email,
          special_requests, total_price_usd, price_breakdown_json, status, expires_at, created_at
        ) VALUES (
          ${record.id}, ${record.bookingCode}, ${record.unitSelection}, ${record.checkIn}, ${record.checkOut}, ${record.nights},
          ${record.adults}, ${record.children}, ${record.guestName}, ${record.guestPhone}, ${record.guestEmail},
          ${record.specialRequests}, ${record.totalPriceUsd}, ${JSON.stringify(record.priceBreakdownJson)}::jsonb, ${record.status}, ${record.expiresAt}, ${record.createdAt}
        );
      `;
      return record;
    }

    const state = readLocalDb();
    state.bookings.unshift(record);
    writeLocalDb(state);
    return record;
  },

  async updateBookingStatus(idOrCode: string, status: BookingStatus): Promise<BookingRecord | null> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`
        UPDATE bookings
        SET status = ${status}
        WHERE id = ${idOrCode} OR booking_code = ${idOrCode}
        RETURNING *;
      `;
      if (rows.length === 0) return null;
      return this.getBookingByIdOrCode(idOrCode);
    }

    const state = readLocalDb();
    const target = state.bookings.find((b) => b.id === idOrCode || b.bookingCode === idOrCode);
    if (!target) return null;
    target.status = status;
    writeLocalDb(state);
    return target;
  },

  async getCalendarBlocks(unitId?: UnitId): Promise<CalendarBlockRecord[]> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = unitId
        ? await sql`SELECT * FROM calendar_blocks WHERE unit_id = ${unitId} ORDER BY start_date ASC`
        : await sql`SELECT * FROM calendar_blocks ORDER BY start_date ASC`;
      return rows.map((r) => ({
        id: Number(r.id),
        unitId: r.unit_id as UnitId,
        source: r.source as BlockSource,
        externalUid: String(r.external_uid),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        summary: String(r.summary),
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
    }
    const blocks = readLocalDb().calendarBlocks;
    return (unitId ? blocks.filter((b) => b.unitId === unitId) : blocks).sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );
  },

  async replaceExternalBlocksForSource(
    unitId: UnitId,
    source: 'AIRBNB' | 'BOOKING',
    events: Array<{ externalUid: string; startDate: string; endDate: string; summary: string }>
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const sql = await getNeonClient();
    if (sql) {
      await sql`DELETE FROM calendar_blocks WHERE unit_id = ${unitId} AND source = ${source}`;
      for (const ev of events) {
        await sql`
          INSERT INTO calendar_blocks (unit_id, source, external_uid, start_date, end_date, summary, updated_at)
          VALUES (${unitId}, ${source}, ${ev.externalUid}, ${ev.startDate}, ${ev.endDate}, ${ev.summary}, ${nowIso})
          ON CONFLICT (unit_id, source, external_uid)
          DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, summary = EXCLUDED.summary, updated_at = EXCLUDED.updated_at;
        `;
      }
      await this.updateUnit(unitId, { lastIcalSyncAt: nowIso });
      return;
    }

    const state = readLocalDb();
    state.calendarBlocks = state.calendarBlocks.filter(
      (b) => !(b.unitId === unitId && b.source === source)
    );
    for (const ev of events) {
      state.calendarBlocks.push({
        id: state.nextBlockId++,
        unitId,
        source,
        externalUid: ev.externalUid,
        startDate: ev.startDate,
        endDate: ev.endDate,
        summary: ev.summary,
        updatedAt: nowIso,
      });
    }
    const unit = state.units.find((u) => u.id === unitId);
    if (unit) unit.lastIcalSyncAt = nowIso;
    writeLocalDb(state);
  },

  async addManualBlock(input: {
    unitId: UnitId;
    startDate: string;
    endDate: string;
    summary: string;
  }): Promise<CalendarBlockRecord> {
    const externalUid = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`
        INSERT INTO calendar_blocks (unit_id, source, external_uid, start_date, end_date, summary, updated_at)
        VALUES (${input.unitId}, 'MANUAL', ${externalUid}, ${input.startDate}, ${input.endDate}, ${input.summary}, ${nowIso})
        RETURNING *;
      `;
      const r = rows[0];
      return {
        id: Number(r.id),
        unitId: r.unit_id as UnitId,
        source: 'MANUAL',
        externalUid: String(r.external_uid),
        startDate: String(r.start_date),
        endDate: String(r.end_date),
        summary: String(r.summary),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    }

    const state = readLocalDb();
    const record: CalendarBlockRecord = {
      id: state.nextBlockId++,
      unitId: input.unitId,
      source: 'MANUAL',
      externalUid,
      startDate: input.startDate,
      endDate: input.endDate,
      summary: input.summary,
      updatedAt: nowIso,
    };
    state.calendarBlocks.push(record);
    writeLocalDb(state);
    return record;
  },

  async deleteCalendarBlock(id: number): Promise<boolean> {
    const sql = await getNeonClient();
    if (sql) {
      await sql`DELETE FROM calendar_blocks WHERE id = ${id}`;
      return true;
    }
    const state = readLocalDb();
    const before = state.calendarBlocks.length;
    state.calendarBlocks = state.calendarBlocks.filter((b) => b.id !== id);
    writeLocalDb(state);
    return state.calendarBlocks.length < before;
  },
};
