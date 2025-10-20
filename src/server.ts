import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";
import he from "he";

async function ensureLanguageLoaded(language: string): Promise<void> {
  if ((Prism.languages as Record<string, unknown>)[language]) return;
  try {
    await import(`prismjs/components/prism-${language}.js`);
  } catch {
    // ignore missing language; fallback will apply
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toForeignObjectHtml(html: string, fontSize: number, fontFamily: string): string {
  const style = `
    <style>
      :root { color-scheme: light dark; }
      .code { font: ${fontSize}px/1.4 ${he.encode(fontFamily)}; white-space: pre; }
      .token.comment{ color:#6a9955 }
      .token.string{ color:#ce9178 }
      .token.keyword{ color:#569cd6 }
      .token.function{ color:#dcdcaa }
      .token.number{ color:#b5cea8 }
      .token.operator{ color:#d4d4d4 }
      body{ margin:0; background:transparent; color:#d4d4d4 }
    </style>
  `;
  return `<div xmlns=\"http://www.w3.org/1999/xhtml\">${style}<pre class=\"code language-\">${html}</pre></div>`;
}

function renderHighlightedSvg(params: {
  code: string;
  language?: string;
  width?: number;
  padding?: number;
  background?: string;
  fontSize?: number;
  fontFamily?: string;
}): string {
  const {
    code,
    language = "javascript",
    width = 800,
    padding = 16,
    background = "#1e1e1e",
    fontSize = 14,
    fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"
  } = params;

  const loaded = (Prism.languages as Record<string, any>)[language];
  const grammar = loaded ?? Prism.languages.javascript;
  const highlighted = Prism.highlight(code, grammar, language);

  // Rough height estimation: lines * lineHeight * fontSize + padding*2
  const lineCount = code.split(/\r?\n/).length || 1;
  const lineHeightMultiplier = 1.4;
  const height = Math.max(1, Math.floor(lineCount * fontSize * lineHeightMultiplier + padding * 2));

  const html = toForeignObjectHtml(highlighted, fontSize, fontFamily);

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect x="0" y="0" width="100%" height="100%" rx="8" ry="8" fill="${escapeXml(background)}" />`,
    `  <foreignObject x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}">`,
    `    ${html}`,
    `  </foreignObject>`,
    `</svg>`
  ].join("\n");

  return svg;
}

async function main(): Promise<void> {
  const mcpServer = new McpServer({ name: "prismjs-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });

  const inputShape = {
    code: z.string().describe("Source code to highlight"),
    language: z.string().optional().default("javascript").describe("Prism language id (e.g., javascript, typescript, jsx, tsx, python)"),
    width: z.number().optional().default(800).describe("SVG width in px"),
    padding: z.number().optional().default(16).describe("Padding around content in px"),
    background: z.string().optional().default("#1e1e1e").describe("Background color"),
    fontSize: z.number().optional().default(14).describe("Font size in px"),
    fontFamily: z.string().optional().default("ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace").describe("Font family stack")
  } as const;

  const InputSchema = z.object(inputShape);
  type Args = z.infer<typeof InputSchema>;

  mcpServer.registerTool(
    "highlight_svg",
    {
      description: "Render highlighted code as an SVG using PrismJS.",
      inputSchema: inputShape
    },
    async ({ code, language, width, padding, background, fontSize, fontFamily }: Args) => {
      await ensureLanguageLoaded(language ?? "javascript");
      const svg = renderHighlightedSvg({ code, language, width, padding, background, fontSize, fontFamily });
      return { content: [{ type: "text", text: svg }] };
    }
  );

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  // @ts-ignore
  process.exit(1);
});


