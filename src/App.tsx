import Visualizer from './components/Visualizer';

function App() {
  return (
    <div style={styles.root}>
      <div style={styles.banner}>
        <h1 style={styles.title}>
          名侦探柯南 — 红黑阵营可视化工具
        </h1>
        <p style={styles.tagline}>真相只有一个</p>
      </div>

      <Visualizer dataUrl="/conan-data.json" />

      {/* Pulsing dot animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 15%, #334155 50%, #475569 100%)',
    fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif",
    padding: '0 16px 48px',
  },
  banner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 40%, #2d1b3d 100%)',
    borderBottom: '3px solid',
    borderImage: 'linear-gradient(90deg, #c9a84c, #f5d680, #c9a84c) 1',
    padding: '28px 20px 20px',
    margin: '0 -16px 24px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    color: '#f5d680',
    letterSpacing: 3,
    textShadow: '0 2px 12px rgba(201, 168, 76, 0.4)',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(245, 214, 128, 0.65)',
    letterSpacing: 6,
  },
};

export default App;
