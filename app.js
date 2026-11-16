// ══════════════════════════════════════════════════════════════════
// PnC 캘린더 엔진 2.0 (날짜 이동, 커스텀 시차 영구저장, 3일 드래곤 캐슬)
// ══════════════════════════════════════════════════════════════════

const ANCHOR_DATE = new Date("2026-08-24T00:00:00Z"); // UTC 월요일 = 논에이스 주간
const DRAGON_CASTLE_ANCHOR = new Date("2026-09-18T00:00:00Z"); // 금 = 1일차, 토 = 2일차, 일 = 3일차

// 현재 화면에 표시할 기준 날짜 (기본: 오늘)
let selectedDate = new Date();

// 시차 설정 (기본: 로컬스토리지 복원 or KST +9)
let currentTzName = localStorage.getItem("pnc_tz_name") || "KST";
let currentTzOffset = localStorage.getItem("pnc_tz_offset") !== null 
  ? Number(localStorage.getItem("pnc_tz_offset")) 
  : 9;

// 요일별 소비 이벤트 & 연맹 고정 일정 데이터 맵
const SCHEDULE_DATA = {
  ace: [
    { 
      dayName: "월요일 (Mon)", 
      themeTitle: "🦸 영웅 집결", 
      themeConsume: "고급 모집 스크롤, 영웅 조각 합성, 영웅 레벨업", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 1일차 (3회 트라이)", desc: "매주 월~수 진행 · 보스 누적 점수 (개인/연맹/서버 보상)", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🚪 Gate (지옥의 문)", desc: "연맹 인페르노 게이트 소환 및 격파", type: "gate" }
      ]
    },
    { 
      dayName: "화요일 (Tue)", 
      themeTitle: "🏗️ 성지 발전 (건설/연구)", 
      themeConsume: "건설 가속, 연구 가속, 자원 소모", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 2일차 (3회 트라이)", desc: "매주 월~수 진행 · 매일 3회 도전 기회 소진 필수", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🎉 Party (연맹 파티)", desc: "연맹 영토 모닥불 만찬 & 선물", type: "party" },
        { timeUTC: "13:20", name: "🧟 Undead (언데드 침략)", desc: "연맹 성채 방어 & 병력 지원", type: "defence" }
      ]
    },
    { 
      dayName: "수요일 (Wed)", 
      themeTitle: "⚡ 스태미나 & 자원 채집", 
      themeConsume: "AP/스태미나 포션 소모, 필드 몬스터 사냥, 맵 자원지 채집", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 3일차 (오늘 마감!)", desc: "월~수 연맹 시련 마지막 날 · 남은 3회 트라이 완료 필수", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "-", name: "😴 22시 연맹 이벤트 없음", desc: "개인 자원 채집 및 정비 휴식", type: "rest" }
      ]
    },
    { 
      dayName: "목요일 (Thu)", 
      themeTitle: "⚔️ 병력 훈련 (군비 확충)", 
      themeConsume: "훈련 가속, 병력 모집, 병사 티어 승급", 
      events: [
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🚪 Gate (지옥의 문)", desc: "연맹 인페르노 게이트 소환 및 격파", type: "gate" },
        { timeUTC: "13:20", name: "🧟 Undead (언데드 침략)", desc: "연맹 성채 방어 & 병력 지원", type: "defence" }
      ]
    },
    { 
      dayName: "금요일 (Fri)", 
      themeTitle: "🐉 드래곤 & 장비 강화 (완벽 대비)", 
      themeConsume: "드래곤 스톤, 장비 제련/강화 문장, 종합 가속권", 
      events: [
        { timeUTC: "12:00", name: "⚔️ OW (파멸의 전장)", desc: "100% 안전 전장 맞대결! 약 4만 점 목표", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🎉 Party (연맹 파티)", desc: "연맹 영토 모닥불 만찬 & 선물", type: "party" }
      ]
    },
    { 
      dayName: "토요일 (Sat)", 
      themeTitle: "💎 정수 & 수정 획득 (에이스 결전)", 
      themeConsume: "정수 획득, 수정 파밍, 킬 점수 달성", 
      events: [
        { timeUTC: "12:00", name: "👑 CoL (왕들의 전쟁 개시)", desc: "T1 텐트 채우기 & 성당 무료 부활, 숲속 성채 이전", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" }
      ]
    },
    { 
      dayName: "일요일 (Sun)", 
      themeTitle: "📦 다음 주 논에이스 준비 (비축 모드)", 
      themeConsume: "가속권 및 고급 모집 스크롤 아끼기 (비축)", 
      events: [
        { timeUTC: "10:00", name: "👑 CoL 왕좌 쟁탈 종료", desc: "19:00 KST 전쟁 종료 및 보상 결산", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" }
      ]
    }
  ],
  nonAce: [
    { 
      dayName: "월요일 (Mon)", 
      themeTitle: "🦸 내정 정비 & 과학 연구", 
      themeConsume: "연구 가속, 과학 기술 투자, 내정 발전", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 1일차 (3회 트라이)", desc: "매주 월~수 진행 · 보스 누적 점수 (개인/연맹/서버 보상)", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🚪 Gate (지옥의 문)", desc: "연맹 인페르노 게이트 소환 및 격파", type: "gate" }
      ]
    },
    { 
      dayName: "화요일 (Tue)", 
      themeTitle: "🔮 룬 사용, 물자 수집 & 발전", 
      themeConsume: "고급 룬 장착, 물자 채집, 영지 생산 수집", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 2일차 (3회 트라이)", desc: "매주 월~수 진행 · 매일 3회 도전 기회 소진 필수", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🛡️ Defence (연맹 방어전)", desc: "연맹 깃발 및 거점 방어 전투", type: "defence" },
        { timeUTC: "13:20", name: "🎉 Party (연맹 파티)", desc: "연맹 영토 모닥불 만찬 & 선물", type: "party" }
      ]
    },
    { 
      dayName: "수요일 (Wed)", 
      themeTitle: "🛡️ 장비 강화 & 금단의 보물", 
      themeConsume: "장비 강화 재료 소모, 보물 탐색", 
      events: [
        { timeUTC: "-", name: "🏛️ 연맹 시련 3일차 (오늘 마감!)", desc: "월~수 연맹 시련 마지막 날 · 남은 3회 트라이 완료 필수", type: "gate" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "-", name: "🪙 행운의 뒤집기 1일차", desc: "무료 코인 6개 챙기기 & 수요일 22시 연맹 이벤트 휴식", type: "party" }
      ]
    },
    { 
      dayName: "목요일 (Thu)", 
      themeTitle: "⚔️ 부대 정비 및 기본 훈련", 
      themeConsume: "훈련 가속, 보병/기병/궁병 군비 증강", 
      events: [
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🛡️ Defence (연맹 방어전)", desc: "연맹 깃발 및 거점 방어 전투", type: "defence" },
        { timeUTC: "13:20", name: "🚪 Gate (지옥의 문)", desc: "연맹 인페르노 게이트 소환 및 격파", type: "gate" }
      ]
    },
    { 
      dayName: "금요일 (Fri)", 
      themeTitle: "💎 장비 및 룬 정밀 제련", 
      themeConsume: "장비 옵션 리롤, 룬 강화, 제련석 소모", 
      events: [
        { timeUTC: "12:00", name: "⚔️ OW (파멸의 전장)", desc: "100% 안전 전장 맞대결! 약 4만 점 목표", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" },
        { timeUTC: "13:15", name: "🎉 Party (연맹 파티)", desc: "연맹 영토 모닥불 만찬 & 선물", type: "party" }
      ]
    },
    { 
      dayName: "토요일 (Sat)", 
      themeTitle: "🌐 전서버 원정 (SvS 1일차)", 
      themeConsume: "24h 쉴드 필수, 홀수 시간 T1 다이아 채집", 
      events: [
        { timeUTC: "10:00", name: "🌐 SvS 전서버 원정 개시", desc: "24시간 쉴드 필수! 홀수 시간 다이아 파밍 (T1 공성차)", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" }
      ]
    },
    { 
      dayName: "일요일 (Sun)", 
      themeTitle: "📦 다음 주 에이스 로드 준비 (비축)", 
      themeConsume: "에이스 로드(보이드/모니카) 대비 모든 재료 비축", 
      events: [
        { timeUTC: "10:00", name: "🌐 SvS 전서버 원정 종료", desc: "19:00 KST 원정 종료 및 쉴드 해제 주의", type: "ow" },
        { timeUTC: "13:00", name: "🏹 H.F (사냥 집중)", desc: "몬스터 거점 랠리 집중 사냥", type: "hf" }
      ]
    }
  ]
};

