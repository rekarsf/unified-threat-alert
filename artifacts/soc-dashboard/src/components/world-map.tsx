import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';
import { useAppStore } from '@/lib/store';

interface GeoCoords { lat: number; lng: number; }
interface Endpoint {
  id: string; hostname: string; ip: string; os: string; status: string;
  coords?: GeoCoords | null; city?: string; country?: string;
  threatName?: string; threatSeverity?: string;
  [key: string]: unknown;
}
interface Threat {
  id: string; name: string; agentComputerName?: string; severity?: string;
  [key: string]: unknown;
}

interface WorldMapProps {
  endpoints?: Endpoint[];
  threats?: Threat[];
  filterStatus?: string;
  filterCountry?: string;
}

// Seeded random for stable positioning
const seedRandom = (seed: string) => {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
};

// Stable landmass coords (not ocean)
const LANDMASS_COORDS = [
  [37.6, -122.4], [40.7, -74.0], [51.5, -0.1], [48.9, 2.3], [52.5, 13.4],
  [55.8, 37.6], [59.9, 30.3], [31.2, 121.5], [35.7, 139.7], [1.3, 103.8],
  [28.6, 77.2], [19.1, 72.9], [25.2, 55.3], [30.1, 31.2], [-33.9, 151.2],
  [-23.5, -46.6], [4.7, -74.1], [19.4, -99.1], [40.4, -3.7], [41.9, 12.5],
  [50.1, 8.7], [47.4, 8.6], [48.2, 16.4], [53.3, -6.3], [45.5, -73.6],
  [43.7, -79.4], [47.6, -122.3], [34.1, -118.2], [41.9, -87.6], [29.8, -95.4],
];

interface MapEndpoint extends Endpoint { lat: number; lng: number; }
interface Particle { x: number; y: number; progress: number; speed: number; }
interface ThreatArc {
  fromX: number; fromY: number; toX: number; toY: number;
  cpX: number; cpY: number; length: number;
  color: string; particles: Particle[];
  ep: MapEndpoint;
}

