/* ==========================================================
   나에게 맞는 복지 찾기 — 메인 스크립트
   구성: 상태 관리 → 접근성(글자/고대비/TTS) → 질문 위저드
        → 매칭 스코어링 → 결과 렌더 → AI 설명(폴백 포함)
   주의: localStorage/sessionStorage 사용 금지 — 상태는 JS 변수로만 관리
   ========================================================== */

"use strict";

/* ---------------- 전역 상태 ---------------- */

const state = {
  services: [],          // welfare_data.json
  fontLevel: 1,          // 0: 기본, 1: 크게 아님 — 실제로는 0/1/2 (기본/크게/매우크게)
  highContrast: false,
  stepIndex: 0,
  serverlessAvailable: null, // 방식 A 엔드포인트 사용 가능 여부 캐시
  profile: {
    ageMin: null, ageMax: null, ageLabel: "",
    region: "",
    household: "",
    childAges: [],       // ["영아","미취학","초등","중고등","성인"]
    incomePct: null,     // 기준 중위소득 대비(%) 추정값
    incomeLabel: "",
    disability: "없음",  // "없음" | "경증" | "중증"
    situations: [],
    interests: [],
  },
};
state.fontLevel = 0;

/* 2026년 기준 중위소득(월, 원) — 소득 구간 자동 추정용.
   ※ 예시 수치이며 정확한 최신 기준은 복지로에서 확인 안내 */
const MEDIAN_INCOME_2026 = {
  1: 2392013, 2: 3932658, 3: 5025353,
  4: 6097773, 5: 7108192, 6: 8064805,
};

const REGIONS = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
  "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도",
];

const $app = document.getElementById("app");

/* ---------------- 접근성: 글자 크기 / 고대비 / TTS ---------------- */

const FONT_SIZES = ["16px", "19px", "23px"]; // 기본 / 크게 / 매우크게

function applyFontLevel() {
  document.documentElement.style.fontSize = FONT_SIZES[state.fontLevel];
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
  utter.lang = "ko-KR";
  utter.rate = 0.95;
  const koVoice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang && v.lang.toLowerCase().startsWith("ko"));
  if (koVoice) utter.voice = koVoice;
  window.speechSynthesis.speak(utter);
}

function initA11yBar() {
  document.getElementById("btn-font-up").addEventListener("click", () => {
    state.fontLevel = Math.min(2, state.fontLevel + 1);
    applyFontLevel();
  });
  document.getElementById("btn-font-down").addEventListener("click", () => {
    state.fontLevel = Math.max(0, state.fontLevel - 1);
    applyFontLevel();
  });
  const contrastBtn = document.getElementById("btn-contrast");
  contrastBtn.addEventListener("click", () => {
    state.highContrast = !state.highContrast;
    document.documentElement.classList.toggle("high-contrast", state.highContrast);
    contrastBtn.setAttribute("aria-pressed", String(state.highContrast));
  });
  document.getElementById("btn-tts-stop").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  });
}

/* ---------------- 유틸 ---------------- */

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/* ==========================================================
   질문 위저드 정의
   각 스텝: { id, title, desc, help, render(box), valid(), ttsText() }
   ========================================================== */

