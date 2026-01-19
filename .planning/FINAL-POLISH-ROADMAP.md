# Final Polish Roadmap

**Created:** 2026-01-19
**Source:** Ayman's testing notes (`final-polish-ayman`)
**Status:** Ready for execution

---

## Overview

20 items from production testing organized into 8 phases. Estimated complexity breakdown:
- **5 bugs** (2 critical, 3 moderate)
- **13 polish items** (mix of trivial to moderate)
- **4 feature expansions** (moderate to complex)

### Phase Dependencies

```
Phase 1 (Storage Bugs) ─────────────────┐
                                        │
Phase 2 (Code Cleanup) ─────────────────┼──> Phase 5 (Sidebar/Dashboard)
                                        │
Phase 3 (Form Fixes) ───────────────────┤
                                        │
Phase 4 (Branding/PDF) ─────────────────┘

Phase 5 (Sidebar/Dashboard) ────────────┐
                                        │
Phase 6 (Blueprints/Case Studies) ──────┼──> Phase 8 (Feature Expansions)
                                        │
Phase 7 (Finance Tab Redesign) ─────────┘

Phase 8 (Feature Expansions) ───────────> Done
```

---

## Phase 1: Critical Bugs - Storage & Server Actions

**Goal:** Fix blocking production bugs preventing core workflows

**Items:**
| # | Issue | Root Cause | Complexity |
|---|-------|------------|------------|
| 9 | Case study cover image upload fails (RLS 403) | Missing RLS policy on `general-purpose` storage bucket | Moderate |
| 11a | Suggestion box upload + submit fails | Same storage RLS issue | Moderate |
| 5 | DFY "suggest changes" fails: "failed to extract deliverables" | Server component render error in `parseDeliverablesWithAI()` | Complex |

**Files to modify:**
- `supabase/migrations/` - Add RLS policy for storage
- `lib/api/case-studies.ts` - `uploadCaseStudyImage()`
- `lib/actions/suggestions.ts` - `uploadSuggestionImageAction()`
- `features/inquiries/actions/deliverableActions.ts` - `parseDeliverablesWithAI()`

**Success criteria:**
- [ ] Case study image upload works for admin role
- [ ] Suggestion box screenshot upload + submit works
- [ ] DFY can click "Suggest Changes" without error

---

## Phase 2: Code Cleanup - Remove Unused Features

**Goal:** Reduce code surface area by removing placeholder/unused sections

**Items:**
| # | Item | Action | Complexity |
|---|------|--------|------------|
| 12 | Remove team section | Nuke `app/(dashboard)/settings/team/` + cleanup nav | Trivial |
| 14 | Remove time reports section | Nuke `app/(dashboard)/admin/time-reports/` + cleanup nav + remove API | Moderate |

**Files to modify:**
- `app/(dashboard)/settings/team/page.tsx` - Delete
- `app/(dashboard)/admin/time-reports/page.tsx` - Delete
- `features/projects/components/TimeReportsContent.tsx` - Delete (if exists)
- `lib/api/admin-reports.ts` - Remove time report functions
- `lib/navigation.ts` - Remove nav entries

**Success criteria:**
- [ ] Team section removed from sidebar and code
- [ ] Time reports section removed from sidebar and code
- [ ] No broken imports or dead code left behind

---

## Phase 3: Form Input Fixes

**Goal:** Fix number input UX issues across the app

**Items:**
| # | Issue | Root Cause | Complexity |
|---|-------|------------|------------|
| 1 | Blueprint pricing tiers preloaded with 0, typing 250 becomes 0250 | Number input value handling + no way to clear | Moderate |
| 2 | Price fields should ±$50 not ±$1 | Missing `step` attribute on price inputs | Trivial |
| 3 | Blueprint tier features "one per line" can't make new lines | Textarea newline handling, shift+enter blocked | Trivial |

**Audit scope:** After fixing blueprint, audit ALL number inputs:
- Invoice amounts
- Milestone amounts
- Project pricing
- Commission percentages
- Any other currency/number fields

**Files to modify:**
- `features/blueprints/components/PricingTiersEditor.tsx` - Fix number inputs + textarea
- Audit: `features/finances/`, `features/projects/`, `features/invoices/`

