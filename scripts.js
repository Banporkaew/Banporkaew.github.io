function scrollToSection(id) {
    const element = document.getElementById(id);
    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}

// --------------------------
// Simple cart functionality
// --------------------------
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function parseVariants(name) {
    // 1) parenthesis-based variants: "ต้มยำ (น้ำข้น-น้ำใส)"
    const m = name.match(/\(([^)]+)\)/);
    if (m) {
        const raw = m[1];
        const options = raw.split(/[\/\-|,]+/).map(s => s.trim()).filter(Boolean);
        const base = name.replace(/\s*\([^)]+\)/, '').trim();
        return { base, options };
    }

    // 2) slash-separated in-name variants: "ไส้ตัน/กระเพาะลวกจิ้ม" or "แกงส้มกุ้ง/แกงส้มปลา"
    if (name.indexOf('/') >= 0) {
        const parts = name.split('/').map(s => s.trim()).filter(Boolean);
        if (parts.length <= 1) return null;

        // longest common prefix
        function longestCommonPrefix(arr) {
            if (!arr.length) return '';
            let prefix = arr[0];
            for (let i = 1; i < arr.length; i++) {
                let j = 0;
                while (j < prefix.length && j < arr[i].length && prefix[j] === arr[i][j]) j++;
                prefix = prefix.slice(0, j);
                if (!prefix) break;
            }
            return prefix;
        }

        const cp = longestCommonPrefix(parts);
        if (cp && cp.length >= 2) {
            // likely cases like 'แกงส้มกุ้ง/แกงส้มปลา' — keep as-is
            return { base: name.replace(/\s*\/\s*/g, ' / '), options: parts };
        }

        const last = parts[parts.length - 1];
        // try to detect a meaningful tail (suffix) from last that is not present in earlier parts
        let tail = '';
        for (let len = Math.min(last.length - 1, last.length); len >= 2; len--) {
            const candidate = last.slice(-len);
            if (!candidate) continue;
            let appears = false;
            for (let i = 0; i < parts.length - 1; i++) {
                if (parts[i].includes(candidate)) { appears = true; break; }
            }
            if (!appears) { tail = candidate; break; }
        }

        let options;
        if (tail) {
            // Only append tail to short parts (likely missing the shared suffix),
            // otherwise keep the part as-is to avoid incorrect concatenation.
            const minAppendLen = Math.max(6, tail.length - 1);
            options = parts.map(p => {
                if (p.includes(tail)) return p;
                const shouldAppend = p.length <= minAppendLen;
                return shouldAppend ? (p + tail) : p;
            }).map(s => s.trim()).filter(Boolean);
        } else {
            options = parts;
        }

        return { base: name.replace(/\s*\/\s*/g, ' / '), options };
    }

    return null;
}

