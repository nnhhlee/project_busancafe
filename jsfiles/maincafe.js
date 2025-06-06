const USER_COOKIE_KEY = "CAFE_USER";

function getLoggedInUser() {
    const cookieString = document.cookie;
    const match = cookieString.match(new RegExp(`${USER_COOKIE_KEY}=([^;]+)`));
    return match ? JSON.parse(decodeURIComponent(match[1])) : null;
}

window.addEventListener('DOMContentLoaded', () => {
    const user = getLoggedInUser();
    const container = document.getElementById("top-buttons");

    if (!container) return;

    if (user) {
        container.innerHTML = `
        <button style="width: 100px;" onclick="location.href='/logout'">Logout</button>
        <button style="width: 100px;" onclick="location.href='/bookmarklist.html'">Bookmark</button>
      `;
    } else {
        container.innerHTML = `
        <button style="width: 100px;" onclick="location.href='/signup.html'">Signup</button>
        <button style="width: 100px;" onclick="location.href='/login.html'">Login</button>
      `;
    }
});
document.querySelectorAll('.shakeTarget').forEach(img => {
    img.addEventListener('click', () => {
        img.classList.add('shake');
        setTimeout(() => {
            img.classList.remove('shake');
        }, 500);
    });
});
document.querySelectorAll('.note-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const dropdown = document.getElementById(type + '-dropdown');

        const isVisible = dropdown.classList.contains('show');
        document.querySelectorAll('.custom-dropdown').forEach(dd => {
            dd.classList.remove('show');
        });
        if (!isVisible) {
            dropdown.classList.add('show');
        }
    });
});

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-dropdown').forEach(dd => {
        dd.classList.remove('show');
    });
});
function goToCafeList(type, value) {
    const url = `cafelist.html?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`;
    window.location.href = url;
}