import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Lang, defaultLang } from "@/lib/i18n";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Routex Documentation",
    default: "Routex Documentation",
  },
  description: "Official documentation for Routex - The modern payment solution.",
  openGraph: {
    title: "Routex Documentation",
    description: "The modern payment solution for your business.",
    url: "https://docs.routex.id",
    siteName: "Routex Docs",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Routex Documentation",
    description: "The modern payment solution for your business.",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang?: Lang }>;
}>) {
  const resolvedParams = await params;
  const lang = resolvedParams?.lang || defaultLang;

  return (
    <html lang={lang} suppressHydrationWarning className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
