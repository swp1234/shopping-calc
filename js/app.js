// 글로벌 쇼핑 계산기 메인 앱 로직

// 히스토리 관리
let calcHistory;
try { calcHistory = JSON.parse(localStorage.getItem('calc_history') || '[]'); } catch(e) { calcHistory = []; }

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

    // Hide app loader
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }
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

// ==================== 통화 스왑 ====================

function swapCurrencies() {
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');
    const fromVal = fromSelect.value;
    const toVal = toSelect.value;

    // Check if the target value exists in each select
    const fromHasTo = Array.from(fromSelect.options).some(o => o.value === toVal);
    const toHasFrom = Array.from(toSelect.options).some(o => o.value === fromVal);

    if (fromHasTo && toHasFrom) {
        fromSelect.value = toVal;
        toSelect.value = fromVal;
    }
}

// ==================== 실시간 입력 계산 ====================

document.addEventListener('DOMContentLoaded', () => {
    const amountInput = document.getElementById('exchange-amount');
    const fromSelect = document.getElementById('from-currency');
    const toSelect = document.getElementById('to-currency');

    let debounceTimer;
    function debouncedCalc() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const val = parseFloat(amountInput.value);
            if (val > 0) calculateExchange();
        }, 500);
    }

    amountInput.addEventListener('input', debouncedCalc);
    fromSelect.addEventListener('change', debouncedCalc);
    toSelect.addEventListener('change', debouncedCalc);
});

// ==================== 환율 계산기 ====================

async function calculateExchange() {
    const amount = parseFloat(document.getElementById('exchange-amount').value);
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (!amount || amount <= 0) {
        alert(window.i18n?.t('exchange.alertNoAmount') || 'Please enter an amount');
        return;
    }

    // 로딩 상태 표시
    const resultBox = document.getElementById('exchange-result');
    const resultValue = document.getElementById('exchange-result-value');
    resultValue.textContent = window.i18n?.t('exchange.calculating') || 'Calculating...';
    resultBox.classList.remove('hidden');

    try {
        // API로 환율 가져오기
        const rateData = await ExchangeAPI.getRate(fromCurrency, toCurrency);
        const rate = rateData.rates[toCurrency];
        const convertedAmount = amount * rate;

        // 경고 메시지 요소
        const warningBox = document.getElementById('exchange-warning');

        // 결과 표시 (통화에 맞게)
        const currencySymbols = { KRW: '원', USD: '$', EUR: '€', JPY: '¥' };
        const sym = currencySymbols[toCurrency] || toCurrency;
        const fracDigits = toCurrency === 'KRW' || toCurrency === 'JPY' ? 0 : 2;
        resultValue.textContent = `${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: fracDigits})} ${sym}`;

        const rateInfo = document.getElementById('exchange-rate-info');
        const rateLabel = window.i18n?.t('exchange.rateLabel') || 'Exchange Rate:';
        rateInfo.textContent = `${rateLabel} 1 ${fromCurrency} = ${rate.toLocaleString('ko-KR', {maximumFractionDigits: 4})} ${toCurrency}`;

        const timestamp = document.getElementById('exchange-timestamp');
        const baseDateLabel = window.i18n?.t('exchange.baseDateLabel') || 'As of:';
        timestamp.textContent = `${baseDateLabel} ${rateData.date}`;

        // 폴백 환율 사용 시 경고 표시
        if (rateData.fallback) {
            warningBox.classList.remove('hidden');
            console.warn('Fallback rate used:', rateData);
        } else {
            warningBox.classList.add('hidden');
        }

        // 히스토리 저장
        addToHistory('환율', `${fromCurrency} → ${toCurrency}`, `${amount} ${fromCurrency} = ${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: 0})} 원`);

        // 프리미엄 섹션 표시
        showPremiumSection('exchange', {
            from: fromCurrency,
            to: toCurrency,
            amount: amount,
            rate: rate.toLocaleString('ko-KR', {maximumFractionDigits: 2}),
            result: `${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: 0})} 원`
        });

    } catch (error) {
        console.error('Exchange calculation error:', error);
        resultValue.textContent = window.i18n?.t('exchange.error') || '❌ Error Occurred';

        const warningBox = document.getElementById('exchange-warning');
        warningBox.classList.remove('hidden');
        warningBox.className = 'result-error';
        warningBox.textContent = window.i18n?.t('exchange.warningMessage') || '⚠️ Unable to fetch exchange rate data. Please check your internet connection and try again.';
    }
}

// ==================== 관세 계산기 ====================

