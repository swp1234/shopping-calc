// 글로벌 쇼핑 계산기 메인 앱 로직

// 히스토리 관리
let calcHistory = JSON.parse(localStorage.getItem('calc_history') || '[]');

// 다국어 지원 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // i18n 초기화
    await i18n.loadTranslations(i18n.getCurrentLanguage());
    i18n.updateUI();

    // 현재 언어 활성화 표시
    const currentLang = i18n.getCurrentLanguage();
    document.querySelector(`[data-lang="${currentLang}"]`)?.classList.add('active');

    // 언어 선택 이벤트 설정
    setupLanguageSelector();

    // 기존 기능 초기화
    setupTabs();
    updateTipInfo(); // 초기 팁 정보 표시
    renderHistory(); // 히스토리 표시
});

// 언어 선택 UI 설정
function setupLanguageSelector() {
    const langToggle = document.getElementById('lang-toggle');
    const langMenu = document.getElementById('lang-menu');
    const langOptions = document.querySelectorAll('.lang-option');

    langToggle.addEventListener('click', () => {
        langMenu.classList.toggle('hidden');
    });

    // 메뉴 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.language-selector')) {
            langMenu.classList.add('hidden');
        }
    });

    langOptions.forEach(option => {
        option.addEventListener('click', async () => {
            const lang = option.getAttribute('data-lang');
            await i18n.setLanguage(lang);

            // 활성 언어 표시
            langOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            langMenu.classList.add('hidden');

            // 히스토리 재렌더링
            renderHistory();
        });
    });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // 모든 탭 비활성화
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // 선택한 탭 활성화
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
}

// ==================== 환율 계산기 ====================

async function calculateExchange() {
    const amount = parseFloat(document.getElementById('exchange-amount').value);
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (!amount || amount <= 0) {
        alert('금액을 입력해주세요');
        return;
    }

    // 로딩 상태 표시
    const resultBox = document.getElementById('exchange-result');
    const resultValue = document.getElementById('exchange-result-value');
    resultValue.textContent = '계산 중...';
    resultBox.classList.remove('hidden');

    try {
        // API로 환율 가져오기
        const rateData = await ExchangeAPI.getRate(fromCurrency, toCurrency);
        const rate = rateData.rates[toCurrency];
        const convertedAmount = amount * rate;

        // 경고 메시지 요소
        const warningBox = document.getElementById('exchange-warning');

        // 결과 표시
        resultValue.textContent = `${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: 0})} 원`;

        const rateInfo = document.getElementById('exchange-rate-info');
        rateInfo.textContent = `환율: 1 ${fromCurrency} = ${rate.toLocaleString('ko-KR', {maximumFractionDigits: 2})} ${toCurrency}`;

        const timestamp = document.getElementById('exchange-timestamp');
        timestamp.textContent = `기준일: ${rateData.date}`;

        // 폴백 환율 사용 시 경고 표시
        if (rateData.fallback) {
            warningBox.classList.remove('hidden');
            console.warn('Fallback rate used:', rateData);
        } else {
            warningBox.classList.add('hidden');
        }

        // 히스토리 저장
        addToHistory('환율', `${fromCurrency} → ${toCurrency}`, `${amount} ${fromCurrency} = ${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: 0})} 원`);

    } catch (error) {
        console.error('Exchange calculation error:', error);
        resultValue.textContent = '❌ 오류 발생';

        const warningBox = document.getElementById('exchange-warning');
        warningBox.classList.remove('hidden');
        warningBox.className = 'result-error';
        warningBox.textContent = '⚠️ 환율 정보를 가져올 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
    }
}

// ==================== 관세 계산기 ====================

