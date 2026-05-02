const Voice = {
  recognition: null,
  isRecording: false,
  buttons: [],
  transcript: "",

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    const ids = ["claude-mic", "voice-btn"];
    for (const id of ids) {
      const btn = document.getElementById(id);
      if (btn) {
        this.buttons.push(btn);
        btn.addEventListener("click", () => {
          if (this.isRecording) this.stop();
          else this.start();
        });
      }
    }

    this.recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      this.transcript = text;
      // Update textarea if visible
      const textarea = document.getElementById("claude-prompt");
      if (textarea) textarea.value = text;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
      this.setButtons(false);
    };

    this.recognition.onerror = (e) => {
      console.error("[voice]", e.error);
      this.isRecording = false;
      this.setButtons(false);
    };
  },

  setButtons(recording) {
    for (const btn of this.buttons) {
      btn.classList.toggle("recording", recording);
    }
  },

  start() {
    if (!this.recognition) return;
    this.transcript = "";
    const textarea = document.getElementById("claude-prompt");
    if (textarea) {
      textarea.value = "";
      textarea.placeholder = "Listening...";
    }
    this.isRecording = true;
    this.setButtons(true);
    this.recognition.start();
  },

  stop() {
    if (!this.recognition) return;
    const textarea = document.getElementById("claude-prompt");
    if (textarea) textarea.placeholder = "Send a task...";
    this.isRecording = false;
    this.setButtons(false);
    this.recognition.stop();
    if (this.transcript.trim()) {
      this.send(this.transcript.trim());
    }
  },

  send(text) {
    TerminalManager.send({ type: "input", data: text });
  },
};
