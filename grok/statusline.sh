#!/bin/bash

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

input=$(cat)

# Extract CWD from the JSON payload (Grok sends cwd and workspace.current_dir)
cwd=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('workspace', {}).get('current_dir') or d.get('cwd', ''))
except Exception:
    pass
" 2>/dev/null)

# Check for a project-specific status line script
local_script=""
if [ -n "$cwd" ]; then
    if [ -x "$cwd/.grok/statusline.sh" ]; then
        local_script="$cwd/.grok/statusline.sh"
    elif [ -x "$cwd/.claude/statusline-command.sh" ]; then
        local_script="$cwd/.claude/statusline-command.sh"
    elif [ -x "$cwd/.claude/bin/statusline.sh" ]; then
        local_script="$cwd/.claude/bin/statusline.sh"
    elif [ -x "$cwd/.agents/statusline-command.sh" ]; then
        local_script="$cwd/.agents/statusline-command.sh"
    fi
fi

if [ -n "$local_script" ] && [ -f "$local_script" ]; then
    # Run the project-specific script
    echo "$input" | "$local_script"
else
    # Fallback to the universal Claude statusline script
    translated_input=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    if 'workspace' not in d or not d['workspace'].get('current_dir'):
        d['workspace'] = {'current_dir': d.get('cwd', '')}
    print(json.dumps(d))
except Exception:
    pass
" 2>/dev/null)

    global_script="$HOME/.claude/statusline.sh"
    if [ -x "$global_script" ]; then
        echo "$translated_input" | "$global_script"
    fi
fi
