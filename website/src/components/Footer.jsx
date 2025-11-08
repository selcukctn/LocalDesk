import { useTranslation } from 'react-i18next';

function Footer() {
  const { t } = useTranslation();

  const handlePrivacyClick = (e) => {
    e.preventDefault();
    window.location.hash = 'privacy';
    window.scrollTo(0, 0);
  };

  return (
    <footer className="footer">
      <div className="container">
        <p className="footer-text">{t('footer.copyright')}</p>
        <p className="footer-text">{t('footer.madeWith')}</p>
        <p className="footer-text">
          <a href="#privacy" onClick={handlePrivacyClick} className="footer-link">
            {t('footer.privacy')}
          </a>
        </p>
      </div>
    </footer>
  );
}

export default Footer;

