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

// 글자 수 카운터
extraNote.addEventListener('input', () => {
  charCount.textContent = extraNote.value.length;
});

// 페이지 로드 시 위치 미리 요청
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

function showResult({ recommendation, reason, alternatives, keyword, image_keyword }) {
  document.getElementById('recommendationText').textContent = recommendation;
  document.getElementById('reasonText').textContent = reason;

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
  if (userLocation) {
    loadMap(keyword || recommendation, userLocation.lat, userLocation.lon);
  } else {
    setMapStatus('위치 권한을 허용해주세요');
    requestLocation(() => {
      if (userLocation) loadMap(keyword || recommendation, userLocation.lat, userLocation.lon);
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
      if (callback) callback();
    },
    () => {
      setMapStatus('위치 권한이 거부됐어요. 서울 기준으로 표시해요');
      userLocation = { lat: 37.5665, lon: 126.9780 }; // 서울 시청 fallback
      if (callback) callback();
    },
    { timeout: 8000 }
  );
}

function setMapStatus(msg) {
  const el = document.getElementById('mapStatus');
  if (el) el.textContent = msg;
}

// ===== 지도 =====
async function loadMap(keyword, lat, lon) {
  setMapStatus('장소 검색 중...');

  try {
    const res = await fetch(`/api/places?lat=${lat}&lon=${lon}&keyword=${encodeURIComponent(keyword)}&radius=2000`);
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    renderMap(lat, lon, json.places, keyword);
    renderPlaceList(json.places);

    const count = json.places.length;
    setMapStatus(count > 0 ? `반경 2km 내 ${count}개 장소` : '주변에 관련 장소가 없어요');
  } catch (err) {
    setMapStatus('장소 정보를 불러오지 못했어요');
    console.error('[map]', err.message);
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
    item.innerHTML = `
      <span class="place-num">${i + 1}</span>
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="place-type">${place.type}${place.address ? ' · ' + place.address : ''}</div>
      </div>
      <span class="place-arrow">→</span>
    `;
    // 클릭 시 지도 해당 마커로 이동
    item.addEventListener('click', () => {
      if (leafletMap) {
        leafletMap.setView([place.lat, place.lon], 16);
      }
    });
    list.appendChild(item);
  });
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  errorCard.hidden = false;
  errorCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
