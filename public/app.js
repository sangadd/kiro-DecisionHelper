const form = document.getElementById('inputForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');
const resultCard = document.getElementById('resultCard');
const errorCard = document.getElementById('errorCard');
const extraNote = document.getElementById('extraNote');
const charCount = document.getElementById('charCount');

let leafletMap = null;
let userLocation = null;
let lastResult = null;      // 피드백 전송용 마지막 추천 결과 저장
let mapAbortController = null;

// 글자 수 카운터
extraNote.addEventListener('input', () => {
  charCount.textContent = extraNote.value.length;
});

// 페이지 로드 시 위치 요청 → 날씨 자동 감지
requestLocation();

// 배너 엔진 정보 동적 업데이트
(async () => {
  try {
    const res = await fetch('/api/health');
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const data = {};
  for (const [key, value] of fd.entries()) {
    if (value) data[key] = value;
  }

  // 최소 1개 이상 선택했는지만 체크
  if (Object.keys(data).filter(k => k !== 'extra_note').length === 0) {
    showError('최소 한 가지 항목은 선택해주세요');
    return;
  }

  setLoading(true);
  hideCards();

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      const msg = json.error?.details?.join('\n') || json.error?.message || '오류가 발생했습니다';
      showError(msg);
      return;
    }

    showResult(json.data);
  } catch {
    showError('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    setLoading(false);
  }
});

function labelOf(field) {
  const map = { fatigue: '피로도', mood: '기분', weather: '날씨', time: '여유 시간', budget: '예산' };
  return map[field] || field;
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.hidden = loading;
  btnLoading.hidden = !loading;
}

function hideCards() {
  resultCard.hidden = true;
  errorCard.hidden = true;
}

function showResult({ recommendation, reason, alternatives, keyword, image_keyword, place_keyword }) {
  lastResult = { recommendation, reason, keyword, place_keyword };

  document.getElementById('recommendationText').textContent = recommendation;
  document.getElementById('reasonText').textContent = reason;

  // 피드백 버튼 초기화
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

  // 이미지 로드 (Unsplash)
  loadImages(image_keyword || keyword || recommendation);

  // 유튜브 링크
  const query = encodeURIComponent((keyword || recommendation) + ' 추천');
  const ytLink = document.getElementById('youtubeLink');
  const ytText = document.getElementById('youtubeLinkText');
  ytLink.href = `https://www.youtube.com/results?search_query=${query}`;
  ytText.textContent = `"${keyword || recommendation}" 관련 유튜브 영상 보기`;

  resultCard.hidden = false;

  // 지도: 위치 있으면 바로, 없으면 요청
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

// ===== 이미지 =====
async function loadImages(keyword) {
  const grid = document.getElementById('imageGrid');
  grid.innerHTML = '';

  // 스켈레톤 3개
  for (let i = 0; i < 3; i++) {
    const sk = document.createElement('div');
    sk.className = 'image-skeleton';
    grid.appendChild(sk);
  }

  try {
    const res = await fetch(`/api/images?q=${encodeURIComponent(keyword)}&count=3`);
    const json = await res.json();

    grid.innerHTML = '';
    if (!json.success || !json.images.length) {
      grid.innerHTML = '<p style="font-size:12px;color:var(--text-muted);grid-column:1/-1">이미지를 불러오지 못했어요</p>';
      return;
    }

    json.images.forEach(img => {
      const el = document.createElement('img');
      el.src = img.url;
      el.alt = img.alt;
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
      if (!callback) autoFillWeather(userLocation.lat, userLocation.lon); // 최초 로드 시 날씨 자동 감지
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
  if (!weatherSelect || weatherSelect.value) return; // 이미 선택된 경우 덮어쓰지 않음

  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const json = await res.json();
    if (json.success && json.data?.weather) {
      weatherSelect.value = json.data.weather;
      // 자동 감지 표시
      const label = weatherSelect.closest('.field-group')?.querySelector('.field-label');
      if (label && !label.querySelector('.auto-tag')) {
        const tag = document.createElement('span');
        tag.className = 'auto-tag';
        tag.textContent = '자동';
        label.appendChild(tag);
      }
    }
  } catch {
    // 날씨 자동 감지 실패는 조용히 무시
  }
}

function setMapStatus(msg) {
  const el = document.getElementById('mapStatus');
  if (el) el.textContent = msg;
}

// ===== 피드백 =====
function resetFeedback() {
  const likeBtn  = document.getElementById('feedbackLike');
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
  if (rating === 'like')    likeBtn.classList.add('active');
  else                      dislikeBtn.classList.add('active');

  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        recommendation: lastResult.recommendation,
        reason: lastResult.reason,
        input: (() => {
          const fd = new FormData(form);
          const d = {};
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
    const params = new URLSearchParams({
      lat, lon,
      keyword: keyword || '',
      recommendation: recommendation || '',
      radius: 2000
    });
    const res = await fetch(`/api/places?${params}`, { signal: mapAbortController.signal });
    const json = await res.json();

    if (!json.success) throw new Error(json.error?.message || json.error);

    // 집에서 하는 활동 → 지도 숨김
    if (json.home) {
      setMapStatus('집에서 즐기는 활동이에요');
      document.getElementById('map').style.display = 'none';
      document.getElementById('placeList').innerHTML = '<p class="map-empty">집에서 할 수 있는 활동이라 주변 장소가 필요 없어요 🏠</p>';
      return;
    }

    document.getElementById('map').style.display = '';
    renderMap(lat, lon, json.places, keyword);
    renderPlaceList(json.places);

    const count = json.places.length;
    setMapStatus(count > 0 ? `반경 2km 내 ${count}개 장소` : '주변에 관련 장소가 없어요');
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('[map]', err.message);
    setMapStatus('장소 정보를 불러오지 못했어요');
  }
}

function renderMap(lat, lon, places, keyword) {
  const container = document.getElementById('map');

  // 기존 지도 제거
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  leafletMap = L.map(container, { zoomControl: true, attributionControl: false }).setView([lat, lon], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(leafletMap);

  // 내 위치 마커
  const myIcon = L.divIcon({
    html: `<div style="width:12px;height:12px;background:#C9A84C;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(201,168,76,0.25)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
  L.marker([lat, lon], { icon: myIcon }).addTo(leafletMap).bindPopup('<div class="popup-name">현재 위치</div>');

  // 장소 마커
  const placeIcon = L.divIcon({
    html: `<div style="width:10px;height:10px;background:#fff;border:2px solid #C9A84C;border-radius:50%"></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  places.forEach(place => {
    L.marker([place.lat, place.lon], { icon: placeIcon })
      .addTo(leafletMap)
      .bindPopup(`<div class="popup-name">${place.name}</div><div class="popup-type">${place.type}</div>`);
  });

  // 마커 전체 보이도록 줌 조정
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
    type.textContent = place.type + (place.address ? ' · ' + place.address : '');

    // 지도 앱 딥링크 버튼
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

    // 클릭 시 지도 해당 마커로 이동
    item.addEventListener('click', () => {
      if (leafletMap) leafletMap.setView([place.lat, place.lon], 16);
    });
    list.appendChild(item);
  });
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  errorCard.hidden = false;
  errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
