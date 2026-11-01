import React, { useCallback, useEffect, useState } from 'react';
import {
  GALLERY_ITEMS,
  HERO_SLIDES,
  Language,
  NavSection,
  REVIEW_ITEMS,
  UI_TEXT,
} from './data/heroSlides';
import { Navbar } from './components/Navbar';
import { BookingDialog } from './components/BookingDialog';
import { AboutSection } from './components/AboutSection';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeNav, setActiveNav] = useState<NavSection>('HOME');
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [activeGalleryFilter, setActiveGalleryFilter] = useState<'ALL' | 'ARCH' | 'OASIS'>('ALL');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);

  const t = UI_TEXT[lang];
  const currentSlide = HERO_SLIDES[activeIndex];
  const nextSlideIndex = (activeIndex + 1) % HERO_SLIDES.length;
  const previewSlide = activeIndex === 1 ? HERO_SLIDES[0] : HERO_SLIDES[nextSlideIndex];

  const isHome = activeNav === 'HOME';
  const isSuites = activeNav === 'SUITES';
  const isGallery = activeNav === 'GALLERY';
  const isReviews = activeNav === 'REVIEWS';

  const isSplitHeader = isSuites || isReviews;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const startTime = performance.now();
    const totalDuration = 3400;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / totalDuration);
      const eased = 1 - Math.pow(1 - ratio, 2.6);
      setIntroProgress(Math.round(eased * 100));

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    const doneTimer = window.setTimeout(() => {
      setIsIntroLoading(false);
    }, 3450);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
    };
  }, []);

  const handleSelectNav = useCallback(
    (label: NavSection) => {
      if (label === activeNav) return;
      document.querySelector('.unified-scroll-shell')?.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveNav(label);
    },
    [activeNav]
  );

  const handleSelectSlide = useCallback(
    (targetIndex: number) => {
      if (targetIndex === activeIndex) return;
      setActiveIndex(targetIndex);
    },
    [activeIndex]
  );

  const handleNext = useCallback(() => {
    const next = (activeIndex + 1) % HERO_SLIDES.length;
    handleSelectSlide(next);
  }, [activeIndex, handleSelectSlide]);

  const handlePrev = useCallback(() => {
    const prev = (activeIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    handleSelectSlide(prev);
  }, [activeIndex, handleSelectSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBookingOpen) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isBookingOpen]);

  const currentReview = REVIEW_ITEMS[activeReviewIdx];

  const filteredGallery = GALLERY_ITEMS.filter((item) => {
    if (activeGalleryFilter === 'ALL') return true;
    if (activeGalleryFilter === 'ARCH') return item.aspect === 'arch' || item.aspect === 'tall';
    return item.aspect === 'wide';
  });

  return (
    <div
      className={`lumiere-viewport mode-${activeNav.toLowerCase()} ${
        isIntroLoading ? 'is-intro-active' : 'is-intro-complete'
      }`}
    >
      <div
        className={`lumiere-frame ${
          !isHome ? 'is-split-frame' : 'is-home-frame'
        }`}
      >
        {/* 4-SECOND LUXURY ARCHITECTURAL INTRO PRELOADER */}
        <div
          className={`lumiere-intro-loader ${
            isIntroLoading ? 'is-visible' : 'is-hidden'
          }`}
          aria-hidden={!isIntroLoading}
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
              <div
                className="intro-progress-fill"
                style={{ transform: `scaleX(${introProgress / 100})` }}
              />
            </div>
          </div>

          <div className="intro-bottom-bar">
            <span className="intro-status-text">{t.introStatus}</span>
            <span className="intro-counter">
              {String(introProgress).padStart(2, '0')}%
            </span>
          </div>
        </div>

        <Navbar
          activeNav={activeNav}
          lang={lang}
          isSplitLayout={isSplitHeader}
          onSelectNav={handleSelectNav}
          onToggleLang={() => setLang((prev) => (prev === 'en' ? 'es' : 'en'))}
          onOpenBooking={() => setIsBookingOpen(true)}
        />

        {/* UNIFIED SCROLL SHELL INSIDE FIXED ARTIFICIAL WINDOW */}
        <div
          className={`unified-scroll-shell ${
            isHome ? 'scroll-enabled-home' : 'scroll-locked-suites'
          }`}
        >
          {/* PERSISTENT CHOREOGRAPHED STAGE */}
          <main
            className={`choreographed-stage stage-${activeNav.toLowerCase()}`}
            aria-label="Vien Vacation Home Showcase"
          >
            {/* 1. SHARED MEDIA CANVAS */}
            <div className="shared-media-card">
              {HERO_SLIDES.map((slide, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <img
                    key={slide.id}
                    src={slide.image}
                    alt={slide.thumbnailAlt[lang]}
                    className={`shared-media-img ${
                      isActive ? 'is-active-slide' : 'is-hidden-slide'
                    }`}
                    fetchPriority={isActive ? 'high' : 'low'}
                    loading={isActive ? undefined : 'lazy'}
                    decoding={isActive ? 'sync' : 'async'}
                    width="1920"
                    height="1080"
                  />
                );
              })}
              <div className="shared-media-vignette" aria-hidden="true" />
            </div>

            {/* 2. HOME LAYER: Stacked Monumental Typography MA / KA / NA */}
            <div className="home-monumental-layer" aria-hidden={!isHome}>
              <h1 className="monumental-title" aria-label="MAKANA">
                <span className="monumental-mask">
                  <span
                    className="monumental-line"
                    style={{ '--line-idx': 0 } as React.CSSProperties}
                  >
                    MA
                  </span>
                </span>
                <span className="monumental-mask">
                  <span
                    className="monumental-line"
                    style={{ '--line-idx': 1 } as React.CSSProperties}
                  >
                    KA
                  </span>
                </span>
                <span className="monumental-mask">
                  <span
                    className="monumental-line"
                    style={{ '--line-idx': 2 } as React.CSSProperties}
                  >
                    NA
                  </span>
                </span>
              </h1>
            </div>

            {/* 3. SUITES LAYER */}
            <div className="suites-editorial-layer" aria-hidden={!isSuites}>
              <div className="suites-center-content">
                <div
                  className="suites-triptych"
                  role="group"
                  aria-label="Sanctuary Gallery Thumbnails"
                >
                  {HERO_SLIDES.map((slide, idx) => {
                    const isSelected = idx === activeIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        tabIndex={isSuites ? 0 : -1}
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
                          width="140"
                          height="210"
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="suites-heading-block">
                  <h2 className="suites-main-title suites-choreo-item suites-choreo-title">
                    <span>VIEN VACATION HOME</span>
                    <span>SUITE {currentSlide.unitNumber}</span>
                  </h2>
                  <p className="suites-subtitle suites-choreo-item suites-choreo-subtitle">
                    {currentSlide.capacityLabel[lang]} · {currentSlide.bedsLabel[lang]} ·{' '}
                    {t.fullEquippedTag}
                  </p>
                </div>

                <div className="suites-choreo-item suites-choreo-cta">
                  <button
                    type="button"
                    tabIndex={isSuites ? 0 : -1}
                    className="suites-book-btn"
                    onClick={() => setIsBookingOpen(true)}
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
                  {(['ALL', 'ARCH', 'OASIS'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      tabIndex={isGallery ? 0 : -1}
                      className={`gallery-filter-btn ${
                        activeGalleryFilter === filterKey ? 'is-active' : ''
                      }`}
                      onClick={() => setActiveGalleryFilter(filterKey)}
                    >
                      {filterKey === 'ALL'
                        ? t.filterAll
                        : filterKey === 'ARCH'
                        ? t.filterArch
                        : t.filterOasis}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gallery-bento-grid">
                {filteredGallery.map((item, idx) => (
                  <article
                    key={item.id}
                    style={{ '--gal-idx': idx + 1 } as React.CSSProperties}
                    className={`gallery-mosaic-card aspect-${item.aspect} gallery-choreo-item`}
                    onClick={() => {
                      const matchIdx = HERO_SLIDES.findIndex((s) => s.image === item.image);
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
                      style={item.objectPosition ? { objectPosition: item.objectPosition } : undefined}
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
                  </article>
                ))}
              </div>
            </section>

            {/* 5. REVIEWS LAYER */}
            <section
              className="reviews-stage-layer"
              aria-hidden={!isReviews}
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
                  role="tablist"
                  aria-label="Select Guest Reflection"
                >
                  {REVIEW_ITEMS.map((rev, idx) => {
                    const isSelected = idx === activeReviewIdx;
                    return (
                      <button
                        key={rev.id}
                        type="button"
                        role="tab"
                        tabIndex={isReviews ? 0 : -1}
                        aria-selected={isSelected}
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
                    tabIndex={isReviews ? 0 : -1}
                    className="suites-book-btn"
                    onClick={() => setIsBookingOpen(true)}
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
              aria-label="Scene Preview and Carousel Controls"
            >
              <div className="preview-thumb-collapsible">
                <button
                  type="button"
                  tabIndex={isHome ? 0 : -1}
                  className="preview-thumb-button"
                  onClick={handleNext}
                  aria-label={`${previewSlide.titleLine1[lang]} ${previewSlide.titleLine2[lang]}`}
                >
                  <img
                    src={previewSlide.image}
                    alt={previewSlide.thumbnailAlt[lang]}
                    className="preview-thumb-img"
                    loading="lazy"
                    decoding="async"
                    width="360"
                    height="200"
                  />
                </button>
              </div>

              <div className="preview-card-footer">
                <div className="preview-meta">
                  <span className="preview-index">{currentSlide.indexLabel}</span>
                  <h2 className="preview-title" id="active-scene-heading" tabIndex={-1}>
                    <span>{currentSlide.titleLine1[lang]}</span>
                    <span>{currentSlide.titleLine2[lang]}</span>
                  </h2>
                </div>

                <div className="preview-controls" role="group" aria-label="Slide Navigation">
                  <button
                    type="button"
                    tabIndex={isGallery ? -1 : 0}
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
                    tabIndex={isGallery ? -1 : 0}
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

          {/* ABOUT US SECTION */}
          {isHome && (
            <AboutSection lang={lang} onExploreSuites={() => handleSelectNav('SUITES')} />
          )}
        </div>
      </div>

      <BookingDialog
        isOpen={isBookingOpen}
        lang={lang}
        initialSuiteId={currentSlide.id}
        onClose={() => setIsBookingOpen(false)}
      />
    </div>
  );
};
