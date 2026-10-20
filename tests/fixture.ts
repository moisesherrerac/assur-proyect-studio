import type { ReportProject } from '../src/utils/equipmentReport';
export const example: ReportProject = {
  metadata: {
    projectName: 'EJEMPLO - Seguridad de planta industrial', clientName: 'Cliente de ejemplo',
    location: 'Accesos, patio de maniobras y bodega', drawingTitle: 'Ubicación de equipos', drawingSubtitle: 'Ejemplo ilustrativo',
    sheetNumber: 'L-01', revision: 'B', scale: 'S/E', date: '20-10-2026',
    engineerName: '', engineerTitle: '', engineerLicense: '', engineerCompany: 'Assur Proyect Studio',
    projectNotes: ['Datos ilustrativos para verificar el informe.'], metersPerUnit: 0.2
  },
  cameras: [
    { id: 'c1', type:'camera-bullet', label:'CN-01', x:400,y:300,rotation:0,fovAngle:60,range:80,status:'nueva',color:'#0088cc',resolution:'4 MP',glosa:'Cámara fija tipo bullet, 4 MP. Ubicación: acceso vehicular principal. Orientar hacia la entrada; alimentación PoE y conexión al gabinete de comunicaciones.',notes:'Confirmar altura de montaje en terreno.' },
    { id: 'c2', type:'camera-dome', label:'CE-01', x:600,y:400,rotation:0,fovAngle:70,range:70,status:'existente',color:'#dc2626',resolution:'2 MP',glosa:'Cámara domo existente en recepción. Mantener ubicación y verificar compatibilidad con el sistema de grabación.' },
    { id: 'c3', type:'camera-ptz', label:'PTZ-01', x:700,y:500,rotation:30,fovAngle:360,range:100,status:'reubicar',color:'#16a34a',glosa:'Domo PTZ por reubicar en patio de maniobras. Revisar soporte, alimentación y programación de posiciones antes de habilitarlo.' }
  ],
  antennas: [{id:'a1',type:'antenna-ptp',label:'ANT-01',x:500,y:200,rotation:0,beamWidth:45,range:90,status:'nueva',color:'#2563eb',frequency:'5 GHz',glosa:'Antena para enlace punto a punto entre bodega y portería. Verificar línea de vista y disponibilidad del extremo remoto.'}],
  audioAlarms: [{id:'s1',type:'speaker-horn',label:'BO-01',x:300,y:300,rotation:20,status:'nueva',color:'#d97706',glosa:'Bocina IP para voceo y disuasión en acceso. Confirmar cobertura audible en la puesta en marcha.'},{id:'r1',type:'rack-cabinet',label:'RACK-01',x:500,y:500,rotation:0,status:'nueva',color:'#059669',glosa:'Gabinete de comunicaciones para equipos de red y grabación. Definir capacidad, ventilación y energía según equipos seleccionados.'}],
  fences: [{id:'f1',label:'CERCO-01',status:'nueva',color:'#d97706',points:[{x:100,y:100},{x:250,y:100},{x:250,y:200}],linesCount:6,energizerVoltage:'Por definir',warningSignsInterval:50,glosa:'Tramo de cerco perimetral de seis líneas. Verificar condiciones de instalación y elementos de seguridad según diseño aprobado.'}],
  wiring: [{id:'w1',label:'RUTA-01',wireType:'utp-cat6',color:'#059669',points:[{x:400,y:300},{x:400,y:500},{x:500,y:500}],glosa:'Recorrido de cable UTP categoría 6 desde CN-01 hacia RACK-01. El metrado representa la ruta en planta; no incluye subidas, holguras ni reserva.'}]
};
