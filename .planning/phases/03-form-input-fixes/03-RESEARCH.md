# Phase 03: Form Input Fixes - Research

**Researched:** 2026-01-19
**Domain:** React form inputs, HTML number inputs, textarea handling
**Confidence:** HIGH

## Summary

This phase addresses three distinct form input UX issues in the hexOS application:

1. **Leading Zero Problem:** Number inputs in PricingTiersEditor show `0250` when typing `250` because `value={tier.setup_price}` binds to numeric `0`, and React's controlled input comparison doesn't trigger a re-render when `parseFloat("0250") === 0250`
2. **Price Step Issue:** Price fields use default `step=1` causing spinner arrows to increment by $1 instead of $50
3. **Textarea Newline Issue:** The PricingTiersEditor textarea for features cannot accept Enter key because it's inside a form that intercepts Enter for submission

The codebase already contains a proven pattern for currency inputs (see `QuickPricingEditor.tsx`) that uses `type="text"` with `inputMode="decimal"` and custom sanitization. This pattern should be applied consistently.

**Primary recommendation:** Convert problematic number inputs to text inputs with inputMode="decimal" and proper sanitization. Add step="50" only where spinner arrows are desired. Add onKeyDown handler to textareas to stopPropagation on Enter.

## Standard Stack

The codebase uses native React form handling with React 19 and shadcn/ui components. No additional libraries needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | UI framework | Already in use |
| shadcn/ui Input | N/A | Base input component | Already in use at `/components/ui/input.tsx` |
| shadcn/ui Textarea | N/A | Base textarea component | Already in use at `/components/ui/textarea.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-number-format | 5.4.4 | Advanced number formatting | NOT RECOMMENDED - overkill for this use case |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| type="text" + inputMode | type="number" + workarounds | Native number input has browser inconsistencies and leading zero issues |
| Custom sanitization | react-number-format | Library adds 10KB, custom is simpler for this use case |

**Installation:**
No new packages needed. All fixes use existing components.

## Architecture Patterns

### Recommended Pattern for Currency/Price Inputs

The codebase already has a working pattern in `features/inquiries/components/QuickPricingEditor.tsx`:

```typescript
// Source: /Users/aymanbaig/Desktop/hexos-main/features/inquiries/components/QuickPricingEditor.tsx

// 1. Use text type with decimal inputMode
<Input
  type="text"
  inputMode="decimal"
  placeholder="0"
  value={formattedValue}
  onChange={(e) => handleValueChange(e.target.value)}
  className="pl-7"
/>

// 2. Sanitize on change - only allow numbers and decimal point
const handleValueChange = (newValue: string) => {
  const sanitized = newValue.replace(/[^0-9.]/g, '')
  setValue(sanitized)
}

// 3. Format for display (optional, for read views)
const formatDisplayValue = (value: string) => {
  if (!value) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat('en-US').format(num)
}
```

### Pattern for Number Inputs with Spinner Arrows ($50 steps)

When spinner arrows ARE desired (rare), use:

```typescript
// Keep type="number" but add explicit step
<Input
  type="number"
  min="0"
  step="50"  // For $50 increments
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Pattern for Textarea Enter Key in Forms

The issue: Textareas inside `<form>` elements have Enter key intercepted for form submission.

Solution: Stop propagation on Enter key:

