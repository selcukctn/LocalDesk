import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function Navbar() {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Menü açıkken body scroll'unu engelleme - içerik scroll edilebilir kalacak
    // Sadece menü overlay olarak görünecek
  }, [isMenuOpen]);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const scrollToSection = (sectionId) => {
    setIsMenuOpen(false); // Menüyü kapat
    
    // Eğer privacy sayfasındaysak, önce ana sayfaya dön
    if (window.location.hash === '#privacy') {
      window.location.hash = '';
      // Ana sayfa yüklendikten sonra ilgili bölüme scroll yap
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Zaten ana sayfadaysak, direkt scroll yap
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const goToPrivacy = (e) => {
    e.preventDefault();
    window.location.hash = 'privacy';
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const goToHome = (e) => {
    e.preventDefault();
    setIsMenuOpen(false);
    // Hash'i temizle ve ana sayfaya dön
    if (window.location.hash) {
      window.location.hash = '';
      // Hashchange event'ini tetiklemek için kısa bir gecikme
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 0);
    } else {
      // Zaten ana sayfadaysak, scroll yap
      const homeElement = document.getElementById('home');
      if (homeElement) {
        homeElement.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}
      <nav className="navbar">
        <div className="navbar-container">
          <a href="#home" onClick={goToHome} className="navbar-brand">
            <img src="/favicons/favicon.svg" alt="Local Desk" className="navbar-logo" />
            <span className="brand-name">Local Desk</span>
          </a>
          
          <button 
            className="hamburger-menu"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
          
          <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
            <a href="#home" onClick={(e) => { e.preventDefault(); goToHome(e); }} className="nav-link">
              {t('nav.home')}
            </a>
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="nav-link">
              {t('nav.features')}
            </a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="nav-link">
              {t('nav.howItWorks')}
            </a>
            <a href="#screenshots" onClick={(e) => { e.preventDefault(); scrollToSection('screenshots'); }} className="nav-link">
              {t('nav.screenshots')}
            </a>
            
            <div className="mobile-menu-actions">
              <div className="language-switcher">
                <button 
                  className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => changeLanguage('en')}
                >
                  EN
                </button>
                <button 
                  className={`lang-btn ${i18n.language === 'tr' ? 'active' : ''}`}
                  onClick={() => changeLanguage('tr')}
                >
                  TR
                </button>
                <button 
                  className={`lang-btn ${i18n.language === 'de' ? 'active' : ''}`}
                  onClick={() => changeLanguage('de')}
                >
                  DE
                </button>
              </div>
              
              <a 
                href="https://buymeacoffee.com/harunselcukcetin" 
                target="_blank" 
                rel="noopener noreferrer"
                className="buy-coffee-btn"
              >
                <img src="/image/buymecoffee.png" alt="Buy Me a Coffee" className="coffee-icon" />
                <span>Buy me a coffee</span>
              </a>
            </div>
          </div>

        <div className="navbar-actions">
          <div className="language-switcher">
            <button 
              className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
            <button 
              className={`lang-btn ${i18n.language === 'tr' ? 'active' : ''}`}
              onClick={() => changeLanguage('tr')}
            >
              TR
            </button>
            <button 
              className={`lang-btn ${i18n.language === 'de' ? 'active' : ''}`}
              onClick={() => changeLanguage('de')}
            >
              DE
            </button>
          </div>
          
          <a 
            href="https://buymeacoffee.com/harunselcukcetin" 
            target="_blank" 
            rel="noopener noreferrer"
            className="buy-coffee-btn"
          >
            <img src="/image/buymecoffee.png" alt="Buy Me a Coffee" className="coffee-icon" />
            <span>Buy me a coffee</span>
          </a>
        </div>
      </div>
    </nav>
    </>
  );
}

export default Navbar;

