const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BASE DE DONNÉES PostgreSQL ───────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Création des tables + données de départ
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id        SERIAL PRIMARY KEY,
        titre     TEXT NOT NULL,
        slug      TEXT NOT NULL UNIQUE,
        contenu   TEXT NOT NULL,
        extrait   TEXT,
        categorie TEXT DEFAULT 'General',
        date      DATE DEFAULT CURRENT_DATE,
        featured  INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS categories (
        id    SERIAL PRIMARY KEY,
        nom   TEXT NOT NULL UNIQUE,
        icone TEXT DEFAULT '📄'
      );
    `);

    const { rows } = await client.query('SELECT COUNT(*) as count FROM articles');
    if (parseInt(rows[0].count) === 0) {
      await client.query(`
        INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES
        ($1,$2,$3,$4,$5,$6),($7,$8,$9,$10,$11,$12),($13,$14,$15,$16,$17,$18)
      `, [
        'Comment réparer l\'erreur winload.efi (0xc0000225)', 'reparer-winload-efi',
        '## Le problème\n\nTon PC refuse de démarrer avec l\'erreur winload.efi 0xc0000225.\n\n## La solution\n\n1. Démarre depuis une clé USB Windows\n2. Ouvre l\'invite de commandes\n3. Tape : bootrec /fixmbr\n4. Puis : bootrec /fixboot\n5. Puis : bootrec /rebuildbcd\n6. Redémarre ton PC',
        'Ton PC refuse de démarrer avec une erreur winload.efi ? Ce guide détaille chaque étape pour récupérer le bootloader Windows.',
        'Dépannage', 1,

        'Installer Kali Linux en dual-boot avec Windows', 'kali-linux-dual-boot-windows',
        '## Prérequis\n\n- Une clé USB de 8 Go minimum\n- L\'ISO de Kali Linux\n- Ventoy installé\n\n## Étapes\n\n1. Crée une partition libre depuis Windows\n2. Boote sur la clé USB\n3. Lance l\'installeur Kali\n4. Choisis la partition libre',
        'Guide complet pour installer Kali Linux en dual-boot avec Windows sans perdre tes données.',
        'Linux', 0,

        'Désactiver le Secure Boot sur un laptop HP', 'desactiver-secure-boot-hp',
        '## Accéder au BIOS\n\nRedémarre ton PC et appuie sur F10 au démarrage.\n\n## Désactiver Secure Boot\n\n1. Va dans Advanced\n2. Clique sur Secure Boot Configuration\n3. Sélectionne Legacy Support Enable and Secure Boot Disable\n4. Sauvegarde avec F10',
        'Comment désactiver le Secure Boot sur un laptop HP pour installer Linux.',
        'BIOS', 0
      ]);

      await client.query(`
        INSERT INTO categories (nom, icone) VALUES
        ('Linux','🐧'),('Windows','🪟'),('Dépannage','🔧'),
        ('BIOS','⚙️'),('Partitionnement','💾'),('Outils','🛠️')
        ON CONFLICT (nom) DO NOTHING
      `);

      console.log('✅ Données de départ insérées');
    }
    console.log('✅ Base de données PostgreSQL prête');
  } finally {
    client.release();
  }
}

initDB().catch(console.error);

// ─── ROUTES API ───────────────────────────────────────────

app.get('/api/articles', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM articles ORDER BY date DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});

app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM articles WHERE slug = $1', [req.params.slug]);
    if (rows.length === 0) return res.status(404).json({ erreur: 'Article non trouvé' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});

app.get('/api/featured', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM articles WHERE featured = 1 LIMIT 1');
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});

app.get('/api/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.nom, c.icone, COUNT(a.id) as nb_articles
      FROM categories c
      LEFT JOIN articles a ON a.categorie = c.nom
      GROUP BY c.nom, c.icone
      ORDER BY c.nom
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});

app.post('/api/articles', async (req, res) => {
  const { titre, slug, contenu, extrait, categorie, featured } = req.body;
  if (!titre || !slug || !contenu) return res.status(400).json({ erreur: 'titre, slug et contenu sont requis' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [titre, slug, contenu, extrait || '', categorie || 'General', featured ? 1 : 0]
    );
    res.status(201).json({ id: rows[0].id, message: 'Article créé !' });
  } catch (e) { res.status(400).json({ erreur: 'Slug déjà utilisé ou erreur BDD' }); }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM articles WHERE id = $1', [req.params.id]);
    res.json({ message: 'Article supprimé' });
  } catch (e) { res.status(500).json({ erreur: e.message }); }
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ TechRoot tourne sur http://localhost:${PORT}`);
});