// 시간 변환
function convertTime(utcTimeStr, offset) {
  if (!utcTimeStr || utcTimeStr === "-") return "-";
  const [h, m] = utcTimeStr.split(":").map(Number);
  let targetH = (h + offset) % 24;
  if (targetH < 0) targetH += 24;
  const padH = String(targetH).padStart(2, "0");
  const padM = String(m).padStart(2, "0");
  const sign = offset >= 0 ? `+${offset}` : `${offset}`;
  return `${padH}:${padM} (UTC${sign})`;
}

function convertRange(rangeStr, offset) {
  const parts = rangeStr.split("~").map(s => s.trim());
  if (parts.length !== 2) return rangeStr;
  return `${convertTime(parts[0], offset)} ~ ${convertTime(parts[1], offset)}`;
}

// 시차 변경 및 저장
function setTZ(name, offset) {
  currentTzName = name;
  currentTzOffset = offset;
  localStorage.setItem("pnc_tz_name", name);
  localStorage.setItem("pnc_tz_offset", offset);

  document.getElementById("btnTzKst").classList.toggle("active", name === "KST");
  document.getElementById("btnTzUtc").classList.toggle("active", name === "UTC");
  
  const customSelect = document.getElementById("customTzSelect");
  if (name !== "KST" && name !== "UTC") {
    customSelect.value = String(offset);
  } else {
    customSelect.value = "";
  }
  render();
}

