import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Caveat, Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ImmersiveBackground } from "@/components/ImmersiveBackground";
import { SettingsButton } from "@/components/SettingsButton";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Our Mailbox",
  description: "A private, romantic space to exchange letters.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value ?? "cozy";

  return (
    <html lang="en" data-theme={theme}>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground font-sans antialiased",
          inter.variable,
          playfair.variable,
          caveat.variable,
        )}
      >
        <ThemeProvider defaultTheme={theme}>
          <ImmersiveBackground />
          <div className="relative z-10 flex min-h-screen flex-col">
            {children}
          </div>
          <SettingsButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
