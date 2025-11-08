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
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false); // Menüyü kapat
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
          <div className="navbar-brand">
            <div className="logo-placeholder">LD</div>
            <span className="brand-name">Local Desk</span>
          </div>
          
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
            <a href="#home" onClick={(e) => { e.preventDefault(); scrollToSection('home'); }} className="nav-link">
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
                href="https://www.buymeacoffee.com/harunscetin" 
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
            href="https://www.buymeacoffee.com/harunscetin" 
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

