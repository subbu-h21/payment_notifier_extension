(function() {
  // Keep a persistent Socket.IO connection in the offscreen document
  try {
    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000
    });

    socket.on("connect", () => {
      console.log("[Offscreen] Connected to Flask-SocketIO");
    });

    socket.on("connect_error", (err) => {
      console.error("[Offscreen] connect_error:", err && err.message);
    });

    socket.on("disconnect", () => {
      console.warn("[Offscreen] Disconnected; Socket.IO will attempt to reconnect...");
    });

    socket.on("new payment", (data) => {
      console.log("[Offscreen] new payment:", data);
      // Relay to service worker
      chrome.runtime.sendMessage({ type: "payment", payload: data });
    });
  } catch (e) {
    console.error("[Offscreen] Initialization error:", e);
  }
})();


