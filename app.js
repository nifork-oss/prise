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
                <button class="add-to-cart-btn" onclick="addToInvoice(${idx})">➕ Добавить в счёт</button>
            `;
            container.appendChild(card);
        }
    });
    renderInvoice();
}

function addToInvoice(idx) {
    const qty = parseFloat(document.getElementById(`input_qty_${idx}`).value);
    const unit = document.getElementById(`select_unit_${idx}`).value;
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
    const client = document.getElementById('clientName').value.trim();
    const address = document.getElementById('objectAddress').value.trim();
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
        document.getElementById('totalSum').textContent = '0';
        return;
    }

    invoiceCart.forEach((item, idx) => {
        const sum = item.qty * item.price;
        total += sum;
        const row = document.createElement('div');
        row.className = 'invoice-item';
        row.innerHTML = `
            <div class="invoice-item-info">
                <button class="btn-delete-item" onclick="removeFromInvoice(${idx})">✕</button>
                <span>${item.name} (${item.qty} ${item.unit})</span>
            </div>
            <div><b>${sum.toLocaleString('ru-RU')} ₽</b></div>
        `;
        container.appendChild(row);
    });
    document.getElementById('totalSum').textContent = total.toLocaleString('ru-RU');
}

function generateInvoiceHTML() {
    if (invoiceCart.length === 0) return null;
    const client = document.getElementById('clientName').value.trim();
    const address = document.getElementById('objectAddress').value.trim();
    
    let rows = '';
    let total = 0;
    invoiceCart.forEach(item => {
        const sum = item.qty * item.price;
        total += sum;
        rows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td><td style="border: 1px solid #ddd; padding: 8px;">${item.qty}</td><td style="border: 1px solid #ddd; padding: 8px;">${item.unit}</td><td style="border: 1px solid #ddd; padding: 8px;">${item.price.toLocaleString('ru-RU')} ₽</td><td style="border: 1px solid #ddd; padding: 8px;">${sum.toLocaleString('ru-RU')} ₽</td></tr>`;
    });

    return `
        <div style="background:#fff; padding:20px; font-family:Arial,sans-serif; color:#333; max-width:700px; margin:0 auto;">
            <div style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px;">
                <div style="font-size: 18px; font-weight: bold; color: #007bff;">СЧЕТ НА ОПЛАТУ УСЛУГ</div>
                <div style="font-size: 12px; color: #777; margin-top: 4px;">Дата: ${new Date().toLocaleDateString('ru-RU')}</div>
            </div>
            <div style="font-size: 13px; margin-bottom: 15px;">
                ${client ? `<b>Заказчик:</b> ${client}<br>` : ''}
                ${address ? `<b>Адрес объекта:</b> ${address}` : ''}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Наименование</th>
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Кол-во</th>
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Ед.</th>
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Цена</th>
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Сумма</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="text-align: right; margin-top: 15px; font-size: 15px; font-weight: bold;">
                ИТОГО К ОПЛАТЕ: ${total.toLocaleString('ru-RU')} ₽
            </div>
        </div>
    `;
}

function sharePDFInvoice() {
    const html = generateInvoiceHTML();
    if (!html) {
        alert("Добавьте услуги в счёт!");
        return;
    }
    
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Счет на оплату</title></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 400);
}

function resetAll() {
    document.getElementById('clientName').value = '';
    document.getElementById('objectAddress').value = '';
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
            div.innerHTML = `<span>📁 <b>${item.name}</b></span>${isEditingUnlocked ? `<button class="btn btn-danger" onclick="deletePriceItem(${index})">✕</button>` : ''}`;
        } else {
            div.className = 'service-item';
            div.innerHTML = `<span>${item.name}</span><span><b>${Number(item.price).toLocaleString('ru-RU')} ₽</b>${isEditingUnlocked ? `<button class="btn btn-danger" style="margin-left:8px;" onclick="deletePriceItem(${index})">✕</button>` : ''}</span>`;
        }
        list.appendChild(div);
    });
}

