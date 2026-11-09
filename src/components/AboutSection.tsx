import React, { memo } from 'react';
import { HERO_SLIDES, Language } from '../data/heroSlides';

interface AboutSectionProps {
  lang: Language;
  onExploreSuites: () => void;
}

const ABOUT_COPY = {
  en: {
    eyebrow: 'MAKANA RESORT · TONSUPA — BEACHFRONT LUXURY',
    title: 'FULL EQUIPPED OCEAN-VIEW SUITES IN ONE OF THE BEST RESORTS IN TONSUPA',
    lead: (
      <>
        Welcome to <strong>Vien Vacation Home</strong> at <strong>Makana Resort — Tonsupa</strong>.
        Located right on the beachfront, we offer two exclusive, fully equipped ocean-view
        residences: <strong>Departamento 612</strong> (2 beds of 2 plazas, armchair &amp; dining
        table, living-dining area) and <strong>Suite 311</strong> (3rd floor · 49 m², 2 beds of
        2 plazas + sofa bed).
      </>
    ),
    body: (
      <>
        Both units feature an <strong>equipped kitchen</strong>, <strong>air conditioning</strong>,{' '}
        <strong>Wi-Fi</strong>, <strong>modern bathroom</strong>, and <strong>ocean-view balcony</strong>.
        Guests enjoy full access to <strong>Makana Resort</strong> facilities: beachfront access,
        swimming pool complex, jacuzzi, gym, restaurant, and <strong>24/7 security</strong>.
      </>
    ),
    stat1Label: 'FULL EQUIPPED · OCEAN VIEW',
    stat2Num: '2 BEDS',
    stat2Label: '2 PLAZAS + LIVING & KITCHEN',
    stat3Num: 'RESORT 24/7',
    stat3Label: 'POOLS · JACUZZI · GYM · BEACH',
    cta: 'RESERVE 612 & 311',
    floatingTag: 'DEPTO 612 & SUITE 311',
    floatingDesc: 'Makana Resort Tonsupa · Ocean View · Equipped Kitchen · Pools & Jacuzzi.',
  },
  es: {
    eyebrow: 'MAKANA RESORT · TONSUPA — PRIMERA LÍNEA DE PLAYA',
    title: 'SUITES FULL EQUIPADAS CON VISTA AL MAR EN EL MEJOR RESORT DE TONSUPA',
    lead: (
      <>
        Bienvenido a <strong>Vien Vacation Home</strong> en <strong>Makana Resort — Tonsupa</strong>.
        Ubicados en primera línea de playa, ofrecemos dos unidades exclusivas full equipadas con
        vista al mar: el <strong>Departamento 612</strong> (2 camas de 2 plazas, sillón y mesa
        comedor, área de sala-comedor) y la <strong>Suite 311</strong> (tercer piso · 49 m², 2 camas
        de 2 plazas + sofá cama).
      </>
    ),
    body: (
      <>
        Ambas unidades cuentan con <strong>cocina equipada</strong>,{' '}
        <strong>aire acondicionado</strong>, <strong>Wi-Fi</strong>, <strong>baño moderno</strong> y{' '}
        <strong>balcón con vista al mar</strong>. Disfruta de todas las áreas y servicios de{' '}
        <strong>Makana Resort</strong>: salida directa a la playa, complejo de piscinas, jacuzzi,
        gimnasio, restaurante y <strong>seguridad 24/7</strong>.
      </>
    ),
    stat1Label: 'FULL EQUIPADAS · VISTA AL MAR',
    stat2Num: '2 CAMAS',
    stat2Label: 'DE 2 PLAZAS + COCINA Y SALA',
    stat3Num: 'RESORT 24/7',
    stat3Label: 'PISCINAS · JACUZZI · GYM · PLAYA',
    cta: 'RESERVAR 612 Y 311',
    floatingTag: 'DEPTO 612 Y SUITE 311',
    floatingDesc: 'Makana Resort Tonsupa · Vista al Mar · Cocina Equipada · Piscinas y Jacuzzi.',
  },
};

export const AboutSection: React.FC<AboutSectionProps> = memo(({ lang, onExploreSuites }) => {
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

          <ul className="about-stats" role="list" aria-label="Vien Vacation Home Highlights">
            <li className="about-stat-item">
              <span className="stat-number">612 &amp; 311</span>
              <span className="stat-label">{copy.stat1Label}</span>
            </li>
            <li className="about-stat-item">
              <span className="stat-number">{copy.stat2Num}</span>
              <span className="stat-label">{copy.stat2Label}</span>
            </li>
            <li className="about-stat-item">
              <span className="stat-number">{copy.stat3Num}</span>
              <span className="stat-label">{copy.stat3Label}</span>
            </li>
          </ul>

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
              src={HERO_SLIDES[2].image}
              alt={HERO_SLIDES[2].thumbnailAlt[lang]}
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
              src={HERO_SLIDES[1].image}
              alt={HERO_SLIDES[1].thumbnailAlt[lang]}
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
});
AboutSection.displayName = 'AboutSection';
