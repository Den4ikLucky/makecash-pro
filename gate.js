// MakeCash Pro — Access Gate Guard
(function() {
  var PASS = "120257";
  var STORAGE_KEY = "mc_auth_access_code";

  // Check if already authorized
  try {
    if (localStorage.getItem(STORAGE_KEY) === PASS) {
      return; // Authorized, exit silently
    }
  } catch(e) {}

  // Inject critical CSS to immediately hide any page content
  var style = document.createElement("style");
  style.id = "mc-gate-shield-css";
  style.textContent = `
    html, body {
      background: #0A0C10 !important;
      overflow: hidden !important;
      height: 100% !important;
    }
    #mc-gate-overlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at 50% 30%, #151922 0%, #080A0E 100%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      color: #F3F5F9;
      padding: 20px;
      box-sizing: border-box;
    }
    .mc-gate-card {
      background: #11141C;
      border: 1px solid #202636;
      border-radius: 20px;
      padding: 40px 36px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(229,169,60,0.06);
      box-sizing: border-box;
    }
    .mc-gate-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #E5A93C;
      background: rgba(229,169,60,0.12);
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 20px;
    }
    .mc-gate-title {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #F3F5F9;
      letter-spacing: -0.3px;
    }
    .mc-gate-desc {
      font-size: 14px;
      color: #7A869E;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .mc-gate-input-wrap {
      margin-bottom: 16px;
      text-align: left;
    }
    .mc-gate-input {
      width: 100%;
      background: #080A0E;
      border: 1px solid #202636;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 16px;
      color: #F3F5F9;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
      text-align: center;
      letter-spacing: 2px;
    }
    .mc-gate-input:focus {
      border-color: #E5A93C;
    }
    .mc-gate-btn {
      width: 100%;
      background: #E5A93C;
      color: #000;
      border: none;
      border-radius: 12px;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .mc-gate-btn:hover {
      background: #F2BA52;
    }
    .mc-gate-btn:active {
      transform: scale(0.99);
    }
    .mc-gate-error {
      color: #EF4444;
      font-size: 13px;
      margin-top: 12px;
      display: none;
    }
  `;
  document.head.appendChild(style);

  function mountGate() {
    if (document.getElementById("mc-gate-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "mc-gate-overlay";
    overlay.innerHTML = `
      <div class="mc-gate-card">
        <span class="mc-gate-badge">MAKECASH CAPITAL • ПРИВАТНЫЙ РЕЖИМ</span>
        <h2 class="mc-gate-title">Закрытый доступ</h2>
        <p class="mc-gate-desc">Платформа находится на этапе закрытого обновления. Введите персональный пароль для просмотра:</p>
        
        <form id="mc-gate-form" onsubmit="return false;">
          <div class="mc-gate-input-wrap">
            <input type="password" id="mc-gate-password" class="mc-gate-input" placeholder="Введите пароль" autofocus autocomplete="current-password" />
          </div>
          <button type="submit" id="mc-gate-submit" class="mc-gate-btn">Войти на платформу →</button>
          <div id="mc-gate-error-msg" class="mc-gate-error">Неверный пароль. Попробуйте еще раз.</div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    var form = document.getElementById("mc-gate-form");
    var input = document.getElementById("mc-gate-password");
    var errorMsg = document.getElementById("mc-gate-error-msg");

    function checkPass() {
      var val = (input.value || "").trim();
      if (val === PASS) {
        try {
          localStorage.setItem(STORAGE_KEY, PASS);
        } catch(e) {}
        overlay.remove();
        style.remove();
        window.location.reload();
      } else {
        errorMsg.style.display = "block";
        input.style.borderColor = "#EF4444";
        input.value = "";
        input.focus();
      }
    }

    form.addEventListener("submit", function(e) {
      e.preventDefault();
      checkPass();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountGate);
  } else {
    mountGate();
  }
})();
