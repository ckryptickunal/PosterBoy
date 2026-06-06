import React, { useState } from 'react';
import { Upload, FileText, Download, ShieldCheck, Type, ArrowRight, Settings, Image as ImageIcon } from 'lucide-react';
import { useStore } from '@/lib/store';

interface ControlPanelProps {
  onDownloadPng: () => void;
  onDownloadHtml: () => void;
  selectedElementId: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onDownloadPng,
  onDownloadHtml,
  selectedElementId
}) => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'prompt' | 'assets' | 'export'>('prompt');
  
  // Pipeline prompt state
  const [intent, setIntent] = useState('An elegant Instagram post announcing our new Summer Diamond Jewellery Collection.');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Font uploader state
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [fontFamily, setFontFamily] = useState('');
  const [fontCategory, setFontCategory] = useState<'display' | 'body'>('display');
  const [fontUploading, setFontUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFontFile(e.target.files[0]);
      // Auto-extract family name from filename
      const name = e.target.files[0].name.split('.')[0].replace(/[-_]/g, ' ');
      setFontFamily(name);
    }
  };

  const handleUploadFont = async () => {
    if (!fontFile || !fontFamily) return;
    setFontUploading(true);
    const success = await store.uploadFont(fontFile, fontFamily, fontCategory);
    setFontUploading(false);
    if (success) {
      setFontFile(null);
      setFontFamily('');
    }
  };

  const handleTriggerPipeline = () => {
    if (!imageFile || !intent) return;
    store.startDesignPipeline(imageFile, intent);
  };

  const handleDownloadJson = () => {
    if (!store.activeJob.layout) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store.activeJob.layout, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `posterboy_layout_${store.activeJob.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isGenerating = ['analyzing', 'designing', 'copywriting', 'typography', 'arranging', 'rendering', 'critiquing'].includes(store.activeJob.status);

  return (
    <div className="glass-panel w-full lg:w-[350px] rounded-2xl flex flex-col border border-zinc-800 h-full overflow-hidden">
      {/* Sidebar Tabs Header */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/60">
        <button
          onClick={() => setActiveTab('prompt')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'prompt' 
              ? 'border-blue-500 text-white bg-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Prompt</span>
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'assets' 
              ? 'border-blue-500 text-white bg-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Fonts ({store.fonts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
            activeTab === 'export' 
              ? 'border-blue-500 text-white bg-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Tab 1: Prompt & Upload */}
        {activeTab === 'prompt' && (
          <div className="space-y-4">
            {/* Background Image Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Background Image</label>
              <div className="border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 rounded-xl p-4 text-center cursor-pointer transition relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <ImageIcon className="w-6 h-6 text-zinc-500" />
                  <span className="text-xs text-zinc-300 font-medium">
                    {imageFile ? imageFile.name : 'Select or drop image'}
                  </span>
                  <span className="text-[10px] text-zinc-600">JPG, PNG, WebP</span>
                </div>
              </div>
            </div>

            {/* Design Intent Prompts */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Design Intent & Goal</label>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 resize-none h-24"
                placeholder="What are we designing today? E.g., Black Friday promo card..."
              />
            </div>

            {/* Pipeline Trigger */}
            <button
              onClick={handleTriggerPipeline}
              disabled={isGenerating || !imageFile || !intent}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-lg shadow-blue-500/10"
            >
              <span>{isGenerating ? 'Director Working...' : 'Run Autonomous Director'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 2: Font Library */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {/* Add Font */}
            <div className="space-y-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Add Custom Font</label>
              
              <div className="relative border border-dashed border-zinc-800 bg-zinc-950 p-2.5 text-center rounded cursor-pointer text-xs text-zinc-400 hover:border-zinc-700">
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span>{fontFile ? fontFile.name : 'Choose Font File (TTF, OTF)'}</span>
              </div>

              {fontFile && (
                <div className="space-y-2 mt-2.5">
                  <input
                    type="text"
                    placeholder="Font Family Name (e.g. Gotham)"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFontCategory('display')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded uppercase border ${
                        fontCategory === 'display' 
                          ? 'bg-zinc-800 border-zinc-700 text-white' 
                          : 'bg-transparent border-transparent text-zinc-500'
                      }`}
                    >
                      Display
                    </button>
                    <button
                      onClick={() => setFontCategory('body')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded uppercase border ${
                        fontCategory === 'body' 
                          ? 'bg-zinc-800 border-zinc-700 text-white' 
                          : 'bg-transparent border-transparent text-zinc-500'
                      }`}
                    >
                      Body
                    </button>
                  </div>

                  <button
                    onClick={handleUploadFont}
                    disabled={fontUploading}
                    className="w-full bg-zinc-850 hover:bg-zinc-800 text-zinc-200 py-1.5 rounded text-xs font-semibold transition border border-zinc-800"
                  >
                    {fontUploading ? 'Uploading...' : 'Save Font Asset'}
                  </button>
                </div>
              )}
            </div>

            {/* List Active Fonts */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Registered Fonts</label>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {store.fonts.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-zinc-950/30 p-2 rounded border border-zinc-900 text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-200">{f.familyName}</span>
                      <span className="text-[9px] text-zinc-500 capitalize">{f.category} Font</span>
                    </div>
                    <span className="text-[9px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                      {f.file_path.startsWith('google:') ? 'Google' : 'Local'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Exports & SQLite Saves */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {store.activeJob.id ? (
              <div className="space-y-3">
                {/* Approve Layout */}
                <button
                  onClick={() => store.approveDesign()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/10"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approve & Store to Memory</span>
                </button>

                <div className="border-t border-zinc-800 my-4 pt-4 space-y-2.5">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Local Downloads</label>
                  
                  {/* Download PNG */}
                  <button
                    onClick={onDownloadPng}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Download Rendered PNG</span>
                  </button>

                  {/* Download JSON Coordinates */}
                  <button
                    onClick={handleDownloadJson}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Download Layout JSON</span>
                  </button>

                  {/* Export HTML Project */}
                  <button
                    onClick={onDownloadHtml}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Export Standalone HTML</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-500 p-8 italic">
                Awaiting layout generation to show export triggers.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
export default ControlPanel;
