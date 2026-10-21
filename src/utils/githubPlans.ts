import { validateProject } from './project';

export const PLAN_REPOSITORY = 'moisesherrerac/assur-planos-privados';
export const CREATE_ACCESS_KEY_URL = 'https://github.com/settings/personal-access-tokens/new?name=ASSUR%20Planos&description=Acceso%20a%20assur-planos-privados&target_name=moisesherrerac&expires_in=90&contents=write';
const INDEX_PATH = 'library/index.json';
const MAX_PLAN_BYTES = 20 * 1024 * 1024;
export interface SavedPlan {
  id: string; name: string; folder: string; client: string; updatedAt: string;
  archived: boolean; sha: string; bytes: number; revision: string;
}
interface LibraryIndex { version: 1; plans: SavedPlan[] }
export class PlanConflictError extends Error {
  constructor() { super('El plano o la biblioteca cambió desde otro equipo. Abre la versión actual o guarda como copia para conservar ambos cambios.'); }
}
export class PlanAccessError extends Error {
  constructor(message = 'La clave no es válida o ha vencido. Inicia sesión de nuevo.') { super(message); }
}
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
export const planPath = (id: string) => {
  if (!validId(id)) throw new Error('Identificador de plano inválido.');
  return `library/plans/${id}.cadmap`;
};
export function encodeUtf8Base64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let result = '';
  for (let i = 0; i < bytes.length; i += 16384) result += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(result);
}
export function decodeUtf8Base64(value: string) {
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));
}
function validateIndex(data: any): LibraryIndex {
  if (data?.version !== 1 || !Array.isArray(data.plans) || data.plans.length > 5000) throw new Error('El índice de la biblioteca no tiene un formato válido. No se modificaron los archivos.');
  const ids = new Set();
  for (const p of data.plans) {
    if (!p || typeof p.id !== 'string' || !validId(p.id) || ids.has(p.id) || typeof p.name !== 'string' ||
      typeof p.folder !== 'string' || typeof p.client !== 'string' || typeof p.updatedAt !== 'string' ||
      typeof p.archived !== 'boolean' || !/^[0-9a-f]{40}$/i.test(p.sha) || typeof p.revision !== 'string' || typeof p.bytes !== 'number') {
      throw new Error('Hay un registro inválido en la biblioteca. No se modificaron los archivos.');
    }
    ids.add(p.id);
  }
  return data;
}
export interface PlanLibrary {
  list: () => Promise<SavedPlan[]>;
  open: (plan: SavedPlan) => Promise<{ document: any; entry: SavedPlan }>;
  save: (document: unknown, name: string, folder: string, previous?: SavedPlan) => Promise<SavedPlan>;
  archive: (entry: SavedPlan, archived: boolean) => Promise<SavedPlan>;
  dispose: () => void;
}

