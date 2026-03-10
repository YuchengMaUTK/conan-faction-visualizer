import { useState, useEffect } from 'react';
import type { DataSet } from '../types/index';
import { parseData } from '../engines/data-store';

interface DataDebugViewProps {
  dataUrl: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: DataSet };

export default function DataDebugView({ dataUrl }: DataDebugViewProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });
      try {
        const resp = await fetch(dataUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json = await resp.text();
        const result = await parseData(json);

        if (cancelled) return;

        if (result.ok) {
          setState({ status: 'loaded', data: result.value });
        } else {
          const msg = result.error.map(e => `[${e.path}] ${e.message}`).join('\n');
          console.error('[DataDebugView] Validation errors:', result.error);
          setState({ status: 'error', message: msg });
        }
      } catch (err) {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message });
      }
    }

    load();
    return () => { cancelled = true; };
  }, [dataUrl]);

  if (state.status === 'loading') {
    return <div style={styles.container}><p>⏳ 数据加载中...</p></div>;
  }

  if (state.status === 'error') {
    return (
      <div style={styles.container}>
        <h2 style={styles.errorTitle}>❌ 数据加载失败</h2>
        <pre style={styles.errorPre}>{state.message}</pre>
      </div>
    );
  }

  const { data } = state;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📊 数据层调试视图</h2>

      <p style={styles.stats} data-testid="data-stats">
        已加载 {data.entities.length} 个角色、
        {data.characterEvents.length} 个事件、
        {data.links.length} 个关系、
        {data.storyArcs.length} 个篇章
      </p>

      <h3 style={styles.subtitle}>前 5 个角色（JSON 预览）</h3>
      <pre style={styles.jsonPre} data-testid="json-preview">
        {JSON.stringify(data.entities.slice(0, 5), null, 2)}
      </pre>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 24,
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: 22,
    marginBottom: 12,
  },
  stats: {
    fontSize: 16,
    background: '#f0f4f8',
    padding: '12px 16px',
    borderRadius: 8,
    lineHeight: 1.6,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  jsonPre: {
    background: '#1e1e2e',
    color: '#cdd6f4',
    padding: 16,
    borderRadius: 8,
    overflow: 'auto',
    fontSize: 13,
    maxHeight: 400,
  },
  errorTitle: {
    color: '#dc2626',
  },
  errorPre: {
    background: '#fef2f2',
    color: '#991b1b',
    padding: 16,
    borderRadius: 8,
    whiteSpace: 'pre-wrap',
    fontSize: 13,
  },
};
