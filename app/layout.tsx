import './globals.css'
export const metadata = {title: 'KimbleAI V4'}
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>
}
