import { MetadataRoute } from 'next';
import { getAllDocs } from '@/lib/docs';
import { languages, Lang } from '@/lib/i18n';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://docs.routex.id';
  const sitemapEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  for (const lang of languages) {
    const docs = await getAllDocs(lang as Lang);
    
    // Add landing page
    sitemapEntries.push({
      url: `${baseUrl}/${lang}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    // Add each doc page
    for (const doc of docs) {
      sitemapEntries.push({
        url: `${baseUrl}/${lang}/docs/${doc.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return sitemapEntries;
}
