import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BEOE Document Validator - Travel Document Verification for Pakistan',
  description: 'Verify your travel documents before going to the airport. Prevent deportation by FIA Immigration with AI-powered document validation.',
  keywords: 'BEOE, document validator, Pakistan, travel, visa, passport, FIA, immigration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
