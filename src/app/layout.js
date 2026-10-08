import "./globals.css";
import { Nav } from "@/components/Nav";
import { openSession } from "@/lib/db";

export const metadata = {
  title: "Hold",
  description: "A local training log. Build routines, log sets, and keep your own notes.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  const open = openSession();
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="app">
          <Nav open={open} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
