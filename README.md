# Movie Server 🎬

A production-ready home server for managing torrent-based downloads with a web UI. Designed to run on a Mac mini and be safely exposed to the internet via HTTPS.

## Features

- **Web UI** for managing downloads with real-time progress updates
- **Source Providers** - Only downloads from allowlisted sources
- **qBittorrent Integration** - Uses qBittorrent-nox as the torrent engine
- **File Library** - Browse and download completed files
- **File Upload** - Manually upload files to your library
- **Authentication** - Single-user login with secure sessions
- **Audit Logging** - Track all user actions
- **HTTPS Ready** - Caddy reverse proxy with automatic Let's Encrypt

## Tech Stack

- **Backend**: Node.js 20+, TypeScript, Fastify, Zod, SQLite (better-sqlite3)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Real-time**: WebSocket for live download progress
- **Torrent Engine**: qBittorrent-nox with Web API
- **Reverse Proxy**: Caddy with automatic HTTPS
- **Process Management**: launchd (macOS native)

## Project Structure

```
movie-server/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared types and schemas
├── config/           # Caddy and launchd configs
├── data/             # SQLite database (created at runtime)
├── downloads/        # Downloaded files (created at runtime)
└── logs/             # Log files (created at runtime)
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- qBittorrent (optional, for actual downloads)

### 1. Clone and Install

```bash
cd movie-server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
# Generate secrets: openssl rand -base64 32
```

### 3. Initialize Database

```bash
npm run db:init
# Enter a password for the admin user when prompted
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 and login with username `admin`.

## qBittorrent Setup

### Install on macOS

```bash
brew install qbittorrent-nox
```

### Start qBittorrent

```bash
qbittorrent-nox
```

On first run, it will display the Web UI credentials. Update your `.env`:

```env
QBITTORRENT_USERNAME=admin
QBITTORRENT_PASSWORD=<displayed-password>
```

### Configure qBittorrent

Access the Web UI at http://localhost:8080 and configure:

1. **Downloads** → Set default save path to match `DOWNLOAD_DIR`
2. **Web UI** → Enable "Bypass authentication for localhost"
3. **Connection** → Configure port forwarding if needed

### Running Without qBittorrent

Set `QBITTORRENT_ENABLED=false` in `.env` to run in UI-only mode.
The UI will work but downloads won't actually start.

## Production Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Install Caddy

```bash
brew install caddy
```

### 3. Configure Caddy

Edit `config/Caddyfile`:
- Replace `your-domain.com` with your actual domain
- Ensure ports 80 and 443 are forwarded to your Mac mini

```bash
sudo caddy run --config config/Caddyfile
```

### 4. Setup launchd (Auto-start on Boot)

Edit the plist files in `config/` and replace `YOUR_USERNAME` with your macOS username.

```bash
# Create logs directory
mkdir -p logs

# Copy plist files
cp config/com.movieserver.api.plist ~/Library/LaunchAgents/
cp config/com.movieserver.web.plist ~/Library/LaunchAgents/

# Load the services
launchctl load ~/Library/LaunchAgents/com.movieserver.api.plist
launchctl load ~/Library/LaunchAgents/com.movieserver.web.plist
```

### 5. Port Forwarding & Dynamic DNS

1. **Router Configuration**:
   - Forward port 80 → Mac mini IP:80
   - Forward port 443 → Mac mini IP:443

2. **Dynamic DNS** (if you don't have a static IP):
   - Use a service like DuckDNS, No-IP, or Cloudflare
   - Configure your router or run a DDNS client

3. **Domain Setup**:
   - Point your domain's A record to your public IP
   - Or use the DDNS hostname

## Security Notes

### Authentication
- Single-user authentication with bcrypt-hashed passwords
- HTTP-only, secure, SameSite=strict cookies
- Sessions stored in SQLite with expiration

### Source Enforcement
- **No arbitrary magnet links** - Users cannot paste magnet URIs
- All downloads go through `SourceProvider` interface
- Magnet URIs are validated against allowlisted tracker domains
- HTTP fetches are restricted to allowlisted source domains

### Rate Limiting
- API endpoints are rate-limited (100 requests/minute by default)
- Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`

### Audit Logging
- All user actions are logged with timestamp, user ID, and IP address
- Logs stored in SQLite `audit_logs` table

### File Security
- Path traversal protection on file downloads
- File type allowlist for uploads
- Size limits on uploads

### HTTPS
- Caddy provides automatic HTTPS with Let's Encrypt
- HSTS, X-Frame-Options, and other security headers configured

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Downloads
- `GET /api/downloads` - List all downloads
- `POST /api/downloads/request` - Search provider
- `POST /api/downloads/confirm` - Start download
- `POST /api/downloads/:id/pause` - Pause download
- `POST /api/downloads/:id/resume` - Resume download
- `POST /api/downloads/:id/cancel` - Cancel download
- `GET /api/downloads/:id/files` - Get torrent files

### Library
- `GET /api/library` - List library files
- `GET /files/:fileId` - Download file (supports range requests)

### Upload
- `POST /api/upload` - Upload file (multipart)

### System
- `GET /health` - Health check
- `GET /api/providers` - List available providers

## Adding New Providers

Create a new provider by implementing the `SourceProvider` interface:

```typescript
import type { SourceProvider } from './types.js';

export class MyProvider implements SourceProvider {
  readonly name = 'my-provider';
  readonly displayName = 'My Source';
  readonly allowedDomains = ['-source.org'];
  readonly allowedTrackers = ['tracker.-source.org'];

  async search(query: string): Promise<ProviderSearchResult[]> {
    // Implement search
  }

  async getMagnet(resultId: string): Promise<string> {
    // Return magnet URI
  }
}
```

Register in `apps/api/src/providers/index.ts`:

```typescript
import { MyProvider } from './my-provider.js';
registerProvider(new MyProvider());
```

## Running Tests

```bash
npm test
```

## Troubleshooting

### qBittorrent Connection Failed
- Ensure qBittorrent-nox is running
- Check credentials in `.env`
- Verify Web UI is enabled in qBittorrent settings

### Database Errors
- Run `npm run db:init` to initialize/reset the database
- Check `DB_PATH` in `.env`

### WebSocket Not Connecting
- Check `NEXT_PUBLIC_WS_URL` in frontend `.env`
- Ensure Caddy is proxying `/ws` correctly

### HTTPS Certificate Issues
- Ensure ports 80 and 443 are accessible from the internet
- Check Caddy logs: `journalctl -u caddy` or `/var/log/caddy/`

## License

MIT

