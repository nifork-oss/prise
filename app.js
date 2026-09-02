const BIN_ID = "6a98820eda38895dfe310361";
const MASTER_KEY = "$2a$10$V5zoj8HIhi0GtDS/ZY5EXe0m1yUvWzV8enXWJjCCaeREOkxKbEvyC";
const DEFAULT_UNITS = ['м²', 'пог. м', 'шт.', 'компл.', 'час', 'усл.'];

let services = [];
let invoiceCart = [];
let cloudData = { services: [], users: [{ login: "admin", pass: "12345" }] };
let isEditingUnlocked = false;
let currentUserIndex = -1;

async function loadCloudData(isPricePage = false) {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { "X-Master-Key": MASTER_KEY }
        });
        const data = await res.json();
        
        if (data.record) {
            if (Array.isArray(data.record)) {
                cloudData.services = data.record;
            } else {
                cloudData = data.record;
                if (!cloudData.users || cloudData.users.length === 0) {
                    cloudData.users = [{ login: "admin", pass: "12345" }];
                }
            }
        }
        services = cloudData.services || [];

        if (isPricePage) {
            renderPriceList();
        } else {
            const loader = document.getElementById('loader');
            if (loader) loader.style.display = 'none';
            renderServices();
        }
    } catch (e) {
        console.error("Ошибка загрузки", e);
    }
}

async function saveToCloud() {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": MASTER_KEY
            },
            body: JSON.stringify(cloudData)
        });

        if (res.ok) {
            alert("Успешно сохранено в облако!");
        } else {
            alert("Ошибка сохранения.");
        }
    } catch (e) {
        alert("Ошибка сети.");
    }
}

// --- КАЛЬКУЛЯТОР (index.html) ---
function renderServices() {
    const container = document.getElementById('servicesList');
    if (!container) return;
    container.innerHTML = '';

    if (!services || services.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888;">Прайс-лист пуст.</div>';
        return;
    }

    services.forEach((srv, idx) => {
        if (srv.isCategory) {
            const cat = document.createElement('div');
            cat.className = 'category-header';
            cat.innerText = srv.name;
            container.appendChild(cat);
        } else {
            const card = document.createElement('div');
            card.className = 'service-card';
            let unitsOptions = DEFAULT_UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
            card.innerHTML = `
                <div class="service-title">
                    <span>${srv.name}</span>
                    <span class="service-price">${Number(srv.price).toLocaleString('ru-RU')} ₽</span>
                </div>
                <div class="unit-row">
                    <input type="number" id="input_qty_${idx}" min="0" value="1" placeholder="Кол-во">
                    <select id="select_unit_${idx}">${unitsOptions}</select>
                </div>
                <button type="button" class="add-to-cart-btn" onclick="addToInvoice(${idx})">➕ Добавить в счёт</button>
            `;
            container.appendChild(card);
        }
    });
    renderInvoice();
}

function addToInvoice(idx) {
    const qtyInput = document.getElementById(`input_qty_${idx}`);
    const unitSelect = document.getElementById(`select_unit_${idx}`);
    if (!qtyInput || !unitSelect) return;

    const qty = parseFloat(qtyInput.value);
    const unit = unitSelect.value;
    const srv = services[idx];

    if (isNaN(qty) || qty <= 0) {
        alert('Укажите количество!');
        return;
    }

    invoiceCart.push({ name: srv.name, price: Number(srv.price), qty, unit });
    renderInvoice();
}

function removeFromInvoice(idx) {
    invoiceCart.splice(idx, 1);
    renderInvoice();
}

function updateInvoiceInfo() {
    const info = document.getElementById('invoiceInfo');
    if (!info) return;
    const clientInput = document.getElementById('clientName');
    const addressInput = document.getElementById('objectAddress');
    const client = clientInput ? clientInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';
    info.innerHTML = `${client ? `<b>Заказчик:</b> ${client}<br>` : ''}${address ? `<b>Адрес:</b> ${address}` : ''}`;
}

