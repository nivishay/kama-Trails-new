import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteChrome } from "@/components/layout/site-chrome";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "שבילי קמה - טיולי סנפלינג מודרכים לכל גיל",
    template: "%s | שבילי קמה",
  },
  description:
    "שבילי קמה — טיולי סנפלינג, קניונינג ואתגר מודרכים ברחבי הארץ, למשפחות, זוגות, בתי ספר וארגונים.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
