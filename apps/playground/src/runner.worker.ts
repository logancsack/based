import { runSource } from "@based/lang-core";

interface RequestMessage {
  code: string;
  payload: string;
}

const ctx = self as unknown as {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<RequestMessage>) => void | Promise<void>
  ) => void;
  postMessage: (message: unknown) => void;
};

ctx.addEventListener("message", async (event: MessageEvent<RequestMessage>) => {
  const output: string[] = [];

  const mockedStdlib = {
    network: {
      async get(url: string) {
        return {
          status: 200,
          ok: true,
          headers: {},
          body: `mocked network.get -> ${url}`
        };
      },
      async post(url: string, payload: unknown) {
        return {
          status: 200,
          ok: true,
          headers: {},
          body: {
            mocked: true,
            url,
            payload
          }
        };
      }
    },
    discord: {
      async send(message: string) {
        return {
          ok: true,
          body: `mocked discord.send -> ${message}`
        };
      }
    },
    slack: {
      async send(message: string) {
        return {
          ok: true,
          body: `mocked slack.send -> ${message}`
        };
      }
    },
    vault: {
      get(_key: string) {
        return null;
      }
    }
  };

  try {
    const payload = event.data.payload.trim().length === 0 ? null : JSON.parse(event.data.payload);
    const result = await runSource(event.data.code, {
      entrypoint: {
        name: "main",
        args: [payload]
      },
      io: {
        yap(value) {
          output.push(String(value));
        }
      },
      moduleProvider: {
        async loadModule(sourceName) {
          if (sourceName === "stdlib") {
            return mockedStdlib as unknown as Record<string, unknown>;
          }
          throw new Error("Local file imports are disabled in browser mode");
        }
      }
    });

    ctx.postMessage({
      ok: true,
      output,
      result: result.lastValue
    });
  } catch (error) {
    ctx.postMessage({
      ok: false,
      output,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
