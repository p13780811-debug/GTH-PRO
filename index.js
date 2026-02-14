const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'khata-pro-secret', resave: false, saveUninitialized: true }));

const DB_FILE = './users_database.json';

// --- DATA HANDLING ---
let db = { users: {} }; 
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const texts = {
    hi: { title: "डिजिटल खाता", total: "कुल बाकी", add: "नया ग्राहक", name: "नाम", ph: "मोबाइल", bal: "बाकी", save: "सेव करें", jam: "जमा (-)", udh: "उधार (+)", search: "नाम खोजें...", msg: "व्हाट्सएप", late: "देरी" },
    en: { title: "Digital Khata", total: "Total", add: "New Customer", name: "Name", ph: "Mobile", bal: "Balance", save: "SAVE", jam: "DEPOSIT", udh: "CREDIT", search: "Search...", msg: "WhatsApp", late: "LATE" },
    bn: { title: "ডিজিটাল খাতা", total: "মোট বাকি", add: "নতুন গ্রাহক", name: "নাম", ph: "মোবাইল", bal: "বাকি", save: "সেভ করুন", jam: "জমা (-)", udh: "বাকি (+)", amt: "টাকা", search: "খুঁজুন...", msg: "হোয়াটসঅ্যাপ", late: "দেরি" }
};

const checkAuth = (req, res, next) => {
    if (req.session.user && db.users[req.session.user]) next();
    else res.redirect('/login');
};

// --- LOGIN PAGE (Multi-Language Enabled) ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #1a237e; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: white; padding: 35px 25px; border-radius: 30px; width: 85%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        h2 { color: #1a237e; font-size: 22px; margin-bottom: 5px; }
        h4 { color: #666; margin: 0 0 20px 0; font-weight: normal; font-size: 14px; }
        input { width: 100%; padding: 18px; margin: 10px 0; border: 2px solid #eee; border-radius: 15px; font-size: 16px; box-sizing: border-box; }
        .btn { width: 100%; background: #1a237e; color: white; padding: 18px; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; margin-top: 15px; }
        p { margin-top: 20px; font-size: 14px; color: #444; }
    </style></head>
    <body><div class="card">
    <h2>Digital Khata / डिजिटल खाता</h2>
    <h4>লগইন করুন (Login)</h4>
    <form action="/login" method="POST">
        <input name="phone" type="number" placeholder="Mobile / मोबाइल / মোবাইল" required>
        <input name="password" type="password" placeholder="Password / पासवर्ड" required>
        <button class="btn">Login / लॉगिन / লগইন</button>
    </form>
    <p>New? / नया? / নতুন? <a href="/signup" style="color:#1a237e; font-weight:bold;">Create Account</a></p>
    </div></body></html>`);
});

// --- SIGNUP PAGE (Multi-Language Enabled) ---
app.get('/signup', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #2e7d32; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: white; padding: 35px 25px; border-radius: 30px; width: 85%; max-width: 400px; text-align: center; }
        h2 { color: #2e7d32; font-size: 22px; }
        input { width: 100%; padding: 18px; margin: 10px 0; border: 2px solid #eee; border-radius: 15px; font-size: 16px; box-sizing: border-box; }
        .btn { width: 100%; background: #2e7d32; color: white; padding: 18px; border: none; border-radius: 15px; font-size: 18px; font-weight: bold; }
    </style></head>
    <body><div class="card">
    <h2>Create Account / नया अकाउंट</h2>
    <form action="/signup" method="POST">
        <input name="phone" type="number" placeholder="Mobile / मोबाइल" required>
        <input name="password" type="password" placeholder="Set Password / पासवर्ड" required>
        <button class="btn">Register / रजिस्टर</button>
    </form>
    <p><a href="/login" style="color:#2e7d32; font-weight:bold; text-decoration:none;">Login / लॉगिन</a></p>
    </div></body></html>`);
});

// --- REST OF THE CODE (DASHBOARD & ACTIONS) ---
app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    if (db.users[phone] && db.users[phone].password === password) { req.session.user = phone; res.redirect('/'); }
    else { res.send("<script>alert('Error!'); window.location='/login';</script>"); }
});

