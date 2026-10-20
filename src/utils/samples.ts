/**
 * Generates realistic aerial / Google Maps screenshot simulations
 * so users can immediately test CAD blueprint conversion and camera planning.
 */

export interface SampleMap {
  id: string;
  name: string;
  description: string;
  category: string;
  dataUrl: string;
}

export function generateSampleSatelliteImage(type: 'industrial' | 'commercial' | 'residential'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const w = canvas.width;
  const h = canvas.height;

  if (type === 'industrial') {
    // Base terrain (earth/gravel tone)
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, w, h);

    // Agricultural orchard / crop rows on Left and Right flanks (like reference image)
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(0, 80, 230, h - 80);
    ctx.fillRect(1140, 120, w - 1140, h - 120);

    // Draw realistic orchard tree rows texture
    for (let y = 100; y < h - 20; y += 16) {
      // Left orchard rows
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(210, y + 6);
      ctx.stroke();

      // Tree crown dots
      ctx.fillStyle = '#374151';
      for (let x = 20; x < 210; x += 14) {
        ctx.beginPath();
        ctx.arc(x, y + (x - 20) * 0.03, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Right orchard vertical rows
    for (let x = 1170; x < w - 20; x += 22) {
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x, 150);
      ctx.lineTo(x - 30, h - 20);
      ctx.stroke();

      ctx.fillStyle = '#374151';
      for (let y = 160; y < h - 25; y += 15) {
        const curX = x - ((y - 150) / (h - 170)) * 30;
        ctx.beginPath();
        ctx.arc(curX, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Top Highway / Route (e.g. Ruta I-330-H)
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(w, 120);
    ctx.lineTo(w, 195);
    ctx.lineTo(0, 95);
    ctx.closePath();
    ctx.fill();

    // Highway center line & shoulders
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.lineTo(w, 135);
    ctx.moveTo(0, 82);
    ctx.lineTo(w, 182);
    ctx.stroke();

    // Highway Route shields ("I-330-H")
    const drawRouteShield = (rx: number, ry: number) => {
      ctx.fillStyle = '#f3f4f6';
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1.5;
      ctx.fillRect(rx - 28, ry - 11, 56, 22);
      ctx.strokeRect(rx - 28, ry - 11, 56, 22);
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('I-330-H', rx, ry);
    };
    drawRouteShield(310, 62);
    drawRouteShield(740, 102);
    drawRouteShield(1160, 140);

    // Central Industrial Compound Yard (Gravel/Concrete)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(260, 125);
    ctx.lineTo(1130, 185);
    ctx.lineTo(1060, 1030);
    ctx.lineTo(190, 980);
    ctx.closePath();
    ctx.fill();

    // Internal Open Storage Yard (Upper right section)
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(590, 160);
    ctx.lineTo(1110, 195);
    ctx.lineTo(1085, 480);
    ctx.lineTo(570, 440);
    ctx.closePath();
    ctx.fill();

    // Main Industrial Plant / Packing Facility Complex (Angled slightly like real cadastral layout)
    ctx.save();
    ctx.translate(620, 680);
    ctx.rotate(0.065); // slight cadastral angle

    // Drop shadow for 3D roof depth
    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.fillRect(-345, -245, 700, 470);

    // Main Corrugated White/Light-Gray Metal Roofs
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.fillRect(-350, -250, 690, 460);
    ctx.strokeRect(-350, -250, 690, 460);

    // Sub-nave divisions (Roof ridges)
    ctx.beginPath();
    ctx.moveTo(-180, -250);
    ctx.lineTo(-180, 210);
    ctx.moveTo(60, -250);
    ctx.lineTo(60, 210);
    ctx.moveTo(-350, -40);
    ctx.lineTo(340, -40);
    ctx.moveTo(-350, 95);
    ctx.lineTo(340, 95);
    ctx.stroke();

    // Solar Panel Arrays on Main Roof (Like reference image)
    ctx.fillStyle = '#64748b';
    // Upper array
    for (let row = -215; row < -70; row += 22) {
      ctx.fillRect(-155, row, 195, 14);
    }
    // Lower array
    for (let row = -15; row < 80; row += 22) {
      ctx.fillRect(-165, row, 190, 14);
    }

    // North-West Annex Shed ("TECHUMBRE")
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-405, -260, 55, 180);
    ctx.strokeRect(-405, -260, 55, 180);

    // South-East Sheds
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(190, 210, 140, 95);
    ctx.strokeRect(190, 210, 140, 95);

    ctx.restore();

    // Upper Gatehouse & Office buildings
    ctx.save();
    ctx.translate(450, 310);
    ctx.rotate(0.065);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(-70, -45, 140, 90);
    ctx.strokeRect(-70, -45, 140, 90);
    ctx.restore();

  } else if (type === 'commercial') {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, w, h);

    // Streets
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, w, 110);
    ctx.fillRect(0, h - 110, w, 110);

    // Main Commercial Building
    ctx.fillStyle = '#f1f5f9';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.fillRect(260, 180, 1050, 340);
    ctx.strokeRect(260, 180, 1050, 340);

    ctx.fillRect(260, 520, 380, 360);
    ctx.strokeRect(260, 520, 380, 360);

    // Parking grid
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(680, 550, 630, 330);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    for (let r = 570; r < 840; r += 75) {
      for (let c = 700; c < 1280; c += 36) {
        ctx.strokeRect(c, r, 28, 52);
      }
    }
  } else {
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 560, 350, 0, 0, Math.PI * 2);
    ctx.stroke();

    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const rx = w / 2 + Math.cos(angle) * 560;
      const ry = h / 2 + Math.sin(angle) * 350;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(rx - 48, ry - 36, 96, 72);
      ctx.strokeRect(rx - 48, ry - 36, 96, 72);
    }
  }

  return canvas.toDataURL('image/png');
}

export function getPresetSampleMaps(): SampleMap[] {
  return [
    {
      id: 'industrial',
      name: 'Planta Agroindustrial & Galpones (Estilo Lámina Oficial)',
      description: 'Complejo industrial con techumbres, paneles solares, ruta I-330-H y perímetro agrícola.',
      category: 'Agroindustrial',
      dataUrl: generateSampleSatelliteImage('industrial')
    },
    {
      id: 'commercial',
      name: 'Planta Comercial & Estacionamientos',
      description: 'Centro comercial con accesos peatonales, naves principales y playas de estacionamiento.',
      category: 'Comercial',
      dataUrl: generateSampleSatelliteImage('commercial')
    },
    {
      id: 'residential',
      name: 'Condominio & Perímetro Residencial',
      description: 'Urbanización cerrada con anillo vial perimetral, lotes y pórtico de control.',
      category: 'Residencial',
      dataUrl: generateSampleSatelliteImage('residential')
    }
  ];
}
