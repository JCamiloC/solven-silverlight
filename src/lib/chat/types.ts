export type ChatSessionStatus = 'bot' | 'waiting_agent' | 'agent_connected' | 'closed'
export type ChatSenderType = 'client' | 'assistant' | 'agent' | 'system'

export interface SupportChatSession {
  id: string
  client_user_id: string
  client_profile_id: string | null
  client_id: string | null
  status: ChatSessionStatus
  assigned_agent_user_id: string | null
  assigned_agent_profile_id: string | null
  human_requested_at: string | null
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface SupportChatMessage {
  id: string
  session_id: string
  sender_type: ChatSenderType
  sender_user_id: string | null
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ChatViewer {
  userId: string
  role: string | null
  canSupport: boolean
}
