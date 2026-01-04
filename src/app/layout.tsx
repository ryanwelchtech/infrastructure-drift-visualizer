import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Infrastructure Drift Visualizer',
  description:
    'Visual diff tool showing infrastructure drift between Terraform state and actual cloud resources',
  keywords: [
    'terraform',
    'infrastructure',
    'drift detection',
    'cloud',
    'aws',
    'devops',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: 'glass-card',
                title: 'font-semibold',
                description: 'text-muted-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
