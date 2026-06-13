import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Toaster } from "sonner";

import { GlobalErrorSwallow } from "@/components/ui/error-boundary";
import { AppConfigProvider } from "@/providers/AppConfigProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { StoreProvider } from "@/providers/StoreProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Toolkit Studio — Build tools as visual node chains",
    template: "%s · Toolkit Studio",
  },
  description:
    "Toolkit Studio lets you compose tools as a top-to-bottom chain of input, logic, and output nodes with a live, interactive preview — no backend required.",
  applicationName: "Toolkit Studio",
  keywords: [
    "Toolkit Studio",
    "tool builder",
    "no-code",
    "visual programming",
    "node editor",
    "workflow builder",
    "live preview",
    "AI tools",
  ],
  authors: [{ name: "Toolkit Studio" }],
  creator: "Toolkit Studio",
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "Toolkit Studio",
    url: siteUrl,
    title: "Toolkit Studio — Build tools as visual node chains",
    description:
      "Compose tools as a chain of input, logic, and output nodes with a live preview.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolkit Studio",
    description:
      "Compose tools as a chain of input, logic, and output nodes with a live preview.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <GlobalErrorSwallow />
        <StoreProvider>
          <AppConfigProvider>
            <QueryProvider>{children}</QueryProvider>
          </AppConfigProvider>
        </StoreProvider>
        <Toaster />
      </body>
    </html>
  );
}
