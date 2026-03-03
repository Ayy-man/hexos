'use client'

import { useState } from 'react'
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxItem,
  ComboboxSeparator,
} from '@/components/ui/combobox'
import type { SelectionItem } from '@/features/inquiries/types'
import type { BlueprintSummary } from '@/lib/api/blueprints'
import type { CaseStudy } from '@/lib/api/case-studies'
import { BookOpen, FileSearch } from 'lucide-react'

interface ItemMultiSelectProps {
  blueprints: BlueprintSummary[]
  caseStudies: CaseStudy[]
  value: SelectionItem[]
  onChange: (items: SelectionItem[]) => void
  onFocusedItemChange?: (item: SelectionItem | null) => void
  placeholder?: string
}

export function ItemMultiSelect({
  blueprints,
  caseStudies,
  value,
  onChange,
  onFocusedItemChange,
  placeholder,
}: ItemMultiSelectProps) {
  const [inputValue, setInputValue] = useState('')

  // Derive string[] of prefixed IDs from value prop
  const comboboxValue = value.map((s) =>
    s.type === 'blueprint' ? 'bp:' + s.id : 'cs:' + s.id
  )

  const handleValueChange = (prefixedIds: string[]) => {
    const newSelections = prefixedIds
      .map((prefixedId) => {
        if (prefixedId.startsWith('bp:')) {
          const id = prefixedId.slice(3)
          const bp = blueprints.find((b) => b.id === id)
          return bp ? { type: 'blueprint' as const, id: bp.id, name: bp.name } : null
        } else {
          const id = prefixedId.slice(3)
          const cs = caseStudies.find((c) => c.id === id)
          return cs ? { type: 'case_study' as const, id: cs.id, name: cs.name } : null
        }
      })
      .filter((s): s is SelectionItem => s !== null)

    onChange(newSelections)

    if (onFocusedItemChange) {
      const first = newSelections[0] || null
      onFocusedItemChange(first)
    }
  }

  return (
    <Combobox
      multiple
      value={comboboxValue}
      onValueChange={handleValueChange}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
    >
      <ComboboxChips>
        {value.map((item) => (
          <ComboboxChip key={item.type + ':' + item.id} value={item.type === 'blueprint' ? 'bp:' + item.id : 'cs:' + item.id}>
            {item.type === 'blueprint' ? (
              <BookOpen className="h-3 w-3 mr-1" />
            ) : (
              <FileSearch className="h-3 w-3 mr-1" />
            )}
            {item.name}
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          placeholder={placeholder ?? 'Search blueprints & case studies...'}
        />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxList>
          {blueprints.length > 0 && (
            <ComboboxGroup>
              <ComboboxLabel>Blueprints</ComboboxLabel>
              {blueprints.map((bp) => (
                <ComboboxItem key={'bp:' + bp.id} value={'bp:' + bp.id}>
                  {bp.icon && <span className="mr-1">{bp.icon}</span>}
                  {bp.name}
                  {bp.pricing_tiers.length > 0 && (
                    <span className="text-muted-foreground text-xs ml-auto">
                      {bp.pricing_tiers.length} tier{bp.pricing_tiers.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          )}
          {blueprints.length > 0 && caseStudies.length > 0 && <ComboboxSeparator />}
          {caseStudies.length > 0 && (
            <ComboboxGroup>
              <ComboboxLabel>Case Studies</ComboboxLabel>
              {caseStudies.map((cs) => (
                <ComboboxItem key={'cs:' + cs.id} value={'cs:' + cs.id}>
                  {cs.icon && <span className="mr-1">{cs.icon}</span>}
                  {cs.name}
                  {cs.client_name && (
                    <span className="text-muted-foreground text-xs ml-auto">{cs.client_name}</span>
                  )}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          )}
          {blueprints.length === 0 && caseStudies.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No items available</p>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
