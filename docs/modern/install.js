(() => {
  const base = "/ecuisine-foods-online-store/modern/";
  let installPrompt = null;
  const addButton = () => {
    if (document.getElementById("ecuisine-install-owner-app")) return;
    const button = document.createElement("button");
    button.id = "ecuisine-install-owner-app";
    button.type = "button";
    button.textContent = "Install owner app";
    button.setAttribute("aria-label", "Install eCuisine Foods owner app");
    Object.assign(button.style, {
      position: "fixed", right: "18px", bottom: "18px", zIndex: "9999",
      border: "1px solid rgba(255,255,255,.22)", borderRadius: "999px",
      padding: "12px 17px", background: "#153d2d", color: "#fff",
      font: "600 14px/1.2 system-ui,sans-serif", boxShadow: "0 8px 28px rgba(21,61,45,.25)",
      cursor: "pointer", display: "none"
    });
    button.addEventListener("click", async () => {
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        button.style.display = "none";
      } else {
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        alert(isIOS
          ? 'To install: tap Share, then “Add to Home Screen”.'
          : 'If your browser supports installation, open its menu and choose “Install app” or “Add to Home screen”.');
      }
    });
    document.body.appendChild(button);
    if (!window.matchMedia("(display-mode: standalone)").matches && !navigator.standalone) button.style.display = "block";
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      installPrompt = event;
      button.style.display = "block";
    });
    window.addEventListener("appinstalled", () => { button.style.display = "none"; });
  };
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register(base + "owner-app-sw.js").catch(() => {}));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton);
  else addButton();
})();