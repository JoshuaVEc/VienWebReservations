export type Language = 'en' | 'es';

export type NavSection = 'HOME' | 'SUITES' | 'GALLERY' | 'REVIEWS';

export const NAV_ITEMS: NavSection[] = ['HOME', 'SUITES', 'GALLERY', 'REVIEWS'];

export const NAV_LABELS: Record<Language, Record<NavSection, string>> = {
  en: {
    HOME: 'HOME',
    SUITES: 'MAKANA BEACH SUITES',
    GALLERY: 'GALLERY',
    REVIEWS: 'REVIEWS',
  },
  es: {
    HOME: 'INICIO',
    SUITES: 'SUITES EN LA PLAYA MAKANA',
    GALLERY: 'GALERÍA',
    REVIEWS: 'RESEÑAS',
  },
};

export const PAGE_TITLES: Record<Language, Record<NavSection, string>> = {
  en: {
    HOME: 'Vien Vacation Home — Exclusive Vacation Residences',
    SUITES: 'Makana Beach Suites 612 & 311 — Tonsupa | Vien Vacation Home',
    GALLERY: 'Suites & Resort Facilities Gallery | Vien Vacation Home',
    REVIEWS: 'Guest Reviews & Reflections | Vien Vacation Home',
  },
  es: {
    HOME: 'Vien Vacation Home — Residencias Vacacionales Exclusivas',
    SUITES: 'Suites en la Playa Makana 612 y 311 — Tonsupa | Vien Vacation Home',
    GALLERY: 'Galería de Suites e Instalaciones | Vien Vacation Home',
    REVIEWS: 'Reseñas y Experiencias de Huéspedes | Vien Vacation Home',
  },
};

export const UI_TEXT = {
  en: {
    contactUs: 'CONTACT US',
    introTopRight: 'MAKANA RESORT · TONSUPA — 612 & 311',
    introSubtitle: 'BEACHFRONT RESORT · FULL EQUIPPED SUITES',
    introStatus: 'SYNCING LIVE SUITE AVAILABILITY',
    bookYourStay: 'BOOK YOUR STAY',
    scrollDown: 'SCROLL DOWN',
    fullEquippedTag: 'Full Equipped · Ocean View',
    galleryEyebrow: '03 / MAKANA RESORT · TONSUPA — DEPTO 612 & SUITE 311',
    galleryHeading: 'SUITES & RESORT FACILITIES',
    filterAll: 'ALL VIEWS',
    filterArch: 'SUITES 612 & 311',
    filterOasis: 'RESORT FACILITIES',
    reviewsEyebrow: 'GUEST CHRONICLES & ACCLAIM',
    reserveExperience: 'RESERVE THIS EXPERIENCE',
    prevAria: 'Previous Sanctuary View',
    nextAria: 'Next Sanctuary View',
  },
  es: {
    contactUs: 'CONTÁCTANOS',
    introTopRight: 'MAKANA RESORT · TONSUPA — 612 Y 311',
    introSubtitle: 'PRIMERA LÍNEA DE PLAYA · FULL EQUIPADAS',
    introStatus: 'SINCRONIZANDO DISPONIBILIDAD EN VIVO',
    bookYourStay: 'RESERVA TU ESTADÍA',
    scrollDown: 'DESLIZA HACIA ABAJO',
    fullEquippedTag: 'Full Equipada · Vista al Mar',
    galleryEyebrow: '03 / MAKANA RESORT · TONSUPA — DEPTO 612 Y SUITE 311',
    galleryHeading: 'GALERÍA DE SUITES E INSTALACIONES',
    filterAll: 'TODAS LAS VISTAS',
    filterArch: 'SUITES 612 Y 311',
    filterOasis: 'INSTALACIONES DEL RESORT',
    reviewsEyebrow: 'RESEÑAS Y EXPERIENCIAS DE HUÉSPEDES',
    reserveExperience: 'RESERVAR ESTA EXPERIENCIA',
    prevAria: 'Vista anterior',
    nextAria: 'Siguiente vista',
  },
} as const;

