import { notFound } from 'next/navigation';
import { languages, Lang } from '@/lib/i18n';

export async function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!languages.includes(lang as Lang)) {
    notFound();
  }

  return <>{children}</>;
}
