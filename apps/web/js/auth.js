const Auth = {
  TOKEN_KEY: "roamdx_token",

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  init() {
    const overlay = document.getElementById("auth-overlay");
    const input = document.getElementById("token-input");
    const submit = document.getElementById("token-submit");

    if (this.isAuthenticated()) {
      overlay.classList.add("hidden");
      return;
    }

    const doLogin = () => {
      const token = input.value.trim();
      if (!token) return;
      this.setToken(token);
      overlay.classList.add("hidden");
      if (typeof App !== "undefined") App.init();
    };

    submit.addEventListener("click", doLogin);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
  },
};
