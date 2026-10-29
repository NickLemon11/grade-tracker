import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, X, Calendar, CheckSquare, Square, Trash2, Edit3, 
  ArrowLeft, ChevronDown, ChevronUp, Download, Upload 
} from 'lucide-react';

// --- INITIAL MOCK / DEFAULT DATA --
const INITIAL_CLASSES = [
  {
    id: 'class-1',
    code: 'EG-101',
    name: 'EXAMPLE',
    color: 'bg-[#FAF0D4] text-[#4A3226] border-[#D4BD99]',
    gradeComponents: [
      {
        id: 'gt-1',
        name: 'Midterm Exam',
        weight: 20,
        receivedGrade: null,
        date: '2026-11-02',
        subDivisions: [],
        checklist: [
          { id: 'chk-1', text: 'Review course notes', completed: true },
          { id: 'chk-2', text: 'Practice problem sets', completed: false }
        ]
      },
      {
        id: 'gt-2',
        name: 'Lab Reports',
        weight: 25,
        receivedGrade: null,
        date: null,
        subDivisions: [
          { id: 'sub-1', name: 'Pre-Lab Quiz', weight: '1/2', grade: 90, date: '2026-11-01' },
          { id: 'sub-2', name: 'Post-Lab Analysis', weight: '1/2', grade: null, date: '2026-11-05' }
        ],
        checklist: [
          { id: 'chk-3', text: 'Complete error propagation calculations', completed: false }
        ]
      }
    ]
  }
];

const STICKY_COLORS = [
  { name: 'Cream', class: 'bg-[#FAF0D4] text-[#4A3226] border-[#D4BD99]' },
  { name: 'Sage', class: 'bg-[#D6E8DC] text-[#1E3A3A] border-[#A8CCA8]' },
  { name: 'Rose', class: 'bg-[#FFDEF2] text-[#52150E] border-[#AD7BAD]' },
  { name: 'Sky', class: 'bg-[#D4F1FF] text-[#1B2631] border-[#B2BABB]' },
  { name: 'Fuzz', class: 'bg-[#F7DCCE] text-[#641E16] border-[#E8A88A]' },
  { name: 'Lavender', class: 'bg-[#EBDCEF] text-[#3D2248] border-[#C39BD3]' },
];

