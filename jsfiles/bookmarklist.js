const params = new URLSearchParams(location.search);
const rawType = params.get('type');
const initialValue = params.get('value');

let allCafes = [];
let currentUser;
const activeFilters = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userRes = await fetch('/api/user', {
            method: 'GET',
            credentials: 'include'
        });

        if (!userRes.ok) throw new Error('login please');

        currentUser = await userRes.json();
        const bookmarks = currentUser.bookmark || [];

        const cafeRes = await fetch('../jsonfiles/cafe.json?v=' + Date.now());
        const cafeData = await cafeRes.json();

        allCafes = cafeData.cafes;

        const bookmarkedCafes = allCafes.filter(cafe =>
            bookmarks.includes(cafe.Cafenumber)
        );

        renderCafeList(bookmarkedCafes);
        generateDynamicFilters();
        applyFilters();

    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
        window.location.href = '/login.html';
    }
});

const initialType = rawType
    ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
    : null;

if (initialType && initialValue) {
    activeFilters[initialType] = initialValue;
}

const now = new Date();
const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
const kst = new Date(utc + 9 * 3600000);
const hhmm = kst.toTimeString().slice(0, 5);
const dayIndex = kst.getDay();

function getCafeRating(cafe) {
    if (cafe.Rating && cafe.Rating.count > 0) {
        return cafe.Rating.total / cafe.Rating.count;
    }
    return 0;
}

function getDayIndex(dayString) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.indexOf(dayString.toLowerCase());
}

function generateDynamicFilters() {
    const container = document.getElementById('dynamicFilters');
    container.innerHTML = '';

    const filterKeys = ['View', 'Menu', 'Interior', 'Region', 'Rating'];

    filterKeys.forEach(filterKey => {
        if (activeFilters[filterKey]) return;

        if (filterKey === 'Rating') {
            uniqueValues = [3, 3.5, 4.0, 4.5];
        }
        else {
            uniqueValues = [...new Set(allCafes.map(cafe => cafe[filterKey]))];
        }

        const filterGroup = document.createElement('div');
        filterGroup.className = 'filter-group';
        filterGroup.innerHTML = `
                    <label for="${filterKey}Filter">${filterKey}:</label>
                    <select 
                        class="filter-select" 
                        id="${filterKey}Filter"
                        onchange="updateFilter('${filterKey}', this.value)"
                    >
                        <option value="">All</option>
                        ${uniqueValues.map(value => `
                            <option value="${value}">
                                ${filterKey === 'Rating' ? `${value}+` : value}
                            </option>
                        `).join('')}
                    </select>
                `;
        container.appendChild(filterGroup);
    });
}

window.updateFilter = function (key, value) {
    if (value) {
        activeFilters[key] = value;
    } else {
        delete activeFilters[key];
    }
    updateURL();
    applyFilters();
}

function updateURL() {
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
    });
    window.history.replaceState({}, '', `?${params.toString()}`);
}

function applyFilters() {
    let filtered = allCafes.filter(cafe =>
        Object.entries(activeFilters).every(([key, value]) => {
            if (key === 'Rating') {
                const avg = getCafeRating(cafe);
                return avg >= parseFloat(value);
            } else if (key === 'Open') {
                const selectedDayIndex = getDayIndex(value);
                const [open, close] = cafe.Open[selectedDayIndex];
                return !(open === '00:00' && close === '00:00');
            }
            return cafe[key] === value;
        }) &&
        currentUser.bookmark.includes(cafe.Cafenumber)
    );

    filtered.sort((a, b) => {
        const isOpenA = checkOpenStatus(a);
        const isOpenB = checkOpenStatus(b);
        if (isOpenA !== isOpenB) return isOpenB ? 1 : -1;
        return getCafeRating(b) - getCafeRating(a);
    });

    renderCafeList(filtered);
}

function checkOpenStatus(cafe) {
    const [open, close] = cafe.Open[dayIndex];
    if (open === '00:00' && close === '00:00') return false;
    const currentMinutes = parseInt(hhmm.split(':')[0]) * 60 + parseInt(hhmm.split(':')[1]);
    const openMinutes = parseInt(open.split(':')[0]) * 60 + parseInt(open.split(':')[1]);
    const closeMinutes = parseInt(close.split(':')[0]) * 60 + parseInt(close.split(':')[1]);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function renderCafeList(cafes) {
    const listEl = document.getElementById('cafe-list');
    listEl.innerHTML = cafes.map(cafe => {
        let iconHTML = '';
        if (cafe.CafeType === 'Book') {
            iconHTML = `<img src="../iconimg/book.png" alt="Book" style="width:1em; height:1em; vertical-align: middle; margin-left: 0.3em;">`;
        } else if (cafe.CafeType === 'Pet') {
            iconHTML = `<img src="../iconimg/bone.png" alt="Pet" style="width:1em; height:1em; vertical-align: middle; margin-left: 0.3em;">`;
        } else if (cafe.CafeType === 'Music') {
            iconHTML = `<img src="../iconimg/music.png" alt="Music" style="width:1em; height:1em; vertical-align: middle; margin-left: 0.3em;">`;
        }

        return `
      <tr class="${checkOpenStatus(cafe) ? 'open' : 'closed'}">
        <td>
          <a href="cafedetail.html?name=${encodeURIComponent(cafe.Name)}&id=${cafe.Cafenumber}">
            ${cafe.Name} ${iconHTML}
          </a>
        </td>
        <td>${cafe.View}</td>
        <td>${cafe.Menu}</td>
        <td>${cafe.Interior}</td>
        <td>${cafe.Region}</td>
        <td>${getCafeRating(cafe).toFixed(1)}</td>
      </tr>
    `;
    }).join('');
}