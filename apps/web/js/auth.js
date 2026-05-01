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

    const showLogin = () => {
      overlay.classList.remove("hidden");
      if (error) error.textContent = "";
    };

    if (this.isAuthenticated()) {
      // Validate stored token against server
      fetch("/api/sessions", {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      }).then((res) => {
        if (res.ok) {
          overlay.classList.add("hidden");
          App.init();
        } else {
          this.clearToken();
          showLogin();
        }
      }).catch(() => showLogin());
      return;
    }

    showLogin();

    const doLogin = async () => {
      const token = input.value.trim();
      if (!token) return;

      submit.disabled = true;
      submit.textContent = "Checking...";

      try {
        const res = await fetch("/api/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          this.setToken(token);
          overlay.classList.add("hidden");
          App.init();
        } else {
          if (error) error.textContent = "Invalid token";
          input.value = "";
          input.focus();
        }
      } catch {
        if (error) error.textContent = "Cannot reach server";
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
