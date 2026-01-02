const planEl = document.getElementById("plan");
const durationEl = document.getElementById("duration");
const intervalEl = document.getElementById("interval");
const domainsEl = document.getElementById("domains");
const chipsEl = document.getElementById("chips");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const statusEl = document.getElementById("status");
const useGeminiEl = document.getElementById("useGemini");
const geminiKeyEl = document.getElementById("geminiKey");
const openOptions = document.getElementById("openOptions");

function domainChips(list) {
  chipsEl.innerHTML = "";
  list.forEach((d, i) => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = d;
    chipsEl.appendChild(span);
  });
}

async function loadState() {
  const { focusActive, studyPlan, sessionEnd, checkIntervalMin, allowedDomains, useGemini, geminiApiKey, savedAllowedDomains } =
    await chrome.storage.local.get(["focusActive","studyPlan","sessionEnd","checkIntervalMin","allowedDomains","useGemini","geminiApiKey","savedAllowedDomains"]);

  planEl.value = studyPlan || "";
  intervalEl.value = checkIntervalMin || 5;
  useGeminiEl.checked = !!useGemini;
  geminiKeyEl.value = geminiApiKey || "";

  domainChips(allowedDomains || []);
  if (focusActive && sessionEnd) {
    const minsLeft = Math.max(0, Math.ceil((sessionEnd - Date.now()) / 60000));
    statusEl.textContent = `Session active — ~${minsLeft} min left.`;
  } else {
    statusEl.textContent = "No active session.";
  }

  // Quick suggestion: prefill from savedAllowedDomains if empty
  if ((!allowedDomains || allowedDomains.length === 0) && Array.isArray(savedAllowedDomains) && savedAllowedDomains.length) {
    domainsEl.value = savedAllowedDomains.join(", ");
  }
}

function parseDomains(input) {
  return input
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^https?:\/\//, "").replace(/\/.*$/, "")); // keep hostname only
}

startBtn.addEventListener("click", async () => {
  const plan = planEl.value.trim();
  const durationMin = Math.max(5, Number(durationEl.value || 60));
  const intervalMin = Math.max(1, Number(intervalEl.value || 5));
  const domains = parseDomains(domainsEl.value).slice(0, 20); // basic guard

  await chrome.storage.local.set({
    allowedDomains: domains,
    useGemini: useGeminiEl.checked,
    geminiApiKey: geminiKeyEl.value.trim()
  });

  chrome.runtime.sendMessage({
    type: "FOCUS_COACH_START_SESSION",
    payload: { plan, durationMin, allowedDomains: domains, intervalMin }
  }, (res) => {
    if (res?.ok) {
      statusEl.textContent = `Session active — ~${durationMin} min.`;
      domainChips(domains);
    }
  });
});

stopBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FOCUS_COACH_STOP_SESSION" }, (res) => {
    if (res?.ok) {
      statusEl.textContent = "Session stopped.";
    }
  });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

loadState();
