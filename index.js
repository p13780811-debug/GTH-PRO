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

// --- FULL DICTIONARY (Marathi Added & Undefined Fixed) ---
const texts = {
    hi: { title: "डिजिटल खाता", total: "कुल बाकी", add: "जोड़ें", name: "नाम", ph: "मोबाइल", bal: "बकाया", save: "ग्राहक जोड़ें", jam: "जमा", udh: "उधार", msg: "भेजें", late: "देरी" },
    en: { title: "Digital Khata", total: "Total Balance", add: "Add Item", name: "Name", ph: "Mobile", bal: "Balance", save: "Add Customer", jam: "Paid", udh: "Due", msg: "Send", late: "Late" },
    mr: { title: "डिजिटल खाते", total: "एकूण बाकी", add: "माल जोडा", name: "नाव", ph: "मोबाईल", bal: "शिल्लक", save: "ग्राहक जोडा", jam: "जमा", udh: "उधार", msg: "पाठवा", late: "उशीर" },
    bn: { title: "ডিজিটাল খাতা", total: "মোট বাকি", add: "যোগ করুন", name: "নাম", ph: "মোবাইল", bal: "বাকি", save: "কাস্টমার যোগ করুন", jam: "জমা", udh: "বাকি", msg: "পাঠান", late: "দেরি" }
};

const checkAuth = (req, res, next) => {
    if (req.session.user && db.users[req.session.user]) next();
    else res.redirect('/login');
};

