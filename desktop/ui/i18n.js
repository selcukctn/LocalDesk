/**
 * i18n - Internationalization Module
 * Supports: English (en), German (de), Turkish (tr)
 */

let currentLanguage = 'en'; // Default language
let translations = {};

// Available languages
const availableLanguages = {
    'en': 'English',
    'de': 'Deutsch',
    'tr': 'Türkçe'
};

/**
 * Load translation file
 */
async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load ${lang}.json`);
        }
        translations = await response.json();
        currentLanguage = lang;
        
        // Save to localStorage
        localStorage.setItem('localDeskLanguage', lang);
        
        return true;
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        // Fallback to English if current language fails
        if (lang !== 'en') {
            return await loadTranslations('en');
        }
        return false;
    }
}

/**
 * Get translation by key path (e.g., 'tabs.shortcuts')
 */
function t(key, params = {}) {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`Translation key not found: ${key}`);
            return key; // Return key if translation not found
        }
    }
    
    // Replace parameters in string (e.g., {name} -> actual name)
    if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
    
    return value || key;
}

/**
 * Initialize i18n - load saved language or default to English
 */
async function initI18n() {
    const savedLanguage = localStorage.getItem('localDeskLanguage') || 'en';
    await loadTranslations(savedLanguage);
    return currentLanguage;
}

/**
 * Change language
 */
async function changeLanguage(lang) {
    if (!availableLanguages[lang]) {
        console.error(`Language ${lang} is not available`);
        return false;
    }
    
    const success = await loadTranslations(lang);
    if (success) {
        // Update all UI elements
        updateUI();
        return true;
    }
    return false;
}

/**
 * Get current language
 */
function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * Get available languages
 */
function getAvailableLanguages() {
    return availableLanguages;
}

/**
 * Update all UI elements with translations
 */
function updateUI() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        
        if (element.tagName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') {
            // For input placeholders
            if (element.hasAttribute('data-i18n-placeholder')) {
                // Don't update value, just placeholder
            } else {
                element.value = translation;
            }
        } else if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button')) {
            element.value = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
    
    // Update elements with data-i18n-html attribute (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        element.innerHTML = t(key);
    });
    
    // Update page title
    document.title = `${t('app.title')} - ${t('app.subtitle')}`;
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage;
}

// Export for use in other scripts
window.i18n = {
    t,
    initI18n,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    updateUI
};

