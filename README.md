# TurboGHA

> Supercharge your Turborepo builds with free, self-hosted remote caching on GitHub Actions

[![CI](https://github.com/globodai-group/caching-for-turbo/actions/workflows/ci.yml/badge.svg)](https://github.com/globodai-group/caching-for-turbo/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@artik0din/turbogha)](https://www.npmjs.com/package/@artik0din/turbogha)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

## Why TurboGHA?

[Turborepo](https://turbo.build/repo/) is amazing for monorepo builds, but remote caching typically requires a Vercel account. **TurboGHA** provides a free, self-hosted alternative that runs entirely within GitHub's ecosystem.

| | TurboGHA | Vercel Remote Cache |
|---|:---:|:---:|
| **Cost** | Free | Paid (large teams) |
| **Setup** | 1 line | Account + tokens |
| **Storage** | GitHub Cache / S3 | Vercel only |
| **Control** | Full | Limited |
| **Dependencies** | None | Vercel account |

## Quick Start

Add this step **before** your `turbo` commands:

```yaml
- name: Setup Turbo Cache
  uses: globodai-group/caching-for-turbo@v1

- name: Build
  run: turbo build
```

That's it! Your builds now use GitHub's built-in cache system.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions Runner                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    HTTP     ┌──────────────┐                  │
│  │  Turbo  │ ──────────► │  TurboGHA    │                  │
│  │  Build  │ ◄────────── │  Server      │                  │
│  └─────────┘             │  :41230      │                  │
│                          └──────┬───────┘                  │
│                                 │                          │
│                                 ▼                          │
│                    ┌────────────────────────┐              │
│                    │   Storage Backend      │              │
│                    │  ┌─────────┐ ┌─────┐   │              │
│                    │  │ GitHub  │ │ S3  │   │              │
│                    │  │ Cache   │ │     │   │              │
│                    │  └─────────┘ └─────┘   │              │
│                    └────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

1. **Setup Phase**: Starts a local Fastify server on `localhost:41230`
2. **Environment**: Configures `TURBO_API`, `TURBO_TOKEN`, `TURBO_TEAM`
3. **Caching**: Intercepts Turbo cache requests and stores in GitHub Cache or S3
4. **Cleanup**: Gracefully shuts down and displays statistics

## Configuration

### Basic Usage

```yaml
- uses: globodai-group/caching-for-turbo@v1
```

### With Options

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    # Storage backend: 'github' (default) or 's3'
    provider: github

    # Cache key prefix (useful for cache isolation)
    cache-prefix: my-project_

    # Server port
    server-port: 41230
```

### Cache Management

Prevent unbounded cache growth:

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    # Remove entries older than duration
    max-age: 2w          # Supports: 1d, 1w, 1mo

    # Keep only N most recent entries
    max-files: 300

    # Remove oldest when size exceeds limit
    max-size: 5gb        # Supports: 100mb, 1gb, 10gb
```

### S3 Storage

For teams needing dedicated infrastructure:

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    provider: s3
    s3-bucket: my-turbo-cache
    s3-region: us-east-1
    s3-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    s3-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

    # Optional
    s3-endpoint: https://s3.amazonaws.com
    s3-prefix: cache/
    s3-session-token: ${{ secrets.AWS_SESSION_TOKEN }}
```

**Compatible with**: AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2

## CLI for Local Development

Use the same caching infrastructure locally:

### Installation

```bash
npm install -g @artik0din/turbogha
# or
npx @artik0din/turbogha
```

### Commands

```bash
# Start cache server (background)
turbogha start

# Start in foreground (for debugging)
turbogha start --foreground

# Check server status
turbogha ping

# Stop server
turbogha kill
```

### Local Configuration

Create `.env` in your project root:

```env
# Storage provider
PROVIDER=s3

# S3 credentials
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET=my-bucket
S3_PREFIX=turbogha/

# Optional
SERVER_PORT=41230
CACHE_PREFIX=local_
```

### Using with Turbo

```bash
# Start the server
turbogha start

# Configure Turbo (add to .bashrc/.zshrc for persistence)
export TURBO_API=http://localhost:41230
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# Run builds with remote caching
turbo build
```

## Inputs Reference

| Input | Description | Default |
|-------|-------------|---------|
| `provider` | Storage backend (`github` or `s3`) | `github` |
| `cache-prefix` | Cache key prefix | `turbogha_` |
| `server-port` | Local server port | `41230` |
| `max-age` | Max cache age (e.g., `1w`, `1mo`) | - |
| `max-files` | Max number of cached files | - |
| `max-size` | Max total cache size (e.g., `5gb`) | - |
| `s3-access-key-id` | AWS access key ID | - |
| `s3-secret-access-key` | AWS secret access key | - |
| `s3-session-token` | AWS session token (for OIDC) | - |
| `s3-bucket` | S3 bucket name | - |
| `s3-region` | S3 region | - |
| `s3-endpoint` | S3 endpoint URL | `https://s3.amazonaws.com` |
| `s3-prefix` | S3 object prefix | `turbogha/` |

## Examples

### Monorepo with Multiple Apps

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: globodai-group/caching-for-turbo@v1
        with:
          cache-prefix: ${{ github.repository }}_

      - run: npm ci
      - run: turbo build --filter=@myorg/web
      - run: turbo build --filter=@myorg/api
```

### Matrix Build with Isolated Caches

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

### S3 with Automatic Cleanup

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    provider: s3
    s3-bucket: ${{ vars.CACHE_BUCKET }}
    s3-region: eu-west-1
    s3-access-key-id: ${{ secrets.AWS_KEY }}
    s3-secret-access-key: ${{ secrets.AWS_SECRET }}
    max-age: 1w
    max-size: 10gb
```

## Performance Tips

1. **Use cache prefixes** to isolate caches between branches/PRs
2. **Set cleanup policies** to prevent cache bloat (especially with S3)
3. **Use S3** for very large caches or cross-workflow sharing
4. **Run cache server early** in your workflow for maximum benefit

## Troubleshooting

### Cache not being used

- Ensure the action runs **before** any `turbo` commands
- Check that `TURBO_API`, `TURBO_TOKEN`, `TURBO_TEAM` are set
- Verify no conflicting Turbo remote cache configuration

### Server fails to start

- Check if port 41230 is available
- Try a different port with `server-port` input
- Check workflow logs for detailed error messages

### S3 connection issues

- Verify credentials have `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` permissions
- Check bucket region matches `s3-region` input
- For custom endpoints, ensure `s3-endpoint` is correctly formatted

## Contributing

```bash
# Clone the repository
git clone https://github.com/globodai-group/caching-for-turbo.git
cd caching-for-turbo

# Install dependencies
npm install

# Run development server
npm run dev-run

# Build
npm run bundle

# Lint
npm run lint
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Built with inspiration from:
- [rharkor/caching-for-turbo](https://github.com/rharkor/caching-for-turbo) - Original implementation
- [dtinth/setup-github-actions-caching-for-turbo](https://github.com/dtinth/setup-github-actions-caching-for-turbo) - Original concept

---

<p align="center">
  Made with care by <a href="https://github.com/globodai-group">Globodai Group</a>
</p>