function renderInvoice() {
    const container = document.getElementById('invoiceItems');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;
    updateInvoiceInfo();

    if (invoiceCart.length === 0) {
        container.innerHTML = '<div style="color:#888; font-size: 13px; text-align:center;">Счет пуст</div>';
        const totalElem = document.getElementById('totalSum');
        if (totalElem) totalElem.textContent = '0';
        return;
    }

    invoiceCart.forEach((item, idx) => {
        const sum = item.qty * item.price;
        total += sum;
        const row = document.createElement('div');
        row.className = 'invoice-item';
        row.innerHTML = `
            <div class="invoice-item-info">
                <button type="button" class="btn-delete-item" onclick="removeFromInvoice(${idx})">✕</button>
                <span>${item.name} (${item.qty} ${item.unit})</span>
            </div>
            <div><b>${sum.toLocaleString('ru-RU')} ₽</b></div>
        `;
        container.appendChild(row);
    });
    const totalElem = document.getElementById('totalSum');
    if (totalElem) totalElem.textContent = total.toLocaleString('ru-RU');
}

function generateInvoiceText() {
    if (invoiceCart.length === 0) return null;
    const clientElem = document.getElementById('clientName');
    const addressElem = document.getElementById('objectAddress');
    const client = clientElem ? clientElem.value.trim() : '';
    const address = addressElem ? addressElem.value.trim() : '';
    
    let text = "🧾 СЧЕТ НА ОПЛАТУ УСЛУГ\n";
    text += `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n`;
    if (client) text += `👤 Заказчик: ${client}\n`;
    if (address) text += `📍 Адрес: ${address}\n`;
    text += "-----------------------------------\n";
    
    let total = 0;
    invoiceCart.forEach(item => {
        const sum = item.qty * item.price;
        total += sum;
        text += `• ${item.name}\n  ${item.qty} ${item.unit} × ${item.price.toLocaleString('ru-RU')} ₽ = ${sum.toLocaleString('ru-RU')} ₽\n`;
    });
    
    text += "-----------------------------------\n";
    text += `💰 ИТОГО К ОПЛАТЕ: ${total.toLocaleString('ru-RU')} ₽`;
    return text;
}

async function sharePDFInvoice() {
    const text = generateInvoiceText();
    if (!text) {
        alert("Добавьте услуги в счёт!");
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Счет на оплату',
                text: text
            });
            return;
        } catch (e) {}
    }

    navigator.clipboard.writeText(text).then(() => {
        alert("Текст счёта скопирован в буфер обмена!");
    }).catch(() => {
        prompt("Скопируйте текст счёта:", text);
    });
}

function resetAll() {
    const clientElem = document.getElementById('clientName');
    const addressElem = document.getElementById('objectAddress');
    if (clientElem) clientElem.value = '';
    if (addressElem) addressElem.value = '';
    invoiceCart = [];
    renderServices();
}


// --- ПРАЙС-ЛИСТ (price.html) ---
function renderPriceList() {
    const list = document.getElementById('priceList');
    if (!list) return;
    list.innerHTML = '';

    cloudData.services.forEach((item, index) => {
        const div = document.createElement('div');
        if (item.isCategory) {
            div.className = 'service-item category-item';
            div.innerHTML = `<span>📁 <b>${item.name}</b></span>${isEditingUnlocked ? `<button type="button" class="btn btn-danger" onclick="deletePriceItem(${index})">✕</button>` : ''}`;
        } else {
            div.className = 'service-item';
            div.innerHTML = `<span>${item.name}</span><span><b>${Number(item.price).toLocaleString('ru-RU')} ₽</b>${isEditingUnlocked ? `<button type="button" class="btn btn-danger" style="margin-left:8px;" onclick="deletePriceItem(${index})">✕</button>` : ''}</span>`;
        }
        list.appendChild(div);
    });
}

function checkAuth() {
    const loginElem = document.getElementById('loginInput');
    const passElem = document.getElementById('passInput');
    if (!loginElem || !passElem) return;

    const l = loginElem.value.trim();
    const p = passElem.value.trim();
    const idx = cloudData.users.findIndex(u => u.login === l && u.pass === p);

    if (idx !== -1) {
        currentUserIndex = idx;
        isEditingUnlocked = true;
        document.getElementById('authBox').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('newCurrentLogin').value = cloudData.users[idx].login;
        document.getElementById('newCurrentPass').value = cloudData.users[idx].pass;
        renderPriceList();
        renderUsersList();
    } else {
        const err = document.getElementById('authError');
        if (err) err.style.display = 'block';
    }
}

