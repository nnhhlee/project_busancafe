document.addEventListener('DOMContentLoaded', function () {
      const USER_COOKIE_KEY = "CAFE_USER";
      const urlParams = new URLSearchParams(window.location.search);
      const cafeName = urlParams.get('name');
      const cafeNumber = parseInt(urlParams.get('id'), 10);

      let bookmarkBtn = null;

      const handleBookmark = async function (e) {
        e.preventDefault();

        const button = e.target.closest('#bookmark-btn');
        const cafeNumber = getCafeNumber();

        if (!cafeNumber) {
          alert('cafe not found');
          window.location.href = '/';
          return;
        }

        try {
          const response = await fetch('/api/bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cafeNumber })
          });

          const result = await response.json();

          if (response.ok) {
            const isBookmarked = button.classList.contains('bookmarked');
            button.classList.toggle('bookmarked', !isBookmarked);
            const icon = button.querySelector('i');
            if (icon) {
              icon.className = !isBookmarked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
              icon.style.color = !isBookmarked ? 'red' : 'inherit';
            }
            alert(!isBookmarked ? 'BOOKMARKED!' : 'UNBOOKMARKED!');
          } else {
            alert(result.message || 'bookmark fail');
          }
        } catch (error) {
          console.error("NETWORK ERROR:", error);
          alert('NETWORK ERROR');
        }
      };

      document.getElementById('cafe-detail')?.addEventListener('click', function (e) {
        if (e.target.closest('#bookmark-btn')) {
          handleBookmark(e);
        }
      });

      const initializeBookmark = async function () {
        if (!cafeNumber) return;

        try {
          const response = await fetch('/api/bookmark', {
            method: 'GET',
            credentials: 'include'
          });

          if (response.ok) {
            const { bookmark } = await response.json();
            const btn = document.getElementById('bookmark-btn');
            if (Array.isArray(bookmark) && bookmark.includes(cafeNumber)) {
              btn.classList.add('bookmarked');
              const icon = btn.querySelector('i');
              if (icon) {
                icon.className = 'fa-solid fa-heart';
                icon.style.color = 'red';
              }
            } else {
              btn.classList.remove('bookmarked');
              const icon = btn.querySelector('i');
              if (icon) {
                icon.className = 'fa-regular fa-heart';
                icon.style.color = 'inherit';
              }
            }
          }
        } catch (error) {
          console.error('initializeBookmark ERROR:', error);
        }
      };

      fetch("/jsonfiles/cafe.json?v=" + Date.now())
        .then(res => res.json())
        .then(data => {
          const cafeName = new URLSearchParams(window.location.search).get('name');
          const currentCafe = data.cafes.find(c => c.Name === cafeName);

          if (!currentCafe) {
            document.getElementById("cafe-detail").innerHTML = "<p>cafe not found</p>";
            return;
          }

          const container = document.getElementById("cafe-detail");
          const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const avgRating = (currentCafe.Rating?.total / currentCafe.Rating?.count || 0).toFixed(1);

          container.replaceChildren();
          container.insertAdjacentHTML('beforeend', `
        <h1 style="font-size:3rem;">${currentCafe.Name} <small style="font-size:1rem; color:white;">( ${avgRating} / 5.0 )</small></h1>
        <h2 style="font-style: italic; color:gray;">${currentCafe.Description}</h2>
        <div class="image-wrapper">
          <br>
          <img src="${currentCafe.Image}" alt="${currentCafe.Name}" class="cafe-image" />
          <button id="bookmark-btn" class="bookmark-btn">
            <i class="fa-solid fa-heart"></i>
          </button>
        </div>
        <br><br>
        <div class="info" style="text-align: center;">
          ${['Interior', 'View', 'Menu', 'Region'].map(field =>
            `<span>${field}: ${currentCafe[field]}</span>`
          ).join('')}
        </div>
        <br><br>
        <table class="open-hours">
          <thead><tr><th>DAY</th><th>TIME</th></tr></thead>
          <tbody>
            ${currentCafe.Open.map(([o, c], idx) => `
              <tr>
                <td>${weekdays[idx]}</td>
                <td>${o === "00:00" && c === "00:00" ? "CLOSE" : `${o} ~ ${c}`}</td>
              </tr>`
          ).join('')}
          </tbody>
        </table>
        <br><br>
        <p><a href="${currentCafe.Location}" target="_blank">Go to Google Map</a></p>
      `);

          return cafeName;
        })
        .then(cafeName => {
          initializeBookmark();
          return cafeName;
        })
        .then(cafeName => loadAndRenderReviews(cafeName))
        .catch(console.error);
    });

    function getCafeNumber() {
      const idParam = new URLSearchParams(window.location.search).get('id');
      if (!idParam) return null;
      const cafeNumber = parseInt(idParam, 10);
      return isNaN(cafeNumber) ? null : cafeNumber;
    }

    async function checkLoginStatus() {
      try {
        const response = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include'
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        return null;
      }
    }
    function renderStarsFA(rating) {
      const fullStars = Math.floor(rating);
      const halfStar = rating - fullStars >= 0.5 ? 1 : 0;
      const emptyStars = 5 - fullStars - halfStar;
      let html = "";

      for (let i = 0; i < fullStars; i++) {
        html += '<i class="fa-solid fa-star" style="color: #FFD700;"></i>';
      }
      if (halfStar) {
        html += '<i class="fa-solid fa-star-half-stroke" style="color: #FFD700;"></i>';
      }
      for (let i = 0; i < emptyStars; i++) {
        html += '<i class="fa-regular fa-star" style="color: #FFD700;"></i>';
      }
      return html;
    }
    function getLoggedInUser() {
      const USER_COOKIE_KEY = "CAFE_USER";
      const cookie = document.cookie
        .split("; ")
        .find(row => row.startsWith(USER_COOKIE_KEY + "="));
      if (!cookie) return null;
      try {
        return JSON.parse(decodeURIComponent(cookie.split("=")[1]));
      } catch {
        return null;
      }
    }

    async function loadAndRenderReviews(cafeName) {
      const currentUser = await checkLoginStatus();
      let reviews = [];
      try {
        const res = await fetch(`/api/review?name=${encodeURIComponent(cafeName)}`);
        if (res.ok) {
          const json = await res.json();
          reviews = json.reviews;
        }
      } catch (e) {
        console.error("LOADING ERROR:", e);
      }

      const reviewCountEl = document.getElementById("review-count");
      if (reviewCountEl) reviewCountEl.textContent = reviews.length;
      const reviewListEl = document.getElementById("reviews-list");
      if (!reviewListEl) return;


      if (reviews.length === 0) {
        reviewListEl.innerHTML = "<p>Write the first review of this cafe!</p>";
      } else {
        reviewListEl.innerHTML = reviews.map((rev, idx) => {
          const formattedDate = new Date(rev.date).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          return `
            <div class="review-card">
              <h3>${rev.username}</h3>
              <div class="rating-stars" id="rating-stars-${idx}"></div>
              <p>${rev.content}</p>
              <small>${formattedDate}</small>
            </div>
          `;
        }).join("");
        reviews.forEach((rev, idx) => {
          const el = document.getElementById(`rating-stars-${idx}`);
          if (el) el.innerHTML = renderStarsFA(rev.rating);
        });
      }

      const loggedUser = getLoggedInUser();
      const loginPromptEl = document.getElementById("login-prompt");
      const reviewFormEl = document.getElementById("review-form");

      if (!loggedUser) {
        if (loginPromptEl) loginPromptEl.style.display = "block";
        if (reviewFormEl) reviewFormEl.style.display = "none";
        return;
      }

      const hasReviewed = reviews.some(r => r.username === loggedUser.username);
      if (hasReviewed) {
        if (loginPromptEl) loginPromptEl.style.display = "none";
        if (reviewFormEl) reviewFormEl.style.display = "none";
      } else {
        loginPromptEl.style.display = "none";
        reviewFormEl.style.display = "block";
      }
      setupReviewForm(loggedUser.username);
    }

    function setupReviewForm(username) {
      const selectEl = document.getElementById("rating-select");
      const textarea = document.querySelector("#review-form textarea");
      const formEl = document.getElementById("review-form");
      const urlParams = new URLSearchParams(window.location.search);
      const cafeName = urlParams.get("name");

      if (!formEl || !selectEl || !textarea || !cafeName) return;

      formEl.onsubmit = null;
      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();

        const ratingValue = parseFloat(selectEl.value);
        if (isNaN(ratingValue)) {
          alert("Choose Rating.");
          return;
        }

        const content = textarea.value.trim();
        if (!content) {
          alert("Choose content.");
          return;
        }

        try {
          const payload = {
            cafeName: cafeName,
            username: username,
            rating: ratingValue,
            content: content,
          };
          const res = await fetch("/api/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("server error");
          const result = await res.json();
          if (result.success) {
            textarea.value = "";
            selectEl.value = "";

            await loadAndRenderReviews(cafeName);
            if (result.updatedRating) {
              const avgRating = (result.updatedRating.total / result.updatedRating.count).toFixed(1);
              const smallEl = document.querySelector("#cafe-detail h1 small");
              if (smallEl) smallEl.textContent = `(${avgRating} / 5.0)`;
            }
          }
        } catch (err) {
          console.error(err);
        }
      });
    }