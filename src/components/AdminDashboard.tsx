import React, { useCallback, useState } from 'react';

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
            onClick={() => setIsCreateOpen((prev) => !prev)}
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

      {/* FORMULARIO DESPLEGABLE PARA CREAR NUEVA SUITE */}
      {isCreateOpen && (
        <section
          style={{
            background: '#1a1815',
            border: '1px solid #c9a97c',
            borderRadius: '0.9rem',
            padding: '1.5rem',
            marginBottom: '2.5rem',
            boxShadow: '0 18px 48px rgba(0,0,0,0.5)',
          }}
        >
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', color: '#c9a97c' }}>
            ✨ Registrar Nueva Suite / Propiedad
          </h2>
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
        </section>
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
                        {b.unitSelection === 'vien-residence-experience'
                          ? 'Reserva Combinada (Todas las Suites)'
                          : matchedUnit?.name || b.unitSelection}
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

      {/* 2. GESTIÓN DINÁMICA DE SUITES (EDITAR, SUBIR FOTOS, ICAL Y ELIMINAR) */}
      <section style={{ marginBottom: '2.5rem' }}>
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
          {!isCreateOpen && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '0.4rem',
                border: '1px solid #c9a97c',
                background: 'rgba(201,169,124,0.18)',
                color: '#f5f2eb',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              + Agregar Otra Suite
            </button>
          )}
        </div>
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
                void runMutation(
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
  onSave: (patch: Partial<AdminUnit>) => void;
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
      {/* Cabecera con miniatura de portada y botones de edición / eliminación */}
      <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
        <img
          src={galleryImages[0] || unit.coverImage || '/images/apt-612/apt612-4.jpg'}
          alt={name}
          style={{
            width: '76px',
            height: '58px',
            objectFit: 'cover',
            borderRadius: '0.45rem',
            border: '1px solid rgba(201,169,124,0.4)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.02rem', color: '#c9a97c', wordBreak: 'break-word' }}>
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
          <small style={{ color: '#9e988e', display: 'block', marginTop: '0.15rem' }}>
            {tagline} · Máx. {maxGuests} huéspedes
          </small>
        </div>
      </div>

      {/* Botón para expandir edición de textos y fotos */}
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
            ? '▲ Ocultar Detalles y Galería de Fotos'
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

      {/* SECCIÓN EXPANDIBLE: TEXTOS Y SUBIDA DE IMÁGENES LOCALES */}
      {isDetailsExpanded && (
        <div
          style={{
            background: '#11100e',
            border: '1px solid rgba(201,169,124,0.28)',
            borderRadius: '0.6rem',
            padding: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
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
        </div>
      )}

      {/* Tarifas Rápidas */}
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
              background: '#11100e',
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
              background: '#11100e',
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
              background: '#11100e',
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
              background: '#11100e',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          />
        </label>
      </div>

      {/* Enlace iCal de exportación */}
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
            background: '#11100e',
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
        onClick={() =>
          onSave({
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
        Guardar Cambios de Suite
      </button>
    </div>
  );
};
