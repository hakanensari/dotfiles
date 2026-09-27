/**
 * Statusline Extension for Pi.
 *
 * Runs the project-specific or global statusline script matching Claude Code and AGY:
 * - In personal-agent: shows email inbox, tasks, next calendar event | [model] | [context bar]
 * - In other repos: shows project/dir on branch* | [model] | [context bar]
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Component, truncateToWidth, type TUI, type Theme } from "@earendil-works/pi-tui";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function resolveScriptPath(cwd: string): string {
  const candidates = [
    join(cwd, ".claude", "statusline-command.sh"),
    join(cwd, ".claude", "bin", "statusline.sh"),
    join(cwd, ".agents", "statusline-command.sh"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return join(homedir(), ".claude", "statusline.sh");
}

function buildPayload(ctx: ExtensionContext): string {
  const cwd = ctx.sessionManager.getCwd();
  const modelId = ctx.model?.id || "";
  const contextUsage = ctx.getContextUsage();
  const usedPct = contextUsage?.percent ?? 0;
  const thinkingLevel = (ctx.sessionManager?.getState?.() as any)?.thinkingLevel || "";

  return JSON.stringify({
    workspace: {
      current_dir: cwd,
    },
    model: {
      display_name: modelId,
    },
    context_window: {
      used_percentage: usedPct,
    },
    effort: {
      level: thinkingLevel,
    },
  });
}

export default function statusline(pi: ExtensionAPI) {
  let cachedOutput = "";
  let inFlight = false;

  function refresh(ctx: ExtensionContext, tui?: TUI) {
    if (inFlight) return;
    inFlight = true;

    const cwd = ctx.sessionManager.getCwd();
    const scriptPath = resolveScriptPath(cwd);
    const payload = buildPayload(ctx);

    const child = execFile(
      scriptPath,
      [],
      { cwd, timeout: 3000, env: { ...process.env, STATUSLINE_NO_MODEL: "" } },
      (err, stdout) => {
        inFlight = false;
        if (!err && stdout) {
          const formatted = stdout.trimEnd();
          if (formatted !== cachedOutput) {
            cachedOutput = formatted;
            tui?.requestRender();
          }
        }
      }
    );

    child.stdin?.write(payload);
    child.stdin?.end();
  }

  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    ctx.ui.setFooter((tui: TUI, _theme: Theme, footerData) => {
      // Refresh on branch changes
      const unsubscribeBranch = footerData.onBranchChange(() => {
        refresh(ctx, tui);
      });

      // Periodic refresh
      const interval = setInterval(() => {
        refresh(ctx, tui);
      }, 2000);

      // Initial execution
      refresh(ctx, tui);

      return {
        render(width: number): string[] {
          if (!cachedOutput) {
            return [];
          }
          return [truncateToWidth(cachedOutput, width, "...")];
        },
        dispose() {
          unsubscribeBranch();
          clearInterval(interval);
        },
      };
    });
  });

  pi.on("agent_settled", (_event, ctx: ExtensionContext) => {
    refresh(ctx);
  });

  pi.on("agent_end", (_event, ctx: ExtensionContext) => {
    refresh(ctx);
  });
}