**Success criteria:**
- [ ] Typing in empty number field works (no leading zero)
- [ ] Price fields step by $50
- [ ] Textarea accepts Enter key for new lines
- [ ] All number inputs audited and consistent

---

## Phase 4: Branding & PDF Polish

**Goal:** Clean up branding for white-label ready proposals

**Items:**
| # | Item | Complexity |
|---|------|------------|
| 7 | Remove "Powered by hexOS" from PDF proposals | Trivial |
| 7 | Remove "Questions? Contact your representative" from PDF | Trivial |
| 6 | Move "Mark as closed" button to top (next to share/download) | Trivial |
| 6 | Remove $pricing client price from DFY overview | Trivial |

**Files to modify:**
- `features/inquiries/components/ProposalPDF.tsx` - Remove branding
- `features/inquiries/components/ShareLinkButton.tsx` - Check for branding
- `features/inquiries/components/ProposalOverview.tsx` - Move button, hide price
- `app/p/[token]/page.tsx` - Public proposal view

**Success criteria:**
- [ ] PDF exports have no hexOS branding
- [ ] "Mark as closed" is prominent at top
- [ ] DFY users don't see client pricing

---

## Phase 5: Sidebar & Dashboard Polish

**Goal:** Improve navigation UX and data sync

**Items:**
| # | Item | Complexity |
|---|------|------------|
| 15 | Move blockers tab higher in sidebar | Trivial |
| 4 | Inquiries sidebar hover: show status counts (1 red=unread, 2 green=ready, 3 orange=on-hold) | Moderate |
| 17 | DFY "My Projects" deliverables 0/7 sync to hill chart progress % | Moderate |

**Files to modify:**
- `lib/navigation.ts` - Reorder nav items
- `components/app-sidebar.tsx` - Add hover tooltip with counts
- `app/(dashboard)/dashboard/dfy/page.tsx` - Replace deliverable count with progress %
- `lib/api/projects.ts` - Add function to get hill chart progress

**Success criteria:**
- [ ] Blockers appears higher in admin sidebar
- [ ] Hovering inquiries shows "1 | 2 | 3" color-coded counts
- [ ] DFY project cards show actual progress % not 0/7

---

## Phase 6: Blueprints & Case Studies Enhancements

**Goal:** Add Loom support and bidirectional relationships

**Items:**
| # | Item | Complexity |
|---|------|------------|
| 8 | Add Loom video links to blueprints (visible to DFY if present) | Moderate |
| 8 | Add Loom video links to case studies (visible to DFY if present) | Moderate |
| 10 | Show "Related Case Studies" on blueprint page | Moderate |

**Database changes:**
- Add `loom_url` column to `blueprints` table
- Add `loom_url` column to `case_studies` table

**Files to modify:**
- `supabase/migrations/` - Add columns
- `features/blueprints/components/BlueprintForm.tsx` - Add Loom field
- `features/case-studies/components/CaseStudyForm.tsx` - Add Loom field
- `app/(dashboard)/blueprints/[id]/page.tsx` - Show Loom embed + related case studies
- `app/(dashboard)/case-studies/[id]/page.tsx` - Show Loom embed
- `lib/api/blueprints.ts` - Query related case studies

**Success criteria:**
- [ ] Admin can add Loom URL to blueprints
- [ ] Admin can add Loom URL to case studies
- [ ] Loom embeds only show when URL exists
- [ ] Blueprint page shows related case studies section

---

## Phase 7: Finance Tab Redesign

**Goal:** Improve UX hierarchy and reduce cognitive load

**Items:**
| # | Item | Complexity |
|---|------|------------|
| 13 | Metrics/Finance tab UX overhaul - cards too wide, no hierarchy, no logical grouping | Moderate |

**Design goals:**
- Narrower cards with clear visual hierarchy
- Logical groupings: Revenue, Costs, Timeline
- Progressive disclosure (summary → detail)
- Consistent with rest of dashboard

**Files to modify:**
- `features/projects/components/tabs/FinancialsTab.tsx` - Redesign layout
- `app/(dashboard)/admin/metrics/page.tsx` - Apply consistent design