export interface HeroSlide {
  id: string;
  unitNumber: string;
  indexLabel: string;
  titleLine1: Record<Language, string>;
  titleLine2: Record<Language, string>;
  subtitle: Record<Language, string>;
  image: string;
  thumbnailAlt: Record<Language, string>;
  suiteName: Record<Language, string>;
  capacityLabel: Record<Language, string>;
  bedsLabel: Record<Language, string>;
  maxGuests: number;
  nightlyRate: Record<Language, string>;
  icalSyncReady: boolean;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'vien-residence-experience',
    unitNumber: '612 & 311',
    indexLabel: '01/',
    titleLine1: {
      en: 'MAKANA RESORT',
      es: 'MAKANA RESORT',
    },
    titleLine2: {
      en: 'TONSUPA · OCEAN VIEW',
      es: 'TONSUPA · VISTA AL MAR',
    },
    subtitle: {
      en: 'Beachfront resort in Tonsupa featuring swimming pools, jacuzzi, gym, restaurant, and 24/7 security. Book Departamento 612 or Suite 311 individually or together.',
      es: 'Ubicado en primera línea de playa en Tonsupa con complejo de piscinas, jacuzzi, gimnasio, restaurante y seguridad 24/7. Reserva el Departamento 612 o la Suite 311.',
    },
    image: '/images/hero-sunset-makana.webp',
    thumbnailAlt: {
      en: 'Makana Resort Tonsupa — Ocean sunset and beachfront sanctuary view',
      es: 'Makana Resort Tonsupa — Atardecer en primera línea de playa con vista al mar',
    },
    suiteName: {
      en: 'Dual Booking — Departamento 612 + Suite 311 (Makana Resort · Tonsupa)',
      es: 'Reserva Doble — Departamento 612 + Suite 311 (Makana Resort · Tonsupa)',
    },
    capacityLabel: {
      en: 'Up to 8 Guests · Makana Resort',
      es: 'Hasta 8 Huéspedes · Makana Resort',
    },
    bedsLabel: {
      en: 'Depto 612 & Suite 311',
      es: 'Depto 612 y Suite 311',
    },
    maxGuests: 8,
    nightlyRate: {
      en: 'Makana Resort Tonsupa · Direct Availability',
      es: 'Makana Resort Tonsupa · Disponibilidad Directa',
    },
    icalSyncReady: true,
  },
  {
    id: 'depto-612',
    unitNumber: '612',
    indexLabel: '02/',
    titleLine1: {
      en: 'DEPARTAMENTO 612',
      es: 'DEPARTAMENTO 612',
    },
    titleLine2: {
      en: 'FULL EQUIPPED · OCEAN VIEW',
      es: 'FULL EQUIPADO · VISTA AL MAR',
    },
    subtitle: {
      en: 'Located at Makana Resort — Tonsupa. Features 2 Full/Queen beds (2 plazas), armchair & dining table, equipped kitchen, A/C, Wi-Fi, modern bathroom, living-dining area, and ocean-view balcony.',
      es: 'Ubicado en Makana Resort — Tonsupa. Cuenta con 2 camas de 2 plazas, sillón y mesa comedor, cocina equipada, aire acondicionado, Wi-Fi, baño moderno, área de sala-comedor y balcón con vista al mar.',
    },
    image: '/images/apt-612/apt612-4.jpg',
    thumbnailAlt: {
      en: 'Makana Resort Tonsupa — Departamento 612 bedroom with 2 beds and full equipment',
      es: 'Makana Resort Tonsupa — Departamento 612 con 2 camas de 2 plazas y equipamiento completo',
    },
    suiteName: {
      en: 'Departamento 612 — Full Equipped | Ocean View (Makana Resort)',
      es: 'Departamento 612 — Full Equipado | Vista al Mar (Makana Resort)',
    },
    capacityLabel: {
      en: 'Makana Resort · Tonsupa',
      es: 'Makana Resort · Tonsupa',
    },
    bedsLabel: {
      en: '2 Beds (2 Plazas) · Living & Dining Area',
      es: '2 Camas de 2 Plazas · Sillón y Mesa Comedor',
    },
    maxGuests: 4,
    nightlyRate: {
      en: 'Direct Rate · Syncs with Airbnb & Booking.com',
      es: 'Tarifa Directa · Sincronizada con Airbnb y Booking.com',
    },
    icalSyncReady: true,
  },
  {
    id: 'suite-311',
    unitNumber: '311',
    indexLabel: '03/',
    titleLine1: {
      en: 'SUITE 311',
      es: 'SUITE 311',
    },
    titleLine2: {
      en: '3RD FLOOR · 49 M² · OCEAN VIEW',
      es: 'TERCER PISO · 49 M² · VISTA AL MAR',
    },
    subtitle: {
      en: 'Located on the 3rd floor (49 m²) at Makana Resort — Tonsupa. Full equipped with 2 beds (2 plazas), sofa bed, equipped kitchen, A/C, Wi-Fi, modern bathroom, and ocean-view balcony.',
      es: 'Ubicada en el tercer piso (49 m²) en Makana Resort — Tonsupa. Full equipada con 2 camas de 2 plazas, sofá cama, cocina equipada, aire acondicionado, Wi-Fi, baño moderno y balcón con vista al mar.',
    },
    image: '/images/suite-311/img-05.jpg',
    thumbnailAlt: {
      en: 'Makana Resort Tonsupa — Suite 311 3rd floor 49m2 with 2 beds and sofa bed',
      es: 'Makana Resort Tonsupa — Suite 311 tercer piso 49m² con 2 camas de 2 plazas y sofá cama',
    },
    suiteName: {
      en: 'Suite 311 — 3rd Floor | 49 m² | Ocean View (Makana Resort)',
      es: 'Suite 311 — Tercer Piso | 49 m² | Vista al Mar (Makana Resort)',
    },
    capacityLabel: {
      en: '3rd Floor · 49 m² · Makana Resort',
      es: 'Tercer Piso · 49 m² · Makana Resort',
    },
    bedsLabel: {
      en: '2 Beds (2 Plazas) + Sofa Bed',
      es: '2 Camas de 2 Plazas + Sofá Cama',
    },
    maxGuests: 4,
    nightlyRate: {
      en: 'Direct Rate · Syncs with Airbnb & Booking.com',
      es: 'Tarifa Directa · Sincronizada con Airbnb y Booking.com',
    },
    icalSyncReady: true,
  },
];

