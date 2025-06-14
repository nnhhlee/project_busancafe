const params = new URLSearchParams(location.search);
const rawType = params.get('type');
const initialValue = params.get('value');
const pageTitle = document.getElementById('page-title');
pageTitle.textContent = `${rawType} : ${initialValue} - Café List`;

let allCafes = [];
const activeFilters = {};

let currentPage = 1;
const itemsPerPage = 15;
let filteredCafes = [];

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

fetch('../jsonfiles/cafe.json?v=' + Date.now())
    .then(res => res.json())
    .then(data => {
        allCafes = data.cafes;
        generateDynamicFilters();
        applyFilters();
    })
    .catch(error => console.error('Error:', error));

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

function goBackToMain() {
    window.location.href = 'maincafe.html';
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
    filteredCafes = allCafes.filter(cafe =>
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
        })
    );

    filteredCafes.sort((a, b) => {
        const isOpenA = checkOpenStatus(a);
        const isOpenB = checkOpenStatus(b);
        if (isOpenA !== isOpenB) return isOpenB ? 1 : -1;
        return getCafeRating(b) - getCafeRating(a);
    });

    currentPage = 1;
    renderCafeList();
    renderPagination();
}

function getListContext() {
    return {
        filters: activeFilters,
        totalCount: filteredCafes.length,
        cafeIds: filteredCafes.map(cafe => ({
            id: cafe.Cafenumber,
            name: cafe.Name
        }))
    };
}

function checkOpenStatus(cafe) {
    const [open, close] = cafe.Open[dayIndex];
    if (open === '00:00' && close === '00:00') return false;
    const currentMinutes = parseInt(hhmm.split(':')[0]) * 60 + parseInt(hhmm.split(':')[1]);
    const openMinutes = parseInt(open.split(':')[0]) * 60 + parseInt(open.split(':')[1]);
    const closeMinutes = parseInt(close.split(':')[0]) * 60 + parseInt(close.split(':')[1]);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function renderCafeList() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const cafesToShow = filteredCafes.slice(startIndex, endIndex);

    const listEl = document.getElementById('cafe-list');
    listEl.innerHTML = cafesToShow.map((cafe, localIndex) => {
        const realIndex = startIndex + localIndex;
        const contextInfo = getListContext();
        
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
                    <a href="cafedetail.html?name=${encodeURIComponent(cafe.Name)}&id=${cafe.Cafenumber}&index=${realIndex}&list=${encodeURIComponent(JSON.stringify(contextInfo))}">
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

function renderPagination() {
    const totalPages = Math.ceil(filteredCafes.length / itemsPerPage);
    const paginationContainer = document.getElementById('pagination-container');

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    paginationHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}>
            BACK
        </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <button class="pagination-btn ${currentPage === i ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }

    paginationHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            NEXT
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;

    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, filteredCafes.length);
        pageInfo.textContent = `${startItem} ~ ${endItem} / ${rawType} : ${initialValue} CAFE TOTAL : ${filteredCafes.length}`;
    }
}

window.changePage = function (page) {
    const totalPages = Math.ceil(filteredCafes.length / itemsPerPage);

    if (page < 1 || page > totalPages) { return; }

    currentPage = page;
    renderCafeList();
    renderPagination();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}