# Dot Code School Build Tools

This repository contains build tools and utilities for Dot Code School services.

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0

### Installation

#### macOS

```bash
# Install via Homebrew
brew tap dotcodeschool/tools
brew install dotcodeschool-setup dotcodeschool-build-images
```

#### Linux

```bash
# Install setup tool
sudo curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-linux -o /usr/local/bin/dotcodeschool-setup
sudo chmod +x /usr/local/bin/dotcodeschool-setup

# Install build-images tool
sudo curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-linux -o /usr/local/bin/dotcodeschool-build-images
sudo chmod +x /usr/local/bin/dotcodeschool-build-images
```

#### Windows (PowerShell)

```powershell
# Create a directory for the tools (if it doesn't exist)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dotcodeschool\bin"

# Download the tools
Invoke-WebRequest -Uri "https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-win.exe" -OutFile "$env:USERPROFILE\.dotcodeschool\bin\dotcodeschool-setup.exe"
Invoke-WebRequest -Uri "https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-win.exe" -OutFile "$env:USERPROFILE\.dotcodeschool\bin\dotcodeschool-build-images.exe"

# Add to PATH (you may need to restart your terminal)
$env:Path += ";$env:USERPROFILE\.dotcodeschool\bin"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.dotcodeschool\bin", "User")
```

### Verify Installation

```bash
# Check if tools are available
dotcodeschool-setup --version
dotcodeschool-build-images --version
```

### Usage

```bash
# Run setup
dotcodeschool-setup

# Build images
dotcodeschool-build-images
```

### Development Setup

If you want to work on the tools themselves:

```bash
# Clone the repository
git clone https://github.com/dotcodeschool/build-tools.git
cd build-tools

# Install dependencies
pnpm install

# Build the tools
pnpm build:all
```

## Available Tools

### Build Images Tool

- Linux: [dotcodeschool-build-images-linux](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-linux)
- macOS: [dotcodeschool-build-images-macos](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-macos)
- Windows: [dotcodeschool-build-images-win.exe](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-win.exe)

### Setup Tool

- Linux: [dotcodeschool-setup-linux](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-linux)
- macOS: [dotcodeschool-setup-macos](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-macos)
- Windows: [dotcodeschool-setup-win.exe](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-win.exe)

## Development Scripts

- `pnpm setup` - Run the setup process
- `pnpm build-images` - Build Docker images
- `pnpm build:all` - Run all build processes
- `pnpm build:setup` - Build setup components
- `pnpm build:images` - Build all Docker images

## Project Structure

This is a monorepo managed with PNPM workspaces. The main packages are:

- `dotcodeschool-setup` - Setup utilities
- `dotcodeschool-build-images` - Docker image build tools

## License

This project is licensed under the [WTFPL](LICENSE) - Do What The Fuck You Want To Public License.
