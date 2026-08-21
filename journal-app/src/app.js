require('dotenv').config();
const path = require('path');
const express = require('express');

const leaderRoutes = require('./routes/leader');
const memberRoutes = require('./routes/member');
const { startScheduler } = require('./scheduler');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => res.redirect('/leader'));

app.use('/leader', leaderRoutes);
app.use('/journal', memberRoutes);

app.use((req, res) => {
  res.status(404).send('Not found.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Message Action Journal running at http://localhost:${PORT}`);
  startScheduler();
});
