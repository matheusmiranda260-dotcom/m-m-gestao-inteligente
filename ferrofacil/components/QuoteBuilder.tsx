import React, { useState, useEffect } from 'react';
import { DevSystemMap } from './DevSystemMap';
import { analyzeImageWithGemini } from '../services/imageAnalysisService';
import { ElementType, BarUsage, SteelItem, Client, Quote, MainBarGroup, HookType } from '../types';
import { GAUGES, STEEL_WEIGHTS, DEFAULT_KG_PRICE } from '../constants';

interface QuoteBuilderProps {
  client: Client;
  onSave: (quote: Quote) => void;
  onCancel: () => void;
  isCounter?: boolean;
  counterObs?: string;
}

// Desenho da Barra Longitudinal (Retas e Dobradas)
const BarDrawing: React.FC<{
  length: number;
  hookStart: number;
  hookEnd: number;
  startType: HookType;
  endType: HookType;
  compact?: boolean;
  shape?: string;
  segmentD?: number;
  segmentE?: number;
}> = ({ length, hookStart, hookEnd, startType, endType, compact, shape, segmentD, segmentE }) => {
  const viewW = compact ? 120 : 320;
  const viewH = compact ? 50 : 120;
  const padding = compact ? 20 : 60;
  const centerY = viewH / 2;
  const hookSize = compact ? 10 : 25;
  const inwardSize = compact ? 6 : 15;
  const fontSize = compact ? '7px' : '12px';

  const isCShape = shape?.startsWith('c_');

  let path = "";

  // Start: Inward D -> Leg Start
  let startX = padding;
  let startY = centerY;

  if (startType === 'up') {
    if (isCShape && segmentD) {
      path = `M ${startX + inwardSize},${startY - hookSize} L ${startX},${startY - hookSize} L ${startX},${startY}`;
    } else {
      path = `M ${startX},${startY - hookSize} L ${startX},${startY}`;
    }
  } else if (startType === 'down') {
    if (isCShape && segmentD) {
      path = `M ${startX + inwardSize},${startY + hookSize} L ${startX},${startY + hookSize} L ${startX},${startY}`;
    } else {
      path = `M ${startX},${startY + hookSize} L ${startX},${startY}`;
    }
  } else {
    path = `M ${startX},${startY}`;
  }

  // Horizontal line
  path += ` L ${viewW - padding},${centerY}`;

  // End: Leg End -> Inward E
  if (endType === 'up') {
    path += ` L ${viewW - padding},${centerY - hookSize}`;
    if (isCShape && segmentE) path += ` L ${viewW - padding - inwardSize},${centerY - hookSize}`;
  } else if (endType === 'down') {
    path += ` L ${viewW - padding},${centerY + hookSize}`;
    if (isCShape && segmentE) path += ` L ${viewW - padding - inwardSize},${centerY + hookSize}`;
  }

  return (
    <div className={`flex flex-col items-center justify-center rounded-xl transition-all ${compact ? 'p-0 bg-transparent' : 'p-6 bg-white border border-slate-100 shadow-inner mb-2'}`}>
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="w-full h-full max-h-full drop-shadow-sm select-none">
        <path d={path} fill="none" stroke="#0f172a" strokeWidth={compact ? "2" : "5"} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dimension Labels */}
        <text x={viewW / 2} y={centerY - (compact ? 4 : 10)} textAnchor="middle" className="font-black fill-slate-900" style={{ fontSize }}>{(length * 100).toFixed(0)}</text>

        {startType !== 'none' && (
          <>
            <text x={padding - (compact ? 8 : 15)} y={startType === 'up' ? centerY - (compact ? 6 : 15) : centerY + (compact ? 12 : 25)} textAnchor="middle" className="font-black fill-indigo-600" style={{ fontSize }}>{hookStart}</text>
            {isCShape && segmentD && <text x={padding + inwardSize / 2} y={startType === 'up' ? centerY - hookSize - (compact ? 3 : 8) : centerY + hookSize + (compact ? 10 : 18)} textAnchor="middle" className="font-black fill-amber-500" style={{ fontSize: compact ? '6px' : '9px' }}>{segmentD}</text>}
          </>
        )}

        {endType !== 'none' && (
          <>
            <text x={viewW - padding + (compact ? 8 : 15)} y={endType === 'up' ? centerY - (compact ? 6 : 15) : centerY + (compact ? 12 : 25)} textAnchor="middle" className="font-black fill-indigo-600" style={{ fontSize }}>{hookEnd}</text>
            {isCShape && segmentE && <text x={viewW - padding - inwardSize / 2} y={endType === 'up' ? centerY - hookSize - (compact ? 3 : 8) : centerY + hookSize + (compact ? 10 : 18)} textAnchor="middle" className="font-black fill-amber-500" style={{ fontSize: compact ? '6px' : '9px' }}>{segmentE}</text>}
          </>
        )}
      </svg>
    </div>
  );
};

// Componente Unificado de Visualização Técnica do Estribo (Todas as Vistas)
const StirrupDetailView: React.FC<{
  width: number;
  height: number;
  model?: 'rect' | 'circle' | 'triangle' | 'pentagon' | 'hexagon';
  gauge: string;
  spacing: number;
  count: number;
  position?: string;
  scale?: number;
}> = ({ width, height, model = 'rect', gauge, spacing, count, position, scale }) => {
  const sW = Math.round(width || 20);
  const sH = Math.round(height || 20);
  const displayScale = scale || 3;

  // Calculate Cut Length (C) and Visual Paths
  let cutLength = 0;
  let path = "";
  let widthLabel = "";
  let heightLabel = "";
  let showWidth = false;
  let showHeight = false;

  // ViewBox Setup
  const pW = sW * displayScale;
  const pH = sH * displayScale;
  const pad = 20;
  const viewBoxSize = Math.max(pW, pH) + pad * 2;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;

  // Helper for Hooks (Generic Double Diagonal at top-left relative to shape bounding box)
  const drawHooks = (startX: number, startY: number) => (
    <>
      <line x1={startX + 3} y1={startY} x2={startX + 10} y2={startY + 7} stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <line x1={startX} y1={startY + 3} x2={startX + 7} y2={startY + 10} stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
    </>
  );

  let shapeElement: React.ReactNode = null;
  let dimensionElements: React.ReactNode = null;

  if (model === 'rect') {
    cutLength = (sW + sH) * 2 + 10;
    const dw = sW * displayScale;
    const dh = sH * displayScale;
    const x0 = cx - dw / 2;
    const y0 = cy - dh / 2;

    shapeElement = (
      <>
        <rect x={x0} y={y0} width={dw} height={dh} fill="none" stroke="#0f172a" strokeWidth="2" />
        {drawHooks(x0, y0)}
      </>
    );
    // Dimensions
    dimensionElements = (
      <>
        <text x={cx} y={y0 - 5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW}</text>
        <text x={cx} y={y0 + dh + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW}</text>
        <text x={x0 - 5} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH}</text>
        <text x={x0 + dw + 5} y={cy} textAnchor="start" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH}</text>
      </>
    );

  } else if (model === 'circle') {
    cutLength = Math.round(sW * 3.14 + 10);
    const r = (sW * displayScale) / 2;

    shapeElement = (
      <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0f172a" strokeWidth="2" />
        {drawHooks(cx - r * 0.7, cy - r * 0.7)}
      </>
    );
    dimensionElements = (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#0f172a">Ø{sW}</text>
    );

  } else if (model === 'triangle') {
    // Equilateral or Isosceles based on W/H
    // Let's assume Width is Base, Height is Height
    // Perimeter = Base + 2 * sqrt((base/2)^2 + height^2)
    const side = Math.sqrt(Math.pow(sW / 2, 2) + Math.pow(sH, 2));
    cutLength = Math.round(sW + 2 * side + 10);

    const dw = sW * displayScale;
    const dh = sH * displayScale;
    const x0 = cx - dw / 2; // Left
    const x1 = cx + dw / 2; // Right
    const xTop = cx;      // Top Center
    const yTop = cy - dh / 2;
    const yBot = cy + dh / 2;

    shapeElement = (
      <>
        <polygon points={`${x0},${yBot} ${x1},${yBot} ${xTop},${yTop}`} fill="none" stroke="#0f172a" strokeWidth="2" />
        {drawHooks(xTop - 10, yTop + 10)}
      </>
    );
    dimensionElements = (
      <>
        <text x={cx} y={yBot + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW}</text>
        <text x={x0 - 5} y={cy} textAnchor="end" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(side)}</text>
        <text x={x1 + 5} y={cy} textAnchor="start" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(side)}</text>
      </>
    );

  } else if (model === 'pentagon') {
    // Regular Pentagon ideally. Using StirrupWidth as "Diameter" (approx width)
    const r = (sW * displayScale) / 2;
    cutLength = Math.round(sW * 5 + 10); // Reference says "divide por 5", implied user enters TOTAL 'A'. But practically user enters SIDE or DIAMETER. 
    // Let's assume 'sW' is the SIDE LENGTH for Pentagon based on "Modelo 2" diagram having 'B' on all sides.
    // If user inputs 'A' in the system, and system says "divide by 5 = B", then 'sW' coming here is likely 'B' (the side) if we calculated it, OR 'A' (total).
    // Given our editor inputs W/H, let's treat `stirrupWidth` as the SIDE length 'B' for simplicity and consistency with visual "all sides same".
    // Or if `stirrupWidth` is Diameter. 
    // Let's stick to: stirrupWidth = Side Length.
    cutLength = (sW * 5) + 10;

    // Draw Pentagon
    const points = [];
    for (let i = 0; i < 5; i++) {
      const angle = (2 * Math.PI * i) / 5 - Math.PI / 2;
      // Radius needed to get side length sW? Side s = 2R sin(pi/5). R = s / (2sin(pi/5))
      const R = (sW * displayScale) / (2 * Math.sin(Math.PI / 5));
      points.push(`${cx + R * Math.cos(angle)},${cy + R * Math.sin(angle)}`);
    }

    shapeElement = (
      <>
        <polygon points={points.join(' ')} fill="none" stroke="#0f172a" strokeWidth="2" />
        {drawHooks(cx - 15, cy - 25)}
      </>
    );
    dimensionElements = (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#0f172a">{sW}</text>
    );

  } else if (model === 'hexagon') {
    // Regular Hexagon. stirrupWidth = Side Length? Or Diameter?
    // Let's assume StirrupWidth = Side Length.
    cutLength = (sW * 6) + 10;
    const R = sW * displayScale; // For Hexagon, Side = Radius

    // Draw Hexagon
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (2 * Math.PI * i) / 6 - Math.PI / 6; // Rotate to flat top? Or pointy?
      // -PI/6 gives flat sides vertical? 
      // Let's use standard pointy top.
      points.push(`${cx + R * Math.cos(angle)},${cy + R * Math.sin(angle)}`);
    }

    shapeElement = (
      <>
        <polygon points={points.join(' ')} fill="none" stroke="#0f172a" strokeWidth="2" />
        {drawHooks(cx - 10, cy - R + 10)}
      </>
    );
    dimensionElements = (
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#0f172a">{sW}</text>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white border border-slate-100 shadow-sm transition-all hover:scale-105">
      <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        {shapeElement}
        {dimensionElements}
      </svg>
      {/* Footer Info */}
      <div className="flex flex-col items-center mt-1">
        <text className="text-[11px] font-black text-slate-800 leading-none">
          {count} {position || 'N2'} ø{gauge} C={cutLength}
        </text>
      </div>
    </div>
  );
};

