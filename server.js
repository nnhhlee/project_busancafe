const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const app = express();
const PORT = 5000;

const USER_COOKIE_KEY = 'CAFE_USER';

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const cors = require('cors');
app.use(cors({
  origin: true,
  credentials: true
}));

function getUsersFilePath() {
  return path.join(__dirname, 'jsonfiles', 'users.json');
}

function readUsers() {
  return JSON.parse(fs.readFileSync(getUsersFilePath(), 'utf8'));
}

function saveUsers(users) {
  const filePath = getUsersFilePath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
}

function findUserByUsername(username) {
  const users = readUsers();
  return users.find(user => user.username === username);
}

app.post('/signup', (req, res) => {
  const { username, email, name, password } = req.body;
  if (!username || !email || !name || !password) {
    return res.status(400).send(`
            <script>
                alert('please input all the information');
                window.history.back();
            </script>
        `);
  }

  const existingUser = findUserByUsername(username);
  if (existingUser) {
    return res.status(400).send(`
            <script>
                alert('Username already exists: ${username}');
                window.history.back();
            </script>
        `);
  }

  const users = readUsers();
  const existingEmail = users.find(user => user.email === email);
  if (existingEmail) {
    return res.status(400).send(`
            <script>
                alert('Email already exists.');
                window.history.back();
            </script>
        `);
  }

  const newUser = {
    id: Date.now(),
    username,
    email,
    name,
    password,
    joinDate: new Date().toISOString(),
    bookmark: []
  };

  users.push(newUser);
  saveUsers(users);

  const userCookie = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    name: newUser.name
  };

  res.cookie(USER_COOKIE_KEY, JSON.stringify(userCookie));
  res.send(`
        <script>
            alert('Welcome to BUSAN CAFE DISCOVERY!');
            window.location.href = '/';
        </script>
    `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send(`
            <script>
                alert('please input all the information');
                window.history.back();
            </script>
        `);
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(400).send(`
            <script>
                alert('no user: ${user}');
                window.history.back();
            </script>
        `);
  }

  if (password !== user.password) {
    return res.status(400).send(`
            <script>
                window.history.back();
            </script>
        `);
  }

  const userCookie = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name
  };

  res.cookie(USER_COOKIE_KEY, JSON.stringify(userCookie));
  res.send(`
        <script>
            window.location.href = '/';
        </script>
    `);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'maincafe.html'));
});

app.get('/logout', (req, res) => {
  res.clearCookie(USER_COOKIE_KEY);
  res.send(`
        <script>
            window.location.href = '/';
        </script>
    `);
});

app.get('/api/user', (req, res) => {
  const userCookie = req.cookies[USER_COOKIE_KEY];
  if (!userCookie) return res.status(401).json(null);

  try {
    const currentUser = JSON.parse(userCookie);
    const users = readUsers();
    const user = users.find(u => u.username === currentUser.username);
    res.json(user || null);
  } catch (error) {
    res.status(500).json(null);
  }
});

app.get('/api/reviews', (req, res) => {
  const cafeName = req.query.name;

  fs.readFile(path.join(__dirname, 'jsonfiles','cafe.json'), (err, data) => {
    if (err) return res.status(500).send('server error');

    const cafes = JSON.parse(data).cafes;
    const cafe = cafes.find(c => c.Name === cafeName);

    if (!cafe) return res.status(404).send('NO CAFE : 404 ERROR');

    res.json({
      average: cafe.Rating.count > 0
        ? (cafe.Rating.total / cafe.Rating.count).toFixed(1)
        : 0,
      reviews: cafe.Rating.reviews
    });
  });
});

