# Hearthly — Product Vision

> The foundational product vision. Anchors every future feature brainstorm. Not a feature spec, not an implementation plan. Revise when reality teaches us something.

---

## 1. One-line vision

> **Hearthly is a helper for your daily private life. You provide data; it supports you doing stuff.**

## 2. Elaboration

Consolidate the small daily tools an adult household already uses — lists, tasks, a calendar, a budget — into one warm, production-grade surface. The goal is not to beat each tool at its own game; it's to give a household one place where their shared life lives, with one foundation (members, permissions, data) that all features plug into.

## 3. Users & households

- **v1 primary users:** the builder, his wife, his mother-in-law.
- **Future users:** the builder's kids, starting in their teens (~2030+).
- **Uniform user model** — one `User` entity, no "kid user" vs. "adult user" as distinct types.
- **Household** = group of members. A user can belong to multiple households and switch between them (Trade Republic-style account switcher).
- Sharing happens at the household level. Within a household, each feature is granted per member.

## 4. Permissions

- **Two household roles:** `lead` (can invite, grant, configure — typically the adult couple) and `member` (uses what's been granted).
- **Grants are per member × per feature.** MIL sees tasks, not finance. A teen can see tasks + calendar but not finance. Any combination is expressible.
- **Templates** (Adult / Teen / Kid / Extended Family) pre-fill sensible grants at invite time. Editable afterward. Templates are ergonomic shortcuts, not enforced categories.
- **MIL's default placement:** Extended Family template — calendar / tasks / groceries granted, finance withheld.
- **Design the permission foundation from v1.** Every future feature plugs into it.

## 5. Voice — "Linear for the private space"

- **Helpful but unhurried.** Notifications have purpose — assignments, reminders the user set, things that genuinely need their attention.
- **Linear-style defaults:** sensible notifications ON by default (assignment, due reminders, etc.); every one individually toggleable in settings. Nothing enforced, nothing hidden.
- **No engagement-hacking notifications.** No "try our new feature," no "don't lose your streak," no manufactured urgency.
- **No gamification.** No streaks, badges, XP, spinning wheels, celebratory confetti.
- **Overdue and assigned work is visible in-app but not alarmist** — no screen-blocking red pop-ups. Present, not panicky.
- **Copy is warm without being cute.** Empty states feel human. No mascot voice, no exclamation marks.
- **Users come because the features help them, not because the app is sticky.**

Cross-reference: `DESIGN.md` governs visual voice (warm, terracotta, "familial calm"). This section governs behavioral voice. Both must be consistent.

## 6. v1 scope

- Household foundation: users, households, memberships, roles, grants, templates.
- Multi-household switcher.
- Shared + personal to-dos: assignment, reminders, completion.
- **Nothing else in v1.** No summary, no calendar, no groceries, no finance.

v1 is deliberately small so one feature ships end-to-end, the permission foundation is exercised against a real feature, and the household gets real usage before the next feature is picked.

## 7. Sequencing philosophy

- **Iterative, feature-by-feature.** Every feature ships standalone and useful on its own. A feature that is only useful once another feature exists is the wrong feature to ship next.
- After v1, the household uses it for 2–4 weeks. **The next feature is picked by actual friction**, not by today's plan.
- **Architecture evolves under pressure**, not by speculation. The permission foundation is the only thing designed up front — because every feature depends on it.
- Each feature gets its own brainstorm → spec → plan → build cycle. This vision doc is the anchor; each feature brainstorm starts from here.

## 8. Feature roadmap _(tentative — not committed)_

| Priority | Feature                    | Replaces                                                           |
| -------- | -------------------------- | ------------------------------------------------------------------ |
| v1       | Foundation + Shared to-dos | Apple Reminders                                                    |
| ~v2      | Groceries                  | Bring                                                              |
| ~v3      | Daily summary              | — _(the multiplicative moment; only possible once ≥2 feeds exist)_ |
| ~v4      | Calendar                   | maybe Google Calendar, maybe integrate — decide later              |
| ~v5      | Finance _(overview only)_  | Excel Haushaltsbuch + Finanzfluss Copilot                          |
| Vague    | AI online-assistance       | — _(v3+ idea, no shape yet)_                                       |

Priorities beyond v1 are expected to shift based on real usage.

## 9. Relationship to existing apps

- **Replace:** Bring, Apple Reminders, Excel Haushaltsbuch, Finanzfluss Copilot.
- **Defer decision:** Google Calendar — replace vs. integrate gets its own brainstorm alongside the calendar feature. Until then, the shared Google Calendar stays in use.

## 10. Non-goals — what Hearthly is NOT

- **Not commercial.** No marketing, no acquisition funnel, no pricing, no freemium mechanics.
- **Not feature-parity.** Only the important bits of each reference app — no "inspirations," no "promotions," no deep analytics, no social features.
- **Not a deep financial tool.** Finance is overview — "what does a user normally want to know about their finances." No budgeting wizards, no transaction tagging ML, no investment advice.
- **Not a kids-only or teens-only app.** Kids inherit the adult app with restricted grants — no dedicated "kid mode."
- **Not engagement-hacking.** No streaks, XP, nudges, manufactured urgency, push-for-retention.
- **Not multi-tenant SaaS.** The multi-household model is personal (one user in multiple households they belong to), not organizational.

## 11. Quality bar & motivation hierarchy

| Priority  | Goal                                        |
| --------- | ------------------------------------------- |
| Primary   | Learn building production software with AI  |
| Secondary | Build something the household actually uses |
| Tertiary  | Commercial success only if it happens       |

**Production-grade throughout** — infra, code, UX. Small real user set, but built like a real app. Learning goals live in infra / architecture / tooling choices. Product choices live in features / UX. The two axes are orthogonal — learning ambition must never justify a feature the household doesn't need.

## 12. What this document is

- **Not a feature spec.** Each feature (to-dos, groceries, calendar, finance) gets its own brainstorm and spec, anchored on this vision.
- **Not an implementation plan.** No schema here, no endpoints, no UI.
- **Not immutable.** Revise when reality teaches us something. If this doc stops matching what Hearthly actually is, fix the doc.

---

## Referenced docs

- [`../DESIGN.md`](../DESIGN.md) — visual design system (complements §5 voice)
- [`./project-summary.md`](./project-summary.md) — infra and tech-stack decisions
- [`./data-layer-design.md`](./data-layer-design.md) — Drizzle ORM, module pattern, testing
- [`./api-design.md`](./api-design.md) — GraphQL API conventions
