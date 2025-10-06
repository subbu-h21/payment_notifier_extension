(function () {
  const LOG_PREFIX = "[ContentScript]";

  function createPaymentOverlay({ amount, sender, raw_message }) {
    const overlay = document.createElement("div");
    overlay.className = "payment-overlay";
    
    const text = sender && amount
      ? ` Sender:  ${sender} \n Amount: Rs.${amount}`
      : null;

    overlay.textContent = text;
    overlay.classList.add("show");

    // Add to container
    const container = ensureOverlayContainer();
    container.appendChild(overlay);

    // auto-hide after 8s
    setTimeout(() => {
      overlay.classList.remove("show");
      // remove from DOM after fade animation
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }, 8000);

    return overlay;
  }

  function ensureOverlayContainer() {
    let container = document.getElementById("payment-overlay-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "payment-overlay-container";
      container.className = "payment-overlay-container";
      document.documentElement.appendChild(container);
    }
    return container;
  }

  function showPaymentOverlay({ amount, sender, raw_message }) {
    try {
      createPaymentOverlay({ amount, sender, raw_message });
    } catch (e) {
      console.error(`${LOG_PREFIX} overlay error:`, e);
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    
    if (message.type === "PAYMENT_TEST") {
      console.log(`${LOG_PREFIX} got PAYMENT_TEST:`, message.payload);
      sendResponse?.({ ok: true });
      return true; // Keep connection open for async response
    }
    
    if (message.type === "payment") {
      try {
        showPaymentOverlay(message.payload || {});
        sendResponse?.({ success: true });
      } catch (e) {
        console.error(`${LOG_PREFIX} overlay error:`, e);
        sendResponse?.({ error: e.message });
      }
      return true; // Keep connection open for async response
    }
    
    return false; // No response needed
  });

  console.log(`${LOG_PREFIX} loaded on`, location.href);
})();