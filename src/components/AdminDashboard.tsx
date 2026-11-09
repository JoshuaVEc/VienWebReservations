import React, { useCallback, useState } from 'react';

interface AdminUnit {
  id: 'depto-612' | 'suite-311';
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

interface AdminSeasonalRate {
  id: number;
  unitId: 'depto-612' | 'suite-311' | 'ALL';
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
  unitId: 'depto-612' | 'suite-311';
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
  icalExportUrls: {
    'depto-612': string;
    'suite-311': string;
  };
}

export const AdminDashboard: React.FC<{ onExitAdmin: () => void }> = ({ onExitAdmin }) => {
  // Always start unauthenticated and with an empty password input so it always asks for the password
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Seasonal Rate Form
  const [seasonUnit, setSeasonUnit] = useState<'ALL' | 'depto-612' | 'suite-311'>('ALL');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [seasonStart, setSeasonStart] = useState('2026-12-24');
  const [seasonEnd, setSeasonEnd] = useState('2027-01-02');
  const [seasonRate, setSeasonRate] = useState(145);
  const [seasonMinNights, setSeasonMinNights] = useState(2);

  // Manual Block Form
  const [blockUnit, setBlockUnit] = useState<'depto-612' | 'suite-311'>('depto-612');
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
      setData(json as AdminDashboardData);
      setIsAuthenticated(true);
    } catch {
      setAuthError('Error al conectar con el servidor /api/admin');
    } finally {
      setLoading(false);
    }
  }, []);

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
    } else {
      const err = await res.json().catch(() => ({}));
      setStatusMessage(`Error: ${err.error || 'No se pudo guardar'}`);
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
            Panel de Administración (612 &amp; 311)
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9e988e', lineHeight: 1.5 }}>
            Ingresa tu contraseña de administrador para gestionar reservas, tarifas y la
            sincronización con Airbnb y Booking.com.
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
            MAKANA RESORT · TONSUPA — BACKEND &amp; ICAL ENGINE
          </span>
          <h1 style={{ margin: '0.25rem 0', fontSize: '1.55rem', fontWeight: 300 }}>
            Administración de Reservas, Tarifas e iCal (Depto 612 y Suite 311)
          </h1>
          <small style={{ color: '#9e988e' }}>Motor activo: {data.storageEngine}</small>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
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

      {/* 1. RESERVAS & PRE-RESERVAS DE 2 HORAS */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', color: '#c9a97c', fontWeight: 400, marginBottom: '0.75rem' }}>
          1. Reservas y Bloqueos Temporales de 2 Horas ({data.bookings.length})
        </h2>
        {data.bookings.length === 0 ? (
          <p style={{ color: '#9e988e', fontSize: '0.9rem' }}>
            Aún no hay reservas registradas. Prueba creando una desde el formulario de la web.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {data.bookings.map((b) => {
              const isExpiredPending =
                b.status === 'PENDING' && new Date(b.expiresAt).getTime() <= Date.now();
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
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{b.bookingCode}</strong>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '99px',
                          background:
                            b.status === 'CONFIRMED'
                              ? 'rgba(46,125,50,0.3)'
                              : b.status === 'CANCELLED' || isExpiredPending
                              ? 'rgba(198,40,40,0.25)'
                              : 'rgba(245,124,0,0.3)',
                        }}
                      >
                        {isExpiredPending ? 'PENDING EXPIRADA (>2H)' : b.status}
                      </span>
                      <span style={{ color: '#c9a97c', fontSize: '0.85rem' }}>
                        {b.unitSelection === 'depto-612'
                          ? 'Departamento 612'
                          : b.unitSelection === 'suite-311'
                          ? 'Suite 311'
                          : 'Reserva Doble (612 + 311)'}
                      </span>
                    </div>
                    <p style={{ margin: '0.35rem 0', fontSize: '0.88rem' }}>
                      📅 <strong>{b.checkIn}</strong> al <strong>{b.checkOut}</strong> ({b.nights}{' '}
                      noches) · 💵 <strong>${b.totalPriceUsd} USD</strong> · 👤 {b.guestName} (
                      {b.guestPhone} / {b.guestEmail})
                    </p>
                    {b.status === 'PENDING' && !isExpiredPending && (
                      <small style={{ color: '#ffb74d' }}>
                        ⏳ Bloqueo temporal de 2h vence a las:{' '}
                        {new Date(b.expiresAt).toLocaleTimeString()}
                      </small>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {b.status !== 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() =>
                          void runMutation(
                            { op: 'updateBookingStatus', id: b.id, status: 'CONFIRMED' },
                            `Reserva ${b.bookingCode} CONFIRMADA y bloqueada en iCal`
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
                    )}
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

      {/* 2. TARIFAS ENTRE SEMANA / FIN DE SEMANA E ICAL POR UNIDAD */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', color: '#c9a97c', fontWeight: 400, marginBottom: '0.75rem' }}>
          2. Tarifas por Unidad y Conexión con Airbnb y Booking.com (iCal .ics)
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {data.units.map((u) => (
            <UnitConfigCard
              key={u.id}
              unit={u}
              exportUrl={data.icalExportUrls[u.id]}
              onSave={(patch) =>
                void runMutation(
                  { op: 'updateUnit', unitId: u.id, ...patch },
                  `Configuración de ${u.name} guardada`
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
              onChange={(e) => setSeasonUnit(e.target.value as 'ALL' | 'depto-612' | 'suite-311')}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <option value="ALL">Ambas (612 y 311)</option>
              <option value="depto-612">Departamento 612</option>
              <option value="suite-311">Suite 311</option>
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
              style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Desde
            <input
              type="date"
              required
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Hasta
            <input
              type="date"
              required
              value={seasonEnd}
              onChange={(e) => setSeasonEnd(e.target.value)}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Tarifa USD/noche
            <input
              type="number"
              required
              value={seasonRate}
              onChange={(e) => setSeasonRate(Number(e.target.value))}
              style={{ width: '90px', display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Mín. Noches
            <input
              type="number"
              required
              value={seasonMinNights}
              onChange={(e) => setSeasonMinNights(Number(e.target.value))}
              style={{ width: '75px', display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
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
      <section>
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
              onChange={(e) => setBlockUnit(e.target.value as 'depto-612' | 'suite-311')}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <option value="depto-612">Departamento 612</option>
              <option value="suite-311">Suite 311</option>
            </select>
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Check-in
            <input
              type="date"
              required
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem' }}>
            Check-out
            <input
              type="date"
              required
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              style={{ display: 'block', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </label>
          <label style={{ fontSize: '0.78rem', flex: 1 }}>
            Motivo
            <input
              type="text"
              value={blockSummary}
              onChange={(e) => setBlockSummary(e.target.value)}
              style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
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
  onSave: (patch: Partial<AdminUnit>) => void;
}> = ({ unit, exportUrl, onSave }) => {
  const [weekdayRate, setWeekdayRate] = useState(unit.weekdayRate);
  const [weekendRate, setWeekendRate] = useState(unit.weekendRate);
  const [cleaningFee, setCleaningFee] = useState(unit.cleaningFee);
  const [airbnbIcalUrl, setAirbnbIcalUrl] = useState(unit.airbnbIcalUrl || '');
  const [bookingIcalUrl, setBookingIcalUrl] = useState(unit.bookingIcalUrl || '');
  const [copied, setCopied] = useState(false);

  return (
    <div
      style={{
        background: '#1a1815',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '0.85rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#c9a97c' }}>{unit.name}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
        <label style={{ fontSize: '0.75rem' }}>
          Dom–Jue ($ USD)
          <input
            type="number"
            value={weekdayRate}
            onChange={(e) => setWeekdayRate(Number(e.target.value))}
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />
        </label>
        <label style={{ fontSize: '0.75rem' }}>
          Vie–Sáb ($ USD)
          <input
            type="number"
            value={weekendRate}
            onChange={(e) => setWeekendRate(Number(e.target.value))}
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />
        </label>
        <label style={{ fontSize: '0.75rem' }}>
          Limpieza ($ USD)
          <input
            type="number"
            value={cleaningFee}
            onChange={(e) => setCleaningFee(Number(e.target.value))}
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.45rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          />
        </label>
      </div>

      <div
        style={{
          fontSize: '0.76rem',
          background: '#11100e',
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
          style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
        />
      </label>

      <label style={{ fontSize: '0.75rem' }}>
        3. URL iCal exportada de Booking.com (Pegar aquí el link .ics que te da Booking)
        <input
          type="url"
          placeholder="https://ical.booking.com/v1/export?t=..."
          value={bookingIcalUrl}
          onChange={(e) => setBookingIcalUrl(e.target.value)}
          style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem', background: '#11100e', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
        />
      </label>

      {unit.lastIcalSyncAt && (
        <small style={{ color: '#9e988e', fontSize: '0.72rem' }}>
          Última sincronización: {new Date(unit.lastIcalSyncAt).toLocaleString()}
        </small>
      )}

      <button
        type="button"
        onClick={() =>
          onSave({
            weekdayRate,
            weekendRate,
            cleaningFee,
            airbnbIcalUrl,
            bookingIcalUrl,
          })
        }
        style={{
          padding: '0.6rem',
          background: '#c9a97c',
          color: '#11100e',
          border: 'none',
          borderRadius: '0.4rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Guardar Tarifas y Links iCal
      </button>
    </div>
  );
};
