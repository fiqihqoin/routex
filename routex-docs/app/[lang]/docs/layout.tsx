import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import TableOfContents from '@/components/docs/TableOfContents';
import MobileNav from '@/components/docs/MobileNav';
import SearchModal from '@/components/docs/SearchModal';
import { Lang } from '@/lib/i18n';

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const l = lang as Lang;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DocsHeader lang={l} />
      
      <div className="flex-1 flex pt-[60px] pb-16 md:pb-0">
        {/* Sidebar Column (Desktop) */}
        <div className="hidden md:block w-[280px] shrink-0 border-r border-border bg-background">
          <DocsSidebar lang={l} />
        </div>

        {/* Content Column */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[800px] mx-auto pt-8 pb-16 px-6 md:px-12 lg:px-16">
            {children}
          </div>
        </main>

        {/* TOC Column (Desktop) */}
        <div className="hidden xl:block w-[260px] shrink-0">
          <TableOfContents lang={l} />
        </div>
      </div>

      {/* Overlays & Drawers */}
      <MobileNav lang={l} />
      <SearchModal lang={l} />
    </div>
  );
}