function switchTab(tab) {
    const priceTab = document.getElementById('priceTab');
    const usersTab = document.getElementById('usersTab');
    const tabPriceBtn = document.getElementById('tabPriceBtn');
    const tabUsersBtn = document.getElementById('tabUsersBtn');

    if (priceTab) priceTab.style.display = tab === 'price' ? 'block' : 'none';
    if (usersTab) usersTab.style.display = tab === 'users' ? 'block' : 'none';
    if (tabPriceBtn) tabPriceBtn.classList.toggle('active', tab === 'price');
    if (tabUsersBtn) tabUsersBtn.classList.toggle('active', tab === 'users');
}

function toggleFormType() {
    const typeSelect = document.getElementById('typeSelect');
    const serviceFields = document.getElementById('serviceFields');
    if (!typeSelect || !serviceFields) return;
    serviceFields.style.display = typeSelect.value === 'service' ? 'block' : 'none';
}

function addPriceItem() {
    const typeSelect = document.getElementById('typeSelect');
    const nameInput = document.getElementById('nameInput');
    const priceInput = document.getElementById('priceInput');
    if (!typeSelect || !nameInput) return;

    const type = typeSelect.value;
    const name = nameInput.value.trim();
    if (!name) return alert('Введите название');

    if (type === 'category') {
        cloudData.services.push({ name, isCategory: true });
    } else {
        const price = parseFloat(priceInput ? priceInput.value : 0);
        if (isNaN(price)) return alert('Укажите цену');
        cloudData.services.push({ name, price, isCategory: false });
    }
    nameInput.value = '';
    if (priceInput) priceInput.value = '';
    renderPriceList();
}

function deletePriceItem(index) {
    if (confirm('Удалить?')) {
        cloudData.services.splice(index, 1);
        renderPriceList();
    }
}

function renderUsersList() {
    const c = document.getElementById('usersList');
    if (!c) return;
    c.innerHTML = '';
    cloudData.users.forEach((u, index) => {
        const isCurrent = index === currentUserIndex;
        c.innerHTML += `<div class="user-card"><span class="user-name">👤 ${u.login}</span>${isCurrent ? '<span class="user-tag">Вы</span>' : (!isCurrent && cloudData.users.length > 1 ? `<button type="button" class="btn btn-danger" onclick="deleteUser(${index})">🗑</button>` : '')}</div>`;
    });
}

function updateCurrentAccount() {
    const lElem = document.getElementById('newCurrentLogin');
    const pElem = document.getElementById('newCurrentPass');
    if (!lElem || !pElem) return;

    cloudData.users[currentUserIndex].login = lElem.value.trim();
    cloudData.users[currentUserIndex].pass = pElem.value.trim();
    renderUsersList();
    saveToCloud();
}

function addNewUser() {
    const lElem = document.getElementById('newNumLogin');
    const pElem = document.getElementById('newNumPass');
    if (!lElem || !pElem) return;

    const l = lElem.value.trim();
    const p = pElem.value.trim();
    if (!l || !p) return alert('Заполните поля');
    cloudData.users.push({ login: l, pass: p });
    lElem.value = '';
    pElem.value = '';
    renderUsersList();
    saveToCloud();
}

function deleteUser(index) {
    if (confirm('Удалить пользователя?')) {
        cloudData.users.splice(index, 1);
        if (index < currentUserIndex) currentUserIndex--;
        renderUsersList();
        saveToCloud();
    }
}

function generatePriceText() {
    let text = "📋 ПРАЙС-ЛИСТ РАБОТ И УСЛУГ\n";
    text += `📅 Актуально на: ${new Date().toLocaleDateString('ru-RU')}\n`;
    text += "-----------------------------------\n";
    text += "💡 Правило погонных метров: Стоимость за пог. м равна стоимости за м² для элементов короче 1 метра.\n";
    text += "-----------------------------------\n";

    cloudData.services.forEach(srv => {
        if (srv.isCategory) {
            text += `\n📁 *${srv.name}*\n`;
        } else {
            text += `• ${srv.name} — *${Number(srv.price).toLocaleString('ru-RU')} ₽*\n`;
        }
    });
    return text;
}

async function sharePDFPrice() {
    const text = generatePriceText();

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Прайс-лист',
                text: text
            });
            return;
        } catch (e) {}
    }

    navigator.clipboard.writeText(text).then(() => {
        alert("Прайс-лист скопирован в буфер обмена!");
    }).catch(() => {
        prompt("Скопируйте текст прайса:", text);
    });
}