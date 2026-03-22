const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");

const podcastList = document.getElementById("podcastList");
const mainPlayer = document.getElementById("mainPlayer");
const playerTitle = document.getElementById("playerTitle");
const playerDesc = document.getElementById("playerDesc");
const playerDate = document.getElementById("playerDate");

const podcastSearch = document.getElementById("podcastSearch");
const podcastSort = document.getElementById("podcastSort");
const episodeCount = document.getElementById("episodeCount");

const downloadBtn = document.getElementById("downloadBtn");
const downloadOptions = document.getElementById("downloadOptions");
const downloadVideo = document.getElementById("downloadVideo");
const downloadAudio = document.getElementById("downloadAudio");

let podcasts = [];
let filteredPodcasts = [];
let selectedPodcastId = null;

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    mobileNav.classList.toggle("show");
  });
}

async function loadPodcasts() {
  try {
    const res = await fetch("/api/podcasts");
    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid podcast data");
    }

    podcasts = data.map((item) => ({
      ...item,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    applyFilters();

    if (filteredPodcasts.length > 0) {
      playPodcast(filteredPodcasts[0].id);
    } else {
      renderEmptyState();
    }
  } catch (error) {
    console.error(error);
    renderLoadError();
  }
}

function applyFilters() {
  const query = podcastSearch.value.trim().toLowerCase();
  const sortValue = podcastSort.value;

  filteredPodcasts = podcasts.filter((podcast) => {
    const text = [
      podcast.title || "",
      podcast.description || ""
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  sortPodcasts(filteredPodcasts, sortValue);
  renderPodcastList(filteredPodcasts);
  updateEpisodeCount(filteredPodcasts.length);

  if (filteredPodcasts.length === 0) {
    renderEmptyState();
    return;
  }

  const stillExists = filteredPodcasts.some((item) => item.id === selectedPodcastId);
  if (!stillExists) {
    playPodcast(filteredPodcasts[0].id);
  } else {
    highlightActiveCard();
  }
}

function sortPodcasts(list, sortValue) {
  if (sortValue === "newest") {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return;
  }

  if (sortValue === "oldest") {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return;
  }

  if (sortValue === "az") {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    return;
  }

  if (sortValue === "za") {
    list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
  }
}

function renderPodcastList(list) {
  podcastList.innerHTML = "";

  list.forEach((podcast) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "podcast-item";
    card.dataset.id = String(podcast.id);

    const cover = podcast.coverUrl
      ? podcast.coverUrl
      : "https://via.placeholder.com/320x180?text=Soul+Notes";

    card.innerHTML = `
      <img src="${cover}" alt="${escapeHtml(podcast.title || "Podcast cover")}" />
      <div class="podcast-item-body">
        <span class="podcast-item-date">${formatDate(podcast.createdAt)}</span>
        <h4>${escapeHtml(podcast.title || "Untitled podcast")}</h4>
        <p>${escapeHtml(truncateText(podcast.description || "", 90))}</p>
      </div>
    `;

    card.addEventListener("click", () => {
      playPodcast(podcast.id);
    });

    podcastList.appendChild(card);
  });

  highlightActiveCard();
}

function playPodcast(id) {
  const podcast = filteredPodcasts.find((item) => item.id === id) || podcasts.find((item) => item.id === id);
  if (!podcast) return;

  selectedPodcastId = podcast.id;

  mainPlayer.src = podcast.videoUrl || "";
  playerTitle.textContent = podcast.title || "Untitled podcast";
  playerDesc.textContent = podcast.description || "";
  playerDate.textContent = formatDate(podcast.createdAt);

  downloadVideo.href = podcast.videoUrl || "#";
  downloadAudio.href = podcast.audioUrl || "#";

  downloadVideo.setAttribute("download", getFileName(podcast.videoUrl, "video.mp4"));
  downloadAudio.setAttribute("download", getFileName(podcast.audioUrl, "audio.mp3"));

  highlightActiveCard();
}

function highlightActiveCard() {
  const cards = podcastList.querySelectorAll(".podcast-item");
  cards.forEach((card) => {
    const isActive = Number(card.dataset.id) === selectedPodcastId;
    card.classList.toggle("active-podcast", isActive);
  });
}

function updateEpisodeCount(count) {
  episodeCount.textContent = count === 1 ? "1 episode" : `${count} episodes`;
}

function renderEmptyState() {
  podcastList.innerHTML = `
    <div class="podcast-empty">
      <h4>No episodes found</h4>
      <p>Try a different keyword or upload a new podcast from the admin panel.</p>
    </div>
  `;

  mainPlayer.removeAttribute("src");
  mainPlayer.load();
  playerTitle.textContent = "No podcast selected";
  playerDesc.textContent = "There are no matching podcast episodes right now.";
  playerDate.textContent = "";
}

function renderLoadError() {
  podcastList.innerHTML = `
    <div class="podcast-empty">
      <h4>Failed to load podcasts</h4>
      <p>Please check the server or uploaded data and try again.</p>
    </div>
  `;

  playerTitle.textContent = "Unable to load";
  playerDesc.textContent = "The podcast data could not be loaded.";
  playerDate.textContent = "";
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function getFileName(url, fallback) {
  if (!url) return fallback;
  const parts = url.split("/");
  return parts[parts.length - 1] || fallback;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (podcastSearch) {
  podcastSearch.addEventListener("input", applyFilters);
}

if (podcastSort) {
  podcastSort.addEventListener("change", applyFilters);
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", () => {
    downloadOptions.classList.toggle("hidden");
  });
}

document.addEventListener("click", (e) => {
  const clickedInside =
    downloadBtn.contains(e.target) || downloadOptions.contains(e.target);

  if (!clickedInside) {
    downloadOptions.classList.add("hidden");
  }
});

loadPodcasts();