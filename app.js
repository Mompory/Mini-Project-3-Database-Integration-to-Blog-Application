const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session'); // for login stuff
const { Pool } = require('pg'); // for the database

const app = express();
const PORT = 3000;

// Database setup
const pool = new Pool({
    user: 'Example', // PostgreSQL username
    host: 'localhost', // database is hosted locally
    database: 'blogdb', // database name
    password: 'Example', //PostgreSQL password
    port: 5432 // PostgreSQL default port
});

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
    secret: 'my_secret',
    resave: false,
    saveUninitialized: true,
}));

app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT blogs.*, users.name AS creator_name FROM blogs JOIN users ON blogs.creator_user_id = users.user_id');
        res.render('index', { blogs: result.rows, session: req.session }); // Passing session to EJS
    } catch (error) {
        console.error(error);
        res.send('Error retrieving posts');
    }
});

// Signup
app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/signup', async (req, res) => {
    const { name, password } = req.body;
    try {
        await pool.query('INSERT INTO users (name, password) VALUES ($1, $2)', [name, password]);
        res.redirect('/login'); // Go to login page
    } catch (error) {
        console.error(error);
        res.send('Signup failed');
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE name = $1 AND password = $2', [name, password]);
        if (result.rows.length > 0) {
            req.session.user_id = result.rows[0].user_id; // Save user ID to session
            res.redirect('/');
        } else {
            res.send('Invalid login');
        }
    } catch (error) {
        console.error(error);
        res.send('Login error');
    }
});

// Create new post
app.get('/create', (req, res) => {
    if (!req.session.user_id) {
        return res.redirect('/login'); // User must be logged in
    }
    res.render('create');
});

app.post('/create', async (req, res) => {
    const { title, content } = req.body;
    const user_id = req.session.user_id;
    try {
        await pool.query('INSERT INTO blogs (creator_user_id, title, body) VALUES ($1, $2, $3)', [user_id, title, content]);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send('Failed to create post');
    }
});

// Edit post
app.get('/edit/:id', async (req, res) => {
    const blogId = req.params.id;
    if (!req.session.user_id) {
        return res.redirect('/login');
    }
    try {
        const result = await pool.query('SELECT * FROM blogs WHERE blog_id = $1 AND creator_user_id = $2', [blogId, req.session.user_id]);
        if (result.rows.length > 0) {
            res.render('edit', { blog: result.rows[0], id: blogId });
        } else {
            res.send('You can only edit your own posts');
        }
    } catch (error) {
        console.error(error);
        res.send('Error loading post');
    }
});

app.post('/edit/:id', async (req, res) => {
    const blogId = req.params.id;
    const { title, content } = req.body;
    try {
        await pool.query('UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_id = $4', [title, content, blogId, req.session.user_id]);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send('Failed to update post');
    }
});

// Delete post
app.get('/delete/:id', async (req, res) => {
    const blogId = req.params.id;
    try {
        await pool.query('DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2', [blogId, req.session.user_id]);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send('Failed to delete post');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
