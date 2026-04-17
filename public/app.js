// ===== 상수 =====
const STORAGE_KEY_FORM    = 'ai-helper-form-state';
const STORAGE_KEY_HISTORY = 'ai-helper-history';
const HISTORY_MAX         = 10;

// ===== DOM 참조 =====
const form            = document.getElementById('inputForm');
const submitBtn       = document.getElementById('submitBtn');
const btnText         = submitBtn.querySelector('.btn-text');
const btnLoading      = submitBtn.querySelector('.btn-loading');
const resultCard      = document.getElementById('resultCard');
const errorCard       = document.getElementById('errorCard');
const extraNote       = document.getElementById('extraNote');
const charCount       = document.getElementById('charCount');
const differentBtn    = document.getElementById('differentBtn');
const historyPanel    = document.getElementById('historyPanel');
const historyList     = document.getElementById('historyList');
const historyClearBtn = document.getElementById('historyClearBtn');

// ===== 상태 =====
let leafletMap        = null;
let userLocation      = null;
let lastInput         = null;   // 마지막 요청 input
let lastResult        = null;   // 피드백 전송용 마지막 추천 결과
let excludedRecs      = [];     // 이미 받은 추천 목록 (중복 방지용)
let mapAbortController = null;

// ===== 초기화 =====
restoreFormState();
renderHistory();
requestLocation();

extraNote.addEventListener('input', () => {
  charCount.textContent = extraNote.value.length;
  saveFormState();
});

// 폼 변경 시 자동 저장
form.addEventListener('change', saveFormState);

// 배너 엔진 정보 동적 업데이트
(async () => {
  try {
    const res  = await fetch('/api/health');
    const json = await res.json();
    const banner = document.getElementById('aiBannerText');
    if (json.engine === 'ai' && json.model) {
      banner.textContent = `Groq AI · ${json.model} 분석 준비 완료`;
    } else {
      banner.textContent = 'Rule 기반 엔진 분석 준비 완료';
    }
  } catch {
    document.getElementById('aiBannerText').textContent = '분석 준비 완료';
  }
})();

// ===== 폼 제출 =====
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = collectFormData();
  if (!data) return;
  excludedRecs = []; // 새 입력이면 제외 목록 초기화
  await requestRecommend(data);
});

// ===== 다른 추천 버튼 =====
differentBtn.addEventListener('click', async () => {
  if (!lastInput) return;
  const excluded = excludedRecs.length
    ? `다음 추천은 제외하고 완전히 다른 추천을 해줘: ${excludedRecs.join(', ')}`
    : '이전과 다른 새로운 추천을 해줘';
  const altInput = {
    ...lastInput,
    extra_note: lastInput.extra_note
      ? `${lastInput.extra_note} (${excluded})`
      : excluded,
  };
  await requestRecommend(altInput, true);
});

// ===== 히스토리 전체 삭제 =====
historyClearBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY_HISTORY);
  renderHistory();
});

// ===== 핵심 함수 =====

function collectFormData() {
  const fd   = new FormData(form);
  const data = {};
  for (const [key, value] of fd.entries()) {
    if (value) data[key] = value;
  }
  if (Object.keys(data).filter(k => k !== 'extra_note').length === 0) {
    showError('최소 한 가지 항목은 선택해주세요');
    return null;
  }
  return data;
}

async function requestRecommend(data, isDifferent = false) {
  setLoading(true);
  hideCards();

  try {
    const res  = await fetch('/api/recommend', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      const msg = json.error?.details?.join('\n') || json.error?.message || '오류가 발생했습니다';
      showError(msg);
      return;
    }

    // 이전 추천과 동일한 결과가 나오면 한 번 더 재시도
    if (isDifferent && excludedRecs.includes(json.data.recommendation)) {
      const retryInput = {
        ...data,
        extra_note: `${data.extra_note || ''} 반드시 이전과 완전히 다른 추천을 해줘. 제외: ${excludedRecs.join(', ')}`.trim(),
      };
      const res2  = await fetch('/api/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(retryInput),
      });
      const json2 = await res2.json();
      if (res2.ok && json2.success && !excludedRecs.includes(json2.data.recommendation)) {
        lastInput = lastInput ?? data;
        excludedRecs.push(json2.data.recommendation);
        saveHistory(json2.data, lastInput);
        showResult(json2.data);
        return;
      }
    }

    if (!isDifferent) {
      lastInput    = data;
      excludedRecs = [json.data.recommendation];
    } else {
      excludedRecs.push(json.data.recommendation);
    }

    saveHistory(json.data, lastInput ?? data);
    showResult(json.data);
  } catch {
    showError('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    setLoading(false);
  }
}

