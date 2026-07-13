# 🤝 나에게 맞는 복지 찾기 — 맞춤형 복지 추천 웹사이트

**몇 가지 쉬운 질문에 답하면, 53개 정부·지자체 복지 서비스 중에서 나에게 맞는 것을 찾아 신청 방법과 공식 링크까지 안내해 주는 웹사이트**입니다.

- 📋 8단계 쉬운 질문 (나이 → 지역 → 가족 → 소득 → 장애 → 상황 → 관심분야 → 확인)
- 🎯 나이·소득·장애·상황을 모두 반영한 점수 기반 맞춤 매칭
- 💡 "왜 추천하는지" 설명 제공 (AI 연동 시 더 자연스러운 설명)
- 🔗 결과 카드에서 바로 공식 사이트로 이동해 신청 가능
- ♿ 접근성: 글자 크기 3단계, 고대비 모드, 읽어주기(TTS) 지원
- 📱 휴대폰·태블릿·PC 모두 지원 (반응형)

---

## 1. 바로 써보기 (라이브 링크)

> 🔗 **배포 후 여기에 링크를 적어 주세요.**
> 예: `https://<사용자명>.github.io/<저장소명>/` 또는 `https://<사이트이름>.netlify.app`

배포 방법은 아래 [4. 배포 방법](#4-배포-방법-링크만-누르면-되게)을 그대로 따라 하면 됩니다.

---

## 2. 이 폴더에 뭐가 들어있나요? (파일 구조)

| 파일 | 역할 |
|---|---|
| `index.html` | 웹사이트의 뼈대. 브라우저에서 여는 메인 페이지 |
| `style.css` | 디자인(색, 글자, 버튼 모양). 고대비 모드 스타일 포함 |
| `app.js` | 핵심 두뇌. 질문 진행 + 매칭 계산 + 결과 화면 + AI 설명 |
| `welfare_data.json` | 복지 서비스 53개 데이터 (여기를 고치면 내용이 바뀜) |
| `netlify/functions/explain.js` | (선택) AI 설명을 만들어 주는 서버 함수 — Netlify 배포 시에만 동작 |
| `netlify.toml` | Netlify 배포 설정 파일 |
| `README.md` | 지금 읽고 있는 설명서 |

---

## 3. 내 컴퓨터에서 실행하는 방법

> ⚠️ **주의: `index.html`을 더블클릭해서 열면 안 됩니다!**
> 이 앱은 `welfare_data.json` 파일을 인터넷 방식(fetch)으로 불러오는데,
> 파일을 직접 열면 브라우저 보안 정책(CORS) 때문에 데이터를 읽지 못해 빈 화면이 나옵니다.
> 아래 두 방법 중 하나로 "작은 서버"를 켜고 접속하세요.

### 방법 A — 파이썬 한 줄 (가장 간단)

1. 터미널(명령 프롬프트)을 엽니다.
2. 이 폴더로 이동합니다:
   ```bash
   cd Welfare_polic_recommendation_app
   ```
3. 아래 한 줄을 실행합니다:
   ```bash
   python -m http.server 8000
   ```
   (맥에서 안 되면 `python3 -m http.server 8000`)
4. 브라우저 주소창에 **`http://localhost:8000`** 을 입력하면 끝!

### 방법 B — VS Code Live Server

1. VS Code에서 이 폴더를 엽니다.
2. 왼쪽 확장(Extensions)에서 **"Live Server"** 를 검색해 설치합니다.
3. `index.html` 파일을 연 상태에서 오른쪽 아래 **"Go Live"** 버튼을 클릭합니다.
4. 브라우저가 자동으로 열립니다.

---

## 4. 배포 방법 (링크만 누르면 되게)

### 옵션 1 — GitHub Pages (가장 간단, 무료)

1. GitHub에 저장소를 만들고 이 폴더의 파일들을 올립니다(push).
   - 저장소 루트에 `index.html`이 오도록 올리는 것이 가장 간단합니다.
2. 저장소 페이지에서 **Settings → Pages** 로 이동합니다.
3. **Source**를 `Deploy from a branch`, Branch를 `main` / `/ (root)` 로 지정하고 **Save**.
   - 이 폴더가 저장소의 하위 폴더라면 Branch 옆 폴더를 `/Welfare_polic_recommendation_app`... 대신 `/root`만 선택 가능하므로, **이 폴더 내용물만 별도 저장소로 올리는 것을 권장**합니다.
4. 몇 분 뒤 `https://<사용자명>.github.io/<저장소명>/` 주소로 접속됩니다.
5. GitHub Pages에는 서버가 없으므로 AI 설명은 **규칙 기반(기본)** 또는 **결과 화면에서 본인 API 키 입력(선택)** 방식으로 동작합니다. 키가 없어도 모든 기능이 정상 동작합니다.

### 옵션 2 — Netlify (AI 설명 서버까지 한 번에, 권장)

1. GitHub에 저장소를 만들고 push 합니다 (옵션 1의 1번과 동일).
2. [netlify.com](https://netlify.com) 로그인 → **Add new site → Import an existing project** → GitHub 저장소 선택.
3. 설정:
   - **Base directory**: 이 폴더가 하위 폴더면 `Welfare_polic_recommendation_app` 입력 (루트면 비워둠)
   - **Build command**: 비워둠 (빌드 없음)
   - **Publish directory**: `.` (또는 Base directory와 동일)
4. (AI 설명을 켜려면) **Site settings → Environment variables** 에서
   - Key: `ANTHROPIC_API_KEY`
   - Value: [Anthropic Console](https://console.anthropic.com)에서 발급받은 API 키
5. **Deploy** 완료 후 `https://<사이트이름>.netlify.app` 링크로 바로 접속 가능합니다.

### 옵션 3 — Vercel

1. 저장소를 Vercel에 Import, Framework Preset은 **"Other"** 선택.
2. 서버리스가 필요하면 `netlify/functions/explain.js`를 `/api/explain.js`로 옮기고, app.js의 `/.netlify/functions/explain` 경로를 `/api/explain`으로 바꿉니다.
3. 환경변수 `ANTHROPIC_API_KEY` 추가 후 Deploy.

---

## 5. AI 설명(LLM) 설정 방법

이 앱의 "💡 왜 추천하나요?" 설명은 **3단계 폴백** 구조라 어떤 환경에서도 항상 채워집니다.

| 우선순위 | 방식 | 조건 |
|---|---|---|
| 1 | **Netlify 서버리스 (방식 A)** | Netlify 배포 + 환경변수 `ANTHROPIC_API_KEY` 설정 시 자동 동작 |
| 2 | **브라우저에서 본인 키 입력 (방식 B)** | 결과 화면의 "🤖 AI 맞춤 설명 설정"에 키 입력. 키는 저장되지 않고 화면에서만 사용 |
| 3 | **규칙 기반 설명 (방식 C, 기본)** | 아무 설정 없이 항상 동작. 사용자 조건 + 서비스 정보를 조합한 문장 생성 |

- AI 호출이 실패해도 앱은 멈추지 않고 조용히 규칙 기반 설명을 유지합니다.
- 사용 모델: `claude-sonnet-5` (Anthropic)

---

## 6. 복지 데이터 수정 방법

`welfare_data.json`을 텍스트 편집기로 열어 고치면 됩니다. 각 서비스는 아래 필드로 구성됩니다:

| 필드 | 설명 | 예시 |
|---|---|---|
| `id` | 고유 번호 (겹치면 안 됨) | `54` |
| `name` | 서비스 이름 | `"부모급여"` |
| `category` | 분류: `아동` `노인` `저소득` `장애인` `청년` `청소년` `한부모` `취약계층` `취업` 중 하나 | `"아동"` |
| `age_range` | 대상 나이. `"0~1세"`, `"65세 이상"`, `"전연령"` 같은 형식 | `"19~34세"` |
| `support_amount` | 지원 금액/내용 요약 | `"월 100만"` |
| `income_criteria` | 소득 기준. `"없음"`, `"중위 50%"`, `"소득차등"` 등 | `"중위 60%"` |
| `disability_required` | 등록장애인 전용이면 `"해당"`, 아니면 `"무관"` | `"무관"` |
| `apply_method` | 신청 창구 | `"복지로/읍면동"` |
| `summary` | 한 줄 소개 | `"영아기 집중 돌봄 지원"` |
| `url` | 공식 신청 사이트 주소 | `"https://www.bokjiro.go.kr"` |
| `apply_steps` | 신청 방법 상세 안내 | `"복지로 접속 → 로그인 → ..."` |

**새 서비스 추가**: 마지막 항목 뒤에 쉼표(`,`)를 붙이고 같은 형식으로 한 덩어리를 추가하세요.
**주의**: JSON은 마지막 항목 뒤에 쉼표가 있으면 오류가 납니다. 수정 후 [jsonlint.com](https://jsonlint.com)에서 검사하면 안전합니다.

`age_range`에 새로운 형식의 값(예: `"3~5세"`)은 자동으로 처리되지만, `"대학생"` 같은 텍스트형 값을 새로 만들면 `app.js`의 `textAgeEligible()` 함수에 처리 규칙을 추가해야 합니다.

---

## 7. 알려진 한계 (꼭 읽어주세요)

- **복지 제도의 금액·기준은 매년 바뀝니다.** 이 앱의 데이터는 참고용이며, 실제 신청 전 반드시 [복지로](https://www.bokjiro.go.kr) 등 공식 사이트에서 최신 기준을 확인해야 합니다.
- 소득 구간 자동 추정은 2026년 기준 중위소득 **예시표**로 계산한 대략적인 값입니다. 실제 수급 자격은 소득·재산을 함께 조사해 관할 기관이 결정합니다.
- 지자체별 사업(출산지원금 등)은 지역마다 금액·조건이 달라 "거주지 확인 필요" 표시만 제공합니다.
- 읽어주기(TTS)는 브라우저 내장 음성을 사용하므로 기기·브라우저에 따라 음성 품질이 다를 수 있습니다.
- 문의: 보건복지상담센터 ☎129

---

## 8. 개발 명세 요약 (개발자용)

- 프레임워크 없는 바닐라 HTML/CSS/JS 정적 웹앱 — 빌드 과정 불필요
- 상태는 JS 변수로만 관리 (localStorage/sessionStorage 미사용)
- 매칭 로직: `age_range` 파싱(범위 겹침 검사 + 텍스트형 상황 판정) → 장애 하드 필터 → 카테고리/상황 +20 → 소득 기준 ±10~15 → 관심 분야 +5 스코어링, 55점 이상 "맞춤 추천" / 35~54점 "참고 서비스"
- 접근성: `rem` 기반 글자 3단계, WCAG 고대비 토글, `speechSynthesis`(ko-KR) TTS, aria-label, 44px+ 터치 영역, `prefers-reduced-motion` 대응
