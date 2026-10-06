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
import sys, json, time
try:
    d = json.loads(sys.stdin.read())
    d['workspace'] = {'current_dir': d.get('cwd', '')}
    if 'quota' in d and 'rate_limits' not in d:
        q = d.get('quota', {})
        m = (d.get('model', {}).get('id') or d.get('model', {}).get('display_name') or '').lower()
        is_3p = not ('gemini' in m)
        h5 = q.get('3p-5h' if is_3p else 'gemini-5h', {})
        w7 = q.get('3p-weekly' if is_3p else 'gemini-weekly', {})
        rl = {}
        if h5.get('remaining_fraction') is not None:
            rl['five_hour'] = {'used_percentage': round((1.0 - h5['remaining_fraction']) * 100)}
        if w7.get('remaining_fraction') is not None:
            res_sec = w7.get('reset_in_seconds')
            res_epoch = int(time.time() + res_sec) if res_sec is not None else None
            rl['seven_day'] = {
                'used_percentage': round((1.0 - w7['remaining_fraction']) * 100),
                'resets_at': res_epoch
            }
        d['rate_limits'] = rl
    print(json.dumps(d))
except Exception:
    pass
" 2>/dev/null)
    
    global_script="/Users/hakanensari/.claude/statusline.sh"
    if [ -x "$global_script" ]; then
        echo "$translated_input" | "$global_script"
    fi
fi
