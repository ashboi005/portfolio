"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * The signature element: a drifting network topology.
 * White/cyan nodes joined by hairline edges, with bright cyan "packets"
 * pulsing between them. The whole graph leans toward the cursor.
 */

const NODE_COUNT = 110;
const PACKET_COUNT = 16;

type Graph = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  edges: [number, number][];
  edgePositions: Float32Array;
};

function buildGraph(): Graph {
  const rng = mulberry32(20261207);
  const positions = new Float32Array(NODE_COUNT * 3);
  const colors = new Float32Array(NODE_COUNT * 3);
  const sizes = new Float32Array(NODE_COUNT);
  const phases = new Float32Array(NODE_COUNT);

  const white = new THREE.Color("#edeff7");
  const cyan = new THREE.Color("#33e0ff");

  for (let i = 0; i < NODE_COUNT; i++) {
    positions[i * 3] = (rng() * 2 - 1) * 10.5;
    positions[i * 3 + 1] = (rng() * 2 - 1) * 5.2;
    positions[i * 3 + 2] = (rng() * 2 - 1) * 3.6;

    const isCyan = rng() < 0.18;
    const base = isCyan ? cyan : white;
    const dim = 0.35 + rng() * 0.65;
    colors[i * 3] = base.r * dim;
    colors[i * 3 + 1] = base.g * dim;
    colors[i * 3 + 2] = base.b * dim;

    sizes[i] = isCyan ? 0.16 : 0.07 + rng() * 0.09;
    phases[i] = rng() * Math.PI * 2;
  }

  // Connect each node to its 2 nearest neighbours.
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const dists: { j: number; d: number }[] = [];
    for (let j = 0; j < NODE_COUNT; j++) {
      if (i === j) continue;
      const dx = positions[i * 3]! - positions[j * 3]!;
      const dy = positions[i * 3 + 1]! - positions[j * 3 + 1]!;
      const dz = positions[i * 3 + 2]! - positions[j * 3 + 2]!;
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (const { j } of dists.slice(0, 2)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(i < j ? [i, j] : [j, i]);
      }
    }
  }

  const edgePositions = new Float32Array(edges.length * 6);
  return { positions, colors, sizes, phases, edges, edgePositions };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ConstellationScene({ animate }: { animate: boolean }) {
  const graph = useMemo(buildGraph, []);
  const sprite = useMemo(makeCircleTexture, []);

  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.BufferGeometry>(null);
  const edgesRef = useRef<THREE.BufferGeometry>(null);
  const packetsRef = useRef<THREE.BufferGeometry>(null);

  // Live (animated) copy of node positions.
  const live = useMemo(() => graph.positions.slice(), [graph]);

  const packets = useMemo(() => {
    const rng = mulberry32(97);
    return Array.from({ length: PACKET_COUNT }, () => ({
      edge: Math.floor(rng() * graph.edges.length),
      t: rng(),
      speed: 0.25 + rng() * 0.5,
      forward: rng() > 0.5,
    }));
  }, [graph]);

  const packetPositions = useMemo(() => new Float32Array(PACKET_COUNT * 3), []);

  useFrame((state, delta) => {
    if (!animate) return;
    const time = state.clock.elapsedTime;

    // Organic node float.
    for (let i = 0; i < NODE_COUNT; i++) {
      const phase = graph.phases[i]!;
      live[i * 3] = graph.positions[i * 3]! + Math.sin(time * 0.3 + phase) * 0.14;
      live[i * 3 + 1] =
        graph.positions[i * 3 + 1]! + Math.sin(time * 0.42 + phase * 1.7) * 0.12;
      live[i * 3 + 2] = graph.positions[i * 3 + 2]! + Math.cos(time * 0.36 + phase) * 0.1;
    }
    nodesRef.current?.attributes.position &&
      ((nodesRef.current.attributes.position.array as Float32Array).set(live),
      (nodesRef.current.attributes.position.needsUpdate = true));

    // Edges follow their nodes.
    for (let e = 0; e < graph.edges.length; e++) {
      const [a, b] = graph.edges[e]!;
      graph.edgePositions[e * 6] = live[a * 3]!;
      graph.edgePositions[e * 6 + 1] = live[a * 3 + 1]!;
      graph.edgePositions[e * 6 + 2] = live[a * 3 + 2]!;
      graph.edgePositions[e * 6 + 3] = live[b * 3]!;
      graph.edgePositions[e * 6 + 4] = live[b * 3 + 1]!;
      graph.edgePositions[e * 6 + 5] = live[b * 3 + 2]!;
    }
    if (edgesRef.current?.attributes.position) {
      (edgesRef.current.attributes.position.array as Float32Array).set(graph.edgePositions);
      edgesRef.current.attributes.position.needsUpdate = true;
    }

    // Packets travel along edges; at the end, hop to a new edge.
    for (let p = 0; p < packets.length; p++) {
      const packet = packets[p]!;
      packet.t += delta * packet.speed;
      if (packet.t >= 1) {
        packet.t = 0;
        packet.edge = Math.floor(Math.random() * graph.edges.length);
        packet.forward = Math.random() > 0.5;
      }
      const [a, b] = graph.edges[packet.edge]!;
      const from = packet.forward ? a : b;
      const to = packet.forward ? b : a;
      const t = packet.t;
      packetPositions[p * 3] = live[from * 3]! + (live[to * 3]! - live[from * 3]!) * t;
      packetPositions[p * 3 + 1] =
        live[from * 3 + 1]! + (live[to * 3 + 1]! - live[from * 3 + 1]!) * t;
      packetPositions[p * 3 + 2] =
        live[from * 3 + 2]! + (live[to * 3 + 2]! - live[from * 3 + 2]!) * t;
    }
    if (packetsRef.current?.attributes.position) {
      (packetsRef.current.attributes.position.array as Float32Array).set(packetPositions);
      packetsRef.current.attributes.position.needsUpdate = true;
    }

    // The whole system leans toward the cursor + slow ambient drift.
    if (groupRef.current) {
      const targetY = state.pointer.x * 0.16 + time * 0.008;
      const targetX = -state.pointer.y * 0.1;
      groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.04;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry ref={nodesRef}>
          <bufferAttribute attach="attributes-position" args={[live, 3]} />
          <bufferAttribute attach="attributes-color" args={[graph.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          map={sprite}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <lineSegments>
        <bufferGeometry ref={edgesRef}>
          <bufferAttribute attach="attributes-position" args={[graph.edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7ee9ff"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      <points>
        <bufferGeometry ref={packetsRef}>
          <bufferAttribute attach="attributes-position" args={[packetPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.22}
          map={sprite}
          color="#33e0ff"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

/** Static fallback when WebGL is unavailable — keeps the hero atmospheric. */
function ConstellationFallback({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
      style={{
        background:
          "radial-gradient(ellipse at 30% 20%, rgba(51,224,255,0.10), transparent 45%)," +
          "radial-gradient(ellipse at 75% 60%, rgba(14,116,144,0.14), transparent 50%)",
      }}
    />
  );
}

export default function SystemConstellation({ className }: { className?: string }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    setWebglOk(detectWebGL());
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  if (webglOk === null) return <div className={className} aria-hidden />;
  if (!webglOk || crashed) return <ConstellationFallback className={className} />;

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 11], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
        frameloop={reducedMotion ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => setCrashed(true));
        }}
      >
        <ConstellationScene animate={!reducedMotion} />
      </Canvas>
    </div>
  );
}
