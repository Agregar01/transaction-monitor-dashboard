import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ReduxProvider from "@/redux/provider";
import EnvironmentBanner, { bannerOffsetStyle, environmentBanner } from "@/components/EnvironmentBanner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Transaction Monitor",
  description: "AML/CFT transaction monitoring console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reserve the banner's height (0 when none) so fixed/sticky chrome sits below it.
  const offset = bannerOffsetStyle(
    environmentBanner(process.env.NEXT_PUBLIC_APP_ENV, process.env.NEXT_PUBLIC_BACKEND_HOST),
  );
  return (
    <html lang="en" suppressHydrationWarning style={offset}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pt-[var(--env-banner-h,0px)]`}
      >
        <EnvironmentBanner />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-[calc(0.5rem+var(--env-banner-h,0px))] focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
