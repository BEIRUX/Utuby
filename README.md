# Utuby

**Free, open-source YouTube transcript extractor** -- paste a link, get the transcript.

**Live at [utuby.vercel.app](https://utuby.vercel.app)**

---

## Features

- **Instant transcript extraction** from any YouTube video URL
- **Copy for LLM** -- clean flowing text with no timestamps, ready to paste into AI context windows
- **Token count estimates** so you know if a transcript fits your model's context
- **Multiple export formats** -- Clean text, Timestamped, SRT, and TXT download
- **Transcript search** -- find specific moments within a transcript
- **Lines / Paragraph toggle** -- switch between display modes
- **Multi-language captions** -- extract transcripts in any available language

---

## MCP Integration

Utuby includes a Model Context Protocol (MCP) server that lets LLMs extract YouTube transcripts programmatically. Works with Claude Code, Claude Desktop, and any MCP-compatible client.

### Tools

| Tool | Description |
|------|-------------|
| `get_transcript` | Full transcript in clean, timestamped, SRT, or summary format |
| `get_video_info` | Video metadata, chapters, duration, available captions |
| `search_transcript` | Search within a transcript -- returns matching segments with context |
| `get_transcripts` | Batch extract from multiple videos at once (up to 10) |
| `get_playlist` | Extract all transcripts from a YouTube playlist (up to 25 videos) |
| `get_comments` | Fetch top comments for sentiment analysis |

### Setup

```bash
# 1. Clone and install
git clone https://github.com/BEIRUX/Utuby.git && cd Utuby && bun i

# 2. Register the MCP server
claude mcp add utuby -- node ./mcp/server.mjs
```

That's it. Your LLM can now call any of the tools above directly.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/BEIRUX/Utuby.git
cd Utuby

# Install dependencies
bun i

# Run the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app locally.

---

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [React 19](https://react.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Framer Motion](https://motion.dev)
- [Radix UI](https://radix-ui.com)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Bun](https://bun.sh)

---

Built by [BEIRUX](https://beirux.com)
