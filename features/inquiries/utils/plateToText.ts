/**
 * Converts Plate.js editor content (JSONB) to plain text for AI parsing.
 *
 * Plate.js stores content as an array of nodes with children.
 * Each node can have text content directly or nested in children.
 */

interface PlateNode {
  type?: string
  text?: string
  children?: PlateNode[]
  [key: string]: unknown
}

/**
 * Extract text from a single Plate node recursively
 */
function extractNodeText(node: PlateNode): string {
  // If this is a text node, return the text
  if (typeof node.text === 'string') {
    return node.text
  }

  // If this has children, recursively extract text from them
  if (Array.isArray(node.children)) {
    return node.children.map(extractNodeText).join('')
  }

  return ''
}

/**
 * Convert Plate.js content to plain text
 * Separates block-level elements with newlines
 */
export function plateToText(content: unknown): string {
  if (!content) return ''

  // Handle if content is not an array
  if (!Array.isArray(content)) {
    if (typeof content === 'string') return content
    return ''
  }

  const blocks = content as PlateNode[]

  return blocks
    .map((block) => {
      const text = extractNodeText(block)

      // Add extra newline for headings to maintain structure
      if (block.type?.startsWith('h')) {
        return `\n${text}\n`
      }

      // Add prefix for list items
      if (block.type === 'li' || block.type === 'lic') {
        return `• ${text}`
      }

      return text
    })
    .join('\n')
    .trim()
}

/**
 * Extract a specific section from the proposal content
 * Looks for headings containing certain keywords
 */
export function extractSection(
  content: unknown,
  sectionKeywords: string[]
): string {
  if (!content || !Array.isArray(content)) return ''

  const blocks = content as PlateNode[]
  const lowerKeywords = sectionKeywords.map((k) => k.toLowerCase())

  let inSection = false
  let sectionContent: string[] = []
  let sectionDepth = 0

  for (const block of blocks) {
    const text = extractNodeText(block).trim()
    const isHeading = block.type?.startsWith('h')
    const headingLevel = isHeading ? parseInt(block.type!.replace('h', '')) : 0

    // Check if this heading starts our target section
    if (isHeading) {
      const lowerText = text.toLowerCase()
      const matchesKeyword = lowerKeywords.some(
        (k) => lowerText.includes(k) || lowerText.startsWith(k)
      )

      if (matchesKeyword && !inSection) {
        // Start the section
        inSection = true
        sectionDepth = headingLevel
        sectionContent.push(text)
        continue
      }

      // If we're in a section and hit a same-or-higher level heading, end section
      if (inSection && headingLevel <= sectionDepth) {
        break
      }
    }

    // Collect content while in section
    if (inSection) {
      sectionContent.push(text)
    }
  }

  return sectionContent.join('\n').trim()
}

/**
 * Extract the deliverables section from proposal content
 * Tries multiple common section names
 */
export function extractDeliverablesSection(content: unknown): string {
  const deliverableKeywords = [
    'deliverables',
    'scope',
    "what's included",
    'whats included',
    'services',
    'features',
    'solution',
    'what we will deliver',
    'project scope',
  ]

  const pricingKeywords = [
    'pricing',
    'price',
    'cost',
    'investment',
    'package',
    'tier',
    'plan',
    'quote',
  ]

  const deliverablesSection = extractSection(content, deliverableKeywords)
  const pricingSection = extractSection(content, pricingKeywords)

  // Combine both sections so AI can match deliverables with prices
  const combinedSections = [deliverablesSection, pricingSection]
    .filter(Boolean)
    .join('\n\n--- PRICING SECTION ---\n\n')

  // If no sections found, return the full content for AI to parse
  if (!combinedSections) {
    return plateToText(content)
  }

  return combinedSections
}
