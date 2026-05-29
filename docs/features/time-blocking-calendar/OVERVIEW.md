# Time-Blocking Calendar

**Version:** 3.0 (maybe out of scope)

A calendar / time-blocking view for scheduling study sessions, assignment work, and time-anchored tasks. Currently flagged in the roadmap as "maybe out of scope."

## Why this might be out of scope

- **Calendar/scheduling apps are a huge surface.** Doing it well rivals the editor in scope. Doing it badly is worse than not doing it at all.
- **Users already have calendars.** Google Calendar, Apple Calendar, Outlook are universal. Asking students to abandon those for our calendar is a hard sell.
- **The high-value piece (visualizing time blocks for ADHD time-blindness, à la Tiimo) is achievable with a one-way ICS feed.** We publish task due dates as an ICS feed the user subscribes to in their existing calendar — much less scope than building a calendar UI.

## What v3.0 _might_ ship

- One-way ICS feed of Project deadlines, task due dates, scheduled focus sessions ([pomodoro-timer](../pomodoro-timer/OVERVIEW.md)).
- Optional in-app week view that mirrors what the ICS feed publishes (read-only; the user schedules in their own calendar).
- Pomodoro/focus-session log visualization ("you spent N hours on PHIL 201 this week").

## What's deliberately NOT in scope (even if this feature ships)

- Two-way calendar sync.
- Building a real calendar UI competitive with system calendars.
- Notifications/reminders separate from the system calendar's own.

## Open question

- Whether even the ICS feed belongs in v3 vs. v2.0 alongside [agentic-workflows](../agentic-workflows/OVERVIEW.md). It's cheap to build and high-value for ADHD users. Possibly worth pulling earlier if user feedback says so.

## Relevant Documentation

- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — Tiimo / time-blocking app landscape and ADHD time-blindness accommodation research.
- [Pomodoro timer](../pomodoro-timer/OVERVIEW.md) — session-log data this surfaces.
