import {
  pgTable,
  text,
  integer,
  timestamp,
  serial,
  jsonb,
} from 'drizzle-orm/pg-core';

export type UnitId = 'depto-612' | 'suite-311';
export type BookingUnitSelection = UnitId | 'vien-residence-experience';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type BlockSource = 'AIRBNB' | 'BOOKING' | 'MANUAL';

export interface NightlyRateBreakdownItem {
  date: string; // YYYY-MM-DD
  unitId: UnitId;
  rateUsd: number;
  rateType: 'WEEKDAY' | 'WEEKEND' | 'SEASONAL';
  seasonLabel?: string;
}

export interface PriceBreakdown {
  nights: number;
  nightlyItems: NightlyRateBreakdownItem[];
  subtotalUsd: number;
  cleaningFeeUsd: number;
  dualDiscountUsd: number;
  totalUsd: number;
  minNightsRequired: number;
}

// 1. Units Configuration Table
export const unitsTable = pgTable('units', {
  id: text('id').primaryKey(), // 'depto-612' | 'suite-311'
  name: text('name').notNull(),
  weekdayRate: integer('weekday_rate').notNull().default(85),
  weekendRate: integer('weekend_rate').notNull().default(110),
  cleaningFee: integer('cleaning_fee').notNull().default(15),
  minNights: integer('min_nights').notNull().default(1),
  dualDiscountPercent: integer('dual_discount_percent').notNull().default(10),
  airbnbIcalUrl: text('airbnb_ical_url'),
  bookingIcalUrl: text('booking_ical_url'),
  lastIcalSyncAt: timestamp('last_ical_sync_at', { withTimezone: true }),
});

// 2. Seasonal / Holiday Rates Table
export const seasonalRatesTable = pgTable('seasonal_rates', {
  id: serial('id').primaryKey(),
  unitId: text('unit_id').notNull(), // 'depto-612' | 'suite-311' | 'ALL'
  label: text('label').notNull(), // e.g. 'Feriado Fin de Año', 'Carnaval'
  startDate: text('start_date').notNull(), // YYYY-MM-DD (inclusive)
  endDate: text('end_date').notNull(), // YYYY-MM-DD (inclusive)
  nightlyRate: integer('nightly_rate').notNull(),
  minNights: integer('min_nights').notNull().default(2),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Bookings Table (includes 2-hour PENDING holds)
export const bookingsTable = pgTable('bookings', {
  id: text('id').primaryKey(), // UUID
  bookingCode: text('booking_code').notNull().unique(), // e.g. VIEN-612-9A4F
  unitSelection: text('unit_selection').notNull(), // 'depto-612' | 'suite-311' | 'vien-residence-experience'
  checkIn: text('check_in').notNull(), // YYYY-MM-DD
  checkOut: text('check_out').notNull(), // YYYY-MM-DD
  nights: integer('nights').notNull(),
  adults: integer('adults').notNull(),
  children: integer('children').notNull().default(0),
  guestName: text('guest_name').notNull(),
  guestPhone: text('guest_phone').notNull(),
  guestEmail: text('guest_email').notNull(),
  specialRequests: text('special_requests'),
  totalPriceUsd: integer('total_price_usd').notNull(),
  priceBreakdownJson: jsonb('price_breakdown_json').$type<PriceBreakdown>().notNull(),
  status: text('status').$type<BookingStatus>().notNull().default('PENDING'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Calendar Blocks Table (Manual blocks + External iCal cached events)
export const calendarBlocksTable = pgTable('calendar_blocks', {
  id: serial('id').primaryKey(),
  unitId: text('unit_id').notNull(), // 'depto-612' | 'suite-311'
  source: text('source').$type<BlockSource>().notNull(), // 'AIRBNB' | 'BOOKING' | 'MANUAL'
  externalUid: text('external_uid').notNull(),
  startDate: text('start_date').notNull(), // YYYY-MM-DD (check-in / inclusive)
  endDate: text('end_date').notNull(), // YYYY-MM-DD (check-out / exclusive)
  summary: text('summary').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export interface UnitRecord {
  id: UnitId;
  name: string;
  weekdayRate: number;
  weekendRate: number;
  cleaningFee: number;
  minNights: number;
  dualDiscountPercent: number;
  airbnbIcalUrl: string | null;
  bookingIcalUrl: string | null;
  lastIcalSyncAt: string | null;
}

export interface SeasonalRateRecord {
  id: number;
  unitId: UnitId | 'ALL';
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  nightlyRate: number;
  minNights: number;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  bookingCode: string;
  unitSelection: BookingUnitSelection;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  adults: number;
  children: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests: string | null;
  totalPriceUsd: number;
  priceBreakdownJson: PriceBreakdown;
  status: BookingStatus;
  expiresAt: string; // ISO string
  createdAt: string; // ISO string
}

export interface CalendarBlockRecord {
  id: number;
  unitId: UnitId;
  source: BlockSource;
  externalUid: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  summary: string;
  updatedAt: string;
}
