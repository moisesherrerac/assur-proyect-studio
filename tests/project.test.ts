import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextLabel, distanceLabel, validateProject, cleanSampleIdentity } from '../src/utils/project';
import { buildEquipmentRows, equipmentCsv, summarizeEquipment, createEquipmentPdf } from '../src/utils/equipmentReport';
import { example } from './fixture';

test('equipment codes stay unique after deleting an intermediate code', () => {
  assert.equal(nextLabel('CN', [{label:'CN-01'}, {label:'CN-03'}]), 'CN-02');
  assert.equal(nextLabel('CN', [{label:'cn-01'}, {label:' CN-02 '}]), 'CN-03');
});
test('distance labels require calibration', () => {
  assert.match(distanceLabel(100), /sin calibrar/);
  assert.equal(distanceLabel(100, 0.2), '20 m');
});
test('valid original and extended projects can be opened', () => {
  assert.equal(validateProject({...example,version:'2.4'}).cameras.length, 3);
  assert.equal(validateProject({metadata:example.metadata,cameras:[],rawImageSrc:null}).rawImageSrc, null);
});
test('unrelated JSON, malformed arrays and geometry are rejected before use', () => {
  for (const value of [{}, {metadata:{},cameras:'wrong'}, {...example,cameras:[{...example.cameras[0],x:'400'}]}, {...example,cameras:[{...example.cameras[0],range:NaN}]}, {...example,cameras:[{...example.cameras[0],type:'alien'}]}, {...example,metadata:{...example.metadata,metersPerUnit:-1}}, {...example,rawImageSrc:'https://example.com/map.png'}, {...example,version:'99.0'}]) {
    assert.throws(()=>validateProject(value));
  }
});
test('duplicate object identifiers are rejected', () => {
  assert.throws(()=>validateProject({...example,cameras:[example.cameras[0],example.cameras[0]]}));
});
test('report keeps equipment units separate from calibrated route lengths', () => {
  const rows=buildEquipmentRows(example);
  assert.equal(rows.length,8);
  assert.equal(rows.filter(r=>r.unit==='un').length,6);
  assert.equal(rows.find(r=>r.code==='RUTA-01')?.quantity,60);
  assert.equal(rows.find(r=>r.code==='CERCO-01')?.quantity,50);
  assert.equal(rows.find(r=>r.code==='CN-01')?.glosa,example.cameras[0].glosa);
  assert.equal(summarizeEquipment(rows).find(r=>r.type==='Cámara PTZ')?.status,'Reubicar');
});
test('uncalibrated routes are reported as segments, with no fictitious meters', () => {
  const rows=buildEquipmentRows({...example,metadata:{...example.metadata,metersPerUnit:undefined}});
  const route=rows.find(r=>r.code==='RUTA-01')!;
  assert.equal(route.unit,'tramo');assert.equal(route.quantity,1);
});
test('custom glosas and notes survive serialization', () => {
  const copy=validateProject(JSON.parse(JSON.stringify(example)));
  assert.equal(buildEquipmentRows(copy).find(r=>r.code==='CN-01')?.glosa,example.cameras[0].glosa);
});
test('CSV supports Spanish accents, quotes and blocks spreadsheet formulas', () => {
  const csv=equipmentCsv({...example,cameras:[{...example.cameras[0],glosa:'=HYPERLINK("x")'}]});
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv,/Ubicación/);
  assert.match(csv,/'=HYPERLINK\(""x""\)/); assert.match(csv,/Código/);
});
test('professional details entered by the user are preserved', () => {
  const metadata={...example.metadata,engineerName:'Responsable del proyecto',engineerLicense:'Registro propio'};
  assert.deepEqual(cleanSampleIdentity(metadata),metadata);
});
test('long glosas paginate without throwing or losing equipment', async () => {
  const many=Array.from({length:45},(_,i)=>({...example.cameras[0],id:`c-${i}`,label:`CN-${i+1}`,glosa:('Descripción de equipo y ubicación a revisar en terreno. ').repeat(20)}));
  const doc=await createEquipmentPdf({...example,cameras:many});
  assert.ok(doc.getNumberOfPages()>5);
  const content=doc.output(); assert.match(content,/CN-45/);
});