// Desenho da Gaiola de Sapata (Vista de Cima)
const CageDrawing: React.FC<{ lengthCm: number; widthCm: number; spacing: number; compact?: boolean }> = ({ lengthCm, widthCm, spacing, compact }) => {
  const size = compact ? 50 : 150;
  const pad = compact ? 5 : 20;
  const drawW = size - (pad * 2);
  const drawH = size - (pad * 2);

  // Calculamos quantas linhas desenhar para representar o espaçamento
  const linesX = Math.min(6, Math.max(2, Math.ceil(lengthCm / spacing)));
  const linesY = Math.min(6, Math.max(2, Math.ceil(widthCm / spacing)));

  return (
    <div className={`flex items-center justify-center rounded-xl transition-all ${compact ? 'bg-transparent' : 'p-6 bg-white border border-slate-100 shadow-inner'}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect x={pad} y={pad} width={drawW} height={drawH} fill="#eff6ff" stroke="#4f46e5" strokeWidth={compact ? "1.5" : "3"} rx={compact ? "2" : "4"} />
        {/* Linhas Horizontais */}
        {Array.from({ length: linesY }).map((_, i) => (
          <line key={`h${i}`} x1={pad} y1={pad + (drawH / (linesY - 1)) * i} x2={pad + drawW} y2={pad + (drawH / (linesY - 1)) * i} stroke="#4f46e5" strokeWidth={compact ? "0.5" : "1"} strokeOpacity="0.5" />
        ))}
        {/* Linhas Verticais */}
        {Array.from({ length: linesX }).map((_, i) => (
          <line key={`v${i}`} x1={pad + (drawW / (linesX - 1)) * i} y1={pad} x2={pad + (drawW / (linesX - 1)) * i} y2={pad + drawH} stroke="#4f46e5" strokeWidth={compact ? "0.5" : "1"} strokeOpacity="0.5" />
        ))}
        {/* Dimensões */}
        {!compact && (
          <>
            <text x={pad + drawW / 2} y={pad - 5} textAnchor="middle" className="font-black fill-indigo-600 text-[9px] uppercase tracking-tighter">{lengthCm}cm</text>
            <text x={pad - 5} y={pad + drawH / 2} textAnchor="middle" className="font-black fill-indigo-600 text-[9px] uppercase tracking-tighter" style={{ transform: 'rotate(-90deg)', transformOrigin: `${pad - 5}px ${pad + drawH / 2}px` }}>{widthCm}cm</text>
          </>
        )}
      </svg>
    </div>
  );
};

// Visualização da Seção Transversal Composta (Todas as barras)
// Helper Component for Dimension Lines
const TechnicalDimension: React.FC<{ x1: number; y1: number; x2: number; y2: number; text: string; offset?: number; vertical?: boolean }> = ({ x1, y1, x2, y2, text, offset = 0, vertical = false }) => {
  const tickSize = 4;
  const ox = vertical ? offset : 0;
  const oy = vertical ? 0 : offset;
  const tx1 = x1 + ox; const ty1 = y1 + oy;
  const tx2 = x2 + ox; const ty2 = y2 + oy;

  const midX = (tx1 + tx2) / 2;
  const midY = (ty1 + ty2) / 2;

  return (
    <g>
      <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#000" strokeWidth="0.8" />
      <line x1={tx1 - (vertical ? tickSize : 0)} y1={ty1 - (vertical ? 0 : tickSize)} x2={tx1 + (vertical ? tickSize : 0)} y2={ty1 + (vertical ? 0 : tickSize)} stroke="#000" strokeWidth="0.8" />
      <line x1={tx2 - (vertical ? tickSize : 0)} y1={ty2 - (vertical ? 0 : tickSize)} x2={tx2 + (vertical ? tickSize : 0)} y2={ty2 + (vertical ? 0 : tickSize)} stroke="#000" strokeWidth="0.8" />
      <text x={midX} y={midY + (vertical ? 0 : -3)} textAnchor="middle" fontSize="8" fontFamily="Arial" fill="#000" dominantBaseline={vertical ? "middle" : "auto"} transform={vertical ? `rotate(-90 ${midX} ${midY}) translate(0, -3)` : ""}>
        {text}
      </text>
    </g>
  );
};

// Visualização da Seção Transversal Composta (Estilo Projeto Estrutural)
// Helper Function for Grid Points
const getStirrupGridPoints = (w: number, h: number, model: string): { x: number, y: number, id: number }[] => { const points: { x: number, y: number, id: number }[] = []; let id = 0; const cx = w / 2; const cy = h / 2; if (model === 'rect') { const cols = 5; const rows = 6; for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { const x = (w * c) / (cols - 1); const y = (h * r) / (rows - 1); points.push({ x, y, id: id++ }); } } } else if (model === 'circle') { const radius = w / 2; const numPoints = 16; for (let i = 0; i < numPoints; i++) { const angle = (2 * Math.PI * i) / numPoints - Math.PI / 2; points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), id: id++ }); } points.push({ x: cx, y: cy, id: id++ }); } else if (model === 'triangle') { const p1 = { x: w / 2, y: 0 }; const p2 = { x: w, y: h }; const p3 = { x: 0, y: h }; const pointsPerEdge = 4; for (let i = 0; i < pointsPerEdge; i++) { points.push({ x: p1.x + (p2.x - p1.x) * (i / pointsPerEdge), y: p1.y + (p2.y - p1.y) * (i / pointsPerEdge), id: id++ }); } for (let i = 0; i < pointsPerEdge; i++) { points.push({ x: p2.x + (p3.x - p2.x) * (i / pointsPerEdge), y: p2.y + (p3.y - p2.y) * (i / pointsPerEdge), id: id++ }); } for (let i = 0; i < pointsPerEdge; i++) { points.push({ x: p3.x + (p1.x - p3.x) * (i / pointsPerEdge), y: p3.y + (p1.y - p3.y) * (i / pointsPerEdge), id: id++ }); } } else if (model === 'pentagon') { const v = [{ x: w / 2, y: 0 }, { x: w, y: h * 0.38 }, { x: w * 0.81, y: h }, { x: w * 0.19, y: h }, { x: 0, y: h * 0.38 }]; const pointsPerEdge = 3; for (let side = 0; side < 5; side++) { const start = v[side]; const end = v[(side + 1) % 5]; for (let i = 0; i < pointsPerEdge; i++) { points.push({ x: start.x + (end.x - start.x) * (i / pointsPerEdge), y: start.y + (end.y - start.y) * (i / pointsPerEdge), id: id++ }); } } } else if (model === 'hexagon') { const v = [{ x: w * 0.25, y: 0 }, { x: w * 0.75, y: 0 }, { x: w, y: h / 2 }, { x: w * 0.75, y: h }, { x: w * 0.25, y: h }, { x: 0, y: h / 2 }]; const pointsPerEdge = 3; for (let side = 0; side < 6; side++) { const start = v[side]; const end = v[(side + 1) % 6]; for (let i = 0; i < pointsPerEdge; i++) { points.push({ x: start.x + (end.x - start.x) * (i / pointsPerEdge), y: start.y + (end.y - start.y) * (i / pointsPerEdge), id: id++ }); } } } return points; };

const CompositeCrossSection: React.FC<{
  stirrupW: number;
  stirrupH: number;
  bars: MainBarGroup[];
  stirrupPos?: string;
  stirrupGauge?: string;
  stirrupCount?: number;
  model?: 'rect' | 'circle' | 'triangle' | 'pentagon' | 'hexagon';
  onPointClick?: (pointIndex: number) => void; // NEW: Click on specific grid point
  selectedPointIndices?: number[]; // NEW: Which points are selected
  showAvailablePoints?: boolean; // NEW: Show clickable grid
}> = ({ stirrupW, stirrupH, bars, stirrupPos, stirrupGauge, stirrupCount, model = 'rect', onPointClick, selectedPointIndices = [], showAvailablePoints = false }) => {
  // Ensure valid dimensions
  const width = (stirrupW && stirrupW > 0) ? stirrupW : 15;
  const height = (stirrupH && stirrupH > 0) ? stirrupH : 20;

  const maxDim = Math.max(width, height, 15);
  const scale = 180 / maxDim;
  const w = width * scale;
  const h = (model === 'circle' ? width : height) * scale;
  const cx = w / 2;
  const cy = h / 2;
  const padding = 50;
  const barRadius = 4.5;

  // --- Generate Grid of Available Points ---
  const generateGridPoints = (): { x: number, y: number, id: number }[] => {
    const points: { x: number, y: number, id: number }[] = [];
    let id = 0;
    const margin = 0; // Points sit exactly on the line or grid

    if (model === 'rect') {
      // RECTANGLE: Full dense grid (Interior + Edges) as per image
      // Visual params are w and h.
      // We want a grid that covers everything.
      const cols = 5; // 5 columns of points
      const rows = 6; // 6 rows of points

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (w * c) / (cols - 1);
          const y = (h * r) / (rows - 1);
          points.push({ x, y, id: id++ });
        }
      }
    } else if (model === 'circle') {
      // CIRCLE: Perimeter distribution mainly
      const radius = w / 2;
      const numPoints = 16; // Good number for a circle perimeter

      for (let i = 0; i < numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints - Math.PI / 2;
        points.push({
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          id: id++
        });
      }
      // Add center point just in case
      points.push({ x: cx, y: cy, id: id++ });

    } else if (model === 'triangle') {
      // TRIANGLE: Perimeter edges only
      // Vertices: Top(w/2, 0), Right(w, h), Left(0, h)
      const p1 = { x: w / 2, y: 0 };
      const p2 = { x: w, y: h };
      const p3 = { x: 0, y: h };

      const pointsPerEdge = 4; // Points between vertices

      // Edge 1: Top -> Right
      for (let i = 0; i < pointsPerEdge; i++) {
        points.push({
          x: p1.x + (p2.x - p1.x) * (i / pointsPerEdge),
          y: p1.y + (p2.y - p1.y) * (i / pointsPerEdge),
          id: id++
        });
      }
      // Edge 2: Right -> Left (Bottom)
      for (let i = 0; i < pointsPerEdge; i++) {
        points.push({
          x: p2.x + (p3.x - p2.x) * (i / pointsPerEdge),
          y: p2.y + (p3.y - p2.y) * (i / pointsPerEdge),
          id: id++
        });
      }
      // Edge 3: Left -> Top
      for (let i = 0; i < pointsPerEdge; i++) {
        points.push({
          x: p3.x + (p1.x - p3.x) * (i / pointsPerEdge),
          y: p3.y + (p1.y - p3.y) * (i / pointsPerEdge),
          id: id++
        });
      }

    } else if (model === 'pentagon') {
      // PENTAGON: Perimeter edges
      // Vertices logic (copied from shape path logic roughly for placement)
      const v = [
        { x: w / 2, y: 0 },
        { x: w, y: h * 0.38 },
        { x: w * 0.81, y: h },
        { x: w * 0.19, y: h },
        { x: 0, y: h * 0.38 }
      ];

      const pointsPerEdge = 3;
      for (let side = 0; side < 5; side++) {
        const start = v[side];
        const end = v[(side + 1) % 5];
        for (let i = 0; i < pointsPerEdge; i++) {
          points.push({
            x: start.x + (end.x - start.x) * (i / pointsPerEdge),
            y: start.y + (end.y - start.y) * (i / pointsPerEdge),
            id: id++
          });
        }
      }

    } else if (model === 'hexagon') {
      // HEXAGON: Perimeter edges
      const v = [
        { x: w * 0.25, y: 0 },
        { x: w * 0.75, y: 0 },
        { x: w, y: h / 2 },
        { x: w * 0.75, y: h },
        { x: w * 0.25, y: h },
        { x: 0, y: h / 2 }
      ];

      const pointsPerEdge = 3;
      for (let side = 0; side < 6; side++) {
        const start = v[side];
        const end = v[(side + 1) % 6];
        for (let i = 0; i < pointsPerEdge; i++) {
          points.push({
            x: start.x + (end.x - start.x) * (i / pointsPerEdge),
            y: start.y + (end.y - start.y) * (i / pointsPerEdge),
            id: id++
          });
        }
      }
    }

    return points;
  };

  const availablePoints = getStirrupGridPoints(w, h, model);

  // --- Render Shape ---
  let shapePath = "";
  if (model === 'rect') {
    shapePath = `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
  } else if (model === 'triangle') {
    shapePath = `M${w / 2},0 L${w},${h} L0,${h} Z`;
  } else if (model === 'pentagon') {
    shapePath = `M${w / 2},0 L${w},${h * 0.38} L${w * 0.81},${h} L${w * 0.19},${h} L0,${h * 0.38} Z`;
  } else if (model === 'hexagon') {
    shapePath = `M${w * 0.25},0 L${w * 0.75},0 L${w},${h / 2} L${w * 0.75},${h} L${w * 0.25},${h} L0,${h / 2} Z`;
  }

  // --- Render existing bars based on placement or pointIndex ---
  const existingBars: { x: number, y: number, color: string }[] = [];
  bars.forEach(group => {
    let count = group.count || 0;
    if (count > 50) count = 50;
    if (count <= 0) return;
    const color = group.usage === BarUsage.PRINCIPAL ? '#0f172a' : '#ef4444';

    // NEW Logic: Check if bar has exact pointIndices (Array)
    if (group.pointIndices && group.pointIndices.length > 0) {
      group.pointIndices.forEach(idx => {
        const point = availablePoints.find(p => p.id === idx);
        if (point) {
          existingBars.push({ x: point.x, y: point.y, color });
        }
      });
    } else {
      // Legacy Fallback for old bars without pointIndex
      const placement = group.placement || 'bottom';
      if (placement === 'top') {
        for (let i = 0; i < count; i++) {
          const xPos = count === 1 ? w / 2 : (w * i) / (count - 1);
          existingBars.push({ x: xPos, y: 10, color });
        }
      } else if (placement === 'bottom') {
        for (let i = 0; i < count; i++) {
          const xPos = count === 1 ? w / 2 : (w * i) / (count - 1);
          existingBars.push({ x: xPos, y: h - 10, color });
        }
      } else if (placement === 'distributed') {
        for (let i = 0; i < count; i++) {
          const side = i % 2 === 0 ? 10 : w - 10;
          const rows = Math.ceil(count / 2);
          const rowIdx = Math.floor(i / 2);
          const yPos = (h * (rowIdx + 1)) / (rows + 1);
          existingBars.push({ x: side, y: yPos, color });
        }
      } else if (placement === 'center') {
        existingBars.push({ x: w / 2, y: h / 2, color });
      }
    }
  });

  return (
    <div className="flex flex-col items-center select-none relative w-full h-full">
      <div className="bg-white p-2 flex items-center justify-center relative transition-all" style={{ minWidth: '200px', height: '220px' }}>
        <svg width={w + padding * 2} height={h + padding * 2} viewBox={`-${padding} -${padding} ${w + padding * 2} ${h + padding * 2}`} className="overflow-visible">

          {/* Render Shape */}
          {model === 'circle' ? (
            <>
              <circle cx={cx} cy={cy} r={w / 2} fill="none" stroke="#0f172a" strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r={w / 2} fill="#000" fillOpacity="0.02" stroke="none" />
            </>
          ) : (
            <>
              <path d={shapePath} fill="none" stroke="#0f172a" strokeWidth="2.5" />
              <path d={shapePath} fill="#000" fillOpacity="0.02" stroke="none" />
            </>
          )}

          {/* Dimension Labels for Concrete Section */}
          {model === 'rect' && (
            <>
              {/* Top Width Dimension */}
              <text x={cx} y={-8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{width}</text>
              {/* Bottom Width Dimension */}
              <text x={cx} y={h + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{width}</text>
              {/* Left Height Dimension */}
              <text x={-8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{height}</text>
              {/* Right Height Dimension */}
              <text x={w + 8} y={cy} textAnchor="start" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{height}</text>
            </>
          )}
          {model === 'circle' && (
            <>
              {/* Diameter Label */}
              <text x={cx} y={cy - w / 2 - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">Ø{width}</text>
            </>
          )}
          {model === 'triangle' && (
            <>
              {/* Base Width */}
              <text x={cx} y={h + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{width}</text>
              {/* Height */}
              <text x={-8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{height}</text>
            </>
          )}
          {model === 'pentagon' && (
            <>
              {/* Width (Base/Max Width) */}
              <text x={cx} y={h + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{width}</text>
              {/* Height */}
              <text x={-8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{height}</text>
            </>
          )}
          {model === 'hexagon' && (
            <>
              {/* Width */}
              <text x={cx} y={h + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{width}</text>
              {/* Height */}
              <text x={-8} y={cy} textAnchor="end" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#0f172a">{height}</text>
            </>
          )}

          {/* Available Grid Points (when adding bars) */}
          {showAvailablePoints && availablePoints.map(point => {
            // Check if point is already occupied by ANY existing bar group
            const isOccupied = bars.some(b =>
              (b.pointIndices && b.pointIndices.includes(point.id))
            );

            const isSelected = selectedPointIndices.includes(point.id);

            // Interaction logic
            const handleClick = () => {
              if (isOccupied) return; // Block click on occupied
              onPointClick?.(point.id);
            };

            return (
              <g key={point.id} onClick={handleClick} className={isOccupied ? "cursor-not-allowed" : "cursor-pointer"}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 7 : (isOccupied ? 4 : 5)}
                  fill={isSelected ? "#4f46e5" : (isOccupied ? "#ef4444" : "#cbd5e1")} // Red if occupied, Blue if selected, Gray if free
                  fillOpacity={isSelected ? 1 : (isOccupied ? 0.5 : 0.4)}
                  stroke={isSelected ? "#312e81" : (isOccupied ? "#991b1b" : "#94a3b8")}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className={`transition-all ${!isOccupied && !isSelected ? 'hover:fill-indigo-400 hover:r-6' : ''}`}
                />
                {isSelected && (
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#4f46e5"
                  >
                    {selectedPointIndices.indexOf(point.id) + 1}
                  </text>
                )}
                {/* Optional: Cross for occupied */}
                {isOccupied && (
                  <path
                    d={`M${point.x - 2},${point.y - 2} L${point.x + 2},${point.y + 2} M${point.x + 2},${point.y - 2} L${point.x - 2},${point.y + 2}`}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* Existing Bars (Rendered underneath grid if showing grid, or normally if not) */}
          {!showAvailablePoints && existingBars.map((bar, i) => (
            <circle key={i} cx={bar.x} cy={bar.y} r={barRadius * 1.2} fill={bar.color} stroke="white" strokeWidth="1" />
          ))}

        </svg>
      </div>
    </div >
  );
};

// Nova Visualização Longitudinal Interativa (Elevação Detalhada)
const BeamElevationView: React.FC<{
  item: SteelItem;
  onEditBar: (idx: number) => void;
  onRemoveBar: (idx: number) => void;
  onBarUpdate?: (idx: number, newOffset: number) => void;
  newBar?: MainBarGroup; // Current draft bar
  onNewBarUpdate?: (newOffset: number) => void;
  selectedIdx?: number;
  readOnly?: boolean;
}> = ({ item, onEditBar, onRemoveBar, onBarUpdate, newBar, onNewBarUpdate, selectedIdx, readOnly }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Dynamic Layout to reduce whitespace
  const barStackH = 40;
  const topPad = 60; // Reduced top padding

  const layoutTopBars = item.mainBars.filter(b => b.placement === 'top');
  const layoutBotBars = item.mainBars.filter(b => b.placement !== 'top');

  // Anchor Beam Position
  const beamTopY = topPad + (Math.max(1, layoutTopBars.length) * barStackH);
  const beamBotY = beamTopY + 50;

  // Calculate total View Height needed
  // Beam bottom + bottom bars stack + annotations space (250px) + detached stirrup padding if needed
  const viewH = beamBotY + (Math.max(1, layoutBotBars.length) * barStackH) + 250;
  const viewW = 1000;
  const padX = 60;

  const [draggingBarIdx, setDraggingBarIdx] = useState<number | 'new' | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [initialOffset, setInitialOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Calculate effective length from all bars extents (including the one being added)
  const getExtents = () => {
    const bars = [...item.mainBars];
    if (newBar) bars.push(newBar);
    if (bars.length === 0) return Math.max(1, item.length * 100);
    return Math.max(item.length * 100, ...bars.map(b => (b.offset || 0) + (b.segmentA || 0)));
  };

  const effectiveLengthCm = getExtents();

  // Width for scale calculation (available space) - Reserve space for Section View
  const sectionSpace = 250;
  const availableWidthPx = viewW - 2 * padX - sectionSpace;
  const scaleX = Math.min(availableWidthPx / (effectiveLengthCm || 1), 1.0); // Reduced zoom max

  // Pixels used by the actual span
  const totalWidthPx = effectiveLengthCm * scaleX;
  // Center within the available space (left side), leaving right side for Section
  const actualPadX = padX + (availableWidthPx - totalWidthPx) / 2;

  const handleMouseDown = (e: React.MouseEvent, idx: number | 'new', currentOffset: number) => {
    if (readOnly) return;

    if (!svgRef.current) return;

    // Explicitly focus the SVG to ensure keyboard events work correctly
    svgRef.current.focus();

    // Blur any active input to allow arrow keys to move the bar
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    e.stopPropagation();
    e.preventDefault();
    setDraggingBarIdx(idx);
    setDragStartX(svgPoint.x);
    setInitialOffset(currentOffset);
    setIsDragging(false);

    // Also select this bar for keyboard movement (only for existing bars)
    if (typeof idx === 'number') {
      onEditBar(idx);
    }
  };

  useEffect(() => {
    if (draggingBarIdx === null) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (draggingBarIdx === null || !svgRef.current) return;

      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

      const deltaSVG = svgPoint.x - dragStartX;
      if (Math.abs(deltaSVG) > 2) setIsDragging(true);

      const deltaCm = deltaSVG / scaleX;
      let nextOffset = Math.round(initialOffset + deltaCm);

      const bar = draggingBarIdx === 'new' ? newBar : item.mainBars[draggingBarIdx];
      if (!bar) return;

      // REMOVED: Rigid constraints based on initial length. 
      // [This is a view_file call, not replace]nd" the beam by dragging bars further.
      const maxPossibleOffset = 2000; // 20 meters safety limit

      nextOffset = Math.max(0, Math.min(nextOffset, maxPossibleOffset));

      if (draggingBarIdx === 'new') {
        onNewBarUpdate?.(nextOffset);
      } else {
        onBarUpdate?.(draggingBarIdx, nextOffset);
      }
    };

    const handleWindowMouseUp = () => {
      setDraggingBarIdx(null);
      setTimeout(() => setIsDragging(false), 50);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingBarIdx, dragStartX, initialOffset, scaleX, onBarUpdate, item.mainBars, item.length, newBar, onNewBarUpdate]);

  const handleMouseUp = () => {
    setDraggingBarIdx(null);
  };

  // Filter bars
  const topBars = item.mainBars.flatMap((b, idx) => ({ ...b, originalIdx: idx })).filter(b => b.placement === 'top');
  const bottomBars = item.mainBars.flatMap((b, idx) => ({ ...b, originalIdx: idx })).filter(b => b.placement === 'bottom' || !b.placement);
  const sideBars = item.mainBars.flatMap((b, idx) => ({ ...b, originalIdx: idx })).filter(b => b.placement === 'distributed');
  const centerBars = item.mainBars.flatMap((b, idx) => ({ ...b, originalIdx: idx })).filter(b => b.placement === 'center');

  // Stirrups
  const spacing = item.stirrupSpacing || 20;
  const numStirrups = Math.floor(effectiveLengthCm / spacing);
  const visualStep = numStirrups > 40 ? Math.ceil(numStirrups / 40) : 1;
  const stirrupData: { x: number; stirrupIdx: number; stirrupCm: number }[] = [];
  for (let i = 0; i <= numStirrups; i += visualStep) {
    stirrupData.push({
      x: actualPadX + (i * spacing * scaleX),
      stirrupIdx: i,
      stirrupCm: i * spacing
    });
  }

  const renderInteractableBar = (group: MainBarGroup & { originalIdx: number }, yBase: number, isTop: boolean) => {
    const baseLenCm = (typeof group.segmentA === 'number') ? group.segmentA : Math.round(group.usage.includes('Largura') ? (item.width || 0) * 100 : item.length * 100);

    // Calculate start X based on offset - using scope scaleX
    const offsetCm = group.offset || 0;
    const startX = actualPadX + (offsetCm * scaleX);
    const pxLen = baseLenCm * scaleX;

    // Total Length Calculation (C)
    const extraCm = (group.segmentB || (group.hookStartType !== 'none' ? group.hookStart : 0)) +
      (group.segmentC || (group.hookEndType !== 'none' ? group.hookEnd : 0)) +
      (group.segmentD || 0) +
      (group.segmentE || 0);
    const C = Math.round(baseLenCm + extraCm);

    const hookStart = group.segmentB || (group.hookStartType !== 'none' ? group.hookStart : 0);
    const hookEnd = group.segmentC || (group.hookEndType !== 'none' ? group.hookEnd : 0);

    const hookH = 15;
    const inwardH = 12;
    const isCShape = group.shape?.startsWith('c_');
    const isBeingDragged = draggingBarIdx === group.originalIdx;
    const isSelected = selectedIdx === group.originalIdx;

    let d = "";
    // Start Hook
    if (group.hookStartType === 'up') {
      if (isCShape && group.segmentD) {
        d = `M ${startX + inwardH},${yBase - hookH} L ${startX},${yBase - hookH} L ${startX},${yBase} `;
      } else {
        d = `M ${startX},${yBase - hookH} L ${startX},${yBase} `;
      }
    } else if (group.hookStartType === 'down') {
      if (isCShape && group.segmentD) {
        d = `M ${startX + inwardH},${yBase + hookH} L ${startX},${yBase + hookH} L ${startX},${yBase} `;
      } else {
        d = `M ${startX},${yBase + hookH} L ${startX},${yBase} `;
      }
    } else {
      d = `M ${startX},${yBase} `;
    }

    // Span
    d += `L ${startX + pxLen},${yBase} `;

    // End Hook
    if (group.hookEndType === 'up') {
      d += `L ${startX + pxLen},${yBase - hookH}`;
      if (isCShape && group.segmentE) d += ` L ${startX + pxLen - inwardH},${yBase - hookH}`;
    } else if (group.hookEndType === 'down') {
      d += `L ${startX + pxLen},${yBase + hookH}`;
      if (isCShape && group.segmentE) d += ` L ${startX + pxLen - inwardH},${yBase + hookH}`;
    }

    const isNew = (group.originalIdx as any) === 'new';
    const displayPos = group.position || (isNew ? "Novo" : `N${group.originalIdx + 1}`);
    const label = `${group.count} ${displayPos} ø${group.gauge} C=${C}`;

    return (
      <g
        key={group.originalIdx}
        className={readOnly ? "" : `cursor-grab ${isBeingDragged ? 'cursor-grabbing opacity-100 scale-[1.01]' : 'group hover:opacity-80'}`}
        onMouseDown={(e) => handleMouseDown(e, group.originalIdx, offsetCm)}
        onClick={(e) => {
          e.stopPropagation();
          if (!readOnly && !isDragging && draggingBarIdx === null) onEditBar(group.originalIdx);
        }}
      >
        {/* Invisible Hit Area for easier clicking - Larger when dragging */}
        <rect x={startX - 20} y={yBase - 20} width={pxLen + 40} height={40} fill="transparent" />

        {/* Selected Highlight Aura */}
        {isSelected && (
          <rect
            x={startX - 5} y={yBase - 15}
            width={pxLen + 10} height={30}
            fill="none" stroke="#6366f1" strokeWidth="2"
            rx="5" className="animate-pulse"
            strokeDasharray="4 2"
          />
        )}

        {/* The Bar Line - Highlight if dragged or selected */}
        <path
          d={d}
          fill="none"
          stroke={isBeingDragged || isSelected ? "#3b82f6" : (isTop ? "#ef4444" : "#0f172a")}
          strokeWidth={isBeingDragged || isSelected ? 5 : 3}
          className="transition-all shadow-sm"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Info Box / Label */}
        {/* Info Box / Label (Converted to SVG Text for precision) */}
        <text
          x={startX + pxLen / 2}
          y={yBase + 2}
          textAnchor="middle"
          dominantBaseline="hanging"
          className={`text-[11px] font-black uppercase tracking-tight transition-all select-none ${isSelected ? 'fill-indigo-600 scale-110' : (readOnly ? 'fill-slate-800' : 'fill-indigo-800 group-hover:fill-amber-800 group-hover:scale-110')}`}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          {label}
        </text>

        {/* Dimension Labels (Hooks) */}
        {hookStart > 0 && <text x={startX - 10} y={yBase} textAnchor="end" fontSize="11" fontWeight="900" fill="#475569" dominantBaseline="middle">{hookStart}</text>}
        {hookEnd > 0 && <text x={startX + pxLen + 10} y={yBase} textAnchor="start" fontSize="11" fontWeight="900" fill="#475569" dominantBaseline="middle">{hookEnd}</text>}

        {/* Length Label (Middle) */}
        <text x={startX + pxLen / 2} y={yBase - 3} textAnchor="middle" fontSize="11" fontWeight="900" fill="#64748b" className="select-none">{Math.round(baseLenCm)}cm</text>

        {!readOnly && (
          <g className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onRemoveBar(group.originalIdx); }}>
            <circle cx={startX + pxLen + 35} cy={yBase} r={10} fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
            <path d={`M${startX + pxLen + 31},${yBase - 4} L${startX + pxLen + 39},${yBase + 4} M${startX + pxLen + 39},${yBase - 4} L${startX + pxLen + 31},${yBase + 4}`} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-200 shadow-xl flex flex-col items-center w-full mx-auto overflow-hidden relative" style={{ width: '100%' }}>
      <div className="flex justify-between w-full mb-6 px-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-indigo-500 rounded-full" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Detalhamento Long. Profissional</span>
        </div>
        <div className="flex gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" /> Superior
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-800" /> Inferior
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-auto drop-shadow-sm select-none"
      >

        <defs>
          <pattern id="technicalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
          <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: '#475569', strokeWidth: 1 }} opacity="0.1" />
          </pattern>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#technicalGrid)" rx="32" />

        {/* Element Name/Identifier (Top Left) */}
        <g transform="translate(30, 40)">
          <text fontSize="28" fontWeight="900" fill="#0f172a" fontFamily="Arial, sans-serif">
            {item.observation || item.type}
          </text>
          <text y="20" fontSize="12" fill="#64748b" fontWeight="bold">ESC 1:50</text>
        </g>

        {/* Top (Negative) Reinforcement Stack */}
        {topBars.map((b, i) => {
          // Stack upwards from beam top
          const y = beamTopY - 40 - (i * 35);
          return renderInteractableBar(b, y, true);
        })}

        {/* Beam Body / Stirrups */}
        <g>
          {/* Concrete body based on strict length (visualizes discrepancies) */}
          <rect x={actualPadX} y={beamTopY} width={(item.length * 100) * scaleX} height={50} fill="url(#diagonalHatch)" stroke="#0f172a" strokeWidth="2" rx="4" />
          {/* Stirrup Lines - Skip support zones */}
          {stirrupData.map((stirrup, idx) => {
            // Check if this stirrup position falls within a gap zone
            const stirrupCm = stirrup.stirrupCm;
            const supports = item.supports || [];
            const startGap = item.startGap || 0;
            const endGap = item.endGap || 0;
            const beamLen = effectiveLengthCm;

            // Skip if in start gap
            if (stirrupCm < startGap) return null;

            // Skip if in end gap
            if (stirrupCm > beamLen - endGap) return null;

            // Skip if in any support gap zone (left or right of support)
            const inSupportGap = supports.some(s => {
              const leftBound = s.position - (s.leftGap || 0);
              const rightBound = s.position + (s.rightGap || 0);
              return stirrupCm >= leftBound && stirrupCm <= rightBound;
            });
            if (inSupportGap) return null;

            return (
              <line key={idx} x1={stirrup.x} y1={beamTopY} x2={stirrup.x} y2={beamTopY + 50} stroke="#0f172a" strokeWidth="1" strokeOpacity="0.3" />
            );
          })}
          {/* Axis Line */}
          <line x1={actualPadX - 10} y1={beamTopY + 25} x2={actualPadX + totalWidthPx + 10} y2={beamTopY + 25} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
        </g>

        {/* Support Markers and Gap Lines */}
        <g>
          {/* === PINK LINES: Beam Extremities === */}
          <line x1={actualPadX} y1={beamTopY - 30} x2={actualPadX} y2={beamBotY + 30} stroke="#db2777" strokeWidth="2" />
          <line x1={actualPadX + totalWidthPx} y1={beamTopY - 30} x2={actualPadX + totalWidthPx} y2={beamBotY + 30} stroke="#db2777" strokeWidth="2" />

          {/* === BLUE LINES: Gap Boundaries (Start/End of stirrup zones) === */}
          {/* Start Gap */}
          {(item.startGap || 0) > 0 && (
            <line
              x1={actualPadX + (item.startGap || 0) * scaleX}
              y1={beamTopY - 20}
              x2={actualPadX + (item.startGap || 0) * scaleX}
              y2={beamBotY + 20}
              stroke="#2563eb"
              strokeWidth="1.5"
            />
          )}
          {/* End Gap */}
          {(item.endGap || 0) > 0 && (
            <line
              x1={actualPadX + totalWidthPx - (item.endGap || 0) * scaleX}
              y1={beamTopY - 20}
              x2={actualPadX + totalWidthPx - (item.endGap || 0) * scaleX}
              y2={beamBotY + 20}
              stroke="#2563eb"
              strokeWidth="1.5"
            />
          )}

          {/* Intermediate Supports with Left/Right Gap Lines */}
          {(item.supports || []).map((support, idx) => {
            const supportX = actualPadX + (support.position * scaleX);
            const leftGapPx = ((support.leftGap || 0)) * scaleX;
            const rightGapPx = ((support.rightGap || 0)) * scaleX;

            return (
              <g key={idx}>
                {/* PINK: Central Support Line */}
                <line x1={supportX} y1={beamTopY - 30} x2={supportX} y2={beamBotY + 30} stroke="#db2777" strokeWidth="2" />

                {/* BLUE: Left Gap Boundary */}
                <line
                  x1={supportX - leftGapPx}
                  y1={beamTopY - 20}
                  x2={supportX - leftGapPx}
                  y2={beamBotY + 20}
                  stroke="#2563eb"
                  strokeWidth="1.5"
                />

                {/* BLUE: Right Gap Boundary */}
                <line
                  x1={supportX + rightGapPx}
                  y1={beamTopY - 20}
                  x2={supportX + rightGapPx}
                  y2={beamBotY + 20}
                  stroke="#2563eb"
                  strokeWidth="1.5"
                />

                {/* Support Label */}
                <text x={supportX} y={beamBotY + 50} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#db2777">
                  {support.label || `P${idx + 1}`}
                </text>
              </g>
            );
          })}

          {/* === DIMENSION ANNOTATIONS === */}
          {(() => {
            const annotations: React.ReactNode[] = [];
            const dimY = beamBotY + 60; // Y position for dimension line (right below beam)
            const supports = item.supports || [];
            const sortedSupports = [...supports].sort((a, b) => a.position - b.position);
            const beamLen = effectiveLengthCm;

            // Build spans from supports
            let currentPos = 0;

            // Start Gap
            const startGap = item.startGap || 0;
            if (startGap > 0) {
              const x1 = actualPadX;
              const x2 = actualPadX + startGap * scaleX;
              annotations.push(
                <g key="start-gap">
                  <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#64748b" strokeWidth="0.5" />
                  <text x={(x1 + x2) / 2} y={dimY + 12} textAnchor="middle" fontSize="10" fill="#64748b">{startGap}</text>
                </g>
              );
              currentPos = startGap;
            }

            // Process each support
            sortedSupports.forEach((support, idx) => {
              const leftGap = support.leftGap || 0;
              const rightGap = support.rightGap || 0;
              const stirrupZoneEnd = support.position - leftGap;
              const stirrupZoneStart = currentPos;
              const stirrupZoneLen = stirrupZoneEnd - stirrupZoneStart;

              if (stirrupZoneLen > 0) {
                // Stirrup zone dimension
                const x1 = actualPadX + stirrupZoneStart * scaleX;
                const x2 = actualPadX + stirrupZoneEnd * scaleX;
                const stirrupCount = Math.floor(stirrupZoneLen / spacing);

                annotations.push(
                  <g key={`zone-${idx}`}>
                    <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#0f172a" strokeWidth="1" />
                    <line x1={x1} y1={dimY - 3} x2={x1} y2={dimY + 3} stroke="#0f172a" strokeWidth="1" />
                    <line x1={x2} y1={dimY - 3} x2={x2} y2={dimY + 3} stroke="#0f172a" strokeWidth="1" />
                    <text x={(x1 + x2) / 2} y={dimY + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(stirrupZoneLen)}</text>
                    <text x={(x1 + x2) / 2} y={dimY + 24} textAnchor="middle" fontSize="9" fill="#64748b">{stirrupCount} {item.stirrupPosition || 'N2'} c/{spacing}</text>
                  </g>
                );
              }

              // Left gap of support
              if (leftGap > 0) {
                const gx1 = actualPadX + (support.position - leftGap) * scaleX;
                const gx2 = actualPadX + support.position * scaleX;
                annotations.push(
                  <g key={`lgap-${idx}`}>
                    <line x1={gx1} y1={dimY} x2={gx2} y2={dimY} stroke="#2563eb" strokeWidth="0.5" />
                    <text x={(gx1 + gx2) / 2} y={dimY + 12} textAnchor="middle" fontSize="9" fill="#2563eb">{leftGap}</text>
                  </g>
                );
              }

              // Right gap of support
              if (rightGap > 0) {
                const gx1 = actualPadX + support.position * scaleX;
                const gx2 = actualPadX + (support.position + rightGap) * scaleX;
                annotations.push(
                  <g key={`rgap-${idx}`}>
                    <line x1={gx1} y1={dimY} x2={gx2} y2={dimY} stroke="#2563eb" strokeWidth="0.5" />
                    <text x={(gx1 + gx2) / 2} y={dimY + 12} textAnchor="middle" fontSize="9" fill="#2563eb">{rightGap}</text>
                  </g>
                );
              }

              currentPos = support.position + rightGap;
            });

            // Last span (after last support to end of beam)
            const endGap = item.endGap || 0;
            const lastStirrupZoneEnd = beamLen - endGap;
            const lastStirrupZoneLen = lastStirrupZoneEnd - currentPos;

            if (lastStirrupZoneLen > 0) {
              const x1 = actualPadX + currentPos * scaleX;
              const x2 = actualPadX + lastStirrupZoneEnd * scaleX;
              const stirrupCount = Math.floor(lastStirrupZoneLen / spacing);

              annotations.push(
                <g key="last-zone">
                  <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#0f172a" strokeWidth="1" />
                  <line x1={x1} y1={dimY - 3} x2={x1} y2={dimY + 3} stroke="#0f172a" strokeWidth="1" />
                  <line x1={x2} y1={dimY - 3} x2={x2} y2={dimY + 3} stroke="#0f172a" strokeWidth="1" />
                  <text x={(x1 + x2) / 2} y={dimY + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(lastStirrupZoneLen)}</text>
                  <text x={(x1 + x2) / 2} y={dimY + 24} textAnchor="middle" fontSize="9" fill="#64748b">{stirrupCount} {item.stirrupPosition || 'N2'} c/{spacing}</text>
                </g>
              );
            }

            // End Gap
            if (endGap > 0) {
              const x1 = actualPadX + totalWidthPx - endGap * scaleX;
              const x2 = actualPadX + totalWidthPx;
              annotations.push(
                <g key="end-gap">
                  <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke="#64748b" strokeWidth="0.5" />
                  <text x={(x1 + x2) / 2} y={dimY + 12} textAnchor="middle" fontSize="10" fill="#64748b">{endGap}</text>
                </g>
              );
            }

            return annotations;
          })()}
        </g>

        {/* Bottom (Positive) Reinforcement Stack */}
        {bottomBars.map((b, i) => {
          const y = beamBotY + 110 + (i * 35);
          return renderInteractableBar(b, y, false);
        })}

        {/* Center (Interior) Reinforcement Stack */}
        {centerBars.map((b, i) => {
          const y = beamBotY + 110 + (bottomBars.length * 35) + 20 + (i * 35);
          return renderInteractableBar(b, y, false);
        })}

        {/* Side (Distributed) Reinforcement Stack */}
        {sideBars.map((b, i) => {
          const y = beamBotY + 110 + (bottomBars.length * 35) + 20 + (centerBars.length * 35) + 20 + (i * 35);
          return renderInteractableBar(b, y, false);
        })}

        {/* Ruler Removed as requested */}

        {/* Draft Bar (New Bar being added) */}
        {newBar && selectedIdx === undefined && (newBar.segmentA || 0) > 0 && (
          <g opacity="0.6" strokeDasharray="5 2">
            {renderInteractableBar({ ...newBar, originalIdx: 'new' as any } as any, beamBotY + 220, false)}
          </g>
        )}

        {/* Stirrup Callout */}
        <TechnicalDimension
          x1={actualPadX} y1={beamBotY + 15}
          x2={actualPadX + totalWidthPx} y2={beamBotY + 15}
          text={`${Math.floor(numStirrups)} ${item.stirrupPosition || 'EST'} c/${spacing}`}
          offset={0}
        />

        {/* Pattern Definition for Concrete Hatch */}
        <defs>
          <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
        </defs>

        {/* SEÇÃO A-A - Dynamic & Positioned after content */}
        <g transform={`translate(${Math.max(actualPadX + totalWidthPx + 60, viewW - 200)}, 40)`}>


          {/* Title Group */}
          <g transform="translate(80, 25)">
            <text textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a" textDecoration="underline">SEÇÃO</text>
            <text y="16" textAnchor="middle" fontSize="11" fill="#64748b">ESC 1:25</text>
          </g>

          {/* Main Cross Section Drawing (Dynamic Scale) */}
          <g transform="translate(40, 60)">
            {(() => {
              // Ensure we have numbers
              const valW = Number(item.stirrupWidth);
              const valH = Number(item.stirrupHeight);
              const sW = (!isNaN(valW) && valW > 0) ? valW : 20;
              const sH = (!isNaN(valH) && valH > 0) ? valH : 40;
              const model = item.stirrupModel || 'rect';

              const coverCm = 4; // Reduced cover visualization to 2cm/side for better proportion
              const concreteW = sW + coverCm;
              const concreteH = (model === 'circle' ? sW : sH) + coverCm; // Height depends on model
              const scale = Math.min(100 / concreteW, 140 / concreteH);
              const pW = concreteW * scale;
              const pH = concreteH * scale;

              // Adjust coverPx calculation to match scale but visual needs
              const coverPx = (coverCm / 2) * scale;
              const stirrupOffset = coverPx; // Align inner path with cover

              // --- Generate Shape Paths ---
              let pathOuter = "";
              let pathInner = "";

              if (model === 'rect') {
                pathOuter = `M0,0 L${pW},0 L${pW},${pH} L0,${pH} Z`;
                pathInner = `M${stirrupOffset},${stirrupOffset} L${pW - stirrupOffset},${stirrupOffset} L${pW - stirrupOffset},${pH - stirrupOffset} L${stirrupOffset},${pH - stirrupOffset} Z`;
              } else if (model === 'circle') {
                // Circle handled conditionally
              } else if (model === 'triangle') {
                pathOuter = `M${pW / 2},0 L${pW},${pH} L0,${pH} Z`;
                pathInner = `M${pW / 2},${stirrupOffset * 1.5} L${pW - stirrupOffset},${pH - stirrupOffset} L${stirrupOffset},${pH - stirrupOffset} Z`;
              } else if (model === 'pentagon') {
                pathOuter = `M${pW / 2},0 L${pW},${pH * 0.38} L${pW * 0.81},${pH} L${pW * 0.19},${pH} L0,${pH * 0.38} Z`;
                pathInner = `M${pW / 2},${stirrupOffset} L${pW - stirrupOffset},${pH * 0.38} L${pW * 0.81 - stirrupOffset / 2},${pH - stirrupOffset} L${pW * 0.19 + stirrupOffset / 2},${pH - stirrupOffset} L${stirrupOffset},${pH * 0.38} Z`;
              } else if (model === 'hexagon') {
                pathOuter = `M${pW * 0.25},0 L${pW * 0.75},0 L${pW},${pH / 2} L${pW * 0.75},${pH} L${pW * 0.25},${pH} L0,${pH / 2} Z`;
                pathInner = `M${pW * 0.25 + stirrupOffset / 2},${stirrupOffset} L${pW * 0.75 - stirrupOffset / 2},${stirrupOffset} L${pW - stirrupOffset},${pH / 2} L${pW * 0.75 - stirrupOffset / 2},${pH - stirrupOffset} L${pW * 0.25 + stirrupOffset / 2},${pH - stirrupOffset} L${stirrupOffset},${pH / 2} Z`;
              }

              return (
                <g>
                  {/* Dimensions - Left (Height) */}
                  {model !== 'circle' && (
                    <g transform="translate(-15, 0)">
                      <line x1={8} y1={0} x2={8} y2={pH} stroke="#000" strokeWidth="0.5" />
                      <line x1={5} y1={0} x2={11} y2={0} stroke="#000" strokeWidth="0.5" />
                      <line x1={5} y1={pH} x2={11} y2={pH} stroke="#000" strokeWidth="0.5" />
                      <text x={0} y={pH / 2} textAnchor="end" dominantBaseline="middle" fontSize="12" fontWeight="bold" transform={`rotate(-90, 0, ${pH / 2})`}>{Math.round(concreteH)}</text>
                    </g>
                  )}

                  {/* Visual Concrete Shape */}
                  {model === 'circle' ? (
                    <circle cx={pW / 2} cy={pH / 2} r={pW / 2} fill="#f1f5f9" stroke="none" />
                  ) : (
                    <path d={pathOuter} fill="#f1f5f9" stroke="none" />
                  )}

                  {/* Outer Border (Dark Slate - Match Column) */}
                  {model === 'circle' ? (
                    <circle cx={pW / 2} cy={pH / 2} r={pW / 2} fill="none" stroke="#0f172a" strokeWidth="2" />
                  ) : (
                    <path d={pathOuter} fill="none" stroke="#0f172a" strokeWidth="2" />
                  )}

                  {/* Inner Stirrup (Dark Slate - Match Column) */}
                  {model === 'circle' ? (
                    <circle cx={pW / 2} cy={pH / 2} r={(pW / 2) - coverPx} fill="none" stroke="#0f172a" strokeWidth="1.5" />
                  ) : (
                    <path d={pathInner} fill="none" stroke="#0f172a" strokeWidth="1.5" />
                  )}

                  {/* Hook Cross - Only for Rect roughly, or simplified */}
                  {model === 'rect' && (
                    <>
                      <line x1={coverPx + 2} y1={coverPx + 6} x2={coverPx + 10} y2={coverPx + 6} stroke="#0f172a" strokeWidth="1.5" />
                      <line x1={coverPx + 6} y1={coverPx + 2} x2={coverPx + 6} y2={coverPx + 10} stroke="#0f172a" strokeWidth="1.5" />
                    </>
                  )}

                  {/* Dimensions - Bottom (Width) */}
                  <g transform={`translate(0, ${pH + 12})`}>
                    <line x1={0} y1={8} x2={pW} y2={8} stroke="#000" strokeWidth="0.5" />
                    <line x1={0} y1={5} x2={0} y2={11} stroke="#000" strokeWidth="0.5" />
                    <line x1={pW} y1={5} x2={pW} y2={11} stroke="#000" strokeWidth="0.5" />
                    <text x={pW / 2} y={20} textAnchor="middle" fontSize="12" fontWeight="bold">{Math.round(concreteW)}</text>
                  </g>

                  {/* NEW: DETACHED STIRRUP (Estribo Avulso) - Scaled for Visibility */}
                  {item.hasStirrups && (() => {
                    const numStirrups = Math.ceil(((item.length * 100) / (item.stirrupSpacing || 20)));
                    const sW_val = Math.round(item.stirrupWidth || sW);
                    const sH_val = Math.round(item.stirrupHeight || sH);
                    const model = item.stirrupModel || 'rect';

                    // Scale drawing to be ~60px visually
                    const targetSize = 60;
                    const scale = targetSize / Math.max(sW_val, sH_val);
                    const dW = sW_val * scale;
                    const dH = sH_val * scale;

                    const cx = dW / 2;
                    const cy = dH / 2;

                    const offsetY = pH + 60;
                    let hooksNode = null;
                    let cutLength = 0;
                    let shapeNode = null;
                    let dimensionNode = null;

                    if (model === 'rect') {
                      cutLength = (sW_val + sH_val) * 2 + 10;
                      shapeNode = <rect x={0} y={0} width={dW} height={dH} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                      dimensionNode = (
                        <>
                          <text x={dW / 2} y={-5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                          <text x={dW / 2} y={dH + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                          <text x={-5} y={dH / 2} textAnchor="end" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH_val}</text>
                          <text x={dW + 5} y={dH / 2} textAnchor="start" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH_val}</text>
                        </>
                      );
                      const hookGap = 3;
                      const hookLen = 8;
                      hooksNode = (
                        <g transform="translate(0, 0)">
                          <line x1={hookGap} y1={0} x2={hookGap + hookLen} y2={hookLen} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={0} y1={hookGap} x2={hookLen} y2={hookGap + hookLen} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      );
                    } else if (model === 'circle') {
                      cutLength = Math.round(sW_val * Math.PI + 10);
                      const r = dW / 2;
                      shapeNode = <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                      dimensionNode = <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#0f172a">Ø{sW_val}</text>;
                      hooksNode = (
                        <g transform={`translate(${cx}, ${cy - r})`}>
                          <path d="M-4,2 Q0,8 4,2" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={-2} y1={0} x2={-2} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={2} y1={0} x2={2} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      );
                    } else if (model === 'triangle') {
                      const side = Math.round(Math.sqrt(Math.pow(sW_val / 2, 2) + Math.pow(sH_val, 2)));
                      cutLength = Math.round(sW_val + 2 * side + 10);
                      shapeNode = <polygon points={`0,${dH} ${dW},${dH} ${cx},0`} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                      dimensionNode = (
                        <>
                          <text x={cx} y={dH + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                          <text x={dW * 0.75 + 6} y={dH / 2} textAnchor="start" fontSize="10" fontWeight="bold" fill="#0f172a">{side}</text>
                          <text x={dW * 0.25 - 6} y={dH / 2} textAnchor="end" fontSize="10" fontWeight="bold" fill="#0f172a">{side}</text>
                        </>
                      );
                      hooksNode = (
                        <g transform={`translate(${cx}, 0)`}>
                          <line x1={-2} y1={2} x2={-6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={2} y1={2} x2={6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      );
                    } else if (model === 'pentagon') {
                      const v = [
                        { x: cx, y: 0 },
                        { x: dW, y: dH * 0.38 },
                        { x: dW * 0.81, y: dH },
                        { x: dW * 0.19, y: dH },
                        { x: 0, y: dH * 0.38 }
                      ];
                      const distReal = (p1: any, p2: any) => Math.round(Math.sqrt(Math.pow((p2.x - p1.x) / scale, 2) + Math.pow((p2.y - p1.y) / scale, 2)));
                      const s1 = distReal(v[0], v[1]);
                      const s2 = distReal(v[1], v[2]);
                      const s3 = distReal(v[2], v[3]);
                      const s4 = distReal(v[3], v[4]);
                      const s5 = distReal(v[4], v[0]);
                      cutLength = s1 + s2 + s3 + s4 + s5 + 10;
                      const pointsStr = v.map(p => `${p.x},${p.y}`).join(' ');
                      shapeNode = <polygon points={pointsStr} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                      dimensionNode = (
                        <>
                          <text x={dW * 0.8 + 8} y={dH * 0.2} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s1}</text>
                          <text x={dW + 4} y={dH * 0.7} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s2}</text>
                          <text x={cx} y={dH + 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s3}</text>
                          <text x={-4} y={dH * 0.7} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s4}</text>
                          <text x={dW * 0.2 - 8} y={dH * 0.2} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s5}</text>
                        </>
                      );
                      hooksNode = (
                        <g transform={`translate(${cx}, 0)`}>
                          <line x1={-2} y1={3} x2={-6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={2} y1={3} x2={6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      );
                    } else if (model === 'hexagon') {
                      const v = [
                        { x: dW * 0.25, y: 0 },
                        { x: dW * 0.75, y: 0 },
                        { x: dW, y: dH / 2 },
                        { x: dW * 0.75, y: dH },
                        { x: dW * 0.25, y: dH },
                        { x: 0, y: dH / 2 }
                      ];
                      const distReal = (p1: any, p2: any) => Math.round(Math.pow(Math.pow((p2.x - p1.x) / scale, 2) + Math.pow((p2.y - p1.y) / scale, 2), 0.5));
                      const s1 = distReal(v[0], v[1]);
                      const s2 = distReal(v[1], v[2]);
                      const s3 = distReal(v[2], v[3]);
                      const s4 = distReal(v[3], v[4]);
                      const s5 = distReal(v[4], v[5]);
                      const s6 = distReal(v[5], v[0]);
                      cutLength = s1 + s2 + s3 + s4 + s5 + s6 + 10;
                      const pointsStr = v.map(p => `${p.x},${p.y}`).join(' ');
                      shapeNode = <polygon points={pointsStr} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                      dimensionNode = (
                        <>
                          <text x={cx} y={-4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s1}</text>
                          <text x={dW + 4} y={dH * 0.25} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s2}</text>
                          <text x={dW + 4} y={dH * 0.75} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s3}</text>
                          <text x={cx} y={dH + 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s4}</text>
                          <text x={-4} y={dH * 0.75} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s5}</text>
                          <text x={-4} y={dH * 0.25} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s6}</text>
                        </>
                      );
                      const pA = v[5];
                      const pB = v[0];
                      const hx = pA.x + (pB.x - pA.x) * 0.85;
                      const hy = pA.y + (pB.y - pA.y) * 0.85;
                      hooksNode = (
                        <g transform={`translate(${hx}, ${hy})`}>
                          <line x1={-3} y1={2} x2={0} y2={8} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1={1} y1={0} x2={4} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        </g>
                      );
                    }

                    return (
                      <g transform={`translate(${pW / 2 - dW / 2}, ${offsetY})`}>
                        {shapeNode}
                        {hooksNode}
                        {dimensionNode}

                        {/* Summary Text Below */}
                        <text x={dW / 2} y={dH + 35} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
                          {numStirrups} {item.stirrupPosition || 'N2'} ø{item.stirrupGauge} C={cutLength}
                        </text>
                        {/* Formula text removed as requested */}
                      </g>
                    );
                  })()}

                  {/* Bars Punctuation - Reflects actual bars using Precise Point Indices */}
                  {(() => {
                    const gridPts = getStirrupGridPoints(pW, pH, model);
                    const preciseCircles: React.ReactNode[] = [];
                    let hasPointIndices = false;

                    item.mainBars.forEach((bar, bIdx) => {
                      if (bar.pointIndices && bar.pointIndices.length > 0) {
                        hasPointIndices = true;
                        bar.pointIndices.forEach((ptIdx, i) => {
                          const pt = gridPts.find(p => p.id === ptIdx);
                          if (pt) {
                            preciseCircles.push(<circle key={`pb-${bIdx}-${i}`} cx={pt.x} cy={pt.y} r={3.5} fill="#0f172a" />);
                          }
                        });
                      }
                    });

                    if (hasPointIndices) return preciseCircles;

                    // Fallback Logic
                    const barMargin = coverPx + 4;
                    const barAreaW = pW - barMargin * 2;
                    const barAreaH = pH - barMargin * 2;
                    const circles: React.ReactNode[] = [];

                    // Top bars
                    const topBars = item.mainBars.filter(b => b.placement === 'top');
                    const topCount = topBars.reduce((sum, b) => sum + b.count, 0);
                    if (topCount > 0) {
                      Array.from({ length: topCount }).forEach((_, i) => {
                        const cx = barMargin + (topCount > 1 ? i * (barAreaW / (topCount - 1)) : barAreaW / 2);
                        circles.push(<circle key={`t${i}`} cx={cx} cy={coverPx + 4} r={3.5} fill="#0f172a" />);
                      });
                    }

                    // Bottom bars
                    const botBars = item.mainBars.filter(b => b.placement === 'bottom' || !b.placement);
                    const botCount = botBars.reduce((sum, b) => sum + b.count, 0);
                    if (botCount > 0) {
                      Array.from({ length: botCount }).forEach((_, i) => {
                        const cx = barMargin + (botCount > 1 ? i * (barAreaW / (botCount - 1)) : barAreaW / 2);
                        circles.push(<circle key={`b${i}`} cx={cx} cy={pH - coverPx - 4} r={3.5} fill="#0f172a" />);
                      });
                    }

                    // Side/Distributed bars
                    const sideBars = item.mainBars.filter(b => b.placement === 'distributed');
                    const sideCount = sideBars.reduce((sum, b) => sum + b.count, 0);
                    if (sideCount > 0) {
                      const perSide = Math.ceil(sideCount / 2);
                      Array.from({ length: perSide }).forEach((_, i) => {
                        const cy = barMargin + (perSide > 1 ? i * (barAreaH / (perSide - 1)) : barAreaH / 2);
                        circles.push(<circle key={`sl${i}`} cx={coverPx + 4} cy={cy} r={3.5} fill="#0f172a" />);
                      });
                      const rightCount = sideCount - perSide;
                      Array.from({ length: rightCount }).forEach((_, i) => {
                        const cy = barMargin + (rightCount > 1 ? i * (barAreaH / (rightCount - 1)) : barAreaH / 2);
                        circles.push(<circle key={`sr${i}`} cx={pW - coverPx - 4} cy={cy} r={3.5} fill="#0f172a" />);
                      });
                    }

                    // Center bars
                    const centerBars = item.mainBars.filter(b => b.placement === 'center');
                    const centerCount = centerBars.reduce((sum, b) => sum + b.count, 0);
                    if (centerCount > 0) {
                      Array.from({ length: centerCount }).forEach((_, i) => {
                        const cx = barMargin + (centerCount > 1 ? i * (barAreaW / (centerCount - 1)) : barAreaW / 2);
                        circles.push(<circle key={`c${i}`} cx={cx} cy={pH / 2} r={3.5} fill="#0f172a" />);
                      });
                    }

                    return circles;
                  })()}
                </g>
              );
            })()}
          </g>
        </g>
      </svg>
      <div className="absolute top-4 right-4 bg-slate-100 rounded-full px-3 py-1 text-[10px] font-bold text-slate-500">
        Clique nas barras para editar
      </div>
    </div>
  );
};

// Nova Visualização Vertical para Pilares e Brocas
const ColumnElevationView: React.FC<{
  item: SteelItem;
  onEditBar: (idx: number) => void;
  onRemoveBar: (idx: number) => void;
  onBarUpdate?: (idx: number, newOffset: number) => void;
  newBar?: MainBarGroup; // Current draft bar
  onNewBarUpdate?: (newOffset: number) => void;
  selectedIdx?: number;
  readOnly?: boolean;
}> = ({ item, onEditBar, onRemoveBar, onBarUpdate, newBar, onNewBarUpdate, selectedIdx, readOnly }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const viewW = 600;

  // Dynamic Scaling Logic -----------------------------------------
  // Fixed scale avoids stretching small columns into huge vertical space
  const scaleY = 1.3; // Significantly reduced scale for compact cards
  const padY = 40;

  // Calculate effective length (vertical height) immediately
  const isItemValid = item && (typeof item.length === 'number') && item.length > 0;
  const barsForLayout = [...item.mainBars];
  if (newBar) barsForLayout.push(newBar);
  const baseLen = (item.length || 1) * 100;

  // Determine max extent of bars (auto-expand logic)
  const maxBarExtent = barsForLayout.reduce((max, bar) => {
    const barOffset = bar.offset || 0;
    const barLen = bar.segmentA || 0;
    return Math.max(max, barOffset + barLen);
  }, baseLen);

  const effectiveLengthCm = Math.max(baseLen, maxBarExtent);

  // Dynamic View Height based on actual content
  const drawingH = effectiveLengthCm * scaleY;
  const stirrupSectionH = 30; // Minimized buffer (was 120)
  const viewH = padY + drawingH + stirrupSectionH + padY;
  // ---------------------------------------------------------------

  const [draggingBarIdx, setDraggingBarIdx] = useState<number | 'new' | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [initialOffset, setInitialOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Layout Constants
  const outputScale = 1;

  // Vertical Scale: map effective length to available height
  // const availableHeightPx = viewH - 2 * padY; // This is no longer needed as viewH is calculated based on scaleY
  // Protect against Division by Zero or NaN
  // const safeLength = (effectiveLengthCm && effectiveLengthCm > 0) ? effectiveLengthCm : 100; // effectiveLengthCm is already safe

  // Calculate layout variables unconditionally (using safe values)
  // const scaleY = Math.min(availableHeightPx / safeLength, 2.5); // scaleY is now fixed
  const totalHeightPx = effectiveLengthCm * scaleY; // Use effectiveLengthCm directly
  const startY = padY; // Start drawing from the top padding
  const endY = startY + totalHeightPx;

  // Final Layout Check Flag
  const isLayoutValid = Number.isFinite(scaleY) && Number.isFinite(startY) && Number.isFinite(endY);

  // Horizontal Positioning (Center column in view)
  const centerX = viewW / 2;
  // Ensure we treat width consistently. item.width is in Meters.
  // Fallback to 0.2m (20cm) if undefined.
  const widthM = (item.width && item.width > 0) ? item.width : 0.2;
  const columnWidthCm = widthM * 100;

  const displayWidthPx = Math.max(columnWidthCm * 3, 120); // Scale width for visibility
  const leftX = centerX - displayWidthPx / 2;
  const rightX = centerX + displayWidthPx / 2;

  const handleMouseDown = (e: React.MouseEvent, idx: number | 'new', currentOffset: number) => {
    if (readOnly) return;
    if (!svgRef.current) return;
    // ... Focus might not be needed and can cause scroll jumps
    // svgRef.current.focus(); 

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    // Safety check for CTM
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;

    const svgPoint = pt.matrixTransform(ctm.inverse());

    e.stopPropagation();
    e.preventDefault();
    setDraggingBarIdx(idx);
    setDragStartY(svgPoint.y); // Track Y for vertical movement
    setInitialOffset(currentOffset);
    setIsDragging(false);
    if (typeof idx === 'number') onEditBar(idx);
  };

  // Effect for Dragging - Removing onBarUpdate from deps to avoid infinite loops if generic function
  useEffect(() => {
    if (draggingBarIdx === null) return;
    // ... (rest of logic same)

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (draggingBarIdx === null || !svgRef.current) return;

      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

      const deltaSVG = svgPoint.y - dragStartY; // Delta Y
      if (Math.abs(deltaSVG) > 2) setIsDragging(true);

      // Invert delta because Y grows downwards, but offset usually means "from bottom"? 
      // Actually standard usually entails offset from start (bottom or top). 
      // Let's assume offset 0 is at the BOTTOM (standard for columns/construction).
      // So moving mouse UP (negative delta) should INCREASE offset (move bar up).
      const deltaCm = -(deltaSVG / scaleY);

      let nextOffset = Math.round(initialOffset + deltaCm);
      const maxPossibleOffset = 2000;
      nextOffset = Math.max(0, Math.min(nextOffset, maxPossibleOffset));

      if (draggingBarIdx === 'new') {
        onNewBarUpdate?.(nextOffset);
      } else {
        onBarUpdate?.(draggingBarIdx, nextOffset);
      }
    };

    const handleWindowMouseUp = () => {
      setDraggingBarIdx(null);
      setTimeout(() => setIsDragging(false), 50);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingBarIdx, dragStartY, initialOffset, scaleY, newBar, onNewBarUpdate, onBarUpdate]); // Removed onBarUpdate to prevent infinite re-renders

  const renderVerticalBar = (group: MainBarGroup & { originalIdx: number }, xPos: number) => {
    const baseLenCm = (typeof group.segmentA === 'number') ? group.segmentA : Math.round(group.usage.includes('Largura') ? columnWidthCm * 100 : item.length * 100);
    const offsetCm = group.offset || 0;

    // Y-Coordinate Logic: 
    // We assume the column base is at `endY` (bottom of visual column).
    // Offset 0 means starting at `endY` and going up.
    const barStartPx = endY - (offsetCm * scaleY);
    const barLenPx = baseLenCm * scaleY;
    const barEndPx = barStartPx - barLenPx; // Top of the bar

    // Total Cut Length
    const extraCm = (group.segmentB || (group.hookStartType !== 'none' ? group.hookStart : 0)) +
      (group.segmentC || (group.hookEndType !== 'none' ? group.hookEnd : 0)) +
      (group.segmentD || 0) + (group.segmentE || 0);
    const C = Math.round(baseLenCm + extraCm);

    // Hook directions
    // In vertical view: 'minus' -> Left (-1), right (1)
    const defaultHookSize = 12;

    // Calculate visual lengths for hooks
    const startLenVal = group.segmentB || (group.hookStartType !== 'none' ? group.hookStart : 0);
    const endLenVal = group.segmentC || (group.hookEndType !== 'none' ? group.hookEnd : 0);

    // Scale for visualization (clamp between 10 and 25 px)
    const visualizeLen = (val: number) => Math.max(10, Math.min(25, val * scaleY));

    const startHookPx = startLenVal > 0 ? visualizeLen(startLenVal) : defaultHookSize;
    const endHookPx = endLenVal > 0 ? visualizeLen(endLenVal) : defaultHookSize;

    const startDir = group.hookStartType === 'down' ? -1 : 1;
    const endDir = group.hookEndType === 'down' ? -1 : 1;

    const isSelected = selectedIdx === group.originalIdx;

    let d = "";
    // Bottom Hook (Start) - Orthogonal 90 deg
    if (group.hookStartType !== 'none' || group.segmentB > 0) {
      d += `M ${xPos + (startDir * startHookPx)},${barStartPx} L ${xPos},${barStartPx} `;
    } else {
      d += `M ${xPos},${barStartPx} `;
    }

    // Main Vertical Span
    d += `L ${xPos},${barEndPx} `;

    // Top Hook (End) - Orthogonal 90 deg
    if (group.hookEndType !== 'none' || group.segmentC > 0) {
      d += `L ${xPos + (endDir * endHookPx)},${barEndPx}`;
    }

    const displayPos = group.position || ((group.originalIdx as any) === 'new' ? "Novo" : `N${group.originalIdx + 1}`);
    const label = `${group.count} ${displayPos} ø${group.gauge} C=${C}`;

    // Place label strictly close to the bar (LEFT side)
    const labelX = xPos - 12;

    return (
      <g
        key={group.originalIdx}
        className={readOnly ? "" : `cursor-grab ${draggingBarIdx !== null ? 'cursor-grabbing' : 'group hover:opacity-80'}`}
        onMouseDown={(e) => handleMouseDown(e, group.originalIdx, offsetCm)}
        onClick={(e) => {
          e.stopPropagation();
          if (!readOnly && draggingBarIdx === null) onEditBar(group.originalIdx);
        }}
      >
        {/* Hit Area */}
        <rect x={xPos - 30} y={barEndPx} width={60} height={barLenPx} fill="transparent" />

        {/* Highlight */}
        {isSelected && (
          <line x1={xPos} y1={barEndPx} x2={xPos} y2={barStartPx} stroke="#6366f1" strokeWidth="8" strokeOpacity="0.3" strokeLinecap="round" />
        )}

        {/* Bar Line */}
        <path d={d} fill="none" stroke={isSelected ? "#3b82f6" : "#0f172a"} strokeWidth={isSelected ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Hook Dimensions Text */}
        {(group.hookStartType !== 'none' || group.segmentB > 0) && (
          <text
            x={xPos + (startDir * startHookPx / 2)}
            y={barStartPx + 15}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#0f172a"
          >
            {Math.round(startLenVal)}
          </text>
        )}
        {(group.hookEndType !== 'none' || group.segmentC > 0) && (
          <text
            x={xPos + (endDir * endHookPx / 2)}
            y={barEndPx - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#0f172a"
          >
            {Math.round(endLenVal)}
          </text>
        )}



        {/* Main Body Dimension Text (Right side) */}
        <text
          x={xPos + 10}
          y={(barStartPx + barEndPx) / 2}
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="#0f172a"
          transform={`rotate(-90, ${xPos + 10}, ${(barStartPx + barEndPx) / 2})`}
        >
          {Math.round(baseLenCm)}
        </text>

        {/* Label (Vertical, LEFT of bar) */}
        <text
          x={labelX}
          y={(barStartPx + barEndPx) / 2}
          textAnchor="middle"
          className={`text-[10px] font-black uppercase tracking-tight select-none ${isSelected ? 'fill-indigo-600' : 'fill-slate-600'}`}
          transform={`rotate(-90, ${labelX}, ${(barStartPx + barEndPx) / 2})`}
        >
          {label}
        </text>

        {!readOnly && (
          <g className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onRemoveBar(group.originalIdx); }}>
            <circle cx={xPos} cy={barEndPx + 30} r={8} fill="#fee2e2" stroke="#ef4444" strokeWidth="1" />
            <path d={`M${xPos - 3},${barEndPx + 27} L${xPos + 3},${barEndPx + 33} M${xPos + 3},${barEndPx + 27} L${xPos - 3},${barEndPx + 33}`} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  };

  // Stirrups logic with visual gaps
  let spacing = item.stirrupSpacing || 20;
  if (spacing <= 0) spacing = 20; // Safety guard against 0/infinite loop

  const startGap = item.startGap || 0;
  const endGap = item.endGap || 0;

  // Calculate total stirrups but filter out those in gaps
  // Safety cap at 500 to prevent browser freeze if length is huge or spacing tiny
  const validLength = (Number.isFinite(effectiveLengthCm) && effectiveLengthCm > 0) ? effectiveLengthCm : 100;
  const maxPossibleStirrups = item.hasStirrups ? Math.min(Math.floor(validLength / spacing), 500) : 0;
  let adjustedStirrupCount = 0;
  const stirrupLines: React.ReactNode[] = [];

  if (item.hasStirrups) {
    for (let i = 0; i <= maxPossibleStirrups; i++) {
      const distFromBottom = i * spacing;

      // Skip if inside bottom gap
      if (distFromBottom < startGap) continue;

      // Skip if inside top gap
      if (distFromBottom > (effectiveLengthCm - endGap)) continue;

      adjustedStirrupCount++;

      const yPlac = endY - (distFromBottom * scaleY);
      stirrupLines.push(
        <g key={`st-${i}`}>
          <line x1={leftX - 5} y1={yPlac} x2={rightX + 5} y2={yPlac} stroke="#1e293b" strokeWidth="2" />
          <line x1={leftX - 5} y1={yPlac} x2={leftX - 5} y2={yPlac + 4} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <line x1={rightX + 5} y1={yPlac} x2={rightX + 5} y2={yPlac + 4} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    }
  }

  // Visual Gap Indicators (Dotted Lines or Zones)
  // Visual Level Indicators (Architectural Style)
  const gapIndicators: React.ReactNode[] = [];

  // Helper for Level Marker (Triangle pointing down)
  const renderLevelMarker = (x: number, y: number, label: string, subLabel?: string) => (
    <g>
      {/* Horizontal Line extending Left */}
      <line x1={x - 80} y1={y} x2={x} y2={y} stroke="#0f172a" strokeWidth="1" />
      {/* Triangle Marker */}
      <path d={`M ${x - 60} ${y - 5} L ${x - 56} ${y - 5} L ${x - 58} ${y} Z`} fill="#0f172a" />
      {/* Text Labels */}
      <text x={x - 80} y={y - 8} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a" className="uppercase">{label}</text>
      {subLabel && <text x={x - 80} y={y + 10} textAnchor="start" fontSize="8" fill="#64748b">{subLabel}</text>}
    </g>
  );

  if (startGap > 0) {
    const gapHeightPx = startGap * scaleY;
    // const levelY = endY - gapHeightPx; // Old logic
  }

  // Always draw Bottom Level (Nível Inferior) at the absolute bottom of the element
  gapIndicators.push(renderLevelMarker(leftX, endY, "NÍVEL INFERIOR", startGap > 0 ? `LE +${startGap}` : undefined));

  // Always draw Top Level (Nível Superior) at the absolute top of the element
  gapIndicators.push(renderLevelMarker(leftX, startY, "NÍVEL SUPERIOR", endGap > 0 ? `LE -${endGap}` : undefined));

  // Visual Gap Demarcation (Dotted Lines + Dimensions)
  if (startGap > 0) {
    const gapH = startGap * scaleY;
    const limitY = endY - gapH;
    gapIndicators.push(
      <g key="gap-start-visual">
        {/* Dotted Line at the limit of the bottom gap */}
        <line x1={leftX - 20} y1={limitY} x2={rightX + 20} y2={limitY} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

        {/* Dimension Line for Gap */}
        <line x1={rightX + 15} y1={endY} x2={rightX + 15} y2={limitY} stroke="#64748b" strokeWidth="1" />
        <line x1={rightX + 12} y1={limitY} x2={rightX + 18} y2={limitY} stroke="#64748b" strokeWidth="1" />
        <line x1={rightX + 12} y1={endY} x2={rightX + 18} y2={endY} stroke="#64748b" strokeWidth="1" />

        {/* Text */}
        <text
          x={rightX + 25}
          y={(endY + limitY) / 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#64748b"
          transform={`rotate(-90, ${rightX + 25}, ${(endY + limitY) / 2})`}
        >
          VÃO {Math.round(startGap)}
        </text>
      </g>
    );
  }

  if (endGap > 0) {
    const gapH = endGap * scaleY;
    const limitY = startY + gapH;
    gapIndicators.push(
      <g key="gap-end-visual">
        {/* Dotted Line at the limit of the top gap */}
        <line x1={leftX - 20} y1={limitY} x2={rightX + 20} y2={limitY} stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 3" />

        {/* Dimension Line for Gap */}
        <line x1={rightX + 15} y1={startY} x2={rightX + 15} y2={limitY} stroke="#64748b" strokeWidth="1" />
        <line x1={rightX + 12} y1={limitY} x2={rightX + 18} y2={limitY} stroke="#64748b" strokeWidth="1" />
        <line x1={rightX + 12} y1={startY} x2={rightX + 18} y2={startY} stroke="#64748b" strokeWidth="1" />

        {/* Text */}
        <text
          x={rightX + 25}
          y={(startY + limitY) / 2}
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#64748b"
          transform={`rotate(-90, ${rightX + 25}, ${(startY + limitY) / 2})`}
        >
          VÃO {Math.round(endGap)}
        </text>
      </g>
    );
  }

  // Group bars by visual placement to avoid overlap
  // For columns, we usually see 2 layers in 2D: Front/Back or Left/Right. 
  // Let's distribute them across the width of the column representation.
  const bars = item.mainBars.flatMap((b, idx) => ({ ...b, originalIdx: idx }));
  const numBars = bars.length + (newBar ? 1 : 0);

  // Return Error View if invalid (after all hooks ran)
  if (!isItemValid || !isLayoutValid) {
    return <div className="p-10 text-center text-red-500 font-bold bg-white rounded-xl border border-red-200">
      <p>Erro de visualização</p>
      <small className="text-xs text-slate-400">Verifique as dimensões do elemento.</small>
    </div>;
  }

  return (
    <div className="bg-slate-50 p-6 rounded-[3rem] border-2 border-slate-200 shadow-xl flex flex-col items-center w-full mx-auto" style={{ width: '100%' }}>
      <div className="flex justify-between w-full mb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-indigo-500 rounded-full" />
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Vista Vertical</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={viewH}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className={`bg-white rounded-[2rem] overflow-visible select-none outline-none ${draggingBarIdx !== null ? 'cursor-grabbing' : ''}`}
        tabIndex={0}
      >
        <defs>
          <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="#ffffff" />

        <text x="30" y="40" fontSize="20" fontWeight="900" fill="#0f172a">{item.observation || item.type}</text>
        <text x="30" y="58" fontSize="11" fill="#64748b" fontWeight="bold">ESC 1:25</text>

        <text x={centerX - 30} y="40" fontSize="12" fontWeight="900" fill="#0f172a" textAnchor="middle">VISTA H</text>
        <text x={centerX - 30} y="55" fontSize="9" fill="#64748b" fontWeight="bold" textAnchor="middle">ESC 1:25</text>

        <rect x={leftX} y={startY} width={displayWidthPx} height={totalHeightPx} fill="none" stroke="#0f172a" strokeWidth="2" />

        {stirrupLines}
        {gapIndicators}

        {bars.map((bar, i) => {
          const startXBars = rightX + 100;
          const spacingBars = 60;
          const xPos = startXBars + (i * spacingBars);
          return renderVerticalBar(bar, xPos);
        })}

        {newBar && selectedIdx === undefined && (
          renderVerticalBar({ ...newBar, originalIdx: 'new' as any } as any, rightX + 100 + (bars.length * 60))
        )}

        <g transform={`translate(${rightX + 40}, 0)`}>
          {(() => {
            const totalLen = item.length * 100;
            // Calculate covered length based on stirrup count
            const stCount = adjustedStirrupCount > 0 ? adjustedStirrupCount : 0;
            const coveredLen = stCount > 1 ? (stCount - 1) * spacing : 0;

            // Determine Gaps
            let sGap = item.startGap || 0;
            let eGap = item.endGap || 0;

            // If gaps missing, infer from remainder
            if (sGap === 0 && eGap === 0 && coveredLen > 0 && coveredLen < totalLen) {
              const rem = totalLen - coveredLen;
              sGap = rem / 2;
              eGap = rem / 2;
            }

            // Positions in Pixels relative to startY/endY
            // Top of column is startY. Bottom is endY.
            // StartGap is at BOTTOM. EndGap is at TOP.
            const bottomGapPx = sGap * scaleY;
            const topGapPx = eGap * scaleY;
            const midPx = coveredLen * scaleY;

            const yTop = startY;
            const yStirrupStart = startY + topGapPx;
            const yStirrupEnd = Math.min(startY + topGapPx + midPx, endY - bottomGapPx + 0.1);
            // Safety min to avoid overshoot if calculation is slightly off
            const yBot = endY;

            return (
              <>
                {/* Main Line */}
                <line x1={0} y1={yTop} x2={0} y2={yBot} stroke="#0f172a" strokeWidth="1" />

                {/* Ticks */}
                <line x1={-3} y1={yTop} x2={3} y2={yTop} stroke="#0f172a" strokeWidth="1" />
                <line x1={-3} y1={yBot} x2={3} y2={yBot} stroke="#0f172a" strokeWidth="1" />

                {/* Internal Ticks for Distribution if valid */}
                {stCount > 1 && (
                  <>
                    {eGap > 0 && <line x1={-3} y1={yStirrupStart} x2={0} y2={yStirrupStart} stroke="#0f172a" strokeWidth="1" />}
                    {sGap > 0 && <line x1={-3} y1={yStirrupEnd} x2={0} y2={yStirrupEnd} stroke="#0f172a" strokeWidth="1" />}
                  </>
                )}

                {/* Total Length Text */}
                <text
                  x={25}
                  y={(yTop + yBot) / 2}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="#0f172a"
                  transform={`rotate(-90, 25, ${(yTop + yBot) / 2})`}
                >
                  {Math.round(totalLen)}
                </text>

                {/* Gap Texts */}
                {eGap > 0 && (
                  <text x={8} y={(yTop + yStirrupStart) / 2} textAnchor="middle" fontSize="9" fill="#64748b" transform={`rotate(-90, 8, ${(yTop + yStirrupStart) / 2})`}>VÃO {Math.round(eGap)}</text>
                )}
                {sGap > 0 && (
                  <text x={8} y={(yStirrupEnd + yBot) / 2} textAnchor="middle" fontSize="9" fill="#64748b" transform={`rotate(-90, 8, ${(yStirrupEnd + yBot) / 2})`}>VÃO {Math.round(sGap)}</text>
                )}

                {/* Stirrup Info */}
                {item.hasStirrups && (
                  <text
                    x={8}
                    y={(yStirrupStart + yStirrupEnd) / 2}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#0f172a"
                    transform={`rotate(-90, 8, ${(yStirrupStart + yStirrupEnd) / 2})`}
                  >
                    {adjustedStirrupCount} N{item.stirrupPosition || '2'} ø{item.stirrupGauge} c/{spacing}
                  </text>
                )}
              </>
            );
          })()}
        </g>

        <line x1={leftX - 20} y1={(startY + endY) / 2} x2={leftX - 10} y2={(startY + endY) / 2} stroke="#0f172a" strokeWidth="1.5" />
        <line x1={rightX + 10} y1={(startY + endY) / 2} x2={rightX + 20} y2={(startY + endY) / 2} stroke="#0f172a" strokeWidth="1.5" />

        <g transform={`translate(${leftX - 150}, ${(startY + endY) / 2 - 60})`}>
          <text x="0" y="-25" fontSize="11" fontWeight="900" fill="#0f172a">SEÇÃO</text>
          <text x="0" y="-12" fontSize="9" fill="#64748b" fontWeight="bold">ESC 1:20</text>

          {(() => {
            const model = item.stirrupModel || 'rect';
            const sW = item.stirrupWidth || 20;
            const sH = item.stirrupHeight || 20;
            const scale = 3;
            const pW = sW * scale; // Width in pixels
            const pH = (model === 'circle' ? sW : sH) * scale; // Height in pixels
            const cover = 2.5 * scale;
            const stirrupOffset = 1.5 * scale;

            // --- Generate Shape Paths ---
            let pathOuter = "";
            let pathInner = "";

            if (model === 'rect') {
              pathOuter = `M0,0 L${pW},0 L${pW},${pH} L0,${pH} Z`;
              pathInner = `M${stirrupOffset},${stirrupOffset} L${pW - stirrupOffset},${stirrupOffset} L${pW - stirrupOffset},${pH - stirrupOffset} L${stirrupOffset},${pH - stirrupOffset} Z`;
            } else if (model === 'circle') {
              // Circles handled separately via <circle> or path with arcs
              // Using path for consistency is harder for resize. Let's use logic below.
            } else if (model === 'triangle') {
              pathOuter = `M${pW / 2},0 L${pW},${pH} L0,${pH} Z`;
              // Inner approximation
              pathInner = `M${pW / 2},${stirrupOffset * 1.5} L${pW - stirrupOffset},${pH - stirrupOffset} L${stirrupOffset},${pH - stirrupOffset} Z`;
            } else if (model === 'pentagon') {
              pathOuter = `M${pW / 2},0 L${pW},${pH * 0.38} L${pW * 0.81},${pH} L${pW * 0.19},${pH} L0,${pH * 0.38} Z`;
              pathInner = `M${pW / 2},${stirrupOffset} L${pW - stirrupOffset},${pH * 0.38} L${pW * 0.81 - stirrupOffset / 2},${pH - stirrupOffset} L${pW * 0.19 + stirrupOffset / 2},${pH - stirrupOffset} L${stirrupOffset},${pH * 0.38} Z`;
            } else if (model === 'hexagon') {
              pathOuter = `M${pW * 0.25},0 L${pW * 0.75},0 L${pW},${pH / 2} L${pW * 0.75},${pH} L${pW * 0.25},${pH} L0,${pH / 2} Z`;
              pathInner = `M${pW * 0.25 + stirrupOffset / 2},${stirrupOffset} L${pW * 0.75 - stirrupOffset / 2},${stirrupOffset} L${pW - stirrupOffset},${pH / 2} L${pW * 0.75 - stirrupOffset / 2},${pH - stirrupOffset} L${pW * 0.25 + stirrupOffset / 2},${pH - stirrupOffset} L${stirrupOffset},${pH / 2} Z`;
            }

            const allBars = [...item.mainBars];
            if (newBar) allBars.push(newBar);

            const topBars = allBars.filter(b => b.placement === 'top');
            const botBars = allBars.filter(b => b.placement === 'bottom' || !b.placement);
            const sideBars = allBars.filter(b => b.placement === 'distributed');
            const centerBars = allBars.filter(b => b.placement === 'center');

            const topCount = topBars.reduce((sum, b) => sum + b.count, 0);
            const botCount = botBars.reduce((sum, b) => sum + b.count, 0);
            const sideCount = sideBars.reduce((sum, b) => sum + b.count, 0);
            const centerCount = centerBars.reduce((sum, b) => sum + b.count, 0);

            return (
              <g transform="translate(0, 0)">
                {/* Visual Concrete Shape */}
                {model === 'circle' ? (
                  <circle cx={pW / 2} cy={pH / 2} r={pW / 2} fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
                ) : (
                  <path d={pathOuter} fill="#f1f5f9" stroke="#0f172a" strokeWidth="2" />
                )}

                {/* Visual Stirrup Shape */}
                {model === 'circle' ? (
                  <circle cx={pW / 2} cy={pH / 2} r={(pW / 2) - stirrupOffset} fill="none" stroke="#0f172a" strokeWidth="1.5" />
                ) : (
                  <path d={pathInner} fill="none" stroke="#0f172a" strokeWidth="1.5" />
                )}

                {/* Bars - Precise positioning via Grid Points */}
                {(() => {
                  const gridPts = getStirrupGridPoints(pW, pH, model);
                  const preciseCircles: React.ReactNode[] = [];
                  let hasPointIndices = false;

                  item.mainBars.forEach((bar, bIdx) => {
                    if (bar.pointIndices && bar.pointIndices.length > 0) {
                      hasPointIndices = true;
                      bar.pointIndices.forEach((ptIdx, i) => {
                        const pt = gridPts.find(p => p.id === ptIdx);
                        if (pt) {
                          preciseCircles.push(<circle key={`pb-${bIdx}-${i}`} cx={pt.x} cy={pt.y} r={3.5} fill="#0f172a" />);
                        }
                      });
                    }
                  });

                  if (hasPointIndices) return preciseCircles;

                  // Fallback Logic
                  const circles: React.ReactNode[] = [];

                  // Top Bars
                  if (topCount > 0) {
                    Array.from({ length: topCount }).forEach((_, i) => {
                      const xPos = topCount === 1 ? pW / 2 : cover + (i * ((pW - 2 * cover) / (topCount - 1)));
                      const yPos = model === 'triangle' ? cover + 5 : cover;
                      circles.push(<circle key={`t${i}`} cx={xPos} cy={yPos} r={3.5} fill="#0f172a" />);
                    });
                  }

                  // Bottom Bars
                  if (botCount > 0) {
                    Array.from({ length: botCount }).forEach((_, i) => {
                      const xPos = botCount === 1 ? pW / 2 : cover + (i * ((pW - 2 * cover) / (botCount - 1)));
                      const yPos = model === 'triangle' ? pH - cover - 5 : pH - cover;
                      circles.push(<circle key={`b${i}`} cx={xPos} cy={yPos} r={3.5} fill="#0f172a" />);
                    });
                  }

                  // Side Bars
                  if (sideCount > 0) {
                    const perSide = Math.ceil(sideCount / 2);
                    // Left
                    for (let i = 0; i < perSide; i++) {
                      const ySpacing = (pH - 2 * cover) / (perSide + 1);
                      circles.push(<circle key={`sl${i}`} cx={cover} cy={cover + ySpacing * (i + 1)} r={3.5} fill="#0f172a" />);
                    }
                    // Right
                    const rightBars = sideCount - perSide;
                    for (let i = 0; i < rightBars; i++) {
                      const ySpacing = (pH - 2 * cover) / (rightBars + 1);
                      circles.push(<circle key={`sr${i}`} cx={pW - cover} cy={cover + ySpacing * (i + 1)} r={3.5} fill="#0f172a" />);
                    }
                  }

                  // Center Bars
                  if (centerCount > 0) {
                    Array.from({ length: centerCount }).forEach((_, i) => {
                      const xPos = centerCount === 1 ? pW / 2 : cover + (i * ((pW - 2 * cover) / (centerCount - 1)));
                      circles.push(<circle key={`c${i}`} cx={xPos} cy={pH / 2} r={3.5} fill="#0f172a" />);
                    });
                  }

                  return circles;
                })()}

                {/* Dimensions - Adapted for Shapes */}
                {/* Horizontal Dimension (Bottom) */}
                <line x1={0} y1={pH + 8} x2={pW} y2={pH + 8} stroke="#0f172a" strokeWidth="0.5" />
                <line x1={0} y1={pH + 5} x2={0} y2={pH + 11} stroke="#0f172a" strokeWidth="0.5" />
                <line x1={pW} y1={pH + 5} x2={pW} y2={pH + 11} stroke="#0f172a" strokeWidth="0.5" />
                <text x={pW / 2} y={pH + 20} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(sW)}</text>

                {/* Vertical Dimension (Right) */}
                {model !== 'circle' && (
                  <>
                    <line x1={pW + 8} y1={0} x2={pW + 8} y2={pH} stroke="#0f172a" strokeWidth="0.5" />
                    <line x1={pW + 5} y1={0} x2={pW + 11} y2={0} stroke="#0f172a" strokeWidth="0.5" />
                    <line x1={pW + 5} y1={pH} x2={pW + 11} y2={pH} stroke="#0f172a" strokeWidth="0.5" />
                    <text x={pW + 18} y={pH / 2 + 4} textAnchor="start" fontSize="10" fontWeight="bold" fill="#0f172a">{Math.round(sH)}</text>
                  </>
                )}
                {model === 'circle' && (
                  <text x={pW / 2} y={pH / 2} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">Ø{Math.round(sW)}</text>
                )}

                {/* NEW: DETACHED STIRRUP (Estribo Avulso) - Scaled for Visibility */}
                {item.hasStirrups && (() => {
                  // Use the explicit quantity from AI/Input, matches side dimension
                  const numStirrups = adjustedStirrupCount;
                  const sW_val = Math.round(item.stirrupWidth || sW);
                  const sH_val = Math.round(item.stirrupHeight || sH);
                  const model = item.stirrupModel || 'rect';

                  // Scale drawing to be ~60px visually
                  const targetSize = 60;
                  const scale = targetSize / Math.max(sW_val, sH_val);
                  const dW = sW_val * scale;
                  const dH = sH_val * scale;

                  const cx = dW / 2;
                  const cy = dH / 2;

                  const offsetY = pH + 60;
                  let hooksNode = null;
                  let cutLength = 0;
                  let shapeNode = null;
                  let dimensionNode = null;

                  if (model === 'rect') {
                    cutLength = (sW_val + sH_val) * 2 + 10;
                    shapeNode = <rect x={0} y={0} width={dW} height={dH} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                    dimensionNode = (
                      <>
                        <text x={dW / 2} y={-5} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                        <text x={dW / 2} y={dH + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                        <text x={-5} y={dH / 2} textAnchor="end" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH_val}</text>
                        <text x={dW + 5} y={dH / 2} textAnchor="start" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sH_val}</text>
                      </>
                    );
                    const hookGap = 3;
                    const hookLen = 8;
                    hooksNode = (
                      <g transform="translate(0, 0)">
                        <line x1={hookGap} y1={0} x2={hookGap + hookLen} y2={hookLen} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={0} y1={hookGap} x2={hookLen} y2={hookGap + hookLen} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  } else if (model === 'circle') {
                    cutLength = Math.round(sW_val * Math.PI + 10);
                    const r = dW / 2;
                    shapeNode = <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                    dimensionNode = <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#0f172a">Ø{sW_val}</text>;
                    hooksNode = (
                      <g transform={`translate(${cx}, ${cy - r})`}>
                        <path d="M-4,2 Q0,8 4,2" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={-2} y1={0} x2={-2} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={2} y1={0} x2={2} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  } else if (model === 'triangle') {
                    const side = Math.round(Math.sqrt(Math.pow(sW_val / 2, 2) + Math.pow(sH_val, 2)));
                    cutLength = Math.round(sW_val + 2 * side + 10);
                    shapeNode = <polygon points={`0,${dH} ${dW},${dH} ${cx},0`} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                    dimensionNode = (
                      <>
                        <text x={cx} y={dH + 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">{sW_val}</text>
                        <text x={dW * 0.75 + 6} y={dH / 2} textAnchor="start" fontSize="10" fontWeight="bold" fill="#0f172a">{side}</text>
                        <text x={dW * 0.25 - 6} y={dH / 2} textAnchor="end" fontSize="10" fontWeight="bold" fill="#0f172a">{side}</text>
                      </>
                    );
                    hooksNode = (
                      <g transform={`translate(${cx}, 0)`}>
                        <line x1={-2} y1={2} x2={-6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={2} y1={2} x2={6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  } else if (model === 'pentagon') {
                    const v = [
                      { x: cx, y: 0 },
                      { x: dW, y: dH * 0.38 },
                      { x: dW * 0.81, y: dH },
                      { x: dW * 0.19, y: dH },
                      { x: 0, y: dH * 0.38 }
                    ];
                    const distReal = (p1: any, p2: any) => Math.round(Math.sqrt(Math.pow((p2.x - p1.x) / scale, 2) + Math.pow((p2.y - p1.y) / scale, 2)));
                    const s1 = distReal(v[0], v[1]);
                    const s2 = distReal(v[1], v[2]);
                    const s3 = distReal(v[2], v[3]);
                    const s4 = distReal(v[3], v[4]);
                    const s5 = distReal(v[4], v[0]);
                    cutLength = s1 + s2 + s3 + s4 + s5 + 10;
                    const pointsStr = v.map(p => `${p.x},${p.y}`).join(' ');
                    shapeNode = <polygon points={pointsStr} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                    dimensionNode = (
                      <>
                        <text x={dW * 0.8 + 8} y={dH * 0.2} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s1}</text>
                        <text x={dW + 4} y={dH * 0.7} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s2}</text>
                        <text x={cx} y={dH + 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s3}</text>
                        <text x={-4} y={dH * 0.7} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s4}</text>
                        <text x={dW * 0.2 - 8} y={dH * 0.2} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s5}</text>
                      </>
                    );
                    hooksNode = (
                      <g transform={`translate(${cx}, 0)`}>
                        <line x1={-2} y1={3} x2={-6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={2} y1={3} x2={6} y2={10} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  } else if (model === 'hexagon') {
                    const v = [
                      { x: dW * 0.25, y: 0 },
                      { x: dW * 0.75, y: 0 },
                      { x: dW, y: dH / 2 },
                      { x: dW * 0.75, y: dH },
                      { x: dW * 0.25, y: dH },
                      { x: 0, y: dH / 2 }
                    ];
                    const distReal = (p1: any, p2: any) => Math.round(Math.pow(Math.pow((p2.x - p1.x) / scale, 2) + Math.pow((p2.y - p1.y) / scale, 2), 0.5));
                    const s1 = distReal(v[0], v[1]);
                    const s2 = distReal(v[1], v[2]);
                    const s3 = distReal(v[2], v[3]);
                    const s4 = distReal(v[3], v[4]);
                    const s5 = distReal(v[4], v[5]);
                    const s6 = distReal(v[5], v[0]);
                    cutLength = s1 + s2 + s3 + s4 + s5 + s6 + 10;
                    const pointsStr = v.map(p => `${p.x},${p.y}`).join(' ');
                    shapeNode = <polygon points={pointsStr} fill="none" stroke="#0f172a" strokeWidth="2.5" />;
                    dimensionNode = (
                      <>
                        <text x={cx} y={-4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s1}</text>
                        <text x={dW + 4} y={dH * 0.25} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s2}</text>
                        <text x={dW + 4} y={dH * 0.75} textAnchor="start" fontSize="9" fontWeight="bold" fill="#0f172a">{s3}</text>
                        <text x={cx} y={dH + 10} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">{s4}</text>
                        <text x={-4} y={dH * 0.75} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s5}</text>
                        <text x={-4} y={dH * 0.25} textAnchor="end" fontSize="9" fontWeight="bold" fill="#0f172a">{s6}</text>
                      </>
                    );
                    const pA = v[5];
                    const pB = v[0];
                    const hx = pA.x + (pB.x - pA.x) * 0.85;
                    const hy = pA.y + (pB.y - pA.y) * 0.85;
                    hooksNode = (
                      <g transform={`translate(${hx}, ${hy})`}>
                        <line x1={-3} y1={2} x2={0} y2={8} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1={1} y1={0} x2={4} y2={6} stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                      </g>
                    );
                  }

                  return (
                    <g transform={`translate(${pW / 2 - dW / 2}, ${offsetY})`}>
                      {shapeNode}
                      {hooksNode}
                      {dimensionNode}

                      {/* Summary Text Below */}
                      <text x={dW / 2} y={dH + 35} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
                        {numStirrups} {item.stirrupPosition || 'N2'} ø{item.stirrupGauge} C={cutLength}
                      </text>
                      {/* Formula text removed */}
                    </g>
                  );
                })()}
              </g>
            );
          })()}
        </g>

        <g transform={`translate(${leftX - 50}, ${startY})`}>
          <line x1={0} y1={0} x2={45} y2={0} stroke="#0f172a" strokeWidth="1" />
        </g>
        <g transform={`translate(${leftX - 50}, ${endY})`}>
          <line x1={0} y1={0} x2={45} y2={0} stroke="#0f172a" strokeWidth="1" />
        </g>
      </svg>
      <div className="absolute top-4 right-4 bg-slate-100 rounded-full px-3 py-1 text-[10px] font-bold text-slate-500">
        Arraste verticalmente para ajustar offset
      </div>
    </div>
  );
};

const ItemReinforcementPreview: React.FC<{
  item: SteelItem;
  onEditBar: (idx: number) => void;
  onRemoveBar: (idx: number) => void;
  onBarUpdate?: (idx: number, newOffset: number) => void;
  onEditStirrups?: () => void;
  newBar?: MainBarGroup;
  onNewBarUpdate?: (newOffset: number) => void;
  selectedIdx?: number;
  readOnly?: boolean;
}> = ({ item, onEditBar, onRemoveBar, onBarUpdate, onEditStirrups, newBar, onNewBarUpdate, selectedIdx, readOnly }) => {
  const isPilarOrBroca = item.type === 'Pilar' || item.type === 'Broca';
  const isSapata = item.type === 'Sapata';

  // Always show for Pilar/Broca even without bars
  if (item.mainBars.length === 0 && !item.hasStirrups && !isPilarOrBroca) return null;

  return (
    <div className="mt-4 p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100/50 space-y-4">
      {/* Resumo da Gaiola / Estribos Automáticos + Seção Visual */}
      {(item.hasStirrups || !isSapata || isPilarOrBroca) && (
        <div className="flex flex-col gap-4 items-stretch">
          {/* Technical Project View - Elevation Only (No Section Side-by-Side) */}
          {!isSapata && (
            <div className={`flex flex-wrap gap-6 items-start justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 w-full`}>
              {/* Elevation */}
              {item.type !== 'Pilar' && item.type !== 'Broca' ? (
                <BeamElevationView
                  item={item}
                  onEditBar={onEditBar}
                  onRemoveBar={onRemoveBar}
                  onBarUpdate={onBarUpdate}
                />
              ) : (
                <ColumnElevationView
                  item={item}
                  onEditBar={onEditBar}
                  onRemoveBar={onRemoveBar}
                  onBarUpdate={onBarUpdate}
                  newBar={newBar}
                  onNewBarUpdate={onNewBarUpdate}
                  selectedIdx={selectedIdx}
                  readOnly={readOnly}
                />
              )}
            </div>
          )}

          {/* Special Case: Cage Drawing for Sapatas (Keep only if Sapata, remove for others) */}
          {item.hasStirrups && isSapata && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all group/st bg-indigo-50 border-indigo-200`}>
              <div className="flex items-center gap-6">
                <CageDrawing lengthCm={Math.round(item.length * 100)} widthCm={Math.round((item.width || 0) * 100)} spacing={item.stirrupSpacing} compact />
                <div className="flex flex-col">
                  <span className={`text-[9px] font-black uppercase leading-none text-indigo-700`}>Gaiola Fechada</span>
                  <span className="text-[12px] font-black text-slate-800">Ø{item.stirrupGauge} c/{item.stirrupSpacing}cm</span>
                </div>

                {isSapata && (
                  <div className="flex gap-4">
                    <div className="text-[10px] font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-indigo-100">
                      {Math.ceil((item.width || 0.8) * 100 / item.stirrupSpacing)} un. no Comprimento
                    </div>
                    <div className="text-[10px] font-bold text-indigo-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-indigo-100">
                      {Math.ceil(item.length * 100 / item.stirrupSpacing)} un. na Largura
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onEditStirrups} className={`p-2 transition-all bg-white rounded-xl shadow-sm text-indigo-600 hover:text-indigo-800`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailedBudgetView: React.FC<{ item: SteelItem; onClose: () => void }> = ({ item, onClose }) => {
  const getBarWeight = (gauge: string, totalMeters: number) => totalMeters * (STEEL_WEIGHTS[gauge] || 0);

  // 1. Main Bars Calculation
  const mainBarsData = item.mainBars.map((bar, idx) => {
    // Fallback logic matches calculateWeight
    const lenM_final = (bar.segmentA && bar.segmentA > 0) ? bar.segmentA / 100 : item.length;

    // Extra segments
    const extraCm = (bar.segmentB || 0) + (bar.segmentC || 0) + (bar.segmentD || 0) + (bar.segmentE || 0) +
      (bar.hookStartType !== 'none' ? bar.hookStart : 0) + (bar.hookEndType !== 'none' ? bar.hookEnd : 0);

    const totalLenM = lenM_final + (extraCm / 100);
    const qtyUnit = bar.count;
    const qtyTotal = qtyUnit * item.quantity;
    // Assuming 'gauge' like '10.0' matches STEEL_WEIGHTS keys
    const weightTotal = getBarWeight(bar.gauge, totalLenM * qtyTotal);

    return {
      pos: bar.position || `N${idx + 1}`,
      gauge: bar.gauge,
      qtyUnit,
      qtyTotal,
      lengthCm: Math.round(totalLenM * 100),
      weightTotal
    };
  });

  // 2. Stirrups Calculation
  let stirrupData = null;
  if (item.hasStirrups) {
    // Determine effective length for distribution
    const maxBarLen = Math.max(...item.mainBars.map(b => b.segmentA || 0));
    const effectiveLength = maxBarLen > 0 ? maxBarLen / 100 : item.length;

    // Use explicit stirrupCount if available (from AI), otherwise calculate
    const countOne = item.stirrupCount && item.stirrupCount > 0
      ? item.stirrupCount
      : Math.ceil((effectiveLength * 100) / (item.stirrupSpacing || 20));

    // Perimeter + Hooks (Standard 5cm + 5cm = 10cm or calculated)
    const perimeterCm = (item.stirrupWidth * 2) + (item.stirrupHeight * 2) + 10;
    const totalLenM = perimeterCm / 100;
    const qtyTotal = countOne * item.quantity;
    const weightTotal = getBarWeight(item.stirrupGauge, totalLenM * qtyTotal);

    stirrupData = {
      pos: item.stirrupPosition || 'EST',
      gauge: item.stirrupGauge,
      qtyUnit: countOne,
      qtyTotal,
      lengthCm: Math.round(perimeterCm),
      weightTotal
    };
  }

  const grandTotalWeight = mainBarsData.reduce((acc, b) => acc + b.weightTotal, 0) + (stirrupData?.weightTotal || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center">
          <div>
            <h3 className="text-white font-black text-xl uppercase tracking-tight">{item.type}</h3>
            <p className="text-slate-400 text-sm font-medium">{item.observation || 'Sem Observação'}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-amber-100 text-amber-700 font-black px-4 py-2 rounded-xl text-lg border border-amber-200">
              {item.quantity} Peças
            </div>
            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider ml-auto">
              Peso Total: <span className="text-slate-900 text-base">{grandTotalWeight.toFixed(2)} kg</span>
            </div>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Pos</th>
                <th className="px-4 py-3">Bitola</th>
                <th className="px-4 py-3 text-center">Qtde (Unit)</th>
                <th className="px-4 py-3 text-center">Qtde (Total)</th>
                <th className="px-4 py-3 text-right">Comp. (cm)</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Peso (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mainBarsData.map((bar, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors font-medium text-slate-700">
                  <td className="px-4 py-3"><span className="font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{bar.pos}</span></td>
                  <td className="px-4 py-3 text-slate-900">ø{bar.gauge}</td>
                  <td className="px-4 py-3 text-center">{bar.qtyUnit}</td>
                  <td className="px-4 py-3 text-center font-bold">{bar.qtyTotal}</td>
                  <td className="px-4 py-3 text-right">{bar.lengthCm}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{bar.weightTotal.toFixed(2)}</td>
                </tr>
              ))}
              {stirrupData && (
                <tr className="hover:bg-amber-50/50 transition-colors font-medium text-slate-700 bg-amber-50/20">
                  <td className="px-4 py-3"><span className="font-black text-amber-600 bg-amber-100 px-2 py-1 rounded">{stirrupData.pos}</span></td>
                  <td className="px-4 py-3 text-slate-900">ø{stirrupData.gauge}</td>
                  <td className="px-4 py-3 text-center">{stirrupData.qtyUnit}</td>
                  <td className="px-4 py-3 text-center font-bold">{stirrupData.qtyTotal}</td>
                  <td className="px-4 py-3 text-right">{stirrupData.lengthCm}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{stirrupData.weightTotal.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
          <button onClick={onClose} className="text-slate-500 font-bold hover:text-slate-800 text-xs uppercase tracking-widest transition-colors">Fechar Orçamento Detalhado</button>
        </div>
      </div>
    </div>
  );
};

const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ client, onSave, onCancel }) => {
  const [items, setItems] = useState<SteelItem[]>([]);
  const [showDevMap, setShowDevMap] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [editingContext, setEditingContext] = useState<{ item: SteelItem, barIdx?: number, initialTab?: 'ferros' | 'estribos', initialUsage?: BarUsage } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [viewingDetailedItem, setViewingDetailedItem] = useState<SteelItem | null>(null);
  const [newItemBase, setNewItemBase] = useState<{ type: ElementType, qty: number, lengthCm: number, widthCm: number, heightCm: number, obs: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // State for AI Analysis loading

  // Global Error Handler for debugging White Screen
  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      alert(`ERRO CRÍTICO: ${event.message}\n\nPor favor tire um print e envie.\nEm: ${event.filename}:${event.lineno}\n\nStack: ${event.error?.stack}`);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  // State to control visibility of "Visualizar Orçamento"
  const [showInvoice, setShowInvoice] = useState(false);

  // Helper function to get effective length from bars (uses max segmentA)
  const getEffectiveLength = (item: SteelItem): number => {
    if (item.mainBars.length === 0) {
      return item.length; // Fallback to default if no bars yet
    }
    const maxSegmentA = Math.max(...item.mainBars.map(bar => bar.segmentA || 0));
    return maxSegmentA > 0 ? maxSegmentA / 100 : item.length; // Convert cm to m
  };

  const calculateWeight = (itemsList: SteelItem[]) => {
    return itemsList.reduce((acc, item) => {
      const mainWeight = item.mainBars.reduce((total, group) => {
        const weightPerMeter = STEEL_WEIGHTS[group.gauge] || 0;

        // Base length: prioritize segmentA (cm) then fallback to item.length (m) or item.width (m)
        const baseLenM = (group.segmentA && group.segmentA > 0)
          ? (group.segmentA / 100)
          : (group.usage.includes('Largura') ? (item.width || item.length) : item.length);

        // Legs & Hooks extra (cm): B, C, D, E
        const segmentsExtraCm = (group.segmentB || 0) + (group.segmentC || 0) + (group.segmentD || 0) + (group.segmentE || 0);

        // Fallback extra if segments not used but hooks are (compatibility)
        const hookExtraCm = (!group.segmentB && group.hookStartType !== 'none' ? group.hookStart : 0) +
          (!group.segmentC && group.hookEndType !== 'none' ? group.hookEnd : 0);

        const totalExtraM = (segmentsExtraCm + hookExtraCm) / 100;

        return total + (item.quantity * group.count * (baseLenM + totalExtraM) * weightPerMeter);
      }, 0);

      let totalStirrupWeight = 0;
      if (item.hasStirrups) {
        const effectiveLength = getEffectiveLength(item);
        if (item.type === ElementType.SAPATA) {
          const weightPerMeter = STEEL_WEIGHTS[item.stirrupGauge] || 0;
          const hookCm = (item.height || 20) - 5;
          const hooksM = (hookCm * 2) / 100;
          const countL = Math.ceil((item.width || 0.8) * 100 / item.stirrupSpacing);
          const weightL = item.quantity * countL * (effectiveLength + hooksM) * weightPerMeter;
          const countW = Math.ceil(effectiveLength * 100 / item.stirrupSpacing);
          const weightW = item.quantity * countW * ((item.width || 0.8) + hooksM) * weightPerMeter;
          totalStirrupWeight = weightL + weightW;
        } else {
          const stirrupCount = Math.ceil((effectiveLength * 100) / item.stirrupSpacing);
          const stirrupPerimeter = (item.stirrupWidth * 2 + item.stirrupHeight * 2 + 10) / 100;
          totalStirrupWeight = item.quantity * stirrupCount * stirrupPerimeter * (STEEL_WEIGHTS[item.stirrupGauge] || 0);
        }
      }
      return acc + mainWeight + totalStirrupWeight;
    }, 0);
  };

  const confirmNewItem = () => {
    try {
      if (!newItemBase) return;
      const lengthM = Math.max((Number(newItemBase.lengthCm) || 0) / 100, 0.1);
      const widthM = Math.max((Number(newItemBase.widthCm) || 0) / 100, 0.1);
      const safeWidthCm = Math.max(Number(newItemBase.widthCm) || 0, 10);
      const safeHeightCm = Math.max(Number(newItemBase.heightCm) || 0, 10);

      // Safe ID generation (crypto.randomUUID can fail in non-secure contexts)
      const safeId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

      const newItem: SteelItem = {
        id: safeId,
        type: newItemBase.type,
        observation: newItemBase.obs || `${newItemBase.type.charAt(0)}${items.length + 1}`,
        quantity: Math.max(Number(newItemBase.qty) || 1, 1),
        length: lengthM,
        width: newItemBase.type === ElementType.SAPATA ? widthM : (newItemBase.type === 'Pilar' || newItemBase.type === 'Broca' ? widthM : undefined),
        height: safeHeightCm,
        mainBars: [],
        hasStirrups: newItemBase.type === ElementType.SAPATA || newItemBase.type === 'Pilar' || newItemBase.type === 'Broca',
        stirrupGauge: newItemBase.type === ElementType.SAPATA ? '10.0' : '5.0',
        stirrupSpacing: 15,
        stirrupWidth: newItemBase.type === ElementType.SAPATA ? safeWidthCm : (newItemBase.type === 'Pilar' || newItemBase.type === 'Broca' ? safeWidthCm : 15),
        stirrupHeight: newItemBase.type === ElementType.SAPATA ? safeHeightCm : (newItemBase.type === 'Pilar' || newItemBase.type === 'Broca' ? safeHeightCm : 20),
        isConfigured: false
      };
      setItems([...items, newItem]);
      setEditingContext({ item: newItem, initialTab: 'ferros', initialUsage: BarUsage.PRINCIPAL });
      setNewItemBase(null);
      setShowTypeSelector(false);
    } catch (err) {
      console.error("Erro ao confirmar novo item:", err);
      alert("Ocorreu um erro ao criar o elemento. Verifique os dados e tente novamente.");
    }
  };

  const saveBarConfig = (updatedItem: SteelItem, barData: MainBarGroup, barIdx?: number) => {
    let newBars = [...updatedItem.mainBars];
    if (barIdx !== undefined) newBars[barIdx] = barData;
    else newBars.push(barData);
    const finalItem = { ...updatedItem, mainBars: newBars, isConfigured: true };
    setItems(items.map(i => i.id === finalItem.id ? finalItem : i));
    setEditingContext(null);
  };

  const saveStirrupConfig = (updatedItem: SteelItem) => {
    setItems(items.map(i => i.id === updatedItem.id ? { ...updatedItem, isConfigured: true } : i));
    setEditingContext(null);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Tenta pegar do .env OU do localStorage
    let apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');

    // Se não encontrou, pede para o usuário
    if (!apiKey) {
      const userKey = window.prompt("Para usar este recurso sem reiniciar o servidor, cole sua chave API aqui:");
      if (userKey && userKey.trim().length > 10) {
        apiKey = userKey.trim();
        localStorage.setItem('gemini_api_key', apiKey); // Salva para a próxima vez
      } else {
        alert("Chave API necessária para importar imagens.");
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      const newItems = await analyzeImageWithGemini(file, apiKey, items);
      setItems(prev => [...prev, ...newItems]);
      // Optional: scroll to bottom or show toast
    } catch (error) {
      console.error(error);
      alert("Erro ao analisar imagem: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsAnalyzing(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Resumo do Orçamento */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-slate-900 text-amber-500 rounded-3xl shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.name}</span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Orçamento de Ferragem</h2>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <button
            onClick={() => setShowDevMap(true)}
            className="p-3 bg-white text-slate-400 border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-2xl transition-all shadow-sm group relative"
            title="Mapa do Sistema"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
            </svg>
            <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Mapa do Sistema</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Carga Total</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">{calculateWeight(items).toFixed(1)} <small className="text-sm font-medium">kg</small></span>
          </div>
          <button
            disabled={items.length === 0 || !items.every(i => i.mainBars.length > 0 && i.hasStirrups)}
            onClick={() => onSave({ id: crypto.randomUUID(), clientId: client.id, date: new Date().toISOString(), items: items, totalWeight: calculateWeight(items), totalPrice: calculateWeight(items) * DEFAULT_KG_PRICE, status: 'Draft' })}
            className="bg-emerald-500 text-white px-10 py-4 rounded-3xl font-black hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-40 active:scale-95"
          >
            Finalizar Orçamento
          </button>
        </div>
      </div>

      {showDevMap && <DevSystemMap onClose={() => setShowDevMap(false)} />}

      <div className="space-y-4">
        {items.map(item => {
          const hasMainBars = item.mainBars.length > 0;
          const hasStirrups = item.hasStirrups;
          const isComplete = hasMainBars && hasStirrups;

          return (
            <div key={item.id} className={`bg-white p-8 rounded-[2.5rem] border-2 shadow-sm transition-all flex flex-col group hover:shadow-lg ${!isComplete ? 'border-amber-300 bg-amber-50/10' : 'border-slate-100 bg-white'}`}>
              <div className="flex justify-between items-start w-full">
                <div className="flex items-center gap-8">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-lg shadow-sm border ${!isComplete ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                    {item.quantity}x
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xl uppercase tracking-tight flex items-center gap-3">
                      {item.type}
                      {!isComplete && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded-md uppercase tracking-wider">Incompleto</span>}
                      {item.observation && <span className="text-slate-400 font-medium lowercase text-base"> - {item.observation}</span>}
                    </h4>
                    <div className="flex gap-3 items-center mt-1">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {item.type === ElementType.SAPATA
                          ? `${Math.round(getEffectiveLength(item) * 100)}cm x ${Math.round(item.width! * 100)}cm x ${item.height}cm`
                          : `${Math.round(getEffectiveLength(item) * 100)}cm de comprimento`}
                      </span>
                    </div>
                    {/* Validation Feedback */}
                    {!isComplete && (
                      <div className="flex gap-2 mt-3">
                        {!hasMainBars && <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-2 py-1 rounded-lg border border-red-100">Falta Ferro Principal</span>}
                        {!hasStirrups && <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-2 py-1 rounded-lg border border-red-100">Falta Estribo</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 relative">
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                      className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${!isComplete ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {!isComplete && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
                      {isComplete ? 'Editar Detalhes' : 'Configurar Aço'}
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${openDropdownId === item.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>

                    {openDropdownId === item.id && (
                      <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">
                          Opções da Peça
                        </div>
                        <div className="flex flex-col p-2 gap-1">
                          <button
                            onClick={() => { setEditingContext({ item, initialTab: 'ferros', initialUsage: BarUsage.PRINCIPAL }); setOpenDropdownId(null); }}
                            className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between group"
                          >
                            <span>Adicionar / Editar Ferros</span>
                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">Abrir Editor</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1" />

                          <button
                            onClick={() => { setViewingDetailedItem(item); setOpenDropdownId(null); }}
                            className="text-left px-4 py-3 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between group"
                          >
                            <span>Orçamento Detalhado</span>
                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">NOVO</span>
                          </button>

                          <button
                            onClick={() => {
                              // Duplicar item logic? Or delete?
                              // Assuming the list had delete but I don't see one in this dropdown block.
                              // Let's add a Remove action if it wasn't there or if useful.
                              // But for now, user asked to simplify "Add Components".
                              setItems(items.filter(i => i.id !== item.id));
                            }}
                            className="text-left px-4 py-3 rounded-xl hover:bg-red-50 text-xs font-bold text-red-500 flex items-center justify-between group"
                          >
                            <span>Remover Peça</span>
                            <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded group-hover:bg-red-200 transition-colors">X</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-3 text-slate-200 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </div>
              <ItemReinforcementPreview
                item={item}
                onEditBar={(idx) => setEditingContext({ item, barIdx: idx, initialTab: 'ferros' })}
                onRemoveBar={(idx) => {
                  const newBars = item.mainBars.filter((_, i) => i !== idx);
                  setItems(items.map(it => it.id === item.id ? { ...it, mainBars: newBars, isConfigured: newBars.length > 0 || it.hasStirrups } : it));
                }}
                onEditStirrups={() => setEditingContext({ item, initialTab: 'estribos' })}
                onBarUpdate={(idx, offset) => {
                  const newBars = [...item.mainBars];
                  if (newBars[idx]) {
                    newBars[idx] = { ...newBars[idx], offset };
                    const newItem = { ...item, mainBars: newBars };
                    setItems(items.map(it => it.id === item.id ? newItem : it));
                  }
                }}
              />
            </div>
          );
        })}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Import via AI Button */}
          <label className={`w-full py-10 bg-white border-4 border-dashed border-indigo-100 rounded-[3rem] text-indigo-400 font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-[0.99] flex items-center justify-center gap-4 group cursor-pointer relative overflow-hidden ${isAnalyzing ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={isAnalyzing}
            />
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-xs">Analisando imagem...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                Importar de Imagem 📸
              </>
            )}
          </label>

          {/* Add Manual Button */}
          <button onClick={() => setShowTypeSelector(true)} className="w-full py-10 bg-white border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-400 font-black uppercase tracking-widest hover:border-amber-300 hover:text-amber-500 transition-all active:scale-[0.99] flex items-center justify-center gap-4 group">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </div>
            Adicionar Novo Material
          </button>
        </div>
      </div>

      {showTypeSelector && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={() => setShowTypeSelector(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {!newItemBase ? (
              <>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-8 text-center">Qual o elemento?</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.values(ElementType).map(t => (
                    <button key={t} onClick={() => {
                      // Auto-generate ID based on type
                      const prefix = t === 'Pilar' ? 'P' : t === 'Broca' ? 'B' : t === 'Sapata' ? 'S' : 'V';
                      const count = items.filter(i => i.type === t).length + 1;
                      const autoObs = `${prefix}${count}`;

                      setNewItemBase({ type: t, qty: 1, lengthCm: 100, widthCm: 20, heightCm: 20, obs: autoObs })
                    }} className="bg-slate-50 hover:bg-white border-2 border-transparent hover:border-amber-500 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group shadow-sm hover:shadow-xl">
                      <div className="w-14 h-14 bg-slate-900 text-amber-500 rounded-2xl flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">{t.charAt(0)}</div>
                      <span className="font-black text-slate-700 text-xs uppercase tracking-widest text-center">{t}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setNewItemBase(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cadastro da {newItemBase.type}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Identificação</label>
                    <input autoFocus type="text" value={newItemBase.obs} onChange={e => setNewItemBase({ ...newItemBase, obs: e.target.value })} placeholder="Ex: Sapata Sala, Viga Fundo..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-bold outline-none focus:border-amber-500 transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Quantidade</label>
                    <input type="number" value={newItemBase.qty} onChange={e => setNewItemBase({ ...newItemBase, qty: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-inner" />
                  </div>

                  {/* Dimensões serão definidas no "Configurar Aço" através dos segmentos */}
                  {/* {newItemBase.type === ElementType.SAPATA ? (
                    <div className="col-span-full grid grid-cols-3 gap-4 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">Comprimento (cm)</label>
                        <input type="number" value={newItemBase.lengthCm} onChange={e => setNewItemBase({ ...newItemBase, lengthCm: Number(e.target.value) })} className="w-full bg-white border-2 border-amber-200 rounded-2xl p-5 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-sm" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">Largura (cm)</label>
                        <input type="number" value={newItemBase.widthCm} onChange={e => setNewItemBase({ ...newItemBase, widthCm: Number(e.target.value) })} className="w-full bg-white border-2 border-amber-200 rounded-2xl p-5 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-sm" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">Altura (cm)</label>
                        <input type="number" value={newItemBase.heightCm} onChange={e => setNewItemBase({ ...newItemBase, heightCm: Number(e.target.value) })} className="w-full bg-white border-2 border-amber-200 rounded-2xl p-5 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Comprimento (cm)</label>
                      <input type="number" step="1" value={newItemBase.lengthCm} onChange={e => setNewItemBase({ ...newItemBase, lengthCm: Number(e.target.value) })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-lg font-black outline-none focus:border-amber-500 transition-all shadow-inner" />
                    </div>
                  )} */}
                </div>

                <button onClick={confirmNewItem} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">
                  Confirmar e Ir para Aço
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editingContext && (
        <ItemDetailEditor
          item={editingContext.item}
          barIdx={editingContext.barIdx}
          initialTab={editingContext.initialTab}
          initialUsage={editingContext.initialUsage}
          onSaveBar={(barData, idx) => saveBarConfig(editingContext.item, barData, idx)}
          onSaveStirrups={(stirrupData) => saveStirrupConfig(stirrupData)}
          onUpdateItem={(newItem) => {
            // Fully replace the item with the new state from the unified editor
            setItems(items.map(i => i.id === newItem.id ? newItem : i));
            setEditingContext(null);
          }}
          onCancel={() => setEditingContext(null)}
        />
      )}

      {viewingDetailedItem && (
        <DetailedBudgetView item={viewingDetailedItem} onClose={() => setViewingDetailedItem(null)} />
      )}
    </div>
  );
};


interface EditorProps {
  item: SteelItem;
  barIdx?: number;
  initialTab?: 'ferros' | 'estribos';
  initialUsage?: BarUsage;
  onSaveBar: (bar: MainBarGroup) => void;
  onSaveStirrups: (item: SteelItem) => void;
  onCancel: () => void;
}

const ItemDetailEditor: React.FC<{
  item: SteelItem;
  // barIdx is no longer needed as primary entry point for "Add", but if editing specific, we can use internal state
  barIdx?: number;
  initialTab?: 'ferros' | 'estribos'; // Deprecated but kept for compatibility or used to focus section
  initialUsage?: BarUsage;
  onSaveBar: (bar: MainBarGroup, idx?: number) => void; // Modified to accept idx
  onSaveStirrups: (item: SteelItem) => void;
  onCancel: () => void;
  onUpdateItem: (newItem: SteelItem) => void; // New prop to update whole item state
}> = ({ item, barIdx, initialTab, initialUsage, onSaveBar, onSaveStirrups, onCancel, onUpdateItem }) => {

  const isSapata = item.type === ElementType.SAPATA;
  const isVertical = item.type === 'Pilar' || item.type === 'Broca';

  // Local state for the item being edited to support batch changes
  const [localItem, setLocalItem] = useState<SteelItem>(JSON.parse(JSON.stringify(item)));
  const [zoomLevel, setZoomLevel] = useState<number>(1.2);


  // State for the "New Bar Form"
  const defaultHook = isSapata ? (item.height || 20) - 5 : 15;
  const [newBar, setNewBar] = useState<MainBarGroup>({
    count: 2,
    gauge: '10.0',
    usage: initialUsage || BarUsage.PRINCIPAL,
    placement: (initialUsage === BarUsage.COSTELA) ? 'distributed' : 'bottom',
    hookStartType: isSapata ? 'up' : 'none',
    hookEndType: isSapata ? 'up' : 'none',
    hookStart: defaultHook,
    hookEnd: defaultHook,
    position: ''
  });

  // Auto-expand item length if bars exceed it
  useEffect(() => {
    const bars = [...localItem.mainBars];
    if (newBar) bars.push(newBar);

    const maxExtent = bars.reduce((max, bar) => {
      const barLen = bar.segmentA || 0;
      const offset = bar.offset || 0;
      return Math.max(max, offset + barLen);
    }, 0);

    const extentM = maxExtent / 100;
    if (extentM > localItem.length) {
      setLocalItem(prev => ({ ...prev, length: extentM }));
    }
  }, [localItem.mainBars, newBar]);

  const [editingIndex, setEditingIndex] = useState<number | undefined>(barIdx);
  const [visualShape, setVisualShape] = useState<string>('straight');
  const [lastUsedSegmentA, setLastUsedSegmentA] = useState<number>(localItem.length);

  // Multi-position bar placement system - driven by newBar.count
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);

  // Sync edits if editingIndex changes
  useEffect(() => {
    if (editingIndex !== undefined && localItem.mainBars[editingIndex]) {
      const bar = localItem.mainBars[editingIndex];
      setNewBar(bar);

      // Infer visual shape
      if (bar.shape) {
        setVisualShape(bar.shape);
      } else {
        // Fallback inference for old bars
        if (bar.hookStartType === 'none' && bar.hookEndType === 'none') setVisualShape('straight');
        else if (bar.hookStartType === 'up' && bar.hookEndType === 'none') setVisualShape('l_left_up');
        else if (bar.hookStartType === 'none' && bar.hookEndType === 'up') setVisualShape('l_right_up');
        else if (bar.hookStartType === 'up' && bar.hookEndType === 'up') setVisualShape('u_up');
        else if (bar.hookStartType === 'down' && bar.hookEndType === 'none') setVisualShape('l_left_down');
        else if (bar.hookStartType === 'none' && bar.hookEndType === 'down') setVisualShape('l_right_down');
        else if (bar.hookStartType === 'down' && bar.hookEndType === 'down') setVisualShape('u_down');
        else setVisualShape('custom');
      }

      // Load existing positions for editing
      if (bar.pointIndices && bar.pointIndices.length > 0) {
        setSelectedPositions(bar.pointIndices);
      } else {
        setSelectedPositions([]);
      }
    } else {
      // RESET FORM FOR NEW BAR
      setNewBar({
        count: 0, // Force user input
        gauge: '10.0',
        usage: BarUsage.PRINCIPAL,
        hookStartType: 'none',
        hookEndType: 'none',
        hookStart: 0,
        hookEnd: 0,
        placement: 'bottom',
        segmentA: 0, // Force user input
        segmentB: 0,
        segmentC: 0,
        segmentD: 0,
        segmentE: 0,
        offset: 0,
        shape: 'straight'
      });
      setVisualShape('straight');
      setSelectedPositions([]);
    }
  }, [editingIndex, localItem.mainBars]);


  const handleAddOrUpdateBar = () => {
    const bars = [...localItem.mainBars];
    if (editingIndex !== undefined) {
      // Editing existing bar
      // Update with new data AND new positions
      bars[editingIndex] = {
        ...newBar,
        pointIndices: selectedPositions // Save the edited positions
      };
    } else {
      // Adding new bar(s) - multi-position mode with exact points
      // Logic: newBar.count dictates expected positions
      const count = newBar.count || 0;
      if (count > 0 && selectedPositions.length === count) {
        // Add ONE ENTRY for the group of bars
        bars.push({
          ...newBar,
          count: count, // Total count (e.g., 2)
          pointIndices: [...selectedPositions], // Store ALL selected points
          placement: undefined
        });

        // Reset form for next entry
        setNewBar({ ...newBar, count: 0, segmentA: 0, position: '' });
        setSelectedPositions([]);
      } else {
        // Should not happen due to button validation, but fallback
        console.warn("Attempted to add bars without matching positions");
      }
    }
    const updated = { ...localItem, mainBars: bars, isConfigured: true };
    setLocalItem(updated);
    // Save last used segmentA for quick reuse
    if (newBar.segmentA && newBar.segmentA > 0) {
      setLastUsedSegmentA(newBar.segmentA);
    }
    // Close edit mode if applicable
    if (editingIndex !== undefined) setEditingIndex(undefined);
  };

  const handleRemoveBar = (idx: number) => {
    const bars = localItem.mainBars.filter((_, i) => i !== idx);
    setLocalItem({ ...localItem, mainBars: bars });
    if (editingIndex === idx) setEditingIndex(undefined);
  };

  const handleDuplicateBar = (idx: number) => {
    const barToDuplicate = localItem.mainBars[idx];
    const bars = [...localItem.mainBars, { ...barToDuplicate }];
    setLocalItem({ ...localItem, mainBars: bars, isConfigured: true });
  };

  const handleSaveAll = () => {
    // Commit everything
    onUpdateItem(localItem);
  };

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to add/update bar (only if not in an input)
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleAddOrUpdateBar();
      }
      // Escape to close editor
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }

      // Arrow Keys for Movement (Offset)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = e.key === 'ArrowRight' ? step : -step;

        if (editingIndex !== undefined) {
          const currentOffset = newBar.offset || 0;
          const barLen = newBar.segmentA || 0;
          const totalLen = Math.round(localItem.length * 100);
          const maxOffset = Math.max(0, totalLen - barLen);
          const nextOffset = Math.max(0, Math.min(currentOffset + delta, maxOffset));

          if (nextOffset !== currentOffset) {
            setNewBar(prev => ({ ...prev, offset: nextOffset }));
            setLocalItem(prevItem => {
              const newBars = [...prevItem.mainBars];
              if (newBars[editingIndex]) {
                newBars[editingIndex] = { ...newBars[editingIndex], offset: nextOffset };
              }
              return { ...prevItem, mainBars: newBars };
            });
          }
        } else {
          // Handle movement for the NEW bar being added
          setNewBar(prev => {
            const currentOffset = prev.offset || 0;
            const barLen = prev.segmentA || 0;
            const totalLen = Math.round(localItem.length * 100);
            const maxOffset = Math.max(0, totalLen - barLen);
            const nextOffset = Math.max(0, Math.min(currentOffset + delta, maxOffset));
            return { ...prev, offset: nextOffset };
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddOrUpdateBar, onCancel, editingIndex, newBar, localItem.length]);


  // Helper for Hook Selector
  const HookSelector: React.FC<{ label: string, current: HookType, onChange: (t: HookType) => void }> = ({ label, current, onChange }) => (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
        {(['none', 'up', 'down'] as HookType[]).map(t => (
          <button key={t} onClick={() => onChange(t)} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${current === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
            {t === 'none' ? 'Reto' : t === 'up' ? '↑' : '↓'}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 z-[250] flex animate-in fade-in duration-300">

      {/* LEFT SIDE: MASSIVE VISUALIZATION (75%) */}
      <div className="flex-grow flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 relative">

        {/* Top Bar */}
        <div className="flex-none h-14 px-6 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-amber-500/30">
              {localItem.type.charAt(0)}
            </div>
            <div>
              <h2 className="font-black text-white text-lg tracking-tight">Detalhamento Profissional</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{localItem.observation || localItem.type} • Escala 1:100</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Barras</p>
              <p className="text-2xl font-black text-white leading-none">{localItem.mainBars.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Peso</p>
              <p className="text-2xl font-black text-white leading-none">
                {localItem.mainBars.reduce((acc, bar) => {
                  const weightPerMeter = STEEL_WEIGHTS[bar.gauge] || 0;
                  const baseLenM = (bar.segmentA || 0) / 100;
                  const extraM = ((bar.segmentB || 0) + (bar.segmentC || 0) + (bar.segmentD || 0) + (bar.segmentE || 0)) / 100;
                  return acc + (bar.count * (baseLenM + extraM) * weightPerMeter);
                }, 0).toFixed(1)}<span className="text-sm text-slate-400 ml-1">kg</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-all">Cancelar</button>
            <button onClick={handleSaveAll} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-black uppercase tracking-wide hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 transform active:scale-95 transition-all">✓ Salvar</button>
          </div>
        </div>

        {/* MAIN DRAWING AREA */}
        <div className="flex-grow overflow-auto custom-scrollbar p-8 relative">
          <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 p-8 min-h-full border border-slate-200">
            {localItem.type === 'Pilar' || localItem.type === 'Broca' ?
              <ColumnElevationView
                item={localItem}
                onEditBar={(idx) => setEditingIndex(idx)}
                onRemoveBar={handleRemoveBar}
                onBarUpdate={(idx, offset) => {
                  const bars = [...localItem.mainBars];
                  if (bars[idx]) {
                    bars[idx] = { ...bars[idx], offset };
                    setLocalItem({ ...localItem, mainBars: bars, isConfigured: true });
                    if (editingIndex === idx) { setNewBar(prev => ({ ...prev, offset })); }
                  }
                }}
                newBar={editingIndex === undefined ? newBar : undefined}
                onNewBarUpdate={(offset) => setNewBar(prev => ({ ...prev, offset }))}
                selectedIdx={editingIndex}
                readOnly={false}
              />
              :
              <BeamElevationView item={localItem} newBar={editingIndex === undefined ? newBar : undefined} onNewBarUpdate={(offset) => setNewBar(prev => ({ ...prev, offset }))} onEditBar={(idx) => setEditingIndex(idx)} onRemoveBar={handleRemoveBar} selectedIdx={editingIndex} onBarUpdate={(idx, offset) => { const bars = [...localItem.mainBars]; if (bars[idx]) { bars[idx] = { ...bars[idx], offset }; setLocalItem({ ...localItem, mainBars: bars, isConfigured: true }); if (editingIndex === idx) { setNewBar(prev => ({ ...prev, offset })); } } }} readOnly={false} />
            }
          </div>
        </div>

        {/* Bottom Bar - Added Items as Pills */}
        <div className="flex-none h-20 px-6 py-3 border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm overflow-x-auto">
          <div className="flex items-center gap-3 h-full">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Itens:</span>
            {localItem.mainBars.length === 0 && <span className="text-slate-600 text-sm font-bold">Nenhum ferro adicionado</span>}
            {localItem.mainBars.map((bar, idx) => (
              <div key={idx} onClick={() => setEditingIndex(idx)} className={`shrink-0 flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-all ${editingIndex === idx ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                <span className="font-black text-lg">{bar.count}x</span>
                <div>
                  <p className="font-black text-sm leading-none">Ø{bar.gauge}mm</p>
                  <p className="text-[9px] opacity-70 font-bold">{bar.position || `N${idx + 1}`} • {bar.placement === 'top' ? 'Sup' : 'Inf'}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveBar(idx); }} className="ml-2 p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CONTROLS (650px - WIDER) */}
      <div className="w-[650px] shrink-0 bg-white flex flex-col border-l border-slate-200 shadow-2xl">

        {/* TOP ROW: Cross Section + Stirrups SIDE BY SIDE */}
        <div className="h-[480px] shrink-0 p-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 flex gap-4">

          {/* LEFT: Cross Section */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Seção Transversal</h4>
              <span className="text-[10px] font-bold text-slate-400">Clique p/ posicionar</span>
            </div>
            <div className="flex-grow flex items-center justify-center bg-white rounded-2xl border-2 border-slate-200 overflow-hidden relative">
              {/* Multi-position indicator */}
              {selectedPositions.length > 0 && (
                <div className="absolute top-2 right-2 bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-bold z-10 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedPositions.length} de {newBar.count || 0} posicionados
                </div>
              )}
              <div className="transform scale-[1.5]">
                <CompositeCrossSection
                  stirrupW={localItem.stirrupWidth}
                  stirrupH={localItem.stirrupHeight}
                  // Filter out the bar being edited so its points are "Available" and not "Occupied"
                  bars={editingIndex !== undefined ? localItem.mainBars.filter((_, i) => i !== editingIndex) : localItem.mainBars}
                  stirrupPos={localItem.stirrupPosition}
                  stirrupGauge={localItem.stirrupGauge}
                  model={localItem.stirrupModel || 'rect'}
                  // Always show points if we have a quantity to place
                  showAvailablePoints={(newBar.count || 0) > 0}
                  selectedPointIndices={selectedPositions}
                  onPointClick={(pointIndex) => {
                    const max = newBar.count || 0;
                    if (selectedPositions.includes(pointIndex)) {
                      // Deselect
                      setSelectedPositions(selectedPositions.filter(p => p !== pointIndex));
                    } else {
                      // Select if under max
                      if (selectedPositions.length < max) {
                        setSelectedPositions([...selectedPositions, pointIndex]);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Stirrups Config */}
          <div className="w-[240px] shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Estribos
              </h4>
              <input type="checkbox" checked={localItem.hasStirrups} onChange={e => setLocalItem({ ...localItem, hasStirrups: e.target.checked })} className="toggle-checkbox" />
            </div>
            {localItem.hasStirrups && (
              <div className="flex-grow bg-amber-50 rounded-2xl border-2 border-amber-200 p-3 flex flex-col gap-2">
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">Modelo</label>
                  <select value={localItem.stirrupModel || 'rect'} onChange={e => setLocalItem({ ...localItem, stirrupModel: e.target.value as any })} className="w-full p-2 bg-white border-2 border-amber-300 rounded-xl text-xs font-black">
                    <option value="rect">Retangular (Padrão)</option>
                    <option value="pentagon">Pentagonal (M2)</option>
                    <option value="triangle">Triangular (M3)</option>
                    <option value="circle">Circular (M4)</option>
                    <option value="hexagon">Hexagonal (M5)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">Bitola</label>
                  <select value={localItem.stirrupGauge} onChange={e => setLocalItem({ ...localItem, stirrupGauge: e.target.value })} className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl text-lg font-black">
                    {GAUGES.map(g => <option key={g} value={g}>Ø {g}mm</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">Espaçamento</label>
                  <input type="number" value={localItem.stirrupSpacing} onChange={e => setLocalItem({ ...localItem, stirrupSpacing: Number(e.target.value) })} placeholder="15" className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl text-lg font-black text-center" />
                </div>
                {!isSapata && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className={localItem.stirrupModel === 'circle' ? "col-span-2" : ""}>
                      <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">
                        {localItem.stirrupModel === 'circle' ? 'Diâmetro (A)'
                          : localItem.stirrupModel === 'triangle' ? 'Base (A)'
                            : localItem.stirrupModel === 'hexagon' ? 'Largura Total (A)'
                              : 'Largura (A)'}
                      </label>
                      <input type="number" value={localItem.stirrupWidth} onChange={e => setLocalItem({ ...localItem, stirrupWidth: Number(e.target.value) })} className="w-full p-2 bg-white border-2 border-amber-300 rounded-xl text-base font-black text-center" />
                    </div>
                    {localItem.stirrupModel !== 'circle' && (
                      <div>
                        <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">
                          {localItem.stirrupModel === 'triangle' ? 'Altura (B)'
                            : localItem.stirrupModel === 'pentagon' ? 'Altura Total (B)'
                              : 'Altura (B)'}
                        </label>
                        <input type="number" value={localItem.stirrupHeight} onChange={e => setLocalItem({ ...localItem, stirrupHeight: Number(e.target.value) })} className="w-full p-2 bg-white border-2 border-amber-300 rounded-xl text-base font-black text-center" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {!localItem.hasStirrups && (
              <div className="flex-grow bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-sm font-bold">Desativado</span>
              </div>
            )}
          </div>
        </div>

        {/* FORM - NO SCROLL */}
        <div className="flex-grow p-4 flex flex-col">

          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <h4 className={`font-black uppercase text-xs tracking-widest ${editingIndex !== undefined ? 'text-amber-600' : 'text-indigo-600'}`}>
              {editingIndex !== undefined ? `Editando #${editingIndex + 1}` : 'Adicionar Ferro'}
            </h4>
            {editingIndex !== undefined && <button onClick={() => setEditingIndex(undefined)} className="text-[10px] font-bold text-red-500 hover:underline">✕ Cancelar</button>}
          </div>

          {/* Row 1: Qtd + Bitola + Pos + Comprimento (LARGER) */}
          <div className="grid grid-cols-5 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block">Qtd</label>
              <input
                type="number"
                min="1"
                value={newBar.count || ''}
                onChange={e => {
                  const val = Number(e.target.value);
                  setNewBar({ ...newBar, count: val });
                  // Reset positions when count changes to enforce precise selection
                  setSelectedPositions([]);
                }}
                placeholder="0"
                className={`w-full p-3 border-2 rounded-xl font-black text-2xl text-center outline-none transition-all ${!newBar.count ? 'border-amber-300 bg-amber-50 focus:border-amber-500' : 'bg-slate-50 border-slate-300 focus:border-indigo-500'}`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block">Bitola</label>
              <select value={newBar.gauge} onChange={e => setNewBar({ ...newBar, gauge: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-300 rounded-xl font-black text-base outline-none focus:border-indigo-500">
                {GAUGES.map(g => <option key={g} value={g}>{g}mm</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-600 uppercase block">Pos.</label>
              <input type="text" value={newBar.position || ''} onChange={e => setNewBar({ ...newBar, position: e.target.value })} placeholder="N1" className="w-full p-3 bg-slate-50 border-2 border-slate-300 rounded-xl font-black text-base text-center outline-none focus:border-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black text-indigo-600 uppercase block">Comp. A (cm)</label>
              <input
                type="number"
                value={newBar.segmentA || ''}
                onChange={e => setNewBar({ ...newBar, segmentA: Number(e.target.value) })}
                placeholder="0"
                className={`w-full p-3 border-2 rounded-xl font-black text-2xl text-center outline-none transition-all ${!newBar.segmentA ? 'border-amber-300 bg-amber-50 text-slate-400 focus:border-amber-500' : 'bg-indigo-50 border-indigo-400 text-indigo-700 focus:border-indigo-500'}`}
              />
            </div>
          </div>

          {/* Quick Reuse */}
          {lastUsedSegmentA && lastUsedSegmentA !== newBar.segmentA && (
            <button onClick={() => setNewBar({ ...newBar, segmentA: lastUsedSegmentA })} className="mb-2 w-full py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded text-[10px] font-bold hover:bg-amber-100">↩ Usar último: {lastUsedSegmentA}cm</button>
          )}

// Shapes
          <div className="mb-2">
            <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Formato {isVertical ? '(Vertical)' : ''}</label>
            <div className="flex gap-1">
              {[
                { s: 'straight', svg: 'M2,12 L22,12', svgVert: 'M12,22 L12,2' },
                { s: 'l_left_up', svg: 'M4,4 L4,12 L20,12', svgVert: 'M18,22 L12,22 L12,2' },
                { s: 'l_right_up', svg: 'M4,12 L20,12 L20,4', svgVert: 'M12,22 L12,2 L18,2' },
                { s: 'u_up', svg: 'M4,4 L4,16 L28,16 L28,4', w: 32, svgVert: 'M18,22 L12,22 L12,2 L18,2' },
                { s: 'c_up', svg: 'M8,8 L4,8 L4,16 L28,16 L28,8 L24,8', w: 32, svgVert: 'M18,18 L18,22 L12,22 L12,2 L18,2 L18,6' },
                { s: 'l_left_down', svg: 'M4,20 L4,12 L20,12', svgVert: 'M6,22 L12,22 L12,2' },
                { s: 'l_right_down', svg: 'M4,12 L20,12 L20,20', svgVert: 'M12,22 L12,2 L6,2' },
                { s: 'u_down', svg: 'M4,20 L4,8 L28,8 L28,20', w: 32, svgVert: 'M6,22 L12,22 L12,2 L6,2' },
                { s: 'c_down', svg: 'M8,16 L4,16 L4,8 L28,8 L28,16 L24,16', w: 32, svgVert: 'M6,18 L6,22 L12,22 L12,2 L6,2 L6,6' }
              ].map(sh => (
                <button key={sh.s} onClick={() => { const hS = newBar.hookStart || 20; const hE = newBar.hookEnd || 20; const isC = sh.s.startsWith('c_'); setNewBar({ ...newBar, hookStartType: sh.s.includes('left') || sh.s.includes('u_') || isC ? (sh.s.includes('down') ? 'down' : 'up') : 'none', hookEndType: sh.s.includes('right') || sh.s.includes('u_') || isC ? (sh.s.includes('down') ? 'down' : 'up') : 'none', hookStart: sh.s.includes('left') || sh.s.includes('u_') || isC ? hS : 0, hookEnd: sh.s.includes('right') || sh.s.includes('u_') || isC ? hE : 0, shape: sh.s, segmentB: sh.s.includes('left') || sh.s.includes('u_') || isC ? hS : 0, segmentC: sh.s.includes('right') || sh.s.includes('u_') || isC ? hE : 0, segmentD: isC ? (newBar.segmentD || 10) : 0, segmentE: isC ? (newBar.segmentE || 10) : 0 }); setVisualShape(sh.s); }} className={`flex-1 h-9 rounded-lg border flex items-center justify-center transition-all ${visualShape === sh.s ? 'border-indigo-600 bg-indigo-100 text-indigo-600' : 'border-slate-200 text-slate-400 hover:border-indigo-300'}`}>
                  <svg width={sh.w ? 16 : 14} height="14" viewBox={`0 0 ${sh.w || 24} 24`} className="stroke-current stroke-2 fill-none"><path d={isVertical ? (sh.svgVert || sh.svg) : sh.svg} /></svg>
                </button>
              ))}
            </div>
          </div>

          {/* Segments B/C/D/E in one row */}
          {(['l_left_up', 'l_left_down', 'u_up', 'u_down', 'c_up', 'c_down', 'l_right_up', 'l_right_down'].includes(visualShape)) && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['l_left_up', 'l_left_down', 'u_up', 'u_down', 'c_up', 'c_down'].includes(visualShape) && (
                <div><label className="text-[8px] font-black text-slate-500 uppercase block">B (cm)</label><input type="number" value={newBar.segmentB || newBar.hookStart || ''} onChange={e => { const val = Number(e.target.value); setNewBar({ ...newBar, segmentB: val, hookStart: val }); }} placeholder="20" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm text-center outline-none focus:border-indigo-500" /></div>
              )}
              {['u_up', 'u_down', 'c_up', 'c_down', 'l_right_up', 'l_right_down'].includes(visualShape) && (
                <div><label className="text-[8px] font-black text-slate-500 uppercase block">C (cm)</label><input type="number" value={newBar.segmentC || newBar.hookEnd || ''} onChange={e => { const val = Number(e.target.value); setNewBar({ ...newBar, segmentC: val, hookEnd: val }); }} placeholder="20" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm text-center outline-none focus:border-indigo-500" /></div>
              )}
              {['c_up', 'c_down'].includes(visualShape) && (
                <>
                  <div><label className="text-[8px] font-black text-slate-500 uppercase block">D (cm)</label><input type="number" value={newBar.segmentD || ''} onChange={e => setNewBar({ ...newBar, segmentD: Number(e.target.value) })} placeholder="10" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm text-center outline-none focus:border-indigo-500" /></div>
                  <div><label className="text-[8px] font-black text-slate-500 uppercase block">E (cm)</label><input type="number" value={newBar.segmentE || ''} onChange={e => setNewBar({ ...newBar, segmentE: Number(e.target.value) })} placeholder="10" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-sm text-center outline-none focus:border-indigo-500" /></div>
                </>
              )}
            </div>
          )}

          {/* Preview + Add Button */}
          <div className="mt-auto">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black">{newBar.count}x Ø{newBar.gauge}</span>
                {newBar.segmentA && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black">{((newBar.segmentA || 0) + (newBar.segmentB || 0) + (newBar.segmentC || 0))}cm</span>}
              </div>
              <div className={`flex items-center justify-center ${isVertical ? 'w-[40px] h-[100px]' : 'w-[100px] h-[40px]'}`}>
                <div className={`transform scale-75 transition-transform ${isVertical ? '-rotate-90' : ''}`}>
                  <BarDrawing compact length={(newBar.segmentA || 0) / 100} hookStart={newBar.segmentB || newBar.hookStart || 0} hookEnd={newBar.segmentC || newBar.hookEnd || 0} startType={newBar.hookStartType} endType={newBar.hookEndType} shape={visualShape} segmentD={newBar.segmentD} segmentE={newBar.segmentE} />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddOrUpdateBar}
              disabled={(!newBar.segmentA || newBar.segmentA <= 0) || (!newBar.count || newBar.count <= 0) || (editingIndex === undefined && selectedPositions.length !== (newBar.count || 0))}
              className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${(!newBar.segmentA || newBar.segmentA <= 0 || !newBar.count || newBar.count <= 0 || (editingIndex === undefined && selectedPositions.length !== (newBar.count || 0))) ? 'bg-slate-300 cursor-not-allowed opacity-70 text-slate-500' : (editingIndex !== undefined ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white')}`}
            >
              {editingIndex !== undefined ? '✓ Atualizar' : (
                (!newBar.count || newBar.count <= 0) ? 'Defina Qtd > 0' :
                  (selectedPositions.length !== (newBar.count || 0) ? `Selecione Pontos (${selectedPositions.length}/${newBar.count})` : '+ Adicionar Ferro')
              )}
            </button>
          </div>

        </div>

        {/* APOIOS (Supports) Section */}
        <div className="p-4 border-t border-slate-200 bg-gradient-to-b from-blue-50 to-white max-h-64 overflow-y-auto">
          <h4 className="font-black uppercase text-xs tracking-widest text-blue-600 mb-3">
            {isVertical ? 'Esperas e Vãos (Estribos)' : 'Vãos e Apoios'}
          </h4>

          {/* Beam Extremity Gaps */}
          <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-white rounded-lg border border-blue-200">
            <div>
              <label className="text-[8px] text-blue-600 font-bold block">
                {isVertical ? 'Vão Inferior (cm)' : 'Vão Início (cm)'}
              </label>
              <input
                type="number"
                value={localItem.startGap || ''}
                onChange={e => setLocalItem({ ...localItem, startGap: Number(e.target.value) })}
                placeholder="40"
                className="w-full p-1 text-xs font-bold text-center border border-blue-300 rounded"
              />
            </div>
            <div>
              <label className="text-[8px] text-blue-600 font-bold block">
                {isVertical ? 'Vão Superior (cm)' : 'Vão Final (cm)'}
              </label>
              <input
                type="number"
                value={localItem.endGap || ''}
                onChange={e => setLocalItem({ ...localItem, endGap: Number(e.target.value) })}
                placeholder="20"
                className="w-full p-1 text-xs font-bold text-center border border-blue-300 rounded"
              />
            </div>
          </div>

          {/* Support List Header - Only for Non-Vertical (Beams) */}
          {!isVertical && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold text-pink-600 uppercase">Apoios Intermediários</span>
                <button
                  onClick={() => {
                    const newSupport = { position: localItem.length * 50, width: 20, leftGap: 20, rightGap: 20, label: `P${(localItem.supports?.length || 0) + 1}` };
                    setLocalItem({ ...localItem, supports: [...(localItem.supports || []), newSupport] });
                  }}
                  className="px-2 py-0.5 rounded bg-pink-500 text-white text-[9px] font-bold hover:bg-pink-600"
                >
                  + Apoio
                </button>
              </div>

              {(!localItem.supports || localItem.supports.length === 0) ? (
                <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50 rounded border border-dashed border-slate-200">Nenhum apoio intermediário</p>
              ) : (
                <div className="space-y-2">
                  {localItem.supports.map((support, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-pink-200">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={support.label || ''}
                          onChange={e => {
                            const supports = [...(localItem.supports || [])];
                            supports[idx] = { ...supports[idx], label: e.target.value };
                            setLocalItem({ ...localItem, supports });
                          }}
                          placeholder="P1"
                          className="w-14 p-1 text-xs font-bold text-center border border-pink-300 rounded bg-pink-50"
                        />
                        <div className="flex-1">
                          <label className="text-[7px] text-pink-600 font-bold">Posição (cm)</label>
                          <input
                            type="number"
                            value={support.position}
                            onChange={e => {
                              const supports = [...(localItem.supports || [])];
                              supports[idx] = { ...supports[idx], position: Number(e.target.value) };
                              setLocalItem({ ...localItem, supports });
                            }}
                            className="w-full p-1 text-xs font-bold text-center border border-pink-300 rounded"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const supports = (localItem.supports || []).filter((_, i) => i !== idx);
                            setLocalItem({ ...localItem, supports });
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {/* Gap fields */}
                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <label className="text-[7px] text-blue-600 font-bold">Vão ← (cm)</label>
                          <input
                            type="number"
                            value={support.leftGap || ''}
                            onChange={e => {
                              const supports = [...(localItem.supports || [])];
                              supports[idx] = { ...supports[idx], leftGap: Number(e.target.value) };
                              setLocalItem({ ...localItem, supports });
                            }}
                            placeholder="20"
                            className="w-full p-1 text-xs font-bold text-center border border-blue-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[7px] text-gray-500 font-bold">Largura (cm)</label>
                          <input
                            type="number"
                            value={support.width}
                            onChange={e => {
                              const supports = [...(localItem.supports || [])];
                              supports[idx] = { ...supports[idx], width: Number(e.target.value) };
                              setLocalItem({ ...localItem, supports });
                            }}
                            className="w-full p-1 text-xs font-bold text-center border border-gray-300 rounded bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="text-[7px] text-blue-600 font-bold">Vão → (cm)</label>
                          <input
                            type="number"
                            value={support.rightGap || ''}
                            onChange={e => {
                              const supports = [...(localItem.supports || [])];
                              supports[idx] = { ...supports[idx], rightGap: Number(e.target.value) };
                              setLocalItem({ ...localItem, supports });
                            }}
                            placeholder="20"
                            className="w-full p-1 text-xs font-bold text-center border border-blue-300 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default QuoteBuilder;

