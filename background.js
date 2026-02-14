// Background script for Subject Number Sort v3.9.2
console.log("Subject Number Sort v3.9.2: Strict Sync Mode");

// 1. INITIALIZE MENUS
messenger.menus.removeAll().then(() => {
  messenger.menus.create({
    id: "tag-with-subject-number",
    title: "Tag Folder (SN1, SN2...)",
    contexts: ["message_list", "folder_pane"]
  });
  messenger.menus.create({
    id: "delete-sn-tags",
    title: "Delete SN tags",
    contexts: ["message_list", "folder_pane"]
  });
});

// 2. HELPERS
async function refreshUI() {
  const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.type === "mail") {
      try {
        const mailTab = await messenger.mailTabs.get(tab.id);
        const { sortOrder, sortType } = mailTab;
        const tempType = (sortType === "date") ? "subject" : "date";
        await messenger.mailTabs.update(tab.id, { sortType: tempType });
        await new Promise(r => setTimeout(r, 150)); 
        await messenger.mailTabs.update(tab.id, { sortType, sortOrder });
      } catch (e) { console.warn("Refresh failed", e); }
    }
  }
}

async function purgeSNTags() {
  const allTags = await messenger.messages.tags.list();
  for (const tag of allTags) {
    if (tag.key.startsWith("sn")) {
      try { await messenger.messages.tags.delete(tag.key); } catch (e) {}
    }
  }
  await new Promise(r => setTimeout(r, 300)); // Give Thunderbird time to breathe
}

// 3. MAIN LOGIC
async function performTagging(info, tab) {
  try {
    const prefs = await messenger.storage.local.get({ customRegex: "(\\d+)$" });
    const userRegex = new RegExp(prefs.customRegex);
    console.log(`DIAG: Run started with Regex: ${prefs.customRegex}`);

    let folderId = info?.displayedFolder?.id || info?.selectedFolder?.id;
    if (!folderId && tab?.id) {
      const mailTab = await messenger.mailTabs.get(tab.id);
      folderId = mailTab.displayedFolder?.id;
    }
    if (!folderId) return;

    // STEP A: Purge tag definitions
    await purgeSNTags();

    // Fetch messages
    const messageList = await messenger.messages.list(folderId);
    let allMessages = [...messageList.messages];
    let pageId = messageList.id;
    while (pageId) {
      const nextPage = await messenger.messages.continueList(pageId);
      allMessages = allMessages.concat(nextPage.messages);
      pageId = nextPage.id;
    }

    // STEP B: BLOCKING CLEAN
    // We process these one by one with 'await' to ensure the DB is clear
    console.log("DIAG: Starting Blocking Clean...");
    for (const msg of allMessages) {
      if ((msg.tags || []).some(t => t.startsWith("sn"))) {
        const cleaned = msg.tags.filter(t => !t.startsWith("sn"));
        await messenger.messages.update(msg.id, { tags: cleaned });
        console.log(`DIAG: [CLEANED] ${msg.subject}`);
      }
    }
    
    // Short pause to ensure Thunderbird's internal indexer catches up
    await new Promise(r => setTimeout(r, 200));

    // STEP C: Identify Groups
    const numberToKey = new Map();
    let counter = 1;
    for (const msg of allMessages) {
      const match = (msg.subject || "").match(userRegex);
      if (match && match[1] && !numberToKey.has(match[1])) {
        const key = `sn${counter}`;
        await messenger.messages.tags.create(key, `SN${counter}`, "#3366CC");
        numberToKey.set(match[1], key);
        counter++;
      }
    }

    // STEP D: Apply New Tags with Final Verification
    console.log("DIAG: Starting Apply Phase...");
    for (const msg of allMessages) {
      const match = (msg.subject || "").match(userRegex);
      
      // Get the absolute current state of the message tags
      const freshMsg = await messenger.messages.get(msg.id);
      let currentTags = freshMsg.tags || [];

      if (match && match[1]) {
        const targetKey = numberToKey.get(match[1]);
        // Filter out any 'sn' tags that might have survived or were cached
        const finalTags = [...currentTags.filter(t => !t.startsWith("sn")), targetKey];
        
        await messenger.messages.update(msg.id, { tags: finalTags });
        console.log(`DIAG: [TAGGED] ${msg.subject} -> ${targetKey}`);
      } else {
        // If it doesn't match the CURRENT regex, ensure no SN tags remain
        if (currentTags.some(t => t.startsWith("sn"))) {
          const stripped = currentTags.filter(t => !t.startsWith("sn"));
          await messenger.messages.update(msg.id, { tags: stripped });
          console.log(`DIAG: [STRIPPED RESIDUAL] ${msg.subject}`);
        }
      }
    }

    setTimeout(async () => {
      await refreshUI();
      messenger.notifications.create({
        type: "basic",
        title: "Subject Number Sort",
        message: `Tagging Complete. Created ${counter - 1} groups.`,
        iconUrl: "icons/icon-48.png"
      });
    }, 300);

  } catch (err) { console.error("DIAG: Error", err); }
}

// 4. LISTENERS
messenger.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tag-with-subject-number") performTagging(info, tab);
  if (info.menuItemId === "delete-sn-tags") {
    purgeSNTags().then(() => refreshUI());
  }
});

messenger.commands.onCommand.addListener(async (command) => {
  const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  const mailTab = tabs.find(t => t.type === "mail");
  if (!mailTab) return;
  if (command === "run-tagging") performTagging(null, mailTab);
  if (command === "run-purge") { await purgeSNTags(); await refreshUI(); }
});