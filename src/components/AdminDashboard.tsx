import React, { useCallback, useMemo, useState } from 'react';

export interface AdminUnit {
  id: string;
  name: string;
  unitNumber?: string;
  tagline?: string;
  description?: string;
  bedsLabel?: string;
  capacityLabel?: string;
  maxGuests?: number;
  coverImage?: string;
  galleryImages?: string[];
  weekdayRate: number;
  weekendRate: number;
  cleaningFee: number;
  minNights: number;
  dualDiscountPercent: number;
  airbnbIcalUrl: string | null;
  bookingIcalUrl: string | null;
  lastIcalSyncAt: string | null;
}

interface AdminSeasonalRate {
  id: number;
  unitId: string;
  label: string;
  startDate: string;
  endDate: string;
  nightlyRate: number;
  minNights: number;
}

interface AdminBooking {
  id: string;
  bookingCode: string;
  unitSelection: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests: string | null;
  totalPriceUsd: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  whatsappUrl?: string;
}

interface AdminBlock {
  id: number;
  unitId: string;
  source: 'AIRBNB' | 'BOOKING' | 'MANUAL';
  startDate: string;
  endDate: string;
  summary: string;
}

interface AdminDashboardData {
  storageEngine: string;
  units: AdminUnit[];
  seasonalRates: AdminSeasonalRate[];
  bookings: AdminBooking[];
  calendarBlocks: AdminBlock[];
  icalExportUrls: Record<string, string>;
}

/**
 * Reads a local PNG/JPG/WebP file and compresses/resizes it client-side
 * so it can be persisted cleanly in Neon PostgreSQL JSONB and rendered fast.
 */
