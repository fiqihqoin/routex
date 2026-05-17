# CaishenEngine Documentation

This is the official documentation site for CaishenEngine, built with Next.js 16, Tailwind CSS v4, and MDX.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/`: Next.js App Router and page layouts.
- `components/`: UI components (docs-specific and base).
- `content/`: Documentation content in MDX format (multilingual).
- `lib/`: Utility functions for docs, navigation, and i18n.
- `public/`: Static assets.

## Writing Documentation

Add `.mdx` files to the `content/id/` or `content/en/` directories. Use frontmatter for titles and descriptions:

```mdx
---
title: My New Page
description: A short description of this page.
---

# My New Page
Content goes here...
```

Update `lib/navigation.ts` to include your new page in the sidebar.
