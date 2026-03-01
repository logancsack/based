import { useEffect, useMemo, useState } from "react";
import { Surface, TopNav, UiButton, UiLinkButton } from "@based/web-ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { docsSections } from "./docsContent.js";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/playground/", label: "Playground" },
  { href: "https://github.com/logancsack/based", label: "GitHub", external: true }
];

export function DocsApp() {
  const [status, setStatus] = useState("");
  const [activeId, setActiveId] = useState(docsSections[0]?.id ?? "");

  useEffect(() => {
    const observers = docsSections.map((section) => {
      const element = document.getElementById(section.id);
      if (!element) {
        return null;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(section.id);
            }
          }
        },
        {
          rootMargin: "-15% 0px -70% 0px",
          threshold: 0.1
        }
      );
      observer.observe(element);
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  const sectionNav = useMemo(
    () => docsSections.map((section) => ({ href: `#${section.id}`, id: section.id, label: section.title })),
    []
  );

  const localFullMarkdown = useMemo(
    () =>
      docsSections
        .map((section) => `## ${section.title}\n\n${section.markdown}`.trim())
        .join("\n\n"),
    []
  );

  async function copyFull() {
    try {
      const response = await fetch("/llms-full.txt");
      if (response.ok) {
        const markdown = await response.text();
        await navigator.clipboard.writeText(markdown);
      } else {
        await navigator.clipboard.writeText(localFullMarkdown);
      }
      setStatus("Copied full docs markdown.");
    } catch (error) {
      try {
        await navigator.clipboard.writeText(localFullMarkdown);
        setStatus("Copied local full docs markdown.");
      } catch {
        setStatus(error instanceof Error ? error.message : "Copy failed.");
      }
    }
  }

  async function copySection(sectionTitle: string, markdown: string) {
    try {
      await navigator.clipboard.writeText(markdown);
      setStatus(`Copied ${sectionTitle} markdown.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Copy failed.");
    }
  }

  return (
    <div className="docs-shell">
      <TopNav brand={<span>Based Docs</span>} links={navLinks} />
      <main className="docs-main">
        <aside aria-label="Docs navigation">
          <Surface className="docs-nav-surface">
            <p className="docs-nav-meta">Human docs with markdown mirrors for AI agents.</p>
            <nav className="docs-nav-list">
              {sectionNav.map((link) => (
                <a key={link.id} href={link.href} className={link.id === activeId ? "is-active" : undefined}>
                  {link.label}
                </a>
              ))}
            </nav>
          </Surface>
        </aside>

        <section className="docs-content">
          <Surface className="docs-utility">
            <div className="docs-utility-row">
              <UiButton onClick={copyFull}>Copy Full Markdown</UiButton>
              <UiLinkButton href="/llms.txt" variant="ghost">
                llms.txt
              </UiLinkButton>
              <UiLinkButton href="/llms-full.txt" variant="ghost">
                llms-full.txt
              </UiLinkButton>
            </div>
            <p aria-live="polite" className="docs-status">
              {status}
            </p>
          </Surface>

          {docsSections.map((section) => (
            <Surface id={section.id} key={section.id} className="docs-section">
              <div className="docs-section-head">
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
                <UiButton
                  variant="ghost"
                  onClick={() => copySection(section.title, section.markdown)}
                  aria-label={`Copy markdown for ${section.title}`}
                >
                  Copy Markdown
                </UiButton>
              </div>
              <div className="docs-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre(props) {
                      const className =
                        props.className && props.className.length > 0
                          ? `docs-md-pre ${props.className}`
                          : "docs-md-pre";
                      return <pre {...props} className={className} />;
                    },
                    code(props) {
                      const className =
                        props.className && props.className.length > 0
                          ? `docs-md-code ${props.className}`
                          : "docs-md-code";
                      return <code {...props} className={className} />;
                    }
                  }}
                >
                  {section.markdown}
                </ReactMarkdown>
              </div>
            </Surface>
          ))}
        </section>
      </main>
    </div>
  );
}
