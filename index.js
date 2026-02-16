const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'khata-pro-secret', resave: false, saveUninitialized: true }));

const DB_FILE = './users_database.json';
const ADMIN_SECRET = "KGP123"; // Yeh aapka secret code hai registration ke liye

// --- DATABASE HANDLING ---
let db = { users: {} }; 
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
        db = { users: {} };
    }
}

const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// --- DICTIONARY ---
const texts = {
    hi: { title: "डिजिटल खाता", total: "कुल बाकी", add: "जोड़ें", name: "नाम", ph: "मोबाइल", bal: "बकाया", save: "ग्राहक जोड़ें", jam: "जमा", udh: "उधार", search: "खोजें...", del: "मटाएं" },
    en: { title: "Digital Khata", total: "Total Balance", add: "Add Item", name: "Name", ph: "Mobile", bal: "Balance", save: "Add Customer", jam: "Paid", udh: "Due", search: "Search...", del: "Delete" },
    mr: { title: "डिजिटल खाते", total: "एकूण बाकी", add: "माल जोडा", name: "नाव", ph: "मोबाईल", bal: "शिल्लक", save: "ग्राहक जोडा", jam: "जमा", udh: "उधार", search: "शोधा...", del: "काढून टाका" },
    bn: { title: "ডিজিটাল খাতা", total: "মোট বাকি", add: "যোগ করুন", name: "নাম", ph: "মোবাইল", bal: "বাকি", save: "কাস্টমার যোগ করুন", jam: "জমা", udh: "বাকি", search: "খুঁজুন...", del: "মুছে ফেলুন" }
};

const checkAuth = (req, res, next) => {
    if (req.session.user && db.users[req.session.user]) next();
    else res.redirect('/login');
};

// --- LOGIN & SIGNUP ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #1a237e; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: white; padding: 30px; border-radius: 20px; width: 85%; max-width: 400px; text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
        input { width: 100%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
        .btn { width: 100%; background: #1a237e; color: white; padding: 15px; border: none; border-radius: 10px; font-weight: bold; font-size: 18px; cursor: pointer; }
    </style></head>
    <body><div class="card">
    <h2>Login / प्रवेश</h2>
    <form action="/login" method="POST">
        <input name="phone" type="number" placeholder="Mobile" required>
        <input name="password" type="password" placeholder="Password" required>
        <button class="btn">LOGIN</button>
    </form>
    <p>New? <a href="/signup">Create Account</a></p>
    </div></body></html>`);
});

app.get('/signup', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #2e7d32; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    input { width: 100%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }</style></head>
    <body><div style="background:white; padding:30px; border-radius:20px; width:85%; max-width:400px; text-align:center;">
    <h2>Register / नया खाता</h2>
    <form action="/signup" method="POST">
        <input name="phone" type="number" placeholder="Mobile" required>
        <input name="password" type="password" placeholder="Password" required>
        <input name="secret" type="text" placeholder="Admin Secret Code" required>
        <button style="width:100%; background:#2e7d32; color:white; padding:15px; border:none; border-radius:10px; font-weight:bold; font-size:18px;">Register</button>
    </form>
    <p><a href="/login">Back to Login</a></p>
    </div></body></html>`);
});

app.post('/login', (req, res) => {
    const { phone, password } = req.body;
    if (db.users[phone] && db.users[phone].password === password) {
        req.session.user = phone;
        res.redirect('/');
    } else {
        res.send("<script>alert('Wrong Details'); window.location='/login';</script>");
    }
});