const steps = [
  /* ---------- Q1. 나이 ---------- */
  {
    id: "age",
    title: "나이가 어떻게 되세요?",
    desc: "본인(또는 복지가 필요한 분)의 나이를 알려주세요. 연령대 버튼을 누르거나 숫자로 입력할 수 있어요.",
    help: "복지 서비스마다 지원 대상 나이가 정해져 있어요. 예를 들어 기초연금은 65세 이상, 청년월세지원은 19~34세가 대상입니다.",
    render(box) {
      const bands = [
        { label: "0~7세 (영유아·미취학)", min: 0, max: 7 },
        { label: "8~18세 (학생)", min: 8, max: 18 },
        { label: "19~34세 (청년)", min: 19, max: 34 },
        { label: "35~59세 (중장년)", min: 35, max: 59 },
        { label: "60~64세", min: 60, max: 64 },
        { label: "65세 이상 (어르신)", min: 65, max: 120 },
      ];
      const grid = el("div", { class: "choice-grid", role: "radiogroup", "aria-label": "연령대 선택" });
      bands.forEach((b) => {
        const selected = state.profile.ageLabel === b.label;
        const btn = el("button", {
          type: "button",
          class: "choice-btn" + (selected ? " selected" : ""),
          role: "radio", "aria-checked": String(selected),
          onclick: () => {
            state.profile.ageMin = b.min;
            state.profile.ageMax = b.max;
            state.profile.ageLabel = b.label;
            renderWizard();
          },
        }, b.label);
        grid.appendChild(btn);
      });
      box.appendChild(grid);

      const exactWrap = el("div", { class: "field-row" }, [
        el("label", { class: "field-label", for: "exact-age", text: "정확한 나이로 입력(선택):" }),
        el("input", {
          type: "number", id: "exact-age", class: "text-input",
          min: "0", max: "120", inputmode: "numeric",
          placeholder: "예: 67",
          value: state.profile.ageMin !== null && state.profile.ageMin === state.profile.ageMax ? state.profile.ageMin : "",
          oninput: (e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v) && v >= 0 && v <= 120) {
              state.profile.ageMin = v;
              state.profile.ageMax = v;
              state.profile.ageLabel = `만 ${v}세`;
              box.querySelectorAll(".choice-btn").forEach((btn) => {
                btn.classList.remove("selected");
                btn.setAttribute("aria-checked", "false");
              });
            }
          },
        }),
      ]);
      box.appendChild(exactWrap);
    },
    valid() {
      return state.profile.ageMin !== null ? true : "연령대를 선택하거나 나이를 입력해 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q2. 거주 지역 ---------- */
  {
    id: "region",
    title: "어느 지역에 사세요?",
    desc: "시·도를 선택해 주세요. 출산지원금처럼 지역마다 내용이 다른 복지를 안내할 때 사용해요.",
    help: "일부 복지(출산지원금, 자립준비청년수당 등)는 사는 지역(지자체)에 따라 금액과 조건이 달라요. 결과에서 '거주지 확인 필요' 표시로 알려드립니다.",
    render(box) {
      const select = el("select", {
        class: "select-input", id: "region-select", "aria-label": "시도 선택",
        onchange: (e) => { state.profile.region = e.target.value; },
      });
      select.appendChild(el("option", { value: "", text: "— 시/도 선택 —" }));
      REGIONS.forEach((r) => {
        const opt = el("option", { value: r, text: r });
        if (state.profile.region === r) opt.selected = true;
        select.appendChild(opt);
      });
      box.appendChild(el("div", { class: "field-row" }, [select]));
    },
    valid() {
      return state.profile.region ? true : "거주 지역을 선택해 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q3. 가구 형태 ---------- */
  {
    id: "household",
    title: "가족 구성은 어떻게 되세요?",
    desc: "함께 사는 가족 형태를 선택해 주세요.",
    help: "한부모 가구라면 아동양육비 지원, 자녀가 있다면 아동수당 등 가족 형태에 따라 받을 수 있는 복지가 달라져요.",
    render(box) {
      const options = [
        { label: "혼자 살아요 (1인 가구)", value: "1인 가구" },
        { label: "부부 둘이 살아요", value: "부부" },
        { label: "자녀가 있어요", value: "자녀 있는 가구" },
        { label: "한부모 가구예요", value: "한부모 가구" },
        { label: "조부모가 손주를 키워요 (조손 가구)", value: "조손 가구" },
        { label: "기타", value: "기타" },
      ];
      const grid = el("div", { class: "choice-grid", role: "radiogroup", "aria-label": "가구 형태 선택" });
      options.forEach((o) => {
        const selected = state.profile.household === o.value;
        grid.appendChild(el("button", {
          type: "button",
          class: "choice-btn" + (selected ? " selected" : ""),
          role: "radio", "aria-checked": String(selected),
          onclick: () => {
            state.profile.household = o.value;
            if (!hasChildHousehold()) state.profile.childAges = [];
            renderWizard();
          },
        }, o.label));
      });
      box.appendChild(grid);
    },
    valid() {
      return state.profile.household ? true : "가구 형태를 선택해 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q4. 자녀 나이 (조건부) ---------- */
  {
    id: "childAges",
    title: "자녀(돌보는 아이)의 나이는요?",
    desc: "해당하는 것을 모두 선택해 주세요. (여러 개 선택 가능)",
    help: "자녀 나이에 따라 부모급여(0~1세), 아동수당(8세 미만), 아이돌봄서비스(12세 이하) 등 받을 수 있는 지원이 달라요.",
    skip() { return !hasChildHousehold(); },
    render(box) {
      const options = [
        { label: "영아 (0~1세)", value: "영아" },
        { label: "미취학 (2~7세)", value: "미취학" },
        { label: "초등학생", value: "초등" },
        { label: "중·고등학생", value: "중고등" },
        { label: "성인 자녀", value: "성인" },
      ];
      box.appendChild(renderMultiGrid(options, state.profile.childAges, "자녀 나이 선택"));
    },
    valid() {
      return state.profile.childAges.length > 0 ? true : "자녀 나이를 하나 이상 선택해 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q5. 소득 수준 ---------- */
  {
    id: "income",
    title: "가구 소득 수준을 알려주세요",
    desc: "'기준 중위소득'은 우리나라 전체 가구를 소득 순으로 줄 세웠을 때 딱 가운데 소득이에요. 잘 모르시면 마지막 버튼을 눌러 주세요.",
    help: "예시(2026년, 월 기준): 중위소득 100%는 1인 가구 약 239만원, 4인 가구 약 610만원이에요. 우리 집 월 소득이 이보다 적으면 '중위 100% 이하'에 해당해요. ※정확한 최신 기준은 복지로에서 확인하세요.",
    render(box) {
      const options = [
        { label: "기초생활수급자예요", sub: "생계·의료·주거·교육급여를 받고 있어요", value: 32, name: "기초생활수급" },
        { label: "차상위계층이에요", sub: "수급자는 아니지만 소득이 낮은 편(중위 50% 이하)", value: 50, name: "차상위계층" },
        { label: "중위소득 50% 이하", sub: "예: 4인 가구 월 305만원 이하", value: 50, name: "중위 50% 이하" },
        { label: "중위소득 50~100%", sub: "예: 4인 가구 월 305~610만원", value: 100, name: "중위 50~100%" },
        { label: "중위소득 100~150%", sub: "예: 4인 가구 월 610~915만원", value: 150, name: "중위 100~150%" },
        { label: "그 이상이에요", sub: "중위소득 150% 초과", value: 999, name: "중위 150% 초과" },
        { label: "잘 모르겠어요", sub: "가구원 수와 월 소득으로 추정해 드려요", value: "unknown", name: "" },
      ];
      const grid = el("div", { class: "choice-grid", role: "radiogroup", "aria-label": "소득 수준 선택" });
      options.forEach((o) => {
        const selected = o.value === "unknown"
          ? this._unknownMode === true && state.profile.incomeLabel.startsWith("추정")
          : state.profile.incomeLabel === o.name && this._unknownMode !== true;
        grid.appendChild(el("button", {
          type: "button",
          class: "choice-btn" + (selected ? " selected" : ""),
          role: "radio", "aria-checked": String(selected),
          onclick: () => {
            if (o.value === "unknown") {
              this._unknownMode = true;
              state.profile.incomePct = null;
              state.profile.incomeLabel = "";
            } else {
              this._unknownMode = false;
              state.profile.incomePct = o.value;
              state.profile.incomeLabel = o.name;
            }
            renderWizard();
          },
        }, [
          el("span", {}, [o.label, el("span", { class: "choice-sub", text: o.sub })]),
        ]));
      });
      box.appendChild(grid);

      if (this._unknownMode) {
        const panel = el("div", { class: "sub-panel" }, [
          el("h4", { text: "소득 구간 추정하기" }),
          el("div", { class: "field-row" }, [
            el("label", { class: "field-label", for: "hh-size", text: "가구원 수:" }),
            (() => {
              const sel = el("select", { class: "select-input", id: "hh-size" });
              for (let i = 1; i <= 6; i++) {
                sel.appendChild(el("option", { value: String(i), text: i === 6 ? "6인 이상" : `${i}인` }));
              }
              if (this._hhSize) sel.value = String(this._hhSize);
              sel.addEventListener("change", (e) => { this._hhSize = parseInt(e.target.value, 10); });
              this._hhSize = parseInt(sel.value, 10);
              return sel;
            })(),
          ]),
          el("div", { class: "field-row" }, [
            el("label", { class: "field-label", for: "hh-income", text: "월 소득(만원):" }),
            el("input", {
              type: "number", id: "hh-income", class: "text-input",
              min: "0", inputmode: "numeric", placeholder: "예: 250",
              value: this._monthly ?? "",
              oninput: (e) => { this._monthly = e.target.value; },
            }),
          ]),
          el("button", {
            type: "button", class: "btn-secondary",
            onclick: () => {
              const income = parseFloat(this._monthly) * 10000;
              if (Number.isNaN(income) || income < 0) return;
              const median = MEDIAN_INCOME_2026[this._hhSize] || MEDIAN_INCOME_2026[6];
              const pct = Math.round((income / median) * 100);
              let bracket;
              if (pct <= 50) bracket = 50;
              else if (pct <= 100) bracket = 100;
              else if (pct <= 150) bracket = 150;
              else bracket = 999;
              state.profile.incomePct = bracket;
              state.profile.incomeLabel = `추정: 중위소득 약 ${pct}% (${this._hhSize}인 가구)`;
              renderWizard();
            },
          }, "소득 구간 계산하기"),
          state.profile.incomeLabel.startsWith("추정")
            ? el("p", { class: "estimate-result", text: `${state.profile.incomeLabel} 구간으로 추정돼요. 다음으로 진행해 주세요.` })
            : null,
          el("p", { class: "card-note", text: "※ 2026년 기준 중위소득 예시표로 계산한 대략적인 추정이에요. 정확한 판정은 신청 기관에서 소득·재산을 함께 조사해 결정합니다." }),
        ]);
        box.appendChild(panel);
      }
    },
    valid() {
      return state.profile.incomePct !== null ? true : "소득 수준을 선택하거나 계산해 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q6. 장애 여부 ---------- */
  {
    id: "disability",
    title: "등록된 장애가 있으세요?",
    desc: "본인(또는 복지가 필요한 분)의 장애 등록 여부를 알려주세요.",
    help: "장애인연금(중증), 장애수당(경증), 장애인활동지원 등 등록장애인만 신청할 수 있는 복지가 있어요. 정도(경증/중증)에 따라서도 달라집니다.",
    render(box) {
      const grid = el("div", { class: "choice-grid", role: "radiogroup", "aria-label": "장애 여부 선택" });
      [
        { label: "없어요", value: "없음" },
        { label: "등록장애가 있어요", value: "있음" },
      ].forEach((o) => {
        const selected = o.value === "없음"
          ? state.profile.disability === "없음"
          : state.profile.disability !== "없음";
        grid.appendChild(el("button", {
          type: "button",
          class: "choice-btn" + (selected ? " selected" : ""),
          role: "radio", "aria-checked": String(selected),
          onclick: () => {
            state.profile.disability = o.value === "없음" ? "없음" : (state.profile.disability === "없음" ? "경증" : state.profile.disability);
            renderWizard();
          },
        }, o.label));
      });
      box.appendChild(grid);

      if (state.profile.disability !== "없음") {
        const panel = el("div", { class: "sub-panel" }, [
          el("h4", { text: "장애 정도를 선택해 주세요" }),
          (() => {
            const g = el("div", { class: "choice-grid", role: "radiogroup", "aria-label": "장애 정도 선택" });
            [
              { label: "경증 (장애 정도가 심하지 않음)", value: "경증" },
              { label: "중증 (장애 정도가 심함)", value: "중증" },
            ].forEach((o) => {
              const selected = state.profile.disability === o.value;
              g.appendChild(el("button", {
                type: "button",
                class: "choice-btn" + (selected ? " selected" : ""),
                role: "radio", "aria-checked": String(selected),
                onclick: () => { state.profile.disability = o.value; renderWizard(); },
              }, o.label));
            });
            return g;
          })(),
        ]);
        box.appendChild(panel);
      }
    },
    valid() { return true; },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q7. 현재 상황 (복수) ---------- */
  {
    id: "situations",
    title: "지금 상황을 알려주세요",
    desc: "해당하는 것을 모두 선택해 주세요. (여러 개 선택 가능)",
    help: "예를 들어 '갑작스러운 위기'는 실직, 큰 병, 가족의 사망 등으로 생계가 갑자기 어려워진 경우예요. 이럴 땐 긴급복지 지원을 빠르게 받을 수 있어요.",
    render(box) {
      const options = [
        { label: "일자리를 찾고 있어요", value: "구직 중" },
        { label: "최근에 실직·이직했어요", value: "실직·이직" },
        { label: "학생·대학생이에요", value: "학생·대학생" },
        { label: "출산 예정이거나 출산 직후예요", value: "출산 예정·직후" },
        { label: "어르신 돌봄이 필요해요", value: "노인 돌봄 필요" },
        { label: "갑작스러운 위기가 생겼어요", sub: "실직·질병·사망 등", value: "위기상황" },
        { label: "주거비(월세 등)가 부담돼요", value: "주거비 부담" },
        { label: "의료비가 부담돼요", value: "의료비 부담" },
        { label: "해당 없어요", value: "해당 없음", exclusive: true },
      ];
      box.appendChild(renderMultiGrid(options, state.profile.situations, "현재 상황 선택"));
    },
    valid() {
      return state.profile.situations.length > 0 ? true : "하나 이상 선택해 주세요. 없으면 '해당 없어요'를 눌러 주세요.";
    },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q8. 관심 분야 (복수, 선택) ---------- */
  {
    id: "interests",
    title: "어떤 도움이 가장 필요하세요?",
    desc: "관심 있는 분야를 선택해 주세요. 선택하지 않고 넘어가도 괜찮아요. (여러 개 선택 가능)",
    help: "선택한 분야의 복지가 결과에서 더 위쪽에 나와요.",
    render(box) {
      const options = [
        { label: "현금 지원", value: "현금" },
        { label: "의료·건강", value: "의료" },
        { label: "주거", value: "주거" },
        { label: "교육·학비", value: "교육" },
        { label: "일자리", value: "일자리" },
        { label: "돌봄", value: "돌봄" },
        { label: "문화·바우처", value: "문화" },
      ];
      box.appendChild(renderMultiGrid(options, state.profile.interests, "관심 분야 선택"));
    },
    valid() { return true; },
    ttsText() { return this.title + " " + this.desc; },
  },

  /* ---------- Q9. 확인 화면 ---------- */
  {
    id: "confirm",
    title: "입력하신 내용을 확인해 주세요",
    desc: "아래 내용이 맞으면 '결과 보기'를 눌러 주세요. 고칠 내용이 있으면 '이전'으로 돌아갈 수 있어요.",
    help: "입력하신 정보는 이 화면에서만 사용되고 어디에도 저장되지 않아요.",
    isConfirm: true,
    render(box) {
      const p = state.profile;
      const rows = [
        ["나이", p.ageLabel],
        ["거주 지역", p.region],
        ["가구 형태", p.household],
        hasChildHousehold() ? ["자녀 나이", p.childAges.join(", ")] : null,
        ["소득 수준", p.incomeLabel],
        ["장애 여부", p.disability === "없음" ? "없음" : `등록장애 (${p.disability})`],
        ["현재 상황", p.situations.join(", ")],
        ["관심 분야", p.interests.length ? p.interests.join(", ") : "선택 안 함"],
      ].filter(Boolean);
      const list = el("ul", { class: "summary-list" });
      rows.forEach(([k, v]) => {
        list.appendChild(el("li", {}, [
          el("span", { class: "sum-key", text: k }),
          el("span", { class: "sum-val", text: v }),
        ]));
      });
      box.appendChild(list);
    },
    valid() { return true; },
    ttsText() {
      const p = state.profile;
      return `입력 내용 확인. 나이 ${p.ageLabel}, 지역 ${p.region}, 가구 형태 ${p.household}, 소득 ${p.incomeLabel}, 장애 ${p.disability}. 맞으면 결과 보기를 눌러 주세요.`;
    },
  },
];

function hasChildHousehold() {
  return ["자녀 있는 가구", "한부모 가구", "조손 가구"].includes(state.profile.household);
}

/* 복수 선택 그리드 렌더 (exclusive 옵션: '해당 없음' 처리) */
function renderMultiGrid(options, target, ariaLabel) {
  const grid = el("div", { class: "choice-grid", role: "group", "aria-label": ariaLabel });
  options.forEach((o) => {
    const selected = target.includes(o.value);
    const btn = el("button", {
      type: "button",
      class: "choice-btn" + (selected ? " selected" : ""),
      "aria-pressed": String(selected),
      onclick: () => {
        const idx = target.indexOf(o.value);
        if (idx >= 0) {
          target.splice(idx, 1);
        } else {
          if (o.exclusive) target.length = 0;
          else {
            const exIdx = target.findIndex((v) => options.find((op) => op.value === v && op.exclusive));
            if (exIdx >= 0) target.splice(exIdx, 1);
          }
          target.push(o.value);
        }
        renderWizard();
      },
    }, [
      el("span", {}, [o.label, o.sub ? el("span", { class: "choice-sub", text: o.sub }) : null]),
    ]);
    grid.appendChild(btn);
  });
  return grid;
}

/* 현재 활성(스킵 제외) 스텝 목록 */
function activeSteps() {
  return steps.filter((s) => !(typeof s.skip === "function" && s.skip()));
}

/* ==========================================================
   화면 렌더: 시작 → 위저드 → 결과
   ========================================================== */

function renderStart() {
  window.scrollTo(0, 0);
  $app.innerHTML = "";
  const hero = el("section", { class: "hero" }, [
    el("h2", { text: "받을 수 있는 복지, 놓치고 계시지 않나요?" }),
    el("p", { text: `정부·지자체 복지 서비스 ${state.services.length}개 중에서 나에게 맞는 것을 찾아드려요.` }),
    el("p", { text: "8개의 쉬운 질문에 답하면 1분 안에 결과를 볼 수 있어요." }),
    el("div", { class: "hero-features" }, [
      el("div", { class: "hero-feature", text: "단계별 쉬운 질문" }),
      el("div", { class: "hero-feature", text: "맞춤 추천 + 이유 설명" }),
      el("div", { class: "hero-feature", text: "공식 신청 링크 안내" }),
      el("div", { class: "hero-feature", text: "읽어주기·고대비 지원" }),
    ]),
    el("button", {
      type: "button", class: "btn-primary",
      onclick: () => { state.stepIndex = 0; renderWizard(); },
    }, "지금 시작하기 →"),
    el("p", { class: "card-note", style: "margin-top:1rem;", text: "입력하신 정보는 저장되지 않고 이 브라우저 화면에서만 사용돼요." }),
  ]);
  $app.appendChild(hero);
}

function renderWizard() {
  const list = activeSteps();
  if (state.stepIndex >= list.length) state.stepIndex = list.length - 1;
  const step = list[state.stepIndex];
  const total = list.length;
  const current = state.stepIndex + 1;

  const scrollY = window.scrollY;
  $app.innerHTML = "";

  const wizard = el("section", { class: "wizard", "aria-label": `질문 ${current} / ${total}` });

  /* 진행률 */
  wizard.appendChild(el("div", { class: "progress-wrap" }, [
    el("div", { class: "progress-label" }, [
      el("span", { text: `질문 ${current} / ${total}` }),
      el("span", { text: `${Math.round((current / total) * 100)}%` }),
    ]),
    el("div", { class: "progress-track", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round((current / total) * 100)), "aria-label": "진행률" }, [
      el("div", { class: "progress-fill", style: `width:${(current / total) * 100}%` }),
    ]),
  ]));

  /* 질문 헤더 + 도구 */
  const helpBox = el("div", { class: "help-box", hidden: "hidden", role: "note" }, step.help);
  wizard.appendChild(el("div", { class: "q-head" }, [
    el("h2", { class: "q-title", id: "q-title", text: step.title }),
    el("div", { class: "q-tools" }, [
      el("button", {
        type: "button", class: "tool-btn", "aria-label": "도움말 보기",
        onclick: () => { helpBox.hidden = !helpBox.hidden; },
      }, "도움말"),
      el("button", {
        type: "button", class: "tool-btn", "aria-label": "질문 읽어주기",
        onclick: () => speak(step.ttsText() + " " + step.help),
      }, "듣기"),
    ]),
  ]));
  wizard.appendChild(el("p", { class: "q-desc", text: step.desc }));
  wizard.appendChild(helpBox);

  /* 본문 */
  const body = el("div", { class: "q-body" });
  step.render(body);
  wizard.appendChild(body);

  /* 검증 메시지 */
  const msg = el("p", { class: "validation-msg", role: "alert", "aria-live": "assertive" });
  wizard.appendChild(msg);

  /* 내비게이션 */
  const nav = el("div", { class: "wizard-nav" });
  nav.appendChild(el("button", {
    type: "button", class: "btn-ghost",
    onclick: () => {
      if (state.stepIndex === 0) renderStart();
      else { state.stepIndex -= 1; renderWizard(); window.scrollTo(0, 0); }
    },
  }, "← 이전"));
  nav.appendChild(el("button", {
    type: "button", class: "btn-primary",
    onclick: () => {
      const v = step.valid();
      if (v !== true) { msg.textContent = v; speak(v); return; }
      if (step.isConfirm) { renderResults(); return; }
      state.stepIndex += 1;
      renderWizard();
      window.scrollTo(0, 0);
    },
  }, step.isConfirm ? "결과 보기" : "다음 →"));
  wizard.appendChild(nav);

  $app.appendChild(wizard);
  window.scrollTo(0, Math.min(scrollY, 0));
}

/* ==========================================================
   매칭 로직 (명세 5번)
   ========================================================== */

/* 5-A. age_range 텍스트 → {min, max} 또는 {text: 값} */
function parseAgeRange(raw) {
  const s = String(raw || "").trim();
  let m;
  if ((m = s.match(/^(\d+)\s*[~∼-]\s*(\d+)세$/))) return { min: +m[1], max: +m[2] };
  if ((m = s.match(/^(\d+)세\s*미만$/))) return { min: 0, max: +m[1] - 1 };
  if ((m = s.match(/^(\d+)세\s*이하$/))) return { min: 0, max: +m[1] };
  if ((m = s.match(/^(\d+)세\s*이상$/))) return { min: +m[1], max: 999 };
  return { text: s }; // "전연령", "출생아", "대학생" 등 상황 기반 처리
}

/* 나이 범위 겹침 검사 */
function ageOverlap(uMin, uMax, sMin, sMax) {
  return uMin <= sMax && uMax >= sMin;
}

/* 텍스트형 age_range: 상황 기반 적격 판정. 통과 시 이유 태그, 탈락 시 null */
function textAgeEligible(key, p) {
  const has = (v) => p.situations.includes(v);
  const child = (v) => p.childAges.includes(v);
  switch (key) {
    case "전연령":
      return "#전연령";
    case "출생아":
    case "영아":
      if (has("출산 예정·직후") || child("영아") || p.ageMax <= 2) return "#영아가정";
      return null;
    case "출산가정":
      if (has("출산 예정·직후")) return "#출산가정";
      return null;
    case "아동":
      if (child("영아") || child("미취학") || child("초등") || child("중고등") || p.ageMax < 18) return "#아동가정";
      return null;
    case "학생":
      if (child("초등") || child("중고등") || has("학생·대학생") || ageOverlap(p.ageMin, p.ageMax, 6, 18)) return "#학생";
      return null;
    case "고등학생":
      if (child("중고등") || (has("학생·대학생") && ageOverlap(p.ageMin, p.ageMax, 15, 19))) return "#고등학생";
      return null;
    case "대학생":
      if (has("학생·대학생") && ageOverlap(p.ageMin, p.ageMax, 17, 40)) return "#대학생";
      if (child("성인") || child("중고등")) return "#자녀학비";
      return null;
    case "초4~중3":
      if (child("초등") || child("중고등") || ageOverlap(p.ageMin, p.ageMax, 10, 15)) return "#초중학생";
      return null;
    case "청소년":
      if (ageOverlap(p.ageMin, p.ageMax, 9, 24) || child("초등") || child("중고등")) return "#청소년";
      return null;
    case "자립준비청년":
      if (ageOverlap(p.ageMin, p.ageMax, 18, 34)) return "#자립준비청년(해당시)";
      return null;
    case "노인/취약":
      if (p.ageMin >= 60 || p.disability !== "없음" || (p.incomePct !== null && p.incomePct <= 50)) return "#취약계층";
      return null;
    default:
      return "#대상확인필요"; // 알 수 없는 값은 제외하지 않고 확인 안내
  }
}

/* income_criteria 파싱·비교 → { score, tag } */
function incomeScore(criteria, p) {
  const c = String(criteria || "").trim();
  const pct = p.incomePct; // 사용자: 32/50/100/150/999

  if (c === "없음" || c === "무관") {
    return { score: 10, tag: "#소득무관" };
  }
  const m = c.match(/중위\s*(\d+)/); // "중위 32%", "중위 100% 이하 등", "중위 200~250% 이하"
  if (m) {
    let threshold = +m[1];
    const range = c.match(/중위\s*\d+\s*[~∼-]\s*(\d+)/);
    if (range) threshold = +range[1];
    if (pct !== null && pct <= threshold) return { score: 15, tag: `#소득기준충족(중위${threshold}%)` };
    return { score: -10, tag: "#소득기준초과가능" };
  }
  if (c.includes("하위 70")) { // 기초연금
    if (pct !== null && pct <= 150) return { score: 10, tag: "#소득하위70%가능" };
    return { score: -5, tag: "#소득확인필요" };
  }
  if (c.includes("위기상황")) {
    if (p.situations.includes("위기상황")) return { score: 15, tag: "#위기상황" };
    return { score: -15, tag: "#위기상황시" };
  }
  if (c.includes("고용보험")) {
    if (p.situations.includes("실직·이직")) return { score: 10, tag: "#고용보험" };
    return { score: 0, tag: "#고용보험필요" };
  }
  // "소득차등", "소득분위별", "소득요건", "가구차등", "지자체규정" 등
  return { score: 8, tag: "#소득따라차등" };
}

/* 카테고리·상황 매칭 → { score, tags[] } */
function categoryScore(svc, p) {
  let score = 0;
  const tags = [];
  const has = (v) => p.situations.includes(v);
  const name = svc.name || "";

  switch (svc.category) {
    case "아동":
      if (p.childAges.length > 0 || has("출산 예정·직후") || p.ageMax <= 12) { score += 20; tags.push("#아동·육아"); }
      break;
    case "노인":
      if (p.ageMin >= 60) { score += 20; tags.push("#어르신"); }
      else if (has("노인 돌봄 필요")) { score += 15; tags.push("#노인돌봄"); }
      break;
    case "장애인":
      if (p.disability !== "없음") { score += 20; tags.push("#장애인지원"); }
      break;
    case "청년":
      if (ageOverlap(p.ageMin, p.ageMax, 19, 34)) { score += 20; tags.push("#청년"); }
      break;
    case "청소년":
      if (ageOverlap(p.ageMin, p.ageMax, 9, 24) || p.childAges.includes("초등") || p.childAges.includes("중고등")) { score += 20; tags.push("#청소년"); }
      break;
    case "한부모":
      if (p.household === "한부모 가구") { score += 20; tags.push("#한부모"); }
      else if (p.household === "조손 가구") { score += 10; tags.push("#조손가구"); }
      break;
    case "저소득":
      if (p.incomePct !== null && p.incomePct <= 50) { score += 20; tags.push("#저소득지원"); }
      else if (p.incomePct !== null && p.incomePct <= 100) { score += 8; }
      break;
    case "취약계층":
      if ((p.incomePct !== null && p.incomePct <= 100) || p.disability !== "없음" || p.household === "한부모 가구") { score += 15; tags.push("#취약계층"); }
      break;
    case "취업":
      if (has("구직 중") || has("실직·이직")) { score += 20; tags.push("#일자리"); }
      break;
  }

  /* 상황 키워드 보너스 */
  if (has("위기상황") && name.includes("긴급복지")) { score += 20; tags.push("#긴급지원"); }
  if (has("주거비 부담") && /주거|월세|주택|시설/.test(name)) { score += 10; tags.push("#주거비"); }
  if (has("의료비 부담") && /의료|건강|요양|재난적|희귀질환/.test(name + svc.summary)) { score += 10; tags.push("#의료비"); }
  if (has("출산 예정·직후") && /출산|산모|첫만남|미숙아/.test(name)) { score += 10; tags.push("#출산"); }
  if (has("노인 돌봄 필요") && /돌봄|요양|치매|간병/.test(name + svc.summary)) { score += 10; tags.push("#돌봄"); }

  return { score, tags };
}

/* 관심 분야(Q8) 매칭 → { score, tags[] } */
function interestScore(svc, p) {
  let score = 0;
  const tags = [];
  const text = `${svc.name} ${svc.summary} ${svc.support_amount} ${svc.category}`;
  const rules = {
    "현금": /월\s?\d|만원?|현금|급여|수당|연금|장려금|지원금/,
    "의료": /의료|건강|치매|재활|요양|간병|병원/,
    "주거": /주거|월세|주택|임대|시설|연금.*주택|주택.*연금/,
    "교육": /교육|학비|장학|학습|학교|아카데미/,
    "일자리": /일자리|취업|구직|자활|근로/,
    "돌봄": /돌봄|돌보미|간병|요양|보육/,
    "문화": /문화|바우처|이용권/,
  };
  for (const it of p.interests) {
    if (rules[it] && rules[it].test(text)) {
      score += 5;
      tags.push(`#관심:${it}`);
      break; // 중복 가점 방지 — 최대 +5
    }
  }
  return { score, tags };
}

/* 서비스 1건 스코어링 → { score, tags, excluded } */
function scoreService(svc, p) {
  let score = 0;
  const tags = [];

  /* 1) 나이 */
  const range = parseAgeRange(svc.age_range);
  if (range.text !== undefined) {
    const tag = textAgeEligible(range.text, p);
    if (tag === null) return { excluded: true };
    score += 30;
    tags.push(tag);
  } else {
    if (!ageOverlap(p.ageMin, p.ageMax, range.min, range.max)) return { excluded: true };
    score += 30;
    tags.push(`#${svc.age_range}`);
  }

  /* 2) 장애 조건 (하드 필터) */
  if (svc.disability_required === "해당") {
    if (p.disability === "없음") return { excluded: true };
    score += 25;
    tags.push("#등록장애인");
  }
  /* 장애수당은 경증(장애인연금 비대상) 전용 — 데이터상 '무관'이라 별도 처리 */
  if (svc.name === "장애수당" && p.disability === "없음") return { excluded: true };
  if (svc.name === "장애인연금" && p.disability === "경증") { score -= 15; tags.push("#중증대상"); }
  if (svc.name === "발달장애인 주간활동지원" && p.disability === "없음") return { excluded: true };

  /* 3) 카테고리·상황 */
  const cat = categoryScore(svc, p);
  score += cat.score;
  tags.push(...cat.tags);

  /* 4) 소득 */
  const inc = incomeScore(svc.income_criteria, p);
  score += inc.score;
  tags.push(inc.tag);

  /* 5) 관심 분야 */
  const int = interestScore(svc, p);
  score += int.score;
  tags.push(...int.tags);

  /* 지자체별 사업 표시 */
  if (/지자체/.test(svc.apply_method) || /지자체/.test(svc.income_criteria)) {
    tags.push("#거주지확인필요");
  }

  return { score, tags: [...new Set(tags)], excluded: false };
}

/* 전체 매칭 실행 → { primary[], secondary[] } */
function runMatching() {
  const p = state.profile;
  const scored = [];
  for (const svc of state.services) {
    const r = scoreService(svc, p);
    if (r.excluded) continue;
    scored.push({ svc, score: r.score, tags: r.tags });
  }
  scored.sort((a, b) => b.score - a.score);

  let primary = scored.filter((s) => s.score >= 55);
  let secondary = scored.filter((s) => s.score < 55 && s.score >= 35);

  /* 결과가 너무 적으면(3개 미만) 조건 완화: 상위 점수부터 채움 */
  if (primary.length < 3) {
    const fill = secondary.splice(0, 3 - primary.length);
    primary = primary.concat(fill);
  }
  secondary = secondary.slice(0, 6);

  return { primary, secondary };
}

/* ==========================================================
   결과 화면
   ========================================================== */

function fitLabel(score) {
  if (score >= 75) return { stars: "★★★", label: "매우 적합" };
  if (score >= 55) return { stars: "★★", label: "적합" };
  return { stars: "★", label: "참고" };
}

function renderResults() {
  window.scrollTo(0, 0);
  const { primary, secondary } = runMatching();
  $app.innerHTML = "";

  /* 헤더 */
  const totalFound = primary.length + secondary.length;
  const header = el("section", { class: "results-header" }, [
    el("h2", { text: totalFound > 0 ? `총 ${totalFound}개의 복지 서비스를 찾았어요` : "조건에 꼭 맞는 서비스를 찾지 못했어요" }),
    el("p", { text: totalFound > 0
      ? `맞춤 추천 ${primary.length}개${secondary.length ? `, 참고 서비스 ${secondary.length}개` : ""}를 적합한 순서로 보여드려요.`
      : "조건을 바꿔 다시 진단해 보시거나, 보건복지상담센터(☎129)에 문의해 보세요." }),
    el("div", { class: "results-actions" }, [
      el("button", { type: "button", class: "btn-secondary", onclick: () => { resetProfile(); renderStart(); } }, "다시 진단하기"),
      el("button", { type: "button", class: "btn-ghost", onclick: () => window.print() }, "인쇄·저장하기"),
      el("button", {
        type: "button", class: "btn-ghost",
        onclick: () => {
          const names = primary.map((r, i) => `${i + 1}. ${r.svc.name}`).join(", ");
          speak(`총 ${totalFound}개의 복지 서비스를 찾았어요. 추천 순서대로, ${names} 입니다.`);
        },
      }, "결과 읽어주기"),
    ]),
  ]);
  $app.appendChild(header);

  if (primary.length > 0) {
    $app.appendChild(el("h3", { class: "section-title", text: "맞춤 추천 서비스" }));
    primary.forEach((r, i) => $app.appendChild(renderCard(r, i)));
  } else {
    $app.appendChild(el("div", { class: "no-results", text: "입력하신 조건에 맞는 서비스가 없어요. '다시 진단하기'로 조건을 바꿔 보세요." }));
  }

  if (secondary.length > 0) {
    $app.appendChild(el("h3", { class: "section-title", text: "참고하면 좋은 서비스" }));
    secondary.forEach((r, i) => $app.appendChild(renderCard(r, primary.length + i)));
  }

  /* AI 설명 비동기 생성 (규칙 기반이 이미 채워져 있고, 성공 시 덮어씀) */
  enhanceExplanations(primary.slice(0, 5));
}

function resetProfile() {
  state.profile = {
    ageMin: null, ageMax: null, ageLabel: "",
    region: "", household: "", childAges: [],
    incomePct: null, incomeLabel: "",
    disability: "없음", situations: [], interests: [],
  };
  state.stepIndex = 0;
  steps.forEach((s) => { if (s._unknownMode !== undefined) s._unknownMode = false; });
}

function renderCard(result, index) {
  const { svc, score, tags } = result;
  const fit = fitLabel(score);

  const card = el("article", { class: "result-card", "aria-label": svc.name });

  card.appendChild(el("div", { class: "card-top" }, [
    el("h4", { class: "card-name", text: `${index + 1}. ${svc.name}` }),
    el("div", { class: "badges" }, [
      el("span", { class: "badge", text: svc.category }),
      el("span", { class: "badge fit", text: `${fit.stars} ${fit.label}` }),
    ]),
  ]));

  card.appendChild(el("div", { class: "match-tags", "aria-label": "매칭 이유" },
    tags.map((t) => el("span", { class: "match-tag", text: t }))));

  /* AI/규칙 기반 설명 블록 — 규칙 기반으로 즉시 채움 */
  const aiText = el("p", { class: "ai-text", text: ruleBasedExplanation(svc) });
  const aiBlock = el("div", { class: "ai-block", "data-service-id": String(svc.id) }, [
    el("span", { class: "ai-label", text: "왜 추천하나요?" }),
    aiText,
  ]);
  card.appendChild(aiBlock);

  card.appendChild(el("div", { class: "card-info" }, [
    el("div", { class: "info-row" }, [
      el("span", { class: "info-key", text: "지원 내용" }),
      el("span", { text: `${svc.support_amount} — ${svc.summary}` }),
    ]),
    el("div", { class: "info-row" }, [
      el("span", { class: "info-key", text: "소득 기준" }),
      el("span", { text: svc.income_criteria }),
    ]),
    el("div", { class: "info-row" }, [
      el("span", { class: "info-key", text: "신청 창구" }),
      el("span", { text: svc.apply_method }),
    ]),
  ]));

  card.appendChild(el("div", { class: "apply-steps" }, [
    el("strong", { text: "신청 방법" }),
    el("span", { text: svc.apply_steps }),
  ]));

  const speakAll = () => speak(
    `${svc.name}. ${ruleBasedExplanation(svc)} 지원 내용: ${svc.support_amount}, ${svc.summary}. 신청 방법: ${svc.apply_steps}`
  );
  card.appendChild(el("div", { class: "card-actions" }, [
    el("a", {
      class: "btn-primary", href: svc.url, target: "_blank", rel: "noopener noreferrer",
      "aria-label": `${svc.name} 공식 사이트에서 신청하기 (새 창)`,
    }, "공식 사이트에서 신청하기 →"),
    el("button", { type: "button", class: "btn-secondary", onclick: speakAll, "aria-label": `${svc.name} 내용 읽어주기` }, "읽어주기"),
  ]));

  card.appendChild(el("p", { class: "card-note", text: "복지 제도의 금액·기준은 매년 바뀝니다. 정확한 최신 정보는 공식 사이트에서 확인하세요." }));

  return card;
}

/* ==========================================================
   설명 생성 — 방식 C(규칙 기반, 항상) + 방식 A/B(가능하면 덮어쓰기)
   ========================================================== */

function ruleBasedExplanation(svc) {
  const p = state.profile;
  const parts = [];

  /* 사용자 상황 요약 구절 */
  const who = [];
  if (p.ageLabel) who.push(p.ageLabel);
  if (p.household === "한부모 가구") who.push("한부모 가구");
  if (p.disability !== "없음") who.push(`등록장애(${p.disability})`);
  if (p.incomeLabel && p.incomePct !== null && p.incomePct <= 100) who.push(p.incomeLabel.replace(/^추정: /, ""));
  const whoText = who.length ? who.join(", ") + "에 해당하시는 " : "";

  parts.push(`${whoText}회원님께 '${svc.name}'을(를) 추천해요.`);
  parts.push(`이 제도는 ${svc.summary}을(를) 위한 것으로, ${svc.support_amount} 수준의 지원을 받을 수 있어요.`);

  if (svc.income_criteria === "없음" || svc.income_criteria === "무관") {
    parts.push("소득과 관계없이 대상이 되면 누구나 신청할 수 있어요.");
  } else if (/중위/.test(svc.income_criteria)) {
    parts.push(`소득 기준(${svc.income_criteria})을 충족하면 ${svc.apply_method}에서 신청할 수 있어요.`);
  } else {
    parts.push(`${svc.apply_method}에서 자격 확인 후 신청할 수 있어요.`);
  }

  return parts.join(" ");
}

/* 방식 A(서버리스)로 AI 설명 시도. 실패해도 조용히 무시(규칙 기반 설명 유지) */
async function enhanceExplanations(results) {
  for (const r of results) {
    try {
      if (state.serverlessAvailable === false) return;
      const block = document.querySelector(`.ai-block[data-service-id="${r.svc.id}"]`);
      if (!block) continue;
      const textEl = block.querySelector(".ai-text");
      const explanation = await callServerlessExplain(r.svc);
      if (explanation && explanation.trim()) {
        textEl.textContent = explanation.trim();
      }
    } catch (_e) {
      /* AI 실패로 앱이 멈추면 안 됨 — 규칙 기반 설명 그대로 유지 */
    }
  }
}

async function callServerlessExplain(svc) {
  try {
    const res = await fetch("/.netlify/functions/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userProfile: publicProfile(), service: svc }),
    });
    if (!res.ok) { state.serverlessAvailable = false; return ""; }
    state.serverlessAvailable = true;
    const data = await res.json();
    return data.explanation || "";
  } catch (_e) {
    state.serverlessAvailable = false;
    return "";
  }
}

/* LLM에 보낼 프로필(간결한 형태) */
function publicProfile() {
  const p = state.profile;
  return {
    나이: p.ageLabel,
    지역: p.region,
    가구형태: p.household,
    자녀: p.childAges.join(", ") || "없음/해당없음",
    소득수준: p.incomeLabel,
    장애: p.disability,
    현재상황: p.situations.join(", "),
    관심분야: p.interests.join(", ") || "선택 안 함",
  };
}

/* ==========================================================
   초기화
   ========================================================== */

async function init() {
  initA11yBar();
  applyFontLevel();
  if ("speechSynthesis" in window) window.speechSynthesis.getVoices(); // 음성 목록 미리 로드

  try {
    const res = await fetch("welfare_data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.services = await res.json();
    renderStart();
  } catch (e) {
    $app.innerHTML = "";
    $app.appendChild(el("div", { class: "no-results" }, [
      el("h2", { text: "복지 데이터를 불러오지 못했어요" }),
      el("p", { html: "파일을 직접 더블클릭해서 열면 브라우저 보안 정책(CORS) 때문에 데이터를 읽을 수 없어요.<br>터미널에서 <code>python -m http.server 8000</code> 실행 후 <code>http://localhost:8000</code>으로 접속해 주세요.<br>자세한 방법은 README.md를 확인하세요." }),
    ]));
  }
}

init();
