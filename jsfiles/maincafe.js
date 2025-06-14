const USER_COOKIE_KEY = "CAFE_USER";

function getLoggedInUser() {
    const cookieString = document.cookie;
    const match = cookieString.match(new RegExp(`${USER_COOKIE_KEY}=([^;]+)`));
    return match ? JSON.parse(decodeURIComponent(match[1])) : null;
}
const user = getLoggedInUser();
window.addEventListener('DOMContentLoaded', () => {

    window.currentUser = user;
    const container = document.getElementById("footer-buttons");

    if (!container) return;

    const buttonStyle = `
        <span>{LABEL}</span>
        <img src="/iconimg/eraser.png" alt="Button Icon">
    `;

    if (user) {
        container.innerHTML = `
            <button onclick="location.href='/logout'"> 
                ${buttonStyle.replace('{LABEL}', 'LOGOUT')}
            </button>
            <button onclick="location.href='/bookmarklist.html'">
                ${buttonStyle.replace('{LABEL}', 'BOOKMARK')}
            </button>
        `;
        const actionContainer = document.getElementById('mail-buttons');
        ['add or modify cafe please!', 'ban user please!'].forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.innerHTML = `
  <span class="bar"></span>
  <span class="label">${text}</span>
`;
            btn.addEventListener('click', () => openModal(text));
            actionContainer.appendChild(btn);
        });
    } else {
        container.innerHTML = `
            <button onclick="location.href='/signup.html'">
                ${buttonStyle.replace('{LABEL}', 'SIGNUP')}
            </button>
            <button onclick="location.href='/login.html'">
                ${buttonStyle.replace('{LABEL}', 'LOGIN')}
            </button>
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


const modalBg = document.getElementById('email-modal');
const subjectInput = document.getElementById('email-subject');
const usermail = document.getElementById('email-from');
const mailcontext = document.getElementById('email-body');
const charCount = document.getElementById('char-count');
const form = document.getElementById('email-form');
const btnCancel = document.getElementById('btn-cancel');

function openModal(subjectText) {
    subjectInput.value = subjectText;
    usermail.value = currentUser.email;
    mailcontext.value = '';
    charCount.textContent = '0 / 400';
    modalBg.style.display = 'flex';
}

btnCancel.addEventListener('click', () => {
    modalBg.style.display = 'none';
});

mailcontext.addEventListener('input', () => {
    charCount.textContent = `${mailcontext.value.length} / 400`;
});

form.addEventListener('submit', e => {
    e.preventDefault();
    const payload = {
        from: usermail.value,
        to: 'siiihhaaa@pusan.ac.kr',
        subject: subjectInput.value,
        body: `USER ${user.name} sent email.\n\nREPLY TO: ${usermail.value}\n\n${mailcontext.value}`
    };

    fetch('/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to send');
            return res.json();
        })
        .then(() => {
            alert('Mail sent successfully!');
            modalBg.style.display = 'none';
        })
        .catch(err => {
            alert('Error sending mail. Please try again');
        });
});