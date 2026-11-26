async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      /* risposta senza JSON */
    }
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Errore ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  session: () => request('/api/session'),
  login: (password) => request('/api/login', { method: 'POST', body: { password } }),
  logout: () => request('/api/logout', { method: 'POST' }),
  listVideos: () => request('/api/videos'),
  createVideo: (video) => request('/api/videos', { method: 'POST', body: video }),
  updateVideo: (id, video) => request(`/api/videos/${id}`, { method: 'PUT', body: video }),
  deleteVideo: (id) => request(`/api/videos/${id}`, { method: 'DELETE' }),
};

export const streamUrl = (video) => `/api/videos/${video.id}/stream`;
export const coverUrl = (video) => `/api/videos/${video.id}/cover?v=${encodeURIComponent(video.updatedAt || '')}`;
