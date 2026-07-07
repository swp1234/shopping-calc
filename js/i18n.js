// i18n - Shopping Calculator

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'ja', 'es', 'pt', 'zh', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
        this.currentLang = this.detectLanguage();
        document.documentElement.lang = this.currentLang;
    }

    detectLanguage() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const urlLang = params.get('lang');
            if (urlLang && this.supportedLanguages.includes(urlLang)) return urlLang;
        } catch (error) {}

        try {
            const savedLang = localStorage.getItem('app_language');
            if (savedLang && this.supportedLanguages.includes(savedLang)) return savedLang;
        } catch (error) {}

        const browserLang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) return browserLang;

        return 'en';
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error('Translation file not found');
            this.translations[lang] = await response.json();
            return true;
        } catch (error) {
            console.error(`Failed to load ${lang} translations:`, error);
            if (lang !== 'en') return this.loadTranslations('en');
            return false;
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return key;
            }
        }

        return value || key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return false;

        if (!this.translations[lang]) await this.loadTranslations(lang);

        this.currentLang = lang;
        try { localStorage.setItem('app_language', lang); } catch (error) {}
        document.documentElement.lang = lang;

        this.updateUI();
        return true;
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        const title = this.t('app.title');
        if (title !== 'app.title') document.title = title;

        const metaDesc = document.querySelector('meta[name="description"]');
        const description = this.t('app.description');
        if (metaDesc && description !== 'app.description') {
            metaDesc.content = description;
        }

        if (typeof updateTipInfo === 'function') {
            updateTipInfo();
        }
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getSupportedLanguages() {
        return this.supportedLanguages.map(lang => ({
            code: lang,
            name: this.getLanguageName(lang)
        }));
    }

    getLanguageName(lang) {
        const names = {
            ko: 'Korean',
            en: 'English',
            ja: 'Japanese',
            es: 'Spanish',
            pt: 'Portuguese',
            zh: 'Chinese',
            id: 'Indonesian',
            tr: 'Turkish',
            de: 'German',
            fr: 'French',
            hi: 'Hindi',
            ru: 'Russian'
        };
        return names[lang] || lang;
    }
}

const i18n = new I18n();
window.i18n = i18n;
