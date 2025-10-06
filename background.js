// Use an offscreen document to keep Socket.IO alive reliably
async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existing = await chrome.offscreen.hasDocument?.();
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ['BLOBS'],
    justification: 'Maintain persistent Socket.IO connection and relay messages to service worker'
  });
}

// Forward messages from offscreen to all tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  if (message.type === 'payment') {
    const data = message.payload || {};

    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let successCount = 0;
      let errorCount = 0;

      const tab = tabs && tabs[0];
      if (!tab) {
        console.log('No active tab found in the last focused window.');
        return;
      }

      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log(`Active tab ${tab.id} is not eligible (url: ${tab.url}). Open a normal http/https page.`);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'payment', payload: data }, (response) => {
        if (chrome.runtime.lastError) {
          errorCount++;
          console.log(`Could not send message to active tab ${tab.id} (${tab.url}):`, chrome.runtime.lastError.message);
        } else {
          successCount++;
          console.log(`Message sent to active tab ${tab.id}, response:`, response);
        }
        console.log(`Payment notification to active tab — successful: ${successCount}, failed: ${errorCount}`);
        if (errorCount > 0) {
          console.log('Tip: Refresh the tab to update the content script after extension reload');
        }
      });
    });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: `Payment from ${data.sender || 'Unknown'}`,
      message: data.raw_message || 'New payment received!',
      priority: 2
    });
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Background] Extension installed, sending test…");
  await ensureOffscreenDocument();

  // Test message to active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "PAYMENT_TEST", payload: { hello: "world" } },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[Background] Test message failed:", chrome.runtime.lastError.message);
            console.log("[Background] This usually means the content script needs to be reloaded. Please refresh the tab.");
          } else {
            console.log("[Background] Got response:", response);
          }
        }
      );
    } else {
      console.warn("[Background] No active tab found.");
    }
  });

  // Optional: Auto-refresh all tabs to ensure content scripts are updated
  // Uncomment the following lines if you want automatic tab refresh after extension reload
  /*
  setTimeout(() => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  }, 1000);
  */
});

// Ensure offscreen exists on startup/wake
chrome.runtime.onStartup?.addListener(async () => {
  await ensureOffscreenDocument();
});


