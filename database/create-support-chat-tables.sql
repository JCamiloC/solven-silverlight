-- =====================================================
-- CHAT DE SOPORTE EN VIVO (SIN TICKETS)
-- =====================================================

CREATE TABLE IF NOT EXISTS support_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL,
  client_profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'waiting_agent', 'agent_connected', 'closed')),
  assigned_agent_user_id UUID NULL,
  assigned_agent_profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  human_requested_at TIMESTAMPTZ NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES support_chat_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'assistant', 'agent', 'system')),
  sender_user_id UUID NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_sessions_status ON support_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_chat_sessions_client_user ON support_chat_sessions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_messages_session ON support_chat_messages(session_id, created_at);

ALTER TABLE support_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_sessions_select" ON support_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert" ON support_chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update" ON support_chat_sessions;

CREATE POLICY "chat_sessions_select"
ON support_chat_sessions
FOR SELECT
TO authenticated
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
      AND p.role IN ('administrador', 'lider_soporte', 'agente_soporte')
  )
);

CREATE POLICY "chat_sessions_insert"
ON support_chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "chat_sessions_update"
ON support_chat_sessions
FOR UPDATE
TO authenticated
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
      AND p.role IN ('administrador', 'lider_soporte', 'agente_soporte')
  )
)
WITH CHECK (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
      AND p.role IN ('administrador', 'lider_soporte', 'agente_soporte')
  )
);

DROP POLICY IF EXISTS "chat_messages_select" ON support_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON support_chat_messages;

CREATE POLICY "chat_messages_select"
ON support_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_chat_sessions s
    WHERE s.id = support_chat_messages.session_id
      AND (
        s.client_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
            AND p.role IN ('administrador', 'lider_soporte', 'agente_soporte')
        )
      )
  )
);

CREATE POLICY "chat_messages_insert"
ON support_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_chat_sessions s
    WHERE s.id = support_chat_messages.session_id
      AND (
        s.client_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE (p.id = auth.uid() OR p.user_id = auth.uid())
            AND p.role IN ('administrador', 'lider_soporte', 'agente_soporte')
        )
      )
  )
);
