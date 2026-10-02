# Codemode

- `searchTools()`, `describeTool()`, `describeNamespace()` and `tools.<name>()` return promises: `await` them.
- `ALL_TOOLS` is an array of `{ name, description }`.
- Read an MCP server's instructions with `await describeNamespace("mcp__<server>")`.
- Never declare a variable named `tools`: it is reserved.
