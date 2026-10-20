import React, { useState } from 'react';
import type { CameraDevice, ElectricFence, NetworkAntenna, AudioAlarmDevice, WiringRoute, ProjectMetadata } from '../types/cad';
import { Dialog } from './Dialog';
interface Props { isOpen: boolean; onClose: () => void; cameras: CameraDevice[]; antennas: NetworkAntenna[]; audioAlarms: AudioAlarmDevice[]; fences: ElectricFence[]; wiring: WiringRoute[]; metadata: ProjectMetadata; }
export const AIAssistantModal: React.FC<Props> = ({isOpen,onClose,cameras,antennas}) => {
  const [bitrate,setBitrate]=useState(4), [days,setDays]=useState(30), [hours,setHours]=useState(24);
  const [cameraWatts,setCameraWatts]=useState(12), [ptzWatts,setPtzWatts]=useState(30), [antennaWatts,setAntennaWatts]=useState(15);
  if (!isOpen) return null;
  const active=cameras.filter(c=>c.status!=='baja');
  const tb=active.length*bitrate*1e6/8*3600*hours*days/1e12;
  const poe=active.reduce((sum,c)=>sum+(c.type==='camera-ptz'?ptzWatts:cameraWatts),0)+antennas.length*antennaWatts;
  const valid=[bitrate,days,hours,cameraWatts,ptzWatts,antennaWatts].every(n=>Number.isFinite(n)&&n>0)&&hours<=24;
  return <Dialog title="Resumen técnico orientativo" onClose={onClose}>
    <p className="text-sm text-slate-600 mb-5">Cálculo local para {active.length} cámaras activas y {antennas.length} antenas. Las cámaras marcadas para retirar no se incluyen. Ajusta los supuestos según las fichas de los equipos.</p>
    <div className="grid grid-cols-2 gap-4 text-sm">
      {([{label:'Tasa media por cámara (Mbps)',value:bitrate,set:setBitrate,max:1000},{label:'Días de retención',value:days,set:setDays,max:3650},{label:'Horas de grabación al día',value:hours,set:setHours,max:24},{label:'Cámara fija (W)',value:cameraWatts,set:setCameraWatts,max:500},{label:'Cámara PTZ (W)',value:ptzWatts,set:setPtzWatts,max:500},{label:'Antena (W)',value:antennaWatts,set:setAntennaWatts,max:500}]).map(f=><label key={f.label}>{f.label}<input className="form-control" type="number" min="0.1" step="0.1" max={f.max} value={f.value} onChange={e=>f.set(Number(e.target.value))}/></label>)}
    </div>
    <div aria-live="polite" className="my-5 py-4 border-y border-stone-200 text-sm space-y-2">{valid ? <>
      <p>Tráfico de cámaras: <strong>{(active.length*bitrate).toLocaleString('es-CL')} Mbps</strong></p>
      <p>Almacenamiento bruto: <strong>{tb.toLocaleString('es-CL',{maximumFractionDigits:2})} TB</strong></p>
      <p>Carga PoE estimada: <strong>{poe.toLocaleString('es-CL')} W</strong></p>
      <p>Presupuesto PoE con 25% de margen: <strong>{Math.ceil(poe*1.25)} W</strong></p>
    </> : <p className="text-red-700">Ingresa valores positivos y un máximo de 24 horas diarias.</p>}</div>
    <p className="text-xs text-slate-600">El almacenamiento usa la tasa media ingresada, sin RAID, redundancia ni reserva. PoE no incluye pérdidas, consumo del switch ni otros equipos. Los resultados no verifican puntos ciegos, puesta a tierra ni autonomía de UPS. No se consulta un servicio de IA.</p>
  </Dialog>;
};
