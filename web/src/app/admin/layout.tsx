import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Admin · Javis Market", template: "%s · Admin · Javis Market" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
