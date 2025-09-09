'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from 'lucide-react';

interface ComponentResult {
  id: number;
  code: string;
  name: string;
  price: number | null;
  category: string;
  score: number;
  method: string;
  source: 'component' | 'equipment';
}

type SearchMethod = 'levenshtein' | 'trigram';
type SortDirection = 'asc' | 'desc';
type SortKey = keyof Pick<ComponentResult, 'code' | 'name' | 'price' | 'score' | 'category'>;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export default function ComponentSearch() {
  /* ----------------------- 検索用ステート ------------------------- */
  const [query, setQuery] = useState('ケーブル 600VCV 14Sq-3C');
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('trigram');
  const [targets, setTargets] = useState<('component' | 'equipment')[]>(['component', 'equipment']); // NEW
  const targetsRef = useRef<('component' | 'equipment')[]>(['component', 'equipment']);
  const [limit, setLimit] = useState<number>(100);

  /* ----------------------- 結果 & UI ステート ---------------------- */
  const [results, setResults] = useState<ComponentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ----------------------- ソート関連 ------------------------------ */
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]); // NEW
  // Keep ref synced with state in case of any non-checkbox updates
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  /* ----------------------- Snackbar ------------------------------- */
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  const [snackbarAnimatingOut, setSnackbarAnimatingOut] = useState(false);
  const visibilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /* ----------------------- ハンドラ ------------------------------- */
  const handleCopy = (text: string) => {
    if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);

    setSnackbarVisible(false);
    setSnackbarAnimatingOut(false);

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbarMessage(`「${text}」をコピーしました`);
        setSnackbarType('success');
        setTimeout(() => setSnackbarVisible(true), 10);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        setSnackbarMessage('コピーに失敗しました');
        setSnackbarType('error');
        setTimeout(() => setSnackbarVisible(true), 10);
      });
  };

  /* snackbar visibility timer */
  useEffect(() => {
    if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);

    if (snackbarVisible) {
      setSnackbarAnimatingOut(false);

      visibilityTimerRef.current = setTimeout(() => {
        setSnackbarAnimatingOut(true);
        animationTimerRef.current = setTimeout(() => {
          setSnackbarVisible(false);
        }, 300);
      }, 2700);
    }

    return () => {
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [snackbarVisible]);

  /* ----------------------- データ取得 ----------------------------- */
  const searchComponents = async () => {
    const currentTargets = targetsRef.current;
    if (currentTargets.length === 0) {
      setError('検索対象を 1 つ以上選択してください');
      return;
    }

    setLoading(true);
    setError(null);

    // Map targets to categories (use ref to avoid stale state)
    const categoryParams = currentTargets
      .map((t) => `category[]=${encodeURIComponent(t === 'component' ? '部材費' : '機器費')}`)
      .join('&');
    
    const url = `/api/search?query=${encodeURIComponent(query)}&method=${searchMethod}&limit=${limit}&${categoryParams}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch components');
      const data = await res.json();
      setResults(data.results);
      setSortConfigs([]); // 検索し直したらソート条件リセット
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching components:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------- ソートロジック ------------------------- */
  const handleSort = (key: SortKey, e: MouseEvent) => {
    setSortConfigs((prev) => {
      const existing = prev.find((c) => c.key === key);
      const direction: SortDirection =
        existing?.direction === 'asc' ? 'desc' : 'asc';

      const newConfigs = e.shiftKey
        ? prev.filter((c) => c.key !== key) // Shift+クリックなら多重ソート
        : [];

      newConfigs.push({ key, direction });
      return newConfigs;
    });
  };

  const sortedResults = (() => {
    if (sortConfigs.length === 0) return results;

    return [...results].sort((a, b) => {
      for (const { key, direction } of sortConfigs) {
        const dir = direction === 'asc' ? 1 : -1;
        const av = a[key] ?? '';
        const bv = b[key] ?? '';
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
      }
      return 0;
    });
  })();

  /* ----------------------- JSX ----------------------------------- */
  return (
    <div className="w-full mx-auto max-w-5xl">
      {/* ---------- 検索フォーム ---------- */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">建設物価/機器費検索</h2>

        <div className="flex flex-col gap-3">
          {/* Query + Button */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="検索文字列を入力"
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
            />
            <button
              onClick={searchComponents}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>

          {/* Search Method */}
          <div className="flex items-center gap-4 hidden">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">検索方法:</span>

            <label className="inline-flex items-center hidden"> 
              <input
                type="radio"
                name="searchMethod"
                value="levenshtein"
                checked={searchMethod === 'levenshtein'}
                onChange={() => setSearchMethod('levenshtein')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                レーベンシュタイン距離
              </span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="searchMethod"
                value="trigram"
                checked={searchMethod === 'trigram'}
                onChange={() => setSearchMethod('trigram')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                トライグラム類似度
              </span>
            </label>
          </div>

          {/* Targets */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">検索対象:</span>
            {(['component', 'equipment'] as const).map((t) => (
              <label key={t} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={targets.includes(t)}
                  onChange={(e) => {
                    setTargets((prev) => {
                      const next = e.target.checked
                        ? (prev.includes(t) ? prev : [...prev, t])
                        : prev.filter((x) => x !== t);
                      // Keep a ref in sync so the search uses the freshest value
                      targetsRef.current = next;
                      return next;
                    });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t === 'component' ? '部材費' : '機器費'}
                </span>
              </label>
            ))}
          </div>

          {/* Limit */}
          <div className="flex gap-2 items-center">
            <label htmlFor="limit" className="text-sm font-medium text-gray-700 dark:text-gray-300">候補数:</label>
            <input
              type="number"
              id="limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* ---------- エラー ---------- */}
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {/* ---------- メタ情報 ---------- */}
      {false && results.length > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          検索方法: {searchMethod === 'trigram' ? 'トライグラム類似度' : 'レーベンシュタイン距離'} / 対象:
          {targets.map((t) => (t === 'component' ? ' 部材費' : ' 機器費')).join(', ')}
        </div>
      )}

      {/* ---------- 結果テーブル ---------- */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {[
                { key: 'code', label: '品名コード', sortable: true },
                { key: 'name', label: '名前', sortable: true },
                { key: 'price', label: '価格', sortable: true },
                { key: 'score', label: '類似度', sortable: true },
                { key: 'category', label: '種別', sortable: true },
              ].map(({ key, label, sortable }) => (
                <th
                  key={key}
                  scope="col"
                  className={`px-6 py-3 ${key === 'price' ? 'text-right' : key === 'score' ? 'text-center' : 'text-left'} text-xs font-medium uppercase tracking-wider dark:text-gray-400 ${
                    sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={sortable ? (e) => handleSort(key as SortKey, e) : undefined}
                >
                  <div className={`flex items-center gap-1 ${key === 'price' ? 'justify-end' : key === 'score' ? 'justify-center' : ''}`}>
                    {label}
                    {sortable && (
                      (() => {
                        const cfg = sortConfigs.find((c) => c.key === key);
                        return cfg ? (
                          cfg.direction === 'asc' ? (
                            <ArrowUpNarrowWide size={14} />
                          ) : (
                            <ArrowDownWideNarrow size={14} />
                          )
                        ) : null;
                      })()
                    )}
                  </div>
                </th>
              ))}
              {/* Copy column */}
              <th
                scope="col"
                className="px-1 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                aria-label="Copy action"
              />
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
            {sortedResults.length > 0 ? (
              sortedResults.map((component) => (
                <tr key={`${component.source}-${component.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {component.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {component.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {component.price === null ? '単価未設定' : `¥${component.price.toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    {component.score.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {component.category}
                  </td>
                  <td className="px-1 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <button
                      onClick={() => handleCopy(component.name)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Copy ${component.name} to clipboard`}
                    >
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {loading ? '読み込み中...' : '結果がありません'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Snackbar ---------- */}
      {snackbarVisible && (
        <div
          className={`fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border transition-all duration-300 ease-in-out transform
            ${
              snackbarType === 'success'
                ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700'
            }
            ${snackbarAnimatingOut ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          {snackbarType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{snackbarMessage}</span>
        </div>
      )}
    </div>
  );
}
