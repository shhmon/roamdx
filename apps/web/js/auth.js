const Auth = {
  TOKEN_KEY: "roamdx_token",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  init() {
    const overlay = document.getElementById("auth-overlay");
    const input = document.getElementById("token-input");
    const submit = document.getElementById("token-submit");
    const error = document.getElementById("auth-error");

    const show = () => overlay.classList.remove("hidden");
    const hide = () => overlay.classList.add("hidden");

    if (this.isAuthenticated()) {
      hide();
      Api.validateToken(this.getToken()).then((ok) => {
        if (ok) {
          App.init();
        } else {
          this.clearToken();
          show();
        }
      }).catch(() => show());
      return;
    }

    const doLogin = async () => {
      const token = input.value.trim();
      if (!token) return;

      submit.disabled = true;
      submit.textContent = "Connecting...";

      try {
        if (await Api.validateToken(token)) {
          this.setToken(token);
          hide();
          App.init();
        } else {
          error.textContent = "Invalid token";
          input.value = "";
          input.focus();
        }
      } catch {
        error.textContent = "Cannot reach server";
      } finally {
        submit.disabled = false;
        submit.textContent = "Connect";
      }
    };

    submit.addEventListener("click", doLogin);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  },
};
