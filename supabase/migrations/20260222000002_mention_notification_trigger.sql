-- @mention notification trigger
-- When a user is mentioned in a conversation message, create a notification
-- Table columns verified from 20260103000001_conversations_system.sql:
--   message_mentions: id, message_id, mentioned_user_id, created_at
--   messages: id, conversation_id, sender_id, content
--   conversations: id, project_id, type

CREATE OR REPLACE FUNCTION notify_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_message RECORD;
  v_actor_name TEXT;
BEGIN
  -- Get the message details (sender, content, and project context via conversation)
  SELECT m.content, m.sender_id, c.project_id
  INTO v_message
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE m.id = NEW.message_id;

  -- Don't notify if user mentions themselves
  IF v_message.sender_id = NEW.mentioned_user_id THEN
    RETURN NEW;
  END IF;

  -- Get actor name
  SELECT name INTO v_actor_name
  FROM profiles
  WHERE id = v_message.sender_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, project_id, actor_id)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    COALESCE(v_actor_name, 'Someone') || ' mentioned you',
    LEFT(v_message.content, 200),
    v_message.project_id,
    v_message.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS mention_notify ON message_mentions;
CREATE TRIGGER mention_notify
  AFTER INSERT ON message_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_mention();
