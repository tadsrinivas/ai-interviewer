/**
 * Tavus CVI integration
 * Docs: https://docs.tavus.io/api-reference/conversations/create-conversation
 *
 * IMPORTANT: Tavus's API may evolve. Verify endpoints against current docs.
 * As of build time: POST https://tavusapi.com/v2/conversations
 */

const TAVUS_API_BASE = 'https://tavusapi.com/v2';

interface CreateConversationParams {
  systemPrompt: string;
  conversationName: string;
  candidateName: string;
  callbackUrl?: string;
  maxDurationSeconds?: number;
}

interface TavusConversationResponse {
  conversation_id: string;
  conversation_name: string;
  conversation_url: string;
  status: string;
  created_at: string;
}

/**
 * Creates a Tavus conversation for an interview.
 * Returns the conversation_url which can be embedded in an iframe.
 */
export async function createTavusConversation(
  params: CreateConversationParams
): Promise<TavusConversationResponse> {
  const apiKey = process.env.TAVUS_API_KEY;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  const personaId = process.env.TAVUS_PERSONA_ID;

  if (!apiKey || !replicaId) {
    throw new Error('Tavus API key and replica ID are required');
  }

  const body: any = {
    replica_id: replicaId,
    conversation_name: params.conversationName,
    // Conversational context is appended to the persona's system prompt
    conversational_context: params.systemPrompt,
    custom_greeting: `Hello ${params.candidateName}, thanks for joining today.`,
    properties: {
      max_call_duration: params.maxDurationSeconds || 2400, // 40 min default
      participant_left_timeout: 30,
      participant_absent_timeout: 120,
      enable_recording: true,
      enable_transcription: true
    }
  };

  if (personaId) {
    body.persona_id = personaId;
  }

  if (params.callbackUrl) {
    body.callback_url = params.callbackUrl;
  }

  const response = await fetch(`${TAVUS_API_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tavus API error (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Ends a Tavus conversation.
 */
export async function endTavusConversation(conversationId: string): Promise<void> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) throw new Error('Tavus API key required');

  await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}/end`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey }
  });
}

/**
 * Fetches the transcript for a conversation.
 * Note: Tavus delivers transcripts via webhooks during/after the call.
 * This is a fallback fetch.
 */
export async function getTavusConversation(conversationId: string): Promise<any> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) throw new Error('Tavus API key required');

  const response = await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}`, {
    headers: { 'x-api-key': apiKey }
  });

  if (!response.ok) {
    throw new Error(`Tavus fetch error: ${response.status}`);
  }

  return response.json();
}
