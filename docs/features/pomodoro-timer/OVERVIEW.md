# Pomodoro Timer

**Version:** 1.1

A simple Pomodoro-style focus timer integrated into the app. 25/5 default with configurable durations; gentle audible + visual cues at transitions; "what are you working on?" prompt at the start of each focus block.

## Why this matters

- Pomodoro is one of the most-recommended ADHD productivity scaffolds. Cheap to implement; high user value for the target audience.
- Integrating into the app (vs. requiring a separate timer app) reduces context-switching, itself an ADHD friction.
- The "what are you working on?" prompt creates a tiny intention-setting moment that turns a session into a logged event the app can later reflect back ("you've spent 4 sessions on PHIL 201 this week").

## Design intent

- **Visible from anywhere in the app.** Persistent corner widget or status-bar item.
- **Configurable but defaulted.** Standard 25/5 default with override; some ADHD users need 50/10 or 90/20.
- **Respects accessibility settings.** Audible cues respect system volume + can be disabled; visual cues respect `prefers-reduced-motion`.
- **No gamification, no streaks, no nags.** Streak mechanics create the exact pressure that breaks ADHD users when they have a bad week. We log, we don't shame.
- **Optional logging.** Sessions can be saved (with the "what are you working on?" answer) to a per-Project session log.

## What v1.1 ships

- Timer widget (start/pause/skip/reset).
- Configurable durations for focus/break.
- Audible + visual transition cues.
- Optional session log per Project.

## What's deliberately out

- Streak counters or "don't break the chain" mechanics.
- Forced full-screen "focus mode" — the user picks whether to dim distractions or not.
- Integration with calendar/scheduling (that's the v3 time-blocking calendar territory).

## Relevant Documentation

- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — Pomofocus, Forest, and similar tools' design lessons; what works for ADHD users and what doesn't.
