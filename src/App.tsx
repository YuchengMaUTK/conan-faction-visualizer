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

      <Visualizer dataUrl={`${import.meta.env.BASE_URL}conan-data.json`} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-page)',
    fontFamily: 'var(--font-primary)',
    padding: '0 16px 48px',
  },
  banner: {
    background: 'var(--bg-panel)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '24px 20px 18px',
    margin: '0 -16px 24px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: 590,
    color: '#f7f8f8',
    fontFamily: 'var(--font-cjk)',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: 400,
    color: '#62666d',
    fontFamily: 'var(--font-cjk)',
    letterSpacing: 1,
  },
};

export default App;
