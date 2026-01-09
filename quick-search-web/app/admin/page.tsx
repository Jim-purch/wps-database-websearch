"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Config {
  id: string;
  name: string;
  type: string;
  file_id: string;
  script_id: string;
  token: string;
}

export default function AdminDashboard() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [form, setForm] = useState({ name: '', type: 'DBSHEET', file_id: '', script_id: '', token: '' });
  const router = useRouter();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    if (user.role !== 'ADMIN' || !token) {
      router.push('/login');
      return;
    }
    fetchConfigs(token);
  }, []);

  const fetchConfigs = async (token: string) => {
    const res = await fetch('/api/admin/scripts', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
        const data = await res.json();
        setConfigs(data);
    } else {
        router.push('/login');
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`/api/admin/scripts?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchConfigs(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch('/api/admin/scripts', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });
    setForm({ name: '', type: 'DBSHEET', file_id: '', script_id: '', token: '' });
    fetchConfigs(token);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard - Script Management</h1>
        <button onClick={() => router.push('/search')} className="text-blue-500 underline">Go to Search</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Add New Data Source</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input className="border p-2 w-full rounded" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Sales Data" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select className="border p-2 w-full rounded" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="DBSHEET">Multi-dimensional Sheet (DB)</option>
                <option value="SMARTSHEET">Smart Sheet (Excel)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">File ID</label>
              <input className="border p-2 w-full rounded" required value={form.file_id} onChange={e => setForm({...form, file_id: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Script ID</label>
              <input className="border p-2 w-full rounded" required value={form.script_id} onChange={e => setForm({...form, script_id: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Token (airscript_token)</label>
              <input className="border p-2 w-full rounded" required value={form.token} onChange={e => setForm({...form, token: e.target.value})} />
            </div>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Add Config</button>
          </form>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Existing Configurations</h2>
          <ul className="space-y-4">
            {configs.map(config => (
              <li key={config.id} className="border p-4 rounded flex justify-between items-center">
                <div>
                  <div className="font-bold">{config.name}</div>
                  <div className="text-sm text-gray-500">{config.type}</div>
                  <div className="text-xs text-gray-400">{config.file_id}</div>
                </div>
                <button onClick={() => handleDelete(config.id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Delete</button>
              </li>
            ))}
            {configs.length === 0 && <p className="text-gray-500">No configs found.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}
