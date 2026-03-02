import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════
// 3D FACTORY SCENE — Industry Dashboard
// -100 points: heavy grey smoke, no plants
// -10 or better: clean building, full green plants
// ═══════════════════════════════════════════

function FactoryBuilding() {
    return (
        <group>
            {/* Main building */}
            <mesh position={[0, 1.2, 0]}>
                <boxGeometry args={[3, 2.4, 2]} />
                <meshStandardMaterial color="#4a5568" roughness={0.8} metalness={0.2} />
            </mesh>
            {/* Roof */}
            <mesh position={[0, 2.55, 0]}>
                <boxGeometry args={[3.2, 0.3, 2.2]} />
                <meshStandardMaterial color="#374151" roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Windows */}
            {[-0.8, 0, 0.8].map((x, i) => (
                <mesh key={i} position={[x, 1.2, 1.01]}>
                    <planeGeometry args={[0.4, 0.5]} />
                    <meshStandardMaterial color="#93c5fd" emissive="#3b82f6" emissiveIntensity={0.3} transparent opacity={0.8} />
                </mesh>
            ))}
            {/* Door */}
            <mesh position={[0, 0.5, 1.01]}>
                <planeGeometry args={[0.5, 1]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
        </group>
    );
}

function Chimney({ position, smokeIntensity }: { position: [number, number, number]; smokeIntensity: number }) {
    return (
        <group position={position}>
            {/* Chimney cylinder */}
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
                <meshStandardMaterial color="#374151" roughness={0.9} />
            </mesh>
            {/* Chimney top */}
            <mesh position={[0, 2.1, 0]}>
                <cylinderGeometry args={[0.22, 0.15, 0.2, 8]} />
                <meshStandardMaterial color="#1f2937" roughness={0.9} />
            </mesh>
            {/* Smoke */}
            {smokeIntensity > 0 && <SmokeParticles count={Math.floor(smokeIntensity * 40)} position={[0, 2.2, 0]} />}
        </group>
    );
}

function SmokeParticles({ count, position }: { count: number; position: [number, number, number] }) {
    const ref = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 0.5 + position[0];
            pos[i + 1] = Math.random() * 3 + position[1];
            pos[i + 2] = (Math.random() - 0.5) * 0.5 + position[2];
        }
        return pos;
    }, [count, position]);

    useFrame(({ clock }) => {
        if (ref.current) {
            const geo = ref.current.geometry;
            const posArr = geo.attributes.position.array as Float32Array;
            for (let i = 1; i < posArr.length; i += 3) {
                posArr[i] += 0.008;
                if (posArr[i] > position[1] + 4) {
                    posArr[i] = position[1];
                    posArr[i - 1] = (Math.random() - 0.5) * 0.5 + position[0];
                    posArr[i + 1] = (Math.random() - 0.5) * 0.5 + position[2];
                }
            }
            geo.attributes.position.needsUpdate = true;
            ref.current.rotation.y = clock.elapsedTime * 0.1;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.12} color="#6b7280" transparent opacity={0.5} sizeAttenuation />
        </points>
    );
}

function Bush({ position, scale, color }: { position: [number, number, number]; scale: number; color: string }) {
    const ref = useRef<THREE.Mesh>(null);
    const offset = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            const breathe = 1 + Math.sin(clock.elapsedTime * 1.2 + offset) * 0.04;
            ref.current.scale.set(breathe, breathe, breathe);
        }
    });

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[scale, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.1} />
        </mesh>
    );
}

function SmallTree({ position, height, leafColor }: { position: [number, number, number]; height: number; leafColor: string }) {
    const ref = useRef<THREE.Group>(null);
    const offset = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.4 + offset) * 0.05;
        }
    });

    return (
        <group ref={ref} position={position}>
            <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.04, 0.06, height, 6]} />
                <meshStandardMaterial color="#5c3d2e" />
            </mesh>
            <mesh position={[0, height + 0.15, 0]}>
                <sphereGeometry args={[0.25, 8, 6]} />
                <meshStandardMaterial color={leafColor} emissive={leafColor} emissiveIntensity={0.08} />
            </mesh>
        </group>
    );
}

