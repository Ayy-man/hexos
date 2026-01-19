---
phase: 04-branding-pdf-polish
plan: 01
status: complete
started: 2026-01-20
completed: 2026-01-20
---

## Summary

Removed hexOS branding from PDF exports and public proposal web views to enable fully white-labeled client-facing proposals. Mark as Closed button location and role-appropriate pricing visibility confirmed as already implemented.

## Deliverables

| Deliverable | Status | Location |
|-------------|--------|----------|
| PDF footer without hexOS branding | Complete | features/inquiries/components/ProposalPDF.tsx:212-216 |
| Web footer without hexOS branding | Complete | features/inquiries/components/PublicProposalView.tsx:176-180 |
| Mark as Closed in header | Pre-existing | app/(dashboard)/inquiries/[id]/page.tsx:564-571 |
| Role-based pricing visibility | Pre-existing | features/inquiries/components/QuickPricingEditor.tsx |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Remove hexOS branding | 3a29adc | Remove "Powered by hexOS" from PDF and web footers |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Remove branding entirely (not conditional) | User feedback during checkpoint: don't want hexOS branding shown at all, regardless of partner logo status |
| Keep only contact info in footer | Minimal footer with just partner contact preserves white-label appearance |

## Deviations

| Original Plan | Actual | Reason |
|---------------|--------|--------|
| Conditional branding based on partner logo | Complete removal of hexOS branding | User preference during human verification checkpoint |

## Issues

None.
