import React, { memo } from 'react';
import {
  DynamicUnitMetadata,
  HERO_SLIDES,
  Language,
  translateSuiteTextToEn,
  translateSuiteTextToEs,
} from '../data/heroSlides';

interface AboutSectionProps {
  lang: Language;
  onExploreSuites: () => void;
  variant?: 'home' | 'suites';
  units?: DynamicUnitMetadata[] | null;
}

const HOME_ABOUT_COPY = {
  en: {
    eyebrow: 'WHO WE ARE · VIEN VACATION HOME',
    title: 'BEACHFRONT HOSPITALITY DESIGNED TO FEEL LIKE HOME',
    lead: (
      <>
        At <strong>Vien Vacation Home</strong>, we curate and manage exclusive vacation residences at{' '}
        <strong>Makana Resort — Tonsupa</strong>, blending the privacy and warmth of a fully
        equipped home with the amenities of a luxury beachfront resort.
      </>
    ),
    body: (
      <>
        Our mission is to make every stay with family, partners, or friends effortless from day
        one: <strong>direct personalized attention</strong>, <strong>transparent rates</strong> with
        no hidden fees, <strong>real-time synced availability</strong>, and thoughtfully maintained
        ocean-view spaces on the Pacific coast.
      </>
    ),
    stat1Num: '100%',
    stat1Label: 'DIRECT CARE & VERIFIED HOST',
    stat2Num: '★ 5.0',
    stat2Label: 'GUEST REVIEW RATING',
    stat3Num: 'BEACHFRONT',
    stat3Label: 'MAKANA RESORT · TONSUPA',
    cta: 'EXPLORE OUR SUITES',
    floatingTag: 'VIEN VACATION HOME · TONSUPA',
    floatingDesc: 'Memorable oceanfront stays with home comfort and full resort amenities.',
    mainImage: '/images/facility-pool-terrace.webp',
    mainAlt: 'Makana Resort Tonsupa — Oceanfront swimming pool complex and sun terrace',
    floatingImage: '/images/hero-sunset-makana.webp',
    floatingAlt: 'Makana Resort Tonsupa — Ocean sunset view',
  },
  es: {
    eyebrow: 'QUIÉNES SOMOS · VIEN VACATION HOME',
    title: 'HOSPITALIDAD FRENTE AL MAR PENSADA PARA SENTIRSE COMO EN CASA',
    lead: (
      <>
        En <strong>Vien Vacation Home</strong> seleccionamos y gestionamos residencias vacacionales
        exclusivas en <strong>Makana Resort — Tonsupa</strong>, combinando la privacidad y calidez
        de un hogar totalmente equipado con las amenidades de un resort de lujo en primera línea de
        playa.
      </>
    ),
    body: (
      <>
        Nuestra misión es que cada estadía en familia, pareja o con amigos sea impecable desde el
        primer momento: <strong>atención directa y personalizada</strong>,{' '}
        <strong>tarifas transparentes</strong> sin comisiones ocultas,{' '}
        <strong>disponibilidad sincronizada en tiempo real</strong> y espacios cuidados en cada
        detalle frente al océano Pacífico.
      </>
    ),
    stat1Num: '100%',
    stat1Label: 'ATENCIÓN DIRECTA Y ANFITRIÓN VERIFICADO',
    stat2Num: '★ 5.0',
    stat2Label: 'CALIFICACIÓN EN RESEÑAS DE HUÉSPEDES',
    stat3Num: '1ª LÍNEA',
    stat3Label: 'MAKANA RESORT · TONSUPA',
    cta: 'EXPLORAR NUESTRAS SUITES',
    floatingTag: 'VIEN VACATION HOME · TONSUPA',
    floatingDesc: 'Estadías memorables frente al mar con confort de hogar y servicio de resort.',
    mainImage: '/images/facility-pool-terrace.webp',
    mainAlt: 'Makana Resort Tonsupa — Complejo de piscinas frente al mar y solárium',
    floatingImage: '/images/hero-sunset-makana.webp',
    floatingAlt: 'Makana Resort Tonsupa — Atardecer en primera línea de playa',
  },
};