export function WorldMap({ endpoints = [], threats = [], filterStatus, filterCountry }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const setSelectedEndpoint = useAppStore(s => s.setSelectedEndpoint);
  const timeRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; ep: MapEndpoint } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(r => r.json())
      .then(data => setWorldData(topojson.feature(data, data.objects.countries)))
      .catch(console.error);
  }, []);

  const mapData = useMemo<MapEndpoint[]>(() => {
    return endpoints
      .filter(ep => {
        if (filterStatus && ep.status !== filterStatus) return false;
        if (filterCountry && ep.country !== filterCountry) return false;
        return true;
      })
      .map((ep, i) => {
        let lat = ep.coords?.lat;
        let lng = ep.coords?.lng;
        if (lat == null || lng == null) {
          const idx = Math.floor(seedRandom(ep.hostname) * LANDMASS_COORDS.length);
          const base = LANDMASS_COORDS[idx];
          lat = base[0] + (seedRandom(ep.hostname + 'dlat') - 0.5) * 10;
          lng = base[1] + (seedRandom(ep.hostname + 'dlng') - 0.5) * 15;
        }
        return { ...ep, lat, lng };
      });
  }, [endpoints, filterStatus, filterCountry]);

  // Track arc state with particles per arc
  const arcsRef = useRef<ThreatArc[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !worldData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const baseProjection = d3Geo.geoNaturalEarth1().fitSize([width, height], worldData);
    const pathGenerator = d3Geo.geoPath().projection(baseProjection).context(ctx);

    const getProjectedPoint = (lng: number, lat: number): [number, number] | null => {
      const pt = baseProjection([lng, lat]);
      if (!pt) return null;
      return [pt[0] * zoom + pan.x, pt[1] * zoom + pan.y];
    };

    // Build arcs for threat endpoints
    const threatEps = mapData.filter(ep => ep.status === 'threat');
    arcsRef.current = threatEps.map((ep) => {
      const from = getProjectedPoint(ep.lng, ep.lat);
      if (!from) return null;

      // Pick a "target" from random LANDMASS_COORDS
      const tIdx = Math.floor(seedRandom(ep.id + 'target') * LANDMASS_COORDS.length);
      const tBase = LANDMASS_COORDS[tIdx];
      const tLat = tBase[0] + (seedRandom(ep.id + 'tdlat') - 0.5) * 8;
      const tLng = tBase[1] + (seedRandom(ep.id + 'tdlng') - 0.5) * 12;
      const to = getProjectedPoint(tLng, tLat);
      if (!to) return null;

      const [fx, fy] = from;
      const [tx, ty] = to;
      const cpX = (fx + tx) / 2;
      const cpY = Math.min(fy, ty) - Math.abs(tx - fx) * 0.4 - 40;
      const arcLen = Math.sqrt((tx - fx) ** 2 + (ty - fy) ** 2);

      // Create initial particles
      const numParticles = 3 + Math.floor(seedRandom(ep.id + 'np') * 3);
      const particles: Particle[] = Array.from({ length: numParticles }, (_, pi) => ({
        x: fx, y: fy,
        progress: (pi / numParticles),
        speed: 0.003 + seedRandom(ep.id + pi) * 0.004,
      }));

      return { fromX: fx, fromY: fy, toX: tx, toY: ty, cpX, cpY, length: arcLen, color: '#ef4444', particles, ep };
    }).filter(Boolean) as ThreatArc[];

    const drawMap = () => {
      ctx.clearRect(0, 0, width, height);
      timeRef.current += 0.016;

      ctx.save();

      // Background
      ctx.fillStyle = 'hsl(210, 22%, 4%)';
      ctx.fillRect(0, 0, width, height);

      // Apply zoom/pan transform
      ctx.translate(pan.x * (1 - zoom), pan.y * (1 - zoom));
      ctx.scale(zoom, zoom);

      // Ocean (background gradient)
      const oceanGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
      oceanGrad.addColorStop(0, 'hsl(210, 30%, 8%)');
      oceanGrad.addColorStop(1, 'hsl(210, 22%, 4%)');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, width, height);

      // Graticule (grid lines)
      const graticule = d3Geo.geoGraticule()();
      ctx.beginPath();
      pathGenerator(graticule as any);
      ctx.lineWidth = 0.4 / zoom;
      ctx.strokeStyle = 'rgba(45, 212, 160, 0.06)';
      ctx.stroke();

      // Landmasses
      ctx.beginPath();
      pathGenerator(worldData);
      const landGrad = ctx.createLinearGradient(0, 0, 0, height);
      landGrad.addColorStop(0, 'hsl(210, 20%, 14%)');
      landGrad.addColorStop(1, 'hsl(210, 18%, 10%)');
      ctx.fillStyle = landGrad;
      ctx.fill();
      ctx.lineWidth = 0.8 / zoom;
      ctx.strokeStyle = 'rgba(45, 212, 160, 0.18)';
      ctx.stroke();

      ctx.restore();

      // Draw threat arcs with animated particles
      arcsRef.current.forEach(arc => {
        // Draw arc path (faint)
        ctx.beginPath();
        ctx.moveTo(arc.fromX, arc.fromY);
        ctx.quadraticCurveTo(arc.cpX, arc.cpY, arc.toX, arc.toY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.stroke();

        // Animate particles along arc
        arc.particles.forEach(p => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          const t = p.progress;
          const px = (1 - t) * (1 - t) * arc.fromX + 2 * (1 - t) * t * arc.cpX + t * t * arc.toX;
          const py = (1 - t) * (1 - t) * arc.fromY + 2 * (1 - t) * t * arc.cpY + t * t * arc.toY;
          p.x = px;
          p.y = py;

          // Particle glow
          const alpha = Math.sin(p.progress * Math.PI) * 0.9 + 0.1;
          const radius = 3 * alpha;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Trailing tail
          ctx.beginPath();
          ctx.arc(px, py, radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.2})`;
          ctx.fill();
        });

        // Draw origin pulse
        const pulseAlpha = 0.4 + Math.sin(timeRef.current * 3) * 0.3;
        const pulseR = 8 + Math.sin(timeRef.current * 3) * 4;
        ctx.beginPath();
        ctx.arc(arc.fromX, arc.fromY, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha * 0.2})`;
        ctx.fill();
      });

      // Draw endpoints
      mapData.forEach(ep => {
        const pt = baseProjection([ep.lng, ep.lat]);
        if (!pt) return;
        const [bx, by] = pt;
        const x = bx * zoom + pan.x;
        const y = by * zoom + pan.y;

        let color = '#2dd4a0';
        let size = 4;

        if (ep.status === 'threat') { color = '#ef4444'; size = 6; }
        else if (ep.status === 'warning') { color = '#eab308'; size = 5; }
        else if (ep.status === 'offline') { color = '#6b7280'; size = 3; }

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.fillStyle = `${color}20`;
        ctx.fill();

        // Hexagon marker
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = x + size * Math.cos(angle);
          const hy = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(drawMap);
    };

    drawMap();

    // Mouse interactions
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let hovered: MapEndpoint | null = null;
      for (const ep of mapData) {
        const pt = baseProjection([ep.lng, ep.lat]);
        if (!pt) continue;
        const x = pt[0] * zoom + pan.x;
        const y = pt[1] * zoom + pan.y;
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) < 10) {
          hovered = ep;
          break;
        }
      }

      canvas.style.cursor = hovered ? 'pointer' : isDragging.current ? 'grabbing' : 'grab';
      setTooltip(hovered ? { x: e.clientX - rect.left, y: e.clientY - rect.top, ep: hovered } : null);
    };

    const handleClick = (e: MouseEvent) => {
      if (isDragging.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (const ep of mapData) {
        const pt = baseProjection([ep.lng, ep.lat]);
        if (!pt) continue;
        const x = pt[0] * zoom + pan.x;
        const y = pt[1] * zoom + pan.y;
        if (Math.sqrt((mx - x) ** 2 + (my - y) ** 2) < 10) {
          setSelectedEndpoint(ep);
          break;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      canvas.style.cursor = 'grabbing';
      const onMove = (me: MouseEvent) => {
        const dx = me.clientX - dragStart.current.x;
        const dy = me.clientY - dragStart.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
        setPan({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
      };
      const onUp = () => {
        setTimeout(() => { isDragging.current = false; }, 50);
        canvas.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.85 : 1.18;
      setZoom(z => {
        const newZ = Math.min(6, Math.max(0.5, z * delta));
        setPan(p => ({
          x: mx - (mx - p.x) * (newZ / z),
          y: my - (my - p.y) * (newZ / z),
        }));
        return newZ;
      });
    };

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      baseProjection.fitSize([width, height], worldData);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
    };
  }, [worldData, mapData, zoom, pan]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[hsl(210,22%,4%)] overflow-hidden">
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary/60 pointer-events-none z-10" />
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary/60 pointer-events-none z-10" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary/60 pointer-events-none z-10" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary/60 pointer-events-none z-10" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)'
      }} />

      {/* Threat indicator */}
      {threats.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-destructive/60 px-4 py-1.5 rounded-full z-20 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_8px_#ef4444]" />
          <span className="text-destructive font-mono font-bold tracking-wider text-xs uppercase">
            {threats.length} Active Threat{threats.length > 1 ? 's' : ''} Detected
          </span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-20">
        <button onClick={() => setZoom(z => Math.min(6, z * 1.3))}
          className="w-7 h-7 bg-card/80 border border-border text-primary font-mono text-sm hover:bg-primary/10 transition-colors flex items-center justify-center rounded">
          +
        </button>
        <button onClick={() => setZoom(1) || setPan({ x: 0, y: 0 })}
          className="w-7 h-7 bg-card/80 border border-border text-muted-foreground font-mono text-[10px] hover:bg-primary/10 transition-colors flex items-center justify-center rounded"
          title="Reset view">
          ⊙
        </button>
        <button onClick={() => setZoom(z => Math.max(0.5, z / 1.3))}
          className="w-7 h-7 bg-card/80 border border-border text-primary font-mono text-sm hover:bg-primary/10 transition-colors flex items-center justify-center rounded">
          −
        </button>
      </div>

      <canvas ref={canvasRef} className="block w-full h-full cursor-grab" />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-md border border-primary/20 p-3 rounded-lg font-mono text-[10px] flex flex-col gap-1.5 z-20">
        {[
          { color: '#2dd4a0', label: 'Healthy', count: endpoints.filter(e => e.status === 'healthy').length },
          { color: '#eab308', label: 'Warning', count: endpoints.filter(e => e.status === 'warning').length },
          { color: '#ef4444', label: 'Threat', count: endpoints.filter(e => e.status === 'threat').length },
          { color: '#6b7280', label: 'Offline', count: endpoints.filter(e => e.status === 'offline').length },
        ].map(({ color, label, count }) => (
          <div key={label} className="flex items-center gap-2 text-foreground">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
            <span>{label}</span>
            <span className="ml-auto text-muted-foreground pl-3">{count}</span>
          </div>
        ))}
        <div className="border-t border-border/50 pt-1 mt-0.5 text-muted-foreground">
          Scroll to zoom · Drag to pan
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 bg-card/95 backdrop-blur-md border border-primary/40 rounded-lg p-3 pointer-events-none font-mono text-xs shadow-xl"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            maxWidth: 220,
            transform: tooltip.x > (containerRef.current?.clientWidth ?? 0) / 2 ? 'translateX(-110%)' : undefined,
          }}
        >
          <div className="font-bold text-foreground mb-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-sm ${
              tooltip.ep.status === 'threat' ? 'bg-destructive' :
              tooltip.ep.status === 'warning' ? 'bg-warning' :
              tooltip.ep.status === 'offline' ? 'bg-muted-foreground' : 'bg-healthy'
            }`} style={{ boxShadow: tooltip.ep.status === 'threat' ? '0 0 6px #ef4444' : undefined }} />
            {tooltip.ep.hostname}
          </div>
          <div className="text-muted-foreground space-y-0.5">
            <div>IP: <span className="text-foreground">{tooltip.ep.ip}</span></div>
            <div>OS: <span className="text-foreground">{tooltip.ep.os}</span></div>
            {tooltip.ep.country && <div>Location: <span className="text-foreground">{[tooltip.ep.city, tooltip.ep.country].filter(Boolean).join(', ')}</span></div>}
            <div>Status: <span className={`font-bold ${
              tooltip.ep.status === 'threat' ? 'text-destructive' :
              tooltip.ep.status === 'warning' ? 'text-warning' :
              tooltip.ep.status === 'offline' ? 'text-muted-foreground' : 'text-healthy'
            }`}>{tooltip.ep.status.toUpperCase()}</span></div>
            {tooltip.ep.threatName && (
              <div className="mt-1 text-destructive border-t border-border/50 pt-1">
                ⚠ {tooltip.ep.threatName}
              </div>
            )}
          </div>
          <div className="text-muted-foreground/60 mt-1">Click for details</div>
        </div>
      )}
    </div>
  );
}
