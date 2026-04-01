import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    delay: number;
    duration: number;
}

export const AnimatedBackground = () => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        // إنشاء جزيئات متوهجة عشوائية
        const particlesArray: Particle[] = [];
        const colors = [
            'rgba(139, 92, 246, 0.6)',   // أرجواني
            'rgba(59, 130, 246, 0.6)',   // أزرق
            'rgba(147, 51, 234, 0.6)',   // أرجواني داكن
            'rgba(96, 165, 250, 0.6)',   // أزرق فاتح
            'rgba(167, 139, 250, 0.6)',  // أرجواني فاتح
        ];

        for (let i = 0; i < 50; i++) {
            particlesArray.push({
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 2,
                duration: Math.random() * 3 + 2,
            });
        }
        setParticles(particlesArray);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* التدرج الأساسي */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, #2d1b4e 0%, #1a2332 50%, #0f1f3d 100%)',
                }}
            />

            {/* كرات التوهج الكبيرة */}
            <div className="absolute inset-0">
                <motion.div
                    className="absolute rounded-full filter blur-[120px]"
                    style={{
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                        top: '-10%',
                        left: '-10%',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                <motion.div
                    className="absolute rounded-full filter blur-[120px]"
                    style={{
                        width: '500px',
                        height: '500px',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                        bottom: '-10%',
                        right: '-10%',
                    }}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.4, 0.3],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                <motion.div
                    className="absolute rounded-full filter blur-[100px]"
                    style={{
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, transparent 70%)',
                        top: '40%',
                        right: '30%',
                    }}
                    animate={{
                        scale: [1, 1.15, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* النقاط المتوهجة الصغيرة */}
            <div className="absolute inset-0">
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className="absolute rounded-full"
                        style={{
                            left: `${particle.x}%`,
                            top: `${particle.y}%`,
                            width: `${particle.size}px`,
                            height: `${particle.size}px`,
                            background: particle.color,
                            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                        }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            delay: particle.delay,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </div>

            {/* خطوط الموجات العمودية (تأثير Matrix) */}
            <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} />
                            <stop offset="50%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
                            <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 0 }} />
                        </linearGradient>
                    </defs>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.line
                            key={i}
                            x1={`${i * 5}%`}
                            y1="0%"
                            x2={`${i * 5}%`}
                            y2="100%"
                            stroke="url(#waveGradient)"
                            strokeWidth="1"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0.1, 0.3, 0.1],
                                strokeWidth: [1, 2, 1],
                            }}
                            transition={{
                                duration: 3 + (i % 3),
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </svg>
            </div>

            {/* طبقة Noise للواقعية */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
};
