import sanitizeHtml from 'sanitize-html';

export function sanitizeMessageContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
    allowedIframeHostnames: [],
  });
}
