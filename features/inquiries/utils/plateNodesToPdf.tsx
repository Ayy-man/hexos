import React from 'react'
import { Text, Link, View, StyleSheet } from '@react-pdf/renderer'

// Styles for PDF elements
const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 20,
    color: '#111827',
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    color: '#1f2937',
  },
  h3: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
    color: '#374151',
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 1.6,
    color: '#4b5563',
  },
  blockquote: {
    fontSize: 11,
    marginBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
    fontStyle: 'italic',
    color: '#6b7280',
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    color: '#0891b2',
    textDecoration: 'underline',
  },
  listItem: {
    fontSize: 11,
    marginBottom: 4,
    paddingLeft: 16,
    color: '#4b5563',
  },
  codeBlock: {
    fontSize: 10,
    backgroundColor: '#f3f4f6',
    padding: 8,
    marginBottom: 8,
    fontFamily: 'Courier',
    color: '#1f2937',
  },
})

interface PlateNode {
  type?: string
  text?: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  url?: string
  children?: PlateNode[]
}

// Convert text node with marks to PDF Text element
function renderTextNode(node: PlateNode, key: number): React.ReactNode {
  if (node.text === undefined) return null

  const textStyle: any = {}
  if (node.bold) textStyle.fontWeight = 'bold'
  if (node.italic) textStyle.fontStyle = 'italic'
  if (node.code) {
    textStyle.fontFamily = 'Courier'
    textStyle.backgroundColor = '#f3f4f6'
    textStyle.fontSize = 10
  }

  return (
    <Text key={key} style={textStyle}>
      {node.text}
    </Text>
  )
}

// Convert children array to PDF elements
function renderChildren(children: PlateNode[] | undefined): React.ReactNode[] {
  if (!children) return []

  return children.map((child, index) => {
    // Text node
    if (child.text !== undefined) {
      return renderTextNode(child, index)
    }

    // Link node
    if (child.type === 'a' && child.url) {
      return (
        <Link key={index} src={child.url} style={styles.link}>
          {renderChildren(child.children)}
        </Link>
      )
    }

    // Nested element
    if (child.children) {
      return <Text key={index}>{renderChildren(child.children)}</Text>
    }

    return null
  })
}

// Main function to convert Plate nodes to PDF elements
export function plateNodesToPdfElements(nodes: PlateNode[]): React.ReactNode[] {
  if (!nodes || !Array.isArray(nodes)) return []

  return nodes.map((node, index) => {
    const key = `node-${index}`

    switch (node.type) {
      case 'h1':
        return (
          <Text key={key} style={styles.h1}>
            {renderChildren(node.children)}
          </Text>
        )

      case 'h2':
        return (
          <Text key={key} style={styles.h2}>
            {renderChildren(node.children)}
          </Text>
        )

      case 'h3':
        return (
          <Text key={key} style={styles.h3}>
            {renderChildren(node.children)}
          </Text>
        )

      case 'blockquote':
        return (
          <View key={key} style={styles.blockquote}>
            <Text>{renderChildren(node.children)}</Text>
          </View>
        )

      case 'code_block':
        return (
          <View key={key} style={styles.codeBlock}>
            <Text>{renderChildren(node.children)}</Text>
          </View>
        )

      case 'ul':
      case 'ol':
        return (
          <View key={key}>
            {node.children?.map((item, i) => (
              <Text key={i} style={styles.listItem}>
                {node.type === 'ol' ? `${i + 1}. ` : '• '}
                {renderChildren(item.children)}
              </Text>
            ))}
          </View>
        )

      case 'li':
        return (
          <Text key={key} style={styles.listItem}>
            • {renderChildren(node.children)}
          </Text>
        )

      case 'a':
        return (
          <Link key={key} src={node.url || '#'} style={styles.link}>
            {renderChildren(node.children)}
          </Link>
        )

      case 'p':
      default:
        // Skip empty paragraphs
        const hasContent = node.children?.some(
          (child) => child.text && child.text.trim() !== ''
        )
        if (!hasContent && node.type === 'p') {
          return <Text key={key} style={{ marginBottom: 4 }}> </Text>
        }

        return (
          <Text key={key} style={styles.paragraph}>
            {renderChildren(node.children)}
          </Text>
        )
    }
  })
}
