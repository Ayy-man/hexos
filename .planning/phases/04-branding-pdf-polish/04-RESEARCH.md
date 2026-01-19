# Phase 04: Branding & PDF Polish - Research

**Researched:** 2026-01-19
**Domain:** PDF generation, role-based UI visibility, proposal exports
**Confidence:** HIGH

## Summary

This phase involves three discrete deliverables: (1) removing hexOS branding from PDF exports for white-label use, (2) moving the "Mark as Closed" button to a more prominent position, and (3) hiding client pricing from DFY users in specific contexts.

The codebase already has:
- PDF generation using `@react-pdf/renderer` v4.3.1
- Partner logo support in PDFs (fetched from `profiles.logo_url`)
- Role-based conditional rendering patterns throughout
- The `MarkAsClosedButton` component with proper state management

**Primary recommendation:** Make PDF branding conditional on partner logo presence, move the Mark as Closed action to the page header, and extend existing role-based pricing visibility logic.

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.3.1 | Client-side PDF generation | Already integrated, works well with React |
| Next.js 16 | 16.1.0 | App Router, dynamic imports | Project standard |
| TypeScript | ^5 | Type safety | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date formatting in PDFs | Already used for "Prepared on" date |
| lucide-react | 0.562.0 | Icons for buttons | Already used for Download icon |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | Server-side PDF (Puppeteer) | More complex, overkill for this use case |
| Client download | Supabase Storage | Unnecessary persistence overhead |

## Architecture Patterns

### Current PDF Generation Flow
```
ExportPDFButton.tsx
    |
    v
ProposalPDF.tsx (React component)
    |
    v
@react-pdf/renderer (generates blob)
    |
    v
Browser download
```

### Files to Modify

**1. PDF Branding Removal:**
```
features/inquiries/components/ProposalPDF.tsx
  - Lines 212-219: Footer with "Powered by hexOS" branding
  - Conditional: Show hexOS branding ONLY if partnerLogo is null/undefined
```

**2. Mark as Closed Button Relocation:**
```
app/(dashboard)/inquiries/[id]/page.tsx
  - Currently: Line 841 (inside Actions Card in sidebar)
  - Move to: Header section (lines 524-566) next to ShareLinkButton and ExportPDFButton
```

**3. Client Pricing Visibility:**
```
features/inquiries/components/QuickPricingEditor.tsx
  - Already has role-based logic (lines 33-40)
  - DFY users can see `price_dfy` but NOT `price_hexona` or `price_dev`
  - This appears correctly implemented - verify in testing
```

### Pattern: Conditional Branding in PDF

```typescript
// ProposalPDF.tsx - Footer section
<View style={styles.footer} fixed>
  {!proposal.partnerLogo && (
    <Text style={styles.footerText}>
      Powered by <Text style={styles.footerBrand}>hexOS</Text>
    </Text>
  )}
  <Text style={styles.footerText}>
    Contact: {proposal.partner_name}
  </Text>
</View>
```

### Pattern: Role-Based Visibility (Already Established)

```typescript
// From QuickPricingEditor.tsx - existing pattern
const isAdmin = userRole === 'admin'
const isInternal = userRole === 'internal'
const isDfy = userRole === 'dfy'

const canEditClientPrice = isAdmin || isDfy
const canEditInternalPrices = isAdmin
const canViewInternal = isAdmin || isInternal
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF | @react-pdf/renderer (already installed) | React-native approach, already working |
| Role detection | Manual auth checks | `getProfile()` from guards.ts | Centralized, consistent |
| Dynamic imports | Manual lazy loading | `ExportPDFButtonWrapper` pattern | SSR-safe, already established |

**Key insight:** All infrastructure exists. This phase is about adjusting conditional logic, not building new systems.

## Common Pitfalls

### Pitfall 1: SSR Rendering of PDF Components
**What goes wrong:** @react-pdf/renderer cannot run in Node.js SSR context
**Why it happens:** PDF components try to render on server
**How to avoid:** Use the existing `ExportPDFButtonWrapper` pattern with `dynamic(() => ..., { ssr: false })`
**Warning signs:** "document is not defined" or "window is not defined" errors

### Pitfall 2: Partner Logo Missing/Null Handling
**What goes wrong:** PDF fails to render if logo URL is invalid
**Why it happens:** Image component tries to fetch non-existent resource
**How to avoid:** Current code already handles this with `{proposal.partnerLogo && ...}` pattern (line 160-162)
**Warning signs:** PDF generation hangs or fails silently

### Pitfall 3: Button Position Breaking Layout
**What goes wrong:** Moving MarkAsClosedButton to header disrupts flex layout
**Why it happens:** Header has specific flex structure for alignment
**How to avoid:** Add button to existing `<div className="flex items-center gap-2">` container (line 550)
**Warning signs:** Buttons overlap, misaligned, or push content off-screen

### Pitfall 4: Role Check Race Conditions
**What goes wrong:** UI flickers between states during auth check
**Why it happens:** Profile data loads async
**How to avoid:** Page already awaits `getProfile()` before render - maintain this pattern
**Warning signs:** Button appears then disappears, or wrong content flashes

## Code Examples

### Verified: Conditional Footer in PDF
```typescript
// Source: features/inquiries/components/ProposalPDF.tsx (modified)
// Current implementation shows hexOS branding unconditionally
// Change to conditional:

<View style={styles.footer} fixed>
  {!proposal.partnerLogo ? (
    <>
      <Text style={styles.footerText}>
        Powered by <Text style={styles.footerBrand}>hexOS</Text>
      </Text>
      <Text style={styles.footerText}>
        Contact: {proposal.partner_name}
      </Text>
    </>
  ) : (
    <Text style={styles.footerText}>
      Contact: {proposal.partner_name}
    </Text>
  )}
</View>
```

### Verified: Header Button Placement
```typescript
// Source: app/(dashboard)/inquiries/[id]/page.tsx
// Current header structure (lines 550-564):
<div className="flex items-center gap-2">
  <ShareLinkButton publicToken={inquiry.public_token} />
  <ExportPDFButton ... />
  {/* ADD: Mark as Closed button here for DFY users */}
  {isDfyOwner && proposalSubmitted && !inquiry.project && (
    <MarkAsClosedButton
      inquiryId={id}
      isClosed={isClosed}
      onMarkAsClosed={boundMarkAsClosed}
      onUnmarkAsClosed={isClosed ? boundUnmarkAsClosed : undefined}
    />
  )}
</div>
```

### Verified: Role-Based Pricing Display
```typescript
// Source: features/inquiries/components/QuickPricingEditor.tsx
// Already correctly implemented:
const canViewInternal = isAdmin || isInternal  // DFY excluded
// DFY users only see price_dfy, not price_hexona or price_dev
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static hexOS branding | Conditional based on partner logo | This phase | White-label PDFs |
| Sidebar action button | Header-level prominent action | This phase | Better UX for DFY closing deals |

**No deprecated patterns:** @react-pdf/renderer 4.x is current; patterns in use are modern.

## Open Questions

None - all deliverables are straightforward modifications to existing code.

## Sources

### Primary (HIGH confidence)
- `/features/inquiries/components/ProposalPDF.tsx` - PDF template with branding
- `/features/inquiries/components/MarkAsClosedButton.tsx` - Button component
- `/app/(dashboard)/inquiries/[id]/page.tsx` - Page layout with button placement
- `/features/inquiries/components/QuickPricingEditor.tsx` - Role-based pricing logic
- `package.json` - @react-pdf/renderer version 4.3.1

### Secondary (MEDIUM confidence)
- `/features/inquiries/components/PublicProposalView.tsx` - Web view also shows hexOS branding (may want to apply same logic)

## Metadata

**Confidence breakdown:**
- PDF branding removal: HIGH - Direct code modification, clear location
- Button relocation: HIGH - Clear structure, established patterns
- Pricing visibility: HIGH - Already implemented correctly, just verify

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (stable codebase, no external dependencies changing)

---

## Implementation Notes

### Scope Summary

1. **ProposalPDF.tsx** - ~5 lines changed
   - Wrap footer branding in conditional `{!proposal.partnerLogo && ...}`

2. **PublicProposalView.tsx** - ~5 lines changed (optional, for consistency)
   - Same conditional for web footer (line 176-180)

3. **inquiries/[id]/page.tsx** - ~15 lines changed
   - Move MarkAsClosedButton from sidebar (line 841) to header (line 550)
   - Remove from sidebar location
   - Keep same props and conditions

4. **QuickPricingEditor.tsx** - Verify only
   - Already correctly hides internal pricing from DFY users
   - No changes needed unless testing reveals issues

### Testing Checklist

- [ ] Generate PDF with partner logo uploaded - no hexOS branding
- [ ] Generate PDF without partner logo - shows hexOS branding
- [ ] DFY user sees "Mark as Closed" in header when proposal is submitted
- [ ] Admin does not see "Mark as Closed" button (they use Convert to Project)
- [ ] DFY user cannot see price_hexona or price_dev fields
- [ ] Admin can see all pricing fields