// --- LOGIN PAGE ---
app.get('/login', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: sans-serif; background: #1a237e; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: white; padding: 30px; border-radius: 20px; width: 85%; max-width: 400px; text-align: center; }
        input { width: 100%; padding: 18px; margin: 10px 0; border: 1px solid #ddd; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
        .btn { width: 100%; background: #1a237e; color: white; padding: 18px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 18px; }
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

// --- SIGNUP PAGE ---
app.get('/signup', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #2e7d32; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }</style></head>
    <body><div style="background:white; padding:30px; border-radius:20px; width:85%; text-align:center;">
    <h2>Register</h2>
    <form action="/signup" method="POST">
        <input name="phone" type="number" placeholder="Mobile" required style="width:100%; padding:15px; margin:10px 0; border:1px solid #ddd; border-radius:10px;">
        <input name="password" type="password" placeholder="Password" required style="width:100%; padding:15px; margin:10px 0; border:1px solid #ddd; border-radius:10px;">
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
    if (!db.users[phone]) { db.users[phone] = { password, customers: [], inventory: [], lang: 'hi' }; saveDB(); res.redirect('/login'); }
    else { res.send("User exists!"); }
});

// --- MAIN DASHBOARD ---
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
        return `<div class="customer-card" style="background:white; padding:15px; border-radius:15px; margin-bottom:10px; border-left: 8px solid ${isLate ? 'red' : '#1a237e'}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><b style="font-size:18px;">${c.name}</b><br><small>${c.phone}</small></div>
                <b style="color:${c.balance > 0 ? 'red' : 'green'}; font-size:20px;">₹${c.balance}</b>
            </div>
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                <a href="https://wa.me/91${c.phone}?text=Hello ${c.name}, reminder for balance ₹${c.balance}." style="background:#25D366; color:white; padding:10px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:bold;">WhatsApp</a>
                <form action="/update" method="POST" style="display:flex; gap:5px;">
                    <input type="hidden" name="id" value="${c.id}">
                    <input name="amount" type="number" placeholder="₹" style="width:60px; padding:8px; border-radius:5px; border:1px solid #ccc;">
                    <button name="action" value="sub" style="background:green; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold;">${t.jam}</button>
                    <button name="action" value="add" style="background:red; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold;">${t.udh}</button>
                </form>
            </div>
        </div>`;
    }).join('');

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body { font-family: sans-serif; background: #f0f2f5; padding: 10px; margin: 0; } .btn-big { width:100%; background:#1a237e; color:white; padding:18px; border:none; border-radius:12px; font-size:18px; font-weight:bold; cursor:pointer; }</style></head>
    <body>
        <div style="display:flex; justify-content:space-around; background:white; padding:10px; margin-bottom:10px; border-radius:10px; font-weight:bold;">
            <a href="/setlang/hi">हिन्दी</a> <a href="/setlang/mr">मराठी</a> <a href="/setlang/bn">বাংলা</a> <a href="/setlang/en">EN</a>
        </div>
        <div style="background: linear-gradient(135deg, #1a237e, #3949ab); color:white; padding:25px; border-radius:20px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
            <h2 style="margin:0;">${t.title}</h2><h1 style="margin:10px 0 0 0;">${t.total}: ₹${total}</h1>
        </div>

        <div style="margin: 20px 0; text-align:center;">
             <a href="/inventory" style="display:inline-block; width:90%; background:#ff9800; color:white; padding:15px; border-radius:12px; text-decoration:none; font-weight:bold; font-size:18px; box-shadow: 0 4px 5px rgba(0,0,0,0.1);">📦 MAAL STOCK (Inventory)</a>
        </div>

        <div style="margin: 15px 0;">
            <form action="/new" method="POST" style="background:white; padding:20px; border-radius:20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <input name="name" placeholder="${t.name}" required style="width:46%; padding:15px; border-radius:10px; border:1px solid #ddd; font-size:16px;">
                <input name="phone" placeholder="${t.ph}" required style="width:46%; padding:15px; border-radius:10px; border:1px solid #ddd; font-size:16px;">
                <input name="balance" type="number" placeholder="${t.bal}" style="width:96%; margin-top:10px; padding:15px; border-radius:10px; border:1px solid #ddd; font-size:16px;">
                <button class="btn-big" style="margin-top:15px;">+ ${t.save}</button>
            </form>
        </div>
        <div id="list">${rows}</div>
        <div style="text-align:center; margin-top:20px;"><a href="/logout" style="color:red; font-weight:bold; text-decoration:none;">LOGOUT / बाहर निकलें</a></div>
    </body></html>`);
});

// --- NEW INVENTORY PAGE ---
app.get('/inventory', checkAuth, (req, res) => {
    const userData = db.users[req.session.user];
    let invRows = (userData.inventory || []).map(i => `
        <div style="display:flex; justify-content:space-between; background:white; padding:15px; border-radius:10px; margin-bottom:5px; border:1px solid #ddd;">
            <b>${i.itemName}</b> <span>Qty: ${i.qty}</span>
        </div>`).join('');

    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>body{font-family:sans-serif; background:#fff3e0; padding:15px;}</style></head>
    <body>
        <h2>📦 Inventory (Maal Stock)</h2>
        <form action="/inventory/add" method="POST" style="background:white; padding:15px; border-radius:15px; margin-bottom:20px;">
            <input name="itemName" placeholder="Maal ka naam" required style="width:90%; padding:12px; margin-bottom:10px;">
            <input name="qty" type="number" placeholder="Quantity" required style="width:90%; padding:12px; margin-bottom:10px;">
            <button style="width:100%; background:#ff9800; color:white; padding:15px; border:none; border-radius:10px; font-weight:bold;">ADD STOCK</button>
        </form>
        <div id="invList">${invRows}</div>
        <br><a href="/" style="text-decoration:none; font-weight:bold; color:#1a237e;">← Back to Khata</a>
    </body></html>`);
});

app.post('/inventory/add', checkAuth, (req, res) => {
    if(!db.users[req.session.user].inventory) db.users[req.session.user].inventory = [];
    db.users[req.session.user].inventory.push({ itemName: req.body.itemName, qty: req.body.qty });
    saveDB(); res.redirect('/inventory');
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

app.listen(process.env.PORT || 3000, () => console.log("Khata Pro Fixed & Ready!"));
