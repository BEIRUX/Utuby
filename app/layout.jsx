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

export const metadata = {
  title: "Utuby — YouTube Transcript Extractor",
  description:
    "Extract clean, timestamped transcripts from any YouTube video. Free, instant, no sign-up required.",
  openGraph: {
    title: "Utuby — YouTube Transcript Extractor",
    description:
      "Extract clean, timestamped transcripts from any YouTube video. Free, instant, no sign-up required.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <body className="font-[family-name:var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
