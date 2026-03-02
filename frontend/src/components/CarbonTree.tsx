import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════
// 3D TREE — User Dashboard
// Dynamic greenness and breathing based on credit points (0-10)
// 0 = bare tree, no green
// 10 = max lush, bright emerald, heavy particles
// ═══════════════════════════════════════════

function TreeTrunk({ height, score }: { height: number; score: number }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ref.current) {
            // Subtle breathing on trunk
            const breathe = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.008;
            ref.current.scale.set(breathe, 1, breathe);
        }
    });

    // Trunk color: grey-brown when dead, warm brown when alive
    const trunkColor = score > 0 ? '#5c3d2e' : '#4a4a4a';

    return (
        <mesh ref={ref} position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.25, height, 8]} />
            <meshStandardMaterial color={trunkColor} roughness={0.8} />
        </mesh>
    );
}

function BreathingLeaf({ position, scale, color, speed, score }: {
    position: [number, number, number]; scale: number; color: string;
    speed: number; score: number;
}) {
    const ref = useRef<THREE.Mesh>(null);
    const offset = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            const t = clock.elapsedTime;
            // Breathing: scale pulsates
            const breatheIntensity = 0.03 + (score / 10) * 0.07; // more breathing at higher scores
            const breathe = 1 + Math.sin(t * speed + offset) * breatheIntensity;
            ref.current.scale.set(breathe, breathe, breathe);

            // Gentle sway
            ref.current.rotation.y = Math.sin(t * 0.5 + offset) * 0.15;
            ref.current.rotation.z = Math.cos(t * 0.3 + offset) * 0.08;
        }
    });

    const emissiveIntensity = (score / 10) * 0.25;

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[scale, 8, 6]} />
            <meshStandardMaterial
                color={color}
                roughness={0.5}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
                transparent
                opacity={0.85 + (score / 10) * 0.15}
            />
        </mesh>
    );
}

function GlowParticles({ count, range, color, speed }: { count: number; range: number; color: string; speed: number }) {
    const ref = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * range;
            pos[i + 1] = Math.random() * range * 2 + 0.5;
            pos[i + 2] = (Math.random() - 0.5) * range;
        }
        return pos;
    }, [count, range]);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.y = clock.elapsedTime * speed;
            // Gently float up and down
            ref.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.15;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color={color} transparent opacity={0.7} sizeAttenuation />
        </points>
    );
}

function GlowRing({ radius, score }: { radius: number; score: number }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.z = clock.elapsedTime * 0.3;
            const pulse = 1 + Math.sin(clock.elapsedTime * 2) * 0.05;
            ref.current.scale.set(pulse, pulse, 1);
        }
    });

    const opacity = (score / 10) * 0.4;

    return (
        <mesh ref={ref} position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.02, 8, 32]} />
            <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} transparent opacity={opacity} />
        </mesh>
    );
}

function Tree({ score }: { score: number }) {
    // score: 0-10
    const s = Math.max(0, Math.min(10, score));

    const treeScale = 0.5 + (s / 10) * 1.5;
    const trunkHeight = 1.5 * treeScale;
    const leafSize = 0.4 * treeScale;

    // Color progression: 0=no leaves, 1-3=dark muted, 4-6=medium, 7-9=vibrant, 10=max
    const getLeafColors = () => {
        if (s <= 0) return []; // No leaves at all
        if (s <= 3) return ['#1a3a2a', '#224030', '#2a4838'];
        if (s <= 6) return ['#065f46', '#047857', '#059669', '#10b981'];
        if (s <= 9) return ['#059669', '#10b981', '#34d399', '#6ee7b7'];
        return ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
    };

    const leafColors = getLeafColors();
    const leafCount = s <= 0 ? 0 : Math.max(1, Math.floor(s * 1.5));

    const leaves = useMemo(() => {
        if (leafCount === 0 || leafColors.length === 0) return [];
        const result = [];
        const layers = Math.max(1, Math.min(5, Math.floor(s / 2)));
        for (let layer = 0; layer < layers; layer++) {
            const y = trunkHeight + layer * leafSize * 0.8;
            const radius = leafSize * (layers - layer) * 0.6;
            const count = Math.max(2, Math.min(6, leafCount - layer * 2));
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                result.push({
                    position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number],
                    scale: leafSize * (1 - layer * 0.08),
                    color: leafColors[i % leafColors.length],
                    speed: 1.2 + Math.random() * 0.6,
                });
            }
        }
        // Top leaf
        result.push({
            position: [0, trunkHeight + layers * leafSize * 0.8, 0] as [number, number, number],
            scale: leafSize * 0.7,
            color: leafColors[0],
            speed: 1.5,
        });
        return result;
    }, [s, trunkHeight, leafSize, leafCount]);

    const particleCount = s <= 2 ? 0 : Math.floor(s * 8);
    const particleColor = s > 6 ? '#34d399' : '#10b981';

    return (
        <group>
            <TreeTrunk height={trunkHeight} score={s} />
            {leaves.map((leaf, i) => (
                <BreathingLeaf key={i} {...leaf} score={s} />
            ))}
            {particleCount > 0 && (
                <GlowParticles count={particleCount} range={treeScale * 2} color={particleColor} speed={0.05} />
            )}
            {s >= 5 && <GlowRing radius={treeScale * 0.8} score={s} />}
            {s >= 8 && <GlowRing radius={treeScale * 1.2} score={s} />}
            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[2.5, 32]} />
                <meshStandardMaterial
                    color={s > 0 ? `hsl(${150 + s * 2}, ${30 + s * 5}%, ${8 + s * 2}%)` : '#1a1a1a'}
                    roughness={0.9}
                />
            </mesh>
        </group>
    );
}

export default function CarbonTree({ carbonPoints = 0 }: { carbonPoints?: number }) {
    // Convert raw points to 0-10 UI score
    const uiScore = Math.min(10, Math.max(0, Math.round(carbonPoints / 10)));

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
            <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20,
                color: uiScore > 5 ? '#34d399' : uiScore > 0 ? '#94a3b8' : '#64748b',
                fontSize: 12, fontWeight: 600, zIndex: 10, whiteSpace: 'nowrap',
            }}>
                🌿 Green Score: {uiScore}/10 ({carbonPoints} pts)
            </div>
            <Canvas camera={{ position: [3, 3, 5], fov: 50 }} dpr={[1, 2]}>
                <ambientLight intensity={0.3 + (uiScore / 10) * 0.3} />
                <directionalLight position={[5, 8, 5]} intensity={0.8 + (uiScore / 10) * 0.4} color="#ffffff" />
                <pointLight position={[-3, 5, -3]} intensity={0.2 + (uiScore / 10) * 0.5} color="#10b981" />
                {uiScore >= 7 && <pointLight position={[2, 3, 2]} intensity={0.3} color="#34d399" />}
                <Tree score={uiScore} />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2.1} />
                <fog attach="fog" args={['#0a0f1a', 8, 20]} />
            </Canvas>
        </div>
    );
}
