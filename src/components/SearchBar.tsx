import type { SubFaction } from '../types';

interface SearchBarProps {
  searchQuery: string;
  subFactionFilter: SubFaction | null;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: SubFaction | null) => void;
}

const SUB_FACTIONS: { value: SubFaction | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'FBI', label: 'FBI' },
  { value: 'CIA', label: 'CIA' },
  { value: 'PSB', label: '公安警察' },
  { value: 'POLICE', label: '警察' },
  { value: 'DETECTIVE', label: '侦探' },
  { value: 'DETECTIVE_BOYS', label: '少年侦探团' },
  { value: 'BO_CORE', label: '组织核心' },
  { value: 'BO_OUTER', label: '组织外围' },
];

export default function SearchBar({
  searchQuery,
  subFactionFilter,
  onSearchChange,
  onFilterChange,
}: SearchBarProps) {
  return (
    <div style={styles.container} data-testid="search-bar">
      <input
        type="text"
        placeholder="🔍 搜索角色姓名或代号..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={styles.input}
        aria-label="搜索角色"
      />
      <select
        value={subFactionFilter ?? ''}
        onChange={(e) => onFilterChange(e.target.value === '' ? null : (e.target.value as SubFaction))}
        style={styles.select}
        aria-label="阵营子分类筛选"
      >
        {SUB_FACTIONS.map((sf) => (
          <option key={sf.value} value={sf.value}>
            {sf.label}
          </option>
        ))}
      </select>
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
  select: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(201, 168, 76, 0.3)',
    fontSize: 13,
    background: 'rgba(15, 23, 42, 0.8)',
    cursor: 'pointer',
    outline: 'none',
    color: '#e2e8f0',
    transition: 'border-color 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    fontFamily: "'Noto Sans SC', system-ui, sans-serif",
  },
};
