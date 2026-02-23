import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata = {
    title: 'PriorAuth AI — Clinical Documentation & PA Platform',
    description: 'AI-powered Prior Authorization & Clinical Documentation Platform for Healthcare',
    keywords: 'prior authorization, clinical documentation, healthcare, AI, HIPAA',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </head>
            <body>
                <ErrorBoundary>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
