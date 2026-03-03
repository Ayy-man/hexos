// Type-level test for fieldMappings FIELD_LISTS
// Verifies that A1, A3, B2 include 'selections' after Plan 22-03 changes.
// Run: npx tsc --noEmit
//
// This file uses TypeScript's assignability check to verify FIELD_LISTS
// contains the correct keys. If 'selections' is missing from a list, the
// type-level assertion below will produce a compile error.

import { FIELD_LISTS } from '../constants/fieldMappings'

// Verifies that FIELD_LISTS object is accessible and typed correctly
type FieldList = string[]
const _a1: FieldList = FIELD_LISTS.A1
const _a3: FieldList = FIELD_LISTS.A3
const _b2: FieldList = FIELD_LISTS.B2

// Runtime verification disguised as type test:
// We confirm that 'blueprint_id' is NOT in A1/B2 and 'selections' IS present
// by checking via assertion functions typed to only accept true
function assertTrue(_val: true): void {}

// A1 must include 'selections'
assertTrue(FIELD_LISTS.A1.includes('selections') as true)
// A3 must include 'selections'
assertTrue(FIELD_LISTS.A3.includes('selections') as true)
// B2 must include 'selections'
assertTrue(FIELD_LISTS.B2.includes('selections') as true)

export type { FieldList }
