const uploadForm = document.getElementById("uploadForm");
const uploadStatus = document.getElementById("uploadStatus");
const logoutBtn = document.getElementById("logoutBtn");
const adminPodcastList = document.getElementById("adminPodcastList");
const adminCount = document.getElementById("adminCount");

async function checkAdmin() {
  try {
    const res = await fetch("/api/admin/me");
    const data = await res.json();

    if (!data.isAdmin) {
      window.location.href = "/index.html";
      return;
    }

    loadAdminPodcasts();
  } catch (error) {
    window.location.href = "/index.html";
  }
}

async function loadAdminPodcasts() {
  try {
    const res = await fetch("/api/podcasts");
    const data = await res.json();

    if (!Array.isArray(data)) {
      adminPodcastList.innerHTML = "<p class='admin-empty'>Failed to load podcasts.</p>";
      return;
    }

    adminCount.textContent = data.length === 1 ? "1 item" : `${data.length} items`;

    if (data.length === 0) {
      adminPodcastList.innerHTML = "<p class='admin-empty'>No uploaded podcasts yet.</p>";
      return;
    }

    const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    adminPodcastList.innerHTML = sorted
      .map((item) => {
        const cover = item.coverUrl
          ? item.coverUrl
          : "https://via.placeholder.com/320x180?text=Soul+Notes";

        return `
          <div class="admin-podcast-item">
            <img src="${cover}" alt="${escapeHtml(item.title || "Podcast cover")}" />
            <div class="admin-podcast-body">
              <span>${formatDate(item.createdAt)}</span>
              <h3>${escapeHtml(item.title || "Untitled")}</h3>
              <p>${escapeHtml(item.description || "")}</p>
              <div class="admin-item-actions">
                <a class="btn btn-secondary admin-mini-btn" href="/podcast.html">View</a>
                <button type="button" class="btn btn-secondary admin-mini-btn delete-btn" data-id="${item.id}">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    bindDeleteButtons();
  } catch (error) {
    adminPodcastList.innerHTML = "<p class='admin-empty'>Server error while loading podcasts.</p>";
  }
}

function bindDeleteButtons() {
  const buttons = document.querySelectorAll(".delete-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      if (!id) return;

      const confirmed = window.confirm("Are you sure you want to delete this podcast?");
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/podcasts/${id}`, {
          method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Delete failed.");
          return;
        }

        loadAdminPodcasts();
      } catch (error) {
        alert("Server error while deleting.");
      }
    });
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const video = document.getElementById("video").files[0];
    const audio = document.getElementById("audio").files[0];
    const cover = document.getElementById("cover").files[0];

    if (!title || !description || !video || !audio) {
      uploadStatus.textContent = "Title, description, video, audio бүгд шаардлагатай.";
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("video", video);
    formData.append("audio", audio);
    if (cover) formData.append("cover", cover);

    uploadStatus.textContent = "Uploading...";

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        uploadStatus.textContent = data.message || "Upload failed.";
        return;
      }

      uploadStatus.textContent = "Podcast uploaded successfully!";
      uploadForm.reset();
      loadAdminPodcasts();
    } catch (error) {
      uploadStatus.textContent = "Server error during upload.";
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", {
        method: "POST"
      });
    } catch (error) {}

    window.location.href = "/index.html";
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

checkAdmin();