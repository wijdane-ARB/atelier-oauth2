import { useCallback, useEffect, useState } from 'react';
import keycloak from './keycloak.js';
import { appelerApi } from './api.js';
import './App.css';

export default function App() {
  const [objet, setObjet] = useState('');
  const [mesDemandes, setMesDemandes] = useState([]);
  const [toutes, setToutes] = useState([]);
  const [profil, setProfil] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const username = keycloak.tokenParsed?.preferred_username || 'Utilisateur';

  const charger = useCallback(async () => {
    try {
      const [mes, infos] = await Promise.all([
        appelerApi('/api/demandes'),
        appelerApi('/api/profil')
      ]);
      setMesDemandes(mes);
      setProfil(infos);
      if (isAdmin) setToutes(await appelerApi('/api/admin/demandes'));
    } catch (error) {
      setMessage('Erreur de chargement : ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { charger(); }, [charger]);

  async function creer(event) {
    event.preventDefault();
    try {
      await appelerApi('/api/demandes', { method: 'POST', body: JSON.stringify({ objet }) });
      setObjet('');
      setMessage('Demande créée avec succès.');
      await charger();
    } catch (error) { setMessage('Erreur : ' + error.message); }
  }

  async function changerStatut(id, statut) {
    try {
      await appelerApi(`/api/admin/demandes/${id}`, {
        method: 'PATCH', body: JSON.stringify({ statut })
      });
      setMessage(`Demande ${statut === 'VALIDEE' ? 'validée' : 'refusée'}.`);
      await charger();
    } catch (error) { setMessage('Erreur : ' + error.message); }
  }

  return (
    <main className="layout">
      <header className="topbar">
        <div><span className="eyebrow">ENSET · Sécurité des systèmes distribués</span>
          <h1>Gestion des demandes</h1>
          <p>Connecté : <strong>{username}</strong> · {isAdmin ? 'Administrateur' : 'Utilisateur'}</p>
        </div>
        <button className="logout" onClick={() => keycloak.logout({ redirectUri: 'http://localhost:5173/' })}>Se déconnecter</button>
      </header>

      <section className="card">
        <div className="section-title"><h2>Profil utilisateur</h2><span className="tag">OIDC · JWT</span></div>
        <p><strong>Identifiant :</strong> <code>{profil?.id || 'Chargement...'}</code></p>
        <p><strong>Nom d’utilisateur :</strong> {profil?.username || username}</p>
        <p><strong>Rôles :</strong> {roles.filter(r => r === 'USER' || r === 'ADMIN').join(', ') || 'Aucun rôle applicatif'}</p>
      </section>

      <section className="card">
        <h2>Créer une demande</h2>
        <form onSubmit={creer} className="create-form">
          <input value={objet} onChange={e => setObjet(e.target.value)} placeholder="Objet de la demande" required />
          <button type="submit">Envoyer</button>
        </form>
      </section>

      <section className="card">
        <h2>Mes demandes</h2>
        {loading ? <p>Chargement...</p> : mesDemandes.length === 0 ? <p className="empty">Aucune demande pour le moment.</p> :
          <ul className="requests">{mesDemandes.map(d => <li key={d.id}><span><strong>#{d.id}</strong> {d.objet}</span><span className={'status ' + d.statut.toLowerCase()}>{d.statut}</span></li>)}</ul>}
      </section>

      {isAdmin && <section className="card admin">
        <div className="section-title"><h2>Administration : toutes les demandes</h2><span className="tag">ADMIN</span></div>
        {toutes.length === 0 ? <p className="empty">Aucune demande enregistrée.</p> :
          <ul className="requests">{toutes.map(d => <li key={d.id}>
            <div><strong>#{d.id}</strong> {d.objet}<small>Propriétaire : {d.owner}</small></div>
            <span className={'status ' + d.statut.toLowerCase()}>{d.statut}</span>
            <div className="actions">
              {d.statut !== 'VALIDEE' && <button onClick={() => changerStatut(d.id, 'VALIDEE')}>Valider</button>}
              {d.statut !== 'REFUSEE' && <button className="danger" onClick={() => changerStatut(d.id, 'REFUSEE')}>Refuser</button>}
            </div>
          </li>)}</ul>}
      </section>}
      {message && <p role="status" className="notice">{message}</p>}
      <footer>OAuth 2.0 · OpenID Connect · Authorization Code + PKCE (S256)</footer>
    </main>
  );
}
