import "@/app/globals.css";
import { Instrument_Serif, DM_Sans } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = "https://utuby.vercel.app";
const SITE_NAME = "Utuby";
const TITLE = "Utuby — Free YouTube Transcript Extractor";
const DESCRIPTION =
  "Extract clean, timestamped transcripts from any YouTube video instantly. Free, open-source, no sign-up. LLM-optimized exports with MCP server for AI tools like Claude Code.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Utuby",
  },
  description: DESCRIPTION,
  keywords: [
    "youtube transcript",
    "youtube transcript extractor",
    "youtube captions",
    "youtube subtitles",
    "extract youtube transcript",
    "video transcript",
    "youtube to text",
    "youtube transcript copy",
    "LLM transcript",
    "MCP server youtube",
    "claude code youtube",
    "free transcript extractor",
  ],
  authors: [{ name: "BEIRUX", url: "https://github.com/BEIRUX" }],
  creator: "BEIRUX",
  publisher: "BEIRUX",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// JSON-LD structured data for rich search results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "BEIRUX",
    url: "https://github.com/BEIRUX",
  },
  featureList: [
    "Extract YouTube transcripts instantly",
    "LLM-optimized clean text export",
    "Timestamped transcript export",
    "SRT subtitle file download",
    "MCP server for AI tool integration",
    "Token count estimation",
    "Multi-language caption support",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-[family-name:var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
