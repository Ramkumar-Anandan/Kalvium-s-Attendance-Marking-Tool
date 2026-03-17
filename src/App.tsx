import React, { useState, useRef, useMemo } from 'react';
import { Upload, Download, Users, MapPin, CheckSquare, Undo2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Member, AttendanceStatus, STATUSES } from './types';
import { parseCSV, exportCSV } from './utils/csv';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<Member[][]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setSelectedMembers(new Set());
  }, [selectedCampus]);

  const campuses = useMemo(() => {
    const uniqueCampuses = Array.from(new Set(members.map((m) => m.campus)));
    return uniqueCampuses.sort();
  }, [members]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedMembers = await parseCSV(file);
      setMembers(parsedMembers);
      setHistory([]);
      if (parsedMembers.length > 0) {
        const uniqueCampuses = Array.from(new Set(parsedMembers.map((m) => m.campus))).sort();
        setSelectedCampus(uniqueCampuses[0]);
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Failed to parse CSV file.');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (members.length === 0) {
      alert('No data to export.');
      return;
    }
    exportCSV(members);
  };

  const updateMemberStatus = (memberId: string, newStatus: AttendanceStatus) => {
    setHistory((prev) => [...prev, members]);
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: newStatus } : m))
    );
  };

  const markAllUnassignedAs = (status: AttendanceStatus) => {
    if (!selectedCampus) return;
    setHistory((prev) => [...prev, members]);
    setMembers((prev) =>
      prev.map((m) =>
        m.campus === selectedCampus && m.status === 'Unassigned'
          ? { ...m, status }
          : m
      )
    );
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setMembers(previousState);
    setHistory((prev) => prev.slice(0, -1));
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedMembers(new Set());
  };

  const moveSelectedMembers = (status: AttendanceStatus) => {
    if (selectedMembers.size === 0) return;
    setHistory((prev) => [...prev, members]);
    setMembers((prev) =>
      prev.map((m) =>
        selectedMembers.has(m.id) ? { ...m, status } : m
      )
    );
    clearSelection();
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    e.dataTransfer.setData('memberId', memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: AttendanceStatus) => {
    e.preventDefault();
    const memberId = e.dataTransfer.getData('memberId');
    if (memberId) {
      updateMemberStatus(memberId, status);
    }
  };

  const filteredMembers = useMemo(() => {
    if (!selectedCampus) return [];
    return members.filter((m) => m.campus === selectedCampus);
  }, [members, selectedCampus]);

  const membersByStatus = useMemo(() => {
    const grouped: Record<AttendanceStatus, Member[]> = {
      Unassigned: [],
      Present: [],
      'On leave': [],
      AWOL: [],
      Late: [],
      'Half day leave': [],
      Remote: [],
      Holiday: [],
      'Half day remote': [],
      Permission: [],
    };
    filteredMembers.forEach((m) => {
      grouped[m.status].push(m);
    });
    return grouped;
  }, [filteredMembers]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'On leave': return 'bg-rose-100 border-rose-300 text-rose-800';
      case 'AWOL': return 'bg-red-100 border-red-400 text-red-900 font-bold';
      case 'Late': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'Half day leave': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'Remote': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'Holiday': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'Half day remote': return 'bg-sky-100 border-sky-300 text-sky-800';
      case 'Permission': return 'bg-teal-100 border-teal-300 text-teal-800';
      case 'Unassigned': return 'bg-slate-100 border-slate-300 text-slate-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: 'rgb(255, 3, 13)' }}>
            <CheckSquare size={24} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Kalvium's Attendance Marking Tool</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-700"
            title="Undo last action"
          >
            <Undo2 size={16} />
            Undo
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            disabled={members.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'rgb(255, 3, 13)' }}
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campuses</h2>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {campuses.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8 px-4">
                Import a CSV to see campuses
              </div>
            ) : (
              campuses.map((campus) => {
                const campusMembers = members.filter(m => m.campus === campus);
                const unassignedCount = campusMembers.filter(m => m.status === 'Unassigned').length;
                
                return (
                  <button
                    key={campus}
                    onClick={() => setSelectedCampus(campus)}
                    className={cn(
                      "flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all",
                      selectedCampus === campus
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={16} className={selectedCampus === campus ? "text-indigo-500" : "text-slate-400"} />
                      <span className="font-medium truncate">{campus}</span>
                    </div>
                    {unassignedCount > 0 && (
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {unassignedCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Board Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {!selectedCampus ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a campus to view members</p>
              <p className="text-sm mt-1">Or import a CSV file to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 h-full">
              {/* Unassigned Pool */}
              <div 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'Unassigned')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Unassigned Members ({membersByStatus['Unassigned'].length})
                    </h3>
                    {membersByStatus['Unassigned'].length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markAllUnassignedAs('Present')}
                          className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2.5 py-1 rounded-md font-medium transition-colors border border-emerald-200 shadow-sm"
                        >
                          Mark All Present
                        </button>
                        <button
                          onClick={() => markAllUnassignedAs('Remote')}
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1 rounded-md font-medium transition-colors border border-blue-200 shadow-sm"
                        >
                          Mark All Remote
                        </button>
                        <button
                          onClick={() => markAllUnassignedAs('Holiday')}
                          className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2.5 py-1 rounded-md font-medium transition-colors border border-purple-200 shadow-sm"
                        >
                          Mark All Holiday
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Drag to assign status</span>
                </div>
                <div className="flex flex-wrap gap-3 min-h-[60px]">
                  <AnimatePresence>
                    {membersByStatus['Unassigned'].map((member) => (
                      <MemberBubble
                        key={member.id}
                        member={member}
                        onDragStart={handleDragStart}
                        colorClass={getStatusColor('Unassigned')}
                        isSelected={selectedMembers.has(member.id)}
                        onToggleSelect={toggleMemberSelection}
                      />
                    ))}
                  </AnimatePresence>
                  {membersByStatus['Unassigned'].length === 0 && (
                    <div className="w-full flex items-center justify-center text-sm text-slate-400 italic py-4 border-2 border-dashed border-slate-100 rounded-xl">
                      All members assigned
                    </div>
                  )}
                </div>
              </div>

              {/* Status Buckets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {STATUSES.filter(s => s !== 'Unassigned').map((status) => (
                  <div
                    key={status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-colors hover:border-indigo-200"
                  >
                    <div className={cn("px-4 py-3 border-b flex justify-between items-center", getStatusColor(status).split(' ')[0], getStatusColor(status).split(' ')[1])}>
                      <h3 className="text-sm font-bold uppercase tracking-wider">{status}</h3>
                      <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">
                        {membersByStatus[status].length}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-2 min-h-[120px] bg-slate-50/30">
                      <AnimatePresence>
                        {membersByStatus[status].map((member) => (
                          <MemberBubble
                            key={member.id}
                            member={member}
                            onDragStart={handleDragStart}
                            colorClass={getStatusColor(status)}
                            fullWidth
                            isSelected={selectedMembers.has(member.id)}
                            onToggleSelect={toggleMemberSelection}
                          />
                        ))}
                      </AnimatePresence>
                      {membersByStatus[status].length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                          Drop here
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedMembers.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-2xl rounded-2xl border border-slate-200 p-4 flex items-center gap-4 z-50"
          >
            <div className="flex items-center gap-2 px-2">
              <div className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                {selectedMembers.size}
              </div>
              <span className="text-sm font-medium text-slate-700">selected</span>
            </div>
            
            <div className="w-px h-8 bg-slate-200" />
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 mr-2">Move to:</span>
              <select 
                className="text-sm border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1.5"
                onChange={(e) => moveSelectedMembers(e.target.value as AttendanceStatus)}
                value=""
              >
                <option value="" disabled>Select status...</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-8 bg-slate-200" />
            
            <button 
              onClick={clearSelection}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Clear selection"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MemberBubbleProps {
  member: Member; 
  onDragStart: (e: React.DragEvent, id: string) => void;
  colorClass: string;
  fullWidth?: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const MemberBubble: React.FC<MemberBubbleProps> = ({ 
  member, 
  onDragStart, 
  colorClass,
  fullWidth = false,
  isSelected,
  onToggleSelect
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      draggable
      onDragStart={(e: any) => onDragStart(e, member.id)}
      className={cn(
        "relative cursor-grab active:cursor-grabbing border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow bg-white group",
        fullWidth ? "w-full" : "w-auto min-w-[180px]",
        colorClass.replace('bg-', 'border-').replace('100', '300'),
        isSelected && "ring-2 ring-indigo-500 border-transparent shadow-md"
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => onToggleSelect(member.id)}
          className={cn(
            "w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        />
      </div>
      <div className="font-medium text-sm text-slate-900 truncate pr-6">{member.name}</div>
      <div className="text-xs text-slate-500 truncate mt-0.5">{member.designation}</div>
    </motion.div>
  );
};
