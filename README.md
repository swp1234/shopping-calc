# 🌍 글로벌 쇼핑 계산기

해외직구와 여행을 위한 올인원 계산기 PWA

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-success)
![Status](https://img.shields.io/badge/status-active-success)

[데모 보기](https://swp1234.github.io/shopping-calc/) | [기능](#-주요-기능) | [사용법](#-사용-방법)

</div>

---

## 🎯 주요 기능

### 💱 환율 계산기
- **실시간 환율** - 유럽중앙은행(ECB) 기반 데이터
- **5개 주요 통화** - USD, EUR, JPY, CNY, GBP → KRW
- **자동 캐싱** - 1시간 동안 빠른 응답
- **오류 처리** - API 실패 시 명확한 경고 메시지

### 📦 관세 계산기
- **면세 기준 자동 적용** - 150달러 미만 자동 면세
- **상품별 관세율**
  - 일반/의류/신발: 13%
  - 화장품/전자제품/식품: 8%
- **부가세 자동 계산** - (상품가 + 관세) × 10%
- **총 비용 계산** - 상품가 + 배송비 + 관세 + 부가세

### 💰 팁 계산기
- **6개국 팁 문화 안내**
  - 🇺🇸 미국: 15-20%
  - 🇨🇦 캐나다: 15-20%
  - 🇬🇧 영국: 10-15%
  - 🇫🇷 프랑스: 0% (서비스 요금 포함)
  - 🇯🇵 일본: 0% (팁 문화 없음)
  - 🇨🇳 중국: 0-10%
- **인원 분할 계산** - 1인당 결제 금액 자동 계산
- **유연한 비율 조정** - 10%, 15%, 18%, 20% + 사용자 지정

---

## 🎨 디자인 특징

### 2026 Glassmorphism 트렌드
- **반투명 유리 효과** - `backdrop-filter: blur(20px)`
- **골드 그라데이션 배경** - 3단계 그라데이션
- **부드러운 애니메이션** - cubic-bezier 기반
- **대담한 타이포그래피** - 800-900 font-weight
- **프리미엄 인터랙션** - hover, focus 효과

---

## 🚀 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **API** | [ExchangeRate-API](https://www.exchangerate-api.com) (무료, KRW 지원) |
| **PWA** | Service Worker, manifest.json |
| **디자인** | Glassmorphism, 반응형 디자인 |
| **Hosting** | GitHub Pages |

---

## 📱 사용 방법

### 온라인 사용
👉 **https://swp1234.github.io/shopping-calc/**

### 모바일 설치 (PWA)
1. 위 링크를 모바일 브라우저에서 열기
2. "홈 화면에 추가" 선택
3. 오프라인에서도 사용 가능

### 로컬 실행
```bash
# 저장소 클론
git clone https://github.com/swp1234/shopping-calc.git
cd shopping-calc

# 로컬 서버 실행
python -m http.server 8001

# 브라우저에서 열기
# http://localhost:8001
```

---

## 💡 사용 예시

### 환율 계산
```
입력: 100 USD
결과: 145,196 원
환율: 1 USD = 1,451.96 KRW
```

### 관세 계산
```
상품가: $200
배송비: $20
총액: $220 (150달러 초과)
---
관세(13%): 38,896 원
부가세(10%): 33,109 원
최종 금액: 364,764 원
```

### 팁 계산
```
식사 금액: $50 (미국)
팁 비율: 18%
인원: 2명
---
팁: $9.00
총액: $59.00
1인당: $29.50
```

---

## 🔄 업데이트 내역

### v1.0.0 (2026-02-05)
- ✅ 환율 계산기 (실시간 KRW 지원)
- ✅ 관세 계산기 (면세/과세 자동 처리)
- ✅ 팁 계산기 (6개국 팁 문화)
- ✅ Glassmorphism 디자인 적용
- ✅ 에러 처리 및 경고 메시지
- ✅ PWA 지원 (모바일 설치 가능)
- ✅ 반응형 디자인 (모바일 최적화)

---

## 📂 프로젝트 구조

```
shopping-calc/
├── index.html              # 메인 HTML
├── manifest.json           # PWA 설정
├── css/
│   └── style.css          # Glassmorphism 스타일
├── js/
│   ├── app.js             # 메인 앱 로직
│   └── exchange-api.js    # 환율 API 모듈
├── test-exchange.html     # 자동 검증 테스트
└── README.md              # 프로젝트 문서
```

---

## 🧪 테스트

### 자동 검증
```
http://localhost:8001/test-exchange.html
```
- API 직접 호출 테스트
- ExchangeAPI 모듈 테스트
- 100 USD 계산 정확도 검증

---

## 📝 라이선스

MIT License - 자유롭게 사용하세요

---

## 🙏 크레딧

- **환율 데이터**: [ExchangeRate-API](https://www.exchangerate-api.com)
- **디자인 트렌드**: [2026 UI/UX Design Trends](https://www.index.dev/blog/ui-ux-design-trends)

---

<div align="center">

**Made with ❤️ for travelers and online shoppers**

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요!

</div>
