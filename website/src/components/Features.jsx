import { useTranslation } from 'react-i18next';

function Features() {
  const { t } = useTranslation();

  const features = [
    {
      key: 'noDevice',
      icon: '📱'
    },
    {
      key: 'oneTap',
      icon: '👆'
    },
    {
      key: 'customPages',
      icon: '📄'
    },
    {
      key: 'instant',
      icon: '⚡'
    },
    {
      key: 'gaming',
      icon: '🎮'
    },
    {
      key: 'stream',
      icon: '📺'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('features.title')}</h2>
          <p className="section-subtitle">{t('features.subtitle')}</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.key} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{t(`features.${feature.key}.title`)}</h3>
              <p className="feature-description">{t(`features.${feature.key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;

