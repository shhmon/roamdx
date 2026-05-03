// Image drop/paste handler. Uploads to server, types path into terminal.

const Upload = {
  init() {
    const target = document.getElementById("terminal-container");
    if (!target) return;

    // Drag & drop
    target.addEventListener("dragover", (e) => {
      if (this.hasFiles(e.dataTransfer)) {
        e.preventDefault();
        target.classList.add("drag-over");
      }
    });
    target.addEventListener("dragleave", () => {
      target.classList.remove("drag-over");
    });
    target.addEventListener("drop", async (e) => {
      target.classList.remove("drag-over");
      if (!this.hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      for (const file of e.dataTransfer.files) {
        await this.uploadAndInsert(file);
      }
    });

    // Paste — works on document level for clipboard images
    document.addEventListener("paste", async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await this.uploadAndInsert(file);
        }
      }
    });
  },

  hasFiles(dt) {
    if (!dt) return false;
    return Array.from(dt.types || []).includes("Files");
  },

  async uploadAndInsert(file) {
    if (!file.type.startsWith("image/")) return;

    const form = new FormData();
    form.append("file", file, file.name || `image-${Date.now()}.png`);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
        body: form,
      });
      if (!res.ok) {
        console.error("[upload] failed", await res.text());
        return;
      }
      const { path } = await res.json();
      // Type the path into the terminal, quoted to handle spaces
      const text = path.includes(" ") ? `"${path}"` : path;
      TerminalManager.send({ type: "input", data: text });
    } catch (err) {
      console.error("[upload] error", err);
    }
  },
};
