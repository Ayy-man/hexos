# Phase 06: Blueprints & Case Studies - Research

**Researched:** 2026-01-19
**Domain:** Loom video embedding, bidirectional database relationships, conditional form fields
**Confidence:** HIGH

## Summary

This phase adds Loom video URL support to blueprints and case studies, plus displays related case studies on blueprint detail pages. The existing codebase already has:
- Blueprint and case study tables with established patterns
- Case studies already link to blueprints via `blueprint_id` foreign key
- Form components using shadcn/ui patterns with conditional visibility
- API layer in `lib/api/` with clear CRUD patterns

The implementation is straightforward: add `loom_video_url` columns to both tables, update types/API/forms, add a function to fetch case studies by blueprint ID, and add a UI section to display related case studies.

**Primary recommendation:** Add nullable `loom_video_url TEXT` columns to both tables, validate URLs client-side using a Loom-specific regex, embed videos using responsive iframe with padding-bottom technique.

## Standard Stack

This phase uses the existing project stack - no new libraries needed.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App Router, Server Actions | Project foundation |
| Supabase | 2.89.0 | PostgreSQL + RLS | Project database layer |
| shadcn/ui | Latest | Form components (Input, Card, Label) | Project UI system |
| TypeScript | Strict | Type safety | Project standard |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | Latest | Icons (Video, Play, ExternalLink) | Video embed indicators |
| Tailwind CSS | Latest | Responsive iframe styling | Video container styling |

### Not Needed
| Library | Why Not |
|---------|---------|
| `@loomhq/loom-embed` SDK | Overkill for simple embed - direct iframe is simpler and has fewer dependencies |
| react-player | Adds bundle size for something achievable with native iframe |
| oEmbed fetching | Only needed if showing video metadata (thumbnail, title) - not in requirements |

**Installation:** No new packages required.

## Architecture Patterns

### Database Schema Changes

```sql
-- Migration: Add loom_video_url to blueprints and case_studies
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

ALTER TABLE case_studies
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

-- Optional: Add URL validation constraint
-- Note: Keep validation flexible - Loom URLs can have various query params
```

### Recommended File Changes

```
lib/api/
├── blueprints.ts          # Add loom_video_url to types and queries
├── case-studies.ts        # Add loom_video_url to types, add getCaseStudiesByBlueprintId()

features/blueprints/
├── components/
│   ├── BlueprintForm.tsx      # Add Loom URL field with validation
│   ├── LoomVideoEmbed.tsx     # NEW: Reusable responsive Loom embed component
│   └── RelatedCaseStudies.tsx # NEW: Display related case studies section

features/case-studies/
├── components/
│   └── CaseStudyForm.tsx      # Add Loom URL field with validation

app/(dashboard)/blueprints/[id]/
└── page.tsx               # Add RelatedCaseStudies section to sidebar
```

### Pattern 1: Loom URL Validation

**What:** Client-side regex validation for Loom video URLs
**When to use:** Before saving, in form onChange/onBlur
**Example:**
```typescript
// Source: Derived from Loom URL structure (loom.com/share/{32-char-hex-id})
const LOOM_URL_PATTERN = /^https?:\/\/(www\.)?loom\.com\/(share|embed)\/[a-f0-9-]+(\?.*)?$/i;

export function isValidLoomUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (optional field)
  return LOOM_URL_PATTERN.test(url);
}

export function extractLoomVideoId(url: string): string | null {
  const match = url.match(/loom\.com\/(share|embed)\/([a-f0-9-]+)/i);
  return match ? match[2] : null;
}

export function getLoomEmbedUrl(shareUrl: string): string {
  const videoId = extractLoomVideoId(shareUrl);
  if (!videoId) return '';
  return `https://www.loom.com/embed/${videoId}`;
}
```

### Pattern 2: Responsive Loom Embed Component

**What:** Reusable component for embedding Loom videos responsively
**When to use:** Displaying Loom videos in blueprint/case study detail pages
**Example:**
```typescript
// Source: Loom embed best practices (dev.loom.com/docs/embed-sdk)
interface LoomVideoEmbedProps {
  url: string;
  title?: string;
}

