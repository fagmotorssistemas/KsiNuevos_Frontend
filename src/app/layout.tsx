import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './global.css'
import { AuthProvider } from '@/contexts/AuthContext'

const satoshi = localFont({
  src: [
    {
      path: '../../public/fonts/Satoshi/Satoshi-Regular.woff2', 
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Satoshi/Satoshi-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-satoshi',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KSI-NUEVOS',
  description: 'Concesionaria Cuenca.',
    icons: {
    icon: '/logo.png', 
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={satoshi.variable}>
      <body className="font-sans bg-[#f2f2f2] text-[#000]">
        <AuthProvider>
            {children}
        </AuthProvider>
      </body>
    </html>
  )
}