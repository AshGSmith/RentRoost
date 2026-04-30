import type { Metadata } from "next";

import "@/app/globals.css";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "RentRoost",
  description: "Secure rental finance portal for property operators."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const theme = session?.impersonatedUser?.settings?.theme ?? session?.user.settings?.theme ?? "LIGHT";

  return (
    <html className={theme === "DARK" ? "dark" : ""} lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
