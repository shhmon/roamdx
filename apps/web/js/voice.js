const Voice = {
  recognition: null,
  isRecording: false,
  buttons: [],
  transcript: "",
  sendEnterOnStop: false,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    // claude-mic / voice-btn get a click handler that just toggles record.
    // quick-mic is wired separately in app.js (it adds sendEnterOnStop), so
    // we only register it here for the visual recording-state class.
    const handlers = [
      { id: "claude-mic", click: true },
      { id: "voice-btn", click: true },
      { id: "quick-mic", click: false },
    ];
    for (const { id, click } of handlers) {
      const btn = document.getElementById(id);
      if (!btn) continue;
      this.buttons.push(btn);
      if (click) {
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
    };

    this.recognition.onend = () => {
      const wasRecording = this.isRecording;
      this.isRecording = false;
      this.setButtons(false);
      if (wasRecording && this.transcript.trim()) {
        const text = this.transcript.trim();
        const tail = this.sendEnterOnStop ? "\r" : " ";
        this.sendEnterOnStop = false;
        TerminalManager.send({ type: "input", data: text + tail });
      } else {
        this.sendEnterOnStop = false;
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

  // Stop recognition and wait for it to flush the final transcript via
  // onend, then send transcript + tail char. iOS Safari can take a moment
  // to deliver the final result after stop(), so we rely on onend.
  commit(withEnter) {
    if (!this.recognition || !this.isRecording) return;
    this.sendEnterOnStop = withEnter;
    this.recognition.stop();
  },
};
