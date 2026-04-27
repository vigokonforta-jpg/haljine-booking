import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://haljine-booking.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NOEMA | Rezervacija termina - Croatian Fashion Rental Closet Zagreb",
  description:
    "Rezervirajte termin u NOEMA - vodeći rental haljina u Zagrebu. Pronađite savršenu haljinu za posebnu prigodu. Nova Ves 50, Zagreb.",
  keywords: [
    "noema haljine",
    "rental haljina zagreb",
    "iznajmljivanje haljina zagreb",
    "noema zagreb",
    "rezervacija termina",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "NOEMA",
    locale: "hr_HR",
    title: "NOEMA | Rezervacija termina - Croatian Fashion Rental Closet Zagreb",
    description:
      "Rezervirajte termin u NOEMA - vodeći rental haljina u Zagrebu. Pronađite savršenu haljinu za posebnu prigodu. Nova Ves 50, Zagreb.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOEMA | Rezervacija termina - Croatian Fashion Rental Closet Zagreb",
    description:
      "Rezervirajte termin u NOEMA - vodeći rental haljina u Zagrebu. Pronađite savršenu haljinu za posebnu prigodu.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr" className={`${cormorant.variable} ${inter.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
