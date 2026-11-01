export type Language = 'en' | 'es';

export type NavSection = 'HOME' | 'SUITES' | 'GALLERY' | 'REVIEWS';

export const NAV_ITEMS: NavSection[] = ['HOME', 'SUITES', 'GALLERY', 'REVIEWS'];

export const NAV_LABELS: Record<Language, Record<NavSection, string>> = {
  en: {
    HOME: 'HOME',
    SUITES: 'SUITES',
    GALLERY: 'GALLERY',
    REVIEWS: 'REVIEWS',
  },
  es: {
    HOME: 'INICIO',
    SUITES: 'SUITES',
    GALLERY: 'GALERÍA',
    REVIEWS: 'RESEÑAS',
  },
};

export const UI_TEXT = {
  en: {
    contactUs: 'CONTACT US',
    introTopRight: 'SUITES 421 & 311 · DIRECT BOOKING',
    introSubtitle: 'VACATION HOME · FULL EQUIPPED SUITES',
    introStatus: 'SYNCING LIVE SUITE AVAILABILITY',
    bookYourStay: 'BOOK YOUR STAY',
    scrollDown: 'SCROLL DOWN',
    fullEquippedTag: 'Full Equipped',
    galleryEyebrow: '03 / VIEN VACATION HOME — SUITES 421 & 311',
    galleryHeading: 'RESIDENCE & SUITES GALLERY',
    filterAll: 'ALL VIEWS',
    filterArch: 'SUITES & ARCHES',
    filterOasis: 'POOL & EXTERIOR',
    reviewsEyebrow: 'GUEST CHRONICLES & ACCLAIM',
    reserveExperience: 'RESERVE THIS EXPERIENCE',
    prevAria: 'Previous Sanctuary View',
    nextAria: 'Next Sanctuary View',
  },
  es: {
    contactUs: 'CONTÁCTANOS',
    introTopRight: 'SUITES 421 Y 311 · RESERVA DIRECTA',
    introSubtitle: 'CASA VACACIONAL · SUITES FULL EQUIPADAS',
    introStatus: 'SINCRONIZANDO DISPONIBILIDAD EN VIVO',
    bookYourStay: 'RESERVA TU ESTADÍA',
    scrollDown: 'DESLIZA HACIA ABAJO',
    fullEquippedTag: 'Full Equipada',
    galleryEyebrow: '03 / VIEN VACATION HOME — SUITES 421 Y 311',
    galleryHeading: 'GALERÍA DE SUITES Y RESIDENCIA',
    filterAll: 'TODAS LAS VISTAS',
    filterArch: 'SUITES Y ARCOS',
    filterOasis: 'PISCINA Y EXTERIOR',
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
  amenitiesLabel: Record<Language, string>;
  maxGuests: number;
  nightlyRate: Record<Language, string>;
  icalSyncReady: boolean;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'suite-421',
    unitNumber: '421',
    indexLabel: '01/',
    titleLine1: {
      en: 'SUITE 421',
      es: 'SUITE 421',
    },
    titleLine2: {
      en: '2 QUEEN · 4 GUESTS',
      es: '2 CAMAS QUEEN · 4 PERSONAS',
    },
    subtitle: {
      en: 'Fully equipped luxury vacation residence featuring two Queen beds, private kitchen, high-speed Wi-Fi, and seamless smart check-in.',
      es: 'Residencia vacacional de lujo totalmente equipada con dos camas Queen, cocina privada, Wi-Fi de alta velocidad y check-in inteligente.',
    },
    image: '/images/hero-sunset-makana.webp',
    thumbnailAlt: {
      en: 'Vien Vacation Home — Suite 421 exterior and pool sanctuary view',
      es: 'Vien Vacation Home — Vista exterior y piscina de la Suite 421',
    },
    suiteName: {
      en: 'Suite 421 — 2 Queen Beds (Up to 4 Guests)',
      es: 'Suite 421 — 2 Camas Queen (Hasta 4 Personas)',
    },
    capacityLabel: {
      en: 'Up to 4 Guests',
      es: 'Hasta 4 Personas',
    },
    bedsLabel: {
      en: '2 Queen Beds',
      es: '2 Camas Queen',
    },
    amenitiesLabel: {
      en: 'Full Equipped Kitchen · Living Area · High-Speed Wi-Fi · A/C',
      es: 'Cocina Full Equipada · Sala · Wi-Fi Alta Velocidad · A/C',
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
    indexLabel: '02/',
    titleLine1: {
      en: 'SUITE 311',
      es: 'SUITE 311',
    },
    titleLine2: {
      en: '2 QUEEN · 4 GUESTS',
      es: '2 CAMAS QUEEN · 4 PERSONAS',
    },
    subtitle: {
      en: 'Fully equipped vacation suite for 4 guests with two plush Queen beds, complete kitchen & dining area, and resort amenities.',
      es: 'Suite vacacional totalmente equipada para 4 personas con dos cómodas camas Queen, cocina completa, comedor y amenidades de lujo.',
    },
    image: '/images/hero-riad.png',
    thumbnailAlt: {
      en: 'Vien Vacation Home — Suite 311 bright interior architecture',
      es: 'Vien Vacation Home — Interior iluminado de la Suite 311',
    },
    suiteName: {
      en: 'Suite 311 — 2 Queen Beds (Up to 4 Guests)',
      es: 'Suite 311 — 2 Camas Queen (Hasta 4 Personas)',
    },
    capacityLabel: {
      en: 'Up to 4 Guests',
      es: 'Hasta 4 Personas',
    },
    bedsLabel: {
      en: '2 Queen Beds',
      es: '2 Camas Queen',
    },
    amenitiesLabel: {
      en: 'Full Equipped Kitchen · Living Area · High-Speed Wi-Fi · A/C',
      es: 'Cocina Full Equipada · Sala · Wi-Fi Alta Velocidad · A/C',
    },
    maxGuests: 4,
    nightlyRate: {
      en: 'Direct Rate · Syncs with Airbnb & Booking.com',
      es: 'Tarifa Directa · Sincronizada con Airbnb y Booking.com',
    },
    icalSyncReady: true,
  },
  {
    id: 'vien-residence-experience',
    unitNumber: '421 & 311',
    indexLabel: '03/',
    titleLine1: {
      en: 'FULL EQUIPPED',
      es: 'SUITES FULL',
    },
    titleLine2: {
      en: 'VACATION HOME',
      es: 'EQUIPADAS',
    },
    subtitle: {
      en: 'Book Suite 421 or Suite 311 individually (4 guests each) or together for groups up to 8 guests with real-time calendar availability.',
      es: 'Reserva la Suite 421 o la Suite 311 individualmente (4 personas c/u) o ambas para grupos de hasta 8 personas con calendario en tiempo real.',
    },
    image: '/images/hero-dining.png',
    thumbnailAlt: {
      en: 'Vien Vacation Home evening ambiance and lounge',
      es: 'Vien Vacation Home ambiente nocturno y terraza',
    },
    suiteName: {
      en: 'Dual Suite Buyout (Suite 421 + Suite 311 · Up to 8 Guests)',
      es: 'Reserva Doble (Suite 421 + Suite 311 · Hasta 8 Personas)',
    },
    capacityLabel: {
      en: 'Up to 8 Guests (Both Suites)',
      es: 'Hasta 8 Personas (Ambas Suites)',
    },
    bedsLabel: {
      en: '4 Queen Beds Total',
      es: '4 Camas Queen en Total',
    },
    amenitiesLabel: {
      en: '2 Full Equipped Suites · Ideal for Families & Groups',
      es: '2 Suites Full Equipadas · Ideal para Familias y Grupos',
    },
    maxGuests: 8,
    nightlyRate: {
      en: 'Combined Group Stay · Direct Availability',
      es: 'Estadía Grupal Combinada · Disponibilidad Directa',
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
    code: { en: '01 / SUITE 421', es: '01 / SUITE 421' },
    title: {
      en: 'SUITE 421 — MASTER & QUEEN LOUNGE',
      es: 'SUITE 421 — SALA Y CAMAS QUEEN',
    },
    location: {
      en: '4 GUESTS · 2 QUEEN BEDS',
      es: '4 PERSONAS · 2 CAMAS QUEEN',
    },
    aspect: 'arch',
    image: '/images/hero-riad.png',
    caption: {
      en: 'Two plush Queen beds, natural daylight, and full apartment equipment.',
      es: 'Dos cómodas camas Queen, luz natural y equipamiento completo.',
    },
  },
  {
    id: 'gal-2',
    code: { en: '02 / GROUNDS', es: '02 / EXTERIORES' },
    title: {
      en: 'VIEN VACATION HOME — POOL & TERRACE',
      es: 'VIEN VACATION HOME — PISCINA Y TERRAZA',
    },
    location: {
      en: 'RESIDENCE EXTERIOR',
      es: 'EXTERIOR DE LA RESIDENCIA',
    },
    aspect: 'wide',
    image: '/images/facility-pool-terrace.webp',
    objectPosition: 'center 60%',
    caption: {
      en: 'Relaxing reflection pool and warm sunset views right outside your suite.',
      es: 'Piscina relajante y cálidas vistas al atardecer frente a tu suite.',
    },
  },
  {
    id: 'gal-3',
    code: { en: '03 / SUITE 311', es: '03 / SUITE 311' },
    title: {
      en: 'SUITE 311 — FULL EQUIPPED LIVING',
      es: 'SUITE 311 — ESTANCIA FULL EQUIPADA',
    },
    location: {
      en: '4 GUESTS · 2 QUEEN BEDS',
      es: '4 PERSONAS · 2 CAMAS QUEEN',
    },
    aspect: 'tall',
    image: '/images/hero-dining.png',
    caption: {
      en: 'Identical comfort to Suite 421: 2 Queen beds, full kitchen, and dining space.',
      es: 'El mismo confort de la Suite 421: 2 camas Queen, cocina equipada y comedor.',
    },
  },
  {
    id: 'gal-4',
    code: { en: '04 / AMENITIES', es: '04 / AMENIDADES' },
    title: {
      en: 'RESORT POOL & SUN DECK',
      es: 'PISCINA Y SOLÁRIUM',
    },
    location: {
      en: 'SHARED SANCTUARY',
      es: 'ÁREA SOCIAL EXCLUSIVA',
    },
    aspect: 'wide',
    image: '/images/facility-pool-aerial.webp',
    objectPosition: 'center 45%',
    caption: {
      en: 'Exclusive access for Suite 421 and Suite 311 guests.',
      es: 'Acceso exclusivo para los huéspedes de las Suites 421 y 311.',
    },
  },
  {
    id: 'gal-5',
    code: { en: '05 / COMFORT', es: '05 / CONFORT' },
    title: {
      en: 'PRIVATE KITCHEN & DINING',
      es: 'COCINA PRIVADA Y COMEDOR',
    },
    location: {
      en: 'SUITES 421 & 311',
      es: 'SUITES 421 Y 311',
    },
    aspect: 'tall',
    image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=85',
    caption: {
      en: 'Fully equipped for short stays or extended family vacations.',
      es: 'Totalmente equipadas para estadías cortas o vacaciones familiares.',
    },
  },
  {
    id: 'gal-6',
    code: { en: '06 / ARCHITECTURE', es: '06 / ARQUITECTURA' },
    title: {
      en: 'QUIET LUXURY DETAILS',
      es: 'DETALLES DE LUJO Y CONFORT',
    },
    location: {
      en: 'VIEN VACATION HOME',
      es: 'VIEN VACATION HOME',
    },
    aspect: 'arch',
    image: '/images/facility-architecture.webp',
    objectPosition: 'center 40%',
    caption: {
      en: 'Seamless self check-in and direct Booking.com / Airbnb calendar sync.',
      es: 'Auto check-in sin complicaciones y calendario sincronizado con Booking y Airbnb.',
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
      en: '“Suite 421 at Vien Vacation Home was spotless and truly full equipped. Travelling as a family of 4, having two comfortable Queen beds and a complete kitchen made our stay effortless.”',
      es: '“La Suite 421 en Vien Vacation Home estaba impecable y verdaderamente full equipada. Viajando en familia de 4, tener dos camas Queen súper cómodas y cocina completa hizo nuestra estadía perfecta.”',
    },
    guestName: 'CARLOS & ELENA MENDOZA',
    guestTitle: {
      en: 'VERIFIED AIRBNB GUESTS — MIAMI',
      es: 'HUÉSPEDES VERIFICADOS DE AIRBNB — MIAMI',
    },
    staySuite: {
      en: 'Suite 421 · 2 Queen Beds (4 Guests)',
      es: 'Suite 421 · 2 Camas Queen (4 Personas)',
    },
    stayDate: {
      en: 'OCTOBER 2026',
      es: 'OCTUBRE 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 0,
  },
  {
    id: 'rev-2',
    indexLabel: '02 / 03',
    quote: {
      en: '“We booked Suite 311 directly and loved every detail. The beds are super comfortable, the Wi-Fi is fast, and everything you need is already in the suite. Way better than a standard hotel room.”',
      es: '“Reservamos la Suite 311 directamente y nos encantó cada detalle. Las camas son comodísimas, el Wi-Fi es rápido y todo lo que necesitas ya está en la suite. Mucho mejor que un hotel tradicional.”',
    },
    guestName: 'SOPHIE LAURENT',
    guestTitle: {
      en: 'VERIFIED BOOKING.COM GUEST — MONTREAL',
      es: 'HUÉSPED VERIFICADA DE BOOKING.COM — MONTREAL',
    },
    staySuite: {
      en: 'Suite 311 · 2 Queen Beds (4 Guests)',
      es: 'Suite 311 · 2 Camas Queen (4 Personas)',
    },
    stayDate: {
      en: 'SEPTEMBER 2026',
      es: 'SEPTIEMBRE 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 1,
  },
  {
    id: 'rev-3',
    indexLabel: '03 / 03',
    quote: {
      en: '“Our group of 8 reserved both Suite 421 and Suite 311. Having two identical, fully equipped suites in the same property with instant calendar confirmation was a 10/10 experience.”',
      es: '“Nuestro grupo de 8 personas reservó tanto la Suite 421 como la Suite 311. Tener dos suites idénticas y totalmente equipadas en la misma propiedad con confirmación inmediata fue un 10/10.”',
    },
    guestName: 'DANIEL & FRIENDS',
    guestTitle: {
      en: 'DIRECT RESERVATION — MADRID',
      es: 'RESERVA DIRECTA — MADRID',
    },
    staySuite: {
      en: 'Suite 421 + Suite 311 (8 Guests)',
      es: 'Suite 421 + Suite 311 (8 Personas)',
    },
    stayDate: {
      en: 'AUGUST 2026',
      es: 'AGOSTO 2026',
    },
    rating: '5.0 / 5.0',
    slideIndex: 2,
  },
];
