import "./globals.css";

export const metadata = {
  title: "Kosci100 Dashboard",
  description: "Strava-synced training dashboard for Kosci100",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