// ===== 폼 상태 저장/복원 =====

function saveFormState() {
  const fd    = new FormData(form);
  const state = {};
  for (const [key, value] of fd.entries()) {
    state[key] = value;
  }
  try {
    localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(state));
  } catch { /* 스토리지 용량 초과 등 무시 */ }
}

function restoreFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORM);
    if (!raw) return;
    const state = JSON.parse(raw);
    for (const [key, value] of Object.entries(state)) {
      const el = form.elements[key];
      if (!el) continue;
      el.value = value;
    }
    charCount.textContent = (state.extra_note || '').length;
  } catch { /* 파싱 오류 무시 */ }
}

// ===== 히스토리 저장/렌더 =====

function saveHistory(result, input) {
  try {
    const history = loadHistory();
    const entry = {
      id:             Date.now(),
      recommendation: result.recommendation,
      reason:         result.reason,
      keyword:        result.keyword,
      image_keyword:  result.image_keyword,
      alternatives:   result.alternatives,
      input,
      ts: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
    const deduped = history.filter(h => h.recommendation !== entry.recommendation);
    const next    = [entry, ...deduped].slice(0, HISTORY_MAX);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(next));
    renderHistory();
  } catch { /* 무시 */ }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || '[]');
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  if (!history.length) {
    historyPanel.hidden = true;
    return;
  }
  historyPanel.hidden = false;
  historyList.innerHTML = '';
  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-main">
        <span class="history-rec">${entry.recommendation}</span>
        <span class="history-ts">${entry.ts}</span>
      </div>
      <p class="history-reason">${entry.reason}</p>
    `;
    item.addEventListener('click', () => {
      showResult(entry);
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    historyList.appendChild(item);
  });
}

// ===== UI 헬퍼 =====

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.hidden     = loading;
  btnLoading.hidden  = !loading;
}

function hideCards() {
  resultCard.hidden = true;
  errorCard.hidden  = true;
}

function showResult({ recommendation, reason, alternatives, keyword, image_keyword, place_keyword }) {
  lastResult = { recommendation, reason, keyword, place_keyword };

  document.getElementById('recommendationText').textContent = recommendation;
  document.getElementById('reasonText').textContent         = reason;

  resetFeedback();

  // 대안 목록
  const list = document.getElementById('alternativesList');
  list.innerHTML = '';
  alternatives.forEach((alt, i) => {
    const item = document.createElement('div');
    item.className = 'alternative-item';
    item.innerHTML = `<span class="alt-badge">${i + 1}</span><span>${alt}</span>`;
    list.appendChild(item);
  });

  // 이미지
  loadImages(image_keyword || keyword || recommendation);

  // 유튜브 링크
  const query  = encodeURIComponent((keyword || recommendation) + ' 추천');
  const ytLink = document.getElementById('youtubeLink');
  const ytText = document.getElementById('youtubeLinkText');
  ytLink.href  = `https://www.youtube.com/results?search_query=${query}`;
  ytText.textContent = `"${keyword || recommendation}" 관련 유튜브 영상 보기`;

  resultCard.hidden = false;

  // 지도
  const mapKeyword = place_keyword || keyword || recommendation;
  if (userLocation) {
    loadMap(mapKeyword, recommendation, userLocation.lat, userLocation.lon);
  } else {
    setMapStatus('위치 권한을 허용해주세요');
    requestLocation(() => {
      if (userLocation) loadMap(mapKeyword, recommendation, userLocation.lat, userLocation.lon);
    });
  }

  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  errorCard.hidden = false;
  errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== 이미지 =====
