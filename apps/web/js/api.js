const Api = {
  headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Auth.getToken()}`,
    };
  },

  async listSessions() {
    const res = await fetch("/api/sessions", { headers: this.headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions;
  },

  async createSession(name) {
    await fetch("/api/sessions", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name }),
    });
  },

  async deleteSession(name) {
    await fetch(`/api/sessions/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  },

  async sendClaudeTask(prompt) {
    const res = await fetch("/api/claude/task", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  },

  async validateToken(token) {
    const res = await fetch("/api/sessions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  },
};
