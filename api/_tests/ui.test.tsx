import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from '../../src/App.js';
import { Navbar } from '../../src/components/Navbar.js';
import { AboutSection } from '../../src/components/AboutSection.js';
import { BookingDialog } from '../../src/components/BookingDialog.js';
import { HERO_SLIDES, NAV_ITEMS, REVIEW_ITEMS } from '../../src/data/heroSlides.js';

type AnyElement = React.ReactElement<Record<string, any>>;

function withStatelessHooks<T>(fn: () => T): T {
  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const prev = internals.H;
  internals.H = {
    useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
    useRef: (init: any) => ({ current: init }),
    useEffect: () => {},
    useCallback: (cb: any) => cb,
    useMemo: (cb: () => any) => cb(),
    useId: () => 'mock-id',
  };
  try {
    return fn();
  } finally {
    internals.H = prev;
  }
}

function collectElements(
  node: React.ReactNode,
  predicate: (el: AnyElement) => boolean,
  acc: AnyElement[] = []
): AnyElement[] {
  if (!node || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') {
    return acc;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, predicate, acc);
    return acc;
  }
  if (React.isValidElement(node)) {
    const el = node as AnyElement;
    if (predicate(el)) {
      acc.push(el);
    }
    if (typeof el.type === 'function') {
      const Comp = el.type as (props: any) => React.ReactNode;
      const rendered = withStatelessHooks(() => Comp(el.props));
      collectElements(rendered, predicate, acc);
    } else if (
      typeof el.type === 'object' &&
      el.type !== null &&
      'type' in el.type &&
      typeof (el.type as any).type === 'function'
    ) {
      // React.memo wrapper
      const MemoInner = (el.type as any).type as (props: any) => React.ReactNode;
      collectElements(
        withStatelessHooks(() => MemoInner(el.props)),
        predicate,
        acc
      );
    } else if (el.props && el.props.children) {
      collectElements(el.props.children, predicate, acc);
    }
  }
  return acc;
}

console.log('1. Verificando renderizado completo de <App /> y presencia de todos los botones y scrollbar...');
const appHtml = renderToStaticMarkup(React.createElement(App));
const buttonMatches = appHtml.match(/<button\b/g) || [];
assert.ok(
  buttonMatches.length >= 25,
  `Se esperaban al menos 25 botones interactivos en App, se encontraron ${buttonMatches.length}`
);
assert.ok(
  appHtml.includes('vien-capsule-scrollbar'),
  'Falta el contenedor .vien-capsule-scrollbar en el DOM'
);
assert.ok(
  appHtml.includes('vien-capsule-track') && appHtml.includes('vien-capsule-thumb'),
  'Faltan .vien-capsule-track o .vien-capsule-thumb en el DOM'
);
console.log(`   ✓ <App /> renderiza ${buttonMatches.length} botones y la scrollbar tipo cápsula.`);

console.log('2. Probando todos los botones de <Navbar /> (Navegación, Idioma EN/ES y Contáctanos)...');
const clickedNavs: string[] = [];
let langToggled = 0;
let bookingOpenedFromNav = 0;

const navTree = React.createElement(Navbar, {
  activeNav: 'HOME',
  lang: 'es',
  isSplitLayout: false,
  onSelectNav: (section) => clickedNavs.push(section),
  onToggleLang: () => {
    langToggled += 1;
  },
  onOpenBooking: () => {
    bookingOpenedFromNav += 1;
  },
});

const navBrandLink = collectElements(navTree, (el) => el.type === 'a')[0];
assert.ok(navBrandLink, 'Navbar debe incluir el enlace del monograma V');
navBrandLink.props.onClick({ preventDefault: () => {} });

const navButtons = collectElements(navTree, (el) => el.type === 'button');
// 4 nav pills + lang toggle + contact button = 6 buttons
assert.equal(navButtons.length, 6, 'Navbar debe tener exactamente 6 botones interactivos');

for (const btn of navButtons) {
  assert.equal(typeof btn.props.onClick, 'function', 'Cada botón de Navbar debe tener onClick');
  btn.props.onClick();
}

