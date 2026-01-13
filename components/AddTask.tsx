import React, { useState } from 'react';
import { PlusIcon } from './Icons';

interface AddTaskProps {
  onAdd: (text: string) => void;
}

export const AddTask: React.FC<AddTaskProps> = ({ onAdd }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative mb-6">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="w-full pl-5 pr-14 py-4 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg flex items-center justify-center transition-all"
      >
        <PlusIcon className="w-5 h-5" />
      </button>
    </form>
  );
};
