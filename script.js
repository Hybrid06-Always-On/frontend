let currentPage = 1;
let totalPages = 1;
let paginationLinks;

/* 🔴 HLS 전역 객체 (중요) */
let hls = null;

/* =========================
   썸네일 목록 불러오기
========================= */
async function fetchImages(page) {
  try {
    const response = await fetch(`http://backend-svc:3000/api/thumbnails/${page}`);
    const data = await response.json();

    // 🔥 데이터가 없는 경우 (마지막 페이지) 처리
    // API returns { success: [...], error: ... }
    const items = data.success || []; 

    if (items.length === 0) {
      alert("데이터가 없습니다.");
    }

    // 데이터가 있을 때만 페이지 및 화면 갱신
    currentPage = page;
    totalPages = data.totalPages || 999; // 백엔드에서 값을 안 주므로 임시로 큰 값 설정 (그래야 다음 버튼 눌림)
    
    renderImages(items);
    renderPagination(); // 페이지네이션 버튼 다시 그리기

  } catch (error) {
    console.error("이미지 API 호출 실패", error);
    // 에러 시 기존 그리드는 유지하거나 비울 수 있음 (여기선 유지)
  }
}

/* =========================
   썸네일 렌더링
========================= */
function renderImages(items) {
  const grid = document.querySelector(".grid");
  grid.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    if (!items[i]) break;

    const item = document.createElement("div");
    item.className = "grid-item";

    // 썸네일 래퍼
    const thumb = document.createElement("div");
    thumb.className = "thumb";

    // 이미지
    const img = document.createElement("img");
    img.src = items[i].image;
    img.alt = items[i].title || "";
    img.onclick = () => fetchVideo(items[i].id);

    // 제목 (사진 안쪽)
    const title = document.createElement("div");
    title.className = "thumb-title";
    title.innerText = items[i].title || "제목 없음";

    thumb.appendChild(img);
    thumb.appendChild(title);
    item.appendChild(thumb);
    grid.appendChild(item);
  }
}



/* =========================
   🎬 영상 정보 조회 + 모달 열기 (🔥 핵심 수정)
========================= */
async function fetchVideo(id) {
  if (!id) return;

  try {
    const response = await fetch(`http://backend-svc:3000/api/video/${id}`);
    const data = await response.json();
    console.log(data);

    if (!data.success || !data.success.video) {
      alert("영상 정보를 불러올 수 없습니다.");
      return;
    }

    const modal = document.getElementById("videoModal");
    const video = document.getElementById("videoPlayer");
    const videoDateEl = document.getElementById("videoDate");
    const videoDescEl = document.getElementById("videoDesc");
    const videoUrl = data.success.video;

    /* 🔴 완전 초기화 */
    video.pause();
    video.removeAttribute("src");
    video.load();

    if (hls) {
      hls.destroy();
      hls = null;
    }

    /* 📝 설명 표시 */
    if (videoDescEl) {
      videoDescEl.innerText = data.success.description || "";
    }

    /* 📅 업로드 날짜 표시 */
    if (videoDateEl) {
      videoDateEl.innerText = data.success.upload_date
        ? `업로드 날짜 · ${data.success.upload_date}`
        : "";
    }

    /* 🎬 영상 재생 */
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
    } else {
      alert("이 브라우저는 HLS 재생을 지원하지 않습니다.");
      return;
    }

    modal.style.display = "flex";
    video.play();

  } catch (error) {
    console.error("비디오 API 호출 에러:", error);
  }
}



/* =========================
   페이지네이션 렌더링
========================= */
function renderPagination() {
  const paginationContainer = document.querySelector(".pagination");
  paginationContainer.innerHTML = "";

  // 1. 이전 버튼
  const prevBtn = document.createElement("a");
  prevBtn.href = "#";
  prevBtn.dataset.page = "prev";
  prevBtn.innerText = "이전";
  paginationContainer.appendChild(prevBtn);

  // 2. 페이지 번호 계산 (5개 단위)
  // 사용자가 1~5는 무조건 나오길 원함 -> totalPages 제한을 풂 (또는 최소 5개 보장)
  const pageGroup = Math.ceil(currentPage / 5);
  const startPage = (pageGroup - 1) * 5 + 1;
  const endPage = startPage + 4; // 무조건 5개씩 보여줌

  for (let i = startPage; i <= endPage; i++) {
    const link = document.createElement("a");
    link.href = "#";
    link.dataset.page = i;
    link.innerText = i;
    if (i === currentPage) link.classList.add("active");
    paginationContainer.appendChild(link);
  }

  // 3. 다음 버튼
  const nextBtn = document.createElement("a");
  nextBtn.href = "#";
  nextBtn.dataset.page = "next";
  nextBtn.innerText = "다음";
  paginationContainer.appendChild(nextBtn);
}

/* =========================
   DOM 로드 후 초기화
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const paginationContainer = document.querySelector(".pagination");

  // 이벤트 위임 (동적 생성된 버튼 처리)
  paginationContainer.addEventListener("click", e => {
    e.preventDefault();
    const target = e.target;
    if (target.tagName !== "A") return;

    const value = target.dataset.page;
    let nextPage = currentPage;

    if (value === "prev") {
      if (currentPage > 1) nextPage--;
      else return; // 1페이지면 무시
    } else if (value === "next") {
        nextPage++;
    } else {
      nextPage = Number(value);
    }

    if (nextPage !== currentPage) {
      fetchImages(nextPage);
    }
  });

  fetchImages(currentPage);
});

/* =========================
   ❌ 버튼 클릭 시 모달 닫기 (🔥 수정)
========================= */
document.querySelector(".video-content .close").addEventListener("click", () => {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("videoPlayer");

  video.pause();
  video.removeAttribute("src");
  video.load();

  if (hls) {
    hls.destroy();
    hls = null;
  }

  modal.style.display = "none";
});






