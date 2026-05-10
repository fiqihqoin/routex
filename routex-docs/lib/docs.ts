import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Lang } from './i18n';
import { config } from './config';

const CONTENT_PATH = path.join(process.cwd(), 'content');

export type DocMeta = {
  title: string;
  description: string;
  lastUpdated: string;
  readTime?: number;
  tags?: string[];
};

export type Doc = {
  meta: DocMeta;
  content: string;
  slug: string;
  lang: Lang;
};

export type SearchItem = {
  title: string;
  path: string;
  slug: string;
  section: string;
};

export async function getDoc(lang: Lang, slug: string[]): Promise<Doc | null> {
  const fullPath = path.join(CONTENT_PATH, lang, ...slug) + '.mdx';
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const processedContents = fileContents.replace(/routex\.web\.id/g, config.baseDomain);
  const { data, content } = matter(processedContents);

  // Calculate read time (approx 200 words per minute)
  const words = content.split(/\s+/).length;
  const readTime = Math.ceil(words / 200);

  const stats = fs.statSync(fullPath);

  return {
    meta: {
      title: data.title || 'Untitled',
      description: data.description || '',
      lastUpdated: data.lastUpdated || stats.mtime.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      readTime: data.readTime || readTime,
      tags: data.tags || [],
    },
    content,
    slug: slug.join('/'),
    lang,
  };
}

export async function getAllDocs(lang: Lang): Promise<Doc[]> {
  const langPath = path.join(CONTENT_PATH, lang);
  if (!fs.existsSync(langPath)) return [];

  const files = getAllFiles(langPath);
  const slugs = files.map(file => {
    const relativePath = path.relative(langPath, file);
    return relativePath.replace(/\.mdx$/, '').split(path.sep);
  });

  const docs = await Promise.all(
    slugs.map(slug => getDoc(lang, slug))
  );

  return docs.filter((doc): doc is Doc => doc !== null);
}

export async function buildSearchIndex(lang: Lang): Promise<SearchItem[]> {
  const docs = await getAllDocs(lang);
  return docs.map(doc => ({
    title: doc.meta.title,
    path: doc.slug.split('/').join(' / '),
    slug: doc.slug,
    section: doc.slug.split('/')[0]
  }));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith('.mdx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}
