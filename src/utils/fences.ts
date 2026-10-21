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
      const t=(n+0.5)/count;ctx.save();ctx.translate(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x));ctx.lineWidth=Math.max(1.8,width*0.6);
      if(profile.marker==='circle'){ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
      else if(profile.marker==='square'){ctx.fillRect(-3.5,-3.5,7,7);ctx.strokeRect(-3.5,-3.5,7,7);}
      else {ctx.fillRect(-6,-4,12,8);ctx.strokeRect(-6,-4,12,8);ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,4);ctx.stroke();}
      ctx.restore();
    }
  }
  ctx.restore();
}


export function fenceLabelAnchor(points: {x:number;y:number}[]) {
  if (!points.length) return null;
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  let remaining=lengths.reduce((a,b)=>a+b,0)/2;
  for(let i=0;i<lengths.length;i++) {
    if(lengths[i]>0 && remaining<=lengths[i]) {
      const t=remaining/lengths[i];
      return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};
    }
    remaining-=lengths[i];
  }
  return {...points[0]};
}
export function fenceLabelLayout(ctx:CanvasRenderingContext2D,fence:ElectricFence) {
  const anchor=fenceLabelAnchor(fence.points);
  if(!anchor||fence.showLabel===false)return null;
  const fontSize=fence.labelFontSize??11;
  const text=[fence.label,fence.labelText?.trim()].filter(Boolean).join('\n');
  ctx.save();ctx.font=`bold ${fontSize}px "JetBrains Mono", monospace`;
  const all:string[]=[];
  for(const paragraph of text.split('\n')) {
    let line='';
    for(const char of paragraph) {
      if(line && ctx.measureText(line+char).width>260){all.push(line.trimEnd());line='';}
      line+=char;
    }
    if(line.trim())all.push(line.trim());
  }
  const lines=all.slice(0,4);
  if(all.length>4) {
    let last=lines[3];while(last&&ctx.measureText(last+'…').width>260)last=last.slice(0,-1);
    lines[3]=last+'…';
  }
  const width=Math.max(46,...lines.map(line=>ctx.measureText(line).width+16));ctx.restore();
  const lineHeight=fontSize*1.3;
  return {anchor,lines,fontSize,lineHeight,width,height:Math.max(20,lines.length*lineHeight+10),
    x:anchor.x+(fence.labelOffsetX??40),y:anchor.y+(fence.labelOffsetY??-36)};
}
export function drawFenceLabel(ctx:CanvasRenderingContext2D,fence:ElectricFence,selected=false) {
  const box=fenceLabelLayout(ctx,fence);if(!box)return;
  ctx.save();ctx.strokeStyle=fence.color||fenceProfile(fence.mountingType).color;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(box.anchor.x,box.anchor.y);ctx.lineTo(box.x,box.y);ctx.stroke();
  ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(box.anchor.x,box.anchor.y,2.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(box.x-box.width/2,box.y-box.height/2,box.width,box.height);
  ctx.strokeStyle=selected?'#0284c7':fence.color||'#334155';ctx.lineWidth=selected?2:1.1;
  ctx.strokeRect(box.x-box.width/2,box.y-box.height/2,box.width,box.height);
  ctx.fillStyle='#0f172a';ctx.font=`bold ${box.fontSize}px "JetBrains Mono", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  box.lines.forEach((line,i)=>ctx.fillText(line,box.x,box.y+(i-(box.lines.length-1)/2)*box.lineHeight));
  ctx.restore();
}
