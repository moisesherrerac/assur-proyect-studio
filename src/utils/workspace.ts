import type { FencePoint } from '../types/cad';

export interface WorkspaceView {
  showTools: boolean;
  showHelp: boolean;
  showCoordinates: boolean;
  showControls: boolean;
  focusMode: boolean;
}

export const defaultWorkspaceView: WorkspaceView = {
  showTools: true, showHelp: true, showCoordinates: false, showControls: true, focusMode: false,
};

export function routeLength(routes: { points: FencePoint[] }[]): number {
  return routes.reduce((total, route) => total + route.points.reduce((length, point, i) => i
    ? length + Math.hypot(point.x - route.points[i - 1].x, point.y - route.points[i - 1].y) : length, 0), 0);
}

export function minimumVertices(tool: string): number {
  return tool === 'draw-building' || tool === 'draw-perimeter' ? 3 : 2;
}