async function loadImages(kw) {
  const grid = document.getElementById('imageGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const sk = document.createElement('div');
    sk.className = 'image-skeleton';
    grid.appendChild(sk);
  }
  try {
    const res  = await fetch(`/api/images?q=${encodeURIComponent(kw)}&count=3`);
    const json = await res.json();
    grid.innerHTML = '';
    if (!json.success || !json.images.length) {
      grid.innerHTML = '<p style="font-size:12px;color:var(--text-muted);grid-column:1/-1">이미지를 불러오지 못했어요</p>';
      return;
    }
    json.images.forEach(img => {
      const el = document.createElement('img');
      el.src   = img.url;
      el.alt   = img.alt;
      el.title = `Photo by ${img.credit}`;
      grid.appendChild(el);
    });
  } catch {
    grid.innerHTML = '<p style="font-size:12px;color:var(--text-muted);grid-column:1/-1">이미지를 불러오지 못했어요</p>';
  }
}

// ===== 위치 =====
function requestLocation(callback) {
  if (!navigator.geolocation) {
    setMapStatus('위치 서비스를 지원하지 않는 브라우저예요');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      if (!callback) autoFillWeather(userLocation.lat, userLocation.lon);
      if (callback) callback();
    },
    () => {
      setMapStatus('위치 권한이 거부됐어요. 서울 기준으로 표시해요');
      userLocation = { lat: 37.5665, lon: 126.9780 };
      if (!callback) autoFillWeather(userLocation.lat, userLocation.lon);
      if (callback) callback();
    },
    { timeout: 8000 }
  );
}

// ===== 날씨 자동 감지 =====
async function autoFillWeather(lat, lon) {
  const weatherSelect = document.querySelector('select[name="weather"]');
  if (!weatherSelect || weatherSelect.value) return;

  try {
    const res  = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const json = await res.json();
    if (json.success && json.data?.weather) {
      weatherSelect.value = json.data.weather;
      saveFormState();
      const label = weatherSelect.closest('.field-group')?.querySelector('.field-label');
      if (label && !label.querySelector('.auto-tag')) {
        const tag = document.createElement('span');
        tag.className = 'auto-tag';
        tag.textContent = '자동';
        label.appendChild(tag);
      }
    }
  } catch { /* 날씨 자동 감지 실패는 조용히 무시 */ }
}

function setMapStatus(msg) {
  const el = document.getElementById('mapStatus');
  if (el) el.textContent = msg;
}

// ===== 피드백 =====
function resetFeedback() {
  const likeBtn    = document.getElementById('feedbackLike');
  const dislikeBtn = document.getElementById('feedbackDislike');
  if (likeBtn)    { likeBtn.classList.remove('active');    likeBtn.disabled = false; }
  if (dislikeBtn) { dislikeBtn.classList.remove('active'); dislikeBtn.disabled = false; }
  const msg = document.getElementById('feedbackMsg');
  if (msg) msg.textContent = '';
}

async function sendFeedback(rating) {
  if (!lastResult) return;

  const likeBtn    = document.getElementById('feedbackLike');
  const dislikeBtn = document.getElementById('feedbackDislike');
  const msg        = document.getElementById('feedbackMsg');

  likeBtn.disabled    = true;
  dislikeBtn.disabled = true;
  if (rating === 'like') likeBtn.classList.add('active');
  else                   dislikeBtn.classList.add('active');

  try {
    await fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        recommendation: lastResult.recommendation,
        reason:         lastResult.reason,
        input: (() => {
          const fd = new FormData(form);
          const d  = {};
          for (const [k, v] of fd.entries()) if (v) d[k] = v;
          return d;
        })()
      })
    });
    if (msg) msg.textContent = rating === 'like' ? '피드백 감사해요 😊' : '다음엔 더 잘 추천할게요 🙏';
  } catch {
    if (msg) msg.textContent = '피드백 전송에 실패했어요';
  }
}

