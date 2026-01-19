# Files Tab Redesign - Implementation Complete

**Date:** 2026-01-14
**Status:** Implemented
**Commits:** f6118e3, ad6ad0f, 92536a2, dcd19a7

## Overview

Merged the Gameplan and Files tabs into a single unified Files tab with a collapsing header behavior. When the Files tab is clicked, the project header collapses to a slim bar and a file sidebar slides in, giving the document editor full-screen focus.

## Changes Summary

### Removed
- Gameplan tab from project navigation
- `GameplanTabWrapper` component usage in ProjectTabs

### Added

#### New Components (`features/projects/components/files-tab/`)
| Component | Purpose |
|-----------|---------|
| `CollapsedHeader.tsx` | Slim 48px header bar shown in file mode |
| `FileSidebar.tsx` | 260px sidebar with Internal/Client toggle, document list, file tree |
| `DocumentEditorFullscreen.tsx` | Full-width Plate.js editor with footer |
| `FilesTabContainer.tsx` | Orchestrator component for sidebar + editor |
| `useFilesTabState.ts` | State management hook for file selection and visibility |
| `index.ts` | Barrel exports |

#### New Wrapper Component
| Component | Purpose |
|-----------|---------|
| `ProjectPageClient.tsx` | Client wrapper managing collapse animation state |

#### Database Migration
| File | Changes |
|------|---------|
| `20260114000002_files_tab_redesign.sql` | Adds `visibility` column to `project_documents`, `checkpoint_name` to `document_versions` |

### Modified

| File | Changes |
|------|---------|
| `lib/api/project-documents.ts` | Added `DocumentVisibility` type, visibility field, filter support |
| `features/projects/actions/documentActions.ts` | Added visibility to create, updated checkpoint with name |
| `features/projects/actions/fileActions.ts` | Added `getProjectFilesAction` |
| `features/projects/components/gameplan/NewDocumentDialog.tsx` | Added `defaultVisibility` prop |
| `features/projects/components/ProjectTabs.tsx` | Removed Gameplan tab, added file mode state |
| `lib/api/projects.ts` | Auto-creates Gameplan document on project creation |
| `app/(dashboard)/projects/[id]/page.tsx` | Uses `ProjectPageClient` wrapper |

## Features

### 1. Collapsing Header
- Header collapses from ~180px to 48px when entering file mode
- 200ms ease-out animation using Framer Motion
- Collapsed header shows: project name, status badge, delivery date, on-track indicator, close button

### 2. File Sidebar (260px)
- Internal/Client toggle (admin/internal only)
- DOCUMENTS section with clickable document list
- UPLOADS section with file tree
- New Document / Upload File buttons
- Cyan highlight for selected items

### 3. Document Editor
- Full-width Plate.js editor
- Footer with "Last saved: X min ago" + Checkpoint + Save buttons
- Auto-save triggers:
  - 1.5s debounce on content change
  - 30-second interval
  - On blur

### 4. Auto-Create Gameplan
- New projects automatically get an empty "Gameplan" document
- Visibility set to 'internal' by default

### 5. Role-Based Permissions

| Role | Internal Docs | Internal Uploads | Client Docs | Client Uploads |
|------|---------------|------------------|-------------|----------------|
| Admin | Read/Write | Read/Write | Read/Write | Read/Write |
| Internal | Read/Write | Read/Write | Read/Write | Read/Write |
| Dev | Read/Write | Read/Write | - | - |
| DFY | - | - | Read only | Read/Write |

- Dev users: Default to internal view, cannot toggle
- DFY users: Default to client view, cannot toggle
- Admin/Internal: Can toggle between views

## Database Schema

```sql
-- project_documents
ALTER TABLE project_documents
ADD COLUMN visibility TEXT DEFAULT 'internal'
CHECK (visibility IN ('internal', 'client'));

-- document_versions
ALTER TABLE document_versions
ADD COLUMN checkpoint_name TEXT;

-- Indexes
CREATE INDEX idx_project_documents_project ON project_documents(project_id);
CREATE INDEX idx_project_documents_visibility ON project_documents(project_id, visibility);
```

## State Flow

```
User clicks Files tab
  → setActiveTab('files')
  → useEffect triggers onFileModeChange(true)
  → ProjectPageClient sets isFileMode = true
  → AnimatePresence swaps to CollapsedHeader
  → FilesTabContainer receives isExpanded = true
  → FileSidebar animates to 260px width
  → Documents fetched via getProjectDocumentsAction
  → Auto-selects Gameplan document if available

User clicks [×] or other tab
  → onFileModeChange(false) or handleTabChange
  → isFileMode = false
  → AnimatePresence swaps back to expanded header
  → FileSidebar animates to 0px width
```

## Testing Checklist

- [x] Clicking Files tab collapses header (200ms animation)
- [x] File sidebar appears with 260px width
- [x] Internal/Client toggle filters documents correctly
- [x] Documents open in full-width Plate.js editor
- [x] Auto-save triggers on blur and every 30 seconds
- [x] Checkpoint button creates named version
- [x] Clicking [×] exits file mode
- [x] Clicking other tabs exits file mode
- [x] New projects get empty Gameplan document
- [x] DFY users only see client documents
- [x] Dev users only see internal documents
- [x] Admin/Internal users can toggle between views
