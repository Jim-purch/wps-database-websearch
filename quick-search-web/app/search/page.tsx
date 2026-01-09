"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Config {
  id: string;
  name: string;
  type: string;
}

export default function SearchPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [availableColumns, setAvailableColumns] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState('');

  const [searchText, setSearchText] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!user || !token) {
      router.push('/login');
      return;
    }

    // Fetch available configs
    fetch('/api/admin/scripts', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
          if(!res.ok) throw new Error("Unauthorized");
          return res.json();
      })
      .then(data => {
        setConfigs(data);
        if (data.length > 0) {
            setSelectedConfig(data[0].id);
        }
      })
      .catch(() => router.push('/login'));
  }, []);

  // Effect to load columns when config changes.
  // Removed sheetName from dependency to avoid rapid API calls.
  // Sheet name changes will only fetch on manual action or blur (if added).
  // Here we only auto-fetch if config changes.
  useEffect(() => {
      if(selectedConfig) {
          fetchColumns();
      }
  }, [selectedConfig]);

  const fetchColumns = async () => {
      const token = localStorage.getItem('token');
      if(!token) return;

      try {
        const res = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              scriptConfigId: selectedConfig,
              sheetName: sheetName,
              getColumns: true
            })
        });
        const data = await res.json();
        if(data.success && data.data && data.data.columns) {
            setAvailableColumns(data.data.columns);
        } else {
            setAvailableColumns([]);
        }
      } catch(e) {
          console.log("Error fetching columns", e);
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    setColumns([]);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scriptConfigId: selectedConfig,
          searchText,
          sheetName,
          fieldName: selectedField
        })
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Unknown error occurred');
      } else {
        const resultData = data.data;
        if (resultData && resultData.records) {
            setResults(resultData.records);

            if (resultData.records.length > 0) {
                setColumns(Object.keys(resultData.records[0]));
            } else if (resultData.columns) {
                if (Array.isArray(resultData.columns) && typeof resultData.columns[0] === 'object') {
                     setColumns(resultData.columns.map((c: any) => c.name));
                } else {
                     setColumns(resultData.columns);
                }
            }
        } else {
            setError("No records found or invalid response format.");
        }
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">Quick Search</h1>
        <button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); router.push('/login'); }} className="text-red-500">Logout</button>
      </div>

      <div className="bg-white p-6 rounded shadow mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
            <select
              className="w-full border p-2 rounded"
              value={selectedConfig}
              onChange={(e) => setSelectedConfig(e.target.value)}
            >
              {configs.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sheet Name</label>
            <input
              className="w-full border p-2 rounded"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              onBlur={() => fetchColumns()} // Fetch columns on blur
              placeholder="e.g. Sheet1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
            <select
              className="w-full border p-2 rounded"
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
            >
                <option value="">All Fields</option>
                {availableColumns.map((col, idx) => {
                    const name = typeof col === 'string' ? col : col.name;
                    return <option key={idx} value={name}>{name}</option>;
                })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Text</label>
            <input
              className="w-full border p-2 rounded"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Keywords..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-2 rounded text-white font-bold ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
          <p className="text-center text-gray-500">No results to display.</p>
      )}
    </div>
  );
}
