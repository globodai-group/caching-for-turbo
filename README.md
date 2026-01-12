# TurboGHA - Turborepo Caching for GitHub Actions

[![CI Status](https://github.com/globodai-group/caching-for-turbo/workflows/CI/badge.svg)](https://github.com/globodai-group/caching-for-turbo/actions)
[![npm version](https://badge.fury.io/js/@globodai-group%2Fturbogha.svg)](https://www.npmjs.com/package/@artik0din/turbogha)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fast and free [Turborepo](https://turbo.build/repo/) remote caching for GitHub
Actions. No Vercel account needed.

## Features

- **Independent from Vercel** - No account or tokens required
- **Multiple Storage Backends** - GitHub Actions Cache (default) or AWS S3
- **Cross-Platform** - Works on Linux, Windows, and macOS runners
- **Local Development** - Use the same caching infrastructure locally
- **Automatic Cleanup** - Configure max-age, max-files, or max-size policies
- **Zero Configuration** - Works out of the box with sensible defaults

## Quick Start

Add this step **before** your `turbo build` command:

```yaml
- name: Setup Turbo Cache
  uses: globodai-group/caching-for-turbo@v1

- name: Build
  run: turbo build
```

That's it! Your Turborepo builds now use GitHub's built-in cache.

## How It Works

1. Starts a local caching server on `localhost:41230`
2. Sets up `TURBO_API`, `TURBO_TOKEN`, and `TURBO_TEAM` environment variables
3. Turborepo sends cache requests to this local server
4. The server stores/retrieves artifacts from GitHub Cache or S3

## Configuration

### Basic Options

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    # Storage provider: 'github' (default) or 's3'
    provider: github

    # Cache key prefix
    cache-prefix: turbogha_

    # Server port (default: 41230)
    server-port: 41230
```

### Cache Cleanup

Prevent unbounded cache growth with automatic cleanup:

```yaml
- uses: globodai-group/caching-for-turbo@v1
  with:
    # Remove entries older than specified duration
    max-age: 2w # 1d, 1w, 1mo supported

    # Keep only N most recent entries
    max-files: 300

    # Remove oldest when total size exceeds limit
    max-size: 5gb # 100mb, 1gb, 10gb supported
```

### S3 Storage

For teams needing more control over caching infrastructure:

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
    s3-prefix: turbogha/
    s3-session-token: ${{ secrets.AWS_SESSION_TOKEN }} # For OIDC
```

Works with any S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, etc.)

## Local Development

Use the same caching infrastructure locally with the CLI:

### Installation

```bash
npm install -g @artik0din/turbogha
```

### Usage

```bash
# Start the cache server
turbogha start

# Check server status
turbogha ping

# Stop the server
turbogha kill
```

### Environment Configuration

Create a `.env` file for S3 configuration:

```env
PROVIDER=s3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET=my-bucket
S3_PREFIX=turbogha/
```

### Using with Turbo

```bash
# Start the server
turbogha start

# Set environment variables (or add to shell profile)
export TURBO_API=http://localhost:41230
export TURBO_TOKEN=turbogha
export TURBO_TEAM=turbogha

# Run turbo commands
turbo build
```

## Comparison

### vs Vercel Remote Cache

| Feature | This Action | Vercel               |
| ------- | ----------- | -------------------- |
| Cost    | Free        | Paid for large teams |
| Setup   | One line    | Account + tokens     |
| Storage | GitHub/S3   | Vercel only          |
| Control | Full        | Limited              |

### vs actions/cache

| Feature          | This Action  | actions/cache  |
| ---------------- | ------------ | -------------- |
| Granularity      | Per-task     | Entire cache   |
| Storage Backends | GitHub + S3  | GitHub only    |
| Cleanup Policies | Configurable | Automatic only |
| Local Dev        | Supported    | Not applicable |

## All Inputs

| Input                  | Description                        | Default                    |
| ---------------------- | ---------------------------------- | -------------------------- |
| `provider`             | Storage backend (`github` or `s3`) | `github`                   |
| `cache-prefix`         | Cache key prefix                   | `turbogha_`                |
| `server-port`          | Local server port                  | `41230`                    |
| `max-age`              | Max cache age (e.g., `1w`, `1mo`)  | -                          |
| `max-files`            | Max number of cache files          | -                          |
| `max-size`             | Max total cache size (e.g., `5gb`) | -                          |
| `s3-access-key-id`     | AWS access key ID                  | -                          |
| `s3-secret-access-key` | AWS secret access key              | -                          |
| `s3-session-token`     | AWS session token (OIDC)           | -                          |
| `s3-bucket`            | S3 bucket name                     | -                          |
| `s3-region`            | S3 region                          | -                          |
| `s3-endpoint`          | S3 endpoint URL                    | `https://s3.amazonaws.com` |
| `s3-prefix`            | S3 object prefix                   | `turbogha/`                |

## Contributing

```bash
# Install dependencies
npm install

# Run development server
npm run dev-run

# Build
npm run bundle

# Test
npm test
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgements

This project is based on work by:

- [HUORT Louis (rharkor)](https://github.com/rharkor/caching-for-turbo) -
  Original implementation
- [dtinth](https://github.com/dtinth/setup-github-actions-caching-for-turbo) -
  Original inspiration
