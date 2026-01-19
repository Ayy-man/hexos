/**
 * Convert Plate editor content to markdown format
 * Supports: headings, paragraphs, lists, links, bold, italic, code, blockquotes
 */

type SlateNode = {
  type?: string
  text?: string
  children?: SlateNode[]
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  url?: string
  checked?: boolean
  level?: number
  [key: string]: unknown
}

function serializeLeaf(node: SlateNode): string {
  let text = node.text || ''

  if (!text) return ''

  // Apply marks in correct order for nesting
  if (node.code) {
    text = `\`${text}\``
  }
  if (node.strikethrough) {
    text = `~~${text}~~`
  }
  if (node.bold && node.italic) {
    text = `***${text}***`
  } else if (node.bold) {
    text = `**${text}**`
  } else if (node.italic) {
    text = `*${text}*`
  }

  return text
}

function serializeNode(node: SlateNode, indent = 0): string {
  // Text node (leaf)
  if (node.text !== undefined) {
    return serializeLeaf(node)
  }

  // Element nodes with children
  const children = node.children || []
  const childText = children.map(child => serializeNode(child, indent)).join('')

  switch (node.type) {
    // Headings
    case 'h1':
      return `# ${childText}\n\n`
    case 'h2':
      return `## ${childText}\n\n`
    case 'h3':
      return `### ${childText}\n\n`
    case 'h4':
      return `#### ${childText}\n\n`
    case 'h5':
      return `##### ${childText}\n\n`
    case 'h6':
      return `###### ${childText}\n\n`

    // Lists
    case 'ul':
      return children.map((child, i) => serializeNode(child, indent)).join('') + '\n'
    case 'ol':
      return children.map((child, i) => {
        const prefix = `${i + 1}. `
        return prefix + serializeNode(child, indent).replace(/^- /, '')
      }).join('') + '\n'
    case 'li':
      const prefix = '  '.repeat(indent)
      return `${prefix}- ${childText}\n`
    case 'lic': // List item content
      return childText

    // Checkbox list
    case 'action_item':
      const checkbox = node.checked ? '[x]' : '[ ]'
      return `- ${checkbox} ${childText}\n`

    // Quote
    case 'blockquote':
      return `> ${childText.split('\n').join('\n> ')}\n\n`

    // Code block
    case 'code_block':
      const lang = (node.lang as string) || ''
      return `\`\`\`${lang}\n${childText}\n\`\`\`\n\n`
    case 'code_line':
      return childText + '\n'

    // Link
    case 'a':
      return `[${childText}](${node.url || ''})`

    // Horizontal rule
    case 'hr':
      return '---\n\n'

    // Table (simplified)
    case 'table':
      return children.map(child => serializeNode(child, indent)).join('') + '\n'
    case 'tr':
      const cells = children.map(child => serializeNode(child, indent)).join(' | ')
      return `| ${cells} |\n`
    case 'td':
    case 'th':
      return childText

    // Callout (as blockquote with emoji)
    case 'callout':
      const icon = (node.icon as string) || '💡'
      return `> ${icon} ${childText}\n\n`

    // Default: paragraph
    case 'p':
    default:
      if (!childText.trim()) return '\n'
      return `${childText}\n\n`
  }
}

/**
 * Convert Plate/Slate editor content to markdown
 */
export function editorToMarkdown(content: unknown): string {
  if (!content || !Array.isArray(content)) {
    return ''
  }

  const nodes = content as SlateNode[]
  const markdown = nodes.map(node => serializeNode(node)).join('')

  // Clean up excessive newlines
  return markdown
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
