import { notFound } from 'next/navigation';

export default async function FileByUuidPage(props: any) {
  const { uuid } = (await props.params) as { uuid: string };
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/files/${encodeURIComponent(uuid)}`, {
    // ensure SSR fetch with no caching
    cache: 'no-store',
  });

  if (!res.ok) {
    notFound();
  }

  const contentType = res.headers.get('content-type') || '';
  const buffer = Buffer.from(await res.arrayBuffer());

  if (contentType.startsWith('image/')) {
    const base64 = buffer.toString('base64');
    const src = `data:${contentType};base64,${base64}`;
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">File</h1>
        <img src={src} alt={uuid} className="max-w-full" />
      </div>
    );
  }

  if (contentType.includes('json') || contentType.startsWith('text/')) {
    const text = buffer.toString('utf-8');
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">File</h1>
        <pre className="text-xs bg-black/5 p-2 rounded overflow-auto max-h-[70vh] whitespace-pre-wrap">{text}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">File</h1>
      <p className="opacity-60">Unsupported content-type: {contentType}. You can download the file directly.</p>
      <a className="text-blue-600 underline" href={`/api/files/${encodeURIComponent(uuid)}`}>Download</a>
    </div>
  );
}


