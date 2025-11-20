import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function FAQ() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      key: 'q1',
      type: 'text'
    },
    {
      key: 'q2',
      type: 'video',
      videoId: 'dQw4w9WgXcQ' // Örnek video ID, değiştirilebilir
    },
    {
      key: 'q3',
      type: 'text'
    },
    {
      key: 'q5',
      type: 'text'
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  return (
    <section id="faq" className="faq">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('faq.title')}</h2>
          <p className="section-subtitle">{t('faq.subtitle')}</p>
        </div>
        
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div key={faq.key} className={`faq-item ${openIndex === index ? 'open' : ''}`}>
              <button 
                className="faq-question"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
              >
                <span className="faq-question-text">{t(`faq.${faq.key}.question`)}</span>
                <svg 
                  className="faq-icon" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M6 9L12 15L18 9" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="faq-answer">
                {faq.type === 'text' ? (
                  <div className="faq-answer-text">
                    {t(`faq.${faq.key}.answer`).split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="faq-answer-video">
                    <div className="video-wrapper">
                      <iframe
                        src={getYouTubeEmbedUrl(faq.videoId)}
                        title={t(`faq.${faq.key}.question`)}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;

