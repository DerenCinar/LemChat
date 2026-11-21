import { describe, expect, it } from 'vitest';
import { conversationToText } from '../src/lib/exportChat';
import type { Conversation, Message } from '../src/types/chat';

const msg = (over: Partial<Message>): Message =>
  ({
    id: '1', conversationId: 'c', senderId: 'u', senderName: 'Ann', senderAvatar: 'A',
    content: 'hi', timestamp: '10:00', createdAt: '2026-01-01T10:00:00Z', isMe: false,
    status: 'read', reactions: [], ...over,
  }) as Message;

describe('conversationToText', () => {
  it('includes names, content and marks deleted/edited messages', () => {
    const conv = {
      name: 'Team',
      messages: [msg({ content: 'hello' }), msg({ id: '2', deletedAt: 'x' }), msg({ id: '3', isEdited: true, content: 'fix' })],
    } as unknown as Conversation;
    const t = conversationToText(conv);
    expect(t).toContain('SkellyTalk conversation: Team');
    expect(t).toContain('Ann: hello');
    expect(t).toContain('(message deleted)');
    expect(t).toContain('(edited): fix');
  });
});