function FactoryScene({ carbonPoints }: { carbonPoints: number }) {
    // carbonPoints: negative = polluting, positive = clean
    // -100 → full smoke, no plants
    // -10 or better → no smoke, full plants
    const normalizedScore = Math.max(-100, Math.min(0, carbonPoints));
    const cleanness = (normalizedScore + 100) / 100; // 0 = dirty, 1 = clean

    const smokeIntensity = Math.max(0, 1 - cleanness); // 1 = full smoke, 0 = no smoke
    const plantDensity = cleanness; // 0 = no plants, 1 = full plants

    // Generate plants around factory
    const plants = useMemo(() => {
        const result: any[] = [];
        const numPlants = Math.floor(plantDensity * 12);
        const plantColors = cleanness > 0.7
            ? ['#10b981', '#34d399', '#6ee7b7']
            : cleanness > 0.3
                ? ['#065f46', '#047857', '#059669']
                : ['#1a3a2a', '#224030'];

        for (let i = 0; i < numPlants; i++) {
            const angle = (i / numPlants) * Math.PI * 2;
            const radius = 2.5 + Math.random() * 1.5;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            if (Math.random() > 0.5) {
                result.push({
                    type: 'tree',
                    position: [x, 0, z] as [number, number, number],
                    height: 0.4 + Math.random() * 0.4,
                    color: plantColors[i % plantColors.length],
                });
            } else {
                result.push({
                    type: 'bush',
                    position: [x, 0.15, z] as [number, number, number],
                    scale: 0.15 + Math.random() * 0.15,
                    color: plantColors[i % plantColors.length],
                });
            }
        }
        return result;
    }, [plantDensity, cleanness]);

    // Ground color: grey → green
    const groundHue = 150;
    const groundSat = Math.floor(cleanness * 50);
    const groundLight = Math.floor(8 + cleanness * 15);
    const groundColor = `hsl(${groundHue}, ${groundSat}%, ${groundLight}%)`;

    // Sky/atmosphere color
    const fogColor = cleanness > 0.7
        ? '#0a0f1a'
        : cleanness > 0.3
            ? '#121820'
            : '#1a1a1a';

    return (
        <group>
            <FactoryBuilding />
            <Chimney position={[-0.8, 2.7, -0.5]} smokeIntensity={smokeIntensity} />
            <Chimney position={[0.8, 2.7, -0.5]} smokeIntensity={smokeIntensity * 0.7} />

            {/* Plants */}
            {plants.map((p, i) =>
                p.type === 'tree' ? (
                    <SmallTree key={i} position={p.position} height={p.height} leafColor={p.color} />
                ) : (
                    <Bush key={i} position={p.position} scale={p.scale} color={p.color} />
                )
            )}

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <circleGeometry args={[5, 32]} />
                <meshStandardMaterial color={groundColor} roughness={0.9} />
            </mesh>

            {/* Atmosphere haze for polluted scenes */}
            {smokeIntensity > 0.3 && (
                <mesh position={[0, 2, 0]}>
                    <sphereGeometry args={[6, 16, 16]} />
                    <meshStandardMaterial
                        color="#6b7280"
                        transparent
                        opacity={smokeIntensity * 0.08}
                        side={THREE.BackSide}
                    />
                </mesh>
            )}
        </group>
    );
}

export default function IndustryScene({ carbonPoints = -50 }: { carbonPoints?: number }) {
    const cleanness = Math.max(0, (carbonPoints + 100) / 100);
    const label = carbonPoints >= -10 ? '🌿 Clean' : carbonPoints >= -50 ? '🏭 Moderate' : '💨 Polluting';
    const labelColor = carbonPoints >= -10 ? '#34d399' : carbonPoints >= -50 ? '#fbbf24' : '#ef4444';

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
            <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20,
                color: labelColor, fontSize: 12, fontWeight: 600, zIndex: 10, whiteSpace: 'nowrap',
            }}>
                {label} ({carbonPoints} pts)
            </div>
            <Canvas camera={{ position: [5, 4, 7], fov: 50 }} dpr={[1, 2]}>
                <ambientLight intensity={0.3 + cleanness * 0.3} />
                <directionalLight position={[5, 8, 5]} intensity={0.6 + cleanness * 0.4} color="#ffffff" />
                {cleanness > 0.5 && <pointLight position={[-3, 3, 3]} intensity={0.3} color="#10b981" />}
                <FactoryScene carbonPoints={carbonPoints} />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 2.1} />
                <fog attach="fog" args={[cleanness > 0.5 ? '#0a0f1a' : '#1a1a1a', 10, 25]} />
            </Canvas>
        </div>
    );
}
