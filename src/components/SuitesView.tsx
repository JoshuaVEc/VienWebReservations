import React from 'react';
import { HERO_SLIDES, HeroSlide, Language } from '../data/heroSlides';

interface SuitesViewProps {
  currentSlide: HeroSlide;
  activeSlideIndex: number;
  lang?: Language;
  onSelectSlide: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenBooking: () => void;
}

export const SuitesView: React.FC<SuitesViewProps> = ({
  currentSlide,
  activeSlideIndex,
  lang = 'es',
  onSelectSlide,
  onPrev,
  onNext,
  onOpenBooking,
}) => {
  return (
    <section className="suites-split-stage" aria-label="Vien Vacation Home Suites Showcase">
      {/* Left Column: Centered Triptych, Editorial Title, CTA & Scroll Down */}
      <div className="suites-left-pane">
        <div className="suites-center-content">
          {/* 3 Vertical Rounded Rectangles (Triptych) with Soft Staggered Entry */}
          <div className="suites-triptych" role="group" aria-label="Sanctuary Gallery Thumbnails">
            {HERO_SLIDES.map((slide, idx) => {
              const isSelected = idx === activeSlideIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  style={{ '--stagger-index': idx } as React.CSSProperties}
                  className={`triptych-card suites-soft-item suites-soft-thumb ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectSlide(idx)}
                  aria-label={`View ${slide.suiteName[lang]}`}
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

          {/* Editorial Title & Subtitle with Soft Delayed Entry */}
          <div className="suites-heading-block">
            <h1
              id="active-scene-heading"
              className="suites-main-title suites-soft-item suites-soft-title"
              tabIndex={-1}
            >
              <span>VIEN VACATION HOME</span>
              <span>SUITE {currentSlide.unitNumber}</span>
            </h1>
            <p className="suites-subtitle suites-soft-item suites-soft-subtitle">
              {currentSlide.capacityLabel[lang]} · {currentSlide.bedsLabel[lang]}
            </p>
          </div>

          {/* Warm Taupe CTA Button with Soft Delayed Entry */}
          <div className="suites-soft-item suites-soft-cta">
            <button
              type="button"
              className="suites-book-btn"
              onClick={onOpenBooking}
            >
              BOOK YOUR STAY
            </button>
          </div>
        </div>

        {/* Bottom Scroll Down Label */}
        <div
          className="suites-scroll-indicator suites-soft-item suites-soft-scroll"
          aria-hidden="true"
        >
          SCROLL DOWN
        </div>
      </div>

      {/* Right Column: Full-Height Rounded Architectural Portrait Frame */}
      <div className="suites-right-pane">
        <div className="suites-portrait-card">
          <img
            key={currentSlide.id}
            src={currentSlide.image}
            alt={currentSlide.thumbnailAlt[lang]}
            className="suites-portrait-img"
            fetchPriority="high"
            width="1000"
            height="1300"
          />
          <div className="suites-portrait-vignette" aria-hidden="true" />

          {/* Bottom Overlay inside the Right Portrait Image */}
          <div className="suites-portrait-footer">
            <div className="preview-meta">
              <span className="preview-index">{currentSlide.indexLabel}</span>
              <h2 className="preview-title">
                <span>{currentSlide.titleLine1[lang]}</span>
                <span>{currentSlide.titleLine2[lang]}</span>
              </h2>
            </div>

            <div className="preview-controls" role="group" aria-label="Suite Slide Navigation">
              <button
                type="button"
                className="circle-arrow-btn"
                onClick={onPrev}
                aria-label="Previous Suite Photo"
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
                onClick={onNext}
                aria-label="Next Suite Photo"
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
        </div>
      </div>
    </section>
  );
};
