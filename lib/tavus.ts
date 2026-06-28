/**
 * Tavus CVI integration
 * Docs: https://docs.tavus.io/api-reference/conversations/create-conversation
 *
 * Recording: Tavus writes recordings directly to your S3 bucket via federated IAM.
 * See: https://docs.tavus.io/sections/conversational-video-interface/quickstart/conversation-recordings
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

export async function createTavusConversation(
  params: CreateConversationParams
): Promise<TavusConversationResponse> {
  const apiKey = process.env.TAVUS_API_KEY;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  const personaId = process.env.TAVUS_PERSONA_ID;

  if (!apiKey || !replicaId) {
    throw new Error('Tavus API key and replica ID are required');
  }

  // Build recording_storage config if S3 is configured
  const properties: any = {
    max_call_duration: params.maxDurationSeconds || 2400,
    participant_left_timeout: 30,
    participant_absent_timeout: 120,
    enable_recording: true,
    enable_transcription: true
  };

  const s3Bucket = process.env.RECORDING_S3_BUCKET;
  const s3Region = process.env.RECORDING_S3_REGION;
  const s3RoleArn = process.env.RECORDING_S3_ROLE_ARN;

  if (s3Bucket && s3Region && s3RoleArn) {
    properties.recording_storage = {
      provider: 's3',
      bucket_name: s3Bucket,
      bucket_region: s3Region,
      assume_role_arn: s3RoleArn
    };
  } else {
    console.warn('[Tavus] Recording S3 config missing — recordings will not be saved');
  }

  const body: any = {
    replica_id: replicaId,
    conversation_name: params.conversationName,
    conversational_context: params.systemPrompt,
    custom_greeting: `Hello ${params.candidateName}, thanks for joining today.`,
    properties
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

export async function endTavusConversation(conversationId: string): Promise<void> {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) throw new Error('Tavus API key required');

  await fetch(`${TAVUS_API_BASE}/conversations/${conversationId}/end`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey }
  });
}

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
