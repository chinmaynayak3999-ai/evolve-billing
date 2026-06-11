import { useEffect, useRef } from 'react';

export default function AnimatedBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    /* ── particles ── */
    const COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316'];

    // Soft floating orbs
    const orbs = Array.from({length:12},()=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      r: 60+Math.random()*120,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.2,
      opacity: 0.06+Math.random()*0.07,
    }));

    // Floating invoice/bill cards
    const cards = Array.from({length:8},()=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      w: 50+Math.random()*30, h: 65+Math.random()*40,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      vx:(Math.random()-.5)*.15, vy:-.2-Math.random()*.3,
      rot:(Math.random()-.5)*.4, rotV:(Math.random()-.5)*.003,
      opacity:.08+Math.random()*.1,
    }));

    // Floating coins / rupee circles
    const coins = Array.from({length:10},()=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      r: 10+Math.random()*18,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      vx:(Math.random()-.5)*.2, vy:-.15-Math.random()*.25,
      opacity:.1+Math.random()*.14,
      pulse: Math.random()*Math.PI*2,
    }));

    // Tiny sparkle dots
    const dots = Array.from({length:30},()=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      r: 1.5+Math.random()*3,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      vy:-.1-Math.random()*.2,
      opacity:.12+Math.random()*.18,
      twinkle: Math.random()*Math.PI*2,
    }));

    // Diagonal line streaks (like ledger lines)
    const streaks = Array.from({length:6},()=>({
      x: Math.random()*window.innerWidth,
      y: Math.random()*window.innerHeight,
      len: 80+Math.random()*120,
      angle: Math.PI/6+Math.random()*.3,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      v: .4+Math.random()*.3,
      opacity:.04+Math.random()*.05,
    }));

    const wrapY = (obj,pad=100) => { if(obj.y < -pad){ obj.y=canvas.height+pad; obj.x=Math.random()*canvas.width; } };
    const wrapX = (obj,pad=100) => {
      if(obj.x < -pad) obj.x=canvas.width+pad;
      if(obj.x > canvas.width+pad) obj.x=-pad;
    };

    let t=0;
    const draw = () => {
      t+=.008;
      ctx.clearRect(0,0,canvas.width,canvas.height);

      // Gradient base
      const bg = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
      bg.addColorStop(0,'#eef2ff');
      bg.addColorStop(.35,'#f0f9ff');
      bg.addColorStop(.65,'#f0fdf4');
      bg.addColorStop(1,'#fdf4ff');
      ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);

      // Orbs
      orbs.forEach(o=>{
        const rg=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
        rg.addColorStop(0,o.color+'44');
        rg.addColorStop(.5,o.color+'22');
        rg.addColorStop(1,'transparent');
        ctx.save(); ctx.globalAlpha=o.opacity;
        ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
        ctx.restore();
        o.x+=o.vx; o.y+=o.vy;
        // bounce
        if(o.x<-o.r||o.x>canvas.width+o.r) o.vx*=-1;
        if(o.y<-o.r||o.y>canvas.height+o.r) o.vy*=-1;
      });

      // Streak lines
      streaks.forEach(s=>{
        ctx.save(); ctx.globalAlpha=s.opacity;
        ctx.strokeStyle=s.color; ctx.lineWidth=1.5;
        ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(s.x,s.y);
        ctx.lineTo(s.x+Math.cos(s.angle)*s.len, s.y+Math.sin(s.angle)*s.len);
        ctx.stroke(); ctx.restore();
        s.x+=Math.cos(s.angle)*s.v; s.y+=Math.sin(s.angle)*s.v;
        if(s.x>canvas.width+200||s.y>canvas.height+200){ s.x=Math.random()*canvas.width; s.y=-50; }
      });

      // Bill cards
      cards.forEach(c=>{
        ctx.save();
        ctx.translate(c.x+c.w/2,c.y+c.h/2); ctx.rotate(c.rot);
        ctx.globalAlpha=c.opacity;
        ctx.shadowColor=c.color; ctx.shadowBlur=14;
        ctx.fillStyle=c.color;
        ctx.beginPath(); ctx.roundRect(-c.w/2,-c.h/2,c.w,c.h,6); ctx.fill();
        ctx.shadowBlur=0;
        // white lines
        ctx.fillStyle='rgba(255,255,255,0.45)';
        for(let i=0;i<4;i++) ctx.fillRect(-c.w/2+6,-c.h/2+12+i*11,c.w-12,2);
        // bottom amount bar
        ctx.fillStyle='rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.roundRect(-c.w/2+6,c.h/2-16,c.w-12,10,3); ctx.fill();
        ctx.restore();
        c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV;
        wrapY(c,80); wrapX(c,80);
      });

      // Coins
      coins.forEach(c=>{
        c.pulse+=.04;
        const pulsedR = c.r*(1+Math.sin(c.pulse)*.08);
        ctx.save(); ctx.globalAlpha=c.opacity;
        const rg=ctx.createRadialGradient(c.x-pulsedR*.3,c.y-pulsedR*.3,0,c.x,c.y,pulsedR);
        rg.addColorStop(0,'#fff');
        rg.addColorStop(.3,c.color+'dd');
        rg.addColorStop(1,c.color+'55');
        ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(c.x,c.y,pulsedR,0,Math.PI*2); ctx.fill();
        // ₹ symbol
        ctx.fillStyle='rgba(255,255,255,0.7)';
        ctx.font=`bold ${pulsedR*1.1}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('₹',c.x,c.y);
        ctx.restore();
        c.x+=c.vx; c.y+=c.vy;
        wrapY(c,40); wrapX(c,40);
      });

      // Sparkle dots
      dots.forEach(d=>{
        d.twinkle+=.05;
        const alpha=d.opacity*(0.6+Math.sin(d.twinkle)*0.4);
        ctx.save(); ctx.globalAlpha=alpha;
        ctx.fillStyle=d.color;
        ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
        ctx.restore();
        d.y+=d.vy;
        if(d.y<-10){ d.y=canvas.height+10; d.x=Math.random()*canvas.width; }
      });

      animId=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(animId); window.removeEventListener('resize',resize); };
  },[]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{zIndex:0}}/>;
}
