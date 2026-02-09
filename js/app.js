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

        // 결과 표시 (통화에 맞게)
        const currencySymbols = { KRW: '원', USD: '$', EUR: '€', JPY: '¥' };
        const sym = currencySymbols[toCurrency] || toCurrency;
        const fracDigits = toCurrency === 'KRW' || toCurrency === 'JPY' ? 0 : 2;
        resultValue.textContent = `${convertedAmount.toLocaleString('ko-KR', {maximumFractionDigits: fracDigits})} ${sym}`;

        const rateInfo = document.getElementById('exchange-rate-info');
        rateInfo.textContent = `환율: 1 ${fromCurrency} = ${rate.toLocaleString('ko-KR', {maximumFractionDigits: 4})} ${toCurrency}`;

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
        container.innerHTML = '<p class="empty-message">아직 계산 내역이 없습니다</p>';
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
    if (confirm('모든 계산 내역을 삭제하시겠습니까?')) {
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
        closeBtn.textContent = `닫기 (${seconds})`;

        const timer = setInterval(() => {
            seconds--;
            countdown.textContent = seconds;
            closeBtn.textContent = `닫기 (${seconds})`;

            if (seconds <= 0) {
                clearInterval(timer);
                closeBtn.disabled = false;
                closeBtn.textContent = '닫기';

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
        h4_1.textContent = '💹 환율 트렌드 분석';
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
        h4_2.textContent = '📊 환전 팁';
        const ul = document.createElement('ul');
        ul.className = 'premium-tips';
        const tips = [
            '은행 창구보다 인터넷/모바일 환전이 약 50~80% 우대 적용',
            '주요 통화(USD, EUR, JPY)는 공항보다 시중 은행이 유리',
            '카드 결제 시 현지 통화(DCC 거절) 선택이 유리',
            '대금액 환전 시 환율 우대 쿠폰 활용 권장'
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
        h4_3.textContent = '🔔 환전 최적 타이밍';
        const p3 = document.createElement('p');
        p3.textContent = '일반적으로 월초와 주초에 환율이 안정적인 경향이 있습니다. 급격한 변동이 없다면 여행 2~3주 전 분할 환전을 추천합니다.';
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
        h4_c1.textContent = '📦 관세 상세 분석';
        const p_c1_1 = document.createElement('p');
        p_c1_1.textContent = `상품가: $${lastCalcData.price} | 배송비: $${lastCalcData.shipping}`;
        const p_c1_2 = document.createElement('p');
        p_c1_2.textContent = `총 과세가격: $${lastCalcData.totalUSD}`;
        const p_c1_3 = document.createElement('p');
        p_c1_3.style.color = isFree ? '#27ae60' : '#e74c3c';
        p_c1_3.style.fontWeight = '700';
        p_c1_3.textContent = isFree ? '✅ 면세 대상 (150달러 미만)' : '⚠️ 과세 대상 (150달러 이상)';
        block1.appendChild(h4_c1);
        block1.appendChild(p_c1_1);
        block1.appendChild(p_c1_2);
        block1.appendChild(p_c1_3);

        // Block 2: Tax Tips
        const block2 = document.createElement('div');
        block2.className = 'premium-section-block';
        const h4_c2 = document.createElement('h4');
        h4_c2.textContent = '💡 절세 팁';
        const ul_c = document.createElement('ul');
        ul_c.className = 'premium-tips';
        const customsTips = [
            isFree ? '현재 면세 범위 내입니다. 추가 구매 시 $150 초과 여부를 확인하세요.' : '가능하다면 주문을 나누어 건당 $150 미만으로 맞추는 것이 유리합니다.',
            'FTA 적용 국가 상품은 관세율이 달라질 수 있습니다',
            '목록통관 대상 품목은 $200까지 면세 적용됩니다',
            '화장품, 건강기능식품은 별도 수량 제한이 있을 수 있습니다'
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
        h4_c3.textContent = '📋 카테고리별 관세율 참고';
        const p_c3_1 = document.createElement('p');
        p_c3_1.textContent = '의류/신발/일반: 13% | 전자제품/화장품/식품: 8%';
        const p_c3_2 = document.createElement('p');
        p_c3_2.textContent = '※ 실제 관세율은 HS코드에 따라 다를 수 있습니다.';
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
        h4_t1.textContent = '💰 팁 상세 분석';
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
        h4_t2.textContent = '🌍 해외 팁 에티켓 가이드';
        const ul_t = document.createElement('ul');
        ul_t.className = 'premium-tips';
        const tipEtiquettes = [
            '미국/캐나다: 레스토랑 15-20%, 바 $1/음료, 택시 15%, 호텔 짐 $1-2/개',
            '유럽: 서비스료 포함이 일반적, 소액 거스름돈 남기기',
            '일본: 팁 불필요, 오히려 무례하게 느낄 수 있음',
            '동남아: 관광지 5-10%, 현지 식당은 불필요'
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
        h4_t3.textContent = '💳 결제 팁';
        const p_t3 = document.createElement('p');
        p_t3.textContent = '카드 결제 시 팁은 영수증에 직접 기재합니다. 현금 팁은 테이블 위에 놓고 나가면 됩니다.';
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
