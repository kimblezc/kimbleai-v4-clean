import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'KimbleAI - AI-Powered Productivity Platform',
  description: 'Organize, collaborate, and manage your work with AI assistance',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
