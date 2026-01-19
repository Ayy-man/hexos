'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, Upload, X, ImageIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagInput } from '@/features/blueprints/components/TagInput'
import { IconPicker } from '@/features/blueprints/components/IconPicker'
import { useImageUpload } from '@/components/hooks/use-image-upload'
import {
  createCaseStudyAction,
  updateCaseStudyAction,
  uploadCaseStudyImageAction,
} from '../actions/caseStudyActions'
import type { CaseStudy, CreateCaseStudyInput } from '@/lib/api/case-studies'

interface CaseStudyFormProps {
  caseStudy?: CaseStudy
  mode: 'create' | 'edit'
  blueprints?: { id: string; name: string; icon: string | null }[]
}

export function CaseStudyForm({ caseStudy, mode, blueprints = [] }: CaseStudyFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [name, setName] = useState(caseStudy?.name || '')
  const [description, setDescription] = useState(caseStudy?.description || '')
  const [icon, setIcon] = useState(caseStudy?.icon || '📋')
  const [clientName, setClientName] = useState(caseStudy?.client_name || '')
  const [industry, setIndustry] = useState(caseStudy?.industry || '')
  const [challenge, setChallenge] = useState(caseStudy?.challenge || '')
  const [solution, setSolution] = useState(caseStudy?.solution || '')
  const [results, setResults] = useState(caseStudy?.results || '')
  const [tags, setTags] = useState<string[]>(caseStudy?.tags || [])
  const [blueprintId, setBlueprintId] = useState<string | null>(caseStudy?.blueprint_id || null)
  const [isPublished, setIsPublished] = useState(caseStudy?.status === 'published')
  const [imageUrl, setImageUrl] = useState<string | null>(caseStudy?.image_url || null)

  const {
    previewUrl,
    file,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalImageUrl = imageUrl

    // Upload new image if selected
    if (file) {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        finalImageUrl = await uploadCaseStudyImageAction(formData)
      } catch (error) {
        console.error('Failed to upload image:', error)
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    const data: CreateCaseStudyInput = {
      name,
      description: description || undefined,
      icon,
      client_name: clientName || undefined,
      industry: industry || undefined,
      challenge: challenge || undefined,
      solution: solution || undefined,
      results: results || undefined,
      tags,
      blueprint_id: blueprintId || undefined,
      image_url: finalImageUrl || undefined,
      status: isPublished ? 'published' : 'draft',
    }

    startTransition(async () => {
      if (mode === 'create') {
        await createCaseStudyAction(data)
      } else if (caseStudy) {
        await updateCaseStudyAction(caseStudy.id, data)
        router.refresh()
      }
    })
  }

  const handleRemoveImage = () => {
    handleRemove()
    setImageUrl(null)
  }

  const displayImage = previewUrl || imageUrl

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Name and description of the case study</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <Label>Icon</Label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., E-commerce Automation Success"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief overview of this case study..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., E-commerce, SaaS, Healthcare"
              />
            </div>
          </div>

          <div className="space-y-2">
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (e.g., automation, lead-gen, ai)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Cover Image */}
      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>Add a featured image for this case study</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {displayImage ? (
            <div className="relative w-full max-w-md">
              <div className="relative aspect-video rounded-lg overflow-hidden border">
                <Image
                  src={displayImage}
                  alt="Case study cover"
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleThumbnailClick}
              className="h-32 w-full max-w-md border-dashed"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <span>Click to upload image</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Challenge, Solution, Results */}
      <Card>
        <CardHeader>
          <CardTitle>Case Study Details</CardTitle>
          <CardDescription>The challenge, solution, and results achieved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="challenge">Challenge</Label>
            <Textarea
              id="challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="What problem was the client facing?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solution">Solution</Label>
            <Textarea
              id="solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="How did we solve it?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="results">Results</Label>
            <Textarea
              id="results"
              value={results}
              onChange={(e) => setResults(e.target.value)}
              placeholder="What were the outcomes and metrics?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Related Blueprint */}
      <Card>
        <CardHeader>
          <CardTitle>Related Blueprint</CardTitle>
          <CardDescription>Link to a blueprint that was used for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={blueprintId || 'none'}
            onValueChange={(value) => setBlueprintId(value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a blueprint (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No blueprint linked</SelectItem>
              {blueprints.map((bp) => (
                <SelectItem key={bp.id} value={bp.id}>
                  {bp.icon && <span className="mr-2">{bp.icon}</span>}
                  {bp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
              <Label htmlFor="published" className="cursor-pointer">
                {isPublished ? 'Published (visible to DFY partners)' : 'Draft (hidden)'}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending || isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isUploading || !name}>
                {(isPending || isUploading) ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isUploading ? 'Uploading...' : mode === 'create' ? 'Create Case Study' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor Note */}
      {mode === 'create' && (
        <p className="text-sm text-muted-foreground text-center">
          After creating the case study, you can add the full content using the rich text editor.
        </p>
      )}
    </form>
  )
}