export interface GalleryItem {
  id: string;
  code: Record<Language, string>;
  title: Record<Language, string>;
  location: Record<Language, string>;
  aspect: 'tall' | 'wide' | 'arch';
  image: string;
  objectPosition?: string;
  caption: Record<Language, string>;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    code: { en: '01 / DEPTO 612', es: '01 / DEPTO 612' },
    title: {
      en: 'DEPARTAMENTO 612 — FULL EQUIPPED & OCEAN VIEW',
      es: 'DEPARTAMENTO 612 — FULL EQUIPADO · VISTA AL MAR',
    },
    location: {
      en: '2 BEDS (2 PLAZAS) · LIVING-DINING',
      es: '2 CAMAS DE 2 PLAZAS · SALA-COMEDOR',
    },
    aspect: 'arch',
    image: '/images/apt-612/apt612-2.jpg',
    caption: {
      en: '2 beds (2 plazas), armchair & dining table, equipped kitchen, A/C, Wi-Fi, modern bathroom, and ocean-view balcony.',
      es: '2 camas de 2 plazas, sillón y mesa comedor, cocina equipada, A/C, Wi-Fi, baño moderno y balcón con vista al mar.',
    },
  },
  {
    id: 'gal-2',
    code: { en: '02 / FACILITIES', es: '02 / INSTALACIONES' },
    title: {
      en: 'MAKANA RESORT — POOLS & JACUZZI',
      es: 'MAKANA RESORT — COMPLEJO DE PISCINAS Y JACUZZI',
    },
    location: {
      en: 'TONSUPA BEACHFRONT',
      es: 'PRIMERA LÍNEA DE PLAYA · TONSUPA',
    },
    aspect: 'wide',
    image: '/images/facility-pool-terrace.webp',
    objectPosition: 'center 60%',
    caption: {
      en: 'Oceanfront swimming pool complex, jacuzzi, and sun terrace at Makana Resort — Tonsupa.',
      es: 'Complejo de piscinas frente al mar, jacuzzi y solárium en Makana Resort — Tonsupa.',
    },
  },
  {
    id: 'gal-3',
    code: { en: '03 / SUITE 311', es: '03 / SUITE 311' },
    title: {
      en: 'SUITE 311 — 3RD FLOOR · 49 M² · OCEAN VIEW',
      es: 'SUITE 311 — TERCER PISO · 49 M² · VISTA AL MAR',
    },
    location: {
      en: '2 BEDS (2 PLAZAS) + SOFA BED',
      es: '2 CAMAS DE 2 PLAZAS + SOFÁ CAMA',
    },
    aspect: 'tall',
    image: '/images/suite-311/img-02.jpg',
    caption: {
      en: 'Full equipped 49 m² suite on the 3rd floor: 2 beds (2 plazas), sofa bed, equipped kitchen, A/C, Wi-Fi, modern bath, and ocean-view balcony.',
      es: 'Suite de 49 m² en tercer piso: 2 camas de 2 plazas, sofá cama, cocina equipada, A/C, Wi-Fi, baño moderno y balcón con vista al mar.',
    },
  },
  {
    id: 'gal-4',
    code: { en: '04 / FACILITIES', es: '04 / INSTALACIONES' },
    title: {
      en: 'RESORT POOL COMPLEX & RESTAURANT',
      es: 'PISCINAS, RESTAURANTE Y GIMNASIO',
    },
    location: {
      en: 'MAKANA RESORT · TONSUPA',
      es: 'MAKANA RESORT · TONSUPA',
    },
    aspect: 'wide',
    image: '/images/facility-pool-aerial.webp',
    objectPosition: 'center 45%',
    caption: {
      en: 'Exclusive resort facilities: swimming pools, jacuzzi, gym, restaurant, and 24/7 security.',
      es: 'Instalaciones exclusivas: complejo de piscinas, jacuzzi, gimnasio, restaurante y seguridad 24/7.',
    },
  },
  {
    id: 'gal-5',
    code: { en: '05 / FACILITIES', es: '05 / INSTALACIONES' },
    title: {
      en: 'BEACHFRONT LOCATION — TONSUPA',
      es: 'UBICADO EN PRIMERA LÍNEA DE PLAYA',
    },
    location: {
      en: 'TONSUPA BEACH',
      es: 'PLAYA DE TONSUPA',
    },
    aspect: 'tall',
    image: '/images/facility-beach-view.webp',
    caption: {
      en: 'Direct beachfront access on the Tonsupa coast with panoramic Pacific Ocean views.',
      es: 'Salida directa a la playa de Tonsupa con vistas panorámicas al océano desde tu balcón.',
    },
  },
  {
    id: 'gal-6',
    code: { en: '06 / FACILITIES', es: '06 / INSTALACIONES' },
    title: {
      en: 'GARDENS, GYM & 24/7 SECURITY',
      es: 'JARDINES, GIMNASIO Y SEGURIDAD 24/7',
    },
    location: {
      en: 'MAKANA RESORT · TONSUPA',
      es: 'MAKANA RESORT · TONSUPA',
    },
    aspect: 'arch',
    image: '/images/facility-gardens.webp',
    objectPosition: 'center 40%',
    caption: {
      en: 'Located in one of the best resorts in Tonsupa with 24/7 security, gym, and restaurant.',
      es: 'Ubicado en uno de los mejores resorts de Tonsupa con seguridad 24/7, gimnasio y restaurante.',
    },
  },
];

