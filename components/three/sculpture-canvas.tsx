"use client"

/**
 * ChromeSculpture — a liquid-metal torus knot suspended in the hero.
 * Three.js (react-three-fiber + drei). The studio environment is generated
 * in-scene with Lightformers (no HDR files fetched — works fully offline).
 */
import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  Environment,
  Float,
  Lightformer,
  MeshDistortMaterial,
} from "@react-three/drei"
import type { Group } from "three"
import { MathUtils } from "three"

function Knot({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<Group>(null)

  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return
    group.current.rotation.y += delta * 0.22
    // Gentle pointer-follow parallax — dreamlike, never twitchy
    const targetX = state.pointer.y * 0.18
    const targetZ = state.pointer.x * 0.12
    group.current.rotation.x = MathUtils.lerp(
      group.current.rotation.x,
      targetX,
      0.035
    )
    group.current.rotation.z = MathUtils.lerp(
      group.current.rotation.z,
      targetZ,
      0.035
    )
  })

  return (
    <Float
      speed={reducedMotion ? 0 : 1.6}
      rotationIntensity={reducedMotion ? 0 : 0.5}
      floatIntensity={reducedMotion ? 0 : 1.35}
    >
      <group ref={group}>
        <mesh>
          <torusKnotGeometry args={[1.05, 0.36, 260, 40]} />
          <MeshDistortMaterial
            distort={reducedMotion ? 0.12 : 0.26}
            speed={reducedMotion ? 0 : 1.4}
            metalness={0.92}
            roughness={0.16}
            color="#e6e8ee"
            envMapIntensity={1.35}
          />
        </mesh>
      </group>
    </Float>
  )
}

export default function ChromeSculptureCanvas({
  reducedMotion = false,
}: {
  reducedMotion?: boolean
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={reducedMotion ? "demand" : "always"}
      className="!absolute inset-0"
    >
      {/* Key light */}
      <ambientLight intensity={0.35} />
      <spotLight
        position={[6, 8, 6]}
        angle={0.5}
        penumbra={1}
        intensity={reducedMotion ? 0.9 : 1.1}
        color="#ffffff"
      />
      {/* Indigo accent rim light — the one brand accent bleeding into metal */}
      <pointLight
        position={[-6, -2, -4]}
        intensity={4}
        color="#4f46e5"
      />
      <pointLight position={[3, -5, 4]} intensity={2} color="#c7d2fe" />

      {/* Offline studio env: lightformers rendered into a local cubemap */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="circle"
            intensity={4}
            position={[0, 5, -9]}
            scale={2}
          />
          <Lightformer
            form="rect"
            intensity={3}
            position={[-5, 1, -1]}
            scale={[3, 6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={2}
            position={[5, -1, -1]}
            scale={[3, 6, 1]}
            color="#c7d2fe"
          />
          <Lightformer
            form="rect"
            intensity={1.4}
            position={[0, -5, 2]}
            scale={[8, 3, 1]}
            color="#eef2ff"
          />
        </group>
      </Environment>

      <Knot reducedMotion={reducedMotion} />
    </Canvas>
  )
}
