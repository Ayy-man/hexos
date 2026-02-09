---
wave: 1
autonomous: true
---

# Quick Task 001: Fix Testing Modal + Manual Checklist Items

## Goal
Fix TestingModal crash on null session and add ability to manually add checklist items alongside AI generation.

## Tasks

### Task 1: Add null safety and error handling to TestingModal
- Guard `loadTestSession` against null session response
- Add `loadError` state with retry UI
- Guard all handlers (`handleStartTesting`, `handleGenerateChecklist`, `handleSubmit`) against null `testSession`

### Task 2: Add manual checklist item input
- Import `addChecklistItemAction`, `Input`, `Select`, `Plus`
- Add state for `newItemDesc`, `newItemCategory`, `addingItem`
- Add `handleAddItem` handler with toast feedback
- Add inline form (category select + description input + add button) to checklist tab
- Show form in both empty state and below existing items
- Add "Generate More Items" button when items already exist

### Task 3: Verify and commit
- TypeScript compile check
- Commit and push
