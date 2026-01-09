"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token); // Store token
      if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/search');
      }
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-xs p-6 bg-white rounded shadow-md">
        <h1 className="text-xl font-bold mb-4">Login</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              value={username} onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Sign In
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500 text-center">Use admin/admin for first login</p>
      </div>
    </div>
  );
}
