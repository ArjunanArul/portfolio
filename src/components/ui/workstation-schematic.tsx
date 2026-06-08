import React, { useRef, useEffect, useState } from 'react';

// --- Types ---
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Face3D {
  v0: Point3D;
  v1: Point3D;
  v2: Point3D;
  v3: Point3D;
}

interface WorkstationSchematicProps {
  fullscreen?: boolean;
  onBackToPortfolio?: () => void;
}

export function WorkstationSchematic({ fullscreen = false, onBackToPortfolio }: WorkstationSchematicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: -0.4, y: 0.8 }); // initial angles in radians
  const [zoom, setZoom] = useState(1.1);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  
  // Dashboard Status Simulation
  const [fps, setFps] = useState(60);
  const [time, setTime] = useState("");
  const [logs, setLogs] = useState<string[]>([
    "SYS INIT: WORKSTATION DIGITAL TWIN",
    "RESOLVED: Cartesian projection matrices",
    "GRID STATUS: Active on X-Z plane",
    "GRATICULES: Concentric polar grids linked",
  ]);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotStartRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: -0.4, y: 0.8 });
  const zoomRef = useRef(1.1);
  
  // Sync refs with state for use in animation frame
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate dashboard logs
  useEffect(() => {
    const logPool = [
      "DIAGNOSTIC: Render cycle completed",
      "ORBIT: Auto-rotation yaw active",
      "ZOOM_LEVEL: Syncing orthographic scale",
      "MESH: Redrawing 4,200 halftone vertices",
      "OUTLINES: Vector silhouette rasterized",
      "SIGNAL: Heartbeat nominal",
      "TELEMETRY: Bounding sphere tracking active",
      "DESK_GRID: Rendering Z-depth guidelines",
    ];
    const interval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      setLogs(prev => [randomLog, prev[0], prev[1], prev[2]].slice(0, 4));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // --- Geometry Generators ---
  
  // Helper to create a 3D box
  const makeBox = (cx: number, cy: number, cz: number, w: number, h: number, d: number): { lines: [Point3D, Point3D][], faces: Face3D[] } => {
    const w2 = w / 2;
    const h2 = h / 2;
    const d2 = d / 2;

    const vertices: Point3D[] = [
      { x: cx - w2, y: cy - h2, z: cz - d2 }, // 0
      { x: cx + w2, y: cy - h2, z: cz - d2 }, // 1
      { x: cx + w2, y: cy + h2, z: cz - d2 }, // 2
      { x: cx - w2, y: cy + h2, z: cz - d2 }, // 3
      { x: cx - w2, y: cy - h2, z: cz + d2 }, // 4
      { x: cx + w2, y: cy - h2, z: cz + d2 }, // 5
      { x: cx + w2, y: cy + h2, z: cz + d2 }, // 6
      { x: cx - w2, y: cy + h2, z: cz + d2 }, // 7
    ];

    const lines: [Point3D, Point3D][] = [
      [vertices[0], vertices[1]], [vertices[1], vertices[2]], [vertices[2], vertices[3]], [vertices[3], vertices[0]], // front
      [vertices[4], vertices[5]], [vertices[5], vertices[6]], [vertices[6], vertices[7]], [vertices[7], vertices[4]], // back
      [vertices[0], vertices[4]], [vertices[1], vertices[5]], [vertices[2], vertices[6]], [vertices[3], vertices[7]], // sides
    ];

    const faces: Face3D[] = [
      { v0: vertices[0], v1: vertices[1], v2: vertices[2], v3: vertices[3] }, // front
      { v0: vertices[4], v1: vertices[5], v2: vertices[6], v3: vertices[7] }, // back
      { v0: vertices[0], v1: vertices[1], v2: vertices[5], v3: vertices[4] }, // bottom
      { v0: vertices[3], v1: vertices[2], v2: vertices[6], v3: vertices[7] }, // top
      { v0: vertices[0], v1: vertices[3], v2: vertices[7], v3: vertices[4] }, // left
      { v0: vertices[1], v1: vertices[2], v2: vertices[6], v3: vertices[5] }, // right
    ];

    return { lines, faces };
  };

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCountLocal = 0;

    // Build the parts of the computer workstation
    // Center of desk is (0, -70, 0)
    const deskY = -70;

    const parts = [
      // PC Tower (on the right)
      makeBox(90, deskY + 40, -10, 32, 80, 70),
      
      // Monitor Screen (centered, elevated)
      makeBox(0, deskY + 75, -20, 130, 80, 8),
      // Monitor Bezel stand base
      makeBox(0, deskY + 5, -20, 35, 10, 35),
      // Monitor stand vertical stem
      makeBox(0, deskY + 30, -21, 12, 45, 8),

      // Keyboard (in front of monitor)
      makeBox(-10, deskY + 3, 35, 90, 6, 30),

      // Mouse (to the right of keyboard)
      makeBox(50, deskY + 3, 38, 12, 6, 20),
    ];

    // Collect all lines and generate dots on faces
    const allLines: [Point3D, Point3D][] = [];
    const allDots: Point3D[] = [];
    const dotSpacing = 8; // distance in pixels between dots

    // Helper to generate dots on a face
    const generateDotsForFace = (face: Face3D) => {
      const getDist = (p1: Point3D, p2: Point3D) => {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
      };

      const lerp = (p1: Point3D, p2: Point3D, t: number): Point3D => {
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t,
          z: p1.z + (p2.z - p1.z) * t,
        };
      };

      const d01 = getDist(face.v0, face.v1);
      const d03 = getDist(face.v0, face.v3);

      const stepsX = Math.max(2, Math.floor(d01 / dotSpacing));
      const stepsY = Math.max(2, Math.floor(d03 / dotSpacing));

      // Skip drawing dots on duplicate surfaces or optimize density
      for (let i = 1; i < stepsX; i++) {
        const tX = i / stepsX;
        const pLeft = lerp(face.v0, face.v1, tX);
        const pRight = lerp(face.v3, face.v2, tX);
        for (let j = 1; j < stepsY; j++) {
          const tY = j / stepsY;
          allDots.push(lerp(pLeft, pRight, tY));
        }
      }
    };

    parts.forEach(part => {
      allLines.push(...part.lines);
      part.faces.forEach(face => {
        generateDotsForFace(face);
      });
    });

    // Bounding grids & circles (globe style graticules)
    const graticuleCircles: Point3D[][] = [];
    const sphereRadius = 150;
    
    // 3D Polar rings
    // Horizontal rings (latitudes)
    const ringHeights = [-100, -50, 0, 50, 100];
    ringHeights.forEach(h => {
      const r = Math.sqrt(Math.max(0, sphereRadius ** 2 - h ** 2));
      const ring: Point3D[] = [];
      for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 16) {
        ring.push({
          x: Math.cos(theta) * r,
          y: h - 10,
          z: Math.sin(theta) * r
        });
      }
      graticuleCircles.push(ring);
    });

    // Vertical meridian rings
    const meridianAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
    meridianAngles.forEach(angle => {
      const ring: Point3D[] = [];
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      for (let theta = 0; theta < Math.PI * 2; theta += Math.PI / 16) {
        ring.push({
          x: Math.cos(theta) * sphereRadius * cosAngle,
          y: Math.sin(theta) * sphereRadius - 10,
          z: Math.cos(theta) * sphereRadius * sinAngle
        });
      }
      graticuleCircles.push(ring);
    });

    // Desk surface horizontal grid lines
    const deskGridLines: [Point3D, Point3D][] = [];
    const gridRange = 160;
    const gridSpacing = 40;
    for (let g = -gridRange; g <= gridRange; g += gridSpacing) {
      // Lines along Z
      deskGridLines.push([
        { x: g, y: deskY, z: -gridRange },
        { x: g, y: deskY, z: gridRange }
      ]);
      // Lines along X
      deskGridLines.push([
        { x: -gridRange, y: deskY, z: g },
        { x: gridRange, y: deskY, z: g }
      ]);
    }

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Auto rotation increment
      if (isAutoRotating && !isDragging) {
        rotationRef.current.y += 0.003;
      }

      // Projection Math
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);
      const zoomVal = zoomRef.current;

      const project = (p: Point3D) => {
        // Rotate around Y (Yaw)
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;

        // Rotate around X (Pitch)
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        // Orthographic scale
        const screenX = w / 2 + x1 * zoomVal;
        const screenY = h / 2 - y2 * zoomVal; // invert Y

        return { x: screenX, y: screenY, z: z2 };
      };

      // Draw Desk Grid (Background plane)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      deskGridLines.forEach(line => {
        const p1 = project(line[0]);
        const p2 = project(line[1]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw Globe Graticule circles (wireframe globe enclosure)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      graticuleCircles.forEach(ring => {
        ctx.beginPath();
        ring.forEach((p, idx) => {
          const projected = project(p);
          if (idx === 0) {
            ctx.moveTo(projected.x, projected.y);
          } else {
            ctx.lineTo(projected.x, projected.y);
          }
        });
        ctx.closePath();
        ctx.stroke();
      });

      // Draw Halftone Gray Dots inside computer surfaces
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // gray dots
      allDots.forEach(p => {
        const projected = project(p);
        // Clip dots outside screen bounding box to avoid random floating
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Clean White Vector Outlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'; // white outlines
      ctx.lineWidth = 1.2;
      allLines.forEach(line => {
        const p1 = project(line[0]);
        const p2 = project(line[1]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw axis indicators
      const axisLen = 40;
      const origin = { x: -160, y: -160, z: 0 };
      const xAxis = project({ x: origin.x + axisLen, y: origin.y, z: origin.z });
      const yAxis = project({ x: origin.x, y: origin.y + axisLen, z: origin.z });
      const zAxis = project({ x: origin.x, y: origin.y, z: origin.z + axisLen });
      const originProj = project(origin);

      ctx.lineWidth = 1;
      // X Axis (Reddish/White)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(originProj.x, originProj.y);
      ctx.lineTo(xAxis.x, xAxis.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '9px monospace';
      ctx.fillText('X', xAxis.x + 3, xAxis.y + 3);

      // Y Axis
      ctx.beginPath();
      ctx.moveTo(originProj.x, originProj.y);
      ctx.lineTo(yAxis.x, yAxis.y);
      ctx.stroke();
      ctx.fillText('Y', yAxis.x - 2, yAxis.y - 4);

      // Z Axis
      ctx.beginPath();
      ctx.moveTo(originProj.x, originProj.y);
      ctx.lineTo(zAxis.x, zAxis.y);
      ctx.stroke();
      ctx.fillText('Z', zAxis.x + 3, zAxis.y + 3);

      // Calculate FPS
      frameCountLocal++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCountLocal);
        frameCountLocal = 0;
        lastTime = now;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isAutoRotating, isDragging]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Mouse & Touch Events for Rotation & Zoom ---

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rotStartRef.current = { ...rotation };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    
    // Scale factor for mouse drag rotation (radians per pixel)
    const scale = 0.007;
    setRotation({
      x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotStartRef.current.x - deltaY * scale)),
      y: rotStartRef.current.y + deltaX * scale
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.4, Math.min(2.2, prev - e.deltaY * 0.001)));
  };

  const toggleAutoRotate = () => {
    setIsAutoRotating(prev => !prev);
  };

  const resetView = () => {
    setRotation({ x: -0.4, y: 0.8 });
    setZoom(1.1);
  };

  return (
    <div 
      ref={containerRef}
      className={fullscreen 
        ? "w-screen h-screen bg-black overflow-hidden relative group cursor-grab active:cursor-grabbing select-none animate-fadeIn"
        : "w-full h-[600px] bg-black border border-white/5 rounded-3xl overflow-hidden relative group cursor-grab active:cursor-grabbing select-none"
      }
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas 
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Grid overlay for blueprint aesthetics */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Dashboard Top Header Overlay */}
      <div className="absolute top-6 left-6 right-6 flex justify-between pointer-events-none select-none font-mono text-[0.65rem] tracking-wider text-white/50 z-20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 pointer-events-auto">
            {fullscreen && onBackToPortfolio && (
              <button 
                onClick={(e) => { e.stopPropagation(); onBackToPortfolio(); }}
                className="mr-3 px-2 py-1 bg-white/5 border border-white/10 hover:bg-white/15 text-white rounded font-mono text-[0.55rem] tracking-widest uppercase transition-all duration-300 cursor-pointer"
              >
                &larr; Back to Portfolio
              </button>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-white font-bold uppercase">Workstation Twin // {fullscreen ? "Dedicated Console" : "Active"}</span>
          </div>
          <div className={fullscreen ? "pl-0 md:pl-0" : ""}>LOC: MACE.CSE.LAB.X02</div>
        </div>
        <div className="text-right flex flex-col gap-1">
          <div>TIME: {time || "00:00:00"}</div>
          <div>FPS: {fps} // RENDERING: ORTHO_D3</div>
        </div>
      </div>

      {/* Dashboard Bottom Logs Console Overlay */}
      <div className="absolute bottom-6 left-6 pointer-events-none select-none font-mono text-[0.6rem] tracking-wider text-white/30 z-20 space-y-1 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm max-w-[280px] sm:max-w-xs">
        <div className="text-[0.65rem] font-bold text-white/60 uppercase border-b border-white/10 pb-1 mb-2">System Console Logs</div>
        {logs.map((log, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-indigo-400">&gt;</span>
            <span className={index === 0 ? "text-white/70" : "text-white/30"}>{log}</span>
          </div>
        ))}
      </div>

      {/* View Presets HUD Overlay */}
      <div className="absolute bottom-20 left-6 right-6 flex flex-wrap gap-1.5 md:bottom-6 md:left-auto md:right-[260px] md:flex-nowrap md:gap-2 z-30 select-none pointer-events-auto">
        <span className="self-center font-mono text-[0.55rem] md:text-[0.6rem] text-white/40 tracking-wider uppercase mr-1 hidden sm:inline">Preset:</span>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsAutoRotating(false); setRotation({ x: -0.4, y: 0.8 }); }}
          className="px-2 py-1 rounded-md bg-black/40 border border-white/10 font-mono text-[0.55rem] tracking-wider uppercase text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer"
        >
          Iso
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsAutoRotating(false); setRotation({ x: 0, y: 0 }); }}
          className="px-2 py-1 rounded-md bg-black/40 border border-white/10 font-mono text-[0.55rem] tracking-wider uppercase text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer"
        >
          Front
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsAutoRotating(false); setRotation({ x: -Math.PI / 2, y: 0 }); }}
          className="px-2 py-1 rounded-md bg-black/40 border border-white/10 font-mono text-[0.55rem] tracking-wider uppercase text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer"
        >
          Top
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsAutoRotating(false); setRotation({ x: 0, y: Math.PI / 2 }); }}
          className="px-2 py-1 rounded-md bg-black/40 border border-white/10 font-mono text-[0.55rem] tracking-wider uppercase text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer"
        >
          Side
        </button>
      </div>

      {/* Interactive Controls Floating HUD Overlay */}
      <div className="absolute bottom-6 right-6 flex gap-2 sm:gap-3 z-30 select-none pointer-events-auto">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleAutoRotate(); }}
          className={`px-2.5 py-1.5 rounded-lg border font-mono text-[0.6rem] tracking-wider uppercase transition-all duration-300 cursor-pointer ${
            isAutoRotating 
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20' 
              : 'bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/20'
          }`}
        >
          {isAutoRotating ? 'Auto Orbit: ON' : 'Auto Orbit: OFF'}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); resetView(); }}
          className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[0.6rem] tracking-wider uppercase text-white/60 hover:text-white hover:border-white/20 transition-all duration-300 cursor-pointer"
        >
          Reset View
        </button>
      </div>

      {/* Instructional Floating Toast Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-mono text-[0.6rem] tracking-[0.2em] uppercase text-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-black/60 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
        Drag to Orbit // Scroll to Zoom
      </div>
    </div>
  );

}