async function calculateCustoms() {
    const productPrice = parseFloat(document.getElementById('product-price').value);
    const shippingCost = parseFloat(document.getElementById('shipping-cost').value);
    const category = document.getElementById('product-category').value;

    if (!productPrice || productPrice <= 0) {
        alert(window.i18n?.t('customs.alertNoPrice') || 'Please enter a product price');
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
        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        addToHistory('관세', `${categoryName} 관세 계산`, `총 비용: ${Math.round(finalTotal).toLocaleString('ko-KR')} 원`);

        // 프리미엄 섹션 표시
        showPremiumSection('customs', {
            price: productPrice,
            shipping: shippingCost || 0,
            totalUSD: totalUSD,
            finalTotal: Math.round(finalTotal)
        });

    } catch (error) {
        console.error('Customs calculation error:', error);
        alert(window.i18n?.t('customs.alertError') || 'An error occurred while calculating customs.');
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
        const tipInfoEl = document.getElementById('tip-info');
        tipInfoEl.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = `${culture.name} 팁 문화: `;
        const span = document.createElement('span');
        span.textContent = culture.info;
        tipInfoEl.appendChild(strong);
        tipInfoEl.appendChild(span);

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
        alert(window.i18n?.t('tip.alertNoMeal') || 'Please enter a meal amount');
        return;
    }

    if (!partySize || partySize <= 0) {
        alert(window.i18n?.t('tip.alertNoPartySize') || 'Please enter the party size');
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

    // 프리미엄 섹션 표시
    showPremiumSection('tip', {
        country: culture.name,
        symbol: symbol,
        meal: mealAmount.toFixed(2),
        tip: tipAmount.toFixed(2),
        rate: tipPercentage,
        total: totalAmount.toFixed(2)
    });
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
        const emptyMsg = window.i18n?.t('history.empty') || 'No calculation history yet';
        container.innerHTML = `<p class="empty-message">${emptyMsg}</p>`;
        return;
    }

    container.innerHTML = '';
    calcHistory.forEach((item, index) => {
        const typeEmoji = item.type === '환율' ? '💱' : item.type === '관세' ? '📦' : '💰';

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.style.animationDelay = `${index * 0.05}s`;

        const header = document.createElement('div');
        header.className = 'history-header';

        const typeSpan = document.createElement('span');
        typeSpan.className = 'history-type';
        typeSpan.textContent = `${typeEmoji} ${item.type}`;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'history-time';
        timeSpan.textContent = item.timestamp;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'history-title';
        titleDiv.textContent = item.title;

        const resultDiv = document.createElement('div');
        resultDiv.className = 'history-result';
        resultDiv.textContent = item.result;

        header.appendChild(typeSpan);
        header.appendChild(timeSpan);

        historyItem.appendChild(header);
        historyItem.appendChild(titleDiv);
        historyItem.appendChild(resultDiv);

        container.appendChild(historyItem);
    });
}

function clearHistory() {
    const confirmMsg = window.i18n?.t('history.clearConfirm') || 'Are you sure you want to delete all calculation history?';
    if (confirm(confirmMsg)) {
        calcHistory = [];
        localStorage.setItem('calc_history', JSON.stringify(calcHistory));
        renderHistory();
    }
}

// ==================== 전면 광고 ====================

function showInterstitialAd() {
    return new Promise((resolve) => {
        const adOverlay = document.getElementById('interstitial-ad');
        const closeBtn = document.getElementById('close-ad');
        const countdown = document.getElementById('countdown');

        adOverlay.classList.remove('hidden');
        closeBtn.disabled = true;

        let seconds = 5;
        countdown.textContent = seconds;
        const closeLabel = window.i18n?.t('ads.closeBtn') || 'Close';
        closeBtn.textContent = `${closeLabel} (${seconds})`;

        const timer = setInterval(() => {
            seconds--;
            countdown.textContent = seconds;
            closeBtn.textContent = `${closeLabel} (${seconds})`;

            if (seconds <= 0) {
                clearInterval(timer);
                closeBtn.disabled = false;
                closeBtn.textContent = closeLabel;

                closeBtn.onclick = () => {
                    adOverlay.classList.add('hidden');
                    closeBtn.textContent = '닫기 (5)';
                    resolve();
                };
            }
        }, 1000);
    });
}

// ==================== 프리미엄 콘텐츠 ====================

let lastCalcType = '';
let lastCalcData = {};

function showPremiumSection(type, data) {
    lastCalcType = type;
    lastCalcData = data;
    document.getElementById('premium-section').style.display = 'block';
}