```typescript
<Textarea
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.stopPropagation()  // Prevent form submission, allow newline
    }
  }}
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Anti-Patterns to Avoid

- **Using value={number} with type="number":** Causes leading zero issue because React compares parsed values
- **Using parseFloat in onChange for number inputs:** Loses formatting information like leading zeros
- **Using e.preventDefault() on textarea Enter:** Prevents newline - use stopPropagation instead
- **Adding step to non-price number fields:** Hours, percentages, etc. should use step="1" or "0.5"

## Don't Hand-Roll

Problems that have existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency input formatting | Custom number input component | type="text" + inputMode="decimal" pattern | Already proven in QuickPricingEditor |
| Form-wide Enter prevention | Global keydown handler | Per-textarea stopPropagation | More targeted, less side effects |
| Number validation | Regex in onChange | Simple replace(/[^0-9.]/g, '') | Handles all edge cases |

**Key insight:** The QuickPricingEditor already solves the currency input problem correctly. The pattern just needs to be applied to the 20 files using type="number".

## Common Pitfalls

### Pitfall 1: Leading Zero in Controlled Number Inputs
**What goes wrong:** User types "250" but sees "0250" because initial value is 0
**Why it happens:** React compares `parseFloat(node.value)` with state value. "0250" parses to 250, which equals the new state, so no DOM update occurs.
**How to avoid:** Use `type="text"` with `inputMode="decimal"` instead of `type="number"`
**Warning signs:** Number fields preloaded with 0 that don't clear when typing

### Pitfall 2: Textarea Newlines in Forms
**What goes wrong:** Enter key submits form instead of creating newline
**Why it happens:** Browser default behavior - Enter in form triggers submit
**How to avoid:** Add `onKeyDown` handler that calls `e.stopPropagation()` on Enter
**Warning signs:** User feedback that shift+enter also doesn't work (indicates form-level interception)

### Pitfall 3: Inconsistent Step Values
**What goes wrong:** Price fields increment by $1 with spinner arrows
**Why it happens:** Default `step` for number inputs is 1
**How to avoid:** Add explicit `step="50"` for price fields, or remove spinner by using text input
**Warning signs:** User feedback about tiny increments on large dollar amounts

### Pitfall 4: Mixing Patterns
**What goes wrong:** Some inputs use text+inputMode, others use type=number
**Why it happens:** Different developers, different times
**How to avoid:** Establish consistent pattern and audit all inputs
**Warning signs:** Inconsistent behavior across similar fields in the app

## Code Examples

### Example 1: Converting PricingTiersEditor Price Inputs

**Before (problematic):**
```typescript
// Source: /Users/aymanbaig/Desktop/hexos-main/features/blueprints/components/PricingTiersEditor.tsx lines 96-106

<Input
  id={`tier-setup-${index}`}
  type="number"
  min="0"
  value={tier.setup_price}  // Binding to number causes leading zero issue
  onChange={(e) =>
    updateTier(index, { setup_price: parseFloat(e.target.value) || 0 })
  }
  placeholder="500"
/>
```

**After (fixed):**
```typescript
<Input
  id={`tier-setup-${index}`}
  type="text"
  inputMode="decimal"
  value={tier.setup_price === 0 ? '' : tier.setup_price.toString()}
  onChange={(e) => {
    const sanitized = e.target.value.replace(/[^0-9.]/g, '')
    updateTier(index, { setup_price: sanitized ? parseFloat(sanitized) : 0 })
  }}
  onBlur={(e) => {
    // Ensure valid number on blur
    const value = parseFloat(e.target.value) || 0
    updateTier(index, { setup_price: value })
  }}
  placeholder="500"
/>
```

### Example 2: Fixing Textarea Newlines

**Before (problematic):**
```typescript
// Source: /Users/aymanbaig/Desktop/hexos-main/features/blueprints/components/PricingTiersEditor.tsx lines 123-129

<Textarea
  id={`tier-features-${index}`}
  value={tier.features.join('\n')}
  onChange={(e) => updateFeatures(index, e.target.value)}
  placeholder="Automated keyword triggers&#10;Captures lead details&#10;Basic CRM integration"
  rows={4}
/>
```

**After (fixed):**
```typescript
<Textarea
  id={`tier-features-${index}`}
  value={tier.features.join('\n')}
  onChange={(e) => updateFeatures(index, e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.stopPropagation()  // Allow newline, prevent form submission
    }
  }}
  placeholder="Automated keyword triggers&#10;Captures lead details&#10;Basic CRM integration"
  rows={4}
/>
```

### Example 3: Price Field with $50 Step (if spinner desired)

```typescript
// Only use this pattern if spinner arrows are explicitly needed
<Input
  id="price"
  type="number"
  min="0"
  step="50"
  value={price || ''}  // Use empty string when null/0 to allow clearing
  onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : null)}
  placeholder="500"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| type="number" for all numeric fields | type="text" + inputMode for controlled inputs | React 16+ best practice | Fixes leading zero, better mobile keyboard |
| step="0.01" for currency | step="50" or no spinner | User feedback driven | Better UX for large dollar amounts |
| No special textarea handling | stopPropagation on Enter | Standard form pattern | Allows newlines in forms |

