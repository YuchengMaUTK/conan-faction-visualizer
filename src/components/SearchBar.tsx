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
        placeholder="🔍 搜索角色姓名、代号或昵称..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={styles.input}
        aria-label="搜索角色"
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
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid rgba(201, 168, 76, 0.3)',
    fontSize: 14,
    outline: 'none',
    background: 'rgba(15, 23, 42, 0.8)',
    color: '#e2e8f0',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontFamily: "'Noto Sans SC', system-ui, sans-serif",
  },
};
