alias ls="ls -G"
alias ll="ls -laG"
alias reload="exec zsh"

alias g="git"
alias gs="git status"
alias gd="git diff"
alias gl="git log -n 20 --oneline"
alias gco="git checkout"
alias gcb="git checkout -b"

alias be="bundle exec"
alias bu="bundle update --all"
alias r="bundle exec rails"

if command -v eza >/dev/null 2>&1; then
  alias ls="eza"
  alias ll="eza -la"
fi

if command -v bat >/dev/null 2>&1; then
  alias cat="bat"
fi

# Automatically re-sign Homebrew CLI binaries that need stable TCC permissions
resign_brew_binaries() {
  if [ "$(uname -s)" = "Darwin" ]; then
    if command -v herdr >/dev/null 2>&1 && security find-identity -p codesigning 2>/dev/null | grep -q "psst-dev"; then
      codesign -f -s "psst-dev" --identifier "com.herdrdev.herdr" "$(which herdr)" 2>/dev/null || true
    fi
  fi
}

if [ "$(uname -s)" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
  brew() {
    command brew "$@"
    local ret=$?
    if [ $ret -eq 0 ] && [[ "$1" =~ ^(upgrade|install|reinstall)$ ]]; then
      resign_brew_binaries
    fi
    return $ret
  }
fi
