-- Message order is now recovered by sorting on `id` (UUIDv7, time-ordered), because
-- `created_at` defaults to now() = transaction time: every row of a multi-row insert
-- ties, and the tie-break is arbitrary, which scrambled assistant/tool sequences.
--
-- Existing rows hold v4 ids, which sort randomly against v7 ids and against each
-- other. They cannot be ordered and must go. Run once, after deploying the
-- `Chat.Message.createId` change. Run before, and new messages land in old chats
-- that still sort arbitrarily.

delete from public.chat_messages;
