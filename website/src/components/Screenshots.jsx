import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function Screenshots() {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState(null);

  const screenshots = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImage === null) return;
      
      if (e.key === 'Escape') {
        setSelectedImage(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = screenshots.indexOf(selectedImage);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1;
        setSelectedImage(screenshots[prevIndex]);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = screenshots.indexOf(selectedImage);
        const nextIndex = currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0;
        setSelectedImage(screenshots[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, screenshots]);

  useEffect(() => {
    if (selectedImage !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  const openLightbox = (num) => {
    setSelectedImage(num);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToPrevious = (e) => {
    e.stopPropagation();
    const currentIndex = screenshots.indexOf(selectedImage);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1;
    setSelectedImage(screenshots[prevIndex]);
  };

  const goToNext = (e) => {
    e.stopPropagation();
    const currentIndex = screenshots.indexOf(selectedImage);
    const nextIndex = currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0;
    setSelectedImage(screenshots[nextIndex]);
  };

  return (
    <>
      <section id="screenshots" className="screenshots">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('screenshots.title')}</h2>
            <p className="section-subtitle">{t('screenshots.subtitle')}</p>
          </div>
          
          <div className="screenshots-grid">
            {screenshots.map((num) => (
              <div 
                key={num} 
                className="screenshot-item"
                onClick={() => openLightbox(num)}
              >
                <img 
                  src={`/image/${num}.webp`} 
                  alt={`Local Desk Screenshot ${num}`}
                  className="screenshot-image"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedImage && (
        <div className="lightbox" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label="Close">
            ×
          </button>
          <button 
            className="lightbox-nav lightbox-prev" 
            onClick={goToPrevious}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button 
            className="lightbox-nav lightbox-next" 
            onClick={goToNext}
            aria-label="Next image"
          >
            ›
          </button>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={`/image/${selectedImage}.webp`} 
              alt={`Local Desk Screenshot ${selectedImage}`}
              className="lightbox-image"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default Screenshots;

