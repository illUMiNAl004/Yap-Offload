import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import FluidBackdrop from "@/components/FluidBackdrop";

const themeScript = `try{var t=localStorage.getItem('yoffload.theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "yoffload — talk your day out",
  description:
    "Talk your day out loud. yoffload listens, then sorts it into your journal, tasks, calendar, and notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrument.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain min-h-full">
        <FluidBackdrop />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
