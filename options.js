const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");

async function load() {
  const { savedAllowedDomains } = await chrome.storage.local.get(["savedAllowedDomains"]);
  listEl.value = (savedAllowedDomains || []).join("\n");
}

function sanitize(lines) {
  return lines
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
}

saveBtn.addEventListener("click", async () => {
  const arr = sanitize(listEl.value).slice(0, 100);
  await chrome.storage.local.set({ savedAllowedDomains: arr });
  statusEl.textContent = "Saved!";
  setTimeout(() => (statusEl.textContent = ""), 1200);
});

load();
