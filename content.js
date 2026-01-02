function ensureOverlay() {
  let el = document.getElementById("focus-coach-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "focus-coach-overlay";
    el.innerHTML = `
      <div class="fc-card">
        <div class="fc-title">Stay with your plan</div>
        <div class="fc-quote"></div>
        <div class="fc-plan"></div>
        <div class="fc-actions">
          <button id="fc-back">Back to work</button>
          <button id="fc-close">Dismiss</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(el);

    el.querySelector("#fc-close").addEventListener("click", () => {
      el.style.display = "none";
    });

    el.querySelector("#fc-back").addEventListener("click", async () => {
      // Try to go to first allowed domain (saved in storage).
      chrome.storage.local.get(["allowedDomains"]).then(({ allowedDomains = [] }) => {
        if (allowedDomains.length > 0) {
          const target = "https://" + allowedDomains[0].replace(/^www\./, "");
          window.location.href = target;
        } else {
          el.style.display = "none";
        }
      });
    });
  }
  return el;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "FOCUS_COACH_DISTRACTED") {
    const overlay = ensureOverlay();
    overlay.style.display = "grid";
    overlay.querySelector(".fc-quote").textContent = msg.payload.quote || "";
    const plan = msg.payload.studyPlan?.trim();
    overlay.querySelector(".fc-plan").textContent = plan ? `Plan: ${plan}` : "";
  }
});
