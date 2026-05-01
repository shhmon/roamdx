const ClaudePanel = {
  init() {
    const textarea = document.getElementById("claude-prompt");
    const sendBtn = document.getElementById("claude-send");

    const submit = async () => {
      const prompt = textarea.value.trim();
      if (!prompt) return;

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";

      try {
        const res = await fetch("/api/claude/task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Auth.getToken()}`,
          },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) throw new Error("Failed");

        const data = await res.json();
        textarea.value = "";

        // Auto-attach to claude session
        TerminalManager.attach(data.sessionId);
        App.setActiveSession(data.sessionId);
      } catch (err) {
        console.error("Claude task failed:", err);
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send";
      }
    };

    sendBtn.addEventListener("click", submit);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    });
  },
};
