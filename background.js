// Background script for Subject Number Sort v2.7
console.log("Subject Number Sort add-on loaded");

messenger.menus.removeAll().then(() => {
  messenger.menus.create({
    id: "tag-with-subject-number",
    title: "Tag Folder (SN1, SN2...)",
    contexts: ["message_list", "folder_pane"]
  });
});

messenger.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "tag-with-subject-number") return;

  try {
    // 1. Resolve Folder
    let folderId = info.displayedFolder?.id || info.selectedFolder?.id;
    if (!folderId && tab?.id) {
      const mailTab = await messenger.mailTabs.get(tab.id);
      folderId = mailTab.displayedFolder?.id;
    }
    if (!folderId) return;

    // 2. PURGE: Delete all existing 'sn' tags for a clean start
    console.log("Purging existing 'sn' tags...");
    const allTags = await messenger.messages.tags.list();
    for (const tag of allTags) {
      if (tag.key.startsWith("sn")) {
        try {
          await messenger.messages.tags.delete(tag.key);
        } catch (e) { /* ignore */ }
      }
    }

    // 3. FETCH: Get all messages
    const messageList = await messenger.messages.list(folderId);
    let allMessages = [...messageList.messages];
    let pageId = messageList.id;
    while (pageId) {
      const nextPage = await messenger.messages.continueList(pageId);
      allMessages = allMessages.concat(nextPage.messages);
      pageId = nextPage.id;
    }

    const uniqueNumberToTagMap = new Map(); 
    let tagCounter = 1;

    // 4. PROCESS: Map numbers to simple SN# labels
    for (const msg of allMessages) {
      const match = (msg.subject || "").match(/(\d+)$/);
      if (match) {
        const fullNumber = match[1];
        
        if (!uniqueNumberToTagMap.has(fullNumber)) {
          const newKey = `sn${tagCounter}`;
          uniqueNumberToTagMap.set(fullNumber, newKey);
          
          // STRICT LABELING: Use SN1, SN2, SN3...
          await messenger.messages.tags.create(newKey, `SN${tagCounter}`, "#3366CC");
          tagCounter++;
        }

        const targetKey = uniqueNumberToTagMap.get(fullNumber);

        // 5. APPLY: Overwrite tags with the new simple group tag
        try {
          const updateProps = { tags: [targetKey] };

          // Try both namespaces to bypass the "not a function" ESR bug
          if (messenger.messages && typeof messenger.messages.update === "function") {
            await messenger.messages.update(msg.id, updateProps);
          } 
          else if (browser.messages && typeof browser.messages.update === "function") {
            await browser.messages.update(msg.id, updateProps);
          }
        } catch (err) {
          console.error(`Update failed for msg ${msg.id}:`, err.message);
        }
      }
    }

    console.log(`✓ Folder Tagging Complete. Used labels SN1 through SN${tagCounter - 1}`);

  } catch (globalError) {
    console.error("Critical Error:", globalError);
  }
});