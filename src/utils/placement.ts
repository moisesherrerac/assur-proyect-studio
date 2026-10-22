import type { FencePoint } from '../types/cad';
/** Visual grid guides and optional positional quantization are independent. */
export const GRID_STEPS = [1,2,5,10,20,35,70] as const;
export function placePlanPoint(point:FencePoint, enabled=false, step=5, origin:FencePoint={x:0,y:0}):FencePoint {
  if(!enabled)return {...point};
  const interval=Math.max(1,Number.isFinite(step)?step:5);
  return {x:origin.x+Math.round((point.x-origin.x)/interval)*interval,y:origin.y+Math.round((point.y-origin.y)/interval)*interval};
}
/** Skip imperceptible guide lines when zoomed out, without changing placement precision. */
export function visibleGridStep(step:number,zoom:number) {
  const interval=Math.max(1,step);
  return interval*Math.max(1,Math.ceil(10/(interval*Math.max(0.1,zoom))));
}
