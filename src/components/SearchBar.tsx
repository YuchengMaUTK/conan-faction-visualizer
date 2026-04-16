interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  return (
    <div style={styles.container} data-testid="search-bar">
      <input
        type="text"
        placeholder="搜索角色..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={styles.input}
        aria-label="搜索角色"
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#5e6ad2';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(94,106,210,0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 10,
    flex: 1,
  },
  input: {
    flex: 1,
    height: 36,
    padding: '0 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 14,
    outline: 'none',
    background: '#191a1b',
    color: '#f7f8f8',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    fontFamily: "'Inter Variable', Inter, 'Noto Sans SC', system-ui, sans-serif",
  },
};
