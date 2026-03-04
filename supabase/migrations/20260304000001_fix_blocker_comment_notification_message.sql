-- Fix redundant blocker comment notification message
-- The UI already renders "{actorName} commented in {projectName}" in the header,
-- so the message should only contain the blocker title for context — not repeat
-- "Someone commented on your blocker".

CREATE OR REPLACE FUNCTION notify_blocker_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_blocker RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get blocker details
  SELECT b.*, p.project_name
  INTO v_blocker
  FROM blockers b
  JOIN projects p ON p.id = b.project_id
  WHERE b.id = NEW.blocker_id;

  -- Notify the reporter if commenter is different
  IF v_blocker.reported_by != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, project_id, blocker_id, actor_id)
    VALUES (
      v_blocker.reported_by,
      'blocker_comment',
      'New comment on blocker',
      '"' || v_blocker.title || '"',
      v_blocker.project_id,
      NEW.blocker_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
