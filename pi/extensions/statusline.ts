/**
 * Statusline Extension for Pi.
 *
 * Replicates the Starship-style status line used across Claude Code and Antigravity:
 * 1. Working directory (cyan), with git worktree parent resolution
 * 2. Git status: branch name (purple) + dirty tree indicator (red *)
 * 3. Context window progress bar (7-char rule, cyan/dimmed, hidden below 10%)
 * 4. Model tier and thinking/effort indicator
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { type Component, truncateToWidth, type TUI, type Theme } from "@earendil-works/pi-tui";
import { execFile } from "node:child_process";
import { basename, dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Colors matching Claude Code & AGY statusline.sh
const cyan = "\x1b[1;36m";
const purple = "\x1b[1;35m";
const red = "\x1b[0;31m";
const reset = "\x1b[0m";
const dim = "\x1b[90m";
const branchGlyph = "\uE0A0"; // U+E0A0 Nerd Font branch glyph
const barFill = "━"; // U+2501 heavy horizontal
const barEmpty = "─"; // U+2500 light horizontal

interface DirtyState {
  isDirty: boolean;
  lastChecked: number;
}

export default function statusline(pi: ExtensionAPI) {
  let isDirty = false;
  let checkingDirty = false;
  let cachedCwd = "";
  let cachedDisplayName = "";
  let cachedCommonDir = "";

  async function checkGitDirty(cwd: string, tui: TUI) {
    if (checkingDirty) return;
    checkingDirty = true;
    try {
      // Check unstaged changes
      let dirty = false;
      try {
        await execFileAsync("git", ["--no-optional-locks", "diff", "--quiet"], { cwd });
      } catch {
        dirty = true;
      }

      // Check staged changes if unstaged was clean
      if (!dirty) {
        try {
          await execFileAsync("git", ["--no-optional-locks", "diff", "--cached", "--quiet"], { cwd });
        } catch {
          dirty = true;
        }
      }

      if (isDirty !== dirty) {
        isDirty = dirty;
        tui.requestRender();
      }
    } catch {
      // Not a git repo or git error
    } finally {
      checkingDirty = false;
    }
  }

  async function resolveDisplayName(cwd: string, branch: string | null): Promise<string> {
    const dirName = basename(cwd);
    if (!branch || branch !== dirName) {
      return dirName;
    }

    if (cachedCwd === cwd && cachedDisplayName) {
      return cachedDisplayName;
    }

    try {
      const { stdout } = await execFileAsync(
        "git",
        ["--no-optional-locks", "rev-parse", "--path-format=absolute", "--git-common-dir"],
        { cwd }
      );
      const commonDir = stdout.trim();
      if (commonDir) {
        cachedCwd = cwd;
        cachedDisplayName = basename(dirname(commonDir));
        return cachedDisplayName;
      }
    } catch {
      // Fallback to dirName
    }

    return dirName;
  }

  pi.on("session_start", (_event, ctx: ExtensionContext) => {
    ctx.ui.setFooter((tui, _theme, footerData) => {
      let displayName = basename(ctx.sessionManager.getCwd());

      // Subscribe to branch changes to re-check dirty state & render
      const unsubscribeBranch = footerData.onBranchChange(() => {
        const cwd = ctx.sessionManager.getCwd();
        const branch = footerData.getGitBranch();
        void resolveDisplayName(cwd, branch).then((name) => {
          displayName = name;
          void checkGitDirty(cwd, tui);
        });
      });

      // Periodic / on-demand dirty state check
      const dirtyInterval = setInterval(() => {
        const cwd = ctx.sessionManager.getCwd();
        void checkGitDirty(cwd, tui);
      }, 2000);

      // Initial check
      const initialCwd = ctx.sessionManager.getCwd();
      const initialBranch = footerData.getGitBranch();
      void resolveDisplayName(initialCwd, initialBranch).then((name) => {
        displayName = name;
        void checkGitDirty(initialCwd, tui);
      });

      return {
        render(width: number): string[] {
          const branch = footerData.getGitBranch();

          // 1. Git segment
          let gitInfo = "";
          if (branch) {
            const dirtyTag = isDirty ? `${red}*${reset}` : "";
            gitInfo = ` on ${purple}${branchGlyph} ${branch}${reset}${dirtyTag}`;
          }

          // 2. Context bar
          const contextUsage = ctx.getContextUsage();
          const usedPct = contextUsage?.percent ?? 0;
          let barDisplay = "";
          if (usedPct >= 10) {
            const barWidth = 7;
            const filled = Math.min(barWidth, Math.max(0, Math.round((usedPct / 100) * barWidth)));
            const filledBar = barFill.repeat(filled);
            const emptyBar = barEmpty.repeat(barWidth - filled);
            barDisplay = `${cyan}${filledBar}${dim}${emptyBar}${reset}`;
          }

          // 3. Model & Thinking segment
          const modelId = ctx.model?.id || "";
          let modelSeg = "";
          if (modelId) {
            const match = modelId.match(/(flash|pro|sonnet|haiku|opus|fable|qwen|moonshot|llama|deepseek)/i);
            const shortModel = match ? match[1].toLowerCase() : modelId.split(/[-_/]/)[0].toLowerCase();
            modelSeg = `  ${shortModel}`;
          }

          // 4. Extension status pills
          const extStatuses = footerData.getExtensionStatuses();
          let extStr = "";
          if (extStatuses.size > 0) {
            const items = Array.from(extStatuses.values()).map((s) => s.replace(/[\r\n\t]/g, " ").trim());
            extStr = `  ${dim}${items.join(" ")}${reset}`;
          }

          // 5. Compose full line
          const usageSegments = [barDisplay, modelSeg, extStr].filter(Boolean).join("");
          const usageDisplay = usageSegments ? `  ${usageSegments}` : "";
          const fullLine = `${cyan}${displayName}${reset}${gitInfo}${usageDisplay}`;

          return [truncateToWidth(fullLine, width, "...")];
        },
        dispose() {
          unsubscribeBranch();
          clearInterval(dirtyInterval);
        },
      };
    });
  });
}
