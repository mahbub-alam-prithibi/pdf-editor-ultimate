# Contributing to PDFly

Thanks for your interest! PDFly is a small, friendly project and a great place to
make your first open-source contribution.

## Getting started

1. **Fork** the repo and clone your fork.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev` (opens on http://localhost:5173)
4. Make your change on a new branch: `git checkout -b my-feature`
5. Check it builds: `npm run build`
6. Commit, push to your fork, and open a **Pull Request**.

## Ground rules

- **Keep it client-side.** The whole point of PDFly is that files never leave the
  user's device. Please don't add anything that uploads files or phones home.
- **No heavy dependencies** without discussion — small bundle, fast load.
- Keep components small and readable; match the existing style.
- If you add a user-facing feature, update the README's feature list.

## Good first issues

Check the [Roadmap](README.md#-roadmap) and the issue tracker for tasks labelled
`good first issue`. Some ideas to get started:

- Drag-to-reorder thumbnails
- A light theme toggle
- "Extract selected pages" to a new file
- Keyboard shortcut hints

## Reporting bugs

Open an issue with:
- What you did, what you expected, what happened
- Browser + OS
- A sample PDF if it's safe to share (never upload anything sensitive)

Happy hacking! 🎉
