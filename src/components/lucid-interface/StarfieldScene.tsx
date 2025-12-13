'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { InstancedMesh, Vector3, Color, Object3D } from 'three';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
  scrollProgress: number;
}

function ParticleField({ count = 5000, scrollProgress }: ParticleFieldProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // Generate particle positions
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 200 - 100; // Spread along Z-axis
      const speed = Math.random() * 0.5 + 0.5;
      const size = Math.random() * 0.3 + 0.1;
      temp.push({ x, y, z, speed, size });
    }
    return temp;
  }, [count]);

  // Animate particles
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      // Create warp tunnel effect - particles move toward camera as we scroll
      const scrollOffset = scrollProgress * 100;
      let z = particle.z + scrollOffset;

      // Reset particle if it goes too far forward
      if (z > 20) {
        z = -180 + (z - 20);
      }

      // Add subtle animation
      const wave = Math.sin(time * particle.speed + i * 0.01) * 0.2;

      dummy.position.set(
        particle.x + wave,
        particle.y + Math.cos(time * particle.speed + i * 0.01) * 0.2,
        z
      );

      dummy.scale.set(particle.size, particle.size, particle.size);

      // Fade particles based on distance
      const distance = Math.abs(z);
      const opacity = Math.max(0, 1 - distance / 100);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Update color based on distance for depth effect
      const color = new Color();
      color.setHSL(0.5 + (z / 200) * 0.3, 1, 0.5 * opacity);
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color="#00F0FF"
        transparent
        opacity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// Geometric shards for added visual interest
function GeometricShards({ scrollProgress }: { scrollProgress: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const count = 50;

  const shards = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        z: (Math.random() - 0.5) * 200 - 50,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        size: Math.random() * 2 + 1,
      });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    shards.forEach((shard, i) => {
      const scrollOffset = scrollProgress * 80;
      let z = shard.z + scrollOffset;

      if (z > 30) {
        z = -170 + (z - 30);
      }

      dummy.position.set(shard.x, shard.y, z);
      dummy.rotation.set(
        time * shard.rotationSpeed,
        time * shard.rotationSpeed * 0.5,
        time * shard.rotationSpeed * 0.3
      );
      dummy.scale.set(shard.size, shard.size * 2, 0.1);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color based on depth
      const color = new Color();
      const hue = 0.6 + (z / 200) * 0.2;
      color.setHSL(hue, 0.8, 0.5);
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#7000FF"
        transparent
        opacity={0.4}
        wireframe
        emissive="#7000FF"
        emissiveIntensity={0.5}
      />
    </instancedMesh>
  );
}

// Grid lines for cyberpunk aesthetic
function GridLines({ scrollProgress }: { scrollProgress: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    // Move grid with scroll
    ref.current.position.z = scrollProgress * 50;
  });

  return (
    <group ref={ref}>
      <gridHelper
        args={[200, 40, '#00F0FF', '#7000FF']}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -100]}
      />
      <gridHelper
        args={[200, 40, '#00F0FF', '#7000FF']}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -200]}
      />
    </group>
  );
}

interface StarfieldSceneProps {
  scrollProgress: number;
}

export default function StarfieldScene({ scrollProgress }: StarfieldSceneProps) {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#00F0FF" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#7000FF" />

        {/* Main particle field */}
        <ParticleField count={5000} scrollProgress={scrollProgress} />

        {/* Geometric shards */}
        <GeometricShards scrollProgress={scrollProgress} />

        {/* Grid lines */}
        <GridLines scrollProgress={scrollProgress} />

        {/* Fog for depth */}
        <fog attach="fog" args={['#050505', 10, 200]} />
      </Canvas>
    </div>
  );
}
