"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import Image from "next/image";

type Props = { model: "column" | "arch" | "rotunda"; material: "stone" | "metal" | "wire"; playing: boolean; explode: number };

function Flutes({ material }: { material: THREE.Material }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree(state => state.invalidate);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const part = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      part.position.set(Math.cos(angle) * .4, 0, Math.sin(angle) * .4);
      part.rotation.set(0, -angle, 0);
      part.updateMatrix();
      mesh.current.setMatrixAt(i, part.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    invalidate();
  }, [invalidate]);
  return <instancedMesh ref={mesh} args={[undefined, material, 24]}><cylinderGeometry args={[.043, .047, 2.03, 8]} /></instancedMesh>;
}

function WarmShaders() {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    let cancelled = false;
    void gl.compileAsync(scene, camera).then(() => { if (!cancelled) invalidate(); });
    return () => { cancelled = true; };
  }, [gl, scene, camera, invalidate]);
  return null;
}

function Column({ material, explode, scale = 1 }: { material: THREE.Material; explode: number; scale?: number }) {
  return <group scale={scale}>
    <RoundedBox args={[1.5, .16, 1.5]} position={[0, -1.48 - explode * .45, 0]} radius={.025} smoothness={3}><primitive object={material} attach="material" /></RoundedBox>
    <RoundedBox args={[1.3, .13, 1.3]} position={[0, -1.34 - explode * .25, 0]} radius={.02} smoothness={3}><primitive object={material} attach="material" /></RoundedBox>
    {[-1.17, -1.08, 1.04, 1.13].map((y, i) => <mesh key={i} position={[0, y + Math.sign(y) * explode * .13, 0]}><cylinderGeometry args={[i < 2 ? .53 : .5, i < 2 ? .55 : .48, .1, 64]} /><primitive object={material} attach="material" /></mesh>)}
    <mesh><cylinderGeometry args={[.37, .43, 2.08, 64]} /><primitive object={material} attach="material" /></mesh>
    <Flutes material={material} />
    <mesh position={[0, 1.26 + explode * .28, 0]}><cylinderGeometry args={[.68, .47, .2, 64]} /><primitive object={material} attach="material" /></mesh>
    <RoundedBox args={[1.48, .19, 1.48]} position={[0, 1.47 + explode * .5, 0]} radius={.025} smoothness={3}><primitive object={material} attach="material" /></RoundedBox>
  </group>;
}

function Arch({ material, explode }: { material: THREE.Material; explode: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, .3, 1.25, 0, Math.PI, false);
    s.lineTo(-1.25, .3); s.lineTo(-.8, .3);
    s.absarc(0, .3, .8, Math.PI, 0, true); s.lineTo(1.25, .3);
    return s;
  }, []);
  return <group><mesh position={[0, explode * .6, -.28]}><extrudeGeometry args={[shape, { depth: .56, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .035, bevelThickness: .025, curveSegments: 64 }]} /><primitive object={material} attach="material" /></mesh>{[-1, 1].map(i => <group key={i} position={[i * 1.025, 0, 0]}><RoundedBox args={[.46, 1.6, .62]} radius={.025} position={[0, -.5, 0]}><primitive object={material} attach="material" /></RoundedBox><RoundedBox args={[.64, .18, .82]} radius={.02} position={[i * explode * .15, -1.39 - explode * .3, 0]}><primitive object={material} attach="material" /></RoundedBox><RoundedBox args={[.61, .14, .78]} radius={.02} position={[0, .27 + explode * .2, 0]}><primitive object={material} attach="material" /></RoundedBox></group>)}</group>;
}

function Rotunda({ material, explode }: { material: THREE.Material; explode: number }) {
  return <group scale={.76}>
    <mesh position={[0, -1.55 - explode * .35, 0]}><cylinderGeometry args={[1.8, 1.85, .18, 80]} /><primitive object={material} attach="material" /></mesh>
    <mesh position={[0, -1.37 - explode * .15, 0]}><cylinderGeometry args={[1.65, 1.7, .17, 80]} /><primitive object={material} attach="material" /></mesh>
    {Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2; return <group key={i} position={[Math.cos(a) * (1.25 + explode * .35), -.3, Math.sin(a) * (1.25 + explode * .35)]}><Column material={material} explode={0} scale={.64} /></group>; })}
    <mesh position={[0, .68 + explode * .35, 0]}><cylinderGeometry args={[1.65, 1.65, .2, 80]} /><primitive object={material} attach="material" /></mesh>
    <mesh position={[0, .86 + explode * .65, 0]}><cylinderGeometry args={[1.54, 1.65, .15, 80]} /><primitive object={material} attach="material" /></mesh>
    <mesh position={[0, .92 + explode * .9, 0]}><sphereGeometry args={[1.55, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={material} attach="material" /></mesh>
  </group>;
}

function ObjectScene({ model, material: kind, playing, explode }: Props) {
  const group = useRef<THREE.Group>(null);
  const materials = useMemo(() => ({
    stone: new THREE.MeshPhysicalMaterial({ color: "#d8cbb6", metalness: .08, roughness: .65, clearcoat: .05 }),
    metal: new THREE.MeshPhysicalMaterial({ color: "#aaac9f", metalness: .86, roughness: .23, clearcoat: 1 }),
    wire: new THREE.MeshPhysicalMaterial({ color: "#4b5547", metalness: .08, roughness: .65, wireframe: true, clearcoat: .05 }),
  }), []);
  const material = materials[kind];
  useEffect(() => () => Object.values(materials).forEach(material => material.dispose()), [materials]);
  useFrame((state, delta) => { if (group.current && playing) { group.current.rotation.y += delta * .12; group.current.position.y = Math.sin(state.clock.elapsedTime * .6) * .035; } });
  return <><ambientLight intensity={1.4} /><hemisphereLight args={["#ffffff", "#797665", 2]} /><directionalLight position={[4, 7, 5]} intensity={4} color="#fff5df" /><directionalLight position={[-4, 3, -4]} intensity={2.5} color="#dce5ef" /><pointLight position={[-3, 1, 3]} intensity={12} color="#ffffff" /><group ref={group} rotation={[.05, -.45, 0]}><group visible={model === "column"}><Column material={material} explode={explode} /></group><group visible={model === "arch"}><Arch material={material} explode={explode} /></group><group visible={model === "rotunda"}><Rotunda material={material} explode={explode} /></group></group><ContactShadows key={model} position={[0, -1.98, 0]} opacity={.3} scale={10} blur={2.8} far={4} resolution={256} frames={1} /><OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={.5} maxPolarAngle={2.1} /><WarmShaders /></>;
}

function SceneFallback() {
  return <div className="scene-fallback"><Image src="/images/architecture.jpg" alt="Архитектурные чертежи" fill sizes="(max-width: 700px) 100vw, 50vw" /><span>Для 3D нужен браузер с поддержкой WebGL</span></div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children; }
}

export default function Sculpture(props: Props) {
  return <SceneBoundary><Canvas frameloop={props.playing ? "always" : "demand"} dpr={[1, 1.5]} camera={{ position: [0, .35, 6.5], fov: 37 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} fallback={<SceneFallback />} style={{ touchAction: "pan-y" }} aria-label="Интерактивная архитектурная скульптура"><ObjectScene {...props} /></Canvas></SceneBoundary>;
}
