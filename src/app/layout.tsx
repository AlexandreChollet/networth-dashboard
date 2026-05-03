import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Patrimoine — tableau de bord",
  description: "Tableau de bord de patrimoine personnel, 100% local.",
  // Pas d'icône externe ni de favicon CDN. Pas d'OpenGraph qui leakerait.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Nav />
            <main className="container flex-1 py-6 md:py-10">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