assert.deepEqual(
  clickedNavs,
  ['HOME', ...NAV_ITEMS],
  'El monograma y los 4 botones de navegación deben disparar onSelectNav para HOME, SUITES, GALLERY y REVIEWS'
);
assert.equal(langToggled, 1, 'El botón EN / ES debe disparar onToggleLang');
assert.equal(bookingOpenedFromNav, 1, 'El botón CONTÁCTANOS debe disparar onOpenBooking');
console.log('   ✓ El monograma y los 6 botones de Navbar funcionan correctamente.');

console.log('3. Probando botones de <AboutSection /> (Variante HOME "Quiénes Somos" y Variante SUITES)...');
let exploredFromHome = 0;
let bookedFromSuites = 0;

const homeAboutTree = React.createElement(AboutSection, {
  variant: 'home',
  lang: 'es',
  onExploreSuites: () => {
    exploredFromHome += 1;
  },
});
const homeAboutHtml = renderToStaticMarkup(homeAboutTree);
assert.ok(
  homeAboutHtml.includes('QUIÉNES SOMOS · VIEN VACATION HOME'),
  'La variante home debe mostrar el encabezado QUIÉNES SOMOS'
);
const homeAboutButtons = collectElements(homeAboutTree, (el) => el.type === 'button');
assert.equal(homeAboutButtons.length, 1);
homeAboutButtons[0].props.onClick();
assert.equal(exploredFromHome, 1, 'El botón CTA de Quiénes Somos debe ejecutar onExploreSuites');

const suitesAboutTree = React.createElement(AboutSection, {
  variant: 'suites',
  lang: 'en',
  onExploreSuites: () => {
    bookedFromSuites += 1;
  },
});
const suitesAboutButtons = collectElements(suitesAboutTree, (el) => el.type === 'button');
assert.equal(suitesAboutButtons.length, 1);
suitesAboutButtons[0].props.onClick();
assert.equal(bookedFromSuites, 1, 'El botón CTA de Suites About debe ejecutar su acción');
console.log('   ✓ Botones CTA de AboutSection (HOME y SUITES) verificados.');

console.log('4. Probando botones de Suites, Galería, Reseñas, Controles de Carrusel y Scrollbar en <App />...');
// Stateful React hook simulator for <App />
const stateStore: any[] = [];
const refStore: Array<{ current: any }> = [];
const effectStore: Array<() => void | (() => void)> = [];
let stateCursor = 0;
let refCursor = 0;

function renderAppWithHooks(): AnyElement {
  stateCursor = 0;
  refCursor = 0;
  effectStore.length = 0;

  const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const prevDispatcher = internals.H;

  internals.H = {
    useState: (init: any) => {
      const idx = stateCursor++;
      if (!(idx in stateStore)) {
        stateStore[idx] = typeof init === 'function' ? init() : init;
      }
      const setState = (updater: any) => {
        stateStore[idx] = typeof updater === 'function' ? updater(stateStore[idx]) : updater;
      };
      return [stateStore[idx], setState];
    },
    useRef: (init: any) => {
      const idx = refCursor++;
      if (!refStore[idx]) {
        refStore[idx] = { current: init };
      }
      return refStore[idx];
    },
    useEffect: (fn: () => void | (() => void)) => {
      effectStore.push(fn);
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: () => any) => fn(),
  };

  try {
    return (App as any)({}) as AnyElement;
  } finally {
    internals.H = prevDispatcher;
  }
}

let tree = renderAppWithHooks();

// Attach mock DOM elements to scrollShellRef (ref 0), capsuleTrackRef (ref 3), capsuleThumbRef (ref 4)
let currentScrollTop = 0;
const mockScrollShell = {
  scrollTop: 0,
  scrollHeight: 2000,
  clientHeight: 1000,
  listeners: {} as Record<string, Array<() => void>>,
  addEventListener(evt: string, cb: () => void) {
    this.listeners[evt] = this.listeners[evt] || [];
    this.listeners[evt].push(cb);
  },
  removeEventListener(evt: string, cb: () => void) {
    this.listeners[evt] = (this.listeners[evt] || []).filter((f) => f !== cb);
  },
  scrollTo({ top }: { top: number; behavior?: string }) {
    currentScrollTop = top;
    this.scrollTop = top;
    for (const cb of this.listeners['scroll'] || []) cb();
  },
};

const mockCapsuleTrack = {
  getBoundingClientRect: () => ({ top: 100, height: 200 }),
  setPointerCapture: () => {},
};

