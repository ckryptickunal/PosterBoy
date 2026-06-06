'use client';

import React, { useEffect, useState } from 'react';
import { toPng } from 'html-to-image';
import { Sparkles, History, Layout as LayoutIcon, Eye, Info } from 'lucide-react';
import { useStore } from '@/lib/store';
import Canvas from '@/components/Canvas';
import ControlPanel from '@/components/ControlPanel';
import Telemetry from '@/components/Telemetry';
import CritiquePanel from '@/components/CritiquePanel';
import ConstitutionEditor from '@/components/ConstitutionEditor';

export default function DashboardPage() {
  const store = useStore();
  const { activeJob, fetchInitialData } = store;
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 1. Fetch initial fonts, memory database, and constitution on load
  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. Self-correction effect listener: auto-critique screenshot when coordinates update during layout or repair
  useEffect(() => {
    if (activeJob.status === 'rendering') {
      const captureAndSubmit = async () => {
        // Allow canvas components and styles to finish rendering
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        // Wait for browser fonts to load
        if (typeof document !== 'undefined') {
          await document.fonts.ready;
        }

        const node = document.getElementById('design-canvas');
        if (node) {
          try {
            const dataUrl = await toPng(node, {
              cacheBust: true,
              quality: 0.95
            });
            
            // Run the critique loop
            await store.runCritiqueLoop(dataUrl);
          } catch (err) {
            console.error('Automatic critique screenshot capture failed:', err);
          }
        }
      };

      captureAndSubmit();
    }
  }, [activeJob.status, activeJob.layout]);

  // 3. Capture manual PNG download
  const handleDownloadPng = async () => {
    const node = document.getElementById('design-canvas');
    if (node) {
      try {
        const dataUrl = await toPng(node, { cacheBust: true, quality: 1.0 });
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataUrl);
        downloadAnchor.setAttribute('download', `posterboy_design_${activeJob.id || 'export'}.png`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } catch (err) {
        console.error('Failed to download PNG:', err);
      }
    }
  };

  // 4. Compile and export a standalone responsive HTML page package
  const handleDownloadHtml = () => {
    if (!activeJob.layout || !activeJob.typography || !activeJob.imageUrl) return;

    const elementsHtml = activeJob.layout.elements.map(elem => {
      const isDisplay = elem.type === 'headline';
      const fontFamily = elem.fontFamily || (isDisplay ? activeJob.typography!.displayFont : activeJob.typography!.bodyFont);
      const fontSize = elem.fontSize || (isDisplay ? activeJob.typography!.headlineSize : elem.type === 'subheadline' ? activeJob.typography!.subheadlineSize : elem.type === 'cta' ? activeJob.typography!.ctaSize : activeJob.typography!.bodySize);
      const fontWeight = isDisplay ? activeJob.typography!.fontWeightDisplay : activeJob.typography!.fontWeightBody;
      
      if (elem.type === 'cta') {
        return `
    <div style="position: absolute; left: ${elem.x}%; top: ${elem.y}%; width: ${elem.width}%; height: ${elem.height}%; z-index: ${elem.zIndex}; transform: rotate(${elem.rotation}deg);">
      <a href="#" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 8px; font-family: '${fontFamily}', sans-serif; font-size: ${fontSize * 0.5}px; font-weight: bold; background-color: ${elem.color || '#3b82f6'}; color: white; text-decoration: none; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ${elem.text}
      </a>
    </div>`;
      }
      
      if (elem.type === 'logo') {
        return `
    <div style="position: absolute; left: ${elem.x}%; top: ${elem.y}%; width: ${elem.width}%; height: ${elem.height}%; z-index: ${elem.zIndex}; transform: rotate(${elem.rotation}deg); display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); color: #ccc; font-family: sans-serif; font-size: 10px; font-weight: bold; letter-spacing: 2px;">
      ${elem.text || 'BRAND'}
    </div>`;
      }

      if (elem.type === 'divider') {
        return `
    <div style="position: absolute; left: ${elem.x}%; top: ${elem.y}%; width: ${elem.width}%; height: ${elem.height}%; z-index: ${elem.zIndex}; border-bottom: 1px solid rgba(255,255,255,0.2);"></div>`;
      }

      return `
    <div style="position: absolute; left: ${elem.x}%; top: ${elem.y}%; width: ${elem.width}%; height: ${elem.height}%; z-index: ${elem.zIndex}; transform: rotate(${elem.rotation}deg); font-family: '${fontFamily}', sans-serif; font-size: ${fontSize * 0.5}px; font-weight: ${fontWeight}; line-height: ${activeJob.typography!.lineHeight}; letter-spacing: ${activeJob.typography!.tracking}px; text-align: ${activeJob.typography!.alignment}; color: ${elem.color || '#ffffff'}; display: flex; align-items: center; justify-content: center;">
      ${elem.text}
    </div>`;
    }).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PosterBoy Design Export</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:wght@300;400;500;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0b0c;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .poster-container {
      position: relative;
      width: 100%;
      max-width: 600px;
      aspect-ratio: 4/5;
      background-image: url('${window.location.origin}${activeJob.imageUrl}');
      background-size: cover;
      background-position: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      overflow: hidden;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.05);
    }
  </style>
</head>
<body>
  <div class="poster-container">
    ${elementsHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `posterboy_export_${activeJob.id}.html`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const triggerManualCritique = async () => {
    const node = document.getElementById('design-canvas');
    if (node) {
      try {
        const dataUrl = await toPng(node, { cacheBust: true, quality: 0.95 });
        await store.runCritiqueLoop(dataUrl);
      } catch (err) {
        console.error('Manual critique screenshot capture failed:', err);
      }
    }
  };

  const faceRegions = activeJob.vision?.faceRegions || [];
  const productRegions = activeJob.vision?.productRegions || [];

  return (
    <div className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 py-6 gap-6">
      {/* Header bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/10">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              PosterBoy
            </h1>
            <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">
              Autonomous Design Director System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History Toggle Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs px-3 py-1.5 rounded-lg border border-zinc-800 transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>Job Log History</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Drag control, uploader, export */}
        <ControlPanel
          onDownloadPng={handleDownloadPng}
          onDownloadHtml={handleDownloadHtml}
          selectedElementId={selectedElementId}
        />

        {/* Center: Canvas Workspace */}
        <div className="flex-1 flex flex-col gap-6">
          <Canvas
            imageUrl={activeJob.imageUrl}
            layout={activeJob.layout}
            typography={activeJob.typography}
            faceRegions={faceRegions}
            productRegions={productRegions}
            onElementUpdate={store.updateElement}
            selectedElementId={selectedElementId}
            setSelectedElementId={setSelectedElementId}
          />
          
          {/* Telemetry log monitors */}
          <Telemetry />
        </div>

        {/* Right Side: Critique Panel and Constitution Rules Editor */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6">
          <CritiquePanel
            onTriggerCritique={triggerManualCritique}
            isProcessing={activeJob.status === 'critiquing'}
          />
          
          <ConstitutionEditor />
        </div>

      </main>

      {/* History log modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-filter backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 border border-zinc-800 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <LayoutIcon className="w-4 h-4 text-blue-500" />
                <h2 className="font-bold text-base text-zinc-100">SQLite Layout Jobs History</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold px-2 py-1 bg-zinc-900 border border-zinc-800 rounded"
              >
                Close
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 pr-1">
              {store.jobsHistory.length === 0 ? (
                <div className="text-center text-zinc-500 italic py-8 text-xs">No previous jobs recorded in SQLite database.</div>
              ) : (
                store.jobsHistory.map((job) => (
                  <div key={job.id} className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900 text-xs flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[10px]">
                          ID: {job.id.substring(0, 8)}...
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                          job.status === 'completed' 
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-zinc-300 italic font-medium">"{job.intent}"</p>
                      <p className="text-[10px] text-zinc-500">Created: {new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    
                    {job.final_layout_json && (
                      <button
                        onClick={() => {
                          const parsedLayout = JSON.parse(job.final_layout_json);
                          // Setup relative mock image loading
                          const imagePath = `/uploads/images/${job.image_path}`;
                          
                          // Load to canvas workspace
                          useStore.setState({
                            activeJob: {
                              ...store.activeJob,
                              id: job.id,
                              status: 'completed',
                              imageUrl: imagePath,
                              layout: parsedLayout,
                              logs: [`[${new Date().toLocaleTimeString()}] Restored Layout Job ${job.id} from local SQLite.`]
                            }
                          });
                          setShowHistoryModal(false);
                        }}
                        className="bg-blue-650 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] font-bold transition shrink-0"
                      >
                        Restore Canvas
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
