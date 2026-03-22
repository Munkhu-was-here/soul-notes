const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");
const openLoginBtn = document.getElementById("openLoginBtn");
const openLoginBtnMobile = document.getElementById("openLoginBtnMobile");
const loginModal = document.getElementById("loginModal");
const loginBackdrop = document.getElementById("loginBackdrop");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    mobileNav.classList.toggle("show");
  });
}

function openLoginModal() {
  loginModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLoginModal() {
  loginModal.classList.add("hidden");
  document.body.style.overflow = "";
}

if (openLoginBtn) {
  openLoginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openLoginModal();
  });
}

if (openLoginBtnMobile) {
  openLoginBtnMobile.addEventListener("click", (e) => {
    e.preventDefault();
    openLoginModal();
  });
}

if (closeLoginBtn) {
  closeLoginBtn.addEventListener("click", closeLoginModal);
}

if (loginBackdrop) {
  loginBackdrop.addEventListener("click", closeLoginModal);
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && loginModal && !loginModal.classList.contains("hidden")) {
    closeLoginModal();
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) {
      loginStatus.textContent = "Username болон password оруулна уу.";
      return;
    }

    loginStatus.textContent = "Нэвтэрч байна...";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        loginStatus.textContent = data.message || "Login failed.";
        return;
      }

      loginStatus.textContent = "Амжилттай нэвтэрлээ.";
      setTimeout(() => {
        window.location.href = "/admin.html";
      }, 600);
    } catch (error) {
      loginStatus.textContent = "Server connection error.";
    }
  });
}

async function loadHighlight() {
  try {
    const res = await fetch("/api/podcasts");
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) return;

    const latest = data.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];

    const video = document.getElementById("highlightVideo");
    const title = document.getElementById("highlightTitle");
    const desc = document.getElementById("highlightDesc");

    if (!video || !title || !desc) return;

    video.src = latest.videoUrl;
    title.textContent = latest.title;
    desc.textContent = latest.description;
  } catch (err) {
    console.error("Highlight load error:", err);
  }
}

loadHighlight();