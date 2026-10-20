import React, { useState } from 'react';
import { CameraDevice, ElectricFence, NetworkAntenna, AudioAlarmDevice, WiringRoute, ProjectMetadata } from '../types/cad';
import { Sparkles, X, ShieldAlert, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraDevice[];
  antennas: NetworkAntenna[];
  audioAlarms: AudioAlarmDevice[];
  fences: ElectricFence[];
  wiring: WiringRoute[];
  metadata: ProjectMetadata;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  cameras,
  antennas,
  audioAlarms,
  fences,
  wiring,
  metadata
}) => {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const totalCams = cameras.length;
  const nuevas = cameras.filter(c => c.status === 'nueva').length;
  const existentes = cameras.filter(c => c.status === 'existente').length;

  const storage30DaysTB = (totalCams * 1.3).toFixed(1);
  const poeWatts =
    cameras.reduce((acc, cam) => acc + (cam.type === 'camera-ptz' ? 30 : 12), 0) +
    antennas.length * 15;

  const handleRunAiAudit = async () => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Eres un Ingeniero Senior Proyectista en Seguridad Electrónica y Telecomunicaciones.
Analiza la siguiente memoria técnica de un plano de seguridad perimetral y CCTV:
- Proyecto: ${metadata.projectName}
- Ubicación: ${metadata.location}
- Cámaras Totales: ${totalCams} (${nuevas} nuevas en proyecto, ${existentes} existentes a integrar)
- Tipos de cámaras: ${cameras.map(c => `${c.label}: ${c.type} (${c.resolution || '4MP'}, criterio: ${c.categoryLabel || c.status}, color: ${c.color})`).join(', ')}
- Cerco Eléctrico: ${fences.length} zonas (${fences.map(f => `${f.label} ${f.linesCount} líneas ${f.energizerVoltage}`).join(', ')})
- Antenas PTP/WiFi: ${antennas.length} unidades (${antennas.map(a => `${a.label} ${a.frequency}`).join(', ')})
- Audio IP / Sirenas: ${audioAlarms.length} unidades
- Rutas de canalización: ${wiring.length} tramos

Por favor provee un dictamen técnico profesional y conciso estructurado en:
1. DICTAMEN DE COBERTURA Y PUNTOS CIEGOS
2. CÁLCULO DE ANCHO DE BANDA, ALMACENAMIENTO NVR Y RETENCIÓN (Días recomendados y TB)
3. DIMENSIONAMIENTO ELÉCTRICO POE Y PROTECCIÓN CONTRA DESCARGAS (Puesta a tierra y DPS)
4. RECOMENDACIONES DE MEJORA PARA EL PLANO TÉCNICO.
Usa terminología formal de ingeniería de proyectos.`
        });

        setAnalysisText(response.text || 'Análisis completado satisfactoriamente.');
      } else {
        setAnalysisText(`CÁLCULO LOCAL ORIENTATIVO — SIN CONSULTA A IA

### DICTAMEN TÉCNICO DE INGENIERÍA DE SEGURIDAD

**1. EVALUACIÓN DE COBERTURA Y CONOS DE VISIÓN**
- Se han ubicado un total de **${totalCams} cámaras** (${nuevas} cámaras proyectadas y ${existentes} cámaras existentes).
- La simbología cromática dinámica del plano permite distinguir claramente cada categoría y fase de instalación para los contratistas de obra civil y cableado.
- Se recomienda asegurar solapamiento de al menos 15% entre los conos de visión FOV de cámaras perimetrales adyacentes para evitar zonas muertas ("blind spots").

**2. DIMENSIONAMIENTO DE ALMACENAMIENTO Y ANCHO DE BANDA**
- Tasa de bits estimada bajo códec H.265 / Smart Stream: ~4.0 Mbps por canal a 4MP 20fps.
- Ancho de banda concurrente hacia switch central / NVR: ~${(totalCams * 4).toFixed(0)} Mbps.
- Almacenamiento requerido para 30 días continuos (24/7): **~${storage30DaysTB} TB brutos** (se sugiere arreglo RAID-5 con discos Western Digital Purple o Seagate SkyHawk).

**3. POTENCIA POE Y ENERGÍA DE RESPALDO**
- Consumo estimado de la carga conectada: **~${poeWatts} Watts**.
- Se requiere Switch PoE+ IEEE 802.3at con presupuesto de al menos **${Math.max(60, Math.ceil((poeWatts * 1.35) / 50) * 50)} Watts**.
- Se exige UPS On-line Doble Conversión de al menos 1.5 kVA con autonomía mínima de 45 minutos.

**4. PROTECCIÓN PERIMETRAL Y CERCO ELÉCTRICO**
- Los cercos eléctricos de ${fences.length > 0 ? fences[0].linesCount : 6} líneas deben contar con aterramiento independiente con resistencia inferior a 5 Ohmios, separada de la malla de fuerza.`);
      }
    } catch (e: any) {
      console.error(e);
      setAnalysisText(
        `Error al consultar servicio de IA: ${e?.message || 'Verifique la clave de API'}. Se han calculado los valores estándar de almacenamiento (${storage30DaysTB} TB) y potencia (${poeWatts}W).`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 text-slate-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Auditoría Técnica con IA</h3>
              <p className="text-xs text-slate-500">Verificación de cobertura, cálculo de almacenamiento y PoE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-stone-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Metrics summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-sky-700 text-[11px] mb-1 font-bold">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Almacenamiento</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">{storage30DaysTB} TB</div>
              <div className="text-[10px] text-slate-500">30 días de grabación</div>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] mb-1 font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Consumo PoE</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">{poeWatts} W</div>
              <div className="text-[10px] text-slate-500">Presupuesto PoE switch</div>
            </div>

            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-amber-700 text-[11px] mb-1 font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Total Cámaras</span>
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">{totalCams}</div>
              <div className="text-[10px] text-slate-500">
                {nuevas} Nuevas / {existentes} Exist.
              </div>
            </div>
          </div>

          {/* Analysis output area */}
          {analysisText ? (
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
              {analysisText}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 space-y-3 bg-stone-50/60 rounded-xl border border-dashed border-stone-200">
              <Sparkles className="w-9 h-9 text-amber-500 mx-auto" />
              <p className="max-w-md mx-auto">
                Presiona el botón para generar la auditoría de ingeniería y memoria de cálculo según las cámaras ubicadas en el plano.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-200 bg-stone-50">
          <span className="text-[11px] text-slate-500 font-mono">
            Normativas: IEC 60335-2-76 • IEEE 802.3at • ISO/IEC 11801
          </span>
          <button
            onClick={handleRunAiAudit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{analysisText ? 'Volver a Auditar' : 'Ejecutar Auditoría con IA'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
