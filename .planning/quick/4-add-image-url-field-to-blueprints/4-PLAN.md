---
phase: quick-4
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260303000002_blueprints_image.sql
  - lib/api/blueprints.ts
  - features/blueprints/actions/blueprintActions.ts
  - features/blueprints/components/BlueprintForm.tsx
  - features/blueprints/components/BlueprintCard.tsx
  - app/(dashboard)/blueprints/page.tsx
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Admin can upload a cover image when creating or editing a blueprint"
    - "Uploaded image displays on BlueprintCard in the list view"
    - "Image persists across page refresh (stored in Supabase storage + DB)"
    - "Removing an image clears it from the form and saves null to DB"
  artifacts:
    - path: "supabase/migrations/20260303000002_blueprints_image.sql"
      provides: "image_url TEXT column on blueprints table"
      contains: "ALTER TABLE blueprints ADD COLUMN"
    - path: "lib/api/blueprints.ts"
      provides: "uploadBlueprintImage function + updated types and CRUD"
      exports: ["uploadBlueprintImage"]
    - path: "features/blueprints/actions/blueprintActions.ts"
      provides: "uploadBlueprintImageAction server action"
      exports: ["uploadBlueprintImageAction"]
    - path: "features/blueprints/components/BlueprintForm.tsx"
      provides: "Image upload UI using useImageUpload hook"
    - path: "features/blueprints/components/BlueprintCard.tsx"
      provides: "Image display above card header"
  key_links:
    - from: "features/blueprints/components/BlueprintForm.tsx"
      to: "features/blueprints/actions/blueprintActions.ts"
      via: "uploadBlueprintImageAction call on submit"
      pattern: "uploadBlueprintImageAction"
    - from: "features/blueprints/actions/blueprintActions.ts"
      to: "lib/api/blueprints.ts"
      via: "uploadBlueprintImage function call"
      pattern: "uploadBlueprintImage"
    - from: "app/(dashboard)/blueprints/page.tsx"
      to: "features/blueprints/components/BlueprintCard.tsx"
      via: "image_url prop passing"
      pattern: "image_url="
---

<objective>
Add image_url support to the blueprints feature -- DB column, TypeScript types, storage upload, form UI, and card display. Copy the exact pattern already established in the case studies feature.

Purpose: Blueprints currently lack a cover image. Case studies already have this feature with a proven pattern (Supabase storage upload, useImageUpload hook, form UI, card display). This task replicates that pattern for blueprints.

Output: Full image_url support from database through UI for blueprints.
</objective>

<execution_context>
@/Users/aymanbaig/.claude/get-shit-done/workflows/execute-plan.md
@/Users/aymanbaig/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@lib/api/case-studies.ts (reference pattern for uploadCaseStudyImage, types with image_url)
@features/case-studies/actions/caseStudyActions.ts (reference pattern for uploadCaseStudyImageAction)
@features/case-studies/components/CaseStudyForm.tsx (reference pattern for image upload UI with useImageUpload hook)
@features/case-studies/components/CaseStudyCard.tsx (reference pattern for image display on card)
@components/hooks/use-image-upload.tsx (reusable hook -- already exists, just import it)

<interfaces>
<!-- Existing patterns to replicate from case studies -->

From lib/api/case-studies.ts (upload function to copy):
```typescript
export async function uploadCaseStudyImage(file: File): Promise<string> {
  // Uses supabase.storage.from('general-purpose').upload(`case-studies/${Date.now()}.${ext}`)
  // Returns publicUrl
}
```

From features/case-studies/actions/caseStudyActions.ts (server action to copy):
```typescript
export async function uploadCaseStudyImageAction(formData: FormData): Promise<string> {
  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')
  return uploadCaseStudyImage(file)
}
```

From components/hooks/use-image-upload.tsx (already exists, just import):
```typescript
export function useImageUpload({ onUpload }: UseImageUploadProps = {}): {
  previewUrl: string | null;
  fileName: string | null;
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleThumbnailClick: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemove: () => void;
}
```

