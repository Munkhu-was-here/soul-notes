const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");

const contactForm = document.getElementById("contactForm");
const contactCategory = document.getElementById("contactCategory");
const contactMessage = document.getElementById("contactMessage");
const voiceTranscript = document.getElementById("voiceTranscript");
const formStatus = document.getElementById("formStatus");

const micBtn = document.getElementById("micBtn");
const stopMicBtn = document.getElementById("stopMicBtn");
const micStatus = document.getElementById("micStatus");

let recognition = null;
let isListening = false;

if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    mobileNav.classList.toggle("show");
  });
}

function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micStatus.textContent = "Voice input is not supported in this browser.";
    micBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    isListening = true;
    micStatus.textContent = "Listening...";
    micBtn.classList.add("hidden");
    stopMicBtn.classList.remove("hidden");
  };

  recognition.onend = () => {
    isListening = false;
    micStatus.textContent = "Microphone stopped";
    micBtn.classList.remove("hidden");
    stopMicBtn.classList.add("hidden");
  };

  recognition.onerror = (event) => {
    micStatus.textContent = `Microphone error: ${event.error}`;
    isListening = false;
    micBtn.classList.remove("hidden");
    stopMicBtn.classList.add("hidden");
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }

    const current = voiceTranscript.value.trim();
    const merged = [current, finalTranscript.trim(), interimTranscript.trim()]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ");

    voiceTranscript.value = merged;
  };
}

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (!isListening) recognition.start();
  });
}

if (stopMicBtn) {
  stopMicBtn.addEventListener("click", () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const category = contactCategory.value;
    const message = contactMessage.value.trim();
    const transcript = voiceTranscript.value.trim();

    if (!category) {
      formStatus.textContent = "Please choose a category.";
      return;
    }

    if (!message && !transcript) {
      formStatus.textContent = "Please write a message or use voice input.";
      return;
    }

    formStatus.textContent = "Sending...";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category,
          message,
          transcript
        })
      });

      const data = await res.json();

      if (!res.ok) {
        formStatus.textContent = data.message || "Failed to send message.";
        return;
      }

      formStatus.textContent = data.message || "Message sent successfully.";
      contactForm.reset();
      voiceTranscript.value = "";
      micStatus.textContent = "Microphone idle";
    } catch (error) {
      formStatus.textContent = "Server connection error.";
      console.error(error);
    }
  });
}

setupSpeechRecognition();