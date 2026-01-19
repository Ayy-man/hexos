'use client'

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { format } from 'date-fns'
import { plateNodesToPdfElements } from '../utils/plateNodesToPdf'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #0891b2',
    paddingBottom: 20,
  },
  partnerLogo: {
    maxWidth: 150,
    maxHeight: 50,
    marginBottom: 16,
    objectFit: 'contain' as const,
  },
  headerTitle: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  date: {
    fontSize: 11,
    color: '#6b7280',
  },
  blueprintSection: {
    backgroundColor: '#f9fafb',
    padding: 16,
    marginBottom: 24,
    borderRadius: 4,
  },
  blueprintLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  blueprintName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  blueprintDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    marginBottom: 24,
  },
  pricingSection: {
    backgroundColor: '#ecfeff',
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 4,
    borderLeft: '4px solid #0891b2',
  },
  pricingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  pricingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 8,
  },
  pricingNotes: {
    fontSize: 11,
    color: '#4b5563',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
  },
  footerBrand: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: '#9ca3af',
  },
})

interface ProposalPDFProps {
  proposal: {
    id: string
    prospect_company_name: string | null
    partner_name: string
    created_at: string
    price_dfy: number | null
    pricing_notes: string | null
    blueprint: { name: string; description: string | null } | null
    partnerLogo?: string | null
  }
  documentContent: unknown
}

export function ProposalPDF({ proposal, documentContent }: ProposalPDFProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const contentElements = documentContent && Array.isArray(documentContent)
    ? plateNodesToPdfElements(documentContent)
    : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {proposal.partnerLogo && (
            <Image src={proposal.partnerLogo} style={styles.partnerLogo} />
          )}
          <Text style={styles.headerTitle}>Proposal</Text>
          <Text style={styles.companyName}>
            {proposal.prospect_company_name || 'Your Project'}
          </Text>
          <Text style={styles.date}>
            Prepared {format(new Date(proposal.created_at), 'MMMM d, yyyy')}
          </Text>
        </View>

        {/* Blueprint Info */}
        {proposal.blueprint && (
          <View style={styles.blueprintSection}>
            <Text style={styles.blueprintLabel}>Solution Type</Text>
            <Text style={styles.blueprintName}>{proposal.blueprint.name}</Text>
            {proposal.blueprint.description && (
              <Text style={styles.blueprintDescription}>
                {proposal.blueprint.description}
              </Text>
            )}
          </View>
        )}

        {/* Document Content */}
        <View style={styles.content}>
          {contentElements.length > 0 ? (
            contentElements
          ) : (
            <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>
              No content available.
            </Text>
          )}
        </View>

        {/* Pricing Section */}
        {(proposal.price_dfy || proposal.pricing_notes) && (
          <View style={styles.pricingSection}>
            <Text style={styles.pricingTitle}>Investment</Text>
            {proposal.price_dfy && (
              <Text style={styles.pricingValue}>
                {formatCurrency(proposal.price_dfy)}
              </Text>
            )}
            {proposal.pricing_notes && (
              <Text style={styles.pricingNotes}>{proposal.pricing_notes}</Text>
            )}
          </View>
        )}

        {/* Footer */}
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

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
