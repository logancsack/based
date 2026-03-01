type WorkerResponse =
  | {
      ok: true;
      output: string[];
      result: unknown;
    }
  | {
      ok: false;
      error: string;
      output: string[];
    };

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing app root");
}

app.innerHTML = `
  <style>
    :root {
      --bg: #f4f6fb;
      --ink: #141e2b;
      --muted: #5d6a7f;
      --accent: #0a57ff;
      --panel: #ffffff;
      --border: #dbe1ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Space Grotesk", "Segoe UI", sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top right, #d9e6ff, transparent 40%), var(--bg);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 14px;
    }
    .hero {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
    }
    .hero h1 { margin: 0 0 6px; }
    .hero p { margin: 0; color: var(--muted); }
    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: 2fr 1fr;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
    }
    textarea, pre {
      width: 100%;
      min-height: 300px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: #0f1726;
      color: #e8eeff;
      padding: 12px;
      font-family: "IBM Plex Mono", monospace;
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      overflow: auto;
    }
    .payload {
      min-height: 120px;
      margin-top: 10px;
    }
    .actions {
      margin-top: 12px;
      display: flex;
      gap: 10px;
    }
    button {
      border: none;
      background: var(--accent);
      color: white;
      font-weight: 700;
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
    }
    .hint {
      color: var(--muted);
      font-size: 0.9rem;
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
  <div class="wrap">
    <section class="hero">
      <h1>Based Playground</h1>
      <p>Local-only runner. stdlib calls are mocked in-browser by design.</p>
    </section>
    <section class="grid">
      <div class="card">
        <h3>Editor</h3>
        <textarea id="code"></textarea>
        <h4>Payload JSON</h4>
        <textarea id="payload" class="payload"></textarea>
        <div class="actions">
          <button id="runBtn">Run</button>
        </div>
        <p class="hint">Mocked modules: network, discord, slack, vault.</p>
      </div>
      <div class="card">
        <h3>Output</h3>
        <pre id="output"></pre>
      </div>
    </section>
  </div>
`;

const codeInput = app.querySelector<HTMLTextAreaElement>("#code");
const payloadInput = app.querySelector<HTMLTextAreaElement>("#payload");
const output = app.querySelector<HTMLElement>("#output");
const runButton = app.querySelector<HTMLButtonElement>("#runBtn");

if (!codeInput || !payloadInput || !output || !runButton) {
  throw new Error("Missing UI elements");
}

codeInput.value = `yoink network outta stdlib

cook main(payload)
  lowkey res is network.get("https://api.example.com/status")
  yap res.body
  secure { hello: "world", payload: payload }
`;
payloadInput.value = `{"name":"Based"}`;
output.textContent = "ready";

const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" });

worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  if (event.data.ok) {
    output.textContent = JSON.stringify(
      {
        output: event.data.output,
        result: event.data.result
      },
      null,
      2
    );
    return;
  }

  output.textContent = JSON.stringify(
    {
      output: event.data.output,
      error: event.data.error
    },
    null,
    2
  );
});

runButton.addEventListener("click", () => {
  output.textContent = "running...";
  worker.postMessage({
    code: codeInput.value,
    payload: payloadInput.value
  });
});
