'use client';

export default function DiagnosticsPage() {
  const algoliaAppId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const algoliaKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Diagnóstico de Variables</h1>
      <div className="space-y-2">
        <p>
          <strong>ALGOLIA_APP_ID:</strong>{' '}
          {algoliaAppId ? '✅ Configurado' : '❌ FALTA'}
        </p>
        <p>
          <strong>ALGOLIA_SEARCH_KEY:</strong>{' '}
          {algoliaKey ? '✅ Configurado' : '❌ FALTA'}
        </p>
        <p>
          <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
        </p>
      </div>
    </div>
  );
}