function onCustomTZChange(val) {
  if (!val) return;
  if (val === "custom") {
    const input = prompt("UTC 기준 시차 오프셋을 숫자로 입력하세요 (-12 ~ +14):", "9");
    if (input !== null && !isNaN(Number(input))) {
      const num = Number(input);
      setTZ(`UTC${num >= 0 ? '+' + num : num}`, num);
    }
  } else {
    const num = Number(val);
    setTZ(`UTC${num >= 0 ? '+' + num : num}`, num);
  }
}

// 날짜 이동
function moveWeek(delta) {
  selectedDate = new Date(selectedDate.getTime() + delta * 7 * 24 * 3600 * 1000);
  render();
}

function goToToday() {
  selectedDate = new Date();
  render();
}

function onDatePicked(val) {
  if (!val) return;
  selectedDate = new Date(val + "T12:00:00Z");
  render();
}

// 탭 전환
function switchTab(tabId, el) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// 전체 렌더링
function render() {
  const realNow = new Date();
  if (shotData) renderShotEvents();

  // 시차 컨트롤러 활성화 상태 동기화
  document.getElementById("btnTzKst").classList.toggle("active", currentTzName === "KST");
  document.getElementById("btnTzUtc").classList.toggle("active", currentTzName === "UTC");

  // 날짜 피커 값 동기화
  const selYear = selectedDate.getFullYear();
  const selMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const selDay = String(selectedDate.getDate()).padStart(2, "0");
  document.getElementById("datePicker").value = `${selYear}-${selMonth}-${selDay}`;

  // 선택된 날짜 기준 월요일(UTC) 계산
  const targetUTC = new Date(selectedDate.getTime());
  const dayOfWeek = targetUTC.getUTCDay(); // 0(일)~6(토)
  const diffToMonday = (dayOfWeek + 6) % 7;
  const targetMonday = new Date(targetUTC);
  targetMonday.setUTCDate(targetUTC.getUTCDate() - diffToMonday);
  targetMonday.setUTCHours(0, 0, 0, 0);

  // 주차 계산 및 에이스 여부
  const diffDays = Math.floor((targetMonday - ANCHOR_DATE) / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const isAceWeek = (diffWeeks % 2 === 1);

  // 상단 배지 갱신
  // 1. 현재 날짜/시간
  const tzOffset = currentTzOffset;
  const localNow = new Date(realNow.getTime() + (tzOffset * 3600 + realNow.getTimezoneOffset() * 60) * 1000);
  const nowStr = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,'0')}-${String(localNow.getDate()).padStart(2,'0')} ${String(localNow.getHours()).padStart(2,'0')}:${String(localNow.getMinutes()).padStart(2,'0')}`;
  document.getElementById("currentDateBadge").textContent = `📅 ${nowStr} (UTC${tzOffset >= 0 ? '+' + tzOffset : tzOffset})`;

  // 2. 주간 배지
  const weekBadge = document.getElementById("currentWeekBadge");
  if (isAceWeek) {
    weekBadge.className = "badge badge-ace";
    weekBadge.textContent = "👑 에이스 로드 주간 (보이드/모니카)";
  } else {
    weekBadge.className = "badge badge-nonace";
    weekBadge.textContent = "⚔️ 논에이스 주간 (노리스/이반 Apan)";
  }

  // 3. 대형 연맹 이벤트 (연맹 대결 vs 연맹 총동원 쇼다운 동적 계산)
  // 기준 앵커: 2026-09-14(월) = 연맹 대결, 2026-09-21(월) = 연맹 총동원 (쇼다운)
  const ALLIANCE_ANCHOR = new Date("2026-09-14T00:00:00Z");
  const eventDiffDays = Math.floor((targetMonday - ALLIANCE_ANCHOR) / (1000 * 60 * 60 * 24));
  const eventDiffWeeks = Math.floor(eventDiffDays / 7);
  const isShowdownWeek = (((eventDiffWeeks % 2) + 2) % 2 === 1);

  const allianceBadge = document.getElementById("allianceEventBadge");
  const cardDuel = document.getElementById("card-duel");
  const cardShowdown = document.getElementById("card-showdown");
  const duelBadge = document.getElementById("badge-active-duel");
  const showdownBadge = document.getElementById("badge-active-showdown");

  if (isShowdownWeek) {
    allianceBadge.className = "badge badge-event";
    allianceBadge.textContent = "🎪 진행 중: 📜 연맹 총동원 (쇼다운 / 개인 1500점 달성)";
    if (cardShowdown && cardDuel) {
      cardShowdown.style.border = "2px solid var(--accent-green)";
      if (showdownBadge) showdownBadge.style.display = "inline-block";
      cardDuel.style.border = "1px solid var(--border-color)";
      if (duelBadge) duelBadge.style.display = "none";
    }
  } else {
    allianceBadge.className = "badge badge-event";
    allianceBadge.textContent = "🎪 진행 중: ⚔️ 연맹 대결 (Alliance Duel / 1:1 포인트전)";
    if (cardDuel && cardShowdown) {
      cardDuel.style.border = "2px solid var(--accent-gold)";
      if (duelBadge) duelBadge.style.display = "inline-block";
      cardShowdown.style.border = "1px solid var(--border-color)";
      if (showdownBadge) showdownBadge.style.display = "none";
    }
  }

  // 4. 왕자의 전쟁 상태 (목·금·토요일만 활성)
  const princeBadge = document.getElementById("princeBadge");
  const currentUTCDay = realNow.getUTCDay();
  const currentUTCHour = realNow.getUTCHours();

  // 3-2. 연맹 시련 상태 (서버 리셋 기준 매주 월·화·수 진행)
  const trialBadge = document.getElementById("trialBadge");
  const cardTrial = document.getElementById("card-trial");
  const trialActiveBadge = document.getElementById("badge-active-trial");
  const isTrialDay = [1, 2, 3].includes(currentUTCDay);
  if (trialBadge) {
    if (isTrialDay) {
      trialBadge.className = "badge badge-ace";
      trialBadge.style.cssText = "background:rgba(192,132,252,0.2); border-color:#a855f7;";
      trialBadge.textContent = `🏛️ 연맹 시련: ${currentUTCDay}일차 진행 중 (월~수 · 3회 트라이)`;
    } else {
      trialBadge.className = "badge badge-neutral";
      trialBadge.style.cssText = "";
      trialBadge.textContent = "🏛️ 연맹 시련: 월~수 진행 (대기 중)";
    }
  }
  if (cardTrial) {
    if (isTrialDay) {
      cardTrial.style.border = "2px solid var(--accent-purple)";
      if (trialActiveBadge) trialActiveBadge.style.display = "inline-block";
    } else {
      cardTrial.style.border = "1px solid var(--border-color)";
      if (trialActiveBadge) trialActiveBadge.style.display = "none";
    }
  }

  const isPrinceDay = [4, 5, 6].includes(currentUTCDay);
  if (isPrinceDay) {
    let slotName = "1회차 (09:00~16:55 KST)";
    if (currentUTCHour >= 8 && currentUTCHour < 16) slotName = "2회차 (17:00~00:55 KST)";
    else if (currentUTCHour >= 16 || currentUTCHour < 0) slotName = "3회차 (01:00~08:55 KST)";
    princeBadge.textContent = `👑 왕자의 전쟁: ${slotName} 진행 중!`;
    princeBadge.style.display = "inline-flex";
  } else {
    princeBadge.textContent = "👑 왕자의 전쟁: 목·금·토 오픈 대기";
  }

  // 5. 드래곤 캐슬 3일 주기 계산 (2026-09-18 금 = 1일차)
  const dragonDiffDays = Math.floor((realNow - DRAGON_CASTLE_ANCHOR) / (1000 * 60 * 60 * 24));
  const dragonCycleDay = ((dragonDiffDays % 3) + 3) % 3 + 1; // 1, 2, 3
  const daysUntilReset = 3 - dragonCycleDay;
  const dragonBadge = document.getElementById("dragonBadge");
  dragonBadge.textContent = `🐉 드래곤 캐슬: ${dragonCycleDay}일차 (${daysUntilReset === 0 ? '오늘 밤 리셋' : daysUntilReset + '일 후 리셋'})`;

  // 주간 시간표 렌더링
  const scheduleList = isAceWeek ? SCHEDULE_DATA.ace : SCHEDULE_DATA.nonAce;
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";

  // 오늘 날짜인지 판별용
  const realLocalDayIdx = (realNow.getDay() + 6) % 7; // 0:월 ~ 6:일
  const isViewingCurrentWeek = Math.abs(targetMonday - realNow) < 7 * 24 * 3600 * 1000;

  scheduleList.forEach((dayData, idx) => {
    // 해당 요일의 실제 날짜 계산
    const dayDate = new Date(targetMonday);
    dayDate.setUTCDate(targetMonday.getUTCDate() + idx);
    const dayDateStr = `${dayDate.getUTCMonth() + 1}/${dayDate.getUTCDate()}`;

    const isToday = isViewingCurrentWeek && (idx === realLocalDayIdx);
    const card = document.createElement("div");
    card.className = `day-card ${isToday ? 'today' : ''}`;

    let eventsHtml = "";
    dayData.events.forEach(evt => {
      let highlightClass = "";
      if (evt.type === "ow") highlightClass = "highlight-ow";
      else if (evt.type === "hf") highlightClass = "highlight-hf";
      else if (evt.type === "gate") highlightClass = "highlight-gate";
      else if (evt.type === "party") highlightClass = "highlight-party";
      else if (evt.type === "defence") highlightClass = "highlight-defence";

      const formattedTime = convertTime(evt.timeUTC, currentTzOffset);

      eventsHtml += `
        <div class="event-item ${highlightClass}">
          <span class="event-time">${formattedTime}</span>
          <div>
            <div class="event-name">${evt.name}</div>
            <div class="event-desc">${evt.desc}</div>
          </div>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="day-header">
        <div class="day-title-row">
          <span class="day-title">${dayData.dayName}</span>
          <span class="day-date-sub">${dayDateStr}</span>
        </div>
        <div class="daily-theme-box">
          <div class="daily-theme-title">🎯 ${dayData.themeTitle}</div>
          <div class="daily-consume-items">📦 소비/진행: ${dayData.themeConsume}</div>
        </div>
      </div>
      <div class="event-list">
        ${eventsHtml}
      </div>
    `;
    grid.appendChild(card);
  });

  // 안내 배너 시간 갱신
  document.querySelectorAll(".time-hf").forEach(el => el.textContent = convertTime("13:00", currentTzOffset));
  document.querySelectorAll(".time-ow").forEach(el => el.textContent = convertTime("12:00", currentTzOffset));
  document.querySelectorAll(".time-main").forEach(el => {
    el.textContent = `${convertTime("13:15", currentTzOffset)} ~ ${convertTime("13:20", currentTzOffset)}`;
  });

  // 왕자의 전쟁 슬롯 시간 갱신
  document.querySelector(".time-slot-1").textContent = convertRange("00:00 ~ 07:55", currentTzOffset);
  document.querySelector(".time-slot-2").textContent = convertRange("08:00 ~ 15:55", currentTzOffset);
  document.querySelector(".time-slot-3").textContent = convertRange("16:00 ~ 23:55", currentTzOffset);

  // 왕자의 전쟁 현재 슬롯 하이라이트
  document.querySelectorAll(".slot-card").forEach(c => c.classList.remove("active-slot"));
  if (isPrinceDay) {
    if (currentUTCHour >= 0 && currentUTCHour < 8) {
      document.getElementById("slotCard1")?.classList.add("active-slot");
    } else if (currentUTCHour >= 8 && currentUTCHour < 16) {
      document.getElementById("slotCard2")?.classList.add("active-slot");
    } else {
      document.getElementById("slotCard3")?.classList.add("active-slot");
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// 📸 스크린샷 판독 이벤트 (events.json) — 게임 화면에서 읽은 정보만 표시
// ══════════════════════════════════════════════════════════════════
let shotData = null;
const SHOT_CAT = { alliance: "연맹", personal: "개인", server: "서버", pack: "패키지", notice: "공지", other: "기타" };
const HTML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => HTML_ESC[c]);
}

function fmtShotAt(ms) {
  const d = new Date(ms + currentTzOffset * 3600000);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd}) ${hh}:${mm} ${currentTzName}`;
}