app.post('/signup', (req, res) => {
    const { phone, password, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.send("<script>alert('Wrong Secret Code!'); window.location='/signup';</script>");
    if (!db.users[phone]) {
        db.users[phone] = { password, customers: [], inventory: [], lang: 'hi' };
        saveDB();
        res.send("<script>alert('Account Created!'); window.location='/login';</script>");
    } else {
        res.send("<script>alert('User already exists!'); window.location='/login';</script>");
    }
});

// --- MAIN DASHBOARD ---
app.get('/', checkAuth, (req, res) => {
    const userData = db.users[req.session.user];
    const l = userData.lang || 'hi';
    const t = texts[l];
    let total = userData.customers.reduce((sum, c) => sum + (parseInt(c.balance) || 0), 0);

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #f0f2f5; margin: 0; padding: 10px; }
        .card { background: white; padding: 15px; border-radius: 15px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .search-bar { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 10px; border: 1px solid #ccc; box-sizing: border-box; }
    </style></head>
    <body>
        <div style="display:flex; justify-content:space-around; background:white; padding:10px; margin-bottom:10px; border-radius:10px; font-weight:bold;">
            <a href="/setlang/hi">हिन्दी</a> <a href="/setlang/mr">मराठी</a> <a href="/setlang/bn">বাংলা</a> <a href="/setlang/en">EN</a>
        </div>
        <div style="background: linear-gradient(135deg, #1a237e, #3949ab); color:white; padding:20px; border-radius:20px; text-align:center;">
            <h2 style="margin:0;">${t.title}</h2><h1 style="margin:10px 0;">${t.total}: ₹${total}</h1>
        </div>

        <div style="margin: 15px 0;">
             <a href="/inventory" style="display:block; background:#ff9800; color:white; padding:15px; border-radius:12px; text-decoration:none; text-align:center; font-weight:bold; font-size:18px;">📦 INVENTORY / स्टॉक</a>
        </div>

        <input type="text" id="custSearch" class="search-bar" placeholder="${t.search}" onkeyup="filterCust()">

        <form action="/new" method="POST" style="background:white; padding:15px; border-radius:15px; margin-bottom:15px;">
            <input name="name" placeholder="${t.name}" required style="width:45%; padding:10px; border-radius:8px; border:1px solid #ddd;">
            <input name="phone" placeholder="${t.ph}" required style="width:45%; padding:10px; border-radius:8px; border:1px solid #ddd;">
            <button style="width:100%; margin-top:10px; background:#1a237e; color:white; padding:12px; border:none; border-radius:8px; font-weight:bold;">+ ${t.save}</button>
        </form>

        <div id="custContainer">
            ${userData.customers.map(c => `
                <div class="card cust-item">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${c.name}</b><br><small>${c.phone}</small></div>
                        <b style="color:red; font-size:18px;">₹${c.balance}</b>
                    </div>
                    <div style="margin-top:10px; display:flex; justify-content:space-between;">
                         <a href="https://wa.me/91${c.phone}" style="background:#25D366; color:white; padding:8px; border-radius:5px; text-decoration:none; font-size:12px;">WhatsApp</a>
                         <form action="/update" method="POST">
                            <input type="hidden" name="id" value="${c.id}">
                            <input name="amount" type="number" placeholder="₹" style="width:50px; padding:5px;">
                            <button name="action" value="sub" style="background:green; color:white; border:none; padding:5px 10px; border-radius:5px;">${t.jam}</button>
                            <button name="action" value="add" style="background:red; color:white; border:none; padding:5px 10px; border-radius:5px;">${t.udh}</button>
                         </form>
                    </div>
                </div>
            `).join('')}
        </div>

        <script>
            function filterCust() {
                let val = document.getElementById('custSearch').value.toLowerCase();
                document.querySelectorAll('.cust-item').forEach(item => {
                    item.style.display = item.innerText.toLowerCase().includes(val) ? '' : 'none';
                });
            }
        </script>
        <div style="text-align:center; margin-top:20px;"><a href="/logout" style="color:red; text-decoration:none; font-weight:bold;">LOGOUT</a></div>
    </body></html>`);
});

// --- INVENTORY ---
app.get('/inventory', checkAuth, (req, res) => {
    const userData = db.users[req.session.user];
    const l = userData.lang || 'hi';
    const t = texts[l];

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body{font-family:sans-serif; background:#fff3e0; padding:10px; margin:0;} .card{background:white; padding:15px; border-radius:12px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.1);}</style></head>
    <body>
        <div style="background:#ff9800; color:white; padding:15px; text-align:center; border-radius:10px; margin-bottom:15px;">
            <h2 style="margin:0;">📦 Inventory Stock</h2>
        </div>
        
        <input type="text" id="invSearch" style="width:100%; padding:12px; border-radius:10px; border:1px solid #ccc; margin-bottom:15px;" placeholder="${t.search}" onkeyup="filterInv()">

        <form action="/inventory/add" method="POST" style="background:white; padding:15px; border-radius:15px; margin-bottom:15px;">
            <input name="itemName" placeholder="Item Name" required style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
            <div style="display:flex; gap:5px;">
                <input name="qty" type="text" placeholder="Qty (e.g. 5kg)" required style="width:70%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                <button style="width:30%; background:#ff9800; color:white; border:none; border-radius:8px; font-weight:bold;">ADD</button>
            </div>
        </form>

        <div id="invContainer">
            ${(userData.inventory || []).map((item, index) => `
                <div class="card inv-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${item.itemName}</b> - <span style="color:#e65100; font-weight:bold;">${item.qty}</span></div>
                    <form action="/inventory/delete" method="POST">
                        <input type="hidden" name="index" value="${index}">
                        <button style="background:red; color:white; border:none; padding:8px 12px; border-radius:8px; font-size:12px;">${t.del}</button>
                    </form>
                </div>
            `).join('')}
        </div>

        <script>
            function filterInv() {
                let val = document.getElementById('invSearch').value.toLowerCase();
                document.querySelectorAll('.inv-item').forEach(item => {
                    item.style.display = item.innerText.toLowerCase().includes(val) ? '' : 'none';
                });
            }
        </script>
        <br><a href="/" style="display:block; text-align:center; text-decoration:none; font-weight:bold; color:#1a237e;">← Back to Dashboard</a>
    </body></html>`);
});

app.post('/inventory/add', checkAuth, (req, res) => {
    if(!db.users[req.session.user].inventory) db.users[req.session.user].inventory = [];
    db.users[req.session.user].inventory.push({ itemName: req.body.itemName, qty: req.body.qty });
    saveDB(); res.redirect('/inventory');
});

app.post('/inventory/delete', checkAuth, (req, res) => {
    const idx = req.body.index;
    db.users[req.session.user].inventory.splice(idx, 1);
    saveDB(); res.redirect('/inventory');
});

app.post('/new', checkAuth, (req, res) => {
    const { name, phone } = req.body;
    db.users[req.session.user].customers.push({ id: Date.now(), name, phone, balance: 0 });
    saveDB(); res.redirect('/');
});

app.post('/update', checkAuth, (req, res) => {
    const { id, amount, action } = req.body;
    const user = db.users[req.session.user];
    const customer = user.customers.find(c => c.id == id);
    if (customer) {
        let val = parseInt(amount) || 0;
        customer.balance = (action === 'add') ? (customer.balance + val) : (customer.balance - val);
        saveDB();
    }
    res.redirect('/');
});

app.get('/setlang/:l', checkAuth, (req, res) => { db.users[req.session.user].lang = req.params.l; saveDB(); res.redirect('/'); });
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });

app.listen(process.env.PORT || 3000, () => console.log("Khata Pro Full System Ready!"));
