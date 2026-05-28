function scrollToSection(id) {
    const element = document.getElementById(id);
    const headerOffset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}

window.addEventListener('scroll', () => {
    const sections = ['recommended', 'sets', 'boiled', 'soup', 'stirfry', 'spicysalad', 'somtum', 'fried', 'rice', 'desserts', 'drinks', 'info'];
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
        hoursText.textContent = 'อา: 14.00 – 22.00 น.';
    } else {
        hoursText.textContent = 'จ–ส: 11.00 – 22.00 น.';
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