**Success criteria:**
- [ ] Cards have appropriate widths
- [ ] Clear visual hierarchy
- [ ] Logical groupings applied
- [ ] Matches Vega/shadcn design system

---

## Phase 8: Feature Expansions

**Goal:** Significant new functionality based on testing feedback

### 8.1 Testing Tab Reliability + Positioning
| # | Item | Complexity |
|---|------|------------|
| 19 | Testing tab reliability fixes | Moderate |
| 19 | Testing tab positioning: after Progress, before Files | Trivial |

**Files:** `features/projects/components/tabs/TestingTab.tsx`, project page layout

---

### 8.2 Suggestion Box Page
| # | Item | Complexity |
|---|------|------------|
| 11b | DFY/Dev suggestion page with previous suggestions list | Moderate |
| 11b | Conversation thread per suggestion (admin ↔ DFY/dev) | Moderate |
| 11b | Notifications for suggestion conversations (not in general conversations tab) | Moderate |

**New files needed:**
- `app/(dashboard)/suggestions/page.tsx` - Suggestion list page
- `features/suggestions/components/SuggestionList.tsx`
- `features/suggestions/components/SuggestionConversation.tsx`

**Database changes:**
- Add `suggestion_comments` table (suggestion_id, user_id, content, created_at)

---

### 8.3 Opportunities Tab Overhaul
| # | Item | Complexity |
|---|------|------------|
| 16 | Change "estimated hours" to "estimated weeks" | Trivial |
| 16 | Post-project opportunity creation with expiry timer | Moderate |
| 16 | Developer bidding system | Complex |
| 16 | Pre-commitment tab for proposals not yet closed | Moderate |
| 16 | AI-generated redacted brief (client, price, DFY redacted) | Complex |
| 16 | Cache extracted content to avoid token waste | Moderate |

**This is the largest feature expansion - may need its own detailed spec.**

---

### 8.4 Notification System Audit
| # | Item | Complexity |
|---|------|------------|
| 18 | Map all notification triggers | Moderate |
| 18 | Fix reliability - notifications not triggering | Moderate |
| 18 | Prevent repeated pop-ups (seen = delegated to center) | Moderate |

**Output:** Notification trigger matrix document + reliability fixes

---

### 8.5 Offboarding Flow Design
| # | Item | Complexity |
|---|------|------------|
| 20 | Brainstorm what happens after project complete | Design work |

**Output:** Offboarding flow spec for future phase

---

## Execution Order

| Phase | Name | Effort | Parallelizable |
|-------|------|--------|----------------|
| 1 | Critical Bugs | 1-2 days | No (blockers) |
| 2 | Code Cleanup | 0.5 day | Yes with Phase 3 |
| 3 | Form Fixes | 1 day | Yes with Phase 2 |
| 4 | Branding/PDF | 0.5 day | Yes with Phase 5 |
| 5 | Sidebar/Dashboard | 1 day | Yes with Phase 4 |
| 6 | Blueprints/Case Studies | 1-2 days | After Phase 5 |
| 7 | Finance Redesign | 1-2 days | After Phase 5 |
| 8.1 | Testing Tab | 1 day | Anytime |
| 8.2 | Suggestion Box Page | 2-3 days | After Phase 1 |
| 8.3 | Opportunities Overhaul | 3-5 days | After Phase 6 |
| 8.4 | Notification Audit | 2-3 days | After Phase 5 |
| 8.5 | Offboarding Design | 0.5 day | Anytime |

---

## Quick Reference

### By Severity
**Critical (fix first):**
- #5 DFY suggest changes broken
- #9 Case study upload broken
- #11a Suggestion box broken

**High (user-facing friction):**
- #1 Number field 0-prefix
- #17 DFY progress out of sync
- #13 Finance tab UX overload

**Medium (polish):**
- #2, #3, #4, #6, #7, #8, #10, #15, #19

**Low (feature expansion):**
- #11b, #16, #18, #20

### By Complexity
**Trivial:** #2, #3, #7, #12, #15
**Moderate:** #1, #4, #6, #8, #9, #10, #11a, #13, #14, #17, #19
**Complex:** #5, #16, #18

---

*Ready for `/gsd:plan-phase 1` to create detailed execution plan*