async function calculateCustoms() {
    const productPrice = parseFloat(document.getElementById('product-price').value);
    const shippingCost = parseFloat(document.getElementById('shipping-cost').value);
    const category = document.getElementById('product-category').value;

    if (!productPrice || productPrice <= 0) {
        alert('상품 가격을 입력해주세요');
        return;
    }

    // 관세율 정보
    const customsRates = {
        'general': 0.13,
        'clothes': 0.13,
        'shoes': 0.13,
        'cosmetics': 0.08,
        'electronics': 0.08,
        'food': 0.08
    };

    const customsRate = customsRates[category] || 0.13;
    const totalUSD = productPrice + (shippingCost || 0);

    // USD -> KRW 환율 가져오기
    try {
        const rateData = await ExchangeAPI.getRate('USD', 'KRW');
        const exchangeRate = rateData.rates.KRW;
        const totalKRW = totalUSD * exchangeRate;

        // 면세 기준 확인 (150달러 미만)
        const dutyFreeLimit = 150;
        let customsDuty = 0;
        let vat = 0;
        let finalTotal = totalKRW;

        if (totalUSD >= dutyFreeLimit) {
            // 관세 계산
            customsDuty = totalKRW * customsRate;
            // 부가세 계산 (상품가 + 관세의 10%)
            vat = (totalKRW + customsDuty) * 0.10;
            finalTotal = totalKRW + customsDuty + vat;
        } else {
            // 면세
            customsDuty = 0;
            vat = 0;
            finalTotal = totalKRW;
        }

        // 결과 표시
        document.getElementById('customs-total-value').textContent =
            `${Math.round(finalTotal).toLocaleString('ko-KR')} 원`;

        document.getElementById('customs-base').textContent =
            `${Math.round(totalKRW).toLocaleString('ko-KR')} 원`;

        document.getElementById('customs-rate').textContent =
            `${(customsRate * 100)}%`;

        document.getElementById('customs-duty').textContent =
            `${Math.round(customsDuty).toLocaleString('ko-KR')} 원`;

        document.getElementById('customs-vat').textContent =
            `${Math.round(vat).toLocaleString('ko-KR')} 원`;

        document.getElementById('customs-result').classList.remove('hidden');

        // 히스토리 저장
        const categorySelect = document.getElementById('product-category');
        const category = categorySelect.options[categorySelect.selectedIndex].text;
        addToHistory('관세', `${category} 관세 계산`, `총 비용: ${Math.round(totalCost).toLocaleString('ko-KR')} 원`);

    } catch (error) {
        console.error('Customs calculation error:', error);
        alert('관세 계산 중 오류가 발생했습니다.');
    }
}

// ==================== 팁 계산기 ====================

// 팁 문화 정보
const tipCultures = {
    'USA': {
        name: '미국',
        defaultRate: 15,
        info: '15-20%가 일반적이며, 좋은 서비스는 20% 이상 권장',
        currency: 'USD',
        symbol: '$'
    },
    'CAN': {
        name: '캐나다',
        defaultRate: 15,
        info: '15-20%가 표준이며, 서비스에 따라 조정',
        currency: 'CAD',
        symbol: '$'
    },
    'GBR': {
        name: '영국',
        defaultRate: 10,
        info: '10-15%가 일반적이며, 서비스 요금 포함 여부 확인 필요',
        currency: 'GBP',
        symbol: '£'
    },
    'FRA': {
        name: '프랑스',
        defaultRate: 0,
        info: '서비스 요금이 계산서에 포함되어 있으므로 추가 팁은 선택사항',
        currency: 'EUR',
        symbol: '€'
    },
    'JPN': {
        name: '일본',
        defaultRate: 0,
        info: '팁 문화가 없으며, 팁을 주면 오히려 무례할 수 있음',
        currency: 'JPY',
        symbol: '¥'
    },
    'CHN': {
        name: '중국',
        defaultRate: 0,
        info: '대부분 팁이 필요 없으나, 고급 레스토랑에서는 10% 정도 가능',
        currency: 'CNY',
        symbol: '¥'
    }
};

