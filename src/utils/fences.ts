import type { ActiveTool, ElectricFence, FenceMountType } from '../types/cad';
export const FENCE_PROFILES = [
  {type:'madera', label:'Sobre madera', title:'CERCO SOBRE MADERA', color:'#92400e', dash:[12,5], marker:'circle'},
  {type:'metal', label:'Sobre base metálica', title:'CERCO SOBRE BASE METÁLICA', color:'#2563eb', dash:[12,4,2,4], marker:'square'},
  {type:'muro', label:'Sobre muro', title:'CERCO SOBRE MURO', color:'#7c3aed', dash:[], marker:'wall'}
] as const;
const LEGACY = {label:'Soporte sin especificar',title:'CERCO ELÉCTRICO',color:'#d97706',dash:[10,5],marker:'none'} as const;
export const fenceProfile = (type?: FenceMountType) => FENCE_PROFILES.find(p=>p.type===type) || LEGACY;
export const isElectricFenceTool = (tool: ActiveTool) => tool==='electric-fence'||tool.startsWith('electric-fence-');
export const fenceTypeForTool = (tool: ActiveTool): FenceMountType | undefined => FENCE_PROFILES.find(p=>`electric-fence-${p.type}`===tool)?.type;
/** Shared route and legend drawing: line pattern and support glyph identify mounting without color. */
export function drawFencePath(ctx:CanvasRenderingContext2D, points:{x:number;y:number}[], fence:Pick<ElectricFence,'mountingType'|'color'>, width=2.5) {
  if(points.length<2)return;
  const profile=fenceProfile(fence.mountingType);
  ctx.save();ctx.strokeStyle=fence.color||profile.color;ctx.fillStyle='#fff';ctx.lineWidth=width;
  ctx.setLineDash([...profile.dash]);ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
  if(profile.marker!=='none')for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
    if(length<1)continue;
    const count=Math.min(200,Math.max(1,Math.floor(length/65)));
    for(let n=0;n<count;n++){
      const t=(n+0.5)/count;ctx.save();ctx.translate(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.lineWidth=1.8;
      if(profile.marker==='circle'){ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
      else if(profile.marker==='square'){ctx.fillRect(-3.5,-3.5,7,7);ctx.strokeRect(-3.5,-3.5,7,7);}
      else {ctx.fillRect(-6,-4,12,8);ctx.strokeRect(-6,-4,12,8);ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,4);ctx.stroke();}
      ctx.restore();
    }
  }
  ctx.restore();
}