/** GitHub is the authorization boundary. No credential is embedded in bundles or browser storage. */
export class GitHubPlanLibrary implements PlanLibrary {
  #token: string;
  #fetch: typeof fetch;
  #branch = '';
  #writing = false;
  constructor(token: string, request: typeof fetch = fetch) { this.#token = token; this.#fetch = request; }
  dispose() { this.#token = ''; }
  async #request(path: string, options: RequestInit = {}, raw = false): Promise<any> {
    if (!this.#token) throw new PlanAccessError();
    let response: Response;
    try {
      // Native browser fetch must not receive this library instance as its receiver.
      const request = this.#fetch;
      response = await request(`https://api.github.com/repos/${PLAN_REPOSITORY}${path}`, {
        ...options, signal: AbortSignal.timeout(30000), cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: { Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2026-03-10', Authorization: `Bearer ${this.#token}` }
      });
    } catch { throw new Error('No se pudo conectar con GitHub. Revisa tu conexión; el plano actual se conserva.'); }
    if (response.status === 401) { this.dispose(); throw new PlanAccessError(); }
    if (response.status === 409 || (response.status === 422 && path.startsWith('/git/refs/'))) throw new PlanConflictError();
    if (response.status === 403 || response.status === 429) {
      if (response.headers.get('x-ratelimit-remaining') === '0' || response.status === 429) throw new Error('GitHub alcanzó su límite temporal de solicitudes. Espera unos minutos y conserva una copia .cadmap.');
      throw new Error('La clave no tiene el permiso necesario. Selecciona assur-planos-privados y Contents: Read and write en GitHub.');
    }
    if (response.status === 404) throw new PlanAccessError('No se pudo acceder a la biblioteca privada. Comprueba que la clave incluye assur-planos-privados.');
    if (!response.ok) throw new Error('GitHub no pudo completar la operación. El plano actual se conserva.');
    return raw ? response.text() : response.json();
  }
  async connect() {
    const repo = await this.#request('');
    if (repo.private !== true || repo.full_name?.toLowerCase() !== PLAN_REPOSITORY.toLowerCase()) {
      this.dispose(); throw new PlanAccessError('La biblioteca debe permanecer privada. No se permite usar un repositorio público.');
    }
    if (repo.permissions?.push === false) throw new Error('Esta clave permite lectura, pero no guardar. Usa Contents: Read and write.');
    this.#branch = repo.default_branch;
    if (!this.#branch) throw new Error('La biblioteca todavía no está inicializada.');
  }
  async #head() {
    await this.connect();
    const ref = await this.#request(`/git/ref/heads/${encodeURIComponent(this.#branch)}`);
    const commit = await this.#request(`/git/commits/${ref.object.sha}`);
    const data = await this.#request(`/contents/${INDEX_PATH}?ref=${ref.object.sha}`, {}, true);
    const index = validateIndex(JSON.parse(data));
    return { head: ref.object.sha as string, tree: commit.tree.sha as string, index };
  }
  async list() { return (await this.#head()).index.plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async open(plan: SavedPlan) {
    const current = (await this.#head()).index.plans.find(p => p.id === plan.id);
    if (!current) throw new Error('El plano ya no está disponible. Actualiza la biblioteca.');
    const blob = await this.#request(`/git/blobs/${current.sha}`);
    const document = validateProject(JSON.parse(decodeUtf8Base64(blob.content)));
    return { document, entry: current };
  }
  async #publish(head: string, tree: string, index: LibraryIndex, message: string, file?: { path: string; sha: string }) {
    const elements: any[] = [{ path: INDEX_PATH, mode: '100644', type: 'blob', content: JSON.stringify(index) }];
    if (file) elements.push({ ...file, mode: '100644', type: 'blob' });
    const newTree = await this.#request('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: tree, tree: elements }) });
    const commit = await this.#request('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }) });
    await this.#request(`/git/refs/heads/${encodeURIComponent(this.#branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
  }
  async save(input: unknown, name: string, folder: string, previous?: SavedPlan) {
    if (this.#writing) throw new Error('Hay un guardado en curso. Espera a que termine.');
    this.#writing = true;
    try {
      const document = validateProject(input);
      name = name.trim(); folder = folder.trim() || 'General';
      if (!name || name.length > 160 || folder.length > 80) throw new Error('Usa un nombre de hasta 160 caracteres y una carpeta de hasta 80.');
      const content = JSON.stringify(document);
      const bytes = new TextEncoder().encode(content).length;
      if (bytes > MAX_PLAN_BYTES) throw new Error('El plano supera 20 MB. Reduce la imagen antes de guardarlo en GitHub. Conserva una copia .cadmap.');
      const { head, tree, index } = await this.#head();
      const current = previous && index.plans.find(p => p.id === previous.id);
      if (previous && (!current || current.revision !== previous.revision)) throw new PlanConflictError();
      const blob = await this.#request('/git/blobs', { method: 'POST', body: JSON.stringify({ content: encodeUtf8Base64(content), encoding: 'base64' }) });
      const entry: SavedPlan = { id: previous?.id || crypto.randomUUID(), name, folder, client: String(document.metadata.clientName || ''),
        updatedAt: new Date().toISOString(), archived: false, sha: blob.sha, bytes, revision: crypto.randomUUID() };
      index.plans = index.plans.filter(p => p.id !== entry.id).concat(entry);
      await this.#publish(head, tree, index, previous ? 'Actualizar plano' : 'Guardar nuevo plano', { path: planPath(entry.id), sha: entry.sha });
      return entry;
    } finally { this.#writing = false; }
  }
  async archive(previous: SavedPlan, archived: boolean) {
    if (this.#writing) throw new Error('Hay un guardado en curso. Espera a que termine.');
    this.#writing = true;
    try {
      const { head, tree, index } = await this.#head();
      const current = index.plans.find(p => p.id === previous.id);
      if (!current || current.revision !== previous.revision) throw new PlanConflictError();
      const entry = { ...current, archived, updatedAt: new Date().toISOString(), revision: crypto.randomUUID() };
      index.plans = index.plans.map(p => p.id === entry.id ? entry : p);
      await this.#publish(head, tree, index, archived ? 'Archivar plano' : 'Restaurar plano');
      return entry;
    } finally { this.#writing = false; }
  }
}
