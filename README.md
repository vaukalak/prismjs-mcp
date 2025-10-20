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


