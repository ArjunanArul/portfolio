import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import NeuralBackground from './components/ui/flow-field-background';
import { MeshGradientSVG } from './components/ui/shader-svg';
import { DottedSurface } from './components/ui/dotted-surface';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameCount = 178;

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isPreloading, setIsPreloading] = useState(!isMobile);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, { 
    stiffness: 400,
    damping: 40,
    mass: 1,
    restDelta: 0.001 
  });

  const drawToCanvas = (exactIndex: number) => {
    const canvas = canvasRef.current;
    const images = imagesRef.current;
    if (!canvas || images.length === 0) return;
    
    const frameIndex = Math.max(0, Math.min(frameCount - 1, Math.round(exactIndex)));
    const img = images[frameIndex];
    if (!img || !img.width) return;
    
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }
    
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0);
  };

  useEffect(() => {
    if (isMobile) {
      setIsPreloading(false);
      return;
    }
    
    const loadedImages: HTMLImageElement[] = [];
    let loaded = 0;
    
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = `/images/herosection/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;
        
        const handleImageLoad = async () => {
            try { await img.decode(); } catch(e) {}
            loaded++;
            setLoadedCount(loaded);
            if (i === 1) requestAnimationFrame(() => drawToCanvas(0));
        };

        const handleImageError = () => {
            loaded++;
            setLoadedCount(loaded);
        };

        img.onload = handleImageLoad;
        img.onerror = handleImageError;
        loadedImages.push(img);
    }
    imagesRef.current = loadedImages;
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile && loadedCount >= frameCount) {
      const timer = setTimeout(() => {
        setIsPreloading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loadedCount, isMobile]);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (isMobile) return;
    const maxIndex = frameCount - 1;
    // Map scroll progress [0, 0.8] to frame index [0, maxIndex] to ensure the animation
    // reaches its last frame fully visible before the canvas starts fading out.
    const animationProgress = Math.min(1.0, latest / 0.8);
    const preciseIndex = animationProgress * maxIndex; 
    requestAnimationFrame(() => drawToCanvas(preciseIndex));
  });

  // Hero intro fades out and scales down as user starts scrolling
  const heroOpacity = useTransform(smoothProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.1], [1, 0.95]);

  // We gracefully fade the canvas video out during the final 100vh overlap (0.8 to 1.0)
  const canvasOpacity = useTransform(smoothProgress, [0.8, 1], [1, 0]);

  return (
    <div className="min-h-screen text-white font-sans selection:bg-white/20">
      <div className="noise" />

      <AnimatePresence>
        {isPreloading && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }}
            className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center font-mono select-none px-6"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            
            <div className="w-full max-w-md flex flex-col items-start gap-4 z-10">
              <div className="w-full flex justify-between items-end text-xs text-white/40 tracking-widest uppercase">
                <span className="text-indigo-400 font-bold animate-pulse">▲ ARJUN_ARUL.SYS</span>
                <span>STABLE v2.04</span>
              </div>
              
              <div className="text-xl md:text-2xl font-bold tracking-tight text-white/90 uppercase mt-4">
                Loading Visual Assets
              </div>

              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 rounded-full"
                  style={{ width: `${(loadedCount / frameCount) * 100}%` }}
                />
              </div>

              <div className="w-full flex justify-between text-xs text-white/60 tracking-wider">
                <span>{loadedCount} / {frameCount} FRAMES DECODED</span>
                <span className="font-bold text-white text-sm">
                  {Math.round((loadedCount / frameCount) * 100)}%
                </span>
              </div>

              <div className="w-full mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] text-white/30 space-y-1 select-none">
                <div>&gt; CONNECTING TO CDN REPOSITORY... OK</div>
                <div>&gt; DOWNLOADING SEQUENCE: ezgif-frame-{String(Math.min(frameCount, loadedCount + 1)).padStart(3, '0')}.jpg</div>
                <div>&gt; HARDWARE ACCELERATED RENDER PIXEL BUFFERS... ACTIVE</div>
                <div>&gt; READY STATE: {loadedCount === frameCount ? "COMPLETE" : "COMPILING..."}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BACKGROUND LAYER: Flow field runs globally behind the entire site */}
      {/* This ensures that when the hero video fades out, the particles are seamlessly revealed behind it */}
      <div className="fixed inset-0 z-[-1] bg-black">
         <NeuralBackground 
           color="#a5b4fc" // Lighter indigo for a brighter trace
           trailOpacity={0.06} // Reduced so the particles pop and carry light clearly
           speed={0.8}
           particleCount={1200} // Extra dense for a brighter star-field presence
         />
         <div className="absolute inset-0 bg-gradient-to-b from-[#010101]/90 via-transparent to-[#030303]/90 pointer-events-none" />
      </div>

      {/* 300vh SCROLLING HERO SECTION (plays animation across exactly two viewport heights of scroll, 100vh on mobile) */}
      <div ref={containerRef} className="relative z-10" style={{ height: isMobile ? "100vh" : "300vh" }}>
        <div className={`${isMobile ? "relative" : "sticky top-0"} h-screen w-full overflow-hidden flex flex-col items-center justify-center`}>
          
          {/* NATIVE CANVAS OR FALLBACK IMAGE BACKGROUND */}
          <motion.div style={{ opacity: isMobile ? 1 : canvasOpacity }} className="absolute inset-0 z-0 bg-black">
            {isMobile ? (
              <img 
                src="/images/herosection/ezgif-frame-001.jpg"
                alt="Hero background"
                className="w-full h-full object-cover scale-[1.01] opacity-30"
                style={{ filter: "contrast(1.03) saturate(1.05)" }}
              />
            ) : (
              <canvas 
                ref={canvasRef}
                className="w-full h-full object-cover scale-[1.01]"
                style={{ filter: "contrast(1.03) saturate(1.05)" }}
              />
            )}
            {/* Subtle gradient overlay to retain visual depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent mix-blend-multiply"></div>
          </motion.div>

          {/* HERO INTRO (Visible at first opening screen, fades out as you scroll) */}
          <motion.div 
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none z-10"
            style={{ opacity: isMobile ? 1 : heroOpacity, scale: isMobile ? 1 : heroScale }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-[3rem] md:text-[6rem] lg:text-[8rem] font-bold tracking-tighter leading-[0.9] uppercase text-white shadow-2xl drop-shadow-2xl"
            >
              ARJUN ARUL
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-lg md:text-xl text-white/80 font-light tracking-widest drop-shadow-md uppercase"
            >
              Visual Creative Story Teller
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-12 flex flex-col items-center gap-2"
            >
              <span className="text-[0.65rem] font-bold tracking-[0.25em] uppercase text-white drop-shadow-md animate-pulse">
                {isMobile ? "Scroll to know more" : "Swipe to know more"}
              </span>
              <motion.div 
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-transparent rounded-full"
              />
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* ABOUT ME SECTION (Overlaps the final 100vh of the hero scroll on desktop with negative margin!) */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 min-h-screen py-24 flex flex-col justify-center px-4 md:px-8 mt-0 md:-mt-[100vh] overflow-hidden bg-black/60 backdrop-blur-sm"
      >
        <DottedSurface />
        <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 lg:gap-20 items-center">
          
          {/* LEFT: TITLE & BIO */}
          <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight uppercase mb-4 drop-shadow-2xl text-white leading-[0.9]">
                About Me
              </h2>
              <div className="h-1 w-20 bg-indigo-500 mx-auto lg:mx-0 rounded mb-8"></div>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl lg:text-2xl text-white/80 font-light leading-relaxed mb-6"
            >
              I am <strong className="text-white font-medium">Arjun Arul</strong>, a 2024 B.Tech graduate from <span className="text-white font-medium">Mar Athanasius College of Engineering</span> (MACE), Kothamangalam.
            </motion.p>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg lg:text-xl text-white/50 font-light leading-relaxed"
            >
              I am a cinematographer, video editor, podcast director, marketer, and event organizer. Over the past year, I have been deeply involved with the <span className="text-white/80 font-medium">KPH Community</span>, wearing multiple hats and executing high-impact creative projects from the ground up.
            </motion.p>
          </div>

          {/* RIGHT: BENTO STATS / ACHIEVEMENTS */}
          <div className="w-full lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-[#050505] border border-white/5 p-8 rounded-3xl flex flex-col items-start justify-center hover:border-indigo-500/30 transition-colors group shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-20 blur-2xl pointer-events-none group-hover:bg-indigo-500 transition-colors w-32 h-32 rounded-full"></div>
              <span className="text-indigo-400 font-bold tracking-widest text-[0.65rem] uppercase mb-3 relative z-10">Production</span>
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-2 relative z-10">40+</h3>
              <p className="text-sm text-white/50 leading-relaxed font-light relative z-10">Podcasts visually directed, shot, and fully edited.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-[#050505] border border-white/5 p-8 rounded-3xl flex flex-col items-start justify-center hover:border-indigo-500/30 transition-colors group shadow-2xl md:translate-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-20 blur-2xl pointer-events-none group-hover:bg-indigo-500 transition-colors w-32 h-32 rounded-full"></div>
              <span className="text-indigo-400 font-bold tracking-widest text-[0.65rem] uppercase mb-3 relative z-10">Viral Growth</span>
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-2 relative z-10">100k+</h3>
              <p className="text-sm text-white/50 leading-relaxed font-light relative z-10">Consistent views generated across multiple short-form reels.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="bg-[#050505] border border-white/5 p-8 xl:p-10 rounded-3xl flex flex-col items-start justify-center hover:border-indigo-500/30 transition-colors group shadow-2xl md:col-span-2 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-20 blur-3xl pointer-events-none group-hover:bg-indigo-500 transition-colors w-64 h-64 rounded-full"></div>
              <span className="text-indigo-400 font-bold tracking-widest text-[0.65rem] uppercase mb-3 relative z-10">Leadership & Events</span>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-3 relative z-10">KPH Hackathon 2025</h3>
              <p className="text-sm text-white/50 leading-relaxed font-light relative z-10 max-w-xl">Personally organized and hosted the major hackathon event from end to end, coordinating massive teams and managing flawless real-time execution.</p>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* WHAT I DO SECTION */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 min-h-screen py-24 lg:py-0 lg:h-screen flex flex-col justify-center px-4 md:px-8 border-t border-white/5 bg-black/75 backdrop-blur-sm"
      >
        <div className="w-full max-w-6xl mx-auto relative z-10 drop-shadow-2xl">
          <div className="max-w-4xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 lg:mb-6 leading-[1.1] uppercase text-white drop-shadow-xl"
            >
              Who am I? What do I do?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl lg:text-2xl text-white/80 font-light leading-relaxed drop-shadow-md mb-8 md:mb-12"
            >
              I am a <span className="text-white font-medium">creative visual storyteller</span>. I help brands and creators scale through <span className="text-white font-medium">high-impact video & AI content</span>—handling absolutely everything from concept and shoot to final edit and distribution.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 border-t border-white/10 pt-8 lg:pt-10">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.2 }}
               className="bg-gradient-to-b from-white/5 to-transparent p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-sm hover:border-white/20 transition-colors shadow-2xl"
            >
              <h3 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/50 mb-2">01 — Production</h3>
              <h4 className="text-xl lg:text-2xl font-medium mb-2 text-white">Shoot & Direct</h4>
              <p className="text-white/70 text-sm font-light leading-relaxed">Handling the physical realities of production. Expertly crafting the lighting, operating the camera, and directing the entire cinematography pipeline.</p>
            </motion.div>
            
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.3 }}
               className="bg-gradient-to-b from-white/5 to-transparent p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-sm hover:border-white/20 transition-colors shadow-2xl"
            >
              <h3 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/50 mb-2">02 — Post-Production</h3>
              <h4 className="text-xl lg:text-2xl font-medium mb-2 text-white">Edit & Motion</h4>
              <p className="text-white/70 text-sm font-light leading-relaxed">Breathing life into the raw footage. Delivering precision editing, seamless motion typography, and high-end post-production finishing.</p>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: 0.4 }}
               className="bg-gradient-to-b from-white/5 to-transparent p-6 lg:p-8 rounded-3xl border border-white/5 backdrop-blur-sm hover:border-white/20 transition-colors shadow-2xl"
            >
              <h3 className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/50 mb-2">03 — Growth</h3>
              <h4 className="text-xl lg:text-2xl font-medium mb-2 text-white">Algorithm & Reach</h4>
              <p className="text-white/70 text-sm font-light leading-relaxed">Mastering the algorithmic distribution game. Strategically posting on YouTube and Instagram to exploit trends and maximize organic analytics.</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* IMPACT / PROOF OF WORK SECTION (Sits naturally below 'What I Do') */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 py-12 lg:py-16 flex flex-col justify-center px-4 md:px-8 border-t border-white/5 bg-black/60 backdrop-blur-sm overflow-hidden"
      >
        <div className="w-full max-w-7xl mx-auto relative z-10 drop-shadow-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 lg:mb-12"
          >
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase mb-3 drop-shadow-lg text-white">
              The Impact
            </h2>
            <p className="text-indigo-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
              Proof Of Work & Numbers
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            
            {/* LEFT SIDE: CARDS (Previously right side) */}
            <div className="w-full lg:w-[45%] flex flex-col gap-5">
              {/* CARD 1 */}
              <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.2 }}
                 className="bg-[#050505]/60 backdrop-blur-md p-8 lg:p-10 rounded-3xl border border-white/5 hover:border-white/20 transition-colors shadow-2xl flex flex-col justify-center w-full"
              >
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/50 mb-6">01 — Community</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-4xl lg:text-5xl font-bold text-white mb-2">19K+</h4>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-widest leading-relaxed">YouTube Subs <br className="hidden lg:block"/><span className="lowercase normal-case text-white/40">(from 8K)</span></p>
                  </div>
                  <div>
                    <h4 className="text-4xl lg:text-5xl font-bold text-white mb-2">28K+</h4>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-widest leading-relaxed">Ig Followers <br className="hidden lg:block"/><span className="lowercase normal-case text-white/40">(from 6K)</span></p>
                  </div>
                </div>
              </motion.div>

              {/* CARD 2 */}
              <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.3 }}
                 className="bg-indigo-950/30 backdrop-blur-md p-8 lg:p-10 rounded-3xl border border-indigo-500/30 hover:border-indigo-500/60 transition-colors shadow-2xl flex flex-col justify-center w-full relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl pointer-events-none">
                  <div className="w-32 h-32 bg-indigo-500 rounded-full"></div>
                </div>
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-300 mb-6 relative z-10">02 — Viral Reach</h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <h4 className="text-4xl lg:text-5xl font-bold text-indigo-400 mb-2">Multiple 1M+</h4>
                    <p className="text-indigo-200/60 text-xs font-medium uppercase tracking-widest leading-relaxed">View Videos on Instagram</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 border-t border-indigo-500/20 pt-6">
                    <div>
                      <h4 className="text-2xl lg:text-3xl font-bold text-white mb-2">Two 50K+</h4>
                      <p className="text-indigo-200/60 text-[0.65rem] font-medium uppercase tracking-widest">Video Podcasts</p>
                    </div>
                    <div>
                      <h4 className="text-xl lg:text-2xl font-bold text-white/80 mb-2">Several 100K+</h4>
                      <p className="text-indigo-200/40 text-[0.65rem] font-medium uppercase tracking-widest">Shorts & Reels</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT SIDE: THE GRAPH (Previously left side) */}
            <div className="w-full lg:w-[55%] relative flex items-center justify-center min-h-[300px] md:min-h-[350px]">
              <div className="w-full relative z-10 opacity-100 drop-shadow-2xl flex items-center justify-center">
                <svg 
                  viewBox="0 0 1000 600" 
                  className="w-full h-[250px] sm:h-[300px] md:h-auto max-h-[350px]"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id="exponentialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                      <stop offset="40%" stopColor="#6366f1" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#a5b4fc" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="exponentialFill" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0" />
                      <stop offset="60%" stopColor="#6366f1" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>

                  {/* Subtle Grid Lines behind the graph to emulate charting */}
                  <line x1="0" y1="500" x2="1000" y2="500" stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="0" y1="350" x2="1000" y2="350" stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="0" y1="200" x2="1000" y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="0" y1="50" x2="1000" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="6 6" />
                  
                  <line x1="200" y1="0" x2="200" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="400" y1="0" x2="400" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="600" y1="0" x2="600" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="2" strokeDasharray="6 6" />
                  <line x1="800" y1="0" x2="800" y2="600" stroke="rgba(255,255,255,0.02)" strokeWidth="2" strokeDasharray="6 6" />

                  {/* Glowing Graph Area Fill */}
                  <motion.path 
                    d="M 50 550 C 400 520, 600 350, 950 50 L 950 550 L 50 550 Z"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    fill="url(#exponentialFill)" 
                  />

                  {/* Animated SVG Line physically rising up into exponential growth */}
                  <motion.path 
                    d="M 50 550 C 400 520, 600 350, 950 50"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    fill="none" 
                    stroke="url(#exponentialGrad)" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                  />
                  
                  {/* Glowing Peak Dot rising along with the line */}
                  <motion.circle 
                    cx="950" 
                    cy="50"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.8, ease: "easeOut" }}
                    r="10" fill="#ffffff" 
                    className="drop-shadow-[0_0_20px_rgba(255,255,255,1)]"
                  />
                </svg>
              </div>
            </div>
            
          </div>
        </div>
      </motion.section>

      {/* SKILLS / PROFICIENCIES SECTION */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 min-h-screen lg:h-screen py-16 lg:py-0 flex flex-col justify-center px-4 md:px-8 border-t border-white/5 overflow-hidden bg-[#030303]"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#010101] via-transparent to-[#010101] opacity-50 pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto relative z-10 drop-shadow-2xl flex flex-col justify-center h-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 lg:mb-12 shrink-0"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase mb-2 drop-shadow-2xl text-white">
              The Arsenal
            </h2>
            <p className="text-indigo-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
              Core Abilities & Disciplines
            </p>
          </motion.div>

          <div className="relative flex flex-col items-center justify-center min-h-[500px] lg:h-[70vh] w-full mt-2">
            
            {/* CENTER: THE EYE / SHADER */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              viewport={{ once: true }}
              className="relative z-20 flex items-center justify-center pointer-events-auto scale-95 lg:scale-100"
            >
               <div className="relative drop-shadow-[0_0_80px_rgba(99,102,241,0.3)] w-full max-w-[280px] lg:max-w-sm">
                 <MeshGradientSVG />
               </div>
            </motion.div>

            {/* THE SKILLS (Absolute on Desktop, Grid on Mobile) */}
            <div className="w-full lg:absolute lg:inset-0 lg:z-10 grid grid-cols-2 lg:block gap-x-4 gap-y-10 mt-12 lg:mt-0 pointer-events-none">
               
               {/* 1. Video Editor */}
               <motion.div 
                 initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                 className="lg:absolute lg:top-[2%] lg:left-[5%] flex flex-col items-center lg:items-start text-center lg:text-left"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">01</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Video<br/>Editor</h3>
               </motion.div>

               {/* 2. Cinematographer */}
               <motion.div 
                 initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                 className="lg:absolute lg:top-[2%] lg:right-[5%] flex flex-col items-center lg:items-end text-center lg:text-right"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">02</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Cinemato<br/>grapher</h3>
               </motion.div>

               {/* 3. Photographer */}
               <motion.div 
                 initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                 className="lg:absolute lg:top-[38%] lg:-translate-y-1/2 lg:left-0 flex flex-col items-center lg:items-start text-center lg:text-left"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">03</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Photo<br/>grapher</h3>
               </motion.div>

               {/* 4. Podcast Director */}
               <motion.div 
                 initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
                 className="lg:absolute lg:top-[38%] lg:-translate-y-1/2 lg:right-0 flex flex-col items-center lg:items-end text-center lg:text-right"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">04</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Podcast<br/>Director</h3>
               </motion.div>

               {/* 5. Event Organizer */}
               <motion.div 
                 initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 }}
                 className="lg:absolute lg:bottom-[2%] lg:left-[5%] flex flex-col items-center lg:items-start text-center lg:text-left"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">05</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Event<br/>Organizer</h3>
               </motion.div>

               {/* 6. Marketer */}
               <motion.div 
                 initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }}
                 className="lg:absolute lg:bottom-[2%] lg:right-[5%] flex flex-col items-center lg:items-end text-center lg:text-right"
               >
                  <span className="text-[0.65rem] lg:text-xs font-bold tracking-[0.2em] uppercase text-indigo-400 mb-1 lg:mb-2">06</span>
                  <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wider drop-shadow-2xl leading-[1.1] lg:leading-[0.9]">Growth<br/>Marketer</h3>
               </motion.div>

            </div>
          </div>
        </div>
      </motion.section>



      {/* PODCASTS SECTION (Sits naturally below the 'About Me' section) */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 min-h-screen py-24 lg:py-0 lg:h-screen flex flex-col justify-center px-4 md:px-8 border-t border-white/5 bg-black/30 backdrop-blur-md"
      >
        <div className="w-full max-w-6xl mx-auto relative z-10 drop-shadow-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 lg:mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight uppercase mb-3 drop-shadow-lg">
              Previous Works
            </h2>
            <p className="text-white/60 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
              Podcasts Directed & Edited By Me
            </p>
          </motion.div>

          {/* 6 Column Grid, scaled down tightly so it fits beautifully into completely one viewport height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { id: 'mfQezc7jd_4', url: 'https://youtu.be/mfQezc7jd_4', num: 1 },
              { id: 'gEtRAlRnOwI', url: 'https://youtu.be/gEtRAlRnOwI', num: 2 },
              { id: 'Y0X5JGMAFPU', url: 'https://youtu.be/Y0X5JGMAFPU', num: 3 },
              { id: 'pkOuaxfC-r4', url: 'https://youtu.be/pkOuaxfC-r4', num: 4 },
              { id: '-FtHbr-fKq8', url: 'https://youtu.be/-FtHbr-fKq8', num: 5 },
              { id: '85-_rOTJUqk', url: 'https://youtu.be/85-_rOTJUqk', num: 6 }
            ].map((podcast, i) => (
              <motion.a 
                key={podcast.id} 
                href={podcast.url} 
                target="_blank" 
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px" }}
                // Faster staggered entry and native 16:9 aspect ratio to heavily reduce height footprint
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative aspect-video bg-[#111] rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors duration-500 block shadow-xl"
              >
                {/* Dynamically pulling max resolution YouTube Thumbnails directly from the source */}
                <img 
                   src={`https://i.ytimg.com/vi/${podcast.id}/maxresdefault.jpg`} 
                   alt={`Podcast 0${podcast.num}`}
                   className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[800ms] ease-out"
                   onError={(e) => {
                     e.currentTarget.onerror = null;
                     e.currentTarget.src = `https://i.ytimg.com/vi/${podcast.id}/mqdefault.jpg`;
                   }}
                />
                
                {/* Scaled down Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-500 shadow-xl">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>

                {/* Scaled down Text Banner */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-[#010101] via-[#010101]/80 to-transparent">
                  <h3 className="font-medium text-base md:text-lg text-white group-hover:text-amber-500 transition-colors duration-500">Episode 0{podcast.num}</h3>
                  <p className="text-white/60 text-[0.65rem] tracking-widest uppercase mt-1 group-hover:text-white/90 transition-colors duration-500 font-bold">Watch on YouTube</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.section>

      {/* AI AVATAR SHOWCASE SECTION (Larger Showcase with Matching Heading) */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 py-24 flex flex-col items-center justify-center px-4 md:px-8 border-t border-white/5 bg-[#050505] overflow-hidden"
      >
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="w-full max-w-5xl mx-auto relative z-10">
          
          {/* Main Matching Section Heading */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16 shrink-0"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase mb-2 drop-shadow-2xl text-white">
              AI Avatar Creation
            </h2>
            <p className="text-indigo-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
              Trending Tech Updates & Synthetic Presenters
            </p>
          </motion.div>

          {/* Larger Card Container */}
          <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-sm shadow-2xl flex flex-col md:flex-row items-center gap-8 md:gap-10 hover:border-indigo-500/20 transition-colors duration-500">
            
            {/* Left Column: Profile Avatar & Handle */}
            <div className="flex flex-col items-center shrink-0">
              <a 
                href="https://www.youtube.com/@FelixJosemonAI/shorts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative w-28 h-28 md:w-36 md:h-36 rounded-full p-[3px] bg-gradient-to-tr from-indigo-500 to-indigo-300 shadow-xl drop-shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-105 transition-transform duration-300 block cursor-pointer"
              >
                <img 
                  src="/images/felix_josemon.jpg" 
                  alt="Felix Josemon AI Channel Profile"
                  className="w-full h-full rounded-full object-cover bg-[#111]"
                />
                <span className="absolute bottom-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-[#050505] animate-pulse"></span>
              </a>
              <h3 className="mt-4 font-bold text-white text-lg tracking-tight">Felix Josemon AI</h3>
              <p className="text-xs text-indigo-400 font-medium tracking-wide">@FelixJosemonAI</p>
            </div>

            {/* Right Column: Details, Feature Badges, and Link */}
            <div className="flex-1 text-center md:text-left space-y-5">
              <p className="text-white/70 text-sm md:text-base font-light leading-relaxed">
                We created this AI avatar for the ongoing trending AI avatar scenario to deliver rapid, high-impact trending tech updates at scale. It integrates custom trained presenter models, neural voice cloning, and an automated script rendering pipeline.
              </p>

              {/* CTA Link Button */}
              <div className="pt-2 flex justify-center md:justify-start">
                <a 
                  href="https://www.youtube.com/@FelixJosemonAI/shorts" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 text-white text-xs font-bold uppercase tracking-wider border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group shadow-lg"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 group-hover:scale-110 transition-transform duration-300">
                    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch Shorts
                </a>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* OTHER PROMOS SECTION */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-20 min-h-screen py-24 flex flex-col justify-center px-4 md:px-8 border-t border-white/5 bg-black/40 backdrop-blur-md"
      >
        <div className="w-full max-w-6xl mx-auto relative z-10 drop-shadow-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight uppercase mb-3 text-white drop-shadow-lg">
              Other Promos
            </h2>
            <p className="text-indigo-400 text-xs md:text-sm uppercase tracking-[0.2em] font-bold">
              Cinematic Campaigns & Instagram Reels
            </p>
          </motion.div>

          {/* 3 Column Grid with Square Aspect Ratio for Instagram Reels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { url: 'https://www.instagram.com/reel/CzhBK_MvG5J/', cover: '/images/vikram.jpg', num: 1, title: 'Sanskriti 23 Promo' },
              { url: 'https://www.instagram.com/reel/C6EPBdUoSV0/', cover: '/images/brahmayugam.jpg', num: 2, title: 'Sanskriti 24' },
              { url: 'https://www.instagram.com/reel/CwIaxa5NCEy/', cover: '/images/divonam.jpg', num: 3, title: 'Divonam' }
            ].map((promo, i) => (
              <motion.div 
                key={promo.url}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center group"
              >
                {/* Clickable Card Link */}
                <a 
                  href={promo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full relative aspect-square bg-[#111] rounded-3xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all duration-500 block shadow-2xl"
                >
                  {/* Promo Cover Image */}
                  <img 
                     src={promo.cover} 
                     alt={promo.title}
                     className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[800ms] ease-out"
                  />
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:border-indigo-400 transition-all duration-500 shadow-2xl">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <p className="text-white/60 text-[0.65rem] tracking-widest uppercase group-hover:text-white/95 transition-colors duration-500 font-bold text-center">Watch on Instagram</p>
                  </div>
                </a>
                
                {/* Title Below Video */}
                <h3 className="mt-4 text-lg md:text-xl font-bold text-white/90 tracking-tight text-center group-hover:text-white transition-colors duration-300">
                  {promo.title}
                </h3>
              </motion.div>
            ))}
          </div>

          {/* Centered Landscape Playlist Card Below */}
          <div className="mt-12 max-w-xl mx-auto px-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center group"
            >
              <a 
                href="https://youtube.com/playlist?list=PL9q7QWMTlv5mWA1oNY60fqeRvA8iBAo_G&si=1kbiA_Yj-PNGW9O6" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full relative aspect-video bg-[#111] rounded-3xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all duration-500 block shadow-2xl"
              >
                {/* Promo Cover Image */}
                <img 
                   src="/images/promo_work_thumbnail.jpg" 
                   alt="Other Works"
                   className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[800ms] ease-out"
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:border-indigo-400 transition-all duration-500 shadow-2xl">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                  <p className="text-white/60 text-[0.65rem] tracking-widest uppercase group-hover:text-white/95 transition-colors duration-500 font-bold text-center">Watch on YouTube</p>
                </div>
              </a>
              
              {/* Title Below Video */}
              <h3 className="mt-4 text-lg md:text-xl font-bold text-white/90 tracking-tight text-center group-hover:text-white transition-colors duration-300">
                Other Works
              </h3>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="relative z-20 border-t border-white/5 py-16 px-6 flex flex-col items-center backdrop-blur-md bg-black/20 text-center">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight mb-4 uppercase text-white">Let's build the vision.</h2>
        
        {/* Contact Details */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-10 text-sm font-light text-white/60">
          <a href="mailto:arjunanofficial@gmail.com" className="hover:text-white transition-colors font-mono">&gt; EMAIL: arjunanofficial@gmail.com</a>
          <a href="https://wa.me/918606592620" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-mono">&gt; WHATSAPP: +91 8606592620</a>
        </div>

        {/* Social Links */}
        <div className="flex space-x-12 text-xs font-bold tracking-[0.15em] uppercase text-white/40">
          <a 
            href="https://www.instagram.com/arjunan_arul_" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white hover:underline decoration-indigo-500 underline-offset-4 transition-all duration-300"
          >
            Instagram
          </a>
          <a 
            href="https://www.linkedin.com/in/arjun-arul-97115a206/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white hover:underline decoration-indigo-500 underline-offset-4 transition-all duration-300"
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
