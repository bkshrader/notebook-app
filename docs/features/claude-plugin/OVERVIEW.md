# Claude Plugin

**Version:** 2.0

A Claude integration — distributed as a **Claude Skill**, an **MCP server**, or both — that lets Claude write notes into the user's Library in the app's expected formats. The point: users with a Claude Pro / Max / Teams subscription can leverage agentic workflows without paying for API tokens separately.

## Why this matters

- **Subscription parity.** Many target users (academics, students) already have a Claude subscription. The default [BYO AI](../byo-ai/OVERVIEW.md) flow requires API credentials and per-token billing, which is friction. A Skill or MCP server lets them point Claude at their notebook directly.
- **Lower friction onboarding for AI features.** "Install our Claude plugin" is a one-click affordance compared to "create an API account, generate a key, paste it, pick a model."
- **Distinct value from BYO AI.** The BYO path is the user *bringing* an LLM endpoint *to* our app. The Claude plugin is the reverse: Claude (running in the Claude desktop app, claude.ai, or Claude Code) reaches *into* our app's library and produces correctly-formatted notes there.
- **Complements [agentic workflows](../agentic-workflows/OVERVIEW.md), doesn't replace them.** Users can use either, both, or neither. No in-app UI is added for *invoking* Claude — Claude is its own UI. The user drives Claude from a Claude client (desktop app, claude.ai, Claude Code); our plugin is what Claude reaches *into* our app with.

## Distribution shape

Two viable surfaces (we may ship both):

### Option A — Claude Skill
- A skill that teaches Claude the app's note format conventions (YAML frontmatter schema, naming conventions, project/library structure, supported extensions for `.md` vs `.tex`).
- Activates when the user asks Claude to write a note, summarize a source into a note, capture an idea, etc.
- Output: properly-formatted note content the user copies into the app — or the skill calls into the MCP server (option B) if installed.
- Lower technical bar; useful for users on web claude.ai who don't run an MCP server.

### Option B — MCP server
- A local MCP server the app ships (or installs on demand) that exposes tools like `create_note(project, title, content, frontmatter)`, `append_to_inbox(content)`, `search_library(query)`, `read_note(path)`.
- Any MCP-aware Claude client (Claude desktop app, Claude Code, third-party MCP clients) can invoke these tools.
- Closes the loop: Claude writes notes that land directly in the user's library, in the right project, with valid frontmatter — no copy-paste step.
- Plays well with the [universal capture inbox](../universal-capture-inbox/OVERVIEW.md) and [agentic workflows](../agentic-workflows/OVERVIEW.md): "Claude, summarize the attached paper into a note in PHIL 201" works without any in-app UI for it.

## Compatibility with other AI providers

- The MCP server is provider-agnostic in principle — any MCP-aware client can use it (Claude Code, Claude desktop, third-party tooling, future OpenAI/Anthropic/etc. MCP clients).
- The Skill is Claude-specific by definition. Equivalent integrations for other providers (e.g., custom GPTs for ChatGPT users) could land later as separate features.
- Naming this "Claude plugin" reflects the primary target; the MCP server delivers value beyond Claude as a side effect.

## What v2.0 ships

- **MCP server** exposing at minimum: `create_note`, `append_to_inbox`, `list_projects`, `search_library`, `read_note`. Spawned by the app or runnable standalone.
- **Skill bundle** (and/or documentation) describing the note format conventions for use in Claude clients that don't run the MCP server.
- **In-app surface is settings-only.** A settings panel surfaces the MCP server's local socket address / installation command, plus a one-click "install Skill in Claude" link if the format supports it. No in-app UI for *invoking* Claude — that lives in the Claude client.
- **Permission model**: per-Claude-session approval for write actions; user can revoke. We never grant blanket write access without explicit consent.

## What this is not

- Not a replacement for [BYO AI](../byo-ai/OVERVIEW.md) — both ship; BYO drives the in-app agentic workflows from inside, Claude plugin is the *external-driver* path with no in-app invocation UI.
- Not a wholesale "let Claude run my app" — scope is bounded to note creation, retrieval, and library navigation. No settings changes, no destructive ops without explicit approval, no audio/transcription control.
- Not a sync mechanism — see [remote sync](../remote-sync/OVERVIEW.md) for that.

## Hidden in AI-free build

The MCP server and Skill are AI-integration features; both are hidden / not bundled in the AI-free build (see the AI-feature-flag note in [ROADMAP.md](../../ROADMAP.md)).

## Relevant references

- [BYO AI](../byo-ai/OVERVIEW.md) — the default AI integration path; this complements rather than replaces it.
- [Agentic workflows](../agentic-workflows/OVERVIEW.md) — in-app agentic features that the MCP server's tools also enable from outside.
- [Universal capture inbox](../universal-capture-inbox/OVERVIEW.md) — `append_to_inbox` is the natural MCP entry point for "Claude, save this thought."
- [Plain `.md` storage](../plain-md-storage/OVERVIEW.md) — the file/frontmatter conventions the Skill teaches Claude.
- [Library and Projects](../library-and-projects/OVERVIEW.md) — the organization model MCP tools operate on.
