import { useState } from "react";
import { CodeBlock, SectionTitle, Surface, TopNav, UiButton, UiLinkButton } from "@based/web-ui";

const installCommand = "npm install -g based-lang";

const navLinks = [
  { href: "/docs/", label: "Docs" },
  { href: "/playground/", label: "Playground" },
  { href: "https://github.com/logancsack/based", label: "GitHub", external: true }
];

const features = [
  {
    title: "Language That Ships",
    text: "Slang syntax with real execution semantics. Parse, run, and host scripts without ceremony."
  },
  {
    title: "Tooling That Feels Fast",
    text: "Use check, format, run, and serve commands in a local-first loop designed for rapid webhook iteration."
  },
  {
    title: "AI-Ready Documentation",
    text: "Human docs plus markdown mirrors and llms files for agent indexing and deterministic retrieval."
  }
];

const proofItems = [
  { label: "Runtime", value: "Tree-walking interpreter in TypeScript" },
  { label: "CLI", value: "`based run`, `check`, `fmt`, `serve`" },
  { label: "Stdlib", value: "network, vault, discord, slack" },
  { label: "Deployability", value: "One Vercel project with route composition" }
];

export function App() {
  const [copied, setCopied] = useState(false);

  async function copyInstall() {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="site-shell">
      <TopNav brand={<span>Based</span>} links={navLinks} />
      <main>
        <div className="hero-wrap fade-up">
          <Surface className="hero-main">
            <SectionTitle
              eyebrow="Meme-First. Production-Ready."
              title="Build webhooks and bots in pure slang."
              description="Based is a local-first scripting language with indentation syntax, batteries-included modules, and a workflow optimized for quick shipping."
            />
            <div className="hero-actions">
              <UiButton onClick={copyInstall}>{copied ? "Copied" : "Copy Install Command"}</UiButton>
              <UiLinkButton variant="ghost" href="/docs/">
                Read Docs
              </UiLinkButton>
              <UiLinkButton variant="ghost" href="/playground/">
                Open Playground
              </UiLinkButton>
            </div>
            <CodeBlock>{installCommand}</CodeBlock>
          </Surface>

          <Surface className="hero-code">
            <p className="panel-label">Live Script Shape</p>
            <CodeBlock>{`yoink network outta stdlib

cook main(payload)
  lowkey res is network.get(payload.url)
  secure {
    ok: bet,
    status: res.status,
    payload: payload
  }`}</CodeBlock>
          </Surface>
        </div>

        <section className="feature-grid" aria-label="Product highlights">
          {features.map((item) => (
            <Surface key={item.title} className="feature-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Surface>
          ))}
        </section>

        <Surface className="proof-strip">
          <h2>Why teams use Based for MVP automation</h2>
          <div className="proof-grid">
            {proofItems.map((item) => (
              <article key={item.label}>
                <p className="proof-label">{item.label}</p>
                <p className="proof-value">{item.value}</p>
              </article>
            ))}
          </div>
        </Surface>
      </main>

      <footer>
        <div className="footer-inner">
          <p>Based language and tooling</p>
          <nav aria-label="Footer">
            <a href="/docs/">Docs</a>
            <a href="/playground/">Playground</a>
            <a href="/llms.txt">llms.txt</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
