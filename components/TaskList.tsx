import React, { useMemo } from 'react';
import { Task, Priority } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdatePriority: (id: string, priority: Priority) => void;
  onAiBreakdown: (id: string) => void;
  onToggleExpansion: (id: string) => void;
  onAddSubtask: (parentId: string, text: string) => void;
  breakingDownId: string | null;
}

// Priority weights for sorting: High > Medium > Low
const priorityWeight = {
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
};

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onToggle, 
  onDelete,
  onUpdatePriority,
  onAiBreakdown,
  onToggleExpansion,
  onAddSubtask,
  breakingDownId
}) => {
  
  // Build hierarchy and sort
  const sortedTree = useMemo(() => {
    // 1. Separation
    const roots: Task[] = [];
    const childrenMap = new Map<string, Task[]>();
    const taskIds = new Set(tasks.map(t => t.id));

    tasks.forEach(task => {
      // It is a root if it has no parent OR its parent is not in the current list (orphaned by filter)
      const isRoot = !task.parentId || !taskIds.has(task.parentId);

      if (isRoot) {
        roots.push(task);
      } else if (task.parentId) {
        // It is a valid child of an existing parent
        if (!childrenMap.has(task.parentId)) {
          childrenMap.set(task.parentId, []);
        }
        childrenMap.get(task.parentId)!.push(task);
      }
    });

    // 2. Sorting Function
    const sortTasks = (taskList: Task[]) => {
      return [...taskList].sort((a, b) => {
        // Priority: High to Low
        const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (pDiff !== 0) return pDiff;
        
        // Time: Newest first
        return b.createdAt - a.createdAt;
      });
    };

    // 3. Sort roots
    const sortedRoots = sortTasks(roots);

    // 4. Sort children for each root
    childrenMap.forEach((list, parentId) => {
      childrenMap.set(parentId, sortTasks(list));
    });

    return { sortedRoots, childrenMap };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-slate-800 font-medium text-lg">All caught up!</h3>
        <p className="text-slate-400 text-sm mt-1">You have no tasks on your list.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {sortedTree.sortedRoots.map(root => {
        const subtasks = sortedTree.childrenMap.get(root.id) || [];
        const isExpanded = root.isExpanded ?? true;
        
        // Calculate progress stats
        const subtaskStats = subtasks.length > 0 ? {
          total: subtasks.length,
          completed: subtasks.filter(t => t.completed).length
        } : undefined;
        
        return (
          <div key={root.id} className="flex flex-col gap-2 transition-all">
            <TaskItem 
              task={root} 
              subtaskProgress={subtaskStats}
              onToggle={onToggle} 
              onDelete={onDelete}
              onUpdatePriority={onUpdatePriority}
              onAiBreakdown={onAiBreakdown}
              onToggleExpansion={onToggleExpansion}
              onAddSubtask={onAddSubtask}
              isBreakingDown={breakingDownId === root.id}
            />
            
            {/* Render subtasks if Expanded */}
            {isExpanded && subtasks.length > 0 && (
              <div className="flex flex-col gap-2 relative transition-all duration-300 ease-in-out">
                 {/* Visual connector line for the group */}
                 <div className="absolute left-6 top-0 bottom-4 w-px bg-slate-200 -z-10" />
                 
                 {subtasks.map(child => (
                   <TaskItem 
                     key={child.id} 
                     task={child} 
                     level={1}
                     onToggle={onToggle} 
                     onDelete={onDelete}
                     onUpdatePriority={onUpdatePriority}
                     onAiBreakdown={onAiBreakdown}
                     onToggleExpansion={onToggleExpansion}
                     onAddSubtask={onAddSubtask}
                     isBreakingDown={breakingDownId === child.id}
                   />
                 ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};