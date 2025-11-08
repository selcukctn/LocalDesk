import { useTranslation } from 'react-i18next';

function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    {
      number: '1',
      key: 'step1'
    },
    {
      number: '2',
      key: 'step2'
    },
    {
      number: '3',
      key: 'step3'
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('howItWorks.title')}</h2>
          <p className="section-subtitle">{t('howItWorks.subtitle')}</p>
        </div>
        
        <div className="steps-container">
          {steps.map((step) => (
            <div key={step.key} className="step-card">
              <div className="step-number">{step.number}</div>
              <h3 className="step-title">{t(`howItWorks.${step.key}.title`)}</h3>
              <p className="step-description">{t(`howItWorks.${step.key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;

