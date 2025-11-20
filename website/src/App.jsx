import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Screenshots from './components/Screenshots';
import Download from './components/Download';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Privacy from './components/Privacy';
import './i18n';
import './styles.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentPage(hash || 'home');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="app">
      <Navbar />
      {currentPage === 'privacy' ? (
        <Privacy />
      ) : (
        <>
          <Hero />
          <Features />
          <HowItWorks />
          <Screenshots />
          <Download />
          <FAQ />
        </>
      )}
      <Footer />
    </div>
  );
}

export default App;

