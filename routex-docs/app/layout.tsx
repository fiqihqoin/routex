import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Lang, defaultLang } from "@/lib/i18n";
import { config } from "@/lib/config";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | CaishenEngine Documentation",
    default: "CaishenEngine Documentation",
  },
  description: "Official documentation for CaishenEngine - The modern payment solution.",
  openGraph: {
    title: "CaishenEngine Documentation",
    description: "The modern payment solution for your business.",
    url: config.docsUrl,
    siteName: "CaishenEngine Docs",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CaishenEngine Documentation",
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