async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen inválido'));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const webpData = canvas.toDataURL('image/webp', 0.82);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const AdminDashboard: React.FC<{
  onExitAdmin: () => void;
  onUnitsUpdated?: () => void;
}> = ({ onExitAdmin, onUnitsUpdated }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Create New Suite Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newTagline, setNewTagline] = useState('FULL EQUIPADA · VISTA AL MAR');
  const [newBedsLabel, setNewBedsLabel] = useState('2 Camas de 2 Plazas + Sofá Cama');
  const [newCapacityLabel, setNewCapacityLabel] = useState('Makana Resort · Tonsupa');
  const [newMaxGuests, setNewMaxGuests] = useState(4);
  const [newDescription, setNewDescription] = useState('');
  const [newWeekdayRate, setNewWeekdayRate] = useState(85);
  const [newWeekendRate, setNewWeekendRate] = useState(110);
  const [newCleaningFee, setNewCleaningFee] = useState(15);
  const [newMinNights, setNewMinNights] = useState(1);
  const [newAirbnbIcal, setNewAirbnbIcal] = useState('');
  const [newBookingIcal, setNewBookingIcal] = useState('');
  const [newGalleryImages, setNewGalleryImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [isUploadingNewImg, setIsUploadingNewImg] = useState(false);

  // Seasonal Rate Form
  const [seasonUnit, setSeasonUnit] = useState<string>('ALL');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [seasonStart, setSeasonStart] = useState('2026-12-24');
  const [seasonEnd, setSeasonEnd] = useState('2027-01-02');
  const [seasonRate, setSeasonRate] = useState(145);
  const [seasonMinNights, setSeasonMinNights] = useState(2);

  // Manual Block Form
  const [blockUnit, setBlockUnit] = useState<string>('depto-612');
  const [blockStart, setBlockStart] = useState('2026-11-20');
  const [blockEnd, setBlockEnd] = useState('2026-11-22');
  const [blockSummary, setBlockSummary] = useState('Reserva Externa / Uso Propio');

  const fetchDashboard = useCallback(async (pwd: string) => {
    if (!pwd.trim()) {
      setAuthError('Por favor ingresa la contraseña de administrador.');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-password': pwd.trim() },
      });
      const json = await res.json();
      if (!res.ok) {
        setIsAuthenticated(false);
        setAuthError(json.error || 'Contraseña incorrecta');
        return;
      }
      const dashData = json as AdminDashboardData;
      setData(dashData);
      if (dashData.units.length > 0 && !dashData.units.some((u) => u.id === blockUnit)) {
        setBlockUnit(dashData.units[0].id);
      }
      setIsAuthenticated(true);
    } catch {
      setAuthError('Error al conectar con el servidor /api/admin');
    } finally {
      setLoading(false);
    }
  }, [blockUnit]);

  const runMutation = async (payload: Record<string, unknown>, successMsg: string) => {
    setStatusMessage(null);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password.trim(),
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      if (payload.op === 'forceSyncICal' && Array.isArray(result.errors) && result.errors.length > 0) {
        setStatusMessage(`Sincronizado con avisos: ${result.errors.join(' | ')}`);
      } else {
        setStatusMessage(successMsg);
      }
      await fetchDashboard(password);
      onUnitsUpdated?.();
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      setStatusMessage(`Error: ${err.error || 'No se pudo guardar'}`);
      return false;
    }
  };

  const handleNewFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingNewImg(true);
    try {
      const compressedList: string[] = [];
      for (const file of files) {
        const dataUrl = await compressImageFileToDataUrl(file);
        compressedList.push(dataUrl);
      }
      setNewGalleryImages((prev) => [...prev, ...compressedList]);
    } catch (err) {
      setStatusMessage(
        `Error al procesar imagen: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsUploadingNewImg(false);
      e.target.value = '';
    }
  };

  const handleCreateUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const ok = await runMutation(
      {
        op: 'createUnit',
        name: newName,
        unitNumber: newUnitNumber,
        tagline: newTagline,
        bedsLabel: newBedsLabel,
        capacityLabel: newCapacityLabel,
        maxGuests: newMaxGuests,
        description: newDescription,
        weekdayRate: newWeekdayRate,
        weekendRate: newWeekendRate,
        cleaningFee: newCleaningFee,
        minNights: newMinNights,
        airbnbIcalUrl: newAirbnbIcal,
        bookingIcalUrl: newBookingIcal,
        coverImage: newGalleryImages[0] || '/images/apt-612/apt612-4.jpg',
        galleryImages: newGalleryImages,
      },
      `Suite "${newName}" creada y publicada dinámicamente en la web`
    );
    if (ok) {
      setNewName('');
      setNewUnitNumber('');
      setNewDescription('');
      setNewAirbnbIcal('');
      setNewBookingIcal('');
      setNewGalleryImages([]);
      setIsCreateOpen(false);
    }
  };

  if (!isAuthenticated || !data) {
    return (
      <div
        style={{
          height: '100dvh',
          overflowY: 'auto',
          background: '#11100e',
          color: '#f5f2eb',
          display: 'grid',
          placeItems: 'center',
          padding: '1.5rem',
          fontFamily: 'var(--font-sans, sans-serif)',
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchDashboard(password);
          }}
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#1a1815',
            border: '1px solid rgba(201,169,124,0.35)',
            borderRadius: '1rem',
            padding: '2.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ color: '#c9a97c', fontSize: '0.72rem', letterSpacing: '0.16em' }}>
            🔒 ACCESO RESTRINGIDO · MAKANA RESORT
          </span>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 400 }}>
            Panel de Administración de Suites
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9e988e', lineHeight: 1.5 }}>
            Ingresa tu contraseña de administrador para crear, editar o eliminar suites, subir
            fotos y gestionar reservas y calendarios iCal.
          </p>
          <label style={{ fontSize: '0.8rem', color: '#d5d0c5' }}>
            Contraseña de Administrador
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              required
              placeholder="Ingresa tu contraseña..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.45rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                background: '#11100e',
                color: '#fff',
                fontSize: '0.95rem',
              }}
            />
          </label>
          {authError && (
            <p
              role="alert"
              style={{
                color: '#ff8a80',
                background: 'rgba(198,40,40,0.2)',
                padding: '0.6rem 0.8rem',
                borderRadius: '0.4rem',
                fontSize: '0.8rem',
                margin: 0,
              }}
            >
              {authError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onExitAdmin}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#f5f2eb',
                cursor: 'pointer',
              }}
            >
              Volver a la Web
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#c9a97c',
                color: '#11100e',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Verificando...' : 'Ingresar al Panel'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#11100e',
        color: '#f5f2eb',
        padding: '2rem clamp(1rem, 4vw, 3rem) 5rem',
        fontFamily: 'var(--font-sans, sans-serif)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span style={{ color: '#c9a97c', fontSize: '0.72rem', letterSpacing: '0.16em' }}>
            MAKANA RESORT · TONSUPA — GESTOR DINÁMICO DE SUITES E ICAL
          </span>
          <h1 style={{ margin: '0.25rem 0', fontSize: '1.55rem', fontWeight: 300 }}>
            Administración de Propiedades ({data.units.length} Suites Activas)
          </h1>
          <small style={{ color: '#9e988e' }}>Motor activo: {data.storageEngine}</small>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setIsCreateOpen((prev) => {
                const next = !prev;
                if (next) {
                  setTimeout(() => {
                    document
                      .getElementById('admin-create-suite-form')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }
                return next;
              });
            }}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#c9a97c',
              color: '#11100e',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isCreateOpen ? '✕ Cerrar Formulario' : '+ Crear Nueva Suite'}
          </button>
          <button
            type="button"
            onClick={() =>
              void runMutation(
                { op: 'forceSyncICal' },
                'Sincronización con Airbnb y Booking.com completada'
              )
            }
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #c9a97c',
              background: 'rgba(201,169,124,0.14)',
              color: '#f5f2eb',
              cursor: 'pointer',
            }}
          >
            ↻ Sincronizar Airbnb / Booking Ahora
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(false);
              setData(null);
              setPassword('');
            }}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(198,40,40,0.2)',
              color: '#ffb4ab',
              cursor: 'pointer',
            }}
          >
            🔒 Bloquear / Salir
          </button>
          <button
            type="button"
            onClick={onExitAdmin}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#f5f2eb',
              cursor: 'pointer',
            }}
          >
            ← Volver a la Web
          </button>
        </div>
      </header>

      {statusMessage && (
        <div
          style={{
            padding: '0.85rem 1.1rem',
            marginBottom: '1.5rem',
            borderRadius: '0.5rem',
            background: 'rgba(201,169,124,0.18)',
            border: '1px solid #c9a97c',
            fontSize: '0.88rem',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* CALENDARIO VISUAL INTERACTIVO Y DINÁMICO DE TODAS LAS SUITES */}
      <AdminAvailabilityCalendar
        units={data.units}
        seasonalRates={data.seasonalRates}
        bookings={data.bookings}
        calendarBlocks={data.calendarBlocks}
        onQuickBlockNight={(unitId, startDate, endDate) => {
          void runMutation(
            {
              op: 'addManualBlock',
              unitId,
              startDate,
              endDate,
              summary: 'Bloqueo Rápido desde Calendario Admin',
            },
            `Noche ${startDate} → ${endDate} bloqueada manualmente y publicada en iCal`
          );
        }}
        onPrefillManualBlock={(unitId, startDate, endDate) => {
          setBlockUnit(unitId);
          setBlockStart(startDate);
          setBlockEnd(endDate);
          const el = document.getElementById('admin-manual-blocks-section');
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onDeleteBlock={(blockId) => {
          void runMutation(
            { op: 'deleteCalendarBlock', id: blockId },
            'Bloqueo eliminado y fechas liberadas'
          );
        }}
        onUpdateBookingStatus={(bookingId, status, bookingCode) => {
          void runMutation(
            { op: 'updateBookingStatus', id: bookingId, status },
            status === 'CONFIRMED'
              ? `Reserva ${bookingCode} CONFIRMADA y bloqueada en iCal`
              : `Reserva ${bookingCode} CANCELADA y fechas liberadas`
          );
        }}
      />

      {/* 1. RESERVAS & PRE-RESERVAS DE 2 HORAS (PENDIENTES DE CONFIRMAR PAGO) */}
      {(() => {
        const pendingOrHoldBookings = data.bookings.filter((b) => b.status !== 'CONFIRMED');
        const confirmedWebBookings = data.bookings.filter((b) => b.status === 'CONFIRMED');

        return (
          <>
            <section style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  color: '#c9a97c',
                  fontWeight: 400,
                  marginBottom: '0.75rem',
                }}
              >
                1. Reservas y Bloqueos Temporales de 2 Horas ({pendingOrHoldBookings.length})
              </h2>
              {pendingOrHoldBookings.length === 0 ? (
                <p style={{ color: '#9e988e', fontSize: '0.9rem' }}>
                  No hay pre-reservas pendientes por confirmar en este momento.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {pendingOrHoldBookings.map((b) => {
                    const isExpiredPending =
                      b.status === 'PENDING' && new Date(b.expiresAt).getTime() <= Date.now();
                    const matchedUnit = data.units.find((u) => u.id === b.unitSelection);
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: '#1a1815',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '0.75rem',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.6rem',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong>{b.bookingCode}</strong>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '99px',
                                background:
                                  b.status === 'CANCELLED' || isExpiredPending
                                    ? 'rgba(198,40,40,0.25)'
                                    : 'rgba(245,124,0,0.3)',
                              }}
                            >
                              {isExpiredPending ? 'PENDING EXPIRADA (>2H)' : b.status}
                            </span>
                            <span style={{ color: '#c9a97c', fontSize: '0.85rem' }}>
                              {b.unitSelection === 'vien-residence-experience'
                                ? 'Reserva Combinada (Todas las Suites)'
                                : matchedUnit?.name || b.unitSelection}
                            </span>
                          </div>
                          <p style={{ margin: '0.35rem 0', fontSize: '0.88rem' }}>
                            📅 <strong>{b.checkIn}</strong> al <strong>{b.checkOut}</strong> (
                            {b.nights} noches) · 💵 <strong>${b.totalPriceUsd} USD</strong> · 👤{' '}
                            {b.guestName} ({b.guestPhone} / {b.guestEmail})
                          </p>
                          {b.status === 'PENDING' && !isExpiredPending && (
                            <small style={{ color: '#ffb74d' }}>
                              ⏳ Bloqueo temporal de 2h vence a las:{' '}
                              {new Date(b.expiresAt).toLocaleTimeString()}
                            </small>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() =>
                              void runMutation(
                                { op: 'updateBookingStatus', id: b.id, status: 'CONFIRMED' },
                                `Reserva ${b.bookingCode} CONFIRMADA y movida a Reservas hechas desde la Web`
                              )
                            }
                            style={{
                              padding: '0.5rem 0.9rem',
                              borderRadius: '0.4rem',
                              border: 'none',
                              background: '#2e7d32',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            ✅ Confirmar Pago
                          </button>
                          {b.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() =>
                                void runMutation(
                                  { op: 'updateBookingStatus', id: b.id, status: 'CANCELLED' },
                                  `Reserva ${b.bookingCode} CANCELADA y fechas liberadas`
                                )
                              }
                              style={{
                                padding: '0.5rem 0.9rem',
                                borderRadius: '0.4rem',
                                border: 'none',
                                background: '#c62828',
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Cancelar / Liberar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECCIÓN DE RESERVAS HECHAS DESDE LA WEB (CONFIRMADAS) */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  color: '#c9a97c',
                  fontWeight: 400,
                  marginBottom: '0.75rem',
                }}
              >
                ✓ Reservas hechas desde la Web ({confirmedWebBookings.length})
              </h2>
              {confirmedWebBookings.length === 0 ? (
                <p style={{ color: '#9e988e', fontSize: '0.9rem' }}>
                  Aún no hay reservas web con pago confirmado. Al confirmar una pre-reserva arriba,
                  pasará automáticamente a esta sección.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {confirmedWebBookings.map((b) => {
                    const matchedUnit = data.units.find((u) => u.id === b.unitSelection);
                    return (
                      <div
                        key={b.id}
                        style={{
                          background: '#1a1815',
                          border: '1px solid rgba(201,169,124,0.45)',
                          borderRadius: '0.75rem',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.6rem',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong>{b.bookingCode}</strong>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.18rem 0.65rem',
                                borderRadius: '99px',
                                background: 'rgba(201,169,124,0.28)',
                                border: '1px solid #c9a97c',
                                color: '#f5e6d3',
                                fontWeight: 600,
                              }}
                            >
                              Reserva desde Web Confirmada
                            </span>
                            <span style={{ color: '#c9a97c', fontSize: '0.85rem' }}>
                              {b.unitSelection === 'vien-residence-experience'
                                ? 'Reserva Combinada (Todas las Suites)'
                                : matchedUnit?.name || b.unitSelection}
                            </span>
                          </div>
                          <p style={{ margin: '0.35rem 0', fontSize: '0.88rem' }}>
                            📅 <strong>{b.checkIn}</strong> al <strong>{b.checkOut}</strong> (
                            {b.nights} noches) · 💵 <strong>${b.totalPriceUsd} USD</strong> · 👤{' '}
                            {b.guestName} ({b.guestPhone} / {b.guestEmail})
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {b.whatsappUrl && (
                            <a
                              href={b.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.5rem 0.85rem',
                                borderRadius: '0.4rem',
                                border: '1px solid rgba(201,169,124,0.45)',
                                background: 'rgba(201,169,124,0.14)',
                                color: '#f5f2eb',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                              }}
                            >
                              💬 WhatsApp
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void runMutation(
                                { op: 'updateBookingStatus', id: b.id, status: 'CANCELLED' },
                                `Reserva ${b.bookingCode} CANCELADA y fechas liberadas`
                              )
                            }
                            style={{
                              padding: '0.5rem 0.9rem',
                              borderRadius: '0.4rem',
                              border: 'none',
                              background: '#c62828',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ Cancelar / Liberar Fechas
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        );
      })()}

      {/* 2. GESTIÓN DINÁMICA DE SUITES (EDITAR, SUBIR FOTOS, ICAL Y ELIMINAR) */}
      <section id="admin-suites-section" style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '0.85rem',
          }}
        >
          <h2 style={{ fontSize: '1.15rem', color: '#c9a97c', fontWeight: 400, margin: 0 }}>
            2. Suites Activas: Información, Fotos, Tarifas e iCal ({data.units.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              setIsCreateOpen((prev) => {
                const next = !prev;
                if (next) {
                  setTimeout(() => {
                    document
                      .getElementById('admin-create-suite-form')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 50);
                }
                return next;
              });
            }}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '0.4rem',
              border: '1px solid #c9a97c',
              background: isCreateOpen ? 'rgba(198,40,40,0.22)' : 'rgba(201,169,124,0.18)',
              color: '#f5f2eb',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isCreateOpen ? '✕ Cerrar Formulario' : '+ Agregar Otra Suite'}
          </button>
        </div>

        {/* FORMULARIO DESPLEGABLE PARA CREAR NUEVA SUITE */}
        {isCreateOpen && (
          <div
            id="admin-create-suite-form"
            style={{
              background: '#1a1815',
              border: '1px solid #c9a97c',
              borderRadius: '0.9rem',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#c9a97c' }}>
              ✨ Registrar Nueva Suite / Propiedad
            </h3>
            <form
              onSubmit={(e) => void handleCreateUnitSubmit(e)}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                <label style={{ fontSize: '0.78rem' }}>
                  Nombre de la Suite *
                  <input
                    type="text"
                    required
                    placeholder="Ej. Suite 504 — Piso 5 | Vista al Mar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Número / Código Corto (Ej. 504)
                  <input
                    type="text"
                    placeholder="Ej. 504"
                    value={newUnitNumber}
                    onChange={(e) => setNewUnitNumber(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Subtítulo / Tagline
                  <input
                    type="text"
                    placeholder="QUINTO PISO · 55 M² · VISTA AL MAR"
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                <label style={{ fontSize: '0.78rem' }}>
                  Distribución de Camas
                  <input
                    type="text"
                    placeholder="2 Camas de 2 Plazas + Sofá Cama"
                    value={newBedsLabel}
                    onChange={(e) => setNewBedsLabel(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Ubicación / Etiqueta de Capacidad
                  <input
                    type="text"
                    placeholder="Quinto Piso · Makana Resort"
                    value={newCapacityLabel}
                    onChange={(e) => setNewCapacityLabel(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Máximo de Huéspedes
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={newMaxGuests}
                    onChange={(e) => setNewMaxGuests(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.55rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                    }}
                  />
                </label>
              </div>

              <label style={{ fontSize: '0.78rem' }}>
                Descripción de la Suite
                <textarea
                  rows={2}
                  placeholder="Describe el equipamiento, vista al mar, cocina, balcón..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.55rem',
                    background: '#11100e',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '0.35rem',
                    fontFamily: 'inherit',
                  }}
                />
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                <label style={{ fontSize: '0.78rem' }}>
                  Tarifa Dom–Jue ($ USD)
                  <input
                    type="number"
                    required
                    value={newWeekdayRate}
                    onChange={(e) => setNewWeekdayRate(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Tarifa Vie–Sáb ($ USD)
                  <input
                    type="number"
                    required
                    value={newWeekendRate}
                    onChange={(e) => setNewWeekendRate(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Limpieza ($ USD)
                  <input
                    type="number"
                    required
                    value={newCleaningFee}
                    onChange={(e) => setNewCleaningFee(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  Mín. Noches
                  <input
                    type="number"
                    min={1}
                    required
                    value={newMinNights}
                    onChange={(e) => setNewMinNights(Number(e.target.value))}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
              </div>

              {/* SUBIDA DE ARCHIVOS DE IMAGEN LOCALES (PNG / JPG / WEBP) */}
              <div
                style={{
                  background: '#11100e',
                  border: '1px dashed rgba(201,169,124,0.5)',
                  borderRadius: '0.6rem',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <strong style={{ color: '#c9a97c', fontSize: '0.85rem' }}>
                      📷 Imágenes de la Suite (Sube archivos PNG / JPG desde tu computadora)
                    </strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#9e988e' }}>
                      La primera imagen será la foto principal de portada. Se comprimen y optimizan
                      automáticamente.
                    </p>
                  </div>
                  <label
                    style={{
                      padding: '0.55rem 1rem',
                      background: 'rgba(201,169,124,0.2)',
                      border: '1px solid #c9a97c',
                      borderRadius: '0.4rem',
                      color: '#f5f2eb',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isUploadingNewImg ? 'Procesando fotos...' : '📁 Seleccionar Archivos (PNG / JPG)'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void handleNewFilesSelected(e)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Opción adicional por URL */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="O pega una ruta/URL de imagen (ej. /images/apt-612/apt612-1.jpg)"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      background: '#1a1815',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.18)',
                      borderRadius: '0.35rem',
                      fontSize: '0.78rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newImageUrlInput.trim()) {
                        setNewGalleryImages((prev) => [...prev, newImageUrlInput.trim()]);
                        setNewImageUrlInput('');
                      }
                    }}
                    style={{
                      padding: '0.45rem 0.85rem',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.35rem',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                    }}
                  >
                    + Añadir URL
                  </button>
                </div>

                {/* Previsualización de miniaturas */}
                {newGalleryImages.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '0.65rem',
                      marginTop: '0.9rem',
                    }}
                  >
                    {newGalleryImages.map((imgSrc, idx) => (
                      <div
                        key={`${idx}-${imgSrc.slice(0, 24)}`}
                        style={{
                          position: 'relative',
                          border: idx === 0 ? '2px solid #c9a97c' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '0.45rem',
                          overflow: 'hidden',
                          background: '#000',
                        }}
                      >
                        <img
                          src={imgSrc}
                          alt={`Previsualización ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '86px',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.25rem 0.35rem',
                            background: 'rgba(17,16,14,0.9)',
                            fontSize: '0.68rem',
                          }}
                        >
                          {idx === 0 ? (
                            <span style={{ color: '#c9a97c', fontWeight: 700 }}>★ Portada</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewGalleryImages((prev) => {
                                  const copy = [...prev];
                                  const [picked] = copy.splice(idx, 1);
                                  return [picked, ...copy];
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#d5d0c5',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.68rem',
                              }}
                            >
                              Hacer portada
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setNewGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff8a80',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 700,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                <label style={{ fontSize: '0.78rem' }}>
                  URL iCal de Airbnb (Opcional)
                  <input
                    type="url"
                    placeholder="https://www.airbnb.com/calendar/ical/..."
                    value={newAirbnbIcal}
                    onChange={(e) => setNewAirbnbIcal(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.78rem' }}>
                  URL iCal de Booking.com (Opcional)
                  <input
                    type="url"
                    placeholder="https://ical.booking.com/v1/export?t=..."
                    value={newBookingIcal}
                    onChange={(e) => setNewBookingIcal(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      background: '#11100e',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: 'transparent',
                    color: '#f5f2eb',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '0.45rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.4rem',
                    background: '#c9a97c',
                    color: '#11100e',
                    border: 'none',
                    borderRadius: '0.45rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Guardar y Publicar Suite
                </button>
              </div>
            </form>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {data.units.map((u) => (
            <UnitConfigCard
              key={u.id}
              unit={u}
              exportUrl={
                data.icalExportUrls[u.id] || `${window.location.origin}/api/ical/${u.id}.ics`
              }
              onSave={(patch) =>
                runMutation(
                  { op: 'updateUnit', unitId: u.id, ...patch },
                  `Cambios guardados en ${patch.name || u.name}`
                )
              }
              onDelete={() =>
                void runMutation(
                  { op: 'deleteUnit', unitId: u.id },
                  `Suite "${u.name}" eliminada`
                )
              }
            />
          ))}
        </div>
      </section>

      {/* 3. TEMPORADAS ALTAS Y FERIADOS */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', color: '#c9a97c', fontWeight: 400, marginBottom: '0.75rem' }}>
          3. Tarifas Diferenciadas por Temporada Alta / Feriados
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runMutation(
              {
                op: 'addSeasonalRate',
                unitId: seasonUnit,
                label: seasonLabel,
                startDate: seasonStart,
                endDate: seasonEnd,
                nightlyRate: seasonRate,
                minNights: seasonMinNights,
              },
              `Temporada "${seasonLabel}" agregada`
            );
            setSeasonLabel('');
          }}
          style={{
            background: '#1a1815',
            padding: '1rem',
            borderRadius: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'flex-end',
            marginBottom: '1rem',
          }}
        >
          <label style={{ fontSize: '0.78rem' }}>
            Unidad
            <select
              value={seasonUnit}
              onChange={(e) => setSeasonUnit(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <option value="ALL">Todas las Suites</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.78rem', flex: 1, minWidth: '180px' }}>
            Nombre de Feriado / Temporada
            <input
              type="text"
              required
              placeholder="Ej. Feriado Carnaval"
              value={seasonLabel}
              onChange={(e) => setSeasonLabel(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Desde
            <input
              type="date"
              required
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Hasta
            <input
              type="date"
              required
              value={seasonEnd}
              onChange={(e) => setSeasonEnd(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Tarifa USD/noche
            <input
              type="number"
              required
              value={seasonRate}
              onChange={(e) => setSeasonRate(Number(e.target.value))}
              style={{
                width: '90px',
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Mín. Noches
            <input
              type="number"
              required
              value={seasonMinNights}
              onChange={(e) => setSeasonMinNights(Number(e.target.value))}
              style={{
                width: '75px',
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: '0.55rem 1rem',
              background: '#c9a97c',
              color: '#11100e',
              border: 'none',
              borderRadius: '0.4rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Agregar Temporada
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {data.seasonalRates.map((s) => (
            <div
              key={s.id}
              style={{
                background: '#1a1815',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                <strong>{s.label}</strong> ({s.unitId}) · {s.startDate} al {s.endDate} ·{' '}
                <strong style={{ color: '#c9a97c' }}>${s.nightlyRate} USD/noche</strong> (mín.{' '}
                {s.minNights} noches)
              </span>
              <button
                type="button"
                onClick={() =>
                  void runMutation({ op: 'deleteSeasonalRate', id: s.id }, 'Temporada eliminada')
                }
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ff8a80',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. BLOQUEOS MANUALES Y EVENTOS IMPORTADOS DE AIRBNB / BOOKING */}
      <section id="admin-manual-blocks-section">
        <h2 style={{ fontSize: '1.15rem', color: '#c9a97c', fontWeight: 400, marginBottom: '0.75rem' }}>
          4. Bloqueos de Calendario Manuales e Importados de Airbnb / Booking ({data.calendarBlocks.length})
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runMutation(
              {
                op: 'addManualBlock',
                unitId: blockUnit,
                startDate: blockStart,
                endDate: blockEnd,
                summary: blockSummary,
              },
              'Bloqueo manual agregado y publicado en iCal'
            );
          }}
          style={{
            background: '#1a1815',
            padding: '1rem',
            borderRadius: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'flex-end',
            marginBottom: '1rem',
          }}
        >
          <label style={{ fontSize: '0.78rem' }}>
            Unidad a Bloquear
            <select
              value={blockUnit}
              onChange={(e) => setBlockUnit(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Check-in
            <input
              type="date"
              required
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Check-out
            <input
              type="date"
              required
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              style={{
                display: 'block',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <label style={{ fontSize: '0.78rem', flex: 1 }}>
            Motivo
            <input
              type="text"
              value={blockSummary}
              onChange={(e) => setBlockSummary(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.45rem',
                background: '#11100e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: '0.55rem 1rem',
              background: '#c9a97c',
              color: '#11100e',
              border: 'none',
              borderRadius: '0.4rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Bloquear Fechas
          </button>
        </form>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {data.calendarBlocks.map((blk) => (
            <div
              key={blk.id}
              style={{
                background: '#1a1815',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                <strong>[{blk.source}]</strong> {blk.unitId} · {blk.startDate} → {blk.endDate} ·{' '}
                {blk.summary}
              </span>
              <button
                type="button"
                onClick={() =>
                  void runMutation({ op: 'deleteCalendarBlock', id: blk.id }, 'Bloqueo eliminado')
                }
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#ff8a80',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                Liberar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const UnitConfigCard: React.FC<{
  unit: AdminUnit;
  exportUrl: string;
  onSave: (patch: Partial<AdminUnit>) => Promise<boolean> | void;
  onDelete: () => void;
}> = ({ unit, exportUrl, onSave, onDelete }) => {
  const [name, setName] = useState(unit.name);
  const [unitNumber, setUnitNumber] = useState(unit.unitNumber || '');
  const [tagline, setTagline] = useState(unit.tagline || 'FULL EQUIPADA · VISTA AL MAR');
  const [bedsLabel, setBedsLabel] = useState(unit.bedsLabel || '2 Camas de 2 Plazas');
  const [capacityLabel, setCapacityLabel] = useState(
    unit.capacityLabel || 'Makana Resort · Tonsupa'
  );
  const [maxGuests, setMaxGuests] = useState(unit.maxGuests || 4);
  const [description, setDescription] = useState(unit.description || '');
  const [weekdayRate, setWeekdayRate] = useState(unit.weekdayRate);
  const [weekendRate, setWeekendRate] = useState(unit.weekendRate);
  const [cleaningFee, setCleaningFee] = useState(unit.cleaningFee);
  const [minNights, setMinNights] = useState(unit.minNights || 1);
  const [airbnbIcalUrl, setAirbnbIcalUrl] = useState(unit.airbnbIcalUrl || '');
  const [bookingIcalUrl, setBookingIcalUrl] = useState(unit.bookingIcalUrl || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(
    unit.galleryImages && unit.galleryImages.length > 0
      ? unit.galleryImages
      : unit.coverImage
      ? [unit.coverImage]
      : []
  );
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUploadLocalFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const dataUrl = await compressImageFileToDataUrl(file);
        uploaded.push(dataUrl);
      }
      setGalleryImages((prev) => [...prev, ...uploaded]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveAndClose = async () => {
    setIsSavingUnit(true);
    try {
      const result = await onSave({
        name,
        unitNumber,
        tagline,
        bedsLabel,
        capacityLabel,
        maxGuests,
        description,
        coverImage: galleryImages[0] || unit.coverImage || '/images/apt-612/apt612-4.jpg',
        galleryImages,
        weekdayRate,
        weekendRate,
        cleaningFee,
        minNights,
        airbnbIcalUrl,
        bookingIcalUrl,
      });
      if (result !== false) {
        setIsDetailsExpanded(false);
      }
    } finally {
      setIsSavingUnit(false);
    }
  };

  return (
    <div
      style={{
        background: '#1a1815',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.85rem',
        padding: '1.1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Cabecera compacta: foto pequeña, nombre de suite e ID */}
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <img
          src={galleryImages[0] || unit.coverImage || '/images/apt-612/apt612-4.jpg'}
          alt={name}
          style={{
            width: '68px',
            height: '52px',
            objectFit: 'cover',
            borderRadius: '0.45rem',
            border: '1px solid rgba(201,169,124,0.4)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#c9a97c', wordBreak: 'break-word' }}>
              {name}
            </h3>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '0.15rem 0.45rem',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '0.3rem',
                color: '#9e988e',
                flexShrink: 0,
              }}
            >
              ID: {unit.id}
            </span>
          </div>
        </div>
      </div>

      {/* Botón para expandir edición de información, fotos, tarifas e iCal */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setIsDetailsExpanded((prev) => !prev)}
          style={{
            flex: 1,
            padding: '0.45rem 0.75rem',
            background: 'rgba(201,169,124,0.12)',
            border: '1px solid rgba(201,169,124,0.35)',
            borderRadius: '0.4rem',
            color: '#f5f2eb',
            fontSize: '0.76rem',
            cursor: 'pointer',
          }}
        >
          {isDetailsExpanded
            ? '▲ Cerrar Edición de Información y Fotos'
            : `✎ Editar Información y Fotos (${galleryImages.length})`}
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '0.45rem 0.75rem',
              background: 'rgba(198,40,40,0.15)',
              border: '1px solid rgba(198,40,40,0.4)',
              borderRadius: '0.4rem',
              color: '#ff8a80',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            🗑 Eliminar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onDelete}
              style={{
                padding: '0.45rem 0.7rem',
                background: '#c62828',
                border: 'none',
                borderRadius: '0.4rem',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirmar Borrado
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '0.45rem 0.6rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.4rem',
                color: '#d5d0c5',
                fontSize: '0.74rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN EXPANDIBLE: INFORMACIÓN, FOTOS, TARIFAS, ICAL Y GUARDAR CAMBIOS */}
      {isDetailsExpanded && (
        <div
          style={{
            background: '#11100e',
            border: '1px solid rgba(201,169,124,0.28)',
            borderRadius: '0.6rem',
            padding: '0.95rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          <label style={{ fontSize: '0.75rem' }}>
            Nombre de la Suite
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.2rem',
                padding: '0.45rem',
                background: '#1a1815',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem' }}>
              Número Corto
              <input
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.2rem',
                  padding: '0.45rem',
                  background: '#1a1815',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </label>
            <label style={{ fontSize: '0.75rem' }}>
              Tagline / Piso y Vista
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.2rem',
                  padding: '0.45rem',
                  background: '#1a1815',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem' }}>
              Camas / Equipamiento
              <input
                type="text"
                value={bedsLabel}
                onChange={(e) => setBedsLabel(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '0.2rem',
                  padding: '0.45rem',
                  background: '#1a1815',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </label>
            <label style={{ fontSize: '0.75rem' }}>
              Máx. Huéspedes
              <input
                type="number"
                min={1}
                max={16}
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '0.2rem',
                  padding: '0.45rem',
                  background: '#1a1815',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </label>
          </div>

          <label style={{ fontSize: '0.75rem' }}>
            Etiqueta de Ubicación
            <input
              type="text"
              value={capacityLabel}
              onChange={(e) => setCapacityLabel(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.2rem',
                padding: '0.45rem',
                background: '#1a1815',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>

          <label style={{ fontSize: '0.75rem' }}>
            Descripción
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.2rem',
                padding: '0.45rem',
                background: '#1a1815',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                fontFamily: 'inherit',
              }}
            />
          </label>

          {/* Subida y gestión de imágenes de la suite */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#c9a97c', fontWeight: 600 }}>
                Fotos de la Suite ({galleryImages.length})
              </span>
              <label
                style={{
                  padding: '0.3rem 0.65rem',
                  background: 'rgba(201,169,124,0.2)',
                  border: '1px solid #c9a97c',
                  borderRadius: '0.35rem',
                  color: '#f5f2eb',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                }}
              >
                {isUploading ? 'Subiendo...' : '+ Subir Foto (PNG/JPG)'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleUploadLocalFiles(e)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                gap: '0.5rem',
                marginTop: '0.55rem',
              }}
            >
              {galleryImages.map((imgSrc, idx) => (
                <div
                  key={`${idx}-${imgSrc.slice(0, 20)}`}
                  style={{
                    border: idx === 0 ? '2px solid #c9a97c' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '0.35rem',
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`${name} ${idx + 1}`}
                    style={{ width: '100%', height: '66px', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.2rem 0.3rem',
                      fontSize: '0.64rem',
                      background: '#141210',
                    }}
                  >
                    {idx === 0 ? (
                      <span style={{ color: '#c9a97c', fontWeight: 700 }}>★ Portada</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryImages((prev) => {
                            const copy = [...prev];
                            const [picked] = copy.splice(idx, 1);
                            return [picked, ...copy];
                          })
                        }
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#d5d0c5',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.64rem',
                        }}
                      >
                        Portada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff8a80',
                        cursor: 'pointer',
                        padding: 0,
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarifas, Limpieza y Mínimo de Noches */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '0.75rem',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '0.75rem',
                color: '#c9a97c',
                fontWeight: 600,
                marginBottom: '0.45rem',
              }}
            >
              Valores, Limpieza y Mínimo de Noches
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.73rem' }}>
                Dom–Jue ($)
                <input
                  type="number"
                  value={weekdayRate}
                  onChange={(e) => setWeekdayRate(Number(e.target.value))}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#1a1815',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </label>
              <label style={{ fontSize: '0.73rem' }}>
                Vie–Sáb ($)
                <input
                  type="number"
                  value={weekendRate}
                  onChange={(e) => setWeekendRate(Number(e.target.value))}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#1a1815',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </label>
              <label style={{ fontSize: '0.73rem' }}>
                Limpieza ($)
                <input
                  type="number"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(Number(e.target.value))}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#1a1815',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </label>
              <label style={{ fontSize: '0.73rem' }}>
                Mín. Noches
                <input
                  type="number"
                  min={1}
                  value={minNights}
                  onChange={(e) => setMinNights(Number(e.target.value))}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#1a1815',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </label>
            </div>
          </div>

          {/* Enlaces iCal */}
          <div
            style={{
              fontSize: '0.76rem',
              background: '#1a1815',
              padding: '0.75rem',
              borderRadius: '0.45rem',
              border: '1px solid rgba(201,169,124,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#c9a97c' }}>
                1. Link iCal para pegar en Airbnb y Booking.com:
              </strong>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(exportUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: 'rgba(201,169,124,0.2)',
                  border: '1px solid #c9a97c',
                  color: '#f5f2eb',
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '0.3rem',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copiado' : 'Copiar Link'}
              </button>
            </div>
            <div style={{ wordBreak: 'break-all', marginTop: '0.35rem', color: '#d5d0c5' }}>
              {exportUrl}
            </div>
          </div>

          <label style={{ fontSize: '0.75rem' }}>
            2. URL iCal exportada de Airbnb (Pegar aquí el link .ics que te da Airbnb)
            <input
              type="url"
              placeholder="https://www.airbnb.com/calendar/ical/12345678.ics?s=..."
              value={airbnbIcalUrl}
              onChange={(e) => setAirbnbIcalUrl(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.5rem',
                background: '#1a1815',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>

          <label style={{ fontSize: '0.75rem' }}>
            3. URL iCal exportada de Booking.com (Pegar aquí el link .ics que te da Booking)
            <input
              type="url"
              placeholder="https://ical.booking.com/v1/export?t=..."
              value={bookingIcalUrl}
              onChange={(e) => setBookingIcalUrl(e.target.value)}
              style={{
                width: '100%',
                marginTop: '0.25rem',
                padding: '0.5rem',
                background: '#1a1815',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          </label>

          {unit.lastIcalSyncAt && (
            <small style={{ color: '#9e988e', fontSize: '0.72rem' }}>
              Última sincronización: {new Date(unit.lastIcalSyncAt).toLocaleString()}
            </small>
          )}

          <button
            type="button"
            disabled={isSavingUnit}
            onClick={() => void handleSaveAndClose()}
            style={{
              padding: '0.65rem',
              background: '#c9a97c',
              color: '#11100e',
              border: 'none',
              borderRadius: '0.4rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '0.25rem',
            }}
          >
            {isSavingUnit ? 'Guardando...' : '✓ Guardar Cambios de Suite'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   CALENDARIO VISUAL DINÁMICO DE DISPONIBILIDAD Y OCUPACIÓN POR SUITE
   ========================================================================== */

interface UnitDayOccupation {
  kind: 'CONFIRMED' | 'PENDING_HOLD' | 'AIRBNB' | 'BOOKING' | 'MANUAL';
  label: string;
  subLabel: string;
  startDate: string;
  endDate: string;
  bookingId?: string;
  bookingCode?: string;
  blockId?: number;
}

interface UnitDaySnapshot {
  unit: AdminUnit;
  shortCode: string;
  rateUsd: number;
  rateType: 'WEEKDAY' | 'WEEKEND' | 'SEASONAL';
  seasonLabel?: string;
  occupations: UnitDayOccupation[];
  isAvailable: boolean;
}

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatYmd(year: number, monthZeroBased: number, day: number): string {
  const m = String(monthZeroBased + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getNextDateYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
  return dt.toISOString().slice(0, 10);
}

function getShortUnitCode(unit: AdminUnit): string {
  if (unit.unitNumber && unit.unitNumber.trim()) {
    return unit.unitNumber.trim();
  }
  const numMatch = unit.name.match(/\b(\d{2,4})\b/);
  if (numMatch) return numMatch[1];
  return unit.id.slice(0, 8).toUpperCase();
}

function getOccupationVisualStyle(kind: UnitDayOccupation['kind']): {
  bg: string;
  border: string;
  color: string;
  tag: string;
} {
  switch (kind) {
    case 'CONFIRMED':
      return {
        bg: 'rgba(201, 169, 124, 0.32)',
        border: '#c9a97c',
        color: '#f5e6d3',
        tag: 'Reserva desde Web Confirmada',
      };
    case 'PENDING_HOLD':
      return {
        bg: 'rgba(245, 124, 0, 0.28)',
        border: 'rgba(255, 183, 77, 0.65)',
        color: '#ffe0b2',
        tag: 'Hold 2h',
      };
    case 'AIRBNB':
      return {
        bg: 'rgba(255, 90, 95, 0.22)',
        border: 'rgba(255, 120, 124, 0.55)',
        color: '#ffcdd2',
        tag: 'Airbnb',
      };
    case 'BOOKING':
      return {
        bg: 'rgba(30, 136, 229, 0.26)',
        border: 'rgba(100, 181, 246, 0.6)',
        color: '#bbdefb',
        tag: 'Booking.com',
      };
    case 'MANUAL':
      return {
        bg: 'rgba(142, 36, 170, 0.28)',
        border: 'rgba(206, 147, 216, 0.6)',
        color: '#f3e5f5',
        tag: 'Manual',
      };
  }
}

const AdminAvailabilityCalendar: React.FC<{
  units: AdminUnit[];
  seasonalRates: AdminSeasonalRate[];
  bookings: AdminBooking[];
  calendarBlocks: AdminBlock[];
  onQuickBlockNight: (unitId: string, startDate: string, endDate: string) => void;
  onPrefillManualBlock: (unitId: string, startDate: string, endDate: string) => void;
  onDeleteBlock: (blockId: number) => void;
  onUpdateBookingStatus: (
    bookingId: string,
    status: 'CONFIRMED' | 'CANCELLED',
    bookingCode: string
  ) => void;
}> = ({
  units,
  seasonalRates,
  bookings,
  calendarBlocks,
  onQuickBlockNight,
  onPrefillManualBlock,
  onDeleteBlock,
  onUpdateBookingStatus,
}) => {
  const todayYmd = useMemo(() => {
    const now = new Date();
    return formatYmd(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('ALL');
  const [selectedDateYmd, setSelectedDateYmd] = useState<string>(todayYmd);

  // If a filtered suite was deleted dynamically, fallback to 'ALL'
  const effectiveSuiteFilter = useMemo(() => {
    if (selectedSuiteFilter === 'ALL') return 'ALL';
    return units.some((u) => u.id === selectedSuiteFilter) ? selectedSuiteFilter : 'ALL';
  }, [selectedSuiteFilter, units]);

  const visibleUnits = useMemo(() => {
    if (effectiveSuiteFilter === 'ALL') return units;
    return units.filter((u) => u.id === effectiveSuiteFilter);
  }, [effectiveSuiteFilter, units]);

  const quickMonthShortcuts = useMemo(() => {
    const base = new Date();
    const list: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      list.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_NAMES_ES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
      });
    }
    return list;
  }, []);

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const buildDaySnapshotsForDate = useCallback(
    (dateYmd: string, targetUnits: AdminUnit[]): UnitDaySnapshot[] => {
      const nowMs = Date.now();
      const [y, m, d] = dateYmd.split('-').map(Number);
      const dayOfWeekUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
      const isWeekend = dayOfWeekUtc === 5 || dayOfWeekUtc === 6;

      return targetUnits.map((unit) => {
        const matchingSeason = seasonalRates.find(
          (s) =>
            (s.unitId === unit.id || s.unitId === 'ALL') &&
            dateYmd >= s.startDate &&
            dateYmd <= s.endDate
        );

        const rateUsd = matchingSeason
          ? matchingSeason.nightlyRate
          : isWeekend
          ? unit.weekendRate
          : unit.weekdayRate;

        const rateType: UnitDaySnapshot['rateType'] = matchingSeason
          ? 'SEASONAL'
          : isWeekend
          ? 'WEEKEND'
          : 'WEEKDAY';

        const occupations: UnitDayOccupation[] = [];

        // 1. Direct website bookings (CONFIRMED or active 2h PENDING)
        for (const b of bookings) {
          if (b.status === 'CANCELLED') continue;
          const isExpiredPending =
            b.status === 'PENDING' && new Date(b.expiresAt).getTime() <= nowMs;
          if (isExpiredPending) continue;

          const appliesToUnit =
            b.unitSelection === 'vien-residence-experience' || b.unitSelection === unit.id;
          if (!appliesToUnit) continue;

          if (dateYmd >= b.checkIn && dateYmd < b.checkOut) {
            occupations.push({
              kind: b.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_HOLD',
              label:
                b.status === 'CONFIRMED'
                  ? `Reserva ${b.bookingCode} (${b.guestName})`
                  : `Hold 2h ${b.bookingCode} (${b.guestName})`,
              subLabel: `${b.checkIn} → ${b.checkOut}`,
              startDate: b.checkIn,
              endDate: b.checkOut,
              bookingId: b.id,
              bookingCode: b.bookingCode,
            });
          }
        }

        // 2. External iCal (Airbnb / Booking.com) & Manual blocks
        for (const blk of calendarBlocks) {
          if (blk.unitId !== unit.id) continue;
          if (dateYmd >= blk.startDate && dateYmd < blk.endDate) {
            occupations.push({
              kind: blk.source,
              label: blk.summary || blk.source,
              subLabel: `${blk.startDate} → ${blk.endDate}`,
              startDate: blk.startDate,
              endDate: blk.endDate,
              blockId: blk.id,
            });
          }
        }

        return {
          unit,
          shortCode: getShortUnitCode(unit),
          rateUsd,
          rateType,
          seasonLabel: matchingSeason?.label,
          occupations,
          isAvailable: occupations.length === 0,
        };
      });
    },
    [bookings, calendarBlocks, seasonalRates]
  );

  // Build calendar cells for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth, 1));
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstDayUtc.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    const cells: Array<{
      dateYmd: string | null;
      dayNumber: number | null;
      snapshots: UnitDaySnapshot[];
      seasonLabel?: string;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateYmd: null, dayNumber: null, snapshots: [] });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateYmd = formatYmd(viewYear, viewMonth, day);
      const snapshots = buildDaySnapshotsForDate(dateYmd, visibleUnits);
      const seasonLabel = snapshots.find((s) => s.seasonLabel)?.seasonLabel;
      cells.push({
        dateYmd,
        dayNumber: day,
        snapshots,
        seasonLabel,
      });
    }

    return cells;
  }, [viewYear, viewMonth, visibleUnits, buildDaySnapshotsForDate]);

  // Month summary counters
  const monthStats = useMemo(() => {
    let fullyFreeDays = 0;
    let occupiedUnitNights = 0;
    for (const cell of calendarDays) {
      if (!cell.dateYmd) continue;
      const allFree = cell.snapshots.every((s) => s.isAvailable);
      if (allFree) fullyFreeDays++;
      for (const s of cell.snapshots) {
        if (!s.isAvailable) occupiedUnitNights++;
      }
    }
    return { fullyFreeDays, occupiedUnitNights };
  }, [calendarDays]);

  // Snapshots for the currently clicked date across ALL dynamic suites
  const selectedDayAllUnitsSnapshots = useMemo(
    () => buildDaySnapshotsForDate(selectedDateYmd, units),
    [selectedDateYmd, units, buildDaySnapshotsForDate]
  );

  const selectedSingleUnit = useMemo(
    () => (effectiveSuiteFilter === 'ALL' ? null : units.find((u) => u.id === effectiveSuiteFilter)),
    [effectiveSuiteFilter, units]
  );

  return (
    <section
      style={{
        background: '#1a1815',
        border: '1px solid rgba(201,169,124,0.38)',
        borderRadius: '0.95rem',
        padding: '1.35rem',
        marginBottom: '2.5rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
      }}
    >
      {/* CABECERA DEL CALENDARIO Y SELECTOR DINÁMICO DE SUITES */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.1rem',
        }}
      >
        <div>
          <span
            style={{
              color: '#c9a97c',
              fontSize: '0.7rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            SINCRONIZACIÓN EN VIVO · AIRBNB · BOOKING.COM · RESERVAS WEB
          </span>
          <h2 style={{ margin: '0.2rem 0 0.35rem', fontSize: '1.25rem', fontWeight: 400 }}>
            📅 Calendario Visual de Disponibilidad y Ocupación ({units.length} Suites)
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9e988e' }}>
            Cualquier suite nueva que agregues o vincules con iCal aparecerá aquí automáticamente
            con su foto, tarifas y disponibilidad por día.
          </p>
        </div>

        {/* Estadísticas rápidas del mes en vista */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div
            style={{
              background: '#11100e',
              border: '1px solid rgba(102,187,106,0.35)',
              borderRadius: '0.5rem',
              padding: '0.45rem 0.75rem',
              fontSize: '0.76rem',
            }}
          >
            <span style={{ color: '#81c784', fontWeight: 700 }}>{monthStats.fullyFreeDays}</span>{' '}
            días con disponibilidad total
          </div>
          <div
            style={{
              background: '#11100e',
              border: '1px solid rgba(255,120,124,0.35)',
              borderRadius: '0.5rem',
              padding: '0.45rem 0.75rem',
              fontSize: '0.76rem',
            }}
          >
            <span style={{ color: '#ff8a80', fontWeight: 700 }}>
              {monthStats.occupiedUnitNights}
            </span>{' '}
            noches ocupadas / bloqueadas en el mes
          </div>
        </div>
      </div>

      {/* PESTAÑAS DINÁMICAS DE SUITES (SE ACTUALIZAN SOLAS AL CREAR/EDITAR SUITES) */}
      <div
        style={{
          display: 'flex',
          gap: '0.55rem',
          flexWrap: 'wrap',
          paddingBottom: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedSuiteFilter('ALL')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '0.5rem',
            border:
              effectiveSuiteFilter === 'ALL'
                ? '1px solid #c9a97c'
                : '1px solid rgba(255,255,255,0.15)',
            background:
              effectiveSuiteFilter === 'ALL' ? 'rgba(201,169,124,0.22)' : '#11100e',
            color: effectiveSuiteFilter === 'ALL' ? '#f5f2eb' : '#9e988e',
            fontWeight: effectiveSuiteFilter === 'ALL' ? 700 : 400,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          🏢 Todas las Suites ({units.length})
        </button>

        {units.map((u) => {
          const isSelected = effectiveSuiteFilter === u.id;
          const thumb = u.galleryImages?.[0] || u.coverImage || '/images/apt-612/apt612-4.jpg';
          const shortCode = getShortUnitCode(u);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelectedSuiteFilter(u.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.35rem 0.85rem 0.35rem 0.45rem',
                borderRadius: '0.5rem',
                border: isSelected ? '1px solid #c9a97c' : '1px solid rgba(255,255,255,0.15)',
                background: isSelected ? 'rgba(201,169,124,0.22)' : '#11100e',
                color: isSelected ? '#f5f2eb' : '#d5d0c5',
                fontWeight: isSelected ? 700 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <img
                src={thumb}
                alt={u.name}
                style={{
                  width: '28px',
                  height: '24px',
                  objectFit: 'cover',
                  borderRadius: '0.25rem',
                  border: '1px solid rgba(201,169,124,0.4)',
                }}
              />
              <span>
                <strong>[{shortCode}]</strong> {u.name.split('—')[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* RESUMEN DE SUITE INDIVIDUAL SI ESTÁ FILTRADA */}
      {selectedSingleUnit && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.85rem',
            background: '#11100e',
            border: '1px solid rgba(201,169,124,0.3)',
            borderRadius: '0.6rem',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img
              src={
                selectedSingleUnit.galleryImages?.[0] ||
                selectedSingleUnit.coverImage ||
                '/images/apt-612/apt612-4.jpg'
              }
              alt={selectedSingleUnit.name}
              style={{
                width: '60px',
                height: '44px',
                objectFit: 'cover',
                borderRadius: '0.4rem',
                border: '1px solid rgba(201,169,124,0.45)',
              }}
            />
            <div>
              <strong style={{ color: '#c9a97c', fontSize: '0.92rem' }}>
                {selectedSingleUnit.name}
              </strong>
              <div style={{ fontSize: '0.76rem', color: '#9e988e' }}>
                Dom–Jue: <strong>${selectedSingleUnit.weekdayRate}</strong> · Vie–Sáb:{' '}
                <strong>${selectedSingleUnit.weekendRate}</strong> · Limpieza:{' '}
                <strong>${selectedSingleUnit.cleaningFee}</strong> · Mín.{' '}
                {selectedSingleUnit.minNights} noche(s)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
            <span
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '99px',
                background: selectedSingleUnit.airbnbIcalUrl
                  ? 'rgba(46,125,50,0.22)'
                  : 'rgba(255,255,255,0.06)',
                color: selectedSingleUnit.airbnbIcalUrl ? '#a5d6a7' : '#9e988e',
              }}
            >
              Airbnb iCal: {selectedSingleUnit.airbnbIcalUrl ? '✓ Conectado' : 'No vinculado'}
            </span>
            <span
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '99px',
                background: selectedSingleUnit.bookingIcalUrl
                  ? 'rgba(30,136,229,0.22)'
                  : 'rgba(255,255,255,0.06)',
                color: selectedSingleUnit.bookingIcalUrl ? '#90caf9' : '#9e988e',
              }}
            >
              Booking iCal: {selectedSingleUnit.bookingIcalUrl ? '✓ Conectado' : 'No vinculado'}
            </span>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN DE MES Y LEYENDA DE COLORES */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          marginBottom: '0.9rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{
              padding: '0.4rem 0.75rem',
              background: '#11100e',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '0.4rem',
              color: '#f5f2eb',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            ← Anterior
          </button>
          <span
            style={{
              minWidth: '165px',
              textAlign: 'center',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#f5f2eb',
            }}
          >
            {MONTH_NAMES_ES[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            style={{
              padding: '0.4rem 0.75rem',
              background: '#11100e',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '0.4rem',
              color: '#f5f2eb',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Siguiente →
          </button>

          {/* Selector directo de Mes/Año + Atajos */}
          <input
            type="month"
            aria-label="Ir a mes y año"
            value={`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              if (y && m) {
                setViewYear(y);
                setViewMonth(m - 1);
              }
            }}
            style={{
              padding: '0.32rem 0.55rem',
              fontSize: '0.75rem',
              borderRadius: '0.35rem',
              border: '1px solid rgba(201,169,124,0.4)',
              background: '#11100e',
              color: '#f5f2eb',
              cursor: 'pointer',
            }}
          />

          {/* Atajos de meses */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginLeft: '0.2rem' }}>
            {quickMonthShortcuts.map((m) => {
              const isCurrent = m.year === viewYear && m.month === viewMonth;
              return (
                <button
                  key={`${m.year}-${m.month}`}
                  type="button"
                  onClick={() => {
                    setViewYear(m.year);
                    setViewMonth(m.month);
                  }}
                  style={{
                    padding: '0.3rem 0.55rem',
                    fontSize: '0.72rem',
                    borderRadius: '0.35rem',
                    border: isCurrent
                      ? '1px solid #c9a97c'
                      : '1px solid rgba(255,255,255,0.12)',
                    background: isCurrent ? 'rgba(201,169,124,0.2)' : 'transparent',
                    color: isCurrent ? '#c9a97c' : '#9e988e',
                    cursor: 'pointer',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leyenda visual */}
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap',
            fontSize: '0.72rem',
            color: '#d5d0c5',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(46,125,50,0.45)',
                border: '1px solid #66bb6a',
              }}
            />
            Disponible
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(201,169,124,0.45)',
                border: '1px solid #c9a97c',
              }}
            />
            Reserva desde Web Confirmada
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(245,124,0,0.45)',
                border: '1px solid #ffb74d',
              }}
            />
            Pre-Reserva Hold 2h
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(255,90,95,0.45)',
                border: '1px solid #ff787c',
              }}
            />
            Airbnb (iCal)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(30,136,229,0.45)',
                border: '1px solid #64b5f6',
              }}
            />
            Booking.com (iCal)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: 'rgba(142,36,170,0.45)',
                border: '1px solid #ce93d8',
              }}
            />
            Bloqueo Manual
          </span>
        </div>
      </div>

      {/* CUADRÍCULA MENSUAL DE 7 COLUMNAS */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            minWidth: '720px',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '0.4rem',
          }}
        >
          {WEEKDAYS_ES.map((dayName) => (
            <div
              key={dayName}
              style={{
                textAlign: 'center',
                padding: '0.4rem',
                fontSize: '0.73rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#c9a97c',
                background: '#11100e',
                borderRadius: '0.35rem',
              }}
            >
              {dayName}
            </div>
          ))}

          {calendarDays.map((cell, idx) => {
            if (!cell.dateYmd || cell.dayNumber === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  style={{
                    minHeight: '94px',
                    background: 'rgba(17,16,14,0.35)',
                    borderRadius: '0.45rem',
                    border: '1px dashed rgba(255,255,255,0.04)',
                  }}
                />
              );
            }

            const isToday = cell.dateYmd === todayYmd;
            const isSelectedDate = cell.dateYmd === selectedDateYmd;
            const allAvailable = cell.snapshots.every((s) => s.isAvailable);
            const allOccupied = cell.snapshots.every((s) => !s.isAvailable);

            return (
              <button
                key={cell.dateYmd}
                type="button"
                onClick={() => setSelectedDateYmd(cell.dateYmd!)}
                style={{
                  minHeight: '96px',
                  padding: '0.45rem',
                  borderRadius: '0.5rem',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.35rem',
                  cursor: 'pointer',
                  background: isSelectedDate
                    ? 'rgba(201,169,124,0.16)'
                    : allOccupied
                    ? 'rgba(38,20,22,0.75)'
                    : '#11100e',
                  border: isSelectedDate
                    ? '2px solid #c9a97c'
                    : isToday
                    ? '1px solid #c9a97c'
                    : allAvailable
                    ? '1px solid rgba(102,187,106,0.22)'
                    : '1px solid rgba(255,120,124,0.32)',
                  color: '#f5f2eb',
                }}
              >
                {/* Fila superior del día: Número + Hoy + Temporada */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    gap: '0.25rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: isToday || isSelectedDate ? 700 : 500,
                      color: isToday ? '#c9a97c' : '#f5f2eb',
                    }}
                  >
                    {cell.dayNumber}
                    {isToday ? ' · HOY' : ''}
                  </span>
                  {cell.seasonLabel && (
                    <span
                      title={cell.seasonLabel}
                      style={{
                        fontSize: '0.6rem',
                        padding: '0.08rem 0.32rem',
                        borderRadius: '0.25rem',
                        background: 'rgba(201,169,124,0.25)',
                        color: '#c9a97c',
                        maxWidth: '75px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ★ Temp.
                    </span>
                  )}
                </div>

                {/* Estado de cada suite activa en ese día */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.22rem',
                    width: '100%',
                  }}
                >
                  {cell.snapshots.map((snap) => {
                    if (snap.isAvailable) {
                      return (
                        <div
                          key={snap.unit.id}
                          style={{
                            fontSize: '0.67rem',
                            padding: '0.16rem 0.35rem',
                            borderRadius: '0.28rem',
                            background: 'rgba(46, 125, 50, 0.16)',
                            border: '1px solid rgba(102, 187, 106, 0.35)',
                            color: '#a5d6a7',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{snap.shortCode}: Libre</span>
                          <span>${snap.rateUsd}</span>
                        </div>
                      );
                    }

                    const primaryOcc = snap.occupations[0];
                    const st = getOccupationVisualStyle(primaryOcc.kind);
                    return (
                      <div
                        key={snap.unit.id}
                        title={`${snap.unit.name}: ${primaryOcc.label} (${primaryOcc.subLabel})`}
                        style={{
                          fontSize: '0.67rem',
                          padding: '0.16rem 0.35rem',
                          borderRadius: '0.28rem',
                          background: st.bg,
                          border: `1px solid ${st.border}`,
                          color: st.color,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.2rem',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {snap.shortCode}: {st.tag}
                        </span>
                        <span style={{ fontSize: '0.62rem', opacity: 0.9 }}>✕</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL INSPECTOR DE LA FECHA SELECCIONADA (DETALLE Y ACCIONES DE 1 CLIC) */}
      <div
        style={{
          marginTop: '1.15rem',
          background: '#11100e',
          border: '1px solid rgba(201,169,124,0.35)',
          borderRadius: '0.7rem',
          padding: '1rem 1.15rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '0.85rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: '#c9a97c', letterSpacing: '0.12em' }}>
              INSPECTOR DE FECHA SELECCIONADA
            </span>
            <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.02rem', fontWeight: 500 }}>
              Detalle de Noche: {selectedDateYmd} → Check-out {getNextDateYmd(selectedDateYmd)}
            </h3>
          </div>
          <small style={{ color: '#9e988e', fontSize: '0.76rem' }}>
            Haz clic en cualquier día del calendario para inspeccionar o bloquear/liberar suites.
          </small>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {selectedDayAllUnitsSnapshots.map((snap) => {
            const thumb =
              snap.unit.galleryImages?.[0] ||
              snap.unit.coverImage ||
              '/images/apt-612/apt612-4.jpg';
            const nextDay = getNextDateYmd(selectedDateYmd);

            return (
              <div
                key={snap.unit.id}
                style={{
                  background: '#1a1815',
                  border: snap.isAvailable
                    ? '1px solid rgba(102,187,106,0.35)'
                    : '1px solid rgba(255,120,124,0.4)',
                  borderRadius: '0.6rem',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <img
                    src={thumb}
                    alt={snap.unit.name}
                    style={{
                      width: '54px',
                      height: '42px',
                      objectFit: 'cover',
                      borderRadius: '0.35rem',
                      border: '1px solid rgba(201,169,124,0.4)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: '0.88rem',
                        color: '#f5f2eb',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      [{snap.shortCode}] {snap.unit.name}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: '#c9a97c' }}>
                      Tarifa esa noche: <strong>${snap.rateUsd} USD</strong> (
                      {snap.rateType === 'SEASONAL'
                        ? `Temporada: ${snap.seasonLabel}`
                        : snap.rateType === 'WEEKEND'
                        ? 'Fin de Semana Vie–Sáb'
                        : 'Entre Semana Dom–Jue'}
                      )
                    </span>
                  </div>
                </div>

                {snap.isAvailable ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#81c784', fontWeight: 600 }}>
                      ✓ Disponible para reservar
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() =>
                          onQuickBlockNight(snap.unit.id, selectedDateYmd, nextDay)
                        }
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.73rem',
                          borderRadius: '0.35rem',
                          border: '1px solid #c9a97c',
                          background: 'rgba(201,169,124,0.2)',
                          color: '#f5f2eb',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        🔒 Bloquear esta noche
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onPrefillManualBlock(snap.unit.id, selectedDateYmd, nextDay)
                        }
                        style={{
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.73rem',
                          borderRadius: '0.35rem',
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'transparent',
                          color: '#d5d0c5',
                          cursor: 'pointer',
                        }}
                      >
                        Rango de fechas...
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {snap.occupations.map((occ, i) => {
                      const st = getOccupationVisualStyle(occ.kind);
                      return (
                        <div
                          key={`${occ.kind}-${i}`}
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.color,
                            fontSize: '0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.4rem',
                          }}
                        >
                          <div>
                            <strong>[{st.tag}]</strong> {occ.label}
                            <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                              Fechas: {occ.subLabel}
                            </div>
                          </div>

                          {occ.blockId !== undefined && (
                            <button
                              type="button"
                              onClick={() => onDeleteBlock(occ.blockId!)}
                              style={{
                                padding: '0.25rem 0.55rem',
                                fontSize: '0.7rem',
                                borderRadius: '0.3rem',
                                border: '1px solid rgba(255,255,255,0.35)',
                                background: 'rgba(0,0,0,0.35)',
                                color: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              Liberar
                            </button>
                          )}

                          {occ.bookingId && occ.bookingCode && (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {occ.kind === 'PENDING_HOLD' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateBookingStatus(
                                      occ.bookingId!,
                                      'CONFIRMED',
                                      occ.bookingCode!
                                    )
                                  }
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.7rem',
                                    borderRadius: '0.3rem',
                                    border: 'none',
                                    background: '#2e7d32',
                                    color: '#fff',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Confirmar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBookingStatus(
                                    occ.bookingId!,
                                    'CANCELLED',
                                    occ.bookingCode!
                                  )
                                }
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.7rem',
                                  borderRadius: '0.3rem',
                                  border: 'none',
                                  background: '#c62828',
                                  color: '#fff',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
