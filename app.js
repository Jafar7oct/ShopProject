const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_' + Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: 'sessions.db', dir: './' }),
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database setup
const db = new sqlite3.Database('shop.db', (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Initialize database
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
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
                if (err) return reject(err);
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
                    products.forEach(product => stmt.run(product, err => {
                        if (err) console.error('Error inserting product:', err.message);
                    }));
                    stmt.finalize(() => {
                        console.log('Initial products inserted.');
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    });
};

// Input validation helper
const validateInput = (fields) => {
    return Object.values(fields).every(field => field && String(field).trim() !== '');
};

// Routes
app.get('/', async (req, res) => {
    try {
        if (!req.session.cart) req.session.cart = [];
        const cartCount = req.session.cart.length;

        const laptops = await new Promise((resolve, reject) => {
            db.all("SELECT id, name, price, image_url FROM products WHERE category = ?", ['laptop'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        const phones = await new Promise((resolve, reject) => {
            db.all("SELECT id, name, price, image_url FROM products WHERE category = ?", ['phone'], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        res.render('index', {
            laptops,
            phones,
            username: req.session.username,
            messages: req.session.messages || [],
            cartCount
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Error in root route:', err.message);
        res.status(500).send('Database error');
    }
});

// Search route
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q ? req.query.q.toLowerCase() : '';
        if (!req.session.cart) req.session.cart = [];
        const cartCount = req.session.cart.length;

        const laptops = await new Promise((resolve, reject) => {
            db.all("SELECT id, name, price, image_url FROM products WHERE category = ? AND name LIKE ?", 
                ['laptop', `%${query}%`], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });
        const phones = await new Promise((resolve, reject) => {
            db.all("SELECT id, name, price, image_url FROM products WHERE category = ? AND name LIKE ?", 
                ['phone', `%${query}%`], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });

        res.render('index', {
            laptops,
            phones,
            username: req.session.username,
            messages: req.session.messages || [],
            cartCount
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Error in search route:', err.message);
        res.status(500).send('Database error');
    }
});

// Cart: Add item
app.post('/cart/add', (req, res) => {
    const { productId } = req.body;
    if (!req.session.cart) req.session.cart = [];
    if (productId && !req.session.cart.includes(productId)) {
        req.session.cart.push(productId);
        req.session.messages = [{ type: 'success', text: 'Item added to cart!' }];
    }
    res.json({ cartCount: req.session.cart.length });
});

// Login Routes
app.get('/login', (req, res) => {
    res.render('login', { messages: req.session.messages || [] });
    req.session.messages = [];
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!validateInput({ username, password })) {
        req.session.messages = [{ type: 'error', text: 'All fields are required.' }];
        return res.redirect('/login');
    }
    try {
        const user = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            req.session.messages = [{ type: 'error', text: 'Invalid username or password.' }];
            return res.redirect('/login');
        }
        req.session.username = user.username;
        req.session.messages = [{ type: 'success', text: 'Login successful!' }];
        res.redirect(user.username === 'admin' ? '/admin' : '/');
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error');
    }
});

// Signup Routes
app.get('/signup', (req, res) => {
    res.render('signup', { messages: req.session.messages || [] });
    req.session.messages = [];
});

app.post('/signup', async (req, res) => {
    const { username, password, 'confirm-password': confirmPassword } = req.body;
    if (!validateInput({ username, password, confirmPassword })) {
        req.session.messages = [{ type: 'error', text: 'All fields are required.' }];
        return res.redirect('/signup');
    }
    if (password !== confirmPassword) {
        req.session.messages = [{ type: 'error', text: 'Passwords do not match.' }];
        return res.redirect('/signup');
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        req.session.messages = [{ type: 'success', text: 'Account created! Please log in.' }];
        res.redirect('/login');
    } catch (err) {
        console.error('Signup error:', err.message);
        req.session.messages = [{ type: 'error', text: 'Username already exists or invalid input.' }];
        res.redirect('/signup');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// Database View (Admin Only)
app.get('/database', async (req, res) => {
    if (req.session.username !== 'admin') {
        req.session.messages = [{ type: 'error', text: 'Access denied. Admin only.' }];
        return res.redirect('/');
    }
    try {
        const users = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM users", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        const products = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM products", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.render('database', { users, products });
    } catch (err) {
        console.error('Database route error:', err.message);
        res.status(500).send('Database error');
    }
});

// Admin Routes
app.get('/admin', async (req, res) => {
    if (req.session.username !== 'admin') {
        req.session.messages = [{ type: 'error', text: 'Access denied. Admin only.' }];
        return res.redirect('/');
    }
    try {
        const products = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM products", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.render('admin', { products, messages: req.session.messages || [] });
        req.session.messages = [];
    } catch (err) {
        console.error('Admin route error:', err.message);
        res.status(500).send('Database error');
    }
});

app.post('/admin/add', async (req, res) => {
    if (req.session.username !== 'admin') return res.redirect('/');
    const { name, price, category, image_url } = req.body;
    if (!validateInput({ name, price, category, image_url })) {
        req.session.messages = [{ type: 'error', text: 'All fields are required.' }];
        return res.redirect('/admin');
    }
    try {
        await new Promise((resolve, reject) => {
            db.run("INSERT INTO products (name, price, category, image_url) VALUES (?, ?, ?, ?)",
                [name, parseFloat(price), category, image_url], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });
        req.session.messages = [{ type: 'success', text: 'Product added successfully!' }];
    } catch (err) {
        console.error('Admin add error:', err.message);
        req.session.messages = [{ type: 'error', text: 'Error adding product.' }];
    }
    res.redirect('/admin');
});

app.post('/admin/edit/:id', async (req, res) => {
    if (req.session.username !== 'admin') return res.redirect('/');
    const { id } = req.params;
    const { price } = req.body;
    if (!validateInput({ price })) {
        req.session.messages = [{ type: 'error', text: 'Price is required.' }];
        return res.redirect('/admin');
    }
    try {
        await new Promise((resolve, reject) => {
            db.run("UPDATE products SET price = ? WHERE id = ?", [parseFloat(price), id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        req.session.messages = [{ type: 'success', text: 'Price updated successfully!' }];
    } catch (err) {
        console.error('Admin edit error:', err.message);
        req.session.messages = [{ type: 'error', text: 'Error updating price.' }];
    }
    res.redirect('/admin');
});

app.post('/admin/delete/:id', async (req, res) => {
    if (req.session.username !== 'admin') return res.redirect('/');
    const { id } = req.params;
    try {
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM products WHERE id = ?", [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        req.session.messages = [{ type: 'success', text: 'Product deleted successfully!' }];
    } catch (err) {
        console.error('Admin delete error:', err.message);
        req.session.messages = [{ type: 'error', text: 'Error deleting product.' }];
    }
    res.redirect('/admin');
});

// Start server
const PORT = process.env.PORT || 3000;
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database initialization failed:', err.message);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => {
    db.close(() => {
        console.log('Database connection closed.');
        process.exit(0);
    });
});