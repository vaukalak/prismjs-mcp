## prismjs-mcp

MCP server that turns source code into an SVG with syntax highlighting using PrismJS.

Tools:
- `highlight_svg`: Render highlighted code as SVG.

Example args:

```json
{
  "code": "const x = 42;\nconsole.log(x);",
  "language": "javascript",
  "width": 800,
  "padding": 16,
  "background": "#1e1e1e",
  "fontSize": 14
}
```

### Theming with palette

You can override colors used in the output via the optional `palette` field and control the CSS `color-scheme` via `colorScheme` (alias: `colorSchema`). Any missing palette values fall back to sensible defaults.

Supported palette keys:

- `background`: SVG background color
- `foreground`: Default text color
- `comment`: Color for comments
- `string`: Color for strings
- `keyword`: Color for keywords
- `function`: Color for function names
- `number`: Color for numbers
- `operator`: Color for operators/punctuation

Example:

```json
{
  "code": "function greet(name){\n  // say hello\n  console.log(`Hello, ${name}!`);\n}",
  "language": "javascript",
  "width": 720,
  "padding": 20,
  "fontSize": 14,
  "palette": {
    "background": "#0b1221",
    "foreground": "#e6edf3",
    "comment": "#8b949e",
    "string": "#a5d6ff",
    "keyword": "#ff7b72",
    "function": "#d2a8ff",
    "number": "#79c0ff",
    "operator": "#c9d1d9"
  },
  "colorScheme": "dark"
}
```

### Local
```
npm install
npm run build
node dist/server.js
```

### Docker
```
docker build -t prismjs-mcp .
docker run --rm -i prismjs-mcp
```


