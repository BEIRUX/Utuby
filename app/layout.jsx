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
const TITLE =
  "YouTube Transcript Extractor — Free, Instant, No Sign-Up | Utuby";
const DESCRIPTION =
  "Paste any YouTube link and get the full transcript in seconds. Copy as clean text, timestamped, or download as SRT. 100% free, no account needed, works on any video.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Utuby",
  },
  description: DESCRIPTION,
  keywords: [
    "youtube transcript extractor",
    "youtube transcript",
    "yt transcript",
    "yt to transcript",
    "youtube video to text",
    "extract youtube transcript",
    "get youtube transcript",
    "copy youtube transcript",
    "youtube transcript copy paste",
    "convert youtube to text",
    "youtube subtitle downloader",
    "youtube captions",
    "youtube subtitles",
    "video transcript",
    "youtube to text",
    "free transcript extractor",
    "youtube transcript generator",
    "youtube transcript online",
  ],
  authors: [{ name: "BEIRUX", url: "https://beirux.com" }],
  creator: "BEIRUX",
  publisher: "BEIRUX",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Paste a YouTube Link, Get the Transcript — Utuby",
    description:
      "Free YouTube transcript extractor. Clean text, timestamps, or SRT — copy or download in one click. No sign-up required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Paste a YouTube Link, Get the Transcript — Utuby",
    description:
      "Free YouTube transcript extractor. Clean text, timestamps, or SRT — copy or download in one click. No sign-up required.",
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
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Utuby — YouTube Transcript Extractor",
    alternateName: ["Utuby", "YT Transcript Extractor", "YouTube to Text"],
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
      url: "https://beirux.com",
    },
    featureList: [
      "Extract YouTube transcripts instantly",
      "Copy transcript as clean text for AI and LLMs",
      "Timestamped transcript with clickable timestamps",
      "Download as SRT subtitle file",
      "Download as plain text file",
      "Search within transcripts",
      "Multi-language caption support",
      "Batch extract from multiple videos",
      "Extract full playlists",
      "Token count estimation for AI context windows",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I get a transcript from a YouTube video?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Paste any YouTube video URL into Utuby and click Extract. The full transcript appears in seconds. You can copy it as clean text, view it with timestamps, or download it as a TXT or SRT file. No account or sign-up required.",
        },
      },
      {
        "@type": "Question",
        name: "Is this YouTube transcript extractor free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Utuby is 100% free with no limits, no ads, and no sign-up. It is open-source and will always be free to use.",
        },
      },
      {
        "@type": "Question",
        name: "Can I copy a YouTube transcript as plain text?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Utuby offers a one-click 'Copy for LLM' button that gives you the full transcript as clean flowing text with no timestamps — ready to paste into ChatGPT, Claude, or any other tool. You can also copy with timestamps or download as a file.",
        },
      },
      {
        "@type": "Question",
        name: "Does it work with any YouTube video?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Utuby works with any YouTube video that has captions available — including auto-generated captions. It supports all languages and you can choose which language to extract.",
        },
      },
    ],
  },
];

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <head>
        {jsonLd.map((block, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
          />
        ))}
      </head>
      <body className="font-[family-name:var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
