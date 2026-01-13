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

  // Persist tasks
  useEffect(() => {
    localStorage.setItem('gemini-todo-tasks', JSON.stringify(tasks));
  }, [tasks]);

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
    
    // Ensure parent is expanded when adding a subtask
    setTasks(prev => {
      const updatedTasks = [...prev, newSubtask];
      return updatedTasks.map(t => t.id === parentId ? { ...t, isExpanded: true } : t);
    });
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
       if (t.id === id) {
           return { ...t, completed: !t.completed };
       }
       return t;
    }));
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
    // Delete task and its children
    setTasks(prev => prev.filter(t => t.id !== id && t.parentId !== id));
  };

  const handleBreakdown = async (id: string) => {
    const taskToBreak = tasks.find(t => t.id === id);
    if (!taskToBreak) return;

    setBreakingDownId(id);
    
    // Ensure the parent is expanded while loading/breaking down
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isExpanded: true } : t));
    
    const subtasks = await breakDownTask(taskToBreak.text);
    
    if (subtasks.length > 0) {
      setTasks(prev => {
        const newTasks = subtasks.map(st => ({
          id: crypto.randomUUID(),
          text: st.text,
          completed: false,
          priority: st.priority,
          createdAt: Date.now(),
          isAiGenerated: true,
          parentId: id,
          isExpanded: true
        }));

        // Remove existing subtasks for this parent to "regenerate" fresh ones
        const existingTasksWithoutOldSubtasks = prev.filter(t => t.parentId !== id);
        
        // Add existing tasks (minus old subtasks) + new subtasks
        // Also ensure parent stays expanded
        return existingTasksWithoutOldSubtasks.map(t => 
          t.id === id ? { ...t, isExpanded: true } : t
        ).concat(newTasks);
      });
    }
    setBreakingDownId(null);
  };

  const fetchInsight = useCallback(async () => {
    setLoadingInsight(true);
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const text = await getProductivityInsight(active, completed);
    setInsight(text);
    setLoadingInsight(false);
  }, [tasks]);

  // Initial insight on load if tasks exist
  useEffect(() => {
    if (tasks.length > 0 && !insight) {
      fetchInsight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTasks = tasks.filter(t => {
    if (filter === FilterType.ACTIVE) return !t.completed;
    if (filter === FilterType.COMPLETED) return t.completed;
    return true;
  });

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
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
          <button 
            onClick={fetchInsight}
            disabled={loadingInsight}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200"
          >
            <BrainIcon className={`w-4 h-4 ${loadingInsight ? 'animate-pulse' : ''}`} />
            <span>{loadingInsight ? 'Thinking...' : 'AI Insight'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        
        {/* Insight Banner */}
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

        {/* Status Bar */}
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
                className={`
                  px-4 py-1.5 text-sm font-medium rounded-md transition-all
                  ${filter === f 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                `}
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