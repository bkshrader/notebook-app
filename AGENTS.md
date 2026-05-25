# Agent guidance

This file is read by AI coding agents (Claude Code, Cursor, etc.) that work in this repo. It is a thin pointer file; the project's full instructions live in [CLAUDE.md](./CLAUDE.md) and are valid for any agent.

## Project-wide rules

Read [CLAUDE.md](./CLAUDE.md). The non-negotiables (WCAG 2.1 AA floor, AGPL-3.0-or-later compatibility, local-first, ADHD-first UX) apply to every agent, not just Claude. The "Framework and tooling decisions (decided)" section is load-bearing — don't relitigate.

## Storybook MCP

Before doing any React UI, frontend, or component work, call the `storybook-mcp` MCP server (registered in [`.mcp.json`](./.mcp.json)) to read live component manifests, generate stories, and run interaction tests against the running Storybook.

The server is exposed at `http://localhost:6006/mcp` when Storybook is running locally (`npm run storybook`). If the server is unreachable, start Storybook first.

The MCP server is the source of truth for what components exist, what props they take, and what stories already cover them. Prefer it over re-reading the codebase for those facts.

## CI gates

Five gates must pass before declaring work done: `lint`, `format:check`, `typecheck`, `build`, `audit:fallow`. Storybook adds a sixth: `test-storybook` (per-story axe + interaction tests via Vitest). Run them locally before pushing.
