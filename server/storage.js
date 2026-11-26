import fs from 'node:fs/promises';
import path from 'node:path';

const GIST_FILE = 'videos.json';

function fileStorage(dir) {
  const file = path.join(dir, 'videos.json');
  return {
    name: `file locale (${file})`,
    async read() {
      try {
        return JSON.parse(await fs.readFile(file, 'utf8'));
      } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
    },
    async write(videos) {
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(videos, null, 2));
      await fs.rename(tmp, file);
    },
  };
}

function gistStorage({ token, gistId }) {
  const url = `https://api.github.com/gists/${gistId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'archivio-famiglia',
  };

  async function call(method, body) {
    const res = await fetch(url, {
      method,
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`GitHub Gist ${res.status}: ${await res.text()}`);
    return res.json();
  }

  return {
    name: `GitHub Gist (${gistId})`,
    async read() {
      const gist = await call('GET');
      const f = gist.files?.[GIST_FILE];
      if (!f) return [];
      let content = f.content;
      if (f.truncated) content = await (await fetch(f.raw_url, { headers })).text();
      return content?.trim() ? JSON.parse(content) : [];
    },
    async write(videos) {
      await call('PATCH', { files: { [GIST_FILE]: { content: JSON.stringify(videos, null, 2) } } });
    },
  };
}

/**
 * Catalogo dei video: tenuto in memoria e salvato a ogni modifica.
 * Le modifiche vengono eseguite in coda, una alla volta.
 */
export async function createCatalog({ rootDir }) {
  const { GITHUB_TOKEN, GIST_ID, DATA_DIR } = process.env;
  const backend =
    GITHUB_TOKEN && GIST_ID
      ? gistStorage({ token: GITHUB_TOKEN, gistId: GIST_ID })
      : fileStorage(DATA_DIR || path.join(rootDir, 'data'));

  let videos = await backend.read();
  if (!Array.isArray(videos)) videos = [];
  console.log(`Catalogo: ${videos.length} video caricati da ${backend.name}`);

  let queue = Promise.resolve();
  function mutate(fn) {
    const run = queue.then(async () => {
      const next = structuredClone(videos);
      const result = fn(next);
      await backend.write(next);
      videos = next;
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    list: () => videos,
    get: (id) => videos.find((v) => v.id === id),
    mutate,
  };
}
