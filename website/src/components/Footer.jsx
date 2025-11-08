import { useTranslation } from 'react-i18next';

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="container">
        <p className="footer-text">{t('footer.copyright')}</p>
        <p className="footer-text">{t('footer.madeWith')}</p>
      </div>
    </footer>
  );
}

export default Footer;

