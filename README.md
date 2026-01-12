# TurboGHA

> Free, self-hosted Turborepo remote caching for GitHub Actions

[![CI](https://github.com/globodai-group/caching-for-turbo/actions/workflows/ci.yml/badge.svg)](https://github.com/globodai-group/caching-for-turbo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@artik0din/turbogha)](https://www.npmjs.com/package/@artik0din/turbogha)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

## Why TurboGHA?

[Turborepo](https://turbo.build/repo/) remote caching typically requires a Vercel account. **TurboGHA** provides a free alternative using GitHub's built-in cache.

| | TurboGHA | Vercel |
|---|:---:|:---:|
| **Cost** | Free | Paid |
| **Setup** | 1 line | Account + tokens |
| **Dependencies** | None | Vercel account |

## Quick Start

```yaml
- uses: globodai-group/caching-for-turbo@v1

- run: turbo build
```

That's it.

## How It Works

```
┌──────────────────────────────────────────────────┐
│              GitHub Actions Runner               │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────┐         ┌──────────────┐           │
│  │  Turbo  │ ◄─────► │  TurboGHA    │           │
│  │  Build  │  HTTP   │  :41230      │           │
│  └─────────┘         └──────┬───────┘           │
│                             │                    │
│                             ▼                    │
│                   ┌──────────────────┐          │
│                   │  GitHub Cache    │          │
│                   │  (10GB free)     │          │
│                   └──────────────────┘          │
└──────────────────────────────────────────────────┘
```

1. Starts a local Fastify server on `localhost:41230`
2. Configures `TURBO_API`, `TURBO_TOKEN`, `TURBO_TEAM`
3. Intercepts Turbo cache requests → GitHub Cache API
4. Displays statistics on shutdown

## Configuration

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    # Cache key prefix (useful for isolation)
    cache-prefix: my-project_

    # Server port (default: 41230)
    server-port: 41230
```

### Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `cache-prefix` | Cache key prefix | `turbogha_` |
| `server-port` | Server port | `41230` |

## CLI (Local Development)

```bash
npm install -g @artik0din/turbogha
```

```bash
# Start server
turbogha start

# Configure Turbo
export TURBO_API=http://localhost:41230
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# Build
turbo build

# Stop server
turbogha kill
```

## Examples

### Monorepo

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: globodai-group/caching-for-turbo@v1
      - run: npm ci
      - run: turbo build
```

### Matrix Build

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: globodai-group/caching-for-turbo@v1
        with:
          cache-prefix: ${{ matrix.os }}_
      - run: npm ci
      - run: turbo build test lint
```

## Metrics

TurboGHA displays statistics on shutdown:

```
╔══════════════════════════════════════════╗
║           TurboGHA Statistics            ║
╠══════════════════════════════════════════╣
║  Cache Hit Rate:  85.7%                  ║
║  Hits:     12 | Misses:      2           ║
╠══════════════════════════════════════════╣
║  Uploads:    2 (  12.4MB)                ║
║  Downloads: 12 (  89.2MB)                ║
╠══════════════════════════════════════════╣
║  Avg Save:   245ms                       ║
║  Avg Get:     89ms                       ║
╚══════════════════════════════════════════╝
```

## Troubleshooting

**Cache not being used?**
- Run action **before** `turbo` commands
- Check `TURBO_API`, `TURBO_TOKEN`, `TURBO_TEAM` are set

**Server fails to start?**
- Check port 41230 is available
- Try different port with `server-port`

## Contributing

```bash
git clone https://github.com/globodai-group/caching-for-turbo.git
npm install
npm run dev-run
npm run bundle
```

## License

MIT

---

<p align="center">
  <a href="https://github.com/globodai-group">Globodai Group</a>
</p>
