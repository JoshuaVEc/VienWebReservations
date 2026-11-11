import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DynamicUnitMetadata,
  Language,
  NavSection,
  PAGE_TITLES,
  REVIEW_ITEMS,
  UI_TEXT,
  buildDynamicGalleryItems,
  buildDynamicHeroSlides,
} from './data/heroSlides';
import { Navbar } from './components/Navbar';
import { BookingDialog } from './components/BookingDialog';
import { AboutSection } from './components/AboutSection';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

export const App: React.FC = () => {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.pathname.startsWith('/admin') ||
      new URLSearchParams(window.location.search).get('admin') === '1'
    );
  });
  const [lang, setLang] = useState<Language>('es');
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeNav, setActiveNav] = useState<NavSection>('HOME');
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [activeGalleryFilter, setActiveGalleryFilter] = useState<'ALL' | 'ARCH' | 'OASIS'>('ALL');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [liveUnits, setLiveUnits] = useState<DynamicUnitMetadata[] | null>(null);

  const refreshLiveUnits = useCallback(() => {
    fetch('/api/availability')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.units) && data.units.length > 0) {
          setLiveUnits(data.units as DynamicUnitMetadata[]);
        }
      })
      .catch(() => {
        // Fallback to default static slides if offline
      });
  }, []);

  useEffect(() => {
    refreshLiveUnits();
  }, [refreshLiveUnits]);

  const heroSlides = useMemo(() => buildDynamicHeroSlides(liveUnits), [liveUnits]);
  const galleryItems = useMemo(() => buildDynamicGalleryItems(liveUnits), [liveUnits]);

  const scrollShellRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressCounterRef = useRef<HTMLSpanElement>(null);

  const t = UI_TEXT[lang];
  const safeActiveIndex = activeIndex < heroSlides.length ? activeIndex : 0;
  const currentSlide = heroSlides[safeActiveIndex];
  const nextSlideIndex = (safeActiveIndex + 1) % heroSlides.length;
  const previewSlide = heroSlides[nextSlideIndex];

  const isHome = activeNav === 'HOME';
  const isSuites = activeNav === 'SUITES';
  const isGallery = activeNav === 'GALLERY';
  const isReviews = activeNav === 'REVIEWS';

  const isSplitHeader = isSuites || isReviews;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = PAGE_TITLES[lang][activeNav];
  }, [lang, activeNav]);

  useEffect(() => {
    const startTime = performance.now();
    const totalDuration = 2400;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / totalDuration);
      const eased = 1 - Math.pow(1 - ratio, 2.6);
      const pct = Math.round(eased * 100);

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${pct / 100})`;
      }
      if (progressCounterRef.current) {
        progressCounterRef.current.textContent = `${String(pct).padStart(2, '0')}%`;
      }

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    const doneTimer = window.setTimeout(() => {
      setIsIntroLoading(false);
    }, 2400);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
    };
  }, []);

  const handleSelectNav = useCallback((label: NavSection) => {
    setActiveNav((prev) => {
      if (label === prev) return prev;
      scrollShellRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return label;
    });
  }, []);

  const handleSelectSlide = useCallback((targetIndex: number) => {
    setActiveIndex(targetIndex);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % heroSlides.length);
  }, [heroSlides.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, [heroSlides.length]);

  const handleToggleLang = useCallback(() => {
    setLang((prev) => (prev === 'en' ? 'es' : 'en'));
  }, []);

  const handleOpenBooking = useCallback(() => {
    setIsBookingOpen(true);
  }, []);

  const handleCloseBooking = useCallback(() => {
    setIsBookingOpen(false);
  }, []);

  useEffect(() => {
    if (isBookingOpen || isAdminRoute) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isBookingOpen, isAdminRoute]);

  const currentReview = REVIEW_ITEMS[activeReviewIdx];

  const filteredGallery = useMemo(
    () =>
      galleryItems.filter((item) => {
        if (activeGalleryFilter === 'ALL') return true;
        if (activeGalleryFilter === 'ARCH') return item.aspect === 'arch' || item.aspect === 'tall';
        return item.aspect === 'wide';
      }),
    [activeGalleryFilter, galleryItems]
  );

  if (isAdminRoute) {
    return (
      <Suspense fallback={<div className="admin-loading-fallback">Cargando panel...</div>}>
        <AdminDashboard
          onUnitsUpdated={refreshLiveUnits}
          onExitAdmin={() => {
            refreshLiveUnits();
            window.history.pushState({}, '', '/');
            setIsAdminRoute(false);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div
      className={`lumiere-viewport mode-${activeNav.toLowerCase()} ${
        isIntroLoading ? 'is-intro-active' : 'is-intro-complete'
      }`}
    >
      <div className={`lumiere-frame ${!isHome ? 'is-split-frame' : 'is-home-frame'}`}>
        {/* LUXURY ARCHITECTURAL INTRO PRELOADER */}
        <div
          className={`lumiere-intro-loader ${isIntroLoading ? 'is-visible' : 'is-hidden'}`}
          aria-hidden={!isIntroLoading}
          inert={!isIntroLoading}
        >
          <div className="intro-top-bar">
            <span className="intro-meta-label">VIEN VACATION HOME</span>
            <span className="intro-meta-coords">{t.introTopRight}</span>
          </div>

          <div className="intro-center-stage">
            <div className="intro-arch-emblem">
              <span className="intro-monogram">V</span>
            </div>

            <div className="intro-brand-lockup">
              <span className="intro-brand-title">VIEN</span>
              <span className="intro-brand-subtitle">{t.introSubtitle}</span>
            </div>

            <div className="intro-progress-track" aria-hidden="true">
              <div ref={progressFillRef} className="intro-progress-fill" />
            </div>
          </div>

          <div className="intro-bottom-bar">
            <span className="intro-status-text">{t.introStatus}</span>
            <span ref={progressCounterRef} className="intro-counter">
              00%
            </span>
          </div>
        </div>

        <Navbar
          activeNav={activeNav}
          lang={lang}
          isSplitLayout={isSplitHeader}
          onSelectNav={handleSelectNav}
          onToggleLang={handleToggleLang}
          onOpenBooking={handleOpenBooking}
        />

        {/* UNIFIED SCROLL SHELL INSIDE FIXED ARTIFICIAL WINDOW */}
        <div
          ref={scrollShellRef}
          className={`unified-scroll-shell ${
            isHome || isSuites ? 'scroll-enabled-home' : 'scroll-locked-suites'
          }`}
        >
          {/* PERSISTENT CHOREOGRAPHED STAGE */}
          <main
            className={`choreographed-stage stage-${activeNav.toLowerCase()}`}
            aria-label="Vien Vacation Home Showcase"
          >
            {/* 1. SHARED MEDIA CANVAS */}
            <div className="shared-media-card">
              {heroSlides.map((slide, idx) => {
                const isActive = idx === safeActiveIndex;
                return (
                  <img
                    key={slide.id}
                    src={slide.image}
                    alt={slide.thumbnailAlt[lang]}
                    className={`shared-media-img ${
                      isActive ? 'is-active-slide' : 'is-hidden-slide'
                    }`}
                    fetchPriority={isActive ? 'high' : 'low'}
                    decoding={isActive ? 'sync' : 'async'}
                    width="1920"
                    height="1080"
                  />
                );
              })}
              <div className="shared-media-vignette" aria-hidden="true" />
            </div>

            {/* 2. HOME LAYER: Stacked Monumental Typography VI / EN */}
            <div className="home-monumental-layer" aria-hidden={!isHome} inert={!isHome}>
              <h1 className="monumental-title" aria-label="VIEN">
                <span className="monumental-mask">
                  <span
                    className="monumental-line"
                    style={{ '--line-idx': 0 } as React.CSSProperties}
                  >
                    VI
                  </span>
                </span>
                <span className="monumental-mask">
                  <span
                    className="monumental-line"
                    style={{ '--line-idx': 1 } as React.CSSProperties}
                  >
                    EN
                  </span>
                </span>
              </h1>
            </div>

            {/* 3. SUITES LAYER */}
            <div className="suites-editorial-layer" aria-hidden={!isSuites} inert={!isSuites}>
              <div className="suites-center-content">
                <div
                  className="suites-triptych"
                  role="group"
                  aria-label="Sanctuary Gallery Thumbnails"
                >
                  {heroSlides.map((slide, idx) => {
                    const isSelected = idx === safeActiveIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        style={{ '--stagger-index': idx } as React.CSSProperties}
                        className={`triptych-card suites-choreo-item suites-choreo-thumb ${
                          isSelected ? 'is-selected' : ''
                        }`}
                        onClick={() => handleSelectSlide(idx)}
                        aria-label={slide.suiteName[lang]}
                        aria-pressed={isSelected}
                      >
                        <img
                          src={slide.image}
                          alt={slide.thumbnailAlt[lang]}
                          className="triptych-img"
                          decoding="async"
                          width="140"
                          height="210"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="suites-heading-block">
                  <h2 className="suites-main-title suites-choreo-item suites-choreo-title">
                    <span>MAKANA RESORT · TONSUPA</span>
                    <span>{currentSlide.titleLine1[lang]}</span>
                  </h2>
                  <p className="suites-subtitle suites-choreo-item suites-choreo-subtitle">
                    {currentSlide.capacityLabel[lang]} · {currentSlide.bedsLabel[lang]} ·{' '}
                    {t.fullEquippedTag}
                  </p>
                </div>

                <div className="suites-choreo-item suites-choreo-cta">
                  <button
                    type="button"
                    className="suites-book-btn"
                    onClick={handleOpenBooking}
                  >
                    {t.bookYourStay}
                  </button>
                </div>
              </div>

              <div
                className="suites-scroll-indicator suites-choreo-item suites-choreo-scroll"
                aria-hidden="true"
              >
                {t.scrollDown}
              </div>
            </div>

            {/* 4. GALLERY LAYER */}
            <section
              className="gallery-stage-layer"
              aria-hidden={!isGallery}
              inert={!isGallery}
              aria-label="Architectural Visual Archive"
            >
              <div
                className="gallery-top-header gallery-choreo-item"
                style={{ '--gal-idx': 0 } as React.CSSProperties}
              >
                <div className="gallery-title-group">
                  <span className="gallery-eyebrow">{t.galleryEyebrow}</span>
                  <h2 className="gallery-main-heading">{t.galleryHeading}</h2>
                </div>

                <div className="gallery-filter-pills" role="group" aria-label="Filter Gallery">
                  {(['ALL', 'ARCH', 'OASIS'] as const).map((filterKey) => {
                    const isSelected = activeGalleryFilter === filterKey;
                    return (
                      <button
                        key={filterKey}
                        type="button"
                        aria-pressed={isSelected}
                        className={`gallery-filter-btn ${isSelected ? 'is-active' : ''}`}
                        onClick={() => setActiveGalleryFilter(filterKey)}
                      >
                        {filterKey === 'ALL'
                          ? t.filterAll
                          : filterKey === 'ARCH'
                          ? t.filterArch
                          : t.filterOasis}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="gallery-bento-grid">
                {filteredGallery.map((item, idx) => (
                  <article
                    key={item.id}
                    style={{ '--gal-idx': idx + 1 } as React.CSSProperties}
                    className={`gallery-mosaic-card aspect-${item.aspect} gallery-choreo-item`}
                  >
                    <button
                      type="button"
                      className="gallery-mosaic-trigger"
                      aria-label={`${item.title[lang]} — ${t.bookYourStay}`}
                      onClick={() => {
                        const matchIdx = heroSlides.findIndex((s) => s.image === item.image);
                        if (matchIdx !== -1) {
                          handleSelectSlide(matchIdx);
                        }
                        setIsBookingOpen(true);
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.title[lang]}
                        className="gallery-mosaic-img"
                        style={
                          item.objectPosition ? { objectPosition: item.objectPosition } : undefined
                        }
                        loading="lazy"
                        decoding="async"
                        width="600"
                        height="420"
                      />
                      <div className="gallery-mosaic-overlay">
                        <span className="gallery-card-code">
                          {item.code[lang]} · {item.location[lang]}
                        </span>
                        <h3 className="gallery-card-title">{item.title[lang]}</h3>
                        <p className="gallery-card-caption">{item.caption[lang]}</p>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </section>

            {/* 5. REVIEWS LAYER */}
            <section
              className="reviews-stage-layer"
              aria-hidden={!isReviews}
              inert={!isReviews}
              aria-label="Guest Reflections and Acclaim"
            >
              <div className="reviews-editorial-pane">
                <div
                  className="reviews-eyebrow-row reviews-choreo-item"
                  style={{ '--rev-idx': 0 } as React.CSSProperties}
                >
                  <span className="reviews-index">{currentReview.indexLabel}</span>
                  <span className="reviews-eyebrow">{t.reviewsEyebrow}</span>
                </div>

                <blockquote
                  key={currentReview.id}
                  className="reviews-quote-block reviews-choreo-item"
                  style={{ '--rev-idx': 1 } as React.CSSProperties}
                >
                  <p className="reviews-quote-text">{currentReview.quote[lang]}</p>
                </blockquote>

                <div
                  className="reviews-author-meta reviews-choreo-item"
                  style={{ '--rev-idx': 2 } as React.CSSProperties}
                >
                  <div className="reviews-author-info">
                    <span className="reviews-guest-name">{currentReview.guestName}</span>
                    <span className="reviews-guest-role">{currentReview.guestTitle[lang]}</span>
                  </div>
                  <div className="reviews-stay-badge">
                    <span>{currentReview.staySuite[lang]}</span>
                    <span className="reviews-rating-stars">★ {currentReview.rating}</span>
                  </div>
                </div>

                <div
                  className="reviews-selector-strip reviews-choreo-item"
                  style={{ '--rev-idx': 3 } as React.CSSProperties}
                  role="group"
                  aria-label="Select Guest Reflection"
                >
                  {REVIEW_ITEMS.map((rev, idx) => {
                    const isSelected = idx === activeReviewIdx;
                    return (
                      <button
                        key={rev.id}
                        type="button"
                        aria-pressed={isSelected}
                        className={`review-mini-pill ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setActiveReviewIdx(idx);
                          handleSelectSlide(rev.slideIndex);
                        }}
                      >
                        <span className="mini-pill-num">{rev.indexLabel}</span>
                        <span className="mini-pill-name">{rev.guestName}</span>
                        <span className="mini-pill-date">{rev.stayDate[lang]}</span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="reviews-cta-row reviews-choreo-item"
                  style={{ '--rev-idx': 4 } as React.CSSProperties}
                >
                  <button
                    type="button"
                    className="suites-book-btn"
                    onClick={handleOpenBooking}
                  >
                    {t.reserveExperience}
                  </button>
                </div>
              </div>
            </section>

            {/* 6. SHARED BOTTOM-RIGHT CONTROLLER & PREVIEW CARD */}
            <aside
              className="shared-bottom-right-dock"
              aria-hidden={isGallery}
              inert={isGallery}
              aria-label="Scene Preview and Carousel Controls"
            >
              <div className="preview-thumb-collapsible" inert={!isHome}>
                <button
                  type="button"
                  className="preview-thumb-button"
                  onClick={() => handleSelectNav('SUITES')}
                  aria-label={`${previewSlide.titleLine1[lang]} ${previewSlide.titleLine2[lang]}`}
                >
                  <img
                    src={previewSlide.image}
                    alt={previewSlide.thumbnailAlt[lang]}
                    className="preview-thumb-img"
                    decoding="async"
                    width="360"
                    height="200"
                  />
                </button>
              </div>

              <div className="preview-card-footer">
                <div
                  className="preview-meta"
                  onClick={() => {
                    if (isHome) handleSelectNav('SUITES');
                  }}
                  style={isHome ? { cursor: 'pointer' } : undefined}
                >
                  <span className="preview-index">{currentSlide.indexLabel}</span>
                  <h2 className="preview-title" id="active-scene-heading" tabIndex={-1}>
                    <span>{currentSlide.titleLine1[lang]}</span>
                    <span>{currentSlide.titleLine2[lang]}</span>
                  </h2>
                </div>

                <div className="preview-controls" role="group" aria-label="Slide Navigation">
                  <button
                    type="button"
                    className="circle-arrow-btn"
                    onClick={handlePrev}
                    aria-label={t.prevAria}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 12H5" />
                      <path d="M12 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="circle-arrow-btn"
                    onClick={handleNext}
                    aria-label={t.nextAria}
                  >
                    <svg
                      width="15"
                      height="15"
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
            </aside>
          </main>

          {/* 2ND SECTION OF HOME: Left blank, ready for future VIEN content */}
          {isHome && (
            <section
              className="about-section home-blank-section"
              aria-label="Vien Vacation Home"
            />
          )}

          {/* 2ND SECTION OF SUITES: Makana Suites Editorial Details */}
          {isSuites && (
            <AboutSection lang={lang} onExploreSuites={handleOpenBooking} />
          )}
        </div>
      </div>

      <BookingDialog
        isOpen={isBookingOpen}
        lang={lang}
        initialSuiteId={currentSlide.id}
        slides={heroSlides}
        onClose={handleCloseBooking}
      />
    </div>
  );
};
