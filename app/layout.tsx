import "./globals.css";

export const metadata = {
  title: "Red Thread",
  description: "Red Thread",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
