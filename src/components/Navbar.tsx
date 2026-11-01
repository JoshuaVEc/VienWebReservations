import React from 'react';
import { Language, NAV_ITEMS, NAV_LABELS, NavSection, UI_TEXT } from '../data/heroSlides';

interface NavbarProps {
  activeNav: NavSection;
  lang: Language;
  isSplitLayout?: boolean;
  onSelectNav: (label: NavSection) => void;
  onToggleLang: () => void;
  onOpenBooking: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeNav,
  lang,
  isSplitLayout = false,
  onSelectNav,
  onToggleLang,
  onOpenBooking,
}) => {
  const t = UI_TEXT[lang];

  return (
    <header
      className={`lumiere-header ${isSplitLayout ? 'is-split-header' : ''}`}
      role="banner"
    >
      <a
        href="#home"
        className="brand-monogram"
        aria-label="Vien Vacation Home"
        onClick={(e) => {
          e.preventDefault();
          onSelectNav('HOME');
        }}
      >
        V
      </a>

      <nav className="nav-pills" aria-label="Primary Navigation">
        {NAV_ITEMS.map((sectionKey) => {
          const isActive = activeNav === sectionKey;
          return (
            <button
              key={sectionKey}
              type="button"
              className={`nav-pill ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectNav(sectionKey)}
            >
              {NAV_LABELS[lang][sectionKey]}
            </button>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          type="button"
          className="lang-toggle-pill"
          onClick={onToggleLang}
          aria-label={
            lang === 'en' ? 'Cambiar idioma a Español' : 'Switch language to English'
          }
        >
          <span className={lang === 'en' ? 'lang-active' : 'lang-inactive'}>EN</span>
          <span className="lang-divider">/</span>
          <span className={lang === 'es' ? 'lang-active' : 'lang-inactive'}>ES</span>
        </button>

        <button
          type="button"
          className="contact-pill"
          onClick={onOpenBooking}
        >
          {t.contactUs}
        </button>
      </div>
    </header>
  );
};
