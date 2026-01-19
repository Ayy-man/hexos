# Phase Dependencies & Parallelization Chart

**Created:** 2026-01-19

---

## Dependency Matrix

```
                        DEPENDS ON
              ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
              │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │10 │11 │12 │
         ┌────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
         │ 01 │ - │   │   │   │   │   │   │   │   │   │   │   │  Critical Bugs
         │ 02 │   │ - │   │   │   │   │   │   │   │   │   │   │  Code Cleanup
         │ 03 │   │   │ - │   │   │   │   │   │   │   │   │   │  Form Fixes
         │ 04 │   │   │   │ - │   │   │   │   │   │   │   │   │  Branding/PDF
PHASE    │ 05 │   │   │   │   │ - │   │   │   │   │   │   │   │  Sidebar/Dashboard
         │ 06 │   │   │   │   │ ● │ - │   │   │   │   │   │   │  Blueprints/Case Studies
         │ 07 │   │   │   │   │ ● │   │ - │   │   │   │   │   │  Finance Redesign
         │ 08 │   │   │   │   │   │   │   │ - │   │   │   │   │  Testing Tab
         │ 09 │ ● │   │   │   │   │   │   │   │ - │   │   │   │  Suggestion Box
         │ 10 │   │   │   │   │   │ ● │   │   │   │ - │   │   │  Opportunities
         │ 11 │   │   │   │   │ ● │   │   │   │   │   │ - │   │  Notifications
         │ 12 │   │   │   │   │   │   │   │   │   │   │   │ - │  Offboarding
         └────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘

● = Depends on this phase
```

---

## Independence Groups

### Group A: Standalone (No Dependencies)
These can start immediately and run in parallel:

```
┌─────────────────────────────────────────────────────────────┐
│  01 Critical Bugs     ░░░░░░░░  (1-2 days)                 │
│  02 Code Cleanup      ░░░       (0.5 day)                  │
│  03 Form Fixes        ░░░░░     (1 day)                    │
│  04 Branding/PDF      ░░░       (0.5 day)                  │
│  05 Sidebar/Dashboard ░░░░░     (1 day)                    │
│  08 Testing Tab       ░░░░░     (1 day)                    │
│  12 Offboarding       ░░░       (0.5 day) [design only]    │
└─────────────────────────────────────────────────────────────┘
```

**7 phases can start Day 1** — no blockers.

---

### Group B: After Phase 01 (Storage Fixes)
```
┌─────────────────────────────────────────────────────────────┐
│  09 Suggestion Box    ░░░░░░░░░░░░  (2-3 days)             │
│     └── Needs: Upload fixes from Phase 01                  │
└─────────────────────────────────────────────────────────────┘
```

**Why:** Suggestion box expansion builds on upload functionality fixed in Phase 01.

---

### Group C: After Phase 05 (Sidebar/Dashboard)
```
┌─────────────────────────────────────────────────────────────┐
│  06 Blueprints/Cases  ░░░░░░░░  (1-2 days)                 │
│     └── Needs: Sidebar structure from Phase 05             │
│                                                             │
│  07 Finance Redesign  ░░░░░░░░  (1-2 days)                 │
│     └── Needs: Dashboard patterns from Phase 05            │
│                                                             │
│  11 Notifications     ░░░░░░░░░░░░  (2-3 days)             │
│     └── Needs: Sidebar notification badge from Phase 05    │
└─────────────────────────────────────────────────────────────┘
```

**Why:** These phases touch navigation and dashboard patterns established in Phase 05.

---

### Group D: After Phase 06 (Blueprints/Case Studies)
```
┌─────────────────────────────────────────────────────────────┐
│  10 Opportunities     ░░░░░░░░░░░░░░░░░░  (3-5 days)       │
│     └── Needs: Blueprint/case study Loom + relationships   │
│                for AI brief generation context             │
└─────────────────────────────────────────────────────────────┘
```

**Why:** Opportunities overhaul references blueprints for redacted brief generation.

---

## Visual Timeline (Optimal Parallelization)

