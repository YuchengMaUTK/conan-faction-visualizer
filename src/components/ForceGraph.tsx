import { useRef, useEffect, useState, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { GraphData, GraphNode } from '../engines/graph-adapter';

echarts.use([GraphChart, TooltipComponent, CanvasRenderer]);

interface ForceGraphProps {
  graphData: GraphData;
  searchResults: string[];
  searchQuery: string;
  onNodeClick: (id: string) => void;
}

export default function ForceGraph({
  graphData,
  searchResults,
  searchQuery,
  onNodeClick,
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const rafRef = useRef<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [circleSymbols, setCircleSymbols] = useState<Map<string, string>>(new Map());

  // --- Avatar preload: crop to circle via Canvas, generate data-URI symbols ---
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    const newFailed = new Set<string>();
    const newSymbols = new Map<string, string>();
    let pending = 0;
    let cancelled = false;

    const checkDone = () => {
      if (!cancelled && pending === 0) {
        setFailedImages(newFailed);
        setCircleSymbols(newSymbols);
      }
    };

    for (const node of graphData.nodes) {
      const avatarUrl = node.avatarUrl;
      if (!avatarUrl) continue;
      pending++;
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const border = 6;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const r = size / 2;
          // Draw circular avatar
          ctx.save();
          ctx.beginPath();
          ctx.arc(r, r, r - border / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, 0, 0, size, size);
          ctx.restore();
          // Draw border ring
          const borderColor = node.itemStyle.borderColor || '#94a3b8';
          ctx.beginPath();
          ctx.arc(r, r, r - border / 2, 0, Math.PI * 2);
          ctx.lineWidth = border;
          ctx.strokeStyle = borderColor;
          ctx.stroke();
          try {
            const dataUri = canvas.toDataURL('image/png');
            newSymbols.set(node.id, `image://${dataUri}`);
          } catch {
            // fallback: keep original
          }
        }
        pending--;
        checkDone();
      };
      img.onerror = () => {
        newFailed.add(node.id);
        pending--;
        checkDone();
      };
      img.src = avatarUrl;
    }

    if (pending === 0) checkDone();

    return () => { cancelled = true; };
  }, [graphData.nodes]);

  // --- Prepare nodes with search highlight + avatar fallback ---
  // ECharts graph uses `name` as the unique node key, so we set name=id
  // and use label.formatter for the display name.
  const prepareNodes = useCallback(
    (nodes: GraphNode[]): (GraphNode & { name: string })[] => {
      const searchSet =
        searchQuery.trim() !== '' ? new Set(searchResults) : null;

      return nodes.map((node) => {
        const copy = {
          ...node,
          name: node.id,
          itemStyle: { ...node.itemStyle },
          label: { ...node.label },
        };

        // Use circular SVG symbol if available
        const circleSvg = circleSymbols.get(node.id);
        if (circleSvg && !failedImages.has(node.id)) {
          copy.symbol = circleSvg;
          // Remove image texture fill since we're using SVG symbol now
          copy.itemStyle.color = undefined;
        }

        // Avatar fallback for failed images
        if (failedImages.has(node.id)) {
          copy.symbol = 'circle';
          const colors: Record<number, string> = {
            0: '#dc2626',
            1: '#475569',
            2: '#6b7280',
            3: '#8b5cf6',
          };
          copy.itemStyle.color = colors[node.category] ?? '#94a3b8';
          const displayName = node.label?.formatter || node.name;
          copy.label.formatter = displayName.charAt(0);
          copy.label.show = true;
        }

        // Search highlight: dim non-matching nodes
        // searchResults contains persona_ids; node.id is persona_id (Surface) or entity_id (GodEye)
        if (searchSet) {
          const matchId = node.persona_id ?? node.entity_id;
          if (!searchSet.has(matchId)) {
            copy.itemStyle = { ...copy.itemStyle, opacity: 0.15 } as typeof copy.itemStyle & { opacity: number };
          }
        }

        return copy;
      });
    },
    [searchQuery, searchResults, failedImages, circleSymbols]
  );

  // --- Build ECharts option ---
  const buildOption = useCallback(
    (nodes: GraphNode[]) => ({
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            const displayName = params.data.label?.formatter || params.data.name;
            return `${displayName}<br/>出场: ${params.data.value}`;
          }
          return params.data?.label?.formatter || '';
        },
      },
      series: [
        {
          type: 'graph' as const,
          layout: 'force' as const,
          roam: true,
          draggable: true,
          symbolClip: true,
          categories: graphData.categories,
          force: {
            repulsion: 300,
            gravity: 0.1,
            edgeLength: [80, 200],
            layoutAnimation: true,
          },
          emphasis: {
            focus: 'adjacency' as const,
            blurScope: 'global' as const,
            itemStyle: { borderWidth: 4 },
            lineStyle: { width: 3 },
            label: { show: true },
          },
          blur: {
            itemStyle: { opacity: 0.1 },
            lineStyle: { opacity: 0.1 },
            label: { show: false },
          },
          data: nodes,
          edges: graphData.edges,
          animationDuration: 500,
          animationEasingUpdate: 'cubicInOut',
        },
      ],
    }),
    [graphData.edges, graphData.categories]
  );

  // --- Init ECharts instance ---
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const chart = echarts.init(containerRef.current);
      chartRef.current = chart;
      setInitError(null);

      // Click handler: use entity_id or persona_id from node data
      chart.on('click', (params: any) => {
        if (params.dataType === 'node') {
          const nodeData = params.data;
          // In Surface Mode, persona_id is set; in God Eye Mode, use entity_id
          const clickId = nodeData?.persona_id ?? nodeData?.entity_id;
          if (clickId) {
            onNodeClick(clickId);
          }
        }
      });

      return () => {
        chart.dispose();
        chartRef.current = null;
      };
    } catch (err) {
      setInitError(err instanceof Error ? err.message : '图表初始化失败');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Update chart option (throttled with rAF) ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      try {
        const nodes = prepareNodes(graphData.nodes);
        const option = buildOption(nodes);
        chart.setOption(option, true);
      } catch (err) {
        console.error('[ForceGraph] setOption error:', err);
      }
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [graphData, prepareNodes, buildOption]);

  // --- ResizeObserver (debounced to avoid resize-during-init) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        chartRef.current?.resize();
      }, 100);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  // --- Error state with retry ---
  if (initError) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>❌ 图表加载失败</p>
        <p style={styles.errorDetail}>{initError}</p>
        <button
          style={styles.retryButton}
          onClick={() => setInitError(null)}
        >
          重试
        </button>
      </div>
    );
  }

  // --- Empty state ---
  if (graphData.nodes.length === 0) {
    return (
      <div style={styles.emptyContainer} data-testid="force-graph-empty">
        <p style={styles.emptyText}>暂无角色数据</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="force-graph-container"
      style={styles.container}
    />
  );
}

/* ── Styles ── */

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: 550,
    background: '#0f172a',
    borderRadius: 12,
  },
  emptyContainer: {
    width: '100%',
    minHeight: 500,
    background: '#0f172a',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
  errorContainer: {
    width: '100%',
    minHeight: 500,
    background: '#0f172a',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
  },
  errorDetail: {
    color: '#94a3b8',
    fontSize: 13,
    margin: 0,
  },
  retryButton: {
    marginTop: 8,
    padding: '8px 20px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
};
