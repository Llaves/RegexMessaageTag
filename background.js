// Background script for Subject Number Sort v3.7
console.log("Subject Number Sort add-on loaded");

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

        // Reduced from 250ms/300ms to 100ms
        await messenger.mailTabs.update(tab.id, { sortType: tempType });
        await new Promise(r => setTimeout(r, 100)); 
        await messenger.mailTabs.update(tab.id, { sortType, sortOrder });
        console.log("TRACE: Fast UI Redraw complete.");
      } catch (e) { console.warn("Refresh failed", e); }
    }
  }
}

async function purgeSNTags() {
  console.log("TRACE: Purging SN tags...");
  const allTags = await messenger.messages.tags.list();
  for (const tag of allTags) {
    if (tag.key.startsWith("sn")) {
      try { await messenger.messages.tags.delete(tag.key); } catch (e) {}
    }
  }
  // Reduced from 600ms to 200ms
  await new Promise(r => setTimeout(r, 200));
}

// 3. MAIN LOGIC
async function performTagging(info, tab) {
  try {
    let folderId = info?.displayedFolder?.id || info?.selectedFolder?.id;
    if (!folderId && tab?.id) {
      const mailTab = await messenger.mailTabs.get(tab.id);
      folderId = mailTab.displayedFolder?.id;
    }
    if (!folderId) return;

    await purgeSNTags();

    const messageList = await messenger.messages.list(folderId);
    let allMessages = [...messageList.messages];
    let pageId = messageList.id;
    while (pageId) {
      const nextPage = await messenger.messages.continueList(pageId);
      allMessages = allMessages.concat(nextPage.messages);
      pageId = nextPage.id;
    }

    const numberToKey = new Map();
    let counter = 1;
    for (const msg of allMessages) {
      const match = (msg.subject || "").match(/(\d+)$/);
      if (match && !numberToKey.has(match[1])) {
        const key = `sn${counter}`;
        await messenger.messages.tags.create(key, `SN${counter}`, "#3366CC");
        numberToKey.set(match[1], key);
        counter++;
      }
    }

    for (const msg of allMessages) {
      const match = (msg.subject || "").match(/(\d+)$/);
      let finalTags = (msg.tags || []).filter(t => !t.startsWith("sn"));

      if (match) {
        const targetKey = numberToKey.get(match[1]);
        finalTags.push(targetKey);
        await messenger.messages.update(msg.id, { tags: finalTags });
      } else if ((msg.tags || []).some(t => t.startsWith("sn"))) {
        await messenger.messages.update(msg.id, { tags: finalTags });
      }
    }

    // Reduced final delay from 600ms/800ms to 200ms
    setTimeout(async () => {
      await refreshUI();
      messenger.notifications.create({
        type: "basic",
        title: "Subject Number Sort",
        message: `Tagging Complete! Created ${counter - 1} groups.`,
        iconUrl: "icons/icon-48.png"
      });
    }, 200);

  } catch (err) { console.error("TRACE: Error", err); }
}

// 4. LISTENERS
messenger.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tag-with-subject-number") performTagging(info, tab);
  if (info.menuItemId === "delete-sn-tags") {
    purgeSNTags().then(() => {
      // Execute refresh immediately after purge settle
      refreshUI();
      messenger.notifications.create({
        type: "basic",
        title: "Subject Number Sort",
        message: "All SN tags removed.",
        iconUrl: "icons/icon-48.png"
      });
    });
  }
});

messenger.commands.onCommand.addListener(async (command) => {
  const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  const mailTab = tabs.find(t => t.type === "mail");
  if (!mailTab) return;

  if (command === "run-tagging") {
    performTagging(null, mailTab);
  } else if (command === "run-purge") {
    await purgeSNTags();
    await refreshUI();
  }
});