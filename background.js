// ---- Config ----
const DEFAULT_INTERVAL_MIN = 5; // checks every 5 minutes

// Lightweight local quotes; Gemini option below.
const QUOTES = [
  "Small steps, big results.",
  "You’re closer than you think.",
  "Future you is cheering for you.",
  "Deep work now, freedom later.",
  "One focused block at a time."
];

// Use Notifications permission implicitly via "notifications".
function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title,
    message,
    priority: 2
  });
}

async function getStorage(keys) {
  return await chrome.storage.local.get(keys);
}

async function setStorage(obj) {
  return await chrome.storage.local.set(obj);
}

function pickQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ⭐ THIS IS THE NEW, SMARTER GEMINI FUNCTION ⭐
async function getMotivationalQuote(studyPlan = "my work") { // Accepts the study plan
  const { useGemini, geminiApiKey } = await getStorage(["useGemini", "geminiApiKey"]);
  if (!useGemini || !geminiApiKey) return pickQuote();

  // The new, context-aware prompt!
  const prompt = `You are a firm but encouraging focus coach. A user is procrastinating on the following task: "${studyPlan}". Generate a single, short, witty, and powerful sentence to motivate them to get back to that specific task. Maximum 15 words.`;

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(geminiApiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || pickQuote();
  } catch {
    return pickQuote();
  }
}

// Ensure an alarm is running while a focus session is active
async function ensureAlarm() {
  const { focusActive, checkIntervalMin } = await getStorage(["focusActive", "checkIntervalMin"]);
  await chrome.alarms.clear("focus-check");
  if (focusActive) {
    chrome.alarms.create("focus-check", { periodInMinutes: checkIntervalMin || DEFAULT_INTERVAL_MIN });
  }
}

async function endSessionIfExpired() {
  const { focusActive, sessionEnd } = await getStorage(["focusActive", "sessionEnd"]);
  if (!focusActive) return false;
  if (typeof sessionEnd === "number" && Date.now() >= sessionEnd) {
    await setStorage({ focusActive: false });
    notify("Focus Coach", "Nice work — your focus session ended!");
    await chrome.alarms.clear("focus-check");
    return true;
  }
  return false;
}

async function checkDistraction() {
  if (await endSessionIfExpired()) return;

  const { focusActive, allowedDomains = [], studyPlan } = await getStorage(["focusActive", "allowedDomains", "studyPlan"]);
  if (!focusActive) return;

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) return;

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isAllowed = allowedDomains.some(d => host.endsWith(d.replace(/^www\./, "")));

  // ignore chrome://, edge://, extensions pages
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (!isAllowed) {
    // ⭐ THIS LINE IS NOW UPDATED TO PASS THE STUDY PLAN ⭐
    const quote = await getMotivationalQuote(studyPlan);

    // Notify and inject overlay in current tab
    notify("You're drifting…", quote);

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "FOCUS_COACH_DISTRACTED",
        payload: {
          quote,
          studyPlan: studyPlan || ""
        }
      });
    } catch {
      // content script might not be ready; ignore
    }
  }
}

// Listen for alarm ticks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focus-check") {
    checkDistraction();
  }
});

// Recover alarms on startup/installation
chrome.runtime.onInstalled.addListener(() => ensureAlarm());
chrome.runtime.onStartup.addListener(() => ensureAlarm());

// Messages from popup/options/content
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  switch (msg?.type) {
    case "FOCUS_COACH_START_SESSION": {
      const { plan, durationMin, allowedDomains, intervalMin } = msg.payload;
      const sessionEnd = Date.now() + durationMin * 60_000;

      await setStorage({
        focusActive: true,
        studyPlan: plan,
        sessionEnd,
        allowedDomains,
        checkIntervalMin: intervalMin || DEFAULT_INTERVAL_MIN
      });

      await ensureAlarm();
      notify("Focus Coach", `Session started for ${durationMin} minutes. You got this!`);
      sendResponse({ ok: true });
      break;
    }
    case "FOCUS_COACH_STOP_SESSION": {
      await setStorage({ focusActive: false });
      await chrome.alarms.clear("focus-check");
      notify("Focus Coach", "Session stopped. Nice effort!");
      sendResponse({ ok: true });
      break;
    }
    default:
      break;
  }
});