function checkAuth() {
    const l = document.getElementById('loginInput').value.trim();
    const p = document.getElementById('passInput').value.trim();
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
        document.getElementById('authError').style.display = 'block';
    }
}

function switchTab(tab) {
    document.getElementById('priceTab').style.display = tab === 'price' ? 'block' : 'none';
    document.getElementById('usersTab').style.display = tab === 'users' ? 'block' : 'none';
    document.getElementById('tabPriceBtn').classList.toggle('active', tab === 'price');
    document.getElementById('tabUsersBtn').classList.toggle('active', tab === 'users');
}

function toggleFormType() {
    const type = document.getElementById('typeSelect').value;
    document.getElementById('serviceFields').style.display = type === 'service' ? 'block' : 'none';
}

function addPriceItem() {
    const type = document.getElementById('typeSelect').value;
    const name = document.getElementById('nameInput').value.trim();
    if (!name) return alert('Введите название');

    if (type === 'category') {
        cloudData.services.push({ name, isCategory: true });
    } else {
        const price = parseFloat(document.getElementById('priceInput').value);
        if (isNaN(price)) return alert('Укажите цену');
        cloudData.services.push({ name, price, isCategory: false });
    }
    document.getElementById('nameInput').value = '';
    document.getElementById('priceInput').value = '';
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
        c.innerHTML += `<div class="user-card"><span class="user-name">👤 ${u.login}</span>${isCurrent ? '<span class="user-tag">Вы</span>' : (!isCurrent && cloudData.users.length > 1 ? `<button class="btn btn-danger" onclick="deleteUser(${index})">🗑</button>` : '')}</div>`;
    });
}

function updateCurrentAccount() {
    cloudData.users[currentUserIndex].login = document.getElementById('newCurrentLogin').value.trim();
    cloudData.users[currentUserIndex].pass = document.getElementById('newCurrentPass').value.trim();
    renderUsersList();
    saveToCloud();
}

function addNewUser() {
    const l = document.getElementById('newNumLogin').value.trim();
    const p = document.getElementById('newNumPass').value.trim();
    if (!l || !p) return alert('Заполните поля');
    cloudData.users.push({ login: l, pass: p });
    document.getElementById('newNumLogin').value = '';
    document.getElementById('newNumPass').value = '';
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

function generatePriceHTML() {
    let rows = '';
    cloudData.services.forEach(srv => {
        if (srv.isCategory) {
            rows += `<tr><td colspan="2" style="border: 1px solid #ddd; padding: 8px; background:#e9ecef; font-weight:bold;">${srv.name}</td></tr>`;
        } else {
            rows += `<tr><td style="border: 1px solid #ddd; padding: 8px;">${srv.name}</td><td style="border: 1px solid #ddd; padding: 8px;"><b>${Number(srv.price).toLocaleString('ru-RU')} ₽</b></td></tr>`;
        }
    });

    return `
        <div style="background:#fff; padding:20px; font-family:Arial,sans-serif; color:#333; max-width:700px; margin:0 auto;">
            <div style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px;">
                <div style="font-size: 18px; font-weight: bold; color: #007bff;">ПРАЙС-ЛИСТ РАБОТ И УСЛУГ</div>
                <div style="font-size: 12px; color: #777; margin-top: 4px;">Актуально на: ${new Date().toLocaleDateString('ru-RU')}</div>
            </div>
            <div style="background: #f0f7ff; border-left: 3px solid #007bff; padding: 8px; font-size: 11px; margin-bottom: 15px; line-height: 1.4;">
                <b>Правило погонных метров:</b> Стоимость за пог. м равна стоимости за м² для элементов короче 1 метра.
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left;">Наименование</th>
                        <th style="border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; width: 120px;">Цена</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function sharePDFPrice() {
    const html = generatePriceHTML();
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Прайс-лист</title></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 400);
}