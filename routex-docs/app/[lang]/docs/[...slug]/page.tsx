import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getDoc, getAllDocs } from '@/lib/docs';
import { Lang, uiStrings } from '@/lib/i18n';
import { navigation } from '@/lib/navigation';
import Breadcrumb from '@/components/docs/Breadcrumb';
import Callout from '@/components/docs/Callout';
import CodeBlock from '@/components/docs/CodeBlock';
import ApiEndpoint from '@/components/docs/ApiEndpoint';
import ParamTable from '@/components/docs/ParamTable';
import { CopyUrlButton, EditOnGithub } from '@/components/docs/DocActions';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DocPageProps {
  params: Promise<{
    lang: string;
    slug?: string[];
  }>;
}

export async function generateStaticParams({ params }: { params: { lang: string } }) {
  const { lang } = params;
  const docs = await getAllDocs(lang as Lang);
  return docs.map((doc) => ({
    slug: doc.slug.split('/'),
  }));
}

import { config } from '@/lib/config';

export async function generateMetadata({ params }: DocPageProps) {
  const { lang, slug: slugArr } = await params;
  const slug = (slugArr || ['getting-started', 'introduction']).join('/');
  const doc = await getDoc(lang as Lang, slug.split('/'));
  if (!doc) return {};

  const baseUrl = config.docsUrl;

  return {
    title: doc.meta.title,
    description: doc.meta.description,
    openGraph: {
      title: `${doc.meta.title} | CaishenEngine Docs`,
      description: doc.meta.description,
      url: `${baseUrl}/${lang}/docs/${slug}`,
      siteName: 'CaishenEngine Documentation',
      type: 'article',
      images: [{
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
      }]
    },
    twitter: {
      card: 'summary_large_image',
      title: doc.meta.title,
      description: doc.meta.description,
    },
    alternates: {
      canonical: `${baseUrl}/${lang}/docs/${slug}`,
      languages: {
        'id': `${baseUrl}/id/docs/${slug}`,
        'en': `${baseUrl}/en/docs/${slug}`,
      }
    }
  };
}

const components = {
  Callout,
  CodeBlock,
  ApiEndpoint,
  ParamTable,
  Link,
};

export default async function DocPage({ params }: DocPageProps) {
  const { lang, slug: slugArr } = await params;
  const l = lang as Lang;
  const currentSlug = (slugArr || ['getting-started', 'introduction']).join('/');
  const doc = await getDoc(l, currentSlug.split('/'));

  if (!doc) {
    notFound();
  }

  // Calculate breadcrumbs
  const breadcrumbs = currentSlug.split('/').map((seg, i, arr) => ({
    label: seg.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    href: i === arr.length - 1 ? undefined : `/${l}/docs/${arr.slice(0, i + 1).join('/')}`,
  }));

  // Find prev/next pages
  const allNavItems = navigation.flatMap(s => s.items);
  const currentIndex = allNavItems.findIndex(item => item.slug === currentSlug);
  const prev = currentIndex > 0 ? allNavItems[currentIndex - 1] : null;
  const next = currentIndex < allNavItems.length - 1 ? allNavItems[currentIndex + 1] : null;

  const t = uiStrings[l];

  return (
    <div className="mx-auto w-full min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Breadcrumb items={breadcrumbs} />
        <div className="hidden md:block">
          <CopyUrlButton />
        </div>
      </div>
      
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight gradient-text leading-tight">
          {doc.meta.title}
        </h1>
        <p className="text-xl text-text-muted leading-relaxed">
          {doc.meta.description}
        </p>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-[13px] text-text-dim font-medium">
          <div className="flex items-center gap-2">
            <span>{doc.meta.readTime} {t.minuteRead}</span>
          </div>
          <span className="text-border">•</span>
          <div className="flex items-center gap-2">
            <span>{t.lastUpdated} {doc.meta.lastUpdated}</span>
          </div>
          {doc.meta.tags && doc.meta.tags.length > 0 && (
            <>
              <span className="text-border">•</span>
              <div className="flex flex-wrap gap-2">
                {doc.meta.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-teal/10 border border-teal/20 text-teal text-[10px] font-bold uppercase tracking-tight">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <hr className="my-8 border-border" />

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <MDXRemote source={doc.content} components={components} />
      </div>

      <EditOnGithub lang={l} slug={currentSlug} />

      <hr className="my-12 border-border" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {prev ? (
          <Link 
            href={`/${l}/docs/${prev.slug}`}
            className="group flex flex-col p-5 rounded-xl border border-border bg-surface hover:border-teal/40 transition-all duration-300"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-3 group-hover:text-teal">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t.prevPage}</span>
            </div>
            <div className="text-base font-semibold text-foreground group-hover:text-teal transition-colors">
              {prev.title[l]}
            </div>
          </Link>
        ) : <div />}

        {next ? (
          <Link 
            href={`/${l}/docs/${next.slug}`}
            className="group flex flex-col p-5 rounded-xl border border-border bg-surface hover:border-teal/40 transition-all duration-300 text-right items-end"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-3 group-hover:text-teal">
              <span>{t.nextPage}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <div className="text-base font-semibold text-foreground group-hover:text-teal transition-colors">
              {next.title[l]}
            </div>
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
