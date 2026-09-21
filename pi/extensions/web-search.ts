/**
 * Web Search extension for Pi.
 *
 * Wraps ~/.pi/agent/skills/web-search/web-search.js into a native, callable
 * `web_search` tool for Pi so that local and frontier models have direct
 * function-calling access to web searches and page fetching without needing
 * to invoke bash scripts or manage skill directories manually.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { Text } from "@earendil-works/pi-tui";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const SCRIPT_PATH = join(homedir(), ".pi", "agent", "skills", "web-search", "web-search.js");

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the internet using Google/DuckDuckGo or fetch web pages as clean Markdown. " +
      "Use this for research, recent events, documentation, news, or looking up web content.",
    promptSnippet: "Search the web or fetch a page as Markdown",
    parameters: Type.Object({
      query: Type.Optional(Type.String({ description: "Search query string to look up on the web." })),
      url: Type.Optional(Type.String({ description: "Direct URL to fetch and convert to Markdown." })),
      count: Type.Optional(Type.Number({ description: "Number of search results to return (default: 5)." })),
    }),
    async execute(_toolCallId, params) {
      const args: string[] = [];
      if (params.url) {
        args.push("--url", params.url);
      } else if (params.query) {
        args.push(params.query);
        if (params.count && params.count > 0) {
          args.push("-n", String(params.count));
        }
      } else {
        return {
          content: [{ type: "text", text: "Error: Either 'query' or 'url' must be provided." }],
          isError: true,
        };
      }

      try {
        const { stdout, stderr } = await execFileAsync("node", [SCRIPT_PATH, ...args], {
          timeout: 45000,
          maxBuffer: 2 * 1024 * 1024,
        });
        const output = (stdout || stderr || "No results found.").trim();
        return {
          content: [{ type: "text", text: output }],
        };
      } catch (err: any) {
        const message = err.stderr || err.stdout || err.message || "Search failed";
        return {
          content: [{ type: "text", text: `web_search error: ${message}` }],
          isError: true,
        };
      }
    },
    renderCall(args, theme) {
      const target = args.url ? `URL: ${args.url}` : `"${args.query || ""}"`;
      return new Text(
        theme.fg("toolTitle", theme.bold("web_search")) + " " + theme.fg("muted", target),
        0,
        0
      );
    },
  });
}
