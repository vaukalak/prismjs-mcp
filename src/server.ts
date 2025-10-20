import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";
import he from "he";

type Palette = {
  background?: string;
  foreground?: string;
  comment?: string;
  string?: string;
  keyword?: string;
  function?: string;
  number?: string;
  operator?: string;
};

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

function toForeignObjectHtml(
  html: string,
  fontSize: number,
  fontFamily: string,
  palette?: Palette,
  colorScheme?: string
): string {
  const scheme = colorScheme ?? "light dark";
  const colors = {
    comment: palette?.comment ?? "#6a9955",
    string: palette?.string ?? "#ce9178",
    keyword: palette?.keyword ?? "#569cd6",
    function: palette?.function ?? "#dcdcaa",
    number: palette?.number ?? "#b5cea8",
    operator: palette?.operator ?? "#d4d4d4",
    foreground: palette?.foreground ?? "#d4d4d4",
  } as const;
  const style = `
    <style>
      :root { color-scheme: ${he.encode(scheme)}; }
      .code { font: ${fontSize}px/1.4 ${he.encode(
    fontFamily
  )}; white-space: pre; }
      .token.comment{ color:${colors.comment} }
      .token.string{ color:${colors.string} }
      .token.keyword{ color:${colors.keyword} }
      .token.function{ color:${colors.function} }
      .token.number{ color:${colors.number} }
      .token.operator{ color:${colors.operator} }
      body{ margin:0; background:transparent; color:${colors.foreground} }
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
  palette?: Palette;
  colorSchema?: string;
  colorScheme?: string;
}): string {
  const {
    code,
    language = "javascript",
    width = 800,
    padding = 16,
    background = "#1e1e1e",
    fontSize = 14,
    fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    palette,
    colorSchema,
    colorScheme,
  } = params;

  const loaded = (Prism.languages as Record<string, any>)[language];
  const grammar = loaded ?? Prism.languages.javascript;
  const highlighted = Prism.highlight(code, grammar, language);

  // Rough height estimation: lines * lineHeight * fontSize + padding*2
  const lineCount = code.split(/\r?\n/).length || 1;
  const lineHeightMultiplier = 1.4;
  const height = Math.max(
    1,
    Math.floor(lineCount * fontSize * lineHeightMultiplier + padding * 2)
  );

  const scheme = colorScheme ?? colorSchema ?? "light dark";
  const html = toForeignObjectHtml(
    highlighted,
    fontSize,
    fontFamily,
    palette,
    scheme
  );

  const effectiveBackground = palette?.background ?? background;
  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect x="0" y="0" width="100%" height="100%" rx="8" ry="8" fill="${escapeXml(
      effectiveBackground
    )}" />`,
    `  <foreignObject x="${padding}" y="${padding}" width="${
      width - padding * 2
    }" height="${height - padding * 2}">`,
    `    ${html}`,
    `  </foreignObject>`,
    `</svg>`,
  ].join("\n");

  return svg;
}

async function main(): Promise<void> {
  const mcpServer = new McpServer(
    { name: "prismjs-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  const inputShape = {
    code: z.string().describe("Source code to highlight"),
    language: z
      .string()
      .optional()
      .default("javascript")
      .describe(
        "Prism language id (e.g., javascript, typescript, jsx, tsx, python)"
      ),
    width: z.number().optional().default(800).describe("SVG width in px"),
    padding: z
      .number()
      .optional()
      .default(16)
      .describe("Padding around content in px"),
    background: z
      .string()
      .optional()
      .default("#1e1e1e")
      .describe("Background color"),
    fontSize: z.number().optional().default(14).describe("Font size in px"),
    fontFamily: z
      .string()
      .optional()
      .default(
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
      )
      .describe("Font family stack"),
    palette: z
      .object({
        background: z.string().optional().describe("SVG background color"),
        foreground: z.string().optional().describe("Default text color"),
        comment: z.string().optional().describe("Color for comments"),
        string: z.string().optional().describe("Color for strings"),
        keyword: z.string().optional().describe("Color for keywords"),
        function: z.string().optional().describe("Color for function names"),
        number: z.string().optional().describe("Color for numbers"),
        operator: z
          .string()
          .optional()
          .describe("Color for operators/punctuation"),
      })
      .partial()
      .optional()
      .describe("Optional color palette to theme the output"),
    colorSchema: z
      .string()
      .optional()
      .default("light dark")
      .describe("CSS color-scheme value (e.g., 'dark', 'light', 'light dark')"),
    colorScheme: z.string().optional().describe("Alias of colorSchema"),
  } as const;

  const InputSchema = z.object(inputShape);
  type Args = z.infer<typeof InputSchema>;

  mcpServer.registerTool(
    "highlight_svg",
    {
      description: "Render highlighted code as an SVG using PrismJS.",
      inputSchema: inputShape,
    },
    async ({
      code,
      language,
      width,
      padding,
      background,
      fontSize,
      fontFamily,
      palette,
      colorSchema,
      colorScheme,
    }: Args) => {
      await ensureLanguageLoaded(language ?? "javascript");
      const svg = renderHighlightedSvg({
        code,
        language,
        width,
        padding,
        background,
        fontSize,
        fontFamily,
        palette,
        colorSchema,
        colorScheme,
      });
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
