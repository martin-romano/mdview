import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const out = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        return `<pre><code class="hljs language-${lang}">${out}</code></pre>`;
      } catch {}
    }
    return '';
  },
})
  .use(anchor, { permalink: anchor.permalink.headerLink() })
  .use(taskLists, { enabled: false });

export function renderMarkdown(source) {
  return md.render(source);
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function page({ title, body, live = true }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/__mdview/style.css">
</head>
<body>
<main class="markdown-body">
${body}
</main>
${live ? '<script src="/__mdview/client.js"></script>' : ''}
</body>
</html>
`;
}

export { escapeHtml };