const mockCapsuleThumb = {
  style: { transform: 'translate3d(0, 0%, 0)' },
};

refStore[0].current = mockScrollShell;
refStore[3].current = mockCapsuleTrack;
refStore[4].current = mockCapsuleThumb;

// Test Carousel Next & Prev buttons
const prevBtn = collectElements(
  tree,
  (el) => el.type === 'button' && el.props.className === 'circle-arrow-btn'
)[0];
const nextBtn = collectElements(
  tree,
  (el) => el.type === 'button' && el.props.className === 'circle-arrow-btn'
)[1];
assert.ok(prevBtn && nextBtn, 'Deben existir los botones de flecha anterior y siguiente');

nextBtn.props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[2], 1, 'El botón siguiente debe avanzar activeIndex a 1');

prevBtn.props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[2], 0, 'El botón anterior debe regresar activeIndex a 0');

// Test Triptych suite selector buttons
const triptychBtns = collectElements(
  tree,
  (el) => el.type === 'button' && String(el.props.className || '').includes('triptych-card')
);
assert.equal(triptychBtns.length, HERO_SLIDES.length, 'Debe haber 1 botón tríptico por cada slide');
triptychBtns[2].props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[2], 2, 'El botón tríptico 3 debe cambiar activeIndex a 2');

// Test Gallery filter buttons (ALL, ARCH, OASIS)
const filterBtns = collectElements(
  tree,
  (el) => el.type === 'button' && String(el.props.className || '').includes('gallery-filter-btn')
);
assert.equal(filterBtns.length, 3, 'Deben existir los 3 botones de filtro de galería');
filterBtns[1].props.onClick(); // ARCH
tree = renderAppWithHooks();
assert.equal(stateStore[5], 'ARCH', 'El botón de filtro ARCH debe actualizar activeGalleryFilter');
filterBtns[2].props.onClick(); // OASIS
tree = renderAppWithHooks();
assert.equal(stateStore[5], 'OASIS', 'El botón de filtro OASIS debe actualizar activeGalleryFilter');
filterBtns[0].props.onClick(); // ALL
tree = renderAppWithHooks();
assert.equal(stateStore[5], 'ALL', 'El botón de filtro ALL debe restaurar activeGalleryFilter');

// Test Gallery mosaic trigger buttons
const mosaicBtns = collectElements(
  tree,
  (el) => el.type === 'button' && el.props.className === 'gallery-mosaic-trigger'
);
assert.equal(mosaicBtns.length, 6, 'Deben existir los 6 botones de tarjetas de galería');
mosaicBtns[0].props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[6], true, 'Hacer clic en una tarjeta de galería debe abrir BookingDialog');

// Close BookingDialog
stateStore[6] = false;
tree = renderAppWithHooks();

// Test Review mini-pill buttons (3 verified Google reviews)
const reviewPills = collectElements(
  tree,
  (el) => el.type === 'button' && String(el.props.className || '').includes('review-mini-pill')
);
assert.equal(
  reviewPills.length,
  REVIEW_ITEMS.length,
  'Debe existir un botón mini-pill por cada reseña verificada de Google'
);
reviewPills[1].props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[4], 1, 'El segundo mini-pill debe seleccionar la reseña de Franklin Erazo');
reviewPills[2].props.onClick();
tree = renderAppWithHooks();
assert.equal(stateStore[4], 2, 'El tercer mini-pill debe seleccionar la reseña de Ricardo Guaygua');

// Test Scrollbar pointer interaction, smooth vertical tracking & preservation on tab change
const capsuleTrackEl = collectElements(
  tree,
  (el) => el.type === 'div' && el.props.className === 'vien-capsule-track'
)[0];
assert.ok(capsuleTrackEl, 'Debe existir .vien-capsule-track con handlers de puntero');

// Simulate clicking halfway down the scrollbar track (clientY = 200 on top=100, height=200 -> ratio 0.5)
capsuleTrackEl.props.onPointerDown({
  clientY: 200,
  pointerId: 1,
  currentTarget: mockCapsuleTrack,
});
assert.equal(
  currentScrollTop,
  500,
  'Hacer clic al 50% de la scrollbar debe desplazar el scroll vertical a 500px (50%)'
);
assert.equal(
  mockCapsuleThumb.style.transform,
  'translate3d(0, 100%, 0)',
  'El thumb de la scrollbar debe ubicarse exactamente en la mitad (100% de su altura)'
);

