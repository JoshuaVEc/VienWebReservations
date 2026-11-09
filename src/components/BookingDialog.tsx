import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { HERO_SLIDES, HeroSlide, Language } from '../data/heroSlides';

interface BookingDialogProps {
  isOpen: boolean;
  lang: Language;
  initialSuiteId: string;
  slides?: HeroSlide[];
  onClose: () => void;
}

interface PricePreview {
  nights: number;
  subtotalUsd: number;
  cleaningFeeUsd: number;
  dualDiscountUsd: number;
  totalUsd: number;
  minNightsRequired: number;
}

interface CreatedBookingResponse {
  booking: {
    id: string;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalPriceUsd: number;
    expiresAt: string;
  };
  pricing: PricePreview;
  whatsappUrl: string;
}

const DIALOG_COPY = {
  en: {
    eyebrow: 'MAKANA RESORT · TONSUPA — LIVE CALENDAR SYNC (AIRBNB & BOOKING.COM)',
    title: 'CHECK AVAILABILITY & BOOK',
    closeAria: 'Close reservation dialog',
    badge: '2-HOUR CALENDAR HOLD ACTIVE',
    confirmTitle: 'Your Pre-Reservation is Locked for 2 Hours',
    confirmReturn: 'RETURN TO MAKANA RESORT',
    whatsappCta: 'CONFIRM PAYMENT VIA WHATSAPP (0999 00 24 27)',
    suiteLabel: 'SELECT SUITE / UNIT (FULL EQUIPPED · OCEAN VIEW)',
    checkInLabel: 'CHECK-IN DATE',
    checkOutLabel: 'CHECK-OUT DATE',
    adultsLabel: 'ADULTS (MAX 4 GUESTS / UNIT)',
    adultsOptions: [
      '1 Adult',
      '2 Adults',
      '3 Adults',
      '4 Adults',
      '5–8 Guests (Both Units 612 & 311)',
    ],
    childrenLabel: 'CHILDREN',
    childrenOptions: ['0 Children', '1 Child', '2 Children', '3 Children'],
    nameLabel: 'PRIMARY GUEST FULL NAME',
    namePlaceholder: 'e.g. Joshua Vance',
    phoneLabel: 'WHATSAPP / PHONE (FOR CONFIRMATION)',
    phonePlaceholder: '+593 99 900 2427',
    emailLabel: 'EMAIL ADDRESS (CONFIRMATION & RECEIPT)',
    emailPlaceholder: 'guest@email.com',
    notesLabel: 'ARRIVAL TIME OR SPECIAL NOTES (OPTIONAL)',
    notesPlaceholder: 'Estimated arrival time, early check-in request...',
    cancelBtn: 'CANCEL',
    submitBtn: 'LOCK DATES (2H HOLD)',
    submittingBtn: 'LOCKING DATES...',
    checkingAvail: 'Checking live calendar...',
    availableTag: '✓ Available',
    unavailableTag: '✕ Dates Already Occupied',
    nightsUnit: 'nights',
    dualDiscountTag: 'dual discount included',
  },
  es: {
    eyebrow: 'MAKANA RESORT · TONSUPA — CALENDARIO SINCRONIZADO (AIRBNB Y BOOKING.COM)',
    title: 'VERIFICAR DISPONIBILIDAD Y RESERVAR',
    closeAria: 'Cerrar ventana de reservación',
    badge: 'BLOQUEO TEMPORAL DE 2 HORAS ACTIVO',
    confirmTitle: 'Tu Pre-Reserva está Bloqueada por 2 Horas',
    confirmReturn: 'VOLVER A MAKANA RESORT',
    whatsappCta: 'COORDINAR PAGO POR WHATSAPP (0999 00 24 27)',
    suiteLabel: 'SELECCIONA TU UNIDAD (FULL EQUIPADA · VISTA AL MAR)',
    checkInLabel: 'FECHA DE CHECK-IN',
    checkOutLabel: 'FECHA DE CHECK-OUT',
    adultsLabel: 'ADULTOS (MÁX. 4 PERSONAS / UNIDAD)',
    adultsOptions: [
      '1 Adulto',
      '2 Adultos',
      '3 Adultos',
      '4 Adultos',
      '5–8 Personas (Ambas Unidades 612 y 311)',
    ],
    childrenLabel: 'NIÑOS',
    childrenOptions: ['0 Niños', '1 Niño', '2 Niños', '3 Niños'],
    nameLabel: 'NOMBRE COMPLETO DEL HUÉSPED PRINCIPAL',
    namePlaceholder: 'ej. Carlos Mendoza',
    phoneLabel: 'WHATSAPP / TELÉFONO (PARA CONFIRMACIÓN)',
    phonePlaceholder: '0999 00 24 27',
    emailLabel: 'CORREO ELECTRÓNICO (CONFIRMACIÓN Y RECIBO)',
    emailPlaceholder: 'huesped@correo.com',
    notesLabel: 'HORA ESTIMADA DE LLEGADA O NOTAS (OPCIONAL)',
    notesPlaceholder: 'Hora de llegada, solicitud de check-in temprano...',
    cancelBtn: 'CANCELAR',
    submitBtn: 'RESERVAR Y BLOQUEAR FECHAS (2H)',
    submittingBtn: 'BLOQUEANDO FECHAS...',
    checkingAvail: 'Consultando calendario en vivo...',
    availableTag: '✓ Fechas Disponibles',
    unavailableTag: '✕ Fechas Ocupadas en Calendario',
    nightsUnit: 'noches',
    dualDiscountTag: 'desc. doble incluido',
  },
};

let supportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.CSS?.supports?.('overlay', 'auto')) &&
    canTransitionDisplay()
  );
}

function syncUserInvalidAria(target: EventTarget | null): void {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  try {
    const isUserInvalid = target.matches(':user-invalid');
    if (isUserInvalid) {
      target.setAttribute('aria-invalid', 'true');
    } else if (target.hasAttribute('aria-invalid')) {
      target.removeAttribute('aria-invalid');
    }
  } catch {
    // Ignore if :user-invalid selector is unsupported in legacy engine
  }
}

export const BookingDialog: React.FC<BookingDialogProps> = memo(
  ({ isOpen, lang, initialSuiteId, slides = HERO_SLIDES, onClose }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const copy = DIALOG_COPY[lang];
    const [selectedSuite, setSelectedSuite] = useState(initialSuiteId);
    const [checkIn, setCheckIn] = useState('2026-11-12');
    const [checkOut, setCheckOut] = useState('2026-11-15');
    const [adultsIdx, setAdultsIdx] = useState(1);
    const [childrenIdx, setChildrenIdx] = useState(0);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [specialRequests, setSpecialRequests] = useState('');

    const [isCheckingAvail, setIsCheckingAvail] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdResult, setCreatedResult] = useState<CreatedBookingResponse | null>(null);

    useEffect(() => {
      setSelectedSuite(initialSuiteId);
    }, [initialSuiteId]);

    useEffect(() => {
      if (!isOpen || !checkIn || !checkOut || checkIn >= checkOut) {
        setIsAvailable(null);
        setPricePreview(null);
        return;
      }

      const controller = new AbortController();
      setIsCheckingAvail(true);
      setErrorMsg(null);

      fetch(
        `/api/availability?unit=${encodeURIComponent(selectedSuite)}&checkIn=${encodeURIComponent(
          checkIn
        )}&checkOut=${encodeURIComponent(checkOut)}`,
        { signal: controller.signal }
      )
        .then((res) => res.json())
        .then((data) => {
          setIsAvailable(typeof data.available === 'boolean' ? data.available : null);
          setPricePreview(data.pricing || null);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setIsAvailable(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsCheckingAvail(false);
          }
        });

      return () => {
        controller.abort();
      };
    }, [isOpen, selectedSuite, checkIn, checkOut]);

    const closeTopLayer = useCallback(
      async (dialog: HTMLDialogElement) => {
        if (!supportsTopLayerExit()) {
          dialog.setAttribute('data-closing', '');
          const animations = dialog.getAnimations({ subtree: true });
          if (animations.length > 0) {
            await Promise.race([
              Promise.allSettled(animations.map((a) => a.finished)),
              new Promise((r) => setTimeout(r, 2000)),
            ]);
          }
          if (!dialog.hasAttribute('data-closing')) return;
          dialog.removeAttribute('data-closing');
        }
        if (dialog.open) {
          dialog.close();
        }
        onClose();
      },
      [onClose]
    );

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (isOpen && !dialog.open) {
        setCreatedResult(null);
        setErrorMsg(null);
        dialog.showModal();
      } else if (!isOpen && dialog.open) {
        void closeTopLayer(dialog);
      }
    }, [isOpen, closeTopLayer]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleCancel = (event: Event) => {
        event.preventDefault();
        void closeTopLayer(dialog);
      };

      const handleNativeClose = () => {
        dialog.returnValue = '';
        onClose();
      };

      dialog.addEventListener('cancel', handleCancel);
      dialog.addEventListener('close', handleNativeClose);

      let cleanupLightDismiss: (() => void) | undefined;
      if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
        const isOutside = (e: PointerEvent) => {
          const rect = dialog.getBoundingClientRect();
          return (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          );
        };
        let pressedOutside = false;
        const onPointerDown = (e: PointerEvent) => {
          pressedOutside = e.target === dialog && isOutside(e);
        };
        const onPointerUp = (e: PointerEvent) => {
          if (pressedOutside && e.target === dialog && isOutside(e)) {
            void closeTopLayer(dialog);
          }
          pressedOutside = false;
        };
        dialog.addEventListener('pointerdown', onPointerDown);
        dialog.addEventListener('pointerup', onPointerUp);
        cleanupLightDismiss = () => {
          dialog.removeEventListener('pointerdown', onPointerDown);
          dialog.removeEventListener('pointerup', onPointerUp);
        };
      }

      return () => {
        dialog.removeEventListener('cancel', handleCancel);
        dialog.removeEventListener('close', handleNativeClose);
        cleanupLightDismiss?.();
      };
    }, [onClose, closeTopLayer]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);
      setIsSubmitting(true);

      try {
        const adultsCount = adultsIdx === 4 ? 6 : adultsIdx + 1;
        const unitToBook =
          adultsIdx === 4 ? 'vien-residence-experience' : selectedSuite;

        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitSelection: unitToBook,
            checkIn,
            checkOut,
            adults: adultsCount,
            children: childrenIdx,
            guestName,
            guestPhone,
            guestEmail,
            specialRequests,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'No se pudo completar la pre-reserva.');
          setIsSubmitting(false);
          return;
        }

        setCreatedResult(data as CreatedBookingResponse);
      } catch {
        setErrorMsg('Error de conexión con el servidor de reservas.');
      } finally {
        setIsSubmitting(false);
      }
    };

    const selectedSuiteName =
      slides.find((s) => s.id === selectedSuite)?.suiteName[lang] ?? '';

    return (
      <dialog
        ref={dialogRef}
        id="lumiere-booking-dialog"
        className="lumiere-dialog"
        aria-labelledby="booking-dialog-title"
        {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <div>
              <span className="dialog-eyebrow">{copy.eyebrow}</span>
              <h2 id="booking-dialog-title" className="dialog-title">
                {copy.title}
              </h2>
            </div>
            <button
              type="button"
              className="dialog-close-btn"
              aria-label={copy.closeAria}
              onClick={() => {
                if (dialogRef.current) {
                  void closeTopLayer(dialogRef.current);
                }
              }}
            >
              ✕
            </button>
          </div>

          {createdResult ? (
            <div className="booking-confirmation">
              <span className="confirmation-badge">
                {copy.badge} · {createdResult.booking.bookingCode}
              </span>
              <h3>{copy.confirmTitle}</h3>
              {lang === 'en' ? (
                <p>
                  Your pre-reservation <strong>{createdResult.booking.bookingCode}</strong> for{' '}
                  <strong>{selectedSuiteName}</strong> from{' '}
                  <strong>{createdResult.booking.checkIn}</strong> to{' '}
                  <strong>{createdResult.booking.checkOut}</strong> (
                  {createdResult.booking.nights} nights ·{' '}
                  <strong>${createdResult.booking.totalPriceUsd} USD</strong>) is now locked for{' '}
                  <strong>2 hours</strong> across our calendar and iCal feed (Airbnb &amp;
                  Booking.com). Click below to confirm your payment via WhatsApp:
                </p>
              ) : (
                <p>
                  Tu pre-reserva <strong>{createdResult.booking.bookingCode}</strong> para{' '}
                  <strong>{selectedSuiteName}</strong> del{' '}
                  <strong>{createdResult.booking.checkIn}</strong> al{' '}
                  <strong>{createdResult.booking.checkOut}</strong> (
                  {createdResult.booking.nights} noches ·{' '}
                  <strong>${createdResult.booking.totalPriceUsd} USD</strong>) ha quedado bloqueada
                  temporalmente por <strong>2 horas</strong> en nuestro calendario y en el feed iCal
                  de Airbnb y Booking.com. Haz clic abajo para enviar tu código por WhatsApp y
                  confirmar el pago:
                </p>
              )}
              <div className="dialog-confirm-actions">
                <a
                  href={createdResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dialog-submit-btn dialog-whatsapp-btn"
                >
                  {copy.whatsappCta}
                </a>
                <button
                  type="button"
                  className="dialog-secondary-btn"
                  onClick={() => {
                    if (dialogRef.current) {
                      void closeTopLayer(dialogRef.current);
                    }
                  }}
                >
                  {copy.confirmReturn}
                </button>
              </div>
            </div>
          ) : (
            <form
              className="booking-form"
              onSubmit={handleSubmit}
              onBlurCapture={(e) => syncUserInvalidAria(e.target)}
              onInputCapture={(e) => {
                if (
                  e.target instanceof HTMLElement &&
                  e.target.hasAttribute('aria-invalid')
                ) {
                  syncUserInvalidAria(e.target);
                }
              }}
            >
              <div className="form-field">
                <label htmlFor="suite-select">{copy.suiteLabel}</label>
                <select
                  id="suite-select"
                  name="unitSelection"
                  value={selectedSuite}
                  onChange={(e) => setSelectedSuite(e.target.value)}
                  autoFocus
                >
                  {slides.map((slide) => (
                    <option key={slide.id} value={slide.id}>
                      {slide.suiteName[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="checkin-date">{copy.checkInLabel}</label>
                  <input
                    id="checkin-date"
                    name="checkIn"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="checkout-date">{copy.checkOutLabel}</label>
                  <input
                    id="checkout-date"
                    name="checkOut"
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                  />
                </div>
              </div>

              {(isCheckingAvail || isAvailable !== null || pricePreview) && (
                <div className="booking-availability-banner" aria-live="polite">
                  <span>
                    {isCheckingAvail
                      ? copy.checkingAvail
                      : isAvailable === true
                      ? copy.availableTag
                      : isAvailable === false
                      ? copy.unavailableTag
                      : ''}
                  </span>
                  {pricePreview && (
                    <span>
                      <strong>
                        {pricePreview.nights} {copy.nightsUnit}
                      </strong>{' '}
                      · Total: <strong>${pricePreview.totalUsd} USD</strong>
                      {pricePreview.dualDiscountUsd > 0
                        ? ` (-$${pricePreview.dualDiscountUsd} ${copy.dualDiscountTag})`
                        : ''}
                    </span>
                  )}
                </div>
              )}

              {errorMsg && (
                <div role="alert" className="booking-error-banner">
                  {errorMsg}
                </div>
              )}

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="adults-select">{copy.adultsLabel}</label>
                  <select
                    id="adults-select"
                    name="adults"
                    value={adultsIdx}
                    onChange={(e) => setAdultsIdx(Number(e.target.value))}
                  >
                    {copy.adultsOptions.map((opt, i) => (
                      <option key={opt} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="children-select">{copy.childrenLabel}</label>
                  <select
                    id="children-select"
                    name="children"
                    value={childrenIdx}
                    onChange={(e) => setChildrenIdx(Number(e.target.value))}
                  >
                    {copy.childrenOptions.map((opt, i) => (
                      <option key={opt} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="guest-name">{copy.nameLabel}</label>
                  <input
                    id="guest-name"
                    name="guestName"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={120}
                    placeholder={copy.namePlaceholder}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="guest-phone">{copy.phoneLabel}</label>
                  <input
                    id="guest-phone"
                    name="guestPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    minLength={6}
                    maxLength={40}
                    placeholder={copy.phonePlaceholder}
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="guest-email">{copy.emailLabel}</label>
                <input
                  id="guest-email"
                  name="guestEmail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={120}
                  placeholder={copy.emailPlaceholder}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="special-requests">{copy.notesLabel}</label>
                <input
                  id="special-requests"
                  name="specialRequests"
                  type="text"
                  maxLength={500}
                  placeholder={copy.notesPlaceholder}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>

              <div className="dialog-actions">
                <button
                  type="button"
                  className="dialog-secondary-btn"
                  onClick={() => {
                    if (dialogRef.current) {
                      void closeTopLayer(dialogRef.current);
                    }
                  }}
                >
                  {copy.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="dialog-submit-btn"
                  disabled={isSubmitting || isAvailable === false}
                >
                  {isSubmitting ? copy.submittingBtn : copy.submitBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    );
  }
);
BookingDialog.displayName = 'BookingDialog';