app.post('/signup', (req, res) => {
    const { phone, password } = req.body;
    if (!db.users[phone]) { db.users[phone] = { password, customers: [], lang: 'hi' }; saveDB(); res.send("<script>alert('Done!'); window.location='/login';</script>"); }
    else { res.send("Already exists!"); }
});

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
        return `<div class="customer-card" style="border-left: 10px solid ${isLate ? '#ff4d4d' : '#1a237e'}; background:white; padding:15px; border-radius:15px; margin-bottom:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between;">
                <div><b class="c-name" style="font-size:18px;">${c.name}</b> ${isLate ? '<span style="color:red; font-size:10px;">['+t.late+']</span>' : ''}<br><small>${c.phone}</small></div>
                <b style="font-size:20px; color:${c.balance > 0 ? '#d32f2f' : '#388e3c'};">₹${c.balance}</b>
            </div>
            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
                <a href="https://wa.me/91${c.phone}?text=Hello ${c.name}, balance ₹${c.balance} baki hai." style="background:#25D366; color:white; text-decoration:none; padding:10px; border-radius:8px; font-size:13px; font-weight:bold;">WhatsApp</a>
                <form action="/update" method="POST" style="margin:0; display:flex; gap:5px;">
                    <input type="hidden" name="id" value="${c.id}">
                    <input name="amount" type="number" placeholder="₹" style="width:60px; padding:8px; border:1px solid #ccc; border-radius:8px;">
                    <button name="action" value="sub" style="background:#4caf50; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold;">${t.jam}</button>
                    <button name="action" value="add" style="background:#f44336; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold;">${t.udh}</button>
                </form>
            </div>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #f0f2f5; margin: 0; padding: 10px; }</style></head>
    <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="display:flex; gap:5px;">
                <a href="/setlang/hi" style="text-decoration:none; font-size:12px;">हिन्दी</a>
                <a href="/setlang/bn" style="text-decoration:none; font-size:12px;">বাংলা</a>
                <a href="/setlang/en" style="text-decoration:none; font-size:12px;">EN</a>
            </div>
            <a href="/logout" style="color:red; text-decoration:none; font-size:12px; font-weight:bold;">LOGOUT</a>
        </div>
        <div style="background:#1a237e; color:white; padding:25px; border-radius:20px; text-align:center; margin-bottom:15px;">
            <h2 style="margin:0;">${t.title}</h2><h3 style="margin:5px 0 0 0;">${t.total}: ₹${total}</h3>
        </div>
        <input type="text" id="searchInput" onkeyup="searchFunc()" placeholder="${t.search}" style="width:100%; padding:15px; border-radius:15px; border:2px solid #1a237e; box-sizing:border-box; margin-bottom:15px;">
        <div style="background:white; padding:20px; border-radius:20px; margin-bottom:20px;">
            <form action="/new" method="POST">
                <input name="name" placeholder="${t.name}" style="width:48%; padding:12px; border-radius:10px; border:1px solid #ddd;" required>
                <input name="phone" placeholder="${t.ph}" style="width:48%; padding:12px; border-radius:10px; border:1px solid #ddd;" required>
                <input name="balance" type="number" placeholder="${t.bal}" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ddd; margin-top:8px;" required>
                <button style="width:100%; background:#1a237e; color:white; padding:15px; border:none; border-radius:12px; margin-top:12px; font-weight:bold;">SAVE</button>
            </form>
        </div>
        <div id="customerList">${rows}</div>
        <script>
            function searchFunc() {
                let input = document.getElementById('searchInput').value.toLowerCase();
                let cards = document.getElementsByClassName('customer-card');
                for (let i = 0; i < cards.length; i++) {
                    let name = cards[i].querySelector('.c-name').innerText.toLowerCase();
                    cards[i].style.display = name.includes(input) ? "block" : "none";
                }
            }
        </script>
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
            if(val > 0) c.lastDate = new Date();
        }
        return c;
    });
    saveDB(); res.redirect('/');
});

app.get('/setlang/:l', checkAuth, (req, res) => { db.users[req.session.user].lang = req.params.l; saveDB(); res.redirect('/'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.listen(3000, () => console.log("Khata Pro Ready!"));
