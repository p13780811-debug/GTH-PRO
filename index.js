const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'khata-pro-secret', resave: false, saveUninitialized: true }));

const DB_FILE = './users_database.json';

// --- DATABASE HANDLING ---
let db = { users: {} }; 
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// --- LANGUAGE DICTIONARY (HINDI, ENGLISH, MARATHI, BANGLA) ---
const texts = {
    hi: { title: "डिजिटल खाता", total: "कुल बाकी", add: "जोड़ें" },
    en: { title: "Digital Khata", total: "Total Balance", add: "Add Item" },
    mr: { title: "डिजिटल खाते", total: "एकूण बाकी", add: "माल जोडा" }, // Marathi Added
    bn: { title: "ডিজিটাল খাতা", total: "মোট বাকি", add: "যোগ করুন" }  // Bangla Kept
};

const checkAuth = (req, res, next) => {
    if (req.session.user && db.users[req.session.user]) next();
    else res.redirect('/login');
};

// --- MULTI-LANGUAGE LOGIN PAGE ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #1a237e; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: white; padding: 30px; border-radius: 20px; width: 85%; max-width: 400px; text-align: center; }
        input { width: 100%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; }
        .btn { width: 100%; background: #1a237e; color: white; padding: 15px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; }
    </style></head>
    <body><div class="card">
    <h2>Login / लॉग इन करें</h2>
    <form action="/login" method="POST">
        <input name="phone" type="number" placeholder="Mobile / মোবাইল" required>
        <input name="password" type="password" placeholder="Password / পাসওয়ার্ড" required>
        <button class="btn">ENTER / प्रवेश करना</button>
    </form>
    <p>New? <a href="/signup">Create Account</a></p>
    </div></body></html>`);
});

// --- SIGNUP PAGE ---
app.get('/signup', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #2e7d32; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }</style></head>
    <body><div style="background:white; padding:30px; border-radius:20px; width:85%; text-align:center;">
    <h2>Register / নতুন অ্যাকাউন্ট</h2>
    <form action="/signup" method="POST">
        <input name="phone" type="number" placeholder="Mobile" style="width:100%; padding:15px; margin:10px 0; border:1px solid #ddd; border-radius:10px;">
        <input name="password" type="password" placeholder="Password" style="width:100%; padding:15px; margin:10px 0; border:1px solid #ddd; border-radius:10px;">
        <button style="width:100%; background:#2e7d32; color:white; padding:15px; border:none; border-radius:10px;">Register</button>
    </form>
    </div></body></html>`);
});

app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    if (db.users[phone] && db.users[phone].password === password) { req.session.user = phone; res.redirect('/'); }
    else { res.send("<script>alert('Wrong Details'); window.location='/login';</script>"); }
});

app.post('/signup', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users[phone]) { db.users[phone] = { password, customers: [], lang: 'hi' }; saveDB(); res.redirect('/login'); }
    else { res.send("User exists!"); }
});

// --- MAIN DASHBOARD (With WhatsApp & Language) ---
app.get('/', checkAuth, (req, res) => {
    const userData = db.users[req.session.user];
    const l = userData.lang || 'hi';
    const t = texts[l];
    let total = userData.customers.reduce((sum, c) => sum + (parseInt(c.balance) || 0), 0);
    const today = new Date();

    let rows = userData.customers.map(c => {
        const lastDate = new Date(c.lastDate || today);
        const diffDays = Math.ceil(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24));
        const isLate = diffDays >= 15 && c.balance > 0;
        return `<div class="customer-card" style="background:white; padding:15px; border-radius:15px; margin-bottom:10px; border-left: 8px solid ${isLate ? 'red' : '#1a237e'};">
            <div style="display:flex; justify-content:space-between;">
                <div><b>${c.name}</b> ${isLate ? '<span style="color:red; font-size:10px;">['+t.late+']</span>' : ''}<br><small>${c.phone}</small></div>
                <b style="color:${c.balance > 0 ? 'red' : 'green'};">₹${c.balance}</b>
            </div>
            <div style="margin-top:10px; display:flex; justify-content:space-between;">
                <a href="https://wa.me/91${c.phone}?text=Hello ${c.name}, balance ₹${c.balance} baki hai." style="background:#25D366; color:white; padding:8px; border-radius:5px; text-decoration:none; font-size:12px;">${t.msg}</a>
                <form action="/update" method="POST" style="display:flex; gap:5px;">
                    <input type="hidden" name="id" value="${c.id}">
                    <input name="amount" type="number" placeholder="₹" style="width:50px;">
                    <button name="action" value="sub" style="background:green; color:white; border:none; padding:5px;">${t.jam}</button>
                    <button name="action" value="add" style="background:red; color:white; border:none; padding:5px;">${t.udh}</button>
                </form>
            </div>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #f4f4f4; padding: 10px; }</style></head>
    <body>
        <div style="display:flex; justify-content:space-around; margin-bottom:10px;">
            <a href="/setlang/hi">हिन्दी</a> <a href="/setlang/bn">বাংলা</a> <a href="/setlang/en">EN</a>
        </div>
        <div style="background:#1a237e; color:white; padding:20px; border-radius:15px; text-align:center;">
            <h2>${t.title}</h2><h3>${t.total}: ₹${total}</h3>
        </div>
        <div style="margin: 15px 0;">
            <form action="/new" method="POST" style="background:white; padding:15px; border-radius:15px;">
                <input name="name" placeholder="${t.name}" required style="width:45%; padding:10px;">
                <input name="phone" placeholder="${t.ph}" required style="width:45%; padding:10px;">
                <input name="balance" type="number" placeholder="${t.bal}" style="width:95%; margin-top:10px; padding:10px;">
                <button style="width:100%; background:#1a237e; color:white; padding:12px; margin-top:10px; border:none; border-radius:10px;">${t.save}</button>
            </form>
        </div>
        <div id="list">${rows}</div>
    </body></html>`);
});

app.post('/new', checkAuth, (req, res) => {
    db.users[req.session.user].customers.push({ id: Date.now(), name: req.body.name, phone: req.body.phone, balance: parseInt(req.body.balance) || 0, lastDate: new Date() });
    saveDB(); res.redirect('/');
});

app.post('/update', checkAuth, (req, res) => {
    const { id, amount, action } = req.body;
    const val = parseInt(amount) || 0;
    db.users[req.session.user].customers = db.users[req.session.user].customers.map(c => {
        if (c.id == id) {
            c.balance = (action === 'add') ? c.balance + val : c.balance - val;
            c.lastDate = new Date();
        }
        return c;
    });
    saveDB(); res.redirect('/');
});

app.get('/setlang/:l', checkAuth, (req, res) => { db.users[req.session.user].lang = req.params.l; saveDB(); res.redirect('/'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.listen(process.env.PORT || 3000, () => console.log("Khata Pro Ready!"));
