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
