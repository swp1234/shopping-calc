// 다국어 지원 시스템 (i18n) - Shopping Calculator

class I18n {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'hi'];
    }

    // 브라우저 언어 감지
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];

        // LocalStorage에 저장된 언어 우선
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // 지원하는 언어인지 확인
        if (this.supportedLanguages.includes(langCode)) {
            return langCode;
        }

        // 기본값: 영어
        return 'en';
    }

    // 번역 데이터 로드
    async loadTranslations(lang) {
        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error('Translation file not found');
            this.translations[lang] = await response.json();
            return true;
        } catch (error) {
            console.error(`Failed to load ${lang} translations:`, error);
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
            return false;
        }
    }

    // 번역 가져오기
    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation missing for key: ${key} in ${this.currentLang}`);
                return key;
            }
        }

        return value;
    }

    // 언어 변경
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.error(`Unsupported language: ${lang}`);
            return false;
        }

        if (!this.translations[lang]) {
            await this.loadTranslations(lang);
        }

        this.currentLang = lang;
        localStorage.setItem('app_language', lang);
        document.documentElement.lang = lang;

        this.updateUI();
        return true;
    }

    // UI 전체 업데이트
    updateUI() {
        // data-i18n 속성을 가진 모든 요소 업데이트
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // data-i18n-placeholder 속성 업데이트
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // HTML title 업데이트
        document.title = this.t('app.title');

        // Meta description 업데이트
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.content = this.t('app.description');
        }

        // 팁 정보 업데이트 (팁 계산기 탭일 경우)
        if (typeof updateTipInfo === 'function') {
            updateTipInfo();
        }
    }

    // 현재 언어 가져오기
    getCurrentLanguage() {
        return this.currentLang;
    }

    // 지원 언어 목록 가져오기
    getSupportedLanguages() {
        return this.supportedLanguages.map(lang => ({
            code: lang,
            name: this.getLanguageName(lang)
        }));
    }

    // 언어 이름 가져오기
    getLanguageName(lang) {
        const names = {
            'ko': '한국어',
            'en': 'English',
            'zh': '简体中文',
            'hi': 'हिन्दी'
        };
        return names[lang] || lang;
    }
}

// 전역 인스턴스 생성
const i18n = new I18n();
