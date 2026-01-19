'use client'

import * as React from 'react'

import type { TComboboxInputElement, TMentionElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'

import { getMentionOnSelectItem } from '@platejs/mention'
import { IS_APPLE, KEYS } from 'platejs'
import {
  PlateElement,
  useFocused,
  useReadOnly,
  useSelected,
} from 'platejs/react'

import { cn } from '@/lib/utils'
import { useMounted } from '@/hooks/use-mounted'
import { User, Package } from 'lucide-react'

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from '@/components/ui/inline-combobox'

// Types for mentionable items
export interface MentionableItem {
  key: string
  text: string
  type: 'user' | 'deliverable'
  data?: {
    email?: string
    status?: string
  }
}

// Context for providing mentionables to the editor
interface MentionablesContextValue {
  users: MentionableItem[]
  deliverables: MentionableItem[]
  isLoading: boolean
}

const MentionablesContext = React.createContext<MentionablesContextValue>({
  users: [],
  deliverables: [],
  isLoading: true,
})

export function MentionablesProvider({
  children,
  users,
  deliverables,
  isLoading = false,
}: {
  children: React.ReactNode
  users: MentionableItem[]
  deliverables: MentionableItem[]
  isLoading?: boolean
}) {
  return (
    <MentionablesContext.Provider value={{ users, deliverables, isLoading }}>
      {children}
    </MentionablesContext.Provider>
  )
}

export function useMentionables() {
  return React.useContext(MentionablesContext)
}

// Mention element (rendered mention chip)
export function GameplanMentionElement(
  props: PlateElementProps<TMentionElement> & {
    prefix?: string
  }
) {
  const element = props.element
  const isUser = element.type === 'mention' && element.trigger === '@'
  const isDeliverable = element.type === 'mention' && element.trigger === '#'

  const selected = useSelected()
  const focused = useFocused()
  const mounted = useMounted()
  const readOnly = useReadOnly()

  return (
    <PlateElement
      {...props}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline font-medium text-sm',
        isUser && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        isDeliverable && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        !isUser && !isDeliverable && 'bg-muted',
        !readOnly && 'cursor-pointer',
        selected && focused && 'ring-2 ring-ring',
        element.children[0][KEYS.bold] === true && 'font-bold',
        element.children[0][KEYS.italic] === true && 'italic',
        element.children[0][KEYS.underline] === true && 'underline'
      )}
      attributes={{
        ...props.attributes,
        contentEditable: false,
        'data-slate-value': element.value,
        'data-mention-type': isUser ? 'user' : isDeliverable ? 'deliverable' : 'unknown',
        draggable: true,
      }}
    >
      {isUser && <User className="h-3 w-3" />}
      {isDeliverable && <Package className="h-3 w-3" />}
      {mounted && IS_APPLE ? (
        <>
          {props.children}
          {props.prefix}
          {element.value}
        </>
      ) : (
        <>
          {props.prefix}
          {element.value}
          {props.children}
        </>
      )}
    </PlateElement>
  )
}

const onSelectItem = getMentionOnSelectItem()

// User mention input (@)
export function UserMentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const { editor, element } = props
  const [search, setSearch] = React.useState('')
  const { users, isLoading } = useMentionables()

  const filteredUsers = React.useMemo(() => {
    if (!search) return users
    const lowerSearch = search.toLowerCase()
    return users.filter(
      (u) =>
        u.text.toLowerCase().includes(lowerSearch) ||
        u.data?.email?.toLowerCase().includes(lowerSearch)
    )
  }, [users, search])

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        value={search}
        element={element}
        setValue={setSearch}
        showTrigger={false}
        trigger="@"
      >
        <span className="inline-block rounded-md bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2">
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5">
          {isLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              <InlineComboboxEmpty>No team members found</InlineComboboxEmpty>

              <InlineComboboxGroup>
                <InlineComboboxGroupLabel>Team Members</InlineComboboxGroupLabel>
                {filteredUsers.map((item) => (
                  <InlineComboboxItem
                    key={item.key}
                    value={item.text}
                    onClick={() => onSelectItem(editor, item, search)}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{item.text}</span>
                      {item.data?.email && (
                        <span className="text-xs text-muted-foreground">{item.data.email}</span>
                      )}
                    </div>
                  </InlineComboboxItem>
                ))}
              </InlineComboboxGroup>
            </>
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}

// Deliverable mention input (#)
export function DeliverableMentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const { editor, element } = props
  const [search, setSearch] = React.useState('')
  const { deliverables, isLoading } = useMentionables()

  const filteredDeliverables = React.useMemo(() => {
    if (!search) return deliverables
    const lowerSearch = search.toLowerCase()
    return deliverables.filter((d) => d.text.toLowerCase().includes(lowerSearch))
  }, [deliverables, search])

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox
        value={search}
        element={element}
        setValue={setSearch}
        showTrigger={false}
        trigger="#"
      >
        <span className="inline-block rounded-md bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2">
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className="my-1.5">
          {isLoading ? (
            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <>
              <InlineComboboxEmpty>No deliverables found</InlineComboboxEmpty>

              <InlineComboboxGroup>
                <InlineComboboxGroupLabel>Deliverables</InlineComboboxGroupLabel>
                {filteredDeliverables.map((item) => (
                  <InlineComboboxItem
                    key={item.key}
                    value={item.text}
                    onClick={() => onSelectItem(editor, item, search)}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{item.text}</span>
                    {item.data?.status && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {item.data.status}
                      </span>
                    )}
                  </InlineComboboxItem>
                ))}
              </InlineComboboxGroup>
            </>
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