function fmtRemain(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${mi}분`;
  return `${mi}분`;
}

function shotChecked(id, idx) {
  try { return localStorage.getItem(`pnc_shot_${id}_${idx}`) === "1"; } catch (e) { return false; }
}
function toggleShotCheck(id, idx, el) {
  try { localStorage.setItem(`pnc_shot_${id}_${idx}`, el.checked ? "1" : "0"); } catch (e) {}
}

async function loadShotEvents() {
  try {
    const res = await fetch("events.json", { cache: "no-store" });
    if (!res.ok) return;
    shotData = await res.json();
    renderShotEvents();
  } catch (e) { /* events.json 없으면 패널 숨김 유지 */ }
}

function renderShotEvents() {
  const panel = document.getElementById("shotPanel");
  if (!shotData || !Array.isArray(shotData.events)) { panel.hidden = true; return; }
  const now = Date.now();
  const items = shotData.events.map(ev => ({
    ev,
    start: ev.start_at ? Date.parse(ev.start_at) : null,
    end: ev.end_at ? Date.parse(ev.end_at) : null,
  })).filter(x => (!x.end || x.end > now) && (!x.start || x.start <= now + 86400000))
    .sort((a, b) => (a.end ?? Infinity) - (b.end ?? Infinity));

  panel.hidden = false;
  document.getElementById("shotUpdated").textContent =
    shotData.updated_at ? `마지막 판독 ${fmtShotAt(Date.parse(shotData.updated_at))}` : "";

  const list = document.getElementById("shotList");
  if (!items.length) {
    list.innerHTML = `<p class="shot-empty">지금 확인된 이벤트가 없어요. 새 이벤트 화면을 디스코드 스크린샷 채널에 올리면 30분 안에 여기에 떠요.</p>`;
    return;
  }

  list.innerHTML = items.map(({ ev, start, end }) => {
    const upcoming = start && start > now;
    const ending = !upcoming && end && end - now < 6 * 3600000;
    const low = ev.confidence === "low";
    const evId = String(ev.id || "").replace(/[^a-zA-Z0-9]/g, "");
    let timeLine = "마감 시각 미확인";
    if (upcoming) timeLine = `⏳ ${fmtShotAt(start)} 시작 (${fmtRemain(start - now)} 후)`;
    else if (end) timeLine = `⏰ ${fmtShotAt(end)} 마감 · ${fmtRemain(end - now)} 남음`;

    const actions = (ev.actions || []).map((a, i) => `
      <li><label><input type="checkbox" ${shotChecked(evId, i) ? "checked" : ""}
        onchange="toggleShotCheck('${evId}', ${i}, this)"><span>${escHtml(a)}</span></label></li>`).join("");
    const rules = (ev.point_rules || []).map(r =>
      `<tr><td>${escHtml(r.task)}</td><td>${escHtml(r.points)}</td></tr>`).join("");

    return `
      <article class="shot-card ${ending ? "ending" : ""} ${upcoming ? "upcoming" : ""}">
        <div class="shot-title">${escHtml(ev.name)}
          <span class="shot-chip">${escHtml(SHOT_CAT[ev.category] || ev.category || "기타")}</span>
          ${low ? '<span class="shot-chip low">불확실</span>' : ""}
        </div>
        <div class="shot-time">${timeLine}</div>
        ${ev.summary ? `<div class="shot-summary">${escHtml(ev.summary)}</div>` : ""}
        ${(ev.save_items || []).length ? `<div class="shot-warn">🚫 아끼기: ${ev.save_items.map(escHtml).join(", ")}</div>` : ""}
        ${ev.needs_check ? `<div class="shot-check">❓ 확인 필요: ${escHtml(ev.needs_check)}</div>` : ""}
        ${actions ? `<ul class="shot-actions">${actions}</ul>` : ""}
        ${rules || ev.rewards || ev.time_basis ? `<details><summary>점수표 · 보상 · 근거</summary>
          ${rules ? `<table class="shot-rules">${rules}</table>` : ""}
          ${ev.rewards ? `<p style="margin-top:6px;">🎁 ${escHtml(ev.rewards)}</p>` : ""}
          ${ev.time_basis ? `<p style="margin-top:6px;">🕒 화면 근거: ${escHtml(ev.time_basis)}</p>` : ""}
        </details>` : ""}
      </article>`;
  }).join("");
}

// 초기 실행
render();
loadShotEvents();
setInterval(() => { render(); renderShotEvents(); }, 60000);
setInterval(loadShotEvents, 10 * 60000);