export function LoomVideoEmbed({ url, title = 'Loom video' }: LoomVideoEmbedProps) {
  const embedUrl = getLoomEmbedUrl(url);

  if (!embedUrl) return null;

  return (
    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
      <iframe
        src={embedUrl}
        title={title}
        className="absolute top-0 left-0 w-full h-full border-0 rounded-lg"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
```

### Pattern 3: Conditional Form Field Visibility

**What:** Show Loom embed preview when URL is entered
**When to use:** In BlueprintForm and CaseStudyForm
**Example:**
```typescript
// Follow existing pattern in CaseStudyForm.tsx for image preview
const [loomUrl, setLoomUrl] = useState(blueprint?.loom_video_url || '');
const isValidUrl = !loomUrl || isValidLoomUrl(loomUrl);

// In JSX:
<div className="space-y-2">
  <Label htmlFor="loomUrl">Loom Video URL (optional)</Label>
  <Input
    id="loomUrl"
    value={loomUrl}
    onChange={(e) => setLoomUrl(e.target.value)}
    placeholder="https://www.loom.com/share/..."
    className={!isValidUrl ? 'border-destructive' : ''}
  />
  {!isValidUrl && (
    <p className="text-sm text-destructive">
      Please enter a valid Loom URL (e.g., https://www.loom.com/share/abc123...)
    </p>
  )}
  {loomUrl && isValidUrl && (
    <LoomVideoEmbed url={loomUrl} />
  )}
</div>
```

### Pattern 4: Fetching Related Case Studies

**What:** API function to get case studies linked to a blueprint
**When to use:** On blueprint detail page to show related case studies
**Example:**
```typescript
// In lib/api/case-studies.ts
export async function getCaseStudiesByBlueprintId(blueprintId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('case_studies')
    .select('id, name, description, icon, image_url, client_name, industry')
    .eq('blueprint_id', blueprintId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

### Anti-Patterns to Avoid

- **Server-side Loom API calls:** Don't fetch oEmbed data from server - it adds latency and Loom doesn't require API keys for public embeds
- **Storing embed HTML:** Don't store the iframe HTML - just store the URL and generate embed URL at render time
- **Blocking on video load:** Don't block page render waiting for video - iframe loads async naturally
- **Overly strict URL validation:** Allow query params like `?t=30` (timestamp) and `?hideEmbedTopBar=true`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive video container | Custom JS resize handling | CSS padding-bottom technique | Browser-native, zero JS, reliable |
| Loom thumbnail extraction | API calls to Loom | Just show embed | Thumbnail requires SDK or API, adds complexity |
| Video ID extraction | Complex URL parsing | Simple regex | Loom URLs are predictable |
| Related items query | JOIN in application code | Supabase foreign key query | Database handles it efficiently |

**Key insight:** Loom embeds are designed to be simple iframes - resist adding complexity for "enhanced" features unless explicitly needed.

## Common Pitfalls

### Pitfall 1: Storing Embed URL Instead of Share URL

**What goes wrong:** User pastes share URL, you convert and store embed URL, then validation breaks
**Why it happens:** Trying to normalize URLs prematurely
**How to avoid:** Store exactly what user enters, convert to embed URL only at render time
**Warning signs:** URLs in database don't match what user pasted

### Pitfall 2: Forgetting RLS on New Columns

**What goes wrong:** New `loom_video_url` column isn't protected by RLS
**Why it happens:** Column-level security isn't automatic
**How to avoid:** No action needed - existing table RLS policies cover all columns
**Warning signs:** N/A - Supabase RLS is table-level, not column-level

### Pitfall 3: Iframe Aspect Ratio Issues

**What goes wrong:** Video appears squished or with black bars
**Why it happens:** Using fixed height instead of aspect ratio
**How to avoid:** Use `padding-bottom: 62.5%` (16:10 ratio, Loom's default)
**Warning signs:** Video looks wrong on different screen sizes

### Pitfall 4: Case Studies Section on Wrong Side

**What goes wrong:** Related case studies buried below fold on small screens
**Why it happens:** Put in sidebar without considering mobile
**How to avoid:** Place in main content area or make sidebar collapsible on mobile
**Warning signs:** Mobile users never see related case studies

### Pitfall 5: Empty State Not Handled

**What goes wrong:** Ugly "undefined" or blank space when no Loom URL
**Why it happens:** Conditional rendering not complete
**How to avoid:** Only render video section when URL exists and is valid
**Warning signs:** Blank cards or layout shifts

## Code Examples

### Migration SQL

```sql
-- Source: Following existing migration patterns in supabase/migrations/
-- Migration: 20260119000001_add_loom_video_support.sql

-- Add loom_video_url to blueprints
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

COMMENT ON COLUMN blueprints.loom_video_url IS 'Optional Loom video URL for blueprint walkthrough';

-- Add loom_video_url to case_studies
ALTER TABLE case_studies
ADD COLUMN IF NOT EXISTS loom_video_url TEXT;

COMMENT ON COLUMN case_studies.loom_video_url IS 'Optional Loom video URL for case study presentation';

-- Index for efficient case study lookups by blueprint
-- Note: Index already exists from 20241222000003_case_studies.sql
-- CREATE INDEX IF NOT EXISTS case_studies_blueprint_id_idx ON case_studies(blueprint_id);
```

### Updated TypeScript Types

```typescript
// In lib/api/blueprints.ts - add to existing interfaces
export interface Blueprint {
  // ... existing fields
  loom_video_url: string | null;
}

export interface CreateBlueprintInput {
  // ... existing fields
  loom_video_url?: string;
}

export interface UpdateBlueprintInput {
  // ... existing fields
  loom_video_url?: string | null;
}

// In lib/api/case-studies.ts - add to existing interfaces
export interface CaseStudy {
  // ... existing fields
  loom_video_url: string | null;
}
```

### Related Case Studies Component

```typescript
// features/blueprints/components/RelatedCaseStudies.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface RelatedCaseStudy {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  client_name: string | null;
  industry: string | null;
}

interface RelatedCaseStudiesProps {
  caseStudies: RelatedCaseStudy[];
}

export function RelatedCaseStudies({ caseStudies }: RelatedCaseStudiesProps) {
  if (caseStudies.length === 0) {
    return null; // Don't show section if no related case studies
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Related Case Studies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {caseStudies.map((study) => (
          <Link
            key={study.id}
            href={`/case-studies/${study.id}`}
            className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {study.icon && (
                <span className="text-xl shrink-0">{study.icon}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{study.name}</p>
                {study.client_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    {study.client_name}
                    {study.industry && ` - ${study.industry}`}
                  </p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Loom SDK for embed | Direct iframe | Always valid | Fewer dependencies, same result |
| Fixed iframe size | Responsive padding-bottom | CSS3 era | Works on all screen sizes |
| Store computed embed URL | Store user URL, compute at render | Best practice | Easier validation, flexibility |

**Deprecated/outdated:**
- Loom's old embed format without `embed/` path - still works but modern URLs use `/embed/`
- Flash-based players - N/A, Loom always used modern HTML5

## Open Questions

None - this phase has clear requirements and the implementation path is straightforward given the existing codebase patterns.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/Users/aymanbaig/Desktop/hexos-main/lib/api/blueprints.ts` - Current Blueprint types and API
- Existing codebase: `/Users/aymanbaig/Desktop/hexos-main/lib/api/case-studies.ts` - Current CaseStudy types, existing blueprint relationship
- Existing codebase: `/Users/aymanbaig/Desktop/hexos-main/features/case-studies/components/CaseStudyForm.tsx` - Form patterns for optional URL fields
- Existing codebase: `/Users/aymanbaig/Desktop/hexos-main/supabase/migrations/20241222000003_case_studies.sql` - Case studies schema with blueprint_id FK
- [Loom Embed SDK Getting Started](https://dev.loom.com/docs/embed-sdk/getting-started) - Official embed documentation
- [Loom Embed SDK API](https://dev.loom.com/docs/embed-sdk/api) - API methods reference

### Secondary (MEDIUM confidence)
- [Loom Embed Support](https://support.atlassian.com/loom/docs/embed-your-video-into-a-webpage/) - Official embed instructions
- [LogRocket React Iframes Best Practices 2025](https://blog.logrocket.com/best-practices-react-iframes/) - Security and performance patterns

### Tertiary (LOW confidence)
- URL regex pattern derived from observed Loom URL structure - may need adjustment for edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing project dependencies
- Architecture: HIGH - Following established codebase patterns exactly
- Pitfalls: HIGH - Based on common iframe/embed issues and project patterns
- Loom URL format: MEDIUM - Based on official docs but URL formats could evolve

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stable domain, unlikely to change)
