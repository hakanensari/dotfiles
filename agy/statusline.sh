#!/bin/bash

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Read the JSON payload from stdin
input=$(cat)
[ -n "$input" ] && echo "$input" > /tmp/antigravity-statusline.json

# Extract CWD from the JSON payload
cwd=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('cwd', ''))
except Exception:
    pass
" 2>/dev/null)

# Check for a project-specific status line script
local_script=""
if [ -n "$cwd" ]; then
    if [ -x "$cwd/.claude/statusline-command.sh" ]; then
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
    # Fallback: Translate JSON and run the global Claude statusline script
    translated_input=$(echo "$input" | python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    d['workspace'] = {'current_dir': d.get('cwd', '')}
    print(json.dumps(d))
except Exception:
    pass
" 2>/dev/null)
    
    global_script="/Users/hakanensari/.claude/statusline.sh"
    if [ -x "$global_script" ]; then
        echo "$translated_input" | "$global_script"
    fi
fi
