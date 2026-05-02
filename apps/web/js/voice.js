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
      const textarea = document.getElementById("claude-prompt");
      if (textarea) textarea.value = text;
    };

    this.recognition.onend = () => {
      const wasRecording = this.isRecording;
      this.isRecording = false;
      this.setButtons(false);
      if (wasRecording && this.transcript.trim()) {
        this.send(this.transcript.trim());
      }
    };

    this.recognition.onerror = () => {
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
    this.isRecording = true;
    this.setButtons(true);
    this.recognition.start();
  },

  stop() {
    if (!this.recognition) return;
    this.recognition.stop();
  },

  send(text) {
    TerminalManager.send({ type: "input", data: text });
  },
};
