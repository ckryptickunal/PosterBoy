import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, Edit3, Trash2 } from 'lucide-react';
import { LayoutElement, Region, TypographyTokens, LayoutOutput } from '@/types/agents';

interface CanvasProps {
  imageUrl: string | null;
  layout: LayoutOutput | null;
  typography: TypographyTokens | null;
  faceRegions: Region[];
  productRegions: Region[];
  onElementUpdate: (id: string, updates: Partial<LayoutElement>) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  imageUrl,
  layout,
  typography,
  faceRegions,
  productRegions,
  onElementUpdate,
  selectedElementId,
  setSelectedElementId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Compute container scale relative to 1000px design baseline
  const updateScale = () => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      setScale(width / 1000);
    }
  };

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <div className="flex-1 min-h-[400px] border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-8">
        <p className="text-sm italic">Please upload an image and input intent to start generating designs.</p>
      </div>
    );
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, elem: LayoutElement) => {
    // If double clicking or editing, ignore
    if (editingId === elem.id) return;
    e.stopPropagation();
    setSelectedElementId(elem.id);

    // Get current container bounding rect
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: elem.x, y: elem.y, w: elem.width, h: elem.height });
  };

  // Resize handler start
  const handleResizeMouseDown = (e: React.MouseEvent, elem: LayoutElement) => {
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: elem.x, y: elem.y, w: elem.width, h: elem.height });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || (!isDragging && !isResizing)) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    const deltaX = ((e.clientX - dragStart.x) / containerWidth) * 100;
    const deltaY = ((e.clientY - dragStart.y) / containerHeight) * 100;

    if (selectedElementId) {
      if (isDragging) {
        // Clamp bounds 0 to 100
        const newX = Math.max(0, Math.min(100 - elementStart.w, elementStart.x + deltaX));
        const newY = Math.max(0, Math.min(100 - elementStart.h, elementStart.y + deltaY));
        onElementUpdate(selectedElementId, { x: newX, y: newY });
      } else if (isResizing) {
        const newW = Math.max(5, Math.min(100 - elementStart.x, elementStart.w + deltaX));
        const newH = Math.max(3, Math.min(100 - elementStart.y, elementStart.h + deltaY));
        onElementUpdate(selectedElementId, { width: newW, height: newH });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Attach global mouse listeners for smooth drag/resize even when cursor drifts off canvas
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, elementStart, selectedElementId]);

  const getElementStyle = (elem: LayoutElement) => {
    return {
      left: `${elem.x}%`,
      top: `${elem.y}%`,
      width: `${elem.width}%`,
      height: `${elem.height}%`,
      transform: `rotate(${elem.rotation || 0}deg)`,
      zIndex: elem.zIndex || 10,
    };
  };

  const getTextStyle = (elem: LayoutElement) => {
    if (!typography) return {};
    const isDisplay = elem.type === 'headline';
    return {
      fontFamily: elem.fontFamily || (isDisplay ? typography.displayFont : typography.bodyFont),
      fontSize: `${(elem.fontSize || (isDisplay ? typography.headlineSize : elem.type === 'subheadline' ? typography.subheadlineSize : elem.type === 'cta' ? typography.ctaSize : typography.bodySize)) * scale}px`,
      fontWeight: isDisplay ? typography.fontWeightDisplay : typography.fontWeightBody,
      lineHeight: typography.lineHeight || 1.2,
      letterSpacing: `${(typography.tracking || 0) * scale}px`,
      textAlign: typography.alignment || 'left',
      color: elem.color || '#ffffff',
    };
  };

  return (
    <div className="relative flex-1 flex items-center justify-center p-2 bg-zinc-950 rounded-2xl overflow-hidden min-h-[500px]">
      <div
        id="design-canvas"
        ref={containerRef}
        className="relative shadow-2xl bg-zinc-900 overflow-hidden w-full max-w-[650px] aspect-[4/5] rounded-xl border border-zinc-800"
        onClick={() => setSelectedElementId(null)}
      >
        {/* Background Image */}
        <img
          src={imageUrl}
          alt="Poster Background"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Region Overlays for Visualization */}
        {faceRegions.map((region, idx) => (
          <div
            key={`face-${idx}`}
            className="absolute border border-dashed border-rose-500/40 bg-rose-500/5 flex items-center justify-center pointer-events-none z-0"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`
            }}
          >
            <span className="text-[9px] font-mono text-rose-400 bg-zinc-950/80 px-1 rounded border border-rose-900/40">
              Face Region
            </span>
          </div>
        ))}

        {productRegions.map((region, idx) => (
          <div
            key={`product-${idx}`}
            className="absolute border border-dashed border-amber-500/40 bg-amber-500/5 flex items-center justify-center pointer-events-none z-0"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`
            }}
          >
            <span className="text-[9px] font-mono text-amber-400 bg-zinc-950/80 px-1 rounded border border-amber-900/40">
              {region.label || 'Product'}
            </span>
          </div>
        ))}

        {/* Elements Loop */}
        {layout?.elements.map((elem) => {
          const isSelected = selectedElementId === elem.id;
          const textStyle = getTextStyle(elem);

          return (
            <div
              key={elem.id}
              style={getElementStyle(elem)}
              onMouseDown={(e) => handleMouseDown(e, elem)}
              className={`absolute group cursor-move select-none p-1 rounded transition-shadow ${
                isSelected 
                  ? 'ring-2 ring-blue-500/60 shadow-lg' 
                  : 'hover:ring-1 hover:ring-zinc-600/40'
              }`}
            >
              {/* Render content based on element type */}
              {elem.type === 'cta' ? (
                <div
                  style={{
                    backgroundColor: elem.color || '#3b82f6',
                    fontFamily: textStyle.fontFamily,
                    fontSize: textStyle.fontSize,
                    fontWeight: 'bold',
                    letterSpacing: textStyle.letterSpacing,
                  }}
                  className="w-full h-full flex items-center justify-center rounded-lg shadow-md px-4 text-white text-center cursor-pointer overflow-hidden border border-white/10"
                >
                  {editingId === elem.id ? (
                    <input
                      type="text"
                      value={elem.text || ''}
                      onChange={(e) => onElementUpdate(elem.id, { text: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                      autoFocus
                      className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 w-full text-center focus:outline-none"
                    />
                  ) : (
                    <span onDoubleClick={() => setEditingId(elem.id)}>
                      {elem.text || 'CTA BUTTON'}
                    </span>
                  )}
                </div>
              ) : elem.type === 'logo' ? (
                <div className="w-full h-full flex items-center justify-center border border-dashed border-zinc-700 bg-zinc-950/30 rounded text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {editingId === elem.id ? (
                    <input
                      type="text"
                      value={elem.text || 'BRAND'}
                      onChange={(e) => onElementUpdate(elem.id, { text: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                      autoFocus
                      className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 w-full text-center focus:outline-none"
                    />
                  ) : (
                    <span onDoubleClick={() => setEditingId(elem.id)}>
                      {elem.text || 'BRAND LOGO'}
                    </span>
                  )}
                </div>
              ) : elem.type === 'divider' ? (
                <div className="w-full h-1/2 border-b border-zinc-600" />
              ) : (
                <div
                  style={textStyle}
                  className="w-full h-full overflow-hidden flex items-center justify-center leading-normal"
                >
                  {editingId === elem.id ? (
                    <textarea
                      value={elem.text || ''}
                      onChange={(e) => onElementUpdate(elem.id, { text: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      className="bg-zinc-900 border border-zinc-700 text-white rounded p-1 w-full h-full focus:outline-none resize-none font-sans text-xs"
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => setEditingId(elem.id)}
                      className="w-full inline-block truncate whitespace-pre-wrap break-words"
                    >
                      {elem.text}
                    </span>
                  )}
                </div>
              )}

              {/* Selection Bounds & Resize Handles */}
              {isSelected && (
                <>
                  {/* Resize Handle - Bottom Right */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown(e, elem)}
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 border border-white rounded-full cursor-se-resize z-50 shadow-md hover:scale-115 transition-transform"
                  />
                  
                  {/* Quick Edit Overlay HUD */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white border border-zinc-800 text-[10px] rounded px-2 py-0.5 shadow-xl flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity z-50">
                    <button 
                      onClick={() => setEditingId(elem.id)}
                      className="hover:text-blue-400 p-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      onClick={() => onElementUpdate(elem.id, { rotation: (elem.rotation + 45) % 360 })}
                      className="hover:text-zinc-300 font-mono text-[9px] px-0.5"
                    >
                      R
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Canvas;