function showVariantModal(base, options, onChoose) {
    // remove existing
    const existing = document.getElementById('variant-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'variant-modal';
    overlay.style = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:80;padding:20px;';

    const box = document.createElement('div');
    box.className = 'bg-white rounded-2xl p-4 max-w-sm w-full shadow-lg';
    box.innerHTML = `<p class="font-semibold text-gray-800 mb-3">เลือกตัวเลือกสำหรับ<br><span class="font-bold">${base}</span></p>`;

    const list = document.createElement('div');
    list.className = 'space-y-2';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-4 py-2 rounded-md border border-gray-200';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
            overlay.remove();
            onChoose(`${base} (${opt})`);
        });
        list.appendChild(btn);
    });

    const cancel = document.createElement('div');
    cancel.className = 'mt-3';
    cancel.innerHTML = `<button class="w-full px-4 py-2 rounded-md border border-gray-200 bg-gray-50">ยกเลิก</button>`;
    cancel.querySelector('button').addEventListener('click', () => overlay.remove());

    box.appendChild(list);
    box.appendChild(cancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function addToCart(name) {
    // if name includes choices like (a/b) or (x-y), prompt selection
    const v = parseVariants(name);
    if (v && v.options.length > 1) {
        showVariantModal(v.base, v.options, (chosen) => addToCart(chosen));
        return;
    }

    const cart = getCart();
    const idx = cart.findIndex(i => i.name === name);
    if (idx >= 0) cart[idx].qty += 1;
    else cart.push({ name: name, qty: 1 });
    saveCart(cart);

    // small toast feedback
    const t = document.createElement('div');
    t.textContent = `${name} เพิ่มลงตะกร้า`;
    t.style = 'position:fixed;left:50%;transform:translateX(-50%);top:18px;background:#111;color:#fff;padding:8px 14px;border-radius:999px;z-index:60;font-size:13px;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
}

function clearCart() {
    localStorage.removeItem('cart');
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const el = document.getElementById('floating-cart-count');
    if (el) el.textContent = total > 0 ? total : '';
}

function initAddButtons() {
    // Find menu rows and add a small Add button
    const rows = document.querySelectorAll('.grid .py-2.flex.justify-between.items-center, .grid > div.py-2.flex.justify-between.items-center');
    rows.forEach(row => {
        if (row.querySelector('.add-to-cart-btn')) return; // already added
        const nameSpan = row.querySelector('span.text-gray-700') || row.querySelector('span');
        if (!nameSpan) return;
        const name = nameSpan.textContent.trim();

        const btn = document.createElement('button');
        btn.className = 'add-to-cart-btn bg-red-50 text-red-600 px-3 py-1 rounded-xl text-[11px] font-semibold';
        btn.textContent = 'เพิ่ม';
        btn.style.marginLeft = '8px';
        btn.addEventListener('click', (e) => { e.stopPropagation(); addToCart(name); });

        // append next to price on the right
        const right = row.querySelector(':scope > span:last-child') || null;
        if (right) {
            const wrapper = document.createElement('span');
            wrapper.className = 'flex items-center gap-2';
            wrapper.appendChild(right.cloneNode(true));
            wrapper.appendChild(btn);
            right.replaceWith(wrapper);
        } else {
            row.appendChild(btn);
        }
    });
}

// create floating cart button
(function createFloatingCart(){
    const btn = document.createElement('a');
    btn.href = 'pages/cart.html';
    btn.id = 'floating-cart';
    btn.className = 'fixed bottom-6 left-4 z-50 flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-3 py-2';
    btn.style.textDecoration = 'none';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg><span id="floating-cart-count" style="background:#dc2626;color:#fff;padding:3px 7px;border-radius:999px;font-size:12px;min-width:18px;text-align:center;display:inline-block"></span>`;
    document.body.appendChild(btn);
    updateCartCount();
})();

// initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initAddButtons();
    updateCartCount();
});

window.addEventListener('scroll', () => {
    const sections = ['recommended', 'sets', 'boiled', 'soup', 'stirfry', 'spicysalad', 'somtum', 'fried', 'rice', 'desserts', 'drinks', 'cafe', 'info'];
    let current = '';

    sections.forEach(section => {
        const el = document.getElementById(section);
        if(el) {
            const sectionTop = el.offsetTop;
            if (pageYOffset >= sectionTop - 120) {
                current = section;
            }
        }
    });

    if (current) {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.classList.remove('active-tab');
            btn.classList.add('text-gray-400');
            btn.classList.remove('font-bold');
        });
        
        const activeBtn = document.querySelector(`button[onclick="scrollToSection('${current}')"]`);
        if(activeBtn) {
            activeBtn.classList.add('active-tab');
            activeBtn.classList.remove('text-gray-400');
            
            // Center the active tab in scroll view
            const navContainer = document.getElementById('nav-tabs');
            const scrollLeft = activeBtn.offsetLeft - (navContainer.offsetWidth / 2) + (activeBtn.offsetWidth / 2);
            navContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }
});

function renderGoogleStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    return stars;
}

function initGoogleReview() {
    const ratingEl = document.getElementById('google-rating');
    const reviewCountEl = document.getElementById('google-review-count');
    const starsEl = document.getElementById('google-stars');
    const statusEl = document.getElementById('google-review-status');
    const statusSmallEl = document.getElementById('google-review-status-small');
    const reviewListEl = document.getElementById('google-review-list');

    const placeQuery = 'สวนอาหารบ้านปอแก้ว';
    const request = {
        query: placeQuery,
        fields: ['place_id']
    };

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            const placeId = results[0].place_id;
            const detailRequest = {
                placeId,
                fields: ['name', 'rating', 'user_ratings_total', 'reviews']
            };

            service.getDetails(detailRequest, (details, detailsStatus) => {
                if (detailsStatus === google.maps.places.PlacesServiceStatus.OK && details) {
                    const rating = details.rating || 0;
                    const reviewCount = details.user_ratings_total || 0;
                    const reviews = details.reviews || [];

                    ratingEl.textContent = rating.toFixed(1);
                    reviewCountEl.textContent = `จาก ${reviewCount} รีวิว`;
                    starsEl.textContent = renderGoogleStars(rating);
                    statusEl.textContent = `อัปเดตล่าสุดจาก Google Maps`;
                    statusSmallEl.textContent = `แสดง ${Math.min(reviews.length, 3)} รีวิวล่าสุด`;

                    reviewListEl.innerHTML = '';
                    if (reviews.length > 0) {
                        reviews.slice(0, 3).forEach(review => {
                            const reviewItem = document.createElement('div');
                            reviewItem.className = 'rounded-2xl bg-white p-4 border border-gray-100 shadow-sm';
                            reviewItem.innerHTML = `
                                <div class="flex items-center justify-between mb-2">
                                    <p class="text-sm font-semibold text-gray-800">${review.author_name || 'ผู้รีวิว'}</p>
                                    <p class="text-sm text-amber-500">${renderGoogleStars(review.rating || 0)}</p>
                                </div>
                                <p class="text-xs text-gray-500 mb-2">${new Date(review.time * 1000).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' })}</p>
                                <p class="text-sm text-gray-700 leading-relaxed">${review.text || 'ไม่มีข้อความรีวิว'}</p>
                            `;
                            reviewListEl.appendChild(reviewItem);
                        });
                    } else {
                        reviewListEl.innerHTML = '<div class="rounded-2xl bg-white p-3 border border-gray-100 shadow-sm"><p class="text-sm text-gray-700">ไม่มีรีวิวจาก Google ให้แสดงในขณะนี้</p></div>';
                    }
                } else {
                    ratingEl.textContent = '-';
                    reviewCountEl.textContent = 'ไม่สามารถโหลดข้อมูลได้';
                    starsEl.textContent = '☆☆☆☆☆';
                    statusEl.textContent = 'ไม่สามารถเรียก Google Places API ได้';
                    statusSmallEl.textContent = 'รีวิวไม่พร้อมใช้งาน';
                    reviewListEl.innerHTML = '<div class="rounded-2xl bg-white p-3 border border-gray-100 shadow-sm"><p class="text-sm text-gray-700">ไม่สามารถโหลดรีวิวจาก Google ได้</p></div>';
                }
            });
        } else {
            ratingEl.textContent = '-';
            reviewCountEl.textContent = 'ไม่สามารถโหลดข้อมูลได้';
            starsEl.textContent = '☆☆☆☆☆';
            statusEl.textContent = 'กรุณาตรวจสอบ Google API key หรือชื่อร้านในระบบ';
            statusSmallEl.textContent = 'รีวิวไม่พร้อมใช้งาน';
            reviewListEl.innerHTML = '<div class="rounded-2xl bg-white p-3 border border-gray-100 shadow-sm"><p class="text-sm text-gray-700">ไม่พบร้านใน Google Places</p></div>';
        }
    });
}

// ✅ ใส่ URL จาก Apps Script Deploy ตรงนี้
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwr8UA8OJwTwgjTQWpMpVsClD3kIZdKhiI0O_ObMqqpcahUCTpqc3jFoDPQWllswFsi/exec";
const API_TIMEOUT_MS = 7000;

function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')),
            timeout);

        fetch(url, options)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(error => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

async function loadRecommended() {
    const track   = document.getElementById("rec-track");
    const loading = document.getElementById("rec-loading");
    const errEl   = document.getElementById("rec-error");

    try {
    const res = await fetchWithTimeout(APPS_SCRIPT_URL, {
        redirect: "follow",
        method: "GET",
        });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    loading.classList.add("hidden");

    if (!json.items || json.items.length === 0) {
        errEl.textContent = "ไม่มีเมนูแนะนำในขณะนี้";
        errEl.classList.remove("hidden");
        return;
    }

    json.items.forEach(item => {
        const card = document.createElement("div");
        card.className = "rec-card";
        card.innerHTML = `
        <div>
            <p class="font-bold text-gray-800 text-sm">${item.name}</p>
            <p class="text-red-600 font-bold mt-1 text-sm">${item.price}.-</p>
        </div>
        <span class="rec-badge">แนะนำ</span>`;
        track.appendChild(card);
    });

    track.classList.remove("hidden");

    } catch (err) {
    loading.classList.add("hidden");
    errEl.textContent = "ไม่พบเมนูแนะนำ สำหรับวันนี้";
    errEl.classList.remove("hidden");
    console.error('loadRecommended error:', err);
    }
}

loadRecommended();

// Auto-insert thumbnails for simple menu list entries.
(function(){
    // Slugify function that preserves Thai characters but normalizes spacing and removes unsafe chars
    function slugify(text) {
        return text.toString().trim()
            .replace(/\s+/g, '-')               // spaces -> -
            .replace(/[^\w\-\u0E00-\u0E7F]+/g, '') // remove punctuation except Thai
            .replace(/\-+/g, '-')               // collapse dashes
            .toLowerCase();
    }

    const placeholder = 'https://placehold.co/96x96/cccccc/555555?text=เมนู';
    const items = document.querySelectorAll('.grid .py-2.flex.justify-between.items-center');
    items.forEach(el => {
        const nameSpan = el.querySelector('span.text-gray-700');
        if (!nameSpan) return;
        const name = nameSpan.textContent.trim();
        const slug = slugify(name) || 'menu-item';
        const filename = slug + '.jpg';
        const imgPath = `images/${filename}`; // expected relative folder

        // set data-img attribute so it's visible in DOM
        el.setAttribute('data-img', imgPath);

        const img = document.createElement('img');
        img.src = imgPath;
        img.alt = name;
        img.className = 'menu-item-thumb';
        img.onerror = function() { this.onerror = null; this.src = placeholder; };

        const left = document.createElement('div');
        left.className = 'menu-item-left';
        left.appendChild(img);
        left.appendChild(nameSpan.cloneNode(true));

        nameSpan.remove();
        el.insertBefore(left, el.firstChild);
    });
})();

(function() {
    const now = new Date();
    const day = now.getDay(); // 0=อา, 1=จ, ..., 6=ส
    const hour = now.getHours() + now.getMinutes() / 60;

    const isSunday = day === 0;
    const openHour = isSunday ? 14 : 11;
    const closeHour = 22;

    const hoursText = document.getElementById('opening-hours-text');
    const statusEl = document.getElementById('opening-status');

    if (isSunday) {
        hoursText.textContent = '14.00 – 22.00 น.';
    } else {
        hoursText.textContent = '11.00 – 22.00 น.';
    }

    if (hour >= openHour && hour < closeHour) {
        hoursText.classList.add('text-emerald-400');
        statusEl.textContent = '🟢 เปิดอยู่ตอนนี้';
        statusEl.className = 'text-xs mt-0.5 text-emerald-400';
    } else {
        hoursText.classList.add('text-red-400');
        statusEl.textContent = '🔴 ปิดแล้ว';
        statusEl.className = 'text-xs mt-0.5 text-red-400';
    }
})();


// Back to Top Button
(function() {
    const btn = document.getElementById('btn-top');
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            btn.classList.remove('opacity-0', 'pointer-events-none');
            btn.classList.add('opacity-100');
        } else {
            btn.classList.add('opacity-0', 'pointer-events-none');
            btn.classList.remove('opacity-100');
        }
    });
})();

function searchMenu() {
    const query = document.getElementById('menu-search').value.toLowerCase().trim();
    
    // ค้นหาทุกแถวเมนูอาหารที่อยู่ในตารางแบ่งเส้น (divide-y) และ menu-card แบบการ์ดใหญ่
    const menuItems = document.querySelectorAll('.menu-card, .divide-y > div');
    
    menuItems.forEach(item => {
        // ดึงข้อความทั้งหมดภายในแถวนั้น ๆ มาเช็ค
        const itemText = item.textContent.toLowerCase();
        
        if (itemText.includes(query)) {
            // ถ้าตรงกับคำค้นหา ให้แสดงผลตามปกติ (ลบ Class ซ่อนออก)
            item.classList.remove('hidden');
        } else {
            // ถ้าไม่ตรง ให้ซ่อนรายการนั้นไว้
            item.classList.add('hidden');
        }
    });

    // ตรวจสอบหัวข้อหลัก (Section) ต่าง ๆ ถ้าเมนูด้านในถูกซ่อนหมด ให้ซ่อนหัวข้อนั้นไปด้วย
    const sections = document.querySelectorAll('main > section');
    sections.forEach(section => {
        const visibleItems = section.querySelectorAll('.menu-card:not(.hidden), .divide-y > div:not(.hidden)');
        const titleAndAlert = section.querySelectorAll('h2, h3, .bg-orange-50'); // ดึงหัวข้อและข้อความแจ้งเตือนมาด้วย
        
        if (query !== '' && visibleItems.length === 0) {
            // ถ้ามีการพิมพ์ค้นหาแล้วไม่มีเมนูที่เข้าข่ายเลย ให้ซ่อนหัวข้อ section นั้นไปชั่วคราว
            titleAndAlert.forEach(el => el.classList.add('hidden'));
        } else {
            // ถ้าช่องค้นหาว่าง หรือยังมีเมนูเหลืออยู่ ให้แสดงหัวข้อตามปกติ
            titleAndAlert.forEach(el => el.classList.remove('hidden'));
        }
    });
}