// Apeluri către serverul REST. Orice răspuns de eroare devine o excepție cu mesajul serverului.
async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Nu se poate contacta serverul. Verifică dacă rulează.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Eroare ${res.status}`);
  return data;
}

export const api = {
  players: () => request('GET', '/api/players'),
  addPlayer: (p) => request('POST', '/api/players', p),
  updatePlayer: (id, p) => request('PUT', `/api/players/${id}`, p),
  setLevels: (id, levels) => request('PUT', `/api/players/${id}/levels`, { levels }),
  deletePlayer: (id) => request('DELETE', `/api/players/${id}`),
  demo: () => request('POST', '/api/demo'),
  games: () => request('GET', '/api/games'),
  addGame: (g) => request('POST', '/api/games', g),
  deleteGame: (id) => request('DELETE', `/api/games/${id}`),
  teamNames: (count) => request('GET', `/api/team-names?count=${count}`),
  propose: (b) => request('POST', '/api/propose', b),
  plan: (b) => request('POST', '/api/plan', b),
  algorithms: () => request('GET', '/api/algorithms'),
  selftest: () => request('GET', '/api/selftest'),
  sessions: () => request('GET', '/api/sessions'),
  session: (id) => request('GET', `/api/sessions/${id}`),
  createSession: (b) => request('POST', '/api/sessions', b),
  setMatch: (id, i, b) => request('PUT', `/api/sessions/${id}/matches/${i}`, b),
  finish: (id) => request('POST', `/api/sessions/${id}/finish`),
  deleteSession: (id) => request('DELETE', `/api/sessions/${id}`),
  stats: () => request('GET', '/api/stats'),
};
