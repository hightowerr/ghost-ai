import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Real-time collaborative system design workspace",
};

const clerkAppearance = {
  variables: {
    colorBackground: "#111114",
    colorInputBackground: "#18181c",
    colorInputText: "#f0f0f4",
    colorText: "#f0f0f4",
    colorTextSecondary: "#c0c0cc",
    colorPrimary: "#00c8d4",
    colorDanger: "#ff4d4f",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
    fontFamilyButtons: "inherit",
  },
  elements: {
    card: "bg-surface border border-surface-border rounded-2xl shadow-none",
    formButtonPrimary: "bg-brand text-[#001417] hover:opacity-90 rounded-xl",
    socialButtonsBlockButton: "border border-surface-border bg-elevated rounded-xl",
    formFieldInput: "bg-elevated border-surface-border text-copy-primary rounded-xl",
    footerActionLink: "text-brand",
    identityPreviewEditButton: "text-brand",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider dynamic appearance={clerkAppearance} afterSignOutUrl="/sign-in">
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-base text-copy-primary">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
