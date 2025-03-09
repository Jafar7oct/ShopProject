/*const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'your_secure_secret_key_12345', // Change this to something unique
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public'
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database setup
const db = new sqlite3.Database('shop.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to SQLite database.');
});

// Initialize database
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT NOT NULL
        )
    `);
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
        if (row.count === 0) {
            const products = [
                ['Dell XPS 13', 999.00, 'laptop', '/images/1.jpg'],
                ['MacBook Air', 1199.00, 'laptop', '/images/2.jpg'],
                ['HP Spectre x360', 1299.00, 'laptop', '/images/3.jpg'],
                ['iPhone 14', 799.00, 'phone', '/images/4.jpg'],
                ['Samsung Galaxy S23', 699.00, 'phone', '/images/5.jpg'],
                ['Google Pixel 8', 599.00, 'phone', '/images/6.jpg']
            ];
            const stmt = db.prepare('INSERT INTO products (name, price, category, image_url) VALUES (?, ?, ?, ?)');
            products.forEach(product => stmt.run(product));
            stmt.finalize();
        }
    });
});

// Routes
app.get('/', (req, res) => {
    db.all("SELECT name, price, image_url FROM products WHERE category = 'laptop'", [], (err, laptops) => {
        if (err) return res.status(500).send('Database error');
        db.all("SELECT name, price, image_url FROM products WHERE category = 'phone'", [], (err, phones) => {
            if (err) return res.status(500).send('Database error');
            res.render('index', { laptops, phones, username: req.session.username, messages: req.session.messages || [] });
            req.session.messages = [];
        });
    });
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.session.messages || [] });
    req.session.messages = [];
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err) return res.status(500).send('Database error');
        if (!user) {
            req.session.messages = [{ type: 'error', text: 'Invalid username or password.' }];
            return res.redirect('/login');
        }
        req.session.username = username;
        req.session.messages = [{ type: 'success', text: 'Login successful!' }];
        res.redirect('/');
    });
});

app.get('/signin', (req, res) => {
    res.render('signin', { messages: req.session.messages || [] });
    req.session.messages = [];
});

app.post('/signin', (req, res) => {
    const { username, password, 'confirm-password': confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.session.messages = [{ type: 'error', text: 'Passwords do not match.' }];
        return res.redirect('/signin');
    }
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
        if (err) {
            req.session.messages = [{ type: 'error', text: 'Username already exists.' }];
            return res.redirect('/signin');
        }
        req.session.messages = [{ type: 'success', text: 'Account created! Please log in.' }];
        res.redirect('/login');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/database', (req, res) => {
    db.all("SELECT * FROM users", [], (err, users) => {
        if (err) return res.status(500).send('Database error');
        db.all("SELECT * FROM products", [], (err, products) => {
            if (err) return res.status(500).send('Database error');
            res.render('database', { users, products });
        });
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
}); 

*/