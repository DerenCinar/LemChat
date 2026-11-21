import type { Conversation } from '../types/chat';

/** Build a plain-text transcript of a conversation. */
export function conversationToText(conv: Conversation): string {
  const lines = [`SkellyTalk conversation: ${conv.name}`, `Exported: ${new Date().toLocaleString()}`, ''];
  for (const m of conv.messages) {
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : m.timestamp;
    if (m.deletedAt) {
      lines.push(`[${when}] ${m.senderName}: (message deleted)`);
      continue;
    }
    const parts: string[] = [];
    if (m.content) parts.push(m.content);
    if (m.codeBlock) parts.push(`[code:${m.codeBlock.language}]\n${m.codeBlock.code}`);
    if (m.attachments?.length) parts.push(`[${m.attachments.length} attachment(s)]`);
    lines.push(`[${when}] ${m.senderName}${m.isEdited ? ' (edited)' : ''}: ${parts.join('\n') || '(no text)'}`);
  }
  return lines.join('\n');
}

export function downloadConversation(conv: Conversation): void {
  const blob = new Blob([conversationToText(conv)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = conv.name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40) || 'chat';
  a.href = url;
  a.download = `skellytalk-${safe}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