function updateTipInfo() {
    const country = document.getElementById('tip-country').value;
    const culture = tipCultures[country];

    if (culture) {
        document.getElementById('tip-info').innerHTML =
            `<strong>${culture.name} 팁 문화:</strong> ${culture.info}`;

        // 기본 팁 비율 설정
        document.getElementById('tip-percentage').value = culture.defaultRate;
        selectTip(culture.defaultRate);
    }
}

function selectTip(percentage) {
    // 모든 팁 버튼 비활성화
    document.querySelectorAll('.tip-btn').forEach(btn => btn.classList.remove('active'));

    // 선택한 버튼 활성화
    const buttons = document.querySelectorAll('.tip-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes(`${percentage}%`)) {
            btn.classList.add('active');
        }
    });

    // 입력 필드 업데이트
    document.getElementById('tip-percentage').value = percentage;
}

function calculateTip() {
    const mealAmount = parseFloat(document.getElementById('meal-amount').value);
    const tipPercentage = parseFloat(document.getElementById('tip-percentage').value);
    const partySize = parseInt(document.getElementById('party-size').value);
    const country = document.getElementById('tip-country').value;
    const culture = tipCultures[country];

    if (!mealAmount || mealAmount <= 0) {
        alert('식사 금액을 입력해주세요');
        return;
    }

    if (!partySize || partySize <= 0) {
        alert('인원 수를 입력해주세요');
        return;
    }

    // 팁 계산
    const tipAmount = mealAmount * (tipPercentage / 100);
    const totalAmount = mealAmount + tipAmount;
    const perPersonAmount = totalAmount / partySize;

    // 결과 표시
    const symbol = culture.symbol;
    document.getElementById('tip-total-value').textContent =
        `${symbol}${totalAmount.toFixed(2)}`;

    document.getElementById('tip-meal').textContent =
        `${symbol}${mealAmount.toFixed(2)}`;

    document.getElementById('tip-rate').textContent =
        `${tipPercentage}%`;

    document.getElementById('tip-amount').textContent =
        `${symbol}${tipAmount.toFixed(2)}`;

    document.getElementById('tip-per-person').textContent =
        `${symbol}${perPersonAmount.toFixed(2)}`;

    document.getElementById('tip-result').classList.remove('hidden');

    // 히스토리 저장
    addToHistory('팁', `${country} 팁 계산`, `식사: ${symbol}${mealAmount} + 팁: ${symbol}${tipAmount.toFixed(2)} = ${symbol}${totalAmount.toFixed(2)}`);
}

// ==================== 히스토리 관리 ====================

function addToHistory(type, title, result) {
    const historyItem = {
        type: type,
        title: title,
        result: result,
        timestamp: new Date().toLocaleString('ko-KR')
    };

    calcHistory.unshift(historyItem);

    // 최근 10개만 유지
    if (calcHistory.length > 10) {
        calcHistory = calcHistory.slice(0, 10);
    }

    localStorage.setItem('calc_history', JSON.stringify(calcHistory));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('calc-history');

    if (calcHistory.length === 0) {
        container.innerHTML = '<p class="empty-message">아직 계산 내역이 없습니다</p>';
        return;
    }

    let html = '';
    calcHistory.forEach((item, index) => {
        const typeEmoji = item.type === '환율' ? '💱' : item.type === '관세' ? '📦' : '💰';
        html += `
            <div class="history-item" style="animation-delay: ${index * 0.05}s">
                <div class="history-header">
                    <span class="history-type">${typeEmoji} ${item.type}</span>
                    <span class="history-time">${item.timestamp}</span>
                </div>
                <div class="history-title">${item.title}</div>
                <div class="history-result">${item.result}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function clearHistory() {
    if (confirm('모든 계산 내역을 삭제하시겠습니까?')) {
        calcHistory = [];
        localStorage.setItem('calc_history', JSON.stringify(calcHistory));
        renderHistory();
    }
}

// PWA 설치 프롬프트
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt ready');
});
