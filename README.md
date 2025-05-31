# Dot Code School Build Tools

This repository contains build tools and utilities for Dot Code School services.

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0

### Installation

#### macOS

```bash
# Download the latest release
curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-macos -o dotcodeschool-setup
curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-macos -o dotcodeschool-build-images

# Make them executable
chmod +x dotcodeschool-setup dotcodeschool-build-images

# Move to a directory in your PATH (optional)
sudo mv dotcodeschool-setup dotcodeschool-build-images /usr/local/bin/
```

#### Linux

```bash
# Download the latest release
curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-linux -o dotcodeschool-setup
curl -L https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-linux -o dotcodeschool-build-images

# Make them executable
chmod +x dotcodeschool-setup dotcodeschool-build-images

# Move to a directory in your PATH (optional)
sudo mv dotcodeschool-setup dotcodeschool-build-images /usr/local/bin/
```

#### Windows (PowerShell)

```powershell
# Create a directory for the tools (if it doesn't exist)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dotcodeschool\bin"

# Download the latest release
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

## Releases

The latest release can be found on the [Releases page](https://github.com/dotcodeschool/build-tools/releases/latest). Each release includes pre-built binaries for:

- macOS (Apple Silicon and Intel)
- Linux (x64)
- Windows (x64)

## License

This project is licensed under the [WTFPL](LICENSE) - Do What The Fuck You Want To Public License.
