import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';
import { Endpoint, Threat } from '@workspace/api-client-react';
import { useAppStore } from '@/lib/store';

interface WorldMapProps {
  endpoints?: Endpoint[];
  threats?: Threat[];
}

// Simple seeded random for stable mock coordinates based on string
const seedRandom = (seed: string) => {
  let h = 0xdeadbeef;
  for(let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};

export function WorldMap({ endpoints = [], threats = [] }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const setSelectedEndpoint = useAppStore(s => s.setSelectedEndpoint);
  
  // Animation state
  const timeRef = useRef(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Fetch low-res world topology
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(r => r.json())
      .then(data => {
        setWorldData(topojson.feature(data, data.objects.countries));
      })
      .catch(console.error);
  }, []);

  // Process endpoints to ensure they have coords for display
  const mapData = useMemo(() => {
    return endpoints.map(ep => {
      // Mock coords if missing based on hostname for stability
      let lat = ep.coords?.lat;
      let lng = ep.coords?.lng;
      if (lat == null || lng == null) {
        // Randomly distribute across major landmasses
        lat = (seedRandom(ep.hostname + "lat") * 120) - 60; 
        lng = (seedRandom(ep.hostname + "lng") * 360) - 180;
      }
      return { ...ep, lat, lng };
    });
  }, [endpoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !worldData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const projection = d3Geo.geoEquirectangular()
      .fitSize([width, height], worldData);
      
    const pathGenerator = d3Geo.geoPath()
      .projection(projection)
      .context(ctx);

    const drawMap = () => {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 0.02;

      // 1. Draw Landmasses
      ctx.beginPath();
      pathGenerator(worldData);
      ctx.fillStyle = '#111827'; // very dark gray/blue
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(45, 212, 160, 0.2)'; // Cyber cyan lines
      ctx.stroke();

      // 2. Draw Latitude/Longitude Grid (Graticule)
      const graticule = d3Geo.geoGraticule10();
      ctx.beginPath();
      pathGenerator(graticule);
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(45, 212, 160, 0.05)';
      ctx.stroke();

      // 3. Draw Endpoints
      const threatNodes: {x: number, y: number}[] = [];

      mapData.forEach(ep => {
        const coords = projection([ep.lng, ep.lat]);
        if (!coords) return;
        const [x, y] = coords;

        let color = '#2dd4a0'; // healthy
        let size = 3;
        let isThreat = false;

        if (ep.status === 'threat') {
          color = '#ef4444';
          size = 5;
          isThreat = true;
          threatNodes.push({x, y});
        } else if (ep.status === 'warning') {
          color = '#eab308';
          size = 4;
        } else if (ep.status === 'offline') {
          color = '#6b7280';
        }

        // Pulse effect for threats
        if (isThreat) {
          const pulseSize = size + Math.sin(timeRef.current * 3) * 4;
          ctx.beginPath();
          ctx.arc(x, y, pulseSize > 0 ? pulseSize : 0, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(239, 68, 68, 0.3)`;
          ctx.fill();
        }

        // Draw hexagon marker (simplified as circle for performance if many, but let's do hex)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (2 * Math.PI / 6) * i;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        // Glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // 4. Draw Threat Arcs (Mocking connections to random targets)
      ctx.lineWidth = 1.5;
      threatNodes.forEach((node, i) => {
        // Pseudo-random target based on index
        const targetLng = (seedRandom(i.toString()) * 360) - 180;
        const targetLat = (seedRandom((i+1).toString()) * 120) - 60;
        const targetCoords = projection([targetLng, targetLat]);
        
        if (targetCoords) {
          const [tx, ty] = targetCoords;
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          // Control point for arc
          const cpX = (node.x + tx) / 2;
          const cpY = Math.min(node.y, ty) - 100; // Curve upwards
          ctx.quadraticCurveTo(cpX, cpY, tx, ty);
          
          // Animated gradient along the line
          const gradient = ctx.createLinearGradient(node.x, node.y, tx, ty);
          const offset = (Math.sin(timeRef.current) + 1) / 2; // 0 to 1
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
          gradient.addColorStop(offset, 'rgba(239, 68, 68, 0.8)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
          
          ctx.strokeStyle = gradient;
          ctx.stroke();
        }
      });

      animationFrameRef.current = requestAnimationFrame(drawMap);
    };

    drawMap();

    // Interaction handling (Hover/Click)
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let hovered: any = null;
      for (const ep of mapData) {
        const coords = projection([ep.lng, ep.lat]);
        if (!coords) continue;
        const [x, y] = coords;
        const dist = Math.sqrt(Math.pow(mx - x, 2) + Math.pow(my - y, 2));
        if (dist < 8) { // 8px hit radius
          hovered = ep;
          break;
        }
      }

      canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
      
      if (e.type === 'click' && hovered) {
        setSelectedEndpoint(hovered);
      }
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('click', handleMouse);

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      projection.fitSize([width, height], worldData);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('click', handleMouse);
      window.removeEventListener('resize', handleResize);
    };
  }, [worldData, mapData]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-background overflow-hidden border border-border cyber-glow">
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/50" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/50" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/50" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/50" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%)'
      }} />

      {/* Threat indicator */}
      {threats.length > 0 && (
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-card/80 backdrop-blur-sm border border-destructive/50 px-4 py-2 rounded-md cyber-glow-destructive z-10 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_#ef4444]" />
          <span className="text-destructive font-display font-bold tracking-wider text-sm">
            {threats.length} ACTIVE THREAT VECTORS
          </span>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-card/90 backdrop-blur-md border border-primary/30 p-4 rounded-lg font-mono text-xs flex flex-col gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 bg-healthy rounded-full shadow-[0_0_5px_#2dd4a0]"></span> Healthy ({endpoints.filter(e => e.status === 'healthy').length})
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 bg-warning rounded-full shadow-[0_0_5px_#eab308]"></span> Warning ({endpoints.filter(e => e.status === 'warning').length})
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <span className="w-2 h-2 bg-destructive rounded-full shadow-[0_0_5px_#ef4444]"></span> Threat ({endpoints.filter(e => e.status === 'threat').length})
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="w-2 h-2 bg-muted-foreground rounded-full"></span> Offline ({endpoints.filter(e => e.status === 'offline').length})
        </div>
      </div>
    </div>
  );
}
