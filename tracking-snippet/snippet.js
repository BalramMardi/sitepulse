(function () {
  const API_ENDPOINT = "http://localhost:4000/track";

  function getTrackerId() {
    let tid = localStorage.getItem("_tid");
    if (!tid) {
      tid = "user_" + Date.now() + Math.random().toString(16).substring(2);
      localStorage.setItem("_tid", tid);
    }
    return tid;
  }

  function getPageContext() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      host: window.location.hostname,
      pageW: document.documentElement.scrollWidth,
      pageH: document.documentElement.scrollHeight,
      screenW: window.screen.width,
      screenH: window.screen.height,
    };
  }

  function sendEvent(type, payload) {
    const data = {
      type: type,
      cid: getTrackerId(),
      ts: Date.now(),
      context: getPageContext(),
      payload: payload,
    };

    try {
      navigator.sendBeacon(API_ENDPOINT, JSON.stringify(data));
    } catch (e) {
      fetch(API_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    sendEvent("page_view", {});
  });

  document.addEventListener(
    "click",
    (e) => {
      sendEvent("click", {
        x: e.pageX,
        y: e.pageY,
        target: e.target.tagName,
        id: e.target.id,
        cls: e.target.className,
      });
    },
    true
  );
})();
