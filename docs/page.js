"use strict";

const demoSwitch = document.getElementById("demo-enabled");
const demoStage = document.querySelector(".demo-stage");
const sampleText = document.getElementById("sample-text");

demoSwitch.addEventListener("change", () => {
  const enabled = demoSwitch.checked;
  demoStage.dataset.enabled = String(enabled);
  document.getElementById("demo-badge").textContent = enabled
    ? "Unlocked"
    : "Paused";
  document.getElementById("demo-status").textContent = enabled
    ? "Controls restored. Select, copy, or right-click the sample text."
    : "Demo paused. Text selection and right-click are blocked in the sample.";
});

for (const eventName of ["contextmenu", "copy", "selectstart"]) {
  sampleText.addEventListener(eventName, (event) => {
    if (!demoSwitch.checked) event.preventDefault();
  });
}

document.getElementById("copy-feed").addEventListener("click", async () => {
  const feed = document.getElementById("update-feed");
  const status = document.getElementById("copy-status");
  try {
    await navigator.clipboard.writeText(feed.textContent.trim());
    status.textContent = "Update feed URL copied.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(feed);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent =
      "The URL is selected. Press Command+C or Ctrl+C to copy it.";
  }
});

async function loadRelease() {
  try {
    const response = await fetch("release.json");
    if (!response.ok) return;
    const release = await response.json();
    if (!/^\d+(?:\.\d+){1,3}$/.test(release.version)) return;
    document.querySelectorAll("[data-version]").forEach((label) => {
      label.textContent = `V${release.version}`;
    });
    const packageURL = new URL(release.package_url);
    if (
      packageURL.origin !== "https://felipehertzer.github.io" ||
      packageURL.pathname !==
        `/right-click-unlocked/right-click-unlocked-${release.version}.crx`
    )
      return;
    const link = document.getElementById("package-link");
    link.href = packageURL.href;
    link.textContent = `Signed CRX · v${release.version} ↓`;
  } catch {
    // Installation and the release-details link still work when metadata is unavailable.
  }
}

loadRelease();
