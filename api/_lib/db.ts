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

export const DEFAULT_UNITS: UnitRecord[] = [
  {
    id: 'depto-612',
    name: 'Departamento 612 — Full Equipado | Vista al Mar',
    unitNumber: '612',
    tagline: 'FULL EQUIPADO · VISTA AL MAR',
    description:
      'Ubicado en Makana Resort — Tonsupa. Cuenta con 2 camas de 2 plazas, sillón y mesa comedor, cocina equipada, aire acondicionado, Wi-Fi, baño moderno, área de sala-comedor y balcón con vista al mar.',
    bedsLabel: '2 Camas de 2 Plazas · Sillón y Mesa Comedor',
    capacityLabel: 'Makana Resort · Tonsupa',
    maxGuests: 4,
    coverImage: '/images/apt-612/apt612-4.jpg',
    galleryImages: [
      '/images/apt-612/apt612-4.jpg',
      '/images/apt-612/apt612-2.jpg',
      '/images/apt-612/apt612-1.jpg',
      '/images/apt-612/apt612-3.jpg',
    ],
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
    unitNumber: '311',
    tagline: 'TERCER PISO · 49 M² · VISTA AL MAR',
    description:
      'Ubicada en el tercer piso (49 m²) en Makana Resort — Tonsupa. Full equipada con 2 camas de 2 plazas, sofá cama, cocina equipada, aire acondicionado, Wi-Fi, baño moderno y balcón con vista al mar.',
    bedsLabel: '2 Camas de 2 Plazas + Sofá Cama',
    capacityLabel: 'Tercer Piso · 49 m² · Makana Resort',
    maxGuests: 4,
    coverImage: '/images/suite-311/img-05.jpg',
    galleryImages: [
      '/images/suite-311/img-05.jpg',
      '/images/suite-311/img-02.jpg',
      '/images/suite-311/img-01.jpg',
      '/images/suite-311/img-03.jpg',
    ],
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

function enrichUnitRecordWithDefaults(u: UnitRecord): UnitRecord {
  const def = DEFAULT_UNITS.find((d) => d.id === u.id);
  const gallery =
    Array.isArray(u.galleryImages) && u.galleryImages.length > 0
      ? u.galleryImages
      : def?.galleryImages ?? (u.coverImage ? [u.coverImage] : ['/images/apt-612/apt612-4.jpg']);
  const cover = u.coverImage || gallery[0] || def?.coverImage || '/images/apt-612/apt612-4.jpg';

  return {
    ...u,
    unitNumber: u.unitNumber || def?.unitNumber || u.id.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6).toUpperCase(),
    tagline: u.tagline || def?.tagline || 'FULL EQUIPADA · VISTA AL MAR',
    description:
      u.description ||
      def?.description ||
      'Suite equipada en Makana Resort — Tonsupa con cocina completa, aire acondicionado, Wi-Fi y acceso a piscinas, jacuzzi y playa.',
    bedsLabel: u.bedsLabel || def?.bedsLabel || '2 Camas de 2 Plazas',
    capacityLabel: u.capacityLabel || def?.capacityLabel || 'Makana Resort · Tonsupa',
    maxGuests: typeof u.maxGuests === 'number' && u.maxGuests > 0 ? u.maxGuests : def?.maxGuests ?? 4,
    coverImage: cover,
    galleryImages: gallery,
  };
}

function readLocalDb(): LocalDatabaseState {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const stat = fs.statSync(LOCAL_DB_PATH);
      if (cachedLocalState && stat.mtimeMs === cachedLocalMtimeMs) {
        return cachedLocalState;
      }
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as LocalDatabaseState;
      parsed.units = (parsed.units || []).map(enrichUnitRecordWithDefaults);
      cachedLocalState = parsed;
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
        unit_number TEXT NOT NULL DEFAULT '',
        tagline TEXT NOT NULL DEFAULT 'FULL EQUIPADA · VISTA AL MAR',
        description TEXT NOT NULL DEFAULT '',
        beds_label TEXT NOT NULL DEFAULT '2 Camas de 2 Plazas',
        capacity_label TEXT NOT NULL DEFAULT 'Makana Resort · Tonsupa',
        max_guests INTEGER NOT NULL DEFAULT 4,
        cover_image TEXT NOT NULL DEFAULT '/images/apt-612/apt612-4.jpg',
        gallery_images_json JSONB NOT NULL DEFAULT '[]'::jsonb,
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

    // Safe migrations for existing Neon tables
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS unit_number TEXT NOT NULL DEFAULT '';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT 'FULL EQUIPADA · VISTA AL MAR';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS beds_label TEXT NOT NULL DEFAULT '2 Camas de 2 Plazas';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS capacity_label TEXT NOT NULL DEFAULT 'Makana Resort · Tonsupa';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS max_guests INTEGER NOT NULL DEFAULT 4;`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS cover_image TEXT NOT NULL DEFAULT '/images/apt-612/apt612-4.jpg';`;
    await sql`ALTER TABLE units ADD COLUMN IF NOT EXISTS gallery_images_json JSONB NOT NULL DEFAULT '[]'::jsonb;`;

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

    const existingUnits = await sql`SELECT COUNT(*)::int AS cnt FROM units`;
    if ((existingUnits[0]?.cnt ?? 0) === 0) {
      for (const u of DEFAULT_UNITS) {
        await sql`
          INSERT INTO units (
            id, name, unit_number, tagline, description, beds_label, capacity_label,
            max_guests, cover_image, gallery_images_json,
            weekday_rate, weekend_rate, cleaning_fee, min_nights, dual_discount_percent
          )
          VALUES (
            ${u.id}, ${u.name}, ${u.unitNumber || ''}, ${u.tagline || ''}, ${u.description || ''},
            ${u.bedsLabel || ''}, ${u.capacityLabel || ''}, ${u.maxGuests || 4},
            ${u.coverImage || ''}, ${JSON.stringify(u.galleryImages || [])}::jsonb,
            ${u.weekdayRate}, ${u.weekendRate}, ${u.cleaningFee}, ${u.minNights}, ${u.dualDiscountPercent}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    } else {
      // Backfill metadata on default units if they were created prior to metadata columns
      for (const u of DEFAULT_UNITS) {
        await sql`
          UPDATE units
          SET unit_number = CASE WHEN unit_number = '' THEN ${u.unitNumber || ''} ELSE unit_number END,
              description = CASE WHEN description = '' THEN ${u.description || ''} ELSE description END,
              cover_image = CASE WHEN cover_image = '' OR (id = 'suite-311' AND cover_image = '/images/apt-612/apt612-4.jpg') THEN ${u.coverImage || ''} ELSE cover_image END,
              gallery_images_json = CASE WHEN gallery_images_json = '[]'::jsonb THEN ${JSON.stringify(u.galleryImages || [])}::jsonb ELSE gallery_images_json END
          WHERE id = ${u.id};
        `;
      }
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

function mapRowToUnit(r: Record<string, unknown>): UnitRecord {
  const rawGallery = r.gallery_images_json;
  let galleryImages: string[] = [];
  if (Array.isArray(rawGallery)) {
    galleryImages = rawGallery.map(String);
  } else if (typeof rawGallery === 'string') {
    try {
      const parsed = JSON.parse(rawGallery);
      if (Array.isArray(parsed)) galleryImages = parsed.map(String);
    } catch {
      galleryImages = [];
    }
  }

  return enrichUnitRecordWithDefaults({
    id: String(r.id),
    name: String(r.name),
    unitNumber: r.unit_number ? String(r.unit_number) : undefined,
    tagline: r.tagline ? String(r.tagline) : undefined,
    description: r.description ? String(r.description) : undefined,
    bedsLabel: r.beds_label ? String(r.beds_label) : undefined,
    capacityLabel: r.capacity_label ? String(r.capacity_label) : undefined,
    maxGuests: r.max_guests !== undefined ? Number(r.max_guests) : 4,
    coverImage: r.cover_image ? String(r.cover_image) : undefined,
    galleryImages,
    weekdayRate: Number(r.weekday_rate),
    weekendRate: Number(r.weekend_rate),
    cleaningFee: Number(r.cleaning_fee),
    minNights: Number(r.min_nights),
    dualDiscountPercent: Number(r.dual_discount_percent),
    airbnbIcalUrl: r.airbnb_ical_url ? String(r.airbnb_ical_url) : null,
    bookingIcalUrl: r.booking_ical_url ? String(r.booking_ical_url) : null,
    lastIcalSyncAt: r.last_ical_sync_at ? new Date(String(r.last_ical_sync_at)).toISOString() : null,
  });
}

export function slugifyUnitId(rawNameOrSlug: string): string {
  return rawNameOrSlug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export const dbRepository = {
  isUsingNeon(): boolean {
    return Boolean(process.env.DATABASE_URL?.trim());
  },

  async getUnits(): Promise<UnitRecord[]> {
    const sql = await getNeonClient();
    if (sql) {
      const rows = await sql`SELECT * FROM units ORDER BY id ASC`;
      return rows.map((r) => mapRowToUnit(r as Record<string, unknown>));
    }
    return readLocalDb().units;
  },

  async createUnit(
    input: Omit<UnitRecord, 'id' | 'lastIcalSyncAt'> & { id?: string }
  ): Promise<UnitRecord> {
    const cleanId = slugifyUnitId(input.id || input.name) || `suite-${Date.now()}`;
    const gallery =
      Array.isArray(input.galleryImages) && input.galleryImages.length > 0
        ? input.galleryImages
        : input.coverImage
        ? [input.coverImage]
        : ['/images/apt-612/apt612-4.jpg'];
    const cover = input.coverImage || gallery[0] || '/images/apt-612/apt612-4.jpg';

    const record: UnitRecord = enrichUnitRecordWithDefaults({
      id: cleanId,
      name: input.name.trim(),
      unitNumber: input.unitNumber?.trim() || cleanId.toUpperCase(),
      tagline: input.tagline?.trim() || 'FULL EQUIPADA · VISTA AL MAR',
      description:
        input.description?.trim() ||
        'Suite equipada en Makana Resort — Tonsupa con vista al mar, cocina equipada, A/C y Wi-Fi.',
      bedsLabel: input.bedsLabel?.trim() || '2 Camas de 2 Plazas',
      capacityLabel: input.capacityLabel?.trim() || 'Makana Resort · Tonsupa',
      maxGuests: Number(input.maxGuests) || 4,
      coverImage: cover,
      galleryImages: gallery,
      weekdayRate: Number(input.weekdayRate) || 85,
      weekendRate: Number(input.weekendRate) || 110,
      cleaningFee: Number(input.cleaningFee) || 15,
      minNights: Number(input.minNights) || 1,
      dualDiscountPercent: Number(input.dualDiscountPercent ?? 10),
      airbnbIcalUrl: input.airbnbIcalUrl?.trim() || null,
      bookingIcalUrl: input.bookingIcalUrl?.trim() || null,
      lastIcalSyncAt: null,
    });

    const sql = await getNeonClient();
    if (sql) {
      await sql`
        INSERT INTO units (
          id, name, unit_number, tagline, description, beds_label, capacity_label,
          max_guests, cover_image, gallery_images_json,
          weekday_rate, weekend_rate, cleaning_fee, min_nights, dual_discount_percent,
          airbnb_ical_url, booking_ical_url
        )
        VALUES (
          ${record.id}, ${record.name}, ${record.unitNumber || ''}, ${record.tagline || ''},
          ${record.description || ''}, ${record.bedsLabel || ''}, ${record.capacityLabel || ''},
          ${record.maxGuests || 4}, ${record.coverImage || ''},
          ${JSON.stringify(record.galleryImages || [])}::jsonb,
          ${record.weekdayRate}, ${record.weekendRate}, ${record.cleaningFee},
          ${record.minNights}, ${record.dualDiscountPercent},
          ${record.airbnbIcalUrl}, ${record.bookingIcalUrl}
        );
      `;
      return record;
    }

    const state = readLocalDb();
    if (state.units.some((u) => u.id === record.id)) {
      throw new Error(`Ya existe una unidad con el ID "${record.id}".`);
    }
    state.units.push(record);
    writeLocalDb(state);
    return record;
  },

  async updateUnit(
    unitId: UnitId,
    patch: Partial<Omit<UnitRecord, 'id'>>
  ): Promise<UnitRecord | null> {
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    ) as Partial<Omit<UnitRecord, 'id'>>;

    const sql = await getNeonClient();
    if (sql) {
      const current = (await this.getUnits()).find((u) => u.id === unitId);
      if (!current) return null;
      const updated: UnitRecord = enrichUnitRecordWithDefaults({
        ...current,
        ...cleanPatch,
      });
      if (
        Array.isArray(cleanPatch.galleryImages) &&
        cleanPatch.galleryImages.length > 0 &&
        !cleanPatch.coverImage
      ) {
        updated.coverImage = cleanPatch.galleryImages[0];
      }

      await sql`
        UPDATE units
        SET name = ${updated.name},
            unit_number = ${updated.unitNumber || ''},
            tagline = ${updated.tagline || ''},
            description = ${updated.description || ''},
            beds_label = ${updated.bedsLabel || ''},
            capacity_label = ${updated.capacityLabel || ''},
            max_guests = ${updated.maxGuests || 4},
            cover_image = ${updated.coverImage || ''},
            gallery_images_json = ${JSON.stringify(updated.galleryImages || [])}::jsonb,
            weekday_rate = ${updated.weekdayRate},
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
    const merged: UnitRecord = enrichUnitRecordWithDefaults({
      ...state.units[idx],
      ...cleanPatch,
    });
    if (
      Array.isArray(cleanPatch.galleryImages) &&
      cleanPatch.galleryImages.length > 0 &&
      !cleanPatch.coverImage
    ) {
      merged.coverImage = cleanPatch.galleryImages[0];
    }
    state.units[idx] = merged;
    writeLocalDb(state);
    return state.units[idx];
  },

  async deleteUnit(unitId: UnitId): Promise<boolean> {
    const sql = await getNeonClient();
    if (sql) {
      await sql`DELETE FROM calendar_blocks WHERE unit_id = ${unitId}`;
      await sql`DELETE FROM seasonal_rates WHERE unit_id = ${unitId}`;
      const rows = await sql`DELETE FROM units WHERE id = ${unitId} RETURNING id`;
      return rows.length > 0;
    }

    const state = readLocalDb();
    const before = state.units.length;
    state.units = state.units.filter((u) => u.id !== unitId);
    state.calendarBlocks = state.calendarBlocks.filter((b) => b.unitId !== unitId);
    state.seasonalRates = state.seasonalRates.filter((s) => s.unitId !== unitId);
    writeLocalDb(state);
    return state.units.length < before;
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
        createdAt: new Date(String(r.created_at)).toISOString(),
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
        createdAt: new Date(String(r.created_at)).toISOString(),
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
        expiresAt: new Date(String(r.expires_at)).toISOString(),
        createdAt: new Date(String(r.created_at)).toISOString(),
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
        updatedAt: new Date(String(r.updated_at)).toISOString(),
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
        updatedAt: new Date(String(r.updated_at)).toISOString(),
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
