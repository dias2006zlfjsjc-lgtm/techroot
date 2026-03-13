const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BASE DE DONNÉES ──────────────────────────────────────
const db = new sqlite3.Database('techroot.db', (err) => {
  if (err) console.error('Erreur BDD:', err.message);
  else console.log('✅ Base de données connectée');
});

// Création des tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      titre     TEXT NOT NULL,
      slug      TEXT NOT NULL UNIQUE,
      contenu   TEXT NOT NULL,
      extrait   TEXT,
      categorie TEXT DEFAULT 'General',
      date      TEXT DEFAULT (date('now')),
      featured  INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom   TEXT NOT NULL UNIQUE,
      icone TEXT DEFAULT '📄'
    )
  `);

  // Données de départ
  db.get('SELECT COUNT(*) as count FROM articles', (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Comment réparer l\'erreur winload.efi (0xc0000225)', 'reparer-winload-efi',
        '## Le problème\n\nTon PC refuse de démarrer avec l\'erreur winload.efi.\n\n## La solution\n\n1. Démarre depuis une clé USB Windows\n2. Ouvre l\'invite de commandes\n3. Tape : bootrec /fixmbr\n4. Puis : bootrec /fixboot\n5. Puis : bootrec /rebuildbcd\n6. Redémarre ton PC',
        'Ton PC refuse de démarrer avec une erreur winload.efi ? Ce guide détaille chaque étape pour récupérer le bootloader Windows.',
        'Dépannage', 1]);

      db.run(`INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Installer Kali Linux en dual-boot avec Windows', 'kali-linux-dual-boot-windows',
        '## Prérequis\n\n- Une clé USB de 8 Go minimum\n- L\'ISO de Kali Linux\n- Ventoy installé\n\n## Étapes\n\n1. Crée une partition libre depuis Windows\n2. Boote sur la clé USB\n3. Lance l\'installeur Kali\n4. Choisis la partition libre',
        'Guide complet pour installer Kali Linux en dual-boot avec Windows sans perdre tes données.',
        'Linux', 0]);

      db.run(`INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Désactiver le Secure Boot sur un laptop HP', 'desactiver-secure-boot-hp',
        '## Accéder au BIOS\n\nRedémarre ton PC et appuie sur F10 au démarrage.\n\n## Désactiver Secure Boot\n\n1. Va dans Advanced\n2. Clique sur Secure Boot Configuration\n3. Sélectionne Legacy Support Enable and Secure Boot Disable\n4. Sauvegarde avec F10',
        'Comment désactiver le Secure Boot sur un laptop HP pour installer Linux.',
        'BIOS', 0]);

      const cats = [['Linux','🐧'],['Windows','🪟'],['Dépannage','🔧'],['BIOS','⚙️'],['Partitionnement','💾'],['Outils','🛠️']];
      cats.forEach(([nom, icone]) => {
        db.run(`INSERT OR IGNORE INTO categories (nom, icone) VALUES (?, ?)`, [nom, icone]);
      });

      console.log('✅ Données de départ insérées');
    }
  });
});

// ─── ROUTES API ───────────────────────────────────────────

// GET tous les articles
app.get('/api/articles', (req, res) => {
  db.all('SELECT * FROM articles ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).json({ erreur: err.message });
    res.json(rows);
  });
});

// GET article par slug
app.get('/api/articles/:slug', (req, res) => {
  db.get('SELECT * FROM articles WHERE slug = ?', [req.params.slug], (err, row) => {
    if (err) return res.status(500).json({ erreur: err.message });
    if (!row) return res.status(404).json({ erreur: 'Article non trouvé' });
    res.json(row);
  });
});

// GET article featured
app.get('/api/featured', (req, res) => {
  db.get('SELECT * FROM articles WHERE featured = 1 LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ erreur: err.message });
    res.json(row);
  });
});

// GET toutes les catégories
app.get('/api/categories', (req, res) => {
  db.all(`
    SELECT c.nom, c.icone, COUNT(a.id) as nb_articles
    FROM categories c
    LEFT JOIN articles a ON a.categorie = c.nom
    GROUP BY c.nom
  `, (err, rows) => {
    if (err) return res.status(500).json({ erreur: err.message });
    res.json(rows);
  });
});

// POST créer un article
app.post('/api/articles', (req, res) => {
  const { titre, slug, contenu, extrait, categorie, featured } = req.body;
  if (!titre || !slug || !contenu) {
    return res.status(400).json({ erreur: 'titre, slug et contenu sont requis' });
  }
  db.run(
    `INSERT INTO articles (titre, slug, contenu, extrait, categorie, featured) VALUES (?, ?, ?, ?, ?, ?)`,
    [titre, slug, contenu, extrait || '', categorie || 'General', featured ? 1 : 0],
    function(err) {
      if (err) return res.status(400).json({ erreur: 'Slug déjà utilisé ou erreur BDD' });
      res.status(201).json({ id: this.lastID, message: 'Article créé !' });
    }
  );
});

// DELETE supprimer un article
app.delete('/api/articles/:id', (req, res) => {
  db.run('DELETE FROM articles WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ erreur: err.message });
    res.json({ message: 'Article supprimé' });
  });
});

// ─── FALLBACK → index.html ────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── DÉMARRAGE ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ TechRoot tourne sur http://localhost:${PORT}`);
});
