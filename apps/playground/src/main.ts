import "./playground.css";
import "@based/web-ui/tokens.css";
import "@based/web-ui/type.css";
import "@based/web-ui/motion.css";
import "@based/web-ui/components.css";

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
  <div class="pg-shell">
    <header class="webui-topnav">
      <div class="webui-topnav-inner">
        <a class="webui-brand" href="/">Based Playground</a>
        <nav aria-label="Primary">
          <a class="webui-nav-link" href="/docs/">Docs</a>
          <a class="webui-nav-link" href="/">Home</a>
        </nav>
      </div>
    </header>

    <main class="pg-main fade-up">
      <section class="webui-surface pg-hero">
        <h1>Run Based in-browser</h1>
        <p>Worker runtime with mocked stdlib modules so behavior stays explicit and safe.</p>
      </section>

      <section class="pg-grid">
        <article class="webui-surface pg-card">
          <div class="pg-head">
            <h2>Script</h2>
            <span id="status" class="pg-status ready">ready</span>
          </div>
          <textarea id="code" aria-label="Based code editor"></textarea>
          <h3>Payload JSON</h3>
          <textarea id="payload" class="payload" aria-label="Payload JSON"></textarea>
          <div class="pg-actions">
            <button id="runBtn" class="webui-btn webui-btn-primary" type="button">Run Script</button>
          </div>
          <p class="pg-note">Mocked modules: network, discord, slack, vault.</p>
        </article>

        <article class="webui-surface pg-card">
          <div class="pg-head">
            <h2>Output</h2>
          </div>
          <pre id="output"></pre>
        </article>
      </section>
    </main>
  </div>
`;

const codeInput = app.querySelector<HTMLTextAreaElement>("#code");
const payloadInput = app.querySelector<HTMLTextAreaElement>("#payload");
const output = app.querySelector<HTMLElement>("#output");
const runButton = app.querySelector<HTMLButtonElement>("#runBtn");
const statusBadgeNode = app.querySelector<HTMLElement>("#status");

if (!codeInput || !payloadInput || !output || !runButton || !statusBadgeNode) {
  throw new Error("Missing UI elements");
}

const statusBadge = statusBadgeNode;

function setStatus(state: "ready" | "running" | "error", label: string) {
  statusBadge.className = `pg-status ${state}`;
  statusBadge.textContent = label;
}

codeInput.value = `yoink network outta stdlib

cook main(payload)
  lowkey res is network.get("https://api.example.com/status")
  yap res.body
  secure { hello: "world", payload: payload }
`;
payloadInput.value = `{"name":"Based"}`;
output.textContent = "ready";
setStatus("ready", "ready");

const worker = new Worker(new URL("./runner.worker.ts", import.meta.url), { type: "module" });

worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  if (event.data.ok) {
    setStatus("ready", "success");
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

  setStatus("error", "error");
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
  setStatus("running", "running");
  output.textContent = "running...";
  worker.postMessage({
    code: codeInput.value,
    payload: payloadInput.value
  });
});
