/**
 * Recall.ai API client singleton
 *
 * Lightweight fetch-based client for Recall.ai bot management
 * Based on lib/email/resend.ts pattern
 *
 * Requires RECALL_API_KEY environment variable
 * Optional RECALL_REGION environment variable (defaults to us-west-2)
 */

export const RECALL_API_BASE_URL =
  process.env.RECALL_REGION
    ? `https://${process.env.RECALL_REGION}.recall.ai/api/v1`
    : 'https://us-west-2.recall.ai/api/v1'

function getApiKey(): string {
  const key = process.env.RECALL_API_KEY
  if (!key) throw new Error('RECALL_API_KEY is not set')
  return key
}

async function recallFetch(path: string, options: RequestInit = {}) {
  const url = `${RECALL_API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Recall API error ${response.status}: ${errorBody}`)
  }

  return response.json()
}

export const recall = {
  /**
   * Create a bot to join a meeting
   * @param params - Bot creation parameters
   * @returns Bot object with id and status
   */
  createBot(params: {
    meeting_url: string
    bot_name?: string
    recording_config?: Record<string, unknown>
  }) {
    return recallFetch('/bot/', {
      method: 'POST',
      body: JSON.stringify({
        meeting_url: params.meeting_url,
        bot_name: params.bot_name || 'Hexos Notetaker',
        recording_config: params.recording_config || {
          transcript: {
            provider: { meeting_captions: {} }
          }
        },
      }),
    })
  },

  /**
   * Get bot details and status
   * @param botId - Bot ID from createBot response
   * @returns Bot object with current status
   */
  getBot(botId: string) {
    return recallFetch(`/bot/${botId}/`)
  },

  /**
   * Get transcript from a completed recording
   * @param botId - Bot ID from createBot response
   * @returns Transcript with speaker segments
   */
  getBotTranscript(botId: string) {
    return recallFetch(`/bot/${botId}/transcript/`)
  },
}
