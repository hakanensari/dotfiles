autoload -Uz vcs_info
zstyle ':vcs_info:*' enable git
zstyle ':vcs_info:git*' formats "%{$fg[green]%}[%{$fg[cyan]%}%b%{$fg[green]%}] %{$reset_color%}"
precmd() {
    vcs_info
}

setopt prompt_subst
autoload colors && colors
PROMPT='%{$fg[green]%}%c %{$fg[cyan]%}$ %{$fg_bold[cyan]%}${vcs_info_msg_0_}%{$reset_color%}'