function generatePremiumContent() {
    const container = document.createElement('div');

    if (lastCalcType === 'exchange') {
        const analysis = document.createElement('div');
        analysis.className = 'premium-analysis';

        // Block 1: Rate Analysis
        const block1 = document.createElement('div');
        block1.className = 'premium-section-block';
        const h4_1 = document.createElement('h4');
        h4_1.textContent = window.i18n?.t('premium.exchangeAnalysis') || '💹 Exchange Rate Trend Analysis';
        const p1_1 = document.createElement('p');
        p1_1.textContent = `현재 ${lastCalcData.from} → ${lastCalcData.to} 환율: ${lastCalcData.rate}`;
        const p1_2 = document.createElement('p');
        p1_2.textContent = `변환 금액: ${lastCalcData.amount} ${lastCalcData.from} = ${lastCalcData.result}`;
        block1.appendChild(h4_1);
        block1.appendChild(p1_1);
        block1.appendChild(p1_2);

        // Block 2: Tips
        const block2 = document.createElement('div');
        block2.className = 'premium-section-block';
        const h4_2 = document.createElement('h4');
        h4_2.textContent = window.i18n?.t('premium.exchangeTips') || '📊 Exchange Tips';
        const ul = document.createElement('ul');
        ul.className = 'premium-tips';
        const tips = [
            window.i18n?.t('premium.exchangeTip1') || 'Internet/mobile exchanges offer 50-80% better rates than bank counters',
            window.i18n?.t('premium.exchangeTip2') || 'Major currencies (USD, EUR, JPY) are more favorable at local banks than airports',
            window.i18n?.t('premium.exchangeTip3') || 'When paying by card, choose local currency (decline DCC) for better rates',
            window.i18n?.t('premium.exchangeTip4') || 'For large amounts, use exchange rate coupons for better deals'
        ];
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            ul.appendChild(li);
        });
        block2.appendChild(h4_2);
        block2.appendChild(ul);

        // Block 3: Timing
        const block3 = document.createElement('div');
        block3.className = 'premium-section-block';
        const h4_3 = document.createElement('h4');
        h4_3.textContent = window.i18n?.t('premium.exchangeTiming') || '🔔 Optimal Exchange Timing';
        const p3 = document.createElement('p');
        p3.textContent = window.i18n?.t('premium.exchangeTimingText') || 'Exchange rates tend to be stable at the beginning of months and weeks. If there are no drastic fluctuations, split exchanges 2-3 weeks before your trip are recommended.';
        block3.appendChild(h4_3);
        block3.appendChild(p3);

        analysis.appendChild(block1);
        analysis.appendChild(block2);
        analysis.appendChild(block3);
        container.appendChild(analysis);
    } else if (lastCalcType === 'customs') {
        const isFree = lastCalcData.totalUSD < 150;
        const analysis = document.createElement('div');
        analysis.className = 'premium-analysis';

        // Block 1: Analysis
        const block1 = document.createElement('div');
        block1.className = 'premium-section-block';
        const h4_c1 = document.createElement('h4');
        h4_c1.textContent = window.i18n?.t('premium.customsAnalysis') || '📦 Detailed Customs Analysis';
        const p_c1_1 = document.createElement('p');
        p_c1_1.textContent = `상품가: $${lastCalcData.price} | 배송비: $${lastCalcData.shipping}`;
        const p_c1_2 = document.createElement('p');
        p_c1_2.textContent = `총 과세가격: $${lastCalcData.totalUSD}`;
        const p_c1_3 = document.createElement('p');
        p_c1_3.style.color = isFree ? '#27ae60' : '#e74c3c';
        p_c1_3.style.fontWeight = '700';
        p_c1_3.textContent = isFree ? (window.i18n?.t('premium.dutyfreeTarget') || '✅ Duty-free (Under $150)') : (window.i18n?.t('premium.dutySubject') || '⚠️ Subject to Duty (Over $150)');
        block1.appendChild(h4_c1);
        block1.appendChild(p_c1_1);
        block1.appendChild(p_c1_2);
        block1.appendChild(p_c1_3);

        // Block 2: Tax Tips
        const block2 = document.createElement('div');
        block2.className = 'premium-section-block';
        const h4_c2 = document.createElement('h4');
        h4_c2.textContent = window.i18n?.t('premium.customsTaxTips') || '💡 Tax Saving Tips';
        const ul_c = document.createElement('ul');
        ul_c.className = 'premium-tips';
        const customsTips = [
            isFree ? (window.i18n?.t('premium.customsTip1') || 'Currently within duty-free range. Verify when making additional purchases.') : (window.i18n?.t('premium.customsTip1Alternative') || 'If possible, split orders to stay under $150 per order to avoid duties.'),
            window.i18n?.t('premium.customsTip2') || 'Products from FTA countries may have different customs rates',
            window.i18n?.t('premium.customsTip3') || 'Listed clearance items are duty-free up to $200',
            window.i18n?.t('premium.customsTip4') || 'Cosmetics and supplements may have additional quantity restrictions'
        ];
        customsTips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            ul_c.appendChild(li);
        });
        block2.appendChild(h4_c2);
        block2.appendChild(ul_c);

        // Block 3: Reference
        const block3 = document.createElement('div');
        block3.className = 'premium-section-block';
        const h4_c3 = document.createElement('h4');
        h4_c3.textContent = window.i18n?.t('premium.customsReference') || '📋 Customs Rate by Category';
        const p_c3_1 = document.createElement('p');
        p_c3_1.textContent = window.i18n?.t('premium.customsRateRef') || 'Clothing/Shoes/General: 13% | Electronics/Cosmetics/Food: 8%';
        const p_c3_2 = document.createElement('p');
        p_c3_2.textContent = window.i18n?.t('premium.customsRateNote') || '※ Actual customs rates may vary depending on HS code.';
        block3.appendChild(h4_c3);
        block3.appendChild(p_c3_1);
        block3.appendChild(p_c3_2);

        analysis.appendChild(block1);
        analysis.appendChild(block2);
        analysis.appendChild(block3);
        container.appendChild(analysis);
    } else if (lastCalcType === 'tip') {
        const analysis = document.createElement('div');
        analysis.className = 'premium-analysis';

        // Block 1: Analysis
        const block1 = document.createElement('div');
        block1.className = 'premium-section-block';
        const h4_t1 = document.createElement('h4');
        h4_t1.textContent = window.i18n?.t('premium.tipAnalysis') || '💰 Detailed Tip Analysis';
        const p_t1_1 = document.createElement('p');
        p_t1_1.textContent = `국가: ${lastCalcData.country} | 식사금액: ${lastCalcData.symbol}${lastCalcData.meal}`;
        const p_t1_2 = document.createElement('p');
        p_t1_2.textContent = `팁: ${lastCalcData.symbol}${lastCalcData.tip} (${lastCalcData.rate}%)`;
        block1.appendChild(h4_t1);
        block1.appendChild(p_t1_1);
        block1.appendChild(p_t1_2);

        // Block 2: Etiquette
        const block2 = document.createElement('div');
        block2.className = 'premium-section-block';
        const h4_t2 = document.createElement('h4');
        h4_t2.textContent = window.i18n?.t('premium.tipEtiquette') || '🌍 International Tipping Etiquette Guide';
        const ul_t = document.createElement('ul');
        ul_t.className = 'premium-tips';
        const tipEtiquettes = [
            window.i18n?.t('premium.tipEtiquette1') || 'USA/Canada: Restaurant 15-20%, Bar $1/drink, Taxi 15%, Hotel staff $1-2/bag',
            window.i18n?.t('premium.tipEtiquette2') || 'Europe: Service charge typically included, leave small change',
            window.i18n?.t('premium.tipEtiquette3') || 'Japan: Tipping not necessary, may be considered rude',
            window.i18n?.t('premium.tipEtiquette4') || 'Southeast Asia: Tourist areas 5-10%, local restaurants not required'
        ];
        tipEtiquettes.forEach(etiquette => {
            const li = document.createElement('li');
            li.textContent = etiquette;
            ul_t.appendChild(li);
        });
        block2.appendChild(h4_t2);
        block2.appendChild(ul_t);

        // Block 3: Payment
        const block3 = document.createElement('div');
        block3.className = 'premium-section-block';
        const h4_t3 = document.createElement('h4');
        h4_t3.textContent = window.i18n?.t('premium.tipPayment') || '💳 Payment Tips';
        const p_t3 = document.createElement('p');
        p_t3.textContent = window.i18n?.t('premium.tipPaymentText') || 'For card payments, write the tip amount directly on the receipt. For cash, leave it on the table when you leave.';
        block3.appendChild(h4_t3);
        block3.appendChild(p_t3);

        analysis.appendChild(block1);
        analysis.appendChild(block2);
        analysis.appendChild(block3);
        container.appendChild(analysis);
    }

    return container;
}

function showPremiumAnalysis() {
    showInterstitialAd().then(() => {
        const premiumModal = document.getElementById('premium-modal');
        const premiumBody = document.getElementById('premium-body');
        premiumBody.innerHTML = '';
        const content = generatePremiumContent();
        premiumBody.appendChild(content);
        premiumModal.classList.remove('hidden');
    });
}

// ==================== Service Worker ====================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(err => console.log('SW registration failed:', err));
    }
}

// ==================== PWA & 이벤트 ====================

// PWA 설치 프롬프트
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt ready');
});

// 프리미엄 및 SW 초기화
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();

    document.getElementById('premium-analysis-btn').addEventListener('click', showPremiumAnalysis);

    document.getElementById('premium-close').addEventListener('click', () => {
        document.getElementById('premium-modal').classList.add('hidden');
    });
});
