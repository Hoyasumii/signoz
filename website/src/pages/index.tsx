import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme/CodeBlock";
import Layout from "@theme/Layout";
import { useEffect, useState, type ReactNode } from "react";
import { preferredLocale } from "../locale-preference";

const INSTALL = "npm install @hoyasumii/signoz";

interface Feature {
  label: string;
  title: string;
  to: string;
  description: ReactNode;
  sample: string;
  language: string;
}

/** Built per render, so `translate` runs with the page's locale loaded. */
function features(): Feature[] {
  return [
    {
      label: "@hoyasumii/signoz",
      title: "SDK",
      to: "/docs/sdk/overview",
      description: (
        <Translate id="home.sdk.description">
          A typed client for the 241 operations of the SigNoz v0.142.1 REST API, one method per operationId, with an API
          key or the browser session's tokens rotated for you.
        </Translate>
      ),
      language: "ts",
      sample: `const signoz = createSignozClient({ baseUrl, apiKey });
const me = await signoz.users.getMyUser();`,
    },
    {
      label: "signoz-mcp",
      title: translate({ id: "home.mcp.title", message: "MCP server" }),
      to: "/docs/mcp/overview",
      description: (
        <Translate id="home.mcp.description">
          SigNoz for Claude Code, Codex, OpenCode or any MCP client: logs, traces, metrics and alerts, a dashboard
          builder that checks every panel before saving, and generic tools for the rest of the API.
        </Translate>
      ),
      language: "bash",
      sample: `npx signoz mcp config
npx signoz mcp install`,
    },
    {
      label: "signoz",
      title: "CLI",
      to: "/docs/cli/overview",
      description: (
        <Translate id="home.cli.description">
          Every MCP tool as a terminal command, plus signoz mcp to run the server in the background, start it at login
          and register it in your clients.
        </Translate>
      ),
      language: "bash",
      sample: `npx signoz search-logs --service point-api --severity ERROR,FATAL --since 30m
npx signoz get-trace --trace-id 4bf92f3577b34da6a3ce929d0e0e4736`,
    },
  ];
}

function InstallCommand(): ReactNode {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(INSTALL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="home-install">
      <code style={{ all: "unset" }}>
        <span>$ </span>
        {INSTALL}
      </code>
      <button type="button" onClick={copy}>
        {copied ? (
          <Translate id="home.install.copied">Copied</Translate>
        ) : (
          <Translate id="home.install.copy">Copy</Translate>
        )}
      </button>
    </div>
  );
}

/**
 * On the English home page only, sends the visitor to the translation that matches the language they
 * picked in the navbar menu or, failing that, their browser's. Every other page, translated homes
 * included, stays where its link pointed.
 */
function useLocaleRedirect(): void {
  const { i18n } = useDocusaurusContext();
  useEffect(() => {
    if (i18n.currentLocale !== i18n.defaultLocale) return;
    const locale = preferredLocale(i18n.locales);
    if (!locale || locale === i18n.currentLocale) return;
    const { search, hash } = window.location;
    window.location.replace(`${i18n.localeConfigs[locale]!.baseUrl}${search}${hash}`);
  }, [i18n]);
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  useLocaleRedirect();
  return (
    <Layout
      title={translate({ id: "home.title", message: "SigNoz SDK, MCP server and CLI" })}
      description={siteConfig.tagline}
    >
      <header className="home-hero">
        <div className="container">
          <span className="home-badge">
            <Translate id="home.badge">TypeScript · SigNoz v0.142.1 · MCP · CLI</Translate>
          </span>
          <h1 className="home-title">
            <Translate id="home.headline">The SigNoz API, typed end to end</Translate>
          </h1>
          <p className="home-subtitle">
            <Translate id="home.tagline">
              A TypeScript SDK for the SigNoz API, with an MCP server and a CLI built on top of it. Use it from code,
              from an AI agent or from your terminal: all three share the same client.
            </Translate>
          </p>
          <div className="home-actions">
            <Link className="home-button home-button--primary" to="/docs/intro">
              <Translate id="home.getStarted">Get started</Translate> →
            </Link>
            <Link className="home-button home-button--ghost" to="https://github.com/Hoyasumii/signoz">
              GitHub
            </Link>
          </div>
          <InstallCommand />
        </div>
      </header>
      <main className="container">
        <div className="home-features">
          {features().map((feature) => (
            <div key={feature.title} className="home-card">
              <span className="home-card__label">{feature.label}</span>
              <h3>
                <Link to={feature.to}>{feature.title}</Link>
              </h3>
              <p>{feature.description}</p>
              <CodeBlock language={feature.language}>{feature.sample}</CodeBlock>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
