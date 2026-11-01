import React from 'react';
import { HERO_SLIDES, Language } from '../data/heroSlides';

interface AboutSectionProps {
  lang: Language;
  onExploreSuites: () => void;
}

const ABOUT_COPY = {
  en: {
    eyebrow: 'ABOUT US — VIEN VACATION HOME',
    title: 'FULL EQUIPPED LUXURY SUITES DESIGNED FOR UP TO 4 GUESTS EACH',
    lead: (
      <>
        Welcome to <strong>Vien Vacation Home</strong>. We offer two exclusive,
        fully equipped residences—<strong>Suite 421</strong> and{' '}
        <strong>Suite 311</strong>—crafted for families, couples, and travelers
        who value space, privacy, and hotel-grade comfort.
      </>
    ),
    body: (
      <>
        Both <strong>Suite 421</strong> and <strong>Suite 311</strong> accommodate
        up to <strong>4 guests</strong> each with <strong>two plush Queen beds</strong>,
        a fully equipped kitchen, dining and lounge areas, high-speed Wi-Fi, and
        real-time availability synchronized with <strong>Airbnb</strong> and{' '}
        <strong>Booking.com</strong>.
      </>
    ),
    stat1Label: '2 FULL EQUIPPED SUITES',
    stat2Num: '2 QUEEN',
    stat2Label: 'BEDS PER SUITE (4 GUESTS)',
    stat3Num: 'LIVE SYNC',
    stat3Label: 'AIRBNB & BOOKING CALENDAR',
    cta: 'EXPLORE SUITES 421 & 311',
    floatingTag: 'SUITES 421 & 311',
    floatingDesc: '4 Guests · 2 Queen Beds · Full Equipped · Direct Booking.',
  },
  es: {
    eyebrow: 'NOSOTROS — VIEN VACATION HOME',
    title: 'SUITES DE LUJO TOTALMENTE EQUIPADAS PARA HASTA 4 PERSONAS CADA UNA',
    lead: (
      <>
        Bienvenido a <strong>Vien Vacation Home</strong>. Ofrecemos dos residencias
        exclusivas y totalmente equipadas—<strong>Suite 421</strong> y{' '}
        <strong>Suite 311</strong>—diseñadas para familias, parejas y viajeros que
        buscan amplitud, privacidad y confort de primer nivel.
      </>
    ),
    body: (
      <>
        Tanto la <strong>Suite 421</strong> como la <strong>Suite 311</strong> tienen
        capacidad para <strong>4 personas</strong> cada una, contando con{' '}
        <strong>dos cómodas camas Queen</strong>, cocina completa equipada, sala y
        comedor, Wi-Fi de alta velocidad y disponibilidad en tiempo real sincronizada
        con <strong>Airbnb</strong> y <strong>Booking.com</strong>.
      </>
    ),
    stat1Label: '2 SUITES FULL EQUIPADAS',
    stat2Num: '2 QUEEN',
    stat2Label: 'CAMAS POR SUITE (4 PERSONAS)',
    stat3Num: 'SYNC EN VIVO',
    stat3Label: 'CALENDARIO AIRBNB Y BOOKING',
    cta: 'VER SUITES 421 Y 311',
    floatingTag: 'SUITES 421 Y 311',
    floatingDesc: '4 Personas · 2 Camas Queen · Full Equipada · Reserva Directa.',
  },
};

export const AboutSection: React.FC<AboutSectionProps> = ({ lang, onExploreSuites }) => {
  const copy = ABOUT_COPY[lang];

  return (
    <section className="about-section" aria-labelledby="about-heading">
      <div className="about-grid">
        {/* Left Editorial Story Column */}
        <div className="about-story-col">
          <div className="about-eyebrow-row">
            <span className="about-index">01 /</span>
            <span className="about-eyebrow">{copy.eyebrow}</span>
          </div>

          <h2 id="about-heading" className="about-title">
            {copy.title}
          </h2>

          <p className="about-lead">{copy.lead}</p>

          <p className="about-body">{copy.body}</p>

          <div className="about-stats" role="list" aria-label="Vien Vacation Home Highlights">
            <div className="about-stat-item" role="listitem">
              <span className="stat-number">421 &amp; 311</span>
              <span className="stat-label">{copy.stat1Label}</span>
            </div>
            <div className="about-stat-item" role="listitem">
              <span className="stat-number">{copy.stat2Num}</span>
              <span className="stat-label">{copy.stat2Label}</span>
            </div>
            <div className="about-stat-item" role="listitem">
              <span className="stat-number">{copy.stat3Num}</span>
              <span className="stat-label">{copy.stat3Label}</span>
            </div>
          </div>

          <div className="about-cta-row">
            <button
              type="button"
              className="suites-book-btn about-explore-btn"
              onClick={onExploreSuites}
            >
              <span>{copy.cta}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right Architectural Visual Composition */}
        <div className="about-visual-col">
          <div className="about-arch-frame">
            <img
              src={HERO_SLIDES[1].image}
              alt={HERO_SLIDES[1].thumbnailAlt[lang]}
              className="about-main-img"
              loading="lazy"
              decoding="async"
              width="720"
              height="900"
            />
            <div className="about-img-vignette" aria-hidden="true" />
          </div>

          <div className="about-floating-card">
            <img
              src={HERO_SLIDES[0].image}
              alt={HERO_SLIDES[0].thumbnailAlt[lang]}
              className="about-floating-img"
              loading="lazy"
              decoding="async"
              width="320"
              height="200"
            />
            <div className="about-floating-caption">
              <span className="floating-tag">{copy.floatingTag}</span>
              <p>{copy.floatingDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
