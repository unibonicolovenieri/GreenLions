/* ============================================================
   Green Lions — accesso al database Supabase.

   Da usare nelle pagine nuove così:

     <script src="/assets/js/supabase.js"></script>
     <script>
       glLeggi('nome_vista').then(righe => { ... });
     </script>

   Attenzione: divise/index.html NON usa questo file, ha la sua
   copia della configurazione. È un file unico e autonomo di
   proposito (vedi il commento in cima a /assets/css/site.css).
   Se cambi progetto Supabase, cambia le chiavi in tutti e due.
   ============================================================ */

/* Chiave pubblica "anon": può fare solo quello che le policy del
   database le concedono, quindi sta tranquillamente in chiaro qui.
   La chiave "service_role" NON va mai messa in una pagina web. */
const GL_SUPABASE_URL = "https://czgmdmtnxnaxowadfdfv.supabase.co";
const GL_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z21kbXRueG5heG93YWRmZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjYyMzksImV4cCI6MjEwMzMwMjIzOX0.31uDHJbVvdSL0j2dQVGM9ApigtjX9G1w6V6ODmpOyMA";

const GL_BASE = GL_SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const GL_AUTH = { apikey: GL_SUPABASE_KEY, Authorization: 'Bearer ' + GL_SUPABASE_KEY };

/**
 * Legge una tabella o una vista del database.
 *
 * Funziona solo su ciò che ha una policy di lettura per il ruolo
 * "anon": oggi è la vista kit_presi (numero + nome di battesimo).
 * Per una pagina nuova serve creare la vista e darle il permesso,
 * come già fatto in Confident/schema.sql.
 *
 * @param {string} tabella  nome della tabella o vista
 * @param {string} query    filtri e ordinamenti PostgREST,
 *                          es. "select=nome,ruolo&order=numero"
 * @returns {Promise<Array>} le righe; array vuoto se la lettura fallisce
 */
async function glLeggi(tabella, query = 'select=*') {
  try {
    const r = await fetch(GL_BASE + '/rest/v1/' + tabella + '?' + query, { headers: GL_AUTH });
    if (!r.ok) throw new Error('risposta ' + r.status);
    return await r.json();
  } catch (e) {
    console.error('lettura di ' + tabella + ' fallita:', e);
    return [];
  }
}