export interface ReviewItem {
  id: string;
  indexLabel: string;
  quote: Record<Language, string>;
  guestName: string;
  guestTitle: Record<Language, string>;
  staySuite: Record<Language, string>;
  stayDate: Record<Language, string>;
  rating: string;
  slideIndex: number;
}

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: 'rev-1',
    indexLabel: '01 / 03',
    quote: {
      en: '“Departamento 612 at Makana Resort — Tonsupa was spotless and truly full equipped. Having two comfortable 2-plaza beds, a living-dining area, equipped kitchen, and ocean-view balcony made our family stay effortless.”',
      es: '“El Departamento 612 en Makana Resort — Tonsupa estaba impecable y verdaderamente full equipado. Tener 2 camas de 2 plazas, área de sala-comedor, cocina equipada y balcón con vista al mar hizo nuestra estadía perfecta.”',
    },
    guestName: 'CARLOS & ELENA MENDOZA',
    guestTitle: {
      en: 'VERIFIED AIRBNB GUESTS — QUITO',
      es: 'HUÉSPEDES VERIFICADOS DE AIRBNB — QUITO',
    },
    staySuite: {
      en: 'Departamento 612 · Full Equipped | Ocean View',
      es: 'Departamento 612 · Full Equipado | Vista al Mar',
    },
    stayDate: {
      en: 'OCTOBER 2026',
      es: 'OCTUBRE 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 1,
  },
  {
    id: 'rev-2',
    indexLabel: '02 / 03',
    quote: {
      en: '“We booked Suite 311 (3rd floor, 49 m²) directly and loved every detail. Two 2-plaza beds, sofa bed, fast Wi-Fi, A/C, equipped kitchen, and the balcony overlooking the beach at Makana Resort.”',
      es: '“Reservamos la Suite 311 (tercer piso, 49 m²) directamente y nos encantó cada detalle. Dos camas de 2 plazas, sofá cama, Wi-Fi rápido, aire acondicionado, cocina equipada y balcón con vista al mar en Makana Resort.”',
    },
    guestName: 'SOPHIE LAURENT',
    guestTitle: {
      en: 'VERIFIED BOOKING.COM GUEST — GUAYAQUIL',
      es: 'HUÉSPED VERIFICADA DE BOOKING.COM — GUAYAQUIL',
    },
    staySuite: {
      en: 'Suite 311 · 3rd Floor | 49 m² | Ocean View',
      es: 'Suite 311 · Tercer Piso | 49 m² | Vista al Mar',
    },
    stayDate: {
      en: 'SEPTEMBER 2026',
      es: 'SEPTIEMBRE 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 2,
  },
  {
    id: 'rev-3',
    indexLabel: '03 / 03',
    quote: {
      en: '“Makana Resort is the best beachfront resort in Tonsupa. Between the swimming pools, jacuzzi, gym, restaurant, and 24/7 security, reserving both Departamento 612 and Suite 311 was a 10/10 experience.”',
      es: '“Makana Resort es el mejor resort en primera línea de playa de Tonsupa. Entre el complejo de piscinas, jacuzzi, gimnasio, restaurante y seguridad 24/7, reservar el Departamento 612 y la Suite 311 fue un 10/10.”',
    },
    guestName: 'DANIEL & FRIENDS',
    guestTitle: {
      en: 'DIRECT RESERVATION — CUENCA',
      es: 'RESERVA DIRECTA — CUENCA',
    },
    staySuite: {
      en: 'Makana Resort Tonsupa · Depto 612 + Suite 311',
      es: 'Makana Resort Tonsupa · Depto 612 + Suite 311',
    },
    stayDate: {
      en: 'AUGUST 2026',
      es: 'AGOSTO 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 0,
  },
];
