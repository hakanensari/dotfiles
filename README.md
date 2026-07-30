# dotfiles

Local, topic-based dotfiles repository for macOS setup, shell configuration, and developer toolchains. Inspired by Holman/Mikker topic architecture.

## Structure

```
dotfiles/
├── brew/
│   └── Brewfile          # Homebrew formulae, casks, and taps
├── zsh/
│   ├── zshrc.symlink     # Primary zshrc (linked to ~/.zshrc)
│   └── aliases.zsh       # Shell aliases and shortcuts
├── git/
│   └── gitconfig.symlink # Global git configuration (linked to ~/.gitconfig)
└── script/
    └── bootstrap         # Idempotent setup script to link dotfiles
```

## Setup (Local Draft)

1. Symlink dotfiles:
   ```bash
   ./script/bootstrap
   ```

2. Restore Homebrew packages:
   ```bash
   brew bundle --file=brew/Brewfile
   ```