// ===== 지도 =====
async function loadMap(keyword, recommendation, lat, lon) {
  if (mapAbortController) mapAbortController.abort();
  mapAbortController = new AbortController();

  setMapStatus('장소 검색 중...');
  try {
    const params = new URLSearchParams({ lat, lon, keyword: keyword || '', recommendation: recommendation || '', radius: 2000 });
    const res  = await fetch(`/api/places?${params}`, { signal: mapAbortController.signal });
    const json = await res.json();

    if (!json.success) throw new Error(json.error?.message || json.error);

    if (json.home) {
      setMapStatus('집에서 즐기는 활동이에요');
      document.getElementById('map').style.display = 'none';
      document.getElementById('placeList').innerHTML = '<p class="map-empty">집에서 할 수 있는 활동이라 주변 장소가 필요 없어요 🏠</p>';
      return;
    }

    document.getElementById('map').style.display = '';
    renderMap(lat, lon, json.places);
    renderPlaceList(json.places);
    const count = json.places.length;
    setMapStatus(count > 0 ? `반경 2km 내 ${count}개 장소` : '주변에 관련 장소가 없어요');
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[map]', err.message);
    setMapStatus('장소 정보를 불러오지 못했어요');
  }
}

function renderMap(lat, lon, places) {
  const container = document.getElementById('map');
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  leafletMap = L.map(container, { zoomControl: true, attributionControl: false }).setView([lat, lon], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(leafletMap);

  const myIcon = L.divIcon({
    html: `<div style="width:12px;height:12px;background:#C9A84C;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(201,168,76,0.25)"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6],
  });
  L.marker([lat, lon], { icon: myIcon }).addTo(leafletMap).bindPopup('<div class="popup-name">현재 위치</div>');

  const placeIcon = L.divIcon({
    html: `<div style="width:10px;height:10px;background:#fff;border:2px solid #C9A84C;border-radius:50%"></div>`,
    className: '', iconSize: [10, 10], iconAnchor: [5, 5],
  });
  places.forEach(place => {
    L.marker([place.lat, place.lon], { icon: placeIcon })
      .addTo(leafletMap)
      .bindPopup(`<div class="popup-name">${place.name}</div><div class="popup-type">${place.type}</div>`);
  });

  if (places.length > 0) {
    const bounds = L.latLngBounds([[lat, lon], ...places.map(p => [p.lat, p.lon])]);
    leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
}

function renderPlaceList(places) {
  const list = document.getElementById('placeList');
  list.innerHTML = '';
  if (!places.length) {
    list.innerHTML = '<p class="map-empty">주변에 관련 장소를 찾지 못했어요</p>';
    return;
  }
  places.forEach((place, i) => {
    const item = document.createElement('div');
    item.className = 'place-item';

    const num = document.createElement('span');
    num.className = 'place-num';
    num.textContent = i + 1;

    const info = document.createElement('div');
    info.className = 'place-info';

    const name = document.createElement('div');
    name.className = 'place-name';
    name.textContent = place.name;

    const type = document.createElement('div');
    type.className = 'place-type';
    type.textContent = place.type + (place.address ? ' · ' + place.address : '') + (place.distance ? ' · ' + place.distance : '');

    const links = document.createElement('div');
    links.className = 'place-links';
    if (place.links?.kakao) {
      const kakao = document.createElement('a');
      kakao.href = place.links.kakao;
      kakao.target = '_blank';
      kakao.rel = 'noopener';
      kakao.className = 'place-link-btn';
      kakao.textContent = '카카오';
      kakao.addEventListener('click', e => e.stopPropagation());
      links.appendChild(kakao);
    }
    if (place.links?.naver) {
      const naver = document.createElement('a');
      naver.href = place.links.naver;
      naver.target = '_blank';
      naver.rel = 'noopener';
      naver.className = 'place-link-btn';
      naver.textContent = '네이버';
      naver.addEventListener('click', e => e.stopPropagation());
      links.appendChild(naver);
    }

    info.appendChild(name);
    info.appendChild(type);
    item.appendChild(num);
    item.appendChild(info);
    item.appendChild(links);

    item.addEventListener('click', () => {
      if (leafletMap) leafletMap.setView([place.lat, place.lon], 16);
    });
    list.appendChild(item);
  });
}
