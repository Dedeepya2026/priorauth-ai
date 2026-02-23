import PADetailClient from './PADetailClient';

// Generate static paths for PA request detail pages (for static export)
export function generateStaticParams() {
    return Array.from({ length: 50 }, (_, i) => ({ id: String(i + 1) }));
}

export default function PADetailPage() {
    return <PADetailClient />;
}
