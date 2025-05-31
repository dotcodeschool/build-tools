# Dot Code School Build Tools

This repository contains build tools and utilities for Dot Code School services.

## Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0

## Installation

```bash
pnpm install
```

## Available Scripts

- `pnpm setup` - Run the setup process
- `pnpm build-images` - Build Docker images
- `pnpm build:all` - Run all build processes
- `pnpm build:setup` - Build setup components
- `pnpm build:images` - Build all Docker images

## Project Structure

This is a monorepo managed with PNPM workspaces. The main packages are:

- `dotcodeschool-setup` - Setup utilities
- `dotcodeschool-build-images` - Docker image build tools

## Development

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Run the desired scripts as needed

## Releases

The latest release includes pre-built binaries for multiple platforms:

### Build Images Tool

- Linux: [dotcodeschool-build-images-linux](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-linux)
- macOS: [dotcodeschool-build-images-macos](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-macos)
- Windows: [dotcodeschool-build-images-win.exe](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-build-images-win.exe)

### Setup Tool

- Linux: [dotcodeschool-setup-linux](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-linux)
- macOS: [dotcodeschool-setup-macos](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-macos)
- Windows: [dotcodeschool-setup-win.exe](https://github.com/dotcodeschool/build-tools/releases/latest/download/dotcodeschool-setup-win.exe)

You can also view all releases on the [Releases page](https://github.com/dotcodeschool/build-tools/releases/latest).

## License

This project is licensed under the [WTFPL](LICENSE) - Do What The Fuck You Want To Public License.