// Simulate dragging down to 100% of the scrollbar track (clientY = 300 -> ratio 1.0)
capsuleTrackEl.props.onPointerMove({
  clientY: 300,
  buttons: 1,
});
assert.equal(
  currentScrollTop,
  1000,
  'Arrastrar la scrollbar al final debe desplazar el scroll vertical a 1000px (100%)'
);
assert.equal(
  mockCapsuleThumb.style.transform,
  'translate3d(0, 200%, 0)',
  'El thumb de la scrollbar debe llegar al borde inferior (200%)'
);

// Switch pages (HOME -> SUITES -> GALLERY -> REVIEWS) and verify vertical scroll & scrollbar thumb stay in place!
const navPillsInApp = collectElements(
  tree,
  (el) => el.type === 'button' && String(el.props.className || '').includes('nav-pill')
);
for (const navBtn of navPillsInApp) {
  navBtn.props.onClick();
  tree = renderAppWithHooks();
  assert.equal(
    mockScrollShell.scrollTop,
    1000,
    'Cambiar de pestaña debe conservar la posición vertical actual'
  );
  assert.equal(
    mockCapsuleThumb.style.transform,
    'translate3d(0, 200%, 0)',
    'El thumb de la scrollbar debe mantener la posición vertical al cambiar de pestaña'
  );
}
console.log(
  '   ✓ Todos los botones de contenido y la scrollbar (clic, arrastre y conservación vertical entre páginas) funcionan correctamente.'
);

console.log('5. Verificando estilos CSS de la scrollbar (más delgada, más pequeña y transición smooth)...');
const cssText = fs.readFileSync(
  path.resolve(process.cwd(), 'src', 'styles', 'index.css'),
  'utf8'
);
assert.ok(
  cssText.includes('.vien-capsule-track') && cssText.includes('width: 6px;'),
  'La pista .vien-capsule-track debe ser más delgada (width: 6px)'
);
assert.ok(
  cssText.includes('height: clamp(3.4rem, 8.2vh, 4.5rem);'),
  'La pista .vien-capsule-track debe tener el tamaño compacto configurado'
);
assert.ok(
  cssText.includes('transform 0.28s var(--silky-ease)'),
  'El thumb .vien-capsule-thumb debe tener la transición smooth con var(--silky-ease)'
);
console.log('   ✓ Reglas CSS de la scrollbar verificadas.');

console.log('6. Probando renderizado y botones del modal <BookingDialog />...');
let dialogClosed = 0;
const dialogTree = React.createElement(BookingDialog, {
  isOpen: true,
  lang: 'es',
  initialSuiteId: 'depto-612',
  slides: HERO_SLIDES,
  onClose: () => {
    dialogClosed += 1;
  },
});
const dialogHtml = renderToStaticMarkup(dialogTree);
const dialogButtons = dialogHtml.match(/<button\b/g) || [];
assert.equal(
  dialogButtons.length,
  3,
  `BookingDialog abierto debe renderizar sus 3 botones de acción (encontrados: ${dialogButtons.length})`
);
const closeBtn = collectElements(
  dialogTree,
  (el) => el.type === 'button' && el.props.className === 'dialog-close-btn'
)[0];
const cancelBtn = collectElements(
  dialogTree,
  (el) => el.type === 'button' && el.props.className === 'dialog-secondary-btn'
)[0];
const submitBtn = collectElements(
  dialogTree,
  (el) => el.type === 'button' && el.props.className === 'dialog-submit-btn'
)[0];
assert.ok(closeBtn, 'Debe existir el botón de cierre .dialog-close-btn en BookingDialog');
assert.ok(cancelBtn, 'Debe existir el botón cancelar .dialog-secondary-btn en BookingDialog');
assert.ok(submitBtn, 'Debe existir el botón enviar .dialog-submit-btn en BookingDialog');
closeBtn.props.onClick();
cancelBtn.props.onClick();
console.log('   ✓ Botones de <BookingDialog /> (.dialog-close-btn, .dialog-secondary-btn y .dialog-submit-btn) verificados.');

console.log('\n✅ TODAS LAS PRUEBAS DE UI, BOTONES Y SCROLLBAR PASARON EXITOSAMENTE.');