app.post('/api/reviews', (req, res) => {
  const userCookie = req.cookies[USER_COOKIE_KEY];
  if (!userCookie) return res.status(401).send('Unauthorized');

  const { cafeName, rating, content } = req.body;
  if (!cafeName || !rating || !content) {
    return res.status(400).send('Invalid data');
  }

  try {
    const userData = JSON.parse(userCookie);
    const users = readUsers();
    const user = users.find(u => u.username === userData.username);

    const hasReviewed = user.reviews.some(r => r.cafeName === cafeName);
    if (hasReviewed) return res.status(400).send('Already reviewed');

    fs.readFile(path.join(__dirname, 'jsonfiles','cafe.json'), (err, data) => {
      if (err) throw err;

      const cafeData = JSON.parse(data);
      const cafe = cafeData.cafes.find(c => c.Name === cafeName);

      cafe.Rating.total += parseInt(rating);
      cafe.Rating.count++;
      cafe.Rating.reviews.push({
        username: user.username,
        rating,
        content,
        date: new Date().toISOString()
      });

      user.reviews.push({
        cafeName,
        rating,
        content,
        date: new Date().toISOString()
      });

      fs.writeFileSync(path.join(__dirname, 'jsonfiles','cafe.json'), JSON.stringify(cafeData, null, 2));
      saveUsers(users);

      res.sendStatus(200);
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

app.get("/api/review", (req, res) => {
  const cafeName = req.query.name;
  if (!cafeName) {
    return res.status(400).json({ error: "NEED CAFENAME : 400 ERROR" });
  }

  fs.readFile(path.join(__dirname, "/jsonfiles/cafe.json"), "utf8", (err, data) => {
    if (err) {
      console.error("fail to read /jsonfiles/cafe.json", err);
      return res.status(500).json({ error: "server error" });
    }

    let cafes;
    try {
      const parsed = JSON.parse(data);
      cafes = parsed.cafes;
    } catch (parseErr) {
      console.error("JSON parsing error", parseErr);
      return res.status(500).json({ error: "server error" });
    }

    const cafe = cafes.find((c) => c.Name === cafeName);
    if (!cafe) {
      return res.status(404).json({ error: "NO CAFE : 404 ERROR" });
    }

    const reviews = cafe.Rating && Array.isArray(cafe.Rating.reviews)
      ? cafe.Rating.reviews
      : [];
    res.json({ reviews });
  });
});

app.post("/api/review", (req, res) => {
  const { cafeName, username, content } = req.body;
  let rating = parseFloat(req.body.rating);
  if (
    !cafeName ||
    !username ||
    isNaN(rating) ||
    rating < 0 ||
    rating > 5 ||
    !content
  ) {
    return res.status(400).json({ success: false, message: "invalid request" });
  }

  fs.readFile(path.join(__dirname, "/jsonfiles/cafe.json"), "utf8", (err, data) => {
    if (err) {
      console.error("fail to read /jsonfiles/cafe.json", err);
      return res.status(500).json({ success: false, message: "server error" });
    }

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (parseErr) {
      console.error("JSON parsing error", parseErr);
      return res.status(500).json({ success: false, message: "server error" });
    }
    let cafes = parsed.cafes;
    const cafeIndex = cafes.findIndex((c) => c.Name === cafeName);
    if (cafeIndex === -1) {
      return res.status(404).json({ success: false, message: "NO CAFE : 404 ERROR" });
    }

    const cafe = cafes[cafeIndex];
    cafe.Rating.total = (cafe.Rating.total || 0) + rating;
    cafe.Rating.count = (cafe.Rating.count || 0) + 1;
    const newReview = {
      username: username,
      rating: rating,
      content: content,
      date: new Date().toISOString(),
    };
    if (!Array.isArray(cafe.Rating.reviews)) {
      cafe.Rating.reviews = [];
    }
    cafe.Rating.reviews.push(newReview);

    let updatedData;
    parsed.cafes = cafes;
    updatedData = JSON.stringify(parsed, null, 2);

    fs.writeFile(path.join(__dirname, "/jsonfiles/cafe.json"), updatedData, "utf8", (writeErr) => {
      if (writeErr) {
        console.error("fail to write /jsonfiles/cafe.json", writeErr);
        return res.status(500).json({ success: false, message: "server error" });
      }

      return res.json({
        success: true,
        updatedRating: {
          total: cafe.Rating.total,
          count: cafe.Rating.count,
        },
      });
    });
  });
});

const validateCafeNumber = (req, res, next) => {
  const { cafeNumber } = req.body;

  if (typeof cafeNumber !== 'number') {
    return res.status(400).json({
      message: 'INVALID_CAFE_ID',
      errorCode: 'INVALID_CAFE_ID'
    });
  }

  next();
};
app.get('/api/bookmark', (req, res) => {
  const userCookie = req.cookies[USER_COOKIE_KEY];
  if (!userCookie) {
    return res.status(401).json({ message: 'login please' });
  }

  try {
    const currentUser = JSON.parse(userCookie);
    const user = findUserByUsername(currentUser.username);

    if (!user) {
      return res.status(404).json({ message: 'user not found' });
    }

    res.status(200).json({ bookmark: user.bookmark });

  } catch (error) {
    console.error('Get bookmark error:', error);
    res.status(500).json({ message: 'server error' });
  }
});

app.post('/api/bookmark', validateCafeNumber, async (req, res) => {
  try {
    const { cafeNumber } = req.body;
    const userCookie = req.cookies[USER_COOKIE_KEY];

    if (!userCookie) {
      return res.status(401).json({
        message: 'login please',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const currentUser = JSON.parse(userCookie);
    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === currentUser.username);

    if (userIndex === -1) {
      return res.status(404).json({
        message: 'user not found',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    const user = users[userIndex];
    const alreadyBookmarked = user.bookmark.includes(cafeNumber);

    if (alreadyBookmarked) {
      user.bookmark = user.bookmark.filter(id => id !== cafeNumber);
      saveUsers(users);
      return res.json({
        message: 'Bookmark removed',
        isBookmarked: false,
        bookmarkCount: user.bookmark.length
      });
    } else {
      user.bookmark.push(cafeNumber);
      saveUsers(users);
      return res.status(201).json({
        message: 'BOOKMARKED!',
        isBookmarked: true,
        bookmarkCount: user.bookmark.length
      });
    }

  } catch (error) {
    console.error('bookmark error:', error);
    res.status(500).json({
      message: 'server error',
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
});


app.delete('/api/bookmark', (req, res) => {
  const { cafeNumber } = req.body;

  const userCookie = req.cookies[USER_COOKIE_KEY];
  if (!userCookie) {
    return res.status(401).json({ message: 'login please' });
  }

  try {
    const currentUser = JSON.parse(userCookie);
    const users = readUsers();
    const userIndex = users.findIndex(user => user.username === currentUser.username);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'user not found' });
    }

    const bookmarkIndex = users[userIndex].bookmark.indexOf(cafeNumber);
    if (bookmarkIndex > -1) {
      users[userIndex].bookmark.splice(bookmarkIndex, 1);
      saveUsers(users);
      res.status(200).json({ message: 'remove cafe' });
    } else {
      res.status(400).json({ message: 'not bookmarked cafe' });
    }

  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ message: 'server error' });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
