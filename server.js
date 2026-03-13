const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BASE DE DONNÉES ──────────────────────────────────────
const db = new Database('techroot.db');
console.log('✅ Base de données connectée');

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    titre     TEXT NOT NULL,
    slug      TEXT NOT NULL UNIQUE,
    contenu   TEXT NOT NULL,
    extrait   TEXT,
    categorie TEXT DEFAULT 'General',
    date      TEXT DEFAULT (date('now')),
    featured  INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nom   TEXT NOT NULL UNIQUE,
    icone TEXT DEFAULT '📄'
  );
`);

// Données de départ
const count = db.prepare('SELECT COUNT(*) as count FROM articles').get();
if (count.count === 0) {
  const insert = db.prepare(`INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`);

  insert.run('Comment réparer l\'erreur winload.efi (0xc0000225)', 'reparer-winload-efi',
    '## Le problème\n\nTon PC refuse de démarrer avec l\'erreur winload.efi 0xc0000225.\n\n## La solution\n\n1. Démarre depuis une clé USB Windows\n2. Ouvre l\'invite de commandes\n3. Tape : bootrec /fixmbr\n4. Puis : bootrec /fixboot\n5. Puis : bootrec /rebuildbcd\n6. Redémarre ton PC',
    'Ton PC refuse de démarrer avec une erreur winload.efi ? Ce guide détaille chaque étape pour récupérer le bootloader Windows.',
    'Dépannage', 1);

  insert.run('Installer Kali Linux en dual-boot avec Windows', 'kali-linux-dual-boot-windows',
    '## Prérequis\n\n- Une clé USB de 8 Go minimum\n- L\'ISO de Kali Linux\n- Ventoy installé\n\n## Étapes\n\n1. Crée une partition libre depuis Windows\n2. Boote sur la clé USB\n3. Lance l\'installeur Kali\n4. Choisis la partition libre',
    'Guide complet pour installer Kali Linux en dual-boot avec Windows sans perdre tes données.',
    'Linux', 0);

  insert.run('Désactiver le Secure Boot sur un laptop HP', 'desactiver-secure-boot-hp',
    '## Accéder au BIOS\n\nRedémarre ton PC et appuie sur F10 au démarrage.\n\n## Désactiver Secure Boot\n\n1. Va dans Advanced\n2. Clique sur Secure Boot Configuration\n3. Sélectionne Legacy Support Enable and Secure Boot Disable\n4. Sauvegarde avec F10',
    'Comment désactiver le Secure Boot sur un laptop HP pour installer Linux.',
    'BIOS', 0);

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (nom, icone) VALUES (?, ?)');
  [['Linux','🐧'],['Windows','🪟'],['Dépannage','🔧'],['BIOS','⚙️'],['Partitionnement','💾'],['Outils','🛠️']]
    .forEach(([nom, icone]) => insertCat.run(nom, icone));

  console.log('✅ Données de départ insérées');
}

// ─── ROUTES API ───────────────────────────────────────────

app.get('/api/articles', (req, res) => {
  const articles = db.prepare('SELECT * FROM articles ORDER BY date DESC').all();
  res.json(articles);
});

app.get('/api/articles/:slug', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!article) return res.status(404).json({ erreur: 'Article non trouvé' });
  res.json(article);
});

app.get('/api/featured', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE featured = 1 LIMIT 1').get();
  res.json(article);
});

app.get('/api/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.nom, c.icone, COUNT(a.id) as nb_articles
    FROM categories c
    LEFT JOIN articles a ON a.categorie = c.nom
    GROUP BY c.nom
  `).all();
  res.json(categories);
});

app.post('/api/articles', (req, res) => {
  const { titre, slug, contenu, extrait, categorie, featured } = req.body;
  if (!titre || !slug || !contenu) return res.status(400).json({ erreur: 'titre, slug et contenu sont requis' });
  try {
    const result = db.prepare(`INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(titre, slug, contenu, extrait || '', categorie || 'General', featured ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Article créé !' });
  } catch (e) {
    res.status(400).json({ erreur: 'Slug déjà utilisé ou erreur BDD' });
  }
});

app.delete('/api/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Article supprimé' });
});

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ TechRoot tourne sur http://localhost:${PORT}`);
});
