import React, { useState } from 'react';
import { HelpCircle, Plus, Trash2, CheckSquare } from 'lucide-react';

interface PollBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPoll: (question: string, options: string[]) => void;
  language?: string;
}

export const PollBuilder: React.FC<PollBuilderProps> = ({
  isOpen,
  onClose,
  onSendPoll,
  language
}) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  if (!isOpen) return null;

  // Handle adding a new blank option input
  const handleAddOption = () => {
    if (options.length >= 6) return; // Max 6 options limit
    setOptions([...options, '']);
  };

  // Handle deleting an option input
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return; // Min 2 options constraint
    setOptions(options.filter((_, idx) => idx !== index));
  };

  // Handle input update
  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (!question.trim() || cleanOptions.length < 2) return;

    onSendPoll(question.trim(), cleanOptions);
    
    // Reset state
    setQuestion('');
    setOptions(['', '']);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-[#141b2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-150 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-blue-500 shrink-0" size={18} />
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {language === 'so' ? 'Abuur Cod-bixin' : 'Create Poll'}
              </h3>
              <p className="text-[10px] text-gray-400">SomLuul Live Feedback Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 flex flex-col overflow-hidden">
          
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {/* Question Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400">
                {language === 'so' ? 'Su\'aasha' : 'Question'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'so' ? 'Qor waxa aad dadka waydiinayso (t.g Muxuu noqon rabaa xawaaraha)?' : 'Ask a question...'}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#1f293d] border border-gray-250 dark:border-gray-750 rounded-xl text-xs text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            {/* Options list */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {language === 'so' ? 'Xulashooyinka' : 'Options'}
                </label>
                <span className="text-[9px] text-gray-400">Min 2, Max 6 options</span>
              </div>

              <div className="space-y-2">
                {options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-mono font-bold flex items-center justify-center text-gray-500 shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={language === 'so' ? `Xulashada ${idx + 1}...` : `Option ${idx + 1}...`}
                      className="grow px-3 py-2 bg-gray-50 dark:bg-[#1f293d] border border-gray-250 dark:border-gray-750 rounded-xl text-xs text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={option}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add choice trigger button */}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="py-1.5 px-3 bg-gray-150 hover:bg-gray-200 dark:bg-[#1a2235]/40 dark:hover:bg-gray-800 text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus size={11} />
                  <span>{language === 'so' ? 'Ku dar xulasho' : 'Add Option'}</span>
                </button>
              )}
            </div>

          </div>

          {/* Footer Submit */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-150 dark:border-gray-800/60 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!question.trim() || options.filter(o => o.trim() !== '').length < 2}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer ${
                (!question.trim() || options.filter(o => o.trim() !== '').length < 2)
                  ? 'bg-blue-300 text-white cursor-not-allowed opacity-50'
                  : 'bg-[var(--somluul-primary)] hover:brightness-110 text-white shadow-blue-500/10'
              }`}
            >
              <span>{language === 'so' ? 'Daabac Cod-bixinta' : 'Send Poll'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