**Deprecated/outdated:**
- Using `valueAsNumber` property: Inconsistent cross-browser
- Using `parseFloat` in onChange without string handling: Loses formatting

## Files Requiring Changes

### Critical (Blueprint Pricing - User-Reported Issue)
| File | Issue | Fix Type |
|------|-------|----------|
| `features/blueprints/components/PricingTiersEditor.tsx` | Leading zero on price inputs + textarea newlines | Text input + stopPropagation |
| `features/blueprints/components/BlueprintForm.tsx` | Step attribute on basePrice | Add step="50" or convert to text |

### Audit Required (20 files with type="number")
| File | Field Types | Priority |
|------|-------------|----------|
| `app/(dashboard)/projects/new/page.tsx` | Client price | HIGH - price field |
| `features/admin/components/AdminOpportunitiesContent.tsx` | Estimated hours | LOW - hours OK as number |
| `features/admin/components/metrics/ExpenseLedger.tsx` | Amount | HIGH - currency |
| `features/admin/components/metrics/InvoiceManagement.tsx` | Qty, Price, Tax rate | HIGH - currency |
| `features/dev/components/payouts/SubmitPayoutForm.tsx` | Amount | HIGH - currency |
| `features/finances/components/RetainerManagement.tsx` | Amount | HIGH - currency |
| `features/inquiries/components/conversion/ConvertToProjectWizard.tsx` | Percentage | MEDIUM |
| `features/inquiries/components/deliverables/CounterOfferDialog.tsx` | Counter price | HIGH - currency |
| `features/inquiries/components/deliverables/DeliverableRow.tsx` | Price | HIGH - currency |
| `features/inquiries/components/steps/CustomProposal.tsx` | Budget amount | HIGH - currency |
| `features/project-initiation/components/steps/DeliverablesStep.tsx` | Price | HIGH - currency |
| `features/projects/components/delays/DelayMarkerDialog.tsx` | Days | LOW - small integers |
| `features/projects/components/scope/ScopeChangeDialog.tsx` | Hours, Days, Cost | MIXED |
| `features/projects/components/tabs/DeliverablesTab.tsx` | Hours | LOW - step=0.5 is fine |
| `features/projects/components/tabs/ProjectInfoTab.tsx` | Prices (3 fields) | HIGH - currency |
| `features/settings/components/AvailabilityControl.tsx` | Hours, Max projects | LOW - small integers |

**Note:** `features/admin/components/metrics/tabs/TeamTab.tsx` and `features/admin/components/metrics/tabs/ProjectsTab.tsx` use `type="number"` on XAxis in Recharts, not form inputs - no changes needed.

## Open Questions

1. **Should all price fields use $50 step or no spinner at all?**
   - What we know: User requested $50 step for price fields
   - What's unclear: Whether spinner arrows are desired at all vs. just typed input
   - Recommendation: Convert to text input pattern (no spinner) unless user explicitly wants spinners

2. **Should hours fields get special step values?**
   - What we know: Some use step="0.5", some use default
   - What's unclear: Business requirement for hour precision
   - Recommendation: Keep step="0.5" for hours, step="1" for days/counts

## Sources

### Primary (HIGH confidence)
- Codebase analysis - Direct inspection of all 20 files with type="number"
- `/Users/aymanbaig/Desktop/hexos-main/features/inquiries/components/QuickPricingEditor.tsx` - Working pattern already in codebase
- `/Users/aymanbaig/Desktop/hexos-main/final-polish-ayman` - User-reported issues

### Secondary (MEDIUM confidence)
- [React GitHub Issue #9402](https://github.com/facebook/react/issues/9402) - Leading zeros in controlled number inputs
- [React GitHub Issue #11021](https://github.com/facebook/react/issues/11021) - Leading zeros with integer values
- [MDN input type="number"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number) - Step attribute documentation
- [react-hook-form Discussion #2549](https://github.com/orgs/react-hook-form/discussions/2549) - Textarea Enter key handling

### Tertiary (LOW confidence)
- General web search results on React number input best practices 2025

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing patterns in codebase
- Architecture: HIGH - Pattern already proven in QuickPricingEditor
- Pitfalls: HIGH - Issues confirmed via user feedback and React GitHub issues

**Research date:** 2026-01-19
**Valid until:** 60 days (stable patterns, React 19 specific)
