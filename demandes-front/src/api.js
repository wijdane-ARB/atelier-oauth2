import keycloak from './keycloak.js';
const API = 'http://localhost:8181';

export async function appelerApi(path, options = {}) {
  try {
    await keycloak.updateToken(30);
  } catch {
    // Session Keycloak expirée ou refresh impossible : nouvelle connexion
    keycloak.login();
    throw new Error('Session expirée, reconnexion en cours');
  }
  const response = await fetch(API + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${keycloak.token}`,
      ...options.headers
    }
  });
  if (response.status === 401) {
    keycloak.login();
    throw new Error('HTTP 401 : jeton refusé, reconnexion en cours');
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