```
DAY     1    2    3    4    5    6    7    8    9   10   11   12   13   14
        │    │    │    │    │    │    │    │    │    │    │    │    │    │
     ┌──┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──┐
     │                                                                       │
  01 │████████████████                                                       │ Critical Bugs
     │                                                                       │
  02 │████████                                                               │ Code Cleanup
     │                                                                       │
  03 │██████████████                                                         │ Form Fixes
     │                                                                       │
  04 │████████                                                               │ Branding/PDF
     │                                                                       │
  05 │██████████████                                                         │ Sidebar
     │              │                                                        │
  06 │              └────██████████████████                                  │ Blueprints
     │              │                    │                                   │
  07 │              └────██████████████████                                  │ Finance
     │                                   │                                   │
  08 │██████████████                     │                                   │ Testing Tab
     │                                   │                                   │
  09 │                ████████████████████████                               │ Suggestion Box
     │                                   │                                   │
  10 │                                   └────██████████████████████████████ │ Opportunities
     │              │                                                        │
  11 │              └────████████████████████████                            │ Notifications
     │                                                                       │
  12 │████████                                                               │ Offboarding
     │                                                                       │
     └───────────────────────────────────────────────────────────────────────┘

Legend: ████ = Active work    ──── = Waiting on dependency
```

---

## Parallel Execution Tracks

### Track 1: Bug Fixes → Feature Expansion
```
01 Critical Bugs ──→ 09 Suggestion Box
```

### Track 2: Navigation → Content → AI Features
```
05 Sidebar ──→ 06 Blueprints ──→ 10 Opportunities
```

### Track 3: Navigation → Finance
```
05 Sidebar ──→ 07 Finance Redesign
```

### Track 4: Navigation → Notifications
```
05 Sidebar ──→ 11 Notifications
```

### Track 5: Independent (anytime)
```
02 Code Cleanup
03 Form Fixes
04 Branding/PDF
08 Testing Tab
12 Offboarding Design
```

---

## Recommended Execution Strategy

### Option A: Maximum Parallelization (2 developers)

**Developer 1:**
```
Day 1-2:  Phase 01 (Critical Bugs)
Day 3-5:  Phase 09 (Suggestion Box)
Day 6-10: Phase 10 (Opportunities)
```

**Developer 2:**
```
Day 1:    Phase 02 + 04 (Cleanup + Branding)
Day 2:    Phase 03 (Form Fixes)
Day 3:    Phase 05 (Sidebar)
Day 4-5:  Phase 06 (Blueprints)
Day 6-7:  Phase 07 (Finance)
Day 8-10: Phase 11 (Notifications)
Day 11:   Phase 08 + 12 (Testing + Offboarding)
```

**Total: ~10-11 days with 2 developers**

---

### Option B: Sequential (1 developer)

**Critical path order:**
```
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12
```

**Total: ~16-20 days with 1 developer**

---

### Option C: Priority-Based (ship fast, iterate)

**Sprint 1 (ship core fixes):**
```
01 Critical Bugs
03 Form Fixes
04 Branding/PDF
05 Sidebar/Dashboard
```
**~3-4 days → deployable polish release**

**Sprint 2 (content & UX):**
```
02 Code Cleanup
06 Blueprints/Case Studies
07 Finance Redesign
08 Testing Tab
```
**~4-5 days → cleaner codebase, better UX**

**Sprint 3 (feature expansion):**
```
09 Suggestion Box
10 Opportunities
11 Notifications
12 Offboarding
```
**~8-10 days → new capabilities**

---

## Quick Reference: "Can I start this now?"

| Phase | Can Start Immediately? | Blocked By |
|-------|------------------------|------------|
| 01 | ✅ Yes | — |
| 02 | ✅ Yes | — |
| 03 | ✅ Yes | — |
| 04 | ✅ Yes | — |
| 05 | ✅ Yes | — |
| 06 | ⏳ After Phase 05 | Sidebar patterns |
| 07 | ⏳ After Phase 05 | Dashboard patterns |
| 08 | ✅ Yes | — |
| 09 | ⏳ After Phase 01 | Storage fixes |
| 10 | ⏳ After Phase 06 | Blueprint relationships |
| 11 | ⏳ After Phase 05 | Notification badge |
| 12 | ✅ Yes | — |

---

*7 of 12 phases can start immediately*
*5 phases have dependencies*
*Maximum parallelization: 2 tracks*