From lib/api/blueprints.ts (current types to modify):
```typescript
export interface Blueprint {
  id: string; name: string; description: string | null; /* ... */ icon: string | null; loom_video_url: string | null; /* ... */
}
export interface BlueprintSummary {
  id: string; name: string; /* ... */ icon: string | null; pricing_tiers: PricingTier[]; loom_video_url: string | null;
}
export interface CreateBlueprintInput { name: string; /* ... */ icon?: string; loom_video_url?: string; }
export interface UpdateBlueprintInput { name?: string; /* ... */ icon?: string; loom_video_url?: string | null; }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: DB migration + API layer (types, CRUD, upload function, server action)</name>
  <files>supabase/migrations/20260303000002_blueprints_image.sql, lib/api/blueprints.ts, features/blueprints/actions/blueprintActions.ts</files>
  <action>
1. Create migration file `supabase/migrations/20260303000002_blueprints_image.sql`:
   ```sql
   ALTER TABLE blueprints ADD COLUMN IF NOT EXISTS image_url TEXT;
   ```

2. Update `lib/api/blueprints.ts`:
   - Add `image_url: string | null` to `Blueprint` interface (after `icon`)
   - Add `image_url: string | null` to `BlueprintSummary` interface (after `icon`)
   - Add `image_url?: string` to `CreateBlueprintInput` (after `icon`)
   - Add `image_url?: string | null` to `UpdateBlueprintInput` (after `icon`)
   - Add `image_url` to the SELECT clause in `getBlueprints()` — append it to the select string: `'id, name, description, base_price, estimated_hours, tags, status, icon, image_url, pricing_tiers, loom_video_url'`
   - In `createBlueprint()` insert object: add `image_url: input.image_url || null,` (after icon line)
   - In `updateBlueprint()`: add `if (input.image_url !== undefined) updateData.image_url = input.image_url` (after icon line)
   - In `duplicateBlueprint()`: add `image_url: original.image_url || undefined,` (after icon line)
   - Add `uploadBlueprintImage` function at the top of the file (after the import, before types), copying `uploadCaseStudyImage` from case-studies.ts but changing the path from `case-studies/` to `blueprints/`:
     ```typescript
     export async function uploadBlueprintImage(file: File): Promise<string> {
       const supabase = await createClient()
       const fileExt = file.name.split('.').pop()
       const fileName = `blueprints/${Date.now()}.${fileExt}`
       const { data, error } = await supabase.storage
         .from('general-purpose')
         .upload(fileName, file, { cacheControl: '3600', upsert: false })
       if (error) {
         console.error('Upload error:', error)
         throw new Error('Failed to upload image')
       }
       const { data: urlData } = supabase.storage
         .from('general-purpose')
         .getPublicUrl(data.path)
       return urlData.publicUrl
     }
     ```

3. Update `features/blueprints/actions/blueprintActions.ts`:
   - Add `uploadBlueprintImage` to the import from `@/lib/api/blueprints`
   - Add `uploadBlueprintImageAction` server action (copy pattern from caseStudyActions.ts):
     ```typescript
     export async function uploadBlueprintImageAction(formData: FormData): Promise<string> {
       const file = formData.get('file') as File
       if (!file) throw new Error('No file provided')
       return uploadBlueprintImage(file)
     }
     ```
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library/hexos-main && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>Migration file exists. Blueprint/BlueprintSummary types include image_url. getBlueprints SELECT includes image_url. createBlueprint/updateBlueprint/duplicateBlueprint handle image_url. uploadBlueprintImage and uploadBlueprintImageAction exist. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 2: BlueprintForm image upload UI + BlueprintCard image display + list page prop passing</name>
  <files>features/blueprints/components/BlueprintForm.tsx, features/blueprints/components/BlueprintCard.tsx, app/(dashboard)/blueprints/page.tsx</files>
  <action>
1. Update `features/blueprints/components/BlueprintForm.tsx` — copy the CaseStudyForm image upload pattern:
   - Add imports: `Image` from `next/image`, `Upload, X, ImageIcon` from `lucide-react` (keep existing lucide imports), `toast` from `sonner`, `useImageUpload` from `@/components/hooks/use-image-upload`, `uploadBlueprintImageAction` from `../actions/blueprintActions`
   - Add state: `const [isUploading, setIsUploading] = useState(false)` and `const [imageUrl, setImageUrl] = useState<string | null>(blueprint?.image_url || null)`
   - Initialize useImageUpload hook: `const { previewUrl, file, fileInputRef, handleThumbnailClick, handleFileChange, handleRemove } = useImageUpload()`
   - Change `handleSubmit` from sync to async (`async (e: React.FormEvent)`), add image upload before building data object (copy from CaseStudyForm lines 70-88):
     ```typescript
     let finalImageUrl = imageUrl
     if (file) {
       setIsUploading(true)
       try {
         const formData = new FormData()
         formData.append('file', file)
         finalImageUrl = await uploadBlueprintImageAction(formData)
       } catch (error) {
         console.error('Failed to upload image:', error)
         setIsUploading(false)
         return
       }
       setIsUploading(false)
     }
     ```
   - Add `image_url: finalImageUrl || undefined` to the `data` object
   - Add `handleRemoveImage` function: `const handleRemoveImage = () => { handleRemove(); setImageUrl(null) }`
   - Add `const displayImage = previewUrl || imageUrl`
   - Add a "Cover Image" Card section between "Basic Info" card and "Loom Video" card, copying the exact JSX pattern from CaseStudyForm.tsx lines 193-248 but changing "Case study cover" alt text to "Blueprint cover" and "case study" text to "blueprint"
   - Update Cancel button: add `isUploading` to disabled: `disabled={isPending || isUploading}`
   - Update Submit button: add `isUploading` to disabled: `disabled={isPending || isUploading || !name || !isValidLoom}`, show "Uploading..." text when isUploading, wrap spinner condition as `(isPending || isUploading)`
   - In edit mode success, add `toast.success('Blueprint saved!')` after `router.refresh()` (import toast from sonner)

2. Update `features/blueprints/components/BlueprintCard.tsx`:
   - Add `import Image from 'next/image'` and `import Link from 'next/link'` (Link already imported)
   - Add `image_url?: string | null` to `BlueprintCardProps` interface (after icon)
   - Add `image_url` to destructured props
   - Add image display inside Card, before CardHeader — copy from CaseStudyCard lines 39-50:
     ```tsx
     {image_url && (
       <Link href={`/blueprints/${id}`}>
         <div className="relative aspect-video w-full">
           <Image
             src={image_url}
             alt={name}
             fill
             className="object-cover group-hover:scale-105 transition-transform duration-300"
           />
         </div>
       </Link>
     )}
     ```
   - Add `overflow-hidden` to the Card className to match CaseStudyCard: `className="group hover:shadow-md transition-shadow overflow-hidden"`

3. Update `app/(dashboard)/blueprints/page.tsx`:
   - Add `image_url={blueprint.image_url}` prop to the BlueprintCard component in the grid map (after `icon={blueprint.icon}`)
  </action>
  <verify>
    <automated>cd /Users/aymanbaig/Desktop/Manual\ Library/hexos-main && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>BlueprintForm has Cover Image card with upload/preview/remove UI using useImageUpload hook. BlueprintCard displays image above header when image_url present. Blueprints list page passes image_url to cards. TypeScript compiles clean.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes with zero errors
2. Migration file exists at `supabase/migrations/20260303000002_blueprints_image.sql`
3. `grep -n "image_url" lib/api/blueprints.ts` shows hits in types, getBlueprints SELECT, create, update, duplicate, and upload function
4. `grep -n "uploadBlueprintImageAction" features/blueprints/actions/blueprintActions.ts` shows the server action
5. `grep -n "useImageUpload\|displayImage\|Cover Image" features/blueprints/components/BlueprintForm.tsx` shows image upload UI
6. `grep -n "image_url" features/blueprints/components/BlueprintCard.tsx` shows image display
7. `grep -n "image_url" app/\(dashboard\)/blueprints/page.tsx` shows prop passing
</verification>

<success_criteria>
- DB migration adds image_url TEXT column to blueprints table
- All 4 TypeScript interfaces updated with image_url
- uploadBlueprintImage API function and uploadBlueprintImageAction server action exist
- getBlueprints, createBlueprint, updateBlueprint, duplicateBlueprint all handle image_url
- BlueprintForm shows Cover Image card with upload/preview/remove (identical UX to CaseStudyForm)
- BlueprintCard displays cover image above header when present (identical UX to CaseStudyCard)
- Blueprints list page passes image_url prop to BlueprintCard
- TypeScript compiles with zero errors
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-image-url-field-to-blueprints/4-SUMMARY.md`
</output>
