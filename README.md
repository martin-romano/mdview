# mdview

A small local Markdown viewer. It runs a tiny HTTP server that renders `.md` files to HTML on each request and opens them in your browser. Nothing is written to disk, and pages reload automatically when files change.

## Install

Requires Node.js 18 or newer.

```sh
npm install
npm link   # optional: puts `mdview` on your PATH
```

## Usage

```sh
mdview README.md             # serve the file's directory and open this file
mdview ./docs                # serve a directory, starting at an index of its .md files
mdview                       # same, for the current directory
mdview notes.md --port 8080  # use a fixed port (default: random free port)
mdview notes.md --no-open    # don't launch the browser
```

Without `npm link`, run `node bin/mdview.js` instead of `mdview`. Stop the server with Ctrl+C.

## Features

- GitHub-flavored Markdown: tables, task lists, autolinked URLs, heading anchors
- Syntax highlighting for fenced code blocks (highlight.js)
- Light and dark themes, following the system setting
- Live reload when any file under the served directory changes
- Directory index listing subfolders and Markdown files
- Relative images and links between Markdown files work

## Notes

- The server binds to `127.0.0.1` only and refuses to serve anything outside the chosen root, including via `..` or symlinks.
- Raw HTML inside Markdown is rendered as-is, so only view files you trust.
- Live reload relies on recursive `fs.watch`, which is supported on macOS and Windows and on Linux with Node 20+.
- Mermaid diagrams are not rendered; they appear as plain code blocks.

## Layout

| Path | Purpose |
| --- | --- |
| `bin/mdview.js` | CLI entry point: argument parsing, server startup, opening the browser |
| `src/server.js` | HTTP routing, path safety, directory index, file watching and SSE |
| `src/render.js` | markdown-it configuration and the HTML page template |
| `public/style.css` | Page and syntax-highlighting styles |
| `public/client.js` | Browser-side live-reload client (Server-Sent Events) |
