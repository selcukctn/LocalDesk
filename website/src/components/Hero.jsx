import { useTranslation } from 'react-i18next';

function Hero() {
  const { t } = useTranslation();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-subtitle">{t('hero.subtitle')}</p>
        <div className="hero-cta">
          <button className="btn btn-primary" onClick={() => window.location.href = 'https://github.com/selcukctn/localdesk/releases/latest'}>
            {t('hero.download')}
          </button>
          <button className="btn btn-secondary" onClick={() => scrollToSection('features')}>
            {t('hero.learnMore')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;

