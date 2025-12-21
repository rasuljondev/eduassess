import React, { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  trail: Array<{ x: number; y: number; life: number }>;
  targetX: number;
  targetY: number;
}

interface Explosion {
  x: number;
  y: number;
  words: Array<{
    text: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  }>;
  life: number;
  maxLife: number;
}

export function BackgroundMeteorsDots({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const drawStar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    rotation = -Math.PI / 2
  ) => {
    let rot = rotation;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
      rot += step;
      ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
    }
    ctx.closePath();
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [darkModeKey, setDarkModeKey] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dimensions.width || window.innerWidth;
    canvas.height = dimensions.height || window.innerHeight;

    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark');

    const examTypes = ['SAT', 'IELTS', 'APTIS', 'CEFR'];

    // Initialize particles for dots - adjust colors based on theme
    const particleCount = 50;
    particlesRef.current = Array.from({ length: particleCount }, () => {
      // Lighter, more subtle colors for light mode
      const color1 = isDarkMode ? "99, 102, 241" : "99, 102, 241"; // Indigo
      const color2 = isDarkMode ? "139, 92, 246" : "139, 92, 246"; // Purple
      const opacity = isDarkMode ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.2; // More subtle in light mode
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 4 + 3,
        color: `rgba(${Math.random() > 0.5 ? color1 : color2}, ${opacity})`,
      };
    });

    const createMeteor = () => {
      // Start from left top area
      const startX = -50;
      const startY = Math.random() * (canvas.height * 0.3); // Top 30% of screen
      
      // Random target point on screen for explosion
      const targetX = Math.random() * canvas.width;
      const targetY = Math.random() * canvas.height;
      
      // Calculate velocity to reach target
      const distance = Math.sqrt(
        Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
      );
      const speed = 3 + Math.random() * 2;
      const timeToTarget = distance / speed;
      
      return {
        x: startX,
        y: startY,
        vx: (targetX - startX) / timeToTarget,
        vy: (targetY - startY) / timeToTarget,
        size: 2 + Math.random() * 2,
        targetX,
        targetY,
        trail: [] as Array<{ x: number; y: number; life: number }>,
      };
    };

    // Initialize meteors
    const meteorCount = 3;
    meteorsRef.current = Array.from({ length: meteorCount }, () => createMeteor());

    const createExplosion = (x: number, y: number) => {
      // Create one word for each exam type - spread in all directions
      const words = examTypes.map((text, index) => {
        const angle = (Math.PI * 2 * index) / examTypes.length;
        const speed = 2 + Math.random() * 2;
        return {
          text,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 1,
        };
      });

      explosionsRef.current.push({
        x,
        y,
        words,
        life: 1,
        maxLife: 1,
      });
    };

    const animate = () => {
      // Check dark mode dynamically
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const meteors = meteorsRef.current;
      const explosions = explosionsRef.current;

      // Update and draw particles (dots)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Keep in bounds
        p.x = Math.max(0, Math.min(canvas.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height, p.y));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const connectionOpacity = isDarkMode ? 0.7 : 0.2; // More subtle in light mode
            ctx.strokeStyle = `rgba(99, 102, 241, ${connectionOpacity * (1 - distance / 200)})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Collision detection
          if (distance < p.radius + p2.radius) {
            const angle = Math.atan2(dy, dx);
            const sin = Math.sin(angle);
            const cos = Math.cos(angle);

            const vx1 = p.vx * cos + p.vy * sin;
            const vy1 = p.vy * cos - p.vx * sin;
            const vx2 = p2.vx * cos + p2.vy * sin;
            const vy2 = p2.vy * cos - p2.vx * sin;

            const vx1Final = vx2;
            const vx2Final = vx1;

            p.vx = vx1Final * cos - vy1 * sin;
            p.vy = vy1 * cos + vx1Final * sin;
            p2.vx = vx2Final * cos - vy2 * sin;
            p2.vy = vy2 * cos + vx2Final * sin;

            const overlap = p.radius + p2.radius - distance;
            const separationX = (dx / distance) * overlap * 0.5;
            const separationY = (dy / distance) * overlap * 0.5;
            p.x += separationX;
            p.y += separationY;
            p2.x -= separationX;
            p2.y -= separationY;
          }
        }
      }

      // Update and draw meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        
        // Update position
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;

        // Add to trail
        meteor.trail.push({ x: meteor.x, y: meteor.y, life: 1 });
        if (meteor.trail.length > 15) {
          meteor.trail.shift();
        }

        // Update trail life
        for (let j = 0; j < meteor.trail.length; j++) {
          meteor.trail[j].life -= 0.1;
        }

        // Draw trail
        for (let j = 0; j < meteor.trail.length - 1; j++) {
          const point = meteor.trail[j];
          const nextPoint = meteor.trail[j + 1];
          if (point.life > 0) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(nextPoint.x, nextPoint.y);
            const trailOpacity = isDarkMode ? 0.6 : 0.3; // More subtle in light mode
            ctx.strokeStyle = `rgba(99, 102, 241, ${point.life * trailOpacity})`;
            ctx.lineWidth = meteor.size;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Draw meteor head (star)
        const meteorOpacity = isDarkMode ? 0.95 : 0.55; // More subtle in light mode
        const outer = meteor.size * 1.6;
        const inner = meteor.size * 0.7;
        const rotation = Math.atan2(meteor.vy, meteor.vx) - Math.PI / 2;

        ctx.save();
        ctx.shadowBlur = isDarkMode ? 16 : 8;
        ctx.shadowColor = `rgba(99, 102, 241, ${isDarkMode ? 0.8 : 0.35})`;
        ctx.fillStyle = `rgba(99, 102, 241, ${meteorOpacity})`;
        drawStar(ctx, meteor.x, meteor.y, 5, outer, inner, rotation);
        ctx.fill();
        ctx.restore();

        // Check if meteor reached target (explode)
        const distanceToTarget = Math.sqrt(
          Math.pow(meteor.x - meteor.targetX, 2) + Math.pow(meteor.y - meteor.targetY, 2)
        );
        
        if (distanceToTarget < 10) {
          // Create explosion at target
          createExplosion(meteor.targetX, meteor.targetY);
          
          // Create new meteor
          meteors[i] = createMeteor();
        }

        // Remove if off screen
        if (meteor.x > canvas.width + 50 || meteor.y > canvas.height + 50) {
          meteors[i] = createMeteor();
        }
      }

      // Update and draw explosions
      for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        // Fade out in 1 second (60 frames at 60fps)
        explosion.life -= 1 / 60;

        // Update words
        for (let j = 0; j < explosion.words.length; j++) {
          const word = explosion.words[j];
          word.x += word.vx;
          word.y += word.vy;
          word.vy += 0.05; // Slight gravity
          word.vx *= 0.98; // Friction
          word.vy *= 0.98; // Friction
          word.life = explosion.life;
        }

        // Draw explosion words
        const alpha = Math.max(0, explosion.life);
        if (alpha > 0) {
          const colors = [
            [99, 102, 241],   // Indigo
            [139, 92, 246],   // Purple
            [59, 130, 246],    // Blue
            [168, 85, 247],   // Violet
          ];

          for (let j = 0; j < explosion.words.length; j++) {
            const word = explosion.words[j];
            const wordAlpha = alpha;
            const color = colors[j % colors.length];
            const textOpacity = isDarkMode ? wordAlpha : wordAlpha * 0.6; // More subtle in light mode
            
            // Set font properties
            ctx.font = `bold ${18 + alpha * 8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw text shadow/glow - more subtle in light mode
            ctx.shadowBlur = isDarkMode ? 10 : 5;
            ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${textOpacity * 0.5})`;
            ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${textOpacity})`;
            ctx.fillText(
              word.text,
              explosion.x + word.x,
              explosion.y + word.y
            );
            ctx.shadowBlur = 0;
          }
        }

        // Remove dead explosions
        if (explosion.life <= 0) {
          explosions.splice(i, 1);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, darkModeKey]);

  // Watch for dark mode changes and trigger re-initialization
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Force re-initialization by updating key
      setDarkModeKey(prev => prev + 1);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

