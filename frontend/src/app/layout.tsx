import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Server Maintenance Agent",
  description: "AI-driven server maintenance and monitoring platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1">
            <Header />
            <div className="p-6 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
