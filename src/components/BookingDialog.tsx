import React, { useEffect, useRef, useState } from 'react';
import { HERO_SLIDES, Language } from '../data/heroSlides';

interface BookingDialogProps {
  isOpen: boolean;
  lang: Language;
  initialSuiteId: string;
  onClose: () => void;
}

const DIALOG_COPY = {
  en: {
    eyebrow: 'VIEN VACATION HOME · LIVE CALENDAR SYNC (AIRBNB & BOOKING.COM)',
    title: 'CHECK AVAILABILITY & BOOK',
    closeAria: 'Close reservation dialog',
    badge: 'CALENDAR HOLD REQUESTED',
    confirmTitle: 'Your Vien Vacation Home Reservation',
    confirmReturn: 'RETURN TO VIEN VACATION HOME',
    suiteLabel: 'SELECT SUITE (2 QUEEN BEDS · FULL EQUIPPED)',
    checkInLabel: 'CHECK-IN DATE',
    checkOutLabel: 'CHECK-OUT DATE',
    adultsLabel: 'ADULTS (MAX 4 GUESTS / SUITE)',
    adultsOptions: [
      '1 Adult',
      '2 Adults',
      '3 Adults',
      '4 Adults',
      '5–8 Guests (Both Suites 421 & 311)',
    ],
    childrenLabel: 'CHILDREN',
    childrenOptions: ['0 Children', '1 Child', '2 Children', '3 Children'],
    nameLabel: 'PRIMARY GUEST FULL NAME',
    namePlaceholder: 'e.g. Joshua Vance',
    phoneLabel: 'WHATSAPP / PHONE (FOR CHECK-IN CODE)',
    phonePlaceholder: '+1 (555) 000-0000',
    emailLabel: 'EMAIL ADDRESS (CONFIRMATION & ICAL RECEIPT)',
    emailPlaceholder: 'guest@email.com',
    notesLabel: 'ARRIVAL TIME OR SPECIAL NOTES (OPTIONAL)',
    notesPlaceholder: 'Estimated arrival time, early check-in request...',
    cancelBtn: 'CANCEL',
    submitBtn: 'RESERVE SUITE',
  },
  es: {
    eyebrow: 'VIEN VACATION HOME · CALENDARIO SINCRONIZADO (AIRBNB Y BOOKING.COM)',
    title: 'VERIFICAR DISPONIBILIDAD Y RESERVAR',
    closeAria: 'Cerrar ventana de reservación',
    badge: 'SOLICITUD DE FECHAS REGISTRADA',
    confirmTitle: 'Tu Reserva en Vien Vacation Home',
    confirmReturn: 'VOLVER A VIEN VACATION HOME',
    suiteLabel: 'SELECCIONA TU SUITE (2 CAMAS QUEEN · FULL EQUIPADA)',
    checkInLabel: 'FECHA DE CHECK-IN',
    checkOutLabel: 'FECHA DE CHECK-OUT',
    adultsLabel: 'ADULTOS (MÁX. 4 PERSONAS / SUITE)',
    adultsOptions: [
      '1 Adulto',
      '2 Adultos',
      '3 Adultos',
      '4 Adultos',
      '5–8 Personas (Ambas Suites 421 y 311)',
    ],
    childrenLabel: 'NIÑOS',
    childrenOptions: ['0 Niños', '1 Niño', '2 Niños', '3 Niños'],
    nameLabel: 'NOMBRE COMPLETO DEL HUÉSPED PRINCIPAL',
    namePlaceholder: 'ej. Joshua Vance',
    phoneLabel: 'WHATSAPP / TELÉFONO (PARA CÓDIGO DE ACCESO)',
    phonePlaceholder: '+1 (555) 000-0000',
    emailLabel: 'CORREO ELECTRÓNICO (CONFIRMACIÓN Y RECIBO)',
    emailPlaceholder: 'huesped@correo.com',
    notesLabel: 'HORA ESTIMADA DE LLEGADA O NOTAS (OPCIONAL)',
    notesPlaceholder: 'Hora de llegada, solicitud de check-in temprano...',
    cancelBtn: 'CANCELAR',
    submitBtn: 'RESERVAR SUITE',
  },
};

// Feature detection for discrete display transitions (modern-web-guidance: animate-to-from-top-layer)
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

export const BookingDialog: React.FC<BookingDialogProps> = ({
  isOpen,
  lang,
  initialSuiteId,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = DIALOG_COPY[lang];
  const [selectedSuite, setSelectedSuite] = useState(initialSuiteId);
  const [checkIn, setCheckIn] = useState('2026-11-12');
  const [checkOut, setCheckOut] = useState('2026-11-16');
  const [adultsIdx, setAdultsIdx] = useState(1);
  const [childrenIdx, setChildrenIdx] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelectedSuite(initialSuiteId);
  }, [initialSuiteId]);

  const closeTopLayer = async (dialog: HTMLDialogElement) => {
    if (!supportsTopLayerExit()) {
      dialog.setAttribute('data-closing', '');
      const animations = dialog.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 400)),
        ]);
      }
      if (!dialog.hasAttribute('data-closing')) return;
      dialog.removeAttribute('data-closing');
    }
    if (dialog.open) {
      dialog.close();
    }
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setSubmitted(false);
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      void closeTopLayer(dialog);
    }
  }, [isOpen]);

  // Fallback for browsers without native `closedby="any"` support (modern-web-guidance: light-dismiss-a-dialog)
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
        if (e.target === dialog) {
          pressedOutside = isOutside(e);
        } else {
          pressedOutside = false;
        }
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
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const selectedSuiteName =
    HERO_SLIDES.find((s) => s.id === selectedSuite)?.suiteName[lang] ?? '';

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

        {submitted ? (
          <div className="booking-confirmation">
            <span className="confirmation-badge">{copy.badge}</span>
            <h3>{copy.confirmTitle}</h3>
            {lang === 'en' ? (
              <p>
                We have registered your reservation inquiry for{' '}
                <strong>{selectedSuiteName}</strong> from <strong>{checkIn}</strong> to{' '}
                <strong>{checkOut}</strong> ({copy.adultsOptions[adultsIdx]},{' '}
                {copy.childrenOptions[childrenIdx]}). Once connected to the PostgreSQL &amp;
                iCal engine, these dates will automatically block across Airbnb and Booking.com.
              </p>
            ) : (
              <p>
                Hemos registrado tu solicitud de reserva para{' '}
                <strong>{selectedSuiteName}</strong> del <strong>{checkIn}</strong> al{' '}
                <strong>{checkOut}</strong> ({copy.adultsOptions[adultsIdx]},{' '}
                {copy.childrenOptions[childrenIdx]}). Al conectarse con el motor PostgreSQL e
                iCal, estas fechas se bloquearán automáticamente en Airbnb y Booking.com.
              </p>
            )}
            <button
              type="button"
              className="dialog-submit-btn"
              onClick={() => {
                if (dialogRef.current) {
                  void closeTopLayer(dialogRef.current);
                }
              }}
            >
              {copy.confirmReturn}
            </button>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="suite-select">{copy.suiteLabel}</label>
              <select
                id="suite-select"
                value={selectedSuite}
                onChange={(e) => setSelectedSuite(e.target.value)}
                autoFocus
              >
                {HERO_SLIDES.map((slide) => (
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
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="adults-select">{copy.adultsLabel}</label>
                <select
                  id="adults-select"
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
                  type="text"
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
                  type="tel"
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
                type="email"
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
                type="text"
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
              <button type="submit" className="dialog-submit-btn">
                {copy.submitBtn}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
};
