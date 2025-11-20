import { useTranslation } from 'react-i18next';

function Download() {
  const { t } = useTranslation();

  return (
    <section id="download" className="download">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('download.title')}</h2>
          <p className="section-subtitle">{t('download.subtitle')}</p>
        </div>
        
        <div className="download-buttons">
          <a 
            href="https://github.com/selcukctn/localdesk/releases/latest" 
            target="_blank" 
            rel="noopener noreferrer"
            className="download-btn windows-btn"
          >
            <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3V15M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="download-btn-content">
              <span className="download-btn-label">{t('download.windows.label')}</span>
              <span className="download-btn-subtitle">{t('download.windows.subtitle')}</span>
            </div>
          </a>

          <a 
            href="https://apps.apple.com/tr/app/local-desk/id6755065498" 
            className="download-btn appstore-btn"
            target="_blank" 
          >
            <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.13997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="currentColor"/>
            </svg>
            <div className="download-btn-content">
              <span className="download-btn-label">{t('download.appstore.label')}</span>
              <span className="download-btn-subtitle">{t('download.appstore.subtitle')}</span>
            </div>
          </a>

          <a 
            href="#" 
            className="download-btn playstore-btn"
            onClick={(e) => e.preventDefault()}
          >
            <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="currentColor"/>
            </svg>
            <div className="download-btn-content">
              <span className="download-btn-label">{t('download.playstore.label')}</span>
              <span className="download-btn-subtitle">{t('download.playstore.subtitle')}</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

export default Download;

