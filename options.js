// Load current settings
messenger.storage.local.get({
  customRegex: "(\\d+)$" // Default fallback
}).then(prefs => {
  document.getElementById("regexInput").value = prefs.customRegex;
});

// Save settings
document.getElementById("saveBtn").addEventListener("click", () => {
  const regexValue = document.getElementById("regexInput").value;
  messenger.storage.local.set({
    customRegex: regexValue
  }).then(() => {
    alert("Settings saved!");
  });
});