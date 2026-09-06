import React, { useState } from 'react';
import { Radio, Search, Trash2, Edit2, Users, Plus, Check, MessageSquare } from 'lucide-react';

interface BroadcastComposerProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: any[];
  broadcastLists: Array<{ id: string; name: string; memberIds: string[] }>;
  onSaveList: (name: string, memberIds: string[]) => void;
  onDeleteList: (id: string) => void;
  onSendBroadcast: (listId: string, text: string) => void;
  language?: string;
}

export const BroadcastComposer: React.FC<BroadcastComposerProps> = ({
  isOpen,
  onClose,
  profiles,
  broadcastLists,
  onSaveList,
  onDeleteList,
  onSendBroadcast,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'lists' | 'create'>('lists');
  const [listName, setListName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  // Toggle member check/uncheck
  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  // Submit and save list
  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim() || selectedMembers.length === 0) return;

    onSaveList(listName.trim(), selectedMembers);
    setListName('');
    setSelectedMembers([]);
    setActiveTab('lists');
  };

  // Submit broadcast message
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListId || !broadcastText.trim()) return;

    onSendBroadcast(selectedListId, broadcastText.trim());
    setSendSuccess(true);
    setBroadcastText('');
    setTimeout(() => {
      setSendSuccess(false);
      setSelectedListId(null);
    }, 2000);
  };

  const filteredProfiles = profiles.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-[#141b2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-150 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex items-center gap-2">
            <Radio className="text-amber-500 animate-pulse shrink-0" size={20} />
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {language === 'so' ? 'Laba-laabayda Fariimaha' : 'Broadcast Center'}
              </h3>
              <p className="text-[10px] text-gray-400">One-to-Many Private Signaling</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
          >
            &times;
          </button>
        </div>

        {/* Tab Headers */}
        <div className="grid grid-cols-2 text-center border-b border-gray-100 dark:border-gray-850 bg-gray-50/30 dark:bg-[#111624]">
          <button
            onClick={() => setActiveTab('lists')}
            className={`py-2.5 text-xs font-bold uppercase transition-all ${activeTab === 'lists' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[var(--somluul-primary)] bg-white dark:bg-[#141b2d]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {language === 'so' ? 'Liisaska' : 'My Lists'}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-2.5 text-xs font-bold uppercase transition-all ${activeTab === 'create' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[var(--somluul-primary)] bg-white dark:bg-[#141b2d]' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            {language === 'so' ? 'Samee Cusub' : 'Create List'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeTab === 'lists' ? (
            /* LISTS VIEW */
            <div className="space-y-3">
              {broadcastLists.length === 0 ? (
                <div className="text-center py-10 space-y-2 text-gray-400">
                  <Radio className="mx-auto text-gray-300 dark:text-gray-700" size={32} />
                  <p className="text-xs font-semibold">{language === 'so' ? 'Ma jiro liis la abuuray.' : 'No broadcast lists found.'}</p>
                  <p className="text-[10px] text-gray-500 max-w-[200px] mx-auto">Create a list to broadcast one private message to many users securely.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sendSuccess ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold rounded-xl p-3 text-center">
                      ✓ Broadcast dispatched successfully!
                    </div>
                  ) : selectedListId ? (
                    /* SEND BROADCAST INTERFACE */
                    <form onSubmit={handleSendText} className="space-y-3.5 bg-gray-50/50 dark:bg-gray-900/15 p-3 rounded-2xl border border-gray-150 dark:border-gray-800">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Sending to:</span>
                        <h4 className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                          {broadcastLists.find(l => l.id === selectedListId)?.name}
                        </h4>
                      </div>
                      <textarea
                        required
                        placeholder={language === 'so' ? 'Ku qor fariinta broadcast-ka (loo diri doono qof walba si gaar ah)...' : 'Write broadcast message (recipients receive as private message)...'}
                        className="w-full h-24 p-2.5 bg-white dark:bg-[#1f293d] border border-gray-250 dark:border-gray-750 rounded-xl text-xs text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-medium"
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedListId(null)}
                          className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="w-1/2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-amber-500/10 flex items-center justify-center gap-1.5"
                        >
                          <Radio size={13} />
                          <span>Transmit</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* LIST TILES */
                    <div className="space-y-2">
                      {broadcastLists.map(list => (
                        <div key={list.id} className="p-3 bg-white dark:bg-[#1e2738]/30 hover:bg-gray-50 dark:hover:bg-gray-900/30 rounded-xl border border-gray-150 dark:border-gray-850 flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-950 dark:text-white truncate flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                              {list.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {list.memberIds.length} Recipients
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Transmit Trigger */}
                            <button
                              onClick={() => setSelectedListId(list.id)}
                              className="px-2.5 py-1.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Radio size={10} />
                              <span>Send</span>
                            </button>

                            {/* Delete List */}
                            <button
                              onClick={() => onDeleteList(list.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* CREATE LIST VIEW */
            <form onSubmit={handleCreateList} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  {language === 'so' ? 'Magaca Liiska' : 'Broadcast List Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'so' ? 'Qor magaca liiska (t.g Dhamaan Macmiisha)...' : 'Broadcast Name (e.g. Weekly Updates)...'}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1f293d] border border-gray-250 dark:border-gray-750 rounded-xl text-xs text-gray-950 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    {language === 'so' ? 'Ku dar Dadka helaya' : 'Add Contacts to List'}
                  </label>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                    {selectedMembers.length} Selected
                  </span>
                </div>

                {/* Filter list */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={13} />
                  <input
                    type="text"
                    placeholder={language === 'so' ? 'Raadi asxaabta...' : 'Search contacts...'}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#1f293d] border border-gray-200 dark:border-gray-750 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-44 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl p-1 bg-gray-50/20 dark:bg-gray-900/15">
                  {filteredProfiles.length === 0 ? (
                    <p className="text-center py-6 text-gray-400 text-xs">No contacts found.</p>
                  ) : (
                    filteredProfiles.map(p => {
                      const isChecked = selectedMembers.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleMember(p.id)}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={p.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                              alt=""
                              className="w-7.5 h-7.5 rounded-full object-cover border border-gray-150 dark:border-gray-750"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {p.first_name} {p.last_name}
                              </h5>
                              <p className="text-[9px] font-mono text-gray-450 dark:text-gray-400">
                                @{p.email.split('@')[0]}
                              </p>
                            </div>
                          </div>

                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 dark:border-gray-650'}`}>
                            {isChecked && <Check size={10} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!listName.trim() || selectedMembers.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                  (!listName.trim() || selectedMembers.length === 0)
                    ? 'bg-amber-200 text-white cursor-not-allowed opacity-50'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10'
                }`}
              >
                <Plus size={13} />
                <span>Save Broadcast List</span>
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-gray-50 dark:bg-gray-900/40 text-[10px] text-gray-400 text-center border-t border-gray-150 dark:border-gray-800/60">
          Sending to a broadcast list sends individual private messages to contacts.
        </div>
      </div>
    </div>
  );
};
