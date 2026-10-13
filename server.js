'use strict';

// Entry point (npm start, Phusion Passenger, nodemon). The app itself is in app.js.
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🌿 Conservation Trips & Adventures server running on http://localhost:' + PORT);
  console.log('📍 Uganda Safari & East Africa Tours\n');
});

module.exports = app;