const parseWeightValue = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return (num / den) * 100;
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export default function App() {
  useEffect(() => {
    document.title = 'pointA';
  }, []);

  const [classes, setClasses] = useState(() => {
    const saved = localStorage.getItem('chalkboard_classes');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });
  
  const [activeClassId, setActiveClassId] = useState(null);
  const [highlightedComponentId, setHighlightedComponentId] = useState(null);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassColor, setNewClassColor] = useState(STICKY_COLORS[0].class);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('chalkboard_classes', JSON.stringify(classes));
  }, [classes]);

  // --- EXPORT & IMPORT BACKUP LOGIC ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(classes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `pointA-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedClasses = JSON.parse(event.target.result);
        if (Array.isArray(importedClasses)) {
          setClasses(importedClasses);
          alert('Successfully imported your grade tracker data!');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse the backup file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  // --- HELPER FUNCTIONS ---
  const calculateGradeComponentScore = (gt) => {
    if (gt.subDivisions && gt.subDivisions.length > 0) {
      let totalWeightedScore = 0;
      let totalSubWeight = 0;
      gt.subDivisions.forEach(sub => {
        const parsedWeight = parseWeightValue(sub.weight);
        if (sub.grade !== null && sub.grade !== '') {
          totalWeightedScore += Number(sub.grade) * (parsedWeight / 100);
          totalSubWeight += parsedWeight;
        }
      });
      return totalSubWeight > 0 ? (totalWeightedScore / (totalSubWeight / 100)) : null;
    }
    return gt.receivedGrade !== null && gt.receivedGrade !== '' ? Number(gt.receivedGrade) : null;
  };

  const calculateOverallClassGrade = (cls) => {
    let totalWeightedScore = 0;
    let totalAssignedWeight = 0;

    cls.gradeComponents.forEach(gt => {
      const score = calculateGradeComponentScore(gt);
      if (score !== null) {
        totalWeightedScore += score * (Number(gt.weight) / 100);
        totalAssignedWeight += Number(gt.weight);
      }
    });

    if (totalAssignedWeight === 0) return null;
    return Math.round((totalWeightedScore / totalAssignedWeight) * 100 * 10) / 10;
  };

  const calculateAchievedScoreSoFar = (cls) => {
    let totalEarnedPoints = 0;
    let hasAnyGrade = false;

    cls.gradeComponents.forEach(gt => {
      const compWeight = Number(gt.weight);

      if (gt.subDivisions && gt.subDivisions.length > 0) {
        let subWeightSum = 0;
        let subEarnedSum = 0;

        gt.subDivisions.forEach(sub => {
          const pWeight = parseWeightValue(sub.weight);
          subWeightSum += pWeight;
          if (sub.grade !== null && sub.grade !== '') {
            hasAnyGrade = true;
            subEarnedSum += Number(sub.grade) * (pWeight / 100);
          }
        });

        if (subWeightSum > 0) {
          const fractionEarned = subEarnedSum / subWeightSum;
          totalEarnedPoints += fractionEarned * compWeight;
        }
      } else {
        if (gt.receivedGrade !== null && gt.receivedGrade !== '') {
          hasAnyGrade = true;
          totalEarnedPoints += Number(gt.receivedGrade) * (compWeight / 100);
        }
      }
    });

    if (!hasAnyGrade) return null;

    return Math.round(totalEarnedPoints * 10) / 10;
  };

  const getUottawaStanding = (grade) => {
    if (grade === null) return "Let's get started!";
    if (grade >= 90) return "A+ | 10";
    if (grade >= 85) return "A | 9";
    if (grade >= 80) return "A- | 8";
    if (grade >= 75) return "B+ | 7";
    if (grade >= 70) return "B | 6";
    if (grade >= 65) return "C+ | 5";
    if (grade >= 60) return "C | 4";
    if (grade >= 55) return "D+ | 3";
    if (grade >= 50) return "D | 2";
    if (grade >= 40) return "E | 1";
    return "F | 0";
  };

  const isDateInNext7Days = (dateString) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureLimit = new Date(today);
    futureLimit.setDate(today.getDate() + 10);
    futureLimit.setHours(23, 59, 59, 999);

    const targetDate = new Date(dateString);
    return targetDate >= today && targetDate <= futureLimit;
  };

  const getUpcomingTasks = () => {
    const tasks = [];
    classes.forEach(cls => {
      cls.gradeComponents.forEach(gt => {
        if (gt.subDivisions && gt.subDivisions.length > 0) {
          gt.subDivisions.forEach(sub => {
            if (isDateInNext7Days(sub.date)) {
              tasks.push({
                name: `${gt.name} - ${sub.name}`,
                date: sub.date,
                weight: Math.round(parseWeightValue(sub.weight) * 10) / 10,
                classCode: cls.code,
                className: cls.name,
                classId: cls.id,
                componentId: gt.id,
                subId: sub.id,
                classColor: cls.color,
                isCompleted: !!sub.isCompleted
              });
            }
          });
        } else if (isDateInNext7Days(gt.date)) {
          tasks.push({
            name: gt.name,
            date: gt.date,
            weight: gt.weight,
            classCode: cls.code,
            className: cls.name,
            classId: cls.id,
            componentId: gt.id,
            subId: null,
            classColor: cls.color,
            isCompleted: !!gt.isCompleted
          });
        }
      });
    });
    return tasks;
  };

  const handleToggleTaskCompleted = (classId, componentId, subId, e) => {
    e.stopPropagation();
    setClasses(classes.map(cls => {
      if (cls.id !== classId) return cls;
      const updatedComponents = cls.gradeComponents.map(gt => {
        if (gt.id !== componentId) return gt;
        if (subId) {
          const updatedSubs = gt.subDivisions.map(sub => {
            if (sub.id === subId) {
              return { ...sub, isCompleted: !sub.isCompleted };
            }
            return sub;
          });
          return { ...gt, subDivisions: updatedSubs };
        } else {
          return { ...gt, isCompleted: !gt.isCompleted };
        }
      });
      return { ...cls, gradeComponents: updatedComponents };
    }));
  };

  const handleAddClass = (e) => {
    e.preventDefault();
    if (!newClassCode.trim() || !newClassName.trim()) return;

    const newClass = {
      id: 'class-' + Date.now(),
      code: newClassCode.toUpperCase(),
      name: newClassName,
      color: newClassColor,
      gradeComponents: []
    };

    setClasses([...classes, newClass]);
    setNewClassCode('');
    setNewClassName('');
    setIsAddClassOpen(false);
  };

  const handleDeleteClass = (classId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this class?")) {
      setClasses(classes.filter(c => c.id !== classId));
      if (activeClassId === classId) {
        setActiveClassId(null);
      }
    }
  };

  const handleChangeClassColor = (classId, newColorClass, e) => {
    e.stopPropagation();
    setClasses(classes.map(c => c.id === classId ? { ...c, color: newColorClass } : c));
  };

  const handleSelectTaskFromNoticeBoard = (classId, componentId) => {
    setActiveClassId(classId);
    setHighlightedComponentId(componentId);
    setTimeout(() => {
      setHighlightedComponentId(null);
    }, 3000);
  };

  const activeClass = classes.find(c => c.id === activeClassId);

  return (
    <div className="min-h-screen bg-[#917A6D] text-[#3E362C] flex flex-col font-sans select-none relative overflow-x-hidden">
      <main className="relative z-30 flex-1 p-8 md:p-14 max-w-7xl mx-auto w-full">
        {!activeClassId ? (
          <HomeChalkboard 
            classes={classes} 
            onSelectClass={setActiveClassId} 
            onOpenAddClass={() => setIsAddClassOpen(true)}
            onDeleteClass={handleDeleteClass}
            onChangeColor={handleChangeClassColor}
            upcomingTasks={getUpcomingTasks()}
            onSelectTask={handleSelectTaskFromNoticeBoard}
            onToggleTaskCompleted={handleToggleTaskCompleted}
            calculateOverallClassGrade={calculateOverallClassGrade}
            calculateAchievedScoreSoFar={calculateAchievedScoreSoFar}
            getUottawaStanding={getUottawaStanding}
            onExport={handleExportData}
            onImport={handleImportData}
          />
        ) : (
          <ClassDetailView 
            classItem={activeClass}
            highlightedComponentId={highlightedComponentId}
            onBackToChalkboard={() => { setActiveClassId(null); setHighlightedComponentId(null); }}
            onUpdateClass={(updated) => {
              setClasses(classes.map(c => c.id === updated.id ? updated : c));
            }}
            calculateGradeComponentScore={calculateGradeComponentScore}
            calculateOverallClassGrade={calculateOverallClassGrade}
            calculateAchievedScoreSoFar={calculateAchievedScoreSoFar}
          />
        )}
      </main>

      {/* --- ADD CLASS MODAL --- */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#736257] border border-[#3E362C] rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-white">
            <button 
              onClick={() => setIsAddClassOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-red-200 cursor-pointer transition"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-white">New Class Sticky Note</h2>
            
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Course Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. MAT1320" 
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Course Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Calculus I" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-2">Sticky Note Color</label>
                <div className="flex gap-3">
                  {STICKY_COLORS.map(col => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => setNewClassColor(col.class)}
                      className={`cursor-pointer w-8 h-8 rounded-full ${col.class.split(' ')[0]} border-2 transition ${newClassColor === col.class ? 'border-[#3E362C] scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#3E362C]">
                <button 
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-4 py-2 bg-[#403A34] hover:bg-[#4D443F] cursor-pointer rounded-lg text-sm font-medium transition text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#D6C6BC] hover:bg-[#E6D5CC] cursor-pointer text-[#736257] rounded-lg text-sm font-medium transition shadow-lg"
                >
                  Create Class Sticky
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HOME CHALKBOARD VIEW ---
function HomeChalkboard({ classes, onSelectClass, onOpenAddClass, onDeleteClass, onChangeColor, upcomingTasks, onSelectTask, onToggleTaskCompleted, calculateOverallClassGrade, calculateAchievedScoreSoFar, getUottawaStanding, onExport, onImport }) {
  const fileInputRef = useRef(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => {
            const overallGrade = calculateOverallClassGrade(cls);
            const achievedScore = calculateAchievedScoreSoFar(cls);
            const standing = getUottawaStanding(overallGrade);

            return (
              <div 
                key={cls.id}
                onClick={() => onSelectClass(cls.id)}
                className={`relative group cursor-pointer p-6 rounded-lg shadow-xl transform transition duration-300 hover:-translate-y-2 hover:rotate-1 ${cls.color} border-2 flex flex-col justify-between min-h-[220px]`}
                style={{
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-700 shadow-md border border-red-900 z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                </div>

                <button
                  onClick={(e) => onDeleteClass(cls.id, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition bg-black/10 hover:bg-black/20 text-stone-900 p-1.5 rounded-md cursor-pointer"
                  title="Delete Class"
                >
                  <Trash2 size={14} />
                </button>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-75">{cls.code}</span>
                  <h3 className="text-xl font-bold mt-1 line-clamp-2">{cls.name}</h3>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Overall</div>
                      <div className="text-2xl font-extrabold tracking-tight">
                        {overallGrade !== null ? `${overallGrade}%` : 'N/A'}
                      </div>
                    </div>
                    <div className="border-l border-black/10 pl-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Achieved</div>
                      <div className="text-lg font-bold tracking-tight opacity-90">
                        {achievedScore !== null ? `${achievedScore}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 inline-block bg-white/90 backdrop-blur-sm text-stone-900 text-xs px-2.5 py-1 rounded-md shadow-sm font-semibold border border-stone-200/50">
                    {standing}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-black/10 text-xs font-semibold">
                  <span>{cls.gradeComponents.length} Grade Components</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {STICKY_COLORS.map(col => (
                      <button
                        key={col.name}
                        onClick={(e) => onChangeColor(cls.id, col.class, e)}
                        className={`w-3.5 h-3.5 rounded-full ${col.class.split(' ')[0]} border border-black/30 hover:scale-125 transition cursor-pointer`}
                        title={`Change to ${col.name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={onOpenAddClass}
            className="relative p-6 rounded-lg border-2 border-dashed border-[#5C4033] hover:border-[#3E362C] bg-[#736257]/30 hover:bg-[#736257]/50 transition flex flex-col items-center justify-center min-h-[220px] text-white group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#3E362C] group-hover:bg-[#261C1B] flex items-center justify-center text-orange-100 group-hover:text-white transition shadow-md mb-3 border border-[#5C4033]">
              <Plus size={24} />
            </div>
            <span className="font-bold text-sm tracking-wide text-white">Add New Class</span>
            <span className="text-xs text-[#D6C6BC] mt-1">Click to pin a new sticky</span>
          </button>
        </div>
      </div>

      {/* --- PINNED NOTICE BOARD & BACKUP TOOLS --- */}
      <div className="lg:col-span-1 flex flex-col justify-between"> 
        <div className="bg-[#3E362C] rounded-2xl p-5 sticky top-6 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 pb-3 border-b border-[#FAF0D4] mb-4">
            <h3 className="font-bold text-[#FAF0D4] text-sm tracking-wide uppercase">UPCOMING</h3>
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="text-xs text-[#FAF0D4]/70 italic py-4 text-center">
              Nothing due in the next 7 days.
            </p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {upcomingTasks.map((task, idx) => (
                <div 
                  key={idx}
                  onClick={() => onSelectTask(task.classId, task.componentId)}
                  className={`${task.classColor} border-2 p-3 rounded-xl transition cursor-pointer group shadow-sm flex items-start justify-between gap-2 ${task.isCompleted ? 'opacity-50 grayscale bg-stone-300 border-stone-400 text-stone-700' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur ${task.isCompleted ? 'bg-stone-400/30 text-stone-700' : 'bg-black/10 opacity-80'}`}>
                        {task.classCode}
                      </span>
                      <span className="text-[11px] opacity-80 flex items-center gap-1 font-medium shrink-0">
                        <Calendar size={12} /> {task.date}
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold transition mt-1 truncate ${task.isCompleted ? 'line-through' : ''}`}>
                      {task.name}
                    </h4>
                    <div className="text-[11px] opacity-80 mt-1">
                      Weight: <span className="font-semibold">{task.weight}%</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    title={task.isCompleted ? "Unmark as completed" : "Grey out / complete task"}
                    onClick={(e) => onToggleTaskCompleted(task.classId, task.componentId, task.subId, e)}
                    className={`mt-1 p-1 rounded border transition shrink-0 cursor-pointer ${task.isCompleted ? 'bg-stone-500 text-white border-stone-600' : 'bg-black/10 hover:bg-black/20 border-black/20'}`}
                  >
                    <CheckSquare size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Backup & Import Tools */}
          <div className="mt-6 pt-4 border-t border-[#FAF0D4]/70 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAF0D4]/80">Your Data</span>
            <div className="flex gap-2">
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#735B45] hover:bg-[#856A52] text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow"
                title="Backup all class data to a JSON file"
              >
                <Download size={13} /> Backup
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-[#4A3226] border border-[#D4BD99] rounded-lg text-xs font-semibold transition cursor-pointer shadow"
                title="Restore class data from a JSON file"
              >
                <Upload size={13} /> Restore
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- CLASS DETAIL VIEW ---
function ClassDetailView({ classItem, highlightedComponentId, onBackToChalkboard, onUpdateClass, calculateGradeComponentScore, calculateOverallClassGrade, calculateAchievedScoreSoFar }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState(null);
  
  const [gtName, setGtName] = useState('');
  const [gtWeight, setGtWeight] = useState('');
  const [gtDate, setGtDate] = useState('');
  const [gtGrade, setGtGrade] = useState('');
  const [hasSubDivisions, setHasSubDivisions] = useState(false);
  const [isEqualWeighting, setIsEqualWeighting] = useState(false);
  const [subDivisions, setSubDivisions] = useState([
    { name: 'Sub-part 1', weight: '50', grade: '', date: '' },
    { name: 'Sub-part 2', weight: '50', grade: '', date: '' }
  ]);

  const [openChecklists, setOpenChecklists] = useState({});
  const [newChecklistInputs, setNewChecklistInputs] = useState({});

  const overallGrade = calculateOverallClassGrade(classItem);
  const achievedScore = calculateAchievedScoreSoFar(classItem);

  const handleOpenAddModal = () => {
    setEditingComponentId(null);
    setGtName('');
    setGtWeight('');
    setGtDate('');
    setGtGrade('');
    setHasSubDivisions(false);
    setIsEqualWeighting(false);
    setSubDivisions([
      { name: 'Sub-part 1', weight: '100', grade: '', date: '' }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (gt) => {
    setEditingComponentId(gt.id);
    setGtName(gt.name);
    setGtWeight(gt.weight);
    setGtDate(gt.date || '');
    if (gt.subDivisions && gt.subDivisions.length > 0) {
      setHasSubDivisions(true);
      setIsEqualWeighting(!!gt.isEqualWeighting);
      setSubDivisions(gt.subDivisions.map(sub => ({ 
        ...sub, 
        grade: sub.grade !== null ? sub.grade : '',
        date: sub.date || ''
      })));
      setGtGrade('');
    } else {
      setHasSubDivisions(false);
      setIsEqualWeighting(false);
      setGtGrade(gt.receivedGrade !== null ? gt.receivedGrade : '');
      setSubDivisions([
        { name: 'Sub-part 1', weight: '100', grade: '', date: '' }
      ]);
    }
    setIsModalOpen(true);
  };

  const applyEqualWeighting = (subs) => {
    if (subs.length === 0) return subs;
    const equalShare = (100 / subs.length).toFixed(2);
    return subs.map(s => ({ ...s, weight: equalShare }));
  };

  const handleToggleEqualWeighting = (checked) => {
    setIsEqualWeighting(checked);
    if (checked) {
      setSubDivisions(applyEqualWeighting(subDivisions));
    }
  };

  const handleAddSubDivision = () => {
    const updated = [...subDivisions, { name: '', weight: '', grade: '', date: '' }];
    if (isEqualWeighting) {
      setSubDivisions(applyEqualWeighting(updated));
    } else {
      setSubDivisions(updated);
    }
  };

  const handleRemoveSubDivision = (idx) => {
    const updated = subDivisions.filter((_, i) => i !== idx);
    if (isEqualWeighting) {
      setSubDivisions(applyEqualWeighting(updated));
    } else {
      setSubDivisions(updated);
    }
  };

  const handleSaveGradeComponent = (e) => {
    e.preventDefault();
    if (!gtName.trim() || !gtWeight) return;

    if (editingComponentId) {
      const updatedComponents = classItem.gradeComponents.map(gt => {
        if (gt.id === editingComponentId) {
          return {
            ...gt,
            name: gtName,
            weight: Number(gtWeight),
            date: hasSubDivisions ? null : (gtDate || null),
            isEqualWeighting: hasSubDivisions ? isEqualWeighting : false,
            receivedGrade: hasSubDivisions ? null : (gtGrade !== '' ? Number(gtGrade) : null),
            subDivisions: hasSubDivisions ? subDivisions.map((sub, i) => ({
              id: sub.id || ('sub-' + Date.now() + '-' + i),
              name: sub.name,
              weight: sub.weight,
              grade: sub.grade !== '' ? Number(sub.grade) : null,
              date: sub.date || null,
              isCompleted: !!sub.isCompleted
            })) : []
          };
        }
        return gt;
      });

      onUpdateClass({ ...classItem, gradeComponents: updatedComponents });
    } else {
      const newGt = {
        id: 'gt-' + Date.now(),
        name: gtName,
        weight: Number(gtWeight),
        date: hasSubDivisions ? null : (gtDate || null),
        isEqualWeighting: hasSubDivisions ? isEqualWeighting : false,
        isCompleted: false,
        receivedGrade: hasSubDivisions ? null : (gtGrade !== '' ? Number(gtGrade) : null),
        subDivisions: hasSubDivisions ? subDivisions.map((sub, i) => ({
          id: 'sub-' + Date.now() + '-' + i,
          name: sub.name,
          weight: sub.weight,
          grade: sub.grade !== '' ? Number(sub.grade) : null,
          date: sub.date || null,
          isCompleted: false
        })) : [],
        checklist: []
      };

      const updated = {
        ...classItem,
        gradeComponents: [...classItem.gradeComponents, newGt]
      };

      onUpdateClass(updated);
    }
    
    setIsModalOpen(false);
  };

  const handleDeleteGradeComponent = (gtId) => {
    const updated = {
      ...classItem,
      gradeComponents: classItem.gradeComponents.filter(g => g.id !== gtId)
    };
    onUpdateClass(updated);
  };

  const handleToggleChecklistComplete = (gtId, checklistId) => {
    const updatedGtList = classItem.gradeComponents.map(gt => {
      if (gt.id === gtId) {
        const updatedChecklist = gt.checklist.map(item => {
          if (item.id === checklistId) {
            return { ...item, completed: !item.completed };
          }
          return item;
        });
        return { ...gt, checklist: updatedChecklist };
      }
      return gt;
    });

    onUpdateClass({ ...classItem, gradeComponents: updatedGtList });
  };

  const handleAddChecklistItem = (gtId, e) => {
    e.preventDefault();
    const text = newChecklistInputs[gtId];
    if (!text || !text.trim()) return;

    const updatedGtList = classItem.gradeComponents.map(gt => {
      if (gt.id === gtId) {
        const newItem = {
          id: 'chk-' + Date.now(),
          text: text.trim(),
          completed: false
        };
        return { ...gt, checklist: [...gt.checklist, newItem] };
      }
      return gt;
    });

    onUpdateClass({ ...classItem, gradeComponents: updatedGtList });
    setNewChecklistInputs({ ...newChecklistInputs, [gtId]: '' });
  };

  const handleDeleteChecklistItem = (gtId, checklistId) => {
    const updatedGtList = classItem.gradeComponents.map(gt => {
      if (gt.id === gtId) {
        return {
          ...gt,
          checklist: gt.checklist.filter(item => item.id !== checklistId)
        };
      }
      return gt;
    });
    onUpdateClass({ ...classItem, gradeComponents: updatedGtList });
  };

  const toggleChecklistDropdown = (gtId) => {
    setOpenChecklists(prev => ({ ...prev, [gtId]: !prev[gtId] }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBackToChalkboard}
          className="flex items-center gap-2 px-4 py-2 bg-[#3E362C] hover:bg-[#261C1B] hover:cursor-pointer rounded-lg text-sm transition font-medium border-2 border-[#3E362C] text-white shadow"
        >
          <ArrowLeft size={16} /> View All Classes
        </button>
      </div>

      <div className={`p-8 rounded-2xl ${classItem.color} border-2 border-[#3E362C] shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6`}>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase px-3 py-1 rounded bg-black/10 backdrop-blur">
              {classItem.code}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold mt-2">{classItem.name}</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-6 bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl border border-white/40 shadow-sm text-stone-900">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600">Overall Grade</div>
              <div className="text-3xl font-extrabold mt-0.5">
                {overallGrade !== null ? `${overallGrade}%` : 'N/A'}
              </div>
            </div>
            <div className="border-l border-stone-300 pl-6">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600">Achieved Score</div>
              <div className="text-2xl font-bold mt-0.5 text-stone-700">
                {achievedScore !== null ? `${achievedScore}%` : 'N/A'}
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-4 bg-[#3E362C] hover:bg-[#261C1B] cursor-pointer text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-xl"
            title="Add Grade Component"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {classItem.gradeComponents.length === 0 ? (
          <div className="text-center py-16 bg-[#736257]/20 border-2 border-dashed border-[#5C4033] rounded-2xl">
            <p className="text-white text-sm">No grade components added for this class yet.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-3 text-amber-200 hover:underline text-sm font-semibold cursor-pointer"
            >
              + Create your first grade component
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classItem.gradeComponents.map(gt => {
              const computedScore = calculateGradeComponentScore(gt);
              const completedTasksCount = gt.checklist.filter(c => c.completed).length;
              const isHighlighted = highlightedComponentId === gt.id;
              const isChecklistOpen = !!openChecklists[gt.id];

              return (
                <div 
                  key={gt.id}
                  className={`bg-[#736257] border-2 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative group transition-all duration-500 text-white ${
                    isHighlighted ? 'border-amber-400 ring-4 ring-amber-400/30 scale-[1.02] bg-[#7a685d]' : 'border-[#3E362C]'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-white">{gt.name}</h4>
                        {gt.date && (
                          <span className="text-xs text-[#D6C6BC] flex items-center gap-1 mt-1">
                            <Calendar size={12} /> Due: {gt.date}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs uppercase font-semibold text-white bg-[#261C1B] px-2 py-1 rounded border border-[#3E362C]">
                          Weight: {gt.weight}%
                        </span>
                      </div>
                    </div>

                    <div className="my-4 p-4 rounded-xl bg-[#261C1B] border border-[#3E362C] flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#D6C6BC] font-medium">Calculated Score</span>
                        <div className="text-2xl font-extrabold text-[#FAF0D4]">
                          {computedScore !== null ? `${Math.round(computedScore * 10) / 10}%` : 'Pending'}
                        </div>
                      </div>

                      {gt.subDivisions && gt.subDivisions.length > 0 && (
                        <div className="text-right text-xs text-[#D6C6BC] space-y-1">
                          <div className="font-semibold text-white">Sub-divisions:</div>
                          {gt.subDivisions.map((sub, idx) => (
                            <div key={idx}>
                              {sub.name} ({sub.weight}%): <span className="text-white">{sub.grade !== null ? `${sub.grade}%` : '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#3E362C]">
                      <button
                        onClick={() => toggleChecklistDropdown(gt.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#D6C6BC] hover:text-white cursor-pointer py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <CheckSquare size={14} /> To-Do ({completedTasksCount}/{gt.checklist.length})
                        </span>
                        {isChecklistOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isChecklistOpen && (
                        <div className="mt-3 space-y-2 bg-[#261C1B] p-3 rounded-xl border border-[#3E362C] animate-fadeIn">
                          {gt.checklist.length === 0 ? (
                            <p className="text-[11px] text-[#D6C6BC]/60 italic text-center py-2">No tasks added yet.</p>
                          ) : (
                            gt.checklist.map(item => (
                              <div key={item.id} className="flex items-center justify-between bg-[#1f1615] px-3 py-2 rounded-lg border border-[#3E362C]">
                                <button 
                                  onClick={() => handleToggleChecklistComplete(gt.id, item.id)}
                                  className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                                >
                                  {item.completed ? (
                                    <CheckSquare size={16} className="text-emerald-400 shrink-0" />
                                  ) : (
                                    <Square size={16} className="text-[#D6C6BC]/50 shrink-0" />
                                  )}
                                  <span className={`text-xs ${item.completed ? 'line-through text-stone-400' : 'text-white'}`}>
                                    {item.text}
                                  </span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteChecklistItem(gt.id, item.id)}
                                  className="text-stone-400 hover:text-rose-400 p-1 cursor-pointer transition"
                                  title="Delete task"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))
                          )}

                          <form onSubmit={(e) => { e.preventDefault(); handleAddChecklistItem(gt.id, e); }} className="flex gap-2 pt-2">
                            <input 
                              type="text" 
                              placeholder="Add checklist item..." 
                              value={newChecklistInputs[gt.id] || ''}
                              onChange={(e) => setNewChecklistInputs({ ...newChecklistInputs, [gt.id]: e.target.value })}
                              className="flex-1 bg-[#6D6053] border border-[#3E362C] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white"
                            />
                            <button 
                              type="submit"
                              className="px-3 py-1.5 bg-[#5C4033] hover:bg-[#403A34] text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow"
                            >
                              Add
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#3E362C]">
                    <button 
                      onClick={() => handleOpenEditModal(gt)}
                      className="text-[#D6C6BC] hover:text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit Component
                    </button>
                    <button 
                      onClick={() => handleDeleteGradeComponent(gt.id)}
                      className="text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={14} /> Delete Component
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD / EDIT GRADE COMPONENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#736257] border border-[#3E362C] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-white">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-red-200 cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4 text-white">
              {editingComponentId ? 'Edit Grade Component' : 'Add Grade Component'}
            </h2>
            
            <form onSubmit={handleSaveGradeComponent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Component Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Final Exam, Lab 1, Midterm" 
                  value={gtName}
                  onChange={(e) => setGtName(e.target.value)}
                  className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div className={`grid ${hasSubDivisions ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Assigned Weight (%)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 25" 
                    value={gtWeight}
                    onChange={(e) => setGtWeight(e.target.value)}
                    className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                    required
                    min="0"
                    max="100"
                  />
                </div>
                {!hasSubDivisions && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Due Date</label>
                    <input 
                      type="date" 
                      value={gtDate}
                      onChange={(e) => setGtDate(e.target.value)}
                      className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={hasSubDivisions}
                    onChange={(e) => setHasSubDivisions(e.target.checked)}
                    className="rounded bg-[#261C1B] border-[#3E362C] text-stone-700 focus:ring-stone-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-white">Divide into sub-components (e.g. Pre-Lab / Post-Lab split)</span>
                </label>
              </div>

              {hasSubDivisions ? (
                <div className="space-y-3 bg-[#261C1B] p-4 rounded-xl border border-[#3E362C]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#3E362C]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D6C6BC]">Sub-divisions</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#D6C6BC]">
                        <input 
                          type="checkbox"
                          checked={isEqualWeighting}
                          onChange={(e) => handleToggleEqualWeighting(e.target.checked)}
                          className="rounded bg-[#141d18] border-[#3E362C] w-3.5 h-3.5 cursor-pointer"
                        />
                        Equal Weighting
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSubDivision}
                        className="text-xs text-white hover:text-amber-200 bg-[#403A34] px-2.5 py-1 rounded border border-[#3E362C] transition cursor-pointer"
                      >
                        + Add Sub-part
                      </button>
                    </div>
                  </div>
                  
                  {subDivisions.map((sub, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input 
                        type="text" 
                        value={sub.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubDivisions(subDivisions.map((s, i) => i === idx ? { ...s, name: val } : s));
                        }}
                        className="col-span-3 bg-[#141d18] border border-[#3E362C] rounded px-2 py-1 text-xs text-white"
                        placeholder="Sub-part name"
                      />
                      <input 
                        type="text" 
                        value={sub.weight}
                        disabled={isEqualWeighting}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubDivisions(subDivisions.map((s, i) => i === idx ? { ...s, weight: val } : s));
                        }}
                        className={`col-span-3 bg-[#141d18] border border-[#3E362C] rounded px-2 py-1 text-xs text-white ${isEqualWeighting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="Weight % or Fraction"
                      />
                      <input 
                        type="number" 
                        value={sub.grade}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubDivisions(subDivisions.map((s, i) => i === idx ? { ...s, grade: val } : s));
                        }}
                        className="col-span-2 bg-[#141d18] border border-[#3E362C] rounded px-2 py-1 text-xs text-white"
                        placeholder="Grade %"
                      />
                      <input 
                        type="date" 
                        value={sub.date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubDivisions(subDivisions.map((s, i) => i === idx ? { ...s, date: val } : s));
                        }}
                        className="col-span-3 bg-[#141d18] border border-[#3E362C] rounded px-1.5 py-1 text-[11px] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubDivision(idx)}
                        className="col-span-1 text-rose-300 hover:text-rose-100 flex justify-center p-1 cursor-pointer"
                        title="Remove Sub-division"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#D6C6BC] mb-1">Grade Received (%) - Optional</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 88" 
                    value={gtGrade}
                    onChange={(e) => setGtGrade(e.target.value)}
                    className="w-full bg-[#261C1B] border border-[#3E362C] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-white"
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[#3E362C]">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#403A34] hover:bg-[#4D443F] rounded-lg text-sm font-medium transition text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#D6C6BC] hover:bg-[#E6D5CC] text-[#736257] rounded-lg text-sm font-medium transition shadow-lg cursor-pointer"
                >
                  Save Component / Sub-part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
     
    </div>
  );
}