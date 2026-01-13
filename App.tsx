import React, { useState, useEffect, useCallback } from 'react';
import { Task, FilterType, Priority } from './types';
import { TaskList } from './components/TaskList';
import { AddTask } from './components/AddTask';
import { breakDownTask, getProductivityInsight } from './services/geminiService';
import { BrainIcon, SparklesIcon } from './components/Icons';

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('gemini-todo-tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [filter, setFilter] = useState<FilterType>(FilterType.ALL);
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist tasks to localStorage
  useEffect(() => {
    localStorage.setItem('gemini-todo-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const exportTasks = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-tasks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Basic validation: check if each item has an id and text
          const isValid = imported.every(t => t.id && t.text);
          if (isValid) {
            setTasks(prev => {
              const existingIds = new Set(prev.map(t => t.id));
              const uniqueNewTasks = imported.filter(t => !existingIds.has(t.id));

              if (uniqueNewTasks.length === 0) {
                setError("All tasks in this file are already present.");
                return prev;
              }

              setError(null);
              // Merge and sort by date descending (optional, but keeps UI consistent)
              const combined = [...prev, ...uniqueNewTasks].sort((a, b) => b.createdAt - a.createdAt);
              return combined;
            });
          } else {
            setError("Invalid backup file format.");
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const addTask = (text: string, priority: Priority = Priority.MEDIUM, isAiGenerated: boolean = false) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      priority,
      createdAt: Date.now(),
      isAiGenerated,
      isExpanded: true
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const addSubtask = (parentId: string, text: string) => {
    const newSubtask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      priority: Priority.MEDIUM,
      createdAt: Date.now(),
      isAiGenerated: false,
      parentId,
      isExpanded: true
    };

    setTasks(prev => {
      const updatedTasks = [...prev, newSubtask];
      return updatedTasks.map(t => t.id === parentId ? { ...t, isExpanded: true } : t);
    });
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const toggleTaskExpansion = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isExpanded: !(t.isExpanded ?? true) } : t
    ));
  };

  const updateTaskPriority = (id: string, priority: Priority) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id && t.parentId !== id));
  };

  const handleBreakdown = async (id: string) => {
    const taskToBreak = tasks.find(t => t.id === id);
    if (!taskToBreak) return;

    setBreakingDownId(id);
    setError(null);

    setTasks(prev => prev.map(t => t.id === id ? { ...t, isExpanded: true } : t));

    try {
      const subtasks = await breakDownTask(taskToBreak.text);

      if (subtasks.length > 0) {
        setTasks(prev => {
          const newSubTasks: Task[] = subtasks.map(st => ({
            id: crypto.randomUUID(),
            text: st.text,
            completed: false,
            priority: st.priority,
            createdAt: Date.now(),
            isAiGenerated: true,
            parentId: id,
            isExpanded: true
          }));

          const existingWithoutSubtasks = prev.filter(t => t.parentId !== id);
          return existingWithoutSubtasks.map(t =>
            t.id === id ? { ...t, isExpanded: true } : t
          ).concat(newSubTasks);
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to break down task. Please try again.");
    } finally {
      setBreakingDownId(null);
    }
  };

  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    setError(null);
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    try {
      const text = await getProductivityInsight(active, completed);
      setInsight(text);
    } catch (err) {
      console.error(err);
      setError("Failed to get AI insight.");
    } finally {
      setLoadingInsight(false);
    }
  }, [tasks]);

  useEffect(() => {
    if (tasks.length > 0 && !insight) {
      fetchInsight();
    }
  }, [tasks, insight, fetchInsight]);

  const filteredTasks = tasks.filter(t => {
    if (filter === FilterType.ACTIVE) return !t.completed;
    if (filter === FilterType.COMPLETED) return t.completed;
    return true;
  });

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              Gemini TaskFlow
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-slate-100">
              <button
                onClick={exportTasks}
                title="Export Backup"
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <label className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={importTasks}
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </label>
            </div>
            <button
              onClick={fetchInsight}
              disabled={loadingInsight}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200"
            >
              <BrainIcon className={`w-4 h-4 ${loadingInsight ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{loadingInsight ? 'Thinking...' : 'AI Insight'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        {insight && (
          <div className="mb-8 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg flex items-start gap-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-indigo-50 text-xs font-semibold uppercase tracking-wider mb-1">Gemini says</p>
              <p className="font-medium text-lg leading-relaxed">"{insight}"</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <p className="font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">My Tasks</h2>
            <p className="text-slate-500 text-sm mt-1">
              You have <strong className="text-indigo-600">{activeCount}</strong> active tasks
            </p>
          </div>

          <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
            {(Object.values(FilterType) as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <AddTask onAdd={(text) => addTask(text)} />

        <TaskList
          tasks={filteredTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdatePriority={updateTaskPriority}
          onAiBreakdown={handleBreakdown}
          onToggleExpansion={toggleTaskExpansion}
          onAddSubtask={addSubtask}
          breakingDownId={breakingDownId}
        />
      </main>
    </div>
  );
}

export default App;