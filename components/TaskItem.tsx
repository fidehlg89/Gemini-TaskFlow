import React, { useState } from 'react';
import { Task, Priority } from '../types';
import { TrashIcon, CheckIcon, SparklesIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon } from './Icons';

interface TaskItemProps {
  task: Task;
  level?: number;
  subtaskProgress?: { completed: number; total: number };
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: Priority) => void;
  onAiBreakdown: (id: string) => void;
  onToggleExpansion: (id: string) => void;
  onAddSubtask: (parentId: string, text: string) => void;
  isBreakingDown: boolean;
}

const priorityConfig = {
  [Priority.HIGH]: { color: 'bg-red-50 text-red-700 border-red-200', label: 'High' },
  [Priority.MEDIUM]: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Medium' },
  [Priority.LOW]: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Low' },
};

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  level = 0,
  subtaskProgress,
  onToggle, 
  onDelete, 
  onUpdatePriority,
  onAiBreakdown,
  onToggleExpansion,
  onAddSubtask,
  isBreakingDown 
}) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const isSubtask = level > 0;
  const hasSubtasks = subtaskProgress && subtaskProgress.total > 0;
  const isExpanded = task.isExpanded ?? true;
  
  // Calculate percentage if subtasks exist
  const percentage = hasSubtasks 
    ? Math.round((subtaskProgress.completed / subtaskProgress.total) * 100) 
    : 0;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskText.trim()) {
      onAddSubtask(task.id, newSubtaskText.trim());
      setNewSubtaskText('');
      setIsAddingSubtask(false);
    }
  };

  const handleFormBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    // If the new focus is not within the form, close it
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsAddingSubtask(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAddingSubtask(false);
    }
  };

  return (
    <div 
      className={`
        group relative flex flex-col p-3 rounded-xl border transition-all duration-300
        ${isSubtask ? 'ml-8 bg-slate-50/50 border-slate-100' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}
        ${task.completed ? 'opacity-60' : ''}
        ${isBreakingDown ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Expand/Collapse Toggle or Subtask Connector */}
        {!isSubtask ? (
          <button 
            onClick={() => onToggleExpansion(task.id)}
            className={`mt-1 text-slate-400 hover:text-indigo-600 transition-colors ${!hasSubtasks && !isAddingSubtask ? 'opacity-0 hover:opacity-100' : ''}`}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        ) : (
          <div className="absolute -left-5 top-5 w-4 h-px bg-slate-300" />
        )}
        
        {isSubtask && (
          <div className="absolute -left-5 top-0 bottom-1/2 w-px bg-slate-300" />
        )}

        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`
            mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
            ${task.completed 
              ? 'bg-emerald-500 border-emerald-500' 
              : 'border-slate-300 hover:border-emerald-400'}
          `}
        >
          {task.completed && <CheckIcon className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span 
            className={`
              text-sm font-medium transition-all duration-200
              ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}
            `}
          >
            {task.text}
          </span>
          
          <div className="flex items-center gap-2">
            {/* Priority Selector */}
            <div className="relative group/priority">
              <select
                value={task.priority}
                onChange={(e) => onUpdatePriority(task.id, e.target.value as Priority)}
                className={`
                  appearance-none cursor-pointer text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider outline-none
                  ${priorityConfig[task.priority].color}
                  hover:opacity-80 transition-opacity
                `}
                onClick={(e) => e.stopPropagation()}
              >
                <option value={Priority.HIGH}>High</option>
                <option value={Priority.MEDIUM}>Medium</option>
                <option value={Priority.LOW}>Low</option>
              </select>
            </div>

            {task.isAiGenerated && (
              <span className="text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                <SparklesIcon className="w-3 h-3" /> AI
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!task.completed && !isSubtask && (
            <>
              <button
                onClick={() => setIsAddingSubtask(!isAddingSubtask)}
                className={`p-1.5 rounded-lg transition-colors tooltip-trigger ${isAddingSubtask ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
                title="Add manual subtask"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAiBreakdown(task.id)}
                disabled={isBreakingDown}
                className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors tooltip-trigger relative"
                title="Regenerate subtasks with AI"
              >
                <SparklesIcon className={`w-3.5 h-3.5 ${isBreakingDown ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Manual Subtask Input Form */}
      {isAddingSubtask && (
        <form 
          onSubmit={handleManualSubmit} 
          onBlur={handleFormBlur}
          className="mt-2 ml-8 flex gap-2"
        >
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type subtask..."
            className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-indigo-400 text-slate-700 placeholder:text-slate-400"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newSubtaskText.trim()}
            className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}

      {/* Progress Bar (Visible even if collapsed) */}
      {hasSubtasks && (
        <div className="mt-3 w-full pl-8 pr-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              {isExpanded ? 'Progress' : `${subtaskProgress.completed}/${subtaskProgress.total} Subtasks`}
            </span>
            <span className={`text-[10px] font-bold ${percentage === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
              {percentage}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
