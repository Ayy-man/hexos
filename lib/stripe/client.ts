'use client'

import { loadStripe } from '@stripe/stripe-js'
import type { Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export async function redirectToCheckout(sessionUrl: string) {
  // Use direct redirect for Checkout sessions
  window.location.href = sessionUrl
}
