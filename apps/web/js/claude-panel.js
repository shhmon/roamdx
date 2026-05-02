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
        const data = await Api.sendClaudeTask(prompt);
        textarea.value = "";
        TerminalManager.attach(data.sessionId);
        App.setActiveSession(data.sessionId);
      } catch (err) {
        console.error("[roamdx] Claude task failed:", err);
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

    Voice.init();
  },
};
