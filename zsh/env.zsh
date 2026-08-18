export PATH="$HOME/.local/bin:$PATH"
export EDITOR="zed-editor"
export CLAUDE_CONFIG_DIR="$HOME/.claude"
if [[ -f "$HOME/.cache/huggingface/token" ]]; then
  export HF_TOKEN="$(cat "$HOME/.cache/huggingface/token")"
fi

HISTSIZE=10000
SAVEHIST=10000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt SHARE_HISTORY
setopt HIST_FIND_NO_DUPS
setopt HIST_VERIFY
setopt INC_APPEND_HISTORY

setopt AUTO_PUSHD
setopt PUSHD_IGNORE_DUPS

autoload -Uz compinit && compinit -C

if command -v oh-my-posh >/dev/null 2>&1; then
  eval "$(oh-my-posh init zsh --config "$DOTFILES/zsh/omp.toml")"
fi

if command -v direnv >/dev/null 2>&1; then
  eval "$(direnv hook zsh)"
fi

if command -v with-bot-env >/dev/null 2>&1; then
  agy() { with-bot-env command agy "$@"; }
  claude() { with-bot-env command claude "$@"; }
  codex() { with-bot-env command codex "$@"; }
  pi() { with-bot-env command pi "$@"; }
fi
