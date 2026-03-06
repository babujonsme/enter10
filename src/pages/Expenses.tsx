import React, { useEffect, useState } from 'react';
import { fetcher } from '../lib/api';
import { Plus, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

export function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [error, setError] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    fetcher('/api/expenses')
      .then(setExpenses)
      .catch(err => console.error('Failed to load expenses:', err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await fetcher('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ ...newExpense, amount: parseFloat(newExpense.amount) }),
      });
      setShowModal(false);
      setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
      loadExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Expenses</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setError('');
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={20} />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-left text-gray-300">
          <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase font-medium">
            <tr>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Added By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {expenses.map((expense: any) => (
              <tr key={expense.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{expense.description}</td>
                <td className="px-6 py-4 text-emerald-400 font-mono">৳{expense.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-400">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{expense.added_by_name}</span>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-8 rounded-2xl w-full max-w-md border border-gray-700"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Add Expense</h2>
            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount (৳)</label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