const SUITES_ABOUT_COPY = {
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
    stat1Num: '612 & 311',
    stat1Label: 'FULL EQUIPPED · OCEAN VIEW',
    stat2Num: '2 BEDS',
    stat2Label: '2 PLAZAS + LIVING & KITCHEN',
    stat3Num: 'RESORT 24/7',
    stat3Label: 'POOLS · JACUZZI · GYM · BEACH',
    cta: 'RESERVE 612 & 311',
    floatingTag: 'DEPTO 612 & SUITE 311',
    floatingDesc: 'Makana Resort Tonsupa · Ocean View · Equipped Kitchen · Pools & Jacuzzi.',
    mainImage: HERO_SLIDES[2].image,
    mainAlt: HERO_SLIDES[2].thumbnailAlt.en,
    floatingImage: HERO_SLIDES[1].image,
    floatingAlt: HERO_SLIDES[1].thumbnailAlt.en,
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
    stat1Num: '612 & 311',
    stat1Label: 'FULL EQUIPADAS · VISTA AL MAR',
    stat2Num: '2 CAMAS',
    stat2Label: 'DE 2 PLAZAS + COCINA Y SALA',
    stat3Num: 'RESORT 24/7',
    stat3Label: 'PISCINAS · JACUZZI · GYM · PLAYA',
    cta: 'RESERVAR 612 Y 311',
    floatingTag: 'DEPTO 612 Y SUITE 311',
    floatingDesc: 'Makana Resort Tonsupa · Vista al Mar · Cocina Equipada · Piscinas y Jacuzzi.',
    mainImage: HERO_SLIDES[2].image,
    mainAlt: HERO_SLIDES[2].thumbnailAlt.es,
    floatingImage: HERO_SLIDES[1].image,
    floatingAlt: HERO_SLIDES[1].thumbnailAlt.es,
  },
};

export const AboutSection: React.FC<AboutSectionProps> = memo(
  ({ lang, onExploreSuites, variant = 'suites', units }) => {
    const baseCopy = variant === 'home' ? HOME_ABOUT_COPY[lang] : SUITES_ABOUT_COPY[lang];
    const headingId = variant === 'home' ? 'home-about-heading' : 'about-heading';

    const hasCustomUnits = variant === 'suites' && Array.isArray(units) && units.length > 0;
    const unitNumbers = hasCustomUnits
      ? units.map((u) => u.unitNumber || u.id.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())
      : [];
    const joinedNumsEn = unitNumbers.join(' & ');
    const joinedNumsEs = unitNumbers.join(' Y ');

    const dynamicSuitesLead = hasCustomUnits ? (
      lang === 'en' ? (
        <>
          Welcome to <strong>Vien Vacation Home</strong> at <strong>Makana Resort — Tonsupa</strong>.
          Located right on the beachfront, we offer {units.length} exclusive, fully equipped
          ocean-view residences:{' '}
          {units.map((u, idx) => {
            const titleEn = translateSuiteTextToEn(u.name.split('—')[0].trim());
            const bedsEn = translateSuiteTextToEn(u.bedsLabel || 'Full Equipped');
            return (
              <React.Fragment key={u.id}>
                {idx > 0 ? (idx === units.length - 1 ? ' and ' : ', ') : ''}
                <strong>{titleEn}</strong> ({bedsEn})
              </React.Fragment>
            );
          })}
          .
        </>
      ) : (
        <>
          Bienvenido a <strong>Vien Vacation Home</strong> en <strong>Makana Resort — Tonsupa</strong>.
          Ubicados en primera línea de playa, ofrecemos {units.length} unidades exclusivas full
          equipadas con vista al mar:{' '}
          {units.map((u, idx) => {
            const titleEs = translateSuiteTextToEs(u.name.split('—')[0].trim());
            const bedsEs = translateSuiteTextToEs(u.bedsLabel || 'Full Equipada');
            return (
              <React.Fragment key={u.id}>
                {idx > 0 ? (idx === units.length - 1 ? ' y ' : ', ') : ''}
                <strong>{titleEs}</strong> ({bedsEs})
              </React.Fragment>
            );
          })}
          .
        </>
      )
    ) : (
      baseCopy.lead
    );

    const copy = hasCustomUnits
      ? {
          ...baseCopy,
          lead: dynamicSuitesLead,
          stat1Num: lang === 'en' ? joinedNumsEn : joinedNumsEs,
          cta: lang === 'en' ? `RESERVE ${joinedNumsEn}` : `RESERVAR ${joinedNumsEs}`,
          floatingTag:
            lang === 'en' ? `SUITES ${joinedNumsEn}` : `SUITES ${joinedNumsEs}`,
        }
      : baseCopy;

    return (
      <section className="about-section" aria-labelledby={headingId}>
        <div className="about-grid">
          {/* Left Editorial Story Column */}
          <div className="about-story-col">
            <div className="about-eyebrow-row">
              <span className="about-index">01 /</span>
              <span className="about-eyebrow">{copy.eyebrow}</span>
            </div>

            <h2 id={headingId} className="about-title">
              {copy.title}
            </h2>

            <p className="about-lead">{copy.lead}</p>

            <p className="about-body">{copy.body}</p>

            <ul className="about-stats" role="list" aria-label="Vien Vacation Home Highlights">
              <li className="about-stat-item">
                <span className="stat-number">{copy.stat1Num}</span>
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
                src={copy.mainImage}
                alt={copy.mainAlt}
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
                src={copy.floatingImage}
                alt={copy.floatingAlt}
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
  }
);
AboutSection.displayName = 'AboutSection';
