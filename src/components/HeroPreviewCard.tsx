import React from 'react';
import { HeroSlide, Language } from '../data/heroSlides';

interface HeroPreviewCardProps {
  currentSlide: HeroSlide;
  previewSlide: HeroSlide;
  lang?: Language;
  onPrev: () => void;
  onNext: () => void;
  onSelectPreview: () => void;
}

export const HeroPreviewCard: React.FC<HeroPreviewCardProps> = ({
  currentSlide,
  previewSlide,
  lang = 'es',
  onPrev,
  onNext,
  onSelectPreview,
}) => {
  return (
    <aside className="hero-preview-card" aria-label="Scene Preview and Carousel Controls">
      <button
        type="button"
        className="preview-thumb-button"
        onClick={onSelectPreview}
        aria-label={`Switch view to ${previewSlide.titleLine1[lang]} ${previewSlide.titleLine2[lang]}`}
      >
        <img
          src={previewSlide.image}
          alt={previewSlide.thumbnailAlt[lang]}
          className="preview-thumb-img"
          width="360"
          height="200"
        />
      </button>

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
            className="circle-arrow-btn"
            onClick={onPrev}
            aria-label="Previous Sanctuary View"
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
            aria-label="Next Sanctuary View"
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
  );
};
