// 환율 API 모듈
// ExchangeRate-API 사용 (무료, KRW 지원)

const ExchangeAPI = {
    baseURL: 'https://open.er-api.com/v6/latest',
    cache: {},
    cacheExpiry: 3600000, // 1시간

    /**
     * 환율 정보 가져오기
     * @param {string} from - 변환할 통화 (예: USD)
     * @param {string} to - 목표 통화 (예: KRW)
     * @returns {Promise<Object>} 환율 데이터
     */
    async getRate(from, to) {
        const cacheKey = `${from}_${to}`;

        // 캐시 확인
        if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheExpiry) {
            console.log('Using cached exchange rate');
            return this.cache[cacheKey].data;
        }

        try {
            // ExchangeRate-API는 KRW를 포함한 모든 주요 통화 지원
            const response = await fetch(`${this.baseURL}/${from}`);

            if (!response.ok) {
                console.warn(`API response not OK: ${response.status}`);
                throw new Error('환율 API 응답 오류');
            }

            const data = await response.json();

            // API 에러 체크
            if (data.result === 'error') {
                console.warn('API returned error:', data);
                throw new Error(data['error-type'] || '환율 API 오류');
            }

            // 응답 형식 변환
            const convertedData = {
                base: from,
                date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                rates: {
                    [to]: data.rates[to]
                }
            };

            // 캐시 저장
            this.cache[cacheKey] = {
                data: convertedData,
                timestamp: Date.now()
            };

            console.log('✅ 실시간 환율 가져오기 성공:', convertedData);
            return convertedData;

        } catch (error) {
            console.error('❌ 실시간 환율 가져오기 실패:', error.message);
            console.warn('⚠️ 고정 환율로 대체합니다.');
            // 폴백: 고정 환율 사용
            return this.getFallbackRate(from, to);
        }
    },

    /**
     * 폴백 환율 (API 실패 시 사용)
     * 2026년 2월 5일 기준
     */
    getFallbackRate(from, to) {
        const fallbackRates = {
            'USD_KRW': 1448,
            'EUR_KRW': 1580,
            'JPY_KRW': 9.8,
            'CNY_KRW': 200,
            'GBP_KRW': 1820
        };

        const key = `${from}_${to}`;
        const rate = fallbackRates[key] || 1;

        return {
            base: from,
            date: new Date().toISOString().split('T')[0],
            rates: {
                [to]: rate
            },
            fallback: true
        };
    },

    /**
     * 지원 통화 목록
     */
    getSupportedCurrencies() {
        return {
            'USD': { name: '미국 달러', symbol: '$', flag: '🇺🇸' },
            'EUR': { name: '유로', symbol: '€', flag: '🇪🇺' },
            'JPY': { name: '일본 엔', symbol: '¥', flag: '🇯🇵' },
            'CNY': { name: '중국 위안', symbol: '¥', flag: '🇨🇳' },
            'GBP': { name: '영국 파운드', symbol: '£', flag: '🇬🇧' },
            'KRW': { name: '한국 원', symbol: '₩', flag: '🇰🇷' }
        };
    }
};
