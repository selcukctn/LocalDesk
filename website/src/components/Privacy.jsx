import { useTranslation } from 'react-i18next';

function Privacy() {
  const { t } = useTranslation();

  const goToHome = (e) => {
    e.preventDefault();
    window.location.hash = '';
    window.scrollTo(0, 0);
  };

  return (
    <section className="privacy-page">
      <div className="container">
        <div className="privacy-content">
          <a href="#home" onClick={goToHome} className="privacy-back-link">
            ← {t('nav.home')}
          </a>
          <h1 className="privacy-title">{t('privacy.title')}</h1>
          <p className="privacy-last-updated">{t('privacy.lastUpdated')}</p>
          
          <div className="privacy-section">
            <h2>{t('privacy.introduction.title')}</h2>
            <p>{t('privacy.introduction.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.dataCollection.title')}</h2>
            <p>{t('privacy.dataCollection.content')}</p>
            <ul>
              <li>{t('privacy.dataCollection.item1')}</li>
              <li>{t('privacy.dataCollection.item2')}</li>
              <li>{t('privacy.dataCollection.item3')}</li>
            </ul>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.dataUsage.title')}</h2>
            <p>{t('privacy.dataUsage.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.dataStorage.title')}</h2>
            <p>{t('privacy.dataStorage.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.dataSharing.title')}</h2>
            <p>{t('privacy.dataSharing.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.security.title')}</h2>
            <p>{t('privacy.security.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.userRights.title')}</h2>
            <p>{t('privacy.userRights.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.changes.title')}</h2>
            <p>{t('privacy.changes.content')}</p>
          </div>

          <div className="privacy-section">
            <h2>{t('privacy.contact.title')}</h2>
            <p>{t('privacy.contact.content')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Privacy;

