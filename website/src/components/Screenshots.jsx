import { useTranslation } from 'react-i18next';

function Screenshots() {
  const { t } = useTranslation();

  const screenshots = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <section id="screenshots" className="screenshots">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('screenshots.title')}</h2>
          <p className="section-subtitle">{t('screenshots.subtitle')}</p>
        </div>
        
        <div className="screenshots-grid">
          {screenshots.map((num) => (
            <div key={num} className="screenshot-placeholder">
              <div className="screenshot-content">
                <span className="screenshot-label">Screenshot {num}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Screenshots;

