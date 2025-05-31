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

## License

This project is licensed under the [WTFPL](LICENSE) - Do What The Fuck You Want To Public